---
summary: "OpenClaw 中的 Alibaba Model Studio Wan 视频生成"
title: "Alibaba Model Studio"
read_when:
  - 你想在 OpenClaw 中使用 Alibaba Wan 视频生成
  - 你需要为视频生成配置 Model Studio 或 DashScope API 密钥
---

捆绑的 `alibaba` 插件会为 Alibaba Model Studio（DashScope 的国际名称）上的 Wan 模型注册一个视频生成提供方。它默认启用；只需要一个 API 密钥。

| 属性             | 值                                                                              |
| ---------------- | ------------------------------------------------------------------------------ |
| 提供方 ID        | `alibaba`                                                                      |
| 插件             | 内置，`enabledByDefault: true`                                                  |
| 认证环境变量     | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY`（首个匹配项生效） |
| 引导标志         | `--auth-choice alibaba-model-studio-api-key`                                    |
| 直接 CLI 标志    | `--alibaba-model-studio-api-key <key>`                                          |
| 默认模型         | `alibaba/wan2.6-t2v`                                                            |
| 默认基础 URL     | `https://dashscope-intl.aliyuncs.com`                                           |

## 入门

<Steps>
  <Step title="设置 API 密钥">
    通过入门流程将密钥存储到 `alibaba` 提供方：

    ```bash
    openclaw onboard --auth-choice alibaba-model-studio-api-key
    ```

    或直接传入密钥：

    ```bash
    openclaw onboard --alibaba-model-studio-api-key <your-key>
    ```

    或在启动网关之前导出一个可接受的环境变量：

    ```bash
    export MODELSTUDIO_API_KEY=sk-...
    # 或 DASHSCOPE_API_KEY=...
    # 或 QWEN_API_KEY=...
    ```

  </Step>
  <Step title="设置默认视频模型">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="验证提供方已配置">
    ```bash
    openclaw models list --provider alibaba
    ```

    列表包含所有五个内置的 Wan 模型。如果无法解析 `MODELSTUDIO_API_KEY`，`openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

<Note>
  Alibaba 插件和 [Qwen 插件](/providers/qwen) 都通过 DashScope 进行身份验证，并接受重叠的环境变量。用于专门的 Wan 视频功能时，请使用 `alibaba/...` 模型 ID；用于 Qwen 聊天、嵌入或媒体理解时，请使用 `qwen/...` ID。
</Note>

## 内置 Wan 模型

| 模型引用                     | 模式                 |
| ---------------------------- | -------------------- |
| `alibaba/wan2.6-t2v`         | 文本生成视频（默认） |
| `alibaba/wan2.6-i2v`         | 图片生成视频         |
| `alibaba/wan2.6-r2v`         | 参考图生成视频       |
| `alibaba/wan2.6-r2v-flash`   | 参考图生成视频（快速） |
| `alibaba/wan2.7-r2v`         | 参考图生成视频       |

## 功能与限制

每个模型仅声明其匹配的运行模式。对于几何参数，也会根据该模型系列的供应商协议进行处理，而不是发送一种通用的参数结构。

| 模式                         | 最大输出视频数 | 参考输入限制                          | 最大时长     | 支持的控制项                                                       |
| ---------------------------- | -------------- | ------------------------------------- | ------------ | ------------------------------------------------------------------ |
| 文生视频                     | 1              | 不适用                                | 15 秒        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark`         |
| 图生视频                     | 1              | 1 张图片                              | 15 秒        | `resolution`、`audio`、`watermark`                                |
| 参考生视频（Wan 2.6）        | 1              | 共 5 张图片/视频；最多 3 个视频       | 10 秒        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark`         |
| 参考生视频（Wan 2.7）        | 1              | 共 5 张图片/视频；最多 3 个视频       | 10 秒        | `size`、`aspectRatio`、`resolution`、`watermark`；音频始终开启   |

Wan 2.6 文本/参考模型会将 `resolution` 与 `aspectRatio` 转换为文档中规定的精确 `size`。Wan 2.6 图生视频会发送 `resolution` 档位，并使用输入图片的宽高比。Wan 2.7 参考生视频会发送更新后的 `media`、`resolution` 和 `ratio` 字段，并始终生成音频。

省略 `durationSeconds` 的请求将使用 DashScope 接受的默认值 **5 秒**。

<Warning>
  参考图和视频输入必须是远程 `http(s)` URL；DashScope 的参考模式会拒绝本地文件路径。请先上传到对象存储，或者使用已能生成公开 URL 的 [媒体工具](/tools/media-overview) 流程。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="覆盖 DashScope 基础 URL">
    该提供方默认使用国际版 DashScope 端点。若要使用中国区端点：

    ```json5
    {
      models: {
        providers: {
          alibaba: {
            baseUrl: "https://dashscope.aliyuncs.com",
          },
        },
      },
    }
    ```

    该提供方在构建 AIGC 任务 URL 之前会去除尾部斜杠。

  </Accordion>

  <Accordion title="认证环境变量优先级">
    OpenClaw 按以下顺序从环境变量中解析 Alibaba API 密钥，采用第一个非空值：

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    已配置的 `auth.profiles` 条目（通过 `openclaw models auth login` 设置）会覆盖环境变量解析。有关配置文件轮换、冷却时间和覆盖机制，请参见 [模型 FAQ 中的身份验证配置文件](/help/faq-models#auth-profiles-what-they-are-and-how-to-manage-them)。

  </Accordion>

  <Accordion title="与 Qwen 插件的关系">
    这两个捆绑插件都与 DashScope 通信，并接受重叠的 API 密钥。请使用：

    - `alibaba/wan*.*` ID 用于本页面所述的专用 Wan 视频提供方。
    - `qwen/*` ID 用于 Qwen 聊天、嵌入和媒体理解（参见 [Qwen](/providers/qwen)）。

    一次设置 `MODELSTUDIO_API_KEY` 即可同时认证两个插件，因为认证环境变量列表是刻意重叠的；无需分别为每个插件进行 onboarding。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供方选择。
  </Card>
  <Card title="Qwen" href="/providers/qwen" icon="microchip">
    在同一 DashScope 身份验证下进行 Qwen 聊天、嵌入和媒体理解的设置。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型常见问题" href="/help/faq-models" icon="circle-question">
    身份验证配置、切换模型，以及解决“无配置”错误。
  </Card>
</CardGroup>