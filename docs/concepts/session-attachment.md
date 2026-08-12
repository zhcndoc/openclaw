---
doc-schema-version: 1
summary: "Gateway 所有的会话如何在 Control UI、终端、CLI、移动客户端和编码 harness 中继续使用"
read_when:
  - 想要在终端中继续使用 Control UI 会话时
  - 想要将编码 harness 连接到现有会话时
  - 排查会话链接、远程配对或连接失败问题时
title: "会话同步与连接"
---

OpenClaw 将共享会话状态保存在 Gateway 中。Control UI、移动客户端、
ACP、`openclaw tui <target>` 和 `openclaw attach <target>` 使用的是
Gateway 所有的状态，而不是各自保存独立的会话副本。这样一来，你可以在多个
客户端中打开同一个会话，而无需导出或复制其记录。

当你想在终端中继续对话时，请使用 `openclaw tui`。
当你想在会话旁边使用编码 harness，并授予临时的、限定于会话范围的 MCP
权限时，请使用 `openclaw attach`。

嵌入式本地模式是独立的：`openclaw tui --local`、`openclaw chat` 和
`openclaw terminal` 使用本地代理运行时，不能接受会话目标。有关本地模式的行为，
请参阅 [TUI CLI 参考](/cli/tui#notes)。

## 一个 Gateway，多个客户端

Gateway 拥有会话记录、转录历史、路由元数据和活动中的运行。客户端选择一个会话键，并通过
Gateway 协议读取或更新相同的状态。移动节点仍然是连接到 Gateway 的外围设备；
它不会成为第二个会话所有者。

大多数代理会话键采用以下形式：

```text
agent:<agentId>:<rest>
```

`<rest>` 部分可以是一个简单名称、多个以冒号分隔的路由片段，或以 UUID 结尾的值。配置了全局会话范围的 Gateway
则使用规范的 `global` 会话。当针对全局范围的 Gateway 打开仅代理 URL 时，CLI 会向 Gateway 请求其会话范围，并将该 URL 解析为规范的全局会话。

请参阅[会话管理](/concepts/session)，了解路由、隔离、生命周期和存储详情。

## 会话 URL 和短链接

Control UI 聊天和仪表盘链接共享以下路由语法：

```text
/{chat|dashboard}/<agentId>
/{chat|dashboard}/<agentId>/<slug>-<shortId>
/{chat|dashboard}/<agentId>/<literal-rest-segments...>
```

配置的 Control UI 基础路径会为这些路由添加前缀。仅包含 agent 的形式会打开该 agent 的主投影。字面量形式会将 `agent:<agentId>:` 之后以冒号分隔的会话密钥编码为路径片段。

对于其余部分以 UUID 结尾的密钥，可共享的短形式使用该 UUID 开头的 8 到 32 个小写十六进制字符，并移除 UUID 中的短横线。短 ID 是权威信息。除非两个会话共享相同的前缀，否则显示名称 slug 仅用于展示；如果共享相同前缀，则其中一个完全匹配的 slug 可用于消除歧义。对于 CLI 短链接目标，agent 片段同样仅用于展示：Gateway 会解析短 ID，而不会将其限制为该 URL 中的 agent。

Gateway 方法 `sessions.resolve` 负责解析精确密钥、原始会话 ID、标签和短 ID。发现选择器会根据调用客户端的会话可见性进行过滤。短 ID 歧义结果最多包含十个最近的候选项，因此客户端可以请求更长的前缀，而无需猜测。完整的字面量编码和稳定性约定请参见 [Control UI URL](/web/urls)。

### 当前和较旧的 Gateway

当前的 Gateway 会在会话存储所有者处解析短引用。随后，Control UI 和 CLI 会使用返回的规范密钥。

较旧的 Gateway 可能会拒绝附加的 `shortId` 选择器。Control UI 可以回退到较旧的有界列表搜索，最多扫描五页。CLI 不会复现该分页策略：它会提示你从该 Gateway 的 Control UI 复制完整的会话密钥，或升级 Gateway。

## 选择如何继续

CLI 接受三种目标语法：

- 完整的 Control UI URL，例如
  `https://claw.example.com/dashboard/main/deploy-monitor-6db92d48`。
- Gateway 简写，例如
  `claw.example.com/main/deploy-monitor-6db92d48`。
- 简短引用或完整键，例如 `deploy-monitor-6db92d48` 或
  `agent:main:telegram:12345`。裸引用使用已配置的或默认的 Gateway。

会话 URL 不得包含凭据。首次与 Gateway 来源配对时，请单独传入 `--token` 或 `--password`。

### 在终端中继续

对于由 Gateway 支持的继续操作，将 URL 或引用传递给 `openclaw tui`：

```bash
openclaw tui https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
openclaw tui deploy-monitor-6db92d48
```

你也可以直接在 CLI 根目录粘贴完整的会话 URL：

```bash
openclaw https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
```

这会在 Gateway 返回的规范会话键上打开 TUI。它不会克隆会话记录，也不会创建新会话。有关目标冲突、支持的裸 URL 选项和示例，请参阅 [TUI](/cli/tui)。

### 附加 coding harness

将相同的 URL 或引用传递给 `openclaw attach`：

```bash
openclaw attach https://claw.example.com/dashboard/main/deploy-monitor-6db92d48
openclaw attach deploy-monitor-6db92d48
```

Gateway 会先解析会话，然后生成限定于该会话的临时授权，并使用严格的 MCP 配置启动 coding harness。Bearer token 会通过子进程环境传递，而不是通过 argv 传递。正常启动时，harness 退出后会撤销授权；`--print-config` 会使授权保持有效，直到其 TTL 过期。有关授权有效期和启动选项，请参阅 [Attach CLI](/cli/attach)。

## 每个 Gateway origin 仅配对一次

URL 或 Gateway 简写会权威地选择一个规范化的 Gateway
origin。OpenClaw 绝不会为该目标重用来自其他 origin 的已配置凭据或已存储的设备令牌。

首次连接时：

1. 使用 `--token` 或 `--password` 运行 TUI 或 attach 命令一次。
2. 在该 Gateway 的 Control UI 中打开 **Settings > Devices**，并批准待处理的
   请求。在 Gateway 主机上，你也可以改为使用 `openclaw devices approve --latest` 预览最新请求，核对后运行输出的
   `openclaw devices approve <requestId>` 命令。
3. 重试原始命令。OpenClaw 会将签发的操作员设备令牌存储在 SQLite 中，并与该完全规范化的 Gateway origin
   绑定。
4. 之后连接到同一 origin 时，可以使用已存储的设备令牌。显式提供的 `--token` 或 `--password` 始终对整个连接生效。

当客户端不应再连接时，请从同一 Gateway 的 **Devices** 页面撤销或移除该设备。令牌不会跨 origin
使用。通过 SSH 隧道进行的只读探测也会抑制已存储的设备身份验证，因为回环传输无法识别远程 origin；显式凭据仍然有效。

有关批准、轮换、撤销和网络指导，请参阅 [Devices](/cli/devices)、[Remote access](/gateway/remote) 和
[Gateway security](/gateway/security)。

## 故障分类

Gateway 连接故障使用一个结构化优先的分类器。较旧的
Gateway 仍可通过有界文本回退机制正常工作，因此 health、status 和
TUI 会提供相同的类别和恢复指导。

| 故障或类型                         | 含义                                                                                     | 操作                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 较旧 Gateway 拒绝短链接            | Gateway 不接受 `sessions.resolve` 中的 `shortId`。                                       | 从该 Gateway 的 Control UI 中复制完整的会话密钥，或升级 Gateway。                                                                                               |
| 会话缺失                           | 所选 Gateway 找不到该密钥或短 ID。                                                        | 对于已配置的 Gateway，运行 `openclaw sessions list`。对于 URL 目标，在该 Gateway 的 Control UI 中选择会话。                                                     |
| 会话引用不明确                     | 多个可见会话共享此前缀，且 slug 未能选中其中一个。                                       | 使用 CLI 显示的更长 ID 前缀之一，或复制完整密钥。                                                                                                               |
| `pairing-required`                 | 设备是新设备，或现有设备需要角色、范围或元数据审批。                                    | 在 **Settings > Devices** 中批准待处理请求，或使用 `openclaw devices approve --latest` 预览请求，并运行输出的确切 ID 命令，然后重试。 |
| `device-identity-required`         | Gateway 要求此连接提供已签名的设备身份。                                                 | 使用当前的 OpenClaw 客户端，让它创建设备身份，并完成配对。                                                                                                     |
| `scope-mismatch`                   | 已存储的设备令牌有效，但缺少所请求的操作员范围。                                         | 查看 `openclaw devices list`，批准待处理的范围升级，然后重新连接。                                                                                            |
| `auth-rejected`                    | 显式共享凭据错误，或配对设备令牌已被撤销或轮换。                                         | 验证显式 Gateway 身份验证。对于过期的设备令牌，使用 `openclaw devices rotate --device <deviceId> --role operator` 轮换令牌，或重新配对。             |
| `rate-limited`                     | 过多的身份验证失败导致临时锁定。                                                         | 等待锁定期结束，然后重试。不要仅仅因为 Gateway 受到速率限制就轮换凭据。                                                                                        |
| `gateway-rejected`                 | Gateway 返回了其他结构化拒绝，例如协议不匹配。                                          | 遵循错误详细信息。对于版本偏差，在重试前更新较旧的客户端或 Gateway。                                                                                           |
| `unreachable`                      | 无法访问所选源。                                                                         | 检查 Gateway 进程和路由。对于 `*.ts.net` 主机，连接 Tailscale 并确认 tailnet 可达；对于 SSH，确认隧道正在运行。                                             |
| TLS 指纹不匹配                     | 出示的证书与已配置或显式固定的指纹不匹配。                                               | 验证证书和预期指纹。只有在确认 Gateway 身份后，才能更改固定值。                                                                                                |

## 相关页面

- [会话管理](/concepts/session)
- [控制 UI URL](/web/urls)
- [TUI](/cli/tui)
- [Attach CLI](/cli/attach)
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [网关安全](/gateway/security)
