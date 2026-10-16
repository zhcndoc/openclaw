---
summary: "用于将 TUI 连接到最近的网关会话的 CLI 参考"
read_when:
  - "想要在终端中继续现有的 Gateway 会话"
  - "想要通过键、显示名称或标签查找最近的会话"
  - "将 TUI 连接到远程 Gateway"
title: "恢复"
---

# `openclaw resume`

将终端 UI 连接到现有的 Gateway 会话。会话会保留在 Gateway 上；`resume` 会选择该会话并打开现有的 [TUI](/cli/tui)。

```bash
openclaw resume
openclaw resume <query>
openclaw resume --handoff <payload>
```

不提供查询时，OpenClaw 会显示最近七天内活跃的最多 50 个会话。提供查询时，精确匹配的会话键优先；否则，OpenClaw 会要求在会话键、显示名称和标签中找到唯一的子字符串匹配或模糊匹配。

选择器会省略单独的 `global` 行，因为它们无法标识所属的代理。要连接到此类会话，请传入完全限定的键，例如 `openclaw resume agent:main:global`。

如果查询结果不明确，OpenClaw 会打印匹配的候选项并以状态码 1 退出。如果没有匹配的最近会话，它会提示使用选择器和 [`openclaw sessions`](/cli/sessions)，然后以状态码 1 退出。

## <a id="options"></a> 选项

| 标志                         | 默认值                          | 描述                                                         |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `--handoff <payload>`        | （无）                           | 从 Control UI 复制的不透明会话密钥和网关 URL。      |
| `--url <url>`                | 配置中的 `gateway.remote.url` | 网关 WebSocket URL。                                              |
| `--token <token>`            | （无）                           | 网关令牌（如果需要）。                                          |
| `--password <pass>`          | （无）                           | 网关密码（如果需要）。                                       |
| `--tls-fingerprint <sha256>` | `gateway.remote.tlsFingerprint`  | 固定 `wss://` 网关的预期 TLS 证书指纹。 |

`--handoff` 不能与位置查询或 `--url` 结合使用，因为它权威地提供两者。您可以将其与`--token`、`--password`和`--tls-fingerprint`组合使用；这些显式身份验证值保持其正常的最高优先级。

`resume` 永远不会自动启动网关。如果配置的网关不可用，请启动或修复它并重新运行该命令。

如果可能，`resume` 会解析为 token/password 身份验证配置的网关身份验证 SecretRefs（`env`/`file`/`exec`/`store` 提供商）。

如果存在，`--handoff` 为目标网关 URL 供电。否则，网关目标优先级显式为 `--url`，然后是 `OPENCLAW_GATEWAY_URL`，然后是 `gateway.remote.url`（当 `gateway.mode` 是 `remote` 时），然后是本地环回网关。对于该本地网关，`OPENCLAW_GATEWAY_PORT` 优先于正在运行的网关记录的活动端口，后者优先于配置的或默认的 `gateway.port`。

显式目标通常需要显式 `--token` 或 `--password`； OpenClaw 不会从不同配置的目标借用凭证或 TLS 引脚。对于从 Control UI 复制的切换，`resume` 有一个狭隘的例外：当其网关 URL 逐字节匹配当前配置文件的配置目标时，它可以重用该配置文件的配置交互式身份验证、SecretRef 和存储的确切来源设备身份验证。在本地模式下，合格的目标是当前本地目标，其中 `gateway.controlUi.basePath` 和 `gateway.publicOrigin` 转换为具有该基本路径的 WebSocket 形式。在远程模式下，只有 `gateway.remote.url` 才符合条件。 TLS 引脚所有权范围更窄：精确的直接本地目标可以重用本地网关证书指纹，精确配置的远程目标可以重用 `gateway.remote.tlsFingerprint`；公共源目标永远不会继承本地侦听器的 pin。当公共源需要 pin 时，显式传递 `--tls-fingerprint`。在正常的显式目标策略下，主机、端口、路径、配置文件、查询或片段不匹配会被拒绝。 OpenClaw 从不扫描其他配置文件以查找匹配项。切换连接还会忽略环境 `OPENCLAW_GATEWAY_TOKEN` 和 `OPENCLAW_GATEWAY_PASSWORD` 回退，因此另一个网关的 shell 凭据无法进入选定的目标。确切配置的目标拥有的显式标志和凭据仍然符合资格。

## <a id="continue-from-the-control-ui"></a> 继续 Control UI

打开所选会话的标题菜单并选择 **在终端中继续…**。该对话框显示一个可复制的 `openclaw resume --handoff <payload>` 命令。不透明的有效负载采用未填充的 URL-safe base64 字母表进行版本控制、限制和编码，因此该命令不需要引用，并且可以安全地粘贴到常见的 POSIX shell、PowerShell 和 `cmd.exe` 中。编码参数限制为 4096 个字符；在其中，代理限定的会话密钥限制为 512 个用户感知的字符，网关 URL 限制为 2048 个字符。它仅包含确切的合格会话密钥和选定的网关 WebSocket URL，包括任何 Control UI 基本路径。它不包含令牌、密码、设备凭证或引导凭证，并且浏览器不会执行它。

当所选网关 URL 使用查询字符串时，Control UI 不提供此命令。网关身份验证和存储的设备范围是基于源的，而不是查询感知的，因此 OpenClaw 永远不会将查询剥离或复制到无凭据的切换中。使用具有显式 `--token` 或 `--password` 的手动身份验证的 CLI 目标，或配置无查询网关 URL。

在已配置的 OpenClaw 终端中运行该命令。终端独立认证。在打开TUI之前，`resume`要求网关解析合格的密钥并使用返回的解析密钥。已删除或过时的会话将停止，并指导复制新命令；它永远不会启动新会话。网关的会话访问控制仍然具有权威性。此流程继续现有会话；它不会委托浏览器的首次使用身份验证。

如果 OpenClaw 报告无效的 `--handoff` 负载，请返回到会话的 Control UI 菜单并复制新命令。请勿编辑或重复使用截断的有效负载。

## <a id="examples"></a> 示例

```bash
# Choose from recent sessions
openclaw resume

# Exact key
openclaw resume agent:main:bugfix

# Unique display-name or label fragment
openclaw resume bugfix

# Remote Gateway override
openclaw resume bugfix --url wss://gateway.example.com --token <token>

# Opaque command copied from the Control UI
openclaw resume --handoff <payload>
```

## <a id="related"></a> 相关内容

- [TUI](/cli/tui)
- [会话](/cli/sessions)
- [TUI 指南](/web/tui)
