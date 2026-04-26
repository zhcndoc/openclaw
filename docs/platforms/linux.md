---
summary: "Linux 支持 + 伴侣应用状态"
read_when:
  - 寻找 Linux 伴侣应用状态
  - 规划平台覆盖范围或参与贡献
  - 调试 Linux OOM 杀死或 VPS/容器中的 exit 137
title: "Linux 应用"
---

Gateway 在 Linux 上获得全面支持。**推荐使用 Node 作为运行时**。
不建议在 Gateway 中使用 Bun（存在 WhatsApp/Telegram 错误）。

计划开发原生 Linux 伴侣应用。如果你想帮助开发，欢迎贡献代码。

## 初学者快速路径（VPS）

1. 安装 Node 24（推荐；Node 22 LTS，目前 `22.14+`，也可用于兼容性）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从你的笔记本电脑执行：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/`，并使用已配置的共享密钥进行身份验证（默认是 token；如果你设置了 `gateway.auth.mode: "password"`，则使用密码）

完整的 Linux 服务器指南：[Linux Server](/vps)。分步 VPS 示例：[exe.dev](/install/exe-dev)

## 安装

- [入门指南](/start/getting-started)
- [安装与更新](/install/updating)
- 可选流程：[Bun（实验性）](/install/bun)、[Nix](/install/nix)、[Docker](/install/docker)

## Gateway

- [Gateway 运行手册](/gateway)
- [配置](/gateway/configuration)

## Gateway 服务安装（CLI）

使用以下命令之一：

```
openclaw onboard --install-daemon
```

或者：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

提示时选择 **Gateway 服务**。

修复/迁移：

```
openclaw doctor
```

## 系统控制（systemd 用户单元）

OpenClaw 默认安装一个 systemd **用户**服务。对于共享或始终在线的服务器，请使用 **系统**服务。`openclaw gateway install` 和
`openclaw onboard --install-daemon` 已经为你渲染了当前的标准单元；
仅在需要自定义 system/service-manager
设置时才手动编写。完整的服务指南见 [Gateway runbook](/gateway)。

最简设置：

创建 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## 内存压力和 OOM 杀死

在 Linux 上，当主机、虚拟机或容器 cgroup 的内存耗尽时，内核会选择一个 OOM 受害者。Gateway 可能不是一个合适的受害者，因为它持有长期运行的会话和通道连接。因此，OpenClaw 会在可能的情况下倾向于先终止临时子进程，而不是 Gateway。

对于符合条件的 Linux 子进程启动，OpenClaw 会通过一个简短的 `/bin/sh` 包装器启动子进程，将子进程自身的 `oom_score_adj` 提升到 `1000`，然后 `exec` 真实命令。这是一种无需特权的操作，因为子进程只是提高了自己被 OOM 杀死的可能性。

覆盖的子进程表面包括：

- 由 supervisor 管理的命令子进程，
- PTY shell 子进程，
- MCP stdio 服务器子进程，
- OpenClaw 启动的浏览器/Chrome 进程。

该包装器仅适用于 Linux，并且在 `/bin/sh` 不可用时会跳过。如果子进程环境设置了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、
`no` 或 `off`，也会跳过。

验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

受覆盖子进程的预期值是 `1000`。Gateway 进程应保持其正常分数，通常为 `0`。

这不能替代正常的内存调优。如果 VPS 或容器反复杀死子进程，请提高内存限制、降低并发，或添加更强的资源控制，例如 systemd `MemoryMax=` 或容器级内存限制。

## 相关内容

- [安装概览](/install)
- [Linux 服务器](/vps)
- [Raspberry Pi](/platforms/raspberry-pi)
