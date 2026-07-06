---
summary: "在将 OpenClaw Gateway 暴露到 loopback 之外之前的预检与回滚清单"
title: "Gateway 暴露操作手册"
sidebarTitle: "暴露操作手册"
read_when:
  - 通过 LAN、tailnet、Tailscale Serve、Funnel 或反向代理暴露 Gateway
  - 在允许真实消息用户之前审查部署
  - 回滚有风险的远程访问或 DM 配置
---

<Warning>
只有在你能够解释谁可以访问它、他们如何完成身份验证、他们可以触发哪些 agents，以及这些 agents 可以使用哪些 tools 之后，才暴露 Gateway。若有疑问，请恢复为仅限 loopback 访问并重新执行审计。
</Warning>

本操作手册将更广泛的 [Security](/gateway/security) 指南转化为面向远程访问和消息暴露的运维检查清单。

## 选择暴露模式

优先选择满足工作流的最窄模式。

| 模式                      | 适用情况                                         | 必需控制项                                                                                                                   |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Loopback + SSH 隧道       | 个人使用、管理员访问、调试                      | 保持 `gateway.bind: "loopback"`，并通过隧道访问 `127.0.0.1:18789`                                                          |
| Loopback + Tailscale Serve | 个人 tailnet 访问控制 UI/WebSocket              | 保持 Gateway 仅绑定 loopback；Tailscale 身份头仅用于认证 Control UI 的 WebSocket 表面，不用于其他认证路径 |
| Tailnet/LAN 绑定           | 面向已知设备的专用私有网络                       | Gateway 认证、防火墙允许列表、禁止公网端口转发                                                                           |
| 受信任的反向代理           | Gateway 前置组织 SSO/OIDC                       | `trusted-proxy` 认证、严格的 `trustedProxies`、请求头覆盖/剥离规则、显式允许用户                                       |
| 公网                        | 少见的高风险部署                                 | 身份感知代理、TLS、速率限制、严格允许列表、隔离的非主会话                                                            |

避免直接将 Gateway 暴露到公网并进行端口转发。如果必须提供公网访问，请在其前面放置一个身份感知代理，并让该代理成为访问 Gateway 的唯一网络路径。

## 预检清单

在更改 bind、proxy、Tailscale 或 channel policy 之前记录以下内容：

- Gateway 主机、OS 用户和状态目录（默认 `~/.openclaw`）。
- Gateway URL 和 bind 模式（`gateway.bind`；默认端口 `18789`）。
- Auth 模式、token/password 来源，或受信任代理身份来源。
- 每个已启用的 channel，以及它是否接受 DM、group 或 webhook。
- 可从非本地发送者访问的 agent。
- 每个可访问 agent 的 tool profile、sandbox 模式和 elevated tool policy。
- 这些 agent 可用的外部凭证。
- `~/.openclaw/openclaw.json` 和凭证的备份位置。

如果有多于一人可以向 bot 发消息，请将其视为共享的委托
工具权限，而不是按用户划分的主机隔离。

## 基线检查

在开放访问前运行：

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

先解决关键问题。只有在部署中有意且已记录时，才接受警告。有关每个 `checkId` 的含义及其修复键，请参见 [安全审计检查](/gateway/security/audit-checks)。

对于远程 CLI 验证，请显式传入凭据：

```bash
openclaw gateway probe --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

不要假定本地配置中的凭据适用于显式指定的远程 URL。

## 最小安全基线

使用以下结构作为暴露部署的起点：

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

一次只放宽一个控制项：在启用可写工具之前添加特定的频道允许列表，或者在接受远程 Control UI 流量之前启用反向代理。

`tools.exec.security: "deny"` 会阻止所有 exec 调用，包括无害的诊断命令。如果需要诊断或低风险命令，请仅在选择了与你的威胁模型相匹配的特定发送方、代理、命令和审批模式之后，再放宽此项。

## DM 和群组暴露

消息通道是不可信的输入面。 在允许 DM 或群组之前：

- 优先使用 `dmPolicy: "pairing"` 或严格的 `allowFrom` 列表，而不是 `dmPolicy: "open"`。
- 不要将 `"*"` 允许列表与广泛的工具访问权限结合使用。
- 在群组中要求提及，除非房间被严格控制。
- 当多人可以向 bot 发送 DM 时，设置 `session.dmScope: "per-channel-peer"`（对于多账号通道则使用 `"per-account-channel-peer"`），这样 DM 会话就不会共享上下文。
- 将共享通道路由给只具备最少工具且不持有个人凭据的 agent。

pairing 只是批准发送者触发 bot，并不会让该发送者成为单独的主机安全边界。

## 反向代理检查

对于身份感知代理：

- 代理在转发到 Gateway 之前必须先对用户进行身份验证。
- 防火墙或网络策略必须阻止对 Gateway 端口的直接访问。
- `gateway.trustedProxies` 必须只列出代理源 IP。
- 代理必须清除或覆盖客户端提供的身份和转发
  标头。
- 当代理服务于多个
  受众时，设置 `gateway.auth.trustedProxy.allowUsers`。
- 仅对同主机代理使用 `gateway.auth.trustedProxy.allowLoopback`，前提是本地进程是受信任的，并且该代理拥有身份标头。

在代理更改后运行 `openclaw security audit --deep`。受信任代理
发现具有高信号，因为代理会成为身份验证
边界。

## 工具与沙箱审查

在将 agent 暴露给远程发送者之前：

- 确认哪些会话运行在主机上，哪些运行在沙箱中。
- 拒绝主机执行，或要求审批后才能执行。
- 除非某个特定且可信的发送者确实需要，否则保持高权限工具禁用。
- 对于开放或半开放的消息交互场景，避免使用浏览器、画布、节点、cron、网关和会话生成工具。
- 保持绑定挂载范围尽可能窄；避免使用凭据、主目录、Docker 套接字和系统路径。
- 对于实质上不同的信任边界，使用不同的网关、操作系统用户或主机。

如果远程用户并非完全可信，隔离必须来自独立部署，而不能仅依赖提示词或会话标签。

## 变更后的验证

每次暴露变更后：

1. 重新运行 `openclaw security audit --deep`。
2. 确认成功的授权连接可以正常成功。
3. 确认未经授权的发送方或浏览器会话被拒绝。
4. 确认日志会对密钥进行脱敏。
5. 确认 DM/群组路由仅到达预期的代理。
6. 确认高影响工具会请求批准或被拒绝。
7. 记录已接受的残余警告。

在理解当前暴露变更之前，不要继续进行下一项。

## 回滚计划

如果 Gateway 可能暴露过度：

```json5
{
  gateway: {
    bind: "loopback",
  },
  channels: {
    whatsapp: { dmPolicy: "disabled" },
    telegram: { dmPolicy: "disabled" },
    discord: { dmPolicy: "disabled" },
    slack: { dmPolicy: "disabled" },
  },
  tools: {
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

然后：

1. 停止公网转发、Tailscale Funnel 或反向代理路由。
2. 轮换 Gateway tokens/passwords 和受影响的集成凭据。
3. 从白名单中移除 `"*"` 和意外的发送者。
4. 审查最近的审计日志、运行历史、tool 调用和配置变更。
5. 重新运行 `openclaw security audit --deep`。
6. 使用满足工作流的最窄模式重新启用访问。

## 审查清单

- Gateway 仍保持仅限 loopback，除非有记录在案的理由。
- 非 loopback 访问具备认证、防火墙控制且没有公网直连路径。
- Trusted-proxy 部署具有严格的代理 IP 和标头控制。
- DMs 使用配对或 allowlist，而不是默认开放访问。
- Groups 需要 mention 或显式 allowlist。
- 共享 channels 不应接触个人凭据。
- 非主会话在 sandbox 模式中运行。
- 主机 exec 和 elevated tools 被拒绝或受审批门控。
- 日志对 secrets 脱敏。
- 关键审计发现已解决。
- 回滚步骤已测试并记录。
