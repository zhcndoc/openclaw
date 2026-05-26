---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic"
read_when:
  - 你想在 OpenClaw 中使用 Anthropic 模型
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API key** — 直接访问 Anthropic API，并按使用量计费（`anthropic/*` 模型）
- **Claude CLI** — 复用同一主机上现有的 Claude CLI 登录

<Warning>
Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许，因此
OpenClaw 会将 Claude CLI 复用和 `claude -p` 的使用视为被认可的，除非
Anthropic 发布新的政策。

对于长期运行的网关主机，Anthropic API 密钥仍然是最清晰、最
可预测的生产路径。

Anthropic 当前的公开文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)
- [使用你的 Pro 或 Max 计划运行 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [使用你的 Team 或 Enterprise 计划运行 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

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
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
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

    ### 配置示例

    建议使用规范的 Anthropic 模型引用，并通过 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          models: {
            "anthropic/claude-opus-4-7": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    旧版 `claude-cli/claude-opus-4-7` 模型引用仍然可用于兼容性，但新的配置应将提供方/模型选择保持为
    `anthropic/*`，并将执行后端放在 provider/model runtime policy 中。

    <Tip>
    如果你想要最清晰的计费路径，请改用 Anthropic API key。OpenClaw 还支持来自 [OpenAI Codex](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/zai) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## Thinking 默认值（Claude 4.6）

当未显式设置 thinking 等级时，Claude 4.6 模型在 OpenClaw 中默认使用 `adaptive` thinking。

可通过 `/think:<level>` 按消息覆盖，或在模型参数中设置：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>
相关 Anthropic 文档：
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

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
    | 默认模型        | `claude-opus-4-7`     |
    | 支持的输入      | 图片、PDF 文档         |

    当图片或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供方进行路由。

  </Accordion>

  <Accordion title="1M 上下文窗口">
    Anthropic 的 1M 上下文窗口适用于支持 GA 的 Claude 4.x 模型，
    例如 Opus 4.6、Opus 4.7 和 Sonnet 4.6。OpenClaw 会自动将这些模型的大小设为
    1M：

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

    旧配置可以保留 `params.context1m: true`，但 OpenClaw 不再发送
    已弃用的 `context-1m-2025-08-07` beta 头。旧的 `anthropicBeta` 配置
    中带有该值的条目会在请求头解析时被忽略，未受支持的旧 Claude 模型则仍
    保持其正常上下文窗口。

    `params.context1m: true` 也适用于 Claude CLI 后端
    （`claude-cli/*`）中符合条件、支持 GA 的 Opus 和 Sonnet 模型，以保留
    这些 CLI 会话的运行时上下文窗口，使其与直接 API 的行为一致。

    <Warning>
    需要你的 Anthropic 凭证具备长上下文访问权限。OAuth/订阅令牌认证会保留其所需的 Anthropic beta 头，但如果旧配置中仍保留了已废弃的 1M beta 头，OpenClaw 会将其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M 上下文">
    `anthropic/claude-opus-4-7` 及其 `claude-cli` 变体默认具有 1M 上下文
    窗口——无需 `params.context1m: true`。
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