---
summary: "出站提供商调用的重试策略"
read_when:
  - 更新提供商重试行为或默认设置时
  - 调试提供商发送错误或速率限制时
title: "重试策略"
---

# 重试策略

## 目标

- 重试以每个 HTTP 请求为单位，而非多步骤流程为单位。
- 保持顺序性，仅重试当前步骤。
- 避免重复执行非幂等操作。

## 默认值

- 尝试次数：3
- 最大延时上限：30000 毫秒
- 抖动系数：0.1（10%）
- 提供商默认值：
  - Telegram 最小延时：400 毫秒
  - Discord 最小延时：500 毫秒

## 行为

### Discord

- 仅在速率限制错误（HTTP 429）时重试。
- 优先使用 Discord 提供的 `retry_after`，否则使用指数退避。

### Telegram

- 在瞬时错误（429、超时、连接重置/关闭、临时不可用）时重试。
- 优先使用 `retry_after`，否则使用指数退避。
- Markdown 解析错误不重试，改为降级使用纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中为各提供商设置重试策略：

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

## 注意事项

- 重试适用于每条请求（消息发送、媒体上传、表情反应、投票、贴纸）。
- 复合流程不会重试已完成的步骤。
