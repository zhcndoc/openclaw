---
summary: "语义化消息卡片、按钮、选择器、回退文本以及频道插件的投递提示"
title: "消息呈现"
read_when:
  - 添加或修改消息卡片、按钮或选择器的渲染
  - 构建支持富出站消息的频道插件
  - 更改消息工具的呈现或投递能力
  - 调试特定提供方的卡片/块/组件渲染回归问题
---

消息呈现是 OpenClaw 针对富出站聊天 UI 的共享契约。
它允许代理、CLI 命令、审批流程和插件一次性描述消息意图，而各频道插件再尽可能渲染出最佳的原生形态。

在可移植的消息 UI 中使用呈现能力：

- 文本区块
- 简短的上下文/页脚文本
- 分隔线
- 按钮
- 选择菜单
- 卡片标题和语气

不要在共享消息工具中添加新的提供方原生字段，例如 Discord 的 `components`、Slack
的 `blocks`、Telegram 的 `buttons`、Teams 的 `card` 或 Feishu 的 `card`。
这些属于频道插件所有的渲染输出。

## 契约

插件作者从以下位置导入公共契约：

```ts
import type {
  MessagePresentation,
  ReplyPayloadDelivery,
} from "openclaw/plugin-sdk/interactive-runtime";
```

结构：

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock =
  | { type: "text"; text: string }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "buttons"; buttons: MessagePresentationButton[] }
  | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationButton = {
  label: string;
  value?: string;
  url?: string;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  value: string;
};

type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

按钮语义：

- `value` 是应用动作值；当频道支持可点击控件时，它会通过该频道现有的交互路径路由回去。
- `url` 是链接按钮。它可以在没有 `value` 的情况下存在。
- `label` 是必需项，也会用于文本回退。
- `style` 只是建议。渲染器应将不支持的样式映射为安全默认值，而不是发送失败。

选择器语义：

- `options[].value` 是被选中的应用值。
- `placeholder` 只是建议项，某些不支持原生选择器的频道可以忽略它。
- 如果频道不支持选择器，回退文本会列出这些标签。

## 生产者示例

简单卡片：

```json
{
  "title": "部署审批",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "金丝雀版本已准备好推进。" },
    { "type": "context", "text": "构建 1234，staging 已通过。" },
    {
      "type": "buttons",
      "buttons": [
        { "label": "批准", "value": "deploy:approve", "style": "success" },
        { "label": "拒绝", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

仅 URL 链接按钮：

```json
{
  "blocks": [
    { "type": "text", "text": "发布说明已准备好。" },
    {
      "type": "buttons",
      "buttons": [{ "label": "打开说明", "url": "https://example.com/release" }]
    }
  ]
}
```

选择菜单：

```json
{
  "title": "选择环境",
  "blocks": [
    {
      "type": "select",
      "placeholder": "环境",
      "options": [
        { "label": "金丝雀", "value": "env:canary" },
        { "label": "生产环境", "value": "env:prod" }
      ]
    }
  ]
}
```

CLI 发送：

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "部署审批" \
  --presentation '{"title":"部署审批","tone":"warning","blocks":[{"type":"text","text":"金丝雀版本已准备好。"},{"type":"buttons","buttons":[{"label":"批准","value":"deploy:approve","style":"success"},{"label":"拒绝","value":"deploy:decline","style":"danger"}]}]}'
```

置顶投递：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

带显式 JSON 的置顶投递：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 渲染器契约

频道插件在其出站适配器上声明渲染支持：

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

能力字段刻意设计为简单的布尔值。它们描述的是渲染器能使哪些内容具备交互性，
而不是枚举所有原生平台限制。渲染器仍然负责平台特定限制，例如最大按钮数、区块数和卡片尺寸。

## 核心渲染流程

当 `ReplyPayload` 或消息动作包含 `presentation` 时，核心会：

1. 规范化呈现负载。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器可以渲染该负载时调用 `renderPresentation`。
5. 当适配器不存在或无法渲染时回退到保守文本。
6. 通过正常的频道投递路径发送生成的负载。
7. 在首条成功发送的消息之后应用诸如 `delivery.pin` 之类的投递元数据。

核心负责回退行为，因此生产者可以保持与频道无关。频道插件负责原生渲染和交互处理。

## 降级规则

呈现内容必须能够安全地发送到受限频道。

回退文本包括：

- `title` 作为第一行
- `text` 区块作为普通段落
- `context` 区块作为紧凑的上下文行
- `divider` 区块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择项标签

不支持的原生控件应该降级，而不是让整个发送失败。
例如：

- 禁用内联按钮的 Telegram 会发送文本回退。
- 不支持选择器的频道会把选项以文本形式列出。
- 仅 URL 按钮会变成原生链接按钮，或者回退为 URL 行。
- 可选的置顶失败不会导致已发送消息失败。

主要例外是 `delivery.pin.required: true`；如果请求置顶并且将其设为必需，而频道无法置顶已发送消息，则投递会报告失败。

## 提供方映射

当前内置渲染器：

| 频道            | 原生渲染目标                      | 说明                                                                                                                                              |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器                     | 为已有的提供方原生负载生产者保留旧的 `channelData.discord.components`，但新的共享发送应使用 `presentation`。                                        |
| Slack           | Block Kit                         | 为已有的提供方原生负载生产者保留旧的 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。                                             |
| Telegram        | 文本加内联键盘                     | 按钮/选择器需要目标表面支持内联按钮；否则使用文本回退。                                                                                           |
| Mattermost      | 文本加交互属性                     | 其他区块会降级为文本。                                                                                                                             |
| Microsoft Teams | 自适应卡片                        | 当同时提供时，普通 `message` 文本会与卡片一起包含。                                                                                                 |
| Feishu          | 交互式卡片                        | 卡片头部可以使用 `title`；正文会避免重复该标题。                                                                                                    |
| Plain channels  | 文本回退                          | 没有渲染器的频道仍然会得到可读输出。                                                                                                               |

提供方原生负载兼容性是为现有回复生产者提供的迁移过渡能力。
这不是添加新的共享原生字段的理由。

## Presentation vs InteractiveReply

`InteractiveReply` 是较早的内部子集，用于审批和交互辅助工具。
它支持：

- 文本
- 按钮
- 选择器

`MessagePresentation` 是规范化的共享发送契约。它增加了：

- 标题
- 语气
- 上下文
- 分隔线
- 仅 URL 按钮
- 通过 `ReplyPayload.delivery` 提供通用投递元数据

在桥接旧代码时，使用 `openclaw/plugin-sdk/interactive-runtime` 中的辅助函数：

```ts
import {
  interactiveReplyToPresentation,
  normalizeMessagePresentation,
  presentationToInteractiveReply,
  renderMessagePresentationFallbackText,
} from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接收或生成 `MessagePresentation`。

## 投递置顶

置顶是投递行为，不是呈现行为。应使用 `delivery.pin`，而不是诸如
`channelData.telegram.pin` 之类的提供方原生字段。

语义：

- `pin: true` 会置顶第一条成功投递的消息。
- `pin.notify` 默认值为 `false`。
- `pin.required` 默认值为 `false`。
- 可选的置顶失败会降级，但不会影响已发送消息本身。
- 必需的置顶失败会导致投递失败。
- 分块消息会置顶第一条成功投递的分块，而不是尾部分块。

对于已有消息，当提供方支持这些操作时，手动 `pin`、`unpin` 和 `pins` 消息动作仍然存在。

## 插件作者检查清单

- 当频道可以渲染或安全降级语义化展示时，从 `describeMessageTool(...)` 声明 `presentation`。
- 在运行时出站适配器中添加 `presentationCapabilities`。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件初始化代码中实现。
- 将原生 UI 库排除在热初始化/目录路径之外。
- 在渲染器和测试中保留平台限制。
- 为不支持的按钮、选择框、URL 按钮、标题/文本重复，以及 `message` 与 `presentation` 混合发送，添加回退测试。
- 仅当提供方能够固定已发送消息 id 时，通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加送达置顶支持。
- 不要通过共享消息动作 schema 暴露新的提供方原生卡片/块/组件/按钮字段。

## 相关文档

- [Message CLI](/cli/message)
- [Plugin SDK Overview](/plugins/sdk-overview)
- [Plugin Architecture](/plugins/architecture-internals#message-tool-schemas)
- [Channel Presentation Refactor Plan](/plan/ui-channels)
