---
summary: "在OpenClaw中使用xAI Grok模型"
read_when:
  - "您想要在 OpenClaw 中使用 Grok 模型"
  - "您正在配置 xAI 身份验证或模型 ID"
title: "xAI"
---

OpenClaw 随附了一个用于 Grok 模型的 `xai` 提供程序插件。 推荐的方式是使用 Grok OAuth，并订阅符合条件的 SuperGrok 或 X Premium。 Gateway、配置、路由和工具都会保留在本地；只有 Grok 请求会发送到 xAI 的 API。

OAuth 不需要 xAI API 密钥或 Grok 构建应用程序。 xAI 可能仍会在同意屏幕上显示 Grok Build，因为 OpenClaw 使用 xAI 的共享 OAuth 客户端。

## <a id="setup"></a> 设置

<Steps>
  <Step id="new-install" title="新安装">
    使用守护程序安装运行入门，然后在 model/auth 步骤中选择 xAI/Grok OAuth：

    ```bash
    openclaw onboard --install-daemon
    ```

    在 VPS 上或通过 SSH 时，直接选择 xAI OAuth；它使用设备码验证，不需要 localhost 回调：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-oauth
    ```

  </Step>
  <Step id="existing-install" title="现有安装">
    仅登录 xAI；不要为了连接 Grok 重新运行完整 onboarding：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    由于没有现有的主要模型，OAuth 设置会选择策划的默认值 `xai/grok-4.7`。经过身份验证的发现会更新可用的模型行，而不更改默认值。它保留现有的主要；需要时明确选择加入：

    ```bash
    openclaw models set xai/grok-4.7
    ```

    只有在你有意更改 Gateway、daemon、channel、workspace 或其他设置选项时，才重新运行完整 onboarding。

  </Step>
  <Step id="api-key-path" title="API-密钥路径">
    API-key 设置仍然适用于 xAI 控制台密钥和需要密钥支持的提供程序配置的媒体表面。它使用相同的 Grok 4.7 设置默认值：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step id="pick-a-model" title="选择模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.7" } } },
    }
    ```
  </Step>
</Steps>

<Note>
OpenClaw 使用 xAI 响应 API 作为捆绑的 xAI 传输。来自 `openclaw models auth login --provider xai --method oauth` 或 `--method api-key` 的相同凭证还支持 `web_search`（提供商 ID `grok`）、`x_search`、`code_execution`、speech/transcription 和 xAI image/video一代。如果您将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，则捆绑的 xAI 模型提供程序也会将其重新用作后备。
</Note>

当 xAI 提供商使用 OAuth 登录时，`openclaw status --usage`、`/status` 和 Control UI 使用卡显示 SuperGrok 配额。 OpenClaw 获取该订阅的 Grok 计费窗口，并通过正常的提供商使用界面报告其重置时间。当 xAI 在其他有效的每周或每月计费周期中省略包含使用量百分比时，OpenClaw 会报告忽略包含使用量，而不是发明百分比或显示通用的“无使用数据”。按量付费点播柜台不计入SuperGrok认购额度。仅 API- 密钥的 xAI 设置故意不显示为 SuperGrok 使用情况，因为 xAI 控制台 API 积分和 SuperGrok 订阅配额是单独的计费桶。

## <a id="oauth-troubleshooting"></a> OAuth 故障排查

- 对于 SSH、Docker、VPS 或其他远程设置，请使用 `openclaw models auth login --provider xai --method oauth`；它使用设备代码验证，而不是本地主机回调。
- 如果之前的 OAuth 登录使用 API-key 端点或目录离开 xAI，请重新运行 `openclaw models auth login --provider xai --method oauth`。成功登录会刷新您帐户的订阅目录和代理路由。它保留了您的主要模型和后备模型。
- 如果登录成功但Grok不是默认模型，则运行`openclaw models set xai/grok-4.7`。 OAuth 登录会保留现有的主要模型，除非您明确更改它。
- 使用 OAuth，思维水平遵循您帐户的模型列表报告的推理努力。当列出的模型无法关闭推理时，不提供 `off`。如果模型在选取器中显示工作量级别，但 `--thinking` 拒绝它们，则登录会早于此行为：重新运行 `openclaw models auth login --provider xai --method oauth` 以刷新已保存的模型行。
- 检查已保存的 xAI 身份验证配置：

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI 决定哪些账户可以接收 OAuth API 代币。如果帐户不符合条件，请使用 API-key 路径或检查 xAI 端的订阅。
- 如果网关日志显示 `xai: OAuth profile "..." could not be resolved`，则凭据准备失败，例如因为刷新令牌已过期或被撤销。警告包括已编辑的原因和生成的实时目录源，或报告未返回实时目录。现有的 API 密钥仍然可以提供 API 目录； OAuth-only 模型保持不可用。在网关主机上运行警告的登录命令；它的目标是目录的代理和保存的配置文件。这描述的是目录发现，而不是推理请求或 API 费用的证明。

本机 xAI、API 和 Grok 订阅路由上的现有 `xai/auto` 选择已停用。运行 `openclaw doctor --fix` 以将受影响的配置和会话选择替换为 `xai/grok-4.7`。 Doctor 保留帐户密码和后备，并保持自定义端点不变。对于固定会话，不可用的帐户或不允许的继任者将保持选择不变，并提供解释所需操作的诊断。仅当适用的帐户和路由同意其后继者时，Doctor 才会移动共享别名。您还可以明确选择允许的具体模型。

对于手动管理的Grok订阅令牌，将`models.providers.xai.auth`设置为`"token"`，将`models.providers.xai.baseUrl`设置为`https://cli-chat-proxy.grok.com/v1`。模型发现使用订阅目录并保持令牌认证；不可用的令牌不会将发现切换到控制台 API。具有默认或本机 xAI API 端点的令牌继续使用 API 目录。首选 OAuth 登录以进行自动令牌刷新。解析的环境支持的令牌也可以在没有运行网关的独立模型命令中工作。

<Tip>
在 SSH、Docker 或 VPS 上登录时，请使用 `xai-oauth`。OpenClaw 会打印一个 URL 和短代码；在任意本地浏览器中完成登录，同时远程进程会轮询 xAI 以获取已完成的令牌交换。
</Tip>

## <a id="built-in-catalog"></a> 内置目录

模型选择器中的可选 id。对于现有配置，插件仍然会解析较旧的 Grok 3、 Grok 4、Grok 4 Fast、Grok 4.1 Fast 和 Grok Code 的 id； 参见 [旧版兼容性和迁移别名](#legacy-compatibility-and-moving-aliases)。

| 家族         | 模型 id                                                    |
| -------------- | ------------------------------------------------------------ |
| Grok 4.7       | `grok-4.7`（别名：`grok-4.7-latest`）                        |
| Grok 4.6       | `grok-4.6`                                                   |
| Grok 4.5       | `grok-4.5`（别名：`grok-4.5-latest`、`grok-build-latest`） |
| Grok 构建 0.1 | `grok-build-0.1`                                             |
| Grok 4.3       | `grok-4.3`（别名：`grok-4.3-latest`、`grok-latest`）       |
| Grok 4.20      | `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`   |

<Tip>
OAuth 和 API-key 设置使用 `xai/grok-4.7` 作为策划的默认值。 Grok 4.6、Grok 4.5、`grok-build-0.1`、Grok 4.3 和两个日期为 Grok 4.20 的变体仍然可供选择。
</Tip>

插件清单拥有精选列表。普通的 API-key 设置将该库存保留在插件中，而不是将其复制到您的配置中； `models.mode: "replace"` 仍会收到策划的行。显式模型行保持不变。 OAuth 登录保留其经过身份验证的帐户目录。

目录上下文和代币成本元数据遵循 xAI 的实时 [ 模型页面 ](https://docs.x.ai/developers/models) 和 [ 定价页面 ](https://docs.x.ai/developers/pricing)。当请求超过其记录的 200k 令牌长上下文阈值时，xAI 应用更高的速率：对于 Grok 4.5、Grok 4.6 和 Grok 4.7，输入、缓存输入和输出速率双。 OpenClaw 的平面目录成本字段记录短上下文费率。当前的 [Grok Build](https://docs.x.ai/build/overview) 编码代理使用 Grok 4.7. 历史 OpenClaw `grok-build-latest` 兼容性别名仍固定为 Grok 4.5.

支持的非管理别名保留其推理、输入和令牌限制元数据，而无需加入已发布的清单。它们的定价仍然未知，在清单包含它们之前记录为零。零是一种无法获得的估计，而不是声称提供商不收取任何费用。

思维水平遵循xAI的[记录的发布规则](https://docs.x.ai/developers/model-capabilities/text/reasoning)，而不是固定的模型列表。 Grok 4.5 及更高版本接受 `low`、`medium` 和 `high`； Grok 4.6 以及稍后添加 `xhigh`。默认为`high`，推理不能关闭。较新的版本 ID（例如 `grok-4.8`、其 `-latest` 别名或过时的快照）会在清单列出之前获取这些级别和图像输入。 `-fast` 等变体 ID 会导致推理工作停止。

## <a id="feature-coverage"></a> 功能覆盖

捆绑的插件将支持的 xAI API 映射到 OpenClaw 的共享提供程序和工具合约上。下面或已知限制下列出了不适合共享合同的功能。

| xAI 能力             | OpenClaw面                        | 状态                                               |
| -------------------------- | --------------------------------------- | ---------------------------------------------------- |
| 聊天 / Responses           | `xai/<model>` 模型 provider            | 是                                                  |
| 上下文压缩         | `/compact` 和阈值压缩     | 是，通过 `/v1/responses/compact`                      |
| 服务端网页搜索     | `web_search` 提供商 `grok`            | 是                                                  |
| 服务端 X 搜索       | `x_search`工具                         | 是                                                  |
| 服务端代码执行 | `code_execution`工具                   | 是                                                  |
| 图片                     | `image_generate`                        | 是                                                  |
| 视频                     | `video_generate`                        | 是                                                  |
| 批量文本转语音       | `tts.provider: "xai"` / `tts`           | 是                                                  |
| 流式 TTS              | `textToSpeechStream`                    | 是，通过 `wss://api.x.ai/v1/tts`（不是实时语音） |
| 批量语音转文本       | `tools.media.audio` 媒体理解 | 是                                                  |
| 流式语音转文本   | 语音通话 `streaming.provider: "xai"`  | 是                                                  |
| 实时语音             | 谈话 `talk.realtime.provider: "xai"`    | 是；原生 Talk 节点使用 gateway-relay             |
| 文件 / 批处理            | 仅通用模型 API 兼容性    | 不是 OpenClaw 的一等公民 tool                      |

<Note>
OpenClaw 使用 xAI 的 REST image/video/TTS/STT API 进行媒体生成和批量转录，xAI 的流式 STT WebSocket 进行实时语音通话转录，xAI 的Grok 用于语音实时会话的语音代理 WebSocket，以及用于聊天、搜索和代码执行工具的响应 API。
</Note>

### <a id="legacy-fast-mode-compatibility"></a> 旧版 fast-mode 兼容性

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true` 仍会按如下方式重写旧的 xAI 配置。这些目标 id 仅为兼容而保留；新的配置请使用当前可选模型。

| 源模型  | 快速模式目标   |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### <a id="legacy-compatibility-and-moving-aliases"></a> 旧版兼容性与迁移别名

较旧的别名会按如下方式归一化：

| 旧别名                                                  | 归一化后的 id    |
| ------------------------------------------------------------- | ---------------- |
| `grok-code-fast-1`, `grok-code-fast`, `grok-code-fast-1-0825` | `grok-build-0.1` |

带日期的 0309 id 是可选目录条目。OpenClaw 会将其他当前 Grok 4.20 别名原样发送，因此 xAI 仍可控制 stable、latest、 beta、experimental 和 dated 别名语义。全局 `grok-latest` 别名也会原样保留。

xAI 废弃了以下确切的 ID。现有配置保持其规范化和传输路径；未经策划的模型名称使用未知的定价：

| 已退役 id                                                          | 当前行为                 |
| -------------------------------------------------------------------- | -------------------------------- |
| `grok-4-1-fast-reasoning`, `grok-4-fast-reasoning`, `grok-4-0709`    | 启用 `low` 推理的 Grok 4.3    |
| `grok-4-1-fast-non-reasoning`, `grok-4-fast-non-reasoning`, `grok-3` | 禁用推理的 Grok 4.3 |
| `grok-code-fast-1`                                                   | Grok 构建 0.1                   |
| `grok-imagine-image-pro`                                             | Grok 想象图像质量       |

`openclaw doctor --fix` 会更新已持久化的 xAI server-tool 默认值和已退役的质量图片 slug，移除过时的生成目录行，并修复活动 4.20 行上的过时上下文元数据。它不会将活动的 4.20 `beta-latest` 别名固定到某个日期快照。

## <a id="features"></a> 功能

未配置的 `web_search`、`x_search` 和 `code_execution` 请求使用 Grok 4.7. 这也适用于省略工具模型设置的现有安装。显式工具模型保持选定状态；下面的 Grok 4.3 示例是覆盖。

<Warning>
  `x_search` 和 `code_execution` 在 xAI 的服务器上运行。 xAI 每 1,000 次工具调用收费 5 美元，加上模型的输入和输出令牌。由于省略了每个工具的 `enabled` 设置，OpenClaw 仅针对活动的 xAI 模型公开它。已知的非 xAI 模型提供程序需要显式的每个工具 `enabled: true`；丢失或未解析的提供程序会阻止请求。始终需要 xAI 身份验证，而 `enabled: false` 会为每个提供商禁用该工具。
</Warning>

<AccordionGroup>
  <Accordion id="web-search" title="网页搜索">
    捆绑的 `grok` Web 搜索提供方优先使用 xAI OAuth，然后回退到 `XAI_API_KEY` 或插件 Web 搜索密钥：

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion id="video-generation" title="视频生成">
    内置的 `xai` 插件通过共享的 `video_generate` 工具注册视频生成功能。

    - 默认模型：`xai/grok-imagine-video`
    - 额外模型：`xai/grok-imagine-video-1.5`
    - 经典模式：文本转视频、图像转视频、参考图像生成、 远程视频编辑和远程视频扩展
    - Video 1.5 模式：仅支持图像转视频，且必须恰好提供一张首帧图像
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`； 经典模式和 Video 1.5 图像转视频在省略时会继承源图像的宽高比
    - 分辨率：经典模式为 `480P`/`720P`；Video 1.5 也支持 `1080P`；所有生成模式默认 `480P`
    - 持续时间：generation/image-to-video为1-15秒，使用经典`reference_image`角色时为1-10秒，经典扩展为2-10秒
    - 参考图像生成：将每张提供的图像的 `imageRoles` 设为 `reference_image`；xAI 最多接受 7 张此类图像
    - Video edit/extend 继承输入视频的宽高比和分辨率；这些操作不接受几何覆盖
    - 默认操作超时：600 秒，除非设置了 `video_generate.timeoutMs` 或 `agents.defaults.mediaModels.video.timeoutMs`

    <Warning>
    不接受本地视频缓冲区。使用远程 `http(s)` URL 进行视频 edit/extend 输入。图像到视频接受本地图像缓冲区，因为 OpenClaw 将这些缓冲区编码为 xAI 的数据 URL。
    </Warning>

    Video 1.5 还识别 xAI 的 `grok-imagine-video-1.5-preview` 和 `grok-imagine-video-1.5-2026-05-30` 标识符。OpenClaw 会原样转发选定的标识符，但会应用相同的仅图像验证。

    要将 xAI 用作默认视频提供方：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "xai/grok-imagine-video",
            },
          },
        },
      },
    }
    ```

    <Note>
    有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Video Generation](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion id="image-generation" title="图像生成">
    内置的 `xai` 插件通过共享的 `image_generate` 工具注册图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-2.0`、`xai/grok-imagine-image-quality`
    - 模式：文本转图像和参考图像编辑
    - 参考输入：一张 `image` 或最多三张 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`2:1`、 `1:2`、`19.5:9`、`9:19.5`、`20:9`、`9:20`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像
    - 默认操作超时：600 秒，除非设置了 `image_generate.timeoutMs` 或 `agents.defaults.mediaModels.image.timeoutMs`

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以通过正常的通道附件路径存储和传送。本地参考图片转换为数据URL；远程 `http(s)` 引用不变地通过。

    显式选择 `xai/grok-imagine-image-2.0` 以使用图像 2.0；默认值仍为 `xai/grok-imagine-image`。显式的供应商限定图像模型 ID 传递到 xAI，包括尚未出现在 OpenClaw 目录中的 ID。未知的裸模型覆盖失败并出现错误，而不是选择默认值。

    要将 xAI 用作默认图像提供方：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "xai/grok-imagine-image",
            },
          },
        },
      },
    }
    ```

    <Note>
    xAI 也记录了 `quality`、`mask`、`user` 和一个 `auto` 宽高比。 OpenClaw 目前仅转发共享的跨提供方图像控制；这些仅原生支持的参数还不会通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion id="text-to-speech" title="文本转语音">
    内置的 `xai` 插件通过共享的 `tts` 提供方接口注册文本转语音功能。

    - 语音：来自 xAI 的已认证实时目录；使用 `openclaw infer tts voices --provider xai` 列出
    - 离线回退语音：`ara`、`eve`、`leo`、`rex`、`sal`
    - 默认语音：`eve`
    - Account 自定义语音 ID 即使在内置目录响应中不存在时也会被转发
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供方原生速度覆盖
    - 不支持原生 Opus 语音备注格式

    要将 xAI 用作默认 TTS 提供方：

    ```json5
    {
      tts: {
        provider: "xai",
        providers: {
          xai: {
            voiceId: "eve",
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw 使用 xAI 的批处理 `/v1/tts` 端点进行缓冲合成、经过身份验证的 `/v1/tts/voices` 目录发现以及本机 `wss://api.x.ai/v1/tts` 进行流合成。流式传输仅限于本机 `api.x.ai` 主机，因此自定义 `baseUrl` 值在此路径上被拒绝。它使用现有的语言、语音、编解码器和速度控制； xAI 默认值适用于采样率和比特率。音频文件合成遵循所有配置的编解码器。语音注释目标使用 MP3 进行流式传输和缓冲回退，因为 xAI 的原始编解码器不携带 codec/rate 元数据。该流发送 `text.delta`，然后发送 `text.done`，接收 `audio.delta`、`audio.done` 或 `error`，并应用为每个音频块刷新的空闲 `timeoutMs`。它与实时语音会话分开。参见xAI的[Streaming TTS API](https://docs.x.ai/developers/rest-api-reference/inference/voice)合约。
    </Note>

  </Accordion>

  <Accordion id="speech-to-text" title="语音转文本">
    内置的 `xai` 插件通过 OpenClaw 的媒体理解转录接口注册批量语音转文本功能。

    - 端点：xAI REST `/v1/stt`
    - 输入路径：multipart 音频文件上传
    - 模型选择：xAI 在内部选择转录模型；该端点没有模型选择器
    - 在入站音频转录读取 `tools.media.audio` 的地方使用，包括 Discord 语音通道段和通道音频附件

    要强制入站音频转录使用 xAI：

    ```json5
    {
      tools: {
        media: {
          models: [
            {
              type: "provider",
              provider: "xai",
              capabilities: ["audio"],
            },
          ],
          audio: {
            enabled: true,
          },
        },
      },
    }
    ```

    语言可以通过共享的音频媒体配置或按调用的转录请求提供。 共享的 OpenClaw 接口接受提示词提示，但 xAI REST STT 集成仅转发文件和语言，因为它们映射到当前公开的 xAI 端点。

    有效的空记录将被跳过，并且 OpenClaw 尝试任何配置的回退。格式错误的响应和 HTTP 失败仍然是错误。

  </Accordion>

  <Accordion id="streaming-speech-to-text" title="流式语音转文本">
    内置的 `xai` 插件还为实时语音通话音频注册了一个实时转录提供方。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认 endpointing：`800ms`
    - 中间转录：默认启用

    Voice Call 的 Twilio 媒体流发送的是 G.711 mu-law 音频帧，因此 xAI 提供方会直接转发这些帧而不进行转码：

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    提供方专属配置位于 `plugins.entries.voice-call.config.streaming.providers.xai` 下。支持的键有 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或 `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此流式提供方用于 Voice Call 的实时转录路径。 Discord 语音会录制短片段，并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion id="realtime-voice-talk" title="实时语音（谈话）">
    内置的 `xai` 插件通过共享的 `registerRealtimeVoiceProvider` 契约， 为 Talk 模式注册 Grok Voice Agent 实时会话。

    - 端点：`wss://api.x.ai/v1/realtime?model=<voice-model>`
    - 默认模型：`grok-voice-latest`
    - 默认语音：`eve`
    - 传输：`gateway-relay`（iOS、Android 和 Control UI 中继路径）
    - 音频：PCM16 24 kHz 或 G.711 µ-law 8 kHz
    - 抢话打断：xAI 服务器 VAD 会中断响应；OpenClaw 会清除队列中的播放内容并截断未播放的提供方历史记录

    在 Gateway 上配置 Talk：

    ```json5
    {
      talk: {
        realtime: {
          provider: "xai",
          mode: "realtime",
          transport: "gateway-relay",
          brain: "agent-consult",
          providers: {
            xai: {
              model: "grok-voice-latest",
              voice: "eve",
              // Opt in only if provider-side session replay is acceptable.
              sessionResumption: false,
            },
          },
        },
      },
      env: { vars: { XAI_API_KEY: "xai-..." } },
    }
    ```

    当 Voice Call 或共享实时选择器复用同一提供方映射时， 提供方拥有的配置也会从 `plugins.entries.voice-call.config.realtime.providers.xai` 解析。支持的键包括 `apiKey`、`baseUrl`、`model`、`voice`、`vadThreshold`、 `silenceDurationMs`、`prefixPaddingMs`、`reasoningEffort` 和 `sessionResumption`。 `reasoningEffort` 仅接受 `high` 或 `none`，与 xAI Voice Agent API 保持一致。

    xAI 的服务器 VAD 会始终创建响应并处理音频中断。 请使用 `consultRouting: "provider-direct"`；强制转录路由以及禁用输入音频中断不受 xAI Voice Agent 协议支持。

    <Note>
    xAI OAuth 或 `XAI_API_KEY` 可用于实时语音认证。浏览器拥有的 WebRTC 目前不属于该提供方能力范围；请在原生节点或 Control UI 中继路径上使用 gateway-relay Talk。
    </Note>

    <Note>
    `sessionResumption` 默认为 `false`。当设置为 `true` 时，OpenClaw 要求 xAI 保留足够的会话状态，以便在重新连接后恢复相同的对话，然后使用返回的对话 ID 重新连接。当提供商端 replay/retention 不可接受时，将其禁用；中断的套接字然后停止，而不是默默地开始新的对话。
    </Note>

  </Accordion>

  <Accordion id="x-search-configuration" title="x_search配置">
    捆绑的 xAI 插件将 `x_search` 暴露为一个 OpenClaw 工具，用于通过 Grok 搜索 X（原 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | 键               | 类型    | 默认值                   | 描述                                      |
    | ----------------- | ------- | ------------------------- | ------------------------------------------------ |
    | `enabled`         | 布尔值 | 对 xAI 模型自动启用  | 禁用，或为已知的非 xAI 提供方显式启用 |
    | `model`           | 字符串  | `grok-4.7`                | 用于 x_search 请求的模型                 |
    | `baseUrl`         | 字符串  | -                         | xAI Responses 基础 URL 覆盖                  |
    | `inlineCitations` | 布尔值 | -                         | 在结果中包含内联引用              |
    | `maxTurns`        | 数字  | -                         | 最大对话轮数                       |
    | `timeoutSeconds`  | 数字  | `30`                      | 请求超时（秒）                       |
    | `cacheTtlMinutes` | 数字  | `15`                      | 缓存存活时间（分钟）                    |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4.3",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="code-execution-configuration" title="代码执行配置">
    内置的 xAI 插件将 `code_execution` 暴露为一个 OpenClaw 工具，用于在 xAI 沙箱环境中远程执行代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | 键              | 类型    | 默认值                  | 描述                                      |
    | ---------------- | ------- | ------------------------ | ------------------------------------------------ |
    | `enabled`        | 布尔值 | 对 xAI 模型自动启用 | 禁用，或为已知的非 xAI 提供方显式启用 |
    | `model`          | 字符串  | `grok-4.7`               | 用于代码执行请求的模型           |
    | `maxTurns`       | 数字  | -                        | 最大对话轮数                       |
    | `timeoutSeconds` | 数字  | `30`                     | 请求超时（秒）                       |

    <Note>
    这是远程 xAI 沙箱执行，不是本地 [`exec`](/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4.3",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="context-compaction" title="上下文压缩">
    默认情况下，本机 `api.x.ai` 响应路由使用 xAI 的服务器端 [`/responses/compact`](https://docs.x.ai/developers/advanced-api-usage/context-compaction) 端点进行手动 `/compact` 和阈值驱动的预检压缩。该会话保持其 OpenClaw 转录本不变，并为下一个请求存储 xAI 的不透明检查点。完成通知报告提供者之前和之后的令牌计数。

    使用以下命令禁用一种模型的端点：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "xai/grok-4.5": {
              params: { responsesCompactEndpoint: false },
            },
          },
        },
      },
    }
    ```

    其他与响应兼容的提供商可以选择加入 `params.responsesCompactEndpoint: true`；非响应路由忽略该设置。公共 OpenAI 响应 API 还默认启用此端点以进行预算压缩和 `/compact`。其内联`context_management`压实由`responsesServerCompaction`单独控制。

    端点故障回溯到 OpenClaw 的客户端汇总。提供者确认的溢出恢复永远不会调用端点，因为 xAI 要求输入在压缩之前适合模型上下文窗口。预测压力可以在提交下一回合之前尝试终点。

  </Accordion>

  <Accordion id="known-limits" title="已知限制">
    - xAI 身份验证可以使用 API 密钥、环境变量、插件配置回退或具有合格 xAI 帐户的 OAuth。 OAuth 使用设备代码验证，无需本地主机回调。 xAI 决定哪些账户可以接收 OAuth API 代币，并且同意页面可能会显示 Grok Build，即使 OpenClaw 不需要 Grok Build 应用程序。
    - OpenClaw 目前不暴露 xAI 多代理模型家族。xAI 通过 Responses API 提供这些模型，但它们不接受 OpenClaw 共享代理循环所使用的客户端或自定义工具。 参见 [xAI 多代理限制](https://docs.x.ai/developers/model-capabilities/text/multi-agent#limitations)。
    - xAI 实时语音目前仅暴露 gateway-relay Talk 传输。 浏览器拥有的提供方 WebSocket 会话尚未在 Control UI 中接入。
    - xAI 图像 `quality`、图像 `mask` 以及额外的仅原生支持的宽高比， 在共享的 `image_generate` 工具具备相应的跨提供方控制之前不会暴露。
  </Accordion>

  <Accordion id="advanced-notes" title="高级笔记">
    - OpenClaw 在共享运行器路径上自动应用 xAI- 特定工具架构和工具调用兼容性修复。
    - Native `https://api.x.ai/v1` 响应请求将工具图像附加到其工具结果中。在兼容性路线（包括 Grok OAuth）上，支持图像的模型在每个连续的工具结果组之后立即收到带标签的用户图像消息。并行结果保持在一起，稍后会保留历史图像位置以进行即时缓存。压缩建立新的历史前缀和结果编号。
    - 原生 xAI 请求默认 `tool_stream: true`。将 `agents.defaults.models["xai/<model>"].params.tool_stream` 设为 `false` 可将其禁用。
    - 在发送本机 xAI 请求之前，捆绑的 xAI 包装器会去除不支持的包含计数架构边界和不支持的推理 *effort* 有效负载密钥。 Grok 4.7 和 Grok 4.6 支持低、中、高和 xhigh 工作量（默认高）。 Grok 4.5 支持低、中、高工作量（默认高）。 Grok 4.3 支持无、低、中和高工作量（默认低）。其他具有推理功能的 xAI 模型不会公开可配置的工作量控制，但仍请求 `include: ["reasoning.encrypted_content"]`，以便可以在后续回合中重播之前的加密推理。对于这些模型，OpenClaw 的 `off` 设置忽略了工作量覆盖；它不会关闭模型的本机推理。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw 工具暴露。OpenClaw 只会将每个工具所需的特定 xAI 内置能力附加到该工具的请求中，而不是把每个原生工具都附加到每一轮聊天里。
    - Grok `web_search` 读取 `plugins.entries.xai.config.webSearch.baseUrl`。 `x_search` 读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后回退到 Grok Web 搜索基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码进核心模型运行时。
    - `code_execution` 是远程 xAI 沙箱执行，不是本地 [`exec`](/tools/exec)。
  </Accordion>
</AccordionGroup>

## <a id="live-testing"></a> 在线测试

xAI 媒体路径包含在单元测试和选择加入的实时套件中。在运行实时检查之前，在流程环境中导出 `XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "classic Grok Imagine"
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "Grok Imagine Video 1.5"
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/x-search.live.test.ts
OPENCLAW_LIVE_GATEWAY_MODELS="xai/grok-4.7,xai/grok-4.6,xai/grok-4.5,xai/grok-build-0.1,xai/grok-4.3,xai/grok-4.20-0309-reasoning,xai/grok-4.20-0309-non-reasoning" OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0 OPENCLAW_LIVE_GATEWAY_SMOKE=0 pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供商特定的实时文件合成正常的 TTS、电话友好的 PCM TTS、通过 xAI 批处理 STT 转录音频、通过 xAI 实时流式传输相同的 PCM STT，生成文本到图像的输出，并编辑参考图像。共享图像实时文件通过 OpenClaw 的运行时选择、回退、规范化和媒体附件路径来验证相同的 xAI 提供程序。选择加入视频 1.5 案例提交生成的 1080P 第一帧图像，并验证已完成的视频下载。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/providers/index" icon="grid-2">
    更广泛的提供商概览。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及修复方法。
  </Card>
</CardGroup>
