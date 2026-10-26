## Branches

`main` changes only through a pull request. Start each ticket on a branch named `issue-<number>-<slug>` before the first commit; the pre-commit hook refuses commits on `main`.

## Checks

`npm run check` must pass to commit (pre-commit hook). CI also runs `npm run e2e`, the two-window browser tests the hook skips; run it before pushing a UI change.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for Auk14HP/cribbage-tournament, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
