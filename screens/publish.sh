#!/usr/bin/env bash
# Publishes screenshots for a PR: adds each file to the pr-screenshots branch under the folder given, pushes
# it, and prints a Markdown table pairing each screen's before and after, for the PR's Evidence section. Each
# file is named before-<screen>.png or after-<screen>.png; every screen needs an after, and a new screen has no
# before. With more than one screen, a first column names each row's screen.
# The branch is never merged or checked out: the commit is built in a scratch index, so the working tree, the
# current branch and the pre-commit hook are untouched. Links name the commit, so a later shot with the same
# name never changes an older PR.
#   screens/publish.sh issue-83 <scratchpad>/publish/before-tv-draw.png <scratchpad>/publish/after-tv-draw.png
set -euo pipefail

if [ "$#" -lt 2 ]; then
	echo "Usage: screens/publish.sh <folder> <before-|after-><screen>.png..." >&2
	exit 1
fi
branch=pr-screenshots
folder=$1
shift
# The folder and each screen's name go into a URL, a table cell and a space-separated list.
plainName='^[A-Za-z0-9-]+$'
if [[ ! $folder =~ $plainName ]]; then
	echo "Name the folder with letters, digits and hyphens only, not $folder" >&2
	exit 1
fi

# Each file's name, and each screen once, in the order given. Checked before anything is pushed.
names=" "
screens=()
for file in "$@"; do
	name=$(basename "$file")
	case $name in
		before-*.png) screen=${name#before-} ;;
		after-*.png) screen=${name#after-} ;;
		*)
			echo "Name each file before-<screen>.png or after-<screen>.png, not $name" >&2
			exit 1
			;;
	esac
	screen=${screen%.png}
	if [[ ! $screen =~ $plainName ]]; then
		echo "Name each screen with letters, digits and hyphens only, not $screen" >&2
		exit 1
	fi
	if [[ $names != *" before-$screen.png "* && $names != *" after-$screen.png "* ]]; then
		screens+=("$screen")
	fi
	names="$names$name "
done
for screen in "${screens[@]}"; do
	if [[ $names != *" after-$screen.png "* ]]; then
		echo "The $screen screen has no after-$screen.png" >&2
		exit 1
	fi
done

repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
# A branch that doesn't exist yet makes this the first publish; any other failure stops here.
# ls-remote --exit-code exits 2 when origin has no such branch.
parent=
lookupStatus=0
git ls-remote -q --exit-code --heads origin "$branch" >/dev/null || lookupStatus=$?
if [ "$lookupStatus" -eq 0 ]; then
	git fetch -q origin "$branch"
	parent=$(git rev-parse FETCH_HEAD)
elif [ "$lookupStatus" -ne 2 ]; then
	echo "Couldn't reach origin to find the $branch branch." >&2
	exit 1
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
	echo "If another publish pushed first, run this again: it builds on the branch as it is now." >&2
	exit 1
fi

# One cell of the table: the shot's image, or a note when a new screen has no before.
printCell() {
	local name=$1
	if [[ $names == *" $name "* ]]; then
		printf '![%s](https://github.com/%s/blob/%s/%s/%s?raw=true)' \
			"${name%.png}" "$repo" "$commit" "$folder" "$name"
	else
		printf 'New screen'
	fi
}

if [ "${#screens[@]}" -eq 1 ]; then
	echo "| Before | After |"
	echo "| --- | --- |"
	echo "| $(printCell "before-${screens[0]}.png") | $(printCell "after-${screens[0]}.png") |"
else
	echo "| Screen | Before | After |"
	echo "| --- | --- | --- |"
	for screen in "${screens[@]}"; do
		echo "| $screen | $(printCell "before-$screen.png") | $(printCell "after-$screen.png") |"
	done
fi
