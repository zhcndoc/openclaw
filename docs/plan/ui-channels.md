---
summary: 将语义化消息展示与渠道原生 UI 渲染器解耦。
title: 渠道展示重构计划
read_when:
  - 重构渠道消息 UI、交互负载或原生渠道渲染器
  - 更改消息工具能力、投递提示或跨上下文标记
  - 排查 Discord Carbon 导入扇出或渠道插件运行时惰性加载问题
---

## 状态

已在共享 agent、CLI、插件能力和出站投递表面完成实现：

- `ReplyPayload.presentation` 承载语义化消息 UI。
- `ReplyPayload.delivery.pin` 承载已发送消息的置顶请求。
- 共享消息操作暴露 `presentation`、`delivery` 和 `pin`，而不是 provider 原生的 `components`、`blocks`、`buttons` 或 `card`。
- Core 会通过插件声明的出站能力来渲染或自动降级 `presentation`。
- Discord、Slack、Telegram、Mattermost、MS Teams 和飞书渲染器会消费通用契约。
- Discord 渠道控制面代码不再导入基于 Carbon 的 UI 容器。

规范文档现已迁移到 [Message Presentation](/plugins/message-presentation)。
请将此计划作为历史实现上下文保留；当契约、渲染器或回退行为发生变化时，请更新规范指南。

## 问题

当前渠道 UI 分散在多个不兼容的表面上：

- Core 通过 `buildCrossContextComponents` 持有一个 Discord 形态的跨上下文渲染器钩子。
- Discord 的 `channel.ts` 可以通过 `DiscordUiContainer` 导入原生 Carbon UI，这会把运行时 UI 依赖拉入渠道插件控制面。
- agent 和 CLI 暴露了原生负载逃逸口，例如 Discord 的 `components`、Slack 的 `blocks`、Telegram 或 Mattermost 的 `buttons`，以及 Teams 或飞书的 `card`。
- `ReplyPayload.channelData` 同时承载传输提示和原生 UI 容器。
- 通用的 `interactive` 模型虽然存在，但它比 Discord、Slack、Teams、飞书、LINE、Telegram 和 Mattermost 已经使用的更丰富布局要窄。

这使得 core 需要了解原生 UI 形状，削弱了插件运行时惰性加载，并让 agent 拥有过多 provider 特定方式来表达同一种消息意图。

## 目标

- Core 根据声明的能力为消息决定最佳语义化展示。
- 扩展声明能力，并将语义化展示渲染为原生传输负载。
- Web 控制 UI 与聊天原生 UI 保持分离。
- 原生渠道负载不通过共享 agent 或 CLI 消息表面暴露。
- 不支持的展示特性会自动降级为最佳文本表示。
- 置顶已发送消息之类的投递行为属于通用投递元数据，而不是展示内容。

## 非目标

- 不为 `buildCrossContextComponents` 提供向后兼容 shim。
- 不为 `components`、`blocks`、`buttons` 或 `card` 提供公开的原生逃逸口。
- 不在 core 中导入渠道原生 UI 库。
- 不为打包渠道提供 provider 特定的 SDK 断点。

## 目标模型

为 `ReplyPayload` 增加由 core 管理的 `presentation` 字段。

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
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
```

迁移期间，`interactive` 会成为 `presentation` 的一个子集：

- `interactive` 文本块映射到 `presentation.blocks[].type = "text"`。
- `interactive` 按钮块映射到 `presentation.blocks[].type = "buttons"`。
- `interactive` 选择块映射到 `presentation.blocks[].type = "select"`。

外部 agent 和 CLI schema 现在使用 `presentation`；`interactive` 仍然是现有回复生成者使用的内部遗留解析/渲染辅助工具。公开的生产方 API 将 `interactive` 视为已弃用。运行时支持仍然保留，以便现有审批辅助工具和旧插件在新代码输出 `presentation` 的同时继续工作。

## 投递元数据

为与 UI 无关的发送行为增加由 core 管理的 `delivery` 字段。

```ts
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

语义：

- `delivery.pin = true` 表示将首个成功投递的消息置顶。
- `notify` 默认为 `false`。
- `required` 默认为 `false`；不支持的渠道或置顶失败会自动降级为继续投递。
- 现有消息仍保留手动 `pin`、`unpin` 和 `list-pins` 操作。

当前 Telegram ACP topic 绑定应从 `channelData.telegram.pin = true` 迁移到 `delivery.pin = true`。

## 运行时能力契约

将展示和投递渲染钩子添加到运行时出站适配器，而不是控制面渠道插件中。

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: {
    payload: ReplyPayload;
    presentation: MessagePresentation;
    ctx: ChannelOutboundSendContext;
  }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: {
    cfg: OpenClawConfig;
    accountId?: string | null;
    to: string;
    threadId?: string | number | null;
    messageId: string;
    notify: boolean;
  }) => Promise<void>;
};
```

Core 行为：

- 解析目标渠道和运行时适配器。
- 请求展示能力。
- 在渲染前降级不支持的块并应用通用能力限制。
- 调用 `renderPresentation`。
- 如果不存在渲染器，则将展示内容转换为文本回退。
- 在成功发送后，当请求了 `delivery.pin` 且受支持时，调用 `pinDeliveredMessage`。

## 渠道映射

Discord：

- 在仅运行时模块中将 `presentation` 渲染为 components v2 和 Carbon 容器。
- 将 accent color 辅助函数保留在轻量模块中。
- 从渠道插件控制面代码中移除 `DiscordUiContainer` 导入。

Slack：

- 将 `presentation` 渲染为 Block Kit。
- 移除 agent 和 CLI 的 `blocks` 输入。

Telegram：

- 将文本、上下文和分隔符渲染为文本。
- 在已配置且目标表面允许的情况下，将操作和选择渲染为内联键盘。
- 当内联按钮被禁用时使用文本回退。
- 将 ACP topic 置顶迁移到 `delivery.pin`。

Mattermost：

- 在已配置时将操作渲染为交互按钮。
- 将其他块渲染为文本回退。

MS Teams：

- 将 `presentation` 渲染为 Adaptive Cards。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 Graph 对目标会话的支持可靠，可选实现 `pinDeliveredMessage`。

飞书：

- 将 `presentation` 渲染为交互卡片。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 API 行为可靠，可选实现用于已发送消息置顶的 `pinDeliveredMessage`。

LINE：

- 在可能的情况下将 `presentation` 渲染为 Flex 或模板消息。
- 对不支持的块回退为文本。
- 从 `channelData` 中移除 LINE UI 负载。

纯文本或受限渠道：

- 使用保守格式将 `presentation` 转换为文本。

## 重构步骤

1. 重新应用 Discord 发布修复：将 `ui-colors.ts` 与基于 Carbon 的 UI 分离，并从 `extensions/discord/src/channel.ts` 中移除 `DiscordUiContainer`。
2. 将 `presentation` 和 `delivery` 添加到 `ReplyPayload`、出站负载规范化、投递摘要和钩子负载中。
3. 在狭窄的 SDK/runtime 子路径中添加 `MessagePresentation` schema 和解析辅助工具。
4. 用语义化展示能力替换消息能力中的 `buttons`、`cards`、`components` 和 `blocks`。
5. 为展示渲染和投递置顶添加运行时出站适配器钩子。
6. 用 `buildCrossContextPresentation` 替换跨上下文组件构造。
7. 删除 `src/infra/outbound/channel-adapters.ts`，并从渠道插件类型中移除 `buildCrossContextComponents`。
8. 将 `maybeApplyCrossContextMarker` 改为附加 `presentation`，而不是原生参数。
9. 更新插件分发发送路径，使其仅消费语义化展示和投递元数据。
10. 移除 agent 和 CLI 的原生负载参数：`components`、`blocks`、`buttons` 和 `card`。
11. 删除用于创建原生消息工具 schema 的 SDK 辅助工具，改为使用展示 schema 辅助工具。
12. 从 `channelData` 中移除 UI/原生容器；在每个剩余字段完成审查前，仅保留传输元数据。
13. 迁移 Discord、Slack、Telegram、Mattermost、MS Teams、飞书和 LINE 的渲染器。
14. 为消息 CLI、渠道页面、插件 SDK 和能力 cookbook 更新文档。
15. 对 Discord 和受影响的渠道入口点运行导入扇出分析。

步骤 1-11 和 13-14 已在本次重构中针对共享 agent、CLI、插件能力和出站适配器契约完成。步骤 12 仍是更深入的内部清理阶段，用于处理 provider 私有的 `channelData` 传输容器。步骤 15 仍是后续验证项，前提是我们希望获得超出类型/测试门控之外的量化导入扇出数据。

## 测试

新增或更新：

- 展示规范化测试。
- 针对不支持块的展示自动降级测试。
- 插件分发和 core 投递路径的跨上下文标记测试。
- Discord、Slack、Telegram、Mattermost、MS Teams、飞书、LINE 和文本回退的渠道渲染矩阵测试。
- 证明原生字段已移除的消息工具 schema 测试。
- 证明原生标志已移除的 CLI 测试。
- 覆盖 Carbon 的 Discord 入口点导入惰性回归测试。
- 覆盖 Telegram 和通用回退的投递置顶测试。

## 未决问题

- `delivery.pin` 是否应在第一阶段就为 Discord、Slack、MS Teams 和飞书实现，还是先只做 Telegram？
- `delivery` 未来是否应吸收现有字段，例如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`，还是保持专注于发送后的行为？
- 展示是否应直接支持图片或文件引用，还是媒体暂时应与 UI 布局分离？

## 相关内容

- [频道概览](/channels)
- [消息展示](/plugins/message-presentation)
