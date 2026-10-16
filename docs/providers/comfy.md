---
summary: "ComfyUI 工作流程生成和 OpenClaw 中的 Comfy Cloud MCP OAuth 设置"
title: "ComfyUI"
read_when:
  - "你想将本地 ComfyUI 工作流与 OpenClaw 配合使用"
  - "你想将 Comfy Cloud 用于图像、视频或音乐工作流"
  - "您想通过 MCP 连接 Comfy Cloud 账户 OAuth"
  - "你需要 comfy 插件配置键"
---

使用 Comfy Cloud 托管的 MCP 服务器用于帐户 OAuth 以及 Comfy 自己的发现和生成工具。使用 `comfy` 插件通过 OpenClaw 的共享媒体工具进行工作流驱动的运行，并使用用于云工作流的 API 密钥。

## <a id="comfy-cloud-with-mcp-oauth"></a> 舒适云 MCP OAuth

保存托管服务器并使用您的 Comfy 帐户登录：

```bash
openclaw mcp set comfy '{"url":"https://cloud.comfy.org/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login comfy
openclaw mcp status --verbose
```

打开`login`打印的授权书URL，并按照CLI的说明进行操作。如果浏览器无法到达环回回调，请使用打印的 `--code` 回退。有关回调、刷新和登录恢复的详细信息，请参阅 [MCP OAuth 工作流程](/cli/mcp/transports#oauth-workflow)。

授权后，请您的代理通过 MCP 工具发现 Comfy 模板或生成媒体。 Comfy 需要有效的云订阅才能生成。其 [MCP 设置指南 ](https://docs.comfy.org/agent-tools/mcp) 还记录了可​​选的 OpenClaw 技能。

MCP 凭证属于 `https://cloud.comfy.org/mcp` 资源。此连接不配置 `comfy/workflow` 或提供工作流插件的 `apiKey`。将本机云工作流程 API-key 设置分开，如下所述。要清除存储的 MCP 凭据，同时保留服务器定义，请运行 `openclaw mcp logout comfy`。

## <a id="workflow-plugin"></a> 工作流程插件

安装官方 `comfy` 插件，以运行由工作流驱动的 ComfyUI：

```bash
openclaw plugins install @openclaw/comfy-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

该插件完全是工作流程驱动的：OpenClaw 不会将通用 `size`、`aspectRatio`、`resolution`、`durationSeconds` 或 TTS-style 控件映射到图形上。

| 属性     | 详情                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| 提供者     | `comfy`                                                                                    |
| 模型        | `comfy/workflow`                                                                           |
| 共享工具 | `image_generate`, `video_generate`, `music_generate`                                       |
| 认证         | 可选 `headers` 用于本地 HTTP 身份验证； `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用于云 |
| API          | ComfyUI `/prompt` / `/history` / `/view`；舒适云`/api/*`                             |

## <a id="what-it-supports"></a> 它支持什么

- 从工作流 JSON 生成和编辑图像（编辑需要 1 张上传的参考图像）
- 从工作流 JSON 生成视频，支持文本生成视频或图像生成视频（1 张参考图像）
- 通过共享 `music_generate` 工具生成 Music/audio，并带有可选的 1 个参考图像
- 从已配置的节点下载输出；如果未配置，则从所有匹配的输出节点下载。

## <a id="getting-started"></a> 入门

请选择在你自己的机器上运行 ComfyUI，还是使用 Comfy Cloud。

<Tabs>
  <Tab id="local" title="本地">
    **最适合：在您的计算机或 LAN 上运行您自己的 ComfyUI 实例的**。

    <Steps>
      <Step id="start-comfyui-locally" title="本地启动 ComfyUI">
        确保你的本地 ComfyUI 实例正在运行（默认是 `http://127.0.0.1:8188`）。
      </Step>
      <Step id="prepare-your-workflow-json" title="准备您的工作流程 JSON">
        导出或创建 ComfyUI 工作流程 JSON 文件。记下您想要 OpenClaw 读取的提示输入节点和输出节点的节点 ID。
      </Step>
      <Step id="configure-the-provider" title="配置提供者">
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
      <Step id="set-the-default-model" title="设置默认模型">
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
      <Step id="verify" title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab id="comfy-cloud" title="舒适云">
    **最适合：** 在 Comfy Cloud 上运行工作流，而无需管理本地 GPU 资源。

    <Steps>
      <Step id="get-an-api-key" title="获取 API 密钥">
        在 [comfy.org](https://comfy.org) 注册，并从你的账户仪表板生成一个 API 密钥。
      </Step>
      <Step id="set-the-api-key" title="设置API密钥">
        通过以下任一方式提供你的密钥：

        ```bash
        # Onboarding flag
        openclaw onboard --comfy-api-key "your-key"

        # Environment variable (preferred for daemons)
        export COMFY_API_KEY="your-key"

        # Alternative environment variable
        export COMFY_CLOUD_API_KEY="your-key"

        # Or inline in config
        openclaw config set plugins.entries.comfy.config.apiKey "your-key"
        ```
      </Step>
      <Step id="prepare-your-workflow-json-1" title="准备您的工作流程 JSON">
        导出或创建 ComfyUI 工作流程 JSON 文件。记下提示输入节点和输出节点的节点 ID。
      </Step>
      <Step id="configure-the-provider-1" title="配置提供者">
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
      <Step id="set-the-default-model-1" title="设置默认模型">
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
      <Step id="verify-1" title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="configuration"></a> 配置

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

### <a id="shared-keys"></a> 共享键

| 键                   | 类型                   | 描述                                                                           |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `mode`                | `"local"` 或 `"cloud"` | 连接模式。默认为 `"local"`。                                               |
| `baseUrl`             | 字符串                 | 本地模式默认值为 `http://127.0.0.1:8188`，云模式默认值为 `https://cloud.comfy.org`。 |
| `apiKey`              | 字符串或 SecretRef    | 可选云密钥，替代 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 环境变量。  |
| `allowPrivateNetwork` | 布尔值                | 允许云模式下的 private/LAN `baseUrl` 或本地私有 DNS FQDN。              |
| `headers`             | 目的                 | 额外的请求头；每个值接受一个字符串或 SecretRef。                      |

将 `headers.Authorization` 用于 HTTP 身份验证后面的 ComfyUI 实例。首选 [ 秘密参考 ](/gateway/config-secrets-env#secrets) 作为凭据。标头适用于两种模式下的上传、工作流提交、轮询和下载。它们不区分大小写地覆盖默认标头，但图像上传上的 `Content-Type` 除外：运行时设置多部分边界。在发送任何请求之前，不可用的标头 SecretRef 会失败。反映的标头值是从响应错误中编辑的。

<Note>
在 `local` 模式下，loopback/private IP 文字和单标签服务名称（例如 `http://comfyui:8188`）无需 `allowPrivateNetwork` 即可工作。公开的私有 DNS FQDN（例如 `https://comfy.local.example.com`）需要 `allowPrivateNetwork: true`。私有源信任的范围仅限于配置的方案、主机名和端口；本地重定向不能保留配置的主机名，而到公共 CDN 的云重定向则使用默认的 SSRF 策略进行检查。
</Note>

### <a id="per-capability-keys"></a> 按能力划分的键

这些键适用于 `image`、`video` 或 `music` 部分内部：

| 键                          | 必需的 | 默认值  | 描述                                                                                                                                     |
| ---------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow` 或 `workflowPath` | 是      | --       | 内联工作流 JSON，或 ComfyUI 工作流 JSON 文件的路径。                                                                                |
| `promptNodeId`               | 是      | --       | Node ID 接收文字提示。                                                                                                          |
| `promptInputName`            | No       | `"text"` | 提示节点上的输入名称。                                                                                                                  |
| `seedNodeId`                 | No       | --       | Node ID 的输入在每次提交时都会收到一个新鲜的随机种子。忽略在每次运行时重复使用工作流程文件中烘焙的任何种子。 |
| `seedInputName`              | No       | `"seed"` | 在种子节点上输入名称。                                                                                                                    |
| `outputNodeId`               | No       | --       | Node ID 读取输出。如果省略，则使用所有匹配的输出节点。                                                                    |
| `pollIntervalMs`             | No       | `1500`   | 作业完成轮询间隔，单位为毫秒。                                                                                            |
| `timeoutMs`                  | No       | `300000` | 工作流运行超时时间，单位为毫秒。                                                                                                   |

`image` 和 `video` 部分也支持一个参考图像输入节点：

| 键                   | 必需的                             | 默认值   | 描述                                         |
| --------------------- | ------------------------------------ | --------- | --------------------------------------------------- |
| `inputImageNodeId`    | 是（传递参考图像时） | --        | Node ID 接收上传的参考图像。 |
| `inputImageInputName` | No                                   | `"image"` | 图像节点上的输入名称。                       |

`apiKey` 接受文字字符串或 [ 秘密引用 ](/gateway/config-secrets-env#secrets) 对象。

## <a id="workflow-details"></a> 工作流详情

<AccordionGroup>
  <Accordion id="image-workflows" title="图像工作流程">
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

  <Accordion id="video-workflows" title="视频工作流程">
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

  <Accordion id="music-workflows" title="音乐工作流程">
    捆绑的插件会注册一个音乐生成 provider，用于生成工作流定义的音频或音乐输出，并通过共享的 `music_generate` 工具提供。它接受一个可选的参考图像（最多 1 张）：

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    使用 `music` 配置部分指向你的音频工作流 JSON 和输出节点。

  </Accordion>

  <Accordion id="backward-compatibility" title="向后兼容性">
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

  <Accordion id="live-tests" title="实时测试">
    内置插件提供了可选择启用的实时覆盖测试：

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    除非配置了匹配的 Comfy 工作流部分，否则实时测试会跳过单独的图像、视频或音乐用例。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    图像生成工具的配置与使用。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    视频生成工具的配置与使用。
  </Card>
  <Card title="音乐一代" href="/tools/music-generation" icon="music">
    音乐和音频生成工具设置。
  </Card>
  <Card title="提供者目录" href="/providers/index" icon="layers">
    所有提供商和模型引用的概览。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包含智能体默认值在内的完整配置参考。
  </Card>
</CardGroup>
