---
summary: "深度网关故障排除操作手册的索引，按症状区域分组"
read_when:
  - "故障排查中心将你带到这里进行更深入的诊断"
  - "你需要带有精确命令的、基于症状的稳定运行手册章节"
title: "故障排查"
sidebarTitle: "故障排查"
---

这是深度运行手册。请先从 [/help/troubleshooting](/help/troubleshooting) 开始，查看快速分诊流程。

## <a id="command-ladder"></a> 命令阶梯

按以下顺序运行：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康信号：

- `openclaw gateway status` 显示 `Runtime: running`、成功的连接检查和 `Capability: ...` 线路。
- `openclaw doctor` 报告没有阻塞 config/service 问题。
- `openclaw channels status --probe` 显示按账户划分的实时传输状态，并且在支持的情况下显示 `works` 或 `audit ok`。

## <a id="symptom-index"></a> 症状指数

此页是一个索引。操作手册部分记录在六页上，按症状区域分组。打开与您所看到的内容相符的页面。

| 页面                                                                                  | 读它的时候                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [更新和回滚](/gateway/troubleshooting/updates-and-rollbacks)               | 更新、降级或裂脑安装导致网关关闭或不匹配。            |
| [技能与模型提供者](/gateway/troubleshooting/skills-and-model-providers)     | 跳过技能根，或者提供商调用因 429、403 或静默代理运行错误而失败。   |
| [代理回复和 Control UI](/gateway/troubleshooting/agent-replies-and-control-ui) | 运行因存储错误而失败，没有回复到达，或者 Control UI 将无法连接。      |
| [网关服务及流程](/gateway/troubleshooting/gateway-service-and-process)   | 服务将无法运行或保持运行状态、macOS 监管行为不当或内存强制退出。 |
| [配置验证和检查](/gateway/troubleshooting/config-validation-and-probes) | 网关拒绝配置，或检查状态和医生输出中出现的警告。         |
| [渠道交付和工具](/gateway/troubleshooting/channel-delivery-and-tools)     | 通道已连接但未下发，或者节点或浏览器工具调用失败。               |

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个锚点都保留在此处，因此现有链接（例如 `/gateway/troubleshooting#gateway-rejected-invalid-config`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="after-an-update" />[更新后](/gateway/troubleshooting/updates-and-rollbacks#after-an-update)
- <a id="prepared-model-runtime-publication-timeout" />[准备模型运行时发布超时](/gateway/troubleshooting/updates-and-rollbacks#prepared-model-runtime-publication-timeout)
- <a id="split-brain-installs-and-newer-config-guard" />[分脑安装和更新的配置防护](/gateway/troubleshooting/updates-and-rollbacks#split-brain-installs-and-newer-config-guard)
- <a id="fix-path" />[修复PATH](/gateway/troubleshooting/updates-and-rollbacks#fix-path)
- <a id="reinstall-the-gateway-service" />[重新安装网关服务](/gateway/troubleshooting/updates-and-rollbacks#reinstall-the-gateway-service)
- <a id="remove-stale-wrappers" />[去除陈旧的包装纸](/gateway/troubleshooting/updates-and-rollbacks#remove-stale-wrappers)
- <a id="protocol-mismatch-after-rollback" />[回滚后协议不匹配](/gateway/troubleshooting/updates-and-rollbacks#protocol-mismatch-after-rollback)
- <a id="skill-symlink-skipped-as-path-escape" />[技能符号链接作为路径转义被跳过](/gateway/troubleshooting/skills-and-model-providers#skill-symlink-skipped-as-path-escape)
- <a id="anthropic-429-extra-usage-required-for-long-context" />[长上下文需要人类 429 额外使用](/gateway/troubleshooting/skills-and-model-providers#anthropic-429-extra-usage-required-for-long-context)
- <a id="use-a-standard-context-window" />[使用标准上下文窗口](/gateway/troubleshooting/skills-and-model-providers#use-a-standard-context-window)
- <a id="use-an-eligible-credential" />[使用符合条件的凭证](/gateway/troubleshooting/skills-and-model-providers#use-an-eligible-credential)
- <a id="configure-fallback-models" />[配置后备模型](/gateway/troubleshooting/skills-and-model-providers#configure-fallback-models)
- <a id="upstream-403-blocked-responses" />[上游 403 阻止响应](/gateway/troubleshooting/skills-and-model-providers#upstream-403-blocked-responses)
- <a id="local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" />[本地OpenAI-兼容后端通过直接检查但代理运行失败](/gateway/troubleshooting/skills-and-model-providers#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- <a id="common-signatures" />[普通签名（本地后端）](/gateway/troubleshooting/skills-and-model-providers#common-signatures)
- <a id="fix-options" />[修复选项（本地后端）](/gateway/troubleshooting/skills-and-model-providers#fix-options)
- <a id="agent-run-failed-with-a-storage-error" />[代理运行失败，出现存储错误](/gateway/troubleshooting/agent-replies-and-control-ui#agent-run-failed-with-a-storage-error)
- <a id="no-replies" />[没有回复](/gateway/troubleshooting/agent-replies-and-control-ui#no-replies)
- <a id="dashboard-control-ui-connectivity" />[仪表板控制 UI 连接性](/gateway/troubleshooting/agent-replies-and-control-ui#dashboard-control-ui-connectivity)
- <a id="connect-auth-signatures" />[连接/身份验证签名](/gateway/troubleshooting/agent-replies-and-control-ui#connect-auth-signatures)
- <a id="auth-detail-codes-quick-map" />[授权详细码快速图](/gateway/troubleshooting/agent-replies-and-control-ui#auth-detail-codes-quick-map)
- <a id="wait-for-connect-challenge" />[等待connect.challenge](/gateway/troubleshooting/agent-replies-and-control-ui#wait-for-connect-challenge)
- <a id="sign-the-payload" />[对有效负载进行签名](/gateway/troubleshooting/agent-replies-and-control-ui#sign-the-payload)
- <a id="send-the-device-nonce" />[发送设备随机数](/gateway/troubleshooting/agent-replies-and-control-ui#send-the-device-nonce)
- <a id="gateway-service-not-running" />[网关服务未运行](/gateway/troubleshooting/gateway-service-and-process#gateway-service-not-running)
- <a id="common-signatures-1" />[通用签名（网关服务）](/gateway/troubleshooting/gateway-service-and-process#common-signatures)
- <a id="macos-gateway-silently-stops-responding%2C-then-resumes-when-you-touch-the-dashboard" /><a id="macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard" />[macOS 网关静默停止响应，然后在触摸仪表板时恢复](/gateway/troubleshooting/gateway-service-and-process#macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard)
- <a id="macos-launchd-supervisor-loop-with-duplicate-gateway%2Fnode-launchagents" /><a id="macos-launchd-supervisor-loop-with-duplicate-gateway/node-launchagents" />[macOS launchd 具有重复 gateway/node LaunchAgents](/gateway/troubleshooting/gateway-service-and-process#macos-launchd-supervisor-loop-with-duplicate-gateway%2Fnode-launchagents) 的主管循环
- <a id="gateway-exits-during-high-memory-use" />[内存使用率较高时网关退出](/gateway/troubleshooting/gateway-service-and-process#gateway-exits-during-high-memory-use)
- <a id="gateway-rejected-invalid-config" />[网关拒绝无效配置](/gateway/troubleshooting/config-validation-and-probes#gateway-rejected-invalid-config)
- <a id="what-happened" />[发生了什么](/gateway/troubleshooting/config-validation-and-probes#what-happened)
- <a id="inspect-and-repair" />[检查和维修](/gateway/troubleshooting/config-validation-and-probes#inspect-and-repair)
- <a id="common-signatures-2" />[通用签名（无效配置）](/gateway/troubleshooting/config-validation-and-probes#common-signatures)
- <a id="fix-options-1" />[修复选项（无效配置）](/gateway/troubleshooting/config-validation-and-probes#fix-options)
- <a id="gateway-probe-warnings" />[网关检查警告](/gateway/troubleshooting/config-validation-and-probes#gateway-probe-warnings)
- <a id="channel-connected%2C-messages-not-flowing" /><a id="channel-connected-messages-not-flowing" />[通道已连接，消息不流动](/gateway/troubleshooting/channel-delivery-and-tools#channel-connected-messages-not-flowing)
- <a id="cron-and-heartbeat-delivery" />[定时和心跳传递](/gateway/troubleshooting/channel-delivery-and-tools#cron-and-heartbeat-delivery)
- <a id="common-signatures-3" />[通用签名（cron和心跳）](/gateway/troubleshooting/channel-delivery-and-tools#common-signatures)
- <a id="node-paired%2C-tool-fails" /><a id="node-paired-tool-fails" />[节点配对，工具失败](/gateway/troubleshooting/channel-delivery-and-tools#node-paired-tool-fails)
- <a id="browser-tool-fails" />[浏览器工具失败](/gateway/troubleshooting/channel-delivery-and-tools#browser-tool-fails)
- <a id="plugin-executable-signatures" />[插件/可执行文件签名](/gateway/troubleshooting/channel-delivery-and-tools#plugin-executable-signatures)
- <a id="chrome-mcp-existing-session-signatures" />[Chrome MCP /现有会话签名](/gateway/troubleshooting/channel-delivery-and-tools#chrome-mcp-existing-session-signatures)
- <a id="element-screenshot-upload-signatures" />[元素/截图/上传签名](/gateway/troubleshooting/channel-delivery-and-tools#element-screenshot-upload-signatures)

## <a id="if-you-upgraded-and-something-suddenly-broke"></a> 如果你在升级后突然遇到故障

大多数升级期间的故障都是由配置漂移或现在启用了更严格的默认值引起的。

<AccordionGroup>
  <Accordion id="1-auth-and-url-override-behavior-changed" title="1. Auth 和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    需要检查的内容：

    - 如果 `gateway.mode=remote`，CLI 调用可能指向远程端，而你的本地服务实际上是正常的。
    - 显式的 `--url` 调用不会回退到已保存的凭据。

    常见特征：

    - `gateway connect failed:` → 目标 URL 错误。
    - `unauthorized` → 端点可达，但认证错误。

  </Accordion>
  <Accordion id="2-bind-and-auth-guardrails-are-stricter" title="2. Bind和auth护栏更严格">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    需要检查的内容：

    - 非环回绑定（`lan`、`tailnet`、`custom`）需要有效的网关身份验证路径：共享 token/password 身份验证，或正确配置的非环回 `trusted-proxy` 部署。
    - 较旧的键，例如 `gateway.token`，不能替代 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非 loopback 绑定，但没有有效的 gateway 认证路径。
    - a 在运行时运行时连接检查失败 → 网关处于活动状态，但无法使用当前 auth/url. 进行访问

  </Accordion>
  <Accordion id="3-pairing-and-device-identity-state-changed" title="3. 配对和设备身份状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    需要检查的内容：

    - dashboard/nodes. 的待批准设备
    - 在策略或身份变更后，是否存在待处理的 DM 配对批准。

    常见特征：

    - `device identity required` → 设备认证不满足。
    - `pairing required` → sender/device 必须获得批准。

  </Accordion>
</AccordionGroup>

如果检查后服务配置和运行时仍然不一致，请从同一 profile/state 目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [认证](/gateway/authentication)
- [后台执行和进程工具](/gateway/background-process)
- [节点配对](/gateway/pairing)

## <a id="related"></a> 相关内容

- [诊断标志](/diagnostics/flags)
- [诊断工具](/gateway/doctor)
- [FAQ](/help/faq)
- [Gateway 运行手册](/gateway)
