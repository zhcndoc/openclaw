---
summary: "通过其 OpenClaw 插件使用 Qwen 云"
read_when:
  - You want to use Qwen with OpenClaw
  - You have an Alibaba Cloud Token Plan subscription
title: "Qwen"
---

Qwen Cloud is an official external OpenClaw provider plugin with canonical id `qwen`. It targets Qwen Cloud / Alibaba DashScope Standard and Coding Plan endpoints, exposes Token Plan as `qwen-token-plan`, keeps `modelstudio` as a compatibility alias, and independently owns Alibaba's documented `bailian-token-plan` custom-provider id.

| 属性                   | 值                                         |
| ---------------------- | ------------------------------------------ |
| Provider               | `qwen`                                     |
| Token Plan provider    | `qwen-token-plan`                          |
| Preferred env var      | `QWEN_API_KEY`                             |
| Token Plan env var     | `QWEN_TOKEN_PLAN_API_KEY`                  |
| Also accepted (compat) | `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY` |
| API style              | OpenAI-compatible                          |

<Tip>
`qwen3.7-plus` 和 `qwen3.6-plus` 可与 Coding Plan 和 Standard 端点配合使用。
对于 `qwen3.7-max` 或 `qwen3.6-flash`，请使用 **Standard（按量付费）** 端点。
</Tip>

## 安装插件

`qwen` 作为官方外部插件提供，不包含在核心中。安装后重启 Gateway：

```bash
openclaw plugins install @openclaw/qwen-provider
openclaw gateway restart
```

## 入门

选择你的计划类型并按照设置步骤进行。

<Tabs>
  <Tab title="Coding Plan（订阅制）">
    **最适合：** 通过 Qwen Coding Plan 进行基于订阅的访问。

    <Steps>
      <Step title="获取你的 API key">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API key。
      </Step>
      <Step title="运行引导配置">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` auth-choice id 和 `modelstudio/...` model 引用仍然
    可以作为兼容别名使用，但新的设置流程应优先使用规范的
    `qwen-*` auth-choice id 和 `qwen/...` model 引用。如果你定义了一个精确的
    自定义 `models.providers.modelstudio` 条目并使用了不同的 `api` 值，那么该
    自定义提供方会拥有 `modelstudio/...` 引用，而不是 Qwen 兼容
    别名。
    </Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **最适合：** 通过 Standard Model Studio 端点按量付费访问，包括 `qwen3.7-max` 和 `qwen3.6-flash`，这些模型在 Coding Plan 中不可用。

    <Steps>
      <Step title="获取你的 API key">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API key。
      </Step>
      <Step title="运行引导配置">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` auth-choice id 和 `modelstudio/...` model 引用仍然
    可以作为兼容别名使用，但新的设置流程应优先使用规范的
    `qwen-*` auth-choice id 和 `qwen/...` model 引用。如果你定义了一个精确的
    自定义 `models.providers.modelstudio` 条目并使用了不同的 `api` 值，那么该
    自定义提供方会拥有 `modelstudio/...` 引用，而不是 Qwen 兼容
    别名。
    </Note>

  </Tab>

  <Tab title="Token Plan (Team Edition)">
    **最适合：** 通过阿里云 Model Studio 访问 Qwen 及受支持的第三方模型的基于积分的团队订阅。

    <Steps>
      <Step title="获取你的专属密钥">
        分配一个 Token Plan 席位并创建其专属的 `sk-sp-...` 密钥。Token Plan、Coding Plan 和按量付费密钥不能互换。请参阅 [Global Token Plan overview](https://www.alibabacloud.com/help/en/model-studio/token-plan-overview) 或 [China Token Plan overview](https://help.aliyun.com/zh/model-studio/token-plan-overview)。
      </Step>
      <Step title="运行引导配置">
        对于新加坡的 **Global / International** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan
        ```

        对于北京的 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan-cn
        ```
      </Step>
      <Step title="验证提供方">
        ```bash
        openclaw models list --provider qwen-token-plan
        openclaw agent --model qwen-token-plan/qwen3.7-plus --message "请回复：token plan ready"
        ```
      </Step>
    </Steps>

    <Note>
    阿里巴巴的 OpenClaw 指南在手动自定义提供方中使用 `bailian-token-plan`。
    该插件将该 id 注册为兼容性所有者，但新配置应使用 `qwen-token-plan`。
    精确的自定义 `models.providers.bailian-token-plan` 条目会保留其已配置的传输
    和目录所有权；它绝不会合并到规范的 OpenAI 目录中。
    </Note>

    <Warning>
    仅在交互式 OpenClaw 会话中使用 Token Plan。不要将其用于
    cron 作业、无人值守脚本或应用后端。阿里巴巴表示，非交互式使用
    可能会暂停订阅或撤销其 API key。
    </Warning>

  </Tab>

</Tabs>

## 计划类型和端点

| Plan                       | Region | Auth choice                | Endpoint                                                         |
| -------------------------- | ------ | -------------------------- | ---------------------------------------------------------------- |
| Coding Plan (subscription) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`                               |
| Coding Plan (subscription) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`                          |
| Standard (pay-as-you-go)   | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`                      |
| Standard (pay-as-you-go)   | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1`                 |
| Token Plan (Team Edition)  | China  | `qwen-token-plan-cn`       | `token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`     |
| Token Plan (Team Edition)  | Global | `qwen-token-plan`          | `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |

提供方会根据你的认证选择自动选择端点。标准化
选项使用 `qwen-*` 系列；`modelstudio-*` 仅保留兼容模式。
可通过配置中的自定义 `baseUrl` 覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) |
**文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## 内置目录

OpenClaw 提供此 Qwen 静态目录。该目录支持端点感知：Coding
Plan 配置会省略那些仅适用于 Standard 端点的模型。

| Model ref                   | Input       | Context   | Notes                   |
| --------------------------- | ----------- | --------- | ----------------------- |
| `qwen/qwen3.5-plus`         | text, image | 1,000,000 | 默认模型           |
| `qwen/qwen3.6-flash`        | text, image | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3.6-plus`         | text, image | 1,000,000 | Coding Plan + Standard  |
| `qwen/qwen3.7-max`          | text        | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3.7-plus`         | text, image | 1,000,000 | Coding Plan + Standard  |
| `qwen/qwen3-max-2026-01-23` | text        | 262,144   | Qwen Max 系列           |
| `qwen/qwen3-coder-next`     | text        | 262,144   | Coding                  |
| `qwen/qwen3-coder-plus`     | text        | 1,000,000 | Coding                  |
| `qwen/MiniMax-M2.5`         | text        | 1,000,000 | 支持推理       |
| `qwen/glm-5`                | text        | 202,752   | GLM                     |
| `qwen/glm-4.7`              | text        | 202,752   | GLM                     |
| `qwen/kimi-k2.5`            | text, image | 262,144   | Moonshot AI via Alibaba |

<Note>
即使某个模型存在于静态目录中，可用性仍可能因端点和计费计划而异。
</Note>

### Token Plan 目录

Token Plan uses a separate exact-string allowlist. The built-in catalog shows
Alibaba's currently recommended plan models and keeps the newer Qwen3-Coder
compatibility tier selectable but hidden. Other allowlisted model IDs remain
available as custom model refs. Image-generation-only plan models are not
included here because they use different APIs.

| Model ref                          | Input       | Context   | Picker status |
| ---------------------------------- | ----------- | --------- | ------------- |
| `qwen-token-plan/qwen3.7-plus`     | text, image | 1,000,000 | visible       |
| `qwen-token-plan/qwen3.6-plus`     | text, image | 1,000,000 | visible       |
| `qwen-token-plan/qwen3-coder-next` | text        | 262,144   | hidden        |
| `qwen-token-plan/kimi-k2.5`        | text, image | 262,144   | visible       |
| `qwen-token-plan/glm-5`            | text        | 202,752   | visible       |
| `qwen-token-plan/MiniMax-M2.5`     | text        | 196,608   | visible       |

## 思考控制

在内置目录中，`qwen3.7-max`、`qwen3.7-plus`、`qwen3.6-flash` 和 `qwen3.6-plus`
都支持推理。对于 `qwen` 系列的推理模型，提供方会将 OpenClaw 的思考级别映射到 DashScope 顶层的
`enable_thinking` 请求标志：关闭思考时发送 `enable_thinking: false`，
其他任何级别都发送 `enable_thinking: true`。自定义模型可以通过在模型条目上设置
`compat.thinkingFormat: "qwen-chat-template"` 来启用另一种聊天模板思考载荷。

Token Plan 模型也被标记为具备推理能力。`kimi-k2.7-code` 和
`MiniMax-M2.5` 仅支持思考，因此即使会话请求 `/think off`，OpenClaw 也会保持思考开启。DeepSeek V4 将
`minimal` 到 `high` 映射为服务的 `high` effort，并将 `xhigh` 或 `max` 映射为 `max`。GLM 5.2 接受
完整的 `minimal` 到 `max` 范围；GLM 5.1 和 GLM 5 接受直到
`xhigh`，并且三者默认都为 `high`。其他混合模型遵循
请求的开/关状态。

## 多模态附加能力

`qwen` 插件仅在 **Standard** DashScope
端点上公开多模态能力，不支持 Coding Plan 端点：

- **Image and video understanding** via `qwen3.6-plus`
- **Wan video generation** via `wan2.6-t2v` (default), `wan2.6-i2v`, `wan2.6-r2v`, `wan2.6-r2v-flash`, `wan2.7-r2v`

媒体理解会根据已配置的 Qwen 认证信息自动解析；无需额外
配置。请确保你使用的是 Standard（按量付费）端点，以便媒体理解正常工作。

要将 Qwen 设为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

视频生成限制：每次请求最多输出 1 个视频，最多 1 张输入图片
（图生视频）、最多 4 个输入视频（视频转视频），时长最多 10 秒。
支持 `size`、`aspectRatio`、`resolution`、`audio` 和
`watermark`。参考图片/视频输入需要远程 http(s) URL；本地
文件路径会在前置阶段直接被拒绝，因为 DashScope 视频端点不接受
为这些引用上传本地缓冲区。

<Note>
参见 [视频生成](/tools/video-generation)，了解共享工具参数、提供商选择和故障转移行为。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Qwen 3.6 和 3.7 可用性">
    `qwen3.7-plus` 和 `qwen3.6-plus` 可用于 Coding Plan 和 Standard 端点。`qwen3.7-max` 和 `qwen3.6-flash` 仅适用于 Standard。Standard（按量付费）端点为：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    OpenClaw 会从 Coding Plan 目录中省略 `qwen3.7-max` 和 `qwen3.6-flash`。
    如果 Coding Plan 端点对任一模型返回“unsupported model”错误，
    请切换到匹配的 Standard 端点和密钥。

  </Accordion>

  <Accordion title="视频生成区域路由">
    OpenClaw 会在提交视频任务之前，将已配置的 Qwen 区域映射到对应的 DashScope AIGC 主机：

    - 全局/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    指向 Coding Plan
    或 Standard Qwen 主机的正常 `models.providers.qwen.baseUrl` 仍会将视频生成路由到对应的
    区域性 DashScope 视频端点。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Qwen 端点在共享的
    `openai-completions` 传输层上声明了流式使用兼容性，因此指向相同原生主机的
    DashScope 兼容自定义 provider id 会继承相同行为，而无需特定使用内置的
    `qwen` provider id。此行为适用于 Coding Plan、
    Standard 和 Token Plan 端点：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="能力计划">
    `qwen` 插件正在被定位为完整 Qwen
    Cloud 能力的厂商主页，而不仅仅是编码/文本模型。

    - **文本/聊天模型：** 通过插件提供
    - **工具调用、结构化输出、思考：** 继承自兼容 OpenAI 的传输层
    - **图像生成：** 计划在提供方插件层支持
    - **图像/视频理解：** 在 Standard 端点上可通过插件使用
    - **语音/音频：** 计划在提供方插件层支持
    - **记忆嵌入/重排序：** 计划通过 embedding 适配器表面支持
    - **视频生成：** 可通过共享视频生成能力经由插件使用

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 以守护进程（launchd/systemd）方式运行，请确保 `QWEN_API_KEY`
    或 `QWEN_TOKEN_PLAN_API_KEY` 对该进程可用（例如，放在
    `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba Model Studio" href="/providers/alibaba" icon="cloud">
    同一 DashScope 平台上的捆绑 Wan 视频生成提供商。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题解答。
  </Card>
</CardGroup>
