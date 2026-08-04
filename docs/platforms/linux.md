---
summary: "Linux 支持 + 配套应用状态"
read_when:
  - 寻找 Linux 配套应用状态
  - 在 Linux 节点主机上启用摄像头、位置或通知
  - 规划平台覆盖范围或贡献
  - 调试 Linux 上 VPS 或容器中的 OOM 杀死或退出 137
title: "Linux 应用"
---

Gateway 在 Linux 上受到完全支持，并且需要 Node。Bun 仍然可以用作依赖安装器或包脚本运行器，但它不能运行 OpenClaw，因为它不提供 `node:sqlite`。

## 桌面伴侣

OpenClaw Linux 伴侣是一个用于本地 Gateway 的 Tauri 桌面应用。它：

- 当缺失时会安装 OpenClaw CLI 和受管理的 Node 运行时；发布构建会自动安装稳定通道，而开发构建会先询问通道
- 在尝试服务变更之前会附加到健康的 Gateway
- 将 install、start、stop 和 restart 操作委托给 CLI 管理的 systemd 用户服务
- 发现附近的 Bonjour Gateways，并在按路由作用域的窗口中打开每个 Control UI，因此可以让多个
  Gateway 仪表板保持连接并同时使用
- 使用其已解析的认证 URL 打开 Gateway 提供的 Control UI
- 在首次安装后的引导模式下打开 Control UI，其中
  会提供将检测到的 Claude Code、Codex 或 Hermes memories 导入到
  agent 工作区的选项（之后也可在
  Settings → Import Memory 中进行相同导入）
- 为并置的 CLI 节点主机渲染由 agent 驱动的 Canvas 和捆绑的 A2UI 内容
- 当窗口关闭时，仍可从系统托盘访问

伴侣内嵌 WebView 中的实时语音 Talk 尚未经过验证：
shell 不会向 WebKitGTK WebView 授予麦克风捕获权限，因此
`getUserMedia` 预期会在那里失败。在此功能落地之前，请在普通浏览器中打开 Gateway 的
Control UI 以使用 [Talk 模式](/nodes/talk)。

从 `main` 构建的稳定版会在
[GitHub release](https://github.com/openclaw/openclaw/releases) 中将 `.deb` 和 AppImage 捆绑包作为该标签的资产发布，
文件名分别为 `OpenClaw-<version>-amd64.deb` 和 `OpenClaw-<version>-amd64.AppImage`，
旁边还会有一个 `SHA256SUMS.linux-app.txt` 校验文件。下载
`.deb` 后使用 `sudo apt install ./OpenClaw-<version>-amd64.deb` 安装，
或者将 AppImage 标记为可执行后直接运行。AppImage 运行时
需要 FUSE 2（`sudo apt install libfuse2`，在 Ubuntu 24.04+ 上则为 `libfuse2t64`）；
如果没有它，请使用 `APPIMAGE_EXTRACT_AND_RUN=1` 运行 AppImage。

### 媒体编解码器

伴侣使用 GStreamer 插件进行音频和视频播放。
WebM/VP9、Opus、Vorbis 和 WAV 通常通过 `plugins-good` 正常工作。
H.264/MP4、AAC 和 MP3 需要 `libav` 和/或 `plugins-bad` 软件包。
`.deb` 使用主机上的插件，并将这三个软件包全部声明为
依赖项。AppImage 会捆绑 GStreamer 媒体框架以及其 Ubuntu 构建主机上
可用的插件。对于源码构建，或重新构建任一 Linux 软件包时，请显式安装这些软件包：

```bash
sudo apt update && sudo apt install gstreamer1.0-libav gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
```

因此，发布的 AppImage 携带的是发布
工作流所安装的编解码器，而不是依赖用户系统中的 GStreamer 软件包。

你也可以从源码检出目录构建相同的软件包：

```bash
cd apps/linux/src-tauri
pnpm dlx @tauri-apps/cli@2.11.4 build --bundles deb,appimage
```

`Linux App` CI 工作流会将相同的安装包作为 `openclaw-linux-companion` 构件上传，
适用于修改应用的拉取请求以及手动运行。有关 Linux 构建依赖和开发命令，请参阅仓库中的
`apps/linux/README.md`。

### 快速聊天

使用 `Ctrl+Shift+Space` 或托盘项 **Quick Chat** 打开 Quick Chat。agent
徽章会显示已配置的头像、表情符号或字母组合；选择它可切换 agent。
消息使用所选 agent 的主会话，并遵循全局会话作用域。
原生 Rust 客户端拥有持久的 Ed25519 设备身份。它仅使用
CLI 交接中的共享令牌或密码来启动配对，然后在后续连接中存储并
优先使用 Gateway 签发的设备令牌。身份和
设备令牌位于应用配置目录中的一个模式为 `0600` 的文件内；Quick
Chat 的 WebView 不会接收任何凭据或 WebSocket。

当原生连接不可用时，Quick Chat 会显示 **Gateway
unreachable — retrying**，并在重新连接前禁用发送。已进入配对阶段的远程设备会显示 **Approve this device in the dashboard
(Nodes)**，如果 Gateway 提供了短设备 ID，则会一并显示。需要缺失共享凭据的 Gateway 会显示 **Gateway requires a
credential — open the dashboard on the gateway host**；在这种状态下不会有等待批准的配对请求。只有当服务器提供的修复指导更具体时，才会用其替换这些回退提示。
对于 TLS Gateway，CLI 会将 Gateway 证书的 SHA-256
指纹传递给应用；原生客户端会固定该证书，并单独报告 **Gateway TLS
trust failed — check the certificate fingerprint**，与宕机状态区分开来。
通过 SecretRef 配置共享密钥的 Gateways 会在 CLI 交接中省略它。已存在的配对安装会通过其存储的设备令牌继续工作，但新安装无法在共享密钥
认证下、没有该启动凭据的情况下创建待处理的配对请求。
Setup-code 和 `bootstrapToken` 的兑换需要专门的产品 UI，仍然是后续事项；Quick Chat 不会尝试这两种流程。

在 X11 上，使用 Quick Chat 中的齿轮来记录或重置自定义快捷键。
**Quick Chat shortcut** 托盘切换项可启用或禁用它，而不会禁用普通的 **Quick Chat** 托盘项。全局快捷键在 Wayland 上不可用，因此
快捷键设置会被隐藏，托盘项仍然是入口。
在一次被接受的发送之后，Quick Chat 会保持打开，并在编辑器下方流式显示所选 agent 的纯文本回复。按 `Esc` 可关闭该栏及其回复；
`Ctrl+Enter` 仍会打开仪表板。

### Canvas

Linux Canvas 使用两个协同工作的进程。`openclaw node run` 仍然是唯一的 Gateway 节点连接；捆绑的 `linux-canvas` 插件通过仅用户可访问的 Unix socket 将 `canvas.*` 调用转发到正在运行的桌面应用。该应用拥有一个按需创建的 WebView 窗口，包括捆绑的 A2UI 渲染器以及返回给 agent 的动作桥接。

该插件默认启用。只有当桌面 socket 存在于 `$XDG_RUNTIME_DIR/openclaw-canvas.sock` 时才会公开 Canvas；当 `XDG_RUNTIME_DIR` 不可用时，则使用 `/tmp/openclaw-canvas-$UID.sock`。可通过 `plugins.entries.linux-canvas.enabled: false` 将其禁用。在没有桌面应用的无头 Linux 服务器上，不会公开 Canvas。

Linux v1 使用一个 Canvas 窗口。HTTP 和 HTTPS 页面都可渲染，但 A2UI 动作仅接受来自捆绑渲染器的请求。

## CLI 和 SSH 替代方案

对于无头服务器、VPS 或远程网关，CLI 仍然是最简单的选择：

1. 安装 Node 26（推荐），或其他受支持的版本：Node 22.22.3+、Node 24.15+ 或 Node 25.9+。
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 在你的笔记本电脑上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/`，并使用已配置的共享密钥进行身份验证（默认是 token；如果 `gateway.auth.mode` 是 `"password"`，则使用密码）。

完整服务器指南：[Linux 服务器](/vps)。逐步 VPS 示例：[exe.dev](/install/exe-dev)。

## Node 功能

捆绑的 Linux Node 插件可让 CLI 的 `openclaw node` 服务无需桌面应用即可获得设备能力。只有当某项能力已启用且所需的本地工具存在时，对应命令才会向 Gateway 公布。

| 功能                                      | 默认 | 要求                                                                   |
| ----------------------------------------- | ---- | ---------------------------------------------------------------------- |
| 桌面通知 (`system.notify`)                | 开启 | 来自 libnotify 的 `notify-send` 以及桌面通知会话                       |
| 摄像头照片和短片 (`camera.*`)             | 关闭 | FFmpeg、V4L2 摄像头访问，以及用于短片音频的 PulseAudio 或 PipeWire    |
| 位置 (`location.get`)                     | 关闭 | GeoClue2 及其 `where-am-i` 演示程序                                    |

在 `openclaw.json` 中配置该插件：

```json5
{
  plugins: {
    entries: {
      "linux-node": {
        config: {
          notify: { enabled: true },
          camera: { enabled: true },
          location: { enabled: true },
        },
      },
    },
  },
}
```

更改这些设置后，请重启 node 服务。可用性会在每个进程中判断一次，并且 node 广告会在重启时重建。

Gateway 会将 node 的命令和能力范围与设备配对分开审核。首次启动时，或在启用更多能力之后，请批准待处理的范围：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

在有效的 `caps` 和 `commands` 为空之前，node 仍可以保持连接并完成设备配对，直到该批准完成。

摄像头设备必须允许服务用户读取，通常通过 `video` 组实现。当 `includeAudio` 为 true 时，摄像头短片会使用默认的 PulseAudio 或 PipeWire 音源；麦克风音频只会作为该短片轨道存在，而不是作为独立命令。位置功能要求主机的 GeoClue 策略允许 node-service 用户访问。

`camera.snap` 和 `camera.clip` 也需要通过 `gateway.nodes.commands.allow` 显式启用。有关负载、限制和错误，请参见 [Camera capture](/nodes/camera) 和 [Location command](/nodes/location-command)。

## 安装

- [入门指南](/start/getting-started)
- [安装与更新](/install/updating)
- 可选： [Bun 包工作流](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

## Gateway 服务（systemd）

使用以下任一方式安装：

```bash
openclaw onboard --install-daemon
openclaw gateway install
openclaw configure   # 提示时选择 "Gateway 服务"
```

修复或迁移现有安装：

```bash
openclaw doctor
```

`openclaw gateway install` 默认会生成一个 systemd **user** 单元。完整
的服务指南，包括适用于共享或
始终在线主机的 **system** 级单元变体，请参见 [Gateway runbook](/gateway#supervision-and-service-lifecycle)。

仅在自定义设置时才手动编写单元。最小用户单元示例
（`~/.config/systemd/user/openclaw-gateway[-<profile>].service`）：

```ini
[Unit]
Description=OpenClaw Gateway（配置文件：<profile>，v<version>）
After=network-online.target
Wants=network-online.target
StartLimitBurst=5
StartLimitIntervalSec=60

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
RestartPreventExitStatus=78
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
OOMPolicy=continue
KillMode=control-group

[Install]
WantedBy=default.target
```

手写单元不会继承 `openclaw gateway install` 为受管 Gateway 服务写入的自适应堆大小设置。请优先使用受管安装程序，或者在自定义 supervisor 中在考虑本地内存余量后设置显式堆限制。

启用它：

```bash
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## 内存压力和 OOM 杀死

在 Linux 上，当主机、虚拟机或容器 cgroup 内存耗尽时，内核会选择一个 OOM 受害者。Gateway 不是一个好的受害者，因为它持有长生命周期的会话和通道连接，所以 OpenClaw 会尽可能优先让短暂的子进程先被杀死。

对于符合条件的 Linux 子进程启动，OpenClaw 会用一个简短的 `/bin/sh` 包装器来包裹命令，将子进程自身的 `oom_score_adj` 提升到 `1000`，然后 `exec` 真正的命令。这不需要特权：进程总是可以提高自己的 OOM 分数。

覆盖的子进程表面包括：

- Supervisor 管理的命令子进程
- PTY shell 子进程
- MCP stdio 服务器子进程
- OpenClaw 启动的浏览器/Chrome 进程（通过插件 SDK 进程运行时）

该包装器仅适用于 Linux；当 `/bin/sh` 不可用，或者子进程环境将 `OPENCLAW_CHILD_OOM_SCORE_ADJ` 设为 `0`、`false`、`no` 或 `off` 时，会跳过该包装器。

验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

被覆盖的子进程预期值为 `1000`；Gateway 进程本身保持其正常分数（通常为 `0`）。

systemd 单元的 `OOMPolicy=continue` 可在临时子进程被 OOM killer 选中时保持 Gateway 服务存活，而不是将整个单元标记为失败并重启所有通道；失败的子进程/会话会报告其自身错误。

这不能替代正常的内存调优。如果 VPS 或容器反复杀死子进程，请提高内存限制、降低并发，或添加更强的资源控制（systemd `MemoryMax=`、容器内存限制）。

## 相关内容

- [安装概览](/install)
- [Linux 服务器](/vps)
- [Raspberry Pi](/platforms/raspberry-pi)
- [网关运行手册](/gateway)
- [网关配置](/gateway/configuration)。
