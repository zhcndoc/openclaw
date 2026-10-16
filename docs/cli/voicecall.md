---
summary: "CLI `openclaw voicecall` 参考（语音呼叫插件命令面）"
read_when:
  - "当你使用语音呼叫插件并想查看所有 CLI 入口时"
  - "当你需要 setup、smoke、call、continue、speak、dtmf、end、status、tail、latency、expose 和 start 的参数表及默认值时"
title: "语音通话"
---

# `openclaw voicecall`

`voicecall` 是插件提供的命令。仅当安装并启用语音通话插件时才会出现。如果无法识别 `openclaw voicecall`，请在网关主机上安装并启用该插件：

```bash
openclaw plugins install @openclaw/voice-call
openclaw plugins enable voice-call
```

这些命令自动应用于正在运行的网关；如果离线则启动它。请参阅 [Voice call 插件 ](/plugins/voice-call) 以了解提供程序凭据和 Webhook 配置，并参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect) 以进行运行时验证。

当网关运行时，操作命令（`call`、`start`、`continue`、`speak`、`dtmf`、`end`、`status`）路由到该网关的语音呼叫运行时。如果没有可访问的网关，它们将回退到独立的 CLI 运行时。 `status` 使用持久调用存储而不是启动该运行时。

回退仅限于传输层缺席。如果网关响应请求或身份验证错误，或者在超时之前没有响应，则命令退出非零并指向 `openclaw gateway status`；它不会启动第二个 webhook 服务器。如果独立回退无法绑定配置的 `serve.port`，则错误会识别可能正在运行的网关，而不是打印原始 `EADDRINUSE` 故障。

## <a id="subcommands"></a> 子命令

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>] [--brief <text-or-json> | --brief-file <path>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>] [--brief <text-or-json> | --brief-file <path>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall steer    --call-id <id> --message <text> [--mode say|guidance]
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| 子命令 | 描述                                                     |
| ---------- | --------------------------------------------------------------- |
| `setup`    | 显示提供方和 webhook 就绪检查。                     |
| `smoke`    | 运行就绪检查；仅在使用 `--yes` 时才发起真实测试电话。 |
| `call`     | 发起一通外呼语音电话。                                |
| `start`    | `call` 的别名，要求提供 `--to`，`--message` 可选。 |
| `continue` | 说出一条消息并等待下一次响应。                 |
| `speak`    | 说出一条消息而不等待响应。                 |
| `dtmf`     | 向一通活动呼叫发送 DTMF 按键。                             |
| `end`      | 挂断一通活动呼叫。                                         |
| `status`   | 检查活动呼叫（或通过 `--call-id` 指定某一通）。                   |
| `tail`     | 尾部持久调用记录或显式自定义 JSONL 日志。    |
| `latency`  | 从通话历史记录或自定义 JSONL 日志中总结转弯延迟。 |
| `expose`   | 切换 webhook 端点的 Tailscale serve/funnel。         |

## <a id="setup-and-smoke"></a> 设置与 smoke

### `setup`

默认打印人类可读的就绪检查结果。脚本可使用 `--json`。

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

运行相同的就绪检查。仅当同时提供 `--to` 和 `--yes` 时，才会拨打真实电话。

| 标志               | 默认值                           | 描述                             |
| ------------------ | --------------------------------- | --------------------------------------- |
| `-t, --to <phone>` | （无）                            | 用于真实 smoke 测试的电话号码。  |
| `--message <text>` | `OpenClaw voice call smoke test.` | smoke 呼叫期间要播报的消息。 |
| `--mode <mode>`    | `notify`                          | 呼叫模式：`notify` 或 `conversation`。  |
| `--yes`            | `false`                           | 实际发起真实外呼。  |
| `--json`           | `false`                           | 输出机器可读的 JSON。            |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

<Note>
对于外部提供商（`plivo`、`telnyx`、`twilio`），`setup` 和 `smoke` 需要来自 `publicUrl`、隧道或 Tailscale 暴露的公网 webhook URL。回环或私有 serve 回退会被拒绝，因为运营商无法访问它。
</Note>

## <a id="call-lifecycle"></a> 呼叫生命周期

### `call`

发起一通外呼语音电话。

| 标志                   | 必需的 | 默认值           | 描述                                                                |
| ---------------------- | -------- | ----------------- | -------------------------------------------------------------------------- |
| `-m, --message <text>` | 是      | （无）            | 电话接通时要播报的消息。                                   |
| `-t, --to <phone>`     | no       | 配置`toNumber` | 要拨打的 E.164 电话号码。                                                |
| `--mode <mode>`        | no       | `conversation`    | 呼叫模式：`notify`（播报后挂断）或 `conversation`（保持接通）。 |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

使用 `--brief` 执行纯文本或 JSON 对象的任务。 `--brief-file` 从文件中读取一个 JSON 对象；这些标志是互斥的。开场白仍然首先逐字朗读。有关架构、权限和持续时间上限，请参阅 [ 每次呼叫简介 ](/plugins/voice-call/realtime-and-streaming#per-call-briefs-and-errands)。

### `start`

`call` 的别名，默认参数形式不同。

| 标志               | 必需的 | 默认值        | 描述                              |
| ------------------ | -------- | -------------- | ---------------------------------------- |
| `--to <phone>`     | 是      | （无）         | 要拨打的电话号码。                    |
| `--message <text>` | no       | （无）         | 电话接通时要播报的消息。 |
| `--mode <mode>`    | no       | `conversation` | 呼叫模式：`notify` 或 `conversation`。   |

### `continue`

说出一条消息并等待响应。

| 标志               | 必需的 | 描述       |
| ------------------ | -------- | ----------------- |
| `--call-id <id>`   | 是      | 呼叫 ID。          |
| `--message <text>` | 是      | 要播报的消息。 |

### `speak`

说出一条消息而不等待响应。

| 标志               | 必需的 | 描述       |
| ------------------ | -------- | ----------------- |
| `--call-id <id>`   | 是      | 呼叫 ID。          |
| `--message <text>` | 是      | 要播报的消息。 |

### `steer`

向正在进行的实时通话发送新的所有者指令：

```bash
openclaw voicecall steer --call-id "<call-id>" --message "Ask for Tuesday morning"
openclaw voicecall steer --call-id "<call-id>" --mode say --message "Tuesday morning works for us."
```

`guidance` 是默认值。 `say` 现在请求确切的文字。该说明也包含在以后的代理咨询中。消息长度限制为 500 个字符。 CLI使用运行网关的操作员授权；不可用的网关是一个错误，因为独立进程无法控制其活动网桥。

### `dtmf`

向一通活动呼叫发送 DTMF 按键。

| 标志                | 必需的 | 描述                                      |
| ------------------- | -------- | ------------------------------------------------ |
| `--call-id <id>`    | 是      | 呼叫 ID。                                         |
| `--digits <digits>` | 是      | DTMF 数字（例如用于等待的 `ww123456#`）。 |

### `end`

挂断一通活动呼叫。

| 标志             | 必需的 | 描述 |
| ---------------- | -------- | ----------- |
| `--call-id <id>` | 是      | 呼叫 ID。    |

### `status`

检查活动呼叫。

| 标志             | 默认值 | 描述                  |
| ---------------- | ------- | ---------------------------- |
| `--call-id <id>` | （无）  | 限制输出为单个呼叫。 |
| `--json`         | `false` | 输出机器可读的 JSON。 |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## <a id="logs-and-metrics"></a> 日志与指标

### `tail`

来自 SQLite 的尾部持久语音呼叫记录：首先打印最后的 `--since` 记录，然后仅打印新快照（`--since 0` 仅以新快照开始）。对于基本名称不是 `calls.jsonl` 的现有自定义 `--file`，在开始时打印最后一个 `--since` 非空完整行，然后流式传输新的完整行。部分行等待换行符；文件替换或观察到的截断会启动新的流。慢速输出管道会暂停读取，而不是在内存中累积日志的其余部分。

| 标志            | 默认值                    | 描述                    |
| --------------- | -------------------------- | ------------------------------ |
| `--file <path>` | 从插件商店解决 | `calls.jsonl` 的路径。         |
| `--since <n>`   | `25`                       | 开始跟踪前打印的行数。 |
| `--poll <ms>`   | `250`（最少 50 个）         | 轮询间隔，单位为毫秒。 |

### `latency`

总结 SQLite 或使用 `--file` 选择的现有自定义日志的转动延迟和监听等待指标。输出为 JSON，其中包含 `recordsScanned`、`turnLatency` 和 `listenWait` 摘要。

自定义日志会增量扫描，对请求的历史记录没有字节上限。 `latency` 选择最后 N 个非空记录，跳过格式错误的 JSON，并接受不带换行符的最终 JSON 记录。它一次解析一个选定的记录；内存仍会随着选定的最大 JSON 记录和请求的度量样本数量而缩放。

| 标志            | 默认值                    | 描述                          |
| --------------- | -------------------------- | ------------------------------------ |
| `--file <path>` | 从插件商店解决 | `calls.jsonl` 的路径。               |
| `--last <n>`    | `200`（最少 1 个）          | 要分析的最近记录数量。 |

## <a id="exposing-webhooks"></a> 暴露 webhooks

### `expose`

启用、禁用或更改语音 Webhook 的 Tailscale serve/funnel 配置。当启用实时或流音频时，该命令还会公开或清除该模式的 WebSocket 流路径。外部HTTPS端口来自`tailscale.port`（默认`443`）；漏斗支持 `443`、`8443` 或 `10000`。

| 标志                  | 默认值                                   | 描述                                     |
| --------------------- | ----------------------------------------- | ----------------------------------------------- |
| `--mode <mode>`       | `funnel`                                  | `off`、`serve`（tailnet）或 `funnel`（公共）。 |
| `--path <path>`       | 配置 `tailscale.path` 或 `--serve-path` | 要暴露的 Tailscale 路径。                       |
| `--port <port>`       | 配置 `serve.port` 或 `3334`             | 本地 webhook 端口。                             |
| `--serve-path <path>` | 配置 `serve.path` 或 `/voice/webhook`   | 本地 webhook 路径。                             |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>
只应将 webhook 端点暴露给你信任的网络。尽可能优先使用 Tailscale Serve，而不是 Funnel。
</Warning>

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [语音通话插件](/plugins/voice-call)
