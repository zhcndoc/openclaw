---
doc-schema-version: 1
summary: "回购支持的种子资产、提供商模拟通道、传输适配器以及添加通道所需的内容。"
read_when:
  - "您正在添加 QA 场景或种子资产"
  - "您正在添加或扩展传输适配器"
title: "扩展 QA 堆栈"
---

## <a id="repo-backed-seeds"></a> 仓库支持的种子

种子资产位于 `qa/`：

- `qa/scenarios/index.yaml`
- `qa/scenarios/<theme>/*.yaml`

身份敏感通道变更使用隔离的 `channel-participant-identity-inspection` QA 通道流。它驱动一个真正的临时网关和模拟提供程序，然后使用相同的 `openclaw audit --run ... --explain`、JSON 和人体表面操作员使用的内容检查已承认的运行。该流程包括生命周期拥有的重新启动和对被拒绝的预运行入口的行计数检查。

这些文件刻意保留在 git 中，以便 QA 计划对人和 agent 都可见。

`qa-lab` 仍然保持为通用的 YAML 场景运行器。每个场景 YAML 文件都是一次测试运行的单一事实来源，并且应定义：

- 顶层 `title`
- `scenario` 元数据
- `scenario` 中可选的 category、capability、lane 和 risk 元数据
- `scenario` 中的 docs 和 code refs
- `scenario` 中可选的插件需求
- `scenario` 中可选的网关配置补丁
- 用于 flow 场景的可执行顶层 `flow`，或 Vitest 和 Playwright 场景的 `scenario.execution.kind` / `scenario.execution.path`

支持 `flow` 的可重用运行时表面保持通用和横切。例如，YAML 场景可以将传输端帮助程序与浏览器端帮助程序相结合，通过网关 `browser.request` 接口驱动嵌入式 Control UI，而无需添加特殊情况运行程序。

场景文件应按产品功能而不是源树文件夹进行分组。文件移动时保持场景ID稳定；使用 `docsRefs` 和 `codeRefs` 进行实施可追溯性。

基线列表应保持足够广泛，以覆盖：

- DM 和频道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆召回
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小型构建任务，例如 Lobster Invaders。

### <a id="native-tool-discovery-proof"></a> Native工具发现证明

流可以声明特定于模型的配置运行时路由：

```yaml
execution:
  kind: flow
  liveConfiguredRuntime:
    id: codex
    model: openai/gpt-5.5
```

该路线仅适用于`live-frontier`，当`--model`和`--alt-model`都选择声明模型时。启动器通过相同的运行时路径准备单例和分区运行。其他选择保持其一般模型路线；显式强制运行时和运行时对单元保留其自己的准备。元数据不会覆盖模型选择或产品工具加载。

本机发现通道为两个模型插槽选择 `openai/gpt-5.5`。其 Codex 目录支持本机工具搜索，无需覆盖 `code_mode_only`。仅提供者身份并不能建立这种能力。共享可搜索夹具仅在 Codex 执行单元中需要链接的 `tool_search` 收据；直接的 OpenClaw 单元仍然可以证明工具调用和结果。 `sessions_spawn` 仍然是始终直接控制，并且不需要发现收据。

## <a id="provider-mock-lanes"></a> Provider 模拟通道

`qa suite` 有两个本地 Provider 模拟通道：

- `mock-openai` 是场景感知的 OpenClaw 模拟。它仍然是回购支持的 QA 和奇偶校验门的默认固定响应模拟通道。
- `aimock` 启动一个 AIMock 支持的提供程序服务器，用于实验协议、夹具、record/replay 和混沌覆盖。它是附加的，不会取代 `mock-openai` 场景调度程序。

场景感知模拟与代理轮流分开回答活动回顾请求。将引用对话文本作为数据进行概括，因此它们无法触发场景工具或输入 `/debug/requests` 返回的场景请求证据。

对于 IPv6 环回服务器，运行 `pnpm openclaw qa mock-openai --host ::1`。打印的URL包含括号，例如`http://[::1]:<port>`；配置客户端时使用该 URL。 QA 实验室还在其监听和通告的 URL 中将 IPv6 主机括起来。将裸地址传递给 `--host`。

提供商通道实施位于 `extensions/qa-lab/src/providers/` 下。每个提供商都拥有其默认设置、本地服务器启动、网关模型配置、身份验证配置文件暂存需求和 live/mock 功能标志。共享套件和网关代码通过提供程序注册表进行路由，而不是根据提供程序名称进行分支。

## <a id="transport-adapters"></a> 传输适配器

`qa-lab` 拥有适用于 YAML QA 场景的通用传输接口。 `qa-channel` 是合成默认值。 `crabline` 启动单独的本地提供商服务器，并针对其提供商形状的 REST 和流边界运行 OpenClaw 的正常通道插件；它不使用 Crabline 的夹具级本地模拟提供程序。 `live` 保留用于真实提供商凭证和外部渠道。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、制品写入和报告。
- 传输适配器负责网关配置、就绪检查、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 YAML 场景文件定义测试运行；`qa-lab` 提供执行它们的可复用运行时表面。

### <a id="adapter-shutdown-and-failure-hooks"></a> 适配器关闭和故障挂钩

可选的 QA 运行挂钩遵循主机拥有的一项拆卸顺序：

1. `cleanup()` 停止新的装置操作，同时保留待处理写入的凭证权限和所有权。最终收据所需的观察者可以通过网关关闭保持活动状态。绑定传输请求本身；场景截止日期不会解决已发送的请求。
2. 主机停止网关并确认进程关闭。
3. `captureBeforeGatewayCleanup()` 在删除临时网关状态之前对最终本机收据进行快照。每个网关生命周期都会成功捕获一次。抛出的错误会保留运行时证据并导致拆卸失败；它不会阻止停止后夹具的清理。
4. `cleanupAfterGatewayStop()` 解决挂起的写入和拥有的固定装置清理，然后释放凭证租约。如果未确认网关关闭，主机将保留此挂钩。报告失败而不是声称清理成功。

省略的钩子不执行特定于适配器的工作；正常的主机拆卸仍然运行。错误会在清理阶段累积。保持未知的远程写入结果明确，而不是推断所有权或重放写入。

可选的 `whenUnhealthy` 承诺 **解决**，而不是拒绝，并出现终端错误。主机中止主动流准入；适配器在清理过程中仍然拥有结算权。省略它的适配器保留其明确的运行状况检查和场景截止日期。

### <a id="adding-a-channel"></a> 添加一个通道

向 YAML QA 系统添加一个通道，需要通道实现以及一个用于验证该通道契约的场景包。对于烟雾 CI 覆盖，还要添加匹配的 Crabline 本地提供方服务器，并通过 `crabline` 驱动将其暴露出来。

当共享的 `qa-lab` 主机可以承担该流程时，不要新增一个顶层 QA 命令根。

`qa-lab` 负责共享主机机制：

- `openclaw qa` 命令根
- 套件启动与清理
- 工作线程并发
- 制品写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容别名

运行器插件负责传输契约：

- 如何将 `openclaw qa <runner>` 挂载到共享 `qa` 根命令下
- 该传输的网关如何配置
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何暴露转录和规范化的传输状态
- 如何执行基于传输的操作
- 受信任模块预加载网关运行时需求
- 如何处理传输特定的重置或清理

新增通道的最低接入门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根命令的所有者。
2. 在共享 `qa-lab` 主机接口上实现传输运行器。
3. 将传输特定的机制保留在运行器插件或通道 harness 中。
4. 将运行程序安装为 `openclaw qa <runner>`，而不是注册竞争根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners` 并从轻量级 `qa-runner-api.ts` 表面导出匹配的 `qaRunnerCliRegistrations` 数组。在作者迁移期间，使用已发布的 `runtime-api.ts` 合约安装的插件在 2026 年 10 月 1 日之前仍受支持。将运行程序执行保持在惰性入口点后面。可选的 `adapterFactory` 将传输公开给共享场景，而无需更改命令的现有场景目录。除非工厂声明每个实例都拥有独立的凭据或一次性服务器、网关状态和工件路径，否则同通道分区是串行的。模块支持的流场景还需要`adapterFactory.supportsModuleFlows: true`；这些工厂必须返回实现 `prepareFlow` 的适配器。
5. 在主题化的 `qa/scenarios/` 目录下编写或调整 YAML 场景。
6. 对新场景使用通用场景辅助函数。
7. 保持现有兼容别名继续有效，除非仓库正在进行有意的迁移。

决策规则是严格的：

- 如果某种行为可以在 `qa-lab` 中一次性表达，就放进 `qa-lab`。
- 如果某种行为依赖于某一个通道传输，就将其保留在对应的运行器插件或插件 harness 中。
- 如果某个场景需要一个多个通道都能使用的新能力，就添加一个通用辅助函数，而不是在 `suite.ts` 中加入通道特定分支。
- 如果某种行为只对某一种传输有意义，就让场景保持传输特定，并在场景契约中明确说明这一点。

### <a id="scenario-helper-names"></a> 场景辅助函数名称

新场景推荐使用的通用辅助函数：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容性别名仍然可用于现有场景 - `waitForQaChannelReady`、`waitForNoOutbound`、`formatConversationTranscript` 和 `resetBus` - 但新场景创作应使用通用名称。使用共享的 `waitForOutboundMessage` 进行出站检查，而不是添加特定于传输或通道的出站等待别名。
