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

- `.github/workflows/ronigooja-linux-cli.yml` — GitHub reads workflows only from
  `.github/workflows/`, so this file cannot live here. It is a manual
  (`workflow_dispatch`) build of the `linux-x64` and `linux-arm64` CLI on
  GitHub-hosted runners, and publishes a GitHub Release tagged
  `v<packages/cli version>-ronigooja.<run number>` with two `tar.gz` files and
  `SHA256SUMS`. The upstream `release` workflow is skipped on this fork by its
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
