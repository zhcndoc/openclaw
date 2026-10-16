---
summary: "OpenClaw 中的 Runway 视频生成设置"
title: "Runway"
read_when:
  - "您想在 OpenClaw 中使用 Runway 视频生成"
  - "您需要 Runway API key/env 设置"
  - "你想将 Runway 设为默认视频提供商"
---

OpenClaw 附带了一个用于托管视频生成的 `runway` 提供商，默认启用，并注册到 `videoGenerationProviders` 合同。

| 属性        | 值                                                             |
| --------------- | ----------------------------------------------------------------- |
| 提供方 id     | `runway`                                                          |
| 插件          | 内置，`enabledByDefault: true`                                 |
| 认证环境变量   | `RUNWAYML_API_SECRET`（首选）或 `RUNWAY_API_KEY`             |
| 引导标志 | `--auth-choice runway-api-key`                                    |
| 直接 CLI 标志 | `--runway-api-key <key>`                                          |
| API             | Runway 基于任务的视频生成（轮询 `GET /v1/tasks/{id}`） |
| 默认模型   | `runway/gen4.5`                                                   |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-the-api-key" title="设置API密钥">
    ```bash
    openclaw onboard --auth-choice runway-api-key
    ```
  </Step>
  <Step id="set-runway-as-the-default-video-provider" title="将 Runway 设置为默认视频提供商">
    ```bash
    openclaw config set agents.defaults.mediaModels.video.primary "runway/gen4.5"
    ```
  </Step>
  <Step id="generate-a-video" title="生成视频">
    让代理生成一个视频。Runway 将会自动使用。
  </Step>
</Steps>

## <a id="supported-modes-and-models"></a> 支持的模式和模型

该提供商公开了七个 Runway 模型，分为三种模式。相同的模型 ID 可以服务于多种模式（例如 `gen4.5` 适用于文本到视频和图像到视频）。

| 模式           | 模型                                                                 | 参考输入         |
| -------------- | ---------------------------------------------------------------------- | ----------------------- |
| 文本生成视频  | `gen4.5`（默认）、`veo3.1`、`veo3.1_fast`、`veo3`                    | 无                    |
| 图像到视频 | `gen4.5`, `gen4_turbo`, `gen3a_turbo`, `veo3.1`, `veo3.1_fast`, `veo3` | 1 个本地或远程图像 |
| 视频生成视频 | `gen4_aleph`                                                           | 1 个本地或远程视频 |

通过数据 URI 支持本地图像和视频引用。

| 宽高比         | 允许的值                              |
| --------------------- | ------------------------------------------- |
| 文本生成视频         | `16:9`, `9:16`                              |
| 图像和视频编辑 | `1:1`, `16:9`, `9:16`, `3:4`, `4:3`, `21:9` |

<Warning>
  视频到视频当前需要 `runway/gen4_aleph`。其他 Runway 模型 ID 拒绝视频参考输入。
</Warning>

<Note>
  在 API 请求离开 OpenClaw 之前，从错误的列中选取 Runway 模型 ID 会产生显式错误。提供程序根据 `extensions/runway/video-generation-provider.ts` 中模式的白名单（`TEXT_ONLY_MODELS`、`IMAGE_MODELS`、`VIDEO_MODELS`）验证 `model`。
</Note>

## <a id="configuration"></a> 配置

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "runway/gen4.5",
        },
      },
    },
  },
}
```

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="environment-variable-aliases" title="环境变量别名">
    OpenClaw 可识别 `RUNWAYML_API_SECRET`（首选）和 `RUNWAY_API_KEY`。任一变量都会对 Runway 提供程序进行身份验证。
  </Accordion>

  <Accordion id="task-polling" title="任务轮询">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw 会轮询 `GET /v1/tasks/{id}`，直到视频准备就绪。轮询行为无需额外配置。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供程序选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认设置，包括 `mediaModels.video`。
  </Card>
</CardGroup>
