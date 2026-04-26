---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - 你想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 你需要设置 XIAOMI_API_KEY
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用带有 API 密钥认证的 Xiaomi 兼容 OpenAI 的端点。

| 属性 | 值 |
| -------- | ------------------------------- |
| 提供商 | `xiaomi` |
| 认证 | `XIAOMI_API_KEY` |
| API | 兼容 OpenAI |
| 基础 URL | `https://api.xiaomimimo.com/v1` |

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建 API 密钥。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    或直接传递密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## 内置目录

| 模型引用 | 输入 | 上下文 | 最大输出 | 推理 | 备注 |
| ---------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi/mimo-v2-flash` | 文本 | 262,144 | 8,192 | 否 | 默认模型 |
| `xiaomi/mimo-v2-pro` | 文本 | 1,048,576 | 32,000 | 是 | 大上下文 |
| `xiaomi/mimo-v2-omni` | 文本，图像 | 262,144 | 32,000 | 是 | 多模态 |

<Tip>
默认模型引用是 `xiaomi/mimo-v2-flash`。当设置了 `XIAOMI_API_KEY` 或存在认证配置文件时，提供商会自动注入。
</Tip>

## 配置示例

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="自动注入行为">
    当你的环境中设置了 `XIAOMI_API_KEY` 或存在认证配置文件时，`xiaomi` 提供商会自动注入。除非你想覆盖模型元数据或基础 URL，否则无需手动配置提供商。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** — 轻量且快速，适合通用文本任务。不支持推理。
    - **mimo-v2-pro** — 支持推理，拥有 1M token 上下文窗口，适合长文档工作负载。
    - **mimo-v2-omni** — 支持推理的多模态模型，接受文本和图像输入。

    <Note>
    所有模型都使用 `xiaomi/` 前缀（例如 `xiaomi/mimo-v2-pro`）。
    </Note>

  </Accordion>

  <Accordion title="故障排除">
    - 如果模型未出现，请确认 `XIAOMI_API_KEY` 已设置且有效。
    - 当 Gateway 作为守护进程运行时，确保该进程可以使用密钥（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对守护进程管理的 gateway 进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持久可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    OpenClaw 完整配置参考。
  </Card>
  <Card title="Xiaomi MiMo 控制台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 仪表板和 API 密钥管理。
  </Card>
</CardGroup>
