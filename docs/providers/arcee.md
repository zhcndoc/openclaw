---
summary: "Arcee AI 设置（认证 + 模型选择）"
title: "Arcee AI"
read_when:
  - 你想将 Arcee AI 与 OpenClaw 一起使用
  - 你需要 API 密钥环境变量或 CLI 认证方式的选择
---

[Arcee AI](https://arcee.ai) 通过 OpenAI 兼容的 API 提供 Trinity 系列的混合专家模型。所有 Trinity 模型都采用 Apache 2.0 许可证。Arcee 是 OpenClaw 的官方插件，不包含在核心中，因此在开始使用前需要先执行安装步骤。

你可以直接通过 Arcee 平台访问 Arcee 模型，或通过 [OpenRouter](/providers/openrouter) 访问。

| 属性 | 值                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| 提供方 | `arcee`                                                                               |
| 认证     | `ARCEEAI_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）                   |
| API      | 与 OpenAI 兼容                                                                     |
| 基础 URL | `https://api.arcee.ai/api/v1`（直接）或 `https://openrouter.ai/api/v1`（OpenRouter） |

## 安装插件

```bash
openclaw plugins install @openclaw/arcee-provider
openclaw gateway restart
```

## 快速开始

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

        同样的模型引用同时适用于直接方式和 OpenRouter 配置。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 非交互式设置

<Tabs>
  <Tab title="直接方式（Arcee 平台）">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="通过 OpenRouter">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## Direct Arcee 目录

| 模型引用                       | 名称                   | 输入 | 上下文  | 最大输出 | 成本（输入/输出，每 1M） | 工具 | 备注                                     |
| ------------------------------ | ---------------------- | ----- | ------- | ---------- | -------------------- | ----- | ----------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | text  | 256K    | 80K        | $0.25 / $0.90        | 否    | 默认模型；扩展思考                        |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | text  | 128K    | 16K        | $0.25 / $1.00        | 是   | 通用；400B 参数，13B 激活                 |
| `arcee/trinity-mini`           | Trinity Mini 26B       | text  | 128K    | 80K        | $0.045 / $0.15       | 是   | 快速且成本高效；函数调用                   |

<Tip>
引导预设会将 `arcee/trinity-large-thinking` 设置为默认模型。
</Tip>

## OpenRouter catalog

OpenRouter 接入流程会公开 `arcee/trinity-large-preview` 和 `arcee/trinity-large-thinking`。OpenClaw 会在配置中保留这些带 provider 限定的模型引用，并发送 OpenRouter 的规范 `arcee-ai/*` 运行时 ID。OpenRouter 不再提供 Trinity Mini；对于该模型，请直接使用 Arcee API。

## 支持的功能

| 功能                                       | 支持情况                                    |
| --------------------------------------------- | -------------------------------------------- |
| 流式输出                                     | 是                                          |
| 工具使用 / 函数调用                   | 是（Trinity Mini、Trinity Large Preview）    |
| 结构化输出（JSON 模式和 JSON Schema） | 是                                          |
| 扩展思考                             | 是（Trinity Large Thinking；已禁用工具） |

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `ARCEEAI_API_KEY`
    （或 `OPENROUTER_API_KEY`）对该进程可用，例如放在
    `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。
  </Accordion>

  <Accordion title="OpenRouter 路由">
    OpenRouter 使用相同的 `arcee/trinity-large-thinking` OpenClaw 模型引用。
    OpenClaw 使用规范的 `arcee-ai/trinity-large-thinking`
    OpenRouter 运行时 ID 对其进行路由。有关
    OpenRouter 特定的配置详细信息，请参阅
    [OpenRouter 提供商文档](/providers/openrouter)。
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
