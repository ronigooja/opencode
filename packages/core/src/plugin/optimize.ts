export * as OptimizePlugin from "./optimize.js"

import { define, type Context } from "@opencode/plugin/effect/plugin"
import type { SessionHooks } from "@opencode/plugin/effect/session"
import { Model } from "@opencode/schema/model"
import { FSUtil } from "@opencode/util/fs-util"
import { Global } from "@opencode/util/global"
import { Effect, Option } from "effect"
import path from "path"
import { SessionSystemPrompt } from "../session/system-prompt.js"

import PROMPT_GPT from "./system-prompt/gpt.txt"
import PROMPT_ASTRA from "./system-prompt/gpt-astra.txt"
import PROMPT_KIMI from "./system-prompt/kimi.txt"
import PROMPT_META from "./system-prompt/meta.txt"
import PROMPT_TRINITY from "./system-prompt/trinity.txt"
import PROMPT_ANTHROPIC from "./system-prompt/anthropic.txt"

// A file with the same name in `<config dir>/prompts/` replaces the built-in template on every request.
export const OpenAIPlugin = make(
  "opencode.prompt.openai",
  (model) => {
    const id = model.id.toLowerCase()
    if (!id.includes("gpt")) return undefined
    return id.includes("astra") ? PROMPT_ASTRA : PROMPT_GPT
  },
  "override",
  new Map([
    [PROMPT_GPT, "gpt.txt"],
    [PROMPT_ASTRA, "gpt-astra.txt"],
  ]),
)

export const AnthropicPlugin = make(
  "opencode.prompt.anthropic",
  (model) => {
    const id = model.id.toLowerCase()
    if (!id.includes("claude")) return undefined
    return PROMPT_ANTHROPIC
  },
  "append",
)

// Both OpenAIToolsPlugin and AnthropicToolsPlugin are disabled intentionally until we can figure out a good ux for displaying
// heavy grep/glob usage done via shell or other mechanisms

export const OpenAIToolsPlugin = make("opencode.optimize.openai.tools", (model, tools) => {
  const ids = [model.id, model.modelID, model.family].join(" ").toLowerCase()
  if (!ids.includes("gpt")) return undefined
  delete tools.grep
  delete tools.glob
  return undefined
})

export const AnthropicToolsPlugin = make("opencode.optimize.anthropic.tools", (model, tools) => {
  const ids = [model.id, model.modelID, model.family].join(" ").toLowerCase()
  if (!ids.includes("claude")) return undefined
  delete tools.grep
  delete tools.glob
  return undefined
})

export const KimiPlugin = make("opencode.prompt.kimi", (model) =>
  model.id.toLowerCase().includes("kimi") ? PROMPT_KIMI : undefined,
)
export const ArceePlugin = make("opencode.prompt.arcee", (model) =>
  model.id.toLowerCase().includes("trinity") ? PROMPT_TRINITY : undefined,
)
export const MetaPlugin = make("opencode.prompt.meta", (model) => {
  if (!model.id.toLowerCase().includes("muse")) return undefined
  return PROMPT_META.replaceAll("{{MODEL_NAME}}", model.name)
})

export const Plugins = [OpenAIPlugin, AnthropicPlugin, KimiPlugin, ArceePlugin, MetaPlugin] as const

const models = new WeakMap<SessionHooks["context"], Model.Info>()

export const resolveModel = (ctx: Context, event: SessionHooks["context"]) =>
  Effect.gen(function* () {
    const cached = models.get(event)
    if (cached?.providerID === event.model.providerID && cached.id === event.model.id) return cached
    const model: Model.Info =
      (yield* ctx.model.list()).data.find(
        (model) => model.providerID === event.model.providerID && model.id === event.model.id,
      ) ?? Model.Info.default(event.model.providerID, event.model.id)
    models.set(event, model)
    return model
  })

function make(
  id: string,
  optimize: (model: Model.Info, tools: SessionHooks["context"]["tools"]) => string | undefined,
  mode: "override" | "append" = "override",
  files: ReadonlyMap<string, string> = new Map(),
) {
  return define({
    id,
    effect: Effect.fn(`OptimizePlugin.${id}`)(function* (ctx) {
      // Optional so the plugin keeps its original requirements; without them the built-in template is used.
      const fs = yield* Effect.serviceOption(FSUtil.Service)
      const global = yield* Effect.serviceOption(Global.Service)
      const hook = (event: SessionHooks["context"]) =>
        Effect.gen(function* () {
          const model = yield* resolveModel(ctx, event)
          // Curate tools before rendering their guidance, including for agents with a custom system prompt.
          const builtin = optimize(model, event.tools)
          if (!builtin) return
          if ((yield* ctx.agent.get({ agentID: event.agent })).data.system) return
          const system = event.system[0]
          if (!system) return
          const file = files.get(builtin)
          const custom =
            file && Option.isSome(fs) && Option.isSome(global)
              ? (yield* fs.value
                  .readFileStringSafe(path.join(global.value.config, "prompts", file))
                  .pipe(Effect.orElseSucceed(() => undefined)))?.trim()
              : undefined
          const rendered = SessionSystemPrompt.render(custom || builtin, Object.keys(event.tools))
          const text = mode === "append" ? `${system.text}\n\n${rendered}` : rendered
          event.system[0] = { ...system, text }
        }).pipe(Effect.catch(() => Effect.void))
      yield* ctx.session.hook("context", hook)
      yield* ctx.session.hook("compaction", hook)
      yield* ctx.session.hook("generate", hook)
    }),
  })
}
