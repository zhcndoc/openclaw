---
summary: "OpenClaw 的 VPS 托管中心（Oracle/Fly/Hetzner/GCP/exe.dev）"
read_when:
  - 你想在云端运行 Gateway
  - 你需要一张快速的 VPS/托管指南地图
title: "VPS 托管"
---

# VPS 托管

本中心链接到支持的 VPS/托管指南，并从高层次解释云端部署的工作原理。

## 选择提供商

- **Railway**（一键 + 浏览器设置）：[Railway](/install/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/install/northflank)
- **Oracle Cloud（永久免费）**：[Oracle](/platforms/oracle) — $0/月（永久免费，ARM；容量/注册可能不稳定）
- **Fly.io**：[Fly.io](/install/fly)
- **Hetzner（Docker）**：[Hetzner](/install/hetzner)
- **GCP（Compute Engine）**：[GCP](/install/gcp)
- **exe.dev**（虚拟机 + HTTPS 代理）：[exe.dev](/install/exe-dev)
- **AWS（EC2/Lightsail/免费套餐）**：表现良好。视频教程：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 云端部署工作原理

- **Gateway 运行在 VPS 上**，并拥有状态 + 工作空间。
- 你通过 **控制界面（Control UI）** 或 **Tailscale/SSH** 从笔记本/手机连接。
- 把 VPS 视为唯一可信来源，并**备份**状态 + 工作空间。
- 安全默认做法：将 Gateway 保持在回环接口，仅通过 SSH 隧道或 Tailscale Serve 访问。
  如果绑定到 `lan`/`tailnet`，需启用 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问： [Gateway 远程](/gateway/remote)  
平台中心： [平台](/platforms)

## VPS 上的共享公司代理

当用户处于同一信任边界（如同一公司团队），且代理仅用于业务时，这是有效的配置。

- 保持在专用的运行环境（VPS/虚拟机/容器 + 专用操作系统用户/账户）中。
- 不要将该运行环境登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在对抗关系，按 gateway/宿主机/操作系统用户进行划分。

安全模型详情： [安全](/gateway/security)

## 在 VPS 上使用节点

你可以让 Gateway 保持在云端，同时在本地设备（Mac/iOS/Android/无头设备）配对 **节点**。
节点提供本地屏幕/摄像头/画布和 `system.run` 功能，而 Gateway 保持在云端。

文档：[节点](/nodes)，[节点 CLI](/cli/nodes)

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

- `NODE_COMPILE_CACHE` 改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免因自我重启路径带来的额外启动开销。
- 第一次命令运行时会预热缓存，后续运行更快。
- 有关树莓派的具体信息，请见 [树莓派](/platforms/raspberry-pi)。

### systemd 调优清单（可选）

对于使用 `systemd` 的虚拟机主机，可以考虑：

- 为服务添加环境变量以确保稳定的启动路径：
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
