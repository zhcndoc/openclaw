---
summary: "使用 NovitaAI 的 OpenAI- 兼容 API 和 OpenClaw"
read_when:
  - "您想要使用 NovitaAI 模型运行 OpenClaw"
  - "你需要 Novita 提供商的 id、密钥或端点"
title: "NovitaAI"
---

NovitaAI 是托管 AI 基础设施提供商，具有 OpenAI- 兼容 API。 OpenClaw 通过官方外部 `@openclaw/novita-provider` 插件提供 NovitaAI。模型参考使用 `novita/deepseek/deepseek-v4-pro` 形式。

## <a id="setup"></a> 设置

安装插件：

```bash
openclaw plugins install @openclaw/novita-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

在 [novita.ai/settings/key-management](https://novita.ai/settings/key-management) 创建 API 密钥，然后运行：

```bash
openclaw onboard --auth-choice novita-api-key
```

或者设置：

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## <a id="defaults"></a> 默认值

| 设置       | 值                             |
| ------------- | --------------------------------- |
| 插件        | `@openclaw/novita-provider`       |
| 提供方 id   | `novita`                          |
| 别名       | `novita-ai`, `novitaai`           |
| 基础 URL      | `https://api.novita.ai/openai/v1` |
| 环境变量       | `NOVITA_API_KEY`                  |
| 默认模型 | `novita/deepseek/deepseek-v4-pro` |

发送到 Novita 端点的聊天完成使用 `system` 消息和 `max_tokens`，包括推理模型。这适用于没有每个模型兼容性设置的目录、配置和发现的模型。

## <a id="model-catalog"></a> 模型目录

- `novita/moonshotai/kimi-k3`
- `novita/moonshotai/kimi-k2.7-code`
- `novita/minimax/minimax-m3`
- `novita/zai-org/glm-5.2`
- `novita/deepseek/deepseek-v4-pro`
- `novita/qwen/qwen3.7-max`

`novita/minimax/minimax-m2.7` 仍可作为已弃用的兼容性条目进行选择， 但在模型选择器中处于隐藏状态。

这只是一个起点，不是一个实时目录。你的账户、地区，或者 Novita 当前的服务内容可能会添加、移除或限制路由。请在设置长期默认值之前先检查：

```bash
openclaw models list --provider novita
```

## <a id="video-generation"></a> 视频生成

相同的插件和`NOVITA_API_KEY`通过Novita的本机异步API在`https://api.novita.ai`支持[视频生成工具](/tools/video-generation)。

| 模型                         | 模式                      | 时长 | 分辨率  |
| ----------------------------- | -------------------------- | -------- | ----------- |
| `wan2.6-t2v`（默认）        | 文本或一张图像转视频 | 5/10/15s | 720P, 1080P |
| `wan2.6-i2v`                  | 一张图片转视频         | 5/10/15s | 720P, 1080P |
| `minimax-hailuo-2.3-t2v`      | 文本或一张图像转视频 | 6/10s    | 768P, 1080P |
| `minimax-hailuo-2.3-i2v`      | 一张图片转视频         | 6/10s    | 768P, 1080P |
| `minimax-hailuo-2.3-fast-i2v` | 一张图片转视频         | 6/10s    | 768P, 1080P |

提供带有 `-t2v` 模型的一张图像会选择同一系列的 `-i2v` 路线。这两个系列都接受作为数据 URI 发送的远程图像 URL 和本地图像文件。海洛仅支持1080P 6秒视频；使用768P 10秒。不支持视频参考输入。

Wan默认为静默输出；设置 `audio: true` 生成音频。它还接受一个远程 HTTP（S） 音频参考。文字转视频支持`16:9`、`9:16`、`1:1`、`4:3`、`3:4`；图像到视频继承源宽高比。 Wan 选项包括 `negative_prompt`、`prompt_extend`、`shot_type`（`single` 或 `multi`）和 `seed`。 Hailuo 选项为 `enable_prompt_expansion` 和 `fast_pretreatment`（后者在 Fast 模型上不可用）。

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "novita/wan2.6-t2v",
        },
      },
    },
  },
}
```

## <a id="when-to-choose-novita"></a> 何时选择 Novita

- 通过 OpenAI- 兼容的 API 托管开放权重模型访问。
- DeepSeek、Kimi、MiniMax、GLM 或 Qwen-family 通过单个提供商账户进行路由。
- 除 DeepInfra、GMI、OpenRouter 或直接供应商 API 之外的另一个托管后备路径。
- 由提供商侧托管模型，而不是自行维护 LM Studio、Ollama、SGLang 或 vLLM 基础设施。

当你需要厂商原生请求参数或支持合同时，选择直接厂商提供商。当模型必须在你自己的硬件或网络边界内运行时，选择本地提供商。

## <a id="troubleshooting"></a> 故障排查

- `401`/`403`：在 Novita 的密钥管理页面中验证密钥，如果已存储的配置文件已过期，则重新运行 `openclaw onboard --auth-choice novita-api-key`。
- 未知模型错误：使用 `openclaw models list --provider novita` 返回的确切 `novita/<route-id>`。
- 路由缓慢或失败：尝试另一个 Novita 模型路由，或者将 Novita 设置为回退提供商，以处理能够容忍提供商特定差异的工作负载。

## <a id="related"></a> 相关内容

- [模型提供商](/concepts/model-providers)
- [提供商目录](/providers/index)
