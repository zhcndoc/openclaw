---
summary: "OpenClaw 中的 Alibaba Model Studio Wan 视频生成"
title: "Alibaba Model Studio"
read_when:
  - 你希望在 OpenClaw 中使用 Alibaba Wan 视频生成
  - 你需要为视频生成设置 Model Studio 或 DashScope API 密钥
---

OpenClaw 自带一个捆绑的 `alibaba` 视频生成提供商，用于 Alibaba Model Studio / DashScope 上的 Wan 模型。

- 提供商：`alibaba`
- 首选认证：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / Model Studio 异步视频生成

## 快速开始

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
  <Step title="验证提供商是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>
任何接受的认证密钥（`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`）均可生效。`qwen-standard-api-key` 引导选项配置的是共享的 DashScope 凭据。
</Note>

## 内置 Wan 模型

捆绑的 `alibaba` 提供商目前注册了：

| 模型引用                   | 模式                      |
| -------------------------- | ------------------------- |
| `alibaba/wan2.6-t2v`       | 文生视频                  |
| `alibaba/wan2.6-i2v`       | 图生视频                  |
| `alibaba/wan2.6-r2v`       | 参考生视频                |
| `alibaba/wan2.6-r2v-flash` | 参考生视频（快速）        |
| `alibaba/wan2.7-r2v`       | 参考生视频                |

## 当前限制

| 参数                  | 限制                                                      |
| --------------------- | --------------------------------------------------------- |
| 输出视频              | 每个请求最多 **1** 个                                     |
| 输入图像              | 最多 **1** 个                                             |
| 输入视频              | 最多 **4** 个                                             |
| 时长                  | 最多 **10 秒**                                            |
| 支持的控制参数        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 参考图像/视频         | 仅限远程 `http(s)` URL                                    |

<Warning>
参考图像/视频模式目前需要 **远程 http(s) URL**。参考输入不支持本地文件路径。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="与 Qwen 的关系">
    捆绑的 `qwen` 提供商也使用 Alibaba 托管的 DashScope 端点进行
    Wan 视频生成。使用：

    - 当你想要规范的 Qwen 提供商界面时使用 `qwen/...`
    - 当你想要直接的供应商自有 Wan 视频入口时使用 `alibaba/...`

    请参阅 [Qwen 提供商文档](/providers/qwen) 了解更多详情。

  </Accordion>

  <Accordion title="认证密钥优先级">
    OpenClaw 按以下顺序检查认证密钥：

    1. `MODELSTUDIO_API_KEY`（首选）
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    其中任何一个都可以验证 `alibaba` 提供商。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Qwen" href="/providers/qwen" icon="microchip">
    Qwen 提供商设置和 DashScope 集成。
  </Card>
  <Card title="Configuration reference" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值和模型配置。
  </Card>
</CardGroup>
