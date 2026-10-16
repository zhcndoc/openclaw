---
summary: "在您自己的网关遭受可疑危害后，遏制、轮换、审核和收集证据"
read_when:
  - "您认为您的网关或频道帐户已被盗用"
  - "您需要快速轮换网关和提供商凭据"
  - "您正在收集安全报告的证据"
title: "操作员事件响应"
sidebarTitle: "事件响应"
---

## <a id="incident-response"></a> 事件响应

### <a id="contain"></a> 遏制

1. 停止它：停止 macOS 应用（如果它在监督 Gateway）或终止你的 `openclaw gateway` 进程。
2. 关闭曝光：设置`gateway.bind: "loopback"`（或禁用Tailscale Funnel/Serve），直到您了解发生了什么。
3. 冻结访问：将有风险的DMs/groups切换为`dmPolicy: "disabled"`/要求提及，并删除任何`"*"`允许所有条目。

### <a id="rotate-(assume-compromise-if-secrets-leaked)"></a><a id="rotate-assume-compromise-if-secrets-leaked"></a> 轮换（若秘密泄露则假定已被攻破）

1. 旋转网关身份验证（`gateway.auth.token` / `gateway.auth.password`）。仅当有效认证模式保持不变时，轮换热应用；为 SecretRefs 显式设置 `gateway.auth.mode`。重新启动以更改身份验证模式或更新流程环境凭据（例如 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 轮换远程客户端密钥（`gateway.remote.token` ／ `.password`），适用于任何可以调用 Gateway 的机器。
3. 旋转 provider/API 凭证（WhatsApp 凭证、Slack/Discord 令牌、SQLite 身份验证存储中的 model/API 密钥以及使用时的加密机密有效负载值）。

### <a id="audit"></a> 审计

1. 使用 `openclaw logs`（或 `openclaw --profile <profile> logs` 对于命名配置文件）检查网关日志。默认路径为`/tmp/openclaw/openclaw-YYYY-MM-DD.log`；命名配置文件使用 `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`，除非 `logging.file` 覆盖它。
2. 查看相关的转录记录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 查看最近可能扩大访问范围的配置更改：`gateway.bind`、`gateway.auth`、DM/group 策略、`tools.elevated`、插件更改。
4. 重新运行 `openclaw security audit --deep`，并确认关键发现已解决。

### <a id="collect-for-a-report"></a> 收集用于报告

- 时间戳、Gateway 主机 OS + OpenClaw 版本。
- 会话转录 + 一段简短的日志尾部（脱敏后）。
- 攻击者发送了什么，以及代理做了什么。
- 网关是否暴露在环回之外（LAN/Tailscale Funnel/Serve）。
