---
summary: "网关仪表盘（控制界面）访问与认证"
read_when:
  - 更改仪表盘认证或暴露模式时
title: "仪表盘"
---

# 仪表盘（控制界面）

网关仪表盘是默认在 `/` 提供的浏览器控制界面  
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地网关）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) （或 [http://localhost:18789/](http://localhost:18789/)）

主要参考：

- [控制界面](/web/control-ui) 用于使用及界面功能介绍。
- [Tailscale](/gateway/tailscale) 用于 Serve/Funnel 自动化。
- [Web 界面](/web) 介绍绑定模式及安全注意事项。

认证在 WebSocket 握手阶段通过 `connect.params.auth`  
（令牌或密码）执行。详情参见 [网关配置](/gateway/configuration) 中的 `gateway.auth`。

安全提示：控制界面是一个**管理员界面**（聊天、配置、执行审批）。  
请勿公开暴露。UI 首次加载后会将令牌存储在 `localStorage` 中。  
建议使用本地 localhost、Tailscale Serve 或 SSH 隧道。

## 快捷路径（推荐）

- 导入后，CLI 自动打开仪表盘并打印干净的（无令牌）链接。
- 随时重新打开：`openclaw dashboard`（复制链接，如可能则打开浏览器，若无界面则显示 SSH 提示）。
- 若界面提示认证，粘贴 `gateway.auth.token`（或环境变量 `OPENCLAW_GATEWAY_TOKEN`）中的令牌到控制界面设置。

## 令牌基础（本地与远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。  
- **令牌来源**：`gateway.auth.token`（或环境变量 `OPENCLAW_GATEWAY_TOKEN`）；连接后 UI 会在 localStorage 中存一份。  
- 若 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard` 按设计会打印/复制/打开无令牌的 URL，避免将外部托管的令牌暴露在 shell 日志、剪贴板历史或浏览器启动参数中。  
- 若 `gateway.auth.token` 配置为 SecretRef，且当前 shell 中未解析，`openclaw dashboard` 仍打印无令牌 URL，并提供可操作的认证配置指导。  
- **非本地主机**：可使用 Tailscale Serve（若 `gateway.auth.allowTailscale: true`，控制界面/WebSocket 无需令牌，假设网关主机可信；HTTP API 依然需要令牌/密码），或者带令牌的 tailnet 绑定，或者 SSH 隧道。详见 [Web 界面](/web)。

## 如果出现 “unauthorized” / 1008 错误

- 确认网关可连接（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`）。  
- 从网关主机获取或提供令牌：  
  - 明文配置：`openclaw config get gateway.auth.token`  
  - SecretRef 管理配置：解析外部密钥提供者，或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`  
  - 未配置令牌：`openclaw doctor --generate-gateway-token`  
- 在仪表盘设置中，将令牌粘贴到认证字段，然后连接。
