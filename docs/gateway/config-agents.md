---
summary: "代理默认值、多代理路由、会话、消息和对话配置"
read_when:
  - "调整代理默认值（模型、思考、工作区、心跳、多媒体、技能）"
  - "配置多代理路由和绑定"
  - "调整会话、消息传递和对话模式行为"
title: "配置 — 代理"
---

位于 `agents.*`、`multiAgent.*`、`session.*`、`messages.*` 和 `talk.*` 下的代理作用域配置键。关于通道、工具、网关运行时以及其他顶级键，请参见 [配置参考](/gateway/configuration-reference)。

创建多代理集群时，OpenClaw 会写入 `agents.ownership: "explicit"`。此类集群没有默认代理：通道和环境服务需要绑定，或需要使用特定界面的 `agentId` 目标。升级期间，Doctor 会具体化旧版所有者；单代理配置无需此标记。

在全新安装时，交互式入门会询问第一个代理的名称并使用 `main` 作为建议值。自动加入将保留历史 `main` 默认值，除非您通过 `openclaw onboard --non-interactive --agent-name <name> ...`。唯一指定代理使用与 `main` 相同的默认工作区和共享身份验证存储；入门引导还会在完成之前将旧版 `agent:main:*` 会话历史记录迁移到该唯一所有者。

`main`是普通代理id。在指定代理拥有安装后重用它，因此旧数据永远不会被默默采用：`legacy-session-migration-required` 意味着 `openclaw doctor --fix` 必须完成或隔离旧的 `agent:main:*` 声明，而 `shared-auth-store-owned-by-main` 意味着 Doctor 必须首先将共享身份验证存储重新定位到 `state/openclaw.sqlite`。两次修复后，新的 `main` 会像任何其他代理一样获得新的代理范围会话和身份验证存储。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Configuration — 代理工作区和引导程序](/gateway/config-agents/workspace-and-bootstrap) — 工作区、cwd、存储库根、技能、引导程序注入、上下文预算、图像和时区。
- [配置 - 代理模型](/gateway/config-agents/models) - `agents.defaults.model`、后备链、每个用途的模型插槽和模型选择范围。
- [Configuration — 代理运行时和 CLI 后端](/gateway/config-agents/runtime-and-cli-backends) — 提供程序和模型的运行时策略、CLI 后端选择和 GPT-5 个性。
- [配置 — 代理心跳、压缩和流](/gateway/config-agents/heartbeat-compaction-and-streaming) — 心跳运行、系统代理、压缩、上下文修剪、块流和键入指示器。
- [Configuration — 代理沙箱](/gateway/config-agents/sandbox) — `agents.defaults.sandbox` 块：映像、工作区模式、安装和网络策略。
- [配置 — 每个代理条目和多代理路由](/gateway/config-agents/entries-and-multi-agent) — `agents.entries` 覆盖、`multiAgent` 绑定、绑定匹配字段和访问配置文件。
- [配置 — 代理会话](/gateway/config-agents/sessions) — `session.*` 范围、身份链接、重置策略、共享和保留。
- [配置 — 消息和对话](/gateway/config-agents/messages-and-talk) — `messages.*` 传送、前缀、确认反应、排队、TTS 和 `talk.*` 默认值。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个标题都在此处保留其锚点，因此现有链接（例如 `/gateway/config-agents#agents.defaults.model`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="agent-defaults" />[代理默认](/gateway/config-agents/workspace-and-bootstrap)
- <a id="agents.defaults.workspace" /><a id="agents-defaults-workspace" />[`agents.defaults.workspace`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.workspace)
- <a id="agents.defaults.cwd" /><a id="agents-defaults-cwd" />[`agents.defaults.cwd`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.cwd)
- <a id="agents.defaults.reporoot" /><a id="agents-defaults-reporoot" />[`agents.defaults.repoRoot`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.reporoot)
- <a id="agents.defaults.skills" /><a id="agents-defaults-skills" />[`agents.defaults.skills`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skills)
- <a id="agents.defaults.skipbootstrap" /><a id="agents-defaults-skipbootstrap" />[`agents.defaults.skipBootstrap`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skipbootstrap)
- <a id="agents.defaults.skipoptionalbootstrapfiles" /><a id="agents-defaults-skipoptionalbootstrapfiles" />[`agents.defaults.skipOptionalBootstrapFiles`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skipoptionalbootstrapfiles)
- <a id="agents.defaults.contextinjection" /><a id="agents-defaults-contextinjection" />[`agents.defaults.contextInjection`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextinjection)
- <a id="agents.defaults.bootstrapmaxchars" /><a id="agents-defaults-bootstrapmaxchars" />[`agents.defaults.bootstrapMaxChars`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.bootstrapmaxchars)
- <a id="agents.defaults.bootstraptotalmaxchars" /><a id="agents-defaults-bootstraptotalmaxchars" />[`agents.defaults.bootstrapTotalMaxChars`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.bootstraptotalmaxchars)
- <a id="per-agent-bootstrap-profile-overrides" />[每代理引导程序配置文件覆盖](/gateway/config-agents/workspace-and-bootstrap#per-agent-bootstrap-profile-overrides)
- <a id="bootstrap-truncation-notice" />[Bootstrap 截断通知](/gateway/config-agents/workspace-and-bootstrap#bootstrap-truncation-notice)
- <a id="context-budget-ownership-map" />[上下文预算所有权图](/gateway/config-agents/workspace-and-bootstrap#context-budget-ownership-map)
- <a id="agents.defaults.startupcontext" /><a id="agents-defaults-startupcontext" />[`agents.defaults.startupContext`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.startupcontext)
- <a id="agents.defaults.contextlimits" /><a id="agents-defaults-contextlimits" />[`agents.defaults.contextLimits`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextlimits)
- <a id="agents.entries.*.contextlimits" /><a id="agents-entries-contextlimits" />[`agents.entries.*.contextLimits`](/gateway/config-agents/workspace-and-bootstrap#agents.entries.*.contextlimits)
- <a id="skills.limits.maxskillspromptchars" /><a id="skills-limits-maxskillspromptchars" />[`skills.limits.maxSkillsPromptChars`](/gateway/config-agents/workspace-and-bootstrap#skills.limits.maxskillspromptchars)
- <a id="agents.entries.*.skillslimits.maxskillspromptchars" /><a id="agents-entries-skillslimits-maxskillspromptchars" />[`agents.entries.*.skillsLimits.maxSkillsPromptChars`](/gateway/config-agents/workspace-and-bootstrap#agents.entries.*.skillslimits.maxskillspromptchars)
- <a id="agents.defaults.imagemaxdimensionpx" /><a id="agents-defaults-imagemaxdimensionpx" />[`agents.defaults.imageMaxDimensionPx`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.imagemaxdimensionpx)
- <a id="agents.defaults.imagequality" /><a id="agents-defaults-imagequality" />[`agents.defaults.imageQuality`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.imagequality)
- <a id="agents.defaults.usertimezone" /><a id="agents-defaults-usertimezone" />[`agents.defaults.userTimezone`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.usertimezone)
- <a id="agents.defaults.model" /><a id="agents-defaults-model" />[`agents.defaults.model`](/gateway/config-agents/models#agents.defaults.model)
- <a id="agentsdefaultsmodelselectionscope" />[`agents.defaults.modelSelectionScope`](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)
- <a id="agents.defaults.modelselectionscope" /><a id="agents-defaults-modelselectionscope" />[`agents.defaults.modelSelectionScope`](/gateway/config-agents/models#agents.defaults.modelselectionscope)
- <a id="runtime-policy" />[运行时策略](/gateway/config-agents/runtime-and-cli-backends#runtime-policy)
- <a id="cli-backend-selection" />[CLI 后端选择](/gateway/config-agents/runtime-and-cli-backends#cli-backend-selection)
- <a id="openai-gpt-5-personality" />[OpenAI GPT-5 个性](/gateway/config-agents/runtime-and-cli-backends#openai-gpt-5-personality)
- <a id="agents.defaults.heartbeat" /><a id="agents-defaults-heartbeat" />[`agents.defaults.heartbeat`](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.heartbeat)
- <a id="agents.defaults.systemagent" /><a id="agents-defaults-systemagent" />[`agents.defaults.systemAgent`](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.systemagent)
- <a id="agents.defaults.compaction" /><a id="agents-defaults-compaction" />[`agents.defaults.compaction`](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.compaction)
- <a id="agents.defaults.contextpruning" /><a id="agents-defaults-contextpruning" />[`agents.defaults.contextPruning`](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.contextpruning)
- <a id="cache-ttl-mode-behavior" />[缓存-ttl模式行为](/gateway/config-agents/heartbeat-compaction-and-streaming#cache-ttl-mode-behavior)
- <a id="block-streaming" />[块流](/gateway/config-agents/heartbeat-compaction-and-streaming#block-streaming)
- <a id="typing-indicators" />[打字指示器](/gateway/config-agents/heartbeat-compaction-and-streaming#typing-indicators)
- <a id="agentsdefaultssandbox" />[`agents.defaults.sandbox`](/gateway/config-agents/sandbox#agentsdefaultssandbox)
- <a id="agents.defaults.sandbox" /><a id="agents-defaults-sandbox" />[`agents.defaults.sandbox`](/gateway/config-agents/sandbox#agents.defaults.sandbox)
- <a id="sandbox-details" />[沙箱详情](/gateway/config-agents/sandbox#sandbox-details)
- <a id="agentsentries-per-agent-overrides" />[`agents.entries`（每个代理覆盖）](/gateway/config-agents/entries-and-multi-agent#agentsentries-per-agent-overrides)
- <a id="agents.entries-(per-agent-overrides)" /><a id="agents-entries-per-agent-overrides" />[`agents.entries`（每个代理覆盖）](/gateway/config-agents/entries-and-multi-agent#agents-entries-per-agent-overrides)
- <a id="multi-agent-routing" />[多代理路由](/gateway/config-agents/entries-and-multi-agent#multi-agent-routing)
- <a id="binding-match-fields" />[绑定匹配字段](/gateway/config-agents/entries-and-multi-agent#binding-match-fields)
- <a id="per-agent-access-profiles" />[每代理访问配置文件](/gateway/config-agents/entries-and-multi-agent#per-agent-access-profiles)
- <a id="full-access-no-sandbox" />[完全访问（无沙箱）](/gateway/config-agents/entries-and-multi-agent#full-access-no-sandbox)
- <a id="read-only-tools-workspace" />[只读工具 + 工作区](/gateway/config-agents/entries-and-multi-agent#read-only-tools-workspace)
- <a id="no-filesystem-access-messaging-only" />[无文件系统访问（仅消息传递）](/gateway/config-agents/entries-and-multi-agent#no-filesystem-access-messaging-only)
- <a id="session" />[会话](/gateway/config-agents/sessions#session)
- <a id="session-field-details" />[会话字段详细信息](/gateway/config-agents/sessions#session-field-details)
- <a id="messages" />[消息](/gateway/config-agents/messages-and-talk#messages)
- <a id="response-prefix" />[响应前缀](/gateway/config-agents/messages-and-talk#response-prefix)
- <a id="ack-reaction" />[确认反应](/gateway/config-agents/messages-and-talk#ack-reaction)
- <a id="queue" />[Queue](/gateway/config-agents/messages-and-talk#queue)
- <a id="inbound-debounce" />[入站去抖](/gateway/config-agents/messages-and-talk#inbound-debounce)
- <a id="other-message-keys" />[其他消息键](/gateway/config-agents/messages-and-talk#other-message-keys)
- <a id="tts-(text-to-speech)" /><a id="tts-text-to-speech" />[TTS（文本转语音）](/gateway/config-agents/messages-and-talk#tts-text-to-speech)
- <a id="talk" />[Talk](/gateway/config-agents/messages-and-talk#talk)

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
- [模型提供商](/concepts/model-providers) — 提供商设置和模型目录
- [代理绑定](/concepts/agent-bindings) — 渠道帐户和用户如何选择代理
- [配置 — 通道](/gateway/config-channels) — 匹配的 `channels.*` 参考
