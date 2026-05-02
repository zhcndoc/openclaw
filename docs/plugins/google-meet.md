---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入明确的 Meet URL，并使用实时语音默认模式"
read_when:
  - 你希望 OpenClaw 代理加入 Google Meet 通话时
  - 你希望 OpenClaw 代理创建一个新的 Google Meet 通话时
  - 你正在将 Chrome、Chrome 节点或 Twilio 配置为 Google Meet 传输方式时
title: "Google Meet 插件"
---

OpenClaw 的 Google Meet 参与者支持——该插件的设计是显式的：

- 它只加入明确的 `https://meet.google.com/...` URL。
- 它可以通过 Google Meet API 创建一个新的 Meet 空间，然后加入返回的 URL。
- `realtime` 语音是默认模式。
- 当需要更深层的推理或工具时，实时语音可以回调到完整的 OpenClaw 代理。
- 代理通过 `mode` 选择加入行为：使用 `realtime` 进行实时听/说回传，或使用 `transcribe` 在不通过实时语音桥接的情况下加入/控制浏览器。
- 身份验证从个人 Google OAuth 或已登录的 Chrome 配置文件开始。
- 没有自动的同意提示播报。
- 默认的 Chrome 音频后端是 `BlackHole 2ch`。
- Chrome 可以在本地运行，也可以在配对的节点主机上运行。
- Twilio 接受拨入号码以及可选的 PIN 或 DTMF 序列。
- CLI 命令是 `googlemeet`；`meet` 保留给更广泛的代理电话会议工作流。

## 快速开始

安装本地音频依赖并配置一个后端实时语音提供商。OpenAI 是默认选项；Google Gemini Live 也可与 `realtime.provider: "google"` 一起使用：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 或者
export GEMINI_API_KEY=...
```

`blackhole-2ch` 会安装 `BlackHole 2ch` 虚拟音频设备。Homebrew 的安装程序要求在 macOS 显示该设备之前重启：

```bash
sudo reboot
```

重启后，验证两部分都已就绪：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
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

设置输出旨在便于代理读取，并且与模式相关。它会报告 Chrome
配置文件、节点绑定，以及对于实时 Chrome 加入时的 BlackHole/SoX 音频
桥接和延迟的实时介绍检查。对于仅观察加入，请使用
`--mode transcribe` 检查相同传输；该模式会跳过实时音频前提条件，
因为它不会通过桥接监听或发言：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

当配置了 Twilio 委派时，设置也会报告 `voice-call` 插件、Twilio 凭据和公共 webhook 暴露是否已准备就绪。将任何 `ok: false` 检查视为该传输和模式的阻塞条件，然后再让代理加入。脚本或机器可读输出请使用 `openclaw googlemeet setup --json`。在代理尝试加入之前，可使用 `--transport chrome`、`--transport chrome-node` 或 `--transport twilio` 预检特定传输。

对于 Twilio，当默认传输是 Chrome 时，始终显式预检该传输：

```bash
openclaw googlemeet setup --transport twilio
```

这样可以在代理尝试拨入会议之前，捕获缺失的 `voice-call` 连接、Twilio 凭据或不可达的 webhook 暴露。

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

创建一个新会议并加入：

```bash
openclaw googlemeet create --transport chrome-node --mode realtime
```

仅创建 URL 而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有两条路径：

- API 创建：在已配置 Google Meet OAuth 凭据时使用。这是最可预测的路径，并且不依赖浏览器 UI 状态。
- 浏览器回退：在缺少 OAuth 凭据时使用。OpenClaw 会使用固定的 Chrome 节点，打开 `https://meet.google.com/new`，等待 Google 重定向到真实的会议代码 URL，然后返回该 URL。此路径要求节点上的 OpenClaw Chrome 配置文件已经登录 Google。浏览器自动化会处理 Meet 自己首次运行时的麦克风提示；该提示不被视为 Google 登录失败。
  加入和创建流程也会尝试在打开新标签页之前复用现有的 Meet 标签页。匹配会忽略无害的 URL 查询字符串，例如 `authuser`，因此代理重试时应聚焦已打开的会议，而不是创建第二个 Chrome 标签页。

命令/工具输出包含一个 `source` 字段（`api` 或 `browser`），以便代理说明使用了哪条路径。`create` 默认会加入新会议，并返回 `joined: true` 以及加入会话。若只想生成 URL，请在 CLI 上使用 `create --no-join`，或向工具传入 `"join": false`。

或者告诉代理：“创建一个 Google Meet，用实时语音加入，并把链接发给我。” 代理应调用带有 `action: "create"` 的 `google_meet`，然后共享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

对于仅观察/浏览器控制加入，请设置 `"mode": "transcribe"`。这不会启动双工实时模型桥接，不需要 BlackHole 或 SoX，并且不会在会议中回话。Chrome 以此模式加入时也会避开 OpenClaw 的麦克风/摄像头权限授予，以及 Meet 的 **Use microphone** 流程。如果 Meet 显示音频选择中间页，自动化会尝试无麦克风路径，否则会报告人工操作，而不是打开本地麦克风。在 transcribe 模式下，受管的 Chrome 传输还会尽力安装 Meet 字幕观察器。`googlemeet status --json` 和 `googlemeet doctor` 会暴露 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 和一个简短的 `recentTranscript` 末尾内容，以便操作员判断浏览器是否已加入通话，以及 Meet 字幕是否正在生成文本。

在实时会话期间，`google_meet` 状态会包含浏览器和音频桥健康信息，例如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最后输入/输出时间戳、字节计数器以及桥接关闭状态。如果出现安全的 Meet 页面提示，浏览器自动化会在可处理时予以处理。登录、主持人接纳以及浏览器/操作系统权限提示会以人工操作的形式报告，并附带原因和消息，供代理转述。受管的 Chrome 会话只有在浏览器健康状态报告 `inCall: true` 后才会输出介绍语或测试短语；否则状态会报告 `speechReady: false`，并且语音尝试会被阻止，而不是假装代理已经在会议中发言。

本地 Chrome 加入通过已登录的 OpenClaw 浏览器配置文件进行。实时模式需要 `BlackHole 2ch` 作为 OpenClaw 使用的麦克风/扬声器路径。要获得干净的双工音频，请使用分离的虚拟设备或类似 Loopback 的图形；单个 BlackHole 设备足以用于首次冒烟测试，但可能会回声。

### 本地网关 + Parallels Chrome

你**不需要**在 macOS 虚拟机内拥有完整的 OpenClaw Gateway 或模型 API 密钥，只是为了让该虚拟机拥有 Chrome。先在本地运行 Gateway 和代理，然后在虚拟机中运行节点主机。只需在虚拟机中启用捆绑插件一次，这样节点就会公布 Chrome 命令：

运行位置说明：

- Gateway 主机：OpenClaw Gateway、代理工作区、模型/API 密钥、实时提供商，以及 Google Meet 插件配置。
- Parallels macOS 虚拟机：OpenClaw CLI/节点主机、Google Chrome、SoX、BlackHole 2ch，以及已登录 Google 的 Chrome 配置文件。
- 虚拟机中不需要：Gateway 服务、代理配置、OpenAI/GPT 密钥或模型提供商设置。

安装虚拟机依赖：

```bash
brew install blackhole-2ch sox
```

安装 BlackHole 后重启虚拟机，以便 macOS 显示 `BlackHole 2ch`：

```bash
sudo reboot
```

重启后，验证虚拟机可以看到音频设备和 SoX 命令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在虚拟机中安装或更新 OpenClaw，然后在那里启用捆绑插件：

```bash
openclaw plugins enable google-meet
```

在虚拟机中启动节点主机：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是局域网 IP 且你未使用 TLS，那么除非你为该受信任的私有网络显式允许，否则节点会拒绝明文 WebSocket：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在将节点作为 LaunchAgent 安装时也使用同样的环境变量：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是进程环境变量，不是 `openclaw.json` 设置。`openclaw node install` 会在安装命令中存在该变量时把它存入 LaunchAgent 环境。

在 Gateway 主机上批准该节点：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

确认 Gateway 看到了该节点，并且它同时公布了 `googlemeet.chrome` 和浏览器能力/`browser.proxy`：

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
            guestName: "OpenClaw Agent",
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

或者让代理使用带有 `transport: "chrome-node"` 的 `google_meet` 工具。

要进行一次单命令冒烟测试，创建或复用一个会话、说出一个已知短语并打印会话健康状态：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在实时加入期间，OpenClaw 浏览器自动化会填写访客姓名，点击 Join/Ask to join，并在该提示出现时接受 Meet 首次运行的 "Use microphone" 选项。在仅观察加入或仅浏览器的会议创建期间，它会在该提示之后继续前进，并在可用时不使用麦克风。如果浏览器配置文件未登录、Meet 正在等待主持人接纳、Chrome 在实时加入时需要麦克风/摄像头权限，或者 Meet 卡在自动化无法解决的提示上，加入/test-speech 结果会报告 `manualActionRequired: true`，并附带 `manualActionReason` 和 `manualActionMessage`。代理应停止重试加入，报告该精确消息以及当前的 `browserUrl`/`browserTitle`，并且仅在手动浏览器操作完成后再重试。

如果省略了 `chromeNode.node`，只有在恰好一个已连接节点同时公布 `googlemeet.chrome` 和浏览器控制时，OpenClaw 才会自动选择。如果连接了多个可用节点，请将 `chromeNode.node` 设为节点 id、显示名称或远程 IP。

常见故障检查：

- `Configured Google Meet node ... is not usable: offline`：固定节点已被 Gateway 识别，但不可用。代理应将该节点视为诊断状态，而不是可用的 Chrome 主机，并报告设置阻塞，而不是在用户未要求的情况下回退到其他传输方式。
- `No connected Google Meet-capable node`：在虚拟机中启动 `openclaw node run`，批准配对，并确保在虚拟机中运行了 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser`。同时确认 Gateway 主机允许这两个节点命令，使用 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]`。
- `BlackHole 2ch audio device not found`：在被检查的主机上安装 `blackhole-2ch`，并在使用本地 Chrome 音频前重启。
- `BlackHole 2ch audio device not found on the node`：在虚拟机中安装 `blackhole-2ch` 并重启虚拟机。
- Chrome 打开了但无法加入：在虚拟机内登录浏览器配置文件，或者保持 `chrome.guestName` 用于访客加入。访客自动加入通过节点浏览器代理使用 OpenClaw 浏览器自动化；确保节点浏览器配置指向你想使用的配置文件，例如 `browser.defaultProfile: "user"` 或一个命名的现有会话配置文件。
- 重复的 Meet 标签页：保持 `chrome.reuseExistingTab: true` 启用。OpenClaw 会在打开新标签页之前激活同一 Meet URL 的现有标签页，而浏览器会议创建也会在打开另一个标签页前复用一个正在进行中的 `https://meet.google.com/new` 或 Google 账号提示标签页。
- 没有音频：在 Meet 中，将麦克风/扬声器路由通过 OpenClaw 使用的虚拟音频设备路径；对于干净的双工音频，请使用分离的虚拟设备或 Loopback 风格的路由。

## 安装说明

Chrome 实时默认方案使用两个外部工具：

- `sox`：命令行音频工具。该插件使用明确的 CoreAudio
  设备命令，为默认的 24 kHz PCM16 音频桥提供支持。
- `blackhole-2ch`：macOS 虚拟音频驱动。它会创建 `BlackHole 2ch`
  音频设备，供 Chrome/Meet 路由音频使用。

OpenClaw 不捆绑也不转售这两个包。文档要求用户通过 Homebrew
将它们作为宿主依赖安装。SoX 的许可证是
`LGPL-2.0-only AND GPL-2.0-only`；BlackHole 的许可证是 GPL-3.0。若你构建的安装程序或设备将 BlackHole 与 OpenClaw 一起打包，请查阅 BlackHole 的上游许可条款，或从 Existential Audio 获取单独许可。

## 传输方式

### Chrome

Chrome 传输会通过 OpenClaw 浏览器控制打开 Meet URL，并以已登录的 OpenClaw 浏览器配置文件身份加入会议。在 macOS 上，该插件会在启动前检查是否存在 `BlackHole 2ch`。如果已配置，它还会在打开 Chrome 前运行音频桥健康检查命令和启动命令。当 Chrome/音频运行在 Gateway 主机上时使用 `chrome`；当 Chrome/音频运行在配对节点上时（例如 Parallels macOS VM）使用 `chrome-node`。对于本地 Chrome，使用 `browser.defaultProfile` 选择配置文件；`chrome.browserProfile` 会传递给 `chrome-node` 主机。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

将 Chrome 的麦克风和扬声器音频通过本地 OpenClaw 音频桥路由。如果未安装 `BlackHole 2ch`，加入会失败并返回设置错误，而不会静默地在没有音频路径的情况下加入。

### Twilio

Twilio 传输是一个由 Voice Call 插件托管的严格拨号计划。它不会解析 Meet 页面中的电话号码。

当无法使用 Chrome 参会，或者你希望通过电话拨入作为备用方案时，请使用此方式。Google Meet 必须为该会议公开电话拨入号码和 PIN；OpenClaw 不会从 Meet 页面中自动发现这些信息。

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
          // 或者设置为 "twilio" 作为默认值
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

通过环境变量或配置提供 Twilio 凭据。使用环境变量可以避免将密钥写入 `openclaw.json`：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

启用 `voice-call` 后请重启或重新加载 Gateway；插件配置变更不会在已运行的 Gateway 进程中立即生效，直到它重新加载为止。

然后验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当 Twilio 委派已连接时，`googlemeet setup` 会包含成功的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。

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

创建 Meet 链接时，OAuth 不是必需的，因为 `googlemeet create` 可以回退到浏览器自动化。若你希望使用官方 API 创建、空间解析或 Meet Media API 预检检查，则配置 OAuth。

Google Meet API 访问使用用户 OAuth：创建 Google Cloud OAuth 客户端，申请所需作用域，授权一个 Google 账号，然后将生成的刷新令牌存储在 Google Meet 插件配置中，或者提供 `OPENCLAW_GOOGLE_MEET_*` 环境变量。

OAuth 并不会替代 Chrome 加入路径。当你使用浏览器参会时，Chrome 和 Chrome-node 传输仍会通过已登录的 Chrome 配置文件、BlackHole/SoX 以及连接的节点加入。OAuth 仅用于官方 Google Meet API 路径：创建会议空间、解析空间以及运行 Meet Media API 预检检查。

### 创建 Google 凭据

在 Google Cloud Console 中：

1. 创建或选择一个 Google Cloud 项目。
2. 为该项目启用 **Google Meet REST API**。
3. 配置 OAuth 同意屏幕。
   - 对 Google Workspace 组织而言，**Internal** 最简单。
   - **External** 适用于个人/测试环境；在应用处于 Testing 期间，将每个会授权该应用的 Google 账号添加为测试用户。
4. 添加 OpenClaw 请求的作用域：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 创建一个 OAuth 客户端 ID。
   - 应用类型：**Web application**。
   - 授权重定向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 复制客户端 ID 和客户端密钥。

`meetings.space.created` 是 Google Meet `spaces.create` 所必需的。
`meetings.space.readonly` 允许 OpenClaw 将 Meet URL/代码解析为 spaces。
`meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体相关工作；Google 在实际使用 Media API 时可能要求加入 Developer Preview 项目。
如果你只需要基于浏览器的 Chrome 加入，可以完全跳过 OAuth。

### 获取刷新令牌

配置 `oauth.clientId`，并可选地配置 `oauth.clientSecret`，或者将它们作为环境变量传入，然后运行：

```bash
openclaw googlemeet auth login --json
```

该命令会输出一个包含刷新令牌的 `oauth` 配置块。它使用 PKCE、`http://localhost:8085/oauth2callback` 的本地回调，以及 `--manual` 的手动复制/粘贴流程。

示例：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

当浏览器无法访问本地回调时，使用手动模式：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 输出包含：

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

将 `oauth` 对象存储到 Google Meet 插件配置下：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

当你不希望将刷新令牌写入配置时，优先使用环境变量。
如果配置和值两者都存在，插件会先解析配置，然后再使用环境变量作为回退。

OAuth 同意包含 Meet 空间创建、Meet 空间读取以及 Meet 会议媒体读取权限。如果你是在支持会议创建之前完成授权的，请重新运行 `openclaw googlemeet auth login --json`，以使刷新令牌具备 `meetings.space.created` 作用域。

### 使用 doctor 验证 OAuth

当你需要快速、非敏感的健康检查时，运行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

这不会加载 Chrome 运行时，也不需要连接的 Chrome 节点。它会检查 OAuth 配置是否存在，以及刷新令牌是否可以生成访问令牌。JSON 报告仅包含诸如 `ok`、`configured`、`tokenSource`、`expiresAt` 和检查消息等状态字段；不会打印访问令牌、刷新令牌或客户端密钥。

常见结果：

| 检查                 | 含义                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加 `oauth.refreshToken`，或存在缓存的访问令牌。                      |
| `oauth-token`        | 缓存的访问令牌仍然有效，或刷新令牌已生成新的访问令牌。                                      |
| `meet-spaces-get`    | 可选的 `--meeting` 检查已解析一个现有 Meet 空间。                                           |
| `meet-spaces-create` | 可选的 `--create-space` 检查已创建一个新的 Meet 空间。                                      |

要同时证明 Google Meet API 已启用以及 `spaces.create` 作用域可用，请运行会产生副作用的创建检查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 会创建一个一次性的 Meet URL。当你需要确认 Google Cloud 项目已启用 Meet API，并且已授权的账号具备 `meetings.space.created` 作用域时，可使用此项。

要证明对现有会议空间的读取权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 可证明已授权的 Google 账号对现有空间拥有读取权限。这些检查返回 `403`，通常意味着 Google Meet REST API 被禁用、已同意的刷新令牌缺少所需作用域，或者该 Google 账号无法访问该 Meet 空间。刷新令牌错误则表示需要重新运行 `openclaw googlemeet auth login --json` 并保存新的 `oauth` 块。

浏览器回退模式不需要 OAuth 凭据。在该模式下，Google 认证来自所选节点上已登录的 Chrome 配置文件，而不是来自 OpenClaw 配置。

接受以下环境变量作为回退：

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

在 Meet 创建会议记录后，列出会议工件和出席情况：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting` 时，`artifacts` 和 `attendance` 默认使用最新的会议记录。当你希望获取该会议保留的每一条记录时，传入 `--all-conference-records`。

在读取 Meet 工件之前，日历查询可以先从 Google Calendar 解析会议 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 会在今天的 `primary` 日历中搜索带有 Google Meet 链接的日历事件。使用 `--event <query>` 搜索匹配的事件文本，使用 `--calendar <id>` 指定非主日历。日历查询需要一次包含 Calendar events readonly 作用域的最新 OAuth 登录。
`calendar-events` 会预览匹配的 Meet 事件，并标记 `latest`、`artifacts`、`attendance` 或 `export` 将会选择的事件。

如果你已经知道会议记录 ID，可以直接指定：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

生成可读报告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

`artifacts` 会返回会议记录元数据，以及参与者、录制、转录、结构化转录条目和智能笔记资源元数据（如果 Google 对该会议提供了这些内容）。对于大型会议，使用 `--no-transcript-entries` 可跳过条目查询。`attendance` 会将参与者展开为 participant-session 行，包含首次/最后出现时间、总会话时长、迟到/早退标记，以及按已登录用户或显示名称合并的重复参与者资源。传入 `--no-merge-duplicates` 可保留原始参与者资源，传入 `--late-after-minutes` 可调整迟到检测，传入 `--early-before-minutes` 可调整早退检测。

`export` 会写入一个文件夹，内含 `summary.md`、`attendance.csv`、`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json`。
`manifest.json` 会记录所选输入、导出选项、会议记录、输出文件、计数、令牌来源、所用的 Calendar 事件（如果有），以及任何部分获取警告。传入 `--zip` 还会在文件夹旁边生成一个便携式压缩包。传入 `--include-doc-bodies` 会通过 Google Drive `files.export` 导出关联的转录和智能笔记 Google Docs 文本；这需要一次包含 Drive Meet readonly 作用域的最新 OAuth 登录。不使用 `--include-doc-bodies` 时，导出仅包含 Meet 元数据和结构化转录条目。如果 Google 返回部分工件失败，例如智能笔记列表、转录条目或 Drive 文档正文错误，摘要和清单会保留警告，而不会导致整个导出失败。
使用 `--dry-run` 可获取相同的工件/出席数据并打印清单 JSON，而不创建文件夹或 ZIP。这在你需要在写出大型导出之前检查，或者代理只需要计数、所选记录和警告时非常有用。

代理也可以通过 `google_meet` 工具创建相同的捆绑包：

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

设置 `"dryRun": true` 可仅返回导出清单并跳过文件写入。

在真实保留的会议上运行受保护的 live smoke：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

live smoke 环境：

- `OPENCLAW_LIVE_TEST=1` 启用受保护的 live 测试。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向一个保留的 Meet URL、代码或
  `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID` 提供 OAuth
  客户端 ID。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供
  刷新令牌。
- 可选：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 以及
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用与 `OPENCLAW_` 前缀相同的回退名称。

基础的工件/出席 live smoke 需要
`https://www.googleapis.com/auth/meetings.space.readonly` 和
`https://www.googleapis.com/auth/meetings.conference.media.readonly`。日历
查询需要 `https://www.googleapis.com/auth/calendar.events.readonly`。Drive
文档正文导出需要
`https://www.googleapis.com/auth/drive.meet.readonly`。

创建一个新的 Meet 空间：

```bash
openclaw googlemeet create
```

该命令会输出新的 `meeting uri`、来源和加入会话。使用 OAuth 凭据时，它会使用官方 Google Meet API。没有 OAuth 凭据时，它会回退到已固定的 Chrome 节点中已登录的浏览器配置文件。代理可以使用 `google_meet` 工具并设置 `action: "create"` 来一步完成创建和加入。若只需创建 URL，不加入，请传入 `"join": false`。

浏览器回退的 JSON 输出示例：

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

如果浏览器回退在创建 URL 之前遇到 Google 登录或 Meet 权限阻塞，Gateway 方法会返回失败响应，而 `google_meet` 工具会返回结构化详情，而不是简单字符串：

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

当代理看到 `manualActionRequired: true` 时，应报告 `manualActionMessage` 以及浏览器节点/标签页上下文，并在操作员完成浏览器步骤之前停止打开新的 Meet 标签页。

API 创建的 JSON 输出示例：

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

创建 Meet 时默认会加入会议。Chrome 或 Chrome-node 传输仍然需要已登录的 Google Chrome 配置文件才能通过浏览器加入。如果配置文件已退出登录，OpenClaw 会报告 `manualActionRequired: true` 或浏览器回退错误，并要求操作员先完成 Google 登录后再重试。

只有在确认你的 Cloud 项目、OAuth 主体以及会议参与者已加入 Google Workspace Developer Preview Program 的 Meet media APIs 后，才将 `preview.enrollmentAcknowledged: true` 设为 true。

## 配置

常见的 Chrome 实时路径只需要启用插件、BlackHole、SoX，以及一个后端实时语音提供方密钥。OpenAI 是默认值；将 `realtime.provider: "google"` 设置为使用 Google Gemini Live：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 或者
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
- `chromeNode.node`: `chrome-node` 的可选节点 id/名称/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`: 在未登录的 Meet 来宾屏幕上使用的名称
- `chrome.autoJoin: true`: 尽力通过 OpenClaw 的浏览器自动化在 `chrome-node` 上填充来宾名称并点击 Join Now
- `chrome.reuseExistingTab: true`: 激活现有的 Meet 标签页，而不是打开重复标签页
- `chrome.waitForInCallMs: 20000`: 在触发实时引导语之前，等待 Meet 标签页报告已在通话中
- `chrome.audioFormat: "pcm16-24khz"`: 命令对音频格式。仅对仍然输出电话音频的旧版/自定义命令对使用 `"g711-ulaw-8khz"`。
- `chrome.audioInputCommand`: 从 CoreAudio `BlackHole 2ch` 读取并以 `chrome.audioFormat` 写出音频的 SoX 命令
- `chrome.audioOutputCommand`: 以 `chrome.audioFormat` 读取音频并写入 CoreAudio `BlackHole 2ch` 的 SoX 命令
- `chrome.bargeInInputCommand`: 可选的本地麦克风命令，在助手播放激活时写出有符号 16 位小端单声道 PCM，用于检测人类插话。此项当前适用于 Gateway 托管的 `chrome` 命令对桥接。
- `chrome.bargeInRmsThreshold: 650`: 在 `chrome.bargeInInputCommand` 上被视为人类打断的 RMS 阈值
- `chrome.bargeInPeakThreshold: 2500`: 在 `chrome.bargeInInputCommand` 上被视为人类打断的峰值阈值
- `chrome.bargeInCooldownMs: 900`: 连续人类打断清除之间的最小延迟
- `realtime.provider: "openai"`
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：简短的口头回复，并在需要更深入答案时使用 `openclaw_agent_consult`
- `realtime.introMessage`：实时桥接连接时的简短口头就绪检查；将其设为 `""` 可静默加入
- `realtime.agentId`：用于 `openclaw_agent_consult` 的可选 OpenClaw agent id；默认值为 `main`

可选覆盖项：

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
    bargeInInputCommand: [
      "sox",
      "-q",
      "-t",
      "coreaudio",
      "External Microphone",
      "-r",
      "24000",
      "-c",
      "1",
      "-b",
      "16",
      "-e",
      "signed-integer",
      "-t",
      "raw",
      "-",
    ],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  realtime: {
    provider: "google",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "请准确说：I'm here.",
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

`voiceCall.enabled` 默认为 `true`；在使用 Twilio 传输时，它会将实际的 PSTN 呼叫、DTMF 以及引导问候语委托给 Voice Call 插件。Voice Call 会在打开实时媒体流之前播放 DTMF 序列，然后使用已保存的引导文本作为初始实时问候语。如果未启用 `voice-call`，Google Meet 仍然可以验证并记录拨号计划，但无法发起 Twilio 呼叫。

## 工具

Agent 可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

当 Chrome 运行在 Gateway 主机上时，使用 `transport: "chrome"`。当 Chrome 运行在配对节点上，例如 Parallels 虚拟机时，使用 `transport: "chrome-node"`。在这两种情况下，实时模型和 `openclaw_agent_consult` 都运行在 Gateway 主机上，因此模型凭据保留在那里。

使用 `action: "status"` 来列出活动会话或检查某个会话 ID。使用带有 `sessionId` 和 `message` 的 `action: "speak"` 让实时 agent 立即发言。使用 `action: "test_speech"` 来创建或复用会话、触发一个已知短语，并在 Chrome 主机能够报告时返回 `inCall` 健康状态。`test_speech` 总是强制使用 `mode: "realtime"`，如果要求在 `mode: "transcribe"` 中运行则会失败，因为仅观察模式的会话本意上不能发言。其 `speechOutputVerified` 结果基于本次测试通话期间实时音频输出字节是否增加，因此复用一个具有较旧音频的会话不算作一次新的成功发言检查。使用 `action: "leave"` 将会话标记为已结束。

`status` 在可用时包含 Chrome 健康状态：

- `inCall`: Chrome 看起来已进入 Meet 通话
- `micMuted`: 尽力判断的 Meet 麦克风状态
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`: 浏览器配置文件需要手动登录、Meet 主持人接纳、权限或浏览器控制修复后，语音才能工作
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage`: 当前是否允许受管 Chrome 语音。`speechReady: false` 表示 OpenClaw 没有将引导/测试短语发送到音频桥。
- `providerConnected` / `realtimeReady`: 实时语音桥接状态
- `lastInputAt` / `lastOutputAt`: 最近从桥接接收或发送的音频时间
- `lastSuppressedInputAt` / `suppressedInputBytes`: 助手播放激活时被忽略的回环输入

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "请准确说：I'm here and listening."
}
```

## 实时 agent 咨询

Chrome 实时模式针对实时语音循环进行了优化。实时语音提供方会收听会议音频，并通过配置的音频桥发言。当实时模型需要更深入的推理、当前信息或普通 OpenClaw 工具时，它可以调用 `openclaw_agent_consult`。

咨询工具会在后台运行常规 OpenClaw agent，带上最近的会议转录上下文，并将一个简洁的口头答案返回给实时语音会话。随后语音模型可以将该答案再次说回会议中。它使用与 Voice Call 相同的共享实时咨询工具。

默认情况下，咨询会针对 `main` agent 运行。当某个 Meet 通道应咨询专用的 OpenClaw agent 工作区、模型默认值、工具策略、记忆和会话历史时，设置 `realtime.agentId`。

`realtime.toolPolicy` 控制咨询运行：

- `safe-read-only`：暴露咨询工具，并将常规 agent 限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。
- `owner`：暴露咨询工具，并允许常规 agent 使用正常的 agent 工具策略。
- `none`：不向实时语音模型暴露咨询工具。

咨询会话 key 按 Meet 会话进行作用域隔离，因此后续的咨询调用可以在同一会议期间复用先前的咨询上下文。

要在 Chrome 完整加入通话后强制进行一次口头就绪检查：

```bash
openclaw googlemeet speak meet_... "请准确说：I'm here and listening."
```

完整的加入并发言冒烟测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "请准确说：I'm here and listening."
```

## 实地测试清单

在把会议交给无人值守 agent 之前，使用以下顺序：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "请准确说：Google Meet speech test complete."
```

预期的 Chrome-node 状态：

- `googlemeet setup` 全部为绿色。
- 当 Chrome-node 是默认传输或节点被固定时，`googlemeet setup` 包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接。
- 所选节点同时声明 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 标签页加入通话，并且 `test-speech` 返回的 Chrome 健康状态包含 `inCall: true`。

对于诸如 Parallels macOS 虚拟机之类的远程 Chrome 主机，在更新 Gateway 或虚拟机后，这是最短的安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明 Gateway 插件已加载、虚拟机节点已使用当前 token 连接，并且在 agent 打开真实会议标签页之前，Meet 音频桥可用。

对于 Twilio 冒烟测试，使用一个提供电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期的 Twilio 状态：

- `googlemeet setup` 包含绿色的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。
- Gateway 重新加载后，CLI 中可用 `voicecall`。
- 返回的会话包含 `transport: "twilio"` 和一个 `twilio.voiceCallId`。
- `openclaw logs --follow` 显示在实时 TwiML 之前已提供 DTMF TwiML，然后是一个带有已排队初始问候语的实时桥接。
- `googlemeet leave <sessionId>` 会挂断委托的语音呼叫。

## 故障排查

### Agent 无法看到 Google Meet 工具

确认插件已在 Gateway 配置中启用，然后重新加载 Gateway：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果你刚刚编辑了 `plugins.entries.google-meet`，请重启或重新加载 Gateway。
运行中的 agent 只能看到由当前 Gateway 进程注册的插件工具。

### 没有已连接的、支持 Google Meet 的节点

在节点主机上运行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主机上，批准节点并验证命令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

节点必须已连接，并列出 `googlemeet.chrome` 以及 `browser.proxy`。
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

如果 `googlemeet setup` 失败并出现 `chrome-node-connected`，或者 Gateway 日志报告 `gateway token mismatch`，请使用当前 Gateway token 重新安装或重启节点。对于 LAN Gateway，这通常意味着：

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

### 浏览器打开了，但 agent 无法加入

运行 `googlemeet test-speech` 并检查返回的 Chrome 健康状态。如果它报告 `manualActionRequired: true`，请将 `manualActionMessage` 显示给操作员，并在浏览器操作完成之前停止重试。

常见的人工操作：

- 登录 Chrome 配置文件。
- 从 Meet 主持人账户中接纳来宾。
- 当 Chrome 原生权限提示出现时，授予 Chrome 麦克风/摄像头权限。
- 关闭或修复卡住的 Meet 权限对话框。

不要仅仅因为 Meet 显示“Do you want people to hear you in the meeting?” 就报告“未登录”。那是 Meet 的音频选择中间页；OpenClaw 在可用时会通过浏览器自动化点击 **Use microphone**，并继续等待真实的会议状态。对于仅创建的浏览器回退路径，OpenClaw 可能会点击 **Continue without microphone**，因为创建 URL 不需要实时音频路径。

### 创建会议失败

当配置了 OAuth 凭据时，`googlemeet create` 会首先使用 Google Meet API 的 `spaces.create` 端点。没有 OAuth 凭据时，它会回退到固定的 Chrome 节点浏览器。确认：

- 对于 API 创建：已配置 `oauth.clientId` 和 `oauth.refreshToken`，或者存在匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量。
- 对于 API 创建：刷新令牌是在添加创建支持之后签发的。较旧的令牌可能缺少 `meetings.space.created` 作用域；请重新运行 `openclaw googlemeet auth login --json` 并更新插件配置。
- 对于浏览器回退：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向一个已连接的节点，该节点具有 `browser.proxy` 和 `googlemeet.chrome`。
- 对于浏览器回退：该节点上的 OpenClaw Chrome 配置文件已登录 Google，并且可以打开 `https://meet.google.com/new`。
- 对于浏览器回退：重试会在打开新标签页之前复用现有的 `https://meet.google.com/new` 或 Google 账号提示标签页。如果 agent 超时，请重试工具调用，而不是手动打开另一个 Meet 标签页。
- 对于浏览器回退：如果工具返回 `manualActionRequired: true`，请使用返回的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 来指导操作员。在该操作完成之前不要循环重试。
- 对于浏览器回退：如果 Meet 显示“Do you want people to hear you in the meeting?”，请保持标签页打开。OpenClaw 应该通过浏览器自动化点击 **Use microphone**，或者在仅创建回退路径中点击 **Continue without microphone**，并继续等待生成的 Meet URL。如果做不到，错误信息应提到 `meet-audio-choice-required`，而不是 `google-login-required`。

### Agent 加入了但不说话

检查实时路径：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

听说回模式请使用 `mode: "realtime"`。`mode: "transcribe"` 故意不会启动双工实时语音桥接。对于仅观察调试，在参与者发言后运行 `openclaw googlemeet status --json <session-id>`，并检查 `captioning`、`transcriptLines` 和 `lastCaptionText`。如果 `inCall` 为真但 `transcriptLines` 仍为 `0`，可能是 Meet 字幕被禁用、在安装观察器后没人发言、Meet UI 变更，或者该会议语言/账号不可用实时字幕。

`googlemeet test-speech` 始终检查实时路径，并报告本次调用是否观察到了桥接输出字节。如果 `speechOutputVerified` 为 false 且 `speechOutputTimedOut` 为 true，实时提供方可能已经接受了该语句，但 OpenClaw 没有看到新的输出字节到达 Chrome 音频桥。

另外还要验证：

- Gateway 主机上可用实时提供方密钥，例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- Chrome 主机上可见 `BlackHole 2ch`。
- Chrome 主机上存在 `sox`。
- Meet 麦克风和扬声器通过 OpenClaw 使用的虚拟音频路径进行路由。

`googlemeet doctor [session-id]` 会打印会话、节点、通话中状态、手动操作原因、实时提供方连接、`realtimeReady`、音频输入/输出活动、最近音频时间戳、字节计数以及浏览器 URL。需要原始 JSON 时使用 `googlemeet status [session-id] --json`。需要验证 Google Meet OAuth 刷新但不暴露 token 时使用 `googlemeet doctor --oauth`；如果还需要 Google Meet API 证明，则加上 `--meeting` 或 `--create-space`。

如果某个 agent 超时了，而你能看到一个 Meet 标签页已经打开，请检查那个标签页，不要再打开另一个：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

对应的工具动作是 `recover_current_tab`。它会为所选传输方式聚焦并检查一个已存在的 Meet 标签页。对于 `chrome`，它通过 Gateway 使用本地浏览器控制；对于 `chrome-node`，它使用已配置的 Chrome 节点。它不会打开新标签页或创建新会话；它会报告当前阻塞因素，例如登录、接纳、权限或音频选择状态。CLI 命令会与已配置的 Gateway 通信，因此 Gateway 必须正在运行；`chrome-node` 还要求 Chrome 节点已连接。

### Twilio 设置检查失败

当未允许或未启用 `voice-call` 时，`twilio-voice-call-plugin` 会失败。将其加入 `plugins.allow`，启用 `plugins.entries.voice-call`，然后重新加载 Gateway。

当 Twilio 后端缺少 account SID、auth token 或 caller number 时，`twilio-voice-call-credentials` 会失败。在 Gateway 主机上设置这些变量：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

当 `voice-call` 没有公开的 webhook 暴露，或者 `publicUrl` 指向回环或私有网络空间时，`twilio-voice-call-webhook` 会失败。将 `plugins.entries.voice-call.config.publicUrl` 设置为公共提供方 URL，或配置 `voice-call` tunnel/Tailscale 暴露。

回环和私有 URL 不适用于运营商回调。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作 `publicUrl`。

对于稳定的公共 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

对于本地开发，请使用隧道或 Tailscale 暴露，而不是私有主机 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // 或者
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

然后重启或重新加载 Gateway 并运行：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 默认只做就绪检查。要对特定号码进行 dry-run：

```bash
openclaw voicecall smoke --to "+15555550123"
```

只有在你明确要发起一次真实的外呼通知通话时，才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 通话已开始但从未进入会议

确认 Meet 事件暴露了电话拨入详情。传入精确的拨入号码和 PIN，或者自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果提供方在输入 PIN 之前需要暂停，请在 `--dtmf-sequence` 中使用前导 `w` 或逗号。

如果电话呼叫已创建，但 Meet 名册中始终没有出现拨入参与者：

- 运行 `openclaw googlemeet doctor <session-id>` 以确认委托的 Twilio 呼叫 ID、DTMF 是否已排队，以及是否请求了引导问候语。
- 运行 `openclaw voicecall status --call-id <id>` 并确认呼叫仍处于活动状态。
- 运行 `openclaw voicecall tail` 并检查 Twilio webhook 是否到达 Gateway。
- 运行 `openclaw logs --follow` 并查找 Twilio Meet 序列：Google Meet 委托加入，Voice Call 存储预连接 DTMF TwiML，提供该初始 TwiML，然后提供实时 TwiML，并以 `initialGreeting=queued` 启动实时桥接。
- 重新运行 `openclaw googlemeet setup --transport twilio`；绿色的设置检查是必需的，但并不能证明会议 PIN 序列正确。
- 确认拨入号码属于与 PIN 相同的 Meet 邀请和地区。
- 如果 Meet 接听较慢，请增加 `--dtmf-sequence` 中前导暂停，例如 `wwww123456#`。
- 如果参与者加入了但你没有听到问候语，请检查 `openclaw logs --follow` 中的实时 TwiML、实时桥接启动以及 `initialGreeting=queued`。问候语由实时桥接连接后最初的 `voicecall.start` 消息生成。

如果 webhook 没有到达，先调试 Voice Call 插件：提供方必须能够访问 `plugins.entries.voice-call.config.publicUrl` 或配置的隧道。参见 [Voice call troubleshooting](/plugins/voice-call#troubleshooting)。

## Notes

Google Meet 的官方媒体 API 以接收为导向，因此在 Meet 通话中发言仍然需要一个参与者路径。这个插件保持了这一边界的可见性：Chrome 负责浏览器参与和本地音频路由；Twilio 负责电话拨入参与。

Chrome 实时模式需要 `BlackHole 2ch` 以及以下任一项：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 负责实时模型桥接，并在 `chrome.audioFormat` 中在这些命令与所选的实时语音提供商之间传输音频。Chrome 的默认路径是 24 kHz PCM16；8 kHz G.711 mu-law 仍可用于旧版命令对。
- `chrome.audioBridgeCommand`：一个外部桥接命令负责整个本地音频路径，并且必须在启动或验证其守护进程后退出。

为了获得干净的双工音频，请将 Meet 输出和 Meet 麦克风路由到分开的虚拟设备，或者路由到类似 Loopback 的虚拟设备图。单个共享的 BlackHole 设备可能会把其他参与者的声音回传到通话中。

With the command-pair Chrome bridge, `chrome.bargeInInputCommand` can listen to a
separate local microphone and clear assistant playback when the human starts
talking. This keeps human speech ahead of assistant output even when the shared
BlackHole loopback input is temporarily suppressed during assistant playback.
Like `chrome.audioInputCommand` and `chrome.audioOutputCommand`, it is an
operator-configured local command. Use an explicit trusted command path or
argument list, and do not point it at scripts from untrusted locations.

`googlemeet speak` 触发 Chrome 会话的活动实时音频桥接。`googlemeet leave` 停止该桥接。对于通过 Voice Call 插件委托的 Twilio 会话，`leave` 也会挂断底层语音通话。

## 相关

- [语音通话插件](/plugins/voice-call)
- [对话模式](/nodes/talk)
- [构建插件](/plugins/building-plugins)
