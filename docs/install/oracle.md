---
summary: "在 Oracle Cloud 的 Always Free ARM 套餐上托管 OpenClaw"
read_when:
  - 在 Oracle Cloud 上设置 OpenClaw
  - 寻找用于 OpenClaw 的免费 VPS 托管
  - 想要在小型服务器上 24/7 运行 OpenClaw
title: "Oracle Cloud"
---

在 Oracle Cloud 的 **Always Free** ARM 套餐（最高 4 个 OCPU、24 GB RAM、200 GB 存储）上免费运行一个持久的 OpenClaw Gateway。

## 前提条件

- Oracle Cloud 账户（[注册](https://www.oracle.com/cloud/free/)）-- 如果遇到问题，请参阅 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账户（可在 [tailscale.com](https://tailscale.com) 免费获取）
- 一对 SSH 密钥
- 大约 30 分钟

## 设置

<Steps>
  <Step title="创建 OCI 实例">
    1. 登录 [Oracle Cloud Console](https://cloud.oracle.com/)。
    2. 导航到 **Compute > Instances > Create Instance**。
    3. 配置：
       - **名称：** `openclaw`
       - **镜像：** Ubuntu 24.04 (aarch64)
       - **形状：** `VM.Standard.A1.Flex`（Ampere ARM）
       - **OCPU：** 2（最多可到 4）
       - **内存：** 12 GB（最多可到 24 GB）
       - **启动卷：** 50 GB（免费最多可到 200 GB）
       - **SSH 密钥：** 添加你的公钥
    4. 点击 **Create** 并记下公网 IP 地址。

    <Tip>
    如果实例创建失败并提示 "Out of capacity"，请尝试其他可用域或稍后重试。免费套餐容量有限。
    </Tip>

  </Step>

  <Step title="连接并更新系统">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是某些依赖项在 ARM 上编译所必需的。

  </Step>

  <Step title="配置用户和主机名">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    启用 linger 可在退出登录后继续运行用户服务。

  </Step>

  <Step title="安装 Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    从现在开始，通过 Tailscale 连接：`ssh ubuntu@openclaw`。

  </Step>

  <Step title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    当提示“你想如何孵化你的机器人？”时，选择 **Do this later**。

  </Step>

  <Step title="配置网关">
    使用 token auth 与 Tailscale Serve 进行安全远程访问。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    这里的 `gateway.trustedProxies=["127.0.0.1"]` 仅用于本地 Tailscale Serve 代理的转发 IP / 本地客户端处理。它**不是** `gateway.auth.mode: "trusted-proxy"`。在此设置中，Diff viewer 路由保持 fail-closed 行为：没有转发代理头的原始 `127.0.0.1` 查看器请求可能会返回 `Diff not found`。如果需要附件，请使用 `mode=file` / `mode=both`；或者，如果你需要可共享的查看器链接，请有意启用远程查看器并设置 `plugins.entries.diffs.config.viewerBaseUrl`（或传入代理 `baseUrl`）。

  </Step>

  <Step title="锁定 VCN 安全性">
    在网络边缘阻止除 Tailscale 之外的所有流量：

    1. 在 OCI Console 中进入 **Networking > Virtual Cloud Networks**。
    2. 点击你的 VCN，然后点击 **Security Lists > Default Security List**。
    3. **移除**除 `0.0.0.0/0 UDP 41641`（Tailscale）之外的所有入站规则。
    4. 保留默认出站规则（允许所有出站流量）。

    这会在网络边缘阻止 22 端口上的 SSH、HTTP、HTTPS 以及其他所有流量。从此以后，你只能通过 Tailscale 连接。

  </Step>

  <Step title="验证">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    从 tailnet 中任意设备访问 Control UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    将 `<tailnet-name>` 替换为你的 tailnet 名称（可在 `tailscale status` 中看到）。

  </Step>
</Steps>

## 备用方案：SSH 隧道

如果 Tailscale Serve 无法工作，请从本地机器使用 SSH 隧道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

## 故障排除

**实例创建失败（"Out of capacity"）** -- 免费套餐的 ARM 实例很受欢迎。请尝试其他可用域或在低峰时段重试。

**Tailscale 无法连接** -- 运行 `sudo tailscale up --ssh --hostname=openclaw --reset` 重新进行身份验证。

**网关无法启动** -- 运行 `openclaw doctor --non-interactive`，并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**ARM 二进制问题** -- 大多数 npm 包都可在 ARM64 上运行。对于原生二进制文件，请查找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 验证架构。

## 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway configuration](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 保持 OpenClaw 为最新版本

## 相关内容

- [Install overview](/install)
- [GCP](/install/gcp)
- [VPS hosting](/vps)
