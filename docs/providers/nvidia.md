---
summary: "在OpenClaw中使用NVIDIA的OpenAI-兼容API"
read_when:
  - "你想在 OpenClaw 中免费使用开源模型"
  - "您需要 NVIDIA_API_KEY 设置"
  - "你想通过 NVIDIA 使用 Nemotron 3 Ultra"
title: "NVIDIA"
---

NVIDIA 通过 `https://integrate.api.nvidia.com/v1` 上的 OpenAI- 兼容 API 免费提供开放模型，并使用 [build.nvidia.com](https://build.nvidia.com/settings/api-keys). 中的 API 密钥进行身份验证 OpenClaw 默认将 NVIDIA 提供程序提供给 Nemotron 3 Ultra， NVIDIA 的 550B 总计 / 55B 主动推理模型，适用于长上下文代理工作。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-your-api-key" title="获取您的 API 密钥">
    在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys). 创建 API 密钥
  </Step>
  <Step id="export-the-key-and-run-onboarding" title="导出密钥并运行入门">
    ```bash
    export NVIDIA_API_KEY="nvapi-..."
    openclaw onboard --auth-choice nvidia-api-key
    ```
  </Step>
  <Step id="set-an-nvidia-model" title="设置 NVIDIA 模型">
    ```bash
    openclaw models set nvidia/nvidia/nemotron-3-ultra-550b-a55b
    ```
  </Step>
</Steps>

对于非交互式设置，请直接传入 key：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

<Warning>
`--nvidia-api-key` 会将 key 记录到 shell history 和 `ps` 输出中。尽可能优先使用 `NVIDIA_API_KEY` 环境变量。
</Warning>

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { NVIDIA_API_KEY: "nvapi-..." } },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-ultra-550b-a55b" },
    },
  },
}
```

## <a id="live-model-catalog"></a> 直播模型目录

配置 NVIDIA API 密钥后，设置和模型选择路径会检查 `https://integrate.api.nvidia.com/v1/models` 的可用模型 ID，并缓存 30 秒。 NVIDIA 的公共 `https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json` 源提供排名和代币限制，缓存 24 小时。仅当推理清单仍列出精选模型时，它们才会首先出现；其他可用的捆绑聊天模型如下。新的库存可以恢复 NVIDIA 重新发布的先前隐藏的模型。

托管目录应用相同的提要：NVIDIA 的特色模型领先其 [ 推荐模型](/concepts/recommended-models#provider-featured-lists)，其次是全球列表。

该清单还包含嵌入和其他非聊天端点，没有功能元数据。因此，OpenClaw 仅提供带有捆绑的聊天元数据或有效的特色模型元数据的精确模型；它不会根据模型名称猜测功能。未知的 ID 仍然可以显式配置；单独列出并不能证明聊天兼容性。这不是每个 NVIDIA 模型的完整自动目录。

两个公共获取都使用固定的 HTTPS 主机并且不发送凭据。失败的清单或特色请求将标记发现不可用，并保留相同提供商配置和凭据的最后成功目录。失败的特色元数据无法默默地删除以前发现的模型。成功的清空库存会清除已发现的模型，即使特色提要失败也是如此。如果没有 NVIDIA 身份验证，浏览将使用捆绑目录而不进行提取。

## <a id="nemotron-3.5-lightning"></a><a id="nemotron-3-5-lightning"></a> Nemotron 3.5 闪电

[`nvidia/nemotron-3.5-lightning-30b-a3b`](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/build) 是 NVIDIA 较小的 30B 总/3B 主动推理模型，用于代理工作。捆绑行记录了其 1M 上下文和 16,384 个代币的输出预算，与 NVIDIA 的托管示例相匹配。选择它：

```bash
openclaw models set nvidia/nvidia/nemotron-3.5-lightning-30b-a3b
```

当实时库存列出 Lightning 时，即使它没有出现在精选源中，Lightning 也是可选的。 Nemotron 3 Ultra 仍然是默认设置。

## Nemotron 3 Ultra

Nemotron 3 Ultra 是 OpenClaw 中默认的 NVIDIA 模型。 NVIDIA 的 [`nvidia/nemotron-3-ultra-550b-a55b`](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b) 构建页面将其列为具有 1M 令牌上下文规范的可用免费端点。

捆绑的 Ultra 行默认发送 `chat_template_kwargs: { enable_thinking: false, force_nonempty_content: true }` ，因此正常的聊天输出会保留在可见答案中，而不会暴露推理文本。

使用 Ultra 获得最高功能 NVIDIA 默认值。选择 Nemotron 3.5 Lightning 获得较小的纯文本 Nemotron 选项，选择 Nemotron 3.5 Super VL 获得图像和视频理解，或者选择 NVIDIA 目录中托管的第三方模型之一（当其上下文、延迟或行为更适合时）。

## <a id="nemotron-3.5-super-vl"></a><a id="nemotron-3-5-super-vl"></a> Nemotron 3.5 超级 VL

[Nemotron 3.5 Super VL](https://docs.nvidia.com/nemo/automodel/model-coverage/omni/nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-BF16) 是 NVIDIA 的用于文本、图像和视频输入的视觉语言模型。

选择它用于文本、图像和视频输入：

```bash
openclaw models set nvidia/nvidia/nemotron-3.5-super-vl-120b-a12b
```

将 Super VL 的图像支持与 Nemotron 3 Ultra 的文本配对。将 Ultra 设置为主模型，将 Super VL 设置为图像模型：

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "nvidia/nvidia/nemotron-3-ultra-550b-a55b" },
      "imageModel": { "primary": "nvidia/nvidia/nemotron-3.5-super-vl-120b-a12b" }
    }
  }
}
```

当主模型无法接受图像时，OpenClaw 使用 `imageModel` 进行图像理解。

## <a id="bundled-fallback-catalog"></a> 捆绑后备目录

捆绑的行提供已知的聊天元数据和离线后备。退役模型不包括在内；现有配置不会自动重写。

| 模型引用                                       | 名称                       | 上下文   | 最大输出 |
| ----------------------------------------------- | -------------------------- | --------- | ---------- |
| `nvidia/nvidia/nemotron-3-ultra-550b-a55b`      | Nemotron 3 Ultra 550B      | 1,048,576 | 8,192      |
| `nvidia/nvidia/nemotron-3.5-lightning-30b-a3b`  | Nemotron 3.5 闪电 30B | 1,048,576 | 16,384     |
| `nvidia/nvidia/nemotron-3.5-super-vl-120b-a12b` | Nemotron 3.5 超级 VL      | 1,048,576 | 8,192      |
| `nvidia/moonshotai/kimi-k2.6`                   | Kimi K2.6                  | 262,144   | 65,536     |

如果配置的模型已停用，请从 `openclaw models list --provider nvidia` 中选择活跃模型。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="auto-enable-behavior" title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量，或在引导过程中已保存密钥时，提供方会自动启用。除密钥外，无需额外的提供方配置。
  </Accordion>

  <Accordion id="catalog-and-pricing" title="目录和定价">
    OpenClaw 使用 NVIDIA 的推理库存来确定可用性，并使用其特色提要进行排名。精确的捆绑元数据保留了特色提要所忽略的推理和图像功能。退役模型从离线后备中移除；新的特色元数据和库存可以恢复 NVIDIA 重新发布的模型。源中的成本默认为 `0`，因为 NVIDIA 目前为列出的模型提供免费的 API 访问。
  </Accordion>

  <Accordion id="openai-compatible-endpoint" title="OpenAI-兼容端点">
    OpenClaw 使用 `openai-completions` 适配器根据标准 `/v1` 聊天完成路由与 NVIDIA 进行对话。任何 OpenAI- 兼容工具都应与 NVIDIA 底座 URL 一起开箱即用。
  </Accordion>

  <Accordion id="nemotron-3-ultra-reasoning-params" title="Nemotron 3 Ultra 推理参数">
    NVIDIA 的 Ultra 样本请求使用 `chat_template_kwargs.enable_thinking` 和 `reasoning_budget` 进行推理输出。 OpenClaw 捆绑的 Ultra 行默认禁用正常聊天使用的模板思维。如果您需要选择 NVIDIA 推理输出或强制其他 NVIDIA- 特定请求字段，请设置每个模型参数并保持特定于提供程序的覆盖范围仅限于 NVIDIA 模型：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "nvidia/nvidia/nemotron-3-ultra-550b-a55b": {
              params: {
                chat_template_kwargs: { enable_thinking: true },
                extra_body: { reasoning_budget: 16384 },
              },
            },
          },
        },
      },
    }
    ```

    `params.chat_template_kwargs` 合并到请求中已有的任何 `chat_template_kwargs` 中，而不是替换整个对象。 `params.extra_body` 是最终的 OpenAI- 兼容请求正文覆盖，并覆盖冲突的有效负载密钥，因此仅将其用于所选端点的 NVIDIA 文档字段。

  </Accordion>

  <Accordion id="slow-custom-provider-responses" title="定制提供商响应缓慢">
    某些 NVIDIA-hosted 自定义模型在发出第一个响应块之前可能需要比默认的约 120 秒模型空闲看门狗更长的时间。对于自定义 NVIDIA 提供程序条目，提高提供程序超时而不是整个代理运行时超时； `timeoutSeconds` 涵盖提供商 HTTP 请求并提高该提供商的 idle/stream 看门狗上限。下面的提供商 ID （`custom-integrate-api-nvidia-com`） 是您选择的名称，而不是保留值；只要你的模型引用使用相同的前缀，任何 id 都可以工作：

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>
NVIDIA 模型目前可免费使用。请查看 [build.nvidia.com](https://build.nvidia.com/) 以获取最新的可用性和速率限制详情。
</Tip>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>
