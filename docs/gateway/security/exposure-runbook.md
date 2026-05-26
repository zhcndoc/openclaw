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

| 模式                       | 适用场景                                           | 必需控制                                                                                         |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Loopback + SSH 隧道        | 个人使用、管理访问、调试                            | 保持 `gateway.bind: "loopback"` 并隧道转发 `127.0.0.1:18789`                                      |
| Loopback + Tailscale Serve | 面向 Control UI/WebSocket 的个人 tailnet 访问      | 保持 Gateway 仅限 loopback；仅对受支持的表面依赖 Tailscale 身份标头                             |
| Tailnet/LAN bind           | 拥有已知设备的专用私有网络                          | Gateway 认证、防火墙白名单、无公网端口转发                                                       |
| Trusted reverse proxy      | 在 Gateway 前使用组织 SSO/OIDC                      | `trusted-proxy` 认证、严格的 `trustedProxies`、标头覆盖/剥离规则、明确的允许用户                  |
| 公网                        | 罕见、高风险部署                                    | 身份感知代理、TLS、速率限制、严格白名单、隔离的非主会话                                          |

避免直接将公网端口转发到 Gateway。如果你需要公网访问，请在其前面放置一个身份感知代理，并让该代理成为访问 Gateway 的唯一网络路径。

## 预检清单

在更改 bind、proxy、Tailscale 或 channel policy 之前记录以下内容：

- Gateway 主机、OS 用户和状态目录。
- Gateway URL 和 bind 模式。
- Auth 模式、token/password 来源，或 trusted proxy 身份来源。
- 所有已启用的 channels，以及它们是否接受 DMs、groups 或 webhooks。
- 非本地发送者可访问的 agents。
- 每个可访问 agent 的 tool profile、sandbox 模式和 elevated tool policy。
- 这些 agents 可用的外部凭据。
- `~/.openclaw/openclaw.json` 和凭据的备份位置。

如果有不止一个人可以给 bot 发消息，则应将其视为共享的委派工具权限，而不是按用户划分的主机隔离。

## 基线检查

在开放访问之前运行以下命令：

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

先解决关键问题。只有当警告是该部署有意为之且已记录时，警告才可能被接受。

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

然后一次只放宽一个控制项。例如，在启用可写工具之前添加特定的 channel allowlist，或者在接受远程 Control UI 流量之前启用反向代理。

严格的 `exec.security: "deny"` 基线会阻止所有 exec 调用，包括无害的诊断。如果需要诊断或低风险命令，只有在你选定了与威胁模型匹配的具体发送者、agents、命令和审批模式之后，才放宽这一项。

## DM 和 group 暴露

消息 channels 是不受信任的输入面。在允许 DMs 或 groups 之前：

- 优先使用 `dmPolicy: "pairing"` 或严格的 `allowFrom` 列表。
- 除非每个发送者都可信，否则避免使用 `dmPolicy: "open"`。
- 不要将 `"*"` 白名单与广泛的工具访问组合使用。
- 在 group 中要求 mention，除非房间受到严格控制。
- 当有多人可以向 bot 发 DM 时，使用 `session.dmScope: "per-channel-peer"`。
- 将共享 channels 路由到工具最少且没有个人凭据的 agents。

pairing 只是批准发送者触发 bot，并不会让该发送者成为单独的主机安全边界。

## 反向代理检查

对于身份感知代理：

- 代理必须先对用户进行身份验证，然后再转发到 Gateway。
- 必须通过防火墙或网络策略阻止对 Gateway 端口的直接访问。
- `gateway.trustedProxies` 只能包含代理来源 IP。
- 代理必须剥离或覆盖客户端提供的身份和转发标头。
- 当代理服务多个受众时，`gateway.auth.trustedProxy.allowUsers` 应列出预期用户。
- 同主机 loopback 代理模式只有在本地进程可信且代理拥有身份标头时，才应使用 `allowLoopback`。

在代理变更后运行 `openclaw security audit --deep`。trusted-proxy 相关发现被刻意设计为高信噪比，因为代理会成为身份验证边界。

## 工具与沙箱审查

在将 agent 暴露给远程发送者之前：

- 确认哪些 sessions 在主机上运行，哪些在沙箱中运行。
- 禁止主机 exec，或为其设置审批。
- 除非特定可信发送者确实需要，否则保持 elevated tools 关闭。
- 对于开放或半开放的消息 surface，避免使用 browser、canvas、node、cron、gateway 和 session-spawn tools。
- 保持 bind mounts 细粒度，避免挂载凭据、home、Docker socket 和系统路径。
- 对于实质上不同的信任边界，使用不同的 gateways、OS 用户或主机。

如果远程用户并非完全可信，隔离必须来自独立部署，而不能仅依赖提示词或 session 标签。

## 变更后的验证

每次暴露变更后：

1. 重新运行 `openclaw security audit --deep`。
2. 测试一次成功的授权连接。
3. 测试未授权发送者或浏览器 session 被拒绝。
4. 确认日志会对 secrets 脱敏。
5. 确认 DM/group 路由只到达预期的 agent。
6. 确认高影响工具会请求批准或被拒绝。
7. 记录已接受的残余警告。

在当前暴露变更被理解之前，不要进行下一步。

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
- DMs 使用 pairing 或 allowlist，而不是默认开放访问。
- Groups 需要 mention 或显式 allowlist。
- 共享 channels 不应接触个人凭据。
- 非主会话在 sandbox 模式中运行。
- 主机 exec 和 elevated tools 被拒绝或受审批门控。
- 日志对 secrets 脱敏。
- 关键审计发现已解决。
- 回滚步骤已测试并记录。
