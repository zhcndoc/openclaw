---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入显式 Meet URL，并默认使用实时语音"
read_when:
  - 你希望 OpenClaw 代理加入一个 Google Meet 通话
  - 你希望 OpenClaw 代理创建一个新的 Google Meet 通话
  - 你正在将 Chrome、Chrome 节点或 Twilio 配置为 Google Meet 传输方式
title: "Google Meet 插件"
---

OpenClaw 的 Google Meet 参会支持——该插件的设计就是显式的：

- 它只加入显式的 `https://meet.google.com/...` URL。
- 它可以通过 Google Meet API 创建一个新的 Meet 空间，然后加入返回的 URL。
- `realtime` 语音是默认模式。
- 当需要更深层的推理或工具时，实时语音可以回调到完整的 OpenClaw 代理。
- 代理通过 `mode` 选择加入行为：使用 `realtime` 进行实时听/回话，或使用 `transcribe` 在不通过实时语音桥接的情况下加入/控制浏览器。
- 认证从个人 Google OAuth 或已登录的 Chrome 配置文件开始。
- 没有自动的同意提示播报。
- 默认的 Chrome 音频后端是 `BlackHole 2ch`。
- Chrome 可以在本地运行，也可以在配对的节点主机上运行。
- Twilio 接受拨入号码以及可选的 PIN 或 DTMF 序列。
- CLI 命令是 `googlemeet`；`meet` 保留给更广泛的代理电话会议工作流。

## 快速开始

安装本地音频依赖并配置后端实时语音提供方。OpenAI 是默认值；Google Gemini Live 也可与 `realtime.provider: "google"` 一起使用：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 或者
export GEMINI_API_KEY=...
```

`blackhole-2ch` 会安装 `BlackHole 2ch` 虚拟音频设备。Homebrew 的安装程序要求重启后，macOS 才会显示该设备：

```bash
sudo reboot
```

重启后，验证这两项：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v rec play
```

启用插件：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

检查设置：

```bash
openclaw googlemeet setup
```

设置输出是为了让代理可读取。它会报告 Chrome 配置文件、音频桥接、节点固定、延迟实时开场，以及在配置了 Twilio 委派时，`voice-call` 插件和 Twilio 凭据是否已就绪。在请求代理加入之前，请将任何 `ok: false` 的检查视为阻塞项。脚本或机器可读输出请使用 `openclaw googlemeet setup --json`。

加入会议：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者让代理通过 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

创建新的会议并加入：

```bash
openclaw googlemeet create --transport chrome-node --mode realtime
```

只创建 URL 而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有两条路径：

- API 创建：在已配置 Google Meet OAuth 凭据时使用。这是最确定性的路径，不依赖浏览器 UI 状态。
- 浏览器回退：在缺少 OAuth 凭据时使用。OpenClaw 使用固定的 Chrome 节点，打开 `https://meet.google.com/new`，等待 Google 重定向到真实的会议代码 URL，然后返回该 URL。此路径要求节点上的 OpenClaw Chrome 配置文件已经登录 Google。浏览器自动化会处理 Meet 自身首次运行的麦克风提示；该提示不被视为 Google 登录失败。

命令/工具输出包含一个 `source` 字段（`api` 或 `browser`），以便代理说明所使用的路径。`create` 默认会加入新会议并返回 `joined: true` 以及加入会话。若只想生成 URL，请在 CLI 中使用 `create --no-join`，或向工具传递 `"join": false`。

或者告诉代理：“创建一个 Google Meet，用实时语音加入，并把链接发给我。”代理应调用 `google_meet`，`action` 为 `"create"`，然后分享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

若要进行仅观察/浏览器控制式的加入，将 `"mode"` 设为 `"transcribe"`。这不会启动双向实时模型桥接，因此不会在会议中进行回话。

Chrome 以已登录的 Chrome 配置文件加入。在 Meet 中，为 OpenClaw 使用的麦克风/扬声器路径选择 `BlackHole 2ch`。若要获得干净的双工音频，请使用独立的虚拟设备或类似 Loopback 的图形；单个 BlackHole 设备足够做首次冒烟测试，但可能产生回声。

### 本地 Gateway + Parallels Chrome

仅为了让虚拟机拥有 Chrome，你**不需要**在 macOS 虚拟机内运行完整的 OpenClaw Gateway 或模型 API 密钥。先在本地运行 Gateway 和代理，再在虚拟机中运行节点主机。只需在虚拟机中启用捆绑插件一次，这样节点就会声明 Chrome 命令：

运行位置分工如下：

- Gateway 主机：OpenClaw Gateway、代理工作区、模型/API 密钥、实时提供方，以及 Google Meet 插件配置。
- Parallels macOS 虚拟机：OpenClaw CLI/节点主机、Google Chrome、SoX、BlackHole 2ch，以及已登录 Google 的 Chrome 配置文件。
- 虚拟机中不需要：Gateway 服务、代理配置、OpenAI/GPT 密钥或模型提供方设置。

安装虚拟机依赖：

```bash
brew install blackhole-2ch sox
```

安装 BlackHole 后重启虚拟机，以便 macOS 显示 `BlackHole 2ch`：

```bash
sudo reboot
```

重启后，验证虚拟机能看到音频设备和 SoX 命令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v rec play
```

在虚拟机中安装或更新 OpenClaw，然后在其中启用捆绑插件：

```bash
openclaw plugins enable google-meet
```

在虚拟机中启动节点主机：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是局域网 IP，且你没有使用 TLS，则节点会拒绝明文 WebSocket，除非你为这个受信任的私有网络显式允许：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

将同样的环境变量用于将节点安装为 LaunchAgent：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是进程环境变量，不是 `openclaw.json` 设置。`openclaw node install` 会在安装命令中存在该变量时，将其存储到 LaunchAgent 环境中。

在 Gateway 主机上批准该节点：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

确认 Gateway 看到了该节点，并且它同时声明了 `googlemeet.chrome` 和浏览器能力/`browser.proxy`：

```bash
openclaw nodes status
```

在 Gateway 主机上通过该节点路由 Meet：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw 代理",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

现在从 Gateway 主机正常加入：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者让代理使用 `google_meet` 工具并设置 `transport: "chrome-node"`。

若要进行一条命令的冒烟测试，创建或复用会话、说出已知短语并打印会话健康状态：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

加入过程中，OpenClaw 浏览器自动化会填写来宾名称，点击 Join/Ask to join，并在出现 Meet 首次运行的“使用麦克风”选项时接受它。在仅浏览器的会议创建过程中，如果 Meet 没有显示使用麦克风按钮，它也可以在没有麦克风的情况下继续通过同一个提示。如果浏览器配置文件未登录、Meet 正在等待主持人批准、Chrome 需要麦克风/摄像头权限，或者 Meet 卡在自动化无法解决的提示上，那么 join/test-speech 结果会报告 `manualActionRequired: true`，并附带 `manualActionReason` 和 `manualActionMessage`。代理应停止重试加入，报告该确切消息以及当前的 `browserUrl`/`browserTitle`，并且仅在手动浏览器操作完成后再重试。

如果省略 `chromeNode.node`，只有在恰好有一个已连接节点同时声明 `googlemeet.chrome` 和浏览器控制时，OpenClaw 才会自动选择。若连接了多个具备能力的节点，请将 `chromeNode.node` 设为节点 id、显示名称或远程 IP。

常见失败检查：

- `No connected Google Meet-capable node`：在虚拟机中启动 `openclaw node run`，批准配对，并确保在虚拟机中运行了 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser`。还要确认 Gateway 主机允许这两个节点命令：`gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]`。
- `BlackHole 2ch audio device not found on the node`：在虚拟机中安装 `blackhole-2ch` 并重启虚拟机。
- Chrome 打开了但无法加入：在虚拟机中的浏览器配置文件里登录，或者保持 `chrome.guestName` 以便访客加入。访客自动加入通过节点浏览器代理使用 OpenClaw 浏览器自动化；请确保节点浏览器配置指向你想要的配置文件，例如 `browser.defaultProfile: "user"` 或一个已有会话的命名配置文件。
- 重复的 Meet 标签页：保持 `chrome.reuseExistingTab: true` 启用。OpenClaw 会在打开新标签页之前激活同一 Meet URL 的现有标签页，而浏览器会议创建也会在打开另一个标签页之前复用正在进行中的 `https://meet.google.com/new` 或 Google 账号提示标签页。
- 没有音频：在 Meet 中，将麦克风/扬声器路由通过 OpenClaw 使用的虚拟音频设备路径；为了干净的双工音频，请使用独立的虚拟设备或 Loopback 风格的路由。

## 安装说明

Chrome 实时模式默认使用两个外部工具：

- `sox`：命令行音频工具。该插件使用其 `rec` 和 `play`
  命令作为默认的 8 kHz G.711 mu-law 音频桥接。
- `blackhole-2ch`：macOS 虚拟音频驱动。它会创建 `BlackHole 2ch`
  音频设备，供 Chrome/Meet 路由使用。

OpenClaw 不捆绑也不再分发这两个软件包。文档要求用户通过
Homebrew 将它们作为宿主机依赖安装。SoX 的许可证为
`LGPL-2.0-only AND GPL-2.0-only`；BlackHole 的许可证为 GPL-3.0。如果你构建
一个将 BlackHole 与 OpenClaw 打包在一起的安装程序或设备，请查看 BlackHole 的
上游许可条款，或从 Existential Audio 获取单独许可。

## 传输

### Chrome

Chrome 传输会在 Google Chrome 中打开 Meet URL，并以已登录的
Chrome 配置文件身份加入。在 macOS 上，插件会在启动前检查是否存在 `BlackHole 2ch`。
如果已配置，它还会在打开 Chrome 之前运行音频桥健康检查命令和启动命令。
当 Chrome/音频运行在 Gateway 主机上时使用 `chrome`；当 Chrome/音频运行在配对节点上时使用
`chrome-node`，例如 Parallels
macOS 虚拟机。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

将 Chrome 的麦克风和扬声器音频路由通过本地 OpenClaw 音频
桥。如果未安装 `BlackHole 2ch`，加入会因设置错误而失败，
而不会在没有音频路径的情况下静默加入。

### Twilio

Twilio 传输是一个严格的拨号计划，由 Voice Call 插件代理。它
不会解析 Meet 页面中的电话号码。

当无法通过 Chrome 参与，或者你想要电话拨入
备用方案时使用它。Google Meet 必须为该
会议提供电话拨入号码和 PIN；OpenClaw 不会从 Meet 页面中发现这些信息。

在 Gateway 主机上启用 Voice Call 插件，而不是在 Chrome 节点上启用：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // 或在 Twilio 应作为默认值时设置为 "twilio"
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
        },
      },
    },
  },
}
```

通过环境变量或配置提供 Twilio 凭据。使用环境变量可将密钥
排除在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

启用 `voice-call` 后请重启或重新加载 Gateway；插件配置变更
在已运行的 Gateway 进程重新加载之前不会生效。

然后验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当 Twilio 代理已正确连接时，`googlemeet setup` 会包含成功的
`twilio-voice-call-plugin` 和 `twilio-voice-call-credentials` 检查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

当会议需要自定义序列时，使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和预检

创建 Meet 链接时 OAuth 是可选的，因为 `googlemeet create` 可以回退到
浏览器自动化。在你希望使用官方 API 创建、
空间解析或 Meet Media API 预检检查时，请配置 OAuth。

Google Meet API 访问首先使用个人 OAuth 客户端。配置
`oauth.clientId`，并可选配置 `oauth.clientSecret`，然后运行：

```bash
openclaw googlemeet auth login --json
```

该命令会打印包含刷新令牌的 `oauth` 配置块。它使用 PKCE、
`http://localhost:8085/oauth2callback` 的 localhost 回调，以及带 `--manual` 的手动
复制/粘贴流程。

OAuth 同意包含 Meet 空间创建、Meet 空间读取访问，以及 Meet
会议媒体读取访问。如果你在会议创建支持存在之前进行了认证，
请重新运行 `openclaw googlemeet auth login --json`，以便刷新
令牌拥有 `meetings.space.created` 作用域。

浏览器回退模式不需要 OAuth 凭据。在该模式下，Google
认证来自所选节点上已登录的 Chrome 配置文件，而不是来自
OpenClaw 配置。

以下环境变量可作为回退项：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

通过 `spaces.get` 解析 Meet URL、代码或 `spaces/{id}`：

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

在媒体工作之前运行预检：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

创建一个新的 Meet 空间：

```bash
openclaw googlemeet create
```

该命令会打印新的 `meeting uri`、来源和加入会话。使用 OAuth
凭据时，它会使用官方 Google Meet API。没有 OAuth 凭据时，它会
使用固定的 Chrome 节点上已登录的浏览器配置文件作为回退。代理可以
使用带有 `action: "create"` 的 `google_meet` 工具来一步完成创建并加入。对于仅 URL 创建，
传入 `"join": false`。

来自浏览器回退的示例 JSON 输出：

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

来自 API 创建的示例 JSON 输出：

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

创建 Meet 默认会自动加入。Chrome 或 Chrome-node 传输仍然
需要已登录的 Google Chrome 配置文件才能通过浏览器加入。如果该
配置文件已退出登录，OpenClaw 会报告 `manualActionRequired: true` 或浏览器回退错误，并要求操作员在重试前完成 Google 登录。

只有在确认你的 Cloud
项目、OAuth 主体以及会议参与者已加入 Google
Workspace Developer Preview Program 用于 Meet 媒体 API 之后，才将 `preview.enrollmentAcknowledged: true` 设为 true。

## 配置

常见的 Chrome 实时路径只需要启用插件、BlackHole、SoX，
以及一个后端实时语音提供方密钥。OpenAI 是默认值；设置
`realtime.provider: "google"` 可使用 Google Gemini Live：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 或
export GEMINI_API_KEY=...
```

在 `plugins.entries.google-meet.config` 下设置插件配置：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

默认值：

- `defaultTransport: "chrome"`
- `defaultMode: "realtime"`
- `chromeNode.node`: `chrome-node` 使用的可选节点 id/名称/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：用于未登录 Meet 访客
  页面上的名称
- `chrome.autoJoin: true`：在 `chrome-node` 上通过 OpenClaw 浏览器自动化尽力填写访客名称并点击“立即加入”
  （Join Now）
- `chrome.reuseExistingTab: true`：激活已有的 Meet 标签页，而不是
  打开重复标签页
- `chrome.waitForInCallMs: 20000`：在触发实时简介之前，等待 Meet 标签页报告已在通话中
- `chrome.audioInputCommand`：SoX `rec` 命令，将 8 kHz G.711 mu-law
  音频写入 stdout
- `chrome.audioOutputCommand`：SoX `play` 命令，从 stdin 读取 8 kHz G.711 mu-law
  音频
- `realtime.provider: "openai"`
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：简短的口头回复，并使用
  `openclaw_agent_consult` 获取更深入的答案
- `realtime.introMessage`：实时桥接
  连接时的简短口头就绪检查；将其设为 `""` 可静默加入

可选覆盖项：

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  chrome: {
    browserProfile: "Default",
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
  },
  chromeNode: {
    node: "parallels-macos",
  },
  realtime: {
    provider: "google",
    toolPolicy: "owner",
    introMessage: "请原样说：我在这里。",
    providers: {
      google: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Kore",
      },
    },
  },
}
```

仅 Twilio 配置：

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` 默认值为 `true`；在 Twilio 传输下，它会将
实际的 PSTN 呼叫和 DTMF 委托给 Voice Call 插件。如果未启用 `voice-call`，
Google Meet 仍然可以验证并记录拨号计划，但无法
发起 Twilio 呼叫。

## 工具

代理可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

当 Chrome 运行在 Gateway 主机上时使用 `transport: "chrome"`。当 Chrome 运行在配对节点上时使用
`transport: "chrome-node"`，例如 Parallels
虚拟机。在这两种情况下，实时模型和 `openclaw_agent_consult` 都运行在
Gateway 主机上，因此模型凭据会保留在那里。

使用 `action: "status"` 列出活动会话或检查会话 ID。使用
带有 `sessionId` 和 `message` 的 `action: "speak"` 让实时代理
立即说话。使用 `action: "test_speech"` 来创建或复用会话、
触发一个已知短语，并在 Chrome 主机能够报告时返回 `inCall` 健康状态。使用 `action: "leave"` 来标记会话结束。

`status` 在可用时包含 Chrome 健康状态：

- `inCall`：Chrome 似乎已进入 Meet 通话中
- `micMuted`：尽力判断的 Meet 麦克风状态
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`：浏览器配置文件在语音工作前需要手动登录、Meet 主持人批准、权限，或浏览器控制修复
- `providerConnected` / `realtimeReady`：实时语音桥状态
- `lastInputAt` / `lastOutputAt`：桥接上次接收或发送的音频时间

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "请原样说：我在这里并且在监听。"
}
```

## 实时代理咨询

Chrome 实时模式针对实时语音循环进行了优化。实时语音提供方会听取会议音频，并通过已配置的音频桥进行发言。当实时模型需要更深入的推理、当前信息或常规 OpenClaw 工具时，它可以调用 `openclaw_agent_consult`。

咨询工具会在后台运行常规 OpenClaw 代理，使用最近的会议转录上下文，并向实时语音会话返回一个简洁的口头回答。然后语音模型可以将该回答重新说回会议中。它使用与 Voice Call 相同的共享实时咨询工具。

`realtime.toolPolicy` 控制咨询运行方式：

- `safe-read-only`：暴露咨询工具，并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和
  `memory_get`。
- `owner`：暴露咨询工具，并让常规代理使用正常的代理工具策略。
- `none`：不向实时语音模型暴露咨询工具。

咨询会话密钥按 Meet 会话作用域隔离，因此在同一场会议中，后续咨询调用可以复用先前的咨询上下文。

要在 Chrome 完全加入通话后强制进行一次口头就绪检查：

```bash
openclaw googlemeet speak meet_... "准确说：我已在此并在监听。"
```

完整的加入并发言冒烟测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "准确说：Google Meet 语音测试完成。"
```

## 实时测试清单

在将会议交给无人值守代理之前，请按以下顺序执行：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "准确说：Google Meet 语音测试完成。"
```

预期的 Chrome-node 状态：

- `googlemeet setup` 全部为绿色。
- 当 Chrome-node 是默认传输方式或已固定某个节点时，`googlemeet setup` 会包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接。
- 所选节点同时声明了 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 选项卡加入通话，并且 `test-speech` 返回带有 `inCall: true` 的 Chrome 健康状态。

对于远程 Chrome 主机，例如 Parallels macOS 虚拟机，在更新 Gateway 或虚拟机之后，以下是最短的安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这可以证明 Gateway 插件已加载，虚拟机节点使用当前令牌已连接，并且在代理打开真实会议标签页之前，Meet 音频桥已可用。

对于 Twilio 冒烟测试，请使用一个暴露电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期的 Twilio 状态：

- `googlemeet setup` 包含绿色的 `twilio-voice-call-plugin` 和
  `twilio-voice-call-credentials` 检查项。
- Gateway 重新加载后，CLI 中可用 `voicecall`。
- 返回的会话包含 `transport: "twilio"` 和一个 `twilio.voiceCallId`。
- `googlemeet leave <sessionId>` 会挂断委派的语音通话。

## 故障排查

### 代理无法看到 Google Meet 工具

确认插件已在 Gateway 配置中启用，然后重新加载 Gateway：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果你刚刚编辑了 `plugins.entries.google-meet`，请重启或重新加载 Gateway。
运行中的代理只能看到由当前 Gateway 进程注册的插件工具。

### 没有已连接的 Google Meet 兼容节点

在节点主机上运行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主机上，批准该节点并验证命令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

该节点必须已连接，并列出 `googlemeet.chrome` 以及 `browser.proxy`。
Gateway 配置必须允许这些节点命令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失败并显示 `chrome-node-connected`，或者 Gateway 日志报告
`gateway token mismatch`，请使用当前 Gateway 令牌重新安装或重启节点。对于 LAN Gateway，这通常意味着：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

然后重新加载节点服务并再次运行：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### 浏览器已打开，但代理无法加入

运行 `googlemeet test-speech` 并检查返回的 Chrome 健康状态。如果它报告 `manualActionRequired: true`，请将 `manualActionMessage` 展示给操作者，并在浏览器动作完成之前停止重试。

常见的手动操作包括：

- 登录 Chrome 配置文件。
- 从 Meet 主机账户中允许该来宾。
- 当 Chrome 的原生权限提示出现时，授予 Chrome 麦克风/摄像头权限。
- 关闭或修复卡住的 Meet 权限对话框。

不要仅因为 Meet 显示“Do you want people to hear you in the meeting?”就报告“未登录”。那是 Meet 的音频选择中间页；当可用时，OpenClaw 会通过浏览器自动化点击 **Use microphone**，并继续等待真实的会议状态。对于仅创建的浏览器回退路径，OpenClaw 可能会点击 **Continue without microphone**，因为创建 URL 不需要实时音频路径。

### 会议创建失败

当已配置 OAuth 凭据时，`googlemeet create` 会首先使用 Google Meet API 的 `spaces.create` 端点。
在没有 OAuth 凭据时，它会回退到已固定的 Chrome 节点浏览器。请确认：

- 对于 API 创建：已配置 `oauth.clientId` 和 `oauth.refreshToken`，
  或者存在匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量。
- 对于 API 创建：刷新令牌是在添加创建支持之后签发的。
  旧令牌可能缺少 `meetings.space.created` 作用域；请重新运行
  `openclaw googlemeet auth login --json` 并更新插件配置。
- 对于浏览器回退：`defaultTransport: "chrome-node"` 且 `chromeNode.node`
  指向一个已连接、拥有 `browser.proxy` 和 `googlemeet.chrome` 的节点。
- 对于浏览器回退：该节点上的 OpenClaw Chrome 配置文件已登录
  Google，并且可以打开 `https://meet.google.com/new`。
- 对于浏览器回退：重试会在打开新标签页之前复用现有的
  `https://meet.google.com/new` 或 Google 账户提示标签页。
  如果代理超时，请重试该工具调用，而不是手动再打开另一个 Meet 标签页。
- 对于浏览器回退：如果 Meet 显示“Do you want people to hear you in the
  meeting?”，请保持该标签页打开。当可用时，OpenClaw 应通过浏览器自动化点击
  **Use microphone**，或者在仅创建的回退路径中点击 **Continue without microphone**，
  并继续等待生成的 Meet URL。若无法完成，错误信息应提及
  `meet-audio-choice-required`，而不是 `google-login-required`。

### 代理加入了，但没有说话

检查实时路径：

```bash
openclaw googlemeet setup
openclaw googlemeet status
```

使用 `mode: "realtime"` 进行监听/回话。`mode: "transcribe"` 故意不会启动双工实时语音桥。

同时验证：

- Gateway 主机上可用实时提供方密钥，例如
  `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- Chrome 主机上可见 `BlackHole 2ch`。
- Chrome 主机上存在 `rec` 和 `play`。
- Meet 麦克风和扬声器通过 OpenClaw 使用的虚拟音频路径进行路由。

### Twilio 设置检查失败

当 `voice-call` 未被允许或未启用时，`twilio-voice-call-plugin` 会失败。
将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`，并重新加载 Gateway。

当 Twilio 后端缺少账户 SID、认证令牌或来电号码时，`twilio-voice-call-credentials` 会失败。在 Gateway 主机上设置这些内容：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

然后重启或重新加载 Gateway，并运行：

```bash
openclaw googlemeet setup
```

### Twilio 通话已开始，但从未进入会议

确认 Meet 事件暴露了电话拨入详情。传入准确的拨入号码和 PIN，或者自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果提供方需要在输入 PIN 前暂停，请在 `--dtmf-sequence` 中使用前导 `w` 或逗号。

## 说明

Google Meet 的官方媒体 API 是面向接收的，因此向 Meet 通话中发言仍然需要一个参与者路径。这个插件保持了该边界的可见性：Chrome 处理浏览器参与和本地音频路由；Twilio 处理电话拨入参与。

Chrome 实时模式需要以下之一：

- `chrome.audioInputCommand` 以及 `chrome.audioOutputCommand`：OpenClaw 负责实时模型桥接，并在这些命令与所选实时语音提供方之间传输 8 kHz G.711 mu-law 音频。
- `chrome.audioBridgeCommand`：外部桥接命令负责整个本地音频路径，并且必须在启动或验证其守护进程后退出。

为了实现干净的双工音频，请将 Meet 输出和 Meet 麦克风路由到独立的虚拟设备，或路由到类似 Loopback 的虚拟设备图。单一共享的 BlackHole 设备可能会把其他参与者的声音回传到通话中。

`googlemeet speak` 会触发 Chrome 会话的活动实时音频桥。`googlemeet leave` 会停止该桥。对于通过 Voice Call 插件委派的 Twilio 会话，`leave` 也会挂断底层语音通话。

## 相关内容

- [Voice call plugin](/plugins/voice-call)
- [Talk mode](/nodes/talk)
- [Building plugins](/plugins/building-plugins)
