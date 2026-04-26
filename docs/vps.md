---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw —— 提供商选择、架构与调优"
read_when:
  - 你想在 Linux 服务器或云 VPS 上运行网关
  - 你需要一份快速的托管指南地图
  - 你想了解适用于 OpenClaw 的通用 Linux 调优
title: "Linux server"
sidebarTitle: "Linux Server"
---

在任意 Linux 服务器或云 VPS 上运行 OpenClaw Gateway。此页面帮助你
选择提供商，解释云端部署的工作方式，并涵盖适用于各处的通用 Linux
调优。

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/install/railway">一键，浏览器设置</Card>
  <Card title="Northflank" href="/install/northflank">一键，浏览器设置</Card>
  <Card title="DigitalOcean" href="/install/digitalocean">简单的付费 VPS</Card>
  <Card title="Oracle Cloud" href="/install/oracle">始终免费的 ARM 层</Card>
  <Card title="Fly.io" href="/install/fly">Fly 机器</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner VPS 上的 Docker</Card>
  <Card title="Hostinger" href="/install/hostinger">带一键设置功能的 VPS</Card>
  <Card title="GCP" href="/install/gcp">计算引擎</Card>
  <Card title="Azure" href="/install/azure">Linux 虚拟机</Card>
  <Card title="exe.dev" href="/install/exe-dev">带 HTTPS 代理的虚拟机</Card>
  <Card title="Raspberry Pi" href="/install/raspberry-pi">ARM 本地托管</Card>
</CardGroup>

**AWS（EC2 / Lightsail / 免费额度）** 也运行良好。
社区提供的视频逐步指南可在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
获取（社区资源 —— 可能失效）。

## 云端部署工作原理

- 网关（Gateway）在 **VPS 上运行**，并拥有状态（state）与工作空间（workspace）。
- 你通过 **控制 UI** 或 **Tailscale/SSH** 从笔记本或手机连接。
- 将 VPS 视为单一可信源，并定期 **备份** 状态与工作空间。
- 默认安全设置：保持网关监听回环地址，并通过 SSH 隧道或 Tailscale Serve 访问。
  若绑定到 `lan` 或 `tailnet`，需要设置 `gateway.auth.token` 或 `gateway.auth.password`。

相关页面：[网关远程访问](/gateway/remote)、[平台合集](/platforms)。

## 在共享公司代理上运行 VPS

当每个用户处于同一信任边界内，且代理仅用于业务用途时，单个代理运行在 VPS 上是一种有效的设置。

- 在专用的运行环境（VPS/虚拟机/容器 + 专用的操作系统用户/账户）中运行。
- 不要将该环境登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件中。
- 若用户之间存在对抗关系，需按网关/宿主机/操作系统用户进行隔离。

安全模型细节：[安全性](/gateway/security)。

## 在 VPS 上使用节点

你可以让网关保持在云端，同时在本地设备（Mac/iOS/Android/无头设备）配对 **节点**。
节点提供本地屏幕/摄像头/画布以及 `system.run` 功能，而网关保持在云端。

文档：[节点](/nodes)、[节点 CLI](/cli/nodes)。

## 小型虚拟机与 ARM 主机的启动调优

如果在低功耗虚拟机（或 ARM 主机）上 CLI 命令执行缓慢，可以启用节点的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 可避免因自重生路径带来的额外启动开销。
- 首次运行会预热缓存；后续运行速度更快。
- 关于树莓派的详细信息，请参见 [树莓派安装指南](/install/raspberry-pi)。

### systemd 调优清单（可选）

对于使用 `systemd` 的虚拟机主机，可以考虑以下设置：

- 为稳定启动路径添加服务环境变量：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 明确重启行为：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 优先使用 SSD 存储状态/缓存路径，以减少冷启动时的随机 I/O 损耗。

若使用标准 `openclaw onboard --install-daemon` 方式安装，可编辑用户单元：

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

如果显式安装了系统单元，请使用 `sudo systemctl edit openclaw-gateway.service` 编辑
`openclaw-gateway.service`。

`Restart=` 策略如何帮助自动恢复：
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery)。

关于 Linux OOM 行为、子进程受害者选择以及 `exit 137`
诊断，请参见 [Linux memory pressure and OOM kills](/platforms/linux#memory-pressure-and-oom-kills)。

## 相关内容

- [安装总览](/install)
- [DigitalOcean](/install/digitalocean)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
