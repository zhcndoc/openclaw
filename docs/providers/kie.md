---
summary: "Kie AI 视频生成设置和支持的模型"
title: "Kie AI"
read_when:
  - "您想通过Kie AI生成视频"
  - "您需要 KIE_API_KEY 设置或支持的视频模型"
---

OpenClaw 包括默认启用的捆绑 `kie` 插件，用于 [Kie AI](https://kie.ai) 视频生成。

| 属性        | 值                         |
| --------------- | ----------------------------- |
| 提供方 id     | `kie`                         |
| 认证环境变量    | `KIE_API_KEY`                 |
| 引导标志 | `--auth-choice kie-api-key`   |
| 直接 CLI 标志 | `--kie-api-key <key>`         |
| 基础 URL        | `https://api.kie.ai`          |
| 默认模型   | `kie/kling-2.6/text-to-video` |

## <a id="setup"></a> 设置

运行 onboarding 或设置环境变量：

```bash
openclaw onboard --auth-choice kie-api-key
```

```bash
export KIE_API_KEY="example-kie-key-not-real"
```

## <a id="video-generation"></a> 视频生成

Kie 支持文本转视频和图像转视频，每个请求一个视频。使用完整的 `kie/<model>` 参考号选择模型：

| 家族           | 文本转视频模型                 | 图像到视频模型                 |
| ---------------- | ----------------------------------- | ------------------------------------ |
| Grok 想象一下     | `grok-imagine/text-to-video`        | `grok-imagine/image-to-video`        |
| 海螺02        | `hailuo/02-text-to-video-standard`  | `hailuo/02-image-to-video-standard`  |
| 海螺02 Pro    | `hailuo/02-text-to-video-pro`       | `hailuo/02-image-to-video-pro`       |
| 海洛 2.3       | -                                   | `hailuo/2-3-image-to-video-standard` |
| 海洛2.3 Pro   | -                                   | `hailuo/2-3-image-to-video-pro`      |
| 克林 2.6        | `kling-2.6/text-to-video`（默认） | `kling-2.6/image-to-video`           |
| Seedance 1.5 Pro | `bytedance/seedance-1.5-pro`        | `bytedance/seedance-1.5-pro`         |
| 万2.6          | `wan/2-6-text-to-video`             | `wan/2-6-image-to-video`             |

对于配对模型，添加一张参考图像会自动切换到匹配的图像到视频模型；省略它会选择文本到视频模型。 Hailuo 2.3 模型始终需要图像。 Seedance 对两种模式使用相同的模型 ID。

| 家族           | 持续时间（秒） | 分辨率控制                        | 音频切换 |
| ---------------- | ------------------ | ------------------------------------------ | ------------ |
| Grok 想象一下     | 6–30               | `480P`, `720P`, `1080P`                    | No           |
| 海螺02        | 6 or 10            | 图像模式：`512P`、`768P`                 | No           |
| 海螺02 Pro    | 提供商管理   | 提供商管理                           | No           |
| 海洛 2.3 / Pro | 6 or 10            | `768P`、`1080P`（1080P需要6秒） | No           |
| 克林 2.6        | 5 or 10            | 提供商管理                           | 是          |
| Seedance 1.5 Pro | 4–12               | `480P`, `720P`, `1080P`                    | 是          |
| 万2.6          | 5, 10, or 15       | `720P`, `1080P`                            | No           |

长宽比控件可用于纯文本 Kling 和 Grok 模型以及两种 Seedance 模式。运行 `video_generate action=list` 以获取模型支持的控件。 Kling 和 Seedance 默认不生成音频。

参考图像可以是远程 HTTP（S） URL 或本地文件。 OpenClaw通过Kie的base64文件上传API上传本地图片，并将返回的URL传递给生成。这个初始插件支持一张图像最多 10 个 MB：Kling 的 JPEG 或 PNG；其他模型为 JPEG、PNG 或 WebP。不支持视频到视频和音频参考输入。

设置默认视频模型：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "kie/kling-2.6/text-to-video",
        },
      },
    },
  },
}
```

Kie 作业可能需要几分钟时间。 OpenClaw 轮询直至完成，默认情况下最多等待十分钟。需要时用 `agents.defaults.mediaModels.video.timeoutMs` 覆盖它。即使 Kie 返回 HTTP 200，也会出现提供程序错误消息。

Veo 尚未包含在内；在添加支持之前，需要协调其专用和市场 API 合约。

## <a id="live-testing"></a> 在线测试

共享视频smoke支持Kie。为提供者队列留出时间：

```bash
OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=600000 \
  pnpm test:live:media video --video-providers kie
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 也可以执行本地图像上传和图像到视频生成。

## <a id="related"></a> 相关内容

- [Kie API 文档](https://docs.kie.ai)
- [视频生成](/tools/video-generation)
- [提供商目录](/providers/index)
