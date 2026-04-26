---
summary: "分层排查 WSL2 网关 + Windows 上 Chrome 远程 CDP 问题"
read_when:
  - 在 WSL2 中运行 OpenClaw 网关，同时 Chrome 运行于 Windows 上
  - 看到浏览器/控制界面在 WSL2 和 Windows 之间出现重叠错误
  - 在分布式主机设置中，在本地主机 Chrome MCP 和纯远程 CDP 之间做选择
title: "WSL2 + Windows + 远程 Chrome CDP 排查指南"
---

本指南涵盖了常见的分离主机部署场景：

- OpenClaw 网关运行在 WSL2 内
- Chrome 运行在 Windows 上
- 浏览器控制必须跨越 WSL2/Windows 边界

还包括来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层失败模式：多个独立问题可能同时出现，导致错误的层看起来先坏了。

## 首先选择正确的浏览器模式

你有两种有效模式：

### 选项 1：从 WSL2 到 Windows 的纯远程 CDP

使用指向 Windows Chrome CDP 端点的远程浏览器配置文件。

适用情形：

- 网关保持在 WSL2 内部
- Chrome 运行在 Windows 上
- 需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：主机本地 Chrome MCP

仅当网关和 Chrome 运行在同一主机时，使用 `existing-session` / `user`。

适用情形：

- OpenClaw 和 Chrome 运行在同一台机器上
- 你想要本地已登录的浏览器状态
- 你不需要跨主机浏览器传输
- 你不需要诸如 `responsebody`、PDF 导出、下载拦截或批量操作这类高级的受管/仅原始 CDP 路由

对于 WSL2 网关 + Windows Chrome，推荐使用纯远程 CDP。Chrome MCP 是主机本地的，不是 WSL2 到 Windows 的桥接。

## 工作架构

参考结构：

- WSL2 在 `127.0.0.1:18789` 运行网关
- Windows 在正常浏览器中打开控制界面，地址为 `http://127.0.0.1:18789/`
- Windows Chrome 在端口 `9222` 暴露 CDP 端点
- WSL2 能够访问该 Windows CDP 端点
- OpenClaw 指向一个 WSL2 可达的浏览器配置地址

## 为什么这个设置容易让人困惑

多个失败可能重叠出现：

- WSL2 无法访问 Windows CDP 端点
- 控制界面从非安全源打开
- `gateway.controlUi.allowedOrigins` 不匹配页面源
- 缺少令牌或配对信息
- 浏览器配置指向错误地址

因此，修复了某一层错误后，其他错误仍然可能显现。

## 控制界面的关键规则

当 UI 从 Windows 打开时，使用 Windows 本地主机地址，除非你有明确的 HTTPS 配置。

使用：

`http://127.0.0.1:18789/`

不要默认使用局域网 IP 打开控制界面。在局域网或 tailnet 地址上使用纯 HTTP，可能触发与 CDP 本身无关的不安全源/设备认证问题。详见 [控制界面](/web/control-ui)。

## 分层验证

从上到下排查。不要跳层。

### 第1层：确认 Chrome 在 Windows 上正常提供 CDP 服务

在 Windows 上启动 Chrome，启用远程调试端口：

```powershell
chrome.exe --remote-debugging-port=9222
```

先在 Windows 上确认 Chrome：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果 Windows 上失败，OpenClaw 还不是问题。

### 第2层：确认 WSL2 可以访问该 Windows 端点

在 WSL2 中测试你计划在 `cdpUrl` 使用的准确地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

良好结果：

- `/json/version` 返回包含浏览器/协议版本元数据的 JSON
- `/json/list` 返回 JSON（如果无页面打开，空数组也正常）

若失败：

- Windows 还未向 WSL2 暴露端口
- WSL2 侧地址错误
- 防火墙 / 端口转发 / 本地代理配置缺失

解决后再修改 OpenClaw 配置。

### 第3层：配置正确的浏览器配置文件

对于纯远程 CDP，将 OpenClaw 指向 WSL2 可达的地址：

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

- 使用 WSL2 可达的地址，而不是只在 Windows 上可用的那个
- 对于外部管理的浏览器，保留 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当你希望 OpenClaw 发现 `/json/version` 时，使用 HTTP(S)
- 仅当浏览器提供方给你一个直接的 DevTools socket URL 时，才使用 WS(S)
- 在期望 OpenClaw 成功之前，先用 `curl` 测试同一个 URL

### 第4层：单独验证控制界面层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后确认：

- 页面源与 `gateway.controlUi.allowedOrigins` 期望匹配
- 令牌认证或配对配置正确
- 你不是把控制界面的认证问题误当成浏览器问题排查

参考页面：

- [控制界面](/web/control-ui)

### 第5层：验证端到端浏览器控制

在 WSL2 中执行：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

良好结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）都能使用同一配置正常工作

## 常见误导错误

将每条信息视为层级线索：

- `control-ui-insecure-auth`
  - UI 来源 / 安全上下文问题，不是 CDP 传输问题
- `token_missing`
  - 认证配置问题
- `pairing required`
  - 设备授权问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问所配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端点已响应，但 DevTools WebSocket 仍无法打开
- 远程会话后出现陈旧的 viewport / 深色模式 / 区域设置 / 离线覆盖
  - 运行 `openclaw browser stop --browser-profile remote`
  - 这会关闭当前控制会话，并释放 Playwright/CDP 的仿真状态，而无需重启网关或外部浏览器
- `gateway timeout after 1500ms`
  - 常见仍是 CDP 可访问性问题，或者远端端点过慢/不可达
- `No Chrome tabs found for profile="user"`
  - 选择了本地主机 Chrome MCP 配置，但无本地主机标签页

## 快速排查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 能否成功？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能否成功？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否用的是 WSL2 可达的地址？
4. 控制界面：是否打开 `http://127.0.0.1:18789/` 而非局域网 IP？
5. 是否尝试跨 WSL2 和 Windows 使用 `existing-session`，而非纯远程 CDP？

## 实用结论

该设置通常是可行的。难点在于浏览器传输、控制界面源安全和令牌/配对可以独立失败，但用户看到的错误表现相似。

有疑问时：

- 先在本地验证 Windows Chrome 端点
- 再从 WSL2 验证同一端点
- 只有这样之后，才去调试 OpenClaw 配置或控制界面认证

## 相关内容

- [Browser](/tools/browser)
- [Browser login](/tools/browser-login)
- [Browser Linux troubleshooting](/tools/browser-linux-troubleshooting)
