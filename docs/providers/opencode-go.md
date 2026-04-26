---
summary: "使用共享的 OpenCode 设置中的 OpenCode Go 目录"
read_when:
  - 您想要使用 OpenCode Go 目录
  - 您需要用于 Go 托管模型的运行时模型引用
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供者 id `opencode-go`，以便上游按模型路由保持正确。

| 属性             | 值                              |
| ---------------- | ------------------------------- |
| 运行时提供者     | `opencode-go`                   |
| 认证             | `OPENCODE_API_KEY`              |
| 父级设置         | [OpenCode](/providers/opencode) |

## 内置目录

OpenClaw 从捆绑的 pi 模型注册表中获取 Go 目录。运行
`openclaw models list --provider opencode-go` 可查看当前模型列表。

截至捆绑的 pi 目录，该提供者包括：

| Model ref                  | Name                  |
| -------------------------- | --------------------- |
| `opencode-go/glm-5`        | GLM-5                 |
| `opencode-go/glm-5.1`      | GLM-5.1               |
| `opencode-go/kimi-k2.5`    | Kimi K2.5             |
| `opencode-go/kimi-k2.6`    | Kimi K2.6 (3x 限额)    |
| `opencode-go/mimo-v2-omni` | MiMo V2 Omni          |
| `opencode-go/mimo-v2-pro`  | MiMo V2 Pro           |
| `opencode-go/minimax-m2.5` | MiniMax M2.5          |
| `opencode-go/minimax-m2.7` | MiniMax M2.7          |
| `opencode-go/qwen3.5-plus` | Qwen3.5 Plus          |
| `opencode-go/qwen3.6-plus` | Qwen3.6 Plus          |

## 快速开始

<Tabs>
  <Tab title="交互式">
    <Steps>
      <Step title="执行初始化引导">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="将 Go 模型设为默认">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="非交互式">
    <Steps>
      <Step title="直接传递密钥">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="路由行为">
    当模型引用使用
    `opencode-go/...` 时，OpenClaw 会自动处理每个模型的路由。无需额外的提供者配置。
  </Accordion>

  <Accordion title="运行时引用约定">
    运行时引用保持明确：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go。
    这确保了两个目录的上游每个模型路由都是正确的。
  </Accordion>

  <Accordion title="共享凭据">
    Zen 和 Go 目录使用相同的 `OPENCODE_API_KEY`。在
    设置期间输入密钥会为两个运行时提供者存储凭据。
  </Accordion>
</AccordionGroup>

<Tip>
请参阅 [OpenCode](/providers/opencode) 了解共享初始化引导概述以及完整的
Zen + Go 目录参考。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="OpenCode (父级)" href="/providers/opencode" icon="server">
    共享初始化引导、目录概述和高级说明。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
</CardGroup>
