## Writing rules

- When writing or updating a rule, explicitly state when it applies.

## Language

- When writing repository documentation, use English.
- When writing repository documentation, write mainly for AI agents: keep it concise, define each fact once and link to it elsewhere, and optimize for selective reading rather than human browsing.

## Git baseline

- When modifying files in a Git repository, first verify the work is based on the latest default branch (usually `main`).
- When changes are complete in a Git repository, commit only the files you changed to the default branch.

## Sub-agents

- When a task has independent, clearly scoped parts, delegate them to sub-agents in parallel if that saves time. Otherwise, handle the work directly.
- When choosing a model for a sub-agent, pick a proper GPT model and reasoning effort for the task. Do not use non-GPT models.
- When starting a sub-agent, tell the user its model and reasoning effort.
- When the result is needed before continuing, run the sub-agent in the foreground. Otherwise, run it in the background.
- When a sub-agent modifies a repository, give it a separate worktree under `/tmp`.
- When a sub-agent's context is too long for a new task, start a fresh sub-agent instead of reusing it.

## Build and test

- When validating changes, run the builds and tests that match the change's impact and risk. Run full verification when the impact is unclear or a release requires it. Afterward, report the scope, results, and any coverage gaps.

- When running Linux builds or tests, use a GitHub-hosted Linux runner.
- When running Apple builds or tests, use a GitHub-hosted macOS runner.
- When a build or test would run outside a GitHub-hosted runner, ask the user for permission before running it unless it is a small test that can be run locally.

- Small tests without additional components can be run locally.

## Downloads and installations

- When downloading or installing anything, use `/tmp` for temporary or test-only files and `$HOME/environment` for persistent environment files and tools.
- When downloading or installing anything, report its exact source and destination, including any default location.
- When the operation is complete, remove temporary files that are no longer needed.

## GitHub Actions storage

- When uploading workflow artifacts, include only files needed for subsequent work or diagnosis, and set a retention period appropriate to their purpose and the repository's storage policy.
- When configuring workflow caches, use cache keys and restore keys that enable safe reuse, and choose cleanup settings appropriate to the repository's storage limits.
- When deciding whether to add a cache, consider its expected time savings and maintenance cost.
- When configuring workflow logs, follow the repository's retention policy and avoid exposing sensitive information.

## Terminal output

- When running installation, build, test, or other commands expected to produce lengthy output, redirect stdout and stderr to a temporary log file. On success, do not read the log; on failure, read only the excerpts needed to diagnose the issue. Report concise results and show full logs only when explicitly requested. Keep interactive prompts visible.

## Waiting for updates

- When waiting for an update at a specific location, estimate the expected wait time and avoid polling too frequently.

## Action transparency

Before starting a task, make sure the user knows what you plan to do.
