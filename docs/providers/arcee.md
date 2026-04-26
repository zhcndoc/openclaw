---
summary: "Arcee AI 设置（认证 + 模型选择）"
title: "Arcee AI"
read_when:
  - 您想将 Arcee AI 与 OpenClaw 一起使用
  - 您需要 API 密钥环境变量或 CLI 认证选项
---

[Arcee AI](https://arcee.ai) 通过一个与 OpenAI 兼容的 API 提供对 Trinity 系列混合专家模型的访问。所有 Trinity 模型均采用 Apache 2.0 许可证。

Arcee AI 模型可以直接通过 Arcee 平台访问，也可以通过 [OpenRouter](/providers/openrouter) 访问。

| 属性 | 值                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| 提供商 | `arcee`                                                                               |
| 认证     | `ARCEEAI_API_KEY` (直接) 或 `OPENROUTER_API_KEY` (通过 OpenRouter)                   |
| API      | 兼容 OpenAI                                                                     |
| 基础 URL | `https://api.arcee.ai/api/v1` (直接) 或 `https://openrouter.ai/api/v1` (OpenRouter) |

## 入门指南

<Tabs>
  <Tab title="直接连接（Arcee 平台）">
    <Steps>
      <Step title="获取 API 密钥">
        在 [Arcee AI](https://chat.arcee.ai/) 创建 API 密钥。
      </Step>
      <Step title="运行初始化配置">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="通过 OpenRouter">
    <Steps>
      <Step title="获取 API 密钥">
        在 [OpenRouter](https://openrouter.ai/keys) 创建 API 密钥。
      </Step>
      <Step title="运行初始化配置">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```

        直接连接和 OpenRouter 设置都适用相同的模型引用（例如 `arcee/trinity-large-thinking`）。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 非交互式设置

<Tabs>
  <Tab title="直接连接（Arcee 平台）">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="通过 OpenRouter">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## 内置目录

OpenClaw 目前附带此捆绑的 Arcee 目录：

| 模型引用                      | 名称                   | 输入 | 上下文 | 成本（每 100 万 输入/输出） | 备注                                     |
| ------------------------------ | ---------------------- | ----- | ------- | -------------------- | ----------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity 大型思考 | 文本  | 256K    | $0.25 / $0.90        | 默认模型；已启用推理          |
| `arcee/trinity-large-preview`  | Trinity 大型预览  | 文本  | 128K    | $0.25 / $1.00        | 通用；4000 亿参数，130 亿激活  |
| `arcee/trinity-mini`           | Trinity 迷你 26B       | 文本  | 128K    | $0.045 / $0.15       | 快速且经济高效；支持函数调用 |

<Tip>
初始化配置预设将 `arcee/trinity-large-thinking` 设置为默认模型。
</Tip>

## 支持的功能

| 功能                                       | 支持情况                    |
| --------------------------------------------- | ---------------------------- |
| 流式输出                                     | 是                          |
| 工具使用 / 函数调用                   | 是                          |
| 结构化输出（JSON 模式和 JSON schema） | 是                          |
| 扩展思考                             | 是（Trinity Large Thinking） |

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `ARCEEAI_API_KEY`
    （或 `OPENROUTER_API_KEY`）对该进程可用（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>

  <Accordion title="OpenRouter 路由">
    通过 OpenRouter 使用 Arcee 模型时，同样的 `arcee/*` 模型引用适用。
    OpenClaw 会根据您的认证选择透明地处理路由。请参阅
    [OpenRouter 提供商文档](/providers/openrouter) 了解 OpenRouter 特定的
    配置详情。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/providers/openrouter" icon="shuffle">
    通过单个 API 密钥访问 Arcee 模型及许多其他模型。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
