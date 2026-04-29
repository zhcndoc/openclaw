---
summary: "Arcee AI 设置（认证 + 模型选择）"
title: "Arcee AI"
read_when:
  - 你想将 Arcee AI 与 OpenClaw 一起使用
  - 你需要 API 密钥环境变量或 CLI 认证方式的选择
---

[Arcee AI](https://arcee.ai) 通过与 OpenAI 兼容的 API 提供对 Trinity 系列混合专家模型的访问。所有 Trinity 模型均采用 Apache 2.0 许可证。

可以通过 Arcee 平台直接访问 Arcee AI 模型，也可以通过 [OpenRouter](/providers/openrouter) 访问。

| Property | Value                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| Provider | `arcee`                                                                               |
| Auth     | `ARCEEAI_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）                   |
| API      | 与 OpenAI 兼容                                                                     |
| Base URL | `https://api.arcee.ai/api/v1`（直接）或 `https://openrouter.ai/api/v1`（OpenRouter） |

## 开始使用

<Tabs>
  <Tab title="直接方式（Arcee 平台）">
    <Steps>
      <Step title="获取 API 密钥">
        在 [Arcee AI](https://chat.arcee.ai/) 创建一个 API 密钥。
      </Step>
      <Step title="运行引导">
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
        在 [OpenRouter](https://openrouter.ai/keys) 创建一个 API 密钥。
      </Step>
      <Step title="运行引导">
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

        相同的模型引用同时适用于直接方式和 OpenRouter 配置（例如 `arcee/trinity-large-thinking`）。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 非交互式设置

<Tabs>
  <Tab title="直接方式（Arcee 平台）">
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

OpenClaw 当前附带以下内置的 Arcee 目录：

| Model ref                      | Name                   | Input | Context | Cost (in/out per 1M) | Notes                                     |
| ------------------------------ | ---------------------- | ----- | ------- | -------------------- | ----------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | text  | 256K    | $0.25 / $0.90        | 默认模型；已启用推理                      |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | text  | 128K    | $0.25 / $1.00        | 通用用途；400B 参数，13B 激活              |
| `arcee/trinity-mini`           | Trinity Mini 26B       | text  | 128K    | $0.045 / $0.15       | 快速且成本高效；支持函数调用               |

<Tip>
引导预设会将 `arcee/trinity-large-thinking` 设置为默认模型。
</Tip>

## 支持的功能

| Feature                                       | Supported                    |
| --------------------------------------------- | ---------------------------- |
| 流式输出                                     | 是                          |
| 工具使用 / 函数调用                          | 是                          |
| 结构化输出（JSON 模式和 JSON schema）        | 是                          |
| 扩展思考                                     | 是（Trinity Large Thinking） |

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `ARCEEAI_API_KEY`
    （或 `OPENROUTER_API_KEY`）对该进程可用（例如，在
    `~/.openclaw/.env` 中，或通过 `env.shellEnv`）。
  </Accordion>

  <Accordion title="OpenRouter 路由">
    通过 OpenRouter 使用 Arcee 模型时，同样适用 `arcee/*` 模型引用。
    OpenClaw 会根据你的认证选择透明地处理路由。有关 OpenRouter 特定的
    配置细节，请参阅 [OpenRouter provider docs](/providers/openrouter)。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/providers/openrouter" icon="shuffle">
    通过一个 API 密钥访问 Arcee 模型以及许多其他模型。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
</CardGroup>
