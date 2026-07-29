---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic"
read_when:
  - 你想在 OpenClaw 中使用 Anthropic 模型
  - 你想在配对的计算机之间浏览 Claude CLI 或 Claude Desktop 会话
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API 密钥** - 直接访问 Anthropic API，并按使用量计费（`anthropic/*` 模型）
- **Claude CLI** - 在同一主机上复用现有的 Claude Code 登录

## 使用与成本跟踪

OpenClaw 会检测可用的 Anthropic 凭证，并选择匹配的使用界面：

- Claude 订阅/设置凭证会显示配额窗口以及可选的额外使用预算。
- `ANTHROPIC_ADMIN_KEY` 或 `ANTHROPIC_ADMIN_API_KEY` 会在 Control UI 的 **Usage** 中显示 30 天的提供方报告的组织成本和 Messages API 使用情况，包括每日支出、token/cache 总量、热门模型和成本类别。
- 存储在 Anthropic 提供方配置文件中的 `sk-ant-admin...` 凭证会被自动检测为 Admin API 密钥。

Admin API 成本历史来自 Anthropic 的 [Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)。这是真实的提供方账单，与 OpenClaw 基于会话推导的估算成本是分开的。

<Warning>
OpenClaw 的 Claude CLI 后端会以
非交互式打印模式（`claude -p`）运行已安装的 Claude Code CLI。Anthropic 当前的 Claude Code 文档
将该模式描述为 Agent SDK/程序化使用。Anthropic 于 2026 年 6 月 15 日
发布的支持更新暂停了此前宣布的独立 Agent SDK 计费变更：Claude
Agent SDK、`claude -p` 以及第三方应用使用仍然会消耗已登录订阅的使用额度，并且此前宣布的每月 Agent SDK
额度在 Anthropic 修改该计划期间不可用。

交互式 Claude Code 仍然会消耗已登录 Claude 套餐的额度。
API key 认证则是直接的按量付费计费，不依赖该套餐。
对于长期运行的网关主机、共享自动化和可预测的生产
支出，请使用 Anthropic API key。

Anthropic 当前的支持文章可能会在不发布
OpenClaw 版本的情况下更改此行为：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-usage)
- [将 Claude Agent SDK 与你的 Claude 套餐一起使用](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [使用你的 Pro 或 Max 套餐来使用 Claude Code](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [使用你的 Team 或 Enterprise 套餐来使用 Claude Code](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [管理 Claude Code 成本](https://code.claude.com/docs/en/costs)

</Warning>

## 开始使用

<Tabs>
  <Tab title="API 密钥">
    **最适合：** 标准 API 访问和按使用量计费。

    <Steps>
      <Step title="获取你的 API 密钥">
        在 [Anthropic 控制台](https://console.anthropic.com/) 中创建一个 API 密钥。
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard
        # 选择：Anthropic API 密钥
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-5" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适合：** 复用现有的 Claude CLI 登录，而无需单独的 API 密钥。

    <Steps>
      <Step title="确保 Claude CLI 已安装并已登录">
        使用以下命令验证：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard
        # 选择：Claude CLI
        ```

        OpenClaw 会检测并复用现有的 Claude CLI 凭证。
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时细节见 [CLI 后端](/gateway/cli-backends)。
    </Note>

    <Warning>
    Claude CLI 复用要求 OpenClaw 进程运行在与 Claude CLI 登录相同的主机上。
    Docker 安装可以持久化容器 home，并在其中登录 Claude Code；参见
    [Docker 中的 Claude CLI 后端](/install/docker#claude-cli-backend-in-docker)。
    其他容器安装，例如 [Podman](/install/podman)，不会在设置或运行时将主机的
    `~/.claude` 挂载进去；请在那里使用 Anthropic API 密钥，或者选择
    一个由 OpenClaw 管理 OAuth 的提供方，例如
    [OpenAI Codex](/providers/openai)。
    </Warning>

    ### Get a setup token

    Run `claude setup-token` on any machine with Claude Code installed. It prints
    a long-lived token starting with `sk-ant-oat01-`.

    During onboarding, paste the token in the macOS app by choosing
    **Anthropic setup-token** under **Connect with an API key or token**, or use:

    ```bash
    openclaw models auth login --provider anthropic --method setup-token
    ```

    ### Config example

    建议使用规范的 Anthropic 模型引用，并通过 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-5" },
          models: {
            "anthropic/claude-opus-5": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    旧版 `claude-cli/claude-opus-4-7` 模型引用仍然可用于兼容性，但新的配置应将提供方/模型选择保持为 `anthropic/*`，并将执行后端放在 provider/model runtime policy 中。

    ### 计费与 `claude -p`

    OpenClaw 在 Claude CLI 运行中使用 Claude Code 的非交互式 `claude -p` 路径。Anthropic 目前将该路径视为 Agent SDK/程序化用法：

    - Anthropic 在 2026 年 6 月 15 日的支持更新中暂停了先前公布的独立 Agent SDK 积分计划。
    - 订阅计划下的 Claude Agent SDK、`claude -p` 和第三方应用用量仍会计入已登录订阅的使用额度。
    - 先前公布的每月 Agent SDK 积分在 Anthropic 调整该计划期间不可用。
    - 控制台/API 密钥登录使用按量计费的 API 计费方式，不会获得订阅的 Agent SDK 积分。

    有关暂停通知，请参阅 Anthropic 的 [Agent SDK 计划文章](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)，
    有关 Claude Code 计划行为，请参阅
    [Pro/Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
    和
    [Team/Enterprise](https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan)
    订阅相关文章。

    Anthropic 可以在不发布 OpenClaw 版本的情况下更改 Claude Code 的计费和速率限制行为。
    当计费可预测性很重要时，请查看 `claude auth status`、`/status` 以及 Anthropic 链接的文档。

    <Tip>
    对于共享的生产自动化，请使用 Anthropic API 密钥，而不是 Claude CLI。OpenClaw 也支持来自 [OpenAI Codex](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/zai) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## 不同电脑上的 Claude 会话

捆绑的 Anthropic 插件会在普通会话侧边栏中添加一个 **Claude Code** 分组。各行会在普通聊天面板中打开。它会在 Gateway 以及已连接的节点主机上发现未归档的 Claude Code 会话：

- Claude CLI sessions come from valid project-index records. For unindexed
  transcripts, a bounded metadata fallback recognizes concurrent non-sidechain
  interactive (`cli`) and headless Agent SDK CLI (`sdk-cli`) sessions under
  `~/.claude/projects/`.
- Claude Desktop sessions use the Desktop title, activity time, and
  archive state when its metadata points to the same Claude Code session ID.
- A CLI-only session has no archive flag, so it remains visible while its
  transcript is present.

发现过程不需要额外的 OpenClaw 配置。Anthropic 插件默认已捆绑并启用；当本地 `~/.claude/projects/` 目录存在时，原生 macOS 节点会公布只读的 Claude 会话命令。请在这些命令首次出现时批准节点配对升级。

The sidebar groups rows by their Gateway or paired-node host and shows each
host's newest bounded page as soon as that computer answers. It reconciles again
after host-connectivity changes, when the page regains focus, and at most every
30 seconds while visible, so Claude sessions created outside OpenClaw appear
without a reload. A changed catalog gets a faster follow-up pass. Use **Load more
sessions** below a catalog group to append the next page for every host that has
more history; appended rows stay visible and are re-fetched to the same depth
across refreshes. Catalog clients use `sessions.catalog.list`; opening a row uses
`sessions.catalog.read`.

Terminal takeover resolves `claude` from the owning host user's login-shell
PATH before the service/daemon PATH. This keeps app-launched sessions aligned
with the Claude CLI the operator gets in a normal terminal.

选择某一行时会先读取最新的转录页面。**加载更早的转录项** 会遵循一个不透明的字节游标，并从 JSONL 文件中读取另一个受限区段，而不是加载全部历史。普通的用户、助手、推理、工具调用和工具结果内容都会被保留。单个条目如果大于节点/Gateway 的安全上限，会被清楚地标记为已截断。

对于 Gateway 本地的 `claude-cli` 行，在普通撰写器中输入会调用 `sessions.catalog.continue`。OpenClaw 会重新解析本地目录记录，创建或复用一个模型锁定的原生会话，导入最多 200 个可见条目或 512 KiB，并为 Claude CLI 绑定播种。第一次回合会使用 `--fork-session` 继续；Claude 会为这个分叉分配一个新的会话 ID，因此后续回合会使用该分叉，而源会话保持不变。

无头节点主机也可以通过启用下面的节点本地设置并重启节点主机，让其 Claude CLI 行具备继续功能：

```json5
{
  nodeHost: {
    agentRuns: {
      claude: { enabled: true },
    },
  },
}
```

只有在启用该设置且其本地 `claude` 可执行文件可解析时，节点才会公布 `agent.cli.claude.run.v1`。OpenClaw 会在该节点上重新解析目录记录，导入相同的受限历史，并将已接管的会话绑定到该节点以及目录报告的工作目录。每一轮都会使用该节点真实的 `claude -p` 进程运行，并使用该节点自己的 Claude 文件和登录状态。该节点的执行批准策略仍然适用；Gateway 不能强制进行该选择加入。

节点继续功能 v1 仅限单次使用。它省略了 Gateway 回环 MCP 配置和 Gateway skills 插件参数，不会从 Gateway 转录中重新播种，并拒绝附件和图像。Claude Desktop 行仍然仅可查看。原生 macOS 应用节点在应用公布运行命令之前也仍然仅可查看。

<Note>
配对节点上的 Claude 会话仍为只读，除非无头节点明确公布 `agent.cli.claude.run.v1`。OpenClaw 从不修改 Claude Desktop 元数据，也不会归档 Claude 会话。该页面需要具有写入范围的操作员连接，因为它使用经过身份验证的 `node.invoke`；即使在启用继续功能的节点上，list 和 read 仍然是只读的。
</Note>

有关节点命令和安全边界，请参阅 [Nodes: Claude sessions and transcripts](/nodes#claude-sessions-and-transcripts)。

## Live model discovery

With an Anthropic API key configured, OpenClaw refreshes the Claude catalog from
Anthropic's models endpoint, so newly published snapshots of supported model
families appear without an OpenClaw release. Models the shipped catalog already
describes always keep their published metadata and pricing.

A newly discovered model is only offered when Anthropic's advertised
capabilities match the request shaping OpenClaw would apply to it. A brand-new
model generation therefore stays hidden until OpenClaw adds support for it,
rather than appearing in the picker and failing every request. Discovery is
advisory: without an API key, or if the endpoint is unreachable, the shipped
catalog is used unchanged.

## Thinking defaults (Claude Opus 5, Sonnet 5, Mythos 5, Fable 5, 4.8, and 4.6)

Bare family aliases are rolling: `opus` tracks the current supported Claude
Opus generation and today resolves to `anthropic/claude-opus-5`, the same way
`sonnet` tracks the current Sonnet. Upgrading OpenClaw can therefore move a
config that says `opus` onto a newer model generation. Pin a version to opt
out — versioned aliases such as `opus-4.8` keep resolving to their own model,
and configs that already name `claude-opus-4-8` are never rewritten.

`anthropic/claude-opus-5` uses adaptive thinking at `high` effort by default.
Use `/think off` to disable thinking, or `/think xhigh|max` for the model's
higher native effort levels. OpenClaw omits manual thinking budgets, custom
sampling parameters, assistant prefills, and Priority Tier for Opus 5 because
Anthropic does not support those request features on this model. The catalog
publishes its 1,000,000-token context window, 128,000-token output limit, image
input, and `$5/$25` input/output pricing.

`anthropic/claude-sonnet-5` uses the same adaptive-thinking defaults and request
restrictions. The catalog uses Anthropic's introductory `$2/$10` input/output
pricing through August 31, 2026; standard `$3/$15` pricing begins September 1, 2026.

`anthropic/claude-fable-5` 始终使用自适应思考，并默认设为 `high`
effort。Anthropic 不允许为该模型禁用思考，因此
`/think off` 和 `/think minimal` 会映射为 `low` effort。OpenClaw 也会
省略 Fable 5 请求中的自定义温度值，因为 Anthropic 会拒绝对任何启用思考的请求进行温度覆盖。

`anthropic/claude-mythos-5` 是一个限量开放访问模型，采用相同的始终开启
自适应思考协议。OpenClaw 默认设为 `high`，将 `/think off` 和
`/think minimal` 映射为 `low`，并省略调用方选择的采样参数。
该目录公布其 1,000,000-token 上下文窗口、128,000-token 输出
上限、图像输入能力，以及 `$10/$50` 输入/输出定价。

Claude Opus 4.8 在 OpenClaw 中默认关闭思考。当你通过 `/think high|xhigh|max`
显式启用自适应思考时，OpenClaw 会发送 Anthropic 的 Opus 4.8 effort 值；
Claude 4.6 模型（Opus 4.6 和 Sonnet 4.6）默认使用 `adaptive`。

可通过 `/think:<level>` 按消息覆盖，或在模型参数中设置：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-5": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

<Note>
相关 Anthropic 文档：
- [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## Safety refusal fallback (Claude Opus 5 and Fable 5)

<Warning>
Claude Opus 5 and Fable 5 can route a safety-classifier refusal to another
Claude model. OpenClaw opts into Anthropic's recommended per-category routing
for direct API-key requests. A fallback-served turn is billed at the model
that answered. If your policy requires every turn to stay on the requested
model, do not use these models through the automatic fallback path.
</Warning>

### Why this exists

Opus 5 and Fable 5 classifiers return `stop_reason: "refusal"` on requests in
restricted domains. Without a fallback, the turn ends with an error even when
Anthropic has a recommended model for that refusal category.

### How it works

1. For every direct API-key request to `anthropic/claude-opus-5` or
   `anthropic/claude-fable-5`, OpenClaw sends the
   `server-side-fallback-2026-07-01` beta header plus
   `fallbacks: "default"`. Anthropic selects the recommended model for the
   reported refusal category.
2. Only a safety-classifier decline triggers the fallback. Rate limits,
   overloads, and server errors behave exactly as before and go through
   OpenClaw's normal [model failover](/concepts/model-failover).
3. The rescue happens inside the same call. A decline before any output is
   invisible apart from latency; the whole answer comes from the serving
   model. On a
   mid-stream decline the partial text is kept as the prefix the fallback
   model continues from, while the declined model's reasoning and tool calls
   are discarded per Anthropic's replay rules (they must not be echoed back or
   executed).
4. If the recommended model declines as well, the turn surfaces the refusal
   as an error.

The fallback happens at the Anthropic API level, so the serving model does not
need to be in your configured OpenClaw fallback chain.

### Observability and billing

- A fallback-served turn records a `provider_fallback` diagnostic on the
  assistant message naming `fromModel` and `toModel`, and the message's
  `responseModel` reports the model that answered.
- Anthropic bills the fallback attempt at the serving model's rates. OpenClaw
  prices known Opus 4.8 fallback-served turns at Opus 4.8 rates.
- A mid-stream decline additionally bills the already-streamed primary-model partial
  on Anthropic's side; that portion is reported in the API's per-attempt
  usage but not folded into OpenClaw's per-turn estimate.

### Scope

Applies to `anthropic/claude-opus-5` and `anthropic/claude-fable-5` with
API-key auth against `api.anthropic.com`. OAuth (including Claude CLI
subscription reuse), proxy base URLs, Bedrock, Vertex, and Foundry requests
are unchanged and still surface refusals as errors there.

请参阅 Anthropic 的 [refusals and fallback
guide](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) 了解其底层行为。

## 提示词缓存

OpenClaw 支持 Anthropic 的提示词缓存功能，适用于 API key 认证。

| 值                  | 缓存时长 | 说明                                   |
| ------------------- | -------- | -------------------------------------- |
| `"short"`（默认）   | 5 分钟    | 针对 API key 认证自动应用              |
| `"long"`            | 1 小时    | 扩展缓存                               |
| `"none"`            | 不缓存    | 禁用提示词缓存                          |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Per-agent cache overrides">
    Use model-level params as your baseline, then override specific agents via `agents.entries.*.params`:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    配置合并顺序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.entries.*.params` (matching `id`, overrides by key)

    这样一个代理可以保留长期缓存，而同一模型上的另一个代理可以为突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude 说明">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置后接受 `cacheRetention` 透传。
    - 非 Anthropic 的 Bedrock 模型在运行时会被强制设为 `cacheRetention: "none"`。
    - 当未设置显式值时，API key 智能默认值也会为 Claude-on-Bedrock 引用填入 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="Fast mode">
    For Claude Opus 5 and Opus 4.8, OpenClaw's shared `/fast` toggle uses
    Anthropic's native fast mode for direct API-key traffic to `api.anthropic.com`.

    | Command | Maps to |
    | --- | --- |
    | `/fast on` | `speed: "fast"` plus `fast-mode-2026-02-01` |
    | `/fast off` | Standard speed; no `speed` field |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-5": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - Native fast mode is a research preview for Claude Opus 5 and Opus 4.8. It can deliver up to 2.5x higher output-token throughput and is billed at `$10/$50` per million input/output tokens. OpenClaw applies the same 2x multiplier to cache pricing in its cost estimate.
    - Native fast mode only applies to direct `api.anthropic.com` requests made with an API key. OAuth/subscription-token requests, Claude CLI, proxies, Bedrock, Vertex, and Foundry never receive the beta or `speed` field.
    - Accounts need fast-mode access and a non-zero fast-mode rate limit. Anthropic returns a fast-specific `429` when the separate fast quota is exhausted or zero.
    - For other direct Anthropic models, `/fast` retains the existing Priority Tier mapping: on uses `service_tier: "auto"` and off uses `service_tier: "standard_only"`.
    - Explicit `serviceTier` or `service_tier` params override `/fast` when both are set.
    - Claude Sonnet 5 supports neither native fast mode nor Priority Tier, so OpenClaw omits both fields.

    </Note>

  </Accordion>

  <Accordion title="媒体理解（图片和 PDF）">
    内置的 Anthropic 插件已注册图片和 PDF 理解能力。OpenClaw 会根据已配置的 Anthropic 认证自动解析媒体能力；无需额外配置。

    | 属性            | 值                    |
    | --------------- | --------------------- |
    | Default model   | `claude-opus-5`       |
    | Supported input | Images, PDF documents |

    当图片或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供方进行路由。

  </Accordion>

  <Accordion title="1M context window">
    Claude Opus 5, Sonnet 5, Mythos 5, and Fable 5 have an exact
    1,000,000-token input window and support up to 128,000 output tokens.
    Anthropic's 1M context window is also GA on Claude 4.x models with adaptive
    thinking: Opus 4.8,
    Opus 4.7, Opus 4.6, and Sonnet 4.6. OpenClaw sizes these models
    automatically, no `params.context1m` needed:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-5": {},
            "anthropic/claude-sonnet-5": {},
            "anthropic/claude-mythos-5": {},
            "anthropic/claude-opus-4-8": {},
          },
        },
      },
    }
    ```

    旧配置可以保留 `params.context1m: true`；对于这些模型来说这只是一个无害的空操作，而且 OpenClaw 现在无论如何都不会再发送已弃用的 `context-1m-2025-08-07` beta 头。旧的 `anthropicBeta` 配置项中包含该值的条目会在请求头解析时被丢弃，不受支持的旧 Claude 模型仍会保持其正常的上下文窗口。

    对 Claude CLI 后端（`claude-cli/*`）来说，`params.context1m: true` 的行为也完全相同：符合条件且支持 GA 的 Opus 和 Sonnet 模型本就会自动获得 1M 窗口，因此这里该参数同样是可选的。

    <Warning>
    需要你的 Anthropic 凭证具备长上下文访问权限。OAuth/订阅令牌认证会保留其所需的 Anthropic beta 头，但如果旧配置中仍保留了已废弃的 1M beta 头，OpenClaw 会将其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 5 1M context">
    `anthropic/claude-opus-5` and its `claude-cli` variant have a 1M context
    window by default; no `params.context1m: true` needed.
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然失效">
    Anthropic token 认证会过期，也可能被撤销。对于新配置，建议改用 Anthropic API key。
  </Accordion>

  <Accordion title='未找到提供方 "anthropic" 的 API key'>
    Anthropic 认证是**按代理**生效的；新代理不会继承主代理的密钥。请为该代理重新运行初始化（或在网关主机上配置 API key），然后使用 `openclaw models status` 进行验证。
  </Accordion>

  <Accordion title='未找到配置文件 "anthropic:default" 的凭证'>
    运行 `openclaw models status` 查看当前激活的是哪个认证配置文件。重新运行初始化，或为该配置文件路径配置 API key。
  </Accordion>

  <Accordion title="没有可用的认证配置文件（全部处于冷却中）">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷却可能是按模型范围生效的，因此同组中的另一个 Anthropic 模型也许仍可使用。添加另一个 Anthropic 配置文件，或等待冷却结束。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/gateway/cli-backends" icon="terminal">
    Claude CLI 后端的设置和运行时细节。
  </Card>
  <Card title="提示词缓存" href="/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供方之间工作。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证细节和凭证复用规则。
  </Card>
</CardGroup>