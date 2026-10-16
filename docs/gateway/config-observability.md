---
summary: "可观察性配置：审核、日志记录、诊断和遥测密钥"
read_when:
  - "打开审核或诊断捕获"
  - "调整日志级别、轮换或编辑"
  - "配置遥测导出"
title: "配置——审计、日志记录、诊断和遥测"
---

可观测性键：`audit.*`、`logging.*`、`diagnostics.*` 和 `telemetry.*`。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="audit"></a> 审计

```json5
{
  logging: {
    audit: {
      enabled: true,
      executionIdentity: false,
      messages: "off", // off | direct | all
    },
  },
}
```

网关将代理运行和工具操作的 **仅元数据** 审核事件记录到共享状态数据库中。消息生命周期元数据是单独的选择加入。分类帐存储身份、计时、工具名称和标准化结果，但从不存储提示、消息正文、工具参数、结果或原始错误文本。消息行不存储原始平台帐户、对话、消息和目标 ID。 Run/tool 会话密钥仍然可用于关联，并且本身可以包含平台帐户或对等 ID。记录在 30 天后过期，分类帐的上限为 100,000 行。使用 [`openclaw audit`](/cli/audit) 或 [`audit.activity.list`](/gateway/protocol/ledgers#audit-ledger-rpc) 网关 RPC 查询它们。有关完整的数据模型、隐私语义和覆盖范围限制，请参阅 [ 审核历史记录](/gateway/audit)。

- `enabled`：记录新的审核事件（默认：`true`）。账本默认处于开启状态，因为仅在事件发生后启用的审计跟踪无法解释该事件。设置`false`立即停止新事件收集；现有记录在过期之前保持可读。重新打开它会从该点开始继续录音——间隙不会被回填。
- `executionIdentity`：保留有界归因上下文以进行精确的执行检查（默认值：`false`）。这种隐私敏感的元数据在全新安装和升级时被禁用。收藏需要`enabled: true`；使用 `openclaw config set logging.audit.executionIdentity true` 为新允许的运行启用它。没有环境变量别名。
- `messages`：消息元数据范围（默认值：`"off"`）。`"direct"` 仅记录已知的直接对话。`"all"` 还会记录群组、频道和未知的对话类型。两种模式都不会包含内容，并会在可以进行关联的情况下使用安装本地的密钥伪名替换原始标识符。这些是关联辅助信息，而非匿名化措施；状态数据库会存储派生密钥，但 RPC 和 CLI 导出不会包含该密钥。

根级 `audit` 块已退役；当前路径是`logging.audit`。根配置对象是严格的，因此旧的顶级 `audit` 块被拒绝。运行[`openclaw doctor --fix`](/cli/doctor)将其移动到`logging.audit`。

所有三个设置均实时应用。接受的写入仍然通过同一个写入器消耗，并且保留的身份上下文保持不变。启用收集不会回填活动或向已许可的运行添加身份。消息覆盖范围包括到达核心调度的已接受入站消息以及到达共享持久交付的每个原始逻辑出站回复有效负载的一个终端行。不包括绕过这些共享边界的插件本地路径和直接发送路径。有界后台写入器是尽力而为的，而不是无损合规性存档。

---

## <a id="logging"></a> 日志

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | json
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`；命名配置文件使用 `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`。当 `/tmp/openclaw` 不安全或不可用时（并且始终在 Windows 上），OpenClaw 使用 OS 临时目录下的目录代替：`openclaw-<uid>`（数字用户 ID 可用）和普通 `openclaw`（不可用），其中包括Windows。过时的日志文件将在 24 小时后删除。
- 设置 `logging.file` 以使用稳定路径。
- 当 `--verbose` 时，`consoleLevel` 会碰撞到 `debug`。
- `consoleStyle`：`"pretty"` 或 `"json"`。之前的 `"compact"` 值已弃用；[`openclaw doctor --fix`](/cli/doctor) 会将其映射为 `"pretty"`。
- `maxFileBytes`：轮换前活动日志文件的最大字节数（正整数；默认值：`104857600` = 100 MB）。OpenClaw 会在活动文件旁最多保留五个带编号的归档文件。
- File 日志存储具有仅限所有者 （`0600`） 权限的原始记录。直接文件读取绕过密文；像 agent/state 数据库一样保护它们。
- `redactPatterns`：用​​于尽力屏蔽控制台输出、日志尾部、诊断导出和 OTLP 日志记录的正则表达式。设置此 **仅替换** 日志输出的默认字符串正则表达式列表。内置表单主体、结构化身份验证标头和裸 AWS 密钥保护始终适用。诊断助手将您的模式与默认字符串列表合并。工具参数、工具结果和会话记录文本均未加密。
- Egress 日志和诊断编辑始终处于开启状态，并且不再可配置。 [`openclaw doctor --fix`](/cli/doctor) 从旧配置文件中删除已停用的开关。配置快照、审核输出、命令行诊断和带有凭据的 URL 保留其掩码。

---

## <a id="diagnostics"></a> 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf",
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      logsExporter: "otlp",
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: false,
    },

    cacheTrace: {
      enabled: false,
    },
  },
}
```

- `enabled`：检测输出的主开关（默认值：`true`）。
- `flags`：启用定向日志输出的标志字符串数组（支持 `"telegram.*"` 或 `"*"` 等通配符）。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认值：`false`）。完整配置、信号目录和隐私模型请参阅 [OpenTelemetry 导出](/gateway/opentelemetry)。
- `otel.endpoint`：OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：可选的按信号区分的 OTLP 端点。设置后，仅对相应信号覆盖 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（默认值）。gRPC 导出已停用；运行 [`openclaw doctor --fix`](/cli/doctor) 可修复已持久化的旧值，或获取特定来源的手动编辑指导。
- `otel.headers`：随 OTel 导出请求发送的额外 HTTP 请求标头。
- `otel.serviceName`：资源属性中的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用追踪、指标或日志导出。
- `otel.logsExporter`：日志导出目标：`"otlp"`（默认值）、`"stdout"`（每行标准输出一个 JSON 对象）或 `"both"`。
- `otel.sampleRate`：`0`-`1` 之间的追踪采样率。
- `otel.flushIntervalMs`：遥测数据定期刷新的间隔（单位：毫秒）。
- `otel.captureContent`：选择性启用 OTEL span 属性中的内容捕获。默认关闭。`true` 会捕获非系统可见的消息、工具和工具定义内容，以及 OTLP 日志正文；供应商内部的思考负载仍会被排除。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：启用最新实验性 GenAI 推理 span 形态的环境开关，包括使用 `{gen_ai.operation.name} {gen_ai.request.model}` 作为 span 名称、使用 `CLIENT` span 类型，以及使用 `gen_ai.provider.name` 替代旧版 `gen_ai.system`。默认情况下，为保持兼容性，span 仍使用 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指标使用有界语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`：已注册全局 OpenTelemetry SDK 的主机的环境切换。然后，OpenClaw 会跳过插件拥有的 SDK startup/shutdown，同时保持诊断侦听器处于活动状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当对应配置项未设置时使用的按信号区分的端点环境变量。
- `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`、`OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` 和 `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`：当 `otel.protocol` 未设置时使用的按信号区分的协议回退值。每个变量都会针对相应信号覆盖 `OTEL_EXPORTER_OTLP_PROTOCOL`。
- `OTEL_EXPORTER_OTLP_PROTOCOL`：当 `otel.protocol` 和对应的按信号区分的变量均未设置时使用的共享协议回退值。仅支持 `http/protobuf`。协议验证按信号隔离，因此不受支持的解析值会禁用相应信号的 OTLP 导出器，而不会阻止其他受支持的同级信号。Doctor 不会重写环境变量。
- `cacheTrace.enabled`：记录嵌入式运行的缓存追踪快照（默认值：`false`）。

---

## <a id="telemetry"></a> 遥测

```json5
{
  telemetry: {
    enabled: false,
    consentedAt: "2026-08-02T12:00:00.000Z",
  },
}
```

- `enabled`：包括公共配置的通道和提供商名称、插件库存名称和计数，以及现有每日更新检查请求中保留的会话创建计数（默认值：`false`）。这些字段不测量每个插件的使用情况或活动会话。交互式设置可以提供明确的选择加入，默认选择 **不，谢谢**；非交互式设置不会自动启用它，但可以保留显式启用的首选项。 `DO_NOT_TRACK=1` 或 `DO_NOT_TRACK=true` 始终禁用功能统计而不禁用更新检查。
- `consentedAt`：操作员接受或拒绝要素统计时的 ISO 时间戳记录。防止交互式设置再次询问。
- `openclaw telemetry show` 使用 CLI 进程的当前上下文预览请求，该上下文可能与正在运行的网关不同； `openclaw telemetry on` 和 `openclaw telemetry off` 更新首选项和同意时间戳。
- `OPENCLAW_TELEMETRY_ENDPOINT`：可选的完整端点 URL，用于测试或自托管服务。默认为 `https://telemetry.openclaw.ai/api/latest-version`。

请参阅 [ 使用遥测和更新检查 ](/gateway/telemetry) 了解完整的有效负载、隐私保证和所有选择退出控件。

---
