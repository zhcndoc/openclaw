---
summary: "通过 API 密钥或 OpenClaw 中的 Codex 订阅使用 OpenAI"
read_when:
  - "您想要在 OpenClaw 中使用 OpenAI 模型"
  - "你想使用 Codex 订阅认证而不是 API 密钥"
  - "您需要 Astra 异步工具、中途转向或缓存推理更改"
  - "你需要更严格的 GPT-5 代理执行行为"
title: "OpenAI"
---

OpenClaw 使用一个提供商 ID `openai` 进行直接 API-key 身份验证和 ChatGPT/Codex 订阅身份验证。 `openai/*`为标准模型路线。对于未设置运行时策略或 `auto` 的嵌入式代理轮流，OpenAI 的路由事实决定 OpenClaw 是否可以隐式选择捆绑的 Codex 应用程序服务器运行时。 `openai/*` 前缀本身并不能选择运行时。

- **代理模型** - `openai/*`通过显式`agentRuntime`配置或OpenAI的隐式路由策略选择的运行时。使用 Codex 身份验证登录以供 ChatGPT/Codex 订阅使用，或者在需要基于密钥的计费时配置 API-key 身份验证配置文件。
- **非代理 OpenAI API** - 通过 `OPENAI_API_KEY` 或 `openai` API-key 身份验证配置文件直接访问 OpenAI 平台，按使用计费。
- **旧配置** - `codex/*` 和 `openai-codex/*` 参考由 `openclaw doctor --fix` 修复为 `openai/*` 加上模型范围的 `agentRuntime.id: "codex"`。

OpenAI 明确支持在 OpenClaw 等外部工具和工作流程中使用订阅 OAuth。

此页是一个索引。 OpenAI 共九页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                            | 读它的时候                                                                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI 设置](/providers/openai/setup)                         | 您正在连接帐户：API-key 和 Codex 订阅路径、路由摘要、OAuth 恢复以及长上下文选择加入。 |
| [OpenAI认证](/providers/openai/authentication)       | 根据模型访问、插件、使用情况跟踪和权限选择 Codex 登录名、API 密钥或 SIWC。                               |
| [OpenAI模型](/providers/openai/models)                       | 您正在选择模型参考：快速选择表、GPT-6 Astra、Sol、Luna 和 GPT-5.6 层。                                   |
| [OpenAI 运行时和 Codex auth](/providers/openai/runtimes)    | 您需要知道哪个运行时运行 `openai/*` 轮次，以及本机 Codex 如何解析其帐户。                                     |
| [OpenAI覆盖范围和成本](/providers/openai/coverage-and-cost) | 您需要功能矩阵、内存嵌入或如何报告订阅配额和平台计费。                        |
| [OpenAI图像生成](/providers/openai/image-and-video)    | 您正在通过捆绑的 `openai` 插件生成或编辑图像。                                                              |
| [OpenAI 语音和语音](/providers/openai/voice-and-speech)   | 您正在配置文本转语音、转录或实时语音，包括每个路由的身份验证顺序。                                  |
| [Azure OpenAI 端点](/providers/openai/azure)               | 您将捆绑的 `openai` 提供程序指向 Azure OpenAI 资源。                                                            |
| [OpenAI高级配置](/providers/openai/advanced)     | 您正在调整提示贡献、传输、快速模式、压缩、严格代理模式或代理兼容性。                            |

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本发布的每个锚点仍然在此处解析，因此现有链接（例如 `/providers/openai#implicit-agent-runtime`）仍然有效。每个条目都指向现在保存内容的页面。

**[OpenAI设置](/providers/openai/setup)**

- <a id="getting-started" />[入门](/providers/openai/setup#getting-started)
- <a id="route-summary" />[路线汇总](/providers/openai/setup#route-summary)
- <a id="config-example" />[配置示例](/providers/openai/setup#config-example)
- <a id="route-summary-1" /><a id="route-summary-2" />[路线汇总](/providers/openai/setup#route-summary-2)
- <a id="config-example-1" /><a id="config-example-2" />[配置示例](/providers/openai/setup#config-example-2)
- <a id="check-and-recover-codex-oauth-routing" />[检查并恢复Codex OAuth路由](/providers/openai/setup#check-and-recover-codex-oauth-routing)
- <a id="status-indicator" />[状态指示灯](/providers/openai/setup#status-indicator)
- <a id="doctor-warning" />[医生警告](/providers/openai/setup#doctor-warning)
- <a id="context-window-defaults-and-long-context-opt-in" />[上下文窗口默认和长上下文选择加入](/providers/openai/setup#context-window-defaults-and-long-context-opt-in)
- <a id="embedded-openclaw-translation" />[嵌入式OpenClaw翻译](/providers/openai/setup#embedded-openclaw-translation)
- <a id="native-codex-translation" />[原生 Codex 翻译](/providers/openai/setup#native-codex-translation)
- <a id="catalog-recovery" />[目录恢复](/providers/openai/setup#catalog-recovery)
- <a id="api-key-openai-platform" />[API 密钥（OpenAI 平台）](/providers/openai/setup#api-key-openai-platform)
- <a id="get-your-api-key" />[获取您的 API 密钥](/providers/openai/setup#get-your-api-key)
- <a id="run-onboarding" />[运行入门](/providers/openai/setup#run-onboarding)
- <a id="verify-the-model-is-available" />[验证模型是否可用](/providers/openai/setup#verify-the-model-is-available)
- <a id="codex-subscription" />[法典订阅](/providers/openai/setup#codex-subscription)
- <a id="run-codex-oauth" />[Run Codex OAuth](/providers/openai/setup#run-codex-oauth)
- <a id="use-the-canonical-openai-model-route" />[使用标准OpenAI模型路线](/providers/openai/setup#use-the-canonical-openai-model-route)
- <a id="verify-codex-auth-is-available" />[验证 Codex 授权是否可用](/providers/openai/setup#verify-codex-auth-is-available)

**[OpenAI模型](/providers/openai/models)**

- <a id="quick-choice" />[快速选择](/providers/openai/models#quick-choice)
- <a id="retired-subscription-model-references" />[退役订阅模型参考](/providers/openai/models#retired-subscription-model-references)
- <a id="gpt-6-astra" />[GPT-6 Astra](/providers/openai/models#gpt-6-astra)
- <a id="async-tools%2C-steering%2C-and-reasoning-changes" /><a id="async-tools-steering-and-reasoning-changes" />[Async工具、转向和推理更改](/providers/openai/models#async-tools-steering-and-reasoning-changes)
- <a id="gpt-5.6-limited-preview" /><a id="gpt-5-6-limited-preview" />[GPT-5.6有限预览](/providers/openai/models#gpt-5-6-limited-preview)

**[OpenAI 运行时和 Codex auth](/providers/openai/runtimes)**

- <a id="naming-map" />[命名图](/providers/openai/runtimes#naming-map)
- <a id="implicit-agent-runtime" />[隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)
- <a id="native-codex-app-server-auth" />[Native Codex 应用程序服务器身份验证](/providers/openai/runtimes#native-codex-app-server-auth)

**[OpenAI覆盖范围和成本](/providers/openai/coverage-and-cost)**

- <a id="usage-and-cost-tracking" />[使用情况和成本跟踪](/providers/openai/coverage-and-cost#usage-and-cost-tracking)
- <a id="openclaw-feature-coverage" />[OpenClaw 功能覆盖](/providers/openai/coverage-and-cost#openclaw-feature-coverage)
- <a id="memory-embeddings" />[内存嵌入](/providers/openai/coverage-and-cost#memory-embeddings)

**[OpenAI图像生成](/providers/openai/image-and-video)**

- <a id="image-generation" />[图像生成](/providers/openai/image-and-video#image-generation)
- <a id="video-generation" />[支持的视频提供商](/tools/video-generation)

**[OpenAI 语音和语音](/providers/openai/voice-and-speech)**

- <a id="voice-and-speech" />[语音和语音](/providers/openai/voice-and-speech#voice-and-speech)
- <a id="gateway-controlled-realtime-call-cleanup" />[网关控制实时呼叫清理](/providers/openai/voice-and-speech#gateway-controlled-realtime-call-cleanup)
- <a id="ga-realtime-browser-authentication" />[GA 实时浏览器身份验证](/providers/openai/voice-and-speech#ga-realtime-browser-authentication)
- <a id="released-gpt-live-browser-and-gateway-relay-authentication" />[已发布 GPT-实时浏览器和网关中继认证](/providers/openai/voice-and-speech#released-gpt-live-browser-and-gateway-relay-authentication)
- <a id="unlisted-and-private-realtime-transport-paths" />[未列出的私有实时传输路径](/providers/openai/voice-and-speech#unlisted-and-private-realtime-transport-paths)
- <a id="speech-synthesis-tts" />[语音合成（TTS）](/providers/openai/voice-and-speech#speech-synthesis-tts)
- <a id="speech-to-text" />[语音转文本](/providers/openai/voice-and-speech#speech-to-text)
- <a id="realtime-transcription" />[实时转录](/providers/openai/voice-and-speech#realtime-transcription)
- <a id="realtime-voice" />[实时语音](/providers/openai/voice-and-speech#realtime-voice)

**[Azure OpenAI 端点](/providers/openai/azure)**

- <a id="azure-openai-endpoints" />[Azure OpenAI 端点](/providers/openai/azure#azure-openai-endpoints)
- <a id="configuration" />[配置](/providers/openai/azure#configuration)
- <a id="api-version" />[API版本](/providers/openai/azure#api-version)
- <a id="model-names-are-deployment-names" />[模型名称是部署名称](/providers/openai/azure#model-names-are-deployment-names)
- <a id="regional-availability" />[区域可用性](/providers/openai/azure#regional-availability)
- <a id="parameter-differences" />[参数差异](/providers/openai/azure#parameter-differences)

**[OpenAI高级配置](/providers/openai/advanced)**

- <a id="gpt-5-prompt-contribution" />[GPT-5 提示贡献](/providers/openai/advanced#gpt-5-prompt-contribution)
- <a id="advanced-configuration" />[高级配置](/providers/openai/advanced#advanced-configuration)
- <a id="config" />[Config](/providers/openai/advanced#config)
- <a id="cli" />[CLI](/providers/openai/advanced#cli)
- <a id="transport-websocket-vs-sse" />[运输（WebSocket 与 SSE）](/providers/openai/advanced#transport-websocket-vs-sse)
- <a id="fast-mode" />[快速模式](/providers/openai/advanced#fast-mode)
- <a id="openai-api-fast-mode-with-service-tier" />[OpenAI API 使用 service_tier](/providers/openai/advanced#openai-api-fast-mode-with-service-tier) 的快速模式
- <a id="server-side-compaction-responses-api" />[服务器端压缩（响应API）](/providers/openai/advanced#server-side-compaction-responses-api)
- <a id="enable-explicitly" />[明确启用](/providers/openai/advanced#enable-explicitly)
- <a id="custom-threshold" />[自定义阈值](/providers/openai/advanced#custom-threshold)
- <a id="disable" />[禁用](/providers/openai/advanced#disable)
- <a id="strict-agentic-gpt-mode" />[严格代理GPT模式](/providers/openai/advanced#strict-agentic-gpt-mode)
- <a id="native-vs-openai-compatible-routes" />[Native 与 OpenAI- 兼容路由](/providers/openai/advanced#native-vs-openai-compatible-routes)

## <a id="related"></a> 相关内容

有关聊天中的托管执行、文件处理和连接工具，请参阅 [Agents API 指南](/plugins/agentsapi)。

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="OAuth 并授权" href="/gateway/authentication" icon="key">
    身份验证详细信息和凭证重用规则。
  </Card>
</CardGroup>

## <a id="decision-models"></a> 决策模型

捆绑的 `openai` 插件通过 OpenClaw 的 [ 决策模型角色 ](/concepts/decision-models) 支持测试版 [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions)。配置 `OPENAI_API_KEY` 或 `openai` API-key 身份验证配置文件，然后在决策选择器中选择 `openai/gpt-6-luna` 或设置：

```json5
{
  agents: { defaults: { decisionModel: "openai/gpt-6-luna" } },
}
```

该帐户和所选模型必须具有决策 API 访问权限。 OpenClaw 需要平台 API 密钥进行决策。它不包括 ChatGPT/Codex 订阅配置文件和在凭证解析之前使用 ChatGPT 令牌共享授予登录。请求使用配置的 OpenAI 提供程序标头和传输设置。自定义平台兼容的 `baseUrl` 必须实现 `POST /decisions`； ChatGPT 后端 URL 被拒绝。

布尔问题映射到谓词；选择保留其字符串标签；分数级别使用从零开始的评分标准位置。一个批次最多支持 200 个问题，每个选择问题最多有 255 个选项。较大的请求在凭证解析或 API 调用之前返回 `unsupported-input`。将独立的问题分成不同的批次，或减少替代方案。

结构化证据和标准被序列化为 JSON 文本。当前Decision V1合约带有text/JSON证据，因此该适配器不发送图像部分。每个问题的拒绝都会导致整个批次无法使用 `unsupported-input`；格式错误或不完整的答案将返回 `invalid-response`。保留概率、分数、提供商信心和 input/output 代币使用情况。

选择决策模型不会取代主要聊天模型或启用自动决策帮助。显式评估将提供的证据发送至 OpenAI 并使用平台计费。

### <a id="harness-and-authentication"></a> harness和认证

配置决策模型时，OpenClaw 和 Codex 工具都会公开共享的 `decision_evaluate` 工具，并遵循正常的工具策略。 OpenAI 插件将其请求发送到 `POST /v1/decisions`。 Codex 的本机模型循环仍然使用响应。

| 主要模型harness | 主模型授权 | 决策权限和行为                                                                                                      |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| OpenClaw              | 平台 API 密钥   | 共享工具解析兼容的 OpenAI API 密钥。                                                                           |
| OpenClaw              | ChatGPT OAuth      | 共享工具需要单独的 OpenAI API-key 配置文件或 `OPENAI_API_KEY`。                                                 |
| Codex                 | 平台 API 密钥   | 该共享工具独立于 Codex 的本机凭证来解析 OpenClaw OpenAI API 密钥。                                |
| Codex                 | ChatGPT OAuth      | 本机 Codex 登录仍可用于聊天。共享工具需要 OpenClaw OpenAI API-key 配置文件或 `OPENAI_API_KEY`。 |

通过自动 OAuth-only 发现，评估将返回 `credentials-unavailable`，而无需 API 请求。显式不兼容的提供者凭证绑定仍然是终端； OpenClaw 不能替代其他帐户。通过 OpenClaw 的现有 OpenAI 身份验证设置配置决策 API 密钥，无需更改主要模型或 Codex 登录。
