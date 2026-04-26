---
summary: 将语义化消息展示与渠道原生 UI 渲染器解耦。
title: 渠道展示重构计划
read_when:
  - 重构渠道消息 UI、交互负载或原生渠道渲染器
  - 更改消息工具能力、交付提示或跨上下文标记
  - 调试 Discord Carbon 导入扇出或渠道插件运行时懒加载
---

## 状态

已为共享 agent、CLI、插件能力和出站交付表面实现：

- `ReplyPayload.presentation` 承载语义化消息 UI。
- `ReplyPayload.delivery.pin` 承载已发送消息的 pin 请求。
- 共享消息操作暴露 `presentation`、`delivery` 和 `pin`，而不是 provider 原生的 `components`、`blocks`、`buttons` 或 `card`。
- 核心通过插件声明的出站能力来渲染或自动降级 presentation。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器消费通用契约。
- Discord 渠道控制平面代码不再导入基于 Carbon 的 UI 容器。

规范文档现已迁移到 [消息展示](/plugins/message-presentation)。
请将本计划保留为历史实现上下文；如需更改契约、渲染器或回退行为，请更新规范指南。

## 问题

渠道 UI 目前分散在多个不兼容的表面上：

- 核心通过 `buildCrossContextComponents` 持有一个 Discord 形状的跨上下文渲染器钩子。
- Discord 的 `channel.ts` 可以导入原生 Carbon UI，通过 `DiscordUiContainer` 将运行时 UI 依赖拉入渠道插件控制平面。
- agent 和 CLI 暴露原生负载逃逸口，例如 Discord 的 `components`、Slack 的 `blocks`、Telegram 或 Mattermost 的 `buttons`，以及 Teams 或 Feishu 的 `card`。
- `ReplyPayload.channelData` 同时承载传输提示和原生 UI 封装。
- 通用的 `interactive` 模型虽然存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已经使用的更丰富布局更窄。

这使得核心需要了解原生 UI 形状，削弱了插件运行时的懒加载，也让 agent 拥有了太多 provider 特定方式来表达同一种消息意图。

## 目标

- 核心根据声明的能力为消息决定最佳语义化展示。
- 扩展声明能力，并将语义化展示渲染为原生传输负载。
- Web 控制 UI 与聊天原生 UI 保持分离。
- 原生渠道负载不通过共享 agent 或 CLI 消息表面暴露。
- 不支持的展示特性会自动降级为最佳文本表示。
- 如将已发送消息 pin 住之类的交付行为，属于通用交付元数据，而非展示。

## 非目标

- 不为 `buildCrossContextComponents` 提供向后兼容兼容层。
- 不提供 `components`、`blocks`、`buttons` 或 `card` 的公开原生逃逸口。
- 不让核心导入渠道原生 UI 库。
- 不为打包渠道提供 provider 特定的 SDK 接缝。

## 目标模型

为 `ReplyPayload` 添加一个由核心拥有的 `presentation` 字段。

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

在迁移期间，`interactive` 会成为 `presentation` 的一个子集：

- `interactive` 的文本块映射到 `presentation.blocks[].type = "text"`。
- `interactive` 的按钮块映射到 `presentation.blocks[].type = "buttons"`。
- `interactive` 的 select 块映射到 `presentation.blocks[].type = "select"`。

外部 agent 和 CLI schema 现在使用 `presentation`；`interactive` 仍然作为内部遗留解析/渲染辅助，用于现有回复生成者。

## 交付元数据

添加一个由核心拥有的 `delivery` 字段，用于不属于 UI 的发送行为。

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

- `delivery.pin = true` 表示将首次成功送达的消息 pin 住。
- `notify` 默认为 `false`。
- `required` 默认为 `false`；不支持的渠道或 pin 失败时，会通过继续交付来自动降级。
- 针对现有消息的手动 `pin`、`unpin` 和 `list-pins` 消息操作保持不变。

当前 Telegram ACP topic 绑定应从 `channelData.telegram.pin = true` 迁移到 `delivery.pin = true`。

## 运行时能力契约

将 presentation 和 delivery 的渲染钩子添加到运行时出站适配器中，而不是控制平面的渠道插件中。

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

核心行为：

- 解析目标渠道和运行时适配器。
- 请求 presentation 能力。
- 在渲染前降级不支持的块。
- 调用 `renderPresentation`。
- 如果不存在渲染器，则将 presentation 转换为文本回退。
- 成功发送后，当请求了 `delivery.pin` 且该能力受支持时，调用 `pinDeliveredMessage`。

## 渠道映射

Discord：

- 在仅运行时模块中将 `presentation` 渲染为 components v2 和 Carbon 容器。
- 将 accent color 辅助函数保留在轻量模块中。
- 从渠道插件控制平面代码中移除 `DiscordUiContainer` 导入。

Slack：

- 将 `presentation` 渲染为 Block Kit。
- 移除 agent 和 CLI 的 `blocks` 输入。

Telegram：

- 将文本、context 和 divider 渲染为文本。
- 在为目标表面配置并允许时，将操作和 select 渲染为 inline keyboard。
- 当禁用 inline 按钮时使用文本回退。
- 将 ACP topic pinning 迁移到 `delivery.pin`。

Mattermost：

- 在配置允许时将操作渲染为交互按钮。
- 将其他块渲染为文本回退。

MS Teams：

- 将 `presentation` 渲染为 Adaptive Cards。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 Graph 对目标会话的支持可靠，可以选择性实现 `pinDeliveredMessage`。

Feishu：

- 将 `presentation` 渲染为交互卡片。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 API 行为可靠，可以选择性实现用于已发送消息 pin 的 `pinDeliveredMessage`。

LINE：

- 在可能的情况下将 `presentation` 渲染为 Flex 或模板消息。
- 对不支持的块回退为文本。
- 从 `channelData` 中移除 LINE UI 负载。

普通或受限渠道：

- 使用保守格式将 presentation 转换为文本。

## 重构步骤

1. 重新应用 Discord 发布修复：将 `ui-colors.ts` 与基于 Carbon 的 UI 分离，并从 `extensions/discord/src/channel.ts` 中移除 `DiscordUiContainer`。
2. 将 `presentation` 和 `delivery` 添加到 `ReplyPayload`、出站负载规范化、交付摘要和钩子负载中。
3. 在狭窄的 SDK/运行时子路径中添加 `MessagePresentation` schema 和解析辅助函数。
4. 用语义化 presentation 能力替换消息能力中的 `buttons`、`cards`、`components` 和 `blocks`。
5. 为 presentation 渲染和交付 pin 添加运行时出站适配器钩子。
6. 将跨上下文组件构建替换为 `buildCrossContextPresentation`。
7. 删除 `src/infra/outbound/channel-adapters.ts`，并从渠道插件类型中移除 `buildCrossContextComponents`。
8. 将 `maybeApplyCrossContextMarker` 改为附加 `presentation`，而不是原生参数。
9. 更新插件分发发送路径，使其只消费语义化 presentation 和 delivery 元数据。
10. 移除 agent 和 CLI 的原生负载参数：`components`、`blocks`、`buttons` 和 `card`。
11. 移除创建原生消息工具 schema 的 SDK 辅助函数，改为提供 presentation schema 辅助函数。
12. 从 `channelData` 中移除 UI/原生封装；仅保留传输元数据，直到每个剩余字段都完成审查。
13. 迁移 Discord、Slack、Telegram、Mattermost、MS Teams、Feishu 和 LINE 的渲染器。
14. 更新消息 CLI、渠道页面、插件 SDK 和能力手册的文档。
15. 对 Discord 和受影响的渠道入口点运行导入扇出分析。

步骤 1-11 和 13-14 已在此次重构中为共享 agent、CLI、插件能力和出站适配器契约实现。步骤 12 仍然是更深层的内部清理，用于处理 provider 私有的 `channelData` 传输封装。步骤 15 仍是后续验证，如果我们想要超出类型/测试门禁的量化导入扇出数据。

## 测试

添加或更新：

- presentation 规范化测试。
- 针对不支持块的 presentation 自动降级测试。
- 针对插件分发和核心交付路径的跨上下文标记测试。
- Discord、Slack、Telegram、Mattermost、MS Teams、Feishu、LINE 以及文本回退的渠道渲染矩阵测试。
- 证明原生字段已移除的消息工具 schema 测试。
- 证明原生标志已移除的 CLI 测试。
- 覆盖 Carbon 的 Discord 入口点导入懒加载回归测试。
- 覆盖 Telegram 和通用回退的 delivery pin 测试。

## 未决问题

- Should `delivery.pin` be implemented for Discord, Slack, MS Teams, and Feishu in the first pass, or only Telegram first?
- Should `delivery` eventually absorb existing fields such as `replyToId`, `replyToCurrent`, `silent`, and `audioAsVoice`, or stay focused on post-send behaviors?
- Should presentation support images or file references directly, or should media remain separate from UI layout for now?

## Related

- [Channels overview](/channels)
- [消息展示](/plugins/message-presentation)
