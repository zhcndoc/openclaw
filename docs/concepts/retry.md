---
summary: "出站提供方调用的重试策略"
read_when:
  - 更新提供方重试行为或默认值
  - 调试提供方发送错误或速率限制
title: "重试策略"
---

## 目标

- 按 HTTP 请求重试，而不是按多步骤流程重试。
- 仅重试当前步骤，以保持顺序。
- 避免重复执行非幂等操作。

## 默认值

| 设置               | 默认值       |
| ------------------ | ----------- |
| 尝试次数           | 3           |
| 最大延迟上限       | 30000 毫秒   |
| 抖动               | 0.1（10%）   |
| Telegram 最小延迟  | 400 毫秒    |
| Discord 最小延迟   | 500 毫秒    |

## 行为

### 模型提供方

- OpenClaw 让提供方 SDK 处理正常的短重试。
- 对于基于 Stainless 的 SDK（例如 Anthropic 和 OpenAI），可重试的响应（`408`、`409`、`429` 和 `5xx`）可以包含 `retry-after-ms` 或 `retry-after`。当等待时间超过 60 秒时，OpenClaw 会注入 `x-should-retry: false`，使 SDK 立即上报错误，并且模型故障转移可以切换到另一个认证配置文件或回退模型。
- 可通过 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>` 覆盖该上限。将其设置为 `0`、`false`、`off`、`none` 或 `disabled`，即可让 SDK 在内部遵守较长的 `Retry-After` 睡眠时间。

### Discord

- 对速率限制错误（HTTP 429）、请求超时、HTTP 5xx 响应，以及临时性传输失败（例如 DNS 查询失败、连接重置、套接字关闭和 fetch 失败）进行重试。
- 优先使用 Discord 的 `retry_after`，否则使用指数退避。

### Telegram

- 对临时性错误（429、超时、连接/重置/关闭、暂时不可用）进行重试。
- 优先使用 `retry_after`，否则使用指数退避。
- HTML/Markdown 解析错误不会重试；第一次尝试时会回退为纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中按提供方设置重试策略：

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## 说明

- 重试按请求生效（消息发送、媒体上传、反应、投票、贴纸）。
- 复合流程不会重试已完成的步骤。

## 相关内容

- [模型故障转移](/concepts/model-failover)
- [命令队列](/concepts/queue)
