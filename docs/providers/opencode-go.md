---
summary: "使用共享 OpenCode 配置的 OpenCode Go 目录"
read_when:
  - 你想使用 OpenCode Go 目录
  - 你需要 Go 托管模型的运行时模型引用
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/providers/opencode) 中的独立付费订阅。
它与 Zen 使用相同的 `OPENCODE_API_KEY` 凭据基础设施，但 Zen
密钥不会自动包含 Go 权益。Go 保留其自身的运行时提供商 ID
（`opencode-go`），以确保上游的按模型路由保持正确。
对于此版本，OpenCode Go 已内置于 OpenClaw 软件包中，因此完成引导和配置即可；无需单独安装插件。

| 属性             | 值                                                 |
| ---------------- | -------------------------------------------------- |
| Runtime provider | `opencode-go`                                      |
| Plugin           | 已内置（`opencode-go`）                            |
| Auth             | `OPENCODE_API_KEY`（别名：`OPENCODE_ZEN_API_KEY`） |
| Parent setup     | [OpenCode](/providers/opencode)                    |

## 入门

OpenCode Go 已包含在本版本的 OpenClaw 中。继续进行
交互式引导，或直接传入共享的 OpenCode API 密钥。

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
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k3"
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k3" } } },
}
```

## 目录

运行 `openclaw models list --provider opencode-go` 查看当前模型列表。
当前启用的模型：

| 模型引用                         | 上下文    | 最大输出   | 输入          | 传输方式 |
| ------------------------------- | --------- | ---------- | ------------- | -------- |
| `opencode-go/deepseek-v4-flash` | 1M        | 384K       | 文本          | Chat     |
| `opencode-go/deepseek-v4-pro`   | 1M        | 384K       | 文本          | Chat     |
| `opencode-go/glm-5.1`           | 202,752   | 32,768     | 文本          | Chat     |
| `opencode-go/glm-5.2`           | 1M        | 131,072    | 文本          | Chat     |
| `opencode-go/gpt-5.6-luna`      | 1.05M     | 128,000    | 文本、图像    | Responses |
| `opencode-go/grok-4.5`          | 500,000   | 500,000    | 文本、图像    | Chat     |
| `opencode-go/hy3`               | 256,000   | 64,000     | 文本          | Chat     |
| `opencode-go/kimi-k2.6`         | 262,144   | 65,536     | 文本、图像    | Chat     |
| `opencode-go/kimi-k2.7-code`    | 262,144   | 262,144    | 文本、图像    | Chat     |
| `opencode-go/kimi-k3`           | 1,048,576 | 131,072    | 文本、图像    | Chat     |
| `opencode-go/mimo-v2.5`         | 1M        | 128,000    | 文本、图像    | Chat     |
| `opencode-go/mimo-v2.5-pro`     | 1,048,576 | 128,000    | 文本          | Chat     |
| `opencode-go/minimax-m2.7`      | 204,800   | 131,072    | 文本          | Messages |
| `opencode-go/minimax-m3`        | 1M        | 131,072    | 文本、图像    | Messages |
| `opencode-go/qwen3.6-plus`      | 1M        | 65,536     | 文本、图像    | Messages |
| `opencode-go/qwen3.7-max`       | 1M        | 65,536     | 文本          | Messages |
| `opencode-go/qwen3.7-plus`      | 1M        | 65,536     | 文本、图像    | Messages |
| `opencode-go/qwen3.8-max`       | 1M        | 131,072    | 文本、图像    | Messages |

已弃用和预览版引用仍可解析，但仅适用于现有的显式配置。
它们不属于静态或实时推荐范围。

## 隐私

OpenCode 当前的政策规定，任何活跃的 Go 路由都不会用于模型训练。Grok 4.5 和 GPT-5.6 Luna
最多保留数据 30 天；其他活跃的 Go 路由均列明为零天保留。在使用模型前，请查看当前的
[OpenCode Go 隐私表](https://opencode.ai/docs/go/#privacy)，因为提供商的政策可能独立于 OpenClaw
发生变化。

## 高级配置

<AccordionGroup>
  <Accordion title="路由行为">
    OpenClaw 会自动路由任何 `opencode-go/...` 模型引用。无需额外的
    提供方配置。
  </Accordion>

  <Accordion title="运行时引用约定">
    运行时引用保持显式：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。这样可以确保上游按模型路由在两个目录中都保持正确。
  </Accordion>

  <Accordion title="共享凭据">
    同一个 `OPENCODE_API_KEY` 可以对两个运行时提供方进行身份验证，因此
    设置时可以存储两个配置。Go 访问仍需要在 OpenCode 控制台中单独购买付费订阅。
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
