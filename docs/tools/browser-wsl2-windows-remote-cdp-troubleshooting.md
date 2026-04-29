---
summary: "分层排查 WSL2 网关 + Windows Chrome 远程 CDP"
read_when:
  - 在 WSL2 中运行 OpenClaw Gateway，而 Chrome 运行在 Windows 上
  - 在 WSL2 和 Windows 之间看到重叠的浏览器/控制 UI 错误
  - 在分离主机环境中决定使用本机 Chrome MCP 还是原始远程 CDP
title: "WSL2 + Windows + 远程 Chrome CDP 故障排查"
---

在常见的分离主机设置中，OpenClaw Gateway 运行在 WSL2 内部，Chrome 运行在 Windows 上，而浏览器控制必须跨越 WSL2 和 Windows 的边界。[issue #39369](https://github.com/openclaw/openclaw/issues/39369) 中的分层故障模式意味着多个独立问题可能会同时出现，这会让错误的层看起来最先坏掉。

## 先选择正确的浏览器模式

你有两种有效模式：

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用远程浏览器配置，让它从 WSL2 指向 Windows Chrome 的 CDP 端点。

在以下情况下选择此项：

- Gateway 保持运行在 WSL2 中
- Chrome 运行在 Windows 上
- 你需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：本机 Chrome MCP

仅当 Gateway 自身运行在与 Chrome 相同的主机上时，才使用 `existing-session` / `user`。

在以下情况下选择此项：

- OpenClaw 和 Chrome 在同一台机器上
- 你想要本地已登录的浏览器状态
- 你不需要跨主机浏览器传输
- 你不需要高级的受管/仅原始-CDP 路由，例如 `responsebody`、PDF
  导出、下载拦截或批量操作

对于 WSL2 Gateway + Windows Chrome，优先使用原始远程 CDP。Chrome MCP 是本机模式，不是 WSL2 到 Windows 的桥接。

## 工作架构

参考形态：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway
- Windows 在普通浏览器中打开 Control UI，地址为 `http://127.0.0.1:18789/`
- Windows Chrome 在 `9222` 端口上暴露一个 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置指向 WSL2 可访问的地址

## 为什么这个设置会让人困惑

可能会同时出现多种失败：

- WSL2 无法访问 Windows CDP 端点
- Control UI 是从不安全来源打开的
- `gateway.controlUi.allowedOrigins` 与页面来源不匹配
- 缺少 token 或配对
- 浏览器配置指向了错误的地址

因此，修复一层之后，仍然可能看到另一层的错误。

## Control UI 的关键规则

当 UI 从 Windows 打开时，除非你有明确的 HTTPS 设置，否则请使用 Windows localhost。

使用：

`http://127.0.0.1:18789/`

不要默认使用 LAN IP 作为 Control UI 地址。LAN 或 tailnet 地址上的明文 HTTP 可能会触发与不安全来源/设备认证相关的行为，这与 CDP 本身无关。参见 [Control UI](/web/control-ui)。

## 分层验证

自上而下排查。不要跳步。

### 第 1 层：验证 Chrome 是否在 Windows 上提供 CDP

在 Windows 上启用远程调试启动 Chrome：

```powershell
chrome.exe --remote-debugging-port=9222
```

从 Windows 先验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果这一步在 Windows 上就失败了，那么还不是 OpenClaw 的问题。

### 第 2 层：验证 WSL2 能否访问该 Windows 端点

从 WSL2 测试你打算在 `cdpUrl` 中使用的精确地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

正确结果：

- `/json/version` 返回包含 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也可以）

如果这一步失败：

- Windows 还没有向 WSL2 暴露该端口
- 对于 WSL2 端来说地址不正确
- 防火墙 / 端口转发 / 本地代理仍然缺失

在修改 OpenClaw 配置之前先修复这个问题。

### 第 3 层：配置正确的浏览器配置文件

对于原始远程 CDP，请将 OpenClaw 指向 WSL2 可访问的地址：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

注意：

- 使用 WSL2 可访问的地址，不要使用仅在 Windows 上可用的地址
- 对外部管理的浏览器保持 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当你希望 OpenClaw 发现 `/json/version` 时使用 HTTP(S)
- 只有当浏览器提供方给你直接的 DevTools socket URL 时才使用 WS(S)
- 在期望 OpenClaw 成功之前，先用 `curl` 测试同一个 URL

### 第 4 层：单独验证 Control UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面来源与 `gateway.controlUi.allowedOrigins` 的预期一致
- token 认证或配对配置正确
- 你没有把 Control UI 认证问题当成浏览器问题来排查

有帮助的页面：

- [Control UI](/web/control-ui)

### 第 5 层：验证端到端浏览器控制

从 WSL2 执行：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

正确结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）可以通过同一配置文件正常工作

## 常见的误导性错误

把每条消息都当作对应层的线索：

- `control-ui-insecure-auth`
  - UI 来源 / 安全上下文问题，不是 CDP 传输问题
- `token_missing`
  - 认证配置问题
- `pairing required`
  - 设备批准问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问所配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端点已响应，但仍无法打开 DevTools WebSocket
- 远程会话后 viewport / 深色模式 / locale / offline 覆盖状态残留
  - 运行 `openclaw browser stop --browser-profile remote`
  - 这会关闭活动控制会话，并释放 Playwright/CDP 的模拟状态，而无需重启 gateway 或外部浏览器
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 可达性问题，或者远程端点较慢/不可达
- `No Chrome tabs found for profile="user"`
  - 选择了本机 Chrome MCP 配置文件，但没有可用的本机标签页

## 快速分诊清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 能工作吗？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能工作吗？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了那个精确的、WSL2 可访问的地址？
4. Control UI：你打开的是 `http://127.0.0.1:18789/`，而不是 LAN IP 吗？
5. 你是不是在尝试跨 WSL2 和 Windows 使用 `existing-session`，而不是原始远程 CDP？

## 实用结论

这个设置通常是可行的。难点在于，浏览器传输、Control UI 来源安全，以及 token/配对，可能会彼此独立失败，但从用户角度看又很相似。

拿不准时：

- 先在本机验证 Windows Chrome 端点
- 再从 WSL2 验证同一个端点
- 然后才去排查 OpenClaw 配置或 Control UI 认证

## 相关内容

- [Browser](/tools/browser)
- [Browser login](/tools/browser-login)
- [Browser Linux troubleshooting](/tools/browser-linux-troubleshooting)
