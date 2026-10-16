---
summary: "Arcee AI 设置（认证 + 模型选择）"
title: "Arcee AI"
read_when:
  - "你想将 Arcee AI 与 OpenClaw 一起使用"
  - "你需要 API 密钥环境变量或 CLI 认证选项"
---

[Arcee AI](https://arcee.ai) 通过 OpenAI- 兼容的 API 提供 Trinity 系列混合专家模型。所有 Trinity 模型均获得 Apache 2.0 许可。 Arcee 是官方 OpenClaw 插件，未与核心捆绑在一起，因此在使用之前需要安装步骤。

你可以直接通过 Arcee 平台访问 Arcee 模型，或通过 [OpenRouter](/providers/openrouter) 访问。

| 属性 | 值                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| 提供者 | `arcee`                                                                               |
| 认证     | `ARCEEAI_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）                   |
| API      | OpenAI-兼容                                                                     |
| 基础 URL | `https://api.arcee.ai/api/v1`（直接）或 `https://openrouter.ai/api/v1`（OpenRouter） |

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/arcee-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="direct-arcee-platform" title="直接（Arcee平台）">
    <Steps>
      <Step id="get-an-api-key" title="获取 API 密钥">
        在 [Arcee AI](https://chat.arcee.ai/) 创建一个 API 密钥。
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step id="set-a-default-model" title="设置默认模型">
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

  <Tab id="via-openrouter" title="通过 OpenRouter">
    <Steps>
      <Step id="get-an-api-key-1" title="获取 API 密钥">
        在 [OpenRouter](https://openrouter.ai/keys) 创建一个 API 密钥。
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step id="set-a-default-model-1" title="设置默认模型">
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

## <a id="non-interactive-setup"></a> 非交互式设置

<Tabs>
  <Tab id="direct-arcee-platform-2" title="直接（Arcee平台）">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab id="via-openrouter-2" title="通过 OpenRouter">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

普通加入会保存连接，而不会将目录行添加到 `models.providers.arcee.models`。现有行和模型别名保持不变。对于 `models.mode: "replace"`，加入还会添加路线的目录默认值，因为该模式会禁用自动发现。公共 `applyArceeConfig` 和 `applyArceeOpenRouterConfig` 帮助程序仍然在每种模式下添加目录默认值。

## <a id="direct-arcee-catalog"></a> Direct Arcee 目录

| 模型引用                      | 名称                   | 输入 | 上下文 | 最大输出 | 成本（in/out 每 1M） | 工具 | 笔记                                     |
| ------------------------------ | ---------------------- | ----- | ------- | ---------- | -------------------- | ----- | ----------------------------------------- |
| `arcee/trinity-large-thinking` | 三位一体大思维 | 文本  | 256K    | 80K        | $0.25 / $0.90        | No    | 默认模型；扩展思考          |
| `arcee/trinity-large-preview`  | 三位一体大预览  | 文本  | 128K    | 16K        | $0.25 / $1.00        | 是   | 通用；400B 参数，13B 激活  |
| `arcee/trinity-mini`           | 三一迷你26B       | 文本  | 128K    | 80K        | $0.045 / $0.15       | 是   | 快速且成本高效；函数调用 |

<Tip>
引导预设会将 `arcee/trinity-large-thinking` 设置为默认模型。
</Tip>

## <a id="openrouter-catalog"></a> OpenRouter 目录

OpenRouter 加入公开了 `arcee/trinity-large-preview` 和 `arcee/trinity-large-thinking`。 OpenClaw 将那些提供者限定的模型引用保留在配置中，并发送 OpenRouter 的 `arcee-ai/*` 运行时 ID。 Trinity Mini 不再由 OpenRouter 提供服务；使用该模型的直接 Arcee API。

## <a id="supported-features"></a> 支持的功能

| 功能                                       | 支持                                    |
| --------------------------------------------- | -------------------------------------------- |
| 流媒体                                     | 是                                          |
| 工具使用 / 函数调用                   | 是（Trinity Mini、Trinity Large Preview）    |
| 结构化输出（JSON 模式和 JSON Schema） | 是                                          |
| 扩展思考                             | 是（Trinity Large Thinking；已禁用工具） |

<AccordionGroup>
  <Accordion id="environment-note" title="环境注意事项">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `ARCEEAI_API_KEY` （或 `OPENROUTER_API_KEY`）对该进程可用，例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。
  </Accordion>

  <Accordion id="openrouter-routing" title="OpenRouter 路由">
    OpenRouter 使用相同的 `arcee/trinity-large-thinking` OpenClaw 模型参考号。 OpenClaw 使用 `arcee-ai/trinity-large-thinking` OpenRouter 运行时 ID 对其进行路由。有关 OpenRouter- 特定配置详细信息，请参阅 [OpenRouter 提供程序文档](/providers/openrouter)。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/providers/openrouter" icon="shuffle">
    通过一个 API 密钥访问 Arcee 模型以及许多其他模型。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
</CardGroup>
