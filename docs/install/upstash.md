---
summary: "在 Upstash Box 上托管 OpenClaw，支持保活和 SSH 隧道访问"
read_when:
  - "将 OpenClaw 部署到 Upstash Box"
  - "您需要一个用于 OpenClaw 的托管 Linux 环境，并具有 SSH- 隧道仪表板访问"
title: "上传盒子"
---

在 Upstash Box 上运行一个持久的 OpenClaw Gateway，这是一个支持保活生命周期的受管理 Linux 环境。

使用 SSH 隧道访问仪表盘。不要将 Gateway 端口直接暴露给公共互联网。

## <a id="prerequisites"></a> 先决条件

- Upstash 账户
- 支持保活的 Upstash Box
- 本地机器上的 SSH 客户端

## <a id="create-a-box"></a> 创建 Box

在 Upstash Console 中创建一个 keep-alive Box。记下 Box ID（例如 `right-flamingo-14486`）以及你的 Box API key。

Upstash 在 [OpenClaw Setup](https://upstash.com/docs/box/guides/openclaw-setup) 上维护其当前的 OpenClaw Box 演练。

## <a id="connect-with-an-ssh-tunnel"></a> 使用 SSH 隧道连接

将 OpenClaw 仪表盘端口转发到本地机器。出现提示时，将你的 Box API 密钥作为 SSH 密码：

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

keepalive 选项可减少在引导过程中因空闲而导致的隧道断开。

## <a id="install-openclaw"></a> 安装 OpenClaw

首先检查Box的运行时版本，因为安装命令取决于npm版本：

```bash
node -v
npm -v
```

在 Box 内，对 npm 12 或 npm 11.16+ 使用以下命令。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
sudo npm install -g openclaw --allow-scripts=openclaw
```

## <a id="run-onboarding"></a> Run 入门

```bash
openclaw onboard --no-install-daemon
```

按照提示操作。引导完成后，复制仪表盘 URL 和 token。

## <a id="start-the-gateway"></a> 启动网关

使网关保持 SSH 隧道的环回状态，然后在后台启动一个无监督进程：

```bash
openclaw config set gateway.bind loopback
nohup openclaw gateway run > gateway.log 2>&1 &
openclaw doctor --json
```

在 SSH 隧道处于活动状态时，在本地打开仪表盘 URL：

```text
http://127.0.0.1:18789/#token=<your-token>
```

## <a id="auto-restart"></a> 自动重启

将此命令设置为 Box 初始化脚本，以便在 Box 启动时重新启动 Gateway：

```bash
nohup openclaw gateway run > gateway.log 2>&1 &
```

本指南中的入门引导有意跳过守护程序安装。 Box 初始化脚本是网关启动的单一所有者，因此两个进程不会争用相同的锁和端口。

## <a id="troubleshooting"></a> 故障排查

如果 SSH 在引导过程中卡住，请使用干净的 SSH 配置和 keepalive 重新连接：

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

这会绕过本地过时的 `~/.ssh/config` 设置，并在网络空闲期间保持隧道活动。

## <a id="next-steps"></a> 下一步

- 设置消息通道：[Channels](/channels)
- 配置网关：[网关配置](/gateway/configuration)
- 使 OpenClaw 保持最新状态：[Updating](/install/updating)
- 比较托管选项：[Linux 服务器](/vps)

## <a id="related"></a> 相关内容

- [远程访问](/gateway/remote)
- [网关安全](/gateway/security)
- [更新 OpenClaw](/install/updating)
