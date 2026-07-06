---
summary: "通过其 OpenClaw 插件使用 Qwen 云"
read_when:
  - 你想在 OpenClaw 中使用 Qwen
  - 你之前使用过 Qwen OAuth
title: "Qwen"
---

Qwen 云是一个官方的外部 OpenClaw 提供商插件，规范 id 为 `qwen`。它面向 Qwen 云 / Alibaba DashScope Standard 和 Coding Plan 端点，保持旧的 `modelstudio` id 作为兼容别名可用，并将 Qwen 门户令牌流程作为单独的提供商 [`qwen-oauth`](/providers/qwen-oauth) 暴露出来。

| 属性                   | 值                                         |
| ---------------------- | ------------------------------------------ |
| 提供商                | `qwen`                                     |
| 门户提供商            | [`qwen-oauth`](/providers/qwen-oauth)      |
| 首选环境变量          | `QWEN_API_KEY`                             |
| 也接受（兼容）        | `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY` |
| API 风格              | 兼容 OpenAI                               |

<Tip>
对于 `qwen3.6-plus`，请使用 **Standard（按量付费）** 端点。它在 Coding Plan 端点上不可用。
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
    **最适合：** 通过 Standard Model Studio 端点按量付费访问，包括 `qwen3.6-plus` 这类在 Coding Plan 中不可用的模型。

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

  <Tab title="Qwen OAuth / Portal">
    **最适合：** 针对 `https://portal.qwen.ai/v1` 的 Qwen Portal 令牌。

    请参见 [Qwen OAuth / Portal](/providers/qwen-oauth) 了解专用提供方
    页面和迁移说明。

    <Steps>
      <Step title="提供你的 Portal 令牌">
        ```bash
        openclaw onboard --auth-choice qwen-oauth
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen-oauth/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen-oauth
        ```
      </Step>
    </Steps>

    <Note>
    `qwen-oauth` 使用与 Qwen Cloud 提供方相同的 `QWEN_API_KEY` 环境变量名，
    但在通过 OpenClaw onboarding 配置时，会将认证信息存储在 `qwen-oauth`
    提供方 id 下。
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划                       | 区域   | 认证选项                   | 端点                                             |
| -------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Coding Plan (subscription) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (subscription) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Qwen Portal                | Global | `qwen-oauth`               | `portal.qwen.ai/v1`                              |
| Standard (pay-as-you-go)   | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)   | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |

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
| `qwen/qwen3.5-plus`         | text, image | 1,000,000 | 默认模型                |
| `qwen/qwen3.6-plus`         | text, image | 1,000,000 | 仅 Standard 端点可用    |
| `qwen/qwen3-max-2026-01-23` | text        | 262,144   | Qwen Max 系列           |
| `qwen/qwen3-coder-next`     | text        | 262,144   | 编码                    |
| `qwen/qwen3-coder-plus`     | text        | 1,000,000 | 编码                    |
| `qwen/MiniMax-M2.5`         | text        | 1,000,000 | 支持推理                |
| `qwen/glm-5`                | text        | 202,752   | GLM                     |
| `qwen/glm-4.7`              | text        | 202,752   | GLM                     |
| `qwen/kimi-k2.5`            | text, image | 262,144   | 通过阿里巴巴接入的 Moonshot AI |
| `qwen-oauth/qwen3.5-plus`   | text, image | 1,000,000 | Qwen Portal 默认        |

<Note>
即使某个模型存在于静态目录中，可用性仍可能因端点和计费计划而异。
</Note>

## 思考控制

`qwen/MiniMax-M2.5` 是内置目录中唯一支持推理的模型。对于 `qwen` 系列中的推理模型，提供方会将 OpenClaw 的思考级别映射到 DashScope 顶层的 `enable_thinking` 请求标志：禁用思考时发送 `enable_thinking: false`，其他任意级别都发送 `enable_thinking: true`。自定义模型可以通过在模型条目上设置 `compat.thinkingFormat: "qwen-chat-template"` 来启用另一种 chat-template 思考负载格式。

## 多模态附加能力

`qwen` 插件仅在 **Standard** DashScope
端点上公开多模态能力，不支持 Coding Plan 端点：

- 通过 `qwen-vl-max-latest` 进行**图像和视频理解**
- 通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v` 进行 **Wan 视频生成**

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
  <Accordion title="Qwen 3.6 Plus availability">
    `qwen3.6-plus` 可用于 Standard（按量付费）端点：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点对 `qwen3.6-plus` 返回 “unsupported model” 错误，
    请切换到 Standard（按量付费）而不是 Coding Plan
    端点/密钥对。

    OpenClaw 的 Qwen 静态目录不会在 Coding
    Plan 端点上标注 `qwen3.6-plus`，但如果在
    `models.providers.qwen.models` 下显式配置了 `qwen/qwen3.6-plus` 条目，
    那么在 Coding Plan 基础 URL 上也会被接受，因此如果阿里云在你的订阅中启用了它，
    你可以选择启用该模型。调用最终是否成功仍由上游 API 决定。

  </Accordion>

  <Accordion title="Video generation region routing">
    OpenClaw 会在提交视频任务之前，将已配置的 Qwen 区域映射到对应的 DashScope AIGC 主机：

    - 全局/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    指向 Coding Plan
    或 Standard Qwen 主机的正常 `models.providers.qwen.baseUrl` 仍会将视频生成路由到对应的
    区域性 DashScope 视频端点。

  </Accordion>

  <Accordion title="Streaming usage compatibility">
    原生 Qwen 端点在共享的
    `openai-completions` 传输层上声明支持流式 usage 兼容性，因此面向相同原生主机的 DashScope 兼容自定义提供方 id
    会继承相同行为，而不需要特定使用内置的 `qwen` 提供方 id。此行为同时适用于 Coding
    Plan 和 Standard 端点：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Capability plan">
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

  <Accordion title="Environment and daemon setup">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保 `QWEN_API_KEY` 对该进程可用
    （例如，放在 `~/.openclaw/.env` 中，或通过
    `env.shellEnv` 提供）。
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
