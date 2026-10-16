---
summary: "`openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - "你想以交互方式微调凭据、设备或代理默认设置"
title: "配置"
---

# `openclaw configure`

针对现有设置进行定向更改的交互式提示：凭据、设备、代理默认值、网关、频道、插件、技能以及健康检查。

使用 `openclaw onboard` 或 `openclaw setup` 进行完整引导的首次运行旅程，使用 `openclaw setup --baseline` 仅用于基线 config/workspace，当您只需要设置渠道帐户时使用 `openclaw channels add`。

<Tip>
不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。
</Tip>

## <a id="options"></a> 选项

在 `openclaw configure` 更改本地凭据或配置之前，OpenClaw 会将选定的 CLI state/config 路径与本地网关或其安装的服务进行比较。已证实的不匹配在写入之前停止。无法验证的远程网关或经过身份验证的路径会生成警告。

当 `OPENCLAW_HOME` 重新定位 CLI 的默认状态目录时，此比较也适用。已安装服务的记录环境决定其路径，包括网关停止时的路径。 CLI 的路径覆盖不会取代它们。如果无法验证服务定义或其记录的路径，OpenClaw 会发出警告并保持配置可用。在依赖本地更改来访问服务之前，请使用 `openclaw gateway status --deep` 检查服务。

`--section <section>`：可重复的分区过滤器。可用分区：

`workspace`, `model`, `memory`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section memory
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

选择 `gateway`、`daemon` 或 `health`（或在没有 `--section` 的情况下运行完整向导）会提示网关在何处运行并更新 `gateway.mode`。跳过所有三个的部分过滤器直接进入请求的设置，没有网关模式提示。选择远程网关模式会写入远程配置并立即退出。它不会运行插件安装等仅限本地的步骤。

网关、守护程序、运行状况和 Web 设置不需要代理所有者。工作空间、模型、内存、插件、技能和通道设置使用显式队列中配置的系统代理。如果未配置任何代理，向导将询问要使用哪个现有代理。该选择适用于其余代理范围的部分，而不更改系统代理设置。通道设置使用选定的工作空间进行插件发现。删除通道配置不需要选择代理。

<Note>
`openclaw configure` 需要交互式终端（stdin 和 stdout 都必须是 TTY）。如果没有，它会打印等效的非交互式 `openclaw config get|set|patch|validate` 命令并以错误退出而不是部分运行。
</Note>

## <a id="gateway-section"></a> 网关部分

首次运行的 `openclaw onboard` 和 `openclaw setup` 在令牌模式下生成网关机密，无需 token/password 选择器。他们保留现有的密码模式。使用其 `--gateway-auth password` 或 `--gateway-password <value>` 标志明确选择密码。 Tailscale 漏斗仍然需要密码模式。本地 `configure` 网关部分保留其身份验证模式选择器以进行有针对性的重新配置。该模式选择配置的秘密。客户可以以 `auth.token` 或 `auth.password` 形式发送。

远程配置要求一个 **Gateway Secret** 并将其存储为 `gateway.remote.token`，无论远程网关将其称为令牌还是密码。

对于 **Trusted Proxy** 身份验证，请输入逗号分隔的 IPv4 或 IPv6 地址或 CIDR 范围，例如 `10.0.0.1, ::1, 10.0.0.0/24`。向导在保存之前会拒绝格式错误的地址和空条目。它忽略周围的空白。

对于 **Trusted Proxy** 身份验证，与环回源匹配的地址或 CIDR 将显示安全警告。然后，向导会在设置 `gateway.auth.trustedProxy.allowLoopback` 之前请求明确同意。拒绝会使其保持未设置状态，并警告环回代理请求将在运行时被拒绝。有关信任要求，请参阅 [Trusted proxy auth](/gateway/trusted-proxy-auth#configure-with-the-wizard)。

重新配置可信代理模式会将环回提示默认为现有选择加入，并保留 `deviceAutoApprove` 不变。明确拒绝会撤销环回同意。如果没有匹配的环回源，则保留现有设置。

## <a id="model-section"></a> 模型部分

<Note>
**Model** 包括对显式 `agents.defaults.modelPolicy.allow` 列表（显示在 `/model` 和模型选择器中的内容）的多重选择。提供者范围内的设置选项将其选择的模型合并到现有列表中，而不是替换配置中已有的不相关提供者。每个模型的别名和参数保留在 `agents.defaults.models` 下。这些条目本身并不限制模型覆盖。

从 configure 中重新运行提供商认证时，即使该提供商的认证步骤返回了带有其推荐默认模型的 config patch，也会保留现有的 `agents.defaults.model.primary`。添加或重新认证某个提供商会使其模型可用，但不会接管你当前的主模型。可使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>` 来有意更改默认模型。
</Note>

当 configure 从某个提供商认证选项启动时，默认模型和模型策略选择器会自动优先显示该提供商。对于 Volcengine 和 BytePlus 这类配对提供商，同样的优先级也会匹配它们的编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果首选提供商过滤后会得到空列表，configure 会回退到未过滤的目录，而不是显示空白选择器。

## <a id="memory-section"></a> 内存部分

`openclaw configure --section memory` 提供可选的语义记忆搜索设置。选择可用的嵌入提供程序及其默认或显式模型，然后使用现有凭据，输入屏蔽的 API 密钥，或选择 SecretRef。对于本地服务器，选择 **lmstudio** 或 **ollama**（包括配置的提供程序别名）。启动服务器并首先下载嵌入模型。 Ollama支持`bge-m3`、`nomic-embed-text`等模型； LM Studio 默认为 `text-embedding-nomic-embed-text-v1.5`。当服务器不需要身份验证时，选择 **使用现有凭据/无密钥**。该检查允许有时间加载已下载的模型。托管 llama.cpp 设置仍然可以通过 [llama.cpp 提供程序设置 ](/plugins/llama-cpp) 进行使用。存储的 OAuth 凭据并不能保证嵌入访问：所选帐户和模型必须在保存之前传递一个小型合成嵌入请求。仅 Shell 环境变量可能不可用于网关服务。

跳过、检查失败或拒绝保存都会导致内存部分未保存。该流程不会下载本地模型、创建索引或重新索引内存。现有的每个代理覆盖保持不变。提供程序更改会删除旧的内存端点、标头和密钥，以便它们无法发送到新的目标。嵌入身份更改可能需要随后显式重建索引；参见[内存配置](/reference/memory-config)。

## <a id="web-section"></a> Web 部分

`openclaw configure --section web` 会选择一个网页搜索提供商并配置其凭据。某些提供商会显示特定于提供商的后续设置：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 xAI OAuth 配置文件或 API 密钥，并允许你选择一个 `x_search` 模型。
- **Kimi** 可以请求 Moonshot API 区域（`api.moonshot.ai` 与 `api.moonshot.cn`）和默认的 Kimi Web 搜索模型。

## <a id="other-notes"></a> 其他说明

- Gateway 重新配置保留现有的 `gateway.auth.allowTailscale`、`gateway.auth.rateLimit` 和 `gateway.auth.identityScopes` 策略。所选的身份验证模式将替换其凭据或可信代理设置，并删除属于其他身份验证模式的字段。
- 在本地配置写入后，当所选设置路径需要时，会配置安装所选的可下载插件。远程网关配置不会安装本地插件包。
- 面向通道的服务 （Slack/Discord/Matrix/Microsoft Teams） 在设置过程中提示 channel/room 允许列表。您可以输入姓名或 ID。如果可能，向导会将名称解析为 ID。
- 选择 **重新安装** 将保留现有网关服务，同时您选择其运行时并配置验证身份验证并准备替换。如果在准备过程中取消或失败，则会保留已安装的现有服务。
- 成功设置守护程序后，最终网关状态在报告可达性之前使用与登录相同的特定于平台的启动宽限期。服务安装和网关可达性是不同的结果。如果仍然检测不到网关，请运行`openclaw health`再次检查。
- 如果运行守护程序安装步骤，则令牌身份验证需要令牌。如果 `gateway.auth.token` 是 SecretRef 管理的，configure 会验证 SecretRef。它不会将解析的明文令牌值保留到主管服务环境元数据中。如果 SecretRef 未解决，请配置阻止守护程序安装并提供可操作的修复指南。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，configure 会阻止守护进程安装，直到你显式设置该模式。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
- 配置 CLI: [配置](/cli/config)
