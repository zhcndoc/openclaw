---
summary: "修复 Linux 上 OpenClaw 浏览器控件的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "当 Linux 上的浏览器控制失败时，尤其是在使用 snap Chromium 时"
title: "浏览器故障排查"
---

## <a id="problem%3A-failed-to-start-chrome-cdp-on-port-18800"></a><a id="problem-failed-to-start-chrome-cdp-on-port-18800"></a> 问题：无法在端口 18800 启动 Chrome CDP

```json
{ "error": "Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"." }
```

### <a id="root-cause"></a> 根本原因

在 Ubuntu 和大多数 Linux 发行版上，`apt install chromium` 安装的是 snap 包装器，而不是真正的浏览器：

```text
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

Snap 的 AppArmor 隔离会干扰 OpenClaw 启动和监控浏览器进程的方式。

其他常见的 Linux 启动失败：

- `The profile appears to be in use by another Chromium process`：托管配置文件目录中的过时 `Singleton*` 锁定文件。当锁指向当前主机上的死进程时，OpenClaw 会删除这些锁并重试一次。命名另一个主机名的锁将被保留，直到您验证该配置文件不再使用，包括在计算机重命名之后。
- `Missing X server or $DISPLAY`：在没有桌面会话的主机上显式请求可见浏览器。本地托管配置文件默认使用无头模式，包括当桌面会话可用时。如果设置 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless: false` 或 `browser.profiles.<name>.headless: false`，请删除该引导覆盖，设置 `OPENCLAW_BROWSER_HEADLESS=1`，启动 `Xvfb`，运行 `openclaw browser start --headless` 进行一次性托管启动，或在真实桌面会话中运行 OpenClaw。

### <a id="solution-1%3A-install-google-chrome-(recommended)"></a><a id="solution-1-install-google-chrome-recommended"></a> 方案 1：安装 Google Chrome（推荐）

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
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

### <a id="solution-2%3A-use-snap-chromium-in-attach-only-mode"></a><a id="solution-2-use-snap-chromium-in-attach-only-mode"></a> 方案 2：在仅附加模式下使用 snap Chromium

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
Description=OpenClaw Browser (Chrome CDP)
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

### <a id="verify-the-browser-works"></a> 验证浏览器是否工作正常

这些调用将转到 OpenClaw 浏览器控制服务，而不是上面使用的 Chrome CDP 端口。它的端口源自 `gateway.port`（默认 `18791` = 网关端口 + 2），因此如果移动了网关端口，请调整该数字。 `jq` 仅漂亮地打印响应；如果您没有安装管道，请将其丢弃。

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### <a id="config-reference"></a> 配置参考

| 选项                      | 描述                                                          | 默认值                                                            |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `browser.enabled`           | 启用浏览器控制                                               | `true`                                                             |
| `browser.executablePath`    | 基于 Chromium- 的浏览器二进制文件的路径 （Chrome/Brave/Edge/Chromium） | 自动检测（基于 Chromium- 时首选 OS 默认浏览器） |
| `browser.headless`          | 在没有 GUI 的情况下运行                                                      | `true`                                                             |
| `OPENCLAW_BROWSER_HEADLESS` | 本地受管浏览器无头模式的按进程覆盖项         | 未设置                                                              |
| `browser.noSandbox`         | 添加 `--no-sandbox` 标志（某些 Linux 环境需要）               | `false`                                                            |
| `browser.attachOnly`        | 不启动浏览器；仅附加到现有浏览器              | `false`                                                            |

在 Raspberry Pi、较旧的 VPS 主机或慢速存储上，当 Chrome 需要比受管浏览器截止时间更长的时间来暴露其 CDP HTTP 端点或进入就绪状态时，请使用手动启动的浏览器并配合 `attachOnly`。

## <a id="problem%3A-no-chrome-tabs-found-for-profile%3D%22user%22"></a><a id="problem-no-chrome-tabs-found-for-profile=user"></a> 问题：找不到 profile="user" 的 Chrome 选项卡

你正在使用 `user`（`existing-session` / Chrome MCP）配置文件，并且没有可供附加的打开标签页。

修复选项：

1. 改为使用管理型浏览器： `openclaw browser --browser-profile openclaw start`（或者设置 `browser.defaultProfile: "openclaw"`）。
2. 保持本地 Chrome 运行，并至少打开一个标签页，然后重试 `--browser-profile user`。

注意：

- `user` 仅限主机本地。在 Linux 服务器、容器或远程主机上，请优先使用 CDP 配置文件。
- `user` 和其他 `existing-session` 配置文件共享当前 Chrome MCP 的限制： 仅支持基于引用的操作、每次上传一个文件、对话框不支持 `timeoutMs` 覆盖、不支持 `wait --load networkidle`，也不支持 `responsebody`、PDF 导出、 下载拦截或批量操作。
- Local `openclaw`- 驱动程序配置文件在 OpenClaw 创建它们时获得分配的 `cdpPort` ；您手动声明的配置文件必须设置 `cdpPort` 本身，或 `cdpUrl`（用于远程 CDP）。
- 远程 CDP 配置文件接受 `http://`、`https://`、`ws://` 和 `wss://`。使用 HTTP（S） 进行 `/json/version` 发现，或在浏览器服务为您提供直接 DevTools 套接字 URL 时使用 WS（S）。

## <a id="related"></a> 相关内容

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
