## What this is

Dynatrace Desktop App (formerly "Explorook" / "Rookout Desktop App") — an Electron app that exposes the user's local source files to the Dynatrace Live Debugger web UI via a GraphQL server on `http://localhost:44512`. The app is read-only by design and only accepts requests from `localhost` plus verified Dynatrace origins.

The same TypeScript backend can also run **headless** (no Electron, no GUI) inside a Docker container — see `Dockerfile` and `src/headless.ts`.

## Common commands

Two yarn projects: the root (Electron main + worker) and `src/webapp` (the React config window). Run `yarn` in each before doing anything else.

### Root (`/`)
- `yarn run build` — webpack-bundles `src/index.ts` → `dist/index.js` (Electron main) and `src/index-worker.ts` → `dist/index-worker.js` (renderer worker). Also copies `index-worker.html`.
- `yarn start` — full dev loop: builds with `development=1` then launches `electron .`. Note: the React webapp is **not** auto-started by this — see "Run in development" below.
- `yarn debug` — same as `start` but launches Electron with `--inspect-brk`.
- `yarn run lint` — TSLint (legacy; project uses tslint 5 with `tslint.json`). There is no separate `tsc --noEmit` task; type errors surface during the webpack `ts-loader` pass.
- `yarn run build-headless` — `tsc -p tsconfig.headless.json` → emits CommonJS `dist/headless.js` (only file in scope is `src/headless.ts`).
- `yarn run start-headless` — builds headless then runs `node ./dist/headless.js -p=44512`.
- `yarn run dist` / `yarn run package-linux` / `yarn run package-windows` — `electron-builder` packaging. CI uses `build-packages-all-distributions` to produce mac+win+linux+arm64+x64 in one run.

### Webapp (`src/webapp/`)
- `yarn start` — CRA dev server on `http://localhost:3000` (CRACO-wrapped, target = `electron-renderer`). Required when running `yarn start` in root with `development=1` because `src/index.ts` loads `http://localhost:3000` instead of the bundled `webapp/index.html`.
- `yarn run build` — production build; `postbuild` copies output to `../../dist/webapp`.
- `yarn test` — `craco test --env=jsdom`. **No tests exist for the root TS code** — only the webapp has a (mostly empty) Jest config.

`NODE_OPTIONS=--openssl-legacy-provider` is already wired into the webapp scripts via `cross-env` to keep CRA 5 working on Node 18+.

### Dev workflow
1. `yarn` in root and in `src/webapp/`.
2. In one terminal: `cd src/webapp && yarn start` (serves React at :3000).
3. In another: `yarn start` from root (builds backend, launches Electron, which loads :3000 in the main window).

For headless / API-only iteration, skip Electron entirely: `yarn run start-headless` and the GraphQL server comes up on :44512 backed by an in-memory store.

### Versioning
`validate_version.sh` runs in CI on `master` and **fails the build** if `package.json` version already has a matching git tag — it then auto-bumps the patch and pushes. The PR template asks contributors to bump `version` in `package.json` before merge.

## Architecture

### The three processes

The Electron app spawns one main + two renderers (see `DEVELOPING.MD`):

1. **Main process** — `src/index.ts`. Owns the Electron lifecycle: tray icon, auto-launch (`auto-launch`), auto-update (`electron-updater` against the GitHub `rookout/dynatrace-desktop-application` releases), deep-link protocol registration (`dynatrace://`), and IPC routing. It does **not** run the GraphQL server.
2. **Index-worker (invisible renderer)** — `src/index-worker.ts` loaded via `index-worker.html`. This is where `server.ts` actually starts the Apollo/Express GraphQL server and where `repoStore` lives. Reason: directory indexing (`fsIndexer.ts` walking the FS) is CPU-intensive and would block the Electron main process.
3. **Main config window (renderer)** — `src/webapp/` (React + Material-UI). Lets users add/remove watched folders. Built with CRA via CRACO; `target: 'electron-renderer'` so it can `require('electron')` directly.

Both renderers run with `nodeIntegration: true, contextIsolation: false, sandbox: false` — they're trusted local UI, not loading remote content.

### IPC routing quirk (Electron 29 migration)
`ipcRenderer.sendTo()` was removed in Electron 29. The index-worker can no longer talk to the main config window directly. Instead: worker → `ipcMain` → main config window. See the `refresh-repos` and `pop-choose-repository` relays in `src/index.ts` and the matching `ipcRenderer.send(...)` calls in `src/index-worker.ts`. Keep this pattern when adding new worker→config-window messages.

### GraphQL server (`src/server.ts`)
- Apollo Server v5 + Express 5 + `@as-integrations/express5`.
- Schema is loaded from `graphql/schema.graphql` at runtime (`readFileSync` from `__dirname/../graphql`). The `graphql` directory is bundled into the electron-builder output via the `files` key in `package.json` — don't move it.
- Resolvers live in `src/api.ts`. Three GraphQL middlewares (`graphql-middleware`) wrap every resolver: `logMiddleware`, `resolveRepoFromId` (turns `repoId` arg into a `repo` object), and `filterDirTraversal` (rejects any `path` arg whose joined fullpath escapes the repo root).
- Two Express middlewares run **before** Apollo: `allowedHostsMiddleware` (only `localhost` / `127.0.0.1` / `::1` in the `Host` header) and `getCorsMiddleware()` (origin allowlist below).
- Apollo introspection and the landing page are disabled.

### Origin verification (security-critical)
`src/middleware/cors.ts` allows requests from:
1. `http://localhost:3000` (cached on startup).
2. Any origin matching `^https:\/\/.*\.dynatrace(?:labs)?\.com(?::\d+)?$` **after** verification — the middleware does an outbound `fetch(<origin>/platform-reserved/dob/isapprefallowed?appOrigin=<origin>)` and only allows the origin if that returns OK. Verified origins are cached in `verifiedOriginsCache` for the process lifetime.

If you change the regex or skip the `isapprefallowed` round-trip you are widening the attack surface for any HTTPS site under `*.dynatrace.com` — don't do it without security review.

### Data model & storage
- `repoStore` (`src/repoStore.ts`) holds the active `Repo[]`. Each `Repo` wraps an `IndexWorker` (`src/fsIndexer.ts`) that walks the directory with `walk` + a hardcoded ignore list (node_modules, .git, .idea, etc.) and a 300k-file ceiling. The repo list is persisted as JSON in `electron-store` under key `repositories`.
- Repo IDs are derived from `git remote origin` + relative path (via `isomorphic-git` + `parse-repo`) so the same logical repo gets the same ID on different machines. Falls back to UUID if there's no git.
- `ExplorookStore` (`src/explorook-store.ts`) wraps `electron-store` with a `getOrCreate` helper. In headless mode (`process.env.headless_mode === "true"`, set by `headless.ts`) `electron-store` instantiation fails and `getStoreSafe()` returns an in-memory `MemStore` instead — keep that fallback when adding new stores.
- App-writable folder (logs, git scratch space): `src/utils.ts:getLibraryFolder()` — `%APPDATA%/Dynatrace`, `~/Library/Application Support/Dynatrace`, or `~/.Dynatrace`. Logs go to `<libraryFolder>/dynatrace.log` (configured in `src/logger.ts` via log4js).

### Bitbucket-On-Prem proxy
`src/BitBucketOnPrem.ts` is a large module that proxies a curated subset of the Bitbucket Server REST API (file trees, commits, branches, tags, etc.) on behalf of the web UI. It exists so the browser-side debugger can fetch source from on-prem Bitbucket without dealing with Bitbucket's CORS restrictions. The GraphQL surface is the `BitbucketOnPrem` type in `graphql/schema.graphql`.

### Two TypeScript configs
- `tsconfig.json` — `module: ESNext`, used by webpack/`ts-loader` for both the main and index-worker bundles. `include` is `src/*` (top level only — files under `src/middleware/`, `src/common/`, `src/webapp/` are picked up via imports, not via the include glob).
- `tsconfig.headless.json` — extends the above but switches to `module: CommonJS` and includes only `src/global.d.ts` + `src/headless.ts`. `tsc` runs directly (no webpack) for the Docker build.

### Build / signing pipeline
- `electron-builder` config lives in the `build` key of root `package.json`. App ID is still `com.rookout.dynatrace-desktop-application` and the `publish` provider is `github` owner `rookout` — these are stable, don't rename casually.
- macOS notarization: `afterSignHook.mjs` runs `@electron/notarize` if `APPLE_DEV_USER` / `APPLE_DEV_PASSWORD` / `appleTeamId` are set; otherwise it logs and returns (so local builds don't fail).
- Windows signing: `sign_windows.mjs` shells out to `jsign.jar` against a Google HSM key (`GOOGLE_HSM_KEY_ID`, `WINDOWS_EV_CERTIFICATE_PATH`); skipped locally when those env vars are unset.
- CircleCI (`.circleci/config.yml`) is the only release pipeline — runs on a macOS executor with Wine + gcloud + jsign, signs all three platforms in a single job, publishes to GitHub releases and `gs://get.rookout.com/dynatrace-desktop-application/`.

## Conventions worth knowing

- **Never write to paths outside `repo.fullpath`** in any new resolver. The `filterDirTraversal` middleware only fires when both `repo` and `path` args are present — if you add a resolver that takes a path arg under a different name, replicate the check yourself.
- All filesystem path joining in `src/api.ts` and `src/middlewares.ts` uses `posix.join` deliberately, so paths returned over GraphQL are always forward-slash regardless of host OS. Keep using `posix` (or `slash()`) when adding new path-returning resolvers.
- `notify(...)` from `src/exceptionManager.ts` is currently a NOOP (Bugsnag was removed) — calls are kept around as future telemetry hooks. Don't delete them.
- `console.log`/`console.error` are linted-allowed (`no-console: false` in `tslint.json`); for structured logging use `getLogger("name")` from `src/logger.ts` (log4js → file + in-memory ring buffer exposed via the `recentLogs` GraphQL query).
- The Electron main window loads `http://localhost:3000` only when `process.env.development` is set (see `src/index.ts:320`); production builds load `dist/webapp/index.html`.
