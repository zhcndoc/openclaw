---
summary: "通过 diagnostics-prometheus 插件将 OpenClaw 诊断信息作为 Prometheus 文本指标导出"
title: "Prometheus 指标"
sidebarTitle: "Prometheus"
read_when:
  - 你希望 Prometheus、Grafana、VictoriaMetrics 或其他抓取器收集 OpenClaw Gateway 指标
  - 你需要用于仪表盘或告警的 Prometheus 指标名称和标签策略
  - 你希望在不运行 OpenTelemetry collector 的情况下获取指标
---

OpenClaw 可以通过内置的 `diagnostics-prometheus` 插件导出诊断指标。它会监听受信任的内部诊断，并在以下地址渲染一个 Prometheus 文本端点：

```text
GET /api/diagnostics/prometheus
```

内容类型为 `text/plain; version=0.0.4; charset=utf-8`，这是标准的 Prometheus exposition 格式。

<Warning>
该路由使用 Gateway 身份验证（operator scope）。不要将其作为公开的、无需认证的 `/metrics` 端点暴露出去。请通过你用于其他 operator API 的同一认证路径来抓取它。
</Warning>

关于 traces、logs、OTLP push 以及 OpenTelemetry GenAI 语义属性，请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

## 快速开始

<Steps>
  <Step title="启用插件">
    <Tabs>
      <Tab title="配置">
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
  <Step title="重启 Gateway">
    HTTP 路由会在插件启动时注册，因此启用后请重新加载。
  </Step>
  <Step title="抓取受保护的路由">
    发送与你的 operator 客户端相同的 gateway 认证：

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="接入 Prometheus">
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
`diagnostics.enabled: true` 是必需的。否则，插件仍会注册 HTTP 路由，但不会有诊断事件流入导出器，因此响应会为空。
</Note>

## 导出的指标

| 指标                                         | 类型      | 标签                                                                                     |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | counter   | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`               | histogram | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                   | counter   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`        | histogram | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_tokens_total`                 | counter   | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | histogram | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`               | counter   | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_tool_execution_total`               | counter   | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | histogram | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_harness_run_total`                  | counter   | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`       | histogram | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_message_processed_total`            | counter   | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds` | histogram | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_total`             | counter   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | histogram | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_queue_lane_size`                    | gauge     | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | histogram | `lane`                                                                                    |
| `openclaw_session_state_total`                | counter   | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | gauge     | `state`                                                                                   |
| `openclaw_memory_bytes`                       | gauge     | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | histogram | none                                                                                      |
| `openclaw_memory_pressure_total`              | counter   | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | counter   | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | counter   | none                                                                                      |

## 标签策略

<AccordionGroup>
  <Accordion title="受限、低基数的标签">
    Prometheus 标签保持受限且低基数。导出器不会输出原始诊断标识符，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、消息 ID、聊天 ID 或提供方请求 ID。

    标签值会被脱敏，并且必须符合 OpenClaw 的低基数字符策略。不符合该策略的值会根据指标不同被替换为 `unknown`、`other` 或 `none`。

  </Accordion>
  <Accordion title="系列上限与溢出计数">
    导出器将内存中保留的时间序列总数上限设为 **2048**，该上限适用于计数器、仪表和直方图的总和。超过该上限的新系列会被丢弃，并且每发生一次，`openclaw_prometheus_series_dropped_total` 就会加一。

    请将这个计数器视为上游属性泄露高基数值的硬性信号。导出器不会自动取消该上限；如果它持续上升，应修复数据源，而不是禁用上限。

  </Accordion>
  <Accordion title="Prometheus 输出中绝不会出现的内容">
    - prompt 文本、response 文本、工具输入、工具输出、系统 prompt
    - 原始提供方请求 ID（仅在 span 上使用受限哈希，如适用——绝不会出现在指标中）
    - session keys 和 session IDs
    - 主机名、文件路径、密钥值

  </Accordion>
</AccordionGroup>

## PromQL 示例

```promql
# 按提供方拆分的每分钟 token 数
sum by (provider) (rate(openclaw_model_tokens_total[1m]))

# 最近一小时的支出（USD），按 model 统计
sum by (model) (increase(openclaw_model_cost_usd_total[1h]))

# model run 时长的 95 分位数
histogram_quantile(
  0.95,
  sum by (le, provider, model)
    (rate(openclaw_run_duration_seconds_bucket[5m]))
)

# 队列等待时间 SLO（95 分位低于 2s）
histogram_quantile(
  0.95,
  sum by (le, lane) (rate(openclaw_queue_lane_wait_seconds_bucket[5m]))
) < 2

# 丢弃的 Prometheus series（基数告警）
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>
跨提供方仪表盘优先使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 语义约定，并且与非 OpenClaw GenAI 服务的指标保持一致。
</Tip>

## 在 Prometheus 和 OpenTelemetry 导出之间选择

OpenClaw 独立支持这两种方式。你可以运行其中一种、两种都运行，或者都不运行。

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **Pull** 模式：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部 collector。
    - 通过正常的 Gateway auth 进行认证。
    - 该方式仅提供指标（不包含 traces 或 logs）。
    - 适合已经标准化为 Prometheus + Grafana 的技术栈。

  </Tab>
  <Tab title="diagnostics-otel">
    - **Push** 模式：OpenClaw 向 collector 或兼容 OTLP 的后端发送 OTLP/HTTP。
    - 该方式包含指标、traces 和 logs。
    - 当你需要两者时，可通过 OpenTelemetry Collector（`prometheus` 或 `prometheusremotewrite` 导出器）桥接到 Prometheus。
    - 完整目录请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

  </Tab>
</Tabs>

## 故障排查

<AccordionGroup>
  <Accordion title="响应体为空">
    - 检查配置中的 `diagnostics.enabled: true`。
    - 确认插件已启用并通过 `openclaw plugins list --enabled` 加载。
    - 生成一些流量；计数器和直方图只有在至少发生一次事件后才会输出行。

  </Accordion>
  <Accordion title="401 / 未授权">
    该端点要求 Gateway operator scope（`auth: "gateway"` 且 `gatewayRuntimeScopeSurface: "trusted-operator"`）。请使用 Prometheus 访问任何其他 Gateway operator 路由时所用的同一 token 或密码。没有公开的、无需认证的模式。
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` 持续上升">
    一个新的属性正在超过 **2048** 个 series 的上限。请检查最近的指标中是否有意外的高基数标签，并在源头修复。导出器会故意丢弃新 series，而不是悄悄重写标签。
  </Accordion>
  <Accordion title="重启后 Prometheus 显示陈旧的 series">
    插件只在内存中保留状态。Gateway 重启后，计数器会重置为零，而 gauge 会从其下次报告的值重新开始。请使用 PromQL 的 `rate()` 和 `increase()` 以正确处理重置。
  </Accordion>
</AccordionGroup>

## 相关

- [诊断导出](/gateway/diagnostics) — 用于支持包的本地诊断 zip
- [健康和就绪](/gateway/health) — `/healthz` 和 `/readyz` 探测
- [日志记录](/logging) — 基于文件的日志记录
- [OpenTelemetry 导出](/gateway/opentelemetry) — 用于跟踪、指标和日志的 OTLP 推送
