---
doc-schema-version: 1
summary: "Gateway 所有的会话如何在 Control UI、终端、CLI、移动客户端和编码 harness 中继续使用"
read_when:
  - "想要在终端中继续使用 Control UI 会话时"
  - "想要将编码 harness 连接到现有会话时"
  - "排查会话链接、远程配对或连接失败问题时"
title: "会话同步与连接"
---

OpenClaw 将共享会话状态保存在 Gateway 中。Control UI、移动客户端、 ACP、`openclaw tui <target>` 和 `openclaw attach <target>` 使用的是 Gateway 所有的状态，而不是各自保存独立的会话副本。这样一来，你可以在多个客户端中打开同一个会话，而无需导出或复制其记录。

当你想在终端中继续对话时，请使用 `openclaw tui`。 当你想在会话旁边使用编码 harness，并授予临时的、限定于会话范围的 MCP 权限时，请使用 `openclaw attach`。

嵌入式本地模式是独立的：`openclaw tui --local`、`openclaw chat` 和 `openclaw terminal` 使用本地代理运行时，不能接受会话目标。有关本地模式的行为， 请参阅 [TUI CLI 参考](/cli/tui#notes)。

## <a id="one-gateway%2C-many-clients"></a><a id="one-gateway-many-clients"></a> 一个 Gateway，多个客户端

Gateway 拥有会话记录、转录历史、路由元数据和活动中的运行。客户端选择一个会话键，并通过 Gateway 协议读取或更新相同的状态。移动节点仍然是连接到 Gateway 的外围设备； 它不会成为第二个会话所有者。

大多数代理会话键采用以下形式：

```text
agent:<agentId>:<rest>
```

`<rest>` 部分可以是一个简单的名称、几个以冒号分隔的路由段或以 UUID 结尾的值。配置有全局会话范围的网关使用主 `global` 会话。当针对全局范围网关打开仅代理 URL 时，CLI 会向网关询问其会话范围，并将 URL 解析为该主全局会话。

请参阅[会话管理](/concepts/session)，了解路由、隔离、生命周期和存储详情。

## <a id="session-urls-and-short-links"></a> Session URL 和短链接

Control UI 聊天和仪表盘链接共享以下路由语法：

```text
/{chat|dashboard}/<agentId>
/{chat|dashboard}/<agentId>/<slug>-<shortId>
/{chat|dashboard}/<agentId>/<literal-rest-segments...>
```

配置的 Control UI 基础路径会为这些路由添加前缀。仅包含 agent 的形式会打开该 agent 的主投影。字面量形式会将 `agent:<agentId>:` 之后以冒号分隔的会话密钥编码为路径片段。

对于其余部分以 UUID 结尾的密钥，可共享的短形式使用该 UUID 开头的 8 到 32 个小写十六进制字符，并移除 UUID 中的短横线。短 ID 是权威信息。除非两个会话共享相同的前缀，否则显示名称 slug 仅用于展示；如果共享相同前缀，则其中一个完全匹配的 slug 可用于消除歧义。对于 CLI 短链接目标，agent 片段同样仅用于展示：Gateway 会解析短 ID，而不会将其限制为该 URL 中的 agent。

网关方法 `sessions.resolve` 拥有精确密钥、原始会话 ID、标签和短 ID 的解析。发现选择器根据调用客户端的会话可见性进行过滤。 Short-ID 歧义结果最多包含十个最近的候选者，因此客户可以要求您提供更长的前缀而无需猜测。密钥、完整会话 ID 和标签解析仅读取匹配的会话元数据，无需等待不相关的会话刷新。有关完整的文字编码和稳定性合约，请参阅 [Control UI URLs](/web/urls)。

### <a id="gateway-version-requirement"></a> 网关版本要求

网关解析会话存储所有者处的短引用，并且 Control UI 和 CLI 使用返回的规范化密钥和拥有代理，包括通过过时的 URL 到达的全局会话。短链接需要当前网关。如果较旧的或自定义网关拒绝 `shortId` 选择器，请升级它或使用完整的会话密钥。

## <a id="choose-how-to-continue"></a> 选择如何继续

CLI 接受三种目标语法：

- 完整的 Control UI URL，例如 `https://claw.example.com/dashboard/main/deploy-monitor-6db92d48`。
- Gateway 简写，例如 `claw.example.com/main/deploy-monitor-6db92d48`。
- 简短引用或完整键，例如 `deploy-monitor-6db92d48` 或 `agent:main:telegram:12345`。裸引用使用已配置的或默认的 Gateway。

会话 URL 不得包含凭据。首次与网关源配对时，分别传递 `--token` 或 `--password`。

### <a id="continue-in-the-terminal"></a> 在终端中继续

从 Control UI 中，打开会话标题菜单并选择 **在终端中继续…**。该对话框复制一条无凭据的 `openclaw resume` 命令，其中包含一个不透明的版本化切换参数。该参数仅对确切的代理限定会话密钥和选定的网关 WebSocket URL 进行编码。密钥限制为 512 个用户感知的字符。其 URL-safe 字母表不需要 shell 引用，因此该命令可以安全地粘贴到常见的 POSIX shell、PowerShell 和 `cmd.exe` 中。在已为该网关配置的 OpenClaw CLI 配置文件中运行它；终端独立认证。网关在 TUI 连接之前标准化密钥，并且丢失的会话会生成恢复指导，而不是创建另一个会话。会话 ACL 仍然适用。

查询路由的网关 URL 无法生成此无凭据命令，因为网关身份验证和存储的设备范围不支持查询。 Control UI 不会剥离或复制查询。使用具有显式 `--token` 或 `--password` 的手动身份验证 CLI 目标，或配置无查询网关 URL。

您也可以直接选择或查询最近的会话：

```bash
openclaw resume
openclaw resume agent:main:deploy-monitor
```

对于来自 URL 或短引用的网关支持的延续，请将目标传递给 `openclaw tui`：

```bash
openclaw tui https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
openclaw tui deploy-monitor-6db92d48
```

你也可以直接在 CLI 根目录粘贴完整的会话 URL：

```bash
openclaw https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
```

这将在网关返回的规范化会话密钥上打开 TUI。它不会克隆转录本或创建新会话。有关目标冲突、支持的裸 URL 选项和示例，请参阅 [TUI](/cli/tui)。

### <a id="attach-a-coding-harness"></a> 附加 coding harness

将相同的 URL 或引用传递给 `openclaw attach`：

```bash
openclaw attach https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
openclaw attach deploy-monitor-6db92d48
```

Gateway 会先解析会话，然后生成限定于该会话的临时授权，并使用严格的 MCP 配置启动 coding harness。Bearer token 会通过子进程环境传递，而不是通过 argv 传递。正常启动时，harness 退出后会撤销授权；`--print-config` 会使授权保持有效，直到其 TTL 过期。有关授权有效期和启动选项，请参阅 [Attach CLI](/cli/attach)。

## <a id="pair-once-per-gateway-origin"></a> 每个 Gateway origin 仅配对一次

A URL或网关速记权威地选择一个规范化的网关源。OpenClaw永远不会为该目标重用配置的凭据或来自另一个源的存储的设备令牌。复制的无凭据命令**在终端继续...**有一个更窄的规则：`openclaw resume`可以重用当前的CLI仅当其明确时才配置文件WebSocket URL逐字节匹配该配置文件的模式：本地和公共源目标仅在本地模式下有效，而仅`gateway.remote.url`适合远程模式。它从不搜索其他配置文件，任何主机、端口或路径不匹配都会返回到正常的显式凭据要求。精确的直接本地目标可以重用本地侦听器的证书指纹，并且精确配置的远程目标可以重用配置的远程 pin。公共源目标不会继承本地侦听器的 pin；经过`--tls-fingerprint`明确该代理源是否需要一个。有效负载不包含凭据；明确的`--token`， `--password`， or `--tls-fingerprint`切换旁边提供的值仍然优先。切换分辨率抑制环境`OPENCLAW_GATEWAY_TOKEN`和`OPENCLAW_GATEWAY_PASSWORD`回退，同时保持这些显式值和精确目标配置的凭据合格。

首次连接时：

1. 使用 `--token` 或 `--password` 运行 TUI 或 attach 命令一次。
2. 在该 Gateway 的 Control UI 中打开 **Settings > Devices**，并批准待处理的请求。在 Gateway 主机上，你也可以改为使用 `openclaw devices approve --latest` 预览最新请求，核对后运行输出的 `openclaw devices approve <requestId>` 命令。
3. 重试原始命令。OpenClaw 会将签发的操作员设备令牌存储在 SQLite 中，并与该完全规范化的 Gateway origin 绑定。
4. 之后连接到同一 origin 时，可以使用已存储的设备令牌。显式提供的 `--token` 或 `--password` 始终对整个连接生效。

Control UI 继续命令不会执行这些首次联系步骤或携带其凭据。使用前请独立配置或配对终端。如果 CLI 拒绝无效或被截断的切换，请从 Control UI 复制新命令，而不是编辑不透明参数。如果复制命令后会话被删除，请返回到 Control UI 并从可用会话中复制命令。

当该客户端不应再连接时，从同一网关的 **Devices** 页面撤销或删除该设备。令牌不跨源。通过 SSH 隧道进行只读检查也会抑制存储的设备身份验证，因为环回传输无法识别远程源；显式凭证仍然有效。

有关批准、轮换、撤销和网络指导，请参阅 [Devices](/cli/devices)、[Remote access](/gateway/remote) 和 [Gateway security](/gateway/security)。

## <a id="failure-taxonomy"></a> 故障分类

Gateway 连接故障使用一个结构化优先的分类器。较旧的 Gateway 仍可通过有界文本回退机制正常工作，因此 health、status 和 TUI 会提供相同的类别和恢复指导。

| 故障或类型                    | 含义                                                                            | 操作                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 旧网关短链接拒绝 | 网关不接受 `sessions.resolve` 中的 `shortId`。                             | 从该网关的 Control UI 复制完整会话密钥，或升级网关。                                                                               |
| 会话缺失                    | 所选 Gateway 找不到该密钥或短 ID。                                   | 对于已配置的 Gateway，运行 `openclaw sessions list`。对于 URL 目标，在该 Gateway 的 Control UI 中选择会话。                                    |
| 会话引用不明确        | 多个可见会话共享此前缀，且 slug 未能选中其中一个。         | 使用 CLI 显示的更长 ID 前缀之一，或复制完整密钥。                                                                                       |
| `pairing-required`                 | 设备是新设备，或现有设备需要角色、范围或元数据审批。       | 在 **Settings > Devices** 中批准待处理请求，或使用 `openclaw devices approve --latest` 预览请求，并运行输出的确切 ID 命令，然后重试。 |
| `device-identity-required`         | Gateway 要求此连接提供已签名的设备身份。                       | 使用当前的 OpenClaw 客户端，让它创建设备身份，并完成配对。                                                                         |
| `scope-mismatch`                   | 已存储的设备令牌有效，但缺少所请求的操作员范围。                 | 查看 `openclaw devices list`，批准待处理的范围升级，然后重新连接。                                                                               |
| `auth-rejected`                    | 显式共享凭据错误，或配对设备令牌已被撤销或轮换。 | 验证显式 Gateway 身份验证。对于过期的设备令牌，使用 `openclaw devices rotate --device <deviceId> --role operator` 轮换令牌，或重新配对。             |
| `rate-limited`                     | 过多的身份验证失败导致临时锁定。                      | 等待锁定期结束，然后重试。不要仅仅因为 Gateway 受到速率限制就轮换凭据。                                               |
| `gateway-rejected`                 | Gateway 返回了其他结构化拒绝，例如协议不匹配。          | 遵循错误详细信息。对于版本偏差，在重试前更新较旧的客户端或 Gateway。                                                                 |
| `unreachable`                      | 无法访问所选源。                                                   | 检查 Gateway 进程和路由。对于 `*.ts.net` 主机，连接 Tailscale 并确认 tailnet 可达；对于 SSH，确认隧道正在运行。         |
| TLS 指纹不匹配           | 出示的证书与已配置或显式固定的指纹不匹配。                 | 验证证书和预期指纹。只有在确认 Gateway 身份后，才能更改固定值。                                                     |

## <a id="related-pages"></a> 相关页面

- [会话管理](/concepts/session)
- [控制 UI URL](/web/urls)
- [TUI](/cli/tui)
- [附加CLI](/cli/attach)
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [网关安全](/gateway/security)
