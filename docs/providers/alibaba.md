---
summary: "OpenClaw 中的 Alibaba Model Studio Wan 视频生成"
title: "Alibaba Model Studio"
read_when:
  - 你想在 OpenClaw 中使用 Alibaba Wan 视频生成
  - 你需要为视频生成配置 Model Studio 或 DashScope API 密钥
---

OpenClaw 为 Alibaba Model Studio / DashScope 上的 Wan 模型提供了内置的 `alibaba` 视频生成提供方。

- Provider: `alibaba`
- Preferred auth: `MODELSTUDIO_API_KEY`
- Also accepted: `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API: DashScope / Model Studio 异步视频生成

## 入门

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
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
  <Step title="验证提供方是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>
任何被接受的认证密钥（`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`）都可以使用。`qwen-standard-api-key` 的 onboard 选项会配置共享的 DashScope 凭据。
</Note>

## 内置 Wan 模型

内置的 `alibaba` 提供方当前注册了以下模型：

| Model ref                  | Mode                      |
| -------------------------- | ------------------------- |
| `alibaba/wan2.6-t2v`       | 文本生成视频             |
| `alibaba/wan2.6-i2v`       | 图像生成视频             |
| `alibaba/wan2.6-r2v`       | 参考生成视频             |
| `alibaba/wan2.6-r2v-flash` | 参考生成视频（快速）      |
| `alibaba/wan2.7-r2v`       | 参考生成视频             |

## 当前限制

| Parameter             | Limit                                                     |
| --------------------- | --------------------------------------------------------- |
| 输出视频              | 每次请求最多 **1** 个                                       |
| 输入图像              | 最多 **1**                                                     |
| 输入视频              | 最多 **4**                                                     |
| 时长                  | 最长 **10 秒**                                                |
| 支持的控制项          | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| 参考图像/视频         | 仅支持远程 `http(s)` URL                                  |

<Warning>
参考图像/视频模式当前要求使用**远程 http(s) URL**。不支持将本地文件路径作为参考输入。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="与 Qwen 的关系">
    内置的 `qwen` 提供方同样使用 Alibaba 托管的 DashScope 端点来进行
    Wan 视频生成。使用方式：

    - 当你想使用标准的 Qwen 提供方接口时，使用 `qwen/...`
    - 当你想直接使用厂商原生的 Wan 视频接口时，使用 `alibaba/...`

    详见 [Qwen provider docs](/providers/qwen) 了解更多信息。

  </Accordion>

  <Accordion title="认证密钥优先级">
    OpenClaw 按以下顺序检查认证密钥：

    1. `MODELSTUDIO_API_KEY`（优先）
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    以上任意一种都可用于验证 `alibaba` 提供方。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供方选择。
  </Card>
  <Card title="Qwen" href="/providers/qwen" icon="microchip">
    Qwen 提供方设置和 DashScope 集成。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值和模型配置。
  </Card>
</CardGroup>
