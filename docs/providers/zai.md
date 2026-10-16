---
summary: "将 Z.AI（GLM 模型）与 OpenClaw 结合使用"
read_when:
  - "您想要 OpenClaw 中的 Z.AI / GLM 模型"
  - "你需要一个简单的 ZAI_API_KEY 配置"
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它为GLM提供REST API，并使用API密钥进行身份验证。在 [Z.AI 控制台 ](https://z.ai/manage-apikey/apikey-list) 中创建您的 API 密钥。 OpenClaw 使用带有 Z.AI API 密钥的 `zai` 提供程序。

| 属性 | 值                                        |
| -------- | -------------------------------------------- |
| 提供者 | `zai`                                        |
| 包裹  | `@openclaw/zai-provider`                     |
| 认证     | `ZAI_API_KEY` (旧别名: `Z_AI_API_KEY`) |
| API      | Z.AI Chat Completions (Bearer 认证)          |

## <a id="glm-models"></a> GLM 模型

GLM 是一个模型系列，而不是单独的提供商。在 OpenClaw、GLM 模型中，使用诸如 `zai/glm-5.3` 之类的引用：提供商 `zai`、模型 id `glm-5.3`。

## <a id="getting-started"></a> 入门

首先安装提供方插件：

```bash
openclaw plugins install @openclaw/zai-provider
```

<Tabs>
  <Tab id="auto-detect-endpoint" title="自动检测端点">
    **最适合：**大多数用户。 OpenClaw 使用您的 API 密钥检查支持的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step id="verify-the-model-is-listed" title="验证模型是否已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab id="explicit-regional-endpoint" title="明确的区域端点">
    **最适合：** 希望强制使用特定 Coding Plan 或通用 API 接口的用户。

    <Steps>
      <Step id="pick-the-right-onboarding-choice" title="选择正确的入门引导选择">
        ```bash
        # Coding Plan Global (recommended for Coding Plan users)
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN (China region)
        openclaw onboard --auth-choice zai-coding-cn

        # General API
        openclaw onboard --auth-choice zai-global

        # General API CN (China region)
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step id="verify-the-model-is-listed-1" title="验证模型是否已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

### <a id="endpoints"></a> 端点

| 初始化选项   | 基础 URL                                      | 默认模型 |
| ------------------- | --------------------------------------------- | ------------- |
| `zai-global`        | `https://api.z.ai/api/paas/v4`                | `glm-5.2`     |
| `zai-cn`            | `https://open.bigmodel.cn/api/paas/v4`        | `glm-5.2`     |
| `zai-coding-global` | `https://api.z.ai/api/coding/paas/v4`         | `glm-5.3`     |
| `zai-coding-cn`     | `https://open.bigmodel.cn/api/coding/paas/v4` | `glm-5.3`     |

Z.AI 还发布了 Anthropic- 兼容编码计划基础 URL `https://api.z.ai/api/anthropic`。 OpenClaw 的 Z.AI 选择使用上面记录的 OpenAI 聊天完成端点； Anthropic URL 适用于直接说出 Anthropic 消息的客户端。

`zai-api-key` 通过对照每个端点的聊天完成 API 检查您的密钥，在编码计划端点（`zai-coding-global`，然后 `zai-coding-cn`）之前检查通用端点（`zai-global`，然后 `zai-cn`），并在第一个接受请求。如果您的密钥对两者都有效，请使用显式 `--auth-choice` 强制编码计划端点。

## <a id="rate-limits-and-overloads"></a> 速率限制和过载

Z.AI 将 Coding Plan 和通用代理工具文档为容量管理型服务。在 Z.AI 自己的文档中：

- [ 通用代理工具](https://docs.z.ai/devpack/tool/others)（包括OpenClaw）将尽力提供服务。在高推理负载期间（通常大约 2-6 PM Singapore 时间），某些请求可能会面临临时速率限制。
- [Coding Plan 速率和并发限制](https://docs.z.ai/devpack/usage-policy) 取决于套餐层级，并可根据资源可用性动态调整。非高峰时段可能有更高的并发。
- [API 错误码 `1302`](https://docs.z.ai/api-reference/api-code) 表示“请求已达到速率限制”。API 错误码 `1305` 表示“服务可能暂时过载，请稍后再试”。

如果你在繁忙时段看到临时的 `429` 或 `1305` 响应，请等待并重试请求。如果在非高峰时段仍反复失败，或者只在某一个端点、 模型或请求形态下发生，请先检查已配置的端点和模型：

```bash
openclaw models list --all --provider zai
openclaw config get models.providers.zai.baseUrl
```

Coding Plan 密钥应使用 Coding Plan 端点，例如 `https://api.z.ai/api/coding/paas/v4`；通用 API 密钥应使用通用 API 端点，例如 `https://api.z.ai/api/paas/v4`。同一密钥和端点下持续失败， 可能表明是提供方侧拒绝或套餐限制，而不是普通的高峰负载限流。

## <a id="config-example"></a> 配置示例

<Tip>
`zai-api-key` 允许 OpenClaw 根据密钥检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当你想强制使用特定的 Coding Plan 或通用 API 接口时，请使用显式的区域选项。
</Tip>

```json5
{
  env: { vars: { ZAI_API_KEY: "sk-..." } },
  models: {
    providers: {
      zai: {
        // GLM-5.3 uses the Coding Plan endpoint.
        baseUrl: "https://api.z.ai/api/coding/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.3" } } },
}
```

## <a id="built-in-catalog"></a> 内置目录

`zai` 提供方插件将其目录随插件清单一起提供，因此只读列表可以在不加载提供方运行时的情况下显示已知的 GLM 行：

```bash
openclaw models list --all --provider zai
```

清单支持的目录包括：

| 模型引用           | 笔记                                              |
| ------------------- | -------------------------------------------------- |
| `zai/glm-5.3`       | 编码计划默认； 1,048,576 个令牌上下文       |
| `zai/glm-5.3-flash` | 多模态文本和图像模型； 1,048,576 上下文 |
| `zai/glm-5.2`       | 一般默认API； 1M上下文                    |
| `zai/glm-5-turbo`   | OpenClaw-优化文本模型； 200K 上下文        |
| `zai/glm-5v-turbo`  | 多模态编码模型；200K 上下文              |
| `zai/glm-5.1`       | 已弃用；默认隐藏；请使用 GLM-5.2  |

即用即付目录行遵循 Z.AI 的当前 [API 定价](https://docs.z.ai/guides/overview/pricing)。 GLM-5.3 即使有临时折扣，Flash 也使用即用即付的标价。 GLM-5.3目前是Coding Plan模型，因此其本地目录成本为零；编码计划订阅使用计划配额而不是按令牌计费。请参阅实时 [ 订阅页面 ](https://z.ai/subscribe) 了解计划定价和可用性。

<Tip>
GLM 模型可用作 `zai/<model>`（示例：`zai/glm-5.3`）。
</Tip>

<Note>
新编码计划设置默认为 `zai/glm-5.3`；一般 API 设置保留在 `zai/glm-5.2` 上。在编码计划端点上，当关键或区域端点不直接公开 GLM-5.3 时，自动检测会通过 `glm-5.1` 和 `glm-4.7` 回退。 Z.AI 目前将 GLM-5.2 和 GLM-5.1 的编码计划请求路由到 GLM-5.3。运行 `openclaw models list --all --provider zai` 以查看您安装的版本已知的目录。
</Note>

## <a id="video-generation"></a> 视频生成

相同的插件和`ZAI_API_KEY`（或`Z_AI_API_KEY`）支持[视频生成工具](/tools/video-generation)和`zai/cogvideox-3`。它接受文本提示或一张 PNG/JPEG 图像，包括作为数据 URI 发送的本地文件（最多 5 个 MB）。不支持视频参考。

持续时间正常为 5 或 10 秒。大小和纵横比提示映射到最接近的支持大小：`1280x720`、`720x1280`、`1024x1024`、`1920x1080`、`1080x1920`、`2048x1080` 或 `3840x2160`。输出默认720P风景，无音频； `audio: true` 启用声音。使用 `providerOptions.quality`（`speed` 或 `quality`）和 `providerOptions.fps`（`30` 或 `60`）进行进一步控制。

视频使用配置的全球或中国区域通用`/api/paas/v4`端点。 Coding Plan 聊天端点映射到同一区域的通用视频端点；视频需要 API 访问该端点并进行计费。

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: { primary: "zai/cogvideox-3" },
      },
    },
  },
}
```

## <a id="thinking-levels"></a> 思考级别

<Tabs>
  <Tab id="glm-5-3-and-flash" title="GLM-5.3和闪存">
    级别：`low`、`high` 和 `max`（默认 `max`）。 OpenClaw 将这些映射到 Z.AI 的 `reasoning_effort` 请求字段。显式 `off` 设置映射到 `reasoning_effort: "low"`，因为 GLM-5.3 模型不支持完全禁用推理。
  </Tab>
  <Tab title="GLM-5.2">
    全范围：`off`、`low`、`high`、`max`（默认 `off`）。OpenClaw 将 `low` 和 `high` 映射到 Z.AI 的 `high` 推理强度，并将 `max` 映射到 Z.AI 的 `max` 强度，通过请求负载中的 `reasoning_effort` 实现。
  </Tab>
  <Tab id="other-glm-models" title="其他GLM模型">
    仅二元切换：`off` 和 `low`（在选择器中显示为 `on`），默认 `off`。将思考设置为 `off` 会发送 `thinking: { type: "disabled" }`； 任何其他级别都不会修改请求负载（适用 Z.AI 自身的默认推理行为）。
  </Tab>
</Tabs>

将思考设置为 `off` 可避免响应在可见文本之前将输出预算花在 `reasoning_content` 上。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="forward-resolving-unknown-glm-5-models" title="前向解析未知 GLM-5 模型">
    未知的 `glm-5*` id 在提供方路径上仍会通过从 `glm-4.7` 模板合成由提供方拥有的元数据来进行转发解析，只要该 id 匹配当前 GLM-5 家族的形状。
  </Accordion>

  <Accordion id="tool-call-streaming" title="工具调用流">
    `tool_stream` 默认已为 Z.AI 的工具调用流式传输启用。如需禁用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="preserved-thinking" title="保留思维">
    保留思考内容是可选启用的，因为 Z.AI 需要重放完整的历史 `reasoning_content`，这会增加提示词 token。可按模型启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.3": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    当启用并且思考开启时，OpenClaw 发送 `thinking: { type: "enabled", clear_thinking: false }` 并重播之前的 `reasoning_content`，以获得相同的 OpenAI- 兼容转录。 snake_case `preserve_thinking` 参数键用作别名。

    高级用户仍然可以通过 `params.extra_body.thinking` 覆盖精确的提供方负载。

  </Accordion>

  <Accordion id="image-understanding" title="图像理解">
    Z.AI 插件会注册图像理解功能。

    | 属性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    图像理解会根据已配置的 Z.AI 身份验证自动解析，无需额外配置。

  </Accordion>

  <Accordion id="auth-details" title="授权详情">
    - Z.AI 使用你的 API 密钥进行 Bearer 认证。
    - `zai-api-key` 加入选项会通过使用您的密钥检查支持的端点来自动检测匹配的 Z.AI 端点。
    - 当你想强制使用特定 API 接口时，请使用显式的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
    - 仍然接受旧环境变量 `Z_AI_API_KEY`；如果 `ZAI_API_KEY` 未设置，OpenClaw 会在启动时将其复制到 `ZAI_API_KEY`。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置模式，包括提供方和模型设置。
  </Card>
</CardGroup>
