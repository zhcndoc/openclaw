---
summary: "Together AI 设置（认证 + 模型选择）"
title: "Together AI"
read_when:
  - "你想将 Together AI 与 OpenClaw 一起使用"
  - "你需要 API 密钥环境变量或 CLI 认证选项"
---

[Together AI](https://together.ai) 提供对领先的开源模型的访问，包括 Llama、DeepSeek、Kimi 等，并通过统一的 API 提供服务。 OpenClaw 将其打包为 `together` 提供方。

| 属性 | 值                            |
| -------- | -------------------------------- |
| 提供者 | `together`（别名：`togetherai`） |
| 认证     | `TOGETHER_API_KEY`               |
| API      | OpenAI-兼容                |
| 基础 URL | `https://api.together.xyz/v1`    |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-an-api-key" title="获取 API 密钥">
    在 [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys). 创建 API 密钥
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "together/zai-org/GLM-5.2",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

### <a id="non-interactive-example"></a> 非交互式示例

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>
Onboarding 将 `together/zai-org/GLM-5.2` 设置为默认聊天模型。
</Note>

## <a id="built-in-catalog"></a> 内置目录

每百万代币的成本为 USD。

| 模型引用                                          | 名称                         | 输入 | 上下文 | 最大输出 | 成本（in/out） | 笔记         |
| -------------------------------------------------- | ---------------------------- | ----- | ------- | ---------- | ------------- | ------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B 指令涡轮 | 文本  | 131,072 | 8,192      | 1.04 / 1.04   | 通用模型 |
| `together/zai-org/GLM-5.2`                         | GLM 5.2 FP4                  | 文本  | 262,144 | 131,072    | 1.40 / 4.40   | 默认模型 |

## <a id="video-generation"></a> 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成。

| 属性             | 值                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| 默认视频模型  | `Wan-AI/wan2.7-t2v`                                                                    |
| 其他模型         | `Wan-AI/wan2.7-i2v`, `minimax/hailuo-02`                                               |
| 模式                | 文字转视频；仅使用 `Wan-AI/wan2.7-i2v` 进行图像到视频（单个第一帧图像） |
| 时长             | 万2.7：OpenClaw中2-10秒；海洛时长支持因模型而异           |
| 支持的参数 | `size`（见下文）； `aspectRatio`/`resolution` 未读                            |

对于Wan 2.7，OpenClaw将`size`转换为Together的`resolution`和`ratio`字段。支持的尺寸遵循 [Together 的 Wan 2.7 指南](https://docs.together.ai/docs/wan2.7-quickstart)：

| 宽高比 | 720P尺寸  | 1080P尺寸  |
| ------------ | ---------- | ----------- |
| 16:9         | `1280x720` | `1920x1080` |
| 9:16         | `720x1280` | `1080x1920` |
| 1:1          | `960x960`  | `1440x1440` |
| 4:3          | `1104x832` | `1648x1248` |
| 3:4          | `832x1104` | `1248x1648` |

其他 Wan 尺寸在提交前会被拒绝。省略 `size` 以使用 Together 的默认值。海洛继续从`size`接收像素`width`和`height`。 Wan 图像输入作为 `media.frame_images` 和 `frame: "first"` 发送，而不是作为 `media.reference_images` 中的样式参考。

要将 Together 用作默认视频提供方：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "together/Wan-AI/wan2.7-t2v",
        },
      },
    },
  },
}
```

<Tip>
查看 [视频生成](/tools/video-generation) 了解共享工具参数、 提供方选择以及故障转移行为。
</Tip>

## <a id="prompt-caching"></a> 提示词缓存

Together 自动重用匹配的提示前缀。 OpenClaw 在本机 Together 请求上发送稳定的 `prompt_cache_key`，以改善跨转弯路由。缓存使用情况从 `usage.prompt_tokens_details.cached_tokens` 和 `usage.cached_tokens` 读取，具体取决于模型的响应格式。保持模型、工具定义、推理设置和早期消息稳定，以实现最佳重用。参见[一起提示缓存](https://docs.together.ai/docs/inference/chat/prompt-caching)。

<AccordionGroup>
  <Accordion id="environment-note" title="环境注意事项">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `TOGETHER_API_KEY` 对该进程可用（例如，放在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对于守护程序管理的网关进程不可见。使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置来实现持久可用性。
    </Warning>

  </Accordion>

  <Accordion id="troubleshooting" title="故障排查">
    - 验证你的密钥是否可用：`openclaw models list --provider together`
    - 如果模型没有出现，请确认 API 密钥已为你的 Gateway 进程设置在正确的环境中。
    - 模型引用使用 `together/<model-id>` 形式。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供者规则、模型参考和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频生成工具参数和提供方选择。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 仪表盘、API 文档和定价。
  </Card>
</CardGroup>
