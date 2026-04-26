---
summary: "ComfyUI 工作流图像、视频和音乐生成在 OpenClaw 中的设置"
title: "ComfyUI"
read_when:
  - 你想在 OpenClaw 中使用本地 ComfyUI 工作流
  - 你想使用 Comfy Cloud 进行图像、视频或音乐工作流
  - 你需要捆绑的 comfy 插件配置键
---

OpenClaw 随附了一个捆绑的 `comfy` 插件，用于基于工作流的 ComfyUI 运行。该插件完全由工作流驱动，因此 OpenClaw 不会尝试将通用的 `size`、`aspectRatio`、`resolution`、`durationSeconds` 或类似 TTS 的控制项映射到您的图中。

| 属性            | 详情                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| Provider        | `comfy`                                                                          |
| Models          | `comfy/workflow`                                                                 |
| 共享接口        | `image_generate`, `video_generate`, `music_generate`                             |
| 认证            | 本地 ComfyUI 无需；Comfy Cloud 需要 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| API             | ComfyUI `/prompt` / `/history` / `/view` 和 Comfy Cloud `/api/*`                |

## 支持的功能

- 从工作流 JSON 生成图像
- 使用 1 张上传的参考图像进行图像编辑
- 从工作流 JSON 生成视频
- 使用 1 张上传的参考图像生成视频
- 通过共享的 `music_generate` 工具生成音乐或音频
- 从配置的节点或所有匹配的输出节点下载输出

## 快速开始

选择在您自己的机器上运行 ComfyUI 或使用 Comfy Cloud。

<Tabs>
  <Tab title="本地">
    **最适合：** 在您自己的机器或局域网上运行您自己的 ComfyUI 实例。

    <Steps>
      <Step title="本地启动 ComfyUI">
        确保您的本地 ComfyUI 实例正在运行（默认为 `http://127.0.0.1:8188`）。
      </Step>
      <Step title="准备您的工作流 JSON">
        导出或创建 ComfyUI 工作流 JSON 文件。注意提示输入节点以及您希望 OpenClaw 读取的输出节点的节点 ID。
      </Step>
      <Step title="配置提供者">
        设置 `mode: "local"` 并指向您的工作流文件。这是一个最小的图像示例：

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
        将 OpenClaw 指向您配置的功能的 `comfy/workflow` 模型：

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
    **最适合：** 在 Comfy Cloud 上运行工作流，无需管理本地 GPU 资源。

    <Steps>
      <Step title="获取 API 密钥">
        在 [comfy.org](https://comfy.org) 注册并从您的账户仪表板生成 API 密钥。
      </Step>
      <Step title="设置 API 密钥">
        通过以下方法之一提供您的密钥：

        ```bash
        # 环境变量（首选）
        export COMFY_API_KEY="your-key"

        # 备用环境变量
        export COMFY_CLOUD_API_KEY="your-key"

        # 或直接内联到配置中
        openclaw config set plugins.entries.comfy.config.apiKey "your-key"
        ```
      </Step>
      <Step title="准备您的工作流 JSON">
        导出或创建 ComfyUI 工作流 JSON 文件。注意提示输入节点和输出节点的节点 ID。
      </Step>
      <Step title="配置提供者">
        设置 `mode: "cloud"` 并指向您的工作流文件：

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
        云模式默认将 `baseUrl` 设置为 `https://cloud.comfy.org`。仅当您使用自定义云端点时才需要设置 `baseUrl`。
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

Comfy 支持共享的顶层连接设置以及每个功能的工作流部分（`image`、`video`、`music`）：

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

| 键                    | 类型                   | 描述                                                                           |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `mode`                | `"local"` 或 `"cloud"` | 连接模式。                                                                      |
| `baseUrl`             | string                 | 本地默认为 `http://127.0.0.1:8188`，云默认为 `https://cloud.comfy.org`。 |
| `apiKey`              | string                 | 可选的内联密钥，作为 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 环境变量的替代。 |
| `allowPrivateNetwork` | boolean                | 允许在云模式中使用私有/局域网 `baseUrl`。                                          |

### 每个功能的键

这些键适用于 `image`、`video` 或 `music` 部分内部：

| 键                           | 必需 | 默认  | 描述                                                                  |
| ---------------------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `workflow` 或 `workflowPath` | 是      | --       | ComfyUI 工作流 JSON 文件的路径。                                      |
| `promptNodeId`               | 是      | --       | 接收文本提示的节点 ID。                                       |
| `promptInputName`            | 否       | `"text"` | 提示节点上的输入名称。                                               |
| `outputNodeId`               | 否       | --       | 读取输出的节点 ID。如果省略，将使用所有匹配的输出节点。 |
| `pollIntervalMs`             | 否       | --       | 作业完成的轮询间隔（毫秒）。                         |
| `timeoutMs`                  | 否       | --       | 工作流运行的超时时间（毫秒）。                                |

`image` 和 `video` 部分还支持：

| 键                    | 必需                             | 默认   | 描述                                         |
| --------------------- | ------------------------------------ | --------- | --------------------------------------------------- |
| `inputImageNodeId`    | 是（当传递参考图像时） | --        | 接收上传参考图像的节点 ID。 |
| `inputImageInputName` | 否                                   | `"image"` | 图像节点上的输入名称。                       |

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

    要启用带有上传参考图像的图像编辑，请将 `inputImageNodeId` 添加到您的图像配置中：

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
    OpenClaw 不会将输入视频传递到 Comfy 工作流中。仅支持文本提示和单个参考图像作为输入。
    </Note>

  </Accordion>

  <Accordion title="音乐工作流">
    捆绑的插件注册了一个用于工作流定义的音频或音乐输出的音乐生成提供者，通过共享的 `music_generate` 工具展示：

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    使用 `music` 配置部分指向您的音频工作流 JSON 和输出节点。

  </Accordion>

  <Accordion title="向后兼容性">
    现有的顶层图像配置（没有嵌套的 `image` 部分）仍然有效：

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

    OpenClaw 将该旧版结构视为图像工作流配置。您不需要立即迁移，但建议新设置使用嵌套的 `image` / `video` / `music` 部分。

    <Tip>
    如果您只使用图像生成，旧版平面配置和新的嵌套 `image` 部分在功能上是等效的。
    </Tip>

  </Accordion>

  <Accordion title="实时测试">
    捆绑插件存在选择加入的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    除非配置了匹配的 Comfy 工作流部分，否则实时测试会跳过单独的图像、视频或音乐用例。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    图像生成工具配置和使用。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    视频生成工具配置和使用。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    音乐和音频生成工具设置。
  </Card>
  <Card title="提供者目录" href="/providers/index" icon="layers">
    所有提供者和模型引用的概述。
  </Card>
  <Card title="Configuration reference" href="/gateway/config-agents#agent-defaults" icon="gear">
    Full config reference including agent defaults.
  </Card>
</CardGroup>