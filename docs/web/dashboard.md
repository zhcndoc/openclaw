---
summary: "网关仪表盘（控制界面）访问与认证"
read_when:
  - 更改仪表盘认证或暴露模式时
title: "仪表盘"
---

# 仪表盘（控制界面）

网关仪表盘默认通过 `/` 提供浏览器控制界面  
（可通过 `gateway.controlUi.basePath` 进行覆盖）。

快速打开（本地网关）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) （或 [http://localhost:18789/](http://localhost:18789/)）

主要参考：

- [控制界面](/web/control-ui) 了解使用方法和界面功能。
- [Tailscale](/gateway/tailscale) 用于 Serve/Funnel 自动化。
- [Web 界面](/web) 了解绑定模式和安全注意事项。

认证在 WebSocket 握手阶段通过 `connect.params.auth`（令牌或密码）进行强制验证。详见 [网关配置](/gateway/configuration) 中的 `gateway.auth` 。

安全提醒：控制界面是一个 **管理员界面** （包含聊天、配置、执行审批等功能）。请勿公开暴露。界面将仪表盘 URL 中的令牌存储在 sessionStorage 中，针对当前浏览器标签页会话和选中的网关 URL，并在加载后移除 URL 中的令牌。优先使用 localhost、Tailscale Serve 或 SSH 隧道方式访问。

## 快速路径（推荐）

- 初始配置后，CLI 会自动打开仪表盘并打印一个不含令牌的干净链接。
- 随时重新打开：使用命令 `openclaw dashboard` （该命令会复制链接，尽可能打开浏览器，若是无头模式则显示 SSH 提示）。
- 若界面提示认证，粘贴 `gateway.auth.token`（或环境变量 `OPENCLAW_GATEWAY_TOKEN`）中的令牌至控制界面设置中。

## 令牌机制（本地与远程）

- **本地 localhost**: 打开 `http://127.0.0.1:18789/`。
- **令牌来源**：来自 `gateway.auth.token`（或环境变量 `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 能通过 URL 片段传递该令牌用于一次性引导，控制界面将其保存在 sessionStorage 中，针对当前浏览器标签页会话及所选网关 URL，避免使用 localStorage。
- 若 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard` 根据设计会打印/复制/打开一个不含令牌的 URL，避免令牌暴露在外部管理的 shell 日志、剪贴板历史或浏览器启动参数中。
- 如果 `gateway.auth.token` 配置为 SecretRef 且在当前 shell 中未解析，`openclaw dashboard` 仍会打印不含令牌的 URL，并给出可执行的认证设置提示。
- **非 localhost 环境**：可使用 Tailscale Serve（若 `gateway.auth.allowTailscale: true` 则控制界面和 WebSocket 访问免令牌，默认信任网关主机；HTTP API 仍需令牌/密码）、带令牌的 tailnet 绑定或者 SSH 隧道。详见 [Web 界面](/web)。

## If you see "unauthorized" / 1008

- 确认网关是否可达（本地：使用 `openclaw status`；远程：通过 SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host`，然后访问 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，客户端可在网关返回重试提示时使用缓存的设备令牌尝试一次信任重试。若重试后依然认证失败，则需手动处理令牌漂移。
- 令牌漂移修复步骤，请参阅 [令牌漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。
- 从网关主机获取或提供令牌：
  - 明文配置：`openclaw config get gateway.auth.token`
  - SecretRef 管理配置：解析外部 Secret 提供者或在当前 shell 中导出 `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 无令牌配置：`openclaw doctor --generate-gateway-token`
- 在仪表盘设置中，将令牌粘贴到认证字段，然后连接。
