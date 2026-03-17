---
summary: "修复 Linux 上 OpenClaw 浏览器控制中 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "浏览器控制在 Linux 上失败，特别是在 snap Chromium 上"
title: "浏览器故障排除"
---

# 浏览器故障排除（Linux）

## 问题："Failed to start Chrome CDP on port 18800"

OpenClaw 的浏览器控制服务器启动 Chrome/Brave/Edge/Chromium 失败，报错：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（及许多 Linux 发行版）上，默认的 Chromium 安装是一个 **snap 包**。Snap 的 AppArmor 限制会干扰 OpenClaw 启动和监控浏览器进程的方式。

`apt install chromium` 命令安装的是一个重定向到 snap 的存根包：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这并不是真正的浏览器——它只是一个包装器。

### 解决方案 1：安装谷歌 Chrome（推荐）

安装官方的 Google Chrome `.deb` 包，它不是通过 snap 进行沙箱限制的：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # 如果有依赖错误
```

然后更新你的 OpenClaw 配置文件（`~/.openclaw/openclaw.json`）：

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

如果必须使用 snap Chromium，配置 OpenClaw 以附加到手动启动的浏览器：

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

3. 可选地创建 systemd 用户服务自动启动 Chrome：

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw 浏览器 (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

启用：

```bash
systemctl --user enable --now openclaw-browser.service
```

### 验证浏览器是否正常工作

查看状态：

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

测试浏览：

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| 选项                      | 描述                                                                 | 默认值                                                       |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `browser.enabled`         | 启用浏览器控制                                                       | `true`                                                       |
| `browser.executablePath`  | 指定 Chromium 内核浏览器（Chrome/Brave/Edge/Chromium）的可执行文件路径 | 自动检测（优先使用基于 Chromium 的默认浏览器）               |
| `browser.headless`        | 无界面模式运行                                                      | `false`                                                      |
| `browser.noSandbox`       | 添加 `--no-sandbox` 参数（某些 Linux 环境需要）                      | `false`                                                      |
| `browser.attachOnly`      | 不启动浏览器，仅附加到已存在进程                                    | `false`                                                      |
| `browser.cdpPort`         | Chrome DevTools 协议端口                                            | `18800`                                                      |

### 问题："No Chrome tabs found for profile=\"user\""

你正在使用 `existing-session` / Chrome MCP 配置文件。OpenClaw 可以看到本地 Chrome，
但没有可附加的打开标签页。

解决方案：

1. **使用托管浏览器：** `openclaw browser start --browser-profile openclaw`
   （或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 确保本地 Chrome 正在运行并且至少有一个打开的标签页，然后用 `--browser-profile user` 重试。

备注：

- `user` 是仅限本机的。对于 Linux 服务器、容器或远程主机，推荐使用 CDP 配置文件。
- 本地的 `openclaw` 配置文件会自动分配 `cdpPort` / `cdpUrl`；仅针对远程 CDP 设置这些。
