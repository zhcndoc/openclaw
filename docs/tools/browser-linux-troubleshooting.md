---
summary: "修复 Linux 上 OpenClaw 浏览器控制的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "浏览器控制在 Linux 上失败时，尤其是使用 snap Chromium 时"
title: "浏览器故障排查"
---

## 问题："在端口 18800 上启动 Chrome CDP 失败"

OpenClaw 的浏览器控制服务器无法启动 Chrome/Brave/Edge/Chromium，并报错：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（以及许多 Linux 发行版）上，默认的 Chromium 安装是一个 **snap 包**。Snap 的 AppArmor 隔离会干扰 OpenClaw 启动和监控浏览器进程的方式。

`apt install chromium` 命令安装的是一个会重定向到 snap 的 stub 包：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这不是真正的浏览器——它只是一个包装器。

其他常见的 Linux 启动失败：

- `The profile appears to be in use by another Chromium process` 表示 Chrome
  在受管配置目录中找到了过期的 `Singleton*` 锁文件。OpenClaw 会
  删除这些锁，并在锁指向已失效或不同主机上的进程时重试一次。
- `Missing X server or $DISPLAY` 表示在没有桌面会话的主机上显式请求了
  可见浏览器。默认情况下，当 Linux 上 `DISPLAY` 和
  `WAYLAND_DISPLAY` 都未设置时，本地受管配置文件现在会回退到无头模式。
  如果你设置了 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless: false` 或
  `browser.profiles.<name>.headless: false`，请移除该有头覆盖，设置
  `OPENCLAW_BROWSER_HEADLESS=1`，启动 `Xvfb`，在一次性受管启动时运行
  `openclaw browser start --headless`，或者在真实桌面会话中运行 OpenClaw。

### 解决方案 1：安装 Google Chrome（推荐）

安装官方 Google Chrome `.deb` 包，它不会受到 snap 的沙盒限制：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # 如果有依赖错误
```

然后更新你的 OpenClaw 配置（`~/.openclaw/openclaw.json`）：

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### 解决方案 2：使用 Snap Chromium 的仅附加模式

如果你必须使用 snap Chromium，请将 OpenClaw 配置为附加到手动启动的浏览器：

1. 更新配置：

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. 手动启动 Chromium：

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. 可选地创建一个 systemd 用户服务以自动启动 Chrome：

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw 浏览器（Chrome CDP）
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

使用以下命令启用：`systemctl --user enable --now openclaw-browser.service`

### 验证浏览器是否正常工作

检查状态：

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

测试浏览：

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| 选项                             | 描述                                                          | 默认值                                                     |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `browser.enabled`                | 启用浏览器控制                                               | `true`                                                     |
| `browser.executablePath`         | Chromium 系浏览器二进制路径（Chrome/Brave/Edge/Chromium）   | 自动检测（在 Chromium 系中优先使用默认浏览器）            |
| `browser.headless`               | 无 GUI 运行                                                   | `false`                                                    |
| `OPENCLAW_BROWSER_HEADLESS`      | 本地受管浏览器无头模式的进程级覆盖                            | 未设置                                                     |
| `browser.noSandbox`              | 添加 `--no-sandbox` 标志（某些 Linux 环境需要）              | `false`                                                    |
| `browser.attachOnly`             | 不启动浏览器，只附加到已有浏览器                              | `false`                                                    |
| `browser.cdpPort`                | Chrome DevTools Protocol 端口                                  | `18800`                                                    |
| `browser.localLaunchTimeoutMs`   | 本地受管 Chrome 发现超时                                      | `15000`                                                   |
| `browser.localCdpReadyTimeoutMs` | 本地受管启动后 CDP 就绪超时                                    | `8000`                                                     |

在 Raspberry Pi、较旧的 VPS 主机或较慢的存储设备上，当 Chrome 需要更多时间
来暴露其 CDP HTTP 端点时，请提高 `browser.localLaunchTimeoutMs`。当启动成功，
但 `openclaw browser start` 仍报告 `not reachable after start` 时，请提高
`browser.localCdpReadyTimeoutMs`。这些值必须是正整数，且最多为 `120000`
毫秒；无效的配置值会被拒绝。

### 问题："未找到 profile=\"user\" 的 Chrome 标签页"

你正在使用 `existing-session` / Chrome MCP 配置文件。OpenClaw 可以看到本地 Chrome，
但没有可供附加的打开标签页。

修复选项：

1. **使用受管浏览器：** `openclaw browser start --browser-profile openclaw`
   （或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 确保本地 Chrome 正在运行且至少打开了一个标签页，然后使用 `--browser-profile user` 重试。

注意：

- `user` 仅适用于主机本地。对于 Linux 服务器、容器或远程主机，请优先使用 CDP 配置文件。
- `user` / 其他 `existing-session` 配置文件保留当前 Chrome MCP 限制：
  基于引用的操作、单文件上传钩子、无对话框超时覆盖、无
  `wait --load networkidle`，并且没有 `responsebody`、PDF 导出、下载
  拦截或批量操作。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；仅在远程 CDP 时设置这些值。
- 远程 CDP 配置文件接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当需要通过 `/json/version` 发现服务时使用 HTTP(S)，或者当浏览器
  服务提供直接的 DevTools socket URL 时使用 WS(S)。

## 相关

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 WSL2 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
