---
summary: "通过 API 键或 OpenClaw 中的 Claude CLI 使用 Anthropic Claude"
read_when:
  - "您想要在 OpenClaw 中使用 Anthropic 模型"
  - "你想在配对的计算机之间浏览 Claude CLI 或 Claude Desktop 会话"
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API key** - Anthropic API 访问（基于使用情况计费）
- **Claude CLI** - 通过同一主机上安装的可执行文件重用现有的 Claude Code 登录

## <a id="choose-a-model-route"></a> 选择模型路线

模型选择器每条路线显示一次每个 Claude 模型。 API 和 Claude CLI 不是可互换的计费选择：`anthropic/*` 是标准模型标识，可以通过任一运行时运行； `claude-cli/*` 显式选择本机 Claude 运行时。当已配置的 `anthropic/*` 模型已通过 Claude CLI 运行时，选取器将忽略其匹配的 `claude-cli/*` 条目，除非代理的模型策略或网关角色允许该 `claude-cli/*` 条目但不允许 `anthropic/*` 条目。

- **API / API · OpenClaw** 使用配置的 Anthropic API 连接。
- **Claude CLI / Claude CLI · native** 通过 Claude Code 运行，使用其本机登录或选定的保存帐户。
- **配置的路线**表示选择器没有可显示的解析运行时间。提供商名称本身并不能证明 API 或订阅账单。 Anthropic 默认行在清除固定会话运行时时也会使用此标签：当前会话路由不描述正在恢复的配置路由。

网络选择器在悬停或键盘焦点时显示路线详细信息。 Telegram `/models` 在选择之前显示路线指导，并在已知运行时间时标记模型。模型 ID 和显式运行时选择保持不变。

检查所选帐户以及运行时间。为 Claude CLI 显式选择的 API 密钥仍使用单独的 API 计费。如果可执行文件无法运行，Claude CLI 选择不会自动切换到直接 API。

## Claude Haiku 5.5

选择 `anthropic/claude-haiku-5-5` 进行 API 访问，或选择 `claude-cli/claude-haiku-5-5` 进行现有 Claude Code 登录。 `haiku`别名和Anthropic的默认实用新型使用Haiku 5.5；明确的 Haiku 4.5 参考仍然可用。

Haiku 5.5 支持文本和图像输入、1M 上下文窗口和最多 128K 输出令牌。思维默认为中等努力的适应性。可用级别有 `off`、`low`、`medium`、`high`、`xhigh` 和 `max`； `minimal` 映射到 `low`。 OpenClaw 省略了不支持的采样参数并保留了相同模型重放的签名思维。它不为此模型启用本机快速模式、优先级或服务器端回退。

API 定价为每百万个输入/输出代币 $0.10 / $0.50，提示最多 100K 代币，并且 $0.50 / $2.50 高于该阈值。缓存读取和写入使用相应的层。 Claude CLI 保留认购记账。请参阅 Anthropic 的 [Haiku 5.5 迁移指南](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)，了解新的标记器和帐户绑定思维要求。

## <a id="usage-and-cost-tracking"></a> 使用情况和成本跟踪

OpenClaw 会检测可用的 Anthropic 凭证，并选择匹配的使用界面：

- OpenClaw- 托管 subscription/setup 凭证显示配额窗口和可选的额外使用预算。
- Native Claude CLI 登录保留在 Claude 的独占刷新控制之下，因此 OpenClaw 不会轮询其配额端点。
- `ANTHROPIC_ADMIN_KEY` 或 `ANTHROPIC_ADMIN_API_KEY` 显示 Control UI **Usage** 中提供商报告的 30 天组织成本和消息 API 使用情况，包括每日支出，token/cache总计、顶级模型和成本类别。
- 存储在 Anthropic 提供方配置文件中的 `sk-ant-admin...` 凭证会被自动检测为 Admin API 密钥。

Admin API 成本历史来自 Anthropic 的 [Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)。这是真实的提供方账单，与 OpenClaw 基于会话推导的估算成本是分开的。

<Warning>
Claude Code拥有其现有的登录和订阅； OpenClaw 不会保留或刷新该登录。目前，代理 SDK 和 `claude -p` 的使用量受到登录订阅的限制。 API-key auth 使用单独的即用即付计费方式，更适合共享自动化或可预测的生产支出。

Anthropic 当前的支持文章可能会在不发布 OpenClaw 版本的情况下更改此行为：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-usage)
- [将 Claude Agent SDK 与你的 Claude 套餐一起使用](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [将 Claude Code 与 Pro 或 Max 套餐一起使用](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [将 Claude Code 与您的团队或企业计划结合使用](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [管理 Claude Code 成本](https://code.claude.com/docs/en/costs)

</Warning>

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="api-key" title="API 密钥">
    **最适合：** 标准 API 访问和按使用量计费。

    <Steps>
      <Step id="get-your-api-key" title="获取您的 API 密钥">
        在 [Anthropic Console](https://console.anthropic.com/) 中创建 API 密钥。
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step id="verify-the-model-is-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### <a id="config-example"></a> 配置示例

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
      <Step id="install-claude-cli-and-log-in" title="安装 Claude CLI 并登录">
        <a id="ensure-claude-cli-is-installed-and-logged-in" />
        OpenClaw 直接与安装的 Claude Code 可执行文件通信。验证 Claude Code 是否已安装且是最新的：

        ```bash
        claude --version
        claude auth status --text
        ```

        如果 Claude 未登录，请以网关用户身份进行一次身份验证：

        ```bash
        claude auth login
        ```

        如果安装的版本不兼容，请更新 Claude Code 并重新启动 OpenClaw，以便网关启动新的二进制文件：

        ```bash
        claude update
        ```
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        普通代理轮流通过 OpenClaw 的直接 CLI 传输使用已安装、经过身份验证的 Claude Code 可执行文件。 OpenClaw 使用非秘密路由标记，并且从不读取、保留、刷新、选择或转发本机登录令牌。 Claude 拥有登录和令牌刷新生命周期。网关启动使用相同的配置和环境在代理工作区之间共享本机登录检查。检查使用`claude auth status --json`；显式注销响应会阻止本机路由，而超时或不可读响应则允许 Claude 尝试该请求。捕获一分钟后就会过期。如果选定的本机登录不可用，生成准入会立即重新检查它，因此登录不需要重新启动网关。

        对于本机登录用户，模型选择器在后台读取 Claude Code 自己的模型菜单，无需发送提示或使用推理回合。它在 Claude CLI 运行时上将唯一的本机模型 ID 显示为 `anthropic/<id>`，并通过 Claude Code 报告工作量级别。允许思维被禁用的模型也提供 `/think off`，与这些努力水平无关。具有强制自适应思维的模型不提供 `off`。因此，帐户和组织限制会影响菜单。托管的 OpenClaw 目录仅将元数据添加到这些确切的 ID；它无法添加本机模型。新的本机模型不需要 OpenClaw 升级或目录编辑。

        在第一次发现完成之前，只有已配置或选定的模型可通过本机路由使用。选择器从不等待子流程。现有配置和选定的 ID 仍保持列出并可运行，包括菜单中不存在的旧 ID；已弃用的行保持隐藏状态。使用 `openclaw models list --refresh --provider anthropic` 请求新的发现。 API- 仅用户以及同时具有 API 和本机凭据的用户保留其现有的 API 目录行为。

        如果菜单刷新暂时失败，选择器将保留最后接受的菜单以保持相同的身份验证状态。成功的刷新会取代该菜单，包括当访问变得更加严格时。更改身份验证会丢弃保留的菜单。

        新会话按帐户顺序选择已保存的订阅凭据，并使用受保护的文件描述符转发，包括使用 `openclaw models auth paste-token --provider anthropic` 保存的令牌。为 `anthropic` 提供商保存的 API 密钥需要明确选择帐户才能进行 CLI 转发。现有会话将保留其帐户，直到您选择另一个会话或删除其已保存的配置文件。本机工具批准仍受 OpenClaw 控制。架构有效的本机调用在本机批准之前会通过 OpenClaw 的共享工具策略。独立的附带问题完成和配对节点执行保留受监督的 CLI 路径。

        当经过身份验证的会话和执行策略匹配时，连续代理将重用相同的热 Claude Code 子进程。如果该过程结束或网关重新启动，则下一轮将恢复持久的 Claude Code 会话。

        显式 Claude CLI 模型选择在恢复的轮次中保持在该运行时。如果可执行文件无法运行，则选择失败，而不是切换到直接 Anthropic API 访问。通过显式帐户选择选择 API 路由或转发 API 密钥仍然是单独的计费选择。
      </Step>
      <Step id="verify-the-model-is-available-1" title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时详细信息位于 [CLI Backends](/gateway/cli-backends) 中。
    </Note>

    <Warning>
    Claude CLI 重用期望 OpenClaw 进程与 Claude CLI 登录在同一主机上运行。 Docker安装可以持久化一个容器主页并在那里登录Claude Code；请参阅 Docker](/install/docker#claude-cli-backend-in-docker) 中的 [Claude CLI 后端。其他容器安装（例如 [Podman](/install/podman)）不会将主机 `~/.claude` 挂载到安装程序或运行时；在那里使用 Anthropic API 密钥，或者选择具有 OpenClaw- 管理的 OAuth 的提供商，例如 [OpenAI Codex](/providers/openai)。
    </Warning>

    ### <a id="get-a-setup-token"></a> 获取设置令牌

    在安装了 Claude Code 的任意机器上运行 `claude setup-token`。它会打印一个以 `sk-ant-oat01-` 开头的长期有效令牌。

    在入门引导期间，通过选择 **下的**Anthropic setup-token**将令牌粘贴到 macOS 应用程序中，并使用 API 密钥或令牌** 连接，或使用：

    ```bash
    openclaw models auth login --provider anthropic --method setup-token
    ```

    使用设置令牌的直接消息 API 请求通告维护的 Claude Code 客户端版本，或已安装的 CLI 版本（如果较新）。 Anthropic 使用该标识来控制较新的模型。缺失、较旧或失败的 CLI 检查使用 OpenClaw 的维护版本底线。发现与 CLI 后端共享并缓存，直到进程重新启动； API-key 请求不运行检查。

    ### <a id="config-example-1"></a><a id="config-example-2"></a> 配置示例

    首选标准 Anthropic 模型引用加上 CLI 运行时覆盖：

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

    旧版 `claude-cli/claude-opus-4-7` 模型引用仍然适用于兼容性，但新配置应将 provider/model 选择保留为 `anthropic/*` 并将执行后端置于 provider/model 运行时策略中。

    ### <a id="billing-and-claude--p"></a><a id="billing-and-claude-p"></a> 计费与 `claude -p`

    Anthropic 目前将代理 SDK 和非交互式 CLI 调用视为编程使用：

    - Anthropic 2026 年 6 月 15 日的支持更新暂停了之前宣布的单独代理 SDK 信贷计划。
    - 订阅计划下的 Claude Agent SDK、`claude -p` 和第三方应用用量仍会计入已登录订阅的使用额度。
    - 先前公布的每月 Agent SDK 积分在 Anthropic 调整该计划期间不可用。
    - Console/API-key 登录使用即用即付 API 计费，并且不会收到订阅代理 SDK 积分。

    Anthropic 可以更改 Claude Code 计费和速率限制行为，而无需发布 OpenClaw。当计费可预测性很重要时，请检查 `claude auth status`、`/status` 和 Anthropic 的链接文档。

    <Tip>
    对于共享的生产自动化，请使用 Anthropic API 密钥，而不是 Claude CLI。OpenClaw 也支持来自 [OpenAI Codex](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/zai) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## <a id="use-claude-opus-5.5"></a><a id="use-claude-opus-5-5"></a> 使用 Claude Opus 5.5

设置上述任一身份验证路由后，选择标准模型参考：

```bash
openclaw models set anthropic/claude-opus-5-5
```

裸 `opus` 别名和显式别名 `opus-5.5` / `opus-5-5` 选择此模型。新的 API 和 Claude CLI 设置默认为 Opus 5.5；现有的版本固定模型和创作的别名保持不变。

对于 Claude CLI 身份验证，保留标准引用并选择 CLI 运行时：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-5-5" },
      models: {
        "anthropic/claude-opus-5-5": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

API 和 Claude CLI 目录公开 1,000,000 个令牌上下文窗口和 128,000 个令牌输出限制。 API 定价为每百万 input/output 代币 `$4/$20`，其中 `$0.20` 缓存读取和 `$5` 五分钟缓存写入。请参阅 Anthropic 的 [Opus 5.5 规格 ](https://platform.claude.com/docs/en/models/opus-5-5/overview)。

Opus 5.5始终采用适应性思维。 OpenClaw 默认为 `medium`，并提供 `low`、`medium`、`high`、`xhigh` 和 `max`。存储的 `off` 和 `minimal` 设置映射到 `low`；存储的 `adaptive` 使用 `medium` 默认值。使用 `/think low` 减少思考工作量。 OpenClaw 省略了手动思考预算、自定义采样参数、辅助预填充和优先级。

强制工具选择变为`auto`；必须运行特定工具时在提示中注明。 Opus 5.5 还将保留思维与其对话前缀绑定。 OpenClaw 应用 [ 工具调用和保留思维 ](/providers/anthropic#tool-calls-and-retained-thinking) 中描述的仅追加上下文和保留思维修复。有关模型切换和响应形状更改，请参阅 Anthropic 的 [ 迁移指南](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide)。

## <a id="use-claude-sonnet-5.5"></a><a id="use-claude-sonnet-5-5"></a> 使用 Claude Sonnet 5.5

设置上述任一身份验证路由后，选择标准模型参考：

```bash
openclaw models set anthropic/claude-sonnet-5-5
```

裸 `sonnet` 别名和显式别名 `sonnet-5.5` / `sonnet-5-5` 选择此模型。新的 API 和 Claude CLI 设置仍然默认为 Opus 5.5；显式选择 Sonnet 5.5。现有的版本固定模型和创作的别名保持不变。使用 `sonnet-5` 保留 Sonnet 5。

对于 Claude CLI 身份验证，保留标准引用并选择 CLI 运行时：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-5-5" },
      models: {
        "anthropic/claude-sonnet-5-5": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

API 和 Claude CLI 目录公开 1,000,000 个令牌上下文窗口和 128,000 个令牌输出限制。 Sonnet 5.5 支持图像和 PDF 输入。 API 定价为每百万 input/output 代币 `$2/$10`，其中 `$0.20` 缓存读取和 `$2.50` 五分钟缓存写入，与 Sonnet 5 的费率相同。请参阅 Anthropic 的[十四行诗5.5规格](https://platform.claude.com/docs/en/models/sonnet-5-5/overview)。

默认情况下，Sonnet 5.5 在 `high` 工作量上使用自适应思维。 OpenClaw 提供 `off`、`low`、`medium`、`high`、`xhigh` 和 `max`。 `/think off` 发送 Anthropic 的 `between_tools` 设置：它禁用预先思考，而工具调用之间的注释仍作为普通文本返回。新的 `/think minimal` 和 `/think adaptive` 指令被支持的选项拒绝；存储的 `minimal` 映射到 `low`，存储的 `adaptive` 使用 `high` 默认值。使用 `/think default` 恢复默认值。 OpenClaw 省略了手动思考预算、自定义采样参数和辅助预填充。 Sonnet 5.5 既不支持本机快速模式，也不支持优先级。

强制工具选择变为`auto`，包括`/think off`；必须运行特定工具时在提示中注明。 Sonnet 5.5 将保留思维与其对话前缀绑定。 OpenClaw 应用 [ 工具调用和保留思维 ](/providers/anthropic#tool-calls-and-retained-thinking) 中描述的仅追加上下文和保留思维修复。转移到 Sonnet 5.5 的会话将继续从 Sonnet 5 或 Claude 4.x 模型进行推理，但不能从 Opus 5、Opus 5.5、寓言或神话进行推理。没有其他模型读取Sonnet 5.5推理。直接 API-key 请求选择 Anthropic 的安全回退到 Sonnet 5，用于 `cyber` 和 `frontier_llm` 下降，价格相同。有关模型切换和响应形状更改，请参阅 Anthropic 的 [ 迁移指南](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide)。

## <a id="use-claude-fable-5.1"></a><a id="use-claude-fable-5-1"></a> 使用Claude寓言5.1

设置上述任一身份验证路由后，选择标准模型参考：

```bash
openclaw models set anthropic/claude-fable-5-1
```

对于 Claude CLI 身份验证，请保留相同的引用并选择 CLI 运行时：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-fable-5-1" },
      models: {
        "anthropic/claude-fable-5-1": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

API 和 Claude CLI 目录公开 1,000,000 个令牌上下文窗口和 128,000 个令牌输出限制。 《寓言5.1》始终采用适应性思维。 OpenClaw 默认为 `medium`，可使用本机 `low`、`medium`、`high`、`xhigh` 和 `max` 工作。对于API-key计费，输入和输出仍为`$10/$50`每百万代币；每百万代币的缓存读取成本为 `$0.25`，是《神鬼寓言 5》的四分之一。请参阅 Anthropic 的 [Fable 5.1 规格 ](https://platform.claude.com/docs/en/models/fable-5-1/overview)。

裸 `fable` 别名现在选择 `anthropic/claude-fable-5-1`。显式的 `fable-5` 和 `anthropic/claude-fable-5` 选择仍然使用《神鬼寓言 5》； OpenClaw 不会将它们重写为 Fable 5.1.

### <a id="tool-calls-and-retained-thinking"></a> 工具调用和保留思维

Fable 5.1 接受自动或禁用工具使用，而不是强制工具调用。当启用思考时，OpenClaw 的 Anthropic 适配器将强制工具选择转换为 `auto`。在提示中说明何时必须运行特定工具；请参阅 Anthropic 的 [ 迁移指南](https://platform.claude.com/docs/en/models/fable-5-1/migration-guide)。

《寓言5.1》将保留思维与前面的系统提示、工具和对话历史绑定在一起。更改该前缀可能会使以后的思维障碍失效。在直接 Anthropic API-key 消息路由上，OpenClaw 为 Opus 4.8、Opus 5/5.5、Sonnet 启用 `inHistorySystemUpdates` 5/5.5、寓言 5/5.1 和神话 5/5.1. 它固定完整的系统提示，并在当前用户轮到后将更改、添加或删除的提示部分作为系统消息附加。因此，工作区指令、技能和权限更改会保留较早的前缀。更改提供商、模型、传输或选定的个人配置文件，或压缩会话，会启动新的前缀系列。网关重新启动后，保存的系列将继续，任何刷新的部分都会作为附加更新到达。动态后缀更改使用相同的更新路径。

这些路由还将运行时上下文仅附加为回合范围的系统消息，没有用户消息分隔符。 OpenClaw 发送带有 `mid-conversation-system-clear-at-2026-08-21` beta 的 `clear_at: "next_user_message"`：较早的载体保留在记录中，但在下一条用户消息后不消耗输入令牌。持续提示更新不需要 beta 标头。操作员系统消息遵循用户轮流的所有其他上下文，包括工具结果。当重播排除对话咨询提示时，OpenClaw 会在任何搁浅的系统更新之前插入中立用户锚点 （`.`）。这会保留它们的内容、顺序和生命周期，而不会更改固定的系统提示符。工具结果和排队的扩展上下文也会清除轮次范围的消息，因此 OpenClaw 在这些延续之后更新当前用户轮次的运行时上下文。

OAuth、代理、Bedrock、Vertex 和 Foundry 保持现有行为。前缀绑定模型（例如 Fable 5.1、Opus、5.5 和 Sonnet 5.5）保留隐藏的用户角色运行时上下文载体和内联入站元数据，保留连续的用户打开消息 API； Bedrock Converse 仍然合并连续的用户回合。这些载体包含定界上下文主体，在稳定的系统提示中提供解释指导。不具备这两种能力的路由将保持瞬时运营商和正常的用户轮流合并。当思考不绑定前缀时，临时运营商在没有历史系统更新的路由上保持更便宜的形状：旧运营商不会消耗后来的上下文或重复的缓存读取费用。

具有自适应思维的直接 Anthropic API-key 请求发送 `thinking-binding-controls-2026-08-01` beta 和 `thinking.block_binding.prefix_mismatch_behavior: "drop_block"`。 Anthropic 会丢弃无效的重播思考服务器端，并且 OpenClaw 会记录一条警告，其中包含计数和最多五个受影响的路径。这些控件不会针对 OAuth、代理、Bedrock、Vertex、Foundry 或基于预算、禁用或 `between_tools` 思维而发送。客户端压缩消除陈旧的思维特征；提供商确认的思维拒绝仍然可以在没有事先思考的情况下触发一次重试，并保持成功的修复。自适应模式保持启用状态，但响应可能不包含思维块。直接构建消息 API 请求的集成应遵循 Anthropic 的 [ 保留思维规则 ](https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-thinking)。

对于`contextPruning.mode: "cache-ttl"`，直接Anthropic API-key请求使用[服务器端工具结果清除](/concepts/session-pruning#direct-anthropic-api-key-requests)。 Anthropic 的服务器端清除和压缩永远不会使 Fable 5.1 的想法失效：在服务器编辑之前，前缀检查使用客户端发送的历史记录。参见Anthropic的[上下文编辑合约](https://platform.claude.com/docs/en/build-with-claude/context-editing)。在其他符合条件的路由上，客户端修剪是一次性前缀编辑。 OpenClaw 保留该投影以供以后的请求使用，因此修剪不会翻转回原始字节并使新创建的思维无效。受客户端编辑影响的早期想法由 `drop_block` 处理，其中应用上述绑定控件，或者由其他地方现有的拒绝和修复路径处理。

《寓言5.1》的思维也与产生它的模型绑定在一起。将会话从《神鬼寓言》5.1 切换到任何其他模型（Opus 5.5、Opus 5、Sonnet 5.5、Sonnet 5、《神鬼寓言 5》或更早版本）将继续可见对话，而无需《神鬼寓言》之前的对话推理； Anthropic 会丢弃这些未计费的块，并且 OpenClaw 的嵌入式运行时会从重播中忽略它们以获得相同的结果。反向移动保持兼容推理：《神鬼寓言 5.1》读取 Opus 5、Sonnet 5、Opus 4.8 和《神鬼寓言 5》产生的思维，因此转移到《神鬼寓言 5.1》的会话会完整地重播该历史。它无法读取 Sonnet 5.5 推理。切换离开并返回并不会恢复切换前的寓言推理：切换会更改系统提示，这会使每个早期的寓言块无效。在直接 API-key 路由上，Anthropic 在服务器端删除这些块，并且 OpenClaw 记录该删除；在其他地方，强制执行前缀检查的组织会拒绝一次请求，并且嵌入式运行时会在不事先考虑的情况下重试。用`/think`改变思维水平也有同样的效果。当推理连续性很重要时，在开始课程时选择模型和思维水平。

当会话转移到 Sonnet 5.5 时，它会保留之前的 Sonnet 5 和 Claude 4.x 推理，但会删除来自 Opus 5、Opus 5.5、Fable 和 Mythos 的推理。放弃 Sonnet 5.5 放弃了对所有其他模型的推理。

## <a id="claude-sessions-across-computers"></a> 不同电脑上的 Claude 会话

捆绑的 Anthropic 插件会在普通会话侧边栏中添加一个 **Claude Code** 分组。各行会在普通聊天面板中打开。它会在 Gateway 以及已连接的节点主机上发现未归档的 Claude Code 会话：

- Claude CLI 会话来自有效的项目索引记录。对于未索引的转录本，有界元数据回退可识别 `~/.claude/projects/` 下的并发非侧链交互 （`cli`） 和无头代理 SDK CLI （`sdk-cli`） 会话。网关端发现还可以识别双向stream-json （`sdk-ts`） 会话；本机 macOS 节点读取器没有。
- 当 Claude 桌面会话的元数据指向同一 Claude Code 会话 ID 时，桌面会话将使用桌面标题、活动时间和存档状态。
- A CLI-only 会话没有存档标志，因此在其转录本存在时保持可见。

Claude Code `/rename` 标题优先于自动标题和第一个提示。 `/color` 导入匹配的会话颜色；已清除或无法识别的颜色保持未设置状态。 Discovery 读取有界的转录本前缀和尾部，因此包含附加到大型转录本的最新元数据，而无需读取整个历史记录。这些窗口之外的元数据可能不可用。桌面行保留其桌面标题并保持无色。

发现不需要额外的 OpenClaw 配置。默认情况下捆绑并启用 Anthropic 插件；当本地 Claude 项目目录存在时，本机 macOS 节点通告只读 Claude 会话命令（设置 `CLAUDE_CONFIG_DIR` 时为 `$CLAUDE_CONFIG_DIR/projects/`，否则为 `~/.claude/projects/`，匹配网关端发现）。当这些命令首次出现时批准节点配对升级。

侧边栏按网关或配对节点主机对行进行分组，并在该计算机应答后立即显示每个主机的最新边界页面。它会在主机连接更改后、页面重新获得焦点时再次协调，并且在可见时最多每 30 秒进行一次协调，因此在 OpenClaw 外部创建的 Claude 会话会显示而无需重新加载。更改后的目录可以获得更快的后续传递。使用 **在目录组下加载更多会话** 为每个具有更多历史记录的主机附加下一页；附加的行保持可见，并在刷新时重新获取到相同的深度。目录客户使用`sessions.catalog.list`；打开一行使用 `sessions.catalog.read`。

这些刷新在网关上很便宜：插件监视 `~/.claude/projects/` 和桌面会话存储的更改，而不是在每次轮询时重新读取它们，因此未更改的树不需要磁盘访问，并且更改仅重新读取受影响的项目目录。它最多每五分钟重新读取整个树作为后备，如果平台无法提供文件观察器，则回退到按请求扫描。桌面元数据还每 60 秒刷新一次，以获取监视的会话存储之外的自定义组更改。桌面元数据缓存仅保留有界目录字段和 PR 摘要；每次读取后，未使用的 MCP 配置和启动快照都会被丢弃。网关枚举使每个调用者保持隔离；该插件在这些枚举中重用其监视的文件系统快照。

目录可见性遵循经过身份验证的网关配置文件。管理员连接可以看到每个发现的 Claude 行，并且单独或共享秘密网关保持未过滤状态。在多用户网关上，非管理员只能看到其持久配置文件已采用的行；未归属的主机发现的 Claude CLI 和桌面行保持隐藏状态。这是一个受信任网关域内的隐私控制；请参见 [ 多用户模式](/concepts/multi-user)。

终端接管在 service/daemon PATH 之前从拥有主机用户的登录 shell PATH 解析 `claude`。这使应用程序启动的会话与操作员在普通终端中获取的 Claude CLI 保持一致。

选择一行首先读取最新的成绩单页面。 **加载较旧的转录项目**跟随不透明字节光标并从JSONL文件中读取另一个有界部分，而不是加载整个历史记录。保留正常用户、助手、推理、工具调用和工具结果内容。大于 node/Gateway 安全上限的单个项目被明确标记为被截断。

对于 Gateway 本地的 `claude-cli` 行，在普通撰写器中输入会调用 `sessions.catalog.continue`。OpenClaw 会重新解析本地目录记录，创建或复用一个模型锁定的原生会话，导入最多 200 个可见条目或 512 KiB，并为 Claude CLI 绑定播种。第一次回合会使用 `--fork-session` 继续；Claude 会为这个分叉分配一个新的会话 ID，因此后续回合会使用该分叉，而源会话保持不变。

新的 OpenClaw 会话从目录标题和颜色开始。继续已采用的会话将保留 OpenClaw 中所做的任何标题或颜色更改。

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

仅当启用该设置并且其本地 `claude` 可执行文件解析时，节点才会通告 `agent.cli.claude.run.v1`。 OpenClaw 重新解析该节点上的目录记录，导入相同的有界历史记录，并将采用的会话绑定到该节点和目录报告的工作目录。每轮都使用该节点的 Claude 文件和登录来运行该节点的真实 `claude -p` 进程。节点的执行批准政策仍然适用；网关无法强制选择加入。

Node 延续 v1 仅是一次性的。它忽略网关环回 MCP 配置和网关技能插件参数，不从网关转录本重新播种，并拒绝附件和图像。 Claude 桌面行保持仅供查看。本机 macOS 应用程序节点也保持仅查看状态，直到应用程序通告运行命令。

<Note>
除非无头节点明确通告 `agent.cli.claude.run.v1`，否则配对节点 Claude 会话保持只读。 OpenClaw 从不修改 Claude 桌面元数据或存档 Claude 会话。目录列表和读取使用 `operator.read`，而延续使用 `operator.write`。配对节点命令通告和网关节点策略仍然是节点支持行的附加要求。
</Note>

有关节点命令和安全边界，请参阅 [Nodes：Claude 会话和记录 ](/nodes/session-catalogs#claude-sessions-and-transcripts)。

## <a id="live-model-discovery"></a> 实时模型发现

配置 Anthropic API 密钥后，OpenClaw 会从 Anthropic 的模型端点刷新 Claude 目录，因此新发布的模型将显示在没有 OpenClaw 版本的情况下。已发布目录中描述的模型保留其已发布的元数据和定价。

每个列出的行都带有为其宣传的思维和努力能力 Anthropic（自适应思维、是否可以禁用思维以及 `xhigh`/`max` 努力），如目录行上的 `params.claudeCapabilities`。请求塑造和提供的思维水平遵循这些能力，因此新模型在第一轮就获得了它接受的请求形状。没有它们的行（列表中缺少已发货的模型、配置的行以及在发现运行之前保存的目录）保留 OpenClaw 的模型 ID 规则。列表中不包含功能数据的未知模型将保持隐藏状态。发现是建议性的：如果没有 API 密钥，或者端点无法访问，则将按原样使用已提供的目录。

<a id="thinking-defaults-(claude-opus-5%2C-sonnet-5%2C-mythos-5%2C-fable-5%2C-4.8%2C-and-4.6)" />
<a id="thinking-defaults-claude-opus-5-sonnet-5-mythos-5-fable-5-4-8-and-4-6" />

## <a id="thinking-defaults-(claude-5.5%2C-5%2C-4.8%2C-and-4.6)"></a><a id="thinking-defaults-claude-5-5-5-4-8-and-4-6"></a> Thinking 默认值（Claude 5.5、5、4.8 和 4.6）

裸系列别名正在滚动：`opus` 目前解析为 `anthropic/claude-opus-5-5`，`sonnet` 解析为 `anthropic/claude-sonnet-5-5`。升级 OpenClaw 可以将任一别名移至更新的模型。固定版本以选择退出：`opus-5`、`sonnet-5`、`claude-opus-5`、`claude-sonnet-5` 和其他显式版本选择保留其自己的模型。

默认情况下，`anthropic/claude-opus-5` 在 `high` 工作中使用自适应思维。使用 `/think off` 禁用思维，或使用 `/think xhigh|max` 获得模型更高的本机工作水平。 OpenClaw 省略了 Opus 5 的手动思考预算、自定义采样参数、辅助预填充和优先级层，因为 Anthropic 不支持此模型上的这些请求功能。该目录发布了 1,000,000 个代币上下文窗口、128,000 个代币输出限制、图像输入和 `$5/$25` input/output 定价。

`anthropic/claude-sonnet-5` 使用相同的自适应思维默认值和请求限制。该目录使用 Anthropic 的标准 `$2/$10` input/output 每百万代币定价。 Anthropic取消了原定2026年9月的加息；请参阅 [ 当前模型定价 ](https://platform.claude.com/docs/en/about-claude/pricing#model-pricing)。

`anthropic/claude-fable-5-1`和`anthropic/claude-fable-5`始终使用适应性思维。 OpenClaw 将两个版本默认为 `medium` 工作。 Anthropic 不允许对这些模型禁用思考，因此存储的 `off` 和 `minimal` 设置映射到 `low` 工作。 OpenClaw 还省略了两个 Fable 版本的调用者选择的采样参数。

Fable 努力控制提供 `low`、`medium`、`high`、`xhigh` 和 `max`，与 [Anthropic 的努力水平 ](https://platform.claude.com/docs/en/build-with-claude/effort) 相匹配。适应性思维始终开启；这不是一个单独的努力选择。现有存储的 `adaptive` 选择解析为 OpenClaw 的 `medium` 默认值。自定义 `anthropic-messages` 提供程序使用相同的配置文件，包括具有路由命名空间的模型 ID，例如 `Claude Gateway/claude-fable-5-1`。

`anthropic/claude-mythos-5` 是一种受限访问模型，具有相同的始终在线自适应思维和五努力合同。 OpenClaw 默认为 `high`，将存储的 `off` 和 `minimal` 设置映射到 `low`，并省略调用者选择的采样参数。该目录发布了 1,000,000 个代币上下文窗口、128,000 个代币输出限制、图像输入和 `$10/$50` input/output 定价。

对于 Opus 5.5、Sonnet 5.5、Fable 和 Mythos，新的 `/think minimal` 和 `/think adaptive` 指令将被支持的选项拒绝。使用 `/think low` 代替 `minimal`，并使用 `/think default` 使用模型的默认工作量。上面的重新映射适用于以前存储的设置。

Claude Opus 4.8 在 OpenClaw 中默认关闭思考。当你通过 `/think high|xhigh|max` 显式启用自适应思考时，OpenClaw 会发送 Anthropic 的 Opus 4.8 努力级别值； Claude 4.6 模型（Opus 4.6 和 Sonnet 4.6）默认使用 `adaptive`。

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

<a id="safety-refusal-fallback-claude-fable-5" />
<a id="safety-refusal-fallback-(claude-opus-5-and-fable-5)" />
<a id="safety-refusal-fallback-claude-opus-5-and-fable-5" />

## <a id="safety-refusal-fallback-(claude-opus%2C-sonnet-5.5%2C-and-fable)"></a><a id="safety-refusal-fallback-claude-opus-sonnet-5-5-and-fable"></a> 安全拒绝回退（Claude Opus、Sonnet 5.5 和 Fable）

<Warning>
Claude Opus 5.5、Opus 5、Sonnet 5.5、Fable 5.1 和 Fable 5 可以将安全分类器拒绝路由到另一个 Claude 模型。 OpenClaw 选择 Anthropic 建议的按类别路由来处理直接 API-key 请求。后备服务转弯按应答的模型计费。如果您的策略要求每次都停留在请求的模型上，请勿通过自动回退路径使用这些模型。
</Warning>

### <a id="why-this-exists"></a> 为什么需要此功能

Opus 5.5、Opus 5、Sonnet 5.5 和 Fable 分类器针对受限域中的请求返回 `stop_reason: "refusal"`。如果没有后备，即使 Anthropic 有该拒绝类别的推荐模型，转弯也会以错误结束。

### <a id="how-it-works"></a> 工作原理

1. 对于向 `anthropic/claude-opus-5-5`、`anthropic/claude-opus-5`、`anthropic/claude-sonnet-5-5`、`anthropic/claude-fable-5-1` 或 `anthropic/claude-fable-5` 的每个直接 API-key 请求，OpenClaw 发送 `server-side-fallback-2026-07-01` beta 标头以及`fallbacks: "default"`。 Anthropic 针对举报的拒绝类别选择推荐模型。 Sonnet 5.5 因 `cyber` 和 `frontier_llm` 下降而回落至 Sonnet 5。
2. 只有安全分类器拒绝才会触发回退。速率限制、 过载和服务器错误的行为与之前完全相同，并会通过 OpenClaw 的常规[模型故障转移](/concepts/model-failover)流程处理。
3. 救援过程发生在同一次调用中。如果在产生任何输出之前发生拒绝，除了延迟增加之外不会有其他可见变化；整个答案都来自提供服务的模型。 如果在流式传输中途发生拒绝，已生成的部分文本会作为前缀保留，由回退模型继续生成；根据 Anthropic 的重放规则，被拒绝模型的推理和工具调用都会被丢弃（不得将其回显或执行）。
4. 如果推荐模型也被拒绝，则转弯将拒绝视为错误。 OpenClaw 不会重试最终拒绝或前进到另一个配置的模型。

回退发生在 Anthropic API 层，因此提供服务的模型无需位于您配置的 OpenClaw 回退链中。

### <a id="observability-and-billing"></a> 可观测性与计费

- 通过回退提供服务的轮次会在 assistant 消息上记录一个 `provider_fallback` 诊断信息，其中包含 `fromModel` 和 `toModel`，而消息的 `responseModel` 会报告实际响应的模型。
- Anthropic 按服务模型的费率对回退尝试进行计费。 OpenClaw 价格已知为 Opus 4.8 后备服务轮次为 Opus 4.8 费率。 Sonnet 5.5 后备服务开启 Sonnet 5 保持请求的成本，因为它们的费率相同。
- 流式传输中途发生拒绝时，Anthropic 还会对已流式传输的主模型部分另行计费；该部分会在 API 的每次尝试用量中报告，但不会计入 OpenClaw 的每轮估算。

### <a id="scope"></a> 适用范围

适用于 `anthropic/claude-opus-5-5`、`anthropic/claude-opus-5`、`anthropic/claude-sonnet-5-5`、`anthropic/claude-fable-5-1` 和 `anthropic/claude-fable-5`，其中 API-key 针对 `api.anthropic.com` 进行身份验证。 OAuth（包括 Claude CLI 订阅重用）、代理基本 URL、Bedrock、Vertex 和 Foundry 请求未更改，并且仍将拒绝视为错误。

请参阅 Anthropic 的[拒绝与回退指南](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) 了解其底层行为。

## <a id="prompt-caching"></a> 提示词缓存

OpenClaw 支持 Anthropic 的 API-key 身份验证提示缓存功能。

| 值               | 缓存时长 | 描述                            |
| ------------------- | -------------- | -------------------------------------- |
| `"short"`（默认） | 5分钟      | 自动申请API-key认证 |
| `"long"`            | 1 小时         | 扩展缓存                         |
| `"none"`            | 不缓存     | 禁用提示词缓存                 |

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
  <Accordion id="per-agent-cache-overrides" title="每个代理缓存覆盖">
    使用模型级参数作为基准，然后通过 `agents.entries.*.params` 覆盖特定代理：

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          heartbeat: { agentId: "research" },
          systemAgent: { agentId: "research" },
          authInheritance: { agentId: "research" },
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        entries: {
          research: { workspace: "~/.openclaw/workspace" },
          alerts: { params: { cacheRetention: "none" } },
        },
      },
      talk: { agentId: "research" },
    }
    ```

    配置合并顺序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.entries.*.params`（匹配 `id`，按键覆盖）

    这允许一个代理保留长期缓存，而同一模型上的另一个代理则禁用 bursty/low-reuse 流量的缓存。

  </Accordion>

  <Accordion id="bedrock-claude-notes" title="基岩 Claude 笔记">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置后接受 `cacheRetention` 透传。
    - 支持的 Nova 模型提供选择加入显式缓存：将 `cacheRetention` 显式设置为 `short` 或 `long`，用于 system/message 检查点，时间为五分钟 TTL。取消设置保留不会添加检查点。 Nova 显式缓存尚未由 OpenClaw 维护者针对 AWS 进行实时验证。其他非Claude模型仍为`cacheRetention: "none"`；有关模型 ID、AWS 限制和实时验收证明差距，请参阅 [Bedrock 提示缓存](/reference/prompt-caching#amazon-bedrock)。
    - 当未设置显式值时，API-key 智能默认值还会为 Claude-on-Bedrock 参考种子 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="fast-mode" title="快速模式">
    对于 Claude Opus 5.5、Opus 5 和 Opus 4.8、OpenClaw 的共享 `/fast` 切换使用 Anthropic 的本机快速模式将 API-key 流量定向到 `api.anthropic.com`。

    | 命令 | 映射到 |
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
    - 本机快速模式是一个研究预览，最多可达2.5x更高的输出令牌吞吐量。计费时间为`$8/$40`每百万人input/output代币Opus 5.5和`$10/$50`为了Opus 5和Opus 4.8. OpenClaw在其成本估算中对缓存定价应用相同的 2 倍乘数。
    - Native 快速模式仅适用于使用 API 密钥发出的直接 `api.anthropic.com` 请求。 OAuth/subscription-token 请求、Claude CLI、代理、Bedrock、Vertex 和 Foundry 永远不会收到 beta 或 `speed` 字段。
    - 账户需要具备快速模式访问权限以及非零的快速模式速率限制。当单独的快速模式配额耗尽或为零时，Anthropic 会返回专用的快速模式 `429`。
    - 对于其他直接 Anthropic 模型，`/fast` 会保留现有的 Priority Tier 映射：开启时使用 `service_tier: "auto"`，关闭时使用 `service_tier: "standard_only"`。
    - 同时设置时，显式的 `serviceTier` 或 `service_tier` 参数会覆盖 `/fast`。
    - Claude Sonnet 5.5 和 Sonnet 5 既不支持本机快速模式也不支持优先级，因此 OpenClaw 省略这两个字段。
    - Control UI 禁用确认的无操作快速选择，包括 Sonnet 5.5、Sonnet 5 以及由显式服务层管理的请求。已保存的快速偏好设置仍然可以清除；未知的路线或身份验证事实保留现有的控制。

    </Note>

  </Accordion>

  <Accordion id="server-side-compaction" title="服务器端压缩">
    OpenClaw 默认启用 Anthropic 服务器端压缩，用于通过模型 Anthropic 文档上的 API 密钥进行身份验证的直接 `api.anthropic.com` 请求，以进行阈值压缩：Claude Fable 5.1、Mythos 5.1、寓言5、神话5、神话预览、Opus 5.5、Opus 5、Opus 4.8、Opus 4.7、 Opus 4.6、Sonnet 5.5、Sonnet 5、Sonnet 4.6 和 Haiku 5.5. 要针对一种模型将其关闭：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { anthropicServerCompaction: false },
            },
          },
        },
      },
    }
    ```

    设置 `anthropicServerCompaction: true` 以选择另一个直接 Claude 模型。内存刷新轮流从不使用服务器端压缩，因此它们可以从未汇总的历史记录中提取持久的内存。

    OpenClaw 添加 `compact-2026-01-12` beta 标头并发送 Anthropic `context_management` 压缩编辑。该编辑带有汇总指令，告诉 Claude 在汇总时不要调用工具，因为汇总期间的工具调用会返回一个空的压缩块。当压缩发生时，OpenClaw 会组装流式摘要，并将其与提供者的不透明压缩元数据一起存储为隐藏重播状态。两者都会在会话重新打开后继续存在，并在下一个匹配请求时首先发送。摘要文本和不透明元数据将被保留，无需秘密屏蔽以供重播。完整的成绩单保留在本地；仅省略检查点之前的出站历史记录。空压缩块不会存储为检查点，因此下一个请求将发送与之前相同的历史记录，并且 OpenClaw 的客户端压缩保持可用。如果 Anthropic 拒绝存储的检查点，则该回合将报告提供程序错误，并且下一个回合将回退到完整的本地历史记录。

    当省略 `anthropicCompactThreshold` 时，OpenClaw 使用 `max(50000, floor(budget * 0.7))`，其中预算是模型设置时的 `contextTokens` 上限，否则为 `contextWindow`。使用默认触发器，Anthropic 在本地预检压缩之前进行压缩。如果触发器落在本地压缩保留范围内，例如小窗口上的最小值 50000，则本地压缩可能会首先运行；只会跳过服务器压缩，不会溢出。显式 `anthropicServerCompaction: true` 会延迟对触发器的外部预运行检查；检查站安全防护装置仍可先局部压实。要选择不同的输入令牌触发器：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: {
                anthropicCompactThreshold: 120000,
              },
            },
          },
        },
      },
    }
    ```

    低于 `50000` 的配置阈值被限制为 `50000`。

    <Warning>
    Anthropic 服务器端压缩是测试版功能。它仅适用于使用 API 密钥进行身份验证的直接 Anthropic API 请求。 OAuth/subscription 代币、Claude CLI、代理、Bedrock、Vertex 和 Foundry 不包括在内。 OpenClaw 不发送 `pause_after_compaction`。
    </Warning>

    请参阅 Anthropic 的 [ 压实指南](https://platform.claude.com/docs/en/build-with-claude/compaction)。

  </Accordion>

  <Accordion id="media-understanding-image-and-pdf" title="媒体理解（图片和PDF）">
    内置的 Anthropic 插件已注册图片和 PDF 理解能力。OpenClaw 会根据已配置的 Anthropic 认证自动解析媒体能力；无需额外配置。

    | 属性        | 值                 |
    | --------------- | --------------------- |
    | 默认模型   | `claude-opus-5-5`       |
    | 支持的输入 | 图片、PDF 文档 |

    当图片或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供方进行路由。

  </Accordion>

  <Accordion id="1m-context-window" title="1M上下文窗口">
    Claude Haiku 5.5、Opus 5.5、Opus 5、Sonnet 5.5、Sonnet 5、神话5、寓言5.1 和《神鬼寓言 5》具有精确的 1,000,000 个令牌输入窗口，并支持多达 128,000 个输出令牌。 Anthropic的1M上下文窗口在具有自适应思维的Claude 4.x模型上也是GA：Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6. OpenClaw 自动调整这些模型的尺寸，无需 `params.context1m`：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-5": {},
            "anthropic/claude-sonnet-5-5": {},
            "anthropic/claude-sonnet-5": {},
            "anthropic/claude-mythos-5": {},
            "anthropic/claude-opus-4-8": {},
          },
        },
      },
    }
    ```

    旧配置可以保留 `params.context1m: true`；对于这些模型来说这只是一个无害的空操作，而且 OpenClaw 现在无论如何都不会再发送已弃用的 `context-1m-2025-08-07` beta 头。旧的 `anthropicBeta` 配置项中包含该值的条目会在请求头解析时被丢弃，不受支持的旧 Claude 模型仍会保持其正常的上下文窗口。

    Claude CLI （`claude-cli/*`） 有自己的上下文预算。对于旧模型（例如 Sonnet 4.6），API 可用性不会自动选择 CLI 的扩展上下文。 OpenClaw 使用 CLI- 拥有的元数据和配置的限制；符合条件的 `[1m]` 模型参考或 `params.context1m: true` 选择 1M 预算。本机扩展上下文访问仍然取决于安装的 CLI 和您的帐户；请参阅 [Claude 代码扩展上下文 ](https://code.claude.com/docs/en/model-config#extended-context)。

    <Warning>
    需要对您的 Anthropic 凭证进行长上下文访问。 OAuth/subscription 令牌身份验证保留其所需的 Anthropic beta 标头，但 OpenClaw 会删除已停用的 1M beta 标头（如果它保留在旧配置中）。
    </Warning>

  </Accordion>

  <Accordion id="claude-opus-5-1m-context" title="Claude Opus 5 1M 上下文">
    `anthropic/claude-opus-5` 及其 `claude-cli` 变体默认具有 1M 上下文窗口；无需设置 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="claude-cli-login-could-not-be-verified" title="Claude CLI 登录无法验证">
    OpenClaw 对于 `claude auth status --json` 等待最多 10 秒，包括在慢速主机上启动。超时并不意味着您已注销。在同一主机上以网关用户身份运行该命令，然后重试安装。如果报告`loggedIn: false`，请先运行`claude auth login`。
  </Accordion>

  <Accordion id="claude-cli-oauth-session-expired-or-could-not-be-refreshed" title="Claude CLI OAuth 会话已过期或无法刷新">
    在网关主机上以网关用户身份运行以下命令：

    ```bash
    claude auth status --text
    claude auth login
    openclaw gateway restart
    ```

    Claude Code拥有其登录和刷新生命周期；请勿将 OAuth 代币复制到 OpenClaw 中。

  </Accordion>

  <Accordion id="401-errors-token-suddenly-invalid" title="401错误/令牌突然无效">
    Anthropic token 认证会过期，也可能被撤销。对于新配置，建议改用 Anthropic API key。
  </Accordion>

  <Accordion id="no-api-key-found-for-provider-anthropic" title='找不到提供者“anthropic”的 API 密钥'>
    代理在运行时读取共享身份验证配置文件，代理本地配置文件会覆盖具有相同 ID 的共享配置文件。当存在可用的共享 Anthropic 配置文件时，新代理不需要单独的 API 密钥。

    使用 `openclaw models status --agent <agentId>` 检查受影响的代理。如果没有可用的凭据，请在网关主机上配置 Anthropic API 密钥或为该代理设置身份验证。

    通读与复制是分开的：仍然可以从共享存储中使用非便携式配置文件。显式复制流遵循 [ 代理复制可移植性策略 ](/auth-credential-semantics#agent-copy-portability)。

    本机 Claude CLI 登录名仍归 Claude Code 所有，而不是共享的 OpenClaw 身份验证存储区。对于该路线，请使用 [Claude CLI setup](/providers/anthropic#getting-started)；请勿将本机 OAuth 代币复制到 OpenClaw 中。

  </Accordion>

  <Accordion id="no-credentials-found-for-profile-anthropic-default" title='找不到配置文件“anthropic：default”的凭据'>
    运行 `openclaw models status` 查看当前激活的是哪个认证配置文件。重新运行初始化，或为该配置文件路径配置 API key。
  </Accordion>

  <Accordion id="no-available-auth-profile-all-in-cooldown" title="没有可用的身份验证配置文件（全部处于冷却中）">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷却可能是按模型范围生效的，因此同组中的另一个 Anthropic 模型也许仍可使用。添加另一个 Anthropic 配置文件，或等待冷却结束。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/gateway/cli-backends" icon="terminal">
    Claude CLI 后端的设置和运行时细节。
  </Card>
  <Card title="提示缓存" href="/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供方之间工作。
  </Card>
  <Card title="OAuth 并授权" href="/gateway/authentication" icon="key">
    身份验证详细信息和凭证重用规则。
  </Card>
  <Card title="Claude Max API 代理" href="/providers/claude-max-api-proxy" icon="shuffle">
    社区代理将 Claude 订阅凭证公开为 OpenAI- 兼容端点。
  </Card>
  <Card title="Anthropic 插件参考" href="/plugins/reference/anthropic" icon="plug">
    Anthropic 模型、Claude CLI 和本机 Claude 会话目录。
  </Card>
</CardGroup>
