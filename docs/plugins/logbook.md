---
summary: "可选的自动工作日志，由定期屏幕截图构建"
read_when:
  - "你希望在 Control UI 中查看类似 Dayflow 的每日时间线"
  - "你正在启用或配置内置的 Logbook 插件"
  - "你希望获得基于屏幕活动的站会总结或当天回顾"
title: "Logbook 插件"
---

Logbook 插件会将屏幕活动转化为自动工作日志。它会从配对的节点捕获定期屏幕截图，将其汇总为带时间戳的观察记录， 并在 [Control UI](/web/control-ui) 中构建时间线卡片。它还可以生成每日站会笔记， 并回答关于某一天的提问。

OpenClaw-owned 状态保留在 `<state-dir>/logbook/` 下的网关上，但模型处理不一定是本地的。采样的屏幕截图转到配置的视觉路线；观察结果和时间线文本将转到默认代理模型。如果屏幕内容和派生活动文本必须保留在计算机上，则对两个阶段都使用本地模型路由。

Logbook 已内置但默认禁用。启用该插件会让 Gateway 进入屏幕捕获模式，因为 `captureEnabled` 默认值为 `true`。

## <a id="before-you-begin"></a> 开始之前

你需要：

- 一个已连接的节点，且该节点暴露 `screen.snapshot` 或 `logbook.snapshot`。macOS 应用节点需要屏幕录制权限。无头 macOS 节点主机（`openclaw node host run`）会获得由插件提供的 `logbook.snapshot` 命令，并由系统 `screencapture` 工具支持。
- 捆绑的 Codex 插件已启用并经过身份验证。 Codex 提供 Logbook 所需的结构化图像提取合同。使用`openclaw models auth login --provider openai`登录；有关其他身份验证路径，请参阅 [Codexharness](/plugins/codex-harness)。
- 一个可用的默认 agent 模型。Logbook 会在视觉处理之后使用它来合成 cards、站会笔记以及 day Q&A。

## <a id="quickstart"></a> 快速开始

启用 Codex 和 Logbook 插件：

```bash
openclaw plugins enable codex
openclaw plugins enable logbook
```

配置显式视觉模型以使启动可预测：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
      logbook: {
        enabled: true,
        config: {
          visionModel: "codex/gpt-6-astra",
        },
      },
    },
  },
}
```

如果您使用 `plugins.allow`，请同时包含 `codex` 和 `logbook`。插件配置更改会自动应用默认的混合重新加载模式（请参阅 [Hot reload](/gateway/configuration/hot-reload)）。如果网关处于离线状态，请启动它，然后检查注册并打开仪表板：

```bash
openclaw plugins inspect logbook --runtime --json
openclaw nodes status --connected
openclaw nodes describe --node <idOrNameOrIp>
openclaw dashboard
```

节点描述必须包含 `screen.snapshot` 或 `logbook.snapshot`。 无头节点仅在插件激活后才会公开 `logbook.snapshot`。 如果命令缺失，请参阅 [节点故障排除](/nodes/troubleshooting)。

Logbook 选项卡仅对已启用的插件和 `operator.write` Control UI 会话显示。状态行应显示 **Capturing**，且没有错误。 当分析窗口关闭时会出现时间线卡片，或者你也可以在活动已被捕获后选择 **Analyze now**。

## <a id="how-it-works"></a> 工作原理

1. **Capture**：每隔`captureIntervalSeconds`（默认30秒），Logbook调用所选节点的捕获命令并存储缩放后的JPEG帧。连续的相同帧被标记为空闲并从分析中排除。
2. **Observe**：一旦分析窗口（默认为 15 分钟）过去，插件会采样最多 16 个活动帧并将它们发送到视觉模型，视觉模型返回带时间戳的活动观察结果（“VS Code：编辑 store.ts，修复类型错误”）。捕获间隙超过两分钟或当地午夜也会关闭当前窗口。
3. **综合**：将观察结果加上已有卡片最近 45 分钟的内容，修订为时间线卡片（每张 10-60 分钟），包含标题、摘要、类别、主要应用，以及任何简短的干扰项。
4. **清理**：删除早于 `retentionDays`（默认 14 天）的帧。卡片、观察结果以及缓存的站会记录会保留。

日期边界和时间线时钟使用 Gateway 的本地时区，而不是浏览器的时区。帧和 SQLite 时间线数据库位于 `<state-dir>/logbook/` 下。

启动在捕获开始之前完成存储恢复和修剪。关闭会停止新的工作，并在关闭存储之前等待已接受的数据库和模型操作。 SQLite 在主机拥有的工作线程中运行打开、查询、交易、维护和关闭操作。帧读取和修剪共享许可，因此预览和分析会在保留删除文件之前完成读取文件。

## <a id="model-and-data-flow"></a> 模型与数据流

Logbook 使用两条独立的模型路由：

| 阶段            | 发送的数据                                                 | 模型路由                                                       |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| 观察          | 最多 16 张采样的 JPEG 帧及其捕获时间     | `visionModel`，或一个兼容的借用 `tools.media` Codex 条目 |
| 合成卡片 | 带时间戳的观察内容和最近的时间线卡片        | 通过插件 LLM 运行时使用默认代理模型                |
| 生成站会 | 所选日期和前一天的卡片               | 通过插件 LLM 运行时使用默认代理模型                |
| 询问你的一天     | 问题、所选日期的卡片和最近的观察 | 通过插件 LLM 运行时使用默认代理模型                |

完整的 SQLite 数据库不会发送给任一模型。原始截图只会发送到观察阶段；卡片合成、站会和问答接收的是派生文本。

## <a id="configuration"></a> 配置

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
      logbook: {
        enabled: true,
        config: {
          captureEnabled: true,
          captureIntervalSeconds: 30,
          analysisIntervalMinutes: 15,
          nodeId: "my-mac",
          screenIndex: 0,
          maxWidth: 1440,
          visionModel: "codex/gpt-6-astra",
          retentionDays: 14,
        },
      },
    },
  },
}
```

所有 Logbook 配置键都是可选的。数值会四舍五入为整数，并限制在支持的范围内。

| 键                       | 默认值 | 范围或取值         | 行为                                                                                     |
| ------------------------- | ------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `captureEnabled`          | `true`  | 布尔值                 | 新快照的持久主开关；当为 `false` 时，时间线仍然可用      |
| `captureIntervalSeconds`  | `30`    | `5`-`600`               | 两次捕获尝试之间的延迟                                                               |
| `analysisIntervalMinutes` | `15`    | `3`-`120`               | 目标观察窗口；间隔和午夜可能会更早结束                            |
| `nodeId`                  | 未设置   | node id 或显示名称 | 将捕获固定到一个已连接节点；匹配不区分大小写                             |
| `screenIndex`             | `0`     | `0`-`16`                | 从零开始的显示索引                                                                     |
| `maxWidth`                | `1440`  | `480`-`3840`            | 请求的捕获尺寸上限；无头 macOS 会将其应用于最长边               |
| `visionModel`             | 未设置   | `provider/model`        | 显式的结构化路由；格式错误的引用会暂停分析，不受支持的提供方会使批处理失败 |
| `retentionDays`           | `14`    | `1`-`365`               | 删除旧帧；卡片、观察结果和站会记录会保留                                 |

如果没有 `nodeId`，Logbook 更喜欢暴露 `screen.snapshot` 的连接应用程序节点，然后回退到暴露 `logbook.snapshot` 的无头节点。在取消固定的设置中，故障节点将轮换到其他符合条件的节点后面。仪表板暂停切换仅适用于会话，并在插件重新加载或网关重新启动时重置；使用 `captureEnabled: false` 进行持续停止。

### <a id="vision-model-selection"></a> Vision 模型选择

Logbook 按以下顺序解析观察模型：

1. `plugins.entries.logbook.config.visionModel`
2. `tools.media.models`下第一个具有图像功能的Codex条目

其他媒体提供商会被跳过，因为它们没有公开 Logbook 所需的结构化提取合同。设置 `tools.media.image.enabled: false` 会禁用借用媒体默认设置，但显式日志 `visionModel` 仍然适用。

## <a id="dashboard-tab"></a> 仪表盘标签页

- **时间线**：按活动展开的卡片，带有类别颜色、主应用、分心项标签和快照关键帧。
- **一天概览**：专注比例、类别分布、主要应用。
- **每日站会**：将昨天和今天整理成可直接粘贴的更新内容。
- **询问你的日程**：根据跟踪的时间线回答自然语言问题（“我什么时候审查了 gateway PR？”）。
- **立即分析**：立即关闭当前捕获窗口，而不是等待分析间隔。

## <a id="gateway-methods"></a> Gateway 方法

Logbook 注册了以下 Gateway RPC 方法：

| 方法                | 参数               | 范围            | 结果                                                                   |
| --------------------- | ------------------------ | ---------------- | ------------------------------------------------------------------------ |
| `logbook.status`      | 无                     | `operator.read`  | 捕获、分析、模型、节点、Gateway 日期和 Gateway 时区状态 |
| `logbook.days`        | 无                     | `operator.read`  | 带有 timeline-card 数量和 card 时间边界的日期                      |
| `logbook.timeline`    | `{ day?: "YYYY-MM-DD" }` | `operator.read`  | 派生卡片和日期统计；默认使用 Gateway 的当前日期  |
| `logbook.frames`      | `{ startMs, endMs }`     | `operator.write` | 请求的 epoch 毫秒范围内的 frame 元数据                  |
| `logbook.frame`       | `{ frameId }`            | `operator.write` | 一张原始 JPEG frame，以 base64 编码                                             |
| `logbook.standup`     | `{ day?, refresh? }`     | `operator.write` | 某一天缓存或重新生成的 standup 文本                             |
| `logbook.ask`         | `{ day?, question }`     | `operator.write` | 基于 timeline 的某一天问答结果                                       |
| `logbook.capture.set` | `{ paused }`             | `operator.write` | 仅限会话的暂停状态及更新后的状态                              |
| `logbook.analyze.now` | 无                     | `operator.write` | 开始待处理分析，或返回无法开始的原因          |

读取方法返回运行状态或派生文本。原始截图像素、模型花费操作和运行时变更需要 `operator.write`。Control UI 选项卡也需要 `operator.write`，因为它暴露了这些操作和原始 frame 预览；只读客户端仍然可以直接调用派生文本方法。

## <a id="privacy-notes"></a> 隐私说明

- 快照可​​以包含屏幕上的任何内容，包括秘密。帧永远不会离开机器，除非作为配置的观察模型的采样输入。
- 在卡片合成、站立生成或问答过程中，观察、最近的卡片和问题可以通过默认代理模型离开机器。将提供者的数据处理策略应用于两个模型路由。
- 当您需要完全本地管道时，请对结构化观察模型和默认代理模型使用本地路由。
- Frames、时间线数据库和临时捕获是使用仅限所有者的文件权限写入的。
- 将 `screen.snapshot` 添加到 `gateway.nodes.commands.deny` 是屏幕捕获终止开关：它会阻止应用程序节点捕获和 Logbook 自己的 `logbook.snapshot` 命令。
- 设置`tools.media.image.enabled: false`也会阻止Logbook借用媒体图像模型进行分析；然后只使用插件配置中的显式 `visionModel` 。

## <a id="troubleshooting"></a> 故障排查

### <a id="the-logbook-tab-is-missing"></a> Logbook 选项卡缺失

检查这三个条件：

1. `openclaw plugins list --enabled` 包含 `logbook`。
2. 插件或白名单更改已成功应用；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。
3. Control UI 连接具有 `operator.write`；只读会话不会接收交互式选项卡描述符。

如果设置了 `plugins.allow`，推荐配置中它必须同时包含 `logbook` 和 `codex`。

### <a id="capture-reports-an-error"></a> 捕获报告错误

```bash
openclaw nodes status --connected
openclaw nodes describe --node <idOrNameOrIp>
openclaw logs --follow
```

- 确认节点暴露`screen.snapshot`或`logbook.snapshot`。
- 在捕获Mac上授予屏幕录制权限。
- 如果配置了`nodeId`，请确认其与节点ID或显示名称匹配。
- 检查`gateway.nodes.commands.deny`不包含`screen.snapshot`。

连续失败三次后，Logbook 会退避十个 capture ticks， 然后重试。未固定的设置可能会轮换到另一个符合条件的节点。

### <a id="captures-succeed-but-no-cards-appear"></a> 捕获成功但未出现卡片

- **Model missing** 状态表示未找到兼容的结构化视觉路径。 启用并认证 Codex 插件，或设置有效的显式 `visionModel`。 在模型缺失期间，已捕获的帧会保持待处理状态，并且在配置修复后可被分析。
- 等待 `analysisIntervalMinutes`，或在捕获到活动后选择 **Analyze now**。
- 连续相同的帧属于空闲证据，不会进入分析批次。测试前请更改可见屏幕。
- 如果最新批次显示错误，请修复模型或认证问题，然后选择 **Analyze now**。失败的批次仅会在该显式操作下重试，以避免重复消耗模型费用。

存储卡中格式错误的干扰 JSON 导致时间线读取明显失败；它不会被视为空的干扰列表。存储的卡保持不变。

## <a id="related"></a> 相关内容

- [管理插件](/plugins/manage-plugins)
- [Codex 运行环境](/plugins/codex-harness)
- [媒体理解](/nodes/media-understanding)
- [节点](/nodes)
- [节点故障排查](/nodes/troubleshooting)
- [控制 UI](/web/control-ui)
