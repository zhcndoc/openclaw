---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic Claude"
read_when:
  - 您想在 OpenClaw 中使用 Anthropic 模型
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API 密钥** — 直接使用 Anthropic API 访问，按用量计费（`anthropic/*` 模型）
- **Claude CLI** — 在同一主机上复用现有的 Claude CLI 登录

<Warning>
Anthropic 工作人员告诉我们，OpenClaw 风格的 Claude CLI 使用方式再次被允许，因此
OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为获准行为，除非
Anthropic 发布新政策。

对于长期运行的网关主机，Anthropic API 密钥仍然是最清晰且
最可预测的生产路径。

Anthropic 当前的公开文档：

- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Using Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Using Claude Code with your Team or Enterprise plan](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 入门指南

<Tabs>
  <Tab title="API 密钥">
    **最适合：** 标准 API 访问和按用量计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        在 [Anthropic 控制台](https://console.anthropic.com/) 中创建 API 密钥。
      </Step>
      <Step title="运行引导配置">
        ```bash
        openclaw onboard
        # 选择：Anthropic API 密钥
        ```

        或直接传递密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适合：** 复用现有的 Claude CLI 登录，无需单独的 API 密钥。

    <Steps>
      <Step title="确保已安装并登录 Claude CLI">
        验证方式：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行引导配置">
        ```bash
        openclaw onboard
        # 选择：Claude CLI
        ```

        OpenClaw 会检测并复用现有的 Claude CLI 凭据。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时详情见 [CLI 后端](/gateway/cli-backends)。
    </Note>

    <Tip>
    如果您想要最清晰的计费路径，请改用 Anthropic API 密钥。OpenClaw 还支持来自 [OpenAI Codex](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/glm) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## 思维默认值（Claude 4.6）

当未设置明确的思维级别时，Claude 4.6 模型在 OpenClaw 中默认为 `adaptive` 思维。

可通过 `/think:<level>` 每条消息覆盖，或在模型参数中覆盖：

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
- [自适应思维](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [扩展思维](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
</Note>

## 提示词缓存

OpenClaw 支持 API 密钥认证的 Anthropic 提示词缓存功能。

| 值               | 缓存持续时间 | 描述                            |
| ------------------- | -------------- | -------------------------------------- |
| `"short"`（默认） | 5 分钟      | API 密钥认证自动应用 |
| `"long"`            | 1 小时         | 扩展缓存                         |
| `"none"`            | 无缓存     | 禁用提示词缓存                 |

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
  <Accordion title="每代理缓存覆盖">
    使用模型级参数作为基线，然后通过 `agents.list[].params` 覆盖特定代理：

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

    这允许一个代理保持长期缓存，而同一模型上的另一个代理为突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude 注意事项">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置时接受 `cacheRetention` 透传。
    - 非 Anthropic Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`。
    - 当未设置显式值时，API 密钥智能默认值也会为 Bedrock 上的 Claude 引用种子 `cacheRetention: "short"`。
  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="快速模式">
    OpenClaw 的共享 `/fast` 开关支持直接 Anthropic 流量（指向 `api.anthropic.com` 的 API 密钥和 OAuth）。

    | 命令 | 映射为 |
    |---------|---------|
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
    - 仅注入到直接 `api.anthropic.com` 请求中。代理路由保持 `service_tier` 不变。
    - 当两者都设置时，显式的 `serviceTier` 或 `service_tier` 参数会覆盖 `/fast`。
    - 在没有优先层级容量的账户上，`service_tier: "auto"` 可能解析为 `standard`。
    </Note>

  </Accordion>

  <Accordion title="媒体理解（图像和 PDF）">
    捆绑的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw
    从配置的 Anthropic 认证自动解析媒体能力 — 无需
    额外配置。

    | 属性       | 值                |
    | -------------- | -------------------- |
    | 默认模型  | `claude-opus-4-6`    |
    | 支持的输入 | 图像、PDF 文档 |

    当图像或 PDF 附加到对话时，OpenClaw 自动
    通过 Anthropic 媒体理解提供商路由它。

  </Accordion>

  <Accordion title="1M 上下文窗口（beta）">
    Anthropic 的 1M 上下文窗口处于 beta 限制中。按模型启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {
              params: { context1m: true },
            },
          },
        },
      },
    }
    ```

    OpenClaw 在请求中将其映射为 `anthropic-beta: context-1m-2025-08-07`。

    <Warning>
    需要您的 Anthropic 凭据具有长上下文访问权限。旧版令牌认证（`sk-ant-oat-*`）会被 1M 上下文请求拒绝 — OpenClaw 将记录警告并回退到标准上下文窗口。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M 上下文">
    `anthropic/claude-opus-4.7` 及其 `claude-cli` 变体默认具有 1M 上下文
    窗口 — 无需 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然失效">
    Anthropic 令牌认证会过期且可被撤销。对于新配置，请改用 Anthropic API 密钥。
  </Accordion>

  <Accordion title='未找到提供方 "anthropic" 的 API 密钥'>
    Anthropic 认证是**按代理**生效的——新代理不会继承主代理的密钥。请为该代理重新运行引导配置（或在网关主机上配置 API 密钥），然后使用 `openclaw models status` 验证。
  </Accordion>

  <Accordion title='未找到配置文件 "anthropic:default" 的凭据'>
    运行 `openclaw models status` 查看哪个认证配置文件处于活动状态。重新运行引导配置，或为该配置文件路径配置 API 密钥。
  </Accordion>

  <Accordion title="无可用认证配置文件（全部处于冷却期）">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 速率限制冷却可能是模型范围的，因此同族的 Anthropic 模型可能仍可用。添加另一个 Anthropic 配置文件或等待冷却。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/gateway/cli-backends" icon="terminal">
    Claude CLI 后端设置和运行时详情。
  </Card>
  <Card title="提示词缓存" href="/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供商间工作。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据复用规则。
  </Card>
</CardGroup>