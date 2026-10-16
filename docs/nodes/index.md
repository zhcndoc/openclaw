---
summary: "节点：camera/screen/device/notifications/system 和 macOS 小部件面板的配对、功能、权限和 CLI 帮助程序"
read_when:
  - "将 iOS/watchOS/Android 节点配对到网关"
  - "在配对节点上启用隔离的 OpenClaw 会话托管"
  - "使用节点摄像头或屏幕截图来获取代理上下文"
  - "在 Mac 上呈现托管小部件"
  - "添加新的节点命令或 CLI 辅助工具"
title: "节点"
doc-schema-version: 1
---

**node** 是配套设备 （macOS/iOS/watchOS/Android/headless），它通过 `role: "node"` 连接到网关并公开命令表面 （e.g. `camera.*`、`device.*`、`notifications.*`、 `system.*`）通过 `node.invoke`。大多数节点在操作员端口上使用网关 WebSocket。可选的直接 Apple Watch 节点在同一端口上使用签名的 HTTPS 轮询，因为 watchOS 会阻止普通应用程序的通用低级网络。协议详细信息：[网关协议](/gateway/protocol)。

macOS 还可以在 **节点模式下运行**：菜单栏应用程序作为一个节点连接到网关的 WS 服务器（因此 `openclaw nodes …` 在此 Mac 上运行）。该应用程序将本机小部件面板、相机、屏幕、通知和计算机控制命令添加到 `openclaw node run` 使用的同一节点主机命令表面。不要在该 Mac 上启动第二个 CLI 节点；该应用程序作为内部工作人员运行匹配的 CLI 节点主机运行时，并保留唯一的网关连接和节点身份。该应用程序的 **Instances** UI 以友好的硬件名称显示每个设备；请参阅 [ 设备模型数据库 ](/reference/device-models) 了解 Apple 模型标识符的销售和映射方式。

节点是**外设**，不是网关：它们不运行网关服务，且频道消息（Telegram、WhatsApp 等）会到达网关，而不是节点。

故障排查运行手册：[/nodes/troubleshooting](/nodes/troubleshooting)。

## <a id="node-pages"></a> Node 页数

设置节点：

- [节点配对和状态](/nodes/pairing-and-status) - 批准节点、读取其状态和主机统计信息，并按顺序升级队列。
- [运行节点主机](/nodes/node-host) - 前台、服务、SSH-隧道和无头主机、其身份状态和系统命令。

给一个节点工作：

- [在节点上运行命令](/nodes/node-exec) - 白名单命令，在节点上指向 exec，调用原始 RPC，并绑定目标。
- [节点托管的 MCP 服务器和技能](/nodes/mcp-and-skills) - 发布 MCP 工具、技能以及来自节点机器的本地模型推理。
- [在节点上托管 OpenClaw 会话](/nodes/session-hosting) - 工作线程会话托管、设备放置、容量和容器隔离。
- [节点会话目录](/nodes/session-catalogs) - Codex、Claude、OpenCode 和 Pi 在网关和配对节点上发现的会话。
- [节点文件传输](/nodes/file-transfers) - 终端上传和文件传输插件的目录列表、获取和写入工具。

管理和调用设备功能：

- [Node 命令策略](/nodes/command-policy) - 平台默认允许列表、危险命令选择和 `gateway.nodes` 配置。
- [节点设备命令](/nodes/device-commands) - 小组件面板、相机、屏幕录制、位置、SMS 和设备数据帮助程序。

Node 深度功能：

- [活动计算机状态](/nodes/presence) - 网关将哪台 Mac 视为活动计算机，以及节点警报发生的位置。
- [相机捕获](/nodes/camera) - 每个平台的照片和剪辑限制以及捕获管道。
- [计算机使用](/nodes/computer-use) - 配对节点上的桌面控制及其周围的门。
- [位置命令](/nodes/location-command) - `location.get` 的完整参数和响应形状。
- [通话模式](/nodes/talk) - 节点上的实时语音对话。
- [语音唤醒](/nodes/voicewake) - 节点上的唤醒字捕获。
- [媒体理解](/nodes/media-understanding) - 代理如何读取节点捕获的媒体。
- [媒体播放](/nodes/media-playback) - 通过节点播放音频和视频。
- [图像和媒体支持](/nodes/images) - 图像格式和附件处理。
- [音频和语音注释](/nodes/audio) - 音频捕获和语音注释处理。
- [节点故障排除](/nodes/troubleshooting) - 配对、前台、权限和工具故障。
- [`openclaw nodes`](/cli/nodes) - 用于列出、检查和管理节点的 CLI 参考。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个锚点仍然在此处解析。下面的每个条目都带有原始锚点并链接到其新家。

**[节点配对和状态](/nodes/pairing-and-status)**

- <a id="pairing-%2B-status" /><a id="pairing-+-status" />[配对 + 状态](/nodes/pairing-and-status#pairing-+-status)
- <a id="version-skew-and-upgrade-order" />[版本倾斜和升级顺序](/nodes/pairing-and-status#version-skew-and-upgrade-order)

**[运行节点主机](/nodes/node-host)**

- <a id="remote-node-host-(system.run)" /><a id="remote-node-host-system-run" />[远程节点主机（system.run）](/nodes/node-host#remote-node-host-system-run)
- <a id="gateway-deployments-that-cannot-host-nodes" />[无法托管节点的网关部署](/nodes/node-host#gateway-deployments-that-cannot-host-nodes)
- <a id="start-a-node-host-(foreground)" /><a id="start-a-node-host-foreground" />[启动节点主机（前台）](/nodes/node-host#start-a-node-host-foreground)
- <a id="remote-gateway-via-ssh-tunnel-(loopback-bind)" /><a id="remote-gateway-via-ssh-tunnel-loopback-bind" />[通过SSH隧道的远程网关（环回绑定）](/nodes/node-host#remote-gateway-via-ssh-tunnel-loopback-bind)
- <a id="restrict-the-node-command-surface" />[限制节点命令面](/nodes/node-host#restrict-the-node-command-surface)
- <a id="start-a-node-host-(service)" /><a id="start-a-node-host-service" />[启动节点主机（服务）](/nodes/node-host#start-a-node-host-service)
- <a id="pair-%2B-name" /><a id="pair-+-name" />[配对 + 名称](/nodes/node-host#pair-+-name)
- <a id="headless-identity-state" />[无头身份状态](/nodes/node-host#headless-identity-state)
- <a id="system-commands-(node-host-%2F-mac-node)" /><a id="system-commands-node-host-/-mac-node" />[系统命令（节点主机/mac节点）](/nodes/node-host#system-commands-node-host-/-mac-node)
- <a id="headless-node-host-(cross-platform)" /><a id="headless-node-host-cross-platform" />[无头节点主机（跨平台）](/nodes/node-host#headless-node-host-cross-platform)
- <a id="mac-node-mode" />[Mac节点模式](/nodes/node-host#mac-node-mode)

**[节点托管的 MCP 服务器和技能](/nodes/mcp-and-skills)**

- <a id="node-hosted-mcp-servers" />[节点托管的 MCP 服务器](/nodes/mcp-and-skills#node-hosted-mcp-servers)
- <a id="node-hosted-skills" />[节点托管技能](/nodes/mcp-and-skills#node-hosted-skills)
- <a id="local-model-inference" />[局部模型推理](/nodes/mcp-and-skills#local-model-inference)

**[在节点上运行命令](/nodes/node-exec)**

- <a id="allowlist-the-commands" />[允许列出命令](/nodes/node-exec#allowlist-the-commands)
- <a id="point-exec-at-the-node" />[在节点执行点](/nodes/node-exec#point-exec-at-the-node)
- <a id="invoking-commands" />[调用命令](/nodes/node-exec#invoking-commands)
- <a id="exec-node-binding" />[执行节点绑定](/nodes/node-exec#exec-node-binding)

**[节点会话目录](/nodes/session-catalogs)**

- <a id="codex-sessions-and-transcripts" />[法典会话和记录](/nodes/session-catalogs#codex-sessions-and-transcripts)
- <a id="claude-sessions-and-transcripts" />[克劳德会话和成绩单](/nodes/session-catalogs#claude-sessions-and-transcripts)
- <a id="opencode-and-pi-sessions" />[OpenCode 和 Pi 会话](/nodes/session-catalogs#opencode-and-pi-sessions)

- <a id="openclaw-sessions-and-transcripts" />[OpenClaw 会话和成绩单](/nodes/session-catalogs#openclaw-sessions-and-transcripts)

**[在节点上托管 OpenClaw 会话](/nodes/session-hosting)**

- <a id="host-openclaw-sessions" />[主机 OpenClaw 会话](/nodes/session-hosting#host-openclaw-sessions)
- <a id="isolate-hosted-worker-sessions-in-containers" />[隔离容器中的托管工作线程会话](/nodes/session-hosting#isolate-hosted-worker-sessions-in-containers)

**[节点文件传输](/nodes/file-transfers)**

- <a id="terminal-file-uploads" />[终端文件上传](/nodes/file-transfers#terminal-file-uploads)
- <a id="agent-file-transfers" />[代理文件传输](/nodes/file-transfers#agent-file-transfers)

**[节点命令策略](/nodes/command-policy)**

- <a id="command-policy" />[命令策略](/nodes/command-policy#command-policy)
- <a id="config-(openclaw.json)" /><a id="config-openclaw-json" />[Config （`openclaw.json`）](/nodes/command-policy#config-openclaw-json)
- <a id="permissions-map" />[权限图](/nodes/command-policy#permissions-map)

**[节点设备命令](/nodes/device-commands)**

- <a id="macos-widget-panel" />[macOS 小部件面板](/nodes/device-commands#macos-widget-panel)
- <a id="photos-%2B-videos-(node-camera)" /><a id="photos-+-videos-node-camera" />[照片+视频（节点摄像头）](/nodes/device-commands#photos-+-videos-node-camera)
- <a id="screen-recordings-(nodes)" /><a id="screen-recordings-nodes" />[屏幕录像（节点）](/nodes/device-commands#screen-recordings-nodes)
- <a id="location-(nodes)" /><a id="location-nodes" />[位置（节点）](/nodes/device-commands#location-nodes)
- <a id="sms-(android-nodes)" /><a id="sms-android-nodes" />[SMS（Android节点）](/nodes/device-commands#sms-android-nodes)
- <a id="device-and-personal-data-commands" />[设备和个人数据命令](/nodes/device-commands#device-and-personal-data-commands)
