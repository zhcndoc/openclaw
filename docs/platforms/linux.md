---
summary: "Linux 支持 + 伴侣应用状态"
read_when:
  - 查找 Linux 伴侣应用状态
  - 规划平台覆盖或贡献
title: "Linux 应用"
---

# Linux 应用

Gateway 在 Linux 上完全支持。**推荐使用 Node 作为运行时**。
不建议在 Gateway 上使用 Bun（WhatsApp/Telegram 存在 BUG）。

计划开发原生 Linux 伴侣应用。如果你想帮助开发，欢迎贡献代码。

## 初学者快速路径（VPS）

1. 安装 Node 24（推荐；Node 22 LTS，目前 `22.14+`，也可用于兼容性）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从你的笔记本电脑上执行：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并粘贴你的令牌

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

默认情况下，OpenClaw 安装了一个 systemd **用户**服务。对于共享或常在线服务器，请使用 **系统** 服务。完整的单元示例和指导请见 [Gateway 运行手册](/gateway)。

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

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
