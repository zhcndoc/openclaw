---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 设置指导
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供程序默认为 **MiniMax M2.7**。

MiniMax 还提供：

- 通过 T2A v2 捆绑语音合成
- 通过 `MiniMax-VL-01` 捆绑图像理解
- 通过 `music-2.5+` 捆绑音乐生成
- 通过 MiniMax 编码计划搜索 API 捆绑 `web_search`

提供程序划分：

| 提供程序 ID      | 认证    | 功能                                                    |
| ---------------- | ------- | --------------------------------------------------------------- |
| `minimax`        | API key | 文本、图像生成、图像理解、语音、网页搜索 |
| `minimax-portal` | OAuth   | 文本、图像生成、图像理解                     |

## 内置目录

| 模型                    | 类型             | 描述                              |
| ------------------------ | ---------------- | ---------------------------------------- |
| `MiniMax-M2.7`           | 聊天（推理） | 默认托管推理模型           |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理层级               |
| `MiniMax-VL-01`          | 视觉           | 图像理解模型                |
| `image-01`               | 图像生成 | 文生图和图生图编辑 |
| `music-2.5+`             | 音乐生成 | 默认音乐模型                      |
| `music-2.5`              | 音乐生成 | 上一代音乐生成层级           |
| `music-2.0`              | 音乐生成 | 旧版音乐生成层级             |
| `MiniMax-Hailuo-2.3`     | 视频生成 | 文生图和图像参考流程  |

| 模型                    | 类型             | 描述                              |
| ------------------------ | ---------------- | ---------------------------------------- |
| `MiniMax-M2.7`           | 聊天（推理） | 默认托管推理模型           |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理层级               |
| `MiniMax-VL-01`          | 视觉           | 图像理解模型                |
| `image-01`               | 图像生成 | 文生图和图生图编辑 |
| `music-2.5+`             | 音乐生成 | 默认音乐模型                      |
| `music-2.5`              | 音乐生成 | 上一代音乐生成层级           |
| `music-2.0`              | 音乐生成 | 旧版音乐生成层级             |
| `MiniMax-Hailuo-2.3`     | 视频生成 | 文生图和图像参考流程  |

## 快速开始

选择您首选的认证方法并遵循设置步骤。

<Tabs>
  <Tab title="OAuth（编码计划）">
    **最适合：** 通过 OAuth 快速设置 MiniMax 编码计划，无需 API 密钥。

    <Tabs>
      <Tab title="国际">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            这将针对 `api.minimax.io` 进行认证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            这将针对 `api.minimaxi.com` 进行认证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 设置使用 `minimax-portal` 提供程序 ID。模型引用遵循 `minimax-portal/MiniMax-M2.7` 形式。
    </Note>

    <Tip>
    MiniMax 编码计划推荐链接（9 折优惠）：[MiniMax 编码计划](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API 密钥">
    **最适合：** 具有 Anthropic 兼容 API 的托管 MiniMax。

    <Tabs>
      <Tab title="国际">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这将配置 `api.minimax.io` 为基础 URL。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            这将配置 `api.minimaxi.com` 为基础 URL。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### 配置示例

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    在 Anthropic 兼容的流式路径上，OpenClaw 默认禁用 MiniMax 思考，除非您显式设置 `thinking`。MiniMax 的流式端点在 OpenAI 风格的 delta 块中发出 `reasoning_content`，而不是原生 Anthropic 思考块，如果隐式启用，可能会将内部推理泄露到可见输出中。
    </Warning>

    <Note>
    API 密钥设置使用 `minimax` 提供程序 ID。模型引用遵循 `minimax/MiniMax-M2.7` 形式。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 配置

使用交互式配置向导设置 MiniMax 而无需编辑 JSON：

<Steps>
  <Step title="启动向导">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="选择模型/认证">
    从菜单中选择 **模型/认证**。
  </Step>
  <Step title="选择 MiniMax 认证选项">
    选择一个可用的 MiniMax 选项：

    | 认证选择 | 描述 |
    | --- | --- |
    | `minimax-global-oauth` | 国际 OAuth（编码计划） |
    | `minimax-cn-oauth` | 中国 OAuth（编码计划） |
    | `minimax-global-api` | 国际 API 密钥 |
    | `minimax-cn-api` | 中国 API 密钥 |

    | 认证选项 | 描述 |
    | --- | --- |
    | `minimax-global-oauth` | 国际 OAuth（编码计划） |
    | `minimax-cn-oauth` | 中国 OAuth（编码计划） |
    | `minimax-global-api` | 国际 API 密钥 |
    | `minimax-cn-api` | 中国 API 密钥 |

  </Step>
  <Step title="选择默认模型">
    在提示时选择您的默认模型。
  </Step>
</Steps>

## 功能

### 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- 带有宽高比控制的 **文生图**
- 带有宽高比控制的 **图生图编辑**（主体参考）
- 每个请求最多 **9 张输出图像**
- 每个编辑请求最多 **1 张参考图像**
- 支持的宽高比：`1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

要使用 MiniMax 进行图像生成，请将其设置为图像生成提供程序：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 认证。如果已设置 MiniMax，则无需额外配置。

`minimax` 和 `minimax-portal` 都使用相同的 `image-01` 模型注册 `image_generate`。API 密钥设置使用 `MINIMAX_API_KEY`；OAuth 设置可以使用捆绑的 `minimax-portal` 认证路径。

当进行初始化或 API 密钥设置并写入显式的 `models.providers.minimax`
条目时，OpenClaw 会将 `MiniMax-M2.7` 和
`MiniMax-M2.7-highspeed` 具体化为仅文本聊天模型。图像理解
通过插件拥有的 `MiniMax-VL-01` 媒体提供程序单独暴露。

<Note>
请参阅 [图像生成](/tools/image-generation) 以了解共享工具参数、提供程序选择和故障转移行为。
</Note>

### 音乐生成

捆绑的 `minimax` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`minimax/music-2.5+`
- 还支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示控制：`lyrics`, `instrumental`, `durationSeconds`
- 输出格式：`mp3`
- 会话支持的运行通过共享的任务/状态流程分离，包括 `action: "status"`

要将 MiniMax 用作默认音乐提供程序：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

<Note>
请参阅 [音乐生成](/tools/music-generation) 以了解共享工具参数、提供程序选择和故障转移行为。
</Note>

### 视频生成

捆绑的 `minimax` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- 模式：文生图和单图像参考流程
- 支持 `aspectRatio` 和 `resolution`

要将 MiniMax 用作默认视频提供程序：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>
请参阅 [视频生成](/tools/video-generation) 以了解共享工具参数、提供程序选择和故障转移行为。
</Note>

### 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| 提供程序 ID      | 默认图像模型 |
| ---------------- | ------------------- |
| `minimax`        | `MiniMax-VL-01`     |
| `minimax-portal` | `MiniMax-VL-01`     |

| 提供程序 ID      | 默认图像模型 |
| ---------------- | ------------------- |
| `minimax`        | `MiniMax-VL-01`     |
| `minimax-portal` | `MiniMax-VL-01`     |

这就是为什么即使捆绑的文本提供程序目录仍然显示仅文本的 M2.7 聊天引用，自动媒体路由也可以使用 MiniMax 图像理解。

### 网页搜索

MiniMax 插件还通过 MiniMax 编码计划搜索 API 注册 `web_search`。

- 提供程序 ID：`minimax`
- 结构化结果：标题、URL、片段、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`
- 兼容性回退：当 `MINIMAX_API_KEY` 已经指向编码计划令牌时
- 区域复用：`plugins.entries.minimax.config.webSearch.region`，然后是 `MINIMAX_API_HOST`，然后是 MiniMax 提供程序基础 URL
- 搜索保持在提供程序 ID `minimax` 上；OAuth 中国/全球设置仍然可以通过 `models.providers.minimax-portal.baseUrl` 间接引导区域

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>
请参阅 [MiniMax 搜索](/tools/minimax-search) 以了解完整的网页搜索配置和用法。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 首选 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 为 OpenAI 兼容 payload 的可选项 |
    | `models.providers.minimax.api` | 首选 `anthropic-messages`；`openai-completions` 为 OpenAI 兼容 payload 的可选项 |
    | `models.providers.minimax.apiKey` | MiniMax API 密钥 (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为允许列表中所需的模型设置别名 |
    | `models.mode` | 如果您希望将 MiniMax 与内置模型一起添加，请保留 `merge` |
  </Accordion>

  <Accordion title="思考默认设置">
    在 `api: "anthropic-messages"` 上，除非思考已在参数/配置中显式设置，否则 OpenClaw 会注入 `thinking: { type: "disabled" }`。

    这可以防止 MiniMax 的流式端点在 OpenAI 风格的 delta 块中发出 `reasoning_content`，从而避免内部推理泄露到可见输出中。

  </Accordion>

  <Accordion title="快速模式">
    `/fast on` 或 `params.fastMode: true` 会在 Anthropic 兼容的流式路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
  </Accordion>

  <Accordion title="回退示例">
    **最适合：** 将您最强的最新一代模型保留为主要模型，故障转移到 MiniMax M2.7。下面的示例使用 Opus 作为具体的主要模型；请替换为您首选的最新一代主要模型。

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Coding Plan 使用详情">
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 密钥）。
    - OpenClaw 将 MiniMax coding-plan 使用情况标准化为与其他提供商相同的 `% left` 显示。MiniMax 的原始 `usage_percent` / `usagePercent` 字段是剩余配额，而非已消耗配额，因此 OpenClaw 会将其反转。当存在基于计数的字段时优先使用。
    - 当 API 返回 `model_remains` 时，OpenClaw 优先使用聊天模型条目，必要时从 `start_time` / `end_time` 派生窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
    - 使用快照将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为相同的 MiniMax 配额表面，并优先使用存储的 MiniMax OAuth，然后才回退到 Coding Plan 密钥环境变量。
  </Accordion>
</AccordionGroup>

## 注意事项

- Model refs follow the auth path:
  - API-key setup: `minimax/<model>`
  - OAuth setup: `minimax-portal/<model>`
- Default chat model: `MiniMax-M2.7`
- Alternate chat model: `MiniMax-M2.7-highspeed`
- Onboarding and direct API-key setup write text-only model definitions for both M2.7 variants
- Image understanding uses the plugin-owned `MiniMax-VL-01` media provider
- Update pricing values in `models.json` if you need exact cost tracking
- Use `openclaw models list` to confirm the current provider id, then switch with `openclaw models set minimax/MiniMax-M2.7` or `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>
MiniMax Coding Plan 推荐链接（9 折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
</Tip>

<Note>
有关提供商规则，请参阅 [模型提供商](/concepts/model-providers)。
</Note>

## 故障排查

<AccordionGroup>
  <Accordion title='"未知模型：minimax/MiniMax-M2.7"'>
    这通常意味着 **未配置 MiniMax 提供商**（没有匹配的提供商条目，也未找到 MiniMax 认证配置文件/env 密钥）。此检测的修复程序位于 **2026.1.12** 中。修复方法：

    - 升级到 **2026.1.12**（或从源代码 `main` 运行），然后重启网关。
    - 运行 `openclaw configure` 并选择 **MiniMax** 认证选项，或
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 块，或
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 认证配置文件，以便注入匹配的提供商。

    确保模型 ID 是 **区分大小写** 的：

    - API 密钥路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后使用以下命令重新检查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题解答](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax 搜索" href="/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Coding Plan 进行网络搜索配置。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题解答。
  </Card>
</CardGroup>
