---
summary: "修复 Linux 上 OpenClaw 浏览器控制的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "当 Linux 上的浏览器控制失败时，尤其是在使用 snap Chromium 时"
title: "浏览器故障排查"
---

## 问题：无法在端口 18800 启动 Chrome CDP

```json
{ "error": "错误：无法在端口 18800 为配置文件 \"openclaw\" 启动 Chrome CDP。" }
```

### 根本原因

在 Ubuntu 和大多数 Linux 发行版上，`apt install chromium` 安装的是 snap
包装器，而不是真正的浏览器：

```text
注意，选择了 'chromium-browser' 而不是 'chromium'
chromium-browser 已经是最新版本（2:1snap1-0ubuntu2）。
```

Snap 的 AppArmor 隔离会干扰 OpenClaw 启动和监控浏览器进程的方式。

其他常见的 Linux 启动失败：

- `The profile appears to be in use by another Chromium process`: 管理型配置文件目录中残留的
  `Singleton*` 锁文件。如果锁指向一个已死亡或来自其他主机的进程，OpenClaw 会移除这些锁并重试一次。
- `Missing X server or $DISPLAY`: 在没有桌面会话的主机上显式请求了可见浏览器。当地管理型配置文件在 Linux 上当 `DISPLAY` 和 `WAYLAND_DISPLAY` 都未设置时会回退到无头模式。
  如果你设置了 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless: false` 或 `browser.profiles.<name>.headless: false`，请移除该有头覆盖项，设置
  `OPENCLAW_BROWSER_HEADLESS=1`，启动 `Xvfb`，运行
  `openclaw browser start --headless` 进行一次性的管理型启动，或者在真正的桌面会话中运行
  OpenClaw。

### 方案 1：安装 Google Chrome（推荐）

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # 如果有依赖错误
```

更新 `~/.openclaw/openclaw.json`：

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

### 方案 2：在仅附加模式下使用 snap Chromium

如果你必须保留 snap Chromium，请将 OpenClaw 配置为附加到手动启动的浏览器，而不是启动它：

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

手动启动 Chromium：

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

也可以选择使用 systemd 用户服务自动启动它：

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

```bash
systemctl --user enable --now openclaw-browser.service
```

### 验证浏览器是否工作正常

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| Option                      | Description                                                          | Default                                                            |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `browser.enabled`           | 启用浏览器控制                                                      | `true`                                                             |
| `browser.executablePath`    | Chromium 系浏览器二进制文件路径（Chrome/Brave/Edge/Chromium）        | 自动检测（在 Chromium 系浏览器可用时优先使用系统默认浏览器）       |
| `browser.headless`          | 无界面运行                                                          | `false`                                                            |
| `OPENCLAW_BROWSER_HEADLESS` | 本地受管浏览器无头模式的按进程覆盖项                                  | 未设置                                                             |
| `browser.noSandbox`         | 添加 `--no-sandbox` 标志（某些 Linux 环境需要）                      | `false`                                                            |
| `browser.attachOnly`        | 不启动浏览器；仅附加到现有浏览器                                     | `false`                                                            |

在 Raspberry Pi、较旧的 VPS 主机或慢速存储上，当 Chrome 需要比受管浏览器截止时间更长的时间来暴露其 CDP HTTP
端点或进入就绪状态时，请使用手动启动的浏览器并配合 `attachOnly`。

### 问题：未找到 profile="user" 的 Chrome 标签页

你正在使用 `user`（`existing-session` / Chrome MCP）配置文件，并且没有
可供附加的打开标签页。

修复选项：

1. 改为使用管理型浏览器：
   `openclaw browser --browser-profile openclaw start`（或者设置
   `browser.defaultProfile: "openclaw"`）。
2. 保持本地 Chrome 运行，并至少打开一个标签页，然后重试
   `--browser-profile user`。

注意：

- `user` 仅限主机本地。在 Linux 服务器、容器或远程主机上，请优先
  使用 CDP 配置文件。
- `user` 和其他 `existing-session` 配置文件共享当前 Chrome MCP 的限制：
  仅支持基于引用的操作、每次上传一个文件、对话框不支持 `timeoutMs`
  覆盖、不支持 `wait --load networkidle`，也不支持 `responsebody`、PDF 导出、
  下载拦截或批量操作。
- 本地 `openclaw` 驱动的配置文件会自动分配 `cdpPort`/`cdpUrl`；只有在远程 CDP
  时才手动设置这些值。
- 远程 CDP 配置文件接受 `http://`、`https://`、`ws://` 和 `wss://`。
  使用 HTTP(S) 进行 `/json/version` 发现，或者当浏览器服务提供直接的 DevTools 套接字 URL 时使用 WS(S)。

## 相关

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 WSL2 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
