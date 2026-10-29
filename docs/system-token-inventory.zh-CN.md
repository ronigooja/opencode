# OpenCode 系统 Token 清单

本文基于仓库 `dev` 分支源码整理。这里的“系统 token”指发送给模型的系统提示词、动态指令，以及模型请求中暴露的内置工具定义。

## 1. 总体注入链路

1. `SessionContext.select()` 选择 agent、权限、指令来源和工具快照（`packages/core/src/session/context.ts:112-168`）。
2. `SessionContext.load()` 读取模型和会话历史，并生成 `initial` 系统上下文（同文件 `:170-194`）。
3. `SessionModelRequest.baseTranscript()` 组装系统消息（`packages/core/src/session/model-request.ts:99-118`）：
   - 若 agent 配置了 `system`，完全使用该文本。
   - 否则使用默认系统提示词 `SessionSystemPrompt.make(toolNames)`。
   - 再追加 `initial`；空字符串会被过滤。
4. `OptimizePlugin` 在 `context`、`compaction`、`generate` 三类请求钩子中按模型替换或追加系统提示词（`packages/core/src/plugin/optimize.ts:78-103`）。
5. 插件钩子可以继续修改 system、messages、tools 和生成参数；最终请求由 `SessionModelRequest` 发给模型。

`IdentityPlugin` 还会在系统消息数组索引 1 插入当前模型身份块：模型名称、Provider ID、Model ID（`packages/core/src/plugin/identity.ts:10-30`）。它在上述三类请求中都执行，即使 agent 有自定义 `system` 也会插入。

## 2. 默认内置系统提示词

源码：`packages/core/src/session/runner/prompt/system.txt`，渲染器：`packages/core/src/session/system-prompt.ts`。

| 模块 | 作用 | 触发条件 | 开启/关闭 |
|---|---|---|---|
| 身份 | 声明“你是在 OpenCode 中运行的 AI agent”，目标是用可用工具完成用户目标 | 默认 agent 且未设置自定义 `system` | 配置 `agent.system` 后整段默认提示词被替换 |
| Harness | 说明输出按 GitHub Markdown 渲染；`<system-reminder>` 是 harness 指令；优先并行独立工具调用 | 同上 | 随默认提示词整体替换 |
| Communication | 要求使用清晰文件路径、简洁表达、少用术语 | 同上 | 随默认提示词整体替换 |
| Working in codebases | 要求遵循现有结构、命名和风格；删除或覆盖前先调查 | 同上 | 随默认提示词整体替换 |
| shell 工具指导 | 优先专用工具；禁止用 `;` 等分隔符拼接 shell 命令 | 工具快照包含 `shell` | 关闭/隐藏 shell 后该段不生成 |
| write 工具指导 | 新建或整文件替换用 `write`；局部修改优先 `edit` | 工具快照包含 `write` | 关闭/隐藏 write 后不生成 |
| edit 工具指导 | 解释 `oldString/newString` 精确替换、唯一匹配和 `replaceAll` | 工具快照包含 `edit` | 关闭/隐藏 edit 后不生成 |

### 默认提示词的替换规则

- `agent.system` 是最直接的总开关：设置后默认身份、Harness、Communication、代码库规则和按工具生成的指导都不再注入（`model-request.ts:106-112`）。
- 仅关闭某个工具时，默认提示词仍保留，其对应的工具指导会因工具名不存在而省略。
- 模型优化插件在发现 agent 有自定义 `system` 时跳过优化模板（`optimize.ts:89-91`）。

## 3. 动态系统指令（initial）

`SessionContext.select()` 按以下顺序合并指令，顺序也决定提示词缓存前缀（`context.ts:145-163`）：

| 指令块 | 内容与作用 | 调用条件 | 开启/关闭 |
|---|---|---|---|
| Code Mode catalog | 为 `execute` 提供可调用工具/命名空间目录 | Code Mode 可用且至少有聚合工具 | `execute` 权限整体 deny 时关闭；工具也可设 `codemode:false` 改为直接暴露 |
| MCP instructions | MCP 服务器提供的使用说明 | MCP 服务器已连接且权限允许 | 移除/禁用 MCP 服务器或 deny 对应权限 |
| References | 项目或配置引用文档 | 配置的 reference 可发现 | 删除配置或由插件移除 |
| Skills | 匹配当前任务的技能说明 | skill 可发现且权限允许 | 权限 deny `skill` 或禁用技能来源 |
| Instruction discovery | 自动发现的项目/全局指令文件（如 `AGENTS.md`） | discovery 可用且发现文件 | 配置 `project:false` 或 `global:false`；来源不可用时返回 unavailable |
| Built-ins | 当前日期和运行环境信息 | 每次 location 选择都会加载 | 由内置服务固定提供，需改源码/替换服务才能移除 |
| Session entries | 当前会话动态注入的指令或插件文本 | 会话历史中存在对应 entry | 删除/撤销该 entry |

此外，模型身份块 `# Your Model` 属于内置插件注入内容，作用是让模型知道当前实际使用的模型和提供商；没有独立配置开关，需禁用/替换内部插件或改源码。

内置块源码：`packages/core/src/instructions/builtins.ts:22-66`。

- `core/date`：注入 `Today's date: ...`，日期变化时发送更新文本。
- `core/environment`：注入 `<env>`，包含工作目录、项目根、是否 Git 仓库、平台、临时目录建议。
- 发现的指令文件以 `Instructions from: <path>` 形式注入，并记录路径避免同一会话重复注入（`session/instructions.ts`）。

## 4. 按模型启用的系统提示词模板

注册位置：`packages/core/src/plugin/optimize.ts:16-76`；模板目录：`packages/core/src/plugin/system-prompt/`。

| 模型匹配 | 模板 | 行为 | 关闭方式 |
|---|---|---|---|
| 模型 id 含 `gpt` | `gpt.txt`；id 含 `astra` 时用 `gpt-astra.txt` | override，替换系统消息首段 | 设置 `agent.system`；或移除/改写该内部插件 |
| 模型 id 含 `claude` | `anthropic.txt` | append，追加到默认系统消息后 | 同上 |
| 模型 id 含 `kimi` | `kimi.txt` | override | 同上 |
| 模型 id 含 `trinity` | `trinity.txt` | override | 同上 |
| 模型 id 含 `muse` | `meta.txt`，替换 `{{MODEL_NAME}}` | override | 同上 |

模板只在 `context`、`compaction`、`generate` 请求触发；匹配不到模型时不做处理。源码注释明确 `OpenAIToolsPlugin` 和 `AnthropicToolsPlugin` 当前未加入 `Plugins`，因此不会自动删除 grep/glob 工具。

## 5. 内置工具清单

注册总表：`packages/core/src/plugin/internal.ts:222-270`。工具快照由 `Tool.snapshot()` 生成（`packages/core/src/tool.ts:249-333`）。

| 工具 | 作用 | 注册源码 | 暴露/调用条件 |
|---|---|---|---|
| `read` | 读取文件、列目录，带行数/分页限制 | `tool/plugin/read.ts:15-44` | 默认直接工具；执行时受文件读取权限影响 |
| `edit` | 精确 `oldString`→`newString` 替换 | `edit.ts:219-222` | 默认直接工具；权限动作 `edit` |
| `patch` | 应用统一 diff，增删改文件 | `patch.ts:79-83` | 默认直接工具；权限动作 `edit` |
| `write` | 新建或覆盖文件 | `write.ts:57-61` | 默认直接工具；权限动作 `edit` |
| `glob` | 按 glob 搜索路径 | `glob.ts:56-60` | 默认直接工具 |
| `grep` | 正则/文本搜索文件内容 | `grep.ts:75-80` | 默认直接工具 |
| `shell` | 执行 shell 命令，支持超时和后台 | `shell.ts:193-196` | 默认直接工具；每次执行检查 shell 权限 |
| `question` | 向用户提问并等待回答 | `question.ts:56-60` | 调用时触发 question 权限 |
| `skill` | 加载技能说明及资源 | `skill.ts:40-44` | 仅有可用技能且未 deny `skill` 时注册 |
| `subagent` | 启动或跟进子代理 | `subagent.ts:108-112` | 默认直接工具；受子代理深度/权限限制 |
| `todowrite` | 创建、更新、删除任务 todo | `todo.ts:55-60` | 默认直接工具 |
| `webfetch` | 抓取 HTTP(S) 并转为文本/Markdown | `webfetch.ts:133-139` | 注册后仍受网络/权限检查 |
| `websearch` | 通过配置的搜索集成查询实时信息 | `websearch.ts:82-120` | 需至少一个可用搜索 provider；首次使用可能请求许可 |
| `image_generate` | 调用图像模型生成并保存图片 | `image-generate.ts:251-255` | 需可用图像 provider/model |
| `opencode.session_rename` | 修改会话名称 | `opencode.ts:117-136` | `opencode` 命名空间，通常经 `execute` 调用 |
| `opencode.session_move` | 移动会话到指定位置 | `opencode.ts:138-161` | 同上 |
| `opencode.worktree_create/list/remove` | 管理 Git worktree | `opencode.ts:162-220` | `remove` 使用 `edit` 权限；其余经 `execute` |
| `opencode.models` | 列出可用模型 | `opencode.ts:227-248` | 经 `execute` |
| `opencode.schedule_*` | 创建、列出、暂停、恢复、删除计划任务 | `schedule.ts:65-158` | 仅 `experimental.schedules === true` 且运行时 `enabled()` 为真时注册；经 `execute` |
| `opencode.schedule` | 查看/触发计划任务状态 | `schedule.ts:151-158` | 同上 |
| `opencode.list_mcp_resources` | 列出 MCP 资源 | `mcp-resource.ts:18-22` | MCP 资源存在时才有意义；经 `execute` |
| `opencode.read_mcp_resource` | 读取 MCP 资源 | `mcp-resource.ts:50-53` | 同上 |
| MCP server tools | 代理外部 MCP 工具 | `tool/mcp.ts:44-55` | MCP 连接建立、工具发现且权限允许 |

## 6. 工具如何聚合、开启和关闭

### 6.1 Code Mode 聚合

- 工具默认 `codemode:true`；这类工具不逐个暴露，而是汇总进 `execute` 的 Code Mode catalog。
- `codemode:false` 的工具（当前主要是文件、shell、搜索、交互类工具）直接出现在模型工具列表。
- 若权限规则整体 deny `execute`，Code Mode 关闭，原本聚合的工具会改为直接暴露（`tool.ts:257-264`）。

### 6.2 权限过滤

`SessionContext.select()` 合并 agent 权限和会话权限后调用 `registry.snapshot(permissions)`（`context.ts:130-145`）。当某工具的动作匹配到 `resource:"*"` 且 `effect:"deny"` 时，工具从快照中完全消失（`tool.ts:253-256`）。

示例配置：

```jsonc
{
  "permissions": [
    { "action": "shell", "resource": "*", "effect": "deny" },
    { "action": "edit", "resource": "*", "effect": "ask" },
    { "action": "execute", "resource": "*", "effect": "deny" }
  ]
}
```

- 关闭 shell：deny `shell`。
- 同时控制 `edit`、`write`、`patch`：deny `edit`。
- 关闭 Code Mode：deny `execute`；这会使聚合工具转为直接工具，若还要完全隐藏它们，需要分别 deny 对应动作。
- 恢复工具：移除 deny，或使用 `allow`/`ask` 规则；规则按最后匹配项评估（`packages/core/src/permission.ts:53-72`）。

### 6.3 Agent 自定义系统提示词

在 agent 配置中设置 `system` 会替换默认系统提示词，并使模型专用优化模板跳过。它不会自动删除工具；工具仍由权限和 `Tool.snapshot()` 决定。

## 7. 关键源码索引

- 默认提示词：`packages/core/src/session/runner/prompt/system.txt`
- 默认提示词渲染：`packages/core/src/session/system-prompt.ts`
- 系统消息组装：`packages/core/src/session/model-request.ts`
- 动态指令选择：`packages/core/src/session/context.ts`
- 内置日期/环境：`packages/core/src/instructions/builtins.ts`
- 模型提示词优化：`packages/core/src/plugin/optimize.ts` 与 `packages/core/src/plugin/system-prompt/*.txt`
- 工具注册：`packages/core/src/plugin/internal.ts`
- 工具快照与 Code Mode：`packages/core/src/tool.ts`
- 权限规则：`packages/core/src/permission.ts`
