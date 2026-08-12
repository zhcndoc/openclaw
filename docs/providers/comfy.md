---
summary: "OpenClaw 中的 ComfyUI 工作流图像、视频和音乐生成设置"
title: "ComfyUI"
read_when:
  - "你想将本地 ComfyUI 工作流与 OpenClaw 配合使用"
  - "你想将 Comfy Cloud 用于图像、视频或音乐工作流"
  - "你需要 comfy 插件配置键"
---

安装官方 `comfy` 插件，以运行由工作流驱动的 ComfyUI：

```bash
openclaw plugins install @openclaw/comfy-provider
openclaw gateway restart
```

该插件完全由工作流驱动：OpenClaw 不会将通用的 `size`、
`aspectRatio`、`resolution`、`durationSeconds` 或 TTS 风格的控件映射到
你的图中。

| 属性         | 详情                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| 提供商       | `comfy`                                                                          |
| 模型         | `comfy/workflow`                                                                 |
| 共享工具     | `image_generate`、`video_generate`、`music_generate`                             |
| 身份验证     | 本地 ComfyUI 不需要；Comfy Cloud 使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| API          | ComfyUI `/prompt` / `/history` / `/view`；Comfy Cloud `/api/*`                   |

## 它支持什么

- 从工作流 JSON 生成和编辑图像（编辑需要 1 张上传的参考图像）
- 从工作流 JSON 生成视频，支持文本生成视频或图像生成视频（1 张参考图像）
- 通过共享的 `music_generate` 工具生成音乐/音频，可选使用 1 张参考图像
- 从已配置的节点下载输出；如果未配置，则从所有匹配的输出节点下载。

## 快速开始

请选择在你自己的机器上运行 ComfyUI，还是使用 Comfy Cloud。

<Tabs>
  <Tab title="本地">
    **最适合：** 在你的机器或局域网中运行自己的 ComfyUI 实例。

    <Steps>
      <Step title="在本地启动 ComfyUI">
        确保你的本地 ComfyUI 实例正在运行（默认是 `http://127.0.0.1:8188`）。
      </Step>
      <Step title="准备你的工作流 JSON">
        导出或创建一个 ComfyUI 工作流 JSON 文件。注意提示词输入节点和你希望 OpenClaw 读取的输出节点的节点 ID。
      </Step>
      <Step title="配置提供商">
        设置 `mode: "local"` 并指向你的工作流文件。最小图片示例：

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
              mediaModels: {
                image: {
                  primary: "comfy/workflow",
                },
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
      <Step title="获取 API 密钥">
        在 [comfy.org](https://comfy.org) 注册，并从你的账户仪表板生成一个 API 密钥。
      </Step>
      <Step title="设置 API 密钥">
        通过以下任一方式提供你的密钥：

        ```bash
        # 入门引导标志
        openclaw onboard --comfy-api-key "your-key"

        # 环境变量（推荐用于守护进程）
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
      <Step title="配置提供商">
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
        云模式默认将 `baseUrl` 设置为 `https://cloud.comfy.org`。仅在使用自定义云端点时设置 `baseUrl`。
        </Tip>
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              mediaModels: {
                image: {
                  primary: "comfy/workflow",
                },
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

| 键                      | 类型                   | 描述                                                                                 |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `mode`                  | `"local"` 或 `"cloud"` | 连接模式。默认为 `"local"`。                                                           |
| `baseUrl`               | 字符串                 | 本地模式默认值为 `http://127.0.0.1:8188`，云模式默认值为 `https://cloud.comfy.org`。 |
| `apiKey`                | 字符串                 | 可选的内联密钥，可替代 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 环境变量。             |
| `allowPrivateNetwork`   | 布尔值                 | 在云模式下允许使用私有／LAN `baseUrl`，或本地私有 DNS FQDN。                            |

<Note>
在 `local` 模式下，回环／私有 IP 字面量以及诸如 `http://comfyui:8188` 这样的单标签服务名都可以在不使用 `allowPrivateNetwork` 的情况下工作。像 `https://comfy.local.example.com` 这样的外观上属于公网域名的私有 DNS FQDN 需要设置 `allowPrivateNetwork: true`。私有来源信任仍然仅限于已配置的协议、主机名和端口；本地重定向不能离开已配置的主机名，而指向公共 CDN 的云端重定向会按默认 SSRF 策略进行检查。
</Note>

### 按能力划分的键

这些键适用于 `image`、`video` 或 `music` 部分内部：

| 键                          | 必填 | 默认值  | 描述                                                                  |
| --------------------------- | ---- | ------- | --------------------------------------------------------------------- |
| `workflow` 或 `workflowPath` | 是   | --      | 内联工作流 JSON，或 ComfyUI 工作流 JSON 文件的路径。                  |
| `promptNodeId`              | 是   | --      | 接收文本提示词的节点 ID。                                              |
| `promptInputName`           | 否   | `"text"` | 提示节点上的输入名称。                                                  |
| `outputNodeId`              | 否   | --      | 要读取输出的节点 ID。若省略，则使用所有匹配的输出节点。                 |
| `pollIntervalMs`            | 否   | `1500`  | 作业完成轮询间隔，单位为毫秒。                                          |
| `timeoutMs`                 | 否   | `300000` | 工作流运行超时时间，单位为毫秒。                                        |

`image` 和 `video` 部分也支持一个参考图像输入节点：

| 键                   | 必填                                     | 默认值    | 描述                                  |
| -------------------- | ---------------------------------------- | --------- | ------------------------------------- |
| `inputImageNodeId`   | 是（传递参考图像时）                     | --        | 接收上传的参考图像的节点 ID。         |
| `inputImageInputName` | 否                                       | `"image"` | 图像节点上的输入名称。                |

`apiKey` 可以接受字面字符串或 [机密引用](/gateway/configuration-reference#secrets) 对象。

## 工作流详情

<AccordionGroup>
  <Accordion title="图像工作流">
    将默认图像模型设置为 `comfy/workflow`：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "comfy/workflow",
            },
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
          mediaModels: {
            video: {
              primary: "comfy/workflow",
            },
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
    捆绑的插件会注册一个音乐生成 provider，用于生成工作流定义的音频或音乐输出，并通过共享的 `music_generate` 工具提供。它接受一个可选的参考图像（最多 1 张）：

    ```text
    /tool music_generate prompt="温暖的氛围感合成器循环，带有柔和的磁带质感"
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

    OpenClaw 将该旧版结构视为图像工作流配置。你不需要立即迁移，但对于新设置，建议使用嵌套的 `image` / `video` / `music` 部分。如果你只使用图像生成，那么旧的扁平配置和新的嵌套 `image` 部分在功能上是等效的。

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
  <Card title="提供商目录" href="/providers/index" icon="layers">
    所有提供商和模型引用的概览。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包含智能体默认值在内的完整配置参考。
  </Card>
</CardGroup>