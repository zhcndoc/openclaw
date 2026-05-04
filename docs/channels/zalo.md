---
summary: "Zalo 机器人支持状态、功能与配置"
read_when:
  - 处理 Zalo 功能或 webhook 时
title: "Zalo"
---

状态：实验性。支持私信。下面的 [Capabilities](#capabilities) 部分反映了当前 Marketplace 机器人行为。

## 捆绑插件

Zalo 作为当前 OpenClaw 版本中的捆绑插件提供，因此正常的打包构建无需单独安装。

如果你使用的是较旧的构建版本，或者是排除了 Zalo 的自定义安装，请直接安装
npm 包：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 固定版本：`openclaw plugins install @openclaw/zalo@2026.5.2`
- 或从源码检出安装：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情：[Plugins](/tools/plugin)

## 快速设置（入门）

1. 确保 Zalo 插件可用。
   - 当前打包版 OpenClaw 版本已经内置。
   - 较旧/自定义安装可以使用上面的命令手动添加。
2. 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启网关（或完成设置）。
4. 私信访问默认采用配对；首次联系时请批准配对码。

最小配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## 它是什么

Zalo 是一款面向越南的消息应用；其 Bot API 允许网关运行一个用于一对一对话的机器人。
它非常适合需要将路由确定性地返回到 Zalo 的支持或通知场景。

本页反映了 OpenClaw 当前对 **Zalo Bot Creator / Marketplace bots** 的行为。
**Zalo Official Account (OA) bots** 是不同的 Zalo 产品形态，行为可能不同。

- 由网关拥有的 Zalo Bot API 通道。
- 确定性路由：回复会返回到 Zalo；模型从不选择通道。
- 私信与代理的主会话共享。
- 下面的 [Capabilities](#capabilities) 部分展示了当前对 Marketplace bot 的支持情况。

## 设置（快速路径）

### 1) 创建 bot token（Zalo Bot Platform）

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建一个新机器人并配置其设置。
3. 复制完整的 bot token（通常为 `numeric_id:secret`）。对于 Marketplace bots，创建后可用的运行时 token 可能会出现在机器人的欢迎消息中。

### 2) 配置 token（环境变量或配置）

示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

如果你之后迁移到支持群组的 Zalo bot 产品形态，可以显式添加特定群组配置，例如 `groupPolicy` 和 `groupAllowFrom`。对于当前 Marketplace-bot 行为，请参见 [Capabilities](#capabilities)。

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts`，为每个账户配置各自的 token，并可选设置 `name`。

3. 重启网关。Zalo 会在 token 解析成功后启动（来自环境变量或配置）。
4. 私信访问默认采用配对。机器人首次被联系时请批准该代码。

## 工作方式（行为）

- 入站消息会被标准化为共享通道信封，并带有媒体占位符。
- 回复始终路由回同一个 Zalo 聊天。
- 默认使用长轮询；也可通过 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 出站文本会按 2000 字符分块发送（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认 5）。
- 由于 2000 字符限制会使流式输出意义不大，因此默认阻止流式输出。

## 访问控制（私信）

### 私信访问

- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到配对码；在获批前消息会被忽略（代码 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的 token 交换方式。详情：[Pairing](/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（不支持用户名查找）。

## 访问控制（群组）

对于 **Zalo Bot Creator / Marketplace bots**，群组支持实际上不可用，因为机器人根本无法被添加到群组中。

这意味着下面这些与群组相关的配置键存在于 schema 中，但对 Marketplace bots 来说不可使用：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可以在群组中触发机器人。
- 如果未设置 `groupAllowFrom`，Zalo 会回退使用 `allowFrom` 进行发送者检查。
- 运行时说明：如果完全没有 `channels.zalo`，运行时仍会出于安全原因回退为 `groupPolicy="allowlist"`。

当你的 bot 形态支持群组访问时，群组策略值为：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任何群组成员（需通过提及触发）。
- `groupPolicy: "allowlist"` — 默认失败关闭；只接受允许名单中的发送者。

如果你使用的是不同的 Zalo bot 产品形态，并且已验证群组行为可正常工作，请单独记录，而不要假设它与 Marketplace-bot 流程一致。

## 长轮询 vs webhook

- 默认：长轮询（不需要公开 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - webhook secret 必须为 8-256 个字符。
  - Webhook URL 必须使用 HTTPS。
  - Zalo 会发送带有 `X-Bot-Api-Secret-Token` 头部的事件用于验证。
  - 网关 HTTP 在 `channels.zalo.webhookPath` 处理 webhook 请求（默认使用 webhook URL 的路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）会在短暂重放窗口内被忽略。
  - 突发流量会按路径/来源进行限速，可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）与 webhook 互斥。

## 支持的消息类型

如需快速查看支持情况，请参见 [Capabilities](#capabilities)。下面的说明会在需要额外上下文时补充细节。

- **文本消息**：完全支持，并进行 2000 字符分块。
- **文本中的纯 URL**：行为与普通文本输入相同。
- **链接预览 / 富链接卡片**：参见 [Capabilities](#capabilities) 中的 Marketplace-bot 状态；它们未能稳定触发回复。
- **图片消息**：参见 [Capabilities](#capabilities) 中的 Marketplace-bot 状态；入站图片处理不稳定（会显示输入中指示，但没有最终回复）。
- **贴纸**：参见 [Capabilities](#capabilities) 中的 Marketplace-bot 状态。
- **语音留言 / 音频文件 / 视频 / 通用文件附件**：参见 [Capabilities](#capabilities) 中的 Marketplace-bot 状态。
- **不支持的类型**：会被记录日志（例如，来自受保护用户的消息）。

## 功能

此表汇总了 OpenClaw 中当前 **Zalo Bot Creator / Marketplace bot** 的行为。

| 功能                        | 状态                                    |
| --------------------------- | --------------------------------------- |
| 私信                        | ✅ 支持                                 |
| 群组                        | ❌ Marketplace bots 不可用              |
| 媒体（入站图片）             | ⚠️ 有限制 / 请在你的环境中验证          |
| 媒体（出站图片）             | ⚠️ 未针对 Marketplace bots 重新测试     |
| 文本中的纯 URL               | ✅ 支持                                 |
| 链接预览                     | ⚠️ Marketplace bots 上不稳定            |
| 反应                        | ❌ 不支持                               |
| 贴纸                        | ⚠️ Marketplace bots 不会产生代理回复    |
| 语音留言 / 音频 / 视频        | ⚠️ Marketplace bots 不会产生代理回复    |
| 文件附件                    | ⚠️ Marketplace bots 不会产生代理回复    |
| 线程                        | ❌ 不支持                               |
| 投票                        | ❌ 不支持                               |
| 原生命令                    | ❌ 不支持                               |
| 流式输出                    | ⚠️ 被阻止（2000 字符限制）              |

## 投递目标（CLI/cron）

- 使用 chat id 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排查

**机器人不响应：**

- 检查 token 是否有效：`openclaw channels status --probe`
- 验证发送者是否已获批准（配对或 allowFrom）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确保 webhook URL 使用 HTTPS
- 验证 secret token 长度为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 检查 getUpdates 轮询未在运行（两者互斥）

## 配置参考（Zalo）

完整配置：[Configuration](/gateway/configuration)

扁平化的顶层键（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是旧版的单账户简写。新配置建议优先使用 `channels.zalo.accounts.<id>.*`。这里保留了两种形式，因为它们都存在于 schema 中。

提供方选项：

- `channels.zalo.enabled`：启用/禁用通道启动。
- `channels.zalo.botToken`：来自 Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：从普通文件路径读取 token。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信允许名单（用户 ID）。`open` 需要 `"*"`。向导会要求输入数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。已存在于配置中；有关当前 Marketplace-bot 行为，请参见 [Capabilities](#capabilities) 和 [访问控制（群组）](#access-control-groups)。
- `channels.zalo.groupAllowFrom`：群组发送者允许名单（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook secret（8-256 个字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：每个账户的 token。
- `channels.zalo.accounts.<id>.tokenFile`：每个账户的普通 token 文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：每个账户的私信策略。
- `channels.zalo.accounts.<id>.allowFrom`：每个账户的允许名单。
- `channels.zalo.accounts.<id>.groupPolicy`：每个账户的群组策略。已存在于配置中；有关当前 Marketplace-bot 行为，请参见 [Capabilities](#capabilities) 和 [访问控制（群组）](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`：每个账户的群组发送者允许名单。
- `channels.zalo.accounts.<id>.webhookUrl`：每个账户的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：每个账户的 webhook secret。
- `channels.zalo.accounts.<id>.webhookPath`：每个账户的 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：每个账户的代理 URL。

## 相关

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型和加固
