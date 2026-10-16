---
summary: "在带有 Docker 的 Hetzner VPS 上运行 OpenClaw 网关 24/7"
doc-schema-version: 1
read_when:
  - "您希望 OpenClaw 在 Hetzner VPS 上 24/7 运行"
  - "您需要 Hetzner 配置、防火墙或 SSH 隧道指导"
  - "您想要云上有一个持久的 Docker 网关 VM"
title: "Hetzner"
---

在 Debian 或 Ubuntu Hetzner VPS 上运行持久 OpenClaw 网关。本页涵盖 Hetzner 配置、主机安全和访问；共享的 [Docker VM Runtime](/install/docker-vm-runtime) 页面拥有容器设置、持久性、自定义二进制文件、验证和更新。

将 VPS 视为有状态基础设施。将个人浏览器、Apple、Google 和密码管理器配置文件保留在公司共享运行时之外。如果用户不共享一个信任边界，请将其拆分到网关、主机或 OS 用户之间。请参阅 [ 网关安全 ](/gateway/security) 和 [VPS 托管 ](/vps)。

## <a id="what-you-need"></a> 准备工作

- A Hetzner VPS 具有 root 访问权限
- 从你的笔记本电脑进行 SSH 访问
- A Hetzner 云防火墙或主机防火墙
- 模型和可选通道凭证
- 大约 20 分钟。

## <a id="provision-and-secure-the-vps"></a> 配置和保护VPS

<Steps>
  <Step id="create-the-server" title="创建服务器">
    在 Hetzner 云中，创建一个 Debian 或 Ubuntu 服务器，其中至少有 6 个 GB RAM 用于源映像构建。在较小的服务器上，使用 [Docker VM 运行时](/install/docker-vm-runtime) 中描述的官方预构建映像。 Add your SSH key during provisioning。

    以 root 身份连接：

    ```bash
    ssh root@<vps-ip>
    ```

  </Step>

  <Step id="restrict-inbound-traffic" title="限制入站流量">
    连接 Hetzner 云防火墙，允许 TCP 22 来自您的管理网络。不添加TCP 18789的公共入站规则；下面的隧道通过 SSH 到达该端口。

    如果您还在主机上使用 UFW，请在启用之前允许 SSH：

    ```bash
    apt-get update
    apt-get install -y ufw
    ufw allow OpenSSH
    ufw enable
    ufw status verbose
    ```

    如果您有意通过反向代理或tailnet发布网关，请遵循[Gateway security](/gateway/security)，而不是直接向`0.0.0.0/0`开放容器端口。

  </Step>

  <Step id="install-docker" title="安装Docker">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    docker --version
    docker compose version
    ```

  </Step>
</Steps>

## <a id="configure-the-docker-runtime"></a> 配置Docker运行时

在 VPS 上，按照 [Docker VM 运行时 ](/install/docker-vm-runtime) 从 **开始之前** 到 **验证并管理网关**。维护的安装脚本默认使用这些 root 拥有的主机路径：

```bash
export OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
export OPENCLAW_WORKSPACE_DIR="$HOME/.openclaw/workspace"
export OPENCLAW_AUTH_PROFILE_SECRET_DIR="$HOME/.openclaw-auth-profile-secrets"
```

如果源构建以 `Killed` 或退出代码 137 结束，请在重试之前调整服务器大小。请参阅二进制烘焙的共享指南、完整的持久性映射和更新命令。

## <a id="access-the-control-ui"></a> 访问Control UI

首先确认VPS SSH守护进程允许本地端口转发。在 `/etc/ssh/sshd_config` 中，使用：

```text
AllowTcpForwarding local
```

`local` 允许来自笔记本电脑的 `ssh -L`，同时阻止来自服务器的远程转发。更改后，验证并重新启动SSH：

```bash
sshd -t
systemctl restart ssh
```

从您的笔记本电脑上，打开隧道并使其保持运行：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@<vps-ip>
```

打开 `http://127.0.0.1:18789/` 并粘贴 VPS `.env` 中的网关令牌。要重新打印仪表板 URL 或批准浏览器设备，请在 VPS 上运行：

```bash
cd openclaw
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

如果隧道失败并显示`administratively prohibited`，请重新检查`AllowTcpForwarding`和SSH服务配置。云防火墙只需要接纳SSH即可；它不需要承认端口18789。

## <a id="infrastructure-as-code"></a> 基础设施即代码

对于喜欢 Terraform 的团队，社区维护的项目提供远程状态、cloud-init 配置、部署和备份脚本、防火墙强化和 SSH 隧道设置：

- [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- [openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

<Note>
这些存储库由社区维护。报告问题并在各自的存储库中做出贡献。
</Note>

## <a id="next-steps"></a> 下一步

- [频道](/channels)
- [网关配置](/gateway/configuration)
- [更新](/install/docker-vm-runtime#update-openclaw)

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Docker VM Runtime](/install/docker-vm-runtime)
- [Docker](/install/docker)
- [VPS 托管](/vps)
