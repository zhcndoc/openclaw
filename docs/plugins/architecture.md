---
summary: "插件内部：能力模型、所有权、契约、加载流水线和运行时辅助函数"
read_when:
  - 构建或调试原生 OpenClaw 插件时
  - 了解插件能力模型或所有权边界时
  - 处理插件加载流水线或注册表时
  - 实现提供者运行时钩子或频道插件时
title: "插件内部"
sidebarTitle: "内部"
---

这里是 OpenClaw 插件系统的**深度架构参考**。如需实用指南，请从下面的专题页面开始。

<CardGroup cols={2}>
  <Card title="安装和使用插件" icon="plug" href="/tools/plugin">
    用于添加、启用和排查插件的终端用户指南。
  </Card>
  <Card title="构建插件" icon="rocket" href="/plugins/building-plugins">
    使用最小可运行 manifest 的第一个插件教程。
  </Card>
  <Card title="频道插件" icon="comments" href="/plugins/sdk-channel-plugins">
    构建一个消息频道插件。
  </Card>
  <Card title="提供者插件" icon="microchip" href="/plugins/sdk-provider-plugins">
    构建一个模型提供者插件。
  </Card>
  <Card title="SDK 概览" icon="book" href="/plugins/sdk-overview">
    导入映射和注册 API 参考。
  </Card>
</CardGroup>

## 公共能力模型

能力是 OpenClaw 内部公开的**原生插件**模型。每个原生 OpenClaw 插件都会针对一种或多种能力类型进行注册：

| 能力                   | 注册方法                                         | 示例插件                               |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| 文本推理         | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理后端  | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 嵌入向量             | `api.registerEmbeddingProvider(...)`             | 由提供者拥有的向量插件        |
| 语音                 | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 实时转录 | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音         | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 转录来源     | `api.registerTranscriptSourceProvider(...)`      | `discord`                            |
| 图像生成       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web 抓取              | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Web 搜索             | `api.registerWebSearchProvider(...)`              | `google`                             |
| 频道 / 消息    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Gateway 发现       | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>
一个只注册零个能力、但提供 hooks、tools、discovery services 或后台服务的插件，是一个**仅 hook 的旧式**插件。该模式仍然完全受支持。
</Note>

### 外部兼容性立场

能力模型已经进入核心，并且今天已被捆绑/原生插件使用，但外部插件兼容性仍需要比“它被导出了，因此它是冻结的”更严格的标准。

| 插件情况                                  | 指引                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 现有外部插件                         | 保持基于 hook 的集成可工作；这是兼容性基线。                        |
| 新的捆绑/原生插件                        | 优先使用显式能力注册，而不是厂商特定的直接访问或新的仅 hook 设计。 |
| 采用能力注册的外部插件                   | 允许，但除非文档标记为稳定，否则将能力相关的辅助表面视为会演进。 |

能力注册是预期方向。在迁移期间，旧式 hooks 仍是外部插件最安全的不破坏路径。已导出的辅助子路径并不都等价——应优先选择狭窄、文档化的契约，而不是偶然导出的辅助函数。

### 插件形态

OpenClaw 会根据插件实际的注册行为（而不仅仅是静态元数据）将每个已加载插件归类为某种形态：

<AccordionGroup>
  <Accordion title="纯能力">
    恰好注册一种能力类型（例如像 `mistral` 这样的仅提供者插件）。
  </Accordion>
  <Accordion title="混合能力">
    注册多种能力类型（例如 `openai` 同时拥有文本推理、语音、媒体理解和图像生成）。
  </Accordion>
  <Accordion title="仅 hooks">
    只注册 hooks（类型化或自定义），不注册能力、工具、命令或服务。
  </Accordion>
  <Accordion title="非能力型">
    注册工具、命令、服务或路由，但不注册能力。
  </Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力拆分。详情请参见 [CLI 参考](/cli/plugins#inspect)。

### 旧式 hooks

`before_agent_start` hook 仍然作为仅 hook 插件的兼容路径被支持。现实中的旧插件仍依赖它。

方向：

- 保持其可用
- 将其文档化为旧式
- 模型/提供者覆盖工作优先使用 `before_model_resolve`
- 提示词变更工作优先使用 `before_prompt_build`
- 仅在真实使用量下降且 fixture 覆盖证明迁移安全后再移除

### 兼容性信号

当你运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，可能会看到以下标签之一：

| 信号                     | 含义                                                      |
| -------------------------- | ------------------------------------------------------------ |
| **配置有效**           | 配置解析正常，插件可正常解析                       |
| **兼容性提示** | 插件使用了受支持但较旧的模式（例如 `hook-only`） |
| **旧版警告**         | 插件使用了已弃用的 `before_agent_start`        |
| **严重错误**             | 配置无效或插件加载失败                   |

`hook-only` 和 `before_agent_start` 今天都不会破坏你的插件：`hook-only` 只是建议性质，`before_agent_start` 仅会触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四层：

<Steps>
  <Step title="清单 + 发现">
    OpenClaw 会从配置路径、workspace 根目录、全局插件根目录以及捆绑插件中查找候选插件。发现流程会优先读取原生 `openclaw.plugin.json` 清单以及受支持的 bundle 清单。
  </Step>
  <Step title="启用 + 验证">
    核心会决定发现的插件是启用、禁用、阻止，还是被选中用于某个独占槽位，例如 memory。
  </Step>
  <Step title="运行时加载">
    原生 OpenClaw 插件以内进程方式加载，并将能力注册到中央注册表中。打包后的 JavaScript 通过原生 `require` 加载；第三方本地源码 TypeScript 则使用紧急的 Jiti 回退。兼容的 bundle 会被规范化为注册表记录，而不会导入运行时代码。
  </Step>
  <Step title="表面消费">
    OpenClaw 的其余部分读取注册表，以暴露工具、频道、提供者设置、hooks、HTTP 路由、CLI 命令和服务。
  </Step>
</Steps>

就插件 CLI 而言，根命令发现分为两个阶段：

- 解析时元数据来自 `registerCli(..., { descriptors: [...] })`
- 真正的插件 CLI 模块可以保持懒加载，并在首次调用时注册

这样既能将插件拥有的 CLI 代码保留在插件内部，又能让 OpenClaw 在解析前预留根命令名。

重要的设计边界是：

- manifest/配置验证应当仅依赖**manifest/schema 元数据**，而不执行插件代码
- 原生能力发现可能会加载受信任的插件入口代码，以构建一个不激活的注册表快照
- 原生运行时行为来自插件模块的 `register(api)` 路径，并且 `api.registrationMode === "full"`

这种拆分让 OpenClaw 能在完整运行时激活之前验证配置、解释缺失/禁用插件，并构建 UI/schema 提示。

### 插件元数据快照和查找表

Gateway 启动会为当前配置快照构建一个 `PluginMetadataSnapshot`。该快照仅包含元数据：它存储已安装插件索引、manifest 注册表、manifest 诊断、所有者映射、插件 id 规范化器以及 manifest 记录。它不包含已加载的插件模块、提供者 SDK、包内容或运行时导出。

插件感知的配置验证、启动时自动启用以及 Gateway 插件引导都会使用该快照，而不是独立重建 manifest/索引元数据。`PluginLookUpTable` 基于同一个快照派生，并为当前运行时配置添加启动插件计划。

启动后，Gateway 会将当前元数据快照作为可替换的运行时产物保留。重复的运行时提供者发现可以借用该快照，而无需在每次 provider-catalog 遍历时重建已安装索引和 manifest 注册表。当没有兼容的当前快照时，调用方会退回到冷路径的 manifest/索引流程。兼容性检查必须包含诸如 `plugins.load.paths` 和默认 agent workspace 之类的插件发现根目录，因为 workspace 插件属于元数据作用域的一部分。

该快照和查找表让重复的启动决策保持在快速路径上：

- channel 所有权
- 延迟的 channel 启动
- 启动插件 ids
- provider 和 CLI backend 所有权
- setup provider、命令别名、模型目录 provider，以及 manifest contract 所有权
- 插件配置 schema 和 channel 配置 schema 验证
- 启动时自动启用决策

安全边界是快照替换，而不是修改。只要配置、插件清单、安装记录或持久化索引策略发生变化，就应重建快照。不要把它当作一个广泛可变的全局注册表，也不要保留无限增长的历史快照。运行时插件加载仍与元数据快照分离，因此过期的运行时状态不会被元数据缓存掩盖。

缓存规则记录在 [插件架构内部](/plugins/architecture-internals#plugin-cache-boundary)：manifest 和发现元数据默认是新的，除非调用方持有当前流程的显式快照、查找表或 manifest 注册表。隐藏的元数据缓存和按墙钟时间计算的 TTL 不属于插件加载的一部分。只有运行时加载器、模块和依赖制品缓存才可能在代码或已安装制品真正加载后继续存在。

一些冷路径调用方仍会直接从持久化的已安装插件索引重建 manifest 注册表，而不是接收 Gateway 的 `PluginLookUpTable`。该路径现在会按需重建注册表；如果调用方已经拥有当前查找表或显式 manifest 注册表，优先在运行时流程中传递它们。

### 激活规划

激活规划属于控制平面。调用方可以在加载更广泛的运行时注册表之前，询问哪些插件与某个具体命令、提供者、频道、路由、agent harness 或能力相关。

规划器保持当前 manifest 行为兼容：

- `activation.*` 字段是显式的规划器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks 仍然是 manifest 所有权回退
- 仅 ids 的规划器 API 对现有调用方保持可用
- plan API 会报告原因标签，以便诊断能够区分显式提示和所有权回退

<Warning>
不要把 `activation` 当作生命周期 hook，或将其视为 `register(...)` 的替代品。它是用于缩小加载范围的元数据。如果所有权字段已经描述了关系，就优先使用它们；只有在需要额外规划器提示时才使用 `activation`。
</Warning>

### 频道插件和共享消息工具

频道插件在正常聊天操作中不需要注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留了一个共享的 `message` 工具，而频道插件在其后面负责频道特定的发现和执行。

当前边界是：

- 核心拥有共享的 `message` 工具宿主、提示词绑定、会话/线程记账以及执行分发
- 频道插件拥有作用域内的动作发现、能力发现以及任何频道特定的 schema 片段
- 频道插件拥有提供者特定的会话对话语法，例如对话 ids 如何编码线程 ids，或如何从父对话继承
- 频道插件通过其动作适配器执行最终动作

对于频道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。这个统一的发现调用让插件能够将其可见动作、能力和 schema 贡献一起返回，从而避免这些部分彼此偏离。

当某个频道专属的 message-tool 参数携带媒体源，例如本地路径或远程媒体 URL 时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。核心会使用这个显式列表应用沙箱路径规范化和出站媒体访问提示，而无需硬编码插件拥有的参数名。这里应优先使用按动作范围划分的映射，而不是整个频道的扁平列表，这样仅用于 profile 的媒体参数就不会在诸如 `send` 之类不相关的动作上被规范化。

核心会在该发现步骤中传入运行时作用域。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信的入站 `requesterSenderId`

这对上下文敏感的插件很重要。频道可以根据活动账号、当前房间/线程/消息，或者可信请求者身份，隐藏或暴露消息动作，而无需在核心 `message` 工具中硬编码频道特定分支。

这也是为什么嵌入式运行器的路由变更仍然属于插件工作：运行器负责将当前聊天/会话身份传递到插件发现边界，以便共享的 `message` 工具为当前轮次暴露正确的频道拥有表面。

对于频道拥有的执行辅助函数，捆绑插件应将执行运行时保留在自己的扩展模块中。核心不再拥有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 消息动作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，而捆绑插件应直接从其扩展拥有的模块导入自己的本地运行时代码。

同样的边界也适用于一般的以提供者命名的 SDK 接缝：核心不应导入 Slack、Discord、Signal、WhatsApp 或类似扩展的频道特定便捷 barrel。如果核心需要某种行为，要么消费捆绑插件自己的 `api.ts` / `runtime-api.ts` barrel，要么将需求提升为共享 SDK 中一个狭窄的通用能力。

捆绑插件遵循相同规则。捆绑插件的 `runtime-api.ts` 不应重新导出其自己的品牌化 `openclaw/plugin-sdk/<plugin-id>` facade。这些品牌化 facade 仍然是面向外部插件和旧消费者的兼容性 shim，但捆绑插件应使用本地导出，以及诸如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress` 之类狭窄的通用 SDK 子路径。除非现有外部生态的兼容边界确有要求，否则新代码不应添加插件 id 特定的 SDK facade。

针对 poll，存在两条执行路径：

- `outbound.sendPoll` 是适用于符合通用 poll 模型的频道的共享基线
- `actions.handleAction("poll")` 是适用于频道特定 poll 语义或额外 poll 参数的首选路径

现在，核心会在插件 poll 分发拒绝该动作之后，再推迟共享 poll 解析，因此插件拥有的 poll 处理器可以接受频道特定的 poll 字段，而不会先被通用 poll 解析器阻挡。

完整启动顺序请参见 [插件架构内部](/plugins/architecture-internals)。

## 能力所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是把各种互不相关的集成杂糅在一起的“杂物袋”。

这意味着：

- 公司插件通常应拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应拥有其引入的完整功能表面
- 通道应消费共享的核心能力，而不是临时性地重新实现提供方行为

<AccordionGroup>
  <Accordion title="厂商多能力">
    `openai` 拥有文本推理、语音、实时语音、媒体理解和图像生成。`google` 拥有文本推理以及媒体理解、图像生成和网页搜索。`qwen` 拥有文本推理以及媒体理解和视频生成。
  </Accordion>
  <Accordion title="厂商单能力">
    `elevenlabs` 和 `microsoft` 拥有语音；`firecrawl` 拥有网页抓取；`minimax` / `mistral` / `moonshot` / `zai` 拥有媒体理解后端。
  </Accordion>
  <Accordion title="功能插件">
    `voice-call` 拥有通话传输、工具、CLI、路由以及 Twilio 媒体流桥接，但它消费共享的语音、实时转录和实时语音能力，而不是直接导入厂商插件。
  </Accordion>
</AccordionGroup>

期望的最终状态是：

- OpenAI 保持在一个插件中，即使它横跨文本模型、语音、图像以及未来的视频
- 其他厂商也可以用同样的方式覆盖它们自己的范围
- 通道不关心哪个厂商插件拥有该提供方；它们消费由核心暴露的共享能力契约

这一区分非常关键：

- **plugin** = 所有权边界
- **capability** = 可由多个插件实现或消费的核心契约

因此，如果 OpenClaw 增加一个新领域，比如视频，首先要问的不是“哪个提供方应该硬编码视频处理？”第一个问题是“核心的视频能力契约是什么？”一旦这个契约存在，厂商插件就可以围绕它注册，而通道/功能插件可以消费它。

如果该能力还不存在，通常正确的做法是：

<Steps>
  <Step title="定义能力">
    在 core 中定义缺失的能力。
  </Step>
  <Step title="通过 SDK 暴露">
    以类型安全的方式通过插件 API/runtime 暴露它。
  </Step>
  <Step title="连接消费者">
    让通道/功能围绕该能力进行连接。
  </Step>
  <Step title="厂商实现">
    让厂商插件注册实现。
  </Step>
</Steps>

这样既能保持所有权明确，又能避免依赖单一厂商或一次性插件专用代码路径的 core 行为。

### 能力分层

在决定代码应该放在哪里时，可以使用这个心智模型：

<Tabs>
  <Tab title="核心能力层">
    共享编排、策略、回退、配置合并规则、交付语义以及类型化契约。
  </Tab>
  <Tab title="厂商插件层">
    厂商特定 API、认证、模型目录、语音合成、图像生成、未来的视频后端、用量端点。
  </Tab>
  <Tab title="通道/功能插件层">
    Slack/Discord/voice-call/等集成，它们消费核心能力并将其呈现在某个表面上。
  </Tab>
</Tabs>

例如，TTS 遵循这样的结构：

- core 拥有回复时 TTS 策略、回退顺序、偏好设置以及通道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时辅助工具

未来的能力也应优先采用同样的模式。

### 多能力公司插件示例

从外部看，公司插件应该是内聚的。如果 OpenClaw 对模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页抓取和网页搜索拥有共享契约，那么某个厂商可以在一个地方拥有它的全部表面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import {
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // 认证/模型目录/运行时钩子
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // 厂商语音配置 — 直接实现 SpeechProviderPlugin 接口
    });

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // 凭证 + 抓取逻辑
      }),
    );
  },
};

export default plugin;
```

重要的不是这些辅助函数的准确名称，而是这种形态：

- 一个插件拥有厂商表面
- core 仍然拥有能力契约
- 通道和功能插件消费 `api.runtime.*` 辅助工具，而不是厂商代码
- 契约测试可以断言插件注册了它声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一个共享能力。相同的所有权模型也适用于这里：

<Steps>
  <Step title="Core 定义契约">
    core 定义媒体理解契约。
  </Step>
  <Step title="厂商插件注册">
    厂商插件按需注册 `describeImage`、`transcribeAudio` 和 `describeVideo`。
  </Step>
  <Step title="消费者使用共享行为">
    通道和功能插件消费共享的 core 行为，而不是直接连接到厂商代码。
  </Step>
</Steps>

这样可以避免把某个提供方的视频假设写进 core。插件拥有厂商表面；core 拥有能力契约和回退行为。

视频生成已经使用了相同的顺序：core 拥有类型化的能力契约和运行时辅助工具，而厂商插件围绕它注册 `api.registerVideoGenerationProvider(...)` 实现。

需要一个具体的落地清单吗？请参见 [能力食谱](/tools/capability-cookbook)。

## 契约与约束

插件 API 表面被有意设计为类型化并集中在 `OpenClawPluginApi` 中。该契约定义了插件可用的注册点，以及插件可以依赖的运行时辅助工具。

这之所以重要，是因为：

- 插件作者获得了一个稳定的内部标准
- core 可以拒绝重复所有权，例如两个插件注册相同的 provider id
- 启动时可以针对格式错误的注册提供可执行的诊断信息
- 契约测试可以强制执行打包插件的所有权并防止悄然漂移

有两层约束：

<AccordionGroup>
  <Accordion title="运行时注册约束">
    插件注册表会在插件加载时校验注册。示例：重复的 provider id、重复的 speech provider id 以及格式错误的注册会生成插件诊断，而不是未定义行为。
  </Accordion>
  <Accordion title="契约测试">
    在测试运行期间，会将打包插件捕获到契约注册表中，以便 OpenClaw 能明确断言所有权。当前这用于模型提供方、语音提供方、网页搜索提供方以及打包注册所有权。
  </Accordion>
</AccordionGroup>

实际效果是，OpenClaw 预先知道哪个插件拥有哪个表面。这让 core 和通道能够无缝组合，因为所有权是声明式、类型化且可测试的，而不是隐式的。

### 契约中应该包含什么

<Tabs>
  <Tab title="好的契约">
    - 类型化
    - 小而精
    - 面向特定能力
    - 由 core 拥有
    - 可被多个插件复用
    - 通道/功能可消费且无需了解厂商细节

  </Tab>
  <Tab title="坏的契约">
    - 将厂商特定策略隐藏在 core 中
    - 绕过注册表的一次性插件逃逸口
    - 通道代码直接进入厂商实现
    - 不属于 `OpenClawPluginApi` 或 `api.runtime` 的临时运行时对象

  </Tab>
</Tabs>

拿不准时，就提高抽象层级：先定义能力，再让插件接入它。

## 执行模型

原生 OpenClaw 插件与 Gateway **进程内**运行。它们不在沙箱中。已加载的原生插件与 core 代码拥有相同的进程级信任边界。

<Warning>
原生插件的影响：插件可以注册工具、网络处理器、钩子和服务；插件缺陷可能导致网关崩溃或不稳定；恶意原生插件等同于在 OpenClaw 进程内执行任意代码。
</Warning>

兼容的 bundle 默认更安全，因为 OpenClaw 目前将它们视为元数据/内容包。在当前版本中，这主要意味着 bundled skills。

对于非 bundled 插件，请使用允许列表和明确的安装/加载路径。将 workspace 插件视为开发时代码，而不是生产默认项。

对于 bundled workspace 包名，保持插件 id 与 npm 名称绑定：默认使用 `@openclaw/<id>`，或者在包有意暴露更窄插件角色时，使用已批准的类型化后缀，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>
**信任说明：** `plugins.allow` 信任的是 **插件 id**，而不是来源证明。与 bundled 插件同 id 的 workspace 插件在该 workspace 插件启用/加入允许列表时，会有意覆盖 bundled 副本。这是正常且有用的，适用于本地开发、补丁测试和热修复。bundled 插件的信任来源于源快照——加载时磁盘上的 manifest 和代码——而不是安装元数据。损坏或被替换的安装记录不能在不知不觉中将 bundled 插件的信任范围扩大到超出实际源码声明的程度。
</Note>

## 导出边界

OpenClaw 导出的是能力，而不是实现便利性。

保持能力注册为公开。裁剪非契约型的辅助导出：

- 打包插件特定的辅助子路径
- 不打算作为公共 API 的运行时管道子路径
- 供应商特定的便利辅助工具
- 作为实现细节的设置/引导辅助工具

保留的打包插件辅助子路径已从生成的 SDK 导出映射中移除。将特定所有者的辅助工具保留在对应的插件包内；仅将可复用的宿主行为提升为通用的 SDK 契约，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 内部实现与参考

关于加载管道、注册表模型、提供方运行时钩子、Gateway HTTP 路由、消息工具模式、通道目标解析、提供方目录、上下文引擎插件，以及添加新能力的指南，请参见 [插件架构内部](/plugins/architecture-internals)。

## 相关

- [构建插件](/plugins/building-plugins)
- [插件清单](/plugins/manifest)
- [插件 SDK 设置](/plugins/sdk-setup)
