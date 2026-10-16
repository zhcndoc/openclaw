---
summary: "使用 DeepInfra 的统一 API，在 OpenClaw 中访问最受欢迎的开源和前沿模型"
read_when:
  - "您想要顶级开源 LLM 的单个 API 密钥"
  - "您想通过以下方式运行模型DeepInfra's API in OpenClaw"
title: "DeepInfra"
---

DeepInfra 将请求路由到单个 OpenAI- 兼容端点和 API 密钥后面的流行开源和前沿模型。大多数 OpenAI SDK 通过切换基础 URL 来对抗它。

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/deepinfra-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="get-an-api-key"></a> 获取 API 密钥

1. 在 [deepinfra.com](https://deepinfra.com/) 登录
2. Go 到仪表板/密钥并生成密钥，或使用自动创建的密钥

## <a id="cli-setup"></a> CLI 设置

```bash
openclaw onboard --deepinfra-api-key <key>
```

或者设置环境变量：

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## <a id="config-snippet"></a> 配置片段

```json5
{
  env: { vars: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" } }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V4-Flash" },
    },
  },
}
```

## <a id="supported-surfaces"></a> 支持的接入面

配置 `DEEPINFRA_API_KEY` 后，聊天、图像生成和视频生成将从 `https://api.deepinfra.com/v1/openai/models?sort_by=openclaw&filter=with_meta` 实时刷新其模型目录。实时发现扩展了可选模型的列表；每个表面的默认模型保持以下静态值。其他表面使用静态目录，直到它们移动到相同的实时目录上。

| 表面                  | 默认模型                                                                  | OpenClaw config/tool                                  |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Chat / 模型提供方    | `deepseek-ai/DeepSeek-V4-Flash`（实时目录会添加更多 Chat 模型）           | `agents.defaults.model`                               |
| 图片 generation/editing | `black-forest-labs/FLUX-1-schnell`（实时目录添加更多 `image-gen` 模型） | `image_generate`, `agents.defaults.mediaModels.image` |
| 媒体理解      | `moonshotai/Kimi-K2.6` 图像                                              | 入站图像理解                           |
| 语音转文本           | `openai/whisper-large-v3-turbo`                                                | 入站音频转录                           |
| 文本转语音           | `hexgrad/Kokoro-82M`                                                           | `tts.provider: "deepinfra"`                           |
| 视频生成         | `Pixverse/Pixverse-T2V`（实时目录会添加更多 `video-gen` 模型）            | `video_generate`, `agents.defaults.mediaModels.video` |
| 记忆嵌入        | `BAAI/bge-m3`                                                                  | `memory.search.provider: "deepinfra"`                 |

DeepInfra 还提供重排序、分类、目标检测以及其他原生模型类型。OpenClaw 目前对这些类别还没有 provider 合约，因此这个插件不会注册它们。

## <a id="available-models"></a> 可用模型

一旦配置了密钥，OpenClaw 会动态发现 DeepInfra 模型。使用 `/models deepinfra` 或 `openclaw models list --provider deepinfra` 来查看当前列表。

[deepinfra.com](https://deepinfra.com/) 上的任何模型都可以与 `deepinfra/` 前缀一起使用：

```text
deepinfra/deepseek-ai/DeepSeek-V4-Flash
deepinfra/deepseek-ai/DeepSeek-V4-Pro
deepinfra/zai-org/GLM-5.2
deepinfra/moonshotai/Kimi-K2.6
deepinfra/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B
deepinfra/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
...and many more
```

## <a id="prompt-caching"></a> 提示词缓存

对于本机 `https://api.deepinfra.com/v1/openai` 端点，OpenClaw 为相关请求发送稳定的 `prompt_cache_key`，以提高自动前缀缓存重用。显式请求缓存密钥优先于会话 ID。设置 `cacheRetention: "none"` 会抑制此路由提示；它不会禁用 DeepInfra 的自动缓存。自定义端点保留其配置的行为。 OpenClaw 不会自动启用付费缓存保留。请参阅 [DeepInfra 提示缓存](https://docs.deepinfra.com/chat/prompt-caching)。

## <a id="price-estimates"></a> 价格预估

聊天发现将模型成员身份、顺序、标签和限制保留在 DeepInfra 的代理投影中。价格与匿名本机 [`/models/list`](https://docs.deepinfra.com/api-reference/models/models-list) 目录分开提供。该插件将每个代币的美分转换为每百万代币的 USD，应用一次广告中的数字折扣，并使用本机缓存输入比率。两个请求共享现有的五分钟实时目录缓存，并且仅针对配置的聊天发现并发运行。图像和视频发现不要求聊天价格。

通过定价散文、非空定价表或预定折扣到期限定的时间表仍然未知； OpenClaw 不会猜测上下文层或解析促销日期。声明的通用缓存写入速率也仍然不受支持，因为其数字语义没有记录。显式 5-minute/1-hour 保留率和 priority/flex 费率是单独的合同，不包含在标准估算中。请参阅 DeepInfra 的 [ 提示缓存 ](https://docs.deepinfra.com/chat/prompt-caching) 和 [ 缓存保留 ](https://docs.deepinfra.com/chat/prompt-cache-retention) 文档。

缺少或不受支持的单独价格表使用所需的运行时零成本占位符，这意味着未知、未经验证的免费计费。失败的元数据或本机定价请求将标记聊天发现不可用，并保留相同提供商配置和凭据的上次成功目录。即使定价不可用，成功的空模型响应也会清除发现的聊天模型。实时发现不会附加响应中缺少的捆绑模型。如果没有凭据，捆绑目录仍然可用，无需提取。明确配置的模型和成本仍然具有权威性；入门引导不会固定提供商价格。

该插件的公共 `buildDeepInfraProvider` API 保留其建议默认值：它保留捆绑选项，并在发现失败时使用未知的价格估计。 OpenClaw 的已注册目录挂钩显式选择 `discoveryMode: "strict"`，因此失败或空的获取会不变地到达共享出版物所有者。

托管出版物使用相同的本机解析器。它可以为不受支持或缺席的计划免费保留元数据，保留声明的零价格，并在本机提要验证失败时保持先前托管的目录完好无损。这些更新遵循共享 [ 托管目录发布生命周期 ](/concepts/models#hosted-catalog-updates)。

## <a id="notes"></a> 说明

- 模型引用格式为 `deepinfra/<provider>/<model>`（例如 `deepinfra/Qwen/Qwen3-Max`）。
- 默认聊天模型：`deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- 基础 URL：`https://api.deepinfra.com/v1/openai`
- 视频生成使用OpenAI-兼容的异步端点`https://api.deepinfra.com/v1/openai/videos`（提交，然后轮询）。已配置的 `baseUrl` 受到认可。 `openclaw doctor --fix` 自动将 `api.deepinfra.com` 上的旧 `nativeBaseUrl` 或 `/v1/inference` 值迁移到 `baseUrl`；自定义本机端点已根据医生通知停用，并且需要手动配置的 OpenAI- 兼容 `baseUrl`。视频生成失败并出现可操作错误（在发送任何请求之前），而 `baseUrl` 仍以已停用的 `/v1/inference` 表面为目标。

## <a id="related"></a> 相关内容

- [模型提供商](/concepts/model-providers)
- [所有提供方](/providers/index)
