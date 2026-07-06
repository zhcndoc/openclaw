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

使用展示来实现可移植的消息 UI：文本区块、小型上下文/页脚文本、
分割线、按钮、选择菜单，以及卡片标题/色调。

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

type MessagePresentationAction =
  | { type: "command"; command: string }
  | { type: "callback"; value: string };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** 旧版回调值。新控件优先使用 action。 */
  value?: string;
  url?: string;
  webApp?: { url: string };
  /** @deprecated 使用 webApp。仅接受旧版 JSON 载荷。 */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: MessagePresentationAction;
  /** 旧版选择值。新控件优先使用 action。 */
  value?: string;
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

- `action.type: "command"` 通过 core 的 command 路径运行原生 slash 命令。用于内置命令按钮和菜单。
- `action.type: "callback"` 通过频道的交互路径传递不透明的插件数据。频道插件不得将回调数据重新解释为 slash 命令。
- `value` 是旧版的不透明回调值。新控件应使用 `action`，这样频道插件就可以在不根据文本猜测的情况下映射命令和回调。
- `url` 是链接按钮。它可以在没有 `value` 的情况下存在。
- `webApp` 描述一个频道原生的 web 应用按钮。Telegram 会将其渲染为 `web_app`，且仅支持私聊。为了兼容性，`web_app` 在宽松的 JSON 载荷中仍被接受，但 TypeScript 生成方应使用 `webApp`。
- `label` 是必需的，并且也会用于文本回退。
- `style` 仅作建议。渲染器应将不支持的样式映射为安全的默认值，而不是发送失败。
- `priority` 是可选的。当某个频道声明了动作限制且必须丢弃部分控件时，core 会优先保留更高优先级的按钮，并在相同优先级按钮之间保持原始顺序。当所有控件都能容纳时，会保留作者定义的顺序。
- `disabled` 是可选的。频道必须通过 `supportsDisabled` 明确支持；否则 core 会将禁用控件降级为不可交互的回退文本。即使禁用按钮携带 `command` 动作，回退文本中也始终只显示标签，不可交互。
- `reusable` 是可选的。支持可复用原生回调的频道可以在成功交互后继续保留该动作可用。可将其用于可重复或幂等的动作，例如刷新、检查或查看更多详情；普通的一次性审批和破坏性操作则不要设置它。

选择器语义：

- `options[].action` 与按钮 `action` 具有相同的 command/callback 含义。
- `options[].value` 是旧版的所选应用值。
- `placeholder` 仅供参考，缺少原生选择支持的频道可以忽略它。
- 如果频道不支持选择器，回退文本会列出这些标签。

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
    limits: {
      actions: {
        maxActions: 25,
        maxActionsPerRow: 5,
        maxRows: 5,
        maxLabelLength: 80,
        maxValueBytes: 100,
        supportsStyles: true,
        supportsDisabled: false,
      },
      selects: {
        maxOptions: 25,
        maxLabelLength: 100,
        maxValueBytes: 100,
      },
      text: {
        maxLength: 2000,
        encoding: "characters",
        markdownDialect: "discord-markdown",
      },
    },
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

能力布尔值描述了渲染器可以将哪些内容做成交互式。可选的
`limits` 描述了 core 在调用渲染器之前可以适配的通用边界：

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  limits?: {
    actions?: {
      maxActions?: number;
      maxActionsPerRow?: number;
      maxRows?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
      supportsStyles?: boolean;
      supportsDisabled?: boolean;
      supportsLayoutHints?: boolean;
    };
    selects?: {
      maxOptions?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
    };
    text?: {
      maxLength?: number;
      encoding?: "characters" | "utf8-bytes" | "utf16-units";
      markdownDialect?: "plain" | "markdown" | "html" | "slack-mrkdwn" | "discord-markdown";
      supportsEdit?: boolean;
    };
  };
};
```

core 会在渲染前将通用限制应用于语义化控件。渲染器仍然负责最终的提供方特定校验和裁剪，包括原生区块数量、卡片大小、URL 限制以及无法在通用契约中表达的提供方特殊行为。如果限制移除了某个区块中的所有控件，core 会保留这些标签作为不可交互的上下文文本，以便投递后的消息仍然拥有可见回退。

## 核心渲染流程

当 `ReplyPayload` 或消息动作包含 `presentation` 时，core 会：

1. 规范化展示载荷。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 在适配器声明支持时，应用通用能力限制，例如动作数量、标签长度和选择项数量。
5. 当适配器可以渲染该载荷时调用 `renderPresentation`。
6. 当适配器缺失或无法渲染时回退为保守文本。
7. 通过正常的频道投递路径发送结果载荷。
8. 在首条消息成功发送后应用诸如 `delivery.pin` 之类的投递元数据。

core 负责回退行为，因此生产者可以保持与频道无关。频道插件负责原生渲染和交互处理。

## 降级规则

展示必须能够安全地发送到受限频道。

回退文本包括：

- `title` 作为第一行
- `text` 区块作为普通段落
- `context` 区块作为紧凑的上下文行
- `divider` 区块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择器选项标签

### 按钮值回退可见性

当某个频道无法渲染交互控件时，按钮和值选择会回退为纯文本。此回退行为在保持可用性的同时，会保护不透明的回调数据私密：

- **`command` 类型的动作** 会渲染为 `label: \`command\``，这样用户可以复制该命令并在频道输入中手动运行。
- **`callback` 类型的动作** 和旧版 **`value`** 字段会仅渲染标签。未公开的回调值不会出现在回退文本中。
- **`url` / `webApp`** 按钮会连同按钮标签一起渲染 URL 文本，因为 URL 是面向用户的。
- **选择器选项** 仅渲染标签。底层选项值不会出现在回退文本中。

在回退 UI 中添加手动命令指引的频道适配器（例如飞书文档评论说明）必须从与回退渲染器相同的展示区块中派生命令存在性检查，因此只有在实际显示手动命令时，指引文本才会出现。

不支持的原生控件应当降级，而不是让整个发送失败。例如：

- 在禁用内联按钮的 Telegram 中会发送文本回退。
- 不支持选择器的频道会将选择项作为文本列出。
- 仅 URL 的按钮会变成原生链接按钮，或者回退为 URL 行。
- 可选的置顶失败不会导致已投递消息失败。

主要例外是 `delivery.pin.required: true`；如果请求置顶为必需，而频道无法将已发送消息置顶，则投递会报告失败。

## 提供方映射

当前内置渲染器：

| Channel         | Native render target                      | Notes                                                                                                                                                                                                             |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器       | 为现有提供方原生载荷生产者保留旧版 `channelData.discord.components`，但新的共享发送应使用 `presentation`。                                                                                                                              |
| 飞书          | 交互式卡片                         | 卡片标题可使用 `title`；正文避免重复该标题。                                                                                                                                                  |
| Matrix         | 文本回退加结构化事件字段 | 按钮/选择项会被标记为受支持，但目前每个块都仅渲染为 `renderMessagePresentationFallbackText` 的输出，并携带在 `com.openclaw.presentation` 事件字段中，而不是原生交互式组件。 |
| Mattermost      | 文本加交互属性               | 不支持选择项和分隔线；这些块会降级为文本。                                                                                                                                             |
| Microsoft Teams | 自适应卡片                            | 当同时提供时，纯 `message` 文本会与卡片一起包含。 不支持选择项、样式和禁用状态。                                                                                     |
| Slack           | Block Kit                                 | 为现有提供方原生载荷生产者保留旧版 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。                                                                       |
| Telegram        | 文本加内联键盘                | 按钮/选择项需要目标界面具备内联按钮能力；否则将使用文本回退。                                                                                                         |
| 纯文本渠道  | 文本回退                             | 即使没有渲染器的渠道也能获得可读输出。                                                                                                                                                            |

提供方原生载荷兼容性是为现有回复生产者提供的过渡性便利。它不是新增共享原生字段的理由。

## 展示 vs 交互回复

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
  adaptMessagePresentationForChannel,
  applyPresentationActionLimits,
  hasMessagePresentationBlocks,
  interactiveReplyToPresentation,
  isMessagePresentationInteractiveBlock,
  normalizeMessagePresentation,
  presentationPageSize,
  presentationToInteractiveControlsReply,
  presentationToInteractiveReply,
  renderMessagePresentationFallbackText,
  resolveMessagePresentationActionValue,
  resolveMessagePresentationControlValue,
} from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接收或生成 `MessagePresentation`。现有的
`interactive` 载荷是 `presentation` 的已弃用子集；运行时
仍会为旧生产者保留支持。

值得了解的非弃用辅助函数：

- `normalizeMessagePresentation(raw)` / `hasMessagePresentationBlocks(value)`
  验证并强制转换一个未类型化载荷（例如来自 CLI
  `--presentation` 标志的 JSON）为 `MessagePresentation`。
- `isMessagePresentationInteractiveBlock(block)` 将一个区块缩窄为
  `buttons` | `select` 联合类型。
- `resolveMessagePresentationActionValue(action)` /
  `resolveMessagePresentationControlValue(control)` 读取 `action` 上有效的
  command/callback 值，并在 `resolveMessagePresentationControlValue` 中回退到旧的 `value`
  字段。

SDK 中的旧版 `InteractiveReply*` 类型和转换辅助函数已标记为
`@deprecated`：

- `InteractiveReply`、`InteractiveReplyBlock`、`InteractiveReplyButton`、
  `InteractiveReplyOption`、`InteractiveReplySelectBlock` 和
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` 和
`presentationToInteractiveControlsReply(...)` 仍可作为旧版频道实现的渲染
桥接函数使用。新的生产者代码不应调用它们；发送 `presentation` 并让 core/频道适配处理渲染。

审批辅助工具也有以 presentation 为优先的替代方案：

- 使用 `buildApprovalPresentationFromActionDescriptors(...)` 代替
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- 使用 `buildApprovalPresentation(...)` 代替
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` 对于没有文本回退的
展示区块会返回空字符串，例如仅包含分隔线的展示。需要非空发送正文的传输层可以传入
`emptyFallback`，以在不改变默认回退
契约的情况下使用最小正文。

## 投递置顶

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

- 当通道可以渲染语义化呈现，或能够安全降级时，从 `describeMessageTool(...)` 声明 `presentation`。
- 在运行时 outbound adapter 中添加 `presentationCapabilities`。
- 在运行时代码中实现 `renderPresentation`，不要放在控制平面插件初始化代码中。
- 不要让原生 UI 库进入热路径的初始化/目录路径。
- 当已知时，在 `presentationCapabilities.limits` 上声明通用能力限制。
- 在渲染器和测试中保留最终的平台限制。
- 为不支持的按钮、选择器、URL 按钮、标题/文本重复，以及同时发送 `message` 和 `presentation` 的情况添加回退测试。
- 仅当提供方能够对已发送消息 id 进行置顶时，通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加投递置顶支持。
- 不要通过共享的消息动作 schema 暴露新的提供方原生卡片/区块/组件/按钮字段。

## 相关文档

- [消息 CLI](/cli/message)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件架构](/plugins/architecture-internals#message-tool-schemas)
- [通道呈现重构计划](/plan/ui-channels)
