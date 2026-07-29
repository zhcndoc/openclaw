---
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - 你希望在 OpenClaw 中使用 Z.AI / GLM 模型
  - 你需要一个简单的 ZAI_API_KEY 配置
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。请在 Z.AI 控制台中创建你的 API 密钥。OpenClaw 使用带有 Z.AI API 密钥的 `zai` 提供方。

| 属性 | 值                                        |
| -------- | -------------------------------------------- |
| 提供方 | `zai`                                        |
| 包 | `@openclaw/zai-provider`                     |
| 认证 | `ZAI_API_KEY` (旧别名: `Z_AI_API_KEY`) |
| API | Z.AI Chat Completions (Bearer 认证)          |

## GLM 模型

GLM is a model family, not a standalone provider. In OpenClaw, GLM models use
references like `zai/glm-5.2`: provider `zai`, model id `glm-5.2`.

## 入门

首先安装提供方插件：

```bash
openclaw plugins install @openclaw/zai-provider
```

<Tabs>
  <Tab title="自动检测端点">
    **最适合：** 大多数用户。OpenClaw 会使用你的 API 密钥探测受支持的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="显式区域端点">
    **最适合：** 希望强制使用特定 Coding Plan 或通用 API 接口的用户。

    <Steps>
      <Step title="选择正确的初始化选项">
        ```bash
        # Coding Plan 全局版（建议 Coding Plan 用户使用）
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN（中国区）
        openclaw onboard --auth-choice zai-coding-cn

        # 通用 API
        openclaw onboard --auth-choice zai-global

        # 通用 API CN（中国区）
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

### 端点

| Onboarding choice   | Base URL                                      | Default model |
| ------------------- | --------------------------------------------- | ------------- |
| `zai-global`        | `https://api.z.ai/api/paas/v4`                | `glm-5.2`     |
| `zai-cn`            | `https://open.bigmodel.cn/api/paas/v4`        | `glm-5.2`     |
| `zai-coding-global` | `https://api.z.ai/api/coding/paas/v4`         | `glm-5.2`     |
| `zai-coding-cn`     | `https://open.bigmodel.cn/api/coding/paas/v4` | `glm-5.2`     |

Z.AI 还提供与 Anthropic 兼容的 Coding Plan 基础 URL
`https://api.z.ai/api/anthropic`。OpenClaw 的 Z.AI 选项使用上面文档中
列出的 OpenAI Chat Completions 端点；Anthropic URL 供直接使用
Anthropic Messages 协议的客户端使用。

`zai-api-key` 会通过依次探测每个端点的 chat-completions API 来自动检测这四种端点之一，
先检查通用端点（`zai-global`，
然后是 `zai-cn`），再检查 Coding Plan 端点（`zai-coding-global`，然后
是 `zai-coding-cn`），并在第一个接受请求的端点处停止。
如果你的密钥在两个端点上都可用，请使用显式的 `--auth-choice` 来强制指定 Coding Plan 端点。

## 速率限制和过载

Z.AI 将 Coding Plan 和通用代理工具文档为容量管理型服务。在 Z.AI 自己的文档中：

- [通用代理工具](https://docs.z.ai/devpack/tool/others)，
  包括 OpenClaw，按尽力而为的方式提供服务。在推理负载较高时，
  通常是新加坡时间下午 2 点到 6 点左右，部分请求可能会遇到临时
  速率限制。
- [Coding Plan 速率和并发限制](https://docs.z.ai/devpack/usage-policy)
  取决于套餐层级，并可根据资源可用性动态调整。非高峰时段可能有更高的并发。
- [API 错误码 `1302`](https://docs.z.ai/api-reference/api-code) 表示“请求已达到
  速率限制”。API 错误码 `1305` 表示“服务可能暂时过载，请稍后再试”。

如果你在繁忙时段看到临时的 `429` 或 `1305` 响应，请等待并
重试请求。如果在非高峰时段仍反复失败，或者只在某一个端点、
模型或请求形态下发生，请先检查已配置的端点和模型：

```bash
openclaw models list --all --provider zai
openclaw config get models.providers.zai.baseUrl
```

Coding Plan 密钥应使用 Coding Plan 端点，例如
`https://api.z.ai/api/coding/paas/v4`；通用 API 密钥应使用通用 API
端点，例如 `https://api.z.ai/api/paas/v4`。同一密钥和端点下持续失败，
可能表明是提供方侧拒绝或套餐限制，而不是普通的高峰负载限流。

## 配置示例

<Tip>
`zai-api-key` 允许 OpenClaw 根据密钥检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当你想强制使用特定的 Coding Plan 或通用 API 接口时，请使用显式的区域选项。
</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // GLM-5.2 使用 Coding Plan 端点。
        baseUrl: "https://api.z.ai/api/coding/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.2" } } },
}
```

## 内置目录

`zai` 提供方插件将其目录随插件清单一起提供，因此只读
列表可以在不加载提供方运行时的情况下显示已知的 GLM 行：

```bash
openclaw models list --all --provider zai
```

当前由清单支持的目录包括：

| Model ref          | Notes                                             |
| ------------------ | ------------------------------------------------- |
| `zai/glm-5.2`      | 默认；1M 上下文                                     |
| `zai/glm-5-turbo`  | OpenClaw 优化的文本模型；200K 上下文              |
| `zai/glm-5v-turbo` | 多模态编码模型；200K 上下文                        |
| `zai/glm-5.1`      | 已弃用；默认隐藏；请使用 GLM-5.2                  |

目录 token 成本元数据遵循 Z.AI 当前的
[按量付费定价](https://docs.z.ai/guides/overview/pricing)。Coding Plan
订阅使用套餐额度而非按 token 计费；请参阅实时的
[订阅页面](https://z.ai/subscribe)了解套餐价格和可用性。

<Tip>
GLM 模型可用作 `zai/<model>`（例如：`zai/glm-5.2`）。
</Tip>

<Note>
所有新的 Z.AI 配置路径默认指向 `zai/glm-5.2`。在 Coding Plan 端点上，
当密钥/套餐未公开 GLM-5.2 时，自动检测会依次回退到
`glm-5.1`，然后是 `glm-4.7`。GLM
版本和可用性可能会变化；请运行 `openclaw models list --all --provider zai`
查看与你已安装版本已知的目录。
</Note>

## 思考级别

<Tabs>
  <Tab title="GLM-5.2">
    全范围：`off`、`low`、`high`、`max`（默认 `off`）。OpenClaw 将
    `low` 和 `high` 映射到 Z.AI 的 `high` 推理强度，并将 `max` 映射到 Z.AI 的
    `max` 强度，通过请求负载中的 `reasoning_effort` 实现。
  </Tab>
  <Tab title="其他 GLM 模型">
    仅二元切换：`off` 和 `low`（在选择器中显示为 `on`），默认
    `off`。将思考设置为 `off` 会发送 `thinking: { type: "disabled" }`；
    任何其他级别都不会修改请求负载（适用 Z.AI 自身的默认推理行为）。
  </Tab>
</Tabs>

将思考设置为 `off` 可避免响应在可见文本之前将输出预算花在
`reasoning_content` 上。

## 高级配置

<AccordionGroup>
  <Accordion title="转发解析未知的 GLM-5 模型">
    未知的 `glm-5*` id 在提供方路径上仍会通过
    从 `glm-4.7` 模板合成由提供方拥有的元数据来进行转发解析，只要该 id
    匹配当前 GLM-5 家族的形状。
  </Accordion>

  <Accordion title="工具调用流式传输">
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

  <Accordion title="保留思考内容">
    保留思考内容 是可选启用的，因为 Z.AI 需要重放完整的历史
    `reasoning_content`，这会增加提示词 token。可按模型启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.2": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    启用后且 thinking 开启时，OpenClaw 会发送
    `thinking: { type: "enabled", clear_thinking: false }`，并为同一份 OpenAI 兼容的对话记录重放之前的
    `reasoning_content`。snake_case 的
    `preserve_thinking` 参数键也可作为别名使用。

    高级用户仍然可以通过 `params.extra_body.thinking` 覆盖精确的提供方负载。

  </Accordion>

  <Accordion title="图像理解">
    Z.AI 插件会注册图像理解功能。

    | 属性     | 值          |
    | -------- | ----------- |
    | 模型     | `glm-4.6v`  |

    图像理解会根据已配置的 Z.AI 身份验证自动解析，无需额外配置。

  </Accordion>

  <Accordion title="认证详情">
    - Z.AI 使用你的 API 密钥进行 Bearer 认证。
    - `zai-api-key` 初始化选项会通过使用你的密钥探测受支持的端点来自动检测匹配的 Z.AI 端点。
    - 当你想强制使用特定 API 接口时，请使用显式的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
    - 仍然接受旧环境变量 `Z_AI_API_KEY`；如果 `ZAI_API_KEY` 未设置，OpenClaw 会在启动时将其复制到 `ZAI_API_KEY`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置模式，包括提供方和模型设置。
  </Card>
</CardGroup>