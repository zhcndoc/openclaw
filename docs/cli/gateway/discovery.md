---
summary: "`openclaw gateway discover` 和 Bonjour 信标以及 TXT 提示它正在扫描"
read_when:
  - "通过 Bonjour 发现网关（本地 + 广域 DNS-SD）"
title: "发现网关 （Bonjour）"
sidebarTitle: "发现"
---

通过 mDNS 和广域 DNS-SD 扫描网关信标。 [`openclaw gateway`](/cli/gateway) 参考的一部分。

## <a id="discover-gateways-(bonjour)"></a><a id="discover-gateways-bonjour"></a> 发现 gateways（Bonjour）

`gateway discover` 扫描 Gateway 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如 `openclaw.internal.`），并设置分割 DNS + DNS 服务器；参见 [Bonjour](/gateway/bonjour)。

只有启用了 Bonjour 发现的 gateway（默认）才会广播该信标。

每个信标上的 TXT 提示：`role`（网关角色提示）、`transport`（传输提示，e.g. `gateway`）、`gatewayPort`（WebSocket 端口，通常为 `18789`）、 `tailnetDns`（MagicDNS 主机名，如果可用）、`gatewayTls` / `gatewayTlsSha256`（启用 TLS + 证书指纹）。 `sshPort` 和 `cliPath` 仅在完全发现模式下发布（`discovery.mdns.mode: "full"`；默认为 `"minimal"`，省略它们 — 客户端默认 SSH 目标为端口 `22`）。

### `gateway discover`

```bash
openclaw gateway discover
```

<a id="param-timeout"></a>

<ParamField path="--timeout <ms>" type="number" 默认="2000">
  每个命令超时 （browse/resolve）。
</ParamField>
<a id="param-json"></a>

<ParamField path="--json" type="boolean">
  机器可读输出（也禁用 styling/spinner）。
</ParamField>

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- 扫描 `local.`，以及在启用时扫描已配置的广域域。
- JSON 输出中的 `wsUrl` 源自已解析的服务端点，而不是源自 TXT-only 提示，例如 `lanHost` 或 `tailnetDns`。
- `discovery.mdns.mode` 控制 `local.` mDNS 和广域 DNS-SD 上的 `sshPort`/`cliPath` 发布（见上文）。

</Note>
