---
summary: "将捆绑的 openai 提供程序指向 Azure OpenAI 资源"
read_when:
  - "您正在通过 Azure OpenAI 路由图像生成"
  - "您需要 Azure API 版本、部署命名或区域规则"
title: "Azure OpenAI 端点"
sidebarTitle: "Azure端点"
---

## <a id="azure-openai-endpoints"></a> Azure OpenAI 端点

捆绑的 `openai` 提供程序可以通过覆盖基础 URL，将 Azure OpenAI 资源用于图像生成。在图像生成路径上，OpenClaw 会在 `models.providers.openai.baseUrl` 上检测 Azure 主机名，并自动切换为 Azure 的请求格式。

<Note>
实时语音使用单独的配置路径（`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`），不受`models.providers.openai.baseUrl`的影响。请参阅 [Voice 和语音 ](/providers/openai/voice-and-speech) 下的 **Realtime voice** 手风琴了解其 Azure 设置。
</Note>

在以下情况下使用 Azure OpenAI：

- 你已经拥有 Azure OpenAI 订阅、配额或企业协议
- 你需要 Azure 提供的区域数据驻留或合规性控制
- 你希望将流量保留在现有的 Azure 租户内

### <a id="configuration"></a> 配置

对于通过捆绑的 `openai` 提供程序进行的 Azure 图像生成，请将 `models.providers.openai.baseUrl` 指向你的 Azure 资源，并将 `apiKey` 设置为 Azure OpenAI 密钥（不是 OpenAI Platform 密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 会识别以下 Azure 主机后缀，以用于 Azure 图像生成路由：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于在已识别的 Azure 主机上的图像生成请求，OpenClaw：

- 发送 `api-key` 请求头，而不是 `Authorization: Bearer`
- 使用部署范围路径（`/openai/deployments/{deployment}/...`）
- 为每个请求追加 `?api-version=...`
- 对 Azure 图像生成调用使用 600 秒的默认请求超时。每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基本 URL（公共 OpenAI、OpenAI- 兼容代理）保持标准 OpenAI 图像请求形状。

<Note>
`openai` 提供程序的图像生成路径进行 Azure 路由需要 OpenClaw 2026.4.22 或更高版本。更早的版本会将任何自定义的 `openai.baseUrl` 视为公共 OpenAI 端点，并在 Azure 图像部署上失败。
</Note>

### <a id="api-version"></a> API 版本

设置 `AZURE_OPENAI_API_VERSION` 以为 Azure 图像生成路径固定一个特定的 Azure 预览版或 GA 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

当该变量未设置时，默认值为 `2024-12-01-preview`。

### <a id="model-names-are-deployment-names"></a> 模型名称是部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供程序路由的 Azure 图像生成请求， OpenClaw 中的 `model` 字段必须是你在 Azure 门户中配置的 **Azure 部署名称**， 而不是公共 OpenAI 模型 id。

如果你创建了一个名为 `gpt-image-2-prod` 的部署，用于提供 `gpt-image-2`：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

同样的“部署名称”规则也适用于任何通过捆绑的 `openai` 提供程序路由的图像生成调用。

### <a id="regional-availability"></a> 区域可用性

Azure 图像生成目前仅在部分区域可用 （例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、 `uaenorth`）。在创建部署之前，请查看 Microsoft 的当前区域列表，并确认特定模型在你的区域中可用。

### <a id="parameter-differences"></a> 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。 Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些 `background` 值）或仅在特定模型版本上公开它们。这些差异来自 Azure 和底层模型，而不是 OpenClaw。如果 Azure 请求因验证错误而失败，请检查 Azure 门户中的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用本机传输和兼容行为，但不接收 OpenClaw 的隐藏归因标头 - 请参阅 **Native 与 OpenAI- 兼容路由 [ 下的** 手风琴高级配置 ](/providers/openai/advanced#advanced-configuration)。

对于 Azure 上的聊天或响应流量（超出图像生成），请使用加入流程或专用的 Azure 提供商配置； `openai.baseUrl` 本身无法拾取 Azure API/auth 形状。存在单独的 `azure-openai-responses/*` 提供商；请参阅 [ 服务器端压缩手风琴 ](/providers/openai/advanced#server-side-compaction-responses-api)。
</Note>
