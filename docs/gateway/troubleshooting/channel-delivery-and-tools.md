---
summary: "连接但不交付的通道、cron 和心跳交付以及节点或浏览器工具故障"
title: "渠道交付和工具"
sidebarTitle: "渠道交付和工具"
read_when:
  - "通道已连接但消息未流动"
  - "Cron 或心跳交付未到达"
  - "配对节点在工具调用时失败，或者浏览器工具失败"
---

## <a id="channel-connected%2C-messages-not-flowing"></a><a id="channel-connected-messages-not-flowing"></a> 通道已连接，但消息未流动

如果通道状态显示已连接但消息流停滞，请重点检查策略、权限和通道特定的投递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查看以下内容：

- DM 策略（`pairing`、`allowlist`、`open`、`disabled`）。
- 群组 allowlist 和提及要求。
- 缺失通道 API permissions/scopes.

常见特征：

- `mention required` → 消息因群组提及策略而被忽略。
- `pairing` / 待批准跟踪信息 → 发送方未获批准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 频道 auth/permissions 问题。

相关：

- [通道故障排除](/channels/troubleshooting)
- [Discord](/channels/discord)
- [电报](/channels/telegram)
- [WhatsApp](/channels/whatsapp)

## <a id="cron-and-heartbeat-delivery"></a> Cron 和 heartbeat 投递

如果 cron 或 heartbeat 未运行或未投递，先验证调度器状态，再检查投递目标。

```bash
openclaw automations status
openclaw automations list
openclaw automations runs <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查看以下内容：

- Cron 是否已启用，以及是否存在下一次唤醒时间。
- 任务运行历史状态（`ok`、`skipped`、`error`）。
- Heartbeat 跳过原因（`quiet-hours`、`requests-in-flight`、`cron-in-progress`、`alerts-disabled`、`empty-heartbeat-file`）。

<AccordionGroup>
  <Accordion id="common-signatures" title="通用签名">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度程序勾选失败；检查 file/log/runtime 错误。
    - `heartbeat skipped` with `reason=quiet-hours` → 当前处于活跃时间窗口之外。
    - `heartbeat skipped` 和 `reason=empty-heartbeat-file` → 心跳监视器暂存仅包含空行、注释、标题、代码围栏或空清单，因此 OpenClaw 会跳过模型调用。
    - `heartbeat skipped` with `reason=no-route` → 默认的 `owner` 目标在 `commands.ownerAllowFrom` 或频道 `allowFrom` 中没有具体所有者，所有者无法解析为 DM，或未配置任何频道。显式的 `last` 还需要会话对话路由。
    - `heartbeat: unknown accountId` → 心跳传送目标的帐户 ID 无效。
    - `session event wake failed; no wake retry scheduled` → 唤醒以失败结束。错误日志记录其来源、意图、agent/session 目标、唤醒原因和错误。在请求另一次唤醒之前检查该会话并修复报告的原因；唤醒调度程序不会重播失败的回合，这些回合可能已经执行了工作。持久传递队列已保存的出站消息保留其单独的恢复策略。
    - `heartbeat skipped` 与 `reason=dm-blocked` → 心跳目标解析为 DM- 样式目标，而 `agents.defaults.heartbeat.directPolicy`（或每个代理覆盖）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [心跳](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
- [计划任务：故障排查](/automation/cron-jobs#troubleshooting)。

## <a id="node-paired%2C-tool-fails"></a><a id="node-paired-tool-fails"></a> Node 已配对，工具失败

如果节点已配对但工具失败，请分别检查前台、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查看以下内容：

- Node 在线，具有预期功能。
- OS 授予 camera/mic/location/screen. 的权限
- 执行批准和 allowlist 状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台运行。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少 OS 权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被 allowlist 阻止。

相关：

- [执行批准](/tools/exec-approvals)
- [节点故障排查](/nodes/troubleshooting)
- [节点](/nodes/index)。

## <a id="browser-tool-fails"></a> 浏览器工具失败

当浏览器工具操作失败，但网关本身正常时使用。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

查看以下内容：

- `plugins.allow` 是否已设置并包含 `browser`。
- 浏览器可执行文件路径是否有效。
- CDP 配置文件是否可达。
- `existing-session` / `user` 配置文件的本地 Chrome 是否可用。

<AccordionGroup>
  <Accordion id="plugin-executable-signatures" title="插件/可执行文件签名">
    - `unknown command "browser"` or `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除了。
    - Browser tool missing / unavailable while `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的协议，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口无效或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少核心浏览器运行时依赖项；重新安装或更新OpenClaw，然后重新启动网关。 ARIA 快照和基本页面屏幕截图仍然可以工作，但导航、AI 快照、CSS-selector 元素屏幕截图和 PDF 导出仍然不可用。

  </Accordion>
  <Accordion id="chrome-mcp-existing-session-signatures" title="Chrome MCP /现有会话签名">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 还无法附加到所选的浏览器数据目录。打开浏览器 inspect 页面，启用远程调试，保持浏览器打开，批准第一次附加提示，然后重试。如果不需要登录状态，优先使用受管理的 `openclaw` 配置文件。
    - `No browser tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从网关主机无法访问。
    - `Browser attachOnly is enabled ... not reachable` or `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点已响应，但 CDP WebSocket 仍无法打开。

  </Accordion>
  <Accordion id="element-screenshot-upload-signatures" title="元素/截图/上传签名">
    - `fullPage is not supported for element screenshots` → 截图请求将 `--full-page` 与 `--ref` 或 `--element` 混合使用了。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上，每次调用只能上传一个文件。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP 现有会话配置文件上省略 `act:type` 的 `timeoutMs`，或者在需要自定义超时时使用 managed/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理浏览器或原始 CDP 配置文件。
    - 连接附加模式或远程 CDP 配置文件上出现过期的视口 / 深色模式 / 语言环境 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 关闭当前控制会话，并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器（OpenClaw-托管）](/tools/browser)
- [浏览器故障排查](/tools/browser-linux-troubleshooting)。
