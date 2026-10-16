---
summary: "在OpenClaw中使用MiniMax模型"
read_when:
  - "您想要 OpenClaw 中的 MiniMax 模型"
  - "你需要 MiniMax 的设置指南"
title: "MiniMax"
---

捆绑的 `minimax` 插件注册了两个聊天提供程序以及六种功能：图像生成、音乐生成、视频生成、图像理解、语音 （T2A v2） 和网络搜索。

| 提供商 ID      | 认证    | 功能                                                                                        |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `minimax`        | API 密钥 | 文本、图像生成、音乐生成、视频生成、图像理解、语音、网页搜索 |
| `minimax-portal` | OAuth   | 文本、图像生成、音乐生成、视频生成、图像理解、语音             |

<Tip>
MiniMax 编码计划的推荐链接（10% 折扣）：[MiniMax 编码 Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
</Tip>

## <a id="built-in-catalog"></a> 内置目录

| 模型                        | 类型             | 描述                               |
| ---------------------------- | ---------------- | ----------------------------------------- |
| `MiniMax-M3`                 | 聊天（推理） | 默认托管推理模型            |
| `MiniMax-M3.1-Flash-Preview` | 聊天（推理） | 可调整工作量的代币计划预览 |
| `MiniMax-M2.7`               | 聊天（推理） | 之前的托管推理模型           |
| `MiniMax-M2.7-highspeed`     | 聊天（推理） | 更快的 M2.7 推理档位                |
| `MiniMax-VL-01`              | 视觉           | 图像理解模型                 |
| `image-01`                   | 图像生成 | 文本生成图像和图像到图像编辑  |
| `music-2.6`                  | 音乐生成 | 默认音乐模型                       |
| `MiniMax-Hailuo-2.3`         | 视频生成 | 文本生成视频和图像生成视频流程    |

模型参考遵循验证路径：`minimax/<model>` 用于 API-key 设置，`minimax-portal/<model>` 用于 OAuth 设置。

`MiniMax-M3.1-Flash-Preview` 支持文本和图像输入，具有 1,000,000 个令牌上下文窗口。 MiniMax 目前仅通过代币计划和 MiniMax 代码提供；可用性取决于您的帐户。其捆绑成本字段为零，因为 MiniMax 尚未发布预览版的每个代币定价，而不是因为该服务是免费的。 `MiniMax-M3` 仍为默认模型。

MiniMax M3 和 M3.1 Flash Preview 是 API-key 和 OAuth 路线上的首选 [Code Mode](/tools/code-mode) 模型。在没有全局代码模式设置的情况下，自动层可以使用它；显式代理或模型设置仍然优先。

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="oauth-coding-plan" title="OAuth（编码计划）">
    **最适合：** 通过 OAuth 使用 MiniMax 编码计划快速设置，无需 API 密钥。

    <Tabs>
      <Tab id="international" title="国际">
        <Steps>
          <Step id="run-onboarding" title="运行入门引导培训">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            结果提供程序基础 URL：`api.minimax.io`。
          </Step>
          <Step id="verify-the-model-is-available" title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab id="china" title="中国">
        <Steps>
          <Step id="run-onboarding-1" title="运行入门引导培训">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            结果提供程序基础 URL：`api.minimaxi.com`。
          </Step>
          <Step id="verify-the-model-is-available-1" title="验证模型是否可用">
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

    OpenClaw 在颁发它们的区域 MiniMax 帐户端点处刷新过期的 OAuth 访问令牌。当保存的登录早于刷新支持（它不记录其区域）或 `models.providers.minimax-portal.baseUrl` 现在指向其他区域时，它会拒绝刷新，并要求您再次运行 `openclaw models auth login --provider minimax-portal`。

  </Tab>

  <Tab id="api-key" title="API 密钥">
    **最适合：** 托管 MiniMax 与 Anthropic- 兼容的 API。

    <Tabs>
      <Tab id="international-2" title="国际">
        <Steps>
          <Step id="run-onboarding-2" title="运行入门引导培训">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这会将 `api.minimax.io` 配置为基础 URL。
          </Step>
          <Step id="verify-the-model-is-available-2" title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab id="china-2" title="中国">
        <Steps>
          <Step id="run-onboarding-3" title="运行入门引导培训">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            这会将 `api.minimaxi.com` 配置为基础 URL。
          </Step>
          <Step id="verify-the-model-is-available-3" title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### <a id="config-example"></a> 配置示例

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
                compat: { codeMode: "preferred" },
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
    MiniMax-M2.x 的 Anthropic- 兼容流端点在 OpenAI- 样式增量块中发出 `reasoning_content`，而不是本机 Anthropic 思维块，如果隐式启用思维，则会将内部推理泄漏到可见输出中。 OpenClaw 默认禁用 M2.x 思考，除非您自己明确设置 `thinking`。 MiniMax-M3（以及向前兼容的 M3.x）除外：M3 发出适当的 Anthropic 思维块，并需要积极思考才能产生可​​见内容，因此 OpenClaw 使 M3 保持在提供商的自适应思维路径上。请参阅下面的“高级配置”下的“思考默认值”部分。
    </Warning>

    <Note>
    API-key 设置使用 `minimax` 提供商 ID。模型参考采用 `minimax/MiniMax-M3` 形式。
    </Note>

  </Tab>
</Tabs>

## <a id="configure-via-openclaw-configure"></a> 通过 `openclaw configure` 配置

<Steps>
  <Step id="launch-the-wizard" title="启动向导">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step id="select-model%2Fauth" title="选择Model/auth">
    从菜单中选择 **Model/auth**。
  </Step>
  <Step id="choose-a-minimax-auth-option" title="选择 MiniMax 身份验证选项">
    | 认证选项            | 描述                        |
    | ----------------------- | ----------------------------------- |
    | `minimax-global-oauth` | 国际 OAuth（Coding Plan）  |
    | `minimax-cn-oauth`     | 中国 OAuth（Coding Plan）          |
    | `minimax-global-api`   | 国际 API 密钥              |
    | `minimax-cn-api`       | 中国 API 密钥                      |
  </Step>
  <Step id="pick-your-default-model" title="选择您的默认模型">
    按提示选择你的默认模型。
  </Step>
</Steps>

## <a id="capabilities"></a> 功能

### <a id="image-generation"></a> 图像生成

MiniMax 插件在 `minimax` 和 `minimax-portal` 上为 `image_generate` 工具注册 `image-01` 模型，重用相同的 `MINIMAX_API_KEY` 或 OAuth 身份验证作为文本模型。

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

图像生成始终使用 MiniMax 的专用图像端点 （`/v1/image_generation`） 并忽略 `models.providers.minimax.baseUrl`，因为该字段改为配置 chat/Anthropic-compatible 基础 URL。设置`MINIMAX_API_HOST=https://api.minimaxi.com`通过CN端点路由图像生成；默认全局端点是 `https://api.minimax.io`。

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Image Generation](/tools/image-generation)。
</Note>

### <a id="text-to-speech"></a> 文本转语音

内置的 `minimax` 插件将 MiniMax T2A v2 注册为 `tts` 的语音提供程序。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认语音：`English_expressive_narrator`
- 捆绑模型 ID：`speech-2.8-hd`、`speech-2.8-turbo`、`speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、`speech-02-turbo`、`speech-01-hd`、`speech-01-turbo`
- Auth 解析顺序：`tts.providers.minimax.apiKey`，然后是 `minimax-portal` OAuth/token 身份验证配置文件，然后是令牌计划环境密钥（`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`），然后是 `MINIMAX_API_KEY`
- 如果没有配置TTS主机，则OpenClaw重用配置的`minimax-portal` OAuth主机，并剥离Anthropic-兼容的路径后缀，例如`/anthropic`
- 普通音频附件保留在MP3。语音注释目标（Feishu、Telegram 以及请求语音注释兼容附件的其他通道）从 MiniMax MP3 转码为带有 `ffmpeg` 的 48kHz Opus，因为 e.g. Feishu/Lark 文件 API 仅接受 `file_type: "opus"` 本机音频消息
- MiniMax T2A 接受小数形式的 `speed` 和 `vol`，但 `pitch` 会以整数形式发送；OpenClaw 会在 API 请求前截断小数形式的 `pitch` 值

| 设置                         | 环境变量                | 默认值                       | 描述                      |
| ------------------------------- | ---------------------- | ----------------------------- | -------------------------------- |
| `tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主机。            |
| `tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。                    |
| `tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用于语音输出的语音 ID。 |
| `tts.providers.minimax.speed`   |                        | `1.0`                         | 播放速度，`0.5..2.0`。      |
| `tts.providers.minimax.vol`     |                        | `1.0`                         | 音量，`(0, 10]`。               |
| `tts.providers.minimax.pitch`   |                        | `0`                           | 整数音高偏移，`-12..12`。  |

### <a id="music-generation"></a> 音乐生成

内置的 MiniMax 插件通过共享的 `music_generate` 工具在 `minimax` 和 `minimax-portal` 上注册音乐生成。

- 默认音乐模型：`minimax/music-2.6`（OAuth：`minimax-portal/music-2.6`）
- 还支持 `music-2.6-free`、`music-cover` 和 `music-cover-free`
- 提示控制：`lyrics`、`instrumental`
- 输出格式：`mp3`
- Session-backed 通过共享 task/status 流运行分离，包括 `action: "status"`

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
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Music Generation](/tools/music-generation)。
</Note>

### <a id="video-generation"></a> 视频生成

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
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Video Generation](/tools/video-generation)。
</Note>

### <a id="image-understanding"></a> 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| 提供商 ID      | 默认图像模型 | PDF 文本提取 |
| ---------------- | ------------------- | ------------------- |
| `minimax`        | `MiniMax-VL-01`     | `MiniMax-M2.7`      |
| `minimax-portal` | `MiniMax-VL-01`     | `MiniMax-M2.7`      |

这就是为什么自动媒体路由可以使用 MiniMax 图像理解，即使捆绑的文本提供者目录还包括 M3 具有图像功能的聊天参考。 PDF理解仅使用`MiniMax-M2.7`进行文本提取； MiniMax 未注册 PDF- 到图像转换路径。

### <a id="web-search"></a> 网页搜索

MiniMax 插件还通过 MiniMax 代币计划搜索 API （`/v1/coding_plan/search`） 注册 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 兼容性回退：当 `MINIMAX_API_KEY` 已经指向 Token Plan 凭据时使用它
- 区域重用：`plugins.entries.minimax.config.webSearch.region`、`MINIMAX_API_HOST`、MiniMax 提供程序基本 URL
- 搜索保留在提供商 ID `minimax` 上； OAuth CN/global 设置可以通过 `models.providers.minimax-portal.baseUrl` 间接引导区域，并可以通过 `MINIMAX_OAUTH_TOKEN` 提供承载身份验证

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>
有关完整的 Web 搜索配置和用法，请参阅 [MiniMax Search](/tools/minimax-search)。
</Note>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="configuration-options" title="配置选项">
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

  <Accordion id="thinking-defaults" title="思维默认">
    在 `api: "anthropic-messages"` 上，OpenClaw 为 MiniMax M2.x 模型注入 `thinking: { type: "disabled" }`，除非早期包装器已在有效负载中设置 `thinking` 字段。这可以防止 M2.x 的流端点在 OpenAI-style 增量块中发出 `reasoning_content`，这会将内部推理泄漏到可见输出中。

    MiniMax-M3 是豁免的：当思考被禁用时，M3 返回一个带有 `stop_reason: "end_turn"` 的空 `content` 数组，因此 OpenClaw 删除了 M3 的隐式禁用默认值，并且当设置思考级别时，强制改为 `thinking: { type: "adaptive" }`。

    `MiniMax-M3.1-Flash-Preview` 需要适应性思维。 OpenClaw 发送所选级别为 `output_config.effort`； `/think low` 至 `/think max` 选择其五项支持工作。默认为 `max`，不提供 `off`，因为 MiniMax 拒绝 HTTP 400 的禁用思维。请参阅 [MiniMax 的 Anthropic API 合约 ](https://platform.minimax.io/docs/api-reference/text-anthropic-api)。

    每个模型系列可用的 thinking 级别：

    | 模型系列   | 级别                                   | 默认值    |
    | -------------- | ----------------------------------------- | ---------- |
    | `MiniMax-M3`   | `off`, `adaptive`                        | `adaptive` |
    | `MiniMax-M3.1-Flash-Preview` | `low`, `medium`, `high`, `xhigh`, `max` | `max` |
    | `MiniMax-M2.x` | `off`, `minimal`, `low`, `medium`, `high` | `off`      |

  </Accordion>

  <Accordion id="fast-mode" title="快速模式">
    `/fast on` 或 `params.fastMode: true` 在 Anthropic- 兼容流路径（`api: "anthropic-messages"`、提供者 `minimax` 或 `minimax-portal`）上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
  </Accordion>

  <Accordion id="fallback-example" title="回退示例">
    **最适合：** 将最强大的最新一代模型保留为主要模型，故障转移到 MiniMax M2.7. 下面的示例使用 Opus 作为具体主要模型；更换为您喜欢的最新一代主要模型。

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

  <Accordion id="coding-plan-usage-details" title="编码计划使用详情">
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要 coding plan key）。
    - 配置时，Usage 轮询从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 派生主机，因此使用 `https://api.minimax.io/anthropic` 的全局设置轮询 `api.minimax.io`。缺少或格式错误的基本 URL 会保留 CN 后备兼容性。
    - OpenClaw 会将 MiniMax coding-plan 用量规范化为与其他提供商相同的 `% left` 显示。MiniMax 原始的 `usage_percent`／`usagePercent` 字段表示剩余额度，而不是已消耗额度，因此 OpenClaw 会对其取反。若存在按数量统计的字段，则以其为准。
    - 当 API 返回 `model_remains` 时，OpenClaw 会优先选择 chat-model 条目，在需要时从 `start_time`／`end_time` 推导窗口标签，并将所选模型名称包含在计划标签中，以便更容易区分 coding-plan 窗口。
    - 使用快照会将 `minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 视为同一个 MiniMax 配额面，并且优先使用已存储的 MiniMax OAuth，然后再回退到 Coding Plan key 环境变量。

  </Accordion>
</AccordionGroup>

## <a id="notes"></a> 说明

- 默认聊天模型：`MiniMax-M3`。备用聊天模型：`MiniMax-M3.1-Flash-Preview`、`MiniMax-M2.7`、`MiniMax-M2.7-highspeed`
- Onboarding 和直接 API-key 设置为 M3 和 M2.7 变体编写模型定义
- 图像理解使用插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如果你需要精确的成本跟踪，请在 `models.json` 中更新定价值
- 使用 `openclaw models list` 确认当前提供商 id，然后使用 `openclaw models set minimax/MiniMax-M3` 或 `openclaw models set minimax-portal/MiniMax-M3` 切换

<Note>
有关提供商规则，请参见 [Model providers](/concepts/model-providers)。
</Note>

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="unknown-model-minimax-minimax-m3" title='“未知模型：minimax/MiniMax-M3”'>
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
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
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
    通过 MiniMax Token Plan 进行 Web 搜索配置。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
