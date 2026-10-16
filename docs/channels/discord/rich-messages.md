---
summary: "Discord 中的组件 v2 容器、交互式组件有效负载和执行批准"
read_when:
  - "从代理发送按钮、选择或其他 Discord 组件"
  - "批准来自 Discord 内部的执行请求"
title: "Discord 组件和认证"
sidebarTitle: "组件和批准"
---

丰富的 Discord 消息表面：组件 v2 容器、交互处理和批准提示。

## <a id="interactive-components"></a> 交互式组件

OpenClaw 支持用于代理消息的 Discord components v2 容器。使用带有 `components` 载荷的消息工具。交互结果会作为普通的传入消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

`components` 是共享消息工具的 Discord- 特定扩展。每当配置 Discord 时，包括当另一个通道处于当前状态时，OpenClaw 都会公开它。当相同的丰富消息必须跨渠道工作时，请使用 `presentation`； OpenClaw 使便携式演示动作适应每个目标。

支持的块：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 操作行最多允许 5 个按钮或一个单选菜单
- Buttons 支持表情符号，包括链接按钮
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件只能使用一次。设置 `components.reusable=true` 可允许按钮、选择器和表单在过期前被多次使用。

组件发送、编辑和本机命令回复等待回调注册完成。使用一次性选择会在另一个交互可以解决其兄弟回调之前完成删除它们。如果持久性不可用，OpenClaw 会报告失败并保留当前进程的内存回退。

要限制谁可以单击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。不匹配的用户会收到短暂的拒绝。

默认情况下，组件回调在 30 分钟后过期。设置 `channels.discord.agentComponents.ttlMs` 以更改默认帐户的回调注册表生命周期，或每个帐户的 `channels.discord.accounts.<accountId>.agentComponents.ttlMs`。值为毫秒，必须为正整数，上限为`86400000`（24小时）。较长的 TTL 适合需要按钮保持可用的 review/approval 工作流程，但它们扩展了旧的 Discord 消息仍然可以触发操作的窗口。首选合适的最短的 TTL，并在过时的回调令人惊讶时保留默认值。

`/model` 和 `/models` 斜杠命令打开一个交互式模型选择器，其中包含提供程序、模型和兼容的运行时下拉列表以及提交步骤。 `/models add` 已弃用并返回弃用消息，而不是从聊天中注册模型。选择器回复是短暂的，只能由调用用户使用。 Discord 选择菜单仅限于 25 个选项，因此当您希望选择器仅显示选定提供程序（例如 `openai` 或 `vllm`）的动态发现模型时，请将 `provider/*` 条目添加到 `agents.defaults.modelPolicy.allow`。

文件附件：

- `file` 块必须指向一个附件引用（`attachment://<filename>`）
- 通过`media`/`path`/`filePath`提供附件（单个文件）；对多个文件使用 `media-gallery`
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名
- 附件标题保留文本块顺序和重复段落

模态表单：

- 添加 `components.modal`，最多 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 会自动添加一个触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## Components v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息动作也可以接受 `components` 来构建自定义 UI（高级用法；需要通过 discord 工具构造 component payload），而旧版 `embeds` 仍然可用，但不建议使用。

- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调保持注册的时长（默认值为 `1800000`，最大值为 `86400000`）。按账户设置：`channels.discord.accounts.<id>.agentComponents.ttlMs`。
- 存在组件 v2 时会忽略 `embeds`。
- 默认会抑制纯 URL 预览。当单个外发链接需要展开时，请在消息动作中设置 `suppressEmbeds: false`。

## <a id="approvals"></a> 审批

<AccordionGroup>
  <Accordion id="approvals-in-discord" title="Discord 中的批准">
    Discord 支持 DM 中基于按钮的批准处理，并且可以选择在原始渠道中发布批准提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord 本机执行审批需要 `enabled: true` 或 `enabled: "auto"` 以及至少一名已解析审批者（来自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`）。保留 `enabled` 未设置或将其设置为 `false` 将禁用本机执行批准交付。 Discord 不会从通道 `allowFrom`、旧版 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批者。

    对于诸如 `/diagnostics` 和 `/export-trajectory` 之类敏感的仅所有者组命令，OpenClaw 会私下发送审批提示和最终结果。若发起者所有者拥有 Discord 所有者路由，则优先尝试 Discord DM；否则会回退到 `commands.ownerAllowFrom` 中第一个可用的所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both` 时，审批提示会在频道中可见。只有已解析出的审批者可以使用这些按钮；其他用户会收到一个临时拒绝。审批提示包含命令文本，因此只应在受信任的频道中启用频道投递。如果无法从会话键推导出频道 ID，OpenClaw 会回退为 DM 投递。

    Discord 渲染其他聊天通道使用的共享审批按钮；原生Discord适配器主要增加了批准者DM路由和通道扇出。当这些按钮出现时，它们是主要批准 UX；当工具结果表明聊天批准不可用或手动批准是唯一路径时，OpenClaw 应仅包含手动 `/approve` 命令。如果 Discord 本机审批运行时未激活，则 OpenClaw 使本地 `/approve <id> <decision>` 提示保持可见。如果运行时处于活动状态，但本机卡无法传送到任何目标，则 OpenClaw 会发送相同聊天回退通知，其中包含来自待批准的确切 `/approve` 命令。

    网关身份验证和批准解析遵循共享网关客户端合同（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。默认情况下，批准会在 30 分钟后过期。

    参见 [执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>
