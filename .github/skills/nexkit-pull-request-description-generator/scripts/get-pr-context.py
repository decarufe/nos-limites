#!/usr/bin/env python3
"""
Collect all git context needed to generate a pull request description.

Usage:
    python get-pr-context.py
    python get-pr-context.py --base main
    python get-pr-context.py --base develop --max-diff-lines 1000

Outputs a JSON payload to stdout.
"""

import subprocess, sys, json, re, argparse
sys.stdout.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding="utf-8")
from typing import List, Tuple

# Work item patterns ordered from most to least specific
# AB#12345 (Azure Boards explicit format)
RE_ADO_EXPLICIT = re.compile(r'AB#\d+')
# #12345 generic hash ref in commit messages (any length, not preceded by a letter)
RE_HASH_REF     = re.compile(r'(?<![A-Za-z])#(\d+)')
# Bare numeric ID in a branch path: feature/12345-desc or fix/12345_thing (4-8 digits)
RE_BRANCH_NUM   = re.compile(r'(?<=[/_-])(\d{4,8})(?=[_-]|\b)')
RE_EXPORT = re.compile(r'^-.*\bexport\s+(function|class|const|interface|type)\s')
RE_BREAK  = re.compile(r'^\+.*BREAKING[-\s]CHANGE')


def run(cmd: List[str]) -> Tuple[str, int]:
    """Run a command and return (stdout, returncode). Always uses UTF-8, never raises."""
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
        )
        return (r.stdout or "").strip(), r.returncode
    except FileNotFoundError:
        return "", 127


def unique(items: list) -> list:
    seen: set = set()
    return [x for x in items if not (x in seen or seen.add(x))]


def extract_work_items(texts: List[str], branch: str = "") -> List[str]:
    """Extract work item references from commit messages and optionally a branch name."""
    found: List[str] = []
    for text in texts:
        # Explicit Azure Boards format: AB#12345
        found += RE_ADO_EXPLICIT.findall(text)
        # Generic hash refs: #12345 (letter-prefixed like AB# excluded by lookbehind)
        found += [f"#{n}" for n in RE_HASH_REF.findall(text)]
    # Branch name: bare numeric IDs like feature/12345-description
    if branch:
        for n in RE_BRANCH_NUM.findall(branch):
            ref = f"#{n}"
            if f"AB#{n}" not in found and ref not in found:
                found.append(ref)
    return unique(found)


def get_breaking_hints(diff_lines: List[str]) -> List[str]:
    hints: List[str] = []
    for line in diff_lines:
        if RE_BREAK.match(line):
            hints.append(line.lstrip('+').strip())
        if RE_EXPORT.match(line):
            hints.append(f"Removed export: {line.lstrip('-').strip()}")
    return unique(hints)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect git PR context and output JSON.")
    parser.add_argument("--base", default="", help="Base branch to compare against")
    parser.add_argument("--max-diff-lines", type=int, default=500)
    args = parser.parse_args()

    current, rc = run(["git", "branch", "--show-current"])
    if rc != 0:
        print("ERROR: Not a git repository or git is not available.", file=sys.stderr)
        sys.exit(1)

    raw, _ = run(["git", "branch", "-a", "--sort=-committerdate", "--format=%(refname:short)"])
    branches: List[str] = unique([
        b.replace("origin/", "") for b in raw.splitlines()
        if b and "HEAD" not in b
    ])[:15]

    base = args.base
    if not base:
        for candidate in ["main", "develop", "master", "dev", "release"]:
            if candidate in branches:
                base = candidate; break
        if not base:
            base = next((b for b in branches if b != current), "main")

        print(f"\n  Current branch : {current}", file=sys.stderr)
        print(f"  Suggested base : {base}", file=sys.stderr)
        ans = input(f"\n  Compare against '{base}'? [Y/n]: ").strip().lower()
        if ans in ("n", "no"):
            print("\n  Available branches:", file=sys.stderr)
            for b in branches[:10]: print(f"    - {b}", file=sys.stderr)
            base = input("\n  Enter base branch: ").strip()

    resolved = base
    _, rc = run(["git", "rev-parse", "--verify", base])
    if rc != 0:
        _, rc2 = run(["git", "rev-parse", "--verify", f"origin/{base}"])
        if rc2 != 0:
            print(f"ERROR: Branch '{base}' not found locally or on origin.", file=sys.stderr)
            sys.exit(1)
        resolved = f"origin/{base}"

    print(f"\n  Collecting: {current} vs {resolved}\n", file=sys.stderr)

    commits_raw, _ = run(["git", "log", f"{resolved}...HEAD", "--oneline"])
    diff_stat, _   = run(["git", "diff", f"{resolved}...HEAD", "--stat"])
    diff_full, _   = run(["git", "diff", f"{resolved}...HEAD"])

    diff_lines   = diff_full.splitlines()
    is_truncated = len(diff_lines) > args.max_diff_lines
    diff_output  = "\n".join(diff_lines[:args.max_diff_lines]) if is_truncated else diff_full

    added   = sum(1 for l in diff_lines if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff_lines if l.startswith("-") and not l.startswith("---"))
    files   = sum(1 for l in diff_lines if l.startswith("diff --git"))

    has_tests = bool(re.search(r'(test|spec)\.', diff_stat, re.I))
    has_mig   = bool(re.search(r'migrat', diff_stat, re.I))
    has_cl    = bool(re.search(r'CHANGELOG', diff_stat))
    has_deps  = bool(re.search(r'(package\.json|requirements\.txt|go\.mod|Cargo\.toml)', diff_stat))

    commit_list = [l for l in commits_raw.splitlines() if l]
    work_items  = extract_work_items(commit_list, branch=current)
    breaking    = get_breaking_hints(diff_lines)

    result = {
        "currentBranch":        current,
        "baseBranch":           resolved,
        "commitCount":          len(commit_list),
        "filesChanged":         files,
        "linesAdded":           added,
        "linesRemoved":         removed,
        "hasTests":             has_tests,
        "hasMigrations":        has_mig,
        "hasChangelog":         has_cl,
        "hasDependencyChanges": has_deps,
        "breakingChangeHints":  breaking,
        "workItems":            work_items,
        "diffIsTruncated":      is_truncated,
        "commits":              commit_list,
        "diffStat":             diff_stat,
        "diff":                 diff_output,
    }

    print(f"  Done - commits:{len(commit_list)} files:{files} +{added}/-{removed}", file=sys.stderr)
    if work_items: print(f"  Work items: {', '.join(work_items)}", file=sys.stderr)
    print("", file=sys.stderr)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
