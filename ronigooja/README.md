# ronigooja custom files

This directory contains the files contributed by `ronigooja` that are specific
 to the local OpenCode setup and are intentionally kept separate from the
 upstream source tree.

## Files

- `opencode-sync-models` — synchronizes the OpenAI-compatible model catalog into
  the local OpenCode configuration. It writes the current `providers` format,
  preserves the API key in `settings.apiKey`, records `releaseDate`, and maps
  model context/output limits when the catalog provides them.
- `system-token-inventory.zh-CN.md` — Chinese notes about the system prompt and
  built-in tool token inventory.
- `AGENTS.global.md` — a copy of the rules file included in the `ronigooja` commit; it is not the active project `AGENTS.md`.

The local launchd job uses the installed copy at
`/Users/zhuwei/environment/bin/opencode-sync-models`. The repository script is
installed there manually when it changes; the launchd job itself is defined by
`~/Library/LaunchAgents/com.zhuwei.opencode-sync-models.plist` and runs every
six hours.

## Deliberately excluded

`packages/cli/src/commands/handlers/models.ts` is not part of this directory.
The `ronigooja` model-ordering experiment in that file was reverted and must
not be restored by the sync-tool changes.
