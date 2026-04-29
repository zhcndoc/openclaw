---
summary: "OpenClaw 中的 ComfyUI 工作流图像、视频和音乐生成设置"
title: "ComfyUI"
read_when:
  - 你想在 OpenClaw 中使用本地 ComfyUI 工作流
  - 你想使用 Comfy Cloud 进行图像、视频或音乐工作流
  - 你需要内置的 comfy 插件配置键
---

OpenClaw 附带了一个内置的 `comfy` 插件，用于基于工作流的 ComfyUI 运行。该插件完全由工作流驱动，因此 OpenClaw 不会尝试将通用的 `size`、`aspectRatio`、`resolution`、`durationSeconds` 或类似 TTS 的控制项映射到你的图表中。

| Property        | Detail                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| Provider        | `comfy`                                                                          |
| Models          | `comfy/workflow`                                                                 |
| Shared surfaces | `image_generate`, `video_generate`, `music_generate`                             |
| Auth            | 本地 ComfyUI 无需认证；Comfy Cloud 使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| API             | ComfyUI `/prompt` / `/history` / `/view` 以及 Comfy Cloud `/api/*`                |

## 它支持什么

- 从工作流 JSON 进行图像生成
- 使用 1 张上传的参考图像进行图像编辑
- 从工作流 JSON 进行视频生成
- 使用 1 张上传的参考图像进行视频生成
- 通过共享的 `music_generate` 工具进行音乐或音频生成
- 从配置的节点或所有匹配的输出节点下载输出

## 快速开始

请选择在你自己的机器上运行 ComfyUI，还是使用 Comfy Cloud。

<Tabs>
  <Tab title="本地">
    **最适合：** 在你的机器或局域网中运行你自己的 ComfyUI 实例。

    <Steps>
      <Step title="本地启动 ComfyUI">
        确保你的本地 ComfyUI 实例正在运行（默认是 `http://127.0.0.1:8188`）。
      </Step>
      <Step title="准备你的工作流 JSON">
        导出或创建一个 ComfyUI 工作流 JSON 文件。注意提示词输入节点和你希望 OpenClaw 读取的输出节点的节点 ID。
      </Step>
      <Step title="配置 provider">
        设置 `mode: "local"` 并指向你的工作流文件。以下是一个最小图像示例：

        ```json5
        {
          plugins: {
            entries: {
              comfy: {
                config: {
                  mode: "local",
                  baseUrl: "http://127.0.0.1:8188",
                  image: {
                    workflowPath: "./workflows/flux-api.json",
                    promptNodeId: "6",
                    outputNodeId: "9",
                  },
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step title="设置默认模型">
        将 OpenClaw 指向你所配置能力对应的 `comfy/workflow` 模型：

        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Comfy Cloud">
    **最适合：** 在 Comfy Cloud 上运行工作流，而无需管理本地 GPU 资源。

    <Steps>
      <Step title="获取 API key">
        在 [comfy.org](https://comfy.org) 注册，并从你的账户仪表板生成一个 API key。
      </Step>
      <Step title="设置 API key">
        通过以下任一方式提供你的 key：

        ```bash
        # 环境变量（推荐）
        export COMFY_API_KEY="your-key"

        # 备用环境变量
        export COMFY_CLOUD_API_KEY="your-key"

        # 或直接写入配置
        openclaw config set plugins.entries.comfy.config.apiKey "your-key"
        ```
      </Step>
      <Step title="准备你的工作流 JSON">
        导出或创建一个 ComfyUI 工作流 JSON 文件。注意提示词输入节点和输出节点的节点 ID。
      </Step>
      <Step title="配置 provider">
        设置 `mode: "cloud"` 并指向你的工作流文件：

        ```json5
        {
          plugins: {
            entries: {
              comfy: {
                config: {
                  mode: "cloud",
                  image: {
                    workflowPath: "./workflows/flux-api.json",
                    promptNodeId: "6",
                    outputNodeId: "9",
                  },
                },
              },
            },
          },
        }
        ```

        <Tip>
        云模式会将 `baseUrl` 默认设置为 `https://cloud.comfy.org`。只有在你使用自定义云端 endpoint 时才需要设置 `baseUrl`。
        </Tip>
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置

Comfy 支持共享的顶层连接设置以及按能力划分的工作流部分（`image`、`video`、`music`）：

```json5
{
  plugins: {
    entries: {
      comfy: {
        config: {
          mode: "local",
          baseUrl: "http://127.0.0.1:8188",
          image: {
            workflowPath: "./workflows/flux-api.json",
            promptNodeId: "6",
            outputNodeId: "9",
          },
          video: {
            workflowPath: "./workflows/video-api.json",
            promptNodeId: "12",
            outputNodeId: "21",
          },
          music: {
            workflowPath: "./workflows/music-api.json",
            promptNodeId: "3",
            outputNodeId: "18",
          },
        },
      },
    },
  },
}
```

### 共享键

| Key                   | Type                   | Description                                                                           |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `mode`                | `"local"` or `"cloud"` | 连接模式。                                                                      |
| `baseUrl`             | string                 | 本地默认为 `http://127.0.0.1:8188`，云端默认为 `https://cloud.comfy.org`。 |
| `apiKey`              | string                 | 可选的内联 key，作为 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 环境变量的替代。 |
| `allowPrivateNetwork` | boolean                | 在云模式下允许使用私有/LAN `baseUrl`。                                          |

### 按能力划分的键

这些键适用于 `image`、`video` 或 `music` 部分内部：

| Key                          | Required | Default  | Description                                                                  |
| ---------------------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `workflow` or `workflowPath` | Yes      | --       | ComfyUI 工作流 JSON 文件的路径。                                      |
| `promptNodeId`               | Yes      | --       | 接收文本提示词的节点 ID。                                       |
| `promptInputName`            | No       | `"text"` | 提示词节点上的输入名称。                                               |
| `outputNodeId`               | No       | --       | 用于读取输出的节点 ID。若省略，则使用所有匹配的输出节点。 |
| `pollIntervalMs`             | No       | --       | 作业完成的轮询间隔（毫秒）。                         |
| `timeoutMs`                  | No       | --       | 工作流运行超时（毫秒）。                                |

`image` 和 `video` 部分还支持：

| Key                   | Required                             | Default   | Description                                         |
| --------------------- | ------------------------------------ | --------- | --------------------------------------------------- |
| `inputImageNodeId`    | Yes (when passing a reference image) | --        | 接收上传的参考图像的节点 ID。 |
| `inputImageInputName` | No                                   | `"image"` | 图像节点上的输入名称。                       |

## 工作流详情

<AccordionGroup>
  <Accordion title="图像工作流">
    将默认图像模型设置为 `comfy/workflow`：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    **参考图像编辑示例：**

    要通过上传的参考图像启用图像编辑，请在你的图像配置中添加 `inputImageNodeId`：

    ```json5
    {
      plugins: {
        entries: {
          comfy: {
            config: {
              image: {
                workflowPath: "./workflows/edit-api.json",
                promptNodeId: "6",
                inputImageNodeId: "7",
                inputImageInputName: "image",
                outputNodeId: "9",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="视频工作流">
    将默认视频模型设置为 `comfy/workflow`：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    Comfy 视频工作流通过配置的图支持文生视频和图生视频。

    <Note>
    OpenClaw 不会向 Comfy 工作流传入输入视频。仅支持文本提示词和单张参考图像作为输入。
    </Note>

  </Accordion>

  <Accordion title="音乐工作流">
    内置插件为工作流定义的音频或音乐输出注册了一个音乐生成 provider，并通过共享的 `music_generate` 工具暴露：

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    使用 `music` 配置部分指向你的音频工作流 JSON 和输出节点。

  </Accordion>

  <Accordion title="向后兼容">
    现有的顶层图像配置（没有嵌套的 `image` 部分）仍然可用：

    ```json5
    {
      plugins: {
        entries: {
          comfy: {
            config: {
              workflowPath: "./workflows/flux-api.json",
              promptNodeId: "6",
              outputNodeId: "9",
            },
          },
        },
      },
    }
    ```

    OpenClaw 会将这种旧的结构视为图像工作流配置。你不需要立即迁移，但对于新设置，建议使用嵌套的 `image` / `video` / `music` 部分。

    <Tip>
    如果你只使用图像生成，旧的扁平配置和新的嵌套 `image` 部分在功能上是等价的。
    </Tip>

  </Accordion>

  <Accordion title="实时测试">
    内置插件提供了可选择启用的实时覆盖测试：

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    除非配置了匹配的 Comfy 工作流部分，否则实时测试会跳过单独的图像、视频或音乐用例。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    图像生成工具的配置与使用。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    视频生成工具的配置与使用。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    音乐和音频生成工具设置。
  </Card>
  <Card title="Provider 目录" href="/providers/index" icon="layers">
    所有 provider 和模型引用的概览。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包含 agent 默认值在内的完整配置参考。
  </Card>
</CardGroup>