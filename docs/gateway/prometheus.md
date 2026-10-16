---
summary: "通过 diagnostics-prometheus 插件将 OpenClaw 诊断指标导出为 Prometheus 文本指标"
title: "Prometheus 指标"
sidebarTitle: "Prometheus"
read_when:
  - "你希望 Prometheus、Grafana、VictoriaMetrics 或其他抓取器收集 OpenClaw Gateway 指标"
  - "你需要用于仪表盘或告警的 Prometheus 指标名称和标签策略"
  - "你希望在不运行 OpenTelemetry collector 的情况下获取指标"
---

OpenClaw 可以通过官方的 `diagnostics-prometheus` 插件公开诊断指标。它会监听受信任的诊断以及内部标记、由 dispatcher 拥有的诊断事件（队列、内存和会话恢复信号），并在以下地址渲染 Prometheus 文本端点：

```text
GET /api/diagnostics/prometheus
```

Content type 为 `text/plain; version=0.0.4; charset=utf-8`，即标准的 Prometheus 展现格式。

<Warning>
该路由使用网关身份验证（操作员范围、可信操作员表面），并要求调用者的有效范围包括 `operator.read`（由 `operator.write` 或 `operator.admin` 隐含）。请勿将其公开为未经身份验证的公共 `/metrics` 端点。通过与其他操作员 API 使用的相同身份验证路径来抓取它。
</Warning>

关于 traces、logs、OTLP push 以及 OpenTelemetry GenAI 语义属性，请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
  <Step id="enable-the-plugin" title="启用插件">
    <Tabs>
      <Tab id="config" title="配置">
        ```json5
        {
          plugins: {
            allow: ["diagnostics-prometheus"],
            entries: {
              "diagnostics-prometheus": { enabled: true },
            },
          },
          diagnostics: {
            enabled: true,
          },
        }
        ```
      </Tab>
      <Tab title="CLI">
        ```bash
        openclaw plugins enable diagnostics-prometheus
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step id="restart-the-gateway" title="重新启动网关">
    HTTP 路由会在插件启动时注册，因此启用后请重新加载。

    ```bash
    openclaw gateway restart
    ```

  </Step>
  <Step id="scrape-the-protected-route" title="抓取受保护的路由">
    发送与你的 operator 客户端相同的 gateway 认证：

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step id="wire-prometheus" title="电线 Prometheus">
    ```yaml
    # prometheus.yml
    scrape_configs:
      - job_name: openclaw
        scrape_interval: 30s
        metrics_path: /api/diagnostics/prometheus
        authorization:
          credentials_file: /etc/prometheus/openclaw-gateway-token
        static_configs:
          - targets: ["openclaw-gateway:18789"]
    ```
  </Step>
</Steps>

<Note>
`diagnostics.enabled` 默认为 `true`；仅在严格约束的环境中将其设置为 `false`。当导出器启动时为 `false` 时，插件仍会注册 HTTP 路由，但不会记录诊断事件或运行时标识，因此响应为空。
</Note>

## <a id="metrics-exported"></a> 导出的指标

| 指标                                                    | 类型      | 标签                                                                                    |
| --------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `openclaw_gateway_build_info`                             | 测量     | `process_instance_id`，可选`build_id`                                                |
| `openclaw_gateway_http_cancelled_total`                   | 柜台   | `source` (`client` or `shutdown`)                                                         |
| `openclaw_gc_duration_seconds`                            | 直方图 | `kind`, `thread`                                                                          |
| `openclaw_gateway_rpc_requests_total`                     | 柜台   | `method`                                                                                  |
| `openclaw_models_list_requests_total`                     | 柜台   | `client_kind`, `source`, `view`, `scope`, `refresh`, `prepared_only`                      |
| `openclaw_sessions_list_requests_total`                   | 柜台   | `client_kind`, `source`, `caller_source`, `row_mode`, `filter`                            |
| `openclaw_cron_list_requests_total`                       | 柜台   | `client_kind`, `source`, `scope`, `compact`, `page`                                       |
| `openclaw_gateway_rpc_first_response_seconds`             | 直方图 | `method`                                                                                  |
| `openclaw_gateway_rpc_response_bytes`                     | 直方图 | `method`                                                                                  |
| `openclaw_gateway_rpc_handler_heap_delta_bytes`           | 直方图 | `method`                                                                                  |
| `openclaw_gateway_rpc_handler_heap_delta_exclusive_total` | 柜台   | `method`                                                                                  |
| `openclaw_gateway_rpc_handler_seconds`                    | 直方图 | `method`                                                                                  |
| `openclaw_gateway_rpc_admission_seconds`                  | 直方图 | `method`                                                                                  |
| `openclaw_gateway_rpc_queue_wait_seconds`                 | 直方图 | `method`                                                                                  |
| `openclaw_chat_send_phase_seconds`                        | 直方图 | `phase`, `stage` (`request`, `startup`, `steer`, or `queued`)                             |
| `openclaw_gateway_rpc_stage_seconds`                      | 直方图 | `method`, `phase`                                                                         |
| `openclaw_gateway_rpc_stage_thread_cpu_seconds`           | 直方图 | `method`, `phase`                                                                         |
| `openclaw_worktree_preparation_seconds`                   | 直方图 | `kind`, `template`, `outcome`, `phase`                                                    |
| `openclaw_gateway_rpc_outcomes_total`                     | 柜台   | `phase`, `outcome`                                                                        |
| `openclaw_run_completed_total`                            | 柜台   | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`                           | 直方图 | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_secret_egress_requests_total`                   | 柜台   | `outcome`, `substituted`                                                                  |
| `openclaw_tool_catalog_total`                             | 柜台   | `mode`, `source`                                                                          |
| `openclaw_tool_catalog_tools_total`                       | 柜台   | `mode`, `source`                                                                          |
| `openclaw_model_call_total`                               | 柜台   | `api`, `error_category`, `model`, `observation_unit`, `outcome`, `provider`, `transport`  |
| `openclaw_model_call_duration_seconds`                    | 直方图 | `api`, `error_category`, `model`, `observation_unit`, `outcome`, `provider`, `transport`  |
| `openclaw_model_failover_total`                           | 柜台   | `from_model`, `from_provider`, `lane`, `reason`, `suspended`, `to_model`, `to_provider`   |
| `openclaw_model_tokens_total`                             | 柜台   | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`                      | 直方图 | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`                           | 柜台   | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_model_usage_duration_seconds`                   | 直方图 | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_skill_used_total`                               | 柜台   | `activation`, `agent`, `skill`, `source`                                                  |
| `openclaw_tool_execution_total`                           | 柜台   | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_duration_seconds`                | 直方图 | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_blocked_total`                   | 柜台   | `denied_reason`, `params_kind`, `tool`, `tool_owner`, `tool_source`                       |
| `openclaw_harness_run_total`                              | 柜台   | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`                   | 直方图 | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_webhook_received_total`                         | 柜台   | `channel`, `webhook`                                                                      |
| `openclaw_webhook_error_total`                            | 柜台   | `channel`, `webhook`                                                                      |
| `openclaw_webhook_duration_seconds`                       | 直方图 | `channel`, `webhook`                                                                      |
| `openclaw_message_received_total`                         | 柜台   | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_started_total`                 | 柜台   | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_completed_total`               | 柜台   | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_dispatch_duration_seconds`              | 直方图 | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_processed_total`                        | 柜台   | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds`             | 直方图 | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`                 | 柜台   | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`                         | 柜台   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`              | 直方图 | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                               | 柜台   | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`                    | 直方图 | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                               | 直方图 | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                                | 测量     | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`                        | 直方图 | `lane`                                                                                    |
| `openclaw_session_state_total`                            | 柜台   | `reason`, `state`                                                                         |
| `openclaw_sessions_active`                                | 测量     | `state` (`running`, `queued`)                                                             |
| `openclaw_gateway_active_work`                            | 测量     | `kind` (`agentRuns`, `chatRuns`, `queuedTurns`)                                           |
| `openclaw_session_queue_depth`                            | 测量     | `state`                                                                                   |
| `openclaw_session_turn_created_total`                     | 柜台   | `agent`, `channel`, `trigger`                                                             |
| `openclaw_session_stuck_total`                            | 柜台   | `reason`, `state`                                                                         |
| `openclaw_session_stuck_age_seconds`                      | 直方图 | `reason`, `state`                                                                         |
| `openclaw_session_recovery_total`                         | 柜台   | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`                   | 直方图 | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_gateway_event_loop_delay_max_seconds`           | 直方图 | 无                                                                                      |
| `openclaw_gateway_event_loop_observed_seconds_total`      | 柜台   | 无                                                                                      |
| `openclaw_liveness_warning_total`                         | 柜台   | `reason`                                                                                  |
| `openclaw_liveness_sessions`                              | 测量     | `state`                                                                                   |
| `openclaw_liveness_event_loop_delay_p99_seconds`          | 直方图 | `reason`                                                                                  |
| `openclaw_liveness_event_loop_delay_max_seconds`          | 直方图 | `reason`                                                                                  |
| `openclaw_liveness_event_loop_utilization_ratio`          | 直方图 | `reason`                                                                                  |
| `openclaw_liveness_cpu_core_ratio`                        | 直方图 | `reason`                                                                                  |
| `openclaw_payload_large_total`                            | 柜台   | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_payload_large_bytes`                            | 直方图 | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_memory_bytes`                                   | 测量     | `kind`                                                                                    |
| `openclaw_heap_space_bytes`                               | 测量     | `space`, `stat`                                                                           |
| `openclaw_worker_count`                                   | 测量     | 无（聚合），`script`                                                                |
| `openclaw_worker_queue_depth`                             | 测量     | `kind`                                                                                    |
| `openclaw_worker_queue_wait_seconds`                      | 直方图 | `kind`, `request_class`                                                                   |
| `openclaw_worker_request_seconds`                         | 直方图 | `kind`, `request_class`                                                                   |
| `openclaw_worker_heap_sampled_count`                      | 测量     | 无（聚合），`script`                                                                |
| `openclaw_worker_heap_used_bytes`                         | 测量     | `script`                                                                                  |
| `openclaw_worker_external_bytes`                          | 测量     | `script`                                                                                  |
| `openclaw_worker_array_buffers_bytes`                     | 测量     | `script`                                                                                  |
| `openclaw_code_mode_worker_memory_bytes`                  | 测量     | `slot`, `kind` (`external`, `array_buffers`)                                              |
| `openclaw_worker_started_total`                           | 柜台   | `script`                                                                                  |
| `openclaw_worker_retired_total`                           | 柜台   | `script`, `reason`                                                                        |
| `openclaw_worker_messages_total`                          | 柜台   | `kind`, `direction`                                                                       |
| `openclaw_worker_message_payload_bytes_total`             | 柜台   | `kind`, `direction`                                                                       |
| `openclaw_worker_message_unmeasured_total`                | 柜台   | `kind`, `direction`                                                                       |
| `openclaw_child_process_spawn_total`                      | 柜台   | `family`, `operation`                                                                     |
| `openclaw_memory_rss_bytes`                               | 直方图 | 无                                                                                      |
| `openclaw_memory_pressure_total`                          | 柜台   | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`                       | 柜台   | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`                | 柜台   | 无                                                                                      |
| `openclaw_diagnostic_async_queue_dropped_total`           | 柜台   | `drop_class`                                                                              |
| `openclaw_diagnostic_async_queue_length`                  | 测量     | 无                                                                                      |

工作线程消息计数器描述网关主线程工作线程传输上的发送和接收，带有 `direction="to_worker"` 或 `direction="from_worker"`。固定的`kind`标记单独的SQLite请求和回复、任务输入和回复、任务请求、通知、消费收据、准入、权限、资源、生命周期、内存、实时和其他消息。总数在工人退休后仍然存在，并与内存样本一起发布。在工作程序绑定端口上排队的帖子在被端口接受时计数，即使稍后取消会阻止将该端口移交给工作程序。这些计数器描述的是运输工作，而不是确认的交货。

有效负载字节使用现有的编码缓冲区大小或廉价的所有者估计；它们排除了传输框架，并且不测量结构化克隆分配。提交收据重用其已计算的序列化事实大小。内存报告计数数字堆计数器和 GC 持续时间； GC 种类标签和对象信封不包括在内。权限包括transaction/commit的准入和结算，而不仅仅是授权检查；任意承认的事实仍然无法衡量。没有已知大小的对象图会增加 `openclaw_worker_message_unmeasured_total`，而不是显示为测量的零字节消息。在得出结论之前将字节排名与此覆盖计数器进行比较；嵌套的工作线程到工作线程的流量不会跨越主线程边界。

具有访问器或只读方法的外部 Worker 实例或不可扩展的实例保留 CPU 和生命周期跟踪，但排除每条消息的流量。检测不会取代那些受保护的方法。

对于模型调用指标，`observation_unit="request"` 测量一个可观察的提供者请求。 `observation_unit="turn"` 测量可以包含多个隐藏提供者请求的合成 Claude Code 或 Codex CLI 代理轮次。比较延迟时将这些系列分开。

网关 RPC 指标涵盖有效的经过身份验证的 WebSocket 请求，包括后续拒绝。 `first_response` 通过发送方接受的第一帧测量接收；不可用或被抑制的发送没有持续时间样本。 `handler` 通过 return 或 throw 测量实际处理程序调用，`admission` 通过该调用测量接收。 `queue_wait` 仅测量操作员请求启动队列等待，与 command/session 通道指标分开。它们测量的是经过的时间，而不是 CPU 时间。处理程序返回后的早期确认和响应与已完成的代理工作不同。请参见 [Gateway RPC 时序语义](/gateway/opentelemetry#gateway-rpc)。

连接的客户端请求帧通过验证后开始接收。这些计时不包括 CLI 启动、本地诊断、connection/authentication 设置以及请求分派之前的事件循环延迟。直方图记录已完成的观察结果：未完成的处理程序还没有处理程序持续时间样本。在调查超时时比较请求计数、完成的计时和事件循环观察结果；仅低处理程序延迟并不能建立响应式客户端路径。

RPC 方法标签包含准确的核心和注册插件方法名称，`other` 表示未注册的请求，`unknown` 表示无法识别的专用工作 RPC。在收到请求时检查目录成员资格，因此插件注册表替换会影响后续请求，而无需单独的标签缓存。

`openclaw_models_list_requests_total` 单独将目录读取属性指定为握手的规范客户端类型，例如 `openclaw-control-ui`、`openclaw-macos` 或 `gateway-client`。 `source="wire"` 识别客户端请求帧； `source="internal"` 通过调整后的响应来识别服务器分派的请求，包括连接的初始模型快照。对于无效值，`view` 为 `default`、`configured`、`provider-config`、`all` 或 `other`。 `scope` 记录参数存在：`session`，然后是 `auth-profile`，然后是 `agent`，或者在未提供时为 `global`。 `refresh`和`prepared_only`记录对应的参数是否正好是`true`。计数包括后来被拒绝的请求；范围不描述授权结果。不会导出代理、会话、配置文件、连接、用户代理或显示名称值。每个观察到的标签组合都使用现有共享上限中的一个样本。仅方法请求计数器和时序直方图保留其现有标签。

`openclaw_sessions_list_requests_total` 使用相同的 `client_kind` 和 `source` 属性进行会话读取。 `caller_source` 记录协议的有界调用者标签（`sidebar`、`dashboard`、`activity`、`sessions-page`、`chat-pane`、`agent-roster`、`command-palette` 或`skill-workshop`）；丢失或未知的标签变为 `unspecified`。省略时，`row_mode` 为 `full`；无效值则为 `compact`、`dashboard`、`sidebar` 或 `other`。 `filter` 记录第一个匹配的初级过滤器系列：`search`、`children` （`spawnedBy`）、`owner` （`ownerId`）、`involving` （`involvingMe=true`、`involvingProfileId`、或 `profileRelation`）、`active`（`activeOnly=true` 或 `activeMinutes`）或 `general`（如果不适用）。其他选择和呈现选项不添加标签。计数包括后来拒绝的请求，并且不导出任何过滤器值、限制、偏移量或修订标记。每个观察到的组合都使用现有共享上限中的一个样本。

`openclaw_cron_list_requests_total` 对 cron 读取使用相同的 `client_kind` 和 `source` 属性。 `scope` 记录参数存在：当提供 `sessionKey` 时为 `session`，对于 `agentId` 则为 `agent`，否则为 `global`。 `compact`记录参数是否正好是`true`；对于正数值偏移，`page` 是 `append`，否则是 `first`。计数包括后来被拒绝的请求；范围不描述授权结果。不会导出任何会话、代理、查询或偏移值。每个观察到的组合都使用现有共享上限中的一个样本。

结果总数按阶段和结果汇总，没有方法维度。具有所有四个计时、字节直方图和独占样本计数器的每种方法在共享的 2,048 个样本上限中占用 8 个聚合样本。 RPC 持续时间直方图占用一个样本，但扩展为 44 个抓取系列（41 个有限桶、`+Inf`、总和和计数）。因此，四个计时直方图每种方法使用 176 个抓取系列，而之前为 76 个。包括请求和独占样本计数器以及两个字节直方图，每个完全观察到的方法提供 236 个系列（100 个方法为 23,600 个），加上共享结果总数。响应大小和带符号堆增量直方图分别扩展到 20 和 38 系列；请参阅 [RPC 响应大小和堆更改](/gateway/diagnostics#rpc-response-size-and-heap-changes)。当上限填满时，现有样品不断更新；未见过的 RPC 或其他操作样本将被拒绝并增加 `openclaw_prometheus_series_dropped_total`。监视计数器：每个核心方法的覆盖范围都可以填满上限，因此在解释总数或延迟百分位时，零值很重要。 `openclaw_diagnostic_async_queue_dropped_total` 报告称，异步诊断队列饱和也会丢弃观察结果。

四个 RPC 时序直方图使用这些有限上限（以秒为单位）：

```text
0.005, 0.01, 0.0125, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08,
0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8,
1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8,
10, 12.5, 15, 20, 25, 30, 60, 120, 300, 600
```

在 10 ms 和 30 s 之间，相邻边界最多相差 4/3。分位数仍然在桶内插值；它们是估计值，而不是精确的观察值。例如，先前布局中的 995 ms p99 可以代表 500-1,000 ms 范围内的任何位置的样本。新布局将该间隔分为 600 毫秒和 800 毫秒。其他持续时间直方图保留其现有布局。导出器使用经典的 Prometheus 文本直方图，而不是本机直方图。

所有先前的边界仍然可用于阈值警报。在升级期间，将 `histogram_quantile` 的不同存储桶布局的目标分开，或在聚合之前过滤到旧的常见 `le` 值。每个目标升级后等待完整的查询率窗口，然后再使用新边界比较分位数；不要在记录规则中混合新旧布局。

### <a id="http-cancellations"></a> HTTP 取消

`openclaw_gateway_http_cancelled_total` 统计在完成之前取消的 HTTP 请求，其中 `source="client"` 表示断开连接的客户端，`source="shutdown"` 表示网关关闭。这些预期的取消不会产生未处理的请求错误日志。该指标不包含请求 URL、文件路径或客户端标识符，并遵循现有的诊断启用和异步队列限制。正常的 HTTP 取消不会保留在稳定性事件缓冲区中。

### <a id="worktree-preparation"></a> 工作树准备

`openclaw_worktree_preparation_seconds` 记录每次托管结帐或沙箱准备，包括失败。 `kind` 将 `managed` 创建与 `sandbox` 投影和后端准备情况区分开来。 `template` 区分 `warm`、`cold`、`unavailable` 和 `reused` 现有投影； `outcome` 是 `returned` 或 `threw`。 `phase=total` 是完整的经过时间。其他固定相有 `allocate`、`checkout`、`setup`、`templatePrepare`、`templateApply`、`snapshot`、`synchronizeCanonical`、`synchronizeProjection`、`workspaceLayout` 和`containerStart`。仅记录输入的阶段。嵌套阶段是包容性的，不能求和。路径、会话标识符或模板键都不会成为指标标签。

### <a id="catalog-list-stages"></a> 目录列表阶段

阶段直方图目前仅涵盖 `sessions.catalog.list`。他们使用六个固定相位标签：

| 阶段                | 观察                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `projection_initial` | 当请求必须等待时，初始共享投影准备就绪                  |
| `planning`           | 同步创建和冻结领导者的提供商计划快照         |
| `provider`           | 领导者枚举，包括提供者准入、等待的源工作和完成 |
| `coalesced`          | 追随者等待同一调用者和请求的现有枚举         |
| `projection_final`   | 枚举后所需的共享投影准备情况                               |
| `delivery`           | 同步最终投影、可见性过滤和响应回调             |

每个进入的阶段都会贡献一个完整的经过观察，包括该阶段抛出的时间。不存在未访问的阶段。仅元数据请求不会进入这些阶段。提供者和预测持续时间包括等待的工作和日程安排；它们不是 CPU 时间或共享工作的专有所有权。

线程CPU直方图仅记录`planning`和`delivery`。它的间隔永远不会在遥测发射之前跨越等待和完成。它们包括同线程本机工作和垃圾收集，但不包括工作线程 CPU、后台物化和进度发布。它们是选择的CPU间隔，而不是完整的请求CPU总计。如果 CPU 计数器读取失败，则 CPU 观察将被忽略，同时经过的计时和请求结果仍然可用。计算平均值时比较每个指标本身的计数。

只要诊断和感兴趣的可信消费者处于活动状态，这些可信的、无负载的观察就使用现有的有界诊断队列和导出器端点。它们没有慢日志阈值，并且不添加请求、会话、提供者或主机标签。在现有的 2,048 个样本上限下，六个已逝群体和两个 CPU 群体最多消耗 8 个聚合样本，或 152 个暴露的直方图系列。启动阶段发射及其整个过程CPU语义不变。

禁用跟踪的 OpenTelemetry 导出器不会请求相位事件。配置的 Prometheus 导出器将这些观察结果记录为指标，而不需要 OpenTelemetry 跟踪。

### <a id="current-sessions-and-work"></a> 当前会话和工作

使用 `openclaw_sessions_active` 作为当前会话负载。它的两个系列使用与 `sessions.list` 和 `activeOnly: true` 相同的实时运行投影来计算正在运行和排队的会话。计数涵盖分页之前的完整操作员名册，包括全局和未知会话；存档会话和 cron 运行历史记录使用列表的默认排除项。与使用 `includeGlobal: true` 和 `includeUnknown: true` 的未过滤操作员列表进行比较，该列表不是仅限于一个代理或查看者的列表。

`openclaw_gateway_active_work` 公开了网关现有活动工作快照中的三个计数：

| `kind`        | 含义                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `agentRuns`   | 承认的代理运行上下文，包括会话名册中不可见的工作。 |
| `chatRuns`    | 尚未中止或请求注册清理的已注册聊天运行。     |
| `queuedTurns` | 尚未中止的排队聊天回合。                                          |

这些类别重叠。不要将它们相加来获得总运行或会话计数。它们涵盖了训练和跑步活动，而不是完整的暂停阻滞剂清单；单独为零并不能确定网关可以挂起。当导出器处于活动状态时，两个仪表都会刷新所有者更改，而无需轮询或读取记录。当相关工作耗尽时，它们就会归零。在网关投影准备好之前以及停止之后，该系列不存在，而不是报告假定的空闲状态。

`openclaw_session_state_total` 是自导出程序启动 **以来状态观察的** 累积计数器，而不是当前会话计数或唯一会话计数。反复观察`processing`不断增加；完成不会减少它。例如，`processing=60` 可以与零实时会话共存。使用`rate(openclaw_session_state_total[5m])`测量观测频率。 `openclaw_session_queue_depth` 同样只是每个诊断状态最新观察到的单个会话队列深度，而不是总排队工作。

```promql
sum(openclaw_sessions_active)
openclaw_gateway_active_work{kind="queuedTurns"}
```

### <a id="runtime-identity"></a> 运行时标识

`openclaw_gateway_build_info` 具有值 `1` 并标识服务于抓取的进程。其`process_instance_id`与`system.info`返回的相同进程拥有的UUID；当进程重新启动时，包括重新使用 PID 时，它会发生变化。 `build_id` 与 `hello.server.buildId` 报告的加载版本匹配，并且当来源不可用时被忽略。更新磁盘上的文件不会更改正在运行的进程的标识。

启用诊断后，导出器会在服务启动时捕获这些事实，然后再记录事件。该指标在现有上限下使用一个聚合样本。没有可选的运行时身份功能的旧主机会忽略它。 UUID 仅限于此信息指标；它不会添加到 RPC 或其他度量标签中。

使用同一抓取中的信息样本来归因新的测量值并在过程更改时分割计数器间隔。它不是健康信号、请求 ID 或导出器纪元：在同一进程中重新启动导出器会重置其计数器，同时保留进程标识。它无法重新标记较旧的样本或建立完整的诊断丢失覆盖范围。

### <a id="event-loop-observation-windows"></a> 事件循环观察窗

`openclaw_liveness_cpu_core_ratio` 测量核心等效项（包括工作线程和本机线程）中的整个进程 CPU 使用情况，并且可能超过 `1`。将其与主线程延迟和利用率一起解释；请参见 [CPU 压力和事件循环延迟](/gateway/health#cpu-pressure-and-event-loop-delay)。

事件循环直方图记录每个已完成的网关运行状况监控窗口的最大延迟。计数器对这些窗口所代表的秒数进行求和。两者都是累积的：较晚的健康窗口不会消除较早的高延迟观察。准备情况、状态和抓取请求会消耗已完成的观察结果，而无需提前或重置采样窗口。

监视器每 20 毫秒对经过的事件循环间隔进行采样，并在至少一秒后完成一个窗口，或者更快地发出延迟警告。它保留了普通窗口重置之间的待处理间隔，因此在逾期样本之前读取运行状况无法消除该延迟。直方图计数是窗口计数，而不是停顿计数。直方图分位数描述窗口最大值，而不是采样的事件循环延迟分布或其整体 p99。这些指标没有请求标签或跟踪归因，并且无法识别被阻止的 JavaScript 函数。

Collection 使用上面的插件支持。它在感兴趣的指标导出器运行时启动；它不会回填较早的窗口。有意的监视器重置会丢弃未完成的窗口。诊断队列丢弃、导出器的系列上限和进程重新启动也可能会丢失观察结果。评估覆盖范围时，请注意现有的丢弃计数器和代表持续时间计数器。准备决策和持续的活性警告阈值保持不变。

### <a id="worker-request-queues"></a> Worker 请求队列

`openclaw_worker_queue_depth{kind}` 报告此类工人所有者等待调度的请求。它包括 SQLite 写入器容量等待程序和范围只读请求，并排除已占用执行槽的请求。 `openclaw_worker_queue_wait_seconds{kind,request_class}` 测量入队到调度； `openclaw_worker_request_seconds{kind,request_class}` 测量调度回复或失败。两者都使用现有的持续时间直方图桶。分派前取消会删除排队的请求，而不添加持续时间样本。

`openclaw_worker_request_phase_seconds{kind,request_class,phase}` 使用相同的直方图桶将已完成的 SQLite 写入器请求分解为观察间隔：

| 阶段      | 间隔                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `dispatch` | 通过主机准备时隙分配到第一个`postMessage`。     |
| `delivery` | 首先`postMessage`给工人收据，包括冷工人启动。    |
| `input`    | 工作人员收到完成命令重建的信息，包括所有帧。 |
| `prepare`  | 命令重构到后端执行。                             |
| `execute`  | 后端执行，包括所有者代码、准入交换和SQL。   |
| `result`   | 执行通过清理、序列化和结果框架结束。        |
| `reply`    | 最终答复准备并通过经纪人收据发布。              |

Prometheus 订阅启用这些时间戳，无需重新启动或诊断标志。大结果传输保留在`result`；输入和结果帧为完整请求的每个阶段生成一个样本。缺失或无效的间隔不会产生任何样本。打开、关闭和失败的请求可能会忽略它们从未到达的阶段。 `postMessage` 完成与工作人员活动重叠，不会添加为另一个阶段。代理收到后的呼叫者调度不属于这些阶段。

任务类型使用其注册的运行时入口点名称，例如 `gitOperations`、`preparedModelCatalog`、`codeModeNode` 和 `sessionTranscript`。独立捆绑工作线程具有固定名称，例如 `diskBudget`、`memorySearch` 和 `teamReports`。无法识别的 SDK 工作文件名使用 `extension`；任意文件名和路径永远不会成为标签。这取代了广泛的 `compute` 和 `other` 任务存储桶，并重命名了以前分组的任务类型，因此更新选择这些旧标签的查询。

SQLite 传输类型仍为 `sqlite_read` 和 `sqlite_writer`。请求类保留 `open`、`close`、`transcript_read`、`sessions`、`transcripts`、`domain_execute`、`plugin_state`、`auth_profiles` 和 `cron`。其他命令使用固定操作系列，例如 `workerInference`、`capture` 或 `diagnostic`。审计编写器、数据库生命周期和状态租赁命令具有更精细的标签，例如 `audit.writer.process`、`database.inspectIdle` 和 `stateLease.renew`。未知命令保留`execute`；未知请求类别变为 `other`。允许名单绑定基数，无需发布会话 ID、数据库路径、命令后缀或调用者提供的名称。出口商的共享系列上限仍然适用。

`transcripts` 请求系列包括存储的事件追加和保留。

共享状态读取使用类型 `stateRead`（以前称为 `state_read`）以及与 SQLite 编写器相同的有界操作系列分类器。示例包括 `devicePairing`、`acpSessions`、`workers` 和 `cron`；独立准入读取使用 `admit`。读取所有者在队列准入之前提供操作，因此队列等待和执行使用相同的类，而不标记请求有效负载。

Dispatch 是主机调度程序分配的插槽，而不是工作端 CPU 时间戳。请求持续时间包括准备、冷工启动、运输、主机交换和 I/O. 一般任务池报告 `task`； SQLite 命令保留其有界操作系列。这些指标不会分隔同一工作线程入口点的各个池，并且无范围的一次性检查子流程位于队列计量器之外。身份和头像池与其他计算池共享计算准入；他们的队列等待本身并不能证明他们自己的工人限制太小。

观察使用现有的异步诊断队列，并在消费者订阅时开始。队列丢弃可能会丢失样本或将仪表保留为上次交付的值，直到另一个请求更新它。在解释饱和区间之前检查 `openclaw_diagnostic_async_queue_dropped_total`。工作人员限制、调度顺序或取消行为没有变化。

```promql
# Worker wait p99, by kind and bounded request family
histogram_quantile(0.99,
  sum by (le, kind, request_class) (rate(openclaw_worker_queue_wait_seconds_bucket[5m])))

# Request classes occupying dispatch slots for the most wall time
sum by (kind, request_class) (rate(openclaw_worker_request_seconds_sum[5m]))

# Where SQLite writer requests spend their observed wall time
sum by (request_class, phase) (rate(openclaw_worker_request_phase_seconds_sum[5m]))

# Shared-state read rate, by operation family
sum by (request_class) (rate(openclaw_worker_request_seconds_count{kind="stateRead"}[5m]))
```

### <a id="memory-and-process-churn"></a> 内存和进程搅动

`openclaw_memory_bytes` 公开 `rss`、`heap_total`、`heap_used`、`external`、`array_buffers`、`worker_heap_total` 和 `worker_heap_used`。 RSS涵盖了整个过程。无前缀堆和本机缓冲区值覆盖了主要隔离区； `array_buffers` 包含在 `external` 中，因此请勿将它们添加在一起。这些值并不考虑每个本机分配或分配器领域。

Worker 总数是资源注册表启动后创建的活动 Worker 中已完成的本机堆样本的总和。在 Node 上，这包括直接插件 Workers；嵌套 Workers、本机库线程池（例如 Discord DAVE 的 Rayon 池）和 V8 的内部线程位于父注册表之外。 30 秒的诊断心跳启动一次非阻塞刷新，每个 Worker 最多保留一个未完成的请求。样本在 60 秒后过期，并在 Worker 退出时被删除。将 `openclaw_worker_heap_sampled_count` 与 `openclaw_worker_count` 进行比较：启动、不可用的 API 和停滞的 Workers 可能会产生部分总计。不会创建堆快照或额外的采样计时器。这两个计数指标还公开了 `script="..."` 系列：`openclaw_worker_count` 计算该脚本的所有活动 Worker，包括等待或丢失新样本的 Worker，而 `openclaw_worker_heap_sampled_count` 计算其新样本。原始未标记系列保留总计。对脚本系列进行求和时选择 `{script!=""}`，以避免再次计算总计。 `openclaw_worker_heap_used_bytes{script="..."}` 对每个 Worker 脚本的新堆样本求和。 `openclaw_worker_external_bytes` 和 `openclaw_worker_array_buffers_bytes` 将来自相同样本的相应可用计数器与 `script` 相加。 ArrayBuffer字节包含在外部存储器中；不要将它们加在一起。仅本机堆样本提供外部内存，但没有 ArrayBuffer 计数，因此 ArrayBuffer 总数可以覆盖比堆样本计数更少的 Worker。丢失的计数器被忽略，而测量的零字节被导出为零。标签使用运行时入口点、池化和捆绑插件 Worker 基本名称的固定白名单，在源和打包运行中标准化为 `.js`；未知、评估和未包装的第三方 Worker 使用 `other`。完整路径和评估源永远不会被记录。当一个剧本的系列没有活生生的、新鲜的样本时，它的系列就会消失；当它没有活的 Workers 时，它的计数系列就会消失。内存压力日志包括相同的字节计数和 Worker 覆盖计数，以及 `workerHeaps`：与 `{script, heapUsed, heapTotal}`（字节）一样的五个最大的单独新 Worker 堆，使用相同的有界脚本名称。

会话记录数据库通道在五分钟空闲后退出，释放其隔离堆以及保留的读取器。请求重置车道的空闲期限；主动读取和主机回调在停用之前完成。下一个请求通过正常的数据库准入重新创建通道的工作人员。单独的 SQLite 手柄保留窗口仍为 30 分钟。

`openclaw_worker_started_total{script="..."}` 和 `openclaw_worker_retired_total{script="...",reason="..."}` 通过相同的心跳公开累积启动和确认的本机退出。退休原因为 `idle_timeout`、`memory_pressure`、`closed`、`rotation`、`cancelled`、`failure`、`eviction`、`idle-expiry`、`dispose`、 `shutdown`、`crash`、`gc-thrash` 或 `exit`（当所有者未指定原因时）。代码模式区分热缓存驱逐、空闲到期、显式处置、主机关闭、本机崩溃和 GC-watchdog 退休；请参阅 [ 代码模式执行器 ](/tools/code-mode/executors)。在 Worker 退出之前，退休请求不算数；失败的终止和重试不会重复计算。计数器在导出器重新启动后仍然存在，并随进程重置。使用 `60 * rate(openclaw_worker_started_total[5m])` 表示脚本每分钟的启动次数。这些计数共享上述注册表覆盖范围限制；它们不测量退出释放的常驻内存。

`openclaw gateway call diagnostics.lanes --json` 还报告 `workerCount`、`workerPoolCount` 和 `workerPools`。每个池条目包含一个进程本地 `poolId`、一个允许列表中的 `script` 及其实时 `workerCount`。响应列出了 100 个最大的实时矿池； `workerPoolCount` 包括所有实时池。计数包括待处理的退休数，直到本机退出为止，并在池中没有活动 Workers 时消失。直接工人向 `workerCount` 做出贡献，无需加入资金池。这些是 JavaScript Worker 计数，而不是操作系统线程普查。

`openclaw_child_process_spawn_total{family="...",operation="..."}` 通过 OpenClaw 的共享生成和执行所有者来计算成功启动，包括代理和本机 PTY 启动以及流式工作区库存运行程序。 Windows PTY 在异步 PID 发布后首次输出或退出时归属。必须启用诊断。现有的心跳至少在一分钟后发布累积计数，调试日志使用实际经过的时间间隔报告计数和速率。失败的启动、绕过这些所有者的直接调用以及由子项启动的后代都被排除在外。系列是固定的可执行文件名称白名单；无法识别的命令变为 `other`。 Git 发布带有有限的 owner/operation 标签：`repository.identities`、`repository.branches`、`checkout.revision`、`checkout.context`、`checkout.diff`、`checkout.baseline`、`pull-request.branch-facts`、`worktree.snapshot`、 `worktree.cleanup`、`worktree.provision`、`worktree.inspect`、`worktree.recovery`、`workspace.inventory`、`workspace.manifest`、`project.clone`、`workspace.result-cleanup`、`session.materialize` 或`publication`。直接主机运行者还可以识别 `github.identity`、`project.checkout`、`update.inspect`、`worktree.config`、`worktree.maintenance`、`workspace.sync` 和 `workspace.result`。当父级启动 Git 时，工作人员操作保留其承认的所有者，包括并行批处理和重试。流式工作空间清单和打包命令默认为 `workspace.inventory`，同时保留承认的周围所有者。 Git 在没有承认的所有者的情况下启动，使用固定的 `unscoped.<command>` 标签，例如 `unscoped.config`、`unscoped.rev-parse` 或 `unscoped.status`。在对命令进行分类之前，会跳过全局 Git 选项及其值；无法识别的命令、别名和选项布局使用 `unscoped.other`。这些标签将替换 `unknown` 以进行无范围启动，因此请更新选择该标签的查询。无效的显式所有者仍使用 `unknown`。其他可执行系列使用有界所有者，例如 `agent.exec`、`shell.snapshot` 和 `service.relay`，或固定后备分类，例如 `unscoped.shell-command`、`unscoped.shell`、`unscoped.runtime`、`unscoped.version`、`unscoped.gh` 和`unscoped.command`。代理执行人员的继电器保留 `agent.exec`。 SQLite 读取发布保留其 `sqlite.scoped-read.broker`、`sqlite.scoped-read.native`、`sqlite.session.broker` 或 `sqlite.session.native` 标签。更新查询，选择 `operation="none"` 以选择相关所有者或删除操作过滤器以保留每个系列的视图。 Linux OOM-protection exec 包装器报告逻辑目标系列，因为代理可以省略 shell。参数、存储库路径、会话 ID 和自由文本调用者名称永远不会被记录。对于按 Git 所有者分组的每分钟启动次数，请使用 `60 * sum by (operation) (rate(openclaw_child_process_spawn_total{family="git"}[5m]))`。要保留以前的每个系列视图，请使用 `60 * sum by (family) (rate(openclaw_child_process_spawn_total[5m]))`；该窗口容纳分钟批量的出版物。记账路径都不会改变压力阈值或用户工具执行。

`workspace.result-cleanup` 标识启动后工作人员安置的孤立参考库存。它每次完整恢复扫描最多连续检查八个签出根，并产生活动网关请求。现有的恢复调度程序继续未完成的工作；仅针对该启动清理过程保留记录已完成的根。正常结果结算仍然会立即删除自己的裁判。

### <a id="garbage-collection-duration"></a> 垃圾收集持续时间

`openclaw_gc_duration_seconds` 记录 Node.js 为主要隔离和仪表工作人员报告的已用垃圾收集 （GC） 持续时间。 `kind` 是 `scavenge`（次要）、`mark_sweep_compact`（主要）、`incremental` 或 `weak_processing`，取自本机 GC 配置文件的集合类型。 `thread` 是 `main` 或列入许可名单的工作脚本基本名称；未知的工作脚本使用 `other`。本机采样报告 `reason="other"`：`GCProfiler` 不公开回调标志。 SDK 生产者仍可以提供有界回调标志标签 `none`、`forced`、`synchronous_phantom_processing`、`all_available_garbage`、`all_external_memory`、`schedule_idle` 或 `construct_retained`。这些标志并不是 V8 启动收集的完整内部原因。

代码模式 Node 工作线程还带有一个可重用的 `slot` 标签（从 1 到 64）。工作线程注册表保留一个槽，直到本机工作线程退出（包括待退休），然后使其可供重用。超过 64 的并发工作人员保留脚本级归因，没有槽位；其他工作脚本也保留脚本级别的属性。槽不是线程 ID 或会话标识。计数器会在一个槽位的占用者之间累积，因此费率窗口可以跨越多个工作人员。省略归因的较旧 SDK 生产者使用 `kind="unknown",reason="other",thread="main"`。 SDK- 提供的未知种类和工人名称在事件发射时折叠为 `unknown` 和 `other`。每个观察都是一个 GC 条目，而不是 CPU 时间、分配的字节或保证的世界暂停。将其存储桶计数与事件循环窗口最大值进行比较，以调查 GC 是否是造成停顿的可能因素；匹配的刮擦间隔并不能证明因果关系。

收集使用现有的诊断支持，并在诊断心跳观察到感兴趣的使用者（例如指标导出器）时启动。心跳启动后添加的消费者可能会等到下一个 30 秒的滴答声，或者如果事件循环停止则等待更长的时间。观察者激活之前的条目不会被回填。在交付条目时会检查需求，因此在下一次心跳之前短暂的消费者间隙仍然会产生延迟的观察结果。失去最后一个消费者会抑制新的出口；观察者在下一个心跳时断开连接。禁用诊断或停止心跳会立即断开主观察者的连接，并通过其现有的内存遥测端口发送工作线程断开连接请求。繁忙的工作进程在其事件循环恢复时处理该请求；与此同时，出口受到抑制。

直方图在第一次观察之前不存在，因此不存在并不能证明零 GC。队列下降、系列上限、观察间隙和流程重新启动限制了覆盖范围。诊断disable/re-enable保留出口商现有的柜台；重新启动导出器会像往常一样重置它们。每个隔离区的一个共享本机分析器消耗未引用的一秒计时器，而不是在每个 GC 之后调度 JavaScript。采样不会强制 GC 或收集应用程序有效负载。 Worker GC批量复用内存遥测端口；端口关闭会停止其观察者。不包括没有该端口的工作人员、此注册表之外的嵌套工作人员以及没有本机 GC 条目的运行时。工作人员退出可能会丢失最终未交付的批次。

直方图的 `_count` 和 `_sum` 是每个标签集的收集计数和总经过秒数。需要单个总计的现有查询应聚合新标签；选择 `thread="main"` 以保留主隔离范围：

```promql
sum by (kind, thread) (rate(openclaw_gc_duration_seconds_count[5m]))
sum by (kind, thread) (rate(openclaw_gc_duration_seconds_sum[5m]))
```

要找到繁忙的代码模式隔离并将其最新使用的堆与其实际的 V8 限制进行比较：

```promql
60 * sum by (slot, reason) (
  rate(openclaw_gc_duration_seconds_count{thread="code-mode-node.worker.js",kind="mark_sweep_compact",slot!=""}[5m])
)
openclaw_code_mode_worker_heap_bytes{kind="used"}
  / ignoring(kind) openclaw_code_mode_worker_heap_bytes{kind="limit"}
```

`openclaw_code_mode_worker_heap_bytes` 复用现有的内存心跳，并通过 `slot` 和 `kind="used"` 或 `kind="limit"` 标记样本。工作人员退出或过时采样后，仪表在下一个内存采样时消失；在没有 V8 的情况下，运行时会忽略缺少的限制。脚本级工作线程堆指标继续包括所有工作线程，包括槽溢出。没有引入额外的堆中断或采样定时器。

`openclaw_code_mode_worker_memory_bytes` 使用内存心跳已携带的计数器，公开与 `kind="external"` 和 `kind="array_buffers"` 相同的插槽。丢失的计数器被省略，并且在退出或过时采样后，仪表在下一个内存样本上消失，就像堆仪表一样。插槽溢出仍然包含在脚本级总计中。这些计数器并不考虑每个本机分配或分配器区域。

OpenTelemetry 的 `openclaw.gc.duration_ms` 使用相应的 `openclaw.gc.kind`、`openclaw.gc.thread` 和可选的 `openclaw.gc.worker_slot` 属性。

## <a id="label-policy"></a> 标签政策

<AccordionGroup>
  <Accordion id="bounded-low-cardinality-labels" title="有界、低基数标签">
    Prometheus 标签保持有界和低基数。导出器不会发出原始诊断标识符，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、消息 ID、聊天 ID 或提供商请求 ID。

    标签值会被脱敏，并且必须符合 OpenClaw 的低基数字符策略。不符合该策略的值会根据指标不同被替换为 `unknown`、`other` 或 `none`。看起来像带作用域的 agent session key 的标签也会被替换为 `unknown`。

  </Accordion>
  <Accordion id="series-cap-and-overflow-accounting" title="系列上限和溢出核算">
    导出器将内存中保留的时间序列总数上限设为 **2048**，该上限适用于计数器、仪表和直方图的总和。超过该上限的新系列会被丢弃，并且每发生一次，`openclaw_prometheus_series_dropped_total` 就会加一。

    请将这个计数器视为上游属性泄露高基数值的硬性信号。导出器不会自动取消该上限；如果它持续上升，应修复数据源，而不是禁用上限。

  </Accordion>
  <Accordion id="what-never-appears-in-prometheus-output" title="从未出现过的东西Prometheus输出">
    - prompt 文本、response 文本、工具输入、工具输出、系统 prompt
    - Talk 转录、音频负载、call id、room id、handoff token、turn id 以及原始 session id
    - raw 提供者请求 ID（仅适用于跨度上的有界散列 — 绝不适用于指标）
    - 会话密钥和会话 ID
    - 主机名、文件路径、密钥值

  </Accordion>
</AccordionGroup>

## <a id="promql-recipes"></a> PromQL 示例

```promql
# Gateway RPC requests per second by method
sum by (method) (rate(openclaw_gateway_rpc_requests_total[5m]))

# Model catalog calls per minute by caller and request shape over ten minutes
60 * sum by (client_kind, source, view, scope, refresh, prepared_only)
  (rate(openclaw_models_list_requests_total[10m]))

# Session list calls per minute by caller and request shape over ten minutes
60 * sum by (client_kind, source, caller_source, row_mode, filter)
  (rate(openclaw_sessions_list_requests_total[10m]))

# Cron list calls per minute by caller and request shape over ten minutes
60 * sum by (client_kind, source, scope, compact, page)
  (rate(openclaw_cron_list_requests_total[10m]))

# 95th percentile first-response latency by method
histogram_quantile(
  0.95,
  sum by (le, method) (rate(openclaw_gateway_rpc_first_response_seconds_bucket[5m]))
)

# 95th percentile operator request start-queue wait by method
histogram_quantile(
  0.95,
  sum by (le, method) (rate(openclaw_gateway_rpc_queue_wait_seconds_bucket[5m]))
)

# Tokens per second, split by provider
sum by (provider) (rate(openclaw_model_tokens_total[1m]))

# Spend (USD) over the last hour, by model
sum by (model) (increase(openclaw_model_cost_usd_total[1h]))

# 95th percentile model run duration
histogram_quantile(
  0.95,
  sum by (le, provider, model)
    (rate(openclaw_run_duration_seconds_bucket[5m]))
)

# Queue wait time SLO (95p under 2s)
histogram_quantile(
  0.95,
  sum by (le, lane) (rate(openclaw_queue_lane_wait_seconds_bucket[5m]))
) < 2

# Skill usage, split by bounded source
sum by (skill, source) (increase(openclaw_skill_used_total[24h]))

# Dropped Prometheus series (cardinality alarm)
increase(openclaw_prometheus_series_dropped_total[15m]) > 0

# Completed windows whose maximum delay exceeded one second
increase(openclaw_gateway_event_loop_delay_max_seconds_count[5m])
  - increase(openclaw_gateway_event_loop_delay_max_seconds_bucket{le="1"}[5m])

# Seconds represented by exported event-loop windows
increase(openclaw_gateway_event_loop_observed_seconds_total[5m])

# Observed GC entries whose elapsed duration exceeded one second
increase(openclaw_gc_duration_seconds_count[5m])
  - increase(openclaw_gc_duration_seconds_bucket{le="1"}[5m])
```

运行、利用运行、模型调用（包括合成模型轮次）和消息发送持续时间直方图在 600 秒内保留现有边界，并添加 900、1800 和 3600 秒。每个标签集可扩展为 22 个刮擦系列。其他持续时间直方图保留其现有界限。

百分位数仍然是基于桶的估计；一小时以上的观测值仍然仅落在 `+Inf` 中。升级无法恢复历史溢出样本的分布。在滚动升级期间，避免池化具有不同存储桶布局的实例，并在评估长期运行百分位数时使用仅包含新布局中的样本的查询窗口。

<Tip>
对于跨提供方仪表盘，优先使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 语义约定，并且与非 OpenClaw GenAI 服务的指标保持一致。
</Tip>

## <a id="choosing-between-prometheus-and-opentelemetry-export"></a> 在 Prometheus 和 OpenTelemetry 导出之间进行选择

OpenClaw 独立支持这两种方式。你可以运行其中一种、两种都运行，或者都不运行。

<Tabs>
  <Tab id="diagnostics-prometheus" title="诊断-prometheus">
    - **拉取** 模式：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部 collector。
    - 通过正常的 Gateway 认证进行认证。
    - 该方式仅提供指标（不包含 traces 或 logs）。
    - 适合已经标准化为 Prometheus + Grafana 的技术栈。

  </Tab>
  <Tab id="diagnostics-otel" title="诊断-otel">
    - **Push** 模型：OpenClaw 将 OTLP/HTTP 发送到收集器或 OTLP- 兼容后端。
    - 该方式包含指标、traces 和 logs。
    - 当您需要时，可通过 OpenTelemetry 收集器（`prometheus` 或 `prometheusremotewrite` 导出器）桥接到 Prometheus。
    - 完整目录请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

  </Tab>
</Tabs>

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="empty-response-body" title="空响应体">
    - 检查配置中 `diagnostics.enabled` 是否未设置为 `false`（默认值为 `true`）。
    - 使用 `openclaw plugins list --enabled` 确认插件已启用并加载。
    - 生成一些流量；计数器和直方图只有在至少发生一次事件后才会输出行。

  </Accordion>
  <Accordion id="401-unauthorized" title="401/未经授权">
    该端点要求 Gateway operator 范围（`auth: "gateway"` 且 `gatewayRuntimeScopeSurface: "trusted-operator"`）。请使用 Prometheus 访问任何其他 Gateway operator 路由时所用的同一 token 或密码。没有公开的、无需认证的模式。
  </Accordion>
  <Accordion title="403 `missing scope: operator.read`">
    调用者已通过身份验证，但其有效操作员范围不包括`operator.read`。当诸如 `trusted-proxy` 之类的身份验证模式将抓取器映射到名为 [ 的角色 ](/gateway/operator-scopes)（其范围上限不包括读取）时，就会发生这种情况。授予爬虫角色 `operator.read`（或 `operator.write` / `operator.admin`，这暗示了这一点）。
  </Accordion>
  <Accordion id="openclaw-prometheus-series-dropped-total-is-climbing" title="`openclaw_prometheus_series_dropped_total` 正在攀登">
    某个新属性正在超过 **2048** 个 series 的上限。请检查最近的指标中是否有意外的高基数标签，并在源头修复。导出器会有意丢弃新 series，而不是悄悄重写标签。
  </Accordion>
  <Accordion id="prometheus-shows-stale-series-after-a-restart" title="Prometheus 重启后显示陈旧的系列">
    插件只在内存中保留状态。Gateway 重启后，计数器会重置为零，而 gauge 会从其下次报告的值重新开始。请使用 PromQL 的 `rate()` 和 `increase()` 以正确处理重置。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [诊断导出](/gateway/diagnostics) — 用于支持包的本地诊断 zip
- [健康状况和准备情况](/gateway/health) — `/healthz` 和 `/readyz` 检查
- [日志记录](/logging) — 基于文件的日志记录
- [OpenTelemetry 导出](/gateway/opentelemetry) — 用于跟踪、指标和日志的 OTLP 推送
