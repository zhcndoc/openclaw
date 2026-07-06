---
summary: "通过 ClawRouter 路由凭证作用域模型，并展示托管配额"
title: "ClawRouter"
read_when:
  - 你希望为多个模型提供方使用一个托管密钥
  - 你需要在 OpenClaw 中进行 ClawRouter 模型发现或配额报告
---

ClawRouter 为 OpenClaw 提供一个面向多家上游模型提供方的策略作用域密钥。随附的 `clawrouter` 插件只会发现该密钥允许使用的模型，将每个模型通过其声明的协议进行路由，并在 OpenClaw 的使用界面上报告该密钥的预算和汇总使用情况。

上游凭证和提供方特定的转发都保留在 ClawRouter 中，因此你无需在 OpenClaw 主机上安装或认证每个上游提供方插件。该插件随 OpenClaw 一起打包提供（`enabledByDefault: true`）；你只需要一个已签发的 ClawRouter 凭证。

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| Provider      | `clawrouter`                             |
| Plugin        | bundled (included in OpenClaw)           |
| Auth          | `CLAWROUTER_API_KEY`                     |
| Default URL   | `https://clawrouter.openclaw.ai`         |
| Model catalog | 通过 `/v1/catalog` 进行凭证作用域控制      |
| Quotas        | 通过 `/v1/usage` 提供每月预算和使用情况 |

## 入门指南

<Steps>
  <Step title="获取作用域凭证">
    请向你的 ClawRouter 管理员索取一个凭证，其策略应包含你应使用的提供商、模型和月度预算。凭证在签发时只会显示一次。
  </Step>
  <Step title="配置 OpenClaw">
    ```bash
    export CLAWROUTER_API_KEY="..."
    openclaw onboard --auth-choice clawrouter-api-key
    openclaw plugins enable clawrouter
    ```

    `clawrouter` 已随附并默认启用。如果你的配置设置了 `plugins.allow`，在启用之前请将 `clawrouter` 添加到该列表中。对于自定义部署，请将 `models.providers.clawrouter.baseUrl` 设置为 ClawRouter 的源地址；默认值为 `https://clawrouter.openclaw.ai`。

  </Step>
  <Step title="列出已授予的模型">
    ```bash
    openclaw models list --all --provider clawrouter
    ```

    请严格按显示的原样使用返回的模型引用。它们会保留上游命名空间，例如 `clawrouter/openai/gpt-5.5`、
    `clawrouter/anthropic/claude-sonnet-4-6` 或
    `clawrouter/google/gemini-3.5-flash`。如果你的配置中 `agents.defaults.models` 是一个允许列表，请将每个选中的 ClawRouter 引用添加进去。

  </Step>
  <Step title="选择一个模型">
    ```bash
    openclaw models set clawrouter/<provider>/<model>
    ```

    你也可以在单次运行中通过 `openclaw agent --model clawrouter/<provider>/<model> --message "..."` 选择一个返回的模型。

  </Step>
</Steps>

## 模型发现

`GET /v1/catalog` 返回 `{ providers: [...] }`，其中每个 provider 条目都列出它自己的 `models[]`（包含上游 id、能力和定价），以及它支持的请求路由。OpenClaw 不提供第二份固定的 ClawRouter 模型列表。当满足以下条件时，catalog 中的某个模型会被声明为 OpenClaw 模型：

- 该凭证的策略授予了其 provider；
- 该 catalog 模型声明了受支持的 LLM 能力（`llm.responses`、`llm.chat`、`llm.messages`，或带有匹配流式路由的 `llm.stream`）；并且
- 该 provider 为下面某一种传输方式暴露了匹配的路由。

将模型添加到受支持的 ClawRouter provider 中无需发布新的 OpenClaw 版本：下一次 catalog 刷新（按每个凭证作用域缓存 60 秒）就会发现它。若某个模型需要新的 wire protocol，则必须先获得插件支持。

## 协议和提供方插件

ClawRouter 拥有上游凭据；其目录会告知 OpenClaw 应使用哪种
传输方式，因此你无需安装每一家上游公司的认证插件。

| 目录能力 / 路由                                            | OpenClaw 传输方式        |
| --------------------------------------------------------- | ---------------------- |
| `llm.responses`（OpenAI 兼容提供方）                       | `openai-responses`     |
| `llm.chat`（OpenAI 兼容提供方）                             | `openai-completions`   |
| `llm.messages` + `anthropic.messages` 路由                 | `anthropic-messages`   |
| `llm.stream` + 流式 `google.generate_content` 路由         | `google-generative-ai` |

该插件还会为这些家族应用匹配的重放和工具模式策略（OpenAI/DeepSeek/Gemini 工具模式兼容性；原生 Anthropic 和
Google Gemini 重放策略）。仅暴露不受支持请求格式的目录提供方，故意不会被声明为 OpenClaw
文本模型。请在 ClawRouter 中将这些提供方规范化为受支持的某一种契约，而不是发送不兼容的载荷。

## 配额与用量

ClawRouter 的 `/v1/usage` 响应会填充标准 OpenClaw 提供方用量
展示：请求、令牌和花费总计，以及在密钥有上限时的月度预算窗口。
无限额密钥仍会显示汇总用量，但不会显示百分比窗口。

配额查询使用与模型发现相同的作用域密钥。配额查询失败不会阻止模型执行。

使用以下命令检查实时快照：

```bash
openclaw status --usage
openclaw models status
```

同样的提供方快照也可用于聊天中的 `/status` 和 OpenClaw 的
用量 UI。预算是全局策略级别的，因此其他客户端使用
相同 ClawRouter 策略发出的请求可能会改变剩余百分比。

## 故障排查

| 症状                                  | 检查                                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 没有 ClawRouter 模型                     | 确认插件已启用并且被 `plugins.allow` 允许，然后检查该凭据是否处于活动状态并且至少授予了一个就绪提供商。 |
| 已配置的 ClawRouter 模型缺失 | 检查其 `/v1/catalog` 能力和路由支持。不支持的传输契约会被有意过滤掉。                            |
| `Unknown model: clawrouter/...`          | 当该配置映射被用作允许列表时，将精确的 catalog ref 添加到 `agents.defaults.models`。                               |
| 来自 catalog 或 usage 的 `401` 或 `403`     | 重新签发或重新配置作用域后的 ClawRouter 凭据；OpenClaw 不会回退到上游提供商密钥。                                          |
| 模型调用在发现后失败         | 检查 ClawRouter 中的提供商连接和上游健康状态，然后在其就绪状态恢复后重试。                                |
| usage 有总量但没有百分比       | 该策略是非计量的；在 ClawRouter 中添加月度预算以显示百分比窗口。                                                     |

## 安全行为

- 目录发现的范围限定为已配置的代理密钥，并按凭据范围（agent dir、workspace dir、auth profile id 和 base URL）进行缓存。
- 代理密钥仅在请求分发时附加；不会存储在模型元数据中。
- 原生 Anthropic 和 Gemini 模型 id 仅在分发时重写为其上游 id。
- 不支持或未授予的目录行会以关闭方式失败，且不可选择。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供商配置和模型选择。
  </Card>
  <Card title="使用情况跟踪" href="/concepts/usage-tracking" icon="chart-line">
    OpenClaw 使用情况和状态展示。
  </Card>
</CardGroup>
