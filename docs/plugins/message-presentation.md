---
summary: "语义化消息卡片、按钮、选择器、回退文本以及用于频道插件的投递提示"
title: "消息展示"
read_when:
  - 添加或修改消息卡片、按钮或选择器渲染时
  - 构建支持富出站消息的频道插件时
  - 更改消息工具展示或投递能力时
  - 调试特定提供方的卡片/区块/组件渲染回归时
---

消息展示是 OpenClaw 面向富出站聊天 UI 的共享契约。
它允许代理、CLI 命令、审批流和插件只描述一次消息意图，而由各个频道插件尽可能渲染为最佳的原生形态。

对可移植的消息 UI 使用展示能力：

- 文本区块
- 小型上下文/页脚文本
- 分隔线
- 按钮
- 选择菜单
- 卡片标题和语气

不要在共享消息工具中新增诸如 Discord `components`、Slack `blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card` 之类的提供方原生字段。这些是由频道插件拥有的渲染器输出。

## 契约

插件作者从以下位置导入公开契约：

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
  webApp?: { url: string };
  web_app?: { url: string };
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

- `value` 是一个应用动作值，当频道支持可点击控件时，会通过该频道现有的交互路径回传。
- `url` 是链接按钮。它可以在没有 `value` 的情况下存在。
- `webApp` 和 `web_app` 描述频道原生的 Web App 按钮。Telegram 会将其渲染为 `web_app`，且只支持私聊。
- `label` 是必填项，也用于文本回退。
- `style` 仅供参考。渲染器应将不支持的样式映射到安全默认值，而不是发送失败。

选择器语义：

- `options[].value` 是被选中的应用值。
- `placeholder` 仅作建议，某些没有原生选择器支持的频道可以忽略它。
- 如果某个频道不支持选择器，则回退文本会列出这些标签。

## 生产者示例

简单卡片：

```json
{
  "title": "部署审批",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "金丝雀已准备好晋升。" },
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

Telegram Mini App 按钮：

```json
{
  "blocks": [
    {
      "type": "buttons",
      "buttons": [{ "label": "启动", "web_app": { "url": "https://example.com/app" } }]
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
        { "label": "生产", "value": "env:prod" }
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
  --presentation '{"title":"部署审批","tone":"warning","blocks":[{"type":"text","text":"金丝雀已准备好。"},{"type":"buttons","buttons":[{"label":"批准","value":"deploy:approve","style":"success"},{"label":"拒绝","value":"deploy:decline","style":"danger"}]}]}'
```

置顶投递：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "主题已打开" \
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

能力字段故意设计为简单的布尔值。它们描述的是渲染器能让什么内容具备交互性，而不是所有原生平台限制。渲染器仍然负责诸如最大按钮数、区块数和卡片大小之类的平台特定限制。

## 核心渲染流程

当 `ReplyPayload` 或消息动作包含 `presentation` 时，核心会：

1. 规范化展示载荷。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器可以渲染该载荷时调用 `renderPresentation`。
5. 当适配器不存在或无法渲染时，回退为保守的文本。
6. 通过正常的频道投递路径发送结果载荷。
7. 在第一条成功发送的消息之后应用诸如 `delivery.pin` 之类的投递元数据。

核心负责回退行为，因此生产者可以保持与频道无关。频道插件负责原生渲染和交互处理。

## 降级规则

展示必须能够安全地发送到受限频道。

回退文本包括：

- `title` 作为第一行
- `text` 区块作为普通段落
- `context` 区块作为紧凑的上下文行
- `divider` 区块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择器选项标签

不支持的原生控件应进行降级，而不是让整个发送失败。
示例：

- 在禁用内联按钮的 Telegram 中会发送文本回退。
- 不支持选择器的频道会将选择项作为文本列出。
- 仅 URL 的按钮会变成原生链接按钮，或者回退为 URL 行。
- 可选的置顶失败不会导致已投递消息失败。

主要例外是 `delivery.pin.required: true`；如果请求置顶为必需，而频道无法将已发送消息置顶，则投递会报告失败。

## 提供方映射

当前内置渲染器：

| 频道           | 原生渲染目标                          | 说明                                                                                                                                                       |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord        | 组件和组件容器                         | 为现有的提供方原生载荷生产者保留旧的 `channelData.discord.components`，但新的共享发送应使用 `presentation`。                                               |
| Slack          | Block Kit                             | 为现有的提供方原生载荷生产者保留旧的 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。                                                   |
| Telegram       | 文本加内联键盘                          | 按钮/选择器要求目标表面具备内联按钮能力；否则使用文本回退。                                                                                                |
| Mattermost     | 文本加交互属性                          | 其他区块会降级为文本。                                                                                                                                     |
| Microsoft Teams | 自适应卡片                            | 当两者都提供时，纯 `message` 文本会与卡片一起包含。                                                                                                        |
| 飞书           | 交互式卡片                              | 卡片头部可以使用 `title`；正文会避免重复该标题。                                                                                                           |
| 纯文本频道      | 文本回退                               | 没有渲染器的频道仍会得到可读输出。                                                                                                                         |

提供方原生载荷兼容性是为现有回复生产者提供的过渡性便利。它不是新增共享原生字段的理由。

## Presentation vs InteractiveReply

`InteractiveReply` 是较早的内部子集，由审批和交互辅助工具使用。它支持：

- 文本
- 按钮
- 选择器

`MessagePresentation` 是规范的共享发送契约。它新增了：

- 标题
- 语气
- 上下文
- 分隔线
- 仅 URL 按钮
- 通过 `ReplyPayload.delivery` 提供的通用投递元数据

在桥接旧代码时，请使用 `openclaw/plugin-sdk/interactive-runtime` 中的辅助函数：

```ts
import {
  interactiveReplyToPresentation,
  normalizeMessagePresentation,
  presentationToInteractiveControlsReply,
  presentationToInteractiveReply,
  renderMessagePresentationFallbackText,
} from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接收或生成 `MessagePresentation`。

`presentationToInteractiveReply(...)` 会通过将标题、文本、上下文、按钮和选择器映射到较早的
`InteractiveReply` 形状来保留可见的展示文本。已经原生绘制标题、文本、
上下文和分隔线区块的组件渲染器应改用
`presentationToInteractiveControlsReply(...)`，然后只附加按钮和选择器控件。

`renderMessagePresentationFallbackText(...)` 对于没有文本回退的
展示区块会返回空字符串，例如仅包含分隔线的展示。需要非空发送正文的传输层可以传入
`emptyFallback`，以在不改变默认回退
契约的情况下使用最小正文。

## Delivery pin

置顶属于投递行为，而不是展示。请使用 `delivery.pin`，而不是诸如 `channelData.telegram.pin` 之类的提供方原生字段。

语义：

- `pin: true` 会置顶第一条成功投递的消息。
- `pin.notify` 默认值为 `false`。
- `pin.required` 默认值为 `false`。
- 可选置顶失败会降级处理，并保留已发送消息。
- 必需置顶失败会导致投递失败。
- 分块消息会置顶第一块成功投递的内容，而不是尾块。

手动的 `pin`、`unpin` 和 `pins` 消息动作仍然存在，供支持这些操作的提供方在现有消息上使用。

## 插件作者检查清单

- 当通道可以渲染或安全降级语义化呈现时，从 `describeMessageTool(...)` 中声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中。
- 不要将原生 UI 库放入热路径的 setup/catalog 路径中。
- 在渲染器和测试中保留平台限制。
- 为不受支持的按钮、选择框、URL 按钮、标题/文本重复，以及混合发送 `message` 和 `presentation` 的情况添加回退测试。
- 只有当提供方可以固定所发送消息的 id 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加送达固定支持。
- 不要通过共享消息动作 schema 暴露新的 provider-native card/block/component/button 字段。

## 相关文档

- [消息 CLI](/cli/message)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件架构](/plugins/architecture-internals#message-tool-schemas)
- [通道呈现重构计划](/plan/ui-channels)
