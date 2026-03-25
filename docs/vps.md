---
summary: "Run OpenClaw on a Linux server or cloud VPS — provider picker, architecture, and tuning"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux Server"
sidebarTitle: "Linux Server"
---

# Linux Server

Run the OpenClaw Gateway on any Linux server or cloud VPS. This page helps you
pick a provider, explains how cloud deployments work, and covers generic Linux
tuning that applies everywhere.

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/install/railway">One-click, browser setup</Card>
  <Card title="Northflank" href="/install/northflank">One-click, browser setup</Card>
  <Card title="DigitalOcean" href="/install/digitalocean">Simple paid VPS</Card>
  <Card title="Oracle Cloud" href="/install/oracle">Always Free ARM tier</Card>
  <Card title="Fly.io" href="/install/fly">Fly Machines</Card>
  <Card title="Hetzner" href="/install/hetzner">Docker on Hetzner VPS</Card>
  <Card title="GCP" href="/install/gcp">Compute Engine</Card>
  <Card title="Azure" href="/install/azure">Linux VM</Card>
  <Card title="exe.dev" href="/install/exe-dev">VM with HTTPS proxy</Card>
  <Card title="Raspberry Pi" href="/install/raspberry-pi">ARM self-hosted</Card>
</CardGroup>

**AWS (EC2 / Lightsail / free tier)** also works well.
A community video walkthrough is available at
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(community resource -- may become unavailable).

## 云端部署工作原理

- The **Gateway runs on the VPS** and owns state + workspace.
- You connect from your laptop or phone via the **Control UI** or **Tailscale/SSH**.
- Treat the VPS as the source of truth and **back up** the state + workspace regularly.
- Secure default: keep the Gateway on loopback and access it via SSH tunnel or Tailscale Serve.
  If you bind to `lan` or `tailnet`, require `gateway.auth.token` or `gateway.auth.password`.

Related pages: [Gateway remote access](/gateway/remote), [Platforms hub](/platforms).

## VPS 上的共享公司代理

Running a single agent for a team is a valid setup when every user is in the same trust boundary and the agent is business-only.

- 保持在专用的运行环境（VPS/虚拟机/容器 + 专用操作系统用户/账户）中。
- 不要将该运行环境登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在对抗关系，按 gateway/宿主机/操作系统用户进行划分。

Security model details: [Security](/gateway/security).

## 在 VPS 上使用节点

你可以让 Gateway 保持在云端，同时在本地设备（Mac/iOS/Android/无头设备）配对 **节点**。
节点提供本地屏幕/摄像头/画布和 `system.run` 功能，而 Gateway 保持在云端。

Docs: [Nodes](/nodes), [Nodes CLI](/cli/nodes).

## 小型虚拟机和 ARM 主机的启动调优

如果在低功耗虚拟机（或 ARM 主机）上 CLI 命令执行缓慢，可以启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` improves repeated command startup times.
- `OPENCLAW_NO_RESPAWN=1` avoids extra startup overhead from a self-respawn path.
- First command run warms the cache; subsequent runs are faster.
- For Raspberry Pi specifics, see [Raspberry Pi](/install/raspberry-pi).

### systemd 调优清单（可选）

对于使用 `systemd` 的虚拟机主机，可以考虑：

- Add service env for a stable startup path:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 明确重启行为：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 优先使用 SSD 储存状态/缓存路径，减少随机 I/O 冷启动的损耗。

示例：

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

`Restart=` 策略如何帮助自动恢复：  
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。
