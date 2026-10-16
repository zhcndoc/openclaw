---
summary: "在 Oracle Cloud 的 Always Free ARM 资源层上托管 OpenClaw"
read_when:
  - "在 Oracle Cloud 上设置 OpenClaw"
  - "正在寻找 OpenClaw 的免费 VPS 托管"
  - "想在小型服务器上 24/7 运行 OpenClaw"
title: "甲骨文云"
---

在 Oracle Cloud 的 **Always Free** ARM 层上运行持久性 OpenClaw 网关（最多 4 个 OCPU、24 个 GB RAM、200 个 GB存储）免费。

## <a id="prerequisites"></a> 先决条件

- Oracle Cloud 账户（[注册](https://www.oracle.com/cloud/free/)）-- 如果遇到问题，请参阅 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账户（在 [tailscale.com](https://tailscale.com) 免费）
- 一对 SSH 密钥
- 约 30 分钟

## <a id="setup"></a> 设置

<Steps>
  <Step id="create-an-oci-instance" title="创建OCI实例">
    1. 登录 [Oracle Cloud Console](https://cloud.oracle.com/)。
    2. 导航到 **Compute > Instances > Create Instance**。
    3. 配置：
       - **名称：** `openclaw`
       - **镜像：** Ubuntu 24.04 (aarch64)
       - **形状：** `VM.Standard.A1.Flex`（Ampere ARM）
       - **OCPU：** 2（或最多 4 个）
       - **内存：** 12 GB（最多可到 24 GB）
       - **启动卷：** 50 GB（免费额度最多 200 GB）
       - **SSH 密钥：** 添加你的公钥
    4. 点击 **Create** 并记下公网 IP 地址。

    <Tip>
    如果实例创建失败并提示 "Out of capacity"，请尝试其他可用域，或稍后重试。免费层容量有限。
    </Tip>

  </Step>

  <Step id="connect-and-update-the-system" title="连接并更新系统">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是某些依赖在 ARM 上编译所必需的。

  </Step>

  <Step id="configure-user-and-hostname" title="配置用户和主机名">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    启用 linger 后，即使注销，用户服务也会继续运行。

  </Step>

  <Step id="install-tailscale" title="安装Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    从现在开始，通过 Tailscale 连接：`ssh ubuntu@openclaw`。

  </Step>

  <Step id="install-openclaw" title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    当安装程序提出孵化代理时，请推迟它 - 下面的网关步骤首先配置主机。

  </Step>

  <Step id="configure-the-gateway" title="配置网关">
    使用 token 认证与 Tailscale Serve 以实现安全的远程访问。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    openclaw gateway install
    systemctl --user restart openclaw-gateway.service
    ```

    这里的`gateway.trustedProxies=["127.0.0.1"]`仅用于本地Tailscale Serve代理的转发-IP/local-client处理。是**不是** `gateway.auth.mode: "trusted-proxy"`。差异查看器路由仍然拒绝在此设置中无法验证的请求：没有转发代理标头的原始 `127.0.0.1` 查看器请求返回 `Diff not found`。如果您需要可共享的查看器链接，请使用 `mode=file` / `mode=both` 作为附件，或者有意启用远程查看器并设置 `plugins.entries.diffs.config.viewerBaseUrl`（或传递代理 `baseUrl`）。

  </Step>

  <Step id="lock-down-vcn-security" title="锁定VCN安全">
    在网络边缘阻止除 Tailscale 之外的所有流量：

    1. Go 到 **网络 > 虚拟云网络**（位于 OCI 控制台中）。
    2. 点击你的 VCN，然后进入 **Security Lists > Default Security List**。
    3. **移除**除 `0.0.0.0/0 UDP 41641`（Tailscale）之外的所有入站规则。
    4. 保留默认出站规则（允许所有出站流量）。

    这会在网络边缘阻止 22 端口上的 SSH、HTTP、HTTPS 以及其他所有流量。从此以后，你只能通过 Tailscale 连接。

  </Step>

  <Step id="verify" title="验证">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    在你的 tailnet 中的任意设备上访问 Control UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    将 `<tailnet-name>` 替换为你的 tailnet 名称（可在 `tailscale status` 中看到）。

  </Step>
</Steps>

## <a id="verify-the-security-posture"></a> 验证安全态势

在 VCN 已锁定（仅开放 UDP 41641）且 Gateway 绑定到 loopback 的情况下，公共流量会在网络边缘被阻止，管理访问仅限 tailnet 内。这使得若干传统 VPS 加固步骤不再需要：

| 传统步骤   | 需要吗？     | 原因                                                                       |
| ------------------ | ----------- | ------------------------------------------------------------------------- |
| UFW 防火墙       | No          | VCN 会在流量到达实例前将其阻止。                    |
| 失败2禁止           | No          | 22 端口在 VCN 处已被阻止；没有暴力破解面。                    |
| sshd 加固     | No          | Tailscale SSH 不使用 sshd。                                          |
| 禁用 root 登录 | No          | Tailscale 通过 tailnet 身份进行认证，而不是系统用户。            |
| 仅限 SSH 密钥认证  | No          | 同上——tailnet 身份取代了系统 SSH 密钥。                        |
| IPv6 硬化     | 通常不会 | 取决于 VCN/subnet 设置；验证实际上是什么 assigned/exposed. |

仍然建议：

- `chmod 700 ~/.openclaw`，以限制凭据文件权限。
- `openclaw security audit` 用于 OpenClaw- 特定姿势检查。
- OS 补丁的常规 `sudo apt update && sudo apt upgrade`。
- 定期在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 中检查设备。

快速验证命令：

```bash
# Confirm no public ports are listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely once Tailscale SSH is confirmed working
sudo systemctl disable --now ssh
```

## <a id="arm-notes"></a> ARM 说明

Always Free 层是 ARM（`aarch64`）。大多数 OpenClaw 功能都能正常工作；少量原生二进制文件需要 ARM 构建：

- Node.js、Telegram、WhatsApp（Baileys）：纯 JavaScript，无问题。
- 大多数带有原生代码的 npm 包：有预构建的 `linux-arm64` 工件。
- 可选的CLI帮助程序（由技能提供的e.g. Go/Rust二进制文件）：在安装之前检查`aarch64` / `linux-arm64`版本。

使用 `uname -m` 验证架构（应输出 `aarch64`）。对于没有 ARM 构建的二进制文件，请从源码安装或跳过。

## <a id="persistence-and-backups"></a> 持久化与备份

OpenClaw 的状态位于：

- `~/.openclaw/` -- `openclaw.json`、共享和每个代理 SQLite 身份验证存储、channel/provider 状态和会话数据。
- `~/.openclaw/workspace/`——代理工作区（SOUL.md、内存、工件）。

这些在重新启动后仍然存在。要创建备份存档：

```bash
openclaw backup create
openclaw backup restore <archive.tar.gz> --target <fresh-directory>
```

绝对符号链接保留其原始目标位置，包括指向单独备份的配置或凭据的链接。在激活另一台主机或另一条路径上的状态之前查看这些链接；请参阅 [ 备份符号链接警告 ](/cli/backup#what-gets-backed-up)。恢复验证并提取到新的暂存目录中；激活是一个单独的离线步骤。有关回滚警告和激活顺序，请参阅 [ 恢复完整存档 ](/install/backups#restore-a-full-archive)。

## <a id="fallback%3A-ssh-tunnel"></a><a id="fallback-ssh-tunnel"></a> 备用方案：SSH 隧道

如果 Tailscale Serve 无法工作，请从你的本地机器使用 SSH 隧道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

## <a id="troubleshooting"></a> 故障排查

**实例创建失败（"Out of capacity"）** -- 免费层 ARM 实例很受欢迎。请尝试其他可用域，或在非高峰时段重试。

**Tailscale 无法连接** -- 运行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新认证。

**Gateway 不会启动** -- 运行 `openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**ARM 二进制问题** -- 大多数 npm 包都能在 ARM64 上运行。对于原生二进制文件，请查找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 验证架构。

## <a id="next-steps"></a> 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [网关配置](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 使 OpenClaw 保持最新

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [GCP](/install/gcp)
- [VPS 托管](/vps)
