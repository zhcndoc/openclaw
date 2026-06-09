---
summary: "通过 OpenClaw 内置的 qwen 提供方使用 Qwen Cloud"
read_when:
  - 你想在 OpenClaw 中使用 Qwen
  - 你之前使用过 Qwen OAuth
title: "Qwen"
---

OpenClaw 现在将 Qwen 视为一等内置提供方，规范 id 为
`qwen`。这个内置提供方面向 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端点，保留旧的 `modelstudio` id 作为兼容
别名，并且还将 Qwen Portal 令牌流程暴露为提供方 `qwen-oauth`。

- 提供方: `qwen`
- Portal 提供方: [`qwen-oauth`](/providers/qwen-oauth)
- 首选环境变量: `QWEN_API_KEY`
- 兼容接受的环境变量: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- API 风格: 兼容 OpenAI

<Tip>
如果你想使用 `qwen3.6-plus`，建议优先使用 **Standard（按量付费）** 端点。
Coding Plan 的支持可能会滞后于公开目录。
</Tip>

## 快速开始

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

  <Tab title="Standard（按量付费）">
    **最适合：** 通过 Standard Model Studio 端点进行按量付费访问，包括像 `qwen3.6-plus` 这类可能在 Coding Plan 上不可用的模型。

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
    `qwen-oauth` 使用与 DashScope 提供方相同的 `QWEN_API_KEY` 环境变量名，
    但在通过 OpenClaw 引导配置时，会将认证信息存储在 `qwen-oauth`
    提供方 id 下。
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划                       | 区域   | 认证选项                   | 端点                                             |
| -------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go)   | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)   | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (subscription) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (subscription) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Qwen Portal                | Global | `qwen-oauth`               | `portal.qwen.ai/v1`                              |

该提供方会根据你的认证选项自动选择端点。规范的
选项使用 `qwen-*` 系列；`modelstudio-*` 仍然仅用于兼容。
你也可以在配置中使用自定义 `baseUrl` 覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) |
**文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## 内置目录

OpenClaw 当前提供以下内置 Qwen 目录。已配置的目录会感知端点：
Coding Plan 配置会省略那些只在 Standard 端点上可用的模型。

| Model ref                   | 输入         | 上下文    | 说明                                               |
| --------------------------- | ------------ | --------- | -------------------------------------------------- |
| `qwen/qwen3.5-plus`         | 文本, 图像    | 1,000,000 | 默认模型                                           |
| `qwen/qwen3.6-plus`         | 文本, 图像    | 1,000,000 | 当你需要该模型时，优先使用 Standard 端点           |
| `qwen/qwen3-max-2026-01-23` | 文本         | 262,144   | Qwen Max 系列                                      |
| `qwen/qwen3-coder-next`     | 文本         | 262,144   | 编程                                               |
| `qwen/qwen3-coder-plus`     | 文本         | 1,000,000 | 编程                                               |
| `qwen/MiniMax-M2.5`         | 文本         | 1,000,000 | 支持推理                                           |
| `qwen/glm-5`                | 文本         | 202,752   | GLM                                                |
| `qwen/glm-4.7`              | 文本         | 202,752   | GLM                                                |
| `qwen/kimi-k2.5`            | 文本, 图像    | 262,144   | 通过 Alibaba 提供的 Moonshot AI                    |
| `qwen-oauth/qwen3.5-plus`   | 文本, 图像    | 1,000,000 | Qwen Portal 默认                                   |

<Note>
即使模型出现在内置目录中，实际可用性仍可能因端点和计费计划而异。
</Note>

## 思考控制

对于支持推理的 Qwen Cloud 模型，内置提供方会将 OpenClaw 的
思考级别映射到 DashScope 顶层的 `enable_thinking` 请求标志。关闭
思考会发送 `enable_thinking: false`；其他思考级别会发送
`enable_thinking: true`。

## 多模态附加能力

`qwen` 插件还在 **Standard** DashScope 端点上暴露多模态能力（不包含 Coding Plan 端点）：

- **视频理解**：通过 `qwen-vl-max-latest`
- **Wan 视频生成**：通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v`

要将 Qwen 设为默认视频提供方：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>
请参见 [视频生成](/tools/video-generation) 了解共享工具参数、提供方选择和故障转移行为。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="图像和视频理解">
    内置 Qwen 插件会在 **Standard** DashScope 端点上注册图像和视频
    理解能力（不包含 Coding Plan 端点）。

    | 属性         | 值                    |
    | ------------- | --------------------- |
    | Model         | `qwen-vl-max-latest`  |
    | 支持的输入     | 图像, 视频            |

    媒体理解会根据已配置的 Qwen 认证自动解析——无需额外配置。
    请确保你使用的是 Standard（按量付费）端点以支持媒体理解。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在 Standard（按量付费）Model Studio
    端点上使用：

    - China: `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global: `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点对 `qwen3.6-plus` 返回 “unsupported model” 错误，
    请切换到 Standard（按量付费）而不是 Coding Plan
    端点/密钥对。

    OpenClaw 的内置 Qwen 目录不会在 Coding Plan 端点上宣传
    `qwen3.6-plus`，但如果你在
    `models.providers.qwen.models` 下显式配置了 `qwen/qwen3.6-plus` 条目，
    并且使用 Coding Plan baseUrl，那么该配置会被接受，这样如果阿里云在你的订阅中启用该模型，你就可以选择使用它。是否成功调用仍然由上游 API 决定。

  </Accordion>

  <Accordion title="能力规划">
    `qwen` 插件正被定位为完整 Qwen
    Cloud 入口的厂商主页，而不只是编程/文本模型。

    - **文本/聊天模型：** 目前已内置
    - **工具调用、结构化输出、思考：** 继承自兼容 OpenAI 的传输层
    - **图像生成：** 计划在提供方插件层实现
    - **图像/视频理解：** 目前已在 Standard 端点内置
    - **语音/音频：** 计划在提供方插件层实现
    - **记忆嵌入/重排序：** 计划通过嵌入适配器层提供
    - **视频生成：** 目前已通过共享的视频生成能力内置

  </Accordion>

  <Accordion title="视频生成细节">
    对于视频生成，OpenClaw 会在提交任务前将已配置的 Qwen 区域映射到
    对应的 DashScope AIGC 主机：

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    这意味着，指向任一 Coding Plan 或 Standard Qwen 主机的正常
    `models.providers.qwen.baseUrl` 仍会让视频生成使用正确的
    区域 DashScope 视频端点。

    当前内置 Qwen 视频生成限制：

    - 每次请求最多 **1** 个输出视频
    - 最多 **1** 张输入图片
    - 最多 **4** 个输入视频
    - 最长 **10 秒**
    - 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 参考图片/视频模式当前需要 **远程 http(s) URL**。本地
      文件路径会在前置阶段被拒绝，因为 DashScope 视频端点不接受
      为这些引用上传的本地缓冲区。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Model Studio 端点在共享的 `openai-completions` 传输层上声明了流式使用兼容性。
    OpenClaw 现在根据端点能力进行判断，因此指向
    相同原生主机的 DashScope 兼容自定义提供方 id 会继承相同的
    流式使用行为，而无需特意使用内置的 `qwen` 提供方 id。

    原生流式使用兼容性同时适用于 Coding Plan 主机和
    Standard DashScope 兼容主机：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模态端点区域">
    多模态能力（视频理解和 Wan 视频生成）使用
    **Standard** DashScope 端点，而不是 Coding Plan 端点：

    - Global/Intl Standard base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - China Standard base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `QWEN_API_KEY`
    可供该进程使用（例如放在 `~/.openclaw/.env` 中，或通过
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
  <Card title="阿里巴巴（ModelStudio）" href="/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题解答。
  </Card>
</CardGroup>
