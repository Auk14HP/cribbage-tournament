#!/usr/bin/env bash
# Publishes screenshots for a PR: adds each file to the pr-screenshots branch under the folder given, pushes
# it, and prints a Markdown image link per file for the PR body. The branch is never merged or checked out:
# the commit is built in a scratch index, so the working tree, the current branch and the pre-commit hook are
# untouched. Links name the commit, so a later shot with the same name never changes an older PR.
#   screens/publish.sh issue-83 <scratchpad>/before-draw.png <scratchpad>/after-draw.png
set -euo pipefail

if [ "$#" -lt 2 ]; then
	echo "Usage: screens/publish.sh <folder> <file>..." >&2
	exit 1
fi
branch=pr-screenshots
folder=$1
shift
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

parent=
if git fetch -q origin "$branch" 2>/dev/null; then
	parent=$(git rev-parse FETCH_HEAD)
fi
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
export GIT_INDEX_FILE=$scratch/index
if [ -n "$parent" ]; then
	git read-tree "$parent"
else
	git read-tree --empty
fi
for file in "$@"; do
	blob=$(git hash-object -w "$file")
	git update-index --add --cacheinfo 100644 "$blob" "$folder/$(basename "$file")"
done
tree=$(git write-tree)
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "Screenshots for $folder")
# GitHub answers a push to a new branch with a PR link; show its output only when the push fails.
if ! pushOutput=$(git push -q origin "$commit:refs/heads/$branch" 2>&1); then
	echo "$pushOutput" >&2
	exit 1
fi

for file in "$@"; do
	path=$folder/$(basename "$file")
	echo "![$(basename "$file" .png)](https://github.com/$repo/blob/$commit/$path?raw=true)"
done
