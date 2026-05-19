import fs from 'fs';
import path from 'path';

// On Linux AppImage builds, Electron's chrome-sandbox requires SUID root
// permissions which are impossible to set inside a FUSE-mounted AppImage.
// This causes a FATAL crash on Ubuntu 24+ when the app is launched.
//
// The fix: wrap the executable with a shell script that always passes
// --no-sandbox, so the flag is in effect regardless of how the AppImage
// is invoked (terminal, file manager, autostart, etc.).
//
// Note: executableArgs in package.json only affects the .desktop file embedded
// in the AppImage (used for desktop integration), NOT the AppRun script that
// runs when the AppImage is executed directly. This afterPack hook is needed
// to cover the direct execution case.
export default async function (context) {
    if (context.electronPlatformName !== 'linux') {
        return;
    }

    const executableName = context.packager.executableName;
    const appOutDir = context.appOutDir;
    const originalBin = path.join(appOutDir, executableName);
    const wrappedBin = path.join(appOutDir, `${executableName}.bin`);

    console.log(`afterPack (Linux): wrapping ${executableName} with --no-sandbox launcher`);

    if (!fs.existsSync(originalBin)) {
        console.warn(`afterPack (Linux): binary not found at ${originalBin}, skipping`);
        return;
    }

    // Rename the real binary, then create a wrapper script in its place.
    // $APPDIR is set by AppRun before calling this wrapper, so it is always
    // available. We fall back to the script's own directory for the rare case
    // where the wrapper is invoked directly outside of an AppImage context.
    fs.renameSync(originalBin, wrappedBin);

    fs.writeFileSync(
        originalBin,
        `#!/bin/bash\nexec "\${APPDIR:-$(dirname "$(readlink -f "$0")")}/${executableName}.bin" --no-sandbox "$@"\n`
    );

    fs.chmodSync(originalBin, 0o755);

    console.log(`afterPack (Linux): done — ${executableName} now wraps ${executableName}.bin with --no-sandbox`);
}
