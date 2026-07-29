---
summary: "Chutes 设置（OAuth 或 API 密钥、模型发现、别名）"
title: "Chutes"
read_when:
  - 你想将 Chutes 与 OpenClaw 一起使用
  - 你需要 OAuth 或 API 密钥的设置流程
  - 你想了解默认模型、别名或发现行为
---

[Chutes](https://chutes.ai) 通过一个与 OpenAI 兼容的 API 提供开源模型目录。OpenClaw 同时支持浏览器 OAuth 和 API 密钥认证。

| Property         | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Provider         | `chutes`                                                |
| Plugin           | official external package (`@openclaw/chutes-provider`) |
| API              | OpenAI-compatible                                       |
| Base URL         | `https://llm.chutes.ai/v1`                              |
| Auth             | OAuth or API key (see below)                            |
| Runtime env vars | `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`                  |

`CHUTES_OAUTH_TOKEN` 直接提供一个已获取的 OAuth 访问令牌
（例如在 CI 中），从而绕过下面的交互式浏览器流程。

## 安装插件

```bash
openclaw plugins install @openclaw/chutes-provider
openclaw gateway restart
```

## 开始使用

Both paths set the default model to `chutes/zai-org/GLM-5.2-TEE` and register
the Chutes catalog.

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="运行 OAuth 引导流程">
        ```bash
        openclaw onboard --auth-choice chutes
        ```
        OpenClaw 会在本地启动浏览器流程，或在远程/无头主机上显示 URL + 重定向粘贴流程。OAuth 令牌会通过 OpenClaw 认证配置文件自动刷新。
      </Step>
    </Steps>
  </Tab>
  <Tab title="API 密钥">
    <Steps>
      <Step title="Get an API key">
        Create a key at
        [chutes.ai/app/settings/api-keys](https://chutes.ai/app/settings/api-keys).
      </Step>
      <Step title="运行 API 密钥引导流程">
        ```bash
        openclaw onboard --auth-choice chutes-api-key
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## 发现行为

当 Chutes auth 可用时，OpenClaw 会使用该凭据查询 `GET /v1/models`，并使用发现到的模型；每个凭据的结果会缓存 5 分钟。对于已过期/未授权的密钥（HTTP 401），OpenClaw 会在不带凭据的情况下重试一次。如果发现结果仍然没有任何行、发生失败，或返回任何其他非 2xx 状态，则会回退到内置的静态目录（API key 和 OAuth 发现都使用同一路径）。如果在启动时发现失败，则会自动使用静态目录。

## 默认别名

OpenClaw registers two convenience aliases for the Chutes catalog:

| Alias           | Target model                           |
| --------------- | -------------------------------------- |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE` |
| `chutes-vision` | `chutes/moonshotai/Kimi-K2.6-TEE`      |

## 内置起始目录

The bundled fallback catalog contains these current starter models plus two
compatible prior-generation refs that remain selectable but are hidden from
pickers:

| Model ref                              | Picker status |
| -------------------------------------- | ------------- |
| `chutes/zai-org/GLM-5.2-TEE`           | Visible       |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE` | Visible       |
| `chutes/moonshotai/Kimi-K2.6-TEE`      | Visible       |
| `chutes/MiniMaxAI/MiniMax-M2.5-TEE`    | Visible       |
| `chutes/Qwen/Qwen3.6-27B-TEE`          | Visible       |
| `chutes/moonshotai/Kimi-K2.5-TEE`      | Hidden        |
| `chutes/Qwen/Qwen3.5-397B-A17B-TEE`    | Hidden        |

运行 `openclaw models list --all --provider chutes` 获取完整列表。

## 配置示例

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-5.2-TEE" },
      models: {
        "chutes/zai-org/GLM-5.2-TEE": { alias: "Chutes GLM 5.2" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="OAuth 覆盖">
    使用可选的环境变量自定义 OAuth 流程：

    | 变量 | 作用 |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | OAuth 客户端 ID（未设置时会提示输入） |
    | `CHUTES_CLIENT_SECRET` | OAuth 客户端密钥 |
    | `CHUTES_OAUTH_REDIRECT_URI` | 重定向 URI（默认 `http://127.0.0.1:1456/oauth-callback`） |
    | `CHUTES_OAUTH_SCOPES` | 以空格分隔的范围（默认 `openid profile chutes:invoke`） |

    有关重定向应用要求和帮助，请参阅 [Chutes OAuth 文档](https://chutes.ai/docs/sign-in-with-chutes/overview)。

  </Accordion>

  <Accordion title="备注">
    - Chutes 模型注册为 `chutes/<model-id>`。
    - Chutes 在流式传输期间不会报告 token 使用情况（`supportsUsageInStreaming: false`）；流结束后仍会显示使用总量。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    提供程序规则、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供程序设置在内的完整配置模式。
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Chutes 控制台和 API 文档。
  </Card>
  <Card title="Chutes API keys" href="https://chutes.ai/app/settings/api-keys" icon="key">
    Create and manage Chutes API keys.
  </Card>
</CardGroup>
