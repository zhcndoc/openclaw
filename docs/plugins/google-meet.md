---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入显式 Meet URL，并使用座席对讲默认值"
read_when:
  - "你希望 OpenClaw 代理加入一个 Google Meet 通话"
  - "你希望 OpenClaw 代理创建一个新的 Google Meet 通话"
  - "你正在配置 Chrome、Chrome 节点或 Twilio 作为 Google Meet 传输方式"
title: "Google Meet 插件"
---

`google-meet` 插件代表 OpenClaw 客服人员加入显式 Meet URL。它故意狭窄：

- 它只加入`https://meet.google.com/...` URL；它绝不会通过自己发现的电话号码拨入会议。
- `googlemeet create` 可以通过 Google Meet API（或浏览器回退方案）生成一个新的 Meet URL，并默认加入该会议。
- Chrome 参与使用已登录的 Chrome 配置文件，且可选在配对节点上运行。Twilio 参与会通过 [Voice call 插件](/plugins/voice-call) 拨打电话号码以及 PIN/DTMF；它不能直接拨打 Meet URL。
- `mode: "agent"`（默认）通过实时提供商转录参与者语音，将其路由到配置的 OpenClaw 代理，并使用常规 OpenClaw TTS 说出答案。 `mode: "bidi"` 使用实时语音，包括具有本机 OpenClaw 座席委派的 GPT-Live。 `mode: "transcribe"` 加入仅观察，无对讲。
- 插件加入通话时不会自动播报同意声明。
- CLI 命令是 `googlemeet`；`meet` 保留用于更广泛的代理电话会议工作流。

## <a id="quick-start"></a> 快速开始

为 Chrome 主机安装插件和本机音频依赖项，然后配置提供商身份验证。 OpenAI 是 `agent` 模式的默认转录提供程序； `bidi`模式支持Google Gemini Live和OpenAI实时语音，包括GPT-Live。对于带有 Cove 的 GPT-Live，请使用 [ 显式 Live 配置 ](/plugins/google-meet/config#gpt-live-with-cove)。 macOS上的默认代理路径：

```bash
openclaw plugins install @openclaw/google-meet
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# only needed when realtime.voiceProvider is "google" for bidi mode
export GEMINI_API_KEY=...
```

`blackhole-2ch` 会安装 Chrome 路由所使用的 `BlackHole 2ch` 虚拟音频设备。Homebrew 的安装程序要求在 macOS 显示该设备之前重启一次：

```bash
sudo reboot
```

重启后，验证两项内容：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在使用 PipeWire-Pulse 的 Linux 桌面上：

```bash
sudo apt install pipewire-audio pulseaudio-utils # Debian/Ubuntu
systemctl --user --now enable pipewire pipewire-pulse wireplumber
pactl info
command -v pactl pacat parec
```

OpenClaw 会在该桌面用户的音频会话中配置一个 `OpenClaw Meeting Audio` 空接收器及其匹配的源。使用与运行 Chrome 相同的用户运行 Gateway 或配对节点。

插件安装后默认启用。只有在需要自定义时才添加条目：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        config: {},
      },
    },
  },
}
```

如果不希望插件处于活动状态，请运行 `openclaw plugins disable google-meet`。

检查设置，然后加入会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

`setup` 输出是代理可读的和 mode/transport-aware：它报告 Chrome 配置文件、节点固定，以及对于实时 Chrome 加入、本机虚拟音频后端和延迟介绍检查。仅观察连接跳过实时先决条件：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

配置 Twilio 委派时，`setup` 还会报告 `voice-call`、Twilio 凭证和公共 Webhook 暴露是否已准备好。在代理加入之前，将任何 `ok: false` 检查视为该 transport/mode 的阻止程序。使用 `--json` 进行机器可读输出，并使用 `--transport chrome|chrome-node|twilio` 提前预检特定传输：

```bash
openclaw googlemeet setup --transport twilio
```

或者让 agent 通过 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

本地 Chrome 对讲支持 macOS 与 `BlackHole 2ch` 和 SoX，或 Linux 与 PipeWire-Pulse 和 `pactl`/`pacat`/`parec`. 在其他操作系统上，使用 `mode: "transcribe"`， Twilio 拨入，或支持的 macOS/Linux `chrome-node` 主机。

### <a id="create-a-meeting"></a> 创建会议

```bash
openclaw googlemeet create --transport chrome-node --mode agent
openclaw googlemeet create --no-join
```

`create` 有两条路径，并会在结果的 `source` 字段中报告：

- **`api`**：在配置 Google Meet OAuth 凭证时使用。直接使用API；不依赖于浏览器 UI 状态。
- **`browser`**：在没有 OAuth 凭据时使用。OpenClaw 在固定的 Chrome 节点上打开 `https://meet.google.com/new`，并等待 Google 重定向到真实的会议代码 URL；该节点上的 OpenClaw Chrome 配置文件必须已经登录 Google。加入和创建都会在打开新标签页之前复用现有的 Meet 标签页（或进行中的 `.../new` / Google 账号提示标签页）；标签页匹配会忽略诸如 `authuser` 之类无害的查询字符串。

默认情况下，`create` 会加入并返回 `joined: true` 以及加入会话。传入 `--no-join`（CLI）或 `"join": false`（工具）即可只生成 URL。

对于 API- 创建的房间，设置显式访问策略，而不是继承 Google 帐户默认值：

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

| `--access-type` | 谁可以无需请求加入                                       |
| --------------- | ------------------------------------------------------------------- |
| `OPEN`          | 任何拥有 Meet URL 的人                                            |
| `TRUSTED`       | 主办方组织的受信任用户、受邀外部用户，以及拨入用户 |
| `RESTRICTED`    | 仅受邀者                                                       |

这只适用于API-创建的房间，因此必须配置OAuth。如果您在 2026.5.2 中提供访问类型控制之前授权了 OpenClaw，请在将 `meetings.space.settings` 范围添加到 OAuth 同意屏幕后重新运行 `openclaw googlemeet auth login --json`。

如果浏览器回退遇到 Google 登录或 Meet 权限阻止程序，该工具将返回 `manualAction: { reason, message }` 以及 `browser.nodeId`/`browser.targetId`/`browserUrl`. 报告该消息，并停止打开新的 Meet 选项卡，直到操作员完成浏览器步骤。

### <a id="observe-only-join"></a> 仅观察加入

设置 `"mode": "transcribe"` 以跳过双工实时桥接（无虚拟音频要求，无对讲）。转录模式 Chrome 加入还会跳过 OpenClaw 的 microphone/camera 权限授予和 Meet **使用麦克风** 路径；如果 Meet 显示音频选择插页式广告，则自动化会首先尝试 **不使用麦克风继续**。托管 Chrome 传输在每种模式下都安装了尽力满足字幕观察器，因此无需更改实时座席咨询路径即可获得持久注释。 `googlemeet status --json` 和 `googlemeet doctor` 报告 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 和 `recentTranscript` 尾部。

对于有界会话转录，请读取精确跟踪的 Meet 标签页：

```bash
openclaw googlemeet transcript <session-id>
openclaw googlemeet transcript <session-id> --since <next-index> --json
```

观察器在 Meet 页面中最多保留 2,000 行已完成的字幕。可见的渐进式文本会一直保留在状态健康尾部中，直到字幕行完成，因此保存 `nextIndex` 不会跳过后续的文本扩展；离开时会在快照前完成可见行的最终处理。当超过上限时，`droppedLines` 会报告从开头丢失的行数。有界的 `googlemeet transcript` 尾部仍只保留最近结束的四个会话，并会在 Gateway 重启时重置。除此之外，OpenClaw 会在会议期间将已完成的字幕行追加到共享状态数据库，并在离开时写入派生摘要。使用 [`openclaw transcripts`](/cli/transcripts) 检查或导出这些持久化笔记。

自动笔记默认启用。设置 `transcripts.enabled: false` 可全局禁用持久化笔记；显式的 `transcribe` 模式仍只会提供其有界的实时尾部。Twilio 加入没有浏览器字幕流，因此不会通过此路径捕获。

对于 yes/no 监听检查：

```bash
openclaw googlemeet test-listen <meet-url> --transport chrome-node
```

它以转录模式加入，等待新的 caption/transcript 运动，并返回 `listenVerified`、`listenTimedOut`、手动操作字段和当前字幕运行状况。

<a id="notes" />

## <a id="audio-bridge-architecture"></a> 音频桥架构

Google Meet 的官方媒体 API 是面向接收的，因此在通话中发言仍然需要一个参与者路径。这个插件保持了这条边界的可见性：Chrome 负责浏览器参与和本地音频路由；Twilio 负责电话拨入参与。

Chrome 回传模式需要受支持的原生虚拟音频后端，以及以下任一项：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：通过生成的本机命令，OpenClaw 从浏览器播放中捕获参与者音频，将助理音频注入虚拟麦克风，并使用本机输入来验证该注入。显式配置的输入命令不断向提供商提供参与者音频，保留自定义 capture/filter/mixer 设置。 `agent`模式采用实时转录加常规TTS； `bidi` 模式使用实时语音提供程序。默认路径为 24 kHz PCM16 和 `chrome.audioBufferBytes: 4096`； 8 kHz G.711 mu-law 仍然可用于传统命令对。
- `chrome.audioBridgeCommand`：外部桥接命令负责整个本地音频路径，并且必须在启动或验证其守护进程后退出。仅对 `bidi` 有效，因为 `agent` 模式需要直接访问命令对以进行 TTS。

默认浏览器桥使参与者无法通过虚拟麦克风进行播放，因此收到的会议音频不会发送回呼叫中。在助理演讲期间，孤立的参与者输入仍然可用。 Google Meet、Microsoft Teams 和 Zoom 使用相同的会议引擎；提供商选择、委派和中断策略还共享 Discord 和 Talk 使用的实时语音运行时。

GPT-Live 拥有中断功能，可以连续播放音频，无需等待响应完成事件。它需要托管隔离浏览器输入：选择“实时”时删除显式 `chrome.audioInputCommand`。自定义输入命令无法建立这种隔离，并且会被 Live 拒绝，而不是默默地被替换。 Live不使用`chrome.bargeInInputCommand`。对于在网关托管的命令对桥上支持主机驱动中断的提供商，该可选的单独本地麦克风命令仍然可用。与其他音频命令一样，它是操作员配置的本地命令：使用显式可信命令路径或参数列表。

`googlemeet speak` 触发 Chrome 会话的活动对讲音频桥； `googlemeet leave` 停止它（并且，对于通过语音呼叫委派的 Twilio 会话，挂断基础呼叫）。使用 `googlemeet end-active-conference` 还可关闭 API- 托管空间的活动 Google Meet 会话。

### <a id="realtime-session-health"></a> 实时会话健康状态

在对讲会话期间，`google_meet` 状态报告 Chrome/audio 网桥健康状况：`inCall`、`manualAction`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最后一个 input/output时间戳、字节计数器和桥关闭状态。托管 Chrome 会话仅在运行状况报告 `inCall: true` 后说出 intro/test 短语；否则 `speechReady: false` 并且语音尝试被阻止而不是默默地无操作。

本地 Chrome 和配对的 Chrome 节点使用相同的输入源选择。生成的命令使用隔离的浏览器捕获和本机注入；显式输入命令保留其配置的捕获路径和现有的回声保护。如果无法捕获托管浏览器播放，则桥接器显然会失败，而不是将混合环回音频发送到 Live。尚无参与者音频的房间处于空闲状态，而不是捕获失败。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的五个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="google-meet-transports-and-hosts"></a> Google 满足传输和主机

[Google Meet 传输和主机](/plugins/google-meet/transports) — Chrome、Chrome 节点和 Twilio 传输、Parallels macOS VM 拓扑以及它们所需的主机音频工具。

- <a id="local-gateway-%2B-parallels-chrome"></a><a id="local-gateway-+-parallels-chrome"></a>[本地网关 + Parallels Chrome](/plugins/google-meet/transports#local-gateway-%2B-parallels-chrome)
- <a id="common-failure-checks"></a>[常见故障检查](/plugins/google-meet/transports#common-failure-checks)
- <a id="install-notes"></a>[安装说明](/plugins/google-meet/transports#install-notes)
- <a id="transports"></a>[运输](/plugins/google-meet/transports#transports)
- <a id="chrome"></a>[Chrome](/plugins/google-meet/transports#chrome)
- <a id="twilio"></a>[Twilio](/plugins/google-meet/transports#twilio)

### <a id="google-meet-oauth-and-artifacts"></a> Google 认识 OAuth 和工件

[Google Meet OAuth 和工件](/plugins/google-meet/oauth-and-artifacts) — Google 云凭证、刷新令牌、OAuth 验证以及阅读 Meet 工件、出勤和导出。

- <a id="oauth-and-preflight"></a>[O验证和预检](/plugins/google-meet/oauth-and-artifacts#oauth-and-preflight)
- <a id="create-google-credentials"></a>[创建Google凭证](/plugins/google-meet/oauth-and-artifacts#create-google-credentials)
- <a id="create-or-select-a-project"></a>[创建或选择项目](/plugins/google-meet/oauth-and-artifacts#create-or-select-a-project)
- <a id="enable-the-google-meet-rest-api"></a>[启用 Google 满足 REST API](/plugins/google-meet/oauth-and-artifacts#enable-the-google-meet-rest-api)
- <a id="configure-the-oauth-consent-screen"></a>[配置 OAuth 同意屏幕](/plugins/google-meet/oauth-and-artifacts#configure-the-oauth-consent-screen)
- <a id="add-the-requested-scopes"></a>[添加请求的范围](/plugins/google-meet/oauth-and-artifacts#add-the-requested-scopes)
- <a id="create-an-oauth-client-id"></a>[创建 OAuth 客户端 ID](/plugins/google-meet/oauth-and-artifacts#create-an-oauth-client-id)
- <a id="copy-the-client-id-and-client-secret"></a>[复制客户端ID和客户端密钥](/plugins/google-meet/oauth-and-artifacts#copy-the-client-id-and-client-secret)
- <a id="mint-the-refresh-token"></a>[铸造刷新令牌](/plugins/google-meet/oauth-and-artifacts#mint-the-refresh-token)
- <a id="verify-oauth-with-doctor"></a>[与医生验证OAuth](/plugins/google-meet/oauth-and-artifacts#verify-oauth-with-doctor)
- <a id="resolve%2C-preflight%2C-and-read-artifacts"></a><a id="resolve-preflight-and-read-artifacts"></a>[解析、预检和读取工件](/plugins/google-meet/oauth-and-artifacts#resolve%2C-preflight%2C-and-read-artifacts)
- <a id="live-smoke-test"></a>[现场烟雾测试](/plugins/google-meet/oauth-and-artifacts#live-smoke-test)
- <a id="create-examples"></a>[创建示例](/plugins/google-meet/oauth-and-artifacts#create-examples)

### <a id="google-meet-configuration"></a> Google 满足配置

[Google Meet 配置](/plugins/google-meet/config) — 插件配置默认值、可选覆盖以及 ElevenLabs 和 Twilio 配置示例。

- <a id="config"></a>[Config](/plugins/google-meet/config#config)
- <a id="defaults"></a>[默认](/plugins/google-meet/config#defaults)
- <a id="optional-overrides"></a>[可选覆盖](/plugins/google-meet/config#optional-overrides)

### <a id="google-meet-tool-and-modes"></a> Google Meet 工具和模式

[Google Meet 工具和模式](/plugins/google-meet/tool-and-modes) - 用于代理、会话状态字段以及代理和双向对讲模式的工具操作。

- <a id="tool"></a>[工具](/plugins/google-meet/tool-and-modes#tool)
- <a id="agent-and-bidi-modes"></a>[代理和比迪模式](/plugins/google-meet/tool-and-modes#agent-and-bidi-modes)

### <a id="google-meet-troubleshooting"></a> Google 满足故障排除

[Google Meet 故障排除](/plugins/google-meet/troubleshooting) — 飞行前实时测试清单以及针对加入、语音、创建和 Twilio 故障的修复。

- <a id="live-test-checklist"></a>[现场测试清单](/plugins/google-meet/troubleshooting#live-test-checklist)
- <a id="troubleshooting"></a>[故障排除](/plugins/google-meet/troubleshooting#troubleshooting)
- <a id="agent-cannot-see-the-google-meet-tool"></a>[Agent无法看到Google Meet工具](/plugins/google-meet/troubleshooting#agent-cannot-see-the-google-meet-tool)
- <a id="no-connected-google-meet-capable-node"></a>[未连接 Google 支持 Meet 的节点](/plugins/google-meet/troubleshooting#no-connected-google-meet-capable-node)
- <a id="browser-opens-but-agent-cannot-join"></a>[浏览器打开但代理无法加入](/plugins/google-meet/troubleshooting#browser-opens-but-agent-cannot-join)
- <a id="meeting-creation-fails"></a>[会议创建失败](/plugins/google-meet/troubleshooting#meeting-creation-fails)
- <a id="agent-joins-but-does-not-talk"></a>[代理加入但不说话](/plugins/google-meet/troubleshooting#agent-joins-but-does-not-talk)
- <a id="twilio-setup-checks-fail"></a>[Twilio 设置检查失败](/plugins/google-meet/troubleshooting#twilio-setup-checks-fail)
- <a id="twilio-call-starts-but-never-enters-the-meeting"></a>[Twilio 呼叫开始但从未进入会议](/plugins/google-meet/troubleshooting#twilio-call-starts-but-never-enters-the-meeting)

## <a id="related"></a> 相关内容

- [会议插件概览](/plugins/meeting-plugins)
- [语音通话插件](/plugins/voice-call)
- [对话模式](/nodes/talk)
- [ElevenLabs](/providers/elevenlabs) — Meet 配置示例中使用的语音和转录提供程序
- [构建插件](/plugins/building-plugins)
