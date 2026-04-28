---
summary: "插件内部机制：能力模型、所有权、契约、加载管道和运行时助手"
read_when:
  - 构建或调试原生 OpenClaw 插件时
  - 理解插件能力模型或所有权边界时
  - 处理插件加载管道或注册表时
  - 实现提供者运行时钩子或渠道插件时
title: "插件内部"
sidebarTitle: "内部"
---

这是 OpenClaw 插件系统的**深层架构参考**。如需实践指南，请从下面任一专题页面开始。

<CardGroup cols={2}>
  <Card title="安装和使用插件" icon="plug" href="/tools/plugin">
    面向最终用户的插件添加、启用和故障排除指南。
  </Card>
  <Card title="构建插件" icon="rocket" href="/plugins/building-plugins">
    使用最小可运行清单的首个插件教程。
  </Card>
  <Card title="渠道插件" icon="comments" href="/plugins/sdk-channel-plugins">
    构建一个消息渠道插件。
  </Card>
  <Card title="提供者插件" icon="microchip" href="/plugins/sdk-provider-plugins">
    构建一个模型提供者插件。
  </Card>
  <Card title="SDK 概览" icon="book" href="/plugins/sdk-overview">
    导入映射和注册 API 参考。
  </Card>
</CardGroup>

## 公共能力模型

能力是 OpenClaw 内部公共的**原生插件**模型。每个原生 OpenClaw 插件都会针对一个或多个能力类型进行注册：

| 能力 | 注册方法 | 示例插件 |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| 文本推理         | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理后端  | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 语音                 | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 实时转录 | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音         | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 图像生成       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 网页获取              | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 网页搜索             | `api.registerWebSearchProvider(...)`             | `google`                             |
| 渠道 / 消息    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| 网关发现       | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

只注册了零个能力、但提供钩子、工具、发现服务或后台服务的插件，是**仅遗留钩子**插件。该模式仍然完全受支持。

### 外部兼容性立场

能力模型已落地于核心，并由今天的捆绑/原生插件使用，但外部插件兼容性仍需比“已导出，因此已冻结”更严格的标准。

| 插件情况                                  | 指南                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 现有外部插件                         | 保持基于钩子的集成可用；这是兼容性基线。                        |
| 新的捆绑/原生插件                        | 相较于供应商特定的直连或新的仅钩子设计，优先使用显式能力注册。 |
| 采用能力注册的外部插件 | 允许，但除非文档标明稳定，否则将能力特定的辅助表面视为演进中的接口。 |

能力注册是预期方向。在过渡期间，遗留钩子仍是外部插件最稳妥的不破坏路径。导出的辅助子路径并不都等同——优先选择狭窄、文档化的契约，而不是偶然导出的辅助项。

### 插件形态

OpenClaw 根据每个加载插件的实际注册行为（而不仅仅是静态元数据）将其分类为一种形态：

- **plain-capability**: 恰好注册一种能力类型（例如像 `mistral` 这样的仅提供者插件）。
- **hybrid-capability**: 注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成）。
- **hook-only**: 仅注册钩子（类型化或自定义），不注册能力、工具、命令或服务。
- **non-capability**: 注册工具、命令、服务或路由，但不注册能力。

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力细分。详见 [CLI 参考](/cli/plugins#inspect)。

### 遗留钩子

`before_agent_start` 钩子作为仅钩子插件的兼容性路径仍然受支持。遗留的现实世界插件仍依赖它。

方向：

- 保持其工作
- 将其记录为遗留
- 对于模型/提供者覆盖工作，优先使用 `before_model_resolve`
- 对于提示词变异工作，优先使用 `before_prompt_build`
- 仅在实际使用量下降且测试用例覆盖证明迁移安全后移除

### 兼容性信号

运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，您可能会看到以下标签之一：

| 信号 | 含义 |
| -------------------------- | ------------------------------------------------------------ |
| **配置有效** | 配置解析正常且插件可解析 |
| **兼容性建议** | 插件使用受支持但较旧的模式（例如 `hook-only`） |
| **遗留警告** | 插件使用 `before_agent_start`，已弃用 |
| **严重错误** | 配置无效或插件加载失败 |

`hook-only` 和 `before_agent_start` 今天都不会破坏您的插件：`hook-only` 只是建议，而 `before_agent_start` 只会触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四层：

1. **清单 + 发现**
   OpenClaw 会从配置路径、工作区根目录、全局插件根目录和捆绑插件中查找候选插件。发现阶段首先读取原生 `openclaw.plugin.json` 清单以及受支持的捆绑清单。
2. **启用 + 验证**
   核心决定一个已发现的插件是已启用、已禁用、已阻止，还是被选中用于某个独占槽位，例如内存。
3. **运行时加载**
   原生 OpenClaw 插件通过 jiti 在进程内加载，并将能力注册到中心注册表。兼容的捆绑包会被规范化为注册表记录，而无需导入运行时代码。
4. **表面消费**
   OpenClaw 的其余部分读取注册表，以暴露工具、渠道、提供者设置、钩子、HTTP 路由、CLI 命令和服务。

对于插件 CLI 具体来说，根命令发现分为两个阶段：

- 解析时元数据来自 `registerCli(..., { descriptors: [...] })`
- 真正的插件 CLI 模块可以保持懒加载，并在首次调用时注册

这使得插件拥有的 CLI 代码保留在插件内部，同时让 OpenClaw 能够在解析前保留根命令名称。

重要的设计边界：

- 发现 + 配置验证应基于**清单/架构元数据**工作，无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种分离让 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件并构建 UI/架构提示。

### 插件元数据快照与查找表

Gateway 启动会针对当前配置快照构建一个 `PluginMetadataSnapshot`。该快照仅包含元数据：它存储已安装插件索引、清单注册表、清单诊断、所有者映射、插件 id 规范化器以及清单记录。它不包含已加载的插件模块、提供者 SDK、包内容或运行时导出。

感知插件的配置验证、启动时自动启用以及 Gateway 插件引导都会消费该快照，而不是独立重建清单/索引元数据。`PluginLookUpTable` 由同一快照派生，并为当前运行时配置添加启动插件计划。

启动后，Gateway 会将当前元数据快照作为可替换的运行时产物保留。重复的运行时提供者发现可以借用该快照，而不必在每次提供者目录遍历时重建已安装索引和清单注册表。当没有兼容的当前快照时，调用方会回退到冷路径清单/索引流程。兼容性检查必须包括插件发现根，例如 `plugins.load.paths` 和默认代理工作区，因为工作区插件属于元数据范围的一部分。

该快照和查找表让重复的启动决策走在快路径上：

- 渠道所有权
- 延迟渠道启动
- 启动插件 id
- 提供者和 CLI 后端所有权
- setup provider、命令别名、模型目录提供者以及清单契约所有权
- 插件配置架构和渠道配置架构验证
- 启动时自动启用决策

安全边界是快照替换，而不是变异。当前当配置、插件清单、安装记录或持久化索引策略发生变化时，应重建快照。不要把它当作一个广泛可变的全局注册表，也不要保留无限增长的历史快照。运行时插件加载仍然与元数据快照分离，因此过期的运行时状态不会被隐藏在元数据缓存之后。

一些冷路径调用方仍然会直接从持久化的已安装插件索引重建清单注册表，而不是接收 Gateway 的 `PluginLookUpTable`。该回退路径保留了一个小的、有界的内存缓存，键由已安装索引、请求形状、配置策略、运行时根以及清单/包文件签名组成。它是重复索引重建的回退安全网，而不是首选的 Gateway 快路径。当调用方已经拥有当前查找表时，优先在运行流程中传递它或显式的清单注册表。

### 激活规划

激活规划属于控制平面。调用方可以在加载更广泛的运行时注册表之前，询问哪些插件与某个具体命令、提供者、渠道、路由、代理运行器或能力相关。

规划器保持当前清单行为兼容：

- `activation.*` 字段是显式的规划器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、
  `contracts.tools` 和钩子仍然作为清单所有权回退
- 仅 id 的规划器 API 仍对现有调用方可用
- 计划 API 会报告原因标签，以便诊断能区分显式提示与所有权回退

不要将 `activation` 视为生命周期钩子，也不要把它视为 `register(...)` 的替代品。它是用于缩小加载范围的元数据。若所有权字段已经描述了关系，优先使用所有权字段；只有在需要额外的规划器提示时才使用 `activation`。

### 渠道插件和共享消息工具

渠道插件无需为普通聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，渠道插件拥有其背后的渠道特定发现和执行。

当前边界是：

- 核心拥有共享的 `message` 工具主机、提示词连线、会话/线程
  簿记和执行调度
- 渠道插件拥有作用域内的操作发现、能力发现以及任何
  渠道特定的架构片段
- 渠道插件拥有提供者特定的会话对话语法，例如
  对话 ID 如何编码线程 ID 或从父对话继承
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。该统一发现调用让插件可以一起返回其可见操作、能力和架构贡献，以便这些部分不会偏离。

当渠道特定的消息工具参数携带媒体来源，例如本地路径或远程媒体 URL 时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。核心使用该显式列表来应用沙箱路径规范化和出站媒体访问提示，而无需将插件拥有的参数名硬编码进去。
这里优先使用按操作作用域划分的映射，而不是按整个渠道划分的一维平面列表，这样仅配置文件相关的媒体参数就不会在诸如
`send` 之类的无关操作上被规范化。

核心会在该发现步骤中传入运行时作用域。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信入站 `requesterSenderId`

这对上下文敏感插件很重要。渠道可以根据活动账户、当前房间/线程/消息或可信请求者身份隐藏或暴露消息操作，而无需在核心 `message` 工具中硬编码渠道特定分支。

这就是为什么嵌入式运行器路由更改仍然是插件工作：运行器负责将当前聊天/会话身份转发到插件发现边界，以便共享 `message` 工具为当前轮次暴露正确的渠道拥有表面。

对于渠道拥有的执行助手，捆绑插件应将执行运行时保留在其自己的扩展模块内。核心不再拥有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入其自己的本地运行时代码。

同样的边界通常适用于以提供者命名的 SDK 接口：核心不应导入针对 Slack、Discord、Signal、WhatsApp 或类似扩展的渠道特定便利聚合模块。如果核心需要某种行为，要么使用捆绑插件自己的 `api.ts` / `runtime-api.ts` 聚合模块，要么将需求提升为共享 SDK 中的一个狭窄通用能力。

捆绑插件也遵循同样的规则。捆绑插件的 `runtime-api.ts` 不应重新导出其自身带品牌的 `openclaw/plugin-sdk/<plugin-id>` 门面。这些带品牌的门面仍然是供外部插件和旧版消费者使用的兼容性适配层，但捆绑插件应使用本地导出以及诸如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress` 之类更窄的通用 SDK 子路径。新代码不应新增插件 id 特定的 SDK 门面，除非现有外部生态的兼容性边界有此要求。

就投票而言，有两条执行路径：

- `outbound.sendPoll` 是符合通用投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是渠道特定投票语义或额外投票参数的首选路径

核心现在会在插件投票分发拒绝该操作之后，才推迟到共享投票解析，因此插件拥有的投票处理器可以接受渠道特定的投票字段，而不会被通用投票解析器首先阻塞。

查看 [插件架构内部](/plugins/architecture-internals) 以了解完整启动序列。

## 能力所有权模型

OpenClaw 将原生插件视为**公司**或**功能**的所有权边界，而不是无关集成的大杂烩。

这意味着：

- 公司插件通常应拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应拥有其引入的完整功能表面
- 渠道应消费共享核心能力，而不是临时重新实现提供者行为

<Accordion title="捆绑插件中的示例所有权模式">
  - **供应商多能力**: `openai` 拥有文本推理、语音、实时语音、媒体理解和图像生成。`google` 拥有文本推理以及媒体理解、图像生成和网页搜索。`qwen` 拥有文本推理以及媒体理解和视频生成。
  - **供应商单能力**: `elevenlabs` 和 `microsoft` 拥有语音；`firecrawl` 拥有网页获取；`minimax` / `mistral` / `moonshot` / `zai` 拥有媒体理解后端。
  - **功能插件**: `voice-call` 拥有呼叫传输、工具、CLI、路由和 Twilio 媒体流桥接，但消费共享的语音、实时转录和实时语音能力，而不是直接导入供应商插件。
</Accordion>

预期的最终状态是：

- OpenAI 存在于一个插件中，即使它跨越文本模型、语音、图像和未来的视频
- 另一个供应商可以为其自己的表面区域做同样的事情
- 渠道不关心哪个供应商插件拥有提供者；它们消费核心暴露的共享能力契约

这是关键区别：

- **插件** = 所有权边界
- **能力** = 多个插件可以实现或消费的核心契约

因此，如果 OpenClaw 添加一个新领域（如视频），第一个问题不是“哪个提供者应该硬编码视频处理？”第一个问题是“核心视频能力契约是什么？”一旦该契约存在，供应商插件可以针对它注册，渠道/功能插件可以消费它。

如果能力尚不存在，正确的举措通常是：

1. 在核心中定义缺失的能力
2. 通过插件 API/运行时以类型化方式暴露它
3. 将渠道/功能针对该能力连线
4. 让供应商插件注册实现

这保持了所有权的明确性，同时避免了依赖于单一供应商或一次性插件特定代码路径的核心行为。

### 能力分层

在决定代码归属时使用此思维模型：

- **核心能力层**：共享编排、策略、回退、配置合并规则、交付语义和类型化契约
- **供应商插件层**：供应商特定 API、认证、模型目录、语音合成、图像生成、未来视频后端、使用端点
- **渠道/功能插件层**：Slack/Discord/voice-call 等集成，消费核心能力并将其呈现在表面上

例如，TTS 遵循此形状：

- 核心拥有回复时 TTS 策略、回退顺序、偏好和渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时助手

同样的模式应优先用于未来能力。

### 多能力公司插件示例

公司插件从外部看来应该是内聚的。如果 OpenClaw 拥有用于模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页获取和网页搜索的共享契约，供应商可以在一个地方拥有其所有表面：

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
      // 供应商语音配置 — 直接实现 SpeechProviderPlugin 接口
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
        // 凭证 + 获取逻辑
      }),
    );
  },
};

export default plugin;
```

重要的不是确切的助手名称。形状很重要：

- 一个插件拥有供应商表面
- 核心仍然拥有能力契约
- 渠道和功能插件消费 `api.runtime.*` 助手，而非供应商代码
- 契约测试可以断言插件注册了其声称拥有的能力

### 能力示例：视频理解

OpenClaw 已将图像/音频/视频理解视为一个共享能力。相同的所有权模型适用于那里：

1. 核心定义媒体理解契约
2. 供应商插件注册 `describeImage`、`transcribeAudio` 和 `describeVideo`（如适用）
3. 渠道和功能插件消费共享核心行为，而不是直接连线到供应商代码

这避免了将一个提供者的视频假设烘焙到核心中。插件拥有供应商表面；核心拥有能力契约和回退行为。

视频生成已经使用了相同的序列：核心拥有类型化的能力契约和运行时助手，供应商插件针对它注册 `api.registerVideoGenerationProvider(...)` 实现。

需要具体的推出清单？请参阅 [能力手册](/tools/capability-cookbook)。

## 契约与执行

插件 API 表面故意被类型化并集中于
`OpenClawPluginApi`。该契约定义了支持的注册点和
插件可以依赖的运行时助手。

为何这很重要：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复的所有权，例如两个插件注册相同的
  提供者 ID
- 启动时可以暴露可操作的诊断信息，用于格式错误的注册
- 契约测试可以强制捆绑插件的所有权并防止静默漂移

有两层执行机制：

1. **运行时注册执行**
   插件注册表在插件加载时验证注册。示例：
   重复的提供者 ID、重复的语音提供者 ID 以及格式错误的
   注册会产生插件诊断而不是未定义行为。
2. **契约测试**
   在测试运行期间，捆绑插件被捕获在契约注册表中，以便
   OpenClaw 可以明确断言所有权。目前这用于模型
   提供者、语音提供者、网络搜索提供者和捆绑注册所有权。

实际效果是 OpenClaw 事先知道哪个插件拥有哪个
表面。这使得核心和渠道可以无缝组合，因为所有权是
声明式的、类型化的且可测试的，而不是隐式的。

### 契约中应包含的内容

好的插件契约是：

- 类型化的
- 小的
- 特定于功能的
- 由核心拥有
- 可由多个插件重用
- 可由渠道/功能消费而无需了解供应商

坏的插件契约是：

- 隐藏在核心中的供应商特定策略
- 绕过注册表的一次性插件逃生舱
- 渠道代码直接深入供应商实现
- 不属于 `OpenClawPluginApi` 或
  `api.runtime` 的临时运行时对象

如有疑问，提高抽象级别：先定义功能，然后
让插件插入其中。

## 执行模型

原生 OpenClaw 插件与网关一起 **在进程内** 运行。它们
没有被沙箱化。加载的原生插件与核心代码具有相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、钩子和服务
- 原生插件错误可能导致网关崩溃或不稳定
- 恶意原生插件等同于在 OpenClaw 进程内
  执行任意代码

兼容的 bundle 默认更安全，因为 OpenClaw 目前将它们
视为元数据/内容包。在当前版本中，这主要意味着 bundled 技能。

对非 bundled 插件使用允许列表和明确的安装/加载路径。将
工作区插件视为开发时代码，而不是生产默认值。

对于 bundled 工作区包名，将插件 id 锚定在 npm
名称中：默认为 `@openclaw/<id>`，或者当包故意暴露更窄的插件角色时使用批准的类型化后缀，如
`-provider`, `-plugin`, `-speech`, `-sandbox`, 或 `-media-understanding`。

重要的信任说明：

- `plugins.allow` 信任的是 **插件 id**，而不是来源溯源。
- 如果启用/加入允许列表，工作区插件若与 bundled 插件具有相同的 id，则会故意覆盖
  bundled 副本。
- 这是一种正常且有用的行为，适用于本地开发、补丁测试和热修复。
- bundled 插件的信任基于源快照进行解析——即加载时磁盘上的清单和
  代码——而不是安装元数据。损坏或被替换的安装记录
  不能在不被察觉的情况下，将 bundled 插件的信任
  范围扩大到超出实际源所声明的内容。

## 导出边界

Some bundled-plugin helper subpaths still remain in the generated SDK export map for compatibility and bundled-plugin maintenance. Current examples include `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup`, `plugin-sdk/channel-config-schema-legacy`, and several `plugin-sdk/matrix*` seams. Treat those as deprecated reserved exports, not as the recommended SDK pattern for new third-party plugins.

保持功能注册公开。修剪非契约辅助导出：

- 特定于 bundled 插件的辅助子路径
- 不作为公共 API 的运行时管道子路径
- 供应商特定的便利辅助函数
- 作为实现细节的设置/入职辅助函数

一些 bundled 插件辅助子路径仍然保留在生成的 SDK 导出映射中，以用于兼容性和 bundled 插件维护。当前示例包括
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 以及几个 `plugin-sdk/matrix*` 接口。将这些视为
保留的实现细节导出，而不是新第三方插件的推荐 SDK 模式。

## 内部实现与参考

关于加载管线、注册表模型、提供者运行时钩子、Gateway HTTP
路由、消息工具 schema、渠道目标解析、提供者目录、
上下文引擎插件，以及添加新功能的指南，请参阅
[插件架构内部实现](/plugins/architecture-internals)。

## 相关内容

- [构建插件](/plugins/building-plugins)
- [插件 SDK 设置](/plugins/sdk-setup)
- [插件清单](/plugins/manifest)
