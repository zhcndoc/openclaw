---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw — 提供商选择器、架构和调整"
read_when:
  - "你想在 Linux 服务器或云 VPS 上运行 Gateway"
  - "你需要一张托管指南的快速地图"
  - "您需要针对 OpenClaw 进行通用 Linux 服务器调整"
title: "Linux 服务器"
sidebarTitle: "Linux 服务器"
---

在任何 Linux 服务器或云 VPS 上运行 OpenClaw 网关。此页面可帮助您选择提供商，解释云部署的工作原理，并涵盖适用于任何地方的通用 Linux 调整。

## <a id="pick-a-provider"></a> 选择提供商

<CardGroup cols={2}>
  <Card title="Azure" href="/install/azure">Linux VM</Card>
  <Card title="Daytona" href="/install/daytona">带预览 URL 的云沙箱</Card>
  <Card title="DigitalOcean" href="/install/digitalocean">简单的付费 VPS</Card>
  <Card title="exe.dev" href="/install/exe-dev">VM 与 HTTPS 代理</Card>
  <Card title="Fly.io" href="/install/fly">飞Machines</Card>
  <Card title="GCP" href="/install/gcp">计算 Engine</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner VPS</Card> 上的 Docker
  <Card title="Hostinger" href="/install/hostinger">VPS 一键设置</Card>
  <Card title="Northflank" href="/install/northflank">一键式浏览器设置</Card>
  <Card title="Oracle Cloud" href="/install/oracle">永久免费 ARM 层级</Card>
  <Card title="Railway" href="/install/railway">一键式浏览器设置</Card>
  <Card title="Render" href="/install/render">托管 Web 服务</Card>
  <Card title="Raspberry Pi" href="/install/raspberry-pi">ARM 自托管</Card>
  <Card title="Upstash Box" href="/install/upstash">SSH-托管沙箱</Card>
</CardGroup>

**AWS（EC2 / Lightsail / 免费套餐）** 也很适合。 社区视频演示可在 [x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547) 查看（社区资源——可能会变得不可用）。

## <a id="how-cloud-setups-work"></a> 云端设置如何工作

- **Gateway 运行在 VPS 上**，并拥有状态 + 工作区。
- 你可以通过 **Control UI** 或 **Tailscale/SSH** 从你的笔记本电脑或手机连接。
- 将 VPS 视为事实来源，并定期**备份**状态 + 工作区。
- 安全默认设置：将 Gateway 保持在 loopback 上，并通过 SSH 隧道或 Tailscale Serve 访问它。 如果你绑定到 `lan` 或 `tailnet`，Gateway 需要一个共享密钥 (`gateway.auth.token` or `gateway.auth.password`)，除非认证委托给了一个受信任的代理。

相关页面：[Gateway 远程访问](/gateway/remote)，[平台中心](/platforms)。

## <a id="harden-admin-access-first"></a> 先强化管理访问

在公共 VPS 上安装 OpenClaw 之前，请确定要如何管理该盒子本身。

- 对于仅 Tailnet 的管理员访问权限：首先安装 Tailscale，将 VPS 加入您的 tailnet，通过 Tailscale IP 或 MagicDNS 名称验证第二个 SSH 会话，然后限制公共SSH。
- 不使用 Tailscale：在暴露更多服务之前，对你的 SSH 路径应用等效的加固措施。
- 这与 Gateway 访问是分开的。你仍然可以让 OpenClaw 仅绑定到回环地址，并使用 SSH 隧道或 Tailscale Serve 访问仪表盘。

Tailscale- 特定网关选项位于 [Tailscale](/gateway/tailscale) 中。

## <a id="shared-company-agent-on-a-vps"></a> VPS 上的共享公司代理

当所有用户都处于同一信任边界内，且该代理仅用于业务时，为团队运行单个代理是一种有效的设置。

- 将其保留在专用运行时（VPS/VM/container + 专用 OS user/accounts）。
- 请勿将该运行时登录到个人 Apple/Google 帐户或个人 browser/password-manager 配置文件中。
- 如果用户彼此具有对抗性，请按 gateway/host/OS 用户进行拆分。

安全模型细节：[安全](/gateway/security)。

## <a id="using-nodes-with-a-vps"></a> 使用 VPS 上的节点

您可以将网关保留在云端，并在本地设备 （Mac/iOS/Android/headless） 上配对 **nodes**。节点提供本地 screen/camera 和 `system.run` 功能，而网关则保留在云中。配对的 Mac 还可以在其本机面板中显示托管小部件。

文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

## <a id="startup-tuning-for-small-vms-and-arm-hosts"></a> 小型虚拟机和 ARM 主机的启动调优

如果 CLI 命令在低性能虚拟机（或 ARM 主机）上感觉很慢，可以启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 改进了重复命令和工作进程启动时间；第一次运行会预热缓存。网关主线程保持未缓存状态，以避免同步缓存写入延迟启动或关闭；请参阅 [ 网关缓存策略](/gateway#module-compile-cache)。
- `OPENCLAW_NO_RESPAWN=1` 会将常规 Gateway 重启保持在进程内完成，从而避免额外的进程交接，并让小型主机上的 PID 跟踪更简单。
- 关于 Raspberry Pi 的具体说明，请参见 [Raspberry Pi](/install/raspberry-pi)。

### <a id="systemd-tuning-checklist-(optional)"></a><a id="systemd-tuning-checklist-optional"></a> systemd 调优检查清单（可选）

对于使用 `systemd` 的 VM 主机，请考虑：

- 为稳定的启动路径设置服务环境变量：`OPENCLAW_NO_RESPAWN=1` 和 `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 慢速主机的较长启动超时：`TimeoutStartSec=90`。
- 受管单元拥有通用重启策略：`Restart=always`、`RestartSec=5`。
- SSD- 支持 state/cache 路径的磁盘，以减少随机 I/O 冷启动损失。

标准`openclaw onboard --install-daemon`路径安装一个systemd用户单元；仅自定义特定于主机的启动设置：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
TimeoutStartSec=90
```

如果你是特意安装了系统级单元，则通过 `sudo systemctl edit openclaw-gateway.service` 来编辑它。

有关标准受管单元定义及其重新启动策略，请参阅 [Gateway Runbook](/gateway)。

有关 Linux OOM 行为、子进程受害者选择以及 `exit 137` 诊断，请参见 [Linux 内存压力和 OOM kills](/platforms/linux#memory-pressure-and-oom-kills)。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [DigitalOcean](/install/digitalocean)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
- [Ansible](/install/ansible) — 通过 Tailscale VPN 和防火墙隔离自动部署到远程 Debian/Ubuntu 服务器
- [Kubernetes](/install/kubernetes) — 当您在集群而不是单个 VPS 上运行网关时的最小 Kustomize 起点
- [macOS VM](/install/macos-vm) — 当您需要 macOS 本身 （iMessage） 而不是 Linux 主机时，沙盒 macOS VM
