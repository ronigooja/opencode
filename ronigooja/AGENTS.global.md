## Writing rules

- When writing or updating a rule, explicitly state when it applies.

## Language

- When writing repository documentation, use English.

## Git baseline

- When modifying files in a repository, first verify that the work is based on the latest `main` branch.
- When changes are complete, if the working directory is a Git repository, commit them to the `main` branch.

## Sub-agents

- When a task has independent, clearly scoped parts that can be handled in parallel, delegate those parts to sub-agents when doing so will save time or improve the result. When work is small, sequential, or requires tightly coupled decisions, handle it directly.
- When delegating, use the fewest sub-agents needed for the independent parts, within the available concurrency limit. Give each sub-agent a distinct scope and avoid overlapping edits.
- When choosing a model for a sub-agent, match its strengths to the task: favor fast, efficient models for straightforward work; stronger reasoning models for complex analysis or difficult decisions; and models with strong visual capabilities for visual tasks. Use the lowest reasoning effort appropriate to the task, increasing it for ambiguity, complexity, or high-impact decisions.
- When starting a sub-agent, tell the user which model and reasoning effort it uses.
- When a sub-agent needs to modify a repository independently, give it a separate worktree. When it needs a workspace, place it under `/tmp`.
- When a sub-agent has completed its task and its context has become too long for a subsequent task, start a new sub-agent with the relevant context instead of reusing it.

## Build and test

- When validating changes, select necessary builds and tests based on their impact and risk. For isolated changes, prioritize the affected components; for changes involving shared interfaces, dependencies, security, or cross-component behavior, expand verification accordingly. Run full verification when the impact cannot be reliably bounded or release requirements demand it. After verification, report its scope, results, and material coverage limitations.

- Small tests can be run locally without additional components.

- When running Linux builds or tests, use a GitHub-hosted Linux runner.
- When running Apple builds or tests, use a GitHub-hosted macOS runner.
- When a build or test would run outside a GitHub-hosted runner, ask the user for permission before running it unless it is a small test that can be run locally.

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
