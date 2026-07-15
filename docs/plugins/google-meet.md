---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入显式的 Meet URL，并使用默认的 agent 回答模式"
read_when:
  - 你希望 OpenClaw 代理加入一个 Google Meet 通话
  - 你希望 OpenClaw 代理创建一个新的 Google Meet 通话
  - 你正在配置 Chrome、Chrome 节点或 Twilio 作为 Google Meet 传输方式
title: "Google Meet 插件"
---

`google-meet` 插件代表 OpenClaw 代理加入显式的 Meet URL。其设计刻意保持狭窄：

- 它只加入 `https://meet.google.com/...` URL；它绝不会通过自己发现的电话号码拨入会议。
- `googlemeet create` 可以通过 Google Meet API（或浏览器回退方案）生成一个新的 Meet URL，并默认加入该会议。
- Chrome 参与使用已登录的 Chrome 配置文件，且可选在配对节点上运行。Twilio 参与会通过 [Voice call 插件](/plugins/voice-call) 拨打电话号码以及 PIN/DTMF；它不能直接拨打 Meet URL。
- `mode: "agent"`（默认）使用实时提供方转写参与者语音，将其路由到已配置的 OpenClaw 代理，并使用常规 OpenClaw TTS 朗读答案。`mode: "bidi"` 允许实时语音模型直接应答。`mode: "transcribe"` 以仅观察模式加入，不进行回应。
- 插件加入通话时不会自动播报同意声明。
- CLI 命令是 `googlemeet`；`meet` 保留用于更广泛的代理电话会议工作流。

## 快速开始

安装本地音频依赖，然后设置实时提供商密钥。OpenAI 是 `agent` 模式的默认转写提供商；Google Gemini Live 可作为 `bidi` 模式的语音提供商：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 仅当 realtime.voiceProvider 为 "google" 且使用 bidi 模式时需要
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

先检查设置，然后加入：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

`setup` 的输出可供 agent 读取，并且会感知模式/传输方式：它会报告 Chrome 配置文件、node 绑定，以及对于实时 Chrome 加入时所需的 BlackHole/SoX 音频桥接和延迟引言检查。仅观察模式的加入会跳过实时前置条件：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

当配置了 Twilio 委派时，`setup` 还会报告 `voice-call`、Twilio 凭据以及公网 webhook 暴露是否就绪。在 agent 加入前，将任何 `ok: false` 检查视为该传输/模式的阻塞项。使用 `--json` 获取机器可读输出，并可用 `--transport chrome|chrome-node|twilio` 提前对特定传输方式进行预检：

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

在非 macOS 的 Gateway 主机上，`google_meet` 仍会对 artifact、calendar、setup、transcribe、Twilio 和 `chrome-node` 操作可见，但本地 Chrome 对讲（`transport: "chrome"` 且 `mode: "agent"` 或 `"bidi"`）会在到达音频桥之前被阻止，因为该路径目前依赖 macOS 的 `BlackHole 2ch`。请改用 `mode: "transcribe"`、Twilio 拨入，或 macOS `chrome-node` 主机。

### 创建会议

```bash
openclaw googlemeet create --transport chrome-node --mode agent
openclaw googlemeet create --no-join
```

`create` 有两条路径，在结果的 `source` 字段中报告：

- **`api`**：在配置了 Google Meet OAuth 凭据时使用。确定性强；不依赖浏览器 UI 状态。
- **`browser`**：在没有 OAuth 凭据时使用。OpenClaw 在固定的 Chrome 节点上打开 `https://meet.google.com/new`，并等待 Google 重定向到真实的会议代码 URL；该节点上的 OpenClaw Chrome 配置文件必须已经登录 Google。加入和创建都会在打开新标签页之前复用现有的 Meet 标签页（或进行中的 `.../new` / Google 账号提示标签页）；标签页匹配会忽略诸如 `authuser` 之类无害的查询字符串。

默认情况下，`create` 会加入并返回 `joined: true` 以及加入会话。传入 `--no-join`（CLI）或 `"join": false`（工具）即可只生成 URL。

对于 API 创建的会议，请显式设置访问策略，而不要继承 Google 账户默认值：

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

| `--access-type` | 谁可以无需请求加入                                           |
| --------------- | ------------------------------------------------------------ |
| `OPEN`          | 任何拥有 Meet URL 的人                                        |
| `TRUSTED`       | 主办方组织的受信任用户、受邀外部用户，以及拨入用户            |
| `RESTRICTED`    | 仅受邀者                                                    |

这只适用于 API 创建的会议，因此必须配置 OAuth。如果你在此选项存在之前已经完成过身份验证，请在 OAuth 同意屏幕中添加 `meetings.space.settings` scope 后，重新运行 `openclaw googlemeet auth login --json`。

如果浏览器回退路径遇到 Google 登录或 Meet 权限阻塞，工具会返回 `manualActionRequired: true`，并附带 `manualActionReason`、`manualActionMessage` 以及 `browser.nodeId`/`browser.targetId`/`browserUrl`。请报告该消息，并停止打开新的 Meet 标签页，直到操作者完成浏览器步骤。

### 仅观察加入

设置 `"mode": "transcribe"` 可跳过双工实时桥接（不需要 BlackHole/SoX，也没有对讲）。转写模式下的 Chrome 加入也会跳过 OpenClaw 的麦克风/摄像头权限授予，以及 Meet 的 **Use microphone** 路径；如果 Meet 显示音频选择插页，自动化会优先尝试 **Continue without microphone**。该模式下托管的 Chrome 传输会尽力安装 Meet 字幕观察器。`googlemeet status --json` 和 `googlemeet doctor` 会报告 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 以及 `recentTranscript` 尾部内容。

对于有界会话转录，请读取精确跟踪的 Meet 标签页：

```bash
openclaw googlemeet transcript <session-id>
openclaw googlemeet transcript <session-id> --since <next-index> --json
```

观察器在 Meet 页面中最多保留 2,000 行已完成的字幕行。可见的渐进式文本会保留在状态健康尾部，直到字幕行完成，因此保存 `nextIndex` 不会跳过后续的文本扩展；离开时会在快照前最终确定可见行。`droppedLines` 会报告因超过上限而从头部丢失的行。最近结束的四个会话转录在网关重启前仍可读取。更早结束的转录会返回 `evicted: true`。这刻意属于运行时内存，而不是持久化的会议历史存储：重启网关、在快照前关闭标签页，或超过文档中说明的上限，都可能丢失字幕。

对于是/否监听探测：

```bash
openclaw googlemeet test-listen <meet-url> --transport chrome-node
```

它会以 transcribe 模式加入，等待新的字幕/转录变化，并返回 `listenVerified`、`listenTimedOut`、手动操作字段以及当前字幕健康状态。

### 实时会话健康状态

在对讲会话期间，`google_meet` status 会报告 Chrome/音频桥健康状态：`inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最近的输入/输出时间戳、字节计数器以及桥接关闭状态。托管的 Chrome 会话只有在健康状态报告 `inCall: true` 后才会说出引言/测试短语；否则 `speechReady: false`，语音尝试会被阻止，而不是静默无操作。

通过已登录的 OpenClaw 浏览器配置文件进行本地 Chrome 加入时，麦克风/扬声器路径需要 `BlackHole 2ch`。单个 BlackHole 设备足以进行首次烟雾测试，但可能会产生回声；为获得干净的双工音频，请使用分离的虚拟设备或类似 Loopback 的图谱。

## Local Gateway + Parallels Chrome

Just to let a macOS virtual machine use Chrome, you do not need a full Gateway or model API key. Run Gateway and the agent locally; run the node host in the VM.

| Location             | Contents                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Gateway host         | OpenClaw Gateway, agent workspace, model/API keys, real-time providers, Google Meet plugin config |
| Parallels macOS VM   | OpenClaw CLI/node host, Chrome, SoX, BlackHole 2ch, Chrome profile signed into Google        |
| Not needed in VM     | Gateway service, agent config, model provider settings                                             |

Install VM dependencies, reboot, verify:

```bash
brew install blackhole-2ch sox
sudo reboot
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Enable the plugin and start the node host in the VM:

```bash
openclaw plugins enable google-meet
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

If `<gateway-host>` is a LAN IP without TLS, enable this option for that trusted private network:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

When installing as a LaunchAgent, use the same flag as well (it is a process environment and will be preserved in the LaunchAgent environment at install time, not in `openclaw.json` settings):

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

Approve the node on the Gateway host, then confirm it advertises both `googlemeet.chrome` and browser capability/`browser.proxy`:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Route Meet through that node:

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

Now join normally from the Gateway host:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

For a one-command smoke test, which creates or reuses a session, speaks a known phrase, and prints session health:

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

During live join, browser automation will fill in the guest name, click Join/Request to join, and accept the Meet first-run "Use microphone" prompt if it appears (or choose Continue without microphone for observe-only joins and browser-only meeting creation). If the profile is signed out, Meet is waiting for host approval, Chrome needs microphone/camera permissions, or Meet is stuck on an unresolved prompt, the result will report `manualActionRequired: true` along with `manualActionReason` and `manualActionMessage`. Stop retrying, report that message plus `browserUrl`/`browserTitle`, and retry only after the manual action is complete.

If `chromeNode.node` is omitted, OpenClaw will auto-select only when exactly one connected node advertises both `googlemeet.chrome` and browser control; when multiple capable nodes are connected, pin `chromeNode.node` (node id, display name, or remote IP).

### Common troubleshooting

| Symptom                                                  | Fix                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Configured Google Meet node ... is not usable: offline` | The pinned node is known but unavailable. Report the configuration as blocking; do not silently fall back to another transport unless instructed to do so.                                                                                                            |
| `No connected Google Meet-capable node`                  | Run `openclaw node run` in the VM, approve pairing, and run `openclaw plugins enable google-meet` and `openclaw plugins enable browser` there. Confirm `gateway.nodes.allowCommands` includes `googlemeet.chrome` and `browser.proxy`.                              |
| `BlackHole 2ch audio device not found`                   | Install `blackhole-2ch` on the host being checked and reboot.                                                                                                                                                                                                       |
| `BlackHole 2ch audio device not found on the node`       | Install `blackhole-2ch` in the VM and reboot the VM.                                                                                                                                                                                                                |
| Chrome opens but cannot join                             | Sign into the browser profile in the VM, or keep `chrome.guestName` set. Guest auto-join uses OpenClaw browser automation via the node browser proxy; point the node's `browser.defaultProfile` (or a named existing session profile) at the profile you want. |
| Duplicate Meet tabs                                      | Keep `chrome.reuseExistingTab: true`. OpenClaw will activate the existing tab for the same URL, and the creation flow will reuse an in-progress `.../new` or Google account prompt tab before opening another one.                                                  |
| No audio                                                 | Route Meet's mic/speaker through the virtual audio path used by OpenClaw; use a separate virtual device or Loopback-like routing for clean bidirectional audio.                                                                                                      |

## 安装说明

Chrome 语音回传默认使用两个外部工具，OpenClaw 不会捆绑或重新分发它们；请通过 Homebrew 将它们作为宿主依赖安装：

- `sox`：命令行音频工具。该插件会针对默认的 24 kHz PCM16 音频桥接发出显式的 CoreAudio 设备命令。
- `blackhole-2ch`：macOS 虚拟音频驱动，提供 Chrome/Meet 路由所使用的 `BlackHole 2ch` 设备。

SoX 的许可证为 `LGPL-2.0-only AND GPL-2.0-only`；BlackHole 的许可证为 GPL-3.0。如果你构建的安装程序或设备将 BlackHole 与 OpenClaw 捆绑在一起，请审查 BlackHole 上游的许可，或从 Existential Audio 获取单独许可。

## 传输方式

| 传输方式      | 适用场景                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------- |
| `chrome`      | Chrome/音频在 Gateway 主机上本地运行                                                       |
| `chrome-node` | Chrome/音频在配对节点上运行（例如 Parallels macOS 虚拟机）                                   |
| `twilio`      | 通过 Voice Call 插件进行电话拨入回退，当无法使用 Chrome 参与时使用                          |

### Chrome

通过 OpenClaw 浏览器控制打开 Meet URL，并以已登录的 OpenClaw 浏览器配置文件身份加入。在 macOS 上，插件会在启动前检查是否存在 `BlackHole 2ch`，并且如果已配置，会在打开 Chrome 之前运行音频桥健康检查/启动命令。对于本地 Chrome，请使用 `browser.defaultProfile` 选择配置文件；`chrome.browserProfile` 会传递给 `chrome-node` 主机而不是本地 Chrome。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

Chrome 的麦克风/扬声器音频通过本地 OpenClaw 音频桥路由。如果未安装 `BlackHole 2ch`，加入会失败并报出设置错误，而不是在没有音频路径的情况下加入。

### Twilio

由 [Voice call 插件](/plugins/voice-call) 执行的严格拨号计划。它不会解析 Meet 页面中的电话号码；Google Meet 必须为该会议提供电话拨入号码和 PIN。

请在 Gateway 主机上启用 Voice Call，而不是在 Chrome 节点上：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // 或者设置为 "twilio"，如果希望 Twilio 成为默认方式
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "作为 OpenClaw 代理加入此 Google Meet。简洁明了。",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
      },
    },
  },
}
```

通过环境变量提供 Twilio 凭据，以避免将密钥放入 `openclaw.json`：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
export GEMINI_API_KEY=...
```

如果实时语音提供方是 OpenAI，请改用 `realtime.provider: "openai"` 并设置 `OPENAI_API_KEY`。

启用 `voice-call` 后请重启或重新加载 Gateway；插件配置变更在重新加载前不会生效。验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当 Twilio 委派已配置完成时，`googlemeet setup` 会包含 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

使用 `--dtmf-sequence` 可以自定义序列，并使用前导 `w` 或逗号在 PIN 前暂停：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和预检

创建 Meet 链接时，OAuth 是可选的，因为 `googlemeet create` 可以回退到浏览器自动化。为官方 API 创建、空间解析或 Meet Media API 预检配置 OAuth。Chrome/Chrome-node 加入始终不依赖 OAuth；无论哪种情况，它们都使用已登录的 Chrome 配置文件、BlackHole/SoX，以及（对于 `chrome-node`）已连接的节点。

### 创建 Google 凭据

在 Google Cloud Console 中：

<Steps>
<Step title="创建或选择一个项目">
</Step>
<Step title="启用 Google Meet REST API">
</Step>
<Step title="配置 OAuth 同意屏幕">
对于 Google Workspace 组织，Internal 最简单。External 适用于个人/测试环境；当应用处于 Testing 状态时，将每个将授权它的 Google 账号都添加为测试用户。
</Step>
<Step title="添加所请求的作用域">
- `https://www.googleapis.com/auth/meetings.space.created`
- `https://www.googleapis.com/auth/meetings.space.readonly`
- `https://www.googleapis.com/auth/meetings.space.settings`
- `https://www.googleapis.com/auth/meetings.conference.media.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`（Calendar 查找）
- `https://www.googleapis.com/auth/drive.meet.readonly`（转录/智能笔记文档正文导出）

</Step>
<Step title="创建 OAuth 客户端 ID">
应用类型 **Web application**。授权重定向 URI：

```text
http://localhost:8085/oauth2callback
```

</Step>
<Step title="复制客户端 ID 和客户端密钥">
</Step>
</Steps>

`meetings.space.created` 是 `spaces.create` 所必需的。`meetings.space.readonly` 可将 Meet URL/代码解析为空间。`meetings.space.settings` 允许 OpenClaw 在通过 API 创建房间时传递 `SpaceConfig` 设置，例如 `accessType`。`meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体相关工作；Google 可能要求先加入 Developer Preview 计划才能实际使用 Media API。`calendar.events.readonly` 仅在 `--today`/`--event` 的日历查找时需要。`drive.meet.readonly` 仅在 `--include-doc-bodies` 导出时需要。如果你只需要基于浏览器的 Chrome 加入，可以完全跳过 OAuth。

### 获取刷新令牌

配置 `oauth.clientId`，并可选配置 `oauth.clientSecret`（或通过环境变量传入），然后运行：

```bash
openclaw googlemeet auth login --json
```

这会运行一个带本地回调 `http://localhost:8085/oauth2callback` 的 PKCE 流程，并打印一个包含刷新令牌的 `oauth` 配置块。当浏览器无法访问本地回调时，添加 `--manual` 可使用复制/粘贴流程：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 输出：

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

将 `oauth` 对象存放到插件配置中：

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

当你不想把刷新令牌放入配置时，优先使用环境变量；配置优先解析，然后才会回退到环境变量。如果你是在会议创建、日历查找或文档正文导出支持加入之前完成认证的，请重新运行 `openclaw googlemeet auth login --json`，以确保刷新令牌覆盖当前作用域集合。

### 使用 doctor 验证 OAuth

```bash
openclaw googlemeet doctor --oauth --json
```

这会检查 OAuth 配置是否存在，以及刷新令牌是否可以获取访问令牌，而无需加载 Chrome 运行时或要求已连接的节点。报告只包含状态字段（`ok`、`configured`、`tokenSource`、`expiresAt`、检查消息），绝不会打印访问令牌、刷新令牌或客户端密钥。

| 检查                 | 含义                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加 `oauth.refreshToken`，或者存在缓存的访问令牌 |
| `oauth-token`        | 缓存的访问令牌仍然有效，或者刷新令牌成功获取了新的访问令牌           |
| `meet-spaces-get`    | 可选的 `--meeting` 检查已解析出一个现有的 Meet 空间                  |
| `meet-spaces-create` | 可选的 `--create-space` 检查创建了一个新的 Meet 空间                 |

使用带副作用的创建检查来证明 Meet API 已启用且 `spaces.create` 作用域有效：

```bash
openclaw googlemeet doctor --oauth --create-space --json
```

证明对现有空间的读取权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

这些检查返回 `403` 通常意味着 Meet REST API 已被禁用、刷新令牌缺少所需作用域，或者 Google 账号无法访问该空间。刷新令牌错误则表示需要重新运行 `openclaw googlemeet auth login --json` 并保存新的 `oauth` 块。

浏览器回退不需要 OAuth；那里使用的 Google 登录来自所选节点上已登录的 Chrome 配置文件，而不是 OpenClaw 配置。

接受以下环境变量作为回退：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或 `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

### 解析、预检和读取工件

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 创建会议记录之后：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting` 时，`artifacts` 和 `attendance` 默认使用最新的会议记录；传入 `--all-conference-records` 可获取所有保留的记录。

日历查找会在读取工件之前先从 Google Calendar 解析会议 URL（需要包含 Calendar events readonly 作用域的刷新令牌）：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 会在今天的 `primary` 日历中搜索带有 Meet 链接的事件；`--event <query>` 会搜索匹配的事件文本；`--calendar <id>` 可指定非主日历。`calendar-events` 会预览匹配的事件，并标记 `latest`/`artifacts`/`attendance`/`export` 将选择哪个事件。

如果你已经知道会议记录 ID，可以直接指定：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

关闭一个由 API 创建的空间：

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

这会调用 `spaces.endActiveConference`，并且需要 OAuth 具备 `meetings.space.created` 作用域，且该空间必须是授权账号可管理的。它接受 Meet URL、会议代码或 `spaces/{id}`，并会先将其解析为 API 空间资源。这与 `googlemeet leave` 不同：`leave` 只会停止 OpenClaw 的本地/会话参与；`end-active-conference` 则是请求 Google Meet 结束该空间的当前活动会议。

生成可读报告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

当 Google 提供时，`artifacts` 会返回会议记录元数据，以及参与者、录制、转录、结构化转录条目和智能笔记资源的元数据。`--no-transcript-entries` 会跳过大型会议的条目查找。`attendance` 会将参与者展开为参与会话行，并包含首次/最后出现时间、总会话时长、迟到/早退标记，以及按登录用户或显示名称合并的重复参与者资源；`--no-merge-duplicates` 会保留原始资源分开显示，`--late-after-minutes`/`--early-before-minutes` 可调整阈值。

`export` 会写入一个包含 `summary.md`、`attendance.csv`、`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的文件夹。`manifest.json` 会记录所选输入、导出选项、会议记录、输出文件、计数、令牌来源、使用过的任何 Calendar 事件，以及部分检索警告。`--zip` 还会在文件夹旁边写入一个可移植压缩包。`--include-doc-bodies` 会通过 Drive `files.export` 导出关联的转录/智能笔记 Google Docs 文本（需要 Drive Meet readonly 作用域）；不使用它时，导出只包含 Meet 元数据和结构化转录条目。部分工件失败（智能笔记列表、转录条目或文档正文错误）会将警告保留在摘要/清单中，而不会导致整个导出失败。`--dry-run` 会获取相同数据并打印清单 JSON，但不会创建文件夹或 ZIP。

代理通过 `google_meet` 工具使用相同操作（`export`、带 `accessType` 的 `create`、`end_active_conference`、`test_listen`）；见 [工具](#tool)。

### 实况冒烟测试

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

| 变量                                                                                                                      | 作用                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_LIVE_TEST=1`                                                                                                    | 启用受保护的实况测试                                                |
| `OPENCLAW_GOOGLE_MEET_LIVE_MEETING`                                                                                       | 保留的 Meet URL、代码或 `spaces/{id}`                              |
| `OPENCLAW_GOOGLE_MEET_CLIENT_ID` / `GOOGLE_MEET_CLIENT_ID`                                                                | OAuth 客户端 ID                                                    |
| `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` / `GOOGLE_MEET_REFRESH_TOKEN`                                                        | 刷新令牌                                                           |
| `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`, `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN`, `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` | 可选；不带 `OPENCLAW_` 前缀的同名回退环境变量也可用                |

基础的工件/出勤冒烟测试需要 `meetings.space.readonly` 和 `meetings.conference.media.readonly`。日历查找需要 `calendar.events.readonly`。Drive 文档正文导出需要 `drive.meet.readonly`。

### 创建示例

```bash
openclaw googlemeet create
```

会打印新的会议 URI、来源和加入会话。启用 OAuth 时会使用 Meet API；未启用时则使用固定 Chrome 节点上已登录的配置文件。浏览器回退 JSON：

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

如果浏览器回退首先遇到 Google 登录或 Meet 权限阻止，`google_meet` 会返回结构化详情，而不是普通字符串：

```json
{
  "source": "browser",
  "error": "google-login-required: 请在 OpenClaw 浏览器配置文件中登录 Google，然后重试创建会议。",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "请在 OpenClaw 浏览器配置文件中登录 Google，然后重试创建会议。",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "登录 - Google 账号"
  }
}
```

API 创建 JSON：

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

创建操作默认会加入会议，但 Chrome/Chrome-node 仍然需要已登录的 Google 配置文件才能通过浏览器加入；如果处于未登录状态，OpenClaw 会报告 `manualActionRequired: true` 或返回浏览器回退错误，并要求操作者先完成 Google 登录后再重试。

只有在确认你的 Cloud 项目、OAuth 主体以及会议参与者都已加入 Google Workspace Developer Preview Program for Meet media APIs 之后，才将 `preview.enrollmentAcknowledged: true` 设为 `true`。

## 配置

通用的 Chrome agent 路径只需要启用插件、BlackHole、SoX、一个实时提供商密钥，以及一个已配置的 OpenClaw TTS 提供商：

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

### 默认值

| 键                                | 默认值                                   | 说明                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultTransport`                | `"chrome"`                               |                                                                                                                                                                                                                   |
| `defaultMode`                     | `"agent"`                                | `"realtime"` 作为 `"agent"` 的旧别名仍被接受；新的调用方应使用 `"agent"`                                                                                                                                        |
| `chromeNode.node`                 | 未设置                                    | `chrome-node` 的节点 id/名称/IP；当可能连接多个具备能力的节点时必填                                                                                                                                                |
| `chrome.launch`                   | `true`                                   | 为加入会议而启动 Chrome；仅在复用已经打开的会话时才设置为 `false`                                                                                                                                                |
| `chrome.audioBackend`             | `"blackhole-2ch"`                        |                                                                                                                                                                                                                   |
| `chrome.guestName`                | `"OpenClaw Agent"`                       | 显示在未登录的 Meet 来宾界面上                                                                                                                                                                                    |
| `chrome.autoJoin`                 | `true`                                   | 在 `chrome-node` 上尽力自动填写来宾姓名并点击 “Join Now”                                                                                                                                                |
| `chrome.reuseExistingTab`         | `true`                                   | 激活现有的 Meet 标签页，而不是打开重复标签页                                                                                                                                                                      |
| `chrome.waitForInCallMs`          | `20000`                                  | 等待 Meet 标签页报告已进入通话后，再触发 talk-back 开场白                                                                                                                                                         |
| `chrome.audioFormat`              | `"pcm16-24khz"`                          | 命令对音频格式；`"g711-ulaw-8khz"` 仅用于会输出电话音频的旧版/自定义命令对                                                                                                                                        |
| `chrome.audioBufferBytes`         | `4096`                                   | 用于生成命令对音频命令的 SoX 处理缓冲区（为 SoX 默认 8192 字节缓冲区的一半，可降低管道延迟）；数值会被限制为最小 17 字节                                         |
| `chrome.audioInputCommand`       | 生成的 SoX 命令                           | 从 CoreAudio `BlackHole 2ch` 读取，以 `chrome.audioFormat` 写出音频                                                                                                                                                |
| `chrome.audioOutputCommand`      | 生成的 SoX 命令                           | 读取 `chrome.audioFormat` 音频，写入 CoreAudio `BlackHole 2ch`                                                                                                                                                    |
| `chrome.bargeInInputCommand`      | 未设置                                    | 可选的本地麦克风命令，以有符号 16 位小端单声道 PCM 写出，用于在助手播放期间检测人工打断；适用于 Gateway 托管的命令对桥接                              |
| `chrome.bargeInRmsThreshold`     | `650`                                    | 被视为人工打断的 RMS 电平                                                                                                                                                                                         |
| `chrome.bargeInPeakThreshold`    | `2500`                                   | 被视为人工打断的峰值电平                                                                                                                                                                                          |
| `chrome.bargeInCooldownMs`       | `900`                                    | 重复清除打断之间的最小延迟                                                                                                                                                                                        |
| `mode`（每次请求）               | `"agent"`                                | talk-back 模式；参见 [Agent 和 bidi 模式](#agent-and-bidi-modes) 表                                                                                                                                               |
| `realtime.provider`               | `"openai"`                               | 当下方作用域字段未设置时使用的兼容性回退                                                                                                                                                                          |
| `realtime.transcriptionProvider`  | `"openai"`                               | `agent` 模式用于实时转写的提供商 id                                                                                                                                                                                |
| `realtime.voiceProvider`          | 未设置                                    | `bidi` 模式用于直接实时语音的提供商 id；在保持 agent 模式转写使用 OpenAI 的同时，设置为 `"google"` 可用于 Gemini Live。与 `realtime.model` 搭配以选择具体的 Gemini Live 模型。 |
| `realtime.toolPolicy`             | `"safe-read-only"`                       | 参见 [Agent 和 bidi 模式](#agent-and-bidi-modes)                                                                                                                                                                  |
| `realtime.instructions`           | 简短的口头回复指令                         | 告诉模型简短地说话，并在需要更深入回答时使用 `openclaw_agent_consult`                                                                                                                                            |
| `realtime.introMessage`           | `"Say exactly: I'm here and listening."` | 实时桥接连接时只说一次；设置为 `""` 可静默加入                                                                                                                                                                     |
| `realtime.agentId`                | `"main"`                                 | `openclaw_agent_consult` 使用的 OpenClaw agent id                                                                                                                                                                  |
| `voiceCall.enabled`               | `true`                                   | 将 Twilio PSTN 呼叫、DTMF 和开场问候委托给 Voice Call 插件                                                                                                                                                         |
| `voiceCall.dtmfDelayMs`           | `12000`                                  | 通过 Twilio 播放基于 PIN 派生的 DTMF 序列之前的初始等待时间                                                                                                                                                      |
| `voiceCall.postDtmfSpeechDelayMs` | `5000`                                   | Voice Call 启动 Twilio 线路后，请求实时开场问候之前的延迟                                                                                                                                                        |

`chrome.audioBridgeCommand` 和 `chrome.audioBridgeHealthCommand` 允许外部桥接拥有整个本地音频路径，而不是使用 `chrome.audioInputCommand`/`chrome.audioOutputCommand`；关于哪个模式可以使用它们的限制，请参见[说明](#notes)。

针对旧的 `realtime.provider: "google"` 结构，存在一个 `openclaw doctor --fix` 迁移：当这些字段尚未设置时，它会把该意图迁移为 `realtime.voiceProvider: "google"` 加上 `realtime.transcriptionProvider: "openai"`。

### 可选覆盖

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
      "外接麦克风",
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
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-3.1-flash-live-preview",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "准确说：I'm here.",
    providers: {
      google: {
        speakerVoice: "Kore",
      },
    },
  },
}
```

同时用于 agent 模式听和说的 ElevenLabs：

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

持久化的 Meet 语音来自 `messages.tts.providers.elevenlabs.speakerVoiceId`。在启用 TTS 模型覆盖时，agent 回复也可以使用按回复指定的 `[[tts:speakerVoiceId=... model=eleven_v3]]` 指令，但配置才是会议的确定性默认值。加入时，日志会显示 `transcriptionProvider=elevenlabs`，且每条口语回复都会记录 `provider=elevenlabs model=eleven_v3 speakerVoiceId=<voiceId>`。

仅 Twilio 的配置：

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

当 `voiceCall.enabled: true`（默认值）且使用 Twilio 传输时，Voice Call 会在打开实时媒体流之前先拨打 DTMF 序列，然后使用保存的开场文本作为初始实时问候。如果未启用 `voice-call`，Google Meet 仍然可以验证并记录拨号计划，但无法发起 Twilio 呼叫。

将 `voiceCall.gatewayUrl` 留空，以使用本地受信任的 Gateway 运行时，这会在整个通话期间保留
发起调用的 agent。已配置的 Gateway URL 仍然是一个显式的 WebSocket 目标，
且无法验证插件来源；非默认 agent 加入会直接失败，而不会静默地
使用另一个 agent。若需要按 agent 路由，请在同一个 Gateway 进程中运行 Google Meet 和 Voice Call。

## 工具

Agents 使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

| `action`                | 用途                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `join`                  | 加入一个明确的 Meet URL                                                                         |
| `create`                | 创建一个空间（并默认加入）；支持 `accessType`/`entryPointAccess`                    |
| `status`                | 列出活动会话，或通过 `sessionId` 检查一个会话                                               |
| `setup_status`          | 运行与 `googlemeet setup` 相同的检查                                                         |
| `resolve_space`         | 通过 `spaces.get` 解析 URL/代码/`spaces/{id}`                                                 |
| `preflight`             | 验证 OAuth + 会议解析前置条件                                                 |
| `latest`                | 查找某个会议的最新会议记录                                                   |
| `calendar_events`       | 预览带有 Meet 链接的日历事件                                                           |
| `artifacts`             | 列出会议记录以及参与者/录制/转录/智能笔记元数据                  |
| `attendance`            | 列出参与者和参与者会话                                                        |
| `export`               | 写出 artifacts/attendance/transcript/manifest 捆绑包；将 `"dryRun": true` 设为仅生成 manifest |
| `recover_current_tab`   | 聚焦/检查现有 Meet 标签页，而不打开新标签                                      |
| `transcript`            | 读取有边界的字幕转录；`sinceIndex` 从上一次的 `nextIndex` 继续           |
| `leave`                 | 结束一个会话（Chrome 点击离开；仅关闭它打开的标签页；Twilio 挂断）                        |
| `end_active_conference` | 结束 API 管理空间中的活动 Google Meet 会议                                    |
| `speak`                 | 根据 `sessionId` 和 `message` 让实时代理立即发言                        |
| `test_speech`           | 创建/复用一个会话，触发一个已知短语，返回 Chrome 健康状态                              |
| `test_listen`           | 创建/复用一个仅观察会话，等待字幕/转录变化                        |

`test_speech` 总是强制使用 `mode: "agent"` 或 `"bidi"`，如果要求在 `mode: "transcribe"` 下运行则会失败，因为仅观察会话不能发声。它的 `speechOutputVerified` 结果基于该调用期间实时音频输出字节数是否增加，因此复用一个带有较早音频的会话不算作一次新的检查。

对于 Chrome 传输方式，`leave` 在点击 Meet 的离开通话按钮后会保留一个复用的用户自有标签页保持打开。由 OpenClaw 打开的标签页会在离开后关闭。

当 Chrome 运行在 Gateway 主机上时使用 `transport: "chrome"`，当它运行在配对节点上时使用 `transport: "chrome-node"`。在这两种情况下，模型提供方和 `openclaw_agent_consult` 都运行在 Gateway 主机上，因此模型凭据保留在那里。Agent 模式日志会在桥接启动时包含解析后的转录提供方/模型，并在每次合成回复后包含 TTS 提供方/模型/语音/输出格式/采样率。原始 `mode: "realtime"` 仍作为 `mode: "agent"` 的旧兼容别名被接受，但它不再出现在工具的 `mode` 枚举中。

带有 API 支持房间和显式访问策略的 `create`：

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

结束一个已知房间的活动会议：

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

在声称加入会议之前先进行先听验证很有用：

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

按需发言：

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "准确说：我在这里并且在听。"
}
```

`status` 在可用时包含 Chrome 健康状态：

| 字段                                                                 | 含义                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `inCall`                                                              | Chrome 看起来已在 Meet 通话中                                                                                             |
| `micMuted`                                                            | 尽力获取的 Meet 麦克风状态                                                                                                |
| `manualActionRequired` / `manualActionReason` / `manualActionMessage` | 浏览器配置文件在语音可用之前需要手动登录、Meet 主持人接纳、权限或浏览器控制修复                                             |
| `speechReady` / `speechBlockedReason` / `speechBlockedMessage`        | 当前是否允许受管 Chrome 发言；`speechReady: false` 表示 OpenClaw 未发送介绍/测试短语                                        |
| `providerConnected` / `realtimeReady`                                 | 实时语音桥接状态                                                                                                          |
| `lastInputAt` / `lastOutputAt`                                        | 最近一次从桥接接收/发送的音频                                                                                              |
| `audioOutputRouted` / `audioOutputDeviceLabel`                        | Meet 标签页的媒体输出是否已主动路由到桥接的 BlackHole 设备                                                                 |
| `lastSuppressedInputAt` / `suppressedInputBytes`                      | 在助手播放 აქტive 时被忽略的回环输入                                                                                       |

## Agent 和 bidi 模式

| 模式    | 谁决定答案                    | 语音输出路径                         | 适用场景                                              |
| ------- | ----------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `agent` | 配置的 OpenClaw agent        | 正常的 OpenClaw TTS 运行时           | 你想要“我的 agent 正在会议中”这种行为                |
| `bidi`  | 实时语音模型                  | 实时语音提供方的音频响应             | 你想要最低延迟的对话式语音循环                        |

`agent` 模式：实时转写提供方会监听会议音频，最终的参与者转写会路由到已配置的 OpenClaw agent，答案通过常规 OpenClaw TTS 播放。相邻的最终转写片段会在咨询前进行合并，因此一次语音轮次不会产生多个过时的部分答案；当排队中的助手音频仍在播放时，会抑制实时输入；并且在咨询前会忽略最近类似助手的转写回声，这样 BlackHole 回环就不会让 agent 回答自己的语音。

`bidi` 模式：实时语音模型会直接回答，并且可以调用 `openclaw_agent_consult` 进行更深入的推理、获取当前信息，或使用常规 OpenClaw 工具。consult 工具会在后台使用最近的会议转写上下文运行常规 OpenClaw agent，并返回一个简洁的语音答案；在 `agent` 模式下，OpenClaw 会直接将该答案发送到 TTS，在 `bidi` 模式下，实时语音模型可以把它说出来。它使用与 Voice Call 相同的共享 consult 机制。

默认情况下，consult 会针对 `main` agent 运行；设置 `realtime.agentId` 可以将 Meet 通道指向专用的 agent 工作区、模型默认值、工具策略、记忆和会话历史。agent 模式下的 consult 会使用每个会议独立的 `agent:<id>:subagent:google-meet:<session>` 会话键，因此后续问题会保留会议上下文，同时继承正常的 agent 策略。当一个 agent 在 agent 模式下调用 `google_meet` 时，consultant 会话会在回答参与者发言前分叉出调用者当前的转写；Meet 会话保持独立，因此会议后续内容不会直接修改调用者转写。

`realtime.toolPolicy` 控制 consult 运行：

| 策略             | 行为                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `safe-read-only` | 暴露 consult 工具；将常规 agent 的工具限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search`、`memory_get` |
| `owner`          | 暴露 consult 工具；允许常规 agent 使用其正常的工具策略                                                                      |
| `none`           | 不向实时语音模型暴露 consult 工具                                                                                             |

consult 会话键按每个 Meet 会话进行作用域隔离，因此在同一会议期间，后续的 consult 调用会复用之前的 consult 上下文。

在 Chrome 完全加入后强制执行一次口头就绪检查：

```bash
openclaw googlemeet speak meet_... "准确说：我已经到场并在监听。"
```

完整的加入并播报烟雾测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "准确说：我已经到场并在监听。"
```

## 实时测试清单

在将会议交给无人值守代理之前：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "请准确说出：Google Meet 语音测试完成。"
```

预期 Chrome-node 状态：

- `googlemeet setup` 全部为绿色，并且当 Chrome-node 是默认传输方式或已固定某个节点时，会包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接，并同时广播 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 标签页加入会议，并且 `test-speech` 返回带有 `inCall: true` 的 Chrome 健康状态。

对于远程 Chrome 主机，例如 Parallels macOS 虚拟机，在更新 Gateway 或虚拟机之后，最简短且安全的检查方式是：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明 Gateway 插件已加载，虚拟机节点使用当前令牌保持连接，并且在代理打开真实会议标签页之前，Meet 音频桥已可用。

对于 Twilio 试运行，请使用一个提供电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期 Twilio 状态：

- `googlemeet setup` 包含绿色的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查项。
- 在 Gateway 重新加载后，CLI 中可用 `voicecall`。
- 返回的会话具有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `openclaw logs --follow` 显示先提供 DTMF TwiML，再提供 realtime TwiML，随后是带有已排队初始问候语的实时桥接。
- `googlemeet leave <sessionId>` 挂断委托的语音通话。

## 故障排查

### Agent 无法看到 Google Meet 工具

确认插件已启用并重新加载 Gateway；运行中的 agent 只能看到当前 Gateway 进程注册的插件工具：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

在非 macOS 的 Gateway 主机上，`google_meet` 仍然可见，但本地 Chrome 语音回传操作会在到达音频桥之前被阻止。请使用 `mode: "transcribe"`、Twilio 拨入，或使用 macOS 的 `chrome-node` 主机，而不是默认的本地 Chrome agent 路径。

### 没有已连接的支持 Google Meet 的节点

在节点主机上：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

节点必须已连接，并列出 `googlemeet.chrome` 和 `browser.proxy`；Gateway 配置也必须允许这两项：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失败并提示 `chrome-node-connected`，或者 Gateway 日志报告 `gateway token mismatch`，请使用当前 Gateway token 重新安装或重启节点：

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

运行 `googlemeet test-listen` 进行仅观察加入，或运行 `googlemeet test-speech` 进行实时加入，然后检查返回的 Chrome 健康状态。如果任一命令报告 `manualActionRequired: true`，请向操作员显示 `manualActionMessage`，并在浏览器操作完成前停止重试。

常见的人工操作包括：在 Chrome 配置文件中登录；从 Meet 主机账户允许访客进入；当原生提示出现时授予 Chrome 麦克风/摄像头权限；关闭或修复卡住的 Meet 权限对话框。

不要因为 Meet 提示“Do you want people to hear you in the meeting?” 就报告“未登录”；那是 Meet 的音频选择中间页。OpenClaw 会在可用时通过浏览器自动化点击 **Use microphone**，并继续等待真正的会议状态；对于仅创建的浏览器回退路径，它可能会改为点击 **Continue without microphone**，因为生成 URL 不需要实时音频路径。

### 会议创建失败

`googlemeet create` 在配置了 OAuth 时会使用 Meet API `spaces.create`，否则使用固定的 Chrome 节点浏览器。请确认：

- **API 创建**：`oauth.clientId` 和 `oauth.refreshToken`（或匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量）存在，并且该刷新令牌是在添加创建支持之后签发的；较旧的令牌可能缺少 `meetings.space.created`，因此请重新运行 `openclaw googlemeet auth login --json`。
- **浏览器回退**：`defaultTransport: "chrome-node"` 且 `chromeNode.node` 指向一个已连接的节点，该节点具有 `browser.proxy` 和 `googlemeet.chrome`；该节点上的 OpenClaw Chrome 配置文件已登录，并且可以打开 `https://meet.google.com/new`。
- **浏览器回退重试**：在打开新标签页之前，复用已有的 `.../new` 或 Google 账户提示标签页；请重试工具调用，而不是手动再打开一个标签页。
- **人工操作**：如果工具返回 `manualActionRequired: true`，请使用 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 引导操作员；不要循环重试。
- **音频选择中间页**：如果 Meet 显示“Do you want people to hear you in the meeting?”，请保持标签页打开。OpenClaw 应该点击 **Use microphone**，或者（仅创建）点击 **Continue without microphone**，并继续等待生成的 URL；如果无法做到，错误信息应提及 `meet-audio-choice-required`，而不是 `google-login-required`。

### Agent 加入了，但没有说话

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

对于 STT -> OpenClaw agent -> TTS 路径，请使用 `mode: "agent"`；对于直接实时语音回退，请使用 `mode: "bidi"`。`mode: "transcribe"` 故意不会启动语音回传桥。对于仅观察调试，在参与者发言后运行 `openclaw googlemeet status --json <session-id>`，并检查 `captioning`、`transcriptLines`、`lastCaptionText`。如果 `inCall` 为 true 但 `transcriptLines` 一直保持为 `0`，可能是 Meet 字幕已禁用、在观察者安装后没有人发言、Meet UI 已更改，或该会议语言/账户不支持实时字幕。

`googlemeet test-speech` 总是检查实时路径，并报告该次调用是否观察到桥接输出字节。如果 `speechOutputVerified` 为 false 且 `speechOutputTimedOut` 为 true，实时提供方可能已经接受了这句话，但 OpenClaw 没有看到新的输出字节到达 Chrome 音频桥。

还要确认：Gateway 主机上可用实时提供方密钥（`OPENAI_API_KEY` 或 `GEMINI_API_KEY`）；Chrome 主机上可见 `BlackHole 2ch`；那里安装了 `sox`；Meet 麦克风/扬声器已通过虚拟音频路径路由（`doctor` 对本地 Chrome 实时加入应显示 `meet output routed: yes`）。

`googlemeet doctor [session-id]` 会打印会话、节点、是否在通话中状态、人工操作原因、实时提供方连接、`realtimeReady`、音频输入/输出活动、最后音频时间戳、字节计数以及浏览器 URL。使用 `googlemeet status [session-id] --json` 获取原始 JSON，使用 `googlemeet doctor --oauth`（加上 `--meeting` 或 `--create-space`）可在不暴露令牌的情况下验证 OAuth 刷新。

如果 agent 超时且已经打开了一个 Meet 标签页，请在不再打开新标签页的情况下检查它：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

对应的工具操作是 `recover_current_tab`：它会聚焦并检查所选传输方式的现有 Meet 标签页（`chrome` 使用本地浏览器控制，`chrome-node` 使用已配置的节点），而不会打开新标签页或新会话，并报告当前阻塞原因（登录、准入、权限、音频选择状态）。CLI 命令会连接到已配置的 Gateway，而 Gateway 必须正在运行；`chrome-node` 还要求节点已连接。

### Twilio 设置检查失败

当 `voice-call` 不被允许或未启用时，`twilio-voice-call-plugin` 会失败：将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`，并重新加载 Gateway。

当 Twilio 后端缺少 account SID、auth token 或呼叫号码时，`twilio-voice-call-credentials` 会失败：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

当 `voice-call` 没有公开 webhook 暴露，或者 `publicUrl` 指向回环/私有网络地址空间时，`twilio-voice-call-webhook` 会失败。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作 `publicUrl`；运营商回调无法访问这些地址。将 `plugins.entries.voice-call.config.publicUrl` 设为一个公共 URL，或者配置隧道/Tailscale 暴露：

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
          // 或
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

重启或重新加载 Gateway，然后：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

默认情况下，`voicecall smoke` 仅进行就绪性检查。对指定号码做干运行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

只有在明确要发起一次真实的外呼时才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 呼叫开始了，但从未进入会议

确认 Meet 事件公开了电话拨入详情，并传入准确的拨入号码以及 PIN，或自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

在 `--dtmf-sequence` 中使用前导 `w` 或逗号表示在输入 PIN 前暂停。

如果呼叫已创建但 Meet 名单中始终没有显示拨入参与者：

- `openclaw googlemeet doctor <session-id>`：确认委派的 Twilio 呼叫 ID、是否已排队 DTMF，以及是否请求了开场问候。
- `openclaw voicecall status --call-id <id>`：确认呼叫仍处于活动状态。
- `openclaw voicecall tail`：确认 Twilio webhook 正在到达 Gateway。
- `openclaw logs --follow`：查找 Twilio Meet 序列：Google Meet 委派加入，Voice Call 存储并提供预连接 DTMF TwiML，Voice Call 为 Twilio 呼叫提供实时 TwiML，然后 Google Meet 通过 `voicecall.speak` 请求开场语音。
- 重新运行 `openclaw googlemeet setup --transport twilio`；绿色的 setup 检查是必需的，但并不能证明会议 PIN 序列正确。
- 确认拨入号码与 PIN 属于同一个 Meet 邀请和地区。
- 如果 Meet 应答很慢，或在发送预连接 DTMF 后通话转录仍显示 PIN 提示，可将 `voiceCall.dtmfDelayMs` 从默认的 12 秒增大。
- 如果参与者已加入但你听不到问候语，请检查 `openclaw logs --follow` 中 DTMF 之后的 `voicecall.speak` 请求，以及媒体流 TTS 播放或 Twilio `<Say>` 回退。如果转录仍显示“enter the meeting PIN”，说明电话线路还未加入 Meet 房间，因此参与者不会听到语音。

如果 webhook 没有到达，请先调试 Voice Call 插件：提供方必须能够访问 `plugins.entries.voice-call.config.publicUrl` 或已配置的隧道。参见 [Voice call troubleshooting](/plugins/voice-call#troubleshooting)。

## 说明

Google Meet 的官方媒体 API 是面向接收的，因此在通话中发言仍然需要一个参与者路径。这个插件保持了这条边界的可见性：Chrome 负责浏览器参与和本地音频路由；Twilio 负责电话拨入参与。

Chrome 说话回传模式需要 `BlackHole 2ch`，再加上以下任一项：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 负责桥接，并在 `chrome.audioFormat` 中于这些命令与所选提供方之间传输音频。`agent` 模式使用实时转录加常规 TTS；`bidi` 模式使用实时语音提供方。默认路径是 24 kHz PCM16，使用 `chrome.audioBufferBytes: 4096`；8 kHz G.711 mu-law 对旧式命令对仍然可用。
- `chrome.audioBridgeCommand`：外部桥接命令负责整个本地音频路径，并且必须在启动或验证其守护进程后退出。仅对 `bidi` 有效，因为 `agent` 模式需要直接访问命令对以进行 TTS。

使用命令对 Chrome 桥接时，`chrome.bargeInInputCommand` 可以监听单独的本地麦克风，并在人开始说话时清除助手播放，即使在助手播放期间共享的 BlackHole 回环输入暂时被抑制，也能让人声优先于助手输出。和 `chrome.audioInputCommand`/`chrome.audioOutputCommand` 一样，它是由操作者配置的本地命令：请使用明确可信的命令路径或参数列表，绝不要使用来自不受信任位置的脚本。

为了获得干净的双工音频，请将 Meet 输出和 Meet 麦克风路由到不同的虚拟设备，或路由到类似 Loopback 的虚拟设备图；单个共享的 BlackHole 设备可能会把其他参与者的声音回送到通话中。

`googlemeet speak` 会为 Chrome 会话触发当前活动的说话回传音频桥；`googlemeet leave` 会停止它（并且，对于通过 Voice Call 委派的 Twilio 会话，会挂断底层通话）。使用 `googlemeet end-active-conference` 还可以关闭由 API 管理的空间中的当前活动 Google Meet 会议。

## 相关内容

- [语音通话插件](/plugins/voice-call)
- [对话模式](/nodes/talk)
- [构建插件](/plugins/building-plugins)