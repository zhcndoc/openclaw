---
summary: "OpenClaw macOS 伴随应用（菜单栏 + 网关代理）"
read_when:
  - 实现 macOS 应用功能时
  - 更改 macOS 上的网关生命周期或节点桥接时
title: "macOS 应用"
---

macOS 应用是 OpenClaw 的**菜单栏伴随应用**。它负责权限管理，
在本地（launchd 或手动）管理/附加到 Gateway，并将 macOS
能力作为一个节点暴露给代理。

## 它的作用

- 在菜单栏中显示原生通知和状态。
- 负责 TCC 提示（通知、辅助功能、屏幕录制、麦克风、
  语音识别、自动化/AppleScript）。
- 运行或连接到 Gateway（本地或远程）。
- 暴露仅限 macOS 的工具（Canvas、Camera、屏幕录制、`system.run`）。
- 在**远程**模式下启动本地节点主机服务（launchd），并在**本地**模式下停止它。
- 可选地为 UI 自动化托管 **PeekabooBridge**。
- 按需通过 npm、pnpm 或 bun 安装全局 CLI（`openclaw`）（应用优先使用 npm，其次 pnpm，再次 bun；Node 仍是推荐的 Gateway 运行时）。

## 本地模式与远程模式

- **本地**（默认）：如果存在正在运行的本地 Gateway，应用会附加到它；
  否则它会通过 `openclaw gateway install` 启用 launchd 服务。
- **远程**：应用通过 SSH/Tailscale 连接到 Gateway，且绝不会启动
  本地进程。
  应用会启动本地 **节点主机服务**，以便远程 Gateway 可以访问这台 Mac。
  应用不会将 Gateway 作为子进程启动。
  Gateway 发现现在优先使用 Tailscale MagicDNS 名称，而不是原始 tailnet IP，
  因此当 tailnet IP 发生变化时，Mac 应用恢复连接会更可靠。

## Launchd 控制

应用会管理一个按用户划分的 LaunchAgent，标签为 `ai.openclaw.gateway`
（如果使用 `--profile`/`OPENCLAW_PROFILE`，则为 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 仍然会被卸载）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

在运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

如果未安装 LaunchAgent，请在应用中启用它，或运行
`openclaw gateway install`。

If the gateway repeatedly disappears for minutes to hours and only resumes when you touch the Control UI or SSH into the host, see the troubleshooting note for macOS Maintenance Sleep / `ENETDOWN` crashes and launchd's respawn-protection gate in [Gateway troubleshooting](/gateway/troubleshooting#macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard).

## Node capabilities (mac)

macOS 应用将自身呈现为一个节点。常见命令：

- Canvas: `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Camera: `camera.snap`, `camera.clip`
- Screen: `screen.snapshot`, `screen.record`
- System: `system.run`, `system.notify`

节点会报告一个 `permissions` 映射，以便代理可以判断哪些操作被允许。

节点服务 + 应用 IPC：

- 当无头节点主机服务正在运行（远程模式）时，它会作为一个节点连接到 Gateway WS。
- `system.run` 通过本地 Unix socket 在 macOS 应用中执行（UI/TCC 上下文）；提示和输出都保留在应用内。

图示（SCI）：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行审批（system.run）

`system.run` 由 macOS 应用中的 **Exec approvals** 控制（Settings → Exec approvals）。
security + ask + allowlist 存储在 Mac 本地：

```
~/.openclaw/exec-approvals.json
```

示例：

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

说明：

- `allowlist` 条目是已解析二进制路径的 glob 模式，或者是通过 PATH 调用命令时使用的裸命令名。
- 任何包含 shell 控制或展开语法（`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 shell 命令文本都会被视为未命中 allowlist，并需要显式批准（或将 shell 二进制加入 allowlist）。
- 在提示中选择“始终允许”会将该命令添加到 allowlist。
- `system.run` 环境覆盖会被过滤（移除 `PATH`, `DYLD_*`, `LD_*`, `BASHOPTS`, `FPATH`, `KSH_ENV`, `NODE_OPTIONS`, `NODE_REDIRECT_WARNINGS`, `NODE_REPL_EXTERNAL_MODULE`, `NODE_REPL_HISTORY`, `NODE_V8_COVERAGE`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`, `TCLLIBPATH`），然后与应用的环境合并。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的环境覆盖会被缩减为一个较小的显式 allowlist（`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`）。
- 对于 allow-always 决策的 allowlist 模式，已知的分发包装器（`env`, `flock`, `nice`, `nohup`, `stdbuf`, `timeout`）会持久化内部可执行文件路径，而不是包装器路径。如果无法安全解包，则不会自动持久化任何 allowlist 条目。

## 深度链接

应用会注册 `openclaw://` URL scheme 用于本地操作。

### `openclaw://agent`

触发一次 Gateway `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查询参数：

- `message`（必需）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选的无人值守模式密钥）

安全性：

- 没有 `key` 时，应用会提示确认。
- 没有 `key` 时，应用会对确认提示强制执行较短的消息长度限制，并忽略 `deliver` / `to` / `channel`。
- 使用有效 `key` 时，运行将是无人值守的（适用于个人自动化）。

## 上手流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限清单（TCC 提示）。
3. 确保 **本地** 模式处于激活状态并且 Gateway 正在运行。
4. 如果你想要终端访问，请安装 CLI。

## 状态目录放置位置（macOS）

避免将 OpenClaw 状态目录放在 iCloud 或其他云同步文件夹中。
由同步支持的路径会增加延迟，并且有时会导致会话和凭据的文件锁/同步竞争。

建议使用本地、不同步的状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 检测到状态位于：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它会发出警告，并建议移回本地路径。

## Build and dev workflow (native)

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## 调试网关连接性（macOS CLI）

使用调试 CLI 来执行与 macOS 应用相同的 Gateway WebSocket 握手和发现
逻辑，而无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或本地）
- `--probe`：强制进行新的健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：用于 diff 的结构化输出

发现选项：

- `--include-local`: 包括会被过滤为“本地”的网关
- `--timeout <ms>`: 整体发现窗口（默认：`2000`）
- `--json`: 用于 diff 的结构化输出

<Tip>
对照 `openclaw gateway discover --json` 检查 macOS 应用的发现流水线（`local.` 加上配置的广域域名，并带有广域和 Tailscale Serve 回退）是否与 Node CLI 基于 `dns-sd` 的发现不同。
</Tip>

## 远程连接管线（SSH 隧道）

当 macOS 应用以 **远程** 模式运行时，它会打开一个 SSH 隧道，使本地 UI
组件可以像访问 localhost 一样与远程 Gateway 通信。

### 控制隧道（Gateway WebSocket 端口）

- **用途：** 健康检查、状态、Web Chat、配置以及其他控制平面调用。
- **本地端口：** Gateway 端口（默认 `18789`），始终稳定。
- **远程端口：** 远程主机上的同一 Gateway 端口。
- **行为：** 不使用随机本地端口；应用会复用现有的健康隧道
  或在需要时重新启动它。
- **SSH 形式：** `ssh -N -L <local>:127.0.0.1:<remote>`，并带有 BatchMode +
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用回环地址，因此 gateway 会将节点
  IP 视为 `127.0.0.1`。如果你希望显示真实客户端
  IP，请使用 **Direct (ws/wss)** 传输（参见 [macOS 远程访问](/platforms/mac/remote)）。

设置步骤请参见 [macOS 远程访问](/platforms/mac/remote)。协议
细节请参见 [Gateway 协议](/gateway/protocol)。

## 相关文档

- [Gateway 运行手册](/gateway)
- [Gateway（macOS）](/platforms/mac/bundled-gateway)
- [macOS 权限](/platforms/mac/permissions)
- [Canvas](/platforms/mac/canvas)
