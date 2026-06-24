---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic"
read_when:
  - 你想在 OpenClaw 中使用 Anthropic 模型
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API key** — Anthropic API 直接访问，按使用量计费（`anthropic/*` 模型）
- **Claude CLI** — 复用同一主机上现有的 Claude Code 登录

<Warning>
OpenClaw 的 Claude CLI 后端会以非交互式打印模式运行已安装的 Claude Code CLI。Anthropic 目前的 Claude Code 文档将 `claude -p` 描述为 Agent SDK/程序化用法。自 2026 年 6 月 15 日起，Anthropic 表示订阅计划中的 `claude -p` 使用不再从普通 Claude 订阅额度中扣除；它会先从单独的每月 Agent SDK credit 中扣除，之后在这些 credit 启用时再按标准 API 费率从 usage credits 中扣除。

交互式 Claude Code 仍然会从已登录的 Claude 订阅额度中扣除。API key 认证仍然是直接的按量付费 API 计费。对于长期运行的网关主机、共享自动化和可预测的生产支出，请使用 Anthropic API key。

Anthropic 当前的公开文档：

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
      <Step title="获取你的 API key">
        在 [Anthropic 控制台](https://console.anthropic.com/) 中创建一个 API key。
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard
        # 选择：Anthropic API key
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
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-8" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适合：** 复用现有的 Claude CLI 登录，而无需单独的 API key。

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
    Claude CLI 复用要求 OpenClaw 进程与 Claude CLI 登录运行在同一主机上。像 [Podman](/install/podman) 这样的容器安装不会在设置或运行时挂载主机上的 `~/.claude`；在这种情况下请使用 Anthropic API key，或选择 OpenClaw 托管 OAuth 的提供方，例如 [OpenAI Codex](/providers/openai)。
    </Warning>

    ### 配置示例

    建议使用规范的 Anthropic 模型引用，并通过 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-8" },
          models: {
            "anthropic/claude-opus-4-8": {
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

    - 直到 2026 年 6 月 15 日，订阅计划的处理方式遵循 Anthropic 针对已登录账户的当前 Claude Code 规则。
    - 自 2026 年 6 月 15 日起，订阅计划中的 `claude -p` 使用会先从用户的每月 Agent SDK credit 中扣除，然后在启用 usage credits 时按标准 API 费率从 usage credits 中扣除。
    - Console/API key 登录使用按量付费的 API 计费，不会获得订阅版 Agent SDK credit。

    Anthropic 可能会在不发布 OpenClaw 版本的情况下更改 Claude Code 的计费和速率限制行为。若计费可预测性很重要，请检查 `claude auth status`、`/status` 以及 Anthropic 链接的文档。

    <Tip>
    对于共享的生产自动化，请使用 Anthropic API key，而不是 Claude CLI。OpenClaw 也支持来自 [OpenAI Codex](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/zai) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## Thinking defaults (Claude Fable 5, 4.8, and 4.6)

`anthropic/claude-fable-5` 始终使用自适应思考，并默认 `high`
effort。由于 Anthropic 不允许为该模型禁用思考，
`/think off` 和 `/think minimal` 使用 `low` effort。OpenClaw 也会省略 Fable 5 请求中的自定义
temperature 值。

Claude Opus 4.8 在 OpenClaw 中默认关闭思考。 当你显式启用自适应思考并使用 `/think high|xhigh|max` 时，OpenClaw 会发送 Anthropic 的 Opus 4.8 effort 值；Claude 4.6 模型默认使用 `adaptive`。

可通过 `/think:<level>` 按消息覆盖，或在模型参数中设置：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-8": {
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
  <Accordion title="按代理覆盖缓存">
    先以模型级参数作为基础，再通过 `agents.list[].params` 覆盖特定代理：

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
    2. `agents.list[].params`（匹配 `id`，按键覆盖）

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
    OpenClaw 的共享 `/fast` 开关支持直接 Anthropic 流量（API key 和到 `api.anthropic.com` 的 OAuth）。

    | 命令 | 映射为 |
    |------|--------|
    | `/fast on` | `service_tier: "auto"` |
    | `/fast off` | `service_tier: "standard_only"` |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - 仅对直接 `api.anthropic.com` 请求注入。代理路由不会改动 `service_tier`。
    - 当两者都设置时，显式的 `serviceTier` 或 `service_tier` 参数会覆盖 `/fast`。
    - 在没有 Priority Tier 容量的账户上，`service_tier: "auto"` 可能会解析为 `standard`。

    </Note>

  </Accordion>

  <Accordion title="媒体理解（图片和 PDF）">
    随附的 Anthropic 插件会注册图片和 PDF 理解能力。OpenClaw 会根据已配置的 Anthropic 认证自动解析媒体能力——无需额外配置。

    | 属性            | 值                    |
    | --------------- | --------------------- |
    | Default model   | `claude-opus-4-8`     |
    | Supported input | 图片、PDF 文档 |

    当图片或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供方进行路由。

  </Accordion>

  <Accordion title="1M context window">
    Anthropic 的 1M 上下文窗口可用于具备 GA 能力的 Claude 4.x 模型，例如 Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6。OpenClaw 会自动将这些模型的上下文大小设为 1M：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {},
          },
        },
      },
    }
    ```

    旧配置可以保留 `params.context1m: true`，但 OpenClaw 不再发送已弃用的 `context-1m-2025-08-07` beta 头。旧的 `anthropicBeta` 配置中带有该值的条目会在请求头解析时被忽略，未受支持的旧 Claude 模型则仍保持其正常上下文窗口。

    `params.context1m: true` 也适用于 Claude CLI 后端（`claude-cli/*`）中符合条件、支持 GA 的 Opus 和 Sonnet 模型，以保留这些 CLI 会话的运行时上下文窗口，使其与直接 API 的行为一致。

    <Warning>
    需要你的 Anthropic 凭证具备长上下文访问权限。OAuth/订阅令牌认证会保留其所需的 Anthropic beta 头，但如果旧配置中仍保留了已废弃的 1M beta 头，OpenClaw 会将其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.8 1M context">
    `anthropic/claude-opus-4-8` 及其 `claude-cli` 变体默认具有 1M 上下文窗口——无需 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然失效">
    Anthropic token 认证会过期，也可能被撤销。对于新配置，建议改用 Anthropic API key。
  </Accordion>

  <Accordion title='未找到提供方 "anthropic" 的 API key'>
    Anthropic 认证是**按代理**生效的——新代理不会继承主代理的密钥。请为该代理重新运行初始化（或在网关主机上配置 API key），然后用 `openclaw models status` 验证。
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