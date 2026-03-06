---
summary: "通过网关 + CLI 发送投票"
read_when:
  - 添加或修改投票支持
  - 调试来自 CLI 或网关的投票发送
title: "投票"
---

# 投票

## 支持的渠道

- Telegram
- WhatsApp（网页版渠道）
- Discord
- MS Teams（自适应卡片）

## CLI

```bash
# Telegram
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "发货吗？" --poll-option "是" --poll-option "否"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "选个时间" --poll-option "上午10点" --poll-option "下午2点" \
  --poll-duration-seconds 300

# WhatsApp
openclaw message poll --target +15555550123 \
  --poll-question "今天午餐？" --poll-option "是" --poll-option "否" --poll-option "可能"
openclaw message poll --target 123456789@g.us \
  --poll-question "会议时间？" --poll-option "上午10点" --poll-option "下午2点" --poll-option "下午4点" --poll-multi

# Discord
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "零食？" --poll-option "披萨" --poll-option "寿司"
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "方案？" --poll-option "A" --poll-option "B" --poll-duration-hours 48

# MS Teams
openclaw message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "午餐？" --poll-option "披萨" --poll-option "寿司"
```

选项：

- `--channel`：`whatsapp`（默认）、`telegram`、`discord` 或 `msteams`
- `--poll-multi`：允许选择多个选项
- `--poll-duration-hours`：仅限 Discord（省略时默认为 24）
- `--poll-duration-seconds`：仅限 Telegram（5-600 秒）
- `--poll-anonymous` / `--poll-public`：仅限 Telegram 投票的可见性设置

## 网关 RPC

方法：`poll`

参数：

- `to`（字符串，必填）
- `question`（字符串，必填）
- `options`（字符串数组，必填）
- `maxSelections`（数字，可选）
- `durationHours`（数字，可选）
- `durationSeconds`（数字，可选，仅限 Telegram）
- `isAnonymous`（布尔，可选，仅限 Telegram）
- `channel`（字符串，可选，默认：`whatsapp`）
- `idempotencyKey`（字符串，必填）

## 渠道差异

- Telegram：2-10 个选项。支持通过 `threadId` 或 `:topic:` 目标的论坛主题。使用 `durationSeconds` 替代 `durationHours`，限制为 5-600 秒。支持匿名和公开投票。
- WhatsApp：2-12 个选项，`maxSelections` 必须在选项数范围内，忽略 `durationHours`。
- Discord：2-10 个选项，`durationHours` 限制为 1-768 小时（默认 24 小时）。`maxSelections > 1` 允许多选；Discord 不支持严格的选择数量。
- MS Teams：自适应卡片投票（由 OpenClaw 管理）。无原生投票 API；忽略 `durationHours`。

## 代理工具（消息）

使用带有 `poll` 动作的 `message` 工具（参数：`to`，`pollQuestion`，`pollOption`，可选 `pollMulti`，`pollDurationHours`，`channel`）。

对 Telegram，工具还接受参数 `pollDurationSeconds`，`pollAnonymous` 和 `pollPublic`。

使用 `action: "poll"` 创建投票。用 `action: "send"` 传递投票字段会被拒绝。

注意：Discord 无法实现“精确选择N个”的模式；`pollMulti` 映射为多选。
Teams 投票以自适应卡片形式呈现，且需要网关保持在线，以便在 `~/.openclaw/msteams-polls.json` 中记录投票结果。
