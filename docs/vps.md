---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw — 提供商选择、架构与调优"
read_when:
  - 你想在 Linux 服务器或云 VPS 上运行 Gateway
  - 你需要一张托管指南的快速地图
  - 你想了解适用于 OpenClaw 的通用 Linux 调优
title: "Linux 服务器"
sidebarTitle: "Linux 服务器"
---

在任何 Linux 服务器或云 VPS 上运行 OpenClaw Gateway。此页面可帮助你
选择提供商，解释云部署的工作方式，并介绍适用于各处的通用 Linux
调优。

## 选择提供商

<CardGroup cols={2}>
  <Card title="Azure" href="/install/azure">Linux 虚拟机</Card>
  <Card title="DigitalOcean" href="/install/digitalocean">简单的付费 VPS</Card>
  <Card title="exe.dev" href="/install/exe-dev">带 HTTPS 代理的虚拟机</Card>
  <Card title="Fly.io" href="/install/fly">Fly 机器</Card>
  <Card title="GCP" href="/install/gcp">计算引擎</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner VPS 上的 Docker</Card>
  <Card title="Hostinger" href="/install/hostinger">一键设置的 VPS</Card>
  <Card title="Northflank" href="/install/northflank">一键式浏览器设置</Card>
  <Card title="Oracle Cloud" href="/install/oracle">永久免费 ARM 层</Card>
  <Card title="Railway" href="/install/railway">一键式浏览器设置</Card>
  <Card title="Raspberry Pi" href="/install/raspberry-pi">ARM 自托管</Card>
</CardGroup>

**AWS（EC2 / Lightsail / 免费套餐）** 也很适合。
社区视频演示可在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
查看（社区资源——可能会变得不可用）。

## 云端设置如何工作

- **Gateway 运行在 VPS 上**，并拥有状态 + 工作区。
- 你可以通过 **Control UI** 或 **Tailscale/SSH** 从你的笔记本电脑或手机连接。
- 将 VPS 视为事实来源，并定期**备份**状态 + 工作区。
- 安全默认设置：将 Gateway 保持在 loopback 上，并通过 SSH 隧道或 Tailscale Serve 访问它。  
  如果你绑定到 `lan` 或 `tailnet`，Gateway 需要一个共享密钥  
  (`gateway.auth.token` or `gateway.auth.password`)，除非认证委托给了一个  
  受信任的代理。

相关页面：[Gateway 远程访问](/gateway/remote)，[平台中心](/platforms)。

## 先强化管理访问

在公共 VPS 上安装 OpenClaw 之前，先决定你要如何管理
这台机器本身。

- 对于仅通过 Tailnet 的管理访问：先安装 Tailscale，将 VPS 加入你的
  tailnet，验证通过 Tailscale IP 或 MagicDNS 名称建立的第二个 SSH 会话，
  然后限制公共 SSH。
- 不使用 Tailscale：在暴露更多服务之前，对你的 SSH 路径应用等效的加固措施。
- 这与 Gateway 访问是分开的。你仍然可以让 OpenClaw 仅绑定到回环地址，并使用 SSH 隧道或 Tailscale Serve 访问仪表盘。

Tailscale 特定的 Gateway 选项位于 [Tailscale](/gateway/tailscale)。

## VPS 上的共享公司代理

当所有用户都处于同一信任边界内，且该代理仅用于业务时，为团队运行单个代理是一种有效的设置。

- 将其保留在专用运行环境中（VPS/VM/容器 + 专用 OS 用户/账户）。
- 不要让该运行环境登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件。
- 如果用户彼此之间存在对抗关系，请按 gateway/主机/OS 用户拆分。

安全模型细节：[安全](/gateway/security)。

## 使用 VPS 上的节点

你可以将 Gateway 保持在云端，并在本地设备
（Mac/iOS/Android/无头设备）上配对 **节点**。节点提供本地屏幕/摄像头/画布和 `system.run`
能力，而 Gateway 仍保留在云端。

文档：[节点](/nodes)，[节点 CLI](/cli/nodes)。

## 小型虚拟机和 ARM 主机的启动调优

如果 CLI 命令在低性能虚拟机（或 ARM 主机）上感觉很慢，可以启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可提升重复命令的启动速度；首次运行会预热缓存。
- `OPENCLAW_NO_RESPAWN=1` 会将常规 Gateway 重启保持在进程内完成，从而避免额外的进程交接，并让小型主机上的 PID 跟踪更简单。
- 关于 Raspberry Pi 的具体说明，请参见 [Raspberry Pi](/install/raspberry-pi)。

### systemd 调优检查清单（可选）

对于使用 `systemd` 的虚拟机主机，可以考虑：

- 为稳定的启动路径设置服务环境变量：`OPENCLAW_NO_RESPAWN=1` 和
  `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 明确的重启行为：`Restart=always`、`RestartSec=2`、`TimeoutStartSec=90`
- 将状态/缓存路径放在 SSD 上，以减少随机 I/O 导致的冷启动开销。

标准的 `openclaw onboard --install-daemon` 路径会安装一个 systemd 用户
单元；使用以下命令进行编辑：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

如果你是特意安装了系统级单元，则通过
`sudo systemctl edit openclaw-gateway.service` 来编辑它。

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

有关 Linux OOM 行为、子进程受害者选择以及 `exit 137`
诊断，请参见 [Linux 内存压力和 OOM kills](/platforms/linux#memory-pressure-and-oom-kills)。

## 相关内容

- [安装概览](/install)
- [DigitalOcean](/install/digitalocean)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
