---
summary: "Google Meet 传输：配对节点上的本地 Chrome、Chrome 以及 Twilio 拨入"
read_when:
  - "您正在本地 Chrome、配对的 Chrome 节点和 Twilio 拨入之间进行选择"
  - "您将 macOS VM 作为 Chrome 主机提供给网关"
  - "您正在安装 Chrome 对讲路径所需的主机音频工具"
title: "Google 满足传输和主机"
sidebarTitle: "交通"
---

Chrome、Chrome 节点和 Twilio 传输、Parallels macOS VM 拓扑以及它们所需的主机音频工具。 [Google Meet 插件](/plugins/google-meet) 指南的一部分。

## <a id="local-gateway-%2B-parallels-chrome"></a><a id="local-gateway-+-parallels-chrome"></a> 本地 Gateway + Parallels Chrome

在 macOS VM 中不需要完整的网关或模型 API 密钥，只是为了给它 Chrome。本地运行网关和代理；在 VM 中运行节点主机。

| 位置           | 什么                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| 网关主机         | OpenClaw 网关、代理工作区、model/API 密钥、实时提供商、Google Meet 插件配置 |
| 平行线 macOS VM   | OpenClaw CLI/node 主机、Chrome、SoX、BlackHole 2ch、登录到 Google 的 Chrome 配置文件        |
| VM 中不需要 | 网关服务、代理配置、模型提供程序设置                                             |

安装 VM 依赖项，重新启动，验证：

```bash
brew install blackhole-2ch sox
sudo reboot
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在VM中安装插件，默认启用，并启动节点主机：

```bash
openclaw plugins install @openclaw/google-meet
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是没有 TLS 的 LAN IP，请选择加入该受信任的专用网络：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

安装为 LaunchAgent 时，也使用相同的标志（它是进程环境变量，在安装时会保留到 LaunchAgent 环境中，而不是保存在 `openclaw.json` 设置中）：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

从网关主机批准该节点，然后确认它同时通告 `googlemeet.chrome` 和浏览器 capability/`browser.proxy`：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

通过该 node 路由 Meet：

```json5
{
  gateway: {
    nodes: {
      commands: { allow: ["googlemeet.chrome", "browser.proxy"] },
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

进行单命令冒烟测试，该命令会创建或复用会话、说出已知短语，并打印会话健康状态：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在实时加入期间，浏览器自动填充来宾姓名，单击 Join/Ask 加入，并在出现时接受 Meet 的首次运行“使用麦克风”提示（或在仅观察加入和仅浏览器会议创建期间“在没有麦克风的情况下继续”）。如果配置文件已注销、Meet 正在等待主持人准入、Chrome 需要 mic/camera 权限，或者 Meet 停留在未解决的提示上，则结果包括 `manualAction: { reason, message }`。停止重试，报告该消息加上 `browserUrl`/`browserTitle`，并仅在手动操作完成后重试。

如果省略 `chromeNode.node`，OpenClaw 仅会在恰好有一个已连接 node 同时声明 `googlemeet.chrome` 和浏览器控制能力时自动选择；当有多个具备能力的 node 连接时，请固定设置 `chromeNode.node`（可使用 node id、显示名称或远程 IP）。

### <a id="common-failure-checks"></a> 常见故障排查

| 症状                                                  | 修复                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Configured Google Meet node ... is not usable: offline` | 已知指定的 node，但当前不可用。报告设置阻塞原因；除非用户要求，否则不要静默回退到其他传输方式。                                                                                                                                                      |
| `No connected Google Meet-capable node`                  | 在VM中安装`npm:@openclaw/google-meet`，运行`openclaw plugins enable browser`，启动`openclaw node run`，并批准配对。如果 Google Meet 已明确禁用，也请启用它。确认`gateway.nodes.commands.allow`包括`googlemeet.chrome`和`browser.proxy`。 |
| `BlackHole 2ch audio device not found`                   | 在 macOS 上，在被检查的主机中安装 `blackhole-2ch` 并重启。                                                                                                                                                                                                               |
| `PipeWire-Pulse is unavailable`                          | 在 Linux 上，启动桌面用户的 `pipewire-pulse` 服务并安装 `pulseaudio-utils`；不要以 root 身份运行 node，也不要在 Chrome 用户的音频会话之外运行。                                                                                                                   |
| Chrome 打开但无法加入                             | 登录 VM 中的浏览器配置文件，或保留 `chrome.guestName` 设置。访客自动加入通过节点浏览器代理使用 OpenClaw 浏览器自动化；将节点的 `browser.defaultProfile`（或命名的现有会话配置文件）指向所需的配置文件。                   |
| Meet 标签页重复                                      | 保留 `chrome.reuseExistingTab: true`。对于相同 URL，OpenClaw 会激活现有标签页；在打开另一个标签页之前，创建操作会复用正在进行的 `.../new` 或 Google 账户提示标签页。                                                                                        |
| 无音频                                                 | 通过 OpenClaw 使用的虚拟音频路径路由 Meet mic/speaker；使用单独的虚拟设备或环回式路由来实现干净的双工音频。                                                                                                                                |

## <a id="install-notes"></a> 安装说明

Chrome 对讲默认使用 OpenClaw 未捆绑或再分发的主机音频工具：

- `sox`：命令行音频实用程序。该插件为默认 24 kHz PCM16 音频桥发出显式 CoreAudio 设备命令。
- `blackhole-2ch`：macOS 虚拟音频驱动，提供 Chrome/Meet 音频路由所使用的 `BlackHole 2ch` 设备。
- `pactl`、`pacat` 和 `parec`：Linux PulseAudio 实用程序用于 PipeWire-Pulse，以通过 `OpenClaw Meeting Audio` 进行配置和流传输。

SoX 的许可证为 `LGPL-2.0-only AND GPL-2.0-only`；BlackHole 的许可证为 GPL-3.0。如果你构建的安装程序或设备将 BlackHole 与 OpenClaw 捆绑在一起，请审查 BlackHole 上游的许可，或从 Existential Audio 获取单独许可。

## <a id="transports"></a> 传输方式

| 传输方式     | 适用场景                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| `chrome`      | Chrome/audio 位于网关主机上                                                        |
| `chrome-node` | Chrome/audio 位于配对节点上（例如 Parallels macOS VM）                        |
| `twilio`      | 通过 Voice Call 插件进行电话拨入回退，当无法使用 Chrome 参与时使用 |

### Chrome

通过 OpenClaw 浏览器控件打开 Meet URL 并作为登录的 OpenClaw 浏览器配置文件加入。对于对讲模式，插件会在浏览器工作之前检查或配置主机的本机虚拟音频后端。本地 Chrome 此时还运行任何配置的音频桥健康命令； `chrome-node` 在启动桥接时在节点上运行该检查。对讲桥仅在浏览器运行状况确认虚拟 input/output 音频路由后启动。对于本地Chrome，选择带有`browser.defaultProfile`的配置文件； `chrome.browserProfile` 被传递到 `chrome-node` 主机。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

通过生成的输入命令，共享浏览器桥可以独立于助理输出捕获参与者回放。本机后端将助理音频注入 Meet 的虚拟麦克风，并捕获该注入以进行波形验证。远程播放远离麦克风总线，并且相同的路径在本地或配对节点上运行。显式 `chrome.audioInputCommand` 覆盖保留其配置的提供程序输入路径。实时需要托管隔离捕获，因此在选择输入覆盖之前将其删除。如果所需的本机后端或浏览器捕获不可用，则加入会失败并出现音频路径错误。

如果 OpenClaw 获取命令对音频桥后启动失败，它会在回滚失败连接打开的选项卡之前尝试停止该桥。此启动清理不会影响重用或采用的选项卡，包括 `chrome.launch: false` 会话。 Node 清理目标是返回的桥 ID；如果节点启动在返回 ID 之前失败，则网关无法保证远程桥清理。外部桥命令管理它们自己的进程生命周期。

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
          // or set "twilio" if Twilio should be the default
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
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
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

插件启用和配置更改会自动应用默认的混合重新加载模式（请参阅 [Hot reload](/gateway/configuration/hot-reload)）。如果您更改了网关的进程环境，请使用这些可用变量重新启动它。核实：

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
