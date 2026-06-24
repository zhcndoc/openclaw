---
summary: "向 OpenClaw 添加 Microsoft Foundry 模型提供程序支持。"
read_when:
  - 你正在安装、配置或审核 microsoft-foundry 插件
title: "Microsoft Foundry 插件"
---

# Microsoft Foundry 插件

向 OpenClaw 添加 Microsoft Foundry 模型提供程序支持。

## 分发

- Package: `@openclaw/microsoft-foundry`
- Install route: 包含在 OpenClaw 中

## 接口

providers: microsoft-foundry; contracts: imageGenerationProviders

- 图像生成提供程序: `microsoft-foundry`

## 要求

- 需要一个带有部署的 Microsoft Foundry 或 Azure AI Foundry 资源。
- 通过 `AZURE_OPENAI_API_KEY` 或已配置的提供程序 API 密钥进行 API 密钥认证。
- 对于 Entra ID 认证，请先安装 Azure CLI 并在
  onboarding 之前运行 `az login`。OpenClaw 通过
  `az account get-access-token` 刷新 Microsoft Foundry 运行时令牌。

## 聊天模型

Microsoft Foundry 聊天部署使用提供程序模型引用
`microsoft-foundry/<deployment-name>`。onboarding 会使用 Azure CLI 发现 Foundry 资源
和部署，然后将所选部署名称写入
模型配置。

OpenClaw 对受支持的 OpenAI 兼容
聊天 API 使用 Foundry 的 `/openai/v1` 端点：

- GPT、`o*`、`computer-use-preview` 和 DeepSeek-V4 模型系列默认使用
  `openai-responses`。
- MAI-DS-R1 和其他 chat-completion 部署使用 `openai-completions`
  ，除非配置了明确受支持的 API。
- MAI-DS-R1 通过 reasoning content 被记录为支持推理，而不是通过
  `reasoning_effort`。其上下文和输出 token 元数据为
  163,840 tokens。

Microsoft Foundry 中的 Anthropic Claude 部署使用 Anthropic Messages
API 形状，而不是 OpenAI 兼容的 `/openai/v1` 形状。请将这些配置为
自定义 `anthropic-messages` 提供程序，直到 Microsoft Foundry 插件增加原生
Anthropic 运行时为止。当 Foundry 部署名称与
Claude 模型 ID 不同时，请在模型条目上设置 `params.canonicalModelId`，这样 OpenClaw
就可以应用特定于模型的 wire contracts，正确映射 `/think off`，并
安全地保留签名思考内容。

## MAI 图像生成

该插件为 `image_generate` 注册了 `microsoft-foundry`，支持当前
Microsoft AI 图像模型：

- `MAI-Image-2.5-Flash`
- `MAI-Image-2.5`
- `MAI-Image-2e`
- `MAI-Image-2`

请使用已部署的 MAI 图像部署名称作为模型引用。该提供程序
不声明默认图像模型，因为 MAI API 要求你在请求的 `model`
字段中提供部署名称：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "microsoft-foundry/<deployment-name>",
        timeoutMs: 600000,
      },
    },
  },
}
```

仅基于提示词的生成会调用 Microsoft Foundry 的 MAI 生成端点：
`/mai/v1/images/generations`。引用图像编辑会调用
`/mai/v1/images/edits`，并且仅限于 `MAI-Image-2.5-Flash` 和
`MAI-Image-2.5` 部署。

仅基于提示词的生成可以在只配置了 Foundry
端点的情况下使用自定义部署名称。对于使用自定义部署名称的图像编辑，请通过 onboarding 选择该
部署，或包含模型元数据，以便 OpenClaw 可以验证
该部署是否由 `MAI-Image-2.5-Flash` 或 `MAI-Image-2.5` 支持。

MAI 图像限制：

- 输出：每个请求一张 PNG 图像。
- 大小：默认 `1024x1024`；宽度和高度都必须至少为 768 px。
- 总像素数：宽度 × 高度最多为 1,048,576。
- 编辑：输入一张 PNG 或 JPEG 图像。
- 不支持的共享提示，例如 `aspectRatio`、`resolution`、`quality`、
  `background` 以及非 PNG 的 `outputFormat` 不会发送到 Microsoft Foundry。

## 故障排除

- `az: command not found`：安装 Azure CLI 或使用 API 密钥认证。
- `Microsoft Foundry endpoint missing for MAI image generation`：通过 onboarding 选择一个
  Foundry 部署，或添加 `models.providers.microsoft-foundry.baseUrl`。
- `supports MAI image deployments only`：所选图像模型指向一个
  非 MAI 部署。请为 `image_generate` 使用已部署的 MAI 图像模型。
