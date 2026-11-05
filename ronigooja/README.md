# ronigooja custom files

This directory contains the files contributed by `ronigooja` that are specific
 to the local OpenCode setup and are intentionally kept separate from the
 upstream source tree.

## Files

- `opencode-models` — zsh tool (needs `curl` and `jq`) with subcommands:
  - `sync` synchronizes the OpenAI-compatible model catalog into the local
    OpenCode configuration. It writes the current `providers` format,
    preserves the API key in `settings.apiKey`, records `releaseDate`, and maps
    model context/input/output limits when the gateway catalog provides them.
    Missing limits are filled from the official OpenCode catalog at
    `https://models.opencode.ai/catalog.json`; gateway-provided values take
    precedence. Only first-party providers (`anthropic`, `openai`; override with
    `officialProviders` in the routing preferences) supply limits, because
    resellers publish conflicting values for the same model id. The base URL and key come from `OPENCODE_BASE_URL` and
    `OPENCODE_API_KEY`, then from `providers.<id>.settings` in `opencode.json`.
    `~/.codex/config.toml` is no longer read.
  - `route` creates one subagent per dimension that the IQ monitor API
    (`https://iq.z0e.dev/monitor`) lists in `dimensions.json`, named
    `dim-<dimension>` in `agents` of `opencode.json`: `mode` is `subagent`,
    `description` is the dimension's `use_when`, and `model` is
    `provider/model#effort` from `best.json`. The main model picks a subagent
    from these descriptions (the `subagent` tool lists each subagent's
    description), so the routing is by task type. A new dimension of the API
    gets an agent without a script change, and a dimension that disappears loses
    its agent; agents without the `dim-` prefix, such as `explore` and
    `general`, are never touched. When no model is eligible the dimension's
    `fallback` in the preferences is used, or the agent is not created. Set
    `route.enabled` to `false` to disable IQ API requests and use the saved
    fallbacks with the last known agent descriptions; the `config` menu can
    switch this mode. In offline mode the configured dimensions are used and a
    missing fallback leaves that dimension without an agent.
    agents deny `question` and `subagent`, like the built-in `general`.
  - `config` is an interactive menu for the routing mode, model provider (id, display name,
    address, key), the evaluation API address, the global `exclude` keywords,
    the per-dimension `exclude` keywords and `fallback` (the dimension list
    comes from the API while enabled; unconfigured dimensions are marked `*`
    and get no exclude rule). Fallback model selection is a numbered menu from
    the synced provider model list, so model ids do not need to be typed. The
    variant menu reads the selected model's runtime variants from OpenCode's
    `model.list` endpoint. A `fallback` is a bare model id, optionally followed
    by `#variant`; it follows the configured provider. `route --dry-run` and
    `sync --dry-run` preview without writing.
  - `install` copies the script to `~/Agents/environment/bin` and schedules
    `sync` (default once per 86400 s) and `route` (default every 1800 s) with
    launchd; it also removes the old `opencode-sync-models` job and copy.
    `uninstall` removes them.

  Routing preferences live in `~/.config/opencode/model-routing.json`
  (`OPENCODE_MODEL_ROUTING` overrides the path). The script replaces
  `opencode-sync-models`, which was removed.
- `system-token-inventory.zh-CN.md` — Chinese notes about the system prompt and
  built-in tool token inventory.

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
- `.github/workflows/{check,check-test,check-nix,check-process-daemon,release,release-process-daemon,bot-nix-hashes,bot-docs-locale,deploy,deploy-www,deploy-update,deploy-files,deploy-posts,deploy-changelog}.yml`
  — the `push` and `pull_request` triggers are removed, leaving only
  `workflow_dispatch`. This fork has no `blacksmith-4vcpu-ubuntu-2404` runner,
  so every push queued runs that never started. The jobs are unchanged and can
  still be started manually. When syncing upstream, expect conflicts in the
  `on:` block of these files and keep this fork's version.
- `packages/core/src/plugin/system-prompt/gpt.txt` and `gpt-astra.txt` — kept
  identical to upstream. The fork's GPT prompt text is maintained outside the
  repository in `<config dir>/prompts/` (see the next entry), so syncing
  upstream does not conflict on these two files.
- `packages/core/src/plugin/optimize.ts` — `OpenAIPlugin` reads
  `<config dir>/prompts/gpt.txt` or `gpt-astra.txt` on every request and uses it
  instead of the built-in template of the same name. The fork's prompts add an
  `# Investigating` section and tighter final-answer rules, and the astra
  Autonomy section defers to its ask-on-ambiguity rule. The model-based choice
  between the two is unchanged, `${OPENCODE_TOOL_GUIDANCE}` is still rendered,
  and an agent with its own `system` still skips the plugin. A missing,
  unreadable or empty file falls back to the built-in template. The config dir
  is `OPENCODE_CONFIG_DIR` when set, otherwise the global config directory
  (`~/.config/opencode`). Editing the file needs no rebuild or restart. When
  syncing upstream, expect conflicts in `make` and `OpenAIPlugin`.
- `.github/workflows/ronigooja-test.yml` — manual (`workflow_dispatch`) run of
  selected `packages/core` test files plus `bun typecheck` and `typecheck:tsc` on
  a GitHub-hosted `ubuntu-24.04` runner. It exists because `check-test` needs
  the missing Blacksmith runners. The `files` input defaults to
  `test/plugin/optimize.test.ts`. It does not replace the full suite.
- `packages/core/test/plugin/optimize.test.ts` — runs against a temporary config
  dir (it provides `Global.layerWith` to each test) so it never reads
  `~/.config/opencode/prompts/`, and it covers the prompt override files. The
  shared `fixture.ts` is unchanged.
- `.github/workflows/ronigooja-cli.yml` — GitHub reads workflows only from
  `.github/workflows/`, so this file cannot live here. It is a manual
  (`workflow_dispatch`) build of the `linux-x64`, `linux-arm64` and
  `darwin-arm64` CLI on GitHub-hosted runners, and publishes a GitHub Release
  tagged `v<packages/cli version>-ronigooja.<run number>` with the `tar.gz`
  files and `SHA256SUMS`. The macOS binary is ad-hoc signed, not notarized. The
  upstream `release` workflow is skipped on this fork by its
  `github.repository == 'anomalyco/opencode'` guard.

The local launchd jobs `com.zhuwei.opencode-models-sync` and
`com.zhuwei.opencode-models-route` run the installed copy at
`~/Agents/environment/bin/opencode-models`. Run `ronigooja/opencode-models
install` again after the script or the intervals change.

## Deliberately excluded

`packages/cli/src/commands/handlers/models.ts` is not part of this directory.
The `ronigooja` model-ordering experiment in that file was reverted and must
not be restored by the sync-tool changes.
