---
summary: "`openclaw devices` 的 CLI 参考（设备配对 + 令牌 rotation/revocation）"
read_when:
  - "你正在批准设备配对请求"
  - "你需要轮换或撤销设备令牌"
title: "设备"
---

# `openclaw devices`

管理设备配对请求和设备范围的令牌。

## <a id="common-options"></a> 常用选项

- `--url <url>`：网关 WebSocket URL（配置后默认为 `gateway.remote.url`）
- `--token <token>`：网关令牌（如果需要）
- `--password <password>`：网关密码（密码认证）
- `--timeout <ms>`：RPC 超时时间
- `--json`：JSON 输出（推荐用于脚本）

<Warning>
设置 `--url` 后，CLI 将不会回退使用配置或环境凭据。请显式传入 `--token` 或 `--password`，否则命令将执行失败。
</Warning>

## <a id="commands"></a> 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```bash
openclaw devices list
openclaw devices list --json
```

对于已配对设备上的待处理请求，输出会在设备当前批准的访问旁边显示请求的访问，因此 scope/role 升级是可见的，而不是看起来像丢失配对。

配对设备显示名称使用以下优先顺序：操作员标签（来自 `devices rename` 的 `operatorLabel`），然后是客户端 `displayName`，然后是 `clientId`，然后是 `deviceId`。通过 `devices` 命令打印的 Node 批准通知在设置时使用操作员标签。

### `openclaw devices approve [requestId] [--latest]`

通过精确的 `requestId` 批准一个待处理的配对请求。省略 `requestId`，或传入 `--latest`，只会预览最新的待处理请求并退出（代码 1）；请使用准确的请求 ID 重新运行以批准。

打印的批准命令会保留您的活动配置文件或容器、显式网关 URL、非默认超时和 JSON 输出模式。令牌和密码选项值被省略；当预览要求您重用这些选项时，再次提供相同的凭据。

```bash
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

<Note>
如果设备在重新尝试配对时更改了认证信息（角色、范围或公钥），OpenClaw 会用新的 `requestId` 覆盖之前的待处理条目。在批准之前，请先运行 `openclaw devices list` 以获取当前的 id。
</Note>

批准行为：

- 如果设备已配对并请求更广泛的范围或角色，OpenClaw 会保留现有批准并创建新的待处理升级请求。在批准之前，比较 `openclaw devices list` 中的 `Requested` 与 `Approved`，或使用 `--latest` 进行预览。
- 批准 `node` 角色或其他非 operator 角色需要 `operator.admin`。`operator.pairing` 足以批准 operator 设备，但前提是请求的 operator 范围仍在调用者自身范围之内。参见 [Operator scopes](/gateway/operator-scopes)。
- 如果配置了 `gateway.nodes.pairing.autoApproveCidrs`，则来自匹配客户端 IP 的首次 `role: node` 请求可以在出现在此列表中之前自动批准。默认禁用；绝不适用于 operator/browser 客户端或升级请求。
- `gateway.nodes.pairing.sshVerify`（默认开启）会在网关通过 SSH 向节点主机验证设备密钥时，自动批准首次 `role: node` 请求。因此，请求可能会在出现后很快变为已批准。将 `sshVerify: false` 设为禁用 SSH 验证；这与 `autoApproveCidrs` 无关，因此若要仅手动配对，也请同时取消设置它。

### `openclaw devices reject <requestId>`

拒绝一个待处理的设备配对请求。

连接等待的 Control UI 浏览器显示 **访问请求被拒绝** 并自动停止重试。可以用**提交新的请求，再次请求**；重新加载页面也可以再次请求。拒绝不会持续设备禁令。

```bash
openclaw devices reject <requestId>
```

### `openclaw devices join-code`

创建一个一次性节点，将 URL 加入到具有网关管理员访问权限的节点中。将打印的 `npx -y openclaw@<gateway-version> connect <url> --service --session-host` 命令粘贴到计算机上，将其注册为可以运行代理会话的后台服务。仅使用可信的共享基础设施；对于仅命令节点，省略 `--session-host`。此加入URL不是移动应用程序设置代码；对于 Android/iOS，请改用 [`openclaw qr`](/cli/qr)。

```bash
openclaw devices join-code
openclaw devices join-code --json
```

npm 版本来自铸造 URL 的网关，而不是调用的 CLI。源签出和未发布的版本在解析时使用匹配的 npm 通道标签，否则取消固定 `openclaw`，并带有匹配的构建注释。注册表检查最多需要两秒钟。

已经安装了 OpenClaw 吗？运行：`openclaw connect <join-url> --service --session-host`。

JSON 保留了 `joinUrl` 和 `command`（默认的 service/session-host 命令），并添加了 `serviceCommand`（仅命令节点服务）、`installedCommand`（使用现有安装）和可选的 `versionNote`（匹配构建指南）。

加入代码的创建和兑换是网关的核心操作；无需启用配对插件。 URL 必须可从连接机器访问。远程加入 URL 需要 TLS 网关端点。显式配置的环回端点可以使用 HTTP，前提是加入计算机可以到达该环回端点（例如通过本地隧道）。

仅使用默认环回绑定且没有通告的端点，URL 发现拒绝创建链接。对于公共 HTTPS 入口后面的环回网关，请将 `gateway.publicOrigin` 设置为代理的裸 HTTPS 源，并将代理的源地址包含在 `gateway.trustedProxies` 中。

连接代码、`/pair` 和 QR 设置保留现有端点选择：`plugins.entries.device-pair.config.publicUrl`（明确首选的 `gateway.remote.url`）、Tailscale Serve/Funnel（非首选远程 URL），然后绑定派生地址。 `gateway.publicOrigin` 仅用作仅环回错误之前的最终后备；它不会取代现有的路线。针对本地网关的呼叫者忽略了远程 URL。 HTTP（S） URL 成为匹配 `ws:`/`wss:` 配对端点。

连接代码保留完全限定的 `publicUrl` 的上下文路径：对于 `https://pair.example/extra`，连接 URL 以 `https://pair.example/extra/j/` 开头。设备对插件的 `/pair` 命令保留其历史来源的 WebSocket 端点 `wss://pair.example`。

[云节点注册](/gateway/cloud-workers) 使用具有显式公共入口首选项的相同解析器：特定于配对的覆盖仍然获胜，然后 `gateway.publicOrigin` 优先于新配置的工作线程的发现。

有关其他部署先决条件，请参阅无法托管节点的 [ 网关部署](/nodes/node-host#gateway-deployments-that-cannot-host-nodes)。明文 LAN 配对可以直接使用设置代码，而不是 HTTP 连接 URL。请参见 [ 连接机器 ](/cli/connect)。

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

```bash
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

使用已配对设备令牌进行身份验证的调用者，只能移除其**自己的**设备条目。移除其他设备需要 `operator.admin`。

### `openclaw devices rename --device <id> --name <label>`

为已配对设备分配一个操作员标签。标签是所有者侧状态：它们会在配对修复和角色重新批准后保留，并且不会更改稳定的 `deviceId`。

```bash
openclaw devices rename --device <deviceId> --name "Kitchen Mac"
openclaw devices rename --device <deviceId> --name "Kitchen Mac" --json
```

- `--name` 为必需项，且会被裁剪空白、不能为空，最长 64 个字符。
- 显示位置（CLI 列表、Control UI 清单）优先使用操作员标签，而不是客户端报告的显示名称。
- 非管理员的已配对设备调用者只能重命名**自己的**设备。重命名其他设备需要 `operator.admin`。

### `openclaw devices clear --yes [--pending]`

批量清除已配对设备。受 `--yes` 保护。

```bash
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

`--pending` 还会拒绝所有待处理的配对请求。

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为某个角色轮换设备令牌，也可选择更新其范围。

```bash
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

- 目标角色必须已存在于该设备已批准的配对契约中；轮换不能铸造一个新的、未批准的角色。
- Omitting `--scope` 保留目标代币的当前范围。传递显式 `--scope` 值会替换设备批准的基线内的范围集，以供将来缓存令牌重新连接。
- 通过 `--no-scopes` 请求空范围集。它不能与 `--scope` 组合使用。
- 非管理员的已配对设备调用者只能轮换**自己的**设备令牌，并且目标范围集合必须保持在调用者自己的 operator 范围内；轮换不能铸造或保留比调用者已拥有的更广泛的令牌。

返回旋转元数据为 JSON。如果调用者在使用该设备令牌进行身份验证时轮换自己的令牌，则响应将包含替换令牌，以便客​​户端可以在重新连接之前保留它。共享秘密呼叫者和轮换另一个设备的呼叫者永远不会收到不记名令牌。

当 Doctor 报告携带操作员作用域的旧节点令牌时，请使用其显式恢复命令：

```bash
openclaw devices rotate --device <deviceId> --role node --no-scopes
```

此恢复需要 `operator.admin` 并保留设备的操作员配对和批准的范围。网关仅在与轮换相同的提交中删除与已停用的旧令牌相匹配的本地缓存节点令牌。对于使用单独状态目录的节点主机，提供有效的共享网关身份验证并重新启动节点以刷新其缓存。仅已停用的设备令牌无法验证重新连接。

### `openclaw devices revoke --device <id> --role <role>`

撤销某个角色的设备令牌。

```bash
openclaw devices revoke --device <deviceId> --role node
```

非管理员配对设备呼叫者只能撤销其 **own** 设备令牌。撤销另一个设备的令牌需要 `operator.admin`。目标范围集也必须适合调用者自己的运算符范围；仅配对调用者无法撤销 admin/write 操作员令牌。

## <a id="notes"></a> 说明

- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。非 operator 设备角色始终需要 `operator.admin`；请参见 [Operator scopes](/gateway/operator-scopes)。
- 令牌轮换和撤销仍然限制在设备已批准的配对角色集合和作用域基线内。孤立的缓存令牌条目不会授予令牌管理目标。
- 轮换和撤销还会使匹配设备和角色的仪表板读取权限以及由承认轮换保留的 Cron 调用者权限（包括在断开连接后）失效。单独断开连接并不会撤销这些权限。已经提交的 Cron 更改会保留其结果，并且现有计划不会通过撤销其创建者的令牌而取消。
- 删除设备或撤销其节点令牌也会清除节点运行时状态。工作线程清理错误不会使受影响的连接保持授权或打开状态。
- 对于操作员令牌，CLI 首先读取配对列表，然后请求配对加上目标令牌的范围（或显式轮换范围）。如果目标不可见，它会请求管理员访问权限以进行跨设备管理。缩小的令牌不会继承更广泛的设备批准基线；调用者必须已获得所请求范围的授权。
- 对于已配对设备的令牌会话，跨设备管理（`remove`、`rename`、`rotate`、`revoke`）仅限于自身，除非调用方具有 `operator.admin`。
- 令牌轮换会返回一个新令牌（敏感信息）——请将其视为机密。
- 如果配对范围在本地环回上不可用并且没有显式传递 `--url`，则 `list` 可以读取本地配对状态。批准永远不会围绕正在运行的网关进行写入：使用授权设备或共享网关凭据，或者通过其服务所有者停止网关并重新运行确切的批准命令。当本地网关停止时，`list` 读取现有状态，并且 `approve` 通过写入和清除持有独占离线所有权。显式 URL 和不确定的请求结果永远不会在本地重播。

## <a id="token-drift-recovery-checklist"></a> 令牌漂移恢复检查清单

当 Control UI 或其他客户端持续失败并出现 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 时，请使用此检查清单。

1. 确认当前网关令牌来源：

   ```bash
   openclaw gateway auth-token --show
   ```

   在网关主机上的交互式终端中运行该命令，并将其输出视为机密信息。

2. 列出配对设备并识别受影响的设备 ID：

   ```bash
   openclaw devices list
   ```

3. 为受影响的设备轮换 operator 令牌：

   ```bash
   openclaw devices rotate --device <deviceId> --role operator
   ```

4. 如果轮换还不够，请移除过期的配对并重新批准：

   ```bash
   openclaw devices remove <deviceId>
   openclaw devices list
   openclaw devices approve <requestId>
   ```

5. 重试与当前共享的客户端连接 token/password.

注意：

- 正常重新连接身份验证优先级：首先显式共享 token/password，然后是显式 `deviceToken`，然后是存储的设备令牌，然后是引导令牌。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以在一次有边界的重试中，临时同时发送共享令牌和已存储的设备令牌。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但不携带请求的范围集；在更改共享网关身份验证之前修复 pairing/scope 批准合同。

相关：

- [仪表盘认证故障排查](/web/dashboard#if-you-see-unauthorized-1008)
- [网关故障排查](/gateway/troubleshooting#dashboard-control-ui-connectivity)。

## <a id="paperclip-%2F-openclaw_gateway-first-run-approval"></a><a id="paperclip-/-openclaw_gateway-first-run-approval"></a> Paperclip / `openclaw_gateway` 首次运行批准

通过 `openclaw_gateway` 适配器连接的 Paperclip 代理，会像任何其他新客户端一样，经历相同的首次设备配对批准流程。如果 Paperclip 报告 `openclaw_gateway_pairing_required`，请批准待处理设备并重试。

```bash
openclaw devices approve --latest
```

预览会打印出精确的 `openclaw devices approve <requestId>` 命令；请核对详情，然后使用请求 ID 重新运行该命令以完成批准。对于远程网关或显式凭据，在预览和批准时传入相同的选项：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

为避免每次重启后都重新批准，请在 Paperclip 中配置持久的 `adapterConfig.devicePrivateKeyPem`，而不是让它每次运行时都生成新的临时设备身份：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果批准一直失败，请先运行 `openclaw devices list` 以确认是否存在待处理请求。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [节点](/nodes)
- [`openclaw qr`](/cli/qr) — 生成移动节点引导程序 QR 和设置代码
