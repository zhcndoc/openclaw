---
title: "代理运行时架构"
summary: "OpenClaw 如何组织内置代理运行时：代码布局、边界、资源清单和运行时选择。"
---

OpenClaw 拥有内置代理运行时。运行时代码位于 `src/agents/` 下，model/provider 传输位于 `src/llm/` 下，`openclaw/plugin-sdk/*` 桶公开面向插件的合约。

## <a id="runtime-layout"></a> 运行时布局

| 路径                                | 负责内容                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/agents/embedded-agent-runner/` | 内置尝试循环（`run.ts`、`run/`）、模型选择与提供方规范化（`model*.ts`）、按提供方的请求参数（`extra-params.*`）、压缩、转写以及会话连接。                            |
| `src/agents/sessions/`              | 会话持续性（`session-manager.ts`）、资源发现（`package-manager.ts`， `resource-loader.ts`）， 会话中`extensions`加载、提示模板、技能、主题等TUI-支持的工具渲染器（`tools/`）。 |
| `packages/agent-core/`              | 可复用的 agent 核心（`@openclaw/agent-core`）：agent 循环、harness 类型、消息、压缩辅助、提示模板、技能，以及会话存储契约。                                                           |
| `src/agents/runtime/`               | OpenClaw 外观层，将 `@openclaw/agent-core` 连接到插件 SDK LLM 运行时，并重新导出它及本地代理工具。                                                                                             |
| `src/agents/agent-tools*.ts`        | OpenClaw- 拥有的工具定义、参数模式、工具策略、before/after 工具调用适配器和 host/sandbox 编辑工具。                                                                                            |
| `src/agents/agent-hooks/`           | 内置运行时钩子：压缩保护措施、压缩说明、上下文修剪。                                                                                                                                   |
| `src/agents/harness/`               | 内置和由插件注册的 harness 的注册表、选择策略与生命周期。                                                                                                                       |
| `src/llm/`                          | Model/provider 注册表、传输帮助程序和特定于提供商的流实现 （`src/llm/providers/`）。                                                                                                          |

## <a id="boundaries"></a> 边界

Core通过OpenClaw模块和SDK桶调用内置运行时。没有保留任何外部代理框架包。插件使用记录的 `openclaw/plugin-sdk/*` 入口点，并且不导入 `src/**` 内部。

`@earendil-works/pi-tui` 仍然是一个第三方依赖：它是本地 TUI 和会话工具渲染器使用的终端组件工具包。将其内化将是单独的 vendor 化工作。

## <a id="manifests"></a> 清单

资源包在 `package.json` 元数据中声明 OpenClaw 资源。条目是相对于包根目录的文件路径或 glob：

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

清单中未列出的资源类型会回退到发现约定的 `extensions/`、`skills/`、`prompts/` 和 `themes/` 目录。

## <a id="runtime-selection"></a> 运行时选择

- 内置运行时ID是`openclaw`。旧别名 `pi` 标准化为 `openclaw`。别名 `codex-app-server` 标准化为 `codex`。
- 插件利用注册额外的运行时ID（例如`codex`）。
- 运行时策略是 model/provider-scoped `agentRuntime.id` 配置（模型条目胜过提供程序条目）。未设置或 `default` 解析为 `auto`。
- `auto` 会选择一个支持有效提供商路由的已注册插件宿主，否则使用内置 OpenClaw 运行时。仅提供商或模型前缀本身绝不会选择宿主。
- OpenAI 可以隐式选择 `codex`。这种情况仅发生在没有编写请求覆盖的确切官方 HTTPS 平台响应或 ChatGPT 响应路由上。完成适配器、自定义端点和具有创作请求行为的路由保留在 `openclaw` 上。明文官方 HTTP 端点被拒绝。请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)。

## <a id="model-runtime-generations"></a> 模型运行时代

网关启动和配置、插件或身份验证发布为每个配置的代理构建一个准备好的模型运行时生成。每一代都拥有已发现的身份验证模板、模型注册表和投影模型目录作为一个原子快照。代理从该快照运行 fork 可变身份验证和注册表存储。 Browse、status、cron、doctor、TUI、PDF 和图像路径读取已发布的目录，而不是重复文件系统发现。

独立嵌入式运行时在其激活边界发布相同的快照形状。失败或过时的一代永远不会与较新的部分一代一起服务。生命周期所有者必须首先发布完整的替换。

运行时选择在成为所有者密钥之前在请求代理的范围内解析。租赁许可会向前推进准备好的选择并读取确切的所有者的快照。重试必须观察更改的所有者或发布门；未更改的发布状态失败并出现可重试错误，而不是阻塞网关事件循环。

## <a id="compute-workers"></a> 计算工作者

代码模式执行、压缩规划和文件工具规划使用可重用的 `WorkerTaskPool`。它的调度程序和任务协议位于私有 `@openclaw/worker-runtime` 包中。 OpenClaw主机适配器拥有本机worker创建、资源托管和进程记账。插件使用公共 [worker SDK 入口点](/plugins/sdk-overview/infrastructure#worker-task-admission)。

该包将任务结果、执行结算和资源释放作为单独的事实保存。保留的任务可以返回结果，而其所有者仍然持有工作人员和输入费用。本机操作、数据库资源和清理收据使这种区别变得必要；仅靠通用任务队列并不能取代这些所有者。 [ 软件包贡献者指南](https://github.com/openclaw/openclaw/blob/main/packages/worker-runtime/README.md) 解释了主机边界、异步上下文生命周期和可重现的基准。

这些计算池在调用隔离内共享 CPU 准入限制 `max(1, availableParallelism() - 1)`，并尽可能为网关保留 CPU。有序数据库和模型生成工作人员保留其现有的独立限制。

即使在具有许多 CPU 的主机上，读取器池也最多只能有两个工作线程；额外读取会隔离复制加载的代码和缓存，而不会帮助队列已经很短的工作负载。计算池保留四人的上限，而写入器和单例保持串行。资金池按需创建工人并使用他们现有的闲置退休金。物理会话磁盘计数使用读取器限制，因此独立存储可以同时扫描，而无需为每个存储创建工作线程。共享状态读取器保留至少两个插槽，因此保留的结算读取不会阻止新的目录读取。前台成绩单历史记录和搜索也使用两名工作人员读者上限。 SQLite 代理在两个写入器隔离上复用独立的数据库所有者，保留每个数据库的排序，而无需在高核心主机上增加加载的后端。这些池保留其现有的准入和本地资源清理所有者。

文件工具工作人员执行纯编辑匹配、Unicode 标准化和差异计算。一份准备好的补丁同时提供显示和统一补丁收据，包括预览。文件工具调用者保留突变队列、文件系统访问、持久字节验证和权限检查；它在更改文件之前规划后重新验证授权和取消。写入收据保留其现有的大小和编辑距离限制。共享运行时进程注册表解析已安装包和密封可移植工作程序包中的规划工作程序。

准入包括排队、准备和运行任务。每个池默认有 128 个待处理任务和 256 个 MiB 生产者报告的保留输入；计算池也共享这些待定限制。生产者提供已知的输入大小，无需额外的序列化过程。此界限报告输入保留，而不是总工作堆使用情况。过多的工作失败并显示 `WorkerTaskError.code = "overloaded"`。取消保留执行许可和输入预留，直到工作线程停止并且异步输入准备完成。如果初始停止成功，则结果拒绝会跟随其执行接收，而无需等待准备。失败的停止可以提前拒绝，同时保留本地监护权和等待重试的收据。成功的池关闭加入了剩余的准备和输入清理；优雅的旋转可以在取消的准备工作解决之前完成。

等待计算池从代码模式主机交换请求检查点，以便嵌套工作可以继续进行。闲置工人释放CPU池空闲超时后进入并退出。当地的`node:diagnostics_channel`订阅者`openclaw.worker.task`可以观察队列、准备、执行挂起时间、消息传输时间和挂起时间task/input很重要。这些事件不包含任务输入；执行墙时间包括工作线程启动和主机等待。

模型上下文转录读取具有三分钟的本地工作期限，以允许在慢速硬件上冷启动。呼叫者取消仍然会停止读取。本地工作人员的截止日期会阻止模型回退，并且不会将提供商凭证标记为不健康。上下文读取失败报告“上下文准备本地超时”；重试请求并检查网关日志以了解缓慢的上下文读取（如果仍然存在）。实际提供者HTTP 408保留提供者超时和回退策略。

## <a id="related"></a> 相关内容

- [OpenClaw 代理运行时工作流](/openclaw-agent-runtime)
- [Agent 运行时](/concepts/agent-runtimes)
