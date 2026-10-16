---
summary: "Chutes 设置（OAuth 或 API 密钥、模型发现、别名）"
title: "Chutes"
read_when:
  - "你想将 Chutes 与 OpenClaw 一起使用"
  - "你需要 OAuth 或 API 密钥的设置流程"
  - "你想了解默认模型、别名或发现行为"
---

[Chutes](https://chutes.ai) 通过 OpenAI- 兼容的 API 公开开源模型目录。 OpenClaw同时支持浏览器OAuth和API-key认证。

| 属性         | 值                                                   |
| ---------------- | ------------------------------------------------------- |
| 提供者         | `chutes`                                                |
| 插件           | 官方外包装（`@openclaw/chutes-provider`） |
| API              | OpenAI-兼容                                       |
| 基础 URL         | `https://llm.chutes.ai/v1`                              |
| 认证             | OAuth 或 API 密钥（见下文）                            |
| 运行时环境变量 | `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`                  |

`CHUTES_OAUTH_TOKEN` 直接提供一个已获取的 OAuth 访问令牌 （例如在 CI 中），从而绕过下面的交互式浏览器流程。

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/chutes-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

两个路径均将默认模型设置为 `chutes/zai-org/GLM-5.2-TEE` 并注册 Chutes 目录。

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step id="run-the-oauth-onboarding-flow" title="运行 OAuth 入门流程">
        ```bash
        openclaw onboard --auth-choice chutes
        ```
        OpenClaw 在本地启动浏览器流，或在 remote/headless 主机上显示 URL + 重定向粘贴流。 OAuth 令牌通过 OpenClaw 身份验证配置文件自动刷新。
      </Step>
    </Steps>
  </Tab>
  <Tab id="api-key" title="API 密钥">
    <Steps>
      <Step id="get-an-api-key" title="获取 API 密钥">
        在 [chutes.ai/app/settings/api-keys](https://chutes.ai/app/settings/api-keys). 创建密钥
      </Step>
      <Step id="run-the-api-key-onboarding-flow" title="运行 API 密钥入门流程">
        ```bash
        openclaw onboard --auth-choice chutes-api-key
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## <a id="discovery-behavior"></a> 发现行为

当 Chutes 身份验证可用时，OpenClaw 使用该凭证查询 `GET /v1/models` 并使用发现的模型，每个凭证缓存 5 分钟。拒绝的凭据会导致目录身份验证失败； OpenClaw 不会匿名重试。其他请求失败会产生不可用的目录结果，而不是成功的静态列表。成功的空响应将保持为空。 API-key 和 OAuth 发现使用相同的路径。

代币价格来自原生 [Chutes 模型目录](https://llm.chutes.ai/v1/models)。它的数字提示、完成和缓存输入率已经达到每百万代币 USD；它们不是每个代币的 OpenRouter 汇率。不可用或无效的价格元数据并不能证明模型是免费的。

在默认的 `models.mode: "merge"` 中，新的入门会记录提供商和别名，而无需将生成的模型行或价格复制到您的配置中。然后可以刷新实时价格，而不会覆盖明确编写的模型成本。 `models.mode: "replace"` 禁用发现，因此载入将捆绑目录保留为该模式下的显式离线种子。再次应用提供程序设置时，将保留现有配置的模型行及其价格。

## <a id="default-aliases"></a> 默认别名

OpenClaw 为 Chutes 目录注册两个方便的别名：

| 别名           | 目标模型                           |
| --------------- | -------------------------------------- |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE` |
| `chutes-vision` | `chutes/moonshotai/Kimi-K2.6-TEE`      |

## <a id="built-in-starter-catalog"></a> 内置起始目录

捆绑后备目录包含这些当前的入门模型以及一个兼容的上一代参考，该参考仍然可供选择，但对选择器隐藏：

| 模型引用                              | 选择器状态 |
| -------------------------------------- | ------------- |
| `chutes/zai-org/GLM-5.2-TEE`           | 可见的       |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE` | 可见的       |
| `chutes/moonshotai/Kimi-K2.6-TEE`      | 可见的       |
| `chutes/Qwen/Qwen3.6-27B-TEE`          | 可见的       |
| `chutes/Qwen/Qwen3.5-397B-A17B-TEE`    | 已隐藏        |

运行 `openclaw models list --all --provider chutes` 获取完整列表。

仍由本机端点列出的入门模型的回退价格已根据 2026 年 8 月 31 日的响应进行刷新。缺席的模型会保留其先前的种子快照：仅提要缺席不会废弃已发货的参考或更改其选择器状态。列出元数据并不能证明您的帐户可以调用模型。

## <a id="config-example"></a> 配置示例

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
  <Accordion id="oauth-overrides" title="OAuth 覆盖">
    使用可选的环境变量自定义 OAuth 流程：

    | 变量 | 用途 |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | OAuth 客户端 ID（如果未设置则提示） |
    | `CHUTES_CLIENT_SECRET` | OAuth 客户端密钥 |
    | `CHUTES_OAUTH_REDIRECT_URI` | 重定向 URI（默认 `http://127.0.0.1:1456/oauth-callback`） |
    | `CHUTES_OAUTH_SCOPES` | 以空格分隔的范围（默认 `openid profile chutes:invoke`） |

    有关重定向应用要求和帮助，请参阅 [Chutes OAuth 文档](https://chutes.ai/docs/sign-in-with-chutes/overview)。

  </Accordion>

  <Accordion id="notes" title="笔记">
    - Chutes 模型注册为 `chutes/<model-id>`。
    - Chutes 在流式传输期间不会报告 token 使用情况（`supportsUsageInStreaming: false`）；流结束后仍会显示使用总量。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    提供者规则、模型参考和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Chutes 控制台和 API 文档。
  </Card>
  <Card title="Chutes API 按键" href="https://chutes.ai/app/settings/api-keys" icon="key">
    创建和管理 Chutes API 密钥。
  </Card>
</CardGroup>
