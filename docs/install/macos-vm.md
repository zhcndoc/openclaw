---
summary: "在隔离的 macOS VM 中运行 OpenClaw（本地或托管），当你需要隔离环境或 iMessage 时使用"
read_when:
  - 你想让 OpenClaw 与你的主 macOS 环境隔离
  - 你想在沙箱中使用 iMessage 集成
  - 你想要一个可重置、可克隆的 macOS 环境
  - 你想比较本地与托管的 macOS VM 选项
title: "macOS 虚拟机"
---

## 推荐默认方案（大多数用户）

- **小型 Linux VPS**，用于始终在线的 Gateway 且成本较低。请参阅 [VPS 托管](/vps)。
- **专用硬件**（Mac mini 或 Linux 机器），如果你想要完全控制，并为浏览器自动化使用 **住宅 IP**。许多网站会屏蔽数据中心 IP，因此本地浏览通常效果更好。
- **混合方案**：将 Gateway 放在廉价的 VPS 上，并在需要浏览器/UI 自动化时将你的 Mac 作为 **节点** 连接。请参阅 [节点](/nodes) 和 [远程 Gateway](/gateway/remote)。

仅在你明确需要仅限 macOS 的功能（例如 iMessage），或者希望与日常使用的 Mac 严格隔离时，才使用 macOS VM。

## macOS VM 选项

### 在你的 Apple Silicon Mac 上本地运行 VM（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在你现有的 Apple Silicon Mac 上的沙盒化 macOS VM 中运行 OpenClaw。这为你提供：

- 完整且隔离的 macOS 环境（你的宿主机保持干净）
- 通过 `imsg` 支持 iMessage；默认的本地路径在 Linux/Windows 上不可行
- 通过克隆 VM 实现即时重置
- 无需额外硬件或云成本

### 托管 Mac 提供商（云端）

如果你想在云端使用 macOS，托管 Mac 提供商也可以：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 厂商也可以；请遵循它们的 VM + SSH 文档

一旦你拥有 macOS VM 的 SSH 访问权限，请继续阅读下面的 [安装 OpenClaw](#6-install-openclaw)。

## 快速路径（Lume，有经验的用户）

1. 安装 Lume。
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助理，启用远程登录（SSH）。
4. `lume run openclaw --no-display`
5. SSH 进入，安装 OpenClaw，配置频道。
6. 完成。

## 你需要准备什么（Lume）

- Apple Silicon Mac（M1/M2/M3/M4）
- 宿主机上运行 macOS Sequoia 或更高版本
- 每个 VM 约 60 GB 可用磁盘空间
- 约 20 分钟

## 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在你的 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

验证：

```bash
lume --version
```

文档：[Lume 安装](https://cua.ai/docs/lume/guide/getting-started/installation)

## 2) 创建 macOS 虚拟机

```bash
lume create openclaw --os macos --ipsw latest
```

这会下载 macOS 并创建虚拟机。VNC 窗口会自动打开。

<Note>
下载时间可能会比较久，取决于你的网络连接。
</Note>

## 3) 完成设置助手

在 VNC 窗口中：

1. 选择语言和地区。
2. 跳过 Apple ID（如果之后想使用 iMessage，也可以登录）。
3. 创建一个用户账户（记住用户名和密码）。
4. 跳过所有可选功能。

设置完成后：

1. 启用 SSH：System Settings -> General -> Sharing，开启“Remote Login”。
2. 对于无头虚拟机使用，启用自动登录：System Settings -> Users & Groups，选择“Automatically log in as:”，然后选择该 VM 用户。

## 4）获取 VM 的 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

## 5）通过 SSH 连接到 VM

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为你创建的账户，并将 IP 替换为你的 VM 的 IP。

## 6) 安装 OpenClaw

在 VM 内：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照引导提示设置你的模型提供商（Anthropic、OpenAI 等）。

## 7) 配置 channels

编辑配置文件：

```bash
nano ~/.openclaw/openclaw.json
```

添加你的 channels：

```json5
{
  channels: {
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

然后登录 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

## 8) 无头运行 VM

停止 VM 并在不显示界面的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 在后台运行；OpenClaw 的守护进程会保持网关持续运行。要检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

## Bonus: iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [iMessage](/channels/imessage) 和 `imsg` 将 Messages 添加到 OpenClaw。

在 VM 内：

1. 登录 Messages。
2. 安装 `imsg`。
3. 为运行 OpenClaw/`imsg` 的进程授予“完全磁盘访问权限”和“自动化”权限。
4. 使用 `imsg rpc --help` 验证 RPC 支持。

在你的 OpenClaw 配置中添加：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
    },
  },
}
```

重启网关。你的 agent 现在可以发送和接收 iMessage 了。完整设置详情：[iMessage channel](/channels/imessage)。

## 保存金镜像

在进一步自定义之前，先快照你的干净状态：

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

随时重置：

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

## 24/7 运行

通过以下方式保持 VM 运行：

- 让你的 Mac 一直插着电
- 在系统设置 -> 节能 中禁用睡眠
- 如有需要，使用 `caffeinate`

如果需要真正的始终在线，建议使用专用 Mac mini 或小型 VPS。参见 [VPS 托管](/vps)。

## 故障排除

| 问题                     | 解决方案                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| 无法 SSH 连接到 VM       | 检查 VM 的系统设置中是否已启用“远程登录”                                            |
| 未显示 VM IP             | 等待 VM 完全启动后，再次运行 `lume get openclaw`                                     |
| 找不到 Lume 命令         | 将 `~/.local/bin` 添加到你的 PATH                                                   |
| WhatsApp 二维码无法扫描  | 运行 `openclaw channels login` 时，请确保你登录的是 VM（不是宿主机）               |

## 相关文档

- [VPS 托管](/vps)
- [节点](/nodes)
- [Gateway 远程](/gateway/remote)
- [iMessage 通道](/channels/imessage)
- [Lume 快速开始](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守 VM 设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker 沙箱化](/install/docker)（替代隔离方案）
