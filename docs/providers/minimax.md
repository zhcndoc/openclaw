---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 的设置指南
title: "MiniMax"
---

捆绑的 `minimax` 插件注册了两个提供方以及五种能力：聊天、图像生成、音乐生成、视频生成、图像理解、语音（T2A v2）和网页搜索。

| 提供方 ID         | 认证方式 | 功能                                                                                              |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `minimax`        | API 密钥 | 文本、图像生成、音乐生成、视频生成、图像理解、语音、网页搜索 |
| `minimax-portal` | OAuth   | 文本、图像生成、音乐生成、视频生成、图像理解、语音             |

<Tip>
MiniMax Coding Plan 的推荐链接（九折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
</Tip>

## 内置目录

| 模型                      | 类型              | 描述                              |
| ------------------------ | ---------------- | ---------------------------------------- |
| `MiniMax-M3`             | 聊天（推理） | 默认托管推理模型           |
| `MiniMax-M2.7`           | 聊天（推理） | 之前的托管推理模型          |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理档位               |
| `MiniMax-VL-01`          | 视觉           | 图像理解模型                |
| `image-01`               | 图像生成 | 文本生成图像和图像到图像编辑 |
| `music-2.6`              | 音乐生成 | 默认音乐模型                      |
| `MiniMax-Hailuo-2.3`     | 视频生成 | 文本生成视频和图像生成视频流程   |

模型引用遵循认证路径：API 密钥设置使用 `minimax/<model>`，OAuth 设置使用 `minimax-portal/<model>`。

## 快速开始

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

            结果提供程序基础 URL：`api.minimax.io`。
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

            结果提供程序基础 URL：`api.minimaxi.com`。
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
    OAuth 设置使用 `minimax-portal` 提供程序 id。模型引用遵循 `minimax-portal/MiniMax-M3` 这种形式。
    </Note>

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
      env: { vars: { MINIMAX_API_KEY: "sk-..." } },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M3" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
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
    MiniMax-M2.x 的 Anthropic 兼容流式端点会在 OpenAI 风格的 delta 块中发出 `reasoning_content`，而不是原生的 Anthropic thinking blocks；如果 thinking 保持隐式启用，这会将内部推理泄露到可见输出中。除非你显式设置 `thinking`，否则 OpenClaw 默认会禁用 M2.x thinking。MiniMax-M3（以及向前兼容的 M3.x）不受此限制：M3 会输出正确的 Anthropic thinking blocks，并且需要启用 thinking 才能生成可见内容，因此 OpenClaw 会让 M3 走提供程序的自适应 thinking 路径。请参阅下方高级配置中的 Thinking defaults 部分。
    </Warning>

    <Note>
    API key 设置使用 `minimax` 提供程序 id。模型引用遵循 `minimax/MiniMax-M3` 这种形式。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 配置

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
    | 认证选项               | 描述                           |
    | ---------------------- | -------------------------------- |
    | `minimax-global-oauth` | 国际 OAuth（Coding Plan）       |
    | `minimax-cn-oauth`     | 中国 OAuth（Coding Plan）       |
    | `minimax-global-api`   | 国际 API 密钥                   |
    | `minimax-cn-api`       | 中国 API 密钥                   |
  </Step>
  <Step title="选择默认模型">
    按提示选择你的默认模型。
  </Step>
</Steps>

## 能力

### 图像生成

MiniMax 插件在 `minimax` 和 `minimax-portal` 上都为 `image_generate` 工具注册了 `image-01` 模型，并复用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 认证。

- 文生图和图生图编辑（主体参考），均支持宽高比控制
- 每次请求最多输出 9 张图片，每次编辑请求 1 张参考图
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

```json5
{
  agents: {
    defaults: {
      mediaModels: { image: { primary: "minimax/image-01" } },
    },
  },
}
```

图像生成始终使用 MiniMax 的专用图像端点（`/v1/image_generation`），并忽略 `models.providers.minimax.baseUrl`，因为该字段配置的是聊天/Anthropic 兼容的基础 URL。将 `MINIMAX_API_HOST=https://api.minimaxi.com` 设为通过 CN 端点路由图像生成；默认的全球端点是 `https://api.minimax.io`。

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参见 [图像生成](/tools/image-generation)。
</Note>

### 文本转语音

内置的 `minimax` 插件将 MiniMax T2A v2 注册为 `tts` 的语音提供程序。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认语音：`English_expressive_narrator`
- 内置模型 ID：`speech-2.8-hd`、`speech-2.8-turbo`、`speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、`speech-02-turbo`、`speech-01-hd`、`speech-01-turbo`
- 认证解析顺序：`tts.providers.minimax.apiKey`，然后是 `minimax-portal` OAuth／令牌认证配置文件，再然后是 Token Plan 环境密钥（`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`），最后是 `MINIMAX_API_KEY`
- 如果未配置 TTS 主机，OpenClaw 会复用已配置的 `minimax-portal` OAuth 主机，并去除 `/anthropic` 等 Anthropic 兼容路径后缀
- 普通音频附件保持为 MP3。语音消息目标（Feishu、Telegram 以及其他请求语音消息兼容附件的渠道）会使用 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus，因为例如 Feishu/Lark 文件 API 仅接受原生音频消息的 `file_type: "opus"`
- MiniMax T2A 接受小数形式的 `speed` 和 `vol`，但 `pitch` 会以整数形式发送；OpenClaw 会在 API 请求前截断小数形式的 `pitch` 值

| 设置                            | 环境变量                | 默认值                        | 描述                         |
| ------------------------------- | ----------------------- | ----------------------------- | ---------------------------- |
| `tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`      | `https://api.minimax.io`      | MiniMax T2A API 主机。        |
| `tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`     | `speech-2.8-hd`               | TTS 模型 ID。                 |
| `tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID`  | `English_expressive_narrator` | 用于语音输出的语音 ID。        |
| `tts.providers.minimax.speed`   |                         | `1.0`                         | 播放速度，`0.5..2.0`。        |
| `tts.providers.minimax.vol`     |                         | `1.0`                         | 音量，`(0, 10]`。             |
| `tts.providers.minimax.pitch`   |                         | `0`                           | 整数音高偏移，`-12..12`。     |

### 音乐生成

内置的 MiniMax 插件通过共享的 `music_generate` 工具在 `minimax` 和 `minimax-portal` 上注册音乐生成。

- 默认音乐模型：`minimax/music-2.6`（OAuth：`minimax-portal/music-2.6`）
- 还支持 `music-2.6-free`、`music-cover` 和 `music-cover-free`
- 提示控制：`lyrics`、`instrumental`
- 输出格式：`mp3`
- 基于会话的运行会通过共享的任务/状态流程分离，包括 `action: "status"`

```json5
{
  agents: {
    defaults: {
      mediaModels: { music: { primary: "minimax/music-2.6" } },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参见 [音乐生成](/tools/music-generation)。
</Note>

### 视频生成

内置的 MiniMax 插件通过共享的 `video_generate` 工具在 `minimax` 和 `minimax-portal` 上注册视频生成功能。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`（OAuth：`minimax-portal/MiniMax-Hailuo-2.3`）
- 还支持 `MiniMax-Hailuo-2.3-Fast`、`MiniMax-Hailuo-02`、`I2V-01-Director`、`I2V-01-live` 和 `I2V-01`
- 模式：文生视频和单图参考流程
- 支持 `resolution`（Hailuo 2.3/02 模型上为 `768P` 或 `1080P`）；不支持 `aspectRatio`，会被忽略

```json5
{
  agents: {
    defaults: {
      mediaModels: { video: { primary: "minimax/MiniMax-Hailuo-2.3" } },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参见 [视频生成](/tools/video-generation)。
</Note>

### 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| 提供程序 ID      | 默认图像模型      | PDF 文本提取      |
| ---------------- | ----------------- | ----------------- |
| `minimax`        | `MiniMax-VL-01`   | `MiniMax-M2.7`    |
| `minimax-portal` | `MiniMax-VL-01`   | `MiniMax-M2.7`    |

因此，即使内置文本提供程序目录中也包含支持图像的 M3 聊天引用，自动媒体路由仍然可以使用 MiniMax 图像理解。PDF 理解仅使用 `MiniMax-M2.7` 进行文本提取；MiniMax 不注册 PDF 转图像的转换路径。

### 网页搜索

MiniMax 插件还通过 MiniMax Token Plan 搜索 API（`/v1/coding_plan/search`）注册了 `web_search`。

- 提供程序 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 兼容性回退：当 `MINIMAX_API_KEY` 已经指向 Token Plan 凭据时使用它
- 区域复用：先使用 `plugins.entries.minimax.config.webSearch.region`，然后是 `MINIMAX_API_HOST`，最后是 MiniMax 提供程序基础 URL
- 搜索始终保持在提供程序 ID `minimax` 上；OAuth CN／国际版设置可以通过 `models.providers.minimax-portal.baseUrl` 间接影响区域，并且可以通过 `MINIMAX_OAUTH_TOKEN` 提供 bearer 认证

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>
有关完整的网页搜索配置和用法，请参见 [MiniMax 搜索](/tools/minimax-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 优先使用 `https://api.minimax.io/anthropic`（Anthropic-compatible）；对于 OpenAI-compatible 负载，可选用 `https://api.minimax.io/v1` |
    | `models.providers.minimax.api` | 优先使用 `anthropic-messages`；对于 OpenAI-compatible 负载，可选用 `openai-completions` |
    | `models.providers.minimax.apiKey` | MiniMax API 密钥（`MINIMAX_API_KEY`） |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 每个模型的别名、参数和元数据 |
    | `agents.defaults.modelPolicy.allow` | 可选的显式模型允许列表 |
    | `models.mode` | 如果希望将 MiniMax 添加到内置模型旁边，请保留 `merge` |
  </Accordion>

  <Accordion title="思考默认值">
    在 `api: "anthropic-messages"` 下，除非更早的包装器已经在负载中设置了 `thinking` 字段，否则 OpenClaw 会为 MiniMax M2.x 模型注入 `thinking: { type: "disabled" }`。这可以防止 M2.x 的流式端点在 OpenAI 风格的 delta chunk 中发出 `reasoning_content`，从而避免内部推理泄露到可见输出中。

    MiniMax-M3（以及 M3.x）不受此影响：M3 在禁用 thinking 时会返回空的 `content` 数组和 `stop_reason: "end_turn"`，因此 OpenClaw 会移除 M3 的隐式 disabled 默认值；当设置了 thinking 级别时，则强制改为 `thinking: { type: "adaptive" }`。

    每个模型系列可用的 thinking 级别：

    | 模型系列   | 级别                                   | 默认值    |
    | -------------- | ----------------------------------------- | ---------- |
    | `MiniMax-M3`   | `off`、`adaptive`                        | `adaptive` |
    | `MiniMax-M2.x` | `off`、`minimal`、`low`、`medium`、`high` | `off`      |

    MiniMax-M3（以及 M3.x）不受此影响：M3 会返回正确的 Anthropic thinking block，并且在禁用 thinking 时返回空的 `content` 数组和 `stop_reason: "end_turn"`，因此该包装器会让 M3 走提供商省略／adaptive thinking 路径。
  </Accordion>

  <Accordion title="快速模式">
    `/fast on` 或 `params.fastMode: true` 会在 Anthropic 兼容流路径（`api: "anthropic-messages"`，提供商 `minimax` 或 `minimax-portal`）上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
  </Accordion>

  <Accordion title="回退示例">
    **最适合：** 将你最强的最新一代模型作为主模型，并在失败时回退到 MiniMax M2.7。下面的示例使用 Opus 作为具体主模型；请替换为你偏好的最新一代主模型。

    ```json5
    {
      env: { vars: { MINIMAX_API_KEY: "sk-..." } },
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
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要 coding plan key）。
    - 使用轮询会在配置了 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 时从中派生主机，因此使用 `https://api.minimax.io/anthropic` 的全局配置会轮询 `api.minimax.io`。缺失或格式错误的 base URL 会保留 CN 回退以保证兼容性。
    - OpenClaw 会将 MiniMax coding-plan 用量规范化为与其他提供商相同的 `% left` 显示。MiniMax 原始的 `usage_percent`／`usagePercent` 字段表示剩余额度，而不是已消耗额度，因此 OpenClaw 会对其取反。若存在按数量统计的字段，则以其为准。
    - 当 API 返回 `model_remains` 时，OpenClaw 会优先选择 chat-model 条目，在需要时从 `start_time`／`end_time` 推导窗口标签，并将所选模型名称包含在计划标签中，以便更容易区分 coding-plan 窗口。
    - 使用快照会将 `minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 视为同一个 MiniMax 配额面，并且优先使用已存储的 MiniMax OAuth，然后再回退到 Coding Plan key 环境变量。

  </Accordion>
</AccordionGroup>

## 注意事项

- 默认聊天模型：`MiniMax-M3`。可选聊天模型：`MiniMax-M2.7`、`MiniMax-M2.7-highspeed`
- 通过引导和直接 API key 设置会为 M3 以及两个 M2.7 变体写入模型定义
- 图像理解使用插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如果你需要精确的成本跟踪，请在 `models.json` 中更新定价值
- 使用 `openclaw models list` 确认当前提供商 id，然后使用 `openclaw models set minimax/MiniMax-M3` 或 `openclaw models set minimax-portal/MiniMax-M3` 切换

<Note>
有关提供商规则，请参见 [Model providers](/concepts/model-providers)。
</Note>

## 故障排查

<AccordionGroup>
  <Accordion title='"未知模型：minimax/MiniMax-M3"'>
    这通常意味着 **MiniMax provider 未配置**（未找到匹配的 provider 条目，并且未找到 MiniMax auth profile/env key）。可通过以下方式修复：

    - 运行 `openclaw configure` 并选择 **MiniMax** 认证选项，或
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 配置块，或
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN`，或者设置一个 MiniMax 认证 profile，以便注入匹配的 provider。

    请确保模型 id **区分大小写**：

    - API-key 路径：`minimax/MiniMax-M3`、`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

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
  <Card title="MiniMax 搜索" href="/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Token Plan 进行 Web 搜索配置。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和 FAQ。
  </Card>
</CardGroup>
