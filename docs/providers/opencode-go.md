---
summary: "使用共享 OpenCode 配置的 OpenCode Go 目录"
read_when:
  - 你想使用 OpenCode Go 目录
  - 你需要 Go 托管模型的运行时模型引用
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供方 id `opencode-go`，以便上游按模型路由保持正确。

| Property         | Value                           |
| ---------------- | ------------------------------- |
| Runtime provider | `opencode-go`                   |
| Auth             | `OPENCODE_API_KEY`              |
| Parent setup     | [OpenCode](/providers/opencode) |

## 内置目录

OpenClaw 大部分 Go 目录行来自内置的 OpenClaw 模型注册表，
并在注册表更新期间补充当前的上游条目。运行
`openclaw models list --provider opencode-go` 查看当前模型列表。

该提供方包含：

| Model ref                       | Name                  |
| ------------------------------- | --------------------- |
| `opencode-go/glm-5`             | GLM-5                 |
| `opencode-go/glm-5.1`           | GLM-5.1               |
| `opencode-go/kimi-k2.5`         | Kimi K2.5             |
| `opencode-go/kimi-k2.6`         | Kimi K2.6 (3x limits) |
| `opencode-go/deepseek-v4-pro`   | DeepSeek V4 Pro       |
| `opencode-go/deepseek-v4-flash` | DeepSeek V4 Flash     |
| `opencode-go/mimo-v2-omni`      | MiMo V2 Omni          |
| `opencode-go/mimo-v2-pro`       | MiMo V2 Pro           |
| `opencode-go/minimax-m2.5`      | MiniMax M2.5          |
| `opencode-go/minimax-m2.7`      | MiniMax M2.7          |
| `opencode-go/qwen3.5-plus`      | Qwen3.5 Plus          |
| `opencode-go/qwen3.6-plus`      | Qwen3.6 Plus          |

## 入门

<Tabs>
  <Tab title="交互式">
    <Steps>
      <Step title="运行引导">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="将 Go 模型设为默认值">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
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
      <Step title="直接传入密钥">
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // 仅允许标记：机密
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.6" } } },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="路由行为">
    当模型引用使用
    `opencode-go/...` 时，OpenClaw 会自动处理按模型路由。无需额外的提供方配置。
  </Accordion>

  <Accordion title="运行时引用约定">
    运行时引用保持显式：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。
    这样可确保在两个目录中上游按模型路由都保持正确。
  </Accordion>

  <Accordion title="共享凭据">
    Zen 和 Go 目录都使用相同的 `OPENCODE_API_KEY`。在设置过程中输入
    密钥会为两个运行时提供方存储凭据。
  </Accordion>
</AccordionGroup>

<Tip>
参见 [OpenCode](/providers/opencode) 获取共享引导概览以及完整的
Zen + Go 目录参考。
</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="OpenCode（父级）" href="/providers/opencode" icon="server">
    共享引导、目录概览和高级说明。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
</CardGroup>
