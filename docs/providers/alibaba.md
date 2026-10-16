---
summary: "Alibaba Model Studio OpenClaw 中的万视频生成"
title: "Alibaba Model Studio"
read_when:
  - "你想在 OpenClaw 中使用 Alibaba Wan 视频生成"
  - "你需要为视频生成配置 Model Studio 或 DashScope API 密钥"
---

捆绑的 `alibaba` 插件会为 Alibaba Model Studio（DashScope 的国际名称）上的 Wan 模型注册一个视频生成提供方。它默认启用；只需要一个 API 密钥。

| 属性         | 值                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| 提供方 id      | `alibaba`                                                                       |
| 插件           | 内置，`enabledByDefault: true`                                               |
| 认证环境变量    | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY`（首个匹配项生效） |
| 引导标志  | `--auth-choice alibaba-model-studio-api-key`                                    |
| 直接 CLI 标志  | `--alibaba-model-studio-api-key <key>`                                          |
| 默认模型    | `alibaba/wan2.6-t2v`                                                            |
| 默认基础 URL | `https://dashscope-intl.aliyuncs.com`                                           |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-an-api-key" title="设置 API 密钥">
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
    # or DASHSCOPE_API_KEY=...
    # or QWEN_API_KEY=...
    ```

  </Step>
  <Step id="set-a-default-video-model" title="设置默认视频模型">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "alibaba/wan2.6-t2v",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step id="verify-the-provider-is-configured" title="验证提供程序是否已配置">
    ```bash
    openclaw models list --provider alibaba
    ```

    列表包含所有五个内置的 Wan 模型。如果无法解析 `MODELSTUDIO_API_KEY`，`openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

<Note>
  阿里巴巴插件和 [Qwen 插件](/providers/qwen) 都针对 DashScope 进行身份验证并接受重叠的环境变量。将 `alibaba/...` 模型 ID 用于专用 Wan 视频表面；使用 `qwen/...` id 进行 Qwen 聊天、嵌入或媒体理解。
</Note>

## <a id="built-in-wan-models"></a> 内置 Wan 模型

| 模型引用                  | 模式                      |
| -------------------------- | ------------------------- |
| `alibaba/wan2.6-t2v`       | 文本生成视频（默认）   |
| `alibaba/wan2.6-i2v`       | 图像到视频            |
| `alibaba/wan2.6-r2v`       | 参考图生成视频        |
| `alibaba/wan2.6-r2v-flash` | 参考图生成视频（快速） |
| `alibaba/wan2.7-r2v`       | 参考图生成视频        |

## <a id="capabilities-and-limits"></a> 功能与限制

如果只有一张参考图像且没有视频，`wan2.6-t2v` 会自动使用 `wan2.6-i2v`；结果报告已解析的模型。仅当已知模型目录中存在同代图像到视频同级时，此路由才适用。其他请求使用所选模型的模式。 Geometry 遵循该模型系列的供应商协议。

| 模式                         | 最大输出视频数 | 参考输入限制                      | 最大时长 | 支持的控制项                                                   |
| ---------------------------- | ----------------- | ------------------------------------- | ------------ | -------------------------------------------------------------------- |
| 文本生成视频                | 1                 | n/a                                   | 15 s         | `size`, `aspectRatio`, `resolution`, `audio`, `watermark`            |
| 图像到视频               | 1                 | 1 张图片                               | 15 s         | `resolution`, `audio`, `watermark`                                   |
| 参考视频（Wan 2.6） | 1                 | 5共images/videos；最多 3 个视频 | 10 s         | `size`, `aspectRatio`, `resolution`, `audio`, `watermark`            |
| 参考视频（Wan 2.7） | 1                 | 5共images/videos；最多 3 个视频 | 10 s         | `size`、`aspectRatio`、`resolution`、`watermark`；音频始终开启 |

Wan 2.6 text/reference 模型将 `resolution` 加上 `aspectRatio` 转换为记录的确切 `size`。 Wan 2.6 图像到视频发送 `resolution` 层并使用输入图像的宽高比。 Wan 2.7 视频参考发送较新的 `media`、`resolution` 和 `ratio` 字段，并始终生成音频。

省略 `durationSeconds` 的请求将使用 DashScope 接受的默认值 **5 秒**。

图像到视频和 Wan 2.7 参考图像接受本地文件或远程 `http(s)` URL。 OpenClaw 将本地图像作为 base64 数据 URI 发送，编码前每个图像最多 20 个 MB。请参阅 [image-to-video](https://www.alibabacloud.com/help/en/model-studio/image-to-video-api-reference) 和 [Wan 2.7 reference-to-video](https://www.alibabacloud.com/help/en/model-studio/wan-video-to-video-api-reference) 的 Model Studio 参考。参考视频和 Wan 2.6 参考视频图像仍然需要远程 `http(s)` URL。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="override-the-dashscope-base-url" title="覆盖DashScope基础URL">
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

    提供程序在构造 AIGC 任务 URL 之前去除尾部斜杠。

  </Accordion>

  <Accordion id="auth-env-priority" title="身份验证环境优先级">
    OpenClaw 按以下顺序从环境变量中解析 Alibaba API 密钥，采用第一个非空值：

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    配置的 `auth.profiles` 条目（通过 `openclaw models auth login` 设置）覆盖 env-var 解析。请参阅模型 FAQ](/help/faq-models#auth-profiles-what-they-are-and-how-to-manage-them) 中的 [Auth 配置文件，了解配置文件旋转、冷却和覆盖机制。

  </Accordion>

  <Accordion id="relationship-to-the-qwen-plugin" title="与 Qwen 插件的关系">
    这两个捆绑插件都与 DashScope 通信，并接受重叠的 API 密钥。请使用：

    - 本页记录的专用 Wan 视频提供商的 `alibaba/wan*.*` id。
    - `qwen/*` 用于 Qwen 聊天、嵌入和媒体理解的 id（请参阅 [Qwen](/providers/qwen)）。

    一次设置 `MODELSTUDIO_API_KEY` 即可同时认证两个插件，因为认证环境变量列表是刻意重叠的；无需分别为每个插件进行 onboarding。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Qwen" href="/providers/qwen" icon="microchip">
    在同一 DashScope 身份验证下进行 Qwen 聊天、嵌入和媒体理解的设置。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    验证配置文件、切换模型以及解决“无配置文件”错误。
  </Card>
</CardGroup>
