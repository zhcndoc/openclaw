---
summary: "工具配置（策略、实验切换、提供商支持的工具）和自定义 provider/base-URL 设置"
read_when:
  - "配置 `tools.*` 策略、允许列表或实验性功能"
  - "注册自定义提供程序或覆盖基本 URL"
  - "设置 OpenAI- 兼容的自托管端点"
title: "配置 — 工具与自定义提供方"
sidebarTitle: "工具与自定义提供方"
---

`tools.*` 配置键以及自定义提供方 / 基础 URL 设置。有关代理、通道和其他顶层配置键，请参见 [配置参考](/gateway/configuration-reference)。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [配置 — 工具策略](/gateway/config-tools/tool-policy) — 工具配置文件、工具组、沙箱工具门、`tools.codeMode` 以及 `allow`/`deny`、`byProvider`、`toolsBySender` 和 `elevated` 层。
- [Configuration — 代理工具的 GitHub 身份](/gateway/config-tools/github-identity) — `tools.github`：共享托管 `gh` 身份、令牌刷新以及接收它的执行边界。
- [ 配置 — 内置工具设置 ](/gateway/config-tools/built-in-tools) — `tools.exec`、`tools.loopDetection`、`tools.web`、`tools.media` 和 `tools.updatePlan`。
- [配置 — 跨代理、会话和子代理工具](/gateway/config-tools/sessions-and-subagents) — `tools.agentToAgent`、`tools.sessions` 可见性、`tools.sessions_spawn` 附件和 `agents.defaults.subagents`。
- [Configuration — 自定义提供程序和基本 URL](/gateway/config-tools/custom-providers) — `models.providers` 注册、基本 URL 信任和提供程序字段引用。
- [配置 - 提供程序示例](/gateway/config-tools/provider-examples) - Cerebras、Kimi、llama.cpp、LM Studio、MiniMax、Moonshot的工作配置， OpenCode、Synthetic 和 Z.AI。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个标题都在此处保留其锚点，因此现有链接（例如 `/gateway/config-tools#tools-agenttoagent`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="tools" />[工具](/gateway/config-tools/tool-policy)
- <a id="tool-profiles" />[工具型材](/gateway/config-tools/tool-policy#tool-profiles)
- <a id="tool-groups" />[工具组](/gateway/config-tools/tool-policy#tool-groups)
- <a id="mcp-and-plugin-tools-inside-sandbox-tool-policy" />[MCP 和沙箱工具策略内的插件工具](/gateway/config-tools/tool-policy#mcp-and-plugin-tools-inside-sandbox-tool-policy)
- <a id="tools.codemode" /><a id="tools-codemode" />[`tools.codeMode`](/gateway/config-tools/tool-policy#tools.codemode)
- <a id="tools.allow-%2F-tools.deny" /><a id="tools-allow-/-tools-deny" />[`tools.allow` / `tools.deny`](/gateway/config-tools/tool-policy#tools.allow-%2F-tools.deny)
- <a id="tools.byprovider" /><a id="tools-byprovider" />[`tools.byProvider`](/gateway/config-tools/tool-policy#tools.byprovider)
- <a id="tools.toolsbysender" /><a id="tools-toolsbysender" />[`tools.toolsBySender`](/gateway/config-tools/tool-policy#tools.toolsbysender)
- <a id="tools.elevated" /><a id="tools-elevated" />[`tools.elevated`](/gateway/config-tools/tool-policy#tools.elevated)
- <a id="tools.github" /><a id="tools-github" />[`tools.github`](/gateway/config-tools/github-identity#tools.github)
- <a id="tools.exec" /><a id="tools-exec" />[`tools.exec`](/gateway/config-tools/built-in-tools#tools.exec)
- <a id="tools.loopdetection" /><a id="tools-loopdetection" />[`tools.loopDetection`](/gateway/config-tools/built-in-tools#tools.loopdetection)
- <a id="tools.web" /><a id="tools-web" />[`tools.web`](/gateway/config-tools/built-in-tools#tools.web)
- <a id="tools.media" /><a id="tools-media" />[`tools.media`](/gateway/config-tools/built-in-tools#tools.media)
- <a id="media-model-entry-fields" />[媒体模型输入字段](/gateway/config-tools/built-in-tools#media-model-entry-fields)
- <a id="toolsupdateplan" /><a id="tools.updateplan" /><a id="tools-updateplan" />[`tools.updatePlan`](/gateway/config-tools/built-in-tools#tools.updateplan)
- <a id="tools.agenttoagent" /><a id="tools-agenttoagent" />[`tools.agentToAgent`](/gateway/config-tools/sessions-and-subagents#tools.agenttoagent)
- <a id="tools.sessions" /><a id="tools-sessions" />[`tools.sessions`](/gateway/config-tools/sessions-and-subagents#tools.sessions)
- <a id="visibility-scopes" />[可视范围](/gateway/config-tools/sessions-and-subagents#visibility-scopes)
- <a id="tools.sessions_spawn" /><a id="tools-sessions_spawn" />[`tools.sessions_spawn`](/gateway/config-tools/sessions-and-subagents#tools.sessions_spawn)
- <a id="attachment-notes" />[附注](/gateway/config-tools/sessions-and-subagents#attachment-notes)
- <a id="agents.defaults.subagents" /><a id="agents-defaults-subagents" />[`agents.defaults.subagents`](/gateway/config-tools/sessions-and-subagents#agents.defaults.subagents)
- <a id="custom-providers-and-base-urls" />[自定义提供程序和基本 URL](/gateway/config-tools/custom-providers#custom-providers-and-base-urls)
- <a id="auth-and-merge-precedence" />[授权和合并优先级](/gateway/config-tools/custom-providers#auth-and-merge-precedence)
- <a id="provider-field-details" />[提供商字段详细信息](/gateway/config-tools/custom-providers#provider-field-details)
- <a id="top-level-catalog" />[顶级目录](/gateway/config-tools/custom-providers#top-level-catalog)
- <a id="provider-connection-and-auth" />[提供商连接和授权](/gateway/config-tools/custom-providers#provider-connection-and-auth)
- <a id="request-transport-overrides" />[请求传输覆盖](/gateway/config-tools/custom-providers#request-transport-overrides)
- <a id="model-catalog-entries" />[模型目录条目](/gateway/config-tools/custom-providers#model-catalog-entries)
- <a id="custom-provider-capability-declarations" />[定制提供商能力声明](/gateway/config-tools/custom-providers#custom-provider-capability-declarations)
- <a id="amazon-bedrock-discovery" />[亚马逊基岩发现](/gateway/config-tools/custom-providers#amazon-bedrock-discovery)
- <a id="provider-examples" />[提供商示例](/gateway/config-tools/provider-examples#provider-examples)
- <a id="cerebras-glm-4-7-gpt-oss" />[Cerebras （GLM 4.7 / GPT OSS）](/gateway/config-tools/provider-examples#cerebras-glm-4-7-gpt-oss)
- <a id="kimi-coding" />[Kimi Coding](/gateway/config-tools/provider-examples#kimi-coding)
- <a id="local-models-llama-cpp-llama-server" />[本地模型（llama.cpp / llama-server）](/gateway/config-tools/provider-examples#local-models-llama-cpp-llama-server)
- <a id="local-models-lm-studio" />[本地模型（LM Studio）](/gateway/config-tools/provider-examples#local-models-lm-studio)
- <a id="minimax-m3-direct" />[MiniMax M3（直接）](/gateway/config-tools/provider-examples#minimax-m3-direct)
- <a id="moonshot-ai-kimi" />[Moonshot AI （Kimi）](/gateway/config-tools/provider-examples#moonshot-ai-kimi)
- <a id="opencode" />[OpenCode](/gateway/config-tools/provider-examples#opencode)
- <a id="synthetic-anthropic-compatible" />[合成（Anthropic-兼容）](/gateway/config-tools/provider-examples#synthetic-anthropic-compatible)
- <a id="z-ai-glm-4-7" />[Z.AI (GLM-4.7)](/gateway/config-tools/provider-examples#z-ai-glm-4-7)

## <a id="related"></a> 相关内容

- [配置 — 代理](/gateway/config-agents)
- [配置 — channels](/gateway/config-channels)
- [配置参考](/gateway/configuration-reference) — 其他顶层键
- [工具和插件](/tools)
