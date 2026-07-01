#!/bin/bash
set -e

# Get current version from package.json file
CURRENT_VERSION="$(node -e 'console.log(require("./package").version)')"
# Add "v" prefix
CV_WITH_V="v$CURRENT_VERSION"

# Get all tags exists
TAGS="$(git tag -l)"

# check if current version already has a tag which means the publish would fail
if [[ $TAGS =~ (^|[[:space:]])$CV_WITH_V($|[[:space:]]) ]]; then
  echo "a release tag with version $CV_WITH_V already exists - bumping patch version and continuing"

  # CI checkouts have no git identity - set one so the bump commit can be created
  git config user.name "${GIT_AUTHOR_NAME:-github-actions[bot]}"
  git config user.email "${GIT_AUTHOR_EMAIL:-github-actions[bot]@users.noreply.github.com}"

  # bump the patch version without creating a git tag - the release tag is created later by
  # electron-builder when it publishes the GitHub Release. Commit and push only the branch.
  npm --no-git-tag-version version patch
  git commit -am "Bumping patch version after CI version conflict"
  git push

  # NOTE: unlike CircleCI (which relied on exit 1 to re-trigger the pipeline), a push made
  # with the built-in GITHUB_TOKEN does not re-trigger the workflow. Instead we continue the
  # current run - the workspace already holds the bumped package.json, so the build below
  # produces and publishes the correct new version.
  echo "version bumped to $(node -e 'console.log(require("./package").version)') - continuing this run"
  exit 0
fi

echo 'no version conflicts found'
