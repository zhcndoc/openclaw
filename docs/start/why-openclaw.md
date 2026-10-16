---
summary: "OpenClaw 的架构案例：可信网关、不可信执行、代码强制执行的策略和版本化状态，逐个源与单进程工具进行比较"
read_when:
  - "您正在评估供团队或企业使用的代理harness"
  - "您需要向安全团队解释 OpenClaw 与单进程harness有何不同"
  - "您需要可信网关/不可信执行参数的可引用版本"
  - "您想知道OpenClaw的企业深度是否使其适合个人使用"
title: "为什么是OpenClaw"
---

OpenClaw 是一个可扩展、主动、开源的 AI 代理，可在您工作的任何地方工作。它的存在是因为软件是逆向的：几十年来，你走到电脑前，打开应用程序，点击屏幕，然后自己完成工作。相反，代理会代表您在您的计算机上、您的消息中、针对您的帐户进行操作。

这种倒置就是为什么代理感觉像是某个事物的开始，而不是另一个产品周期，也是为什么它们比您之前安装的任何东西都值得更多的审查：一个为您服务的助手，在真实的计算机上保存凭据、阅读邮件并运行命令。早在任何策略决定它“可以”做什么之前，架构就决定了它“可以”做什么。

该项目由[开爪Foundation](https://openclaw.org)，一个独立的501（c）（3）其使命是使AI为每个人提供个性化、有趣和授权：您的代理、您的机器、您的规则。它建立在对持续存在的开源项目（Linux、Apache、Mozilla）之所以能够忍受，是因为有一个中立的管理者站在他们身后。

该基金会与 [ 捐助者和合作伙伴 ](https://openclaw.ai/blog/introducing-openclaw-foundation/) 合作，包括 Amazon、Atlassian、GitHub、Microsoft、NVIDIA、OpenAI、红帽和腾讯等 30 多个组织。它拥有一支全职团队，以自己的身份签署版本，并由基金会召集有关代理身份、代理配置文件、评估和企业部署的委员会。我们的目标是成为 AI 的瑞士：为每个模型和每个实验室提供中立的基础，并为任何人（个人或企业）提供最成熟、经过实战考验的代理。

从评价来看，治理不是装饰。它回答了谁控制路线图、谁签署您部署的内容以及当任何一个供应商的激励措施发生变化时会发生什么。

代理平台通常提供 [channels](/channels)、[tools](/tools)、[memory](/concepts/memory)、[skills](/tools/skills)、 [调度](/automation)。特征表不建立安全模型。主要区别是 **（信任边界所在）** 和 **（策略是在代码中强制执行还是在系统提示符中请求）**。

单个信任信封可以将代理循环、通道连接、凭证和 shell 置于一个 OS 用户之下。将整个应用程序包装在 VM 中可将其与主机隔离，但不会将这些组件彼此分离。

反复比较的是 [Hermes Agent](https://github.com/NousResearch/hermes-agent/tree/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70)，其 [ 安全策略 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/SECURITY.md) 指出：

> 针对对手 LLM 的唯一安全边界是操作系统。

OpenClaw 可以将受信任的 [Gateway](/gateway) 与不受信任的可移动执行分开。策略在代码中强制执行，状态进行版本控制和迁移，因此部署是可替换的。此页面比较配置的架构，而不是默认的安全认证：OpenClaw 中沙箱默认处于关闭状态。源审查于 2026 年 8 月 27 日针对 [OpenClaw `7b624e9de25`](https://github.com/openclaw/openclaw/tree/7b624e9de25bc66c97166071c8d05f055d82ec54) 和 [Hermes Agent `6defe7eb6c`](https://github.com/NousResearch/hermes-agent/tree/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70) 进行了刷新。这些是开发快照；在依赖某项功能之前，请检查您安装的版本和配置。

良好的harness涵盖整个系列：同一产品在一台笔记本电脑上作为个人助理运行，并作为强化的团队部署运行，配置是唯一的区别。没有企业版。如果您自己运行 OpenClaw，系统会为您调整默认值，并且无需执行任何操作。下面的属性被表述为企业评估，因为这是最严厉的受众，但它们中的每一个都以相同的方式保护单个操作员：代理永远不会看到的凭据、保留的删除、拒绝破坏状态的升级。

## <a id="what-an-enterprise-harness-has-to-prove"></a> 企业harness必须证明什么

七个可测试的属性：

1. **分离的信任边界。** 执行移动到沙箱、节点或一次性云计算机中，无需常设网关凭证；作用域工作人员凭证具有单独的生命周期。
2. **Policy 是代码。** 拒绝是结构性的，而不是要求模型遵守的请求；验证失败时，批准路径会拒绝请求。
3. **经过身份验证的访问，有界角色。** 入站访问默认拒绝并经过身份验证；人们的角色是有限的；供应商说明哪些边界是安全的，哪些边界是便利的。
4. **秘密有所有者。** 可隔离的凭证故障会降低其所有者的身份；入口验证和无效配置失败会停止启动。
5. **版本化状态，受保护的升级。** 状态采用拥有的迁移进行模式版本控制；升级通过发布渠道进行保护和交付。
6. **记录出处。** 内存、审计和交付使用记录的事实、明确的保留策略和记录的删除限制。
7. **独立管理。** 该许可证没有单独的企业版；发布由负责任的身份签署；安全记录是公开的。

<a id="where-each-section-moved" />

## <a id="how-openclaw-answers"></a> OpenClaw如何回答

简短的答案，以及链接页面上的详细信息和限制：

- <a id="the-trust-boundary" />**隔离限制了受损执行的范围。** 配置的沙箱、节点和云工作人员将执行与网关权限分开；暴露仍然取决于工具、安装、网络策略和范围凭证。 （[信任边界](/start/why-openclaw/the-trust-boundary)）
- <a id="policy-as-code" />**配置的策略在代码中强制执行。** 工具可用性和执行拒绝不仅仅取决于模型合规性；需要批准的命令必须满足适用的约束规则。 （[保单代码为](/start/why-openclaw/policy-as-code)）
- <a id="identity-and-roles" />**Access 遵循配置的准入策略。** 配对模式通道挑战未知发送者，更广泛的设备范围需要批准；角色上限和拒绝所有默认角色需要配置。 （[身份与角色](/start/why-openclaw/identity-and-roles)）
- <a id="secrets" />**受保护的凭据可以远离模型上下文。** 受保护的秘密值使用句柄和支持的出口替换；代理可读条目、主机访问和允许的服务响应具有单独的暴露风险。 （[秘密](/start/why-openclaw/secrets)）
- <a id="versioned-state%2C-guarded-upgrades" /><a id="versioned-state-guarded-upgrades" />**版本检查防护升级。** 架构进行版本控制，更新程序检查兼容性，并且版本是不可变的和签名的。版本检查并不能保证每次升级都会成功。 （[版本状态](/start/why-openclaw/versioned-state-guarded-upgrades)）
- <a id="provenance" />**遗忘具有明确的边界。** 可清除归属内存，并且遗忘的会话记录可防止通过参与路径重新摄取；原始记录、未跟踪的写入和外部副本保持独立。 （[出处](/start/why-openclaw/provenance)）
- **基金会提供独立管理权。** MIT在独立的501（c）（3）基金会下，具有签署的发布和公共安全建议。建议计数并不是比较安全分数。 （[治理](#governance)）

<a id="openclaw-and-hermes-agent" />

[对照表](/start/why-openclaw/openclaw-and-hermes-agent)浓缩了与Hermes经过来源验证的对比。 [我们不主张的内容](#what-we-do-not-claim) 说明了限制，从默认情况下关闭沙箱开始。

## <a id="the-vendor's-harness%2C-as-a-plugin"></a><a id="the-vendors-harness-as-a-plugin"></a> 供应商的harness，作为插件

代理工具正在变得特定于模型：实验室在自己的循环内训练和评估他们的模型。 OpenClaw 将这些harness视为一流运行时，而不是 API 端点 （[agent 运行时](/concepts/agent-runtimes)）。 [Codex 插件](/plugins/codex-harness) 驱动 Codex 自己的应用程序服务器循环 - 本机线程恢复、压缩、批准、中间转弯转向、OpenClaw 工具桥接到 Codex 转弯、[ 计算机使用](/plugins/codex-computer-use) - Copilot 插件运行 GitHub Copilot SDK 的会话循环，Anthropic 插件通过其结构化 stdio 协议驱动已安装的 Claude Code 可执行文件，而 OpenClaw 保留通道、会话、策略和状态的所有权。选择权取决于运营商，取决于支持的路由、身份验证和请求设置。 [运行时选择](/concepts/agent-runtimes#runtime-selection)可以使用声明的回退到OpenClaw的内置循环；当确切的harness所有权很重要时，检查完整的运行时间。在 API 层集成这些供应商的网关让自己的执行器负责；供应商harness至多是一个可选的后端。

这种嵌入模式来自供应商。 OpenAI 构建了 Codex 应用程序服务器，以便合作伙伴可以“在自己的产品中嵌入相同的工具”（[解锁 Codex 工具](https://openai.com/index/unlocking-the-codex-harness/)），[ 在 8 月份描述了其开源工具和平台集成](https://developers.openai.com/blog/codex-as-a-platform) 2026； Anthropic 运送 [Claude Agent SDK](https://anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) 与为 Claude Code 提供动力的同一harness。相关的比较是集成保留了哪些本机生命周期和工具合同，而不是它是否仅仅命名了供应商的模型。

与其他 OpenClaw 功能一样，利用船舶作为插件来对抗故意保持较小的核心。通道、模型提供程序、内存、语音、Codex 工具 - 记录在案的 [ 功能注册点 ](/plugins/architecture) 后面的所有插件，其边界由 CI 导入防护强制执行，而不是约定。您可以删除您不需要的内容（剥离通道、禁用内存、运行最小表面、使用 `plugins.allow` 固定允许的集合），第三方可以通过相同的 [SDK 合约 ](/plugins/sdk-channel-plugins) 添加我们未构建的内容 - 包括整个消息通道，这就是社区插件如何覆盖核心从未触及的网络的方式。普通插件加载器在导入插件运行时代码之前会验证 [manifests](/plugins/manifest)。受信任的捆绑助手可以在路径验证后单独加载。

公共插件 SDK 发布了大约 150 个入口点，这些入口点仅在缩小的表面预算下进行，因此增长是一个有意识的决定。 Hermes 还拥有广泛的 [Python 插件 API](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/hermes_cli/plugins.py)，包括工具、平台、上下文引擎、内存、秘密源和媒体提供商，以及 [desktop 插件 SDK](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/website/docs/developer-guide/desktop-plugin-sdk.md)。它的七个同意功能 ID 描述了权限门，而不是 API 的大小。

[ClawHub](/clawhub) 是 OpenClaw 的注册表，其中包含 [publishing](/clawhub/publishing)、审核、[ 安全审核](/clawhub/security-audits) 以及安装过程中消耗的每次发布信任判决。 Hermes 还通过 Tap 存储库分发技能并维护 MCP 目录。 ClawHub 显示来自 VirusTotal、ClawScan 和静态分析的技能扫描状态，但待处理或过时的扫描可能允许安装时出现警告；安装并不能证明每次扫描都已完成。 [`openclaw skills verify`](/cli/skills) 检索 ClawHub 所选技能的验证信封，默认使用已安装的注册表和版本元数据；它不会散列当前本地文件。

## <a id="open-standards"></a> 开放标准

OpenClaw 采用 AI 工具中使用的协议。它是一个 [MCP 客户端 ](/tools/mcp)（可流式 HTTP、SSE 和 stdio 传输，带有 OAuth）和一个 [MCP 服务器 ](/cli/mcp)，并且插件可以 [ 发布自己的MCP 服务器和应用程序](/plugins/manifest/surfaces#mcp-server-reference)。其他代理通过 Linux 基金会 [A2A 1.0 协议 ](/channels/a2a)（代理卡发现、经过身份验证的 JSON-RPC 任务和出站对等消息传递）进行访问，编辑者通过 [Agent 客户端 Protocol](/cli/acp) 进行连接，这OpenClaw还使用[主机外部harness](/tools/acp-agents)。代理在会话仪表板上呈现实时 [A2UI 小部件 ](/web/dashboards)。

技能遵循 [AgentSkills 规范 ](/tools/skills)，插件安装自动检测 [Agent 插件、Codex、Claude 和光标捆绑布局 ](/plugins/bundles)，并且网关可以服务于[OpenAI 兼容 API](/gateway/openai-http-api)（`/v1/chat/completions` 具有记录的功能工具子集、[`/v1/responses`](/gateway/openresponses-http-api)、`/v1/models`、`/v1/embeddings`；默认禁用，`/v1/responses` 单独启用），以便 OpenAI 客户端可以定位网关直接。通过 [OpenTelemetry](/gateway/opentelemetry) 和 [Prometheus](/gateway/prometheus) 进行可观察性导出；网关通过 [Bonjour 和 DNS-SD](/gateway/bonjour) 进行广告；通道包括本机 [Matrix](/channels/matrix)、[IRC](/channels/irc) 和 [Nostr](/channels/nostr) 协议实现；并发布带有 [npm 出处和可验证工件证明 ](/reference/RELEASING) 的版本。

## <a id="working-together"></a> 一起工作

如今，大多数座席辅助工作都是在一个人与一台终端之间进行；其他人看到完成的提交。共享的 OpenClaw 网关使工作本身可以被观察到。 [Sessions](/concepts/session) 带有一个不可变的创建者、一个可分配的所有者和实际提示的人； [Control UI](/web/control-ui) 显示正在实时查看和输入 ](/concepts/presence) 的 [（草稿保持短暂状态，永远不会到达模型或转录本），侧边栏按所有者或“涉及我”进行过滤（[ 多用户 ](/concepts/multi-user)）。在频道中开始的对话可以作为整个团队可以打开、引导和接管的会话继续。

OpenClaw供应准确`Co-authored-by`经验证合格的共享会话参与者的预告片GitHub身份和**Git 合著者信用**启用，按记录的贡献总量排序。默认情况下，已验证帐户的信用处于开启状态，并且可以在个人资料中禁用。网关发布代理在其生成的提交和拉取请求中强制执行该信用；普通的 Git 依赖于遵循会话系统提示的代理。当外部HTTPS会话URL可用时，代理创建的拉取请求以团队会话的链接结束（[用户模型](/concepts/user-model)），因此具有访问权限的审阅者可以阅读产生差异的对话。本地编码会话可以近乎实时地镜像到团队网关[光束](/plugins/beam)， 和[云工作者](/gateway/cloud-workers)将执行放在一次性机器上，而记录则保留在一个共享位置。[门户网站](/gateway/portals)通过网关将座席的开发服务器代理到运营商的浏览器中，Cloud Worker Desktop 进行实时流式传输VNC工作人员的视图——仅经过身份验证的环回RFB服务器，通过工作人员自己的出站连接通过一次性代理票证到达，从不公开入口，具有仅查看过滤和单控制器仲裁。 Hermes 还提供视觉观察：其桌面应用程序[转发远程开发服务器SSH](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/apps/desktop/electron/preview-reach.ts)，及其[Camofox 集成可以公开浏览器VNC观众](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/tools/browser_camofox.py#L154)。这些是不同的传输和范围OpenClaw的网关代理的工作人员桌面。OpenClaw在维护者自己的团队网关上的共享会话中开发；中的角色、归因和审计面[身份和角色](/start/why-openclaw/identity-and-roles)和[出处](/start/why-openclaw/provenance)支持该工作流程。要为您自己的团队进行设置，请按照[团队设置](/start/teams)。

## <a id="governance"></a> 治理

整个OpenClaw产品是MIT-许可的，没有不同许可下的企业版，并且受上面介绍的[OpenClaw Foundation](https://openclaw.org)的管辖。基金会的管理权体现在架构中：提供者是插件，任何实验室的模型都没有特权。版本以基金会身份签署和发布。

该基金会由捐款资助，不出售任何东西：没有付费等级，没有托管服务，没有代币。默认情况下，安装向 Foundation 发出的唯一请求是版本检查，[`update.checkOnStart: false`](/gateway/telemetry) 将其关闭；您配置的模型提供商和渠道的流量将流向他们，而不是我们。

Hermes 由 Nous Research 打造，Nous Research 是一家在美国上市的风险投资公司。[Paradigm 的产品组合](https://www.paradigm.xyz/portfolio)； TechCrunch报道[一轮 7500 万美元的融资，价格为 $1.5B估值](https://techcrunch.com/2026/07/13/hermes-agent-maker-nous-research-in-talks-for-new-funding-at-1-5b-valuation/)七月2026。同一份报告描述了Hermes的付费等级为$20 to $200按月为商业模式。这[赫尔墨斯README](https://github.com/NousResearch/hermes-agent)在第一个屏幕上呈现 Nous Portal，即该订阅，并且`hermes setup --portal`配置它。这[Nous门户隐私政策](https://portal.nousresearch.com/privacy)声明它会收集提示、上传和输出，并可能生成衍生数据集和模型，除非启用隐私模式。自托管的 Hermes 代理本身不发送遥测数据。

我们并不是说 Hermes 的工程技术更差。我们是说这两个项目针对不同的人。风险投资者期望获得回报，而所报告的回报计划是按 Hermes 等级支付的。 OpenClaw 唯一的义务是保持足够的有用性，以便人们不断捐款。选择您想要的激励措施。

第三方投资该架构：NVIDIA 的 [NemoClaw](https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw) 发行版通过 OpenShell 内核级沙箱强化 OpenClaw，基础设施供应商为其发布 [ 生产强化指南](https://nebius.com/blog/posts/openclaw-security)，以及[学术安全案例研究](https://arxiv.org/html/2603.12644v1)分析架构和目录威胁。这些出版物描述了他们自己过时的快照，而不是当今配置的认证。

OpenClaw [发布存储库安全建议](https://github.com/openclaw/openclaw/security/advisories)，并附有书面的[信任模型](/gateway/security)、[事件响应计划](/security/incident-response)以及来自NVIDIA和腾讯的安全贡献者。 2026 年 8 月 27 日，公共存储库咨询列表包含 647 个 OpenClaw 咨询和 [，没有 Hermes 咨询 ](https://github.com/NousResearch/hermes-agent/security/advisories)。 Hermes 已通过第三方 CNA 发布了 CVE。这些计数描述的是披露记录，而不是当前可利用的缺陷数量或比较安全评分。

## <a id="what-we-do-not-claim"></a> 我们不主张什么

- 沙箱和执行批准默认处于关闭状态。默认OpenClaw是值得信赖的单操作员助手。强化是经过深思熟虑的配置，当您偏离它时，`openclaw security audit` 会告诉您。
- 一个网关是一个信任域。角色和会话所有权是协作的护栏。相互不信任的租户需要单独的网关，最好是在单独的 OS 用户或主机下。
- Native 插件在进程内运行且未沙箱化。缓解措施包括允许列表、安装策略挂钩、固定版本、依赖项锁定和 CI-enforced SDK 边界。 OpenClaw 和 Hermes 都需要信任已安装的本机插件。
- Egress 允许列表仅涵盖合作流量。 [秘密出口代理](/gateway/secrets)在其旁路幸存哨兵之上获得了网关托管执行程序的选择加入流量白名单（2026年8月），沙盒执行默认为内核强制执行的`network: "none"`或在[OpenShell下运行后端的](/gateway/openshell)默认拒绝策略白名单，但来自未沙箱主机执行的原始套接字响应操作员提供的[proxy](/security/network-proxy)或主机策略，而不是OpenClaw。其他地方的白名单代理已经发布了绕过方法；哨兵设计假设绕过而不是试图阻止它。
- 升级存储器没有基于时间的保留界限。 Provenance 和 [`openclaw memory forget`](/cli/memory) 涵盖跟踪的工件；准入排除适用于梦想摄取和会话回填，而不是直接写入、挂钩或原始成绩单索引。单独查看 [ 删除限制 ](/concepts/memory-provenance#what-deletion-does-not-cover)。转向污点涵盖网络来源的工具输出；通过非网络工具到达的文本不会污染回合。
- `gateway.roles` 出现在已审核的 2026 年 8 月源快照中。在依赖之前检查您安装的版本。

## <a id="the-hardened-setup"></a> 强化设置

每个企业配置项都链接到其参考：

- 沙箱：`agents.defaults.sandbox.mode: "all"`，带有 [`openshell`](/gateway/openshell) 或 [`docker`](/gateway/sandboxing) 后端； `workspaceAccess: "ro"` 除非代理拥有工作区。
- 每个会话选择 [`guarded` 或 `workspace`](/gateway/permission-modes)； `full` 需要 `operator.admin`。没有模式的会话（包括托管工作树会话）使用配置的 tool/exec 策略。
- 在网关前面使用 [Tailscale](/gateway/tailscale) 或 [ 身份感知代理 ](/gateway/trusted-proxy-auth)；定义 [`gateway.roles`](/gateway/operator-scopes) 并设置拒绝全部默认值；将 DM 策略保留在 [pairing](/channels/pairing) 上。
- [SecretRefs](/gateway/secrets) 背后的一切；针对 CI 中的配置运行 `openclaw secrets audit --check`。
- 启用[消息审计](/gateway/audit)；将 [OpenTelemetry](/gateway/opentelemetry) 导出到您的 SIEM，并由运营商保留并监控丢失的数据。
- 在其检查 ID 上安排 [`openclaw security audit --deep`](/gateway/security/audit-checks) 和警报。

然后将其作为可替换基础设施进行操作：固定一个通道，让 [doctor](/cli/doctor) 拥有自己的迁移，通过验证恢复 [backups](/cli/backup)，然后重新部署而不是修复部署。

欢迎更正本页面上有关 OpenClaw 或其他内容的任何声明，作为问题或拉取请求。
