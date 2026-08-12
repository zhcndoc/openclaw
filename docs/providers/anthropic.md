---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic"
read_when:
  - 你想在 OpenClaw 中使用 Anthropic 模型
  - 你想在配对的计算机之间浏览 Claude CLI 或 Claude Desktop 会话
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API 密钥**——直接访问 Anthropic API，并按使用量计费（`anthropic/*` 模型）
- **Claude CLI**——在同一主机上复用现有的 Claude Code 登录。

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
      env: { vars: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" } },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-5" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适合：** 复用现有的 Claude CLI 登录，而无需单独的 API 密钥。

    <Steps>
      <Step title="确保已安装并登录 Claude CLI">
        OpenClaw 的流式会话关联要求使用
        `msg_lifecycle_v1` 能力。已知第一个公开声明支持该能力的版本是 Claude Code 2.1.206。
        请验证已安装的版本：

        ```bash
        claude --version
        ```

        仍然可以选择使用兼容的低版本回移版本或包装器；
        OpenClaw 会在运行时验证该能力。如果运行时拒绝已安装的版本，请更新 Claude Code
        并重启 OpenClaw，以便网关启动新的二进制文件：

        ```bash
        claude update
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
    Claude CLI 后端的设置和运行时详细信息请参阅 [CLI 后端](/gateway/cli-backends)。
    `openclaw doctor` 还会针对已安装的 Claude
    Code 版本低于已知首个兼容版本的情况提供建议。
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

    ### 获取设置令牌

    在安装了 Claude Code 的任意机器上运行 `claude setup-token`。它会打印一个以
    `sk-ant-oat01-` 开头的长期有效令牌。

    在初始化过程中，在 macOS 应用中选择
    **使用 API 密钥或令牌连接** 下的 **Anthropic 设置令牌**，然后粘贴令牌；或者使用：

    ```bash
    openclaw models auth login --provider anthropic --method setup-token
    ```

    ### 配置示例

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

- Claude CLI 会话来自有效的项目索引记录。对于未建立索引的转录，受限的元数据回退机制会识别 `~/.claude/projects/` 下并发的非 sidechain 交互式（`cli`）和无头 Agent SDK CLI（`sdk-cli`）会话。
- 当 Claude Desktop 的元数据指向相同的 Claude Code 会话 ID 时，Claude Desktop 会话会使用 Desktop 标题、活动时间和归档状态。
- 仅限 CLI 的会话没有归档标志，因此只要其转录仍然存在，就会继续显示。

发现过程不需要额外的 OpenClaw 配置。Anthropic 插件默认已捆绑并启用；当本地 `~/.claude/projects/` 目录存在时，原生 macOS 节点会公布只读的 Claude 会话命令。请在这些命令首次出现时批准节点配对升级。

侧边栏按 Gateway 或配对节点主机对各行进行分组，并在每台计算机响应后立即显示该主机最新的受限页面。它会在主机连接状态发生变化时、页面重新获得焦点时，以及页面可见期间最多每 30 秒再次进行协调，因此在 OpenClaw 外部创建的 Claude 会话无需重新加载即可显示。目录发生变化时会更快地执行后续检查。使用目录分组下方的 **加载更多会话**，可为所有拥有更多历史记录的主机追加下一页；追加的行会继续显示，并在刷新时重新获取到相同的深度。目录客户端使用 `sessions.catalog.list`；打开某一行时使用 `sessions.catalog.read`。

终端接管会先从所属主机用户的登录 shell `PATH` 中解析 `claude`，然后才使用服务／守护进程的 `PATH`。这样可以确保应用启动的会话与操作员在普通终端中使用的 Claude CLI 保持一致。

选择某一行时会先读取最新的转录页面。**加载更早的转录项** 会遵循一个不透明的字节游标，并从 JSONL 文件中读取另一个受限区段，而不是加载全部历史。普通的用户、助手、推理、工具调用和工具结果内容都会被保留。单个条目如果大于节点／Gateway 的安全上限，会被清楚地标记为已截断。

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

有关节点命令和安全边界，请参阅 [节点：Claude 会话和转录](/nodes#claude-sessions-and-transcripts)。

## 实时模型发现

配置 Anthropic API 密钥后，OpenClaw 会从 Anthropic 的模型端点刷新 Claude 模型目录，因此新发布的受支持模型系列快照无需等待 OpenClaw 发布新版本即可显示。已发布目录中已有描述的模型始终保留其已发布的元数据和定价。

只有当 Anthropic 宣称的能力与 OpenClaw 将对该模型应用的请求构造方式相匹配时，新发现的模型才会提供使用。因此，全新一代模型会在 OpenClaw 为其添加支持之前保持隐藏，而不会出现在选择器中后导致每次请求都失败。发现功能仅提供参考：如果没有 API 密钥，或无法访问该端点，则使用已发布的目录，不作任何更改。

## 思考默认设置（Claude Opus 5、Sonnet 5、Mythos 5、Fable 5、4.8 和 4.6）

不带版本号的系列别名会滚动更新：`opus` 跟踪当前支持的 Claude
Opus 版本，目前解析为 `anthropic/claude-opus-5`，`sonnet` 也以同样的方式
跟踪当前 Sonnet 版本。因此，升级 OpenClaw 可能会将使用 `opus` 的配置迁移到
更新的模型版本。固定版本即可选择退出——诸如 `opus-4.8` 这样的带版本别名会继续解析到
其对应的模型，而已经明确指定 `claude-opus-4-8` 的配置则永远不会被重写。

`anthropic/claude-opus-5` 默认使用 `high` 努力级别的自适应思考。
使用 `/think off` 可禁用思考，或使用 `/think xhigh|max` 启用模型更高的原生努力级别。由于
Anthropic 不支持该模型的这些请求功能，OpenClaw 会省略 Opus 5 的手动思考预算、自定义采样参数、助手预填充和 Priority Tier。
该目录公布其 1,000,000-token 上下文窗口、128,000-token 输出上限、图像输入能力，以及 `$5/$25` 输入/输出定价。

`anthropic/claude-sonnet-5` 使用相同的自适应思考默认设置和请求限制。该目录采用 Anthropic 的入门
`$2/$10` 输入/输出定价，持续至 2026 年 8 月 31 日；标准的 `$3/$15` 定价将于 2026 年 9 月 1 日开始。

`anthropic/claude-fable-5` 始终使用自适应思考，并默认设为 `high`
努力级别。Anthropic 不允许为该模型禁用思考，因此
`/think off` 和 `/think minimal` 会映射为 `low` 努力级别。OpenClaw 也会
省略 Fable 5 请求中的自定义温度值，因为 Anthropic 会拒绝对任何启用思考的请求进行温度覆盖。

`anthropic/claude-mythos-5` 是一个限量开放访问模型，采用相同的始终开启
自适应思考协议。OpenClaw 默认设为 `high`，将 `/think off` 和
`/think minimal` 映射为 `low`，并省略调用方选择的采样参数。
该目录公布其 1,000,000-token 上下文窗口、128,000-token 输出
上限、图像输入能力，以及 `$10/$50` 输入/输出定价。

Claude Opus 4.8 在 OpenClaw 中默认关闭思考。当你通过 `/think high|xhigh|max`
显式启用自适应思考时，OpenClaw 会发送 Anthropic 的 Opus 4.8 努力级别值；
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

## 安全拒绝回退（Claude Opus 5 和 Fable 5）

<Warning>
Claude Opus 5 和 Fable 5 可以将安全分类器的拒绝路由到另一个
Claude 模型。对于直接 API 密钥请求，OpenClaw 采用 Anthropic 推荐的按类别路由方式。
通过回退提供服务的轮次将按照实际响应模型的费率计费。如果您的策略要求每一轮都必须使用所请求的模型，
请不要通过自动回退路径使用这些模型。
</Warning>

### 为什么需要此功能

Opus 5 和 Fable 5 分类器会在受限领域的请求上返回
`stop_reason: "refusal"`。如果没有回退，即使 Anthropic 针对该拒绝类别提供了推荐模型，
该轮也会以错误结束。

### 工作原理

1. 对于发送到 `anthropic/claude-opus-5` 或
   `anthropic/claude-fable-5` 的每个直接 API 密钥请求，OpenClaw 都会发送
   `server-side-fallback-2026-07-01` beta 标头以及
   `fallbacks: "default"`。Anthropic 会为报告的拒绝类别选择推荐模型。
2. 只有安全分类器拒绝才会触发回退。速率限制、
   过载和服务器错误的行为与之前完全相同，并会通过 OpenClaw 的常规[模型故障转移](/concepts/model-failover)流程处理。
3. 救援过程发生在同一次调用中。如果在产生任何输出之前发生拒绝，除了延迟增加之外不会有其他可见变化；整个答案都来自提供服务的模型。
   如果在流式传输中途发生拒绝，已生成的部分文本会作为前缀保留，由回退模型继续生成；根据 Anthropic 的重放规则，被拒绝模型的推理和工具调用都会被丢弃（不得将其回显或执行）。
4. 如果推荐模型也拒绝，该轮会将拒绝作为错误返回。

回退发生在 Anthropic API 层，因此提供服务的模型无需位于您配置的 OpenClaw 回退链中。

### 可观测性与计费

- 通过回退提供服务的轮次会在 assistant 消息上记录一个 `provider_fallback` 诊断信息，其中包含
  `fromModel` 和 `toModel`，而消息的 `responseModel` 会报告实际响应的模型。
- Anthropic 会按照提供服务的模型费率为回退尝试计费。对于已知的 Opus 4.8 回退服务轮次，OpenClaw 按 Opus 4.8 的费率计价。
- 流式传输中途发生拒绝时，Anthropic 还会对已流式传输的主模型部分另行计费；该部分会在 API 的每次尝试用量中报告，但不会计入 OpenClaw 的每轮估算。

### 适用范围

适用于使用 API 密钥身份验证、针对 `api.anthropic.com` 的
`anthropic/claude-opus-5` 和 `anthropic/claude-fable-5`。OAuth（包括复用 Claude CLI
订阅）、代理基础 URL、Bedrock、Vertex 和 Foundry 请求均不受影响，在这些场景中拒绝仍会作为错误返回。

请参阅 Anthropic 的[拒绝与回退指南](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) 了解其底层行为。

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
  <Accordion title="每个代理的缓存覆盖">
    使用模型级参数作为基准，然后通过 `agents.entries.*.params` 覆盖特定代理：

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
        entries: {
          research: { default: true },
          alerts: { params: { cacheRetention: "none" } },
        },
      },
    }
    ```

    配置合并顺序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.entries.*.params`（匹配 `id`，按键覆盖）

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
  <Accordion title="快速模式">
    对于 Claude Opus 5 和 Opus 4.8，OpenClaw 的共享 `/fast` 开关会对直接发送到
    `api.anthropic.com` 的 API 密钥流量使用 Anthropic 的原生快速模式。

    | 命令 | 映射为 |
    | --- | --- |
    | `/fast on` | `speed: "fast"` 加上 `fast-mode-2026-02-01` |
    | `/fast off` | 标准速度；不包含 `speed` 字段 |

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
    - 原生快速模式是 Claude Opus 5 和 Opus 4.8 的研究预览功能。它可将输出令牌吞吐量提高至最高 2.5 倍，计费标准为每百万输入/输出令牌 `$10/$50`。OpenClaw 会在成本估算中对缓存价格采用相同的 2 倍乘数。
    - 原生快速模式仅适用于使用 API 密钥发送到 `api.anthropic.com` 的直接请求。OAuth/订阅令牌请求、Claude CLI、代理、Bedrock、Vertex 和 Foundry 均不会收到 beta 或 `speed` 字段。
    - 账户需要具备快速模式访问权限以及非零的快速模式速率限制。当单独的快速模式配额耗尽或为零时，Anthropic 会返回专用的快速模式 `429`。
    - 对于其他直接 Anthropic 模型，`/fast` 会保留现有的 Priority Tier 映射：开启时使用 `service_tier: "auto"`，关闭时使用 `service_tier: "standard_only"`。
    - 同时设置时，显式的 `serviceTier` 或 `service_tier` 参数会覆盖 `/fast`。
    - Claude Sonnet 5 既不支持原生快速模式，也不支持 Priority Tier，因此 OpenClaw 会省略这两个字段。

    </Note>

  </Accordion>

  <Accordion title="媒体理解（图片和 PDF）">
    内置的 Anthropic 插件已注册图片和 PDF 理解能力。OpenClaw 会根据已配置的 Anthropic 认证自动解析媒体能力；无需额外配置。

    | 属性            | 值                    |
    | --------------- | --------------------- |
    | 默认模型        | `claude-opus-5`       |
    | 支持的输入      | 图片、PDF 文档        |

    当图片或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供方进行路由。

  </Accordion>

  <Accordion title="1M 上下文窗口">
    Claude Opus 5、Sonnet 5、Mythos 5 和 Fable 5 具有精确的
    1,000,000 令牌输入窗口，并支持最多 128,000 个输出令牌。
    Anthropic 的 1M 上下文窗口现已在支持自适应思考的 Claude 4.x 模型上正式可用：
    Opus 4.8、
    Opus 4.7、Opus 4.6 和 Sonnet 4.6。OpenClaw 会自动为这些模型设置大小，
    无需使用 `params.context1m`：

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

  <Accordion title="Claude Opus 5 1M 上下文">
    `anthropic/claude-opus-5` 及其 `claude-cli` 变体默认具有 1M 上下文窗口；无需设置 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误／令牌突然失效">
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