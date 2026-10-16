---
summary: "使用托管 Jev 或本地 System One 服务器进行类型化决策"
title: "TypeSafe AI"
read_when:
  - "配置类型化决策模型"
  - "将 TypeSafe 与决策评估工具结合使用"
  - "通过 System One API 在本地运行 Kev"
---

# TypeSafe AI

官方外部 `typesafe` 插件将 OpenClaw 的可选决策模型角色连接到 TypeSafe AI 的托管 Jev 模型或显式配置的 System One 服务器（例如 [Kev](https://github.com/jaredpalmer/kev)）。其模型出现在单独的 **Decision** 选择器中，而不是出现在会话模型选择器中。

OpenClaw `2026.9.5` 发布后添加了适配器和决策模型角色。打包安装需要主机和插件 API 至少为 `2026.9.6`；安装程序在加载插件之前会拒绝旧主机。

有关模型角色、可用后端、标题示例和提供商中立插件 API，请参阅 [Decision models](/concepts/decision-models)。

该插件默认处于禁用状态。安装或启用它不会选择决策模型或安排后台工作。

## <a id="install"></a> 安装

TypeSafe AI 与内核分开打包，以便发布到 npm 和 ClawHub。它的第一个出版物正在等待支持版本。发布后，从 npm 将其安装在兼容主机上：

```sh
openclaw plugins install @openclaw/typesafe
```

要显式选择 ClawHub：

```sh
openclaw plugins install clawhub:@openclaw/typesafe
```

在支持版本可用之前，请使用包含决策提供程序 API 和 `extensions/typesafe` 的源签出。使用 `pnpm install --frozen-lockfile` 和 `pnpm build` 构建它，然后应用以下配置。 Source-checkout插件使用主机同版开发API；这不会使打包的插件与 OpenClaw `2026.9.5` 兼容。

## <a id="enable-and-configure"></a> 启用并配置

对于托管 Jev，在“设置”→“秘密”中创建受保护的凭据，然后从插件配置中引用它。将此示例合并到您现有的配置中；将任何其他条目保留在 `plugins.allow` 中。

```json5
{
  plugins: {
    allow: ["typesafe"],
    entries: {
      typesafe: {
        enabled: true,
        config: {
          apiKey: { source: "store", provider: "default", id: "TYPESAFE_API_KEY" },
        },
      },
    },
  },
  agents: {
    ownership: "explicit",
    defaults: { decisionModel: "typesafe/jev-latest" },
    entries: {
      research: { decisionModel: "typesafe/jev-1.13.0" },
    },
  },
}
```

`typesafe/jev-latest` 显示为 **Jev**；固定的 `typesafe/jev-1.13.0` 显示为 **Jev 1.13.0**。未设置的代理覆盖继承`agents.defaults.decisionModel`；空覆盖会禁用该代理的决策。默认情况下，未设置或空的全局角色会留下决策。

托管模式读取主机为每个请求准备的 SecretRef 值。它不会独立读取环境凭据或缓存以前的凭据。凭证缺失或不可用会导致决策无法进行。更改凭证后使用正常的 [ 秘密刷新流程 ](/gateway/secrets) 。

选择决策模型会授权受支持的、启用其他功能的消费者将其选择的证据发送到配置的端点。托管 Jev 请求会产生 TypeSafe 的正常使用费用。消费者调度和发布权限保持不变。清除角色或显式禁用插件会阻止这些使用者使用它。

## <a id="local-system-one-server"></a> 本地系统一台服务器

### <a id="run-kev"></a> 运行凯夫

[Kev](https://github.com/jaredpalmer/kev) 是 Apache-2.0 决策模型系列，通过持久的 Python 进程为 System One API 提供服务。它支持 Apple 硅和 CUDA。基于 Qwen3 的 Kev-0.6B、Kev-4B 和 Kev-8B 检查点已使用此适配器进行了测试。

对于 Mac，从基于 Qwen3 的 Kev-4B 检查点开始。此示例需要 Python 3.12+ 和 [uv](https://docs.astral.sh/uv/)，并将测试的适配器版本固定在本地目录中。第一个服务器启动还会下载​​其基本模型权重：

```sh
git clone https://github.com/jaredpalmer/kev.git
cd kev
git checkout 5f78968927069eaacc3b2bdb688586989b3933ac
uv sync --frozen --extra serve
uv run python - <<'PY'
from huggingface_hub import snapshot_download

snapshot_download(
    "jaredpalmer/kev-4b",
    revision="c4bfa11b0dc07691884f2d97f1c4c4c05c92e416",
    local_dir="models/kev-4b-qwen3",
)
PY
KEV_DTYPE=bf16 uv run --extra serve python -m kev.serve \
  --run models/kev-4b-qwen3 --port 8009
```

较新的默认 Kev-4B 检查点使用 Qwen3.5；它的Mac性能与上面的Qwen3检查点不同。选择另一个检查点时请遵循上游模型卡。 Kev-0.6B 使用更少的内存； Kev-8B 用更多的内存和延迟来换取决策质量。它们都对您在下面配置的服务器使用相同的 OpenClaw 模型标签。

从第二个终端中的相同 Kev 签出，验证加载的检查点并运行 Kev 的 API 测试：

```sh
curl --fail http://127.0.0.1:8009/v1/models
KEV_BASE_URL=http://127.0.0.1:8009 \
  uv run --extra serve python -m pytest tests/test_api.py -q
```

### <a id="connect-openclaw"></a> 连接 OpenClaw

单独启动 System One 服务器，然后将 `baseUrl` 设置为其环回源并选择 `typesafe/kev-latest`：

```json5
{
  plugins: {
    allow: ["typesafe"],
    entries: {
      typesafe: {
        enabled: true,
        config: { baseUrl: "http://127.0.0.1:8009" },
      },
    },
  },
  agents: {
    defaults: { decisionModel: "typesafe/kev-latest" },
  },
}
```

将示例与现有设置合并，保留其他允许的插件。忽略`apiKey`用于局部推理。该插件不会读取或发送此路径上的托管凭据；删除保留的SecretRef如果主人也应该停止准备的话。

该端点适用于来自该插件的每个请求，包括模型标签名为 Jev 的请求。模型选择不会在托管端点和本地端点之间进行选择。 `kev-latest` 标签需要 `baseUrl`，并且永远不会发送到托管 TypeSafe 端点。

`baseUrl` 在 `localhost`、`127.0.0.1` 或 `[::1]` 上接受 HTTP 或 HTTPS，带有可选端口和尾部斜杠。提供来源，不含 `/v1`、凭证、查询或片段；该插件附加 `/v1/systemone`。此现有插件设置仍然仅环回。对于单独的推理主机或反向代理，请使用下面的标准模型提供程序配置。普通环境 HTTP 代理变量不用于配置的端点；显式启用的托管代理策略仍然适用。 `localhost` 保持固定到环回，独立于系统 DNS。

Kev 对每个服务器进程运行一个检查点。其请求模型标签不加载或切换权重。启动服务器时选择检查点并检查 `GET /v1/models` 进行验证。有关安装、模型选择和硬件要求，请参阅 Kev 的 [ 服务说明](https://github.com/jaredpalmer/kev#quick-start)。 OpenClaw 不会下载权重或启动该过程。不可用的服务器会产生不可用的决策，而不会自动切换到托管 Jev。

为了降低延迟，请在一次调用中针对同一状态批量处理独立问题。尽可能保持重复的证据不变，以便 Kev 可以重用其前缀缓存。测试的Kev服务器序列化推理；更多并发 HTTP 呼叫会增加排队时间。本机决策允许每个提供程序最多四个并发请求，并返回超出该限制的 `overloaded`。核心评估工具使用相同的准入限制。

取消会关闭 OpenClaw 的 HTTP 请求，但 Kev 服务器可能会完成已经正在进行的推理。避免立即重新提交已取消的工作；选择允许在硬件上进行推理和排队的截止日期。

为了本地兼容性，省略的问题指令以 `null` 形式发送。结构化分数评分标准级别被编码为文本；在决策结果中恢复原始级别描述之前，返回的图例必须与传输的标题匹配。 Kev 的可选非负 `latency_ms` 字段经过验证并删除；所有答案类型、标签、概率和评分范围都保留与托管结果相同的验证。

## <a id="custom-endpoint-and-provider-request-settings"></a> 自定义端点和提供商请求设置

使用与其他提供商相同的 `models.providers.<id>` 配置将 TypeSafe 决策连接到自托管 System One 服务器或 HTTPS 反向代理：

```json5
{
  plugins: {
    allow: ["typesafe"],
    entries: { typesafe: { enabled: true } },
  },
  models: {
    providers: {
      typesafe: {
        baseUrl: "https://decision.example.com/v1",
        // Optional: omit when this server does not require authentication.
        apiKey: { source: "store", provider: "default", id: "SYSTEM_ONE_TOKEN" },
        models: [],
      },
    },
  },
  agents: {
    defaults: { decisionModel: "typesafe/kev-latest" },
  },
}
```

将示例与现有配置合并。提供者 `baseUrl` 是 API 根； OpenClaw 附加 `/systemone`。仅原点 URL 意味着 `/v1`，因此 `https://decision.example.com` 和 `https://decision.example.com/v1` 都以 `/v1/systemone` 为目标。请勿包含 URL 凭证、查询或片段。

适配器使用共享提供程序 HTTP 请求和网络策略所有者：

- 默认情况下，普通 LAN 和 tailnet 地址信任 A 配置的 custom/local 源。无需额外的 TypeSafe 网络交换机。
- `models.providers.typesafe.request.allowPrivateNetwork: false` 选择退出确切来源专用网络信任。 `true` 在与其他模型提供商使用的相同政策下明确允许更广泛的私人目标。仅当需要更广泛的访问时才使用它；普通私有 HTTPS 反向代理不需要它。
- `headers`、`authHeader`和`request.auth`使用共享header/auth合约。显式 bearer/header 身份验证会覆盖拒绝空或不可用的凭据，而不是静默发送未经身份验证的请求。 `request.proxy` 和 `request.tls` 使用共享传输合约，包括私有 CA 证书和客户端 TLS 凭证。 TLS certificate/hostname 验证保持启用状态；不安全的验证覆盖会被拒绝。
- 通用提供商合约接受 HTTP（S） API 根。首选 HTTPS 外部环回，以便评估内容和凭证被加密。重定向仍然被拒绝，并且不会为配置的端点隐式启用环境代理。
- `timeoutSeconds` 设置提供者请求预算，仍受本机决策截止日期的限制。它不会延长消费者的截止日期或增加重试次数。

有关共享的确切来源和专用网络规则，请参阅 [ 自定义提供商网络策略](/concepts/model-providers/custom-providers#local-proxies-lm-studio-vllm-litellm-etc)。

**信任和凭证：** 评估状态、问题和评分标准是用户内容。当所选端点位于远程时，它们会离开网关主机。仅配置您信任的包含该内容的服务器。认证向服务器证明OpenClaw的身份；它并不能证明服务器是值得信赖的。请求内容和模型输出不能更改目标。

明确的`models.providers.typesafe`条目拥有完整的路由，并且仅使用其配置的、主机准备的`apiKey`或请求凭据。它从不读取或继承`plugins.entries.typesafe.config.apiKey`，它仍然仅托管，并且不搜索环境或配置文件凭据。不可用的已配置机密将无法关闭，没有未经身份验证或托管的回退。删除未使用的旧版SecretRef也阻止主机准备它。如果没有模型提供程序条目，现有托管和插件环回配置的行为与以前一样。

在`decisionModel`中使用服务器的路由模型ID。所选模型部分不变地传输；如果没有路由具有该名称，则诸如 Llama swap 之类的路由器可能会拒绝 `kev-latest`。 `models: []` 提供普通的自定义提供者配置形状，无需注册会话模型。本机决策角色可以使用不在插件声明的选择器预设中的自定义 ID。此端点支持不会放松 System One 响应验证或保证与每个服务器实现返回的其他响应字段的兼容性。

## <a id="decision-contract"></a> 决策合约

消费者将提供者中立的 [ 决策运行时称为 ](/plugins/sdk-overview/capabilities#decision-models-contract-version-1)。主机提供为拥有代理选择的模型。适配器转换支持的问题类型：

| OpenClaw | TypeSafe | 结果                                                       |
| -------- | -------- | ------------------------------------------------------------ |
| 选择   | 选择   | 报告标签和概率估计                     |
| 分数    | 分数    | 报告的分数零基标题位置和估计 |
| 布尔值  | 努尔     | 正确的概率，保持从 0 到 1                   |

Choice支持2-255种选择；分数支持 2-10 个评分标准级别。不支持的输入在传输前被拒绝；适配器不会截断或分割消费者的标题。回答必须与完整的问题批次、其标签、类型和标题范围相匹配。接受规范之外的其他顶级响应和使用字段，但不会在提供者中立的结果中公开。必填字段和插件的 JSON 大小、深度和节点限制仍然适用。

报告的概率可以四舍五入，因此它们的总和可能不精确为一。报告的标签或分数也可能与这些估计的计算结果不同。 OpenClaw 保留返回值。标准化估计或选择其最大值是一项明确的消费者政策。概率和置信度并不表示准确性保证或行动许可。

主机拥有并发性、电路健康状况、截止日期、取消和提供者生命周期。本机决策的最长时限为 30 秒；更短的消费者或插件超时仍然适用。请求使用固定的 TypeSafe HTTPS 端点，除非提供程序配置或现有环回 `baseUrl` 选择自托管服务器。两个路径都拒绝重定向，并且不会自动重试。消费者决定如何处理无法做出的决定；呼叫者取消不得启动后备工作。

## <a id="agent-evaluation-tool"></a> Agent评估工具

当客服人员具有有效的 `decisionModel` 选择时，Core 会自动提供 `decision_evaluate`。正常 [ 工具策略 ](/tools)，包括明确拒绝，并且活动harness的功能仍然适用。无需 TypeSafe 工具注册或额外的启用设置。请参阅提供商中立的 [tool 合约 ](/concepts/decision-models#agent-evaluation-tool) 了解其请求形式和结果。

该工具接受显式共享 `state` 和独立 `boolean`、`choice` 和 `score` 问题。呼叫代理的可信身份选择其继承的或每代理`decisionModel`；没有每次调用提供者或模型覆盖。通过选择 TypeSafe，适配器将布尔问题转换为 Noul，并仅将提供的证据发送到托管 Jev 或配置的端点。

临时凭证或提供程序失败会返回可操作的不可用结果，并使配置的工具保持可用。清除代理的有效选择会删除正常 tool/context 刷新生命周期的资格。执行时会重新检查选择和当前权限。 `timeoutMs` 默认为 30,000 毫秒，并以此设置和主机的剩余截止时间中较短的一个来限制提供者请求。键入的答案提供证据，而不是发布、发送消息或更改持久状态的权限。

HTTP 400（错误请求）、HTTP 413（内容太大）和 TypeSafe 的 [ 记录的 422 请求验证响应 ](https://docs.typesafe.ai/api#errors) 返回 `unsupported-input`，而不是提供商中断。请求拒绝不会专门建立上下文溢出。适配器会取消错误主体而不读取它们，因为它们可以反映凭据或提交的证据。身份验证 （401/403）、速率限制 （429） 和其他 HTTP/transport 失败保留其现有分类；没有添加自动重试。

## <a id="existing-external-installation"></a> 现有外部安装

官方包保留了原型和早期开发检查使用的 `typesafe` 插件 ID。切换时保留 `plugins.entries.typesafe`、其受保护凭证和代理 `decisionModel` 选择。使用支持的 [ 插件管理流程](/plugins/manage-plugins) 替换旧安装，并从 `plugins.load.paths` 中删除显式原型路径（如果它会覆盖已安装的包）。不要将两个副本配置为独立的提供者。安装该包不会删除原型文件或凭据。
