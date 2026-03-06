---
summary: "OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）"
read_when:
  - 实现 macOS 应用功能时
  - 更改 macOS 上的网关生命周期或节点桥接时
title: "macOS 应用"
---

# OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）

macOS 应用是 OpenClaw 的**菜单栏伴侣**。它拥有权限，
管理/连接本地网关（通过 launchd 或手动启动），并将 macOS
功能作为节点暴露给代理。

## 功能介绍

- 在菜单栏显示原生通知和状态。
- 管理 TCC 提示（通知、辅助功能、屏幕录制、麦克风、
  语音识别、自动化/AppleScript）。
- 运行或连接网关（本地或远程）。
- 暴露 macOS 独有工具（Canvas、相机、屏幕录制、`system.run`）。
- 在**远程**模式下启动本地节点主机服务（launchd），在**本地**模式下停止它。
- 可选托管**PeekabooBridge**用于 UI 自动化。
- 可按需通过 npm/pnpm 安装全局 CLI（`openclaw`）（不推荐用 bun 作为网关运行时）。

## 本地模式与远程模式

- **本地模式**（默认）：如果存在正在运行的本地网关，应用会附加到该网关；
  否则通过 `openclaw gateway install` 启用 launchd 服务。
- **远程模式**：应用通过 SSH/Tailscale 连接远程网关，且始终不启动本地进程。
  应用启动本地**节点主机服务**，以便远程网关能够访问此 Mac。
  应用不会将网关作为子进程启动。

## Launchd 控制

应用管理每用户级的 LaunchAgent，标签为 `ai.openclaw.gateway`
（使用 `--profile` / `OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；旧版仍可卸载 `com.openclaw.*`）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

使用命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

如果未安装 LaunchAgent，可从应用启用或运行
`openclaw gateway install`。

## 节点功能（mac）

macOS 应用作为节点自我呈现。常用命令：

- Canvas: `canvas.present`，`canvas.navigate`，`canvas.eval`，`canvas.snapshot`，`canvas.a2ui.*`
- Camera: `camera.snap`，`camera.clip`
- Screen: `screen.record`
- System: `system.run`，`system.notify`

节点报告一个 `permissions` 映射，代理据此决定允许操作。

节点服务 + 应用间进程通信（IPC）：

- 当无头节点主机服务运行（远程模式）时，它作为节点连接到网关的 WS。
- `system.run` 在 macOS 应用（UI / TCC 上下文）上通过本地 Unix 套接字执行；提示和输出均留在应用内。

示意图（SCI）：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行批准（system.run）

`system.run` 由 macOS 应用中的**执行批准**控制（设置 → 执行批准）。
安全策略、请求提示和允许列表本地存储于：

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

- `allowlist` 条目为已解析二进制路径的通配符模式。
- 包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 命令文本会被视为允许列表缺失，需要明确批准（或允许 shell 二进制文件）。
- 在提示中选择“始终允许”会将该命令加入允许列表。
- `system.run` 的环境覆盖会被过滤（剔除 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然后与应用环境合并。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖会缩减为一个显式允许的白名单（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许始终通过且允许列表模式生效的情况，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内层可执行程序路径，而非包装器路径。如拆包不安全，则不会自动保存允许列表条目。

## 深层链接

应用注册了 `openclaw://` URL 方案，用于本地操作。

### `openclaw://agent`

触发网关的 `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查询参数：

- `message`（必需）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选，无人值守模式密钥）

安全性：

- 无 `key` 时，应用会提示确认。
- 无 `key` 时，应用对确认提示施加短消息限制，并忽略 `deliver` / `to` / `channel`。
- 携带有效 `key` 时，运行无人值守（适用于个人自动化）。

## 新手流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限清单（TCC 提示）。
3. 确保处于**本地**模式且网关正在运行。
4. 需要终端访问时，安装 CLI。

## 状态目录路径位置（macOS）

避免将 OpenClaw 状态目录存放在 iCloud 或其他云同步文件夹中。
同步路径可能增加延迟，且偶尔导致会话和凭据的文件锁/同步冲突。

推荐使用本地非同步状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 检测到状态路径在：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

将发出警告并建议移回本地路径。

## 构建与开发流程（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或使用 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## 调试网关连接（macOS CLI）

使用调试 CLI 执行与 macOS 应用相同的网关 WebSocket 握手和发现逻辑，无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或本地）
- `--probe`：强制刷新健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：结构化输出以便对比

发现选项：

- `--include-local`：包含会被筛选为“本地”的网关
- `--timeout <ms>`：整体发现时间窗口（默认：`2000`）
- `--json`：结构化输出以便对比

提示：可与 `openclaw gateway discover --json` 比较，查看
macOS 应用的发现管线（NWBrowser + tailnet DNS-SD 备选）是否与
Node CLI 的基于 `dns-sd` 的发现不同。

## 远程连接流程（SSH 隧道）

当 macOS 应用运行在**远程**模式时，会打开 SSH 隧道，使本地 UI 组件能够像连接本地主机一样与远程网关通信。

### 控制隧道（网关 WebSocket 端口）

- **目的：** 健康检查、状态、网页聊天、配置及其他控制平面调用。
- **本地端口：** 网关端口（默认 `18789`），始终固定。
- **远程端口：** 远程主机上的相同网关端口。
- **行为：** 无随机本地端口；应用重用已存在并健康的隧道，必要时重启。
- **SSH 命令格式：** `ssh -N -L <local>:127.0.0.1:<remote>`，附带 BatchMode +
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用回环地址，因此网关将看到节点 IP 为 `127.0.0.1`。若需显示真实客户端 IP，请使用**直连（ws/wss）**传输（详见 [macOS 远程访问](/platforms/mac/remote)）。

设置步骤请见 [macOS 远程访问](/platforms/mac/remote)。协议细节请参阅 [网关协议](/gateway/protocol)。

## 相关文档

- [网关运行手册](/gateway)
- [网关（macOS）](/platforms/mac/bundled-gateway)
- [macOS 权限](/platforms/mac/permissions)
- [Canvas](/platforms/mac/canvas)
