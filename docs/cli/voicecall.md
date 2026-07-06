---
summary: "CLI `openclaw voicecall` 参考（语音呼叫插件命令面）"
read_when:
  - 当你使用语音呼叫插件并想查看所有 CLI 入口时
  - 当你需要 setup、smoke、call、continue、speak、dtmf、end、status、tail、latency、expose 和 start 的参数表及默认值时
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。它只会在语音呼叫
插件已安装并启用时出现。

当 Gateway 正在运行时，操作命令（`call`、`start`、
`continue`、`speak`、`dtmf`、`end`、`status`）会路由到该 Gateway 的
语音呼叫运行时。如果没有可访问的 Gateway，它们会回退到独立的
CLI 运行时。

## 子命令

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| 子命令 | 描述                                                     |
| ------ | -------------------------------------------------------- |
| `setup`    | 显示提供方和 webhook 就绪检查。                     |
| `smoke`    | 运行就绪检查；仅在使用 `--yes` 时才发起真实测试电话。 |
| `call`     | 发起一通外呼语音电话。                                |
| `start`    | `call` 的别名，要求提供 `--to`，`--message` 可选。 |
| `continue` | 说出一条消息并等待下一次响应。                 |
| `speak`    | 说出一条消息而不等待响应。                 |
| `dtmf`     | 向一通活动呼叫发送 DTMF 按键。                             |
| `end`      | 挂断一通活动呼叫。                                         |
| `status`   | 检查活动呼叫（或通过 `--call-id` 指定某一通）。                   |
| `tail`     | 跟踪 `calls.jsonl`（在提供方测试期间很有用）。              |
| `latency`  | 汇总 `calls.jsonl` 中的轮次延迟指标。              |
| `expose`   | 切换 webhook 端点的 Tailscale serve/funnel。         |

## 设置与 smoke

### `setup`

默认打印人类可读的就绪检查结果。脚本可使用 `--json`。

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

运行相同的就绪检查。仅当同时提供 `--to` 和 `--yes` 时，才会拨打真实电话。

| Flag               | Default                           | Description                             |
| ------------------ | --------------------------------- | --------------------------------------- |
| `-t, --to <phone>` | (none)                            | 用于真实 smoke 测试的电话号码。  |
| `--message <text>` | `OpenClaw voice call smoke test.` | smoke 呼叫期间要播报的消息。 |
| `--mode <mode>`    | `notify`                          | 呼叫模式：`notify` 或 `conversation`。  |
| `--yes`            | `false`                           | 实际发起真实外呼。  |
| `--json`           | `false`                           | 输出机器可读的 JSON。            |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # 干运行
openclaw voicecall smoke --to "+15555550123" --yes  # 真实 notify 呼叫
```

<Note>
对于外部提供商（`plivo`、`telnyx`、`twilio`），`setup` 和 `smoke` 需要来自 `publicUrl`、隧道或 Tailscale 暴露的公网 webhook URL。回环或私有 serve 回退会被拒绝，因为运营商无法访问它。
</Note>

## 呼叫生命周期

### `call`

发起一通外呼语音电话。

| Flag                   | Required | Default           | Description                                                                |
| ---------------------- | -------- | ----------------- | -------------------------------------------------------------------------- |
| `-m, --message <text>` | yes      | (none)            | 电话接通时要播报的消息。                                   |
| `-t, --to <phone>`     | no       | config `toNumber` | 要拨打的 E.164 电话号码。                                                |
| `--mode <mode>`        | no       | `conversation`    | 呼叫模式：`notify`（播报后挂断）或 `conversation`（保持接通）。 |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

### `start`

`call` 的别名，默认参数形式不同。

| Flag               | Required | Default        | Description                              |
| ------------------ | -------- | -------------- | ---------------------------------------- |
| `--to <phone>`     | yes      | (none)         | 要拨打的电话号码。                    |
| `--message <text>` | no       | (none)         | 电话接通时要播报的消息。 |
| `--mode <mode>`    | no       | `conversation` | 呼叫模式：`notify` 或 `conversation`。   |

### `continue`

说出一条消息并等待响应。

| Flag               | Required | Description       |
| ------------------ | -------- | ----------------- |
| `--call-id <id>`   | yes      | 呼叫 ID。          |
| `--message <text>` | yes      | 要播报的消息。 |

### `speak`

说出一条消息而不等待响应。

| Flag               | Required | Description       |
| ------------------ | -------- | ----------------- |
| `--call-id <id>`   | yes      | 呼叫 ID。          |
| `--message <text>` | yes      | 要播报的消息。 |

### `dtmf`

向一通活动呼叫发送 DTMF 按键。

| Flag                | Required | Description                                      |
| ------------------- | -------- | ------------------------------------------------ |
| `--call-id <id>`    | yes      | 呼叫 ID。                                         |
| `--digits <digits>` | yes      | DTMF 数字（例如用于等待的 `ww123456#`）。 |

### `end`

挂断一通活动呼叫。

| Flag             | Required | Description |
| ---------------- | -------- | ----------- |
| `--call-id <id>` | yes      | 呼叫 ID。    |

### `status`

检查活动呼叫。

| Flag             | Default | Description                  |
| ---------------- | ------- | ---------------------------- |
| `--call-id <id>` | (none)  | 限制输出为单个呼叫。 |
| `--json`         | `false` | 输出机器可读的 JSON。 |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## 日志与指标

### `tail`

跟踪语音通话的 JSONL 日志。启动时打印最近 `--since` 行，随后
在有新行写入时持续流式输出。

| Flag            | Default                    | Description                    |
| --------------- | -------------------------- | ------------------------------ |
| `--file <path>` | resolved from plugin store | `calls.jsonl` 的路径。         |
| `--since <n>`   | `25`                       | 开始跟踪前打印的行数。 |
| `--poll <ms>`   | `250` (minimum 50)         | 轮询间隔，单位为毫秒。 |

### `latency`

汇总 `calls.jsonl` 中的轮次延迟和等待收听指标。输出为包含
`recordsScanned`、`turnLatency` 和 `listenWait` 汇总信息的 JSON。

| Flag            | Default                    | Description                          |
| --------------- | -------------------------- | ------------------------------------ |
| `--file <path>` | resolved from plugin store | `calls.jsonl` 的路径。               |
| `--last <n>`    | `200` (minimum 1)          | 要分析的最近记录数量。 |

## 暴露 webhooks

### `expose`

启用、禁用或更改 Tailscale serve/funnel 配置，以用于
语音 webhook。

| Flag                  | Default                                   | Description                                     |
| --------------------- | ----------------------------------------- | ----------------------------------------------- |
| `--mode <mode>`       | `funnel`                                  | `off`、`serve`（tailnet）或 `funnel`（公共）。 |
| `--path <path>`       | config `tailscale.path` or `--serve-path` | 要暴露的 Tailscale 路径。                       |
| `--port <port>`       | config `serve.port` or `3334`             | 本地 webhook 端口。                             |
| `--serve-path <path>` | config `serve.path` or `/voice/webhook`   | 本地 webhook 路径。                             |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>
只应将 webhook 端点暴露给你信任的网络。尽可能优先使用 Tailscale Serve，而不是 Funnel。
</Warning>

## 相关

- [CLI 参考](/cli)
- [语音呼叫插件](/plugins/voice-call)
