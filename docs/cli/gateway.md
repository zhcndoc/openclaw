---
summary: "OpenClaw 网关 CLI（`openclaw gateway`）——运行、查询和发现网关"
read_when:
  - "从 CLI 运行网关（开发或服务器）"
  - "调试网关身份验证、绑定模式和连接性"
  - "通过 Bonjour 发现网关（本地 + 广域 DNS-SD）"
  - "集成外部网关进程监督器"
title: "网关"
sidebarTitle: "网关"
---

网关是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、挂钩）。此处列出的页面上的所有子命令都位于 `openclaw gateway ...` 下。

`openclaw daemon ...` 是服务控制子命令的旧别名；参见 [`openclaw daemon`](/cli/daemon)。

<CardGroup cols={3}>
  <Card title="Bonjour 发现" href="/gateway/bonjour">
    本地 mDNS + 广域 DNS-SD 设置。
  </Card>
  <Card title="发现概述" href="/gateway/discovery">
    OpenClaw 如何发布和查找网关。
  </Card>
  <Card title="配置" href="/gateway/configuration">
    顶层网关配置键。
  </Card>
</CardGroup>

## <a id="gateway-cli-pages"></a> 网关 CLI 页

此页是一个索引。五页文档 `openclaw gateway`，每个读者作业一份。打开与您的任务匹配的页面。

| 页面                                                            | 读它的时候                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [运行 Gateway](/cli/gateway/running)                         | 您正在启动网关、调整其运行选项或读取其共享令牌。 |
| [重启和监控](/cli/gateway/restart-and-supervision) | 您正在重新启动网关，或者外部主管拥有其生命周期。      |
| [查询正在运行的Gateway](/cli/gateway/query)                   | 您需要健康状况、状态、稳定性、诊断或直接 RPC 呼叫。             |
| [管理网关服务](/cli/gateway/service)              | 您正在安装、启动、停止或修复本机服务。           |
| [发现网关（Bonjour）](/cli/gateway/discovery)           | 您正在寻找通过 mDNS 或广域 DNS-SD 的网关。                        |

`openclaw gateway install` 安装并启动服务。 `--force` 重新安装现有安装并可能重新启动正在运行的网关。安装前完成离线配置和运行时修复。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个锚点仍可在此处解析，因此现有链接（例如 `/cli/gateway#manage-the-gateway-service`）仍然有效。每个条目都指向现在保存内容的页面。

- <a id="run-the-gateway" />[运行 Gateway](/cli/gateway/running#run-the-gateway)
- <a id="options" />[选项](/cli/gateway/running#options)
- <a id="reveal-the-configured-token" />[显示配置的token](/cli/gateway/running#reveal-the-configured-token)
- <a id="restart-the-gateway" />[重新启动Gateway](/cli/gateway/restart-and-supervision#restart-the-gateway)
- <a id="install-identity" />[安装标识](/cli/gateway/restart-and-supervision#install-identity)
- <a id="external-supervisors" />[外部监事](/cli/gateway/restart-and-supervision#external-supervisors)
- <a id="gateway-profiling" />[网关分析](/cli/gateway/restart-and-supervision#gateway-profiling)
- <a id="query-a-running-gateway" />[查询正在运行的Gateway](/cli/gateway/query#query-a-running-gateway)
- <a id="gateway-health" />[`gateway health`](/cli/gateway/query#gateway-health)
- <a id="gateway-usage-cost" />[`gateway usage-cost`](/cli/gateway/query#gateway-usage-cost)
- <a id="gateway-stability" />[`gateway stability`](/cli/gateway/query#gateway-stability)
- <a id="gateway-diagnostics-export" />[`gateway diagnostics export`](/cli/gateway/query#gateway-diagnostics-export)
- <a id="gateway-status" />[`gateway status`](/cli/gateway/query#gateway-status)
- <a id="gateway-probe" />[`gateway probe`](/cli/gateway/query#gateway-probe)
- <a id="remote-over-ssh-(mac-app-parity)" />[通过 SSH 进行远程（Mac 应用程序奇偶校验）](/cli/gateway/query#remote-over-ssh-%28mac-app-parity%29)
- <a id="gateway-call-%3Cmethod%3E" />[`gateway call <method>`](/cli/gateway/query#gateway-call-%3Cmethod%3E)
- <a id="gateway-suspend" />[`gateway suspend`](/cli/gateway/query#gateway-suspend)
- <a id="gateway-resume-%3Csuspensionid%3E" />[`gateway resume <suspensionId>`](/cli/gateway/query#gateway-resume-%3Csuspensionid%3E)
- <a id="manage-the-gateway-service" />[管理网关服务](/cli/gateway/service#manage-the-gateway-service)
- <a id="recover-an-unreadable-native-service-definition" />[恢复不可读的本机服务定义](/cli/gateway/service#recover-an-unreadable-native-service-definition)
- <a id="lifecycle-requests-from-gateway-chat" />[ 来自网关聊天的生命周期请求](/cli/gateway/service#lifecycle-requests-from-gateway-chat)
- <a id="install-with-a-wrapper" />[使用包装器安装](/cli/gateway/service#install-with-a-wrapper)
- <a id="discover-gateways-(bonjour)" />[发现网关 （Bonjour）](/cli/gateway/discovery#discover-gateways-%28bonjour%29)
- <a id="gateway-discover" />[`gateway discover`](/cli/gateway/discovery#gateway-discover)
- <a id="remote-over-ssh-mac-app-parity" />[通过 SSH 进行远程（Mac 应用程序奇偶校验）](/cli/gateway/query#remote-over-ssh-mac-app-parity)
- <a id="gateway-call-&lt;method&gt;" />[`gateway call <method>`](/cli/gateway/query#gateway-call-%3Cmethod%3E)
- <a id="gateway-resume-&lt;suspensionid&gt;" />[`gateway resume <suspensionId>`](/cli/gateway/query#gateway-resume-%3Csuspensionid%3E)
- <a id="discover-gateways-bonjour" />[发现网关 （Bonjour）](/cli/gateway/discovery#discover-gateways-bonjour)

选项、选项卡和面板锚点：

- <a id="startup-behavior" />[启动行为](/cli/gateway/running#startup-behavior)
- <a id="param-port" />[`--port`](/cli/gateway/running#param-port)
- <a id="param-bind" />[`--bind`](/cli/gateway/running#param-bind)
- <a id="param-token" />[`--token`](/cli/gateway/running#param-token)
- <a id="param-auth" />[`--auth`](/cli/gateway/running#param-auth)
- <a id="param-password" />[`--password`](/cli/gateway/running#param-password)
- <a id="param-tailscale" />[`--tailscale`](/cli/gateway/running#param-tailscale)
- <a id="param-allow-unconfigured" />[`--allow-unconfigured`](/cli/gateway/running#param-allow-unconfigured)
- <a id="param-dev" />[`--dev`](/cli/gateway/running#param-dev)
- <a id="param-ambient-channels" />[`--ambient-channels`](/cli/gateway/running#param-ambient-channels)
- <a id="param-dev-ambient-channels" />[`--dev-ambient-channels`](/cli/gateway/running#param-dev-ambient-channels)
- <a id="param-reset" />[`--reset`](/cli/gateway/running#param-reset)
- <a id="param-force" />[`--force`](/cli/gateway/running#param-force)
- <a id="param-verbose" />[`--verbose`](/cli/gateway/running#param-verbose)
- <a id="param-cli-backend-logs" />[`--cli-backend-logs`](/cli/gateway/running#param-cli-backend-logs)
- <a id="param-ws-log" />[`--ws-log`](/cli/gateway/running#param-ws-log)
- <a id="param-compact" />[`--compact`](/cli/gateway/running#param-compact)
- <a id="param-raw-stream" />[`--raw-stream`](/cli/gateway/running#param-raw-stream)
- <a id="output-modes" />[输出模式](/cli/gateway/query#output-modes)
- <a id="shared-options" />[共享选项](/cli/gateway/query#shared-options)
- <a id="param-port-1" />[`--port`](/cli/gateway/query#param-port)
- <a id="param-days" />[`--days`](/cli/gateway/query#param-days)
- <a id="param-agent" />[`--agent`](/cli/gateway/query#param-agent)
- <a id="param-all-agents" />[`--all-agents`](/cli/gateway/query#param-all-agents)
- <a id="param-limit" />[`--limit`](/cli/gateway/query#param-limit)
- <a id="param-type" />[`--type`](/cli/gateway/query#param-type)
- <a id="param-since-seq" />[`--since-seq`](/cli/gateway/query#param-since-seq)
- <a id="param-bundle-path" />[`--bundle`](/cli/gateway/query#param-bundle-path)
- <a id="param-export" />[`--export`](/cli/gateway/query#param-export)
- <a id="privacy-and-bundle-behavior" />[隐私和捆绑行为](/cli/gateway/query#privacy-and-bundle-behavior)
- <a id="param-log-lines" />[`--log-lines`](/cli/gateway/query#param-log-lines)
- <a id="param-log-bytes" />[`--log-bytes`](/cli/gateway/query#param-log-bytes)
- <a id="param-url" />[`--url`](/cli/gateway/query#param-url)
- <a id="param-token-1" />[`--token`](/cli/gateway/query#param-token)
- <a id="param-password-1" />[`--password`](/cli/gateway/query#param-password)
- <a id="param-timeout" />[`--timeout`](/cli/gateway/query#param-timeout)
- <a id="param-no-stability-bundle" />[`--no-stability-bundle`](/cli/gateway/query#param-no-stability-bundle)
- <a id="param-json" />[`--json`](/cli/gateway/query#param-json)
- <a id="param-url-1" />[`--url`](/cli/gateway/query#param-url-1)
- <a id="param-port-2" />[`--port`](/cli/gateway/query#param-port-1)
- <a id="param-token-2" />[`--token`](/cli/gateway/query#param-token-1)
- <a id="param-password-2" />[`--password`](/cli/gateway/query#param-password-1)
- <a id="param-timeout-1" />[`--timeout`](/cli/gateway/query#param-timeout-1)
- <a id="param-no-probe" />[`--no-probe`](/cli/gateway/query#param-no-probe)
- <a id="param-deep" />[`--deep`](/cli/gateway/query#param-deep)
- <a id="param-require-rpc" />[`--require-rpc`](/cli/gateway/query#param-require-rpc)
- <a id="status-semantics" />[状态语义](/cli/gateway/query#status-semantics)
- <a id="linux-systemd-auth-drift-checks" />[Linux systemd 授权漂移检查](/cli/gateway/query#linux-systemd-auth-drift-checks)
- <a id="param-port-3" />[`--port`](/cli/gateway/query#param-port-2)
- <a id="interpretation" />[解释](/cli/gateway/query#interpretation)
- <a id="json-output" />[JSON 输出](/cli/gateway/query#json-output)
- <a id="common-warning-codes" />[常见警告代码](/cli/gateway/query#common-warning-codes)
- <a id="param-ssh" />[`--ssh`](/cli/gateway/query#param-ssh)
- <a id="param-ssh-auto" />[`--ssh-auto`](/cli/gateway/query#param-ssh-auto)
- <a id="param-params" />[`--params`](/cli/gateway/query#param-params)
- <a id="param-url-2" />[`--url`](/cli/gateway/query#param-url-2)
- <a id="param-port-4" />[`--port`](/cli/gateway/query#param-port-3)
- <a id="param-token-3" />[`--token`](/cli/gateway/query#param-token-2)
- <a id="param-password-3" />[`--password`](/cli/gateway/query#param-password-2)
- <a id="param-timeout-2" />[`--timeout`](/cli/gateway/query#param-timeout-2)
- <a id="param-expect-final" />[`--expect-final`](/cli/gateway/query#param-expect-final)
- <a id="param-json-1" />[`--json`](/cli/gateway/query#param-json-1)
- <a id="command-options" />[命令选项](/cli/gateway/service#command-options)
- <a id="service-runtime" />[服务运行时](/cli/gateway/service#service-runtime)
- <a id="lifecycle-behavior" />[生命周期行为](/cli/gateway/service#lifecycle-behavior)
- <a id="managed-gateway-heap-sizing" />[托管网关堆大小调整](/cli/gateway/service#managed-gateway-heap-sizing)
- <a id="auth-and-secretrefs-at-install-time" />[安装时的Auth和SecretRefs](/cli/gateway/service#auth-and-secretrefs-at-install-time)
- <a id="param-timeout-3" />[`--timeout`](/cli/gateway/discovery#param-timeout)
- <a id="param-json-2" />[`--json`](/cli/gateway/discovery#param-json)

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
