---
summary: "通过 ClawRouter 路由凭证作用域模型，并展示托管配额"
title: "ClawRouter"
read_when:
  - "你希望为多个模型提供方使用一个托管密钥"
  - "你需要在 OpenClaw 中进行 ClawRouter 模型发现或配额报告"
---

ClawRouter 为 OpenClaw 提供一个面向多家上游模型提供方的策略作用域密钥。随附的 `clawrouter` 插件只会发现该密钥允许使用的模型，将每个模型通过其声明的协议进行路由，并在 OpenClaw 的使用界面上报告该密钥的预算和汇总使用情况。

上游凭证和特定于提供商的转发保留在 ClawRouter 中，因此您无需在 OpenClaw 主机上安装或验证每个上游提供商插件。该插件与 OpenClaw （`enabledByDefault: true`） 捆绑在一起；您只需要一个已颁发的 ClawRouter 密钥。

| 属性      | 值                                    |
| ------------- | ---------------------------------------- |
| 提供者      | `clawrouter`                             |
| 插件        | 捆绑（包含在 OpenClaw 中）           |
| 认证          | `CLAWROUTER_API_KEY`                     |
| 默认 URL   | `https://clawrouter.openclaw.ai`         |
| 模型目录 | 通过 `/v1/catalog` 进行凭证作用域控制      |
| 配额        | 通过 `/v1/usage` 提供每月预算和使用情况 |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-a-scoped-credential" title="获取范围凭证">
    向您的 ClawRouter 管理员索取 ClawRouter 密钥，其策略包括您应使用的提供商、模型和每月预算。 ClawRouter 密钥在发布时会显示一次。
  </Step>
  <Step id="configure-openclaw" title="配置OpenClaw">
    ```bash
    export CLAWROUTER_API_KEY="..."
    openclaw onboard --auth-choice clawrouter-api-key
    openclaw plugins enable clawrouter
    ```

    `clawrouter` 已随附并默认启用。如果你的配置设置了 `plugins.allow`，在启用之前请将 `clawrouter` 添加到该列表中。对于自定义部署，请将 `models.providers.clawrouter.baseUrl` 设置为 ClawRouter 的源地址；默认值为 `https://clawrouter.openclaw.ai`。

  </Step>
  <Step id="list-granted-models" title="列出授权模型">
    ```bash
    openclaw models list --all --provider clawrouter
    ```

    完全按照所示使用返回的模型引用。它们保留上游命名空间，例如 `clawrouter/openai/gpt-5.5`、`clawrouter/anthropic/claude-sonnet-4-6` 或 `clawrouter/google/gemini-3.5-flash`。如果配置了 `agents.defaults.modelPolicy.allow`，请将每个选定的 ClawRouter 引用添加到其中。

  </Step>
  <Step id="select-a-model" title="选择模型">
    ```bash
    openclaw models set clawrouter/<provider>/<model>
    ```

    你也可以在单次运行中通过 `openclaw agent --model clawrouter/<provider>/<model> --message "..."` 选择一个返回的模型。

  </Step>
</Steps>

## <a id="managed-non-interactive-deployment"></a> 托管的非交互式部署

将 ClawRouter 密钥保留在工作负载的秘密注入中，并在 `openclaw.json` 中仅存储 SecretRef。管理的字段有：

| 用途       | 配置或环境字段                                              |
| ------------- | ------------------------------------------------------------------------ |
| 路由器源 | `models.providers.clawrouter.baseUrl`                                    |
| 凭据    | `models.providers.clawrouter.apiKey` -> 环境 SecretRef                    |
| 密钥值  | 网关进程环境中的 `CLAWROUTER_API_KEY`                  |
| 默认模型 | `agents.defaults.model.primary` -> `clawrouter/<provider>/<model>`       |
| 工作负载标签  | `models.providers.clawrouter.headers.X-ClawRouter-Project-Id`（可选） |

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

试运行可以解析 SecretRef，但不会打印其值。要轮换 ClawRouter 密钥，请更新提供 `CLAWROUTER_API_KEY` 的外部 Secret 并重新启动网关工作负载，以便加载新的进程环境。配置文件和模型参考不会更改。

对于源构建的独立 Docker 网关，ClawRouter 已包含在根运行时中。仅选择需要单独打包的通道插件，例如`OPENCLAW_EXTENSIONS=clickclack`、`slack`或`msteams`；请参阅 [ 使用选定插件 ](/install/docker#source-built-images-with-selected-plugins) 构建的源镜像。 Archive/appliance 部署必须通过自己的工件管道打包相同的落地源，而不是使用 OCI 映像。

## <a id="readiness-and-live-proof"></a> 就绪性和真实验证

这些检查证明的是不同的边界；不要互相替代：

```bash
# ClawRouter process health only; no credential or upstream model is exercised.
curl -fsS https://clawrouter.internal.example/v1/health

# OpenClaw gateway startup readiness only; no model call is made.
curl -fsS http://127.0.0.1:18789/readyz

# Credential-scoped catalog discovery.
openclaw models list --all --provider clawrouter --json

# Minimal real inference test through the configured ClawRouter provider.
openclaw models status --probe --probe-provider clawrouter --probe-max-tokens 8 --json

# Workload canary using an exact granted model ref.
openclaw agent --agent main \
  --model clawrouter/openai/gpt-5.5 \
  --message "Reply exactly: CLAWROUTER_CANARY_OK" \
  --json
```

使用范围目录返回的模型，而不是盲目复制示例模型。成功的 `/readyz` 响应意味着网关可以处理请求；它没有声明 ClawRouter、ClawRouter 密钥或上游提供商已准备就绪。模型检查和代理金丝雀是推理证明。

对于实时诊断，在网关进程中启用 `OPENCLAW_DEBUG_MODEL_TRANSPORT=1`，发出金丝雀并检查网关日志。仅元数据模型传输诊断发出的线形状如下：

```text
[model-fetch] start provider=clawrouter api=openai-responses model=openai/gpt-5.5 method=POST url=https://clawrouter.internal.example/v1/responses
[model-fetch] response provider=clawrouter api=openai-responses model=openai/gpt-5.5 status=200
```

没有针对性的调试标志，启动和快速成功响应记录使用`debug`；非 2xx 响应和在 `info` 停留至少一秒的响应。请参阅 [ 模型传输诊断](/logging#targeted-model-transport-diagnostics)。

当这些标识符可用时，插件会发送有界的 `X-ClawRouter-Client`、`X-ClawRouter-Agent-Id` 和 `X-ClawRouter-Session-Id` 标头。它还将模型调用的诊断 `callId` （`<run-id>:model:<n>`） 映射到 `X-Request-ID`，因此 OpenClaw 模型调用事件可以加入到 ClawRouter 的纯元数据审计跟踪中。 128 个字符的请求 ID 预算内的值是相同的。较长的值保留 `:model:<n>` 后缀和稳定的哈希值，因此不同的调用保持有界和可连接。可以在提供程序 `headers` 映射中设置静态部署元数据（例如 `X-ClawRouter-Project-Id`）。代理和会话归因标头保留其单独的 256 个字符限制。包含 ClawRouter 的 ASCII 标识符集之外的字符的自动请求 ID 使用相同的大小限制哈希格式。显式配置的标头（包括 `X-Request-ID` 的任何大小写变体）胜过自动值。传输诊断记录路由和响应元数据；它不记录凭据、请求 ID、提示或完成情况。 ClawRouter 自己的审核事件提供所选的上游提供商和内容保留状态。

## <a id="model-discovery"></a> 模型发现

`GET /v1/catalog` 返回 `{ providers: [...] }`，其中每个 provider 条目都列出它自己的 `models[]`（包含上游 id、能力和定价），以及它支持的请求路由。OpenClaw 不提供第二份固定的 ClawRouter 模型列表。当满足以下条件时，catalog 中的某个模型会被声明为 OpenClaw 模型：

- ClawRouter 密钥的策略授予其提供者；
- 该 catalog 模型声明了受支持的 LLM 能力（`llm.responses`、`llm.chat`、`llm.messages`，或带有匹配流式路由的 `llm.stream`）；并且
- 该 provider 为下面某一种传输方式暴露了匹配的路由。

将模型添加到受支持的 ClawRouter 提供程序不需要 OpenClaw 版本。成功的目录响应（包括空的授予模型列表）将在每个端点和已解析的凭据中重复使用一小时。普通模型列表读取服务于保留库存，而过期数据则在后台刷新。在模型中使用**Refresh**立即发现变化；显式刷新绕过响应缓存。需要新有线协议的模型首先需要插件支持。缓存库存不是授权：ClawRouter 在分派模型请求时检查当前拨款和预算。

模型的可选`displayName`是其选择器标签；如果没有它，OpenClaw 将使用提供商显示名称和目录 `id`，并省略标签中重复的 `<provider>/` 前缀（例如，`Anthropic · claude-sonnet-4-6`）。标签永远不会改变模型标识。响应和聊天完成发送目录 `id` 不变；仅本机 Anthropic 和 Gemini 路由在调度时使用 `upstream`。公开别名的外观必须仅返回安全目录元数据，包括所需 `upstream` 字段中的别名，并将其私有目标映射保留在外观内。

## <a id="protocol-and-provider-plugins"></a> 协议和提供方插件

ClawRouter 拥有上游凭据；其目录会告知 OpenClaw 应使用哪种传输方式，因此你无需安装每一家上游公司的认证插件。

| 目录能力 / 路由                               | OpenClaw 传输方式     |
| -------------------------------------------------------- | ---------------------- |
| `llm.responses`（OpenAI- 兼容提供商）             | `openai-responses`     |
| `llm.chat`（OpenAI- 兼容提供商）                  | `openai-completions`   |
| `llm.messages` + `anthropic.messages` 路由              | `anthropic-messages`   |
| `llm.stream` + 流式 `google.generate_content` 路由 | `google-generative-ai` |

该插件还为这些系列应用匹配的重播和工具架构策略（OpenAI/DeepSeek/Gemini/Perplexity 工具架构兼容性；本机 Anthropic 和 Google Gemini 重播策略）。 Perplexity 模型进行了严格的架构重写：`patternProperties` 和 `additionalProperties` 被删除，每个对象架构都声明 `properties`，因为 Perplexity 拒绝没有它们的工具架构。仅公开不受支持的请求格式的目录提供程序故意不作为 OpenClaw 文本模型进行广告。将这些提供者标准化为 ClawRouter 中受支持的合约之一，而不是发送不兼容的有效负载。

## <a id="quotas-and-usage"></a> 配额与用量

ClawRouter 的 `/v1/usage` 响应会填充标准 OpenClaw 提供方用量展示：请求、令牌和花费总计，以及在密钥有上限时的月度预算窗口。 无限额密钥仍会显示汇总用量，但不会显示百分比窗口。

配额查找使用与模型发现相同的 ClawRouter 密钥。失败的配额查找不会阻止模型执行。

使用以下命令检查实时快照：

```bash
openclaw status --usage
openclaw models status
```

同样的提供方快照也可用于聊天中的 `/status` 和 OpenClaw 的用量 UI。预算是全局策略级别的，因此其他客户端使用相同 ClawRouter 策略发出的请求可能会改变剩余百分比。

## <a id="pool-dashboard"></a> 矿池仪表板

在 Control UI 侧栏中打开 **ClawRouter** 以检查配置的密钥后面的订阅池。配置 `models.providers.clawrouter` 时，捆绑的插件会在网关启动时加载，并遵守正常的插件允许列表和启用设置。如果该条目尚不可用，则应用配置并重新启动网关。捆绑副本不需要自定义插件 UI 实验室设置。

只读页面显示策略允许的模型、每个模型的预留空间、帐户和计划详细信息、凭证状态、配额窗口（包括特定于模型的窗口）、重置时间、额外使用支出和限制以及请求、令牌和 API- 等效使用情况。 API-equivalent值描述了计量模型的使用情况；它不一定是订阅的实际账单。付费后备摘要汇总了 API-key 和环境使用通道；这些总数可以包括直接付费路由以及后备请求。选择 **Refresh** 请求新快照；该页面不轮询。缺失的上游测量结果显示为 **Not reporting**。

该页面调用插件拥有的`clawrouter.pool.get`网关方法，该方法需要`operator.read`。网关使用模型请求使用的相同凭据从配置的 ClawRouter 源请求 `/v1/pool`，因此该页面显示代理路由通过的策略池。密钥保留在网关上，并且永远不会包含在页面响应中。

池可见性是在 ClawRouter 策略上选择加入的。如果它是隐藏的，请要求您的 ClawRouter 管理员启用该策略的池状态。没有 `/v1/pool` 的旧部署报告需要更新；被拒绝的密钥和临时连接失败具有单独的下一步消息。这些状态不会阻止模型调用或现有的 `/v1/usage` 快照。

## <a id="troubleshooting"></a> 故障排查

| 症状                                  | 检查                                                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 无 ClawRouter 模型                     | 确认该插件已启用并被 `plugins.allow` 允许，然后检查 ClawRouter 密钥是否处于活动状态并授予至少一个现成的提供程序。 |
| 缺少已配置的 ClawRouter 模型 | 检查其`/v1/catalog`能力和路由支持。不支持的运输合同被有意过滤。                                |
| 模型覆盖被策略拒绝        | 将确切的目录编号或 `clawrouter/*` 添加到 `agents.defaults.modelPolicy.allow`。                                                                |
| 目录或用途中的 `401` 或 `403`     | 重新颁发或重新调整 ClawRouter 密钥的范围； OpenClaw 不会回退到上游提供商密钥。                                                     |
| 发现后模型调用失败         | 检查 ClawRouter 中的提供程序连接和上游运行状况，然后在其就绪状态恢复后重试。                                    |
| 使用情况有总计但没有百分比       | 该政策是不计量的；添加 ClawRouter 中的每月预算以显示百分比窗口。                                                         |

## <a id="security-behavior"></a> 安全行为

- Catalog 发现的范围仅限于配置的 ClawRouter 密钥。 HTTP 响应由端点缓存并解析凭证；更改任何一个都不会重复使用之前的响应。准备好的清单和动态模型查找保留自己的代理、工作区和身份验证范围。
- ClawRouter 密钥仅在请求发送时附加；它不存储在模型元数据中。
- 自动归因和请求关联值在分发前会被裁剪并拒绝控制字符。归因值上限为 256 个字符；请求 id 上限为 128 个字符。
- Model 传输诊断仅包含元数据，从不包含 ClawRouter 密钥或模型内容。
- 原生 Anthropic 和 Gemini 模型 id 仅在分发时重写为其上游 id。
- 不支持或未授权的目录行不可选择。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供商配置和模型选择。
  </Card>
  <Card title="使用情况跟踪" href="/concepts/usage-tracking" icon="chart-line">
    OpenClaw 使用情况和状态展示。
  </Card>
</CardGroup>
