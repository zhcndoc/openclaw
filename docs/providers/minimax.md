---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 的设置指南
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供程序默认使用 **MiniMax M2.7**。

MiniMax 还提供：

- 通过 T2A v2 集成的语音合成
- 通过 `MiniMax-VL-01` 集成的图像理解
- 通过 `music-2.6` 集成的音乐生成
- 通过 MiniMax Token Plan 搜索 API 集成的 `web_search`

提供程序拆分：

| Provider ID      | Auth    | Capabilities                                                                                        |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `minimax`        | API key | 文本、图像生成、音乐生成、视频生成、图像理解、语音、网页搜索 |
| `minimax-portal` | OAuth   | 文本、图像生成、音乐生成、视频生成、图像理解、语音             |

## 内置目录

| Model                    | Type             | Description                              |
| ------------------------ | ---------------- | ---------------------------------------- |
| `MiniMax-M2.7`           | Chat (reasoning) | 默认托管推理模型           |
| `MiniMax-M2.7-highspeed` | Chat (reasoning) | 更快的 M2.7 推理层               |
| `MiniMax-VL-01`          | Vision           | 图像理解模型                |
| `image-01`               | Image generation | 文生图和图生图编辑 |
| `music-2.6`              | Music generation | 默认音乐模型                      |
| `music-2.5`              | Music generation | 之前的音乐生成层             |
| `music-2.0`              | Music generation | 旧版音乐生成层             |
| `MiniMax-Hailuo-2.3`     | Video generation | 文本生成视频和图像参考流程  |

## 快速开始

选择你偏好的认证方式并按照设置步骤操作。

<Tabs>
  <Tab title="OAuth（Coding Plan）">
    **最适合：** 通过 OAuth 快速设置 MiniMax Coding Plan，无需 API key。

    <Tabs>
      <Tab title="国际版">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            这会使用 `api.minimax.io` 进行认证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国版">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            这会使用 `api.minimaxi.com` 进行认证。
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
    OAuth 设置使用 `minimax-portal` 提供程序 id。模型引用格式为 `minimax-portal/MiniMax-M2.7`。
    </Note>

    <Tip>
    MiniMax Coding Plan 的推荐链接（9 折）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API key">
    **最适合：** 使用与 Anthropic 兼容 API 的托管 MiniMax。

    <Tabs>
      <Tab title="国际版">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这会将 `api.minimax.io` 配置为基础 URL。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国版">
        <Steps>
          <Step title="运行初始化">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            这会将 `api.minimaxi.com` 配置为基础 URL。
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
                name: "MiniMax M2.7 高速版",
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
    在 Anthropic 兼容的流式路径中，除非你显式设置 `thinking`，否则 OpenClaw 默认会禁用 MiniMax thinking。MiniMax 的流式端点会在 OpenAI 风格的 delta 分块中输出 `reasoning_content`，而不是原生 Anthropic thinking 块；如果隐式保持启用，可能会将内部推理泄露到可见输出中。
    </Warning>

    <Note>
    API key 设置使用 `minimax` 提供程序 id。模型引用格式为 `minimax/MiniMax-M2.7`。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 配置

使用交互式配置向导设置 MiniMax，无需编辑 JSON：

<Steps>
  <Step title="启动向导">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="选择 Model/auth">
    从菜单中选择 **Model/auth**。
  </Step>
  <Step title="选择一个 MiniMax 认证选项">
    从可用的 MiniMax 选项中选择一个：

    | Auth choice | Description |
    | --- | --- |
    | `minimax-global-oauth` | 国际版 OAuth（Coding Plan） |
    | `minimax-cn-oauth` | 中国版 OAuth（Coding Plan） |
    | `minimax-global-api` | 国际版 API key |
    | `minimax-cn-api` | 中国版 API key |

  </Step>
  <Step title="选择默认模型">
    按提示选择你的默认模型。
  </Step>
</Steps>

## 能力

### 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- **文生图生成**，支持宽高比控制
- **图生图编辑**（主体参考），支持宽高比控制
- 每次请求最多 **9 张输出图像**
- 每次编辑请求最多 **1 张参考图像**
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

要将 MiniMax 用于图像生成，请将其设置为图像生成提供程序：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

如果 MiniMax 已经设置好，插件会使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 认证。无需额外配置。

`minimax` 和 `minimax-portal` 都会为 `image_generate` 注册相同的
`image-01` 模型。API key 设置使用 `MINIMAX_API_KEY`；OAuth 设置可以改用
捆绑的 `minimax-portal` 认证路径。

图像生成始终使用 MiniMax 专用图像端点
(`/v1/image_generation`)，并忽略 `models.providers.minimax.baseUrl`，
因为该字段配置的是聊天/Anthropic 兼容的基础 URL。设置
`MINIMAX_API_HOST=https://api.minimaxi.com` 可将图像生成路由到
中国区端点；默认的国际端点为
`https://api.minimax.io`。

当初始化或 API key 设置写入显式的 `models.providers.minimax`
条目时，OpenClaw 会将 `MiniMax-M2.7` 和
`MiniMax-M2.7-highspeed` 实化为仅文本聊天模型。图像理解则
通过插件拥有的 `MiniMax-VL-01` 媒体提供程序单独暴露。

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参见 [Image Generation](/tools/image-generation)。
</Note>

### 文本转语音

捆绑的 `minimax` 插件将 MiniMax T2A v2 注册为 `messages.tts` 的语音提供程序。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认音色：`English_expressive_narrator`
- 支持的捆绑模型 id 包括 `speech-2.8-hd`、`speech-2.8-turbo`、
  `speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、
  `speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 认证解析顺序为 `messages.tts.providers.minimax.apiKey`，然后是
  `minimax-portal` OAuth/token 认证配置文件，然后是 Token Plan 环境
  key（`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、
  `MINIMAX_CODING_API_KEY`），最后是 `MINIMAX_API_KEY`。
- 如果未配置 TTS 主机，OpenClaw 会复用已配置的
  `minimax-portal` OAuth 主机，并去除 Anthropic 兼容路径后缀，
  例如 `/anthropic`。
- 普通音频附件仍保持 MP3。
- 语音消息目标（如飞书和 Telegram）会通过 `ffmpeg` 从 MiniMax
  MP3 转码为 48kHz Opus，因为飞书/Lark 文件 API 只接受
  `file_type: "opus"` 作为原生音频消息。
- MiniMax T2A 接受小数 `speed` 和 `vol`，但 `pitch` 以整数发送；OpenClaw 会在 API 请求前截断小数 `pitch` 值。

| Setting                                  | Env var                | Default                       | Description                      |
| ---------------------------------------- | ---------------------- | ----------------------------- | -------------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主机。            |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 id。                    |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用于语音输出的音色 id。 |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | 播放速度，`0.5..2.0`。      |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | 音量，`(0, 10]`。               |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | 整数音高偏移，`-12..12`。  |

### 音乐生成

捆绑的 MiniMax 插件通过共享的
`music_generate` 工具为 `minimax` 和 `minimax-portal` 注册音乐生成。

- 默认音乐模型：`minimax/music-2.6`
- OAuth 音乐模型：`minimax-portal/music-2.6`
- 也支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控制：`lyrics`、`instrumental`、`durationSeconds`
- 输出格式：`mp3`
- 基于会话的运行会通过共享任务/状态流程分离，包括 `action: "status"`

要将 MiniMax 用作默认音乐提供程序：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参见 [Music Generation](/tools/music-generation)。
</Note>

### 视频生成

捆绑的 MiniMax 插件通过共享的
`video_generate` 工具为 `minimax` 和 `minimax-portal` 注册视频生成。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- OAuth 视频模型：`minimax-portal/MiniMax-Hailuo-2.3`
- 模式：文生视频和单图参考流程
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
有关共享工具参数、提供程序选择和故障转移行为，请参见 [Video Generation](/tools/video-generation)。
</Note>

### 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| Provider ID      | Default image model |
| ---------------- | ------------------- |
| `minimax`        | `MiniMax-VL-01`     |
| `minimax-portal` | `MiniMax-VL-01`     |

这就是为什么即使捆绑的文本提供程序目录仍然只显示仅文本的 M2.7 聊天引用，自动媒体路由也可以使用 MiniMax 图像理解。

### 网页搜索

MiniMax 插件还通过 MiniMax Token Plan
搜索 API 注册了 `web_search`。

- Provider id: `minimax`
- Structured results: 标题、URL、摘要、相关查询
- Preferred env var: `MINIMAX_CODE_PLAN_KEY`
- Accepted env aliases: `MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- Compatibility fallback: 当 `MINIMAX_API_KEY` 已经指向 Token Plan 凭据时使用它
- Region reuse: `plugins.entries.minimax.config.webSearch.region`，然后是 `MINIMAX_API_HOST`，然后是 MiniMax 提供程序基础 URL
- Search stays on provider id `minimax`; OAuth CN/global setup can steer region indirectly through `models.providers.minimax-portal.baseUrl` and can provide bearer auth through `MINIMAX_OAUTH_TOKEN`

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>
有关完整的网页搜索配置和用法，请参见 [MiniMax Search](/tools/minimax-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 优先使用 `https://api.minimax.io/anthropic`（兼容 Anthropic）；`https://api.minimax.io/v1` 可选，用于兼容 OpenAI 的负载 |
    | `models.providers.minimax.api` | 优先使用 `anthropic-messages`；`openai-completions` 可选，用于兼容 OpenAI 的负载 |
    | `models.providers.minimax.apiKey` | MiniMax API 密钥（`MINIMAX_API_KEY`） |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为你想要加入允许列表的模型设置别名 |
    | `models.mode` | 如果你想在内置模型之外添加 MiniMax，请保持 `merge` |
  </Accordion>

  <Accordion title="思考默认值">
    在 `api: "anthropic-messages"` 下，OpenClaw 会注入 `thinking: { type: "disabled" }`，除非在参数/配置中已经显式设置了 thinking。

    这可以防止 MiniMax 的流式端点在 OpenAI 风格的 delta chunk 中输出 `reasoning_content`，从而将内部推理泄露到可见输出中。

  </Accordion>

  <Accordion title="快速模式">
    `/fast on` 或 `params.fastMode: true` 会在兼容 Anthropic 的流路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
  </Accordion>

  <Accordion title="回退示例">
    **最适合：** 将你最强的最新一代模型作为主模型，并在失败时回退到 MiniMax M2.7。下面的示例使用 Opus 作为具体主模型；请替换为你偏好的最新一代主模型。

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
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要 coding plan 密钥）。
    - 使用情况轮询会在配置时从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 推导主机，因此使用 `https://api.minimax.io/anthropic` 的全局配置会轮询 `api.minimax.io`。缺失或格式错误的 base URL 会保留 CN 回退以兼容。
    - OpenClaw 会将 MiniMax coding-plan 使用量规范化为与其他提供商相同的 `% 剩余` 显示。MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示剩余额度，而不是已消耗额度，因此 OpenClaw 会将其取反。若存在按数量统计的字段，则以其为准。
    - 当 API 返回 `model_remains` 时，OpenClaw 会优先选择 chat-model 条目，在需要时从 `start_time` / `end_time` 推导窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
    - 使用快照会将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额面，并且会优先使用已存储的 MiniMax OAuth，然后再回退到 Coding Plan 密钥环境变量。

  </Accordion>
</AccordionGroup>

## 注意事项

- 模型引用遵循认证路径：
  - API key 设置：`minimax/<model>`
  - OAuth 设置：`minimax-portal/<model>`
- 默认聊天模型：`MiniMax-M2.7`
- 备用聊天模型：`MiniMax-M2.7-highspeed`
- 入门流程和直接 API key 设置会为两个 M2.7 变体写入仅文本的模型定义
- 图像理解使用由插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如果你需要精确的成本跟踪，请在 `models.json` 中更新定价值
- 使用 `openclaw models list` 确认当前提供商 id，然后切换到 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>
MiniMax Coding Plan 推荐链接（立减 10%）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
</Tip>

<Note>
有关提供商规则，请参见 [Model providers](/concepts/model-providers)。
</Note>

## 故障排查

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M2.7"'>
    这通常意味着 **MiniMax 提供商未配置**（未找到匹配的提供商条目，也未找到 MiniMax 认证配置文件/环境变量密钥）。对此检测的修复已包含在 **2026.1.12** 中。可通过以下方式修复：

    - 升级到 **2026.1.12**（或从源代码 `main` 运行），然后重启网关。
    - 运行 `openclaw configure` 并选择一个 **MiniMax** 认证选项，或
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 块，或
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 认证配置文件，以便注入匹配的提供商。

    请确保模型 id **区分大小写**：

    - API key 路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后重新检查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[Troubleshooting](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    通用图像工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    通用音乐工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    通用视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax Search" href="/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Token Plan 进行 Web 搜索配置。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和 FAQ。
  </Card>
</CardGroup>
