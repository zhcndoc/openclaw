---
summary: "OpenClaw 如何在提供商和模型解析后选择harness，以及为什么大多数harness也注册提供商"
read_when:
  - "您需要知道 `auto` 何时选择插件harness"
  - "选择了令人惊讶的harness并且您正在调试它"
  - "您正在将harness与提供者插件配对"
title: "代理harness选择政策"
sidebarTitle: "选拔政策"
---

OpenClaw 在提供程序和模型解析后如何选择harness、故障对模型后备链的影响以及为什么harness通常与提供程序插件一起提供。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="selection-policy"></a> 选择策略

OpenClaw 会在 provider/model 解析之后选择 harness：

1. Model 范围的运行时策略优先。
2. Provider 范围的运行时策略其次。
3. `auto` 询问已注册的harness是否支持已解析的有效路线。 Provider/model 前缀永远不会单独选择harness。
4. 如果没有已注册的 harness 匹配，OpenClaw 会使用其内嵌运行时。

对于已配置的模型，传输详细信息和请求覆盖来自同一选定模型行。精确模型 ID 优先于旧的提供程序前缀行，包括当精确行继承提供程序默认值时。

插件harness故障表现为运行故障。在 `auto` 模式下，嵌入式回退仅在没有注册的插件harness支持解析的 provider/model. 时适用。一旦插件harness声明运行，OpenClaw 不会通过另一个运行时重播同一回合，因为这可能会更改 auth/runtime 语义或重复的副作用。

harness开始任何模型工作之前发生的故障可能会使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `AgentHarnessPreflightError`。对于整个模型后备链，默认错误仍然是终端。仅当故障发生在所选harness本地时才通过 `{ scope: "harness" }`，并且在同一harness上重试另一个模型会重复该问题。 OpenClaw 在尝试边界记录实际选择的工具，仅跳过被证明使用该工具的后来候选者，并通过其正常运行时和策略检查运行任何不同拥有的候选者。插件选择加入范围，但永远不会在错误上指定harness所有者。在请求或工具操作可能产生副作用后，请勿使用harness范围。

配置的运行时策略对于所需的运行时仍然具有权威性。耐用的原生harness别针可保留其转录本所有者；即使模型选择被锁定，在插件拥有的具体模型聊天中观察到的harness也不会成为 pin。对于具体模型执行，请求和引脚都不会使不兼容的路由兼容：harness必须支持准备好的事实，声明确切的请求 OpenClaw 回退，或者拒绝运行。 [绑定本机会话所有权](/plugins/sdk-agent-harness#bound-native-session-ownership)单独标识其经过验证的本机连接拥有模型和身份验证的会话，因此不相关的外部路由元数据不会替换该连接。

下一回合元数据使用注册的支持决策并保留其 model/provider/session 源。历史生产者观察并不能确定下一个回合。投影从不加载harness或读取凭证。准备状态是明确的：丢失的 `runtimePolicy` 保持未声明状态，而不是从碰巧存在的任何传输字段中推断出来。当harness拥有的身份验证留下多个未解析的物理路由时，准备好的支持事实是它们兼容的运行时id和报告请求覆盖的交集（如果任何候选者拥有它们）。因此，一个未声明的候选者使本机兼容性成为空； `preparedAuth.source: "harness"` 是身份验证所有者，没有推断路由支持的权限。

如果所选工具令人惊讶，请启用 `agents/harness` 调试日志记录并检查网关的结构化 `agent harness selected` 记录：它包括所选工具 ID、选择原因、runtime/fallback 策略，以及在 `auto` 模式下每个候选插件的支持结果。

捆绑的 Codex 插件将 `codex` 注册为其harness ID。 Core 将其视为普通的插件harness ID； Codex-特定别名属于插件或操作员配置，而不是共享运行时选择器。

## <a id="provider-plus-harness-pairing"></a> provider 与 harness 配对

大多数 harness 还应同时注册一个 provider。provider 会将模型引用、认证状态、模型元数据以及 `/model` 选择暴露给 OpenClaw 的其他部分。随后 harness 通过 `supports(...)` 声明对该 provider 的认领。

捆绑的 Codex 插件遵循此模式：

- 首选用户模型参考：`openai/gpt-6-astra`
- 兼容性 refs: 旧的 `codex/gpt-*` refs 仍然被接受，但新的配置不应再将它们用作常规 provider/model refs
- harness ID：`codex`
- auth：针对具体请求准备了OpenAI route/profile策略；已验证的本机身份验证绑定使用其本机连接
- app-server 请求: OpenClaw 将裸模型 id 发送给 Codex，并让 harness 与原生 app-server 协议交互

Codex 插件是附加的。在未设置运行时策略或 `auto` 的情况下，仅当其提供商拥有的路由合约声明 `codex` 兼容时，OpenAI 才可以选择 Codex：确切的官方 HTTPS 平台响应或 ChatGPT 响应路由，没有编写的请求覆盖。仅 `openai/*` 前缀永远不会选择 Codex。自定义端点、完成适配器和编写的请求行为保留在 OpenClaw 上。明文官方 HTTP 端点被拒绝。较旧的 `codex/gpt-*` 参考仍然是兼容性输入。请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)。

有关操作员设置、模型前缀示例和 Codex-only 配置，请参阅 [Codex Harness](/plugins/codex-harness)。

Codex 插件强制执行 [Codex Harness](/plugins/codex-harness) 中记录的最低应用程序服务器版本。它检查初始化握手并阻止旧的、格式错误的或未版本控制的服务器。许可允许启动继续进行；它并不能证明以后的运行时或功能操作会成功。
