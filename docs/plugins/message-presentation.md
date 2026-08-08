---
summary: "用于频道插件的语义消息卡片、图表、表格、控件、回退文本和交付提示"
title: "消息展示"
read_when:
  - 添加或修改消息卡片、图表、表格、按钮或选择器渲染
  - 构建支持富出站消息的频道插件
  - 更改消息工具展示或交付能力
  - 调试特定提供方的卡片/块/组件渲染回归
---

消息展示是 OpenClaw 面向富出站聊天 UI 的共享契约。
它允许代理、CLI 命令、审批流和插件只描述一次消息意图，而由各个频道插件尽可能渲染为最佳的原生形态。

将展示用于可移植的消息 UI：文本区块、小的上下文/页脚文本、分隔线、图表、表格、按钮、选择菜单，以及卡片标题/语气。

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
  /** 旧版回调值。新控件优先使用 action。 */
  value?: string;
  /** @deprecated 使用 type 为 "url" 的 action。 */
  url?: string;
  /** @deprecated 使用 type 为 "web-app" 的 action。 */
  webApp?: { url: string };
  /** @deprecated 使用 type 为 "web-app" 的 action。 */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: Extract<MessagePresentationAction, { type: "command" | "callback" }>;
  /** 旧版选中应用值。新控件优先使用 action。 */
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
- `action.type: "question"` 标识一个面向实时运行时编写的 `ask_user` 问题的选项。与 `approval` 一样，这是一个 OpenClaw 运行时动作；代理和插件不得自行生成问题 ID。Telegram、Discord 和 Slack 会将其映射为传输层私有的原生回调，并通过 Gateway 解析选项。当问题变为已回答、已过期或已取消时，这些频道会编辑已发送的消息、移除其动作，并追加最终状态。WhatsApp、Signal 和 iMessage 会将最多四个单选选项渲染为 `1️⃣` 至 `4️⃣` 的反应。其他问题形状会降级为标签文本，用户可以用纯文本回复。
- `action.type: "url"` 打开普通链接。
- `action.type: "web-app"` 启动频道原生 Web 应用。对于基于 URL 的应用，设置 `url`；对于由 OpenClaw 托管、启动机制由频道负责的 widget，设置 `widgetId`；两者至少需要一个。当两者同时存在时，频道可以优先使用其原生的托管 widget 启动方式，并在该机制不可用时使用 URL。
- `value` 是旧版不透明回调值。新控件应使用 `action`，这样频道插件就能映射命令和回调，而无需根据文本猜测。
- `url`、`webApp` 和 `web_app` 仍作为已弃用的边界输入接受。规范化器会保留这些字段，以便渲染器区分已发布的旧版语义和显式类型化动作。新的生产者应使用 `action`。
- `label` 是必需的，也会用于文本回退。
- `style` 仅供参考。渲染器应将不支持的样式映射为安全的默认值，而不是使发送失败。
- `priority` 是可选的。当频道声明了动作数量限制且必须丢弃控件时，核心会优先保留优先级较高的按钮，并在优先级相同的按钮之间保持原始顺序。当所有控件都能容纳时，则保持编写时的顺序。
- `disabled` 是可选的。频道必须通过 `supportsDisabled` 显式选择支持；否则核心会将禁用控件降级为不可交互的回退文本。禁用按钮在回退文本中始终只渲染标签，即使它携带了 `command` 动作。
- `reusable` 是可选的。支持可复用原生回调的频道可以在交互成功后继续保留该动作。可将其用于刷新、检查或查看更多详情等可重复或幂等的动作；普通的一次性审批和破坏性操作应保持未设置。

选择器语义：

- `options[].action` 仅接受 `command` 或 `callback`；审批和链接动作仅适用于按钮。
- `options[].value` 是旧版选中的应用值。
- `placeholder` 仅作为建议，可能会被不支持原生选择器的频道忽略。
- 如果频道不支持选择器，回退文本会列出标签。

图表语义：

- `pie` 要求分段值为正数。
- `bar`、`area` 和 `line` 使用一个有序的 `categories` 数组。每个系列都必须按相同顺序为每个类别提供恰好一个有限值。
- 类别标签和系列名称必须唯一。无效或不完整的图表块在规范化期间会被丢弃，而不是悄悄更改数据。
- 原生图表渲染通过 `presentationCapabilities.charts` 进行可选启用。其他频道会以确定性文本接收图表标题、坐标轴、类别、系列和值。这也是可访问性回退。

表格语义：

- `caption` 是必需的简短标题。`headers` 必须至少包含一个唯一的、非空的列标签。
- `rows` 必须至少包含一行。每一行必须恰好包含每个标题对应的一个单元格，且每个单元格必须是非空字符串或有限数字。
- `rowHeaderColumnIndex` 是可选的、从零开始的索引，用于标识其单元格应被原生渲染器作为行标题公开的列。
- 表格规范化是原子的。无效的标题、表头、行宽、单元格或行标题索引会直接丢弃表格块，而不是截断或修复其数据。
- 原生表格渲染通过 `presentationCapabilities.tables` 进行可选启用。其他频道会以确定性线性文本接收标题和每一行，并折叠内部空白：

  ```text
  Open pipeline (table)
  - Account: Acme; Stage: Won; ARR: 125000
  - Account: Globex; Stage: Review; ARR: 82000
  ```

不存在单独的 `report` discriminator。使用 `title`、`tone`、`text`、`context`、`chart`、`table` 和动作块来组合报告。这样可以让每个块都能独立渲染，并让完整报告拥有同样确定性的文本回退。

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
        {
          "label": "批准",
          "action": { "type": "callback", "value": "deploy:approve" },
          "style": "success"
        },
        {
          "label": "拒绝",
          "action": { "type": "callback", "value": "deploy:decline" },
          "style": "danger"
        }
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
      "buttons": [
        {
          "label": "打开说明",
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
          "label": "启动",
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

图表：

```json
{
  "blocks": [
    {
      "type": "chart",
      "chartType": "line",
      "title": "季度收入",
      "categories": ["Q1", "Q2", "Q3"],
      "series": [
        { "name": "产品", "values": [120, 145, 138] },
        { "name": "服务", "values": [80, 95, 104] }
      ],
      "xLabel": "季度",
      "yLabel": "收入"
    }
  ]
}
```

表格报告：

```json
{
  "title": "管道报告",
  "tone": "info",
  "blocks": [
    { "type": "text", "text": "按阶段划分的当前商机。" },
    {
      "type": "table",
      "caption": "开放管道",
      "headers": ["账户", "阶段", "ARR"],
      "rows": [
        ["Acme", "已赢单", 125000],
        ["Globex", "审核中", 82000]
      ],
      "rowHeaderColumnIndex": 0
    },
    { "type": "context", "text": "已从 CRM 快照更新。" }
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
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

当某项能力取决于每个账户的配置或投递的文本处理流程时——例如，Telegram
仅会在启用 `richMessages` 的账户上，并且仅在 Markdown 路径中渲染原生表格——请在静态对象旁声明可选的
`resolvePresentationCapabilities({ cfg, accountId, formatting })` 钩子。Core 会在每次投递时解析一次能力，并且该钩子的优先级高于静态声明；请将静态对象保留为与账户无关的基线。

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

能力布尔值描述渲染器可以创建哪些可交互元素。可选的
`limits` 描述了 Core 在调用渲染器之前可以适配的通用封装限制：

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

## 核心渲染流程

在 CLI 和标准消息操作使用的规范出站路径中，核心：

1. 规范化展示载荷。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器声明支持时，应用通用能力限制，例如操作数量、标签长度以及选择项数量。图表和表格块会变为确定性的文本，除非适配器明确声明分别支持 `charts: true` 或 `tables: true`。
5. 当适配器能够渲染载荷时，调用 `renderPresentation`。
6. 当适配器缺失或无法渲染时，回退为保守文本。
7. 通过正常的频道投递路径发送最终载荷。
8. 在首条成功发送的消息之后，应用投递元数据，例如 `delivery.pin`。

直接消费 `ReplyPayload` 的频道本地回复或预览流程，必须要么进入该规范路径，要么在将载荷下探为纯文本/媒体之前，先生成相同的展示回退。

核心负责回退行为，因此生产者可以保持与频道无关。频道插件负责原生渲染和交互处理。

## 降级规则

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

### 按钮值回退可见性

当某个频道无法渲染交互控件时，按钮和值选择会回退为纯文本。此回退行为在保持可用性的同时，会保护不透明的回调数据私密：

- **`command`-typed actions** 渲染为 `` label: `command` ``，这样用户可以复制该命令，并在频道输入框中手动运行。
- **`callback`-typed actions** 和旧版 **`value`** 字段仅渲染标签。不透明的回调值不会暴露在回退文本中。
- **`approval`-typed actions** 仅渲染标签。审批 ID 和决策属于传输数据，不会通过通用标量辅助函数或回退文本暴露。
- **`url` actions**、基于 URL 的 **`web-app` actions**，以及已弃用的 **`url` / `webApp` / `web_app`** 输入，会在按钮标签旁渲染 URL 文本，因为 URL 是面向用户的内容。仅支持托管小组件的操作，在不具备原生小组件启动能力的频道中仅渲染标签。
- **选择选项**仅渲染标签。底层选项值不会暴露在回退文本中。

在回退 UI 中添加手动命令指引的频道适配器（例如飞书文档评论说明）必须从与回退渲染器相同的展示区块中派生命令存在性检查，因此只有在实际显示手动命令时，指引文本才会出现。

不支持的原生控件应当降级，而不是让整个发送失败。例如：

- 禁用内联按钮的 Telegram 会发送文本回退。
- 不支持选择控件的频道会将选择选项列为文本。
- 不支持原生图表的频道会将图表数据列为文本。
- 不支持原生表格的频道会将每一行表格内容列为文本。
- 仅支持 URL 的按钮会变为原生链接按钮或回退 URL 行。
- 可选的置顶失败不会导致已投递消息失败。

主要例外是 `delivery.pin.required: true`；如果请求置顶为必需，而频道无法将已发送消息置顶，则投递会报告失败。

## 提供方映射

当前内置渲染器：

| 通道            | 原生渲染目标                               | 说明                                                                                                                                                                                                             |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器                              | 为现有的提供方原生载荷生产者保留旧版 `channelData.discord.components`，但新的共享发送应使用 `presentation`。                                                                                                      |
| Feishu          | 交互式卡片                                  | 卡片头部可以使用 `title`；正文避免重复该标题。                                                                                                                                                                   |
| Matrix          | 文本回退加结构化事件字段                    | 按钮/选择器被标记为受支持，但当前每个块都会渲染为 `renderMessagePresentationFallbackText` 的输出，并携带在 `com.openclaw.presentation` 事件字段中，而不是原生交互式小部件。                                      |
| Mattermost      | 文本加交互属性                               | 不支持选择器和分隔符；这些块会降级为文本。                                                                                                                                                                        |
| Microsoft Teams | 自适应卡片                                  | 当同时提供时，普通 `message` 文本会与卡片一起包含。不支持选择器、样式和禁用状态。                                                                                                                                |
| Slack           | Block Kit                                  | 将 `chart` 渲染为原生 `data_visualization`，将 `table` 渲染为原生 `data_table`；保留旧版 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。                                                         |
| Telegram        | 文本加内联键盘                              | 按钮/选择器需要目标界面具备内联按钮能力；否则使用文本回退。                                                                                                                                                       |
| 普通通道        | 文本回退                                    | 没有渲染器的通道仍会获得可读输出。                                                                                                                                                                                |

提供方原生载荷兼容性是为现有回复生产者提供的过渡性便利。它不是新增共享原生字段的理由。

## 展示 vs 交互回复

`InteractiveReply` 是较早的内部子集，由审批和交互辅助工具使用。它支持：

- 文本
- 按钮
- 选择器

`MessagePresentation` 是规范的共享发送契约。它新增了：

- 标题
- 语调
- 上下文
- 分隔线
- 图表
- 表格
- 仅包含 URL 的按钮
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

新代码应直接接收或生成 `MessagePresentation`。现有的
`interactive` 载荷是 `presentation` 的已弃用子集；运行时
仍会为旧生产者保留支持。

值得了解的非弃用辅助函数：

- `normalizeMessagePresentation(raw)` / `hasMessagePresentationBlocks(value)`
  将未类型化载荷（例如来自 CLI
  `--presentation` 标志的 JSON）验证并转换为 `MessagePresentation`。
- `isMessagePresentationInteractiveBlock(block)` 将一个块缩窄为
  `buttons` | `select` 联合类型。
- `resolveMessagePresentationButtonAction(button)` 和
  `resolveMessagePresentationOptionAction(option)` 在接受已弃用边界字段的同时，返回规范的强类型
  action。显式的 `action`
  始终优先。
- `resolveMessagePresentationActionValue(action)` /
  `resolveMessagePresentationControlValue(control)` 仅读取命令/回调
  标量值。非标量的规范 action 不会回退到旧版隐藏的 `value`，因此审批 ID 和链接目标会保持类型安全。
- `renderMessagePresentationChartFallbackText(block)` /
  `renderMessagePresentationTableFallbackText(block)` 将一个结构化
  数据块渲染为确定性的文本，用于特定频道的回退路径。

SDK 中的旧版 `InteractiveReply*` 类型和转换辅助函数已标记为
`@deprecated`：

- `InteractiveReply`、`InteractiveReplyBlock`、`InteractiveReplyButton` 和
  `InteractiveReplyOption`
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

- 使用 `buildApprovalPresentation(...)` 代替
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替
  `buildExecApprovalInteractiveReply(...)`

这些已发布的构建器仍保持以命令为基础，以兼容插件。拥有持久化审批类型的 Gateway
和捆绑频道代码应使用
`buildTypedApprovalPresentation(...)`、
`buildTypedExecApprovalPendingReplyPayload(...)` 或
`buildTypedPluginApprovalPendingReplyPayload(...)`，以便传输层接收到显式的
`approval` action，而不是从 `/approve` 文本推断语义。

`renderMessagePresentationFallbackText(...)` 会为
没有文本回退内容的 presentation 块返回空字符串，例如仅包含分隔线的 presentation。要求发送正文非空的传输层可以传入
`emptyFallback`，在不改变默认回退
契约的情况下启用一个最小正文。

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

- 当通道可以渲染或安全降级语义呈现时，从 `describeMessageTool(...)` 声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中实现。
- 避免在高频设置/目录路径中引入原生 UI 库。
- 当已知时，在 `presentationCapabilities.limits` 上声明通用能力限制。
- 在渲染器和测试中保留最终的平台限制。
- 为不支持的图表、表格、按钮、选择器、URL 按钮、标题/文本重复，以及混合 `message` 和 `presentation` 发送添加回退测试。
- 仅当提供方可以固定已发送消息 ID 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加发送固定支持。
- 不要通过共享消息操作 schema 暴露新的 provider 原生 card/block/component/button 字段。

## 相关文档

- [消息 CLI](/cli/message)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件架构](/plugins/architecture-internals#message-tool-schemas)
- [通道呈现重构计划](/plan/ui-channels)
