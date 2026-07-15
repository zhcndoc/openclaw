---
summary: "Linux 支持 + 配套应用状态"
read_when:
  - Looking for Linux companion app status
  - Enabling camera, location, or notifications on a Linux node host
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux 应用"
---

Gateway 在 Linux 上受到完全支持，并且需要 Node。Bun 仍然可以用作依赖安装器或包脚本运行器，但它不能运行 OpenClaw，因为它不提供 `node:sqlite`。

## 桌面伴侣

OpenClaw Linux 伴侣是一个用于本地 Gateway 的 Tauri 桌面应用。它：

- 在缺失时安装 OpenClaw CLI 和受管理的 Node 运行时
- 在尝试服务更改之前先连接到健康的 Gateway
- 将安装、启动、停止和重启操作委托给 CLI 管理的 systemd 用户服务
- 使用其解析后的身份验证 URL 打开 Gateway 提供的控制 UI
- 为同机部署的 CLI 节点主机渲染由 agent 驱动的 Canvas 和捆绑的 A2UI 内容
- 关闭窗口后仍可从系统托盘访问

从 `main` 构建的稳定发布版会在该 tag 的
[GitHub release](https://github.com/openclaw/openclaw/releases) 中作为资产提供 `.deb` 和 AppImage 安装包，
文件名分别为 `OpenClaw-<version>-amd64.deb` 和 `OpenClaw-<version>-amd64.AppImage`，
旁边还有一个 `SHA256SUMS.linux-app.txt` 校验和文件。下载 `.deb` 后使用
`sudo apt install ./OpenClaw-<version>-amd64.deb` 安装，或者将 AppImage 标记为可执行并直接运行它。
AppImage 运行时需要 FUSE 2（`sudo apt install libfuse2`，或者在 Ubuntu 24.04+ 上使用 `libfuse2t64`）；
如果没有它，请使用 `APPIMAGE_EXTRACT_AND_RUN=1` 运行 AppImage。

你也可以从源代码检出中构建相同的安装包：

```bash
cd apps/linux/src-tauri
pnpm dlx @tauri-apps/cli@2.11.4 build --bundles deb,appimage
```

`Linux App` CI 工作流会将相同的安装包作为 `openclaw-linux-companion` 构件上传，
适用于修改应用的拉取请求以及手动运行。有关 Linux 构建依赖和开发命令，请参阅仓库中的
`apps/linux/README.md`。

### Canvas

Linux Canvas 使用两个协同工作的进程。`openclaw node run` 仍然是唯一的 Gateway 节点连接；捆绑的 `linux-canvas` 插件通过仅用户可访问的 Unix socket 将 `canvas.*` 调用转发到正在运行的桌面应用。该应用拥有一个按需创建的 WebView 窗口，包括捆绑的 A2UI 渲染器以及返回给 agent 的动作桥接。

该插件默认启用。只有当桌面 socket 存在于 `$XDG_RUNTIME_DIR/openclaw-canvas.sock` 时才会公开 Canvas；当 `XDG_RUNTIME_DIR` 不可用时，则使用 `/tmp/openclaw-canvas-$UID.sock`。可通过 `plugins.entries.linux-canvas.enabled: false` 将其禁用。在没有桌面应用的无头 Linux 服务器上，不会公开 Canvas。

Linux v1 使用一个 Canvas 窗口。HTTP 和 HTTPS 页面都可渲染，但 A2UI 动作仅接受来自捆绑渲染器的请求。

## CLI 和 SSH 替代方案

对于无头服务器、VPS 或远程网关，CLI 仍然是最简单的选择：

1. 安装 Node 24.15+（推荐）、Node 22.22.3+（LTS）或 Node 25.9+。
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

`camera.snap` 和 `camera.clip` 还需要通过 `gateway.nodes.allowCommands` 显式启用 Gateway 许可。有关负载、限制和错误，请参见 [Camera capture](/nodes/camera) 和 [Location command](/nodes/location-command)。

## 安装

- [入门指南](/start/getting-started)
- [安装与更新](/install/updating)
- 可选： [Bun 包工作流](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

## Gateway 服务（systemd）

使用以下任一方式安装：

```bash
openclaw onboard --install-daemon
openclaw gateway install
openclaw configure   # 提示时选择 "Gateway service"
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
- [网关配置](/gateway/configuration)
