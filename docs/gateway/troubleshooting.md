---
summary: "网关、渠道、自动化、节点和浏览器的深度故障排除运行手册"
read_when:
  - 故障排除中心指引您到此进行更深层次的诊断
  - 您需要基于症状的稳定运行手册部分以及精确命令
title: "故障排除"
---

# 网关故障排除

本页面为详细运行手册。  
如果您想先进行快速分类流程，请访问 [/help/troubleshooting](/help/troubleshooting)。

## 命令阶梯

先按此顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

预期健康信号：

- `openclaw gateway status` 显示 `Runtime: running` 和 `RPC probe: ok`。  
- `openclaw doctor` 报告无阻塞的配置/服务问题。  
- `openclaw channels status --probe` 显示连接/就绪的渠道。

## Anthropic 429 需要额外使用量以支持长上下文

当日志/错误中包含：  
`HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

检查：

- 选择的 Anthropic Opus/Sonnet 模型含有 `params.context1m: true`。  
- 当前 Anthropic 凭证不具备长上下文使用资格。  
- 请求仅在需要 1M 测试路径的长会话/模型运行中失败。

解决方案：

1. 关闭该模型的 `context1m`，回退到普通上下文窗口。  
2. 使用带有计费的 Anthropic API 密钥，或在订阅账户开启 Anthropic 额外使用。  
3. 配置回退模型，使在 Anthropic 长上下文请求被拒时运行继续。

相关：

- [/providers/anthropic](/providers/anthropic)  
- [/reference/token-use](/reference/token-use)  
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 无回复

如果渠道连接正常但无响应，重连前请检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

检查：

- DM 发送方的配对是否待处理。  
- 群组提及限制（`requireMention`，`mentionPatterns`）。  
- 渠道/群组白名单不匹配。

常见表现：

- `drop guild message (mention required` → 群消息被忽略直到被提及。  
- `pairing request` → 发送方需审批。  
- `blocked` / `allowlist` → 发送方/渠道被策略过滤。

相关：

- [/channels/troubleshooting](/channels/troubleshooting)  
- [/channels/pairing](/channels/pairing)  
- [/channels/groups](/channels/groups)

## 仪表盘控制界面连接问题

仪表盘/控制界面无法连接时，验证 URL、认证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

检查：

- 探测 URL 和仪表盘 URL 是否正确。  
- 客户端与网关认证模式/令牌是否匹配。  
- 是否在需要设备身份时使用了 HTTP。

常见表现：

- `device identity required` → 非安全上下文或缺少设备认证。  
- `device nonce required` / `device nonce mismatch` → 客户端未完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。  
- `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误载荷（或过期时间戳）。  
- `AUTH_TOKEN_MISMATCH` with `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次可信重试。  
- 重复出现的 `unauthorized` → 共享令牌/设备令牌漂移；如有需要请刷新令牌配置并重新批准/轮换设备令牌。  
- `gateway connect failed:` → 错误的主机/端口/URL 目标。

### 认证详细代码快速映射

使用失败 `connect` 响应中的 `error.details.code` 选择下一步动作：

| 详细代码                     | 含义                                                          | 推荐动作                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送必需的共享令牌。                                  | 在客户端粘贴/设置令牌并重试。针对仪表盘路径：运行 `openclaw config get gateway.auth.token`，然后粘贴到控制界面设置中。                                                |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关认证令牌不匹配。                                | 如果 `canRetryWithDeviceToken=true`，允许一次可信赖重试。若仍失败，执行[令牌漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。                         |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的设备专用令牌已过期或被撤销。                            | 使用[设备命令行工具](/cli/devices)轮换/重新批准设备令牌，然后重新连接。                                                                                             |
| `PAIRING_REQUIRED`           | 设备身份已知但未获此角色批准。                                | 批准待处理请求：先用 `openclaw devices list` 查看，然后用 `openclaw devices approve <requestId>` 批准。                                                             |

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志出现 nonce/signature 错误，请更新连接客户端并确认：

1. 等待 `connect.challenge`  
2. 签名绑定于挑战的载荷  
3. 发送带有相同挑战 nonce 的 `connect.params.device.nonce`

相关：

- [/web/control-ui](/web/control-ui)  
- [/gateway/authentication](/gateway/authentication)  
- [/gateway/remote](/gateway/remote)  
- [/cli/devices](/cli/devices)

## 网关服务未运行

当服务已安装但进程无法保持运行时使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

检查：

- `Runtime: stopped` 并带退出提示。  
- 服务配置不匹配（`Config (cli)` 与 `Config (service)`）。  
- 端口/监听冲突。

常见表现：

- `Gateway start blocked: set gateway.mode=local` → 本地网关模式未启用。解决方案：在配置中设置 `gateway.mode="local"`（或运行 `openclaw configure`）。如果您通过 Podman 使用专用的 `openclaw` 用户运行 OpenClaw，配置文件位于 `~openclaw/.openclaw/openclaw.json`。  
- `refusing to bind gateway ... without auth` → 非回环地址绑定但无令牌/密码。  
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。

相关：

- [/gateway/background-process](/gateway/background-process)  
- [/gateway/configuration](/gateway/configuration)  
- [/gateway/doctor](/gateway/doctor)

## 渠道已连接但消息未流动

如果渠道状态为已连接但消息流停滞，重点检查策略、权限和渠道特定的发送规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

检查：

- DM 策略（`pairing`、`allowlist`、`open`、`disabled`）。  
- 群组白名单和提及要求。  
- 缺少渠道 API 权限/作用域。

常见表现：

- `mention required` → 消息因群组提及策略被忽略。  
- `pairing` / 待审批痕迹 → 发送方未获批准。  
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 渠道认证/权限问题。

相关：

- [/channels/troubleshooting](/channels/troubleshooting)  
- [/channels/whatsapp](/channels/whatsapp)  
- [/channels/telegram](/channels/telegram)  
- [/channels/discord](/channels/discord)

## 定时任务和心跳投递

若定时任务或心跳未运行或未投递，先验证调度器状态，再检查投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

检查：

- 定时任务已启用并有下次唤醒时间。  
- 任务运行历史状态（`ok`、`skipped`、`error`）。  
- 心跳跳过原因（`quiet-hours`、`requests-in-flight`、`alerts-disabled`）。

常见表现：

- `cron: scheduler disabled; jobs will not run automatically` → 定时任务已禁用。  
- `cron: timer tick failed` → 调度器 tick 失败；检查文件/日志/运行时错误。  
- `heartbeat skipped` 且 `reason=quiet-hours` → 非活跃时间范围。  
- `heartbeat: unknown accountId` → 心跳投递目标无效的账户ID。  
- `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目标解析到 DM 类型目标时，且 `agents.defaults.heartbeat.directPolicy`（或单代理覆盖）设置为阻止。

相关：

- [/automation/troubleshooting](/automation/troubleshooting)  
- [/automation/cron-jobs](/automation/cron-jobs)  
- [/gateway/heartbeat](/gateway/heartbeat)

## 节点配对工具失败

节点已配对但工具失败时，隔离前台、权限及审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

检查：

- 节点在线且具预期能力。  
- OS 权限授权（摄像头/麦克风/定位/屏幕）。  
- 执行审批和白名单状态。

常见表现：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台运行。  
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少系统权限。  
- `SYSTEM_RUN_DENIED: approval required` → 执行审批待处理。  
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被白名单阻止。

相关：

- [/nodes/troubleshooting](/nodes/troubleshooting)  
- [/nodes/index](/nodes/index)  
- [/tools/exec-approvals](/tools/exec-approvals)

## 浏览器工具失败

当浏览器工具动作失败但网关本身健康时使用。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查：

- 浏览器可执行文件路径有效。  
- CDP 配置文件可访问。  
- `"chrome"` 个人资料的扩展中继标签是否已连接。

常见表现：

- `Failed to start Chrome CDP on port` → 浏览器进程启动失败。  
- `browser.executablePath not found` → 配置路径无效。  
- `Chrome extension relay is running, but no tab is connected` → 扩展中继未附着。  
- `Browser attachOnly is enabled ... not reachable` → 附加专用配置文件无可达目标。

相关：

- [/tools/browser-linux-troubleshooting](/tools/browser-linux-troubleshooting)  
- [/tools/chrome-extension](/tools/chrome-extension)  
- [/tools/browser](/tools/browser)

## 升级后突然出错

升级后大多数故障是配置漂移或新增更严格默认项导致。

### 1) 认证和 URL 覆盖行为变化

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查：

- 若 `gateway.mode=remote`，CLI 调用可能指向远程端，而本地服务正常。  
- 显式 `--url` 调用不会回退到存储的凭证。

常见表现：

- `gateway connect failed:` → 错误的 URL 目标。  
- `unauthorized` → 端点可达但认证错误。

### 2) 绑定和认证的保护措施更严格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查：

- 非回环地址绑定（`lan`、`tailnet`、`custom`）需要配置认证。  
- 旧密钥如 `gateway.token` 不再替代 `gateway.auth.token`。

常见表现：

- `refusing to bind gateway ... without auth` → 绑定与认证不匹配。  
- `RPC probe: failed` 运行时已启动但认证/URL 不适用访问。

### 3) 配对和设备身份状态变化

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查：

- 仪表盘/节点待审批设备。  
- 策略或身份变更后 DM 配对审批待处理。

常见表现：

- `device identity required` → 设备认证未满足。  
- `pairing required` → 发送方/设备需审批。

如果服务配置与运行时状态仍不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [/gateway/pairing](/gateway/pairing)  
- [/gateway/authentication](/gateway/authentication)  
- [/gateway/background-process](/gateway/background-process)
