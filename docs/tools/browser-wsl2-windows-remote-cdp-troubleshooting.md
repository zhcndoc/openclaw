---
summary: "分层排查 WSL2 网关 + Windows Chrome 远程 CDP"
read_when:
  - 在 WSL2 中运行 OpenClaw Gateway，而 Chrome 运行在 Windows 上
  - 在 WSL2 和 Windows 之间看到重叠的浏览器/控制 UI 错误
  - 在分离主机环境中决定使用本机 Chrome MCP 还是原始远程 CDP
title: "WSL2 + Windows + 远程 Chrome CDP 故障排查"
---

在常见的分离主机设置中，OpenClaw Gateway 运行在 WSL2 内，Chrome 运行
在 Windows 上，而浏览器控制必须跨越 WSL2/Windows 边界。多个彼此独立的问题
可能会同时出现（参见
[issue #39369](https://github.com/openclaw/openclaw/issues/39369)）：CDP
传输、控制 UI 源安全性以及令牌/配对都可能各自失败，但会产生
看起来相似的错误。请按下面的层次依次排查，不要猜测到底是哪一层坏了。

## 先选择正确的浏览器模式

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用指向 Windows Chrome CDP 端点的远程浏览器配置文件。当 Gateway 保持在 WSL2 内部、Chrome 运行在 Windows 上，并且浏览器控制需要跨越 WSL2/Windows 边界时，选择此项。

### 选项 2：主机本地 Chrome MCP

仅当 Gateway 与 Chrome 运行在同一主机上、你希望使用本地已登录的浏览器状态、不需要跨主机浏览器传输，并且不需要 `responsebody`、PDF 导出、下载拦截或批量操作时，才使用 `existing-session` 驱动程序（`user` 配置文件）（Chrome MCP 配置文件不支持这些功能）。

对于 WSL2 Gateway + Windows Chrome，请使用原始远程 CDP。Chrome MCP 是主机本地模式，不是 WSL2 到 Windows 的桥梁。

## 工作架构

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway
- Windows 在普通浏览器中打开 Control UI，地址为 `http://127.0.0.1:18789/`
- Windows Chrome 在 `9222` 端口暴露一个 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向从 WSL2 可访问的地址。

## Control UI 的关键规则

当 UI 从 Windows 打开时，除非你有
有意设置的 HTTPS 配置，否则请使用 Windows localhost：

```text
http://127.0.0.1:18789/
```

不要默认使用局域网 IP。局域网或 tailnet 地址上的纯 HTTP
可能会触发与 CDP 本身无关的不安全来源/设备认证行为。参见
[Control UI](/web/control-ui)。

## 分层验证

从上到下逐层检查；不要跳步。修复上一层的问题后，仍可能会在更下面的一层看到不同错误。

### 第 1 层：验证 Chrome 是否在 Windows 上提供 CDP

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:LOCALAPPDATA\OpenClaw\ChromeCDP"
```

Chrome 136 及更高版本会忽略默认 Chrome 数据目录上的 remote-debugging 命令行开关。请像上面所示那样使用单独的、非默认的数据目录。请参见 Chrome 的 [remote-debugging security change](https://developer.chrome.com/blog/remote-debugging-port)。这不会使正常登录的 Chrome 配置文件变得可被远程控制。

先在 Windows 上验证 Chrome 本身：

```powershell
curl.exe http://127.0.0.1:9222/json/version
curl.exe http://127.0.0.1:9222/json/list
```

如果这一步失败，请先排查下面的 Windows 监听器。此时还不是 OpenClaw 的问题。

#### 在更改 portproxy 之前诊断 IPv4 和 IPv6

Chromium 会先尝试将远程调试绑定到 `127.0.0.1`，只有在 IPv4 绑定失败时才回退到 `[::1]`。一个持续存在的、监听 `127.0.0.1:9222` 的 `v4tov4` 规则可能会在 Chrome 启动前占用该端点。随后 Chrome 会回退到 `[::1]:9222`，而旧规则会将 IPv4 流量转发回它自己的监听器并返回空响应。

请直接在 Windows 上检查实际的监听器和代理规则，不要根据 Chrome 版本去推断：

```powershell
netstat -ano | findstr :9222
netsh interface portproxy show all
curl.exe http://127.0.0.1:9222/json/version
curl.exe http://[::1]:9222/json/version
```

对 `netstat` 中的每个 PID 使用 `tasklist /fi "PID eq <PID>"`。

- 如果 `chrome.exe` 在 `127.0.0.1` 上有响应，请移除任何同样监听 `127.0.0.1:9222` 的 portproxy 规则。只将 WSL2 可达的 Windows 适配器地址转发到 `127.0.0.1`。
- 如果 `chrome.exe` 只在 `[::1]` 上有响应，请使用 `v4tov6` 将 WSL2 可达的监听器指向 `::1`，而不是转发到一个未使用的 IPv4 地址：

  ```powershell
  netsh interface portproxy add v4tov6 listenaddress=WINDOWS_HOST_OR_IP listenport=9222 connectaddress=::1 connectport=9222
  ```

将监听器绑定到 WSL2 所需的适配器地址。不要将 CDP 端口暴露在 `0.0.0.0`、LAN 地址或 tailnet 地址上：CDP 会授予对浏览器会话的控制权。

### 第 2 层：验证 WSL2 是否能够访问该 Windows 端点

从 WSL2 测试你打算在 `cdpUrl` 中使用的精确地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

正确结果：

- `/json/version` 返回包含 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也可以）

如果这一步失败了，说明 Windows 还没有把端口暴露给 WSL2，或者该地址对 WSL2 侧来说不正确，或者缺少防火墙/端口转发/代理。先把这些问题修好，再去改 OpenClaw 配置。

### 第 3 层：配置正确的浏览器配置文件

将 OpenClaw 指向 WSL2 可访问的地址：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
      },
    },
  },
}
```

注意：

- 使用 WSL2 可访问的地址，不要用只有在 Windows 上才有效的地址
- 对于外部管理的浏览器，保持 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当你希望 OpenClaw 通过 `/json/version` 自动发现时，请使用 HTTP(S)
- 只有当浏览器提供方直接给你 DevTools 的 socket URL 时，才使用 WS(S)
- 在期待 OpenClaw 成功之前，先用 `curl` 测试相同的 URL

### 第 4 层：单独验证 Control UI 层

从 Windows 打开 `http://127.0.0.1:18789/`，然后验证：

- 页面 origin 与 `gateway.controlUi.allowedOrigins` 的预期一致
- token 认证或配对配置正确
- 你没有把 Control UI 的认证问题当成浏览器问题来排查

帮助页面：[Control UI](/web/control-ui)。

### 第 5 层：验证端到端的浏览器控制

从 WSL2 执行：

```bash
openclaw browser --browser-profile remote open https://example.com
openclaw browser --browser-profile remote tabs
```

正确结果：

- 标签页会在 Windows 的 Chrome 中打开
- `browser tabs` 会返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）可以在同一个配置文件下正常工作。

## 常见的误导性错误

| 消息                                                                                  | 含义                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `control-ui-insecure-auth`                                                            | UI 源／安全上下文问题，不是 CDP 传输问题                                                                                                                                           |
| `token_missing`                                                                       | 认证配置问题                                                                                                                                                                      |
| `pairing required`                                                                    | 设备批准问题                                                                                                                                                                      |
| `Remote CDP for profile "remote" is not reachable`                                    | WSL2 无法访问已配置的 `cdpUrl`                                                                                                                                                     |
| empty CDP reply ／ `other side closed` through a portproxy                            | Windows 监听不匹配或自环；请检查两个 loopback 地址族以及 `netsh interface portproxy show all`                                                                                     |
| `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable` | HTTP 端点已响应，但无法打开 DevTools WebSocket                                                                                                                                   |
| stale viewport ／ dark-mode ／ locale ／ offline overrides after a remote session     | 运行 `openclaw browser --browser-profile remote stop` 以关闭会话，并释放缓存的 Playwright／CDP 连接，而无需重启 Gateway 或外部浏览器                                          |
| timeout during CDP reachability                                                        | 通常仍然是 CDP 可达性问题，或者远程端点缓慢／不可达                                                                                                                              |
| `Playwright page enumeration timed out after 3000ms`                                  | 远程 CDP 已连接，但其持久标签页读取卡住了                                                                                                                                         |
| `No Chrome tabs found for profile="user"`                                             | 选择了本地 Chrome MCP 配置文件，但当前没有可用的主机本地标签页                                                                                                                   |

## 快速分诊清单

1. Windows：`127.0.0.1` 或 `[::1]` 中哪一个能在 `/json/version` 上响应，并且
   这个监听是否属于 `chrome.exe`？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 是否可用？
3. OpenClaw config：`browser.profiles.<name>.cdpUrl` 是否使用了那个完全相同
   的、WSL2 可访问的地址？
4. Control UI：你是否打开的是 `http://127.0.0.1:18789/`，而不是 LAN IP？
5. 你是否试图在 WSL2 和 Windows 之间使用 `existing-session`，而不是原始的远程 CDP？

先在本地验证 Windows 上的 Chrome 端点，再从 WSL2 验证同一个端点，
然后才去排查 OpenClaw 配置或 Control UI 认证。

## 相关内容

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
