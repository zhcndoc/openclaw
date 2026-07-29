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

    Use the returned model refs exactly as shown. They retain the upstream
    namespace, such as `clawrouter/openai/gpt-5.5`,
    `clawrouter/anthropic/claude-sonnet-4-6`, or
    `clawrouter/google/gemini-3.5-flash`. If `agents.defaults.modelPolicy.allow`
    is configured, add each selected ClawRouter ref to it.

  </Step>
  <Step title="选择一个模型">
    ```bash
    openclaw models set clawrouter/<provider>/<model>
    ```

    你也可以在单次运行中通过 `openclaw agent --model clawrouter/<provider>/<model> --message "..."` 选择一个返回的模型。

  </Step>
</Steps>

## 托管的非交互式部署

将代理密钥保留在工作负载的密钥注入中，并且只在 `openclaw.json` 中存储一个 SecretRef。规范化的托管字段如下：

| 用途         | 配置或环境字段                                                           |
| ------------ | ------------------------------------------------------------------------ |
| 路由器源     | `models.providers.clawrouter.baseUrl`                                    |
| 凭据         | `models.providers.clawrouter.apiKey` -> env SecretRef                    |
| 密钥值       | 网关进程环境中的 `CLAWROUTER_API_KEY`                                    |
| 默认模型     | `agents.defaults.model.primary` -> `clawrouter/<provider>/<model>`       |
| 工作负载标签 | `models.providers.clawrouter.headers.X-ClawRouter-Project-Id`（可选）    |

例如，部署控制器可以负责以下 JSON5 补丁：

```json5
{
  plugins: {
    entries: { clawrouter: { enabled: true } },
  },
  models: {
    providers: {
      clawrouter: {
        baseUrl: "https://clawrouter.internal.example",
        apiKey: {
          source: "env",
          provider: "default",
          id: "CLAWROUTER_API_KEY",
        },
        headers: {
          "X-ClawRouter-Project-Id": "fakeco",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "clawrouter/openai/gpt-5.5" },
    },
  },
}
```

如果部署设置了 `plugins.allow`，请保留其现有条目并添加 `clawrouter`。无需交互式向导即可验证并应用：

```bash
openclaw config patch --file ./clawrouter.patch.json5 --dry-run --json
openclaw config patch --file ./clawrouter.patch.json5
```

dry run 会解析 SecretRef，但绝不会打印其值。要轮换凭据，请更新提供 `CLAWROUTER_API_KEY` 的外部 Secret，并重启网关工作负载，以便加载新的进程环境。配置文件和模型引用不会改变。

对于源码构建的独立 Docker 网关，ClawRouter 已经包含在根运行时中。只需选择需要单独打包的通道插件，例如 `OPENCLAW_EXTENSIONS=clickclack`、`slack` 或 `msteams`；请参见[带所选插件的源码构建镜像](/install/docker#source-built-images-with-selected-plugins)。归档/ appliance 部署必须通过其自己的制品流水线打包相同的已落地源码，而不是使用 OCI 镜像。

## 就绪性和真实验证

这些检查证明的是不同的边界；不要互相替代：

```bash
# 仅检查 ClawRouter 进程健康；不会使用任何凭据或上游模型。
curl -fsS https://clawrouter.internal.example/v1/health

# 仅检查 OpenClaw 网关启动就绪；不会发起模型调用。
curl -fsS http://127.0.0.1:18789/readyz

# 基于凭据范围的目录发现。
openclaw models list --all --provider clawrouter --json

# 通过已配置的 ClawRouter provider 进行最小真实推理探测。
openclaw models status --probe --probe-provider clawrouter --probe-max-tokens 8 --json

# 使用精确授予的模型引用进行工作负载金丝雀测试。
openclaw agent --agent main \
  --model clawrouter/openai/gpt-5.5 \
  --message "Reply exactly: CLAWROUTER_CANARY_OK" \
  --json
```

请使用作用域目录返回的模型，而不是盲目复制示例模型。成功的 `/readyz` 响应意味着网关可以处理请求；这并不表示 ClawRouter、其凭据或上游提供商已就绪。模型探测和 agent 金丝雀测试才是推理证明。

如需进行实时诊断，请发起金丝雀测试并检查网关的标准日志。现有的仅元数据模型传输诊断会输出如下形式的行：

```text
[model-fetch] start provider=clawrouter api=openai-responses model=openai/gpt-5.5 method=POST url=https://clawrouter.internal.example/v1/responses
[model-fetch] response provider=clawrouter api=openai-responses model=openai/gpt-5.5 status=200
```

当这些标识符可用时，插件会发送有界的 `X-ClawRouter-Client`、`X-ClawRouter-Agent-Id` 和 `X-ClawRouter-Session-Id` 请求头。它还会将模型调用的诊断 `callId`（`<run-id>:model:<n>`）映射到 `X-Request-ID`，因此 OpenClaw 的模型调用事件可以与 ClawRouter 的仅元数据审计轨迹关联。128 字符请求 ID 预算内的值是相同的。更长的值会保留 `:model:<n>` 后缀和一个确定性哈希，使不同调用保持有界且可关联。诸如 `X-ClawRouter-Project-Id` 之类的静态部署元数据可以在 provider 的 `headers` 映射中设置。Agent 和 session 归属请求头各自保留独立的 256 字符限制。包含 ClawRouter ASCII 标识符集合之外字符的自动请求 ID 会使用相同的确定性有界形式。显式配置的请求头（包括 `X-Request-ID` 的任何大小写变体）优先于自动值。传输诊断会记录路由和响应元数据；它不会记录凭据、请求 ID、提示词或补全内容。ClawRouter 自身的审计事件会提供所选上游提供商和内容保留状态。

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

The plugin also applies the matching replay and tool-schema policies for those
families (OpenAI/DeepSeek/Gemini/Perplexity tool-schema compat; native
Anthropic and Google Gemini replay policies). Perplexity models get a strict
schema rewrite: `patternProperties` and `additionalProperties` are removed and
every object schema declares `properties`, because Perplexity rejects tool
schemas without them. A catalog provider exposing only an
unsupported request format is intentionally not advertised as an OpenClaw
text model. Normalize those providers to one of the supported contracts in
ClawRouter rather than sending an incompatible payload.

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
| No ClawRouter models                     | Confirm the plugin is enabled and allowed by `plugins.allow`, then check that the credential is active and grants at least one ready provider. |
| A configured ClawRouter model is missing | Inspect its `/v1/catalog` capability and route support. Unsupported transport contracts are intentionally filtered.                            |
| Model override rejected by policy        | Add the exact catalog ref or `clawrouter/*` to `agents.defaults.modelPolicy.allow`.                                                            |
| `401` or `403` from catalog or usage     | Reissue or re-scope the ClawRouter credential; OpenClaw does not fall back to upstream provider keys.                                          |
| Model call fails after discovery         | Check the provider connection and upstream health in ClawRouter, then retry after its readiness state recovers.                                |
| Usage has totals but no percentage       | The policy is unmetered; add a monthly budget in ClawRouter to expose a percentage window.                                                     |

## 安全行为

- 目录发现的作用域仅限于已配置的代理密钥，并按凭据作用域缓存（agent 目录、workspace 目录、auth profile id 和 base URL）。
- 代理密钥仅在请求分发时附加；它不会存储在模型元数据中。
- 自动归因和请求关联值在分发前会被裁剪并拒绝控制字符。归因值上限为 256 个字符；请求 id 上限为 128 个字符。
- 模型传输诊断仅包含元数据，绝不会包含代理密钥或模型内容。
- 原生 Anthropic 和 Gemini 模型 id 仅在分发时重写为其上游 id。
- 不受支持或未授予的目录行会安全失败，且不可被选择。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供商配置和模型选择。
  </Card>
  <Card title="使用情况跟踪" href="/concepts/usage-tracking" icon="chart-line">
    OpenClaw 使用情况和状态展示。
  </Card>
</CardGroup>
