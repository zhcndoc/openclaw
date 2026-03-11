---
summary: "Zalo 机器人支持状态、功能和配置"
read_when:
  - 正在处理 Zalo 功能或 webhook
title: "Zalo"
---

# Zalo（机器人 API）

状态：实验性。支持私信（DM）；群组处理通过显式的群组策略控制提供。

## 需要插件

Zalo 作为插件提供，不包含在核心安装包中。

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或在初始引导时选择 **Zalo** 并确认安装提示
- 详情请见：[插件](/tools/plugin)

## 快速设置（初学者）

1. 安装 Zalo 插件：
   - 从源码检出安装：`openclaw plugins install ./extensions/zalo`
   - 从 npm 安装（如果已发布）：`openclaw plugins install @openclaw/zalo`
   - 或在初始引导时选择 **Zalo** 并确认安装提示
2. 设置令牌：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置文件：`channels.zalo.botToken: "..."`。
3. 重启网关（或完成初始化引导）。
4. 私信访问默认通过配对；首次联系时批准配对码。

最简配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

## 它是什么

Zalo 是一个面向越南的消息应用，其机器人 API 允许网关运行机器人进行一对一对话。
非常适合需要确定性路由回 Zalo 的支持或通知场景。

- 由网关拥有的 Zalo 机器人 API 通道。
- 确定性路由：回复总是返回到 Zalo；模型不会选择通道。
- 私信共用代理的主会话。
- 支持群组，带有策略控制（`groupPolicy` + `groupAllowFrom`），默认采用闭塞失败模式的白名单行为。

## 设置（快速路径）

### 1）创建机器人令牌（Zalo 机器人平台）

1. 访问 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建新机器人并配置其设置。
3. 复制机器人令牌（格式为：`12345689:abc-xyz`）。

### 2）配置令牌（环境变量或配置）

示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 配置每个账户的令牌及可选的 `name`。

3. 重启网关。令牌解析后（从环境变量或配置），Zalo 即启动。
4. 私信访问默认使用配对。首次被机器人联系时批准配对码。

## 工作原理（行为）

- 入站消息被标准化为共享通道的信封形式，并带有媒体占位符。
- 回复始终路由回相同的 Zalo 聊天。
- 默认长轮询；支持通过 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 出站文本被拆分为最多 2000 字符块（Zalo API 限制）。
- 媒体下载/上传受限于 `channels.zalo.mediaMaxMb`（默认 5MB）。
- 由于 2000 字符限制，默认阻止流式传输，流式传输的用途有限。

## 访问控制（私信）

### 私信访问

- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时后过期）。
- 通过以下命令批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对为默认的令牌交换方式。详情请看：[配对](/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无用户名查找）。

## 访问控制（群组）

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- 默认行为为闭塞失败：`allowlist`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可在群组中触发机器人。
- 若未设置 `groupAllowFrom`，Zalo 回退使用 `allowFrom` 进行发送者检查。
- `groupPolicy: "disabled"` 阻断所有群消息。
- `groupPolicy: "open"` 允许所有群成员（需通过 @提及）。
- 运行时提示：若完全缺少 `channels.zalo`，运行时仍会回退到 `groupPolicy="allowlist"` 以保障安全。

## 长轮询与 webhook

- 默认：长轮询（无须公开 URL）。
- webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - webhook 密钥必须为 8-256 字符。
  - webhook URL 必须为 HTTPS。
  - Zalo 使用 `X-Bot-Api-Secret-Token` 头部发送事件以供验证。
  - 网关 HTTP 服务器在 `channels.zalo.webhookPath` 路径（默认与 webhook URL 路径相同）处理 webhook 请求。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）在短暂重放窗口内被忽略。
  - 突发流量受路径/来源限制，可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 为互斥方式。

## 支持的消息类型

- **文本消息**：完全支持，自动拆分为 2000 字符块。
- **图片消息**：支持下载和处理入站图片；可通过 `sendPhoto` 发送图片。
- **表情贴纸**：会记录但未完全处理（无代理响应）。
- **不支持类型**：会记录（例如来自受保护用户的消息）。

## 功能能力

| 功能         | 状态                              |
| ------------ | --------------------------------- |
| 私信         | ✅ 支持                           |
| 群组         | ⚠️ 支持，带策略控制（默认白名单） |
| 媒体（图片） | ✅ 支持                           |
| 表情反应     | ❌ 不支持                         |
| 线程         | ❌ 不支持                         |
| 投票         | ❌ 不支持                         |
| 原生日志命令 | ❌ 不支持                         |
| 流式传输     | ⚠️ 被阻止（2000 字符限制）        |

## 发送目标（CLI/定时任务）

- 使用聊天 ID 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**机器人不响应：**

- 检查令牌是否有效：`openclaw channels status --probe`
- 确认发送者已获批准（配对或白名单）
- 查看网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确保 webhook URL 使用 HTTPS
- 确认密钥长度为 8-256 字符
- 确认网关 HTTP 端点在配置路径上可访问
- 确认未同时运行 getUpdates 轮询（两者互斥）

## 配置参考（Zalo）

完整配置请见：[配置](/gateway/configuration)

提供商选项：

- `channels.zalo.enabled`：启用/禁用通道启动。
- `channels.zalo.botToken`：来自 Zalo 机器人平台的令牌。
- `channels.zalo.tokenFile`：从常规文件路径读取令牌。符号链接会被拒绝。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信白名单（用户 ID）。`open` 时需要 `"*"`。向导会询问数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.zalo.groupAllowFrom`：群组发送者白名单（用户 ID）。未设置时回退为 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入/出站媒体大小上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（必须 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：每账户令牌。
- `channels.zalo.accounts.<id>.tokenFile`：每个账户的常规令牌文件。符号链接将被拒绝。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：每账户私信策略。
- `channels.zalo.accounts.<id>.allowFrom`：每账户白名单。
- `channels.zalo.accounts.<id>.groupPolicy`：每账户群组策略。
- `channels.zalo.accounts.<id>.groupAllowFrom`：每账户群组发送者白名单。
- `channels.zalo.accounts.<id>.webhookUrl`：每账户 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：每账户 webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`：每账户 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：每账户代理 URL。
