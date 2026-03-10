---
name: Pull Request Description Generator
description: Use this skill whenever the user asks to generate a pull request description, PR message, PR body, or pull request text. Produces a structured, copyable PR description based on the git diff between the current branch and a base branch.
---

# Pull Request Description Generator

## When to use

Activate this skill when the user asks to:

- Generate a pull request description or message
- Create a PR body / PR text
- Write a description for a PR or merge request

## Step 1 — Collect the git context

Run one of the provided scripts to gather all needed information. The script:

- Detects the current branch and suggests a base branch (prompts for confirmation)
- Collects commits, diff stat, and full diff
- Extracts work item references (Azure DevOps `AB#xxxx`, GitHub `#xxx`)
- Detects notable signals: test files, migrations, changelog, dependency changes, breaking exports

**Python (cross-platform):**

```bash
python ./.nexkit/skills/nexkit-pull-request/scripts/get-pr-context.py
# With an explicit base branch:
python ./.nexkit/skills/nexkit-pull-request/scripts/get-pr-context.py --base main
```

The script outputs a JSON payload with the following fields:

| Field                         | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `currentBranch`, `baseBranch` | Branches being compared                            |
| `commitCount`, `filesChanged` | Change scope metrics                               |
| `linesAdded`, `linesRemoved`  | Change volume                                      |
| `hasTests`                    | Whether test files appear in the diff              |
| `hasMigrations`               | Whether migration files appear in the diff         |
| `hasChangelog`                | Whether CHANGELOG was modified                     |
| `hasDependencyChanges`        | Whether package manifests changed                  |
| `breakingChangeHints`         | Removed exports or `BREAKING CHANGE` markers found |
| `workItems`                   | Extracted `AB#xxx` / `#xxx` references             |
| `diffIsTruncated`             | `true` if diff exceeded `--max-diff-lines`         |
| `commits`                     | List of commit messages (oneline)                  |
| `diffStat`                    | File-level change summary                          |
| `diff`                        | Full diff (possibly truncated)                     |

## Step 2 — Generate the PR description

Using the JSON output from Step 1, produce the PR description below.
Present it in a **single fenced Markdown code block** so the user can copy it directly.

```markdown
## Summary

<!-- 1-3 sentences describing the purpose of this PR -->

## Related Work Items

<!-- AB#12345 or N/A -->

## Changes

<!-- Bullet list of the main changes, grouped by area -->

- **area**: what changed and why

## How to Test

<!-- Brief steps for the reviewer to validate the changes -->

## Notes

<!-- Breaking changes, migrations, follow-ups — omit if not applicable -->
```

## Generation rules

- Write in **English** unless the user explicitly asks otherwise.
- Be **specific** — reference file names or components when relevant.
- Keep the total description **under 300 words** whenever possible.
- List all `workItems` under **Related Work Items** (use `N/A` if the array is empty).
- If `diffIsTruncated` is `true`, add a note in **Notes** that the PR may contain additional minor changes.
- If `hasTests` is `false` and the diff adds non-trivial logic, suggest adding tests in **Notes**.
- If `hasMigrations` is `true`, mention running migrations in **How to Test**.
- If `hasDependencyChanges` is `true`, mention running the install command in **How to Test**.
- If `breakingChangeHints` is non-empty, list each hint explicitly under **Notes**.
