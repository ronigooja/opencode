# ronigooja custom files

This directory contains the files contributed by `ronigooja` that are specific
 to the local OpenCode setup and are intentionally kept separate from the
 upstream source tree.

## Files

- `opencode-sync-models` — synchronizes the OpenAI-compatible model catalog into
  the local OpenCode configuration. It writes the current `providers` format,
  preserves the API key in `settings.apiKey`, records `releaseDate`, and maps
  model context/input/output limits when the gateway catalog provides them.
  Missing limits are filled from the official OpenCode catalog at
  `https://models.opencode.ai/catalog.json`; gateway-provided values take
  precedence.
- `system-token-inventory.zh-CN.md` — Chinese notes about the system prompt and
  built-in tool token inventory.
- `AGENTS.global.md` — file included by the `ronigooja` commits.

## Files outside this directory

- `install`, `packages/cli/src/services/updater.ts`, and
  `packages/cli/test/updater-install.test.ts` — point the standalone (curl)
  install and the built-in upgrade at this fork instead of `opencode.ai`.
  `install` reads the latest GitHub release of `ronigooja/opencode` and
  downloads `opencode-<target>.tar.gz` from it. The updater checks
  `releases/latest` and fetches `install` from the `dev` branch. Package
  managers (npm, pnpm, bun, yarn, vp, brew, winget) still use upstream
  packages. Only a binary built after this change uses the new source. The
  fork publishes `linux-x64`, `linux-arm64` and `darwin-arm64` only, so
  `install` fails on other targets and on baseline or musl variants.
- `packages/cli/src/commands/handlers/default.ts` — the TUI's background update
  check repeats every day instead of every 10 minutes. It still runs once at
  startup, and `/update` and `opencode upgrade` check on demand.
- `.github/workflows/ronigooja-cli.yml` — GitHub reads workflows only from
  `.github/workflows/`, so this file cannot live here. It is a manual
  (`workflow_dispatch`) build of the `linux-x64`, `linux-arm64` and
  `darwin-arm64` CLI on GitHub-hosted runners, and publishes a GitHub Release
  tagged `v<packages/cli version>-ronigooja.<run number>` with the `tar.gz`
  files and `SHA256SUMS`. The macOS binary is ad-hoc signed, not notarized. The
  upstream `release` workflow is skipped on this fork by its
  `github.repository == 'anomalyco/opencode'` guard.

The local launchd job uses the installed copy at
`/Users/zhuwei/environment/bin/opencode-sync-models`. The repository script is
installed there manually when it changes; the launchd job itself is defined by
`~/Library/LaunchAgents/com.zhuwei.opencode-sync-models.plist` and runs every
six hours.

## Deliberately excluded

`packages/cli/src/commands/handlers/models.ts` is not part of this directory.
The `ronigooja` model-ordering experiment in that file was reverted and must
not be restored by the sync-tool changes.
