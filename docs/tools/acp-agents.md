---
summary: "通过 ACP 后端运行外部编码工具（Claude Code、Cursor、Gemini CLI、显式 Codex ACP、OpenClaw ACP、OpenCode）"
read_when:
  - 通过 ACP 运行编码工具
  - 在消息渠道上设置绑定到对话的 ACP 会话
  - 将消息渠道对话绑定到持久 ACP 会话
  - 排查 ACP 后端、插件接线或完成投递问题
  - 在聊天中操作 /acp 命令
title: "ACP 代理"
sidebarTitle: "ACP 代理"
---

[代理客户端协议（ACP）](https://agentclientprotocol.com/) 会话允许
OpenClaw 通过 ACP 后端插件运行外部编码工具（Claude Code、Cursor、Copilot、Droid、
OpenClaw ACP、OpenCode、Gemini CLI，以及其他受支持的 ACPX 工具）。
每次启动都会被记录为一个
[后台任务](/automation/tasks)。

<Note>
**ACP 是外部工具的路径，不是默认的 Codex 路径。** 原生
Codex 应用服务器插件负责 `/codex ...` 控件和默认的
`openai/gpt-*` 内嵌运行时，用于代理回合；ACP 负责 `/acp ...` 控件
以及 `sessions_spawn({ runtime: "acp" })` 会话。

要让 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到
现有的 OpenClaw 渠道对话，请改用
[`openclaw mcp serve`](/cli/mcp)，而不是 ACP。
</Note>

## 我该看哪个页面？

| 你想要……                                                                                  | 使用此项                              | 备注                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 在当前对话中绑定或控制 Codex                                               | `/codex bind`, `/codex threads`       | 当启用 `codex` 插件时，原生 Codex 应用服务器路径：绑定聊天回复、图像转发、模型/快速/权限、停止和引导。ACP 是显式的后备方案 |
| 通过 OpenClaw 运行 Claude Code、Gemini CLI、显式 Codex ACP，或其他外部 harness                             | 本页                             | 绑定到聊天的会话、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、后台任务、运行时控制                                                                 |
| 将 OpenClaw Gateway 会话 _作为_ ACP 服务器暴露给编辑器或客户端                   | [`openclaw acp`](/cli/acp)            | 桥接模式：IDE/客户端通过 stdio/WebSocket 与 OpenClaw 进行 ACP 通信                                                                                                      |
| 将本地 AI CLI 作为仅文本的后备模型复用                                              | [CLI 后端](/gateway/cli-backends) | 不是 ACP：没有 OpenClaw 工具、没有 ACP 控制、没有 harness 运行时                                                                                                             |

## 这开箱即用吗？

是的，安装官方 ACP 运行时插件后即可：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源码检出可在 `pnpm install` 之后使用本地 `extensions/acpx` 工作区插件。运行 `/acp doctor` 进行就绪检查。

只有当 ACP **真正可用**时，OpenClaw 才会向代理说明 ACP 启动方式：
ACP 必须已启用，dispatch 不能被禁用，当前会话不能被沙箱阻止，并且必须加载且健康的运行时后端。如果
任一条件失败，ACP 技能和 `sessions_spawn` ACP 指引都会保持隐藏，
这样代理就不会建议一个不可用的后端。

<AccordionGroup>
  <Accordion title="首次运行的注意事项">
    - 如果设置了 `plugins.allow`，它就是一个受限的插件清单，并且 **必须** 包含 `acpx`，否则已安装的 ACP 后端会被故意阻止（`/acp doctor` 会报告缺失的允许列表项）。
    - Codex ACP 适配器自带 `acpx` 插件，并在可能时本地启动。
    - Codex ACP 使用隔离的 `CODEX_HOME` 运行。OpenClaw 会将受信任的项目信任条目以及安全的模型/提供方路由配置（`model`、`model_provider`、`model_reasoning_effort`、`sandbox_mode`，以及安全的 `model_providers.<name>` 字段）从宿主 Codex 配置中复制过来；认证、通知和 hooks 仅保留在宿主配置中。
    - 其他目标 harness 适配器可能会在首次使用时通过 `npx` 按需获取。
    - 该 harness 的厂商认证必须已在宿主上存在。
    - 如果宿主没有 npm 或网络访问权限，首次运行时的适配器获取将会失败，直到缓存被预热或以其他方式安装该适配器。

  </Accordion>
  <Accordion title="运行时前提条件">
    ACP 会启动一个真实的外部 harness 进程。OpenClaw 负责路由、
    后台任务状态、投递、绑定和策略；harness 负责
    其提供方登录、模型目录、文件系统行为和原生工具。

    在归咎于 OpenClaw 之前，请验证：

    - `/acp doctor` 报告 backend 已启用且健康。
    - 当设置了 allowlist 时，目标 id 需要被 `acp.allowedAgents` 允许。
    - harness 命令可以在 Gateway 主机上启动。
    - 该 harness 已存在供应商认证（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 为该 harness 选择的模型存在 - 模型 id 不能跨 harness 通用。
    - 请求的 `cwd` 存在且可访问，或者省略 `cwd` 让 backend 使用其默认值。
    - 权限模式与工作内容匹配。非交互式会话无法点击原生权限提示，因此大量写入/执行的编码运行通常需要能够无头继续的 ACPX 权限配置文件。

  </Accordion>
</AccordionGroup>

默认情况下，OpenClaw 插件工具和内置的 OpenClaw 工具**不会**暴露给 ACP
harness。只有在 harness 需要直接调用这些工具时，才在
[ACP agents - setup](/tools/acp-agents-setup) 中启用显式的 MCP 桥接。

## 支持的 harness 目标

使用 `acpx` 后端时，可将这些 id 作为 `/acp spawn <id>` 或
`sessions_spawn({ runtime: "acp", agentId: "<id>" })` 的目标：

| Harness id   | 常见后端                                | 说明                                                                               |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `claude`     | Claude Code ACP 适配器                            | 需要主机上已完成 Claude Code 身份验证。                                              |
| `codex`      | Codex ACP 适配器                              | 仅在原生 `/codex` 不可用或请求 ACP 时，才会显式回退到 ACP。 |
| `copilot`    | GitHub Copilot ACP 适配器                     | 需要 Copilot CLI/runtime 身份验证。                                                  |
| `cursor`     | Cursor CLI ACP (`cursor-agent acp`)            | 如果本地安装暴露了不同的 ACP 入口点，请覆盖 acpx 命令。    |
| `droid`      | Factory Droid CLI                              | 需要 Factory/Droid 身份验证，或在 harness 环境中提供 `FACTORY_API_KEY`。        |
| `fast-agent` | fast-agent-mcp ACP 适配器                     | 通过 `uvx` 按需获取。                                                       |
| `gemini`     | Gemini CLI ACP 适配器                         | 需要 Gemini CLI 身份验证或 API key 配置。                                          |
| `iflow`      | iFlow CLI                                      | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `kilocode`   | Kilo Code CLI                                  | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `kimi`       | Kimi/Moonshot CLI                              | 需要主机上已完成 Kimi/Moonshot 身份验证。                                            |
| `kiro`       | Kiro CLI                                       | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `mux`        | Mux CLI ACP 适配器                            | 通过 `npx` 按需获取。                                                       |
| `opencode`   | OpenCode ACP 适配器                           | 需要 OpenCode CLI/provider 身份验证。                                                |
| `openclaw`   | 通过 `openclaw acp` 连接到 OpenClaw Gateway 的桥接 | 允许支持 ACP 的 harness 与 OpenClaw Gateway 会话进行回连。                 |
| `qoder`      | Qoder CLI                                      | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `qwen`       | Qwen Code / Qwen CLI                           | 需要主机上具备与 Qwen 兼容的身份验证。                                          |
| `trae`       | Trae CLI ACP 适配器                           | 适配器可用性和模型控制取决于已安装的 CLI。                 |

`pi`（pi-acp）也在 acpx 后端中注册，但它并不像上面这些那样属于编码
harness。

自定义 acpx agent 别名可以在 acpx 本身中配置，但在分发前，OpenClaw
策略仍会检查 `acp.allowedAgents` 以及任何
`agents.entries.*.runtime.acp.agent` 映射。

## 操作手册

从聊天中快速进行 `/acp` 流程：

<Steps>
  <Step title="生成">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto`，或显式
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="工作">
    在已绑定的对话或线程中继续（或者显式指定会话键）。
  </Step>
  <Step title="检查状态">
    `/acp status`
  </Step>
  <Step title="调整">
    `/acp model <provider/model>`、`/acp permissions <profile>`、
    `/acp timeout <seconds>`。
  </Step>
  <Step title="引导">
    不替换上下文地引导：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命周期详情">
    - Spawn 会创建或恢复一个 ACP 运行时会话，在 OpenClaw 会话存储中记录 ACP 元数据，并且在运行归父级拥有时可能创建一个后台任务。
    - 归父级拥有的 ACP 会话即使运行时会话是持久化的，也会被视为后台工作；完成和跨表面传递通过父级任务通知器进行，而不是像普通面向用户的聊天会话那样处理。
    - 任务维护会关闭处于终态或孤立的、归父级拥有的一次性 ACP 会话。只要仍存在活动的对话绑定，就会保留持久化 ACP 会话；没有活动绑定的陈旧持久化会话会被关闭，因此在拥有它的任务完成或其任务记录消失后，它们不能被静默恢复。
    - 已绑定的后续消息会直接发送到 ACP 会话，直到绑定被关闭、失去焦点、重置或过期。
    - 网关命令保持本地处理。`/acp ...`、`/status` 和 `/unfocus` 永远不会作为普通提示文本发送到已绑定的 ACP harness。
    - 当后端支持取消时，`cancel` 会中止当前活动轮次；它不会删除绑定或会话元数据。
    - `close` 会从 OpenClaw 的角度结束 ACP 会话并移除绑定。如果 harness 支持恢复，它仍可能保留自己的上游历史记录。
    - acpx 插件会在 `close` 后清理 OpenClaw 拥有的包装器和适配器进程树，并在 Gateway 启动期间回收陈旧的 OpenClaw 拥有的 ACPX 孤儿进程。
    - 空闲运行时工作进程在内置空闲期过后可被清理；存储的会话元数据仍可用于 `/acp sessions`。

  </Accordion>
  <Accordion title="原生 Codex 路由规则">
    当启用时，应路由到 **原生 Codex 插件** 的自然语言触发语句：

    - “将这个 Discord 渠道绑定到 Codex。”
    - “把这个聊天附加到 Codex 线程 `<id>`。”
    - “显示 Codex 线程，然后把这个绑定上。”

    原生 Codex 对话绑定是默认的聊天控制路径。
    OpenClaw 动态工具仍通过 OpenClaw 执行，而诸如 shell/apply-patch 之类的 Codex 原生工具则在 Codex 内部执行。对于 Codex 原生工具事件，OpenClaw 会注入一个每轮一次的原生 hook relay，使插件 hooks 能够拦截 `before_tool_call`、观察 `after_tool_call`，并通过 OpenClaw 审批来路由 Codex 的 `PermissionRequest` 事件。Codex 的 `Stop` hooks 会转发到 OpenClaw 的 `before_agent_finalize`，插件可以在此请求再进行一次模型调用后再由 Codex 完成最终答复。该 relay 始终保持刻意保守：它不会修改 Codex 原生工具参数，也不会重写 Codex 线程记录。仅当你需要 ACP runtime/session 模型时才使用显式 ACP。嵌入式 Codex 支持边界记录在
    [Codex harness v1 支持契约](/plugins/codex-harness-runtime#v1-support-contract)。

  </Accordion>
  <Accordion title="模型 / 提供商 / 运行时选择速查表">
    - 旧版 Codex 模型引用 - 由 doctor 修复的旧版 Codex OAuth/订阅模型路由。
    - `openai/*` - 用于 OpenAI agent 回合的原生 Codex app-server 嵌入式 runtime。
    - `/codex ...` - 原生 Codex 对话控制。
    - `/acp ...` 或 `runtime: "acp"` - 显式 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP 路由自然语言触发语句">
    应该路由到 ACP 运行时的触发语句：

    - “把这个作为一次性的 Claude Code ACP 会话运行并总结结果。”
    - “这个任务在一个线程里使用 Gemini CLI，然后让后续跟进留在同一个线程里。”
    - “通过 ACP 在后台线程中运行 Codex。”

    OpenClaw 会选择 `runtime: "acp"`，解析 harness 的 `agentId`，在支持时绑定到当前对话或线程，并将后续消息路由到该会话，直到关闭/过期。只有当 ACP/acpx 是显式指定的，或者所请求操作的原生 Codex 插件不可用时，Codex 才会走这条路径。

    对于 `sessions_spawn`，只有在启用 ACP、请求方未处于沙箱中且已加载 ACP 运行时后端时，才会公布 `runtime: "acp"`。`acp.dispatch.enabled=false` 会暂停自动 ACP 线程分派，但不会隐藏或阻止显式的 `sessions_spawn({ runtime: "acp" })` 调用。它针对的是 `codex`、`claude`、`droid`、`gemini` 或 `opencode` 等 ACP harness id。除非 `agents_list` 中的条目已明确配置为 `agents.entries.*.runtime.type="acp"`，否则不要传入普通的 OpenClaw 配置 agent id；请改用默认的子代理运行时。当某个 OpenClaw agent 配置了 `runtime.type="acp"` 时，OpenClaw 会使用 `runtime.acp.agent` 作为底层 harness id。

  </Accordion>
</AccordionGroup>

## ACP 与子代理

当你想要一个外部 harness 运行时，请使用 ACP。当 `codex` 插件启用时，用 **原生 Codex 应用服务器**进行 Codex 对话绑定/控制。当你想要 OpenClaw 原生的委派运行时，请使用 **子代理**。

| 区域          | ACP 会话                           | 子代理运行                      |
| ------------- | ------------------------------------- | ---------------------------------- |
| 运行时       | ACP 后端插件（例如 acpx）            | OpenClaw 原生子代理运行时         |
| 会话 key   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                            | `/subagents ...`                   |
| 生成工具     | `sessions_spawn`，使用 `runtime:"acp"` | `sessions_spawn`（默认运行时）     |

另见 [子代理](/tools/subagents)。

## ACP 如何运行 Claude Code

通过 ACP 运行 Claude Code 时，技术栈如下：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude 侧运行时/会话机制。

ACP Claude 是一个带有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的 **harness 会话**。

CLI 后端是独立的纯文本本地回退运行时 - 另见
[CLI 后端](/gateway/cli-backends)。

对于运维人员，实用规则是：

- **想要 `/acp spawn`、可绑定会话、运行时控制，或持久的 harness 工作？** 使用 ACP。
- **想要通过原始 CLI 获得简单的本地文本回退？** 使用 CLI 后端。

## 绑定会话

### 心智模型

- **聊天界面** - 人们持续对话的地方（Discord 频道、Telegram 主题、iMessage 聊天）。
- **ACP 会话** - OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态。
- **子线程/主题** - 仅由 `--thread ...` 创建的可选额外消息界面。
- **运行时工作区** - harness 运行所在的文件系统位置（`cwd`、仓库检出目录、后端工作区）。与聊天界面相互独立。

### 当前对话绑定

`/acp spawn <harness> --bind here` 将当前对话固定到
已 spawn 的 ACP 会话——没有子线程，使用相同的聊天界面。OpenClaw 继续负责
传输、认证、安全和投递。该对话中的后续消息会路由到
同一个会话；`/new` 和 `/reset` 会在原地重置会话；`/acp close` 会移除绑定。

示例：

```text
/codex bind                                              # 原生 Codex 绑定，将未来消息路由到这里
/codex model gpt-5.4                                     # 调整已绑定的原生 Codex 线程
/codex stop                                              # 控制当前激活的原生 Codex 回合
/acp spawn codex --bind here                             # Codex 的显式 ACP 回退
/acp spawn codex --thread auto                           # 可能创建子线程/主题并绑定到那里
/acp spawn codex --bind here --cwd /workspace/repo       # 相同聊天绑定，Codex 在 /workspace/repo 中运行
```

<AccordionGroup>
  <Accordion title="绑定规则和互斥性">
    - `--bind here` 和 `--thread ...` 互斥。
    - `--bind here` 仅适用于声明支持当前对话绑定的频道；否则 OpenClaw 会返回清晰的不支持消息。绑定会在网关重启后保持。
    - 在 Discord 上，`spawnSessions` 控制 `--thread auto|here` 的子线程创建 - 不控制 `--bind here`。
    - 如果你在没有 `--cwd` 的情况下 spawn 到另一个 ACP agent，OpenClaw 默认会继承 **目标 agent 的** 工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）会回退到后端默认值；其他访问错误（例如 `EACCES`）会作为 spawn 错误暴露出来。
    - 在已绑定的对话中，网关管理命令保持本地处理 - 即使普通后续文本会路由到已绑定的 ACP 会话，`/acp ...` 命令仍由 OpenClaw 处理；只要该界面启用了命令处理，`/status` 和 `/unfocus` 也会保持本地处理。

  </Accordion>
  <Accordion title="线程绑定会话">
    当频道适配器启用了线程绑定时：

    - OpenClaw 会将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息会路由到已绑定的 ACP 会话。
    - ACP 输出会回送到同一个线程。
    - unfocus/close/archive/idle-timeout 或 max-age 到期会移除绑定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是网关命令，不是发给 ACP harness 的提示词。

    线程绑定 ACP 所需的功能开关：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认开启（设置为 `false` 可暂停自动 ACP 线程分发；显式 `sessions_spawn({ runtime: "acp" })` 调用仍然可用）。
    - 已启用频道适配器线程会话 spawn（默认：`true`）：
      - Discord/Telegram：`session.threadBindings.spawnSessions=true`

    线程绑定支持因适配器而异。如果当前频道适配器
    不支持线程绑定，OpenClaw 会返回清晰的
    不支持/不可用消息。

  </Accordion>
  <Accordion title="支持线程的频道">
    - 任何暴露会话/线程绑定能力的频道适配器。
    - 当前内置支持：**Discord** 线程/频道、**Telegram** 主题（群组/超级群中的论坛主题以及 DM 主题）。
    - 插件频道可以通过同一绑定接口添加支持。

  </Accordion>
</AccordionGroup>

## 持久频道绑定

对于非临时工作流，在顶层 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

<ParamField path="bindings[].type" type='"acp"'>
  标记一个持久 ACP 对话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  标识目标对话。按频道的形状如下：

- **Discord 频道/线程:** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 频道/私信:** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`. 优先使用稳定的 Slack id；频道绑定也会匹配该频道线程中的回复。
- **Telegram 论坛主题:** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **WhatsApp 私信/群组:** `match.channel="whatsapp"` + `match.peer.id="<E.164|group JID>"`. 直接聊天请使用 E.164 号码，例如 `+15555550123`；群组请使用 WhatsApp 群组 JID，例如 `120363424282127706@g.us`。
- **iMessage 私信/群组:** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. 稳定的群组绑定优先使用 `chat_id:*`。

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  所属的 OpenClaw agent id。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可选的 ACP 覆盖。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  面向操作者的可选标签。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可选的运行时工作目录。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可选的后端覆盖。
</ParamField>

### 每个 agent 的运行时默认值

使用 `agents.entries.*.runtime` 为每个 agent 一次性定义 ACP 默认值：

- `agents.entries.*.runtime.type="acp"`
- `agents.entries.*.runtime.acp.agent`（harness id，例如 `codex` 或 `claude`）
- `agents.entries.*.runtime.acp.backend`
- `agents.entries.*.runtime.acp.mode`
- `agents.entries.*.runtime.acp.cwd`

**ACP 绑定会话的覆盖优先级：**

1. `bindings[].acp.*`
2. `agents.entries.*.runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

### 示例

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### 行为

- OpenClaw 确保在特定频道接入检查之后、使用之前，配置的 ACP 会话已经存在。
- 该频道、主题或聊天中的消息会路由到配置的 ACP 会话。
- 已配置的 ACP 绑定拥有其会话路由。频道广播扇出不会替代匹配绑定所对应的配置 ACP 会话。
- 在已绑定的对话中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话 key。
- 临时运行时绑定（例如由 thread-focus 流程创建）在存在时仍然适用。
- 对于未显式指定 `cwd` 的跨 agent ACP spawn，OpenClaw 会从 agent 配置继承目标 agent 工作区。
- 缺失的继承工作区路径会回退到后端默认 cwd；真实的访问失败会作为 spawn 错误暴露出来。

## 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab title="来自 sessions_spawn">
    使用 `runtime: "acp"` 从某个 agent 回合或工具调用中启动 ACP 会话。

    ```json
    {
      "task": "打开仓库并总结失败的测试",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 默认值为 `subagent`，因此 ACP 会话需要显式设置 `runtime: "acp"`。如果省略 `agentId`，OpenClaw 会在已配置时使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true`，以保持持久绑定的对话。
    </Note>

  </Tab>
  <Tab title="来自 /acp 命令">
    使用 `/acp spawn` 从聊天中进行显式操作者控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    关键标志：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    参见 [斜杠命令](/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 参数

<ParamField path="task" type="string" required>
  发送给 ACP 会话的初始提示词。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  ACP 会话必须为 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标 harness id。如果已设置，则回退到 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  请求在支持的情况下启用线程绑定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 表示一次性；`"session"` 表示持久。如果设置了 `thread: true` 而省略了 `mode`，OpenClaw 可能会根据运行时路径默认使用持久行为。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略校验）。如果省略，ACP spawn 会在已配置时继承目标 agent 的工作区；继承路径缺失会回退到后端默认值，而真实访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  用于会话/横幅文本的面向操作者标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  继续一个已有的 ACP 会话，而不是创建新的会话。agent 会通过 `session/load` 回放其对话历史。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 会将初始 ACP 运行进度摘要作为系统事件流式传回请求方会话。
  OpenClaw 会在子 agent 的 SQLite 状态中记录完整的中继历史，并在删除子会话时一并移除。
  默认情况下，父会话进度流会显示 assistant 的评论和 ACP 状态进度，除非设置
  `streaming.progress.commentary=false`。Discord 父会话进度需要显式设置
  `streaming.mode: "progress"`；未设置时，Discord 流式传输保持静默。
  状态进度仍遵循 `acp.stream.tagVisibility`，因此除非显式启用，否则诸如
  `plan` 之类的标签仍会隐藏。
</ParamField>

ACP `sessions_spawn` 调用的默认子回合限制使用 `agents.defaults.subagents.runTimeoutSeconds`。该工具不接受按调用覆盖的超时参数（`runTimeoutSeconds`/`timeoutSeconds` 会因 config-the-default 错误而被拒绝）。

<ParamField path="model" type="string">
  为 ACP 子会话显式覆盖模型。Codex ACP spawn 会在 `session/new` 之前，将诸如 `openai/gpt-5.4` 之类的 OpenAI 引用规范化为 Codex ACP 启动配置；像 `openai/gpt-5.4/high` 这样的斜杠形式也会设置 Codex ACP 的推理强度。若省略，`sessions_spawn({ runtime: "acp" })` 会在已配置时使用现有子代理模型默认值（`agents.defaults.subagents.model` 或 `agents.entries.*.subagents.model`）；否则它会让 ACP harness 使用自身的默认模型。其他 harness 必须公开 ACP `models` 并支持 `session/set_model`；否则 OpenClaw/acpx 会明确失败，而不会静默回退到目标 agent 的默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式的思考/推理强度。对于 Codex ACP，`minimal` 映射为低强度，`low`/`medium`/`high`/`xhigh` 直接映射，而 `off` 则省略推理强度启动覆盖。省略时，ACP spawn 会使用现有子代理思考默认值，以及所选模型的逐模型 `agents.defaults.models["provider/model"].params.thinking`。
</ParamField>

## Spawn 的 bind 和 thread 模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                               |
    | ------ | ------------------------------------------------------------------ |
    | `here` | 就地绑定当前活动对话；如果没有活动对话则失败。 |
    | `off`  | 不创建当前对话绑定。                          |

    说明：

    - `--bind here` 是“让这个频道或聊天使用 Codex 后端”的最简单操作者路径。
    - `--bind here` 不会创建子线程。
    - `--bind here` 仅在暴露当前对话绑定支持的频道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中同时使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                            |
    | ------ | ------------------------------------------------------------------------------------------------ |
    | `auto` | 在活动线程中：绑定该线程。在线程外：在支持时创建/绑定子线程。 |
    | `here` | 要求当前活动线程；如果不在线程中则失败。                                                  |
    | `off`  | 不绑定。会话以未绑定状态启动。                                                                 |

    说明：

    - 在非线程绑定入口上，默认行为实际上是 `off`。
    - 线程绑定的 spawn 需要频道策略支持：
      - Discord/Telegram: `session.threadBindings.spawnSessions=true`
    - 当你想固定当前会话而不创建子线程时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 投递模型

ACP 会话既可以是交互式工作区，也可以是父级拥有的后台工作。投递路径取决于这种形态。

<AccordionGroup>
  <Accordion title="交互式 ACP 会话">
    交互式会话旨在在可见聊天界面上持续对话：

    - `/acp spawn ... --bind here` 会将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 会将频道线程/主题绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"` 会将匹配的对话路由到同一个 ACP 会话。

    绑定对话中的后续消息会直接路由到 ACP 会话，并且 ACP 输出会投递回同一个频道/线程/主题。

    OpenClaw 向 harness 发送的内容：

    - 普通的绑定后续消息会作为提示词文本发送，只有在 harness/后端支持时才会附带附件。
    - `/acp` 管理命令和本地 Gateway 命令会在 ACP 派发前被拦截。
    - 运行时生成的完成事件会按目标具现化。OpenClaw agent 会收到 OpenClaw 内部的运行时上下文信封；外部 ACP harness 会收到一个只包含子结果和指令的纯提示词。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 信封绝不应发送给外部 harness，也不应作为 ACP 用户对话文本持久化。
    - ACP 转录条目使用面向用户的触发文本或纯完成提示词。内部事件元数据会尽可能保持为 OpenClaw 中的结构化内容，不会被视为用户撰写的聊天内容。

  </Accordion>
  <Accordion title="父拥有的一次性 ACP 会话">
    由另一个 agent 运行触发的一次性 ACP 会话是后台子任务，类似于子代理：

    - 父通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
    - 子在其自己的 ACP harness 会话中运行。
    - 子回合运行在原生子代理 spawn 所使用的同一后台线路上，因此缓慢的 ACP harness 不会阻塞无关的主会话工作。
    - 完成结果会通过任务完成通知路径回传。OpenClaw 会在把内部完成元数据发送给外部 harness 之前，将其转换为纯 ACP 提示词，因此 harness 不会看到 OpenClaw 专用的运行时上下文标记。
    - 如果需要面向用户的回复，父会用正常的助手语气改写子结果。

    不要将此路径视为父与子之间的点对点聊天。子进程已经有一条返回父进程的完成通道。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 投递">
    `sessions_send` 在 spawn 之后可以定向到另一个会话。对于普通的同级会话，OpenClaw 在注入消息后会使用 agent-to-agent（A2A）后续路径：

    - 等待目标会话回复。
    - 可选地让请求者和目标交换有限数量的后续回合。
    - 要求目标生成一条通知消息。
    - 将该通知投递到可见频道或线程。

    当发送者需要可见后续时，这条 A2A 路径是同级发送的后备方案。当一个无关会话能够看到并向 ACP 目标发送消息时，它会保持启用，例如在宽泛的 `tools.sessions.visibility` 设置下。

    只有当请求者是其自身的父拥有一次性 ACP 子会话的父级时，OpenClaw 才会跳过 A2A 后续。在这种情况下，在任务完成之上再运行 A2A 可能会用子结果唤醒父级，把父级回复再发回子级，并形成父/子回声循环。对于这种受拥有的子会话情况，`sessions_send` 结果会报告 `delivery.status="skipped"`，因为完成路径已经负责处理结果。

  </Accordion>
  <Accordion title="恢复已有会话">
    使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。agent 会通过 `session/load` 回放其对话历史，因此它会带着之前完整的上下文继续。

    ```json
    {
      "task": "继续我们上次中断的工作 - 修复剩余的测试失败",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将一个 Codex 会话从你的笔记本电脑接手到手机上 - 让你的 agent 继续你离开的地方。
    - 继续你曾在 CLI 中交互式开始的编码会话，现在通过 agent 无头继续。
    - 接手因网关重启或空闲超时而中断的工作。

    说明：

    - `resumeSessionId` 仅适用于 `runtime: "acp"`；默认的子代理运行时会忽略这个仅 ACP 可用的字段。
    - `streamTo` 仅适用于 `runtime: "acp"`；默认的子代理运行时会忽略这个仅 ACP 可用的字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 id，不是 OpenClaw 频道会话 key；OpenClaw 在派发前仍会检查 ACP spawn 策略和目标 agent 策略，而 ACP 后端或 harness 负责对该上游 id 的加载授权。
    - `resumeSessionId` 会恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然按常规应用到你正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目标 agent 必须支持 `session/load`（Codex 和 Claude Code 都支持）。
    - 如果找不到该会话 id，spawn 会以清晰错误失败 - 不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后冒烟测试">
    在网关部署后，请运行一次实时的端到端检查，而不要依赖单元测试：

    1. 验证目标主机上部署的网关版本和提交。
    2. 打开一个到在线 agent 的临时 ACPX bridge 会话。
    3. 让该 agent 调用 `sessions_spawn`，并设置 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"`，任务为 `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 验证 `accepted=yes`、真实的 `childSessionKey`，且没有 validator 错误。
    5. 清理临时 bridge 会话。

    保持门禁为 `mode: "run"`，并跳过 `streamTo: "parent"` - 线程绑定的 `mode: "session"` 和流转发路径是单独更丰富的集成测试。

  </Accordion>
</AccordionGroup>

## 沙箱兼容性

ACP 会话当前运行在主机运行时中，**不**运行在 OpenClaw 沙箱内部。

<Warning>
**安全边界：**

- 外部 harness 可以根据其自身的 CLI 权限和所选 `cwd` 进行读写。
- OpenClaw 的沙箱策略**不会**包裹 ACP harness 执行。
- OpenClaw 仍然会强制执行 ACP 功能开关、允许的 agent、会话所有权、频道绑定和 Gateway 投递策略。
- 对于受沙箱约束的 OpenClaw 原生工作，请使用 `runtime: "subagent"`。

</Warning>

当前限制：

- 如果请求者会话处于沙箱中，则 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 都会被阻止。
- `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、
`session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 先尝试 key
   - 再尝试 UUID 形式的 session id
   - 最后尝试 label
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前会话绑定和线程绑定都会参与步骤 2。

如果无法解析目标，OpenClaw 会返回明确的错误
（`Unable to resolve session target: ...`）。

## ACP 控制

| 命令                 | 功能                                                      | 示例                                                       |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选择当前绑定或线程绑定。                 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话正在进行中的回合。                            | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。                              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。                              | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。                  | `/acp status`                                                 |
| `/acp set-mode`      | 为目标会话设置运行模式。                                  | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置项写入。                                    | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                                    | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                                    | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                                  | `/acp reset-options`                                          |
| `/acp sessions`      | 从存储中列出最近的 ACP 会话。                             | `/acp sessions`                                               |
| `/acp doctor`        | 显示后端健康状态、能力和可执行修复。                      | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。                              | `/acp install`                                                |

运行时控制（`spawn`、`cancel`、`steer`、`close`、`status`、`set-mode`、
`set`、`cwd`、`permissions`、`timeout`、`model` 和 `reset-options`）需要
来自外部通道的所有者身份，以及来自内部 Gateway 客户端的 `operator.admin`。
经授权但非所有者的发送者仍可使用 `sessions`、`doctor`、`install` 和 `help`。
对于非所有者发送者，`/acp sessions` 只列出当前绑定会话或请求者会话；
所有者身份和 `operator.admin` 客户端可看到所有最近的会话。

`/acp status` 会显示生效的运行时选项，以及运行时级别和后端级别的
会话标识。如果后端缺少某项能力，系统会清晰地显示不支持控制的错误。
接受目标令牌（`session-key`、`session-id` 或 `session-label`）的命令会通过
网关会话发现来解析它们，包括每个代理自定义的 `session.store` 根目录。
`/acp sessions` 不接受目标令牌。

### 运行时选项映射

`/acp` 提供便捷命令和通用设置器。等价操作如下：

| 命令                         | 映射到                               | 备注                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`                 | 对于 Codex ACP，OpenClaw 会将 `openai/<model>` 规范化为适配器模型 id，并将诸如 `openai/gpt-5.4/high` 之类带斜杠的推理后缀映射到 `reasoning_effort`。                                         |
| `/acp set thinking <level>`  | 规范选项 `thinking`                  | OpenClaw 会在后端公开对应项时发送其等价配置，优先使用 `thinking`，然后是 `effort`、`reasoning_effort` 或 `thought_level`。对于 Codex ACP，适配器会将值映射到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 规范选项 `permissionProfile`         | OpenClaw 会在后端公开对应项时发送其等价配置，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                       |
| `/acp timeout <seconds>`     | 规范选项 `timeoutSeconds`            | OpenClaw 会在后端公开对应项时发送其等价配置，例如 `timeout` 或 `timeout_seconds`。                                                                                                     |
| `/acp cwd <path>`            | 运行时工作目录覆盖                   | 直接更新。                                                                                                                                                                                             |
| `/acp set <key> <value>`     | 通用                                 | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                                                      |
| `/acp reset-options`         | 清除所有运行时覆盖                   | -                                                                                                                                                                                                          |

## acpx 运行器、插件设置和权限

有关 acpx 运行器配置（Claude Code / Codex / Gemini CLI 别名）、
plugin-tools 和 OpenClaw-tools MCP 桥接，以及 ACP 权限模式，
请参见 [ACP agents - 设置](/tools/acp-agents-setup)。

## 故障排查

| 症状                                                                                   | 可能原因                                                                                                           | 修复                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                                   | 后端插件缺失、被禁用，或被 `plugins.allow` 阻止。                                                       | 安装并启用后端插件；如果设置了该允许列表，则在 `plugins.allow` 中包含 `acpx`，然后运行 `/acp doctor`。                                                 |
| `ACP is disabled by policy (acp.enabled=false)`                                           | ACP 全局已禁用。                                                                                                 | 设置 `acp.enabled=true`。                                                                                                                                                  |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`                         | 已禁用从普通线程消息到自动分发。                                                               | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效。                                      |
| `ACP agent "<id>" is not allowed by policy`                                               | 代理不在允许列表中。                                                                                                | 使用允许的 `agentId`，或更新 `acp.allowedAgents`。                                                                                                                     |
| `/acp doctor` reports backend not ready right after startup                               | 后端插件缺失、被禁用、被允许/拒绝策略阻止，或其配置的可执行文件不可用。        | 安装/启用后端插件，重新运行 `/acp doctor`，并检查后端安装或策略错误，如果它一直处于不健康状态。                                           |
| 找不到适配器命令                                                                 | 未安装适配器 CLI、缺少外部插件，或非 Codex 适配器首次运行时 `npx` 拉取失败。 | 运行 `/acp doctor`，在 Gateway 主机上安装/预热适配器，或显式配置 acpx 代理命令。                                                      |
| 适配器报告找不到模型                                                               | 模型 ID 对另一个提供方/适配器是有效的，但对这个 ACP 目标无效。                                                | 使用该适配器列出的模型，在适配器中配置该模型，或省略覆盖项。                                                                            |
| 适配器报告提供方身份验证错误                                                        | OpenClaw 运行正常，但目标 CLI/提供方尚未登录。                                                     | 在 Gateway 主机环境中登录，或提供所需的提供方密钥。                                                                                             |
| `Unable to resolve session target: ...`                                                   | 错误的键/ID/标签令牌。                                                                                                | 运行 `/acp sessions`，复制准确的键/标签，然后重试。                                                                                                                        |
| `--bind here requires running /acp spawn inside an active ... conversation`               | 使用 `--bind here` 时没有处于活动的可绑定会话。                                                            | 移动到目标聊天/频道并重试，或使用未绑定的 spawn。                                                                                                         |
| `Conversation bindings are unavailable for <channel>.`                                    | 适配器缺少当前会话 ACP 绑定能力。                                                             | 在支持的情况下使用 `/acp spawn ... --thread ...`，配置顶层 `bindings[]`，或移动到受支持的频道。                                                     |
| `--thread here requires running /acp spawn inside an active ... thread`                   | 在线程上下文之外使用了 `--thread here`。                                                                         | 移动到目标线程，或使用 `--thread auto`/`off`。                                                                                                                      |
| `Only <user-id> can rebind this channel/conversation/thread.`                             | 其他用户拥有当前活动绑定目标。                                                                           | 由所有者重新绑定，或使用不同的会话或线程。                                                                                                               |
| `Thread bindings are unavailable for <channel>.`                                          | 适配器缺少线程绑定能力。                                                                               | 使用 `--thread off`，或移动到受支持的适配器/频道。                                                                                                                 |
| `Sandboxed sessions cannot spawn ACP sessions ...`                                        | ACP 运行时位于主机侧；请求者会话处于沙盒中。                                                              | 在沙盒会话中使用 `runtime="subagent"`，或从非沙盒会话运行 ACP spawn。                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`                   | 为 ACP 运行时请求了 `sandbox="require"`。                                                                         | 如需沙盒隔离，请使用 `runtime="subagent"`；或者从非沙盒会话中使用 `sandbox="inherit"` 来使用 ACP。                                                      |
| `Cannot apply --model ... did not advertise model support`                                | 目标适配器未公开通用的 ACP 模型切换能力。                                                        | 使用声明了 ACP `models`/`session/set_model` 的适配器，使用 Codex ACP 模型引用，或如果该适配器有自己的启动标志，则直接在适配器中配置模型。 |
| 缺少已绑定会话的 ACP 元数据                                                    | 过期/已删除的 ACP 会话元数据。                                                                                    | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                    |
| `PermissionPromptUnavailableError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 在非交互式 ACP 会话中阻止写入/执行。                                                    | 将 `plugins.entries.acpx.config.permissionMode` 设为 `approve-all` 并重启 gateway。参见 [权限配置](/tools/acp-agents-setup#permission-configuration)。 |
| ACP 会话过早失败且几乎没有输出                                                | 由于 `permissionMode`/`nonInteractivePermissions`，权限提示被阻止。                                        | 检查 gateway 日志中的 `AcpRuntimeError`。如需完整权限，将 `permissionMode=approve-all`；如需优雅降级，将 `nonInteractivePermissions=deny`。        |
| ACP 会话在完成工作后无限期停滞                                     | 适配器进程已结束，但 ACP 会话未报告完成。                                                    | 更新 OpenClaw；当前的 acpx 清理会在关闭和 Gateway 启动时清除 OpenClaw 拥有的陈旧包装器和适配器进程。                                             |
| 适配器看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                                      | 内部事件封装越过了 ACP 边界。                                                                | 更新 OpenClaw 并重新运行完成流程；外部适配器应只接收纯粹的完成提示。                                                          |

<Note>
`Command blocked by PreToolUse hook: Native hook relay unavailable` 属于
原生 Codex hook relay，而不是 ACP/acpx。在绑定的 Codex 聊天中，使用
`/new` 或 `/reset` 开始一个
新会话；如果它首次可用但在
下一个原生工具调用时又返回，请重启 Codex app-server 或 OpenClaw Gateway，
而不是重复 `/new`。参见
[Codex 适配器故障排查](/plugins/codex-harness#troubleshooting)。
</Note>

## 相关内容

- [ACP 代理 - 设置](/tools/acp-agents-setup)
- [代理发送](/tools/agent-send)
- [CLI 后端](/gateway/cli-backends)
- [Codex 运行环境](/plugins/codex-harness)
- [Codex 运行时运行环境](/plugins/codex-harness-runtime)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (桥接模式)](/cli/acp)
- [子代理](/tools/subagents)
