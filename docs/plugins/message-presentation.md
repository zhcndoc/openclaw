---
summary: "用于频道插件的语义消息卡片、图表、表格、控件、回退文本和交付提示"
title: "消息展示"
read_when:
  - "添加或修改消息卡片、图表、表格、按钮或选择器渲染"
  - "构建支持富出站消息的频道插件"
  - "更改消息工具展示或交付能力"
  - "调试特定于提供程序的 card/block/component 渲染回归"
---

消息展示是 OpenClaw 面向富出站聊天 UI 的共享契约。 它允许代理、CLI 命令、审批流和插件只描述一次消息意图，而由各个频道插件尽可能渲染为最佳的原生形态。

使用便携式消息 UI 的演示：文本部分、小 context/footer 文本、分隔线、图表、表格、按钮、选择菜单和卡片 title/tone.

默认情况下，不要将提供者本机字段添加到共享消息工具。本机扩展需要明确的维护者批准、通道拥有的模式、记录的跨通道行为以及 `presentation` 无法表达的功能。 Discord `components` 是经过批准的内置例外，适用于模态表单、媒体库、文件块、带有附件的部分和样式容器。使用 `presentation` 发送便携式丰富消息。

## <a id="contract"></a> 契约

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
  | { type: "select"; placeholder?: string; options: MessagePresentationOption[] }
  | {
      type: "chart";
      chartType: "pie";
      title: string;
      segments: Array<{ label: string; value: number }>;
    }
  | {
      type: "chart";
      chartType: "bar" | "area" | "line";
      title: string;
      categories: string[];
      series: Array<{ name: string; values: number[] }>;
      xLabel?: string;
      yLabel?: string;
    }
  | {
      type: "table";
      caption: string;
      headers: string[];
      rows: Array<Array<string | number>>;
      rowHeaderColumnIndex?: number;
    };

type MessagePresentationAction =
  | { type: "command"; command: string }
  | { type: "callback"; value: string }
  | {
      type: "approval";
      approvalId: string;
      approvalKind: "exec" | "plugin";
      decision: "allow-once" | "allow-always" | "deny";
    }
  | {
      type: "question";
      questionId: string;
      optionValue: string;
    }
  | {
      type: "question";
      questionId: string;
      intent: "custom-input";
    }
  | { type: "url"; url: string }
  | {
      type: "web-app";
      url: string;
      widgetId?: string;
    }
  | {
      type: "web-app";
      url?: string;
      widgetId: string;
    };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
  /** @deprecated Use an action with type "url". */
  url?: string;
  /** @deprecated Use an action with type "web-app". */
  webApp?: { url: string };
  /** @deprecated Use an action with type "web-app". */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: Extract<MessagePresentationAction, { type: "command" | "callback" }>;
  /** Legacy callback value. Prefer action for new controls. */
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

- `action.type: "command"` 通过核心的命令路径运行原生斜杠命令。内置命令按钮和菜单应使用此类型。
- `action.type: "callback"` 通过频道的交互路径传递不透明的插件数据。频道插件不得将回调数据重新解释为斜杠命令。
- `action.type: "approval"` 标识一个持久化的操作员审批、其明确的 `exec` 或 `plugin` 类型，以及请求的决定。频道插件会将该动作编码到传输层私有的回调中，并通过审批服务解析；不得解析 `/approve` 命令文本，也不得根据 ID 推断类型。
- `action.type: "question"` 标识实时、运行时编写的 `ask_user` 问题的一个选择。与 `approval` 一样，这是一个 OpenClaw 运行时操作；代理和插件不得合成问题 ID。 Telegram、Discord、Slack、Mattermost 和 LINE 直接聊天将其映射到传输私有本机回调，并通过网关解决选择。当问题已回答、过期或取消时，Telegram、Discord 和 Slack 编辑已传递的消息、删除其操作并附加终端状态。 Mattermost 仅在接受点击时才取消提示，因此在其他地方结束的问题保留其按钮；稍后点击即可获得私人反馈。被拒绝的 Mattermost 点击也会收到私人反馈并保持提示不变。 LINE 群组和多人聊天保留可读的选择，因为它们的回发不包括承认答案所需的发件人身份。未知的 LINE 目标也使用文本。 LINE 无法编辑已发送的消息，因此问题结束后点击会收到通知。 LINE 在一张卡上最多绘制四个控件，与其 2 到 4 个选项绑定相匹配。 WhatsApp、Signal 和 iMessage 通过 `4️⃣` 反应呈现最多四个单选选项作为 `1️⃣`。其他问题形状会降级为标签文本，用户可以使用纯文本回复进行回答。
- `intent: "custom-input"` 将实时问题切换到其自由文本答案路径而不解决它。制作者还必须以可见文本形式说明自由文本路线。当通道无法安全地定位文本编辑器时，可以忽略这一本机控件，同时保持声明的选择控件为本机。 Telegram 将其映射到 **Other…** 并强制回复。 Discord、Slack、Mattermost 和 LINE 保留可见文本路由。
- `action.type: "url"` 打开普通链接。
- `action.type: "web-app"` 推出频道原生 Web 应用程序。为 URL-backed 应用程序设置 `url`，或为 OpenClaw-hosted 小部件设置 `widgetId`，其启动机制由通道拥有；至少需要一个。当两者都存在时，通道可以首选其本机托管小部件启动，并在该机制不可用时使用 URL。
- `value` 是旧版不透明回调值。新控件应使用 `action`，这样频道插件就能映射命令和回调，而无需根据文本猜测。
- `url`、`webApp` 和 `web_app` 仍作为已弃用的边界输入接受。规范化器会保留这些字段，以便渲染器区分已发布的旧版语义和显式类型化动作。新的生产者应使用 `action`。
- `label` 是必需的，也会用于文本回退。
- `style` 仅供参考。渲染器应将不支持的样式映射为安全的默认值，而不是使发送失败。
- `priority` 是可选的。当频道声明了动作数量限制且必须丢弃控件时，核心会优先保留优先级较高的按钮，并在优先级相同的按钮之间保持原始顺序。当所有控件都能容纳时，则保持编写时的顺序。
- `disabled` 是可选的。频道必须通过 `supportsDisabled` 显式选择支持；否则核心会将禁用控件降级为不可交互的回退文本。禁用按钮在回退文本中始终只渲染标签，即使它携带了 `command` 动作。
- `reusable` 为可选。支持可重用本机回调的通道可以在成功交互后保持操作可用。将其用于安全重复的操作，例如刷新、检查或更多详细信息；对于正常的一次性批准和破坏性操作，请不要将其设置为未设置。

选择器语义：

- `options[].action` 仅接受 `command` 或 `callback`；审批和链接动作仅适用于按钮。
- `options[].value` 是旧版选中的应用值。
- `placeholder` 仅作为建议，可能会被不支持原生选择器的频道忽略。
- 如果频道不支持选择器，回退文本会列出标签。

图表语义：

- `pie` 要求分段值为正数。
- `bar`、`area` 和 `line` 使用一个有序的 `categories` 数组。每个系列都必须按相同顺序为每个类别提供恰好一个有限值。
- 类别标签和系列名称必须唯一。无效或不完整的图表块在规范化期间会被丢弃，而不是悄悄更改数据。
- 本机图表渲染可通过 `presentationCapabilities.charts` 选择加入。其他通道以固定格式的纯文本形式接收图表标题、轴、类别、系列和值。这也是可访问性的后备。

表格语义：

- `caption` 是必需的简短标题。`headers` 必须至少包含一个唯一的、非空的列标签。
- `rows` 必须至少包含一行。每一行必须恰好包含每个标题对应的一个单元格，且每个单元格必须是非空字符串或有限数字。
- `rowHeaderColumnIndex` 是可选的、从零开始的索引，用于标识其单元格应被原生渲染器作为行标题公开的列。
- 表格规范化是原子的。无效的标题、表头、行宽、单元格或行标题索引会直接丢弃表格块，而不是截断或修复其数据。
- 本机表格渲染是通过 `presentationCapabilities.tables` 选择加入的。其他通道接收标题和每一行作为固定格式的纯文本，内部空白折叠：

  ```text
  Open pipeline (table)
  - Account: Acme; Stage: Won; ARR: 125000
  - Account: Globex; Stage: Review; ARR: 82000
  ```

没有单独的 `report` 鉴别器。从 `title`、`tone`、`text`、`context`、`chart`、`table` 和操作块撰写报告。这使得每个块都可以独立渲染，并以固定格式为完整的报告提供相同的纯文本后备。

## <a id="producer-examples"></a> 生产者示例

简单卡片：

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        {
          "label": "Approve",
          "action": { "type": "callback", "value": "deploy:approve" },
          "style": "success"
        },
        {
          "label": "Decline",
          "action": { "type": "callback", "value": "deploy:decline" },
          "style": "danger"
        }
      ]
    }
  ]
}
```

URL-仅链接按钮：

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [
        {
          "label": "Open notes",
          "action": { "type": "url", "url": "https://example.com/release" }
        }
      ]
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
      "buttons": [
        {
          "label": "Launch",
          "action": { "type": "web-app", "url": "https://example.com/app" }
        }
      ]
    }
  ]
}
```

选择菜单：

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

图表：

```json
{
  "blocks": [
    {
      "type": "chart",
      "chartType": "line",
      "title": "Quarterly revenue",
      "categories": ["Q1", "Q2", "Q3"],
      "series": [
        { "name": "Product", "values": [120, 145, 138] },
        { "name": "Services", "values": [80, 95, 104] }
      ],
      "xLabel": "Quarter",
      "yLabel": "Revenue"
    }
  ]
}
```

表格报告：

```json
{
  "title": "Pipeline report",
  "tone": "info",
  "blocks": [
    { "type": "text", "text": "Current opportunities by stage." },
    {
      "type": "table",
      "caption": "Open pipeline",
      "headers": ["Account", "Stage", "ARR"],
      "rows": [
        ["Acme", "Won", 125000],
        ["Globex", "Review", 82000]
      ],
      "rowHeaderColumnIndex": 0
    },
    { "type": "context", "text": "Updated from the CRM snapshot." }
  ]
}
```

CLI 发送：

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
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

## <a id="renderer-contract"></a> 渲染器契约

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
    charts: false,
    tables: false,
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
  async pinDeliveredMessage({ target, messageId, pin, assertDirectAdapterHandoff }) {
    assertDirectAdapterHandoff?.();
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

当某个功能取决于每个帐户的配置或交付的文本漏斗时（例如，Telegram 仅在 `richMessages` 帐户上且仅在降价路径上呈现本机表），请在静态对象旁边声明可选的 `resolvePresentationCapabilities({ cfg, accountId, formatting })` 挂钩。核心每次交付都会解析一次功能，并且钩子优先于静态声明；将静态对象保留为与帐户无关的基线。

```ts
const adapter: ChannelOutboundAdapter = {
  presentationCapabilities: BASE_CAPABILITIES,
  resolvePresentationCapabilities: ({ cfg, accountId, formatting }) => ({
    ...BASE_CAPABILITIES,
    tables: isRichAccount(cfg, accountId) && formatting?.parseMode !== "HTML",
  }),
  // ...
};
```

能力布尔值描述渲染器可以创建哪些可交互元素。可选的 `limits` 描述了 Core 在调用渲染器之前可以适配的通用封装限制：

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  charts?: boolean;
  tables?: boolean;
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

## <a id="core-render-flow"></a> 核心渲染流程

在CLI使用的标准出站路径和标准消息操作上，核心：

1. 规范化展示载荷。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 在适配器通告操作计数、标签长度和选择选项计数等通用功能限制时应用这些限制。除非适配器分别显式通告 `charts: true` 或 `tables: true`，否则图表和表格块将变为固定格式的纯文本。
5. 当适配器可以呈现有效负载时调用 `renderPresentation`。其 `presentation` 针对本机限制进行了调整； `sourcePresentation` 保留规范化的原始内容以用于特定于通道的文本后备。
6. 当适配器缺失或无法渲染时，回退为保守文本。
7. 通过正常的频道投递路径发送最终载荷。
8. 在首条成功发送的消息之后，应用投递元数据，例如 `delivery.pin`。

直接使用 `ReplyPayload` 的通道本地回复或预览渠道必须进入该标准路径或实现相同的演示后备，然后才能将有效负载投影到普通 text/media.

Core 拥有后备行为，因此生产者可以保持与渠道无关。通道插件拥有本机渲染和交互处理。当渲染器因其完整的本机卡无法容纳而回退到文本时，请使用 `sourcePresentation` 保留完整标签并应用通道的文本和 URL 卫生。继续使用 `presentation` 作为本机控件。

## <a id="degradation-rules"></a> 降级规则

展示必须能够安全地发送到受限频道。

手动编写相同事实的纯文本呈现的生产者，可以在回复载荷中通过 `presentationTextMode: "fallback"` 标记该文本。原生渲染展示数据区块的频道会丢弃这段文本；当每个 `table` 和 `chart` 区块都发生降级且不再有交互区块时，系统会原样发送手动编写的文本，而不是使用下方的通用扁平化文本。

回退文本包括：

- `title` 作为第一行
- `text` 区块作为普通段落
- `context` 区块作为紧凑的上下文行
- `divider` 区块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择选项标签
- 图表标题、类型、坐标轴、类别、系列和值
- 表格标题、表头以及每一行的值

### <a id="button-value-fallback-visibility"></a> 按钮值回退可见性

当某个频道无法渲染交互控件时，按钮和值选择会回退为纯文本。此回退行为在保持可用性的同时，会保护不透明的回调数据私密：

- **`command`-typed actions** 渲染为 `` label: `command` ``，这样用户可以复制该命令，并在频道输入框中手动运行。
- **`callback`-typed actions** 和旧版 **`value`** 字段仅渲染标签。不透明的回调值不会暴露在回退文本中。
- **`approval`-键入的操作** 仅渲染标签。批准 ID 和决策是传输数据，不会通过通用标量帮助程序或后备文本公开。
- **`url` actions**、URL-支持**`web-app` actions**，并已弃用**`url` / `webApp` / `web_app`** 输入在按钮标签旁边呈现 URL 文本，因为 URL 是面向用户的。仅托管小部件操作在不启动本机小部件的情况下仅在通道上呈现标签。
- **选择选项**遵循相同的规则：键入的命令包括命令文本；不透明的回调操作和遗留值仍然仅是标签。

在回退 UI（e.g. Feishu 文档注释指令）中添加手动命令指导的通道适配器必须从回退渲染器使用的相同呈现块中派生命令存在检查，因此指导文本仅在实际显示手动命令时出现。

不支持的原生控件应当降级，而不是让整个发送失败。例如：

- 禁用内联按钮的 Telegram 会发送文本回退。
- 不支持选择控件的频道会将选择选项列为文本。
- 不支持原生图表的频道会将图表数据列为文本。
- 不支持原生表格的频道会将每一行表格内容列为文本。
- A URL-only 按钮成为本机链接按钮或后备 URL 行。
- 可选的置顶失败不会导致已投递消息失败。

主要例外是 `delivery.pin.required: true`；如果请求置顶为必需，而频道无法将已发送消息置顶，则投递会报告失败。

## <a id="provider-mapping"></a> 提供方映射

当前内置渲染器：

| 渠道         | 原生渲染目标                      | 笔记                                                                                                                                                                                                   |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器       | 支持记录的 Discord- 特定 `components` 扩展，用于 `presentation` 无法表达的本机布局。便携式共享发送应使用 `presentation`。                                 |
| Feishu          | 交互式卡片                         | 卡头使用`title`一次。在本机卡中，禁用或不受支持的按钮保留仅标签文本；拒绝的 URL 目标和不透明回调值被省略。                                |
| Matrix          | 文本后备加上结构化事件字段 | Buttons/selects 作为支持进行广告，但每个块都呈现为 `com.openclaw.presentation` 事件字段中携带的 `renderMessagePresentationFallbackText` 输出，而不是本机交互式小部件。 |
| Mattermost      | 文本加交互属性               | 不支持选择器和分隔符；这些块会降级为文本。                                                                                                                                   |
| Microsoft Teams | 自适应卡片                            | 当同时提供时，普通 `message` 文本会与卡片一起包含。不支持选择器、样式和禁用状态。                                                                           |
| Slack           | 块套件                                 | 将 `chart` 渲染为原生 `data_visualization`，将 `table` 渲染为原生 `data_table`；保留旧版 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。                         |
| Telegram        | 文本加内联键盘                | Buttons/selects 需要目标表面具有内联按钮功能；否则使用文本后备。                                                                                               |
| 普通通道  | 文本回退                             | 没有渲染器的通道仍会获得可读输出。                                                                                                                                                  |

仅为现有回复生成者保留提供者本机有效负载兼容性。新的本机字段需要上面的显式异常审查。

## <a id="presentation-vs-interactivereply"></a> 演示与 InteractiveReply

`InteractiveReply` 是较早的内部子集，由审批和交互辅助工具使用。它支持：

- 文本
- 按钮
- 选择器

`MessagePresentation` 是共享发送合约。它补充道：

- 标题
- 语调
- 上下文
- 分隔线
- 图表
- 表格
- URL-仅按钮
- 通过 `ReplyPayload.delivery` 提供的通用发送元数据

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
  renderMessagePresentationChartFallbackText,
  renderMessagePresentationFallbackText,
  renderMessagePresentationTableFallbackText,
  resolveMessagePresentationActionValue,
  resolveMessagePresentationButtonAction,
  resolveMessagePresentationControlValue,
  resolveMessagePresentationOptionAction,
} from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接收或生成 `MessagePresentation`。现有的 `interactive` 载荷是 `presentation` 的已弃用子集；运行时仍会为旧生产者保留支持。

值得了解的非弃用辅助函数：

- `normalizeMessagePresentation(raw)` / `hasMessagePresentationBlocks(value)` 验证非类型化负载（例如，来自 CLI `--presentation` 标志的 JSON）并将其强制转换为 `MessagePresentation`。
- `isMessagePresentationInteractiveBlock(block)` 将一个块缩窄为 `buttons` | `select` 联合类型。
- `resolveMessagePresentationButtonAction(button)` 和 `resolveMessagePresentationOptionAction(option)` 返回规范化的类型化操作，同时接受已弃用的边界字段。显式的 `action` 总是获胜。
- `resolveMessagePresentationActionValue(action)` / `resolveMessagePresentationControlValue(control)` 仅读取 command/callback 标量值。非标量规范化操作永远不会落入旧版影子 `value`，因此批准 ID 和链接目标保持键入状态。
- `renderMessagePresentationChartFallbackText(block)` / `renderMessagePresentationTableFallbackText(block)` 将一个结构化数据块以固定格式呈现为纯文本，用于特定于通道的回退路径。

旧版 `InteractiveReply*` 类型和转换助手在 SDK 中标记为 `@deprecated`。兼容性注册表将它们记录为 `message-presentation-legacy-bridges`，于 2026 年 7 月 25 日弃用，`removeAfter` 日期为 2026 年 10 月 1 日：

- `InteractiveReply`、`InteractiveReplyBlock`、`InteractiveReplyButton` 和 `InteractiveReplyOption`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` 和 `presentationToInteractiveControlsReply(...)` 仍然可用作旧通道实现的渲染器桥。新的生产者代码不应该调用它们；发送 `presentation` 并让 core/channel 适配处理渲染。

审批辅助工具也有以 presentation 为优先的替代方案：

- 使用 `buildApprovalPresentation(...)` 代替 `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替 `buildExecApprovalInteractiveReply(...)`

这些已发布的构建器仍保持以命令为基础，以兼容插件。拥有持久化审批类型的 Gateway 和捆绑频道代码应使用 `buildTypedApprovalPresentation(...)`、 `buildTypedExecApprovalPendingReplyPayload(...)` 或 `buildTypedPluginApprovalPendingReplyPayload(...)`，以便传输层接收到显式的 `approval` action，而不是从 `/approve` 文本推断语义。

`renderMessagePresentationFallbackText(...)` 会为没有文本回退内容的 presentation 块返回空字符串，例如仅包含分隔线的 presentation。要求发送正文非空的传输层可以传入 `emptyFallback`，在不改变默认回退契约的情况下启用一个最小正文。

## <a id="delivery-pin"></a> 投递置顶

置顶属于投递行为，而不是展示。请使用 `delivery.pin`，而不是诸如 `channelData.telegram.pin` 之类的提供方原生字段。

语义：

- `pin: true` 会置顶第一条成功投递的消息。
- `pin.notify` 默认值为 `false`。
- `pin.required` 默认值为 `false`。
- 可选置顶失败会降级处理，并保留已发送消息。
- Required 引脚故障报告部分传送失败，同时保留已接受的消息及其收据。
- 分块消息会置顶第一块成功投递的内容，而不是尾块。

手动的 `pin`、`unpin` 和 `pins` 消息动作仍然存在，供支持这些操作的提供方在现有消息上使用。

`pinDeliveredMessage` 上下文包括可选的 `assertDirectAdapterHandoff` 回调。成功的发送不会使其所有者无限期地保持活动状态：所有者可以在适配器准备或等待固定该消息时关闭。核心在进入 pin hook 之前检查断言，适配器必须通过准备、速率限制队列和重试来保留它，并在每个提供程序请求之前立即同步检查它。如果本机引脚助手执行这些等待，也将断言转发到其现有的请求防护中。

即使授权在等待其响应期间关闭，也让提交的 pin 请求得到解决。不要丢弃已接受的 PIN 码或重复发送消息。这个可选的上下文字段保留不提供断言的旧调用者；它不添加任何配置或 pin 权限，并且不得序列化为有效负载。

## <a id="plugin-author-checklist"></a> 插件作者检查清单

- 当通道可以渲染或安全降级语义表示时，从 `describeMessageTool(...)` 声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中实现。
- 使本机 UI 库远离热 setup/catalog 路径。
- 当已知时，在 `presentationCapabilities.limits` 上声明通用能力限制。
- 在渲染器和测试中保留最终的平台限制。
- 为不支持的图表、表格、按钮、选择、URL 按钮、title/text 复制以及混合 `message` 加 `presentation` 发送添加回退测试。
- 仅当提供商可以固定发送的消息 ID 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加发送固定支持。
- 如果没有上面的显式异常检查，请勿通过共享消息操作架构公开提供者本机 card/block/component/button 字段。

## <a id="related-docs"></a> 相关文档

- [消息 CLI](/cli/message)
- [插件 SDK Overview](/plugins/sdk-overview)
- [插件 Architecture](/plugins/architecture-internals#message-tool-schemas)
