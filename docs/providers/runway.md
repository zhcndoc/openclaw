---
summary: "OpenClaw 中的 Runway 视频生成设置"
title: "Runway"
read_when:
  - 你想在 OpenClaw 中使用 Runway 视频生成
  - 你需要 Runway API 密钥/环境变量设置
  - 你想将 Runway 设为默认视频提供商
---

OpenClaw 附带了一个用于托管视频生成的 `runway` 提供商。该插件默认启用，并将 `runway` 提供商注册到 `videoGenerationProviders` 合约中。

| 属性            | 值                                                                |
| --------------- | ----------------------------------------------------------------- |
| 提供商 id       | `runway`                                                          |
| 插件            | 捆绑内置，`enabledByDefault: true`                                 |
| 认证环境变量    | `RUNWAYML_API_SECRET`（规范）或 `RUNWAY_API_KEY`             |
| 入门标志        | `--auth-choice runway-api-key`                                    |
| 直接 CLI 标志   | `--runway-api-key <key>`                                          |
| API             | Runway 基于任务的视频生成（轮询 `GET /v1/tasks/{id}`）            |
| 默认模型        | `runway/gen4.5`                                                   |

## 开始使用

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice runway-api-key
    ```
  </Step>
  <Step title="将 Runway 设置为默认视频提供商">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
    ```
  </Step>
  <Step title="生成视频">
    让代理生成一个视频。Runway 将会自动使用。
  </Step>
</Steps>

## 支持的模式和模型

该提供商在三种模式下公开了七个 Runway 模型。同一个模型 id 可以服务于不止一种模式（例如 `gen4.5` 同时适用于文本到视频和图像到视频）。

| 模式             | 模型                                                                   | 参考输入                 |
| ---------------- | ---------------------------------------------------------------------- | ------------------------ |
| 文本到视频       | `gen4.5`（默认）、`veo3.1`、`veo3.1_fast`、`veo3`                    | 无                       |
| 图像到视频       | `gen4.5`、`gen4_turbo`、`gen3a_turbo`、`veo3.1`、`veo3.1_fast`、`veo3` | 1 张本地或远程图像        |
| 视频到视频       | `gen4_aleph`                                                           | 1 个本地或远程视频        |

支持通过 data URI 引用本地图像和视频。

| 宽高比                | 允许的值                                   |
| --------------------- | ------------------------------------------- |
| 文本到视频            | `16:9`、`9:16`                            |
| 图像和视频编辑        | `1:1`、`16:9`、`9:16`、`3:4`、`4:3`、`21:9` |

<Warning>
  视频到视频目前需要 `runway/gen4_aleph`。其他 Runway 模型 id 会拒绝视频参考输入。
</Warning>

<Note>
  从错误列中选择 Runway 模型 id 会在 API 请求离开 OpenClaw 之前产生明确错误。该提供商会根据模式的允许列表（`TEXT_ONLY_MODELS`、`IMAGE_MODELS`、`VIDEO_MODELS`）在 `extensions/runway/video-generation-provider.ts` 中验证 `model`。
</Note>

## 配置

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="环境变量别名">
    OpenClaw 同时识别 `RUNWAYML_API_SECRET`（规范）和 `RUNWAY_API_KEY`。
    任一变量都可用于对 Runway 提供商进行身份验证。
  </Accordion>

  <Accordion title="任务轮询">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw
    会轮询 `GET /v1/tasks/{id}`，直到视频准备就绪。轮询行为无需额外
    配置。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供商选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包括视频生成模型在内的代理默认设置。
  </Card>
</CardGroup>
