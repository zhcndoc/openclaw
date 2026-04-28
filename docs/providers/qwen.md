---
summary: "通过 OpenClaw 捆绑的 qwen 提供程序使用通义千问云"
read_when:
  - 您想将通义千问与 OpenClaw 一起使用
  - 您之前使用过通义千问 OAuth
title: "通义千问"
---

<Warning>

**通义千问 OAuth 已被移除。** 免费层级的 OAuth 集成
(`qwen-portal`) 使用 `portal.qwen.ai` 端点的服务已不再可用。
请参阅 [问题 #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景信息。

</Warning>

OpenClaw 现在将通义千问视为具有规范 ID `qwen` 的一级捆绑提供程序。该捆绑提供程序针对通义千问云 / 阿里云 DashScope 和 Coding Plan 端点，并将遗留的 `modelstudio` ID 作为兼容性别名保留。

- 提供程序：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 也接受用于兼容性：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 样式：与 OpenAI 兼容

<Tip>
如果您想要 `qwen3.6-plus`，请优先选择 **标准（按量付费）** 端点。
Coding Plan 支持可能滞后于公共目录。
</Tip>

## 开始使用

选择您的计划类型并按照设置步骤操作。

<Tabs>
  <Tab title="Coding Plan（订阅）">
    **最适合：** 通过通义千问 Coding Plan 基于订阅访问。

    <Steps>
      <Step title="获取 API 密钥">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行入职引导">
        对于 **全球** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于 **中国** 端点：

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
    旧版 `modelstudio-*` auth-choice id 和 `modelstudio/...` 模型引用仍可作为兼容性别名使用，但新的设置流程应优先使用规范的 `qwen-*` auth-choice id 和 `qwen/...` 模型引用。如果您通过另一个 `api` 值定义了完全自定义的 `models.providers.modelstudio` 条目，那么该自定义提供程序将拥有 `modelstudio/...` 引用，而不是通义千问兼容别名。
    </Note>

  </Tab>

  <Tab title="标准（按量付费）">
    **最适合：** 通过标准 Model Studio 端点按量付费访问，包括可能在 Coding Plan 上不可用的模型（如 `qwen3.6-plus`）。

    <Steps>
      <Step title="获取 API 密钥">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行入职引导">
        对于 **全球** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **中国** 端点：

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
    旧版 `modelstudio-*` auth-choice id 和 `modelstudio/...` 模型引用仍可作为兼容性别名使用，但新的设置流程应优先使用规范的 `qwen-*` auth-choice id 和 `qwen/...` 模型引用。如果您通过另一个 `api` 值定义了完全自定义的 `models.providers.modelstudio` 条目，那么该自定义提供程序将拥有 `modelstudio/...` 引用，而不是通义千问兼容别名。
    </Note>

  </Tab>
</Tabs>

## 计划类型和端点

| 计划                | 区域 | 认证选择                   | 端点                                             |
| ------------------- | ---- | -------------------------- | ------------------------------------------------ |
| 标准（按量付费）    | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 标准（按量付费）    | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan（订阅） | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan（订阅） | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供程序会根据您的认证选择自动选择端点。规范选择使用 `qwen-*` 系列；`modelstudio-*` 仅保留兼容性支持。您可以在配置中通过自定义 `baseUrl` 覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) |
**文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## 内置目录

OpenClaw 当前包含以下捆绑式通义千问目录。配置的目录是端点感知的：Coding Plan 配置会省略仅在标准端点上已知可用的模型。

| 模型引用                    | 输入       | 上下文    | 说明                            |
| --------------------------- | ---------- | --------- | ------------------------------- |
| `qwen/qwen3.5-plus`         | 文本、图像 | 1,000,000 | 默认模型                        |
| `qwen/qwen3.6-plus`         | 文本、图像 | 1,000,000 | 需要此模型时优先选择标准端点    |
| `qwen/qwen3-max-2026-01-23` | 文本       | 262,144   | 通义千问 Max 系列                   |
| `qwen/qwen3-coder-next`     | 文本       | 262,144   | 代码生成                        |
| `qwen/qwen3-coder-plus`     | 文本       | 1,000,000 | 代码生成                        |
| `qwen/MiniMax-M2.5`         | 文本       | 1,000,000 | 启用推理功能                    |
| `qwen/glm-5`                | 文本       | 202,752   | GLM 系列                        |
| `qwen/glm-4.7`              | 文本       | 202,752   | GLM 系列                        |
| `qwen/kimi-k2.5`            | 文本、图像 | 262,144   | 通过阿里云提供的 Moonshot AI |

<Note>
即使模型存在于捆绑目录中，可用性仍可能因端点和计费计划而异。
</Note>

## Thinking Controls

对于启用推理的通义千问云模型，捆绑提供程序会将 OpenClaw 的思考级别映射到 DashScope 顶层的 `enable_thinking` 请求标志。禁用思考时发送 `enable_thinking: false`；其他思考级别发送 `enable_thinking: true`。

## 多模态附加功能

`qwen` 插件还在 **标准** DashScope 端点上公开多模态能力（而非 Coding Plan 端点）：

- 通过 `qwen-vl-max-latest` 进行 **视频理解**
- 通过 `wan2.6-t2v` (默认), `wan2.6-i2v`, `wan2.6-r2v`, `wan2.6-r2v-flash`, `wan2.7-r2v` 进行 **万相视频生成**

要将通义千问用作默认视频提供程序：

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
请参阅 [视频生成](/tools/video-generation) 了解共享工具参数、提供程序选择和故障转移行为。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="图像和视频理解">
    捆绑的通义千问插件在 **标准** DashScope 端点（而非 Coding Plan 端点）上注册了图像和视频的媒体理解功能。

    | 属性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支持的输入 | 图像，视频       |

    媒体理解从配置的通义千问认证自动解析 — 无需额外配置。确保您使用的是标准（按量付费）端点以获得媒体理解支持。

  </Accordion>

  <Accordion title="通义千问 3.6 Plus 可用性">
    `qwen3.6-plus` 在标准（按量付费）Model Studio 端点上可用：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点返回 "unsupported model" 错误对于 `qwen3.6-plus`，请切换到标准（按量付费）而不是 Coding Plan 端点/密钥对。

  </Accordion>

  <Accordion title="Capability plan">
    `qwen` 插件正被定位为完整 Qwen
    Cloud 表面的厂商主页，而不仅仅是编码/文本模型。

    - **文本/聊天模型：** 现已捆绑
    - **工具调用、结构化输出、思考：** 继承自 OpenAI 兼容传输
    - **图像生成：** 计划在提供程序插件层
    - **图像/视频理解：** 现已在标准端点捆绑
    - **语音/音频：** 计划在提供程序插件层
    - **记忆嵌入/重排序：** 计划通过嵌入适配器表面
    - **视频生成：** 现已通过共享视频生成能力捆绑

  </Accordion>

  <Accordion title="视频生成详情">
    对于视频生成，OpenClaw 在提交作业前将配置的通义千问区域映射到匹配的 DashScope AIGC 主机：

    - 全球/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    这意味着正常的 `models.providers.qwen.baseUrl` 指向 Coding Plan 或标准通义千问主机仍会将视频生成保持在正确的区域 DashScope 视频端点上。

    当前捆绑的通义千问视频生成限制：

    - 每个请求最多 **1** 个输出视频
    - 最多 **1** 个输入图像
    - 最多 **4** 个输入视频
    - 最多 **10 秒** 时长
    - 支持 `size`, `aspectRatio`, `resolution`, `audio`, 和 `watermark`
    - 参考图像/视频模式目前需要 **远程 http(s) URLs**。本地文件路径会被直接拒绝，因为 DashScope 视频端点不接受上传的本地缓冲区用于这些引用。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Model Studio 端点在共享 `openai-completions` 传输上宣传流式使用兼容性。OpenClaw 现在利用端点功能，因此针对相同原生主机的 DashScope 兼容自定义提供程序 ID 继承相同的流式使用行为，而不是专门需要内置的 `qwen` 提供程序 ID。

    原生流式使用兼容性适用于 Coding Plan 主机和标准 DashScope 兼容主机：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模态端点区域">
    多模态表面（视频理解和万相视频生成）使用 **标准** DashScope 端点，而非 Coding Plan 端点：

    - 全球/国际标准基础 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - 中国标准基础 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果网关作为守护进程运行 (launchd/systemd)，确保 `QWEN_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="阿里巴巴 (ModelStudio)" href="/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题解答。
  </Card>
</CardGroup>
