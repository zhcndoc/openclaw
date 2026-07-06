---
summary: "Linux 支持 + 配套应用状态"
read_when:
  - 寻找 Linux 配套应用状态
  - 规划平台覆盖范围或贡献
  - 调试 Linux OOM 杀死或 VPS/容器中的 exit 137
title: "Linux 应用"
---

Gateway 在 Linux 上得到完全支持。Node 是推荐的运行时；不推荐使用 Bun（已知存在 WhatsApp/Telegram 问题）。

目前还没有原生 Linux 配套应用。欢迎贡献。

## 快速路径（VPS）

1. 安装 Node 24（推荐）或 Node 22.19+（LTS，仍受支持）。
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 在你的笔记本电脑上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/`，并使用已配置的共享密钥进行身份验证（默认是 token；如果 `gateway.auth.mode` 是 `"password"`，则使用密码）。

完整服务器指南：[Linux Server](/vps)。逐步 VPS 示例：[exe.dev](/install/exe-dev)。

## 安装

- [快速开始](/start/getting-started)
- [安装与更新](/install/updating)
- 可选：[Bun（实验性）](/install/bun)，[Nix](/install/nix)，[Docker](/install/docker)

## Gateway service (systemd)

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
Description=OpenClaw 网关（配置文件：<profile>，v<version>）
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
