---
summary: "OpenAI 的哪些功能 OpenClaw 公开、嵌入和支出报告"
read_when:
  - "您想知道哪个 OpenAI 功能映射到哪个 OpenClaw 表面"
  - "您正在根据平台 API 计费调节订阅配额"
  - "您将 memory_search 指向 OpenAI 嵌入"
title: "OpenAI 覆盖范围和费用"
sidebarTitle: "覆盖范围和费用"
---

## <a id="usage-and-cost-tracking"></a> 使用情况和成本跟踪

OpenClaw 将订阅配额和平台 API 计费分开处理：

- ChatGPT/Codex OAuth 会显示订阅计划、配额窗口和余额。
- `OPENAI_ADMIN_KEY` 显示 Control UI **Usage** 中提供商报告的 30 天组织成本和完成情况使用情况，包括每日支出、request/token 总计、顶级模型和成本类别。
- `OPENAI_PROJECT_ID` 可选地将 Admin API 历史记录限定到单个项目。
- OpenClaw 绝不会向组织 API 发送 `OPENAI_API_KEY` 或 `openai` 推理配置文件；这些凭据可能属于自定义、Azure 或代理本地端点。

显式的 Admin 密钥优先于 OAuth。提供方上报的历史记录不会与 OpenClaw 基于会话推导的估算成本合并；它可能包含来自其他客户端的 API 活动以及提供方侧的计费调整。

OpenAI 的 [API 使用 Dashboard](https://help.openai.com/en/articles/10478918) 文档描述了组织所有者和使用数据的显式使用仪表板权限要求。

提供方、模型、运行时和通道是彼此独立的层级。如果这些标签开始混在一起，请在更改配置之前先阅读 [代理运行时](/concepts/agent-runtimes)。

## <a id="openclaw-feature-coverage"></a> OpenClaw 功能覆盖

| OpenAI 功能         | OpenClaw面                                                                              | 状态                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 聊天 / Responses          | `openai/<model>` 模型提供商                                                               | 是                                                                |
| Codex 订阅模型 | 使用 OpenAI OAuth 的 `openai/<model>`                                                            | 是                                                                |
| 旧版 Codex 模型引用   | 旧版 Codex 模型引用、`codex-cli/<model>`                                                     | 由 doctor 修复为 `openai/<model>`                             |
| Codex 应用服务器harness  | Codex- 与运行时 unset/`auto` 兼容的 HTTPS 路由，或显式 `agentRuntime.id: codex`  | 是                                                                |
| 服务端网页搜索    | 原生 OpenAI Responses 工具                                                                  | 是，在启用网页搜索且未固定其他提供商时    |
| 图片                    | `image_generate`                                                                              | 是                                                                |
| 文本转语音            | `tts.provider: "openai"` / `tts`                                                              | 是                                                                |
| 批量语音转文本      | `tools.media.audio` / 媒体理解                                                     | 是                                                                |
| 流式语音转文本  | 语音通话 `streaming.provider: "openai"`                                                     | 是                                                                |
| 实时语音            | 语音通话 `realtime.provider: "openai"` / Control UI 通话 `talk.realtime.provider: "openai"` | 是（授权顺序取决于所选的实时路线；见下文） |
| 嵌入                | 记忆嵌入提供商                                                                     | 是                                                                |

<Note>
发布了 GPT-Live 浏览器和网关中继 WebRTC，首先尝试 OpenClaw ChatGPT OAuth 配置文件，然后回退到平台 API-key 身份验证。普通 GA 浏览器实时首先尝试平台身份验证，仅在未配置平台凭证源时才回退到 OAuth。直接后端套接字和未列出或私有实时路由需要平台 API-key 身份验证。

平台身份验证按以下顺序解析：配置实时 API 密钥、`openai` API-key 配置文件，然后是 `OPENAI_API_KEY`。语音通话、Discord 实时语音、直接后端套接字、未列出或私有实时路由以及实时转录仍然需要平台身份验证。

如果 API-key 身份验证报告缺少账单，请在 [platform.openai.com/account/billing](https://platform.openai.com/account/billing) 为使用 API-key 身份验证时支持您的实时凭证的组织充值平台积分。实时语音接受由 `openclaw onboard --auth-choice openai-api-key` 创建的 `openai` API-key 身份验证配置文件，通过用于 Control UI Talk 的 `talk.realtime.providers.openai.apiKey` 或用于语音呼叫的 `plugins.entries.voice-call.config.realtime.providers.openai.apiKey` 或 `OPENAI_API_KEY` 环境设置的平台 API 密钥变量。

在带有平台验证的 Control UI Video Talk 中，OpenAI WebRTC 按需接收摄像机上下文：当模型调用 `describe_view` 时，浏览器通过实时数据通道发送一个有界 JPEG。 OpenClaw 不会将连续的摄像机轨迹附加到 OpenAI 会话。
</Note>

## <a id="memory-embeddings"></a> 内存嵌入

OpenClaw 可以使用 OpenAI 或 OpenAI- 兼容的嵌入端点来进行 `memory_search` 索引和查询嵌入：

```json5
{
  memory: {
    search: {
      provider: "openai",
      model: "text-embedding-3-small",
    },
  },
}
```

对于需要非对称嵌入标签的 OpenAI- 兼容端点，请在 `memory.search` 下设置 `queryInputType` 和 `documentInputType`。 OpenClaw 将它们转发为特定于提供者的 `input_type` 请求字段：查询嵌入使用 `queryInputType`；索引内存块和批量索引使用 `documentInputType`。有关完整示例，请参阅 [ 内存配置参考 ](/reference/memory-config#provider-specific-config)。
