---
summary: "Zalo 机器人支持状态、功能和配置"
read_when:
  - 正在处理 Zalo 功能或 webhook
title: "Zalo"
---

# Zalo（机器人 API）

状态：实验性。支持私信。下面的[功能能力](#capabilities)部分反映了当前 Marketplace 机器人行为。

## 需要插件

Zalo 作为插件提供，不包含在核心安装包中。

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或在设置时选择 **Zalo** 并确认安装提示
- 详情：[插件](/tools/plugin)

## 快速设置（初学者）

1. 安装 Zalo 插件：
   - 通过源代码检出：`openclaw plugins install ./extensions/zalo`
   - 通过 npm（如果已发布）：`openclaw plugins install @openclaw/zalo`
   - 或在设置时选择 **Zalo** 并确认安装提示
2. 设置令牌：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启网关（或完成设置）。
4. 私信访问默认使用配对；首次联系时批准配对码。

最简配置：

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

Zalo 是一个面向越南的消息应用，其机器人 API 允许网关运行机器人进行一对一对话。
非常适合需要确定性路由回 Zalo 的支持或通知场景。

此页面反映当前 OpenClaw 对**Zalo 机器人创建者/Marketplace 机器人**的行为。
**Zalo 官方账号 (OA) 机器人**是另一种 Zalo 产品，行为可能不同。

- 由网关拥有的 Zalo 机器人 API 通道。
- 确定性路由：回复回到 Zalo；模型从不选择通道。
- 私信共享代理的主会话。
- 下面的[功能能力](#capabilities)部分展示当前 Marketplace 机器人的支持。

## 设置（快速路径）

### 1）创建机器人令牌（Zalo 机器人平台）

1. 访问 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建新机器人并配置其设置。
3. 复制完整机器人令牌（通常为 `numeric_id:secret`）。对于 Marketplace 机器人，可以在创建后的欢迎消息中看到可用的运行时令牌。

### 2）配置令牌（环境变量或配置）

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

如果以后切换到支持群组的 Zalo 机器人表面，可以显式添加群组相关配置，如 `groupPolicy` 和 `groupAllowFrom`。当前 Marketplace 机器人行为详见[功能能力](#capabilities)。

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 为每个账户配置令牌和可选的 `name`。

3. 重启网关。令牌解析后（来自环境变量或配置），Zalo 即启动。
4. 私信默认使用配对。首次被机器人联系时批准配对码。

## 工作原理（行为）

- 入站消息被标准化为共享通道的信封形式，并带媒体占位符。
- 回复总是路由回相同的 Zalo 聊天。
- 默认长轮询；支持通过 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 出站文本拆分为最多 2000 字符块（Zalo API 限制）。
- 媒体下载/上传受限于 `channels.zalo.mediaMaxMb`（默认 5MB）。
- 由于 2000 字符限制，默认阻止流式传输，流式传输用途有限。

## 访问控制（私信）

### 私信访问

- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时后过期）。
- 通过以下命令批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对为默认令牌交换方式。详情请见：[配对](/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无用户名查找）。

## 访问控制（群组）

对于 **Zalo 机器人创建者/Marketplace 机器人**，实际上不支持群组，因为机器人根本无法被添加进群组。

这意味着下面的群组相关配置键在架构中存在，但对 Marketplace 机器人不可用：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可在群组中触发机器人。
- 若未设置 `groupAllowFrom`，Zalo 将回退到使用 `allowFrom` 进行发送者检查。
- 运行时注意：如果完全缺失 `channels.zalo`，运行时仍安全地回退到 `groupPolicy="allowlist"`。

当群组访问可用时，其群组策略值为：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任何群组成员（需提及机器人）。
- `groupPolicy: "allowlist"` — 默认失败关闭；只接受允许的发送者。

如果你使用的是不同的 Zalo 机器人产品，并且确认群组行为正常，请单独记录，不要假设与 Marketplace 机器人流程相同。

## 长轮询 vs webhook

- 默认：长轮询（无需公开 URL）。
- webhook 模式：配置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - webhook 秘钥必须为 8-256 字符。
  - webhook URL 必须是 HTTPS。
  - Zalo 使用 `X-Bot-Api-Secret-Token` 头部发送事件以供验证。
  - 网关 HTTP 服务器在 `channels.zalo.webhookPath` 路径（默认与 webhook URL 路径相同）处理 webhook 请求。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）在短暂重放窗口内被忽略。
  - 突发流量受路径/来源限制，可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 是互斥的。

## 支持的消息类型

快速支持快照见[功能能力](#capabilities)。以下注释补充了需额外说明的行为。

- **文本消息**：完全支持，支持 2000 字符拆分。
- **文本中的纯 URL**：表现如普通文本输入。
- **链接预览 / 富链接卡片**：见[功能能力](#capabilities)中的 Marketplace 机器人状态；未稳定触发回复。
- **图片消息**：见[功能能力](#capabilities)；入站图片处理不可靠（显示输入指示，但无最终回复）。
- **贴纸**：见[功能能力](#capabilities)。
- **语音消息 / 音频文件 / 视频 / 通用文件附件**：见[功能能力](#capabilities)。
- **不支持类型**：记录日志（例如来自受保护用户的消息）。

## 功能能力

本表总结了当前 OpenClaw 对 **Zalo 机器人创建者/Marketplace 机器人** 行为。

| 功能                       | 状态                                      |
| -------------------------- | ---------------------------------------- |
| 私信                       | ✅ 支持                                  |
| 群组                       | ❌ Marketplace 机器人不可用               |
| 媒体（入站图片）           | ⚠️ 有限 / 请在你的环境中验证               |
| 媒体（出站图片）           | ⚠️ Marketplace 机器人未重新测试           |
| 文本中的纯 URL             | ✅ 支持                                  |
| 链接预览                   | ⚠️ Marketplace 机器人不稳定                |
| 反应                       | ❌ 不支持                                |
| 贴纸                       | ⚠️ Marketplace 机器人无代理回复            |
| 语音 / 音频 / 视频          | ⚠️ Marketplace 机器人无代理回复            |
| 文件附件                   | ⚠️ Marketplace 机器人无代理回复            |
| 线程                       | ❌ 不支持                                |
| 投票                       | ❌ 不支持                                |
| 原生命令                   | ❌ 不支持                                |
| 流式传输                   | ⚠️ 阻止（2000 字符限制）                   |

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

扁平顶级键（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）为遗留的单账户简写。新配置推荐使用 `channels.zalo.accounts.<id>.*`。两种形式均在此文档中说明，因为架构中存在。

提供者选项：

- `channels.zalo.enabled`：启用/禁用通道启动。
- `channels.zalo.botToken`：来自 Zalo 机器人平台的令牌。
- `channels.zalo.tokenFile`：从普通文件路径读取令牌。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信白名单（用户 ID）。`open` 需使用 `"*"`。向导将请求数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。配置中存在；见[功能能力](#capabilities)和[访问控制（群组）](#access-control-groups)了解当前 Marketplace 机器人行为。
- `channels.zalo.groupAllowFrom`：群组发送者白名单（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体大小限制（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：单账户令牌。
- `channels.zalo.accounts.<id>.tokenFile`：单账户普通令牌文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：单账户私信策略。
- `channels.zalo.accounts.<id>.allowFrom`：单账户白名单。
- `channels.zalo.accounts.<id>.groupPolicy`：单账户群组策略。配置中存在；见[功能能力](#capabilities)和[访问控制（群组）](#access-control-groups)了解当前 Marketplace 机器人行为。
- `channels.zalo.accounts.<id>.groupAllowFrom`：单账户群组发送者白名单。
- `channels.zalo.accounts.<id>.webhookUrl`：单账户 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：单账户 webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`：单账户 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：单账户代理 URL。
