---
summary: "当您需要隔离或 iMessage 功能时，在受沙箱保护的 macOS 虚拟机（本地或托管）中运行 OpenClaw"
read_when:
  - 您希望将 OpenClaw 与主 macOS 环境隔离
  - 您希望在沙箱中集成 iMessage（BlueBubbles）
  - 您希望有一个可重置且可以克隆的 macOS 环境
  - 您想比较本地与托管 macOS 虚拟机的选项
title: "macOS 虚拟机"
---

# macOS 虚拟机上的 OpenClaw（沙箱化）

## 推荐默认方案（大多数用户）

- **小型 Linux VPS**，用于始终在线的网关，且成本低廉。见 [VPS 托管](/vps)。
- **专用硬件**（Mac mini 或 Linux 设备），如果您想完全控制环境并使用 **住宅 IP** 来实现浏览器自动化。许多网站会屏蔽数据中心 IP，因此本地浏览通常效果更好。
- **混合方案：** 将网关部署在廉价 VPS 上， 当需要浏览器/UI 自动化时连接您的 Mac 作为 **节点**。详见 [节点](/nodes) 和 [远程网关](/gateway/remote)。

只有当您特别需要 macOS 独有功能（如 iMessage/BlueBubbles）或想与日常使用的 Mac 进行严格隔离时，才使用 macOS 虚拟机。

## macOS 虚拟机选项

### 在您的 Apple Silicon Mac 本地虚拟机（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在您现有的 Apple Silicon Mac 上运行受沙箱保护的 macOS 虚拟机中的 OpenClaw。

这样您可以获得：

- 完整的 macOS 隔离环境（宿主机保持干净）
- BlueBubbles 支持的 iMessage 功能（Linux/Windows 上无法实现）
- 通过克隆虚拟机实现即时重置
- 无需额外硬件或云费用

### 托管 Mac 提供商（云端）

如果您想在云端运行 macOS，托管 Mac 提供商也可使用：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 供应商也支持；请参阅他们的虚拟机和 SSH 文档

一旦获得 macOS 虚拟机的 SSH 访问权限，请从下面第 6 步继续操作。

---

## 快速路径（Lume，适合有经验的用户）

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助手，启用远程登录（SSH）
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 您需要的条件（Lume）

- Apple Silicon Mac（M1/M2/M3/M4）
- 宿主机运行 macOS Sequoia 或更高版本
- 每个虚拟机约 60 GB 可用磁盘空间
- 大约 20 分钟时间

---

## 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在您的 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

验证安装：

```bash
lume --version
```

文档：[Lume 安装指南](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 创建 macOS 虚拟机

```bash
lume create openclaw --os macos --ipsw latest
```

此命令会下载 macOS 并创建虚拟机。会自动打开一个 VNC 窗口。

注意：下载时间依赖您的网络连接，可能需要一段时间。

---

## 3) 完成设置助手

在 VNC 窗口中操作：

1. 选择语言和地区
2. 跳过 Apple ID（如果后续需要使用 iMessage，可选择登录）
3. 创建用户账户（请记住用户名和密码）
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开系统设置 → 通用 → 共享
2. 启用“远程登录”

---

## 4) Get the VM IP address

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

---

## 5) SSH 登录虚拟机

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为您创建的账户名，IP 替换为虚拟机实际的 IP。

---

## 6) 安装 OpenClaw

在虚拟机内执行：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

根据指引设置您的模型提供商（Anthropic、OpenAI 等）。

---

## 7) 配置频道

编辑配置文件：

```bash
nano ~/.openclaw/openclaw.json
```

添加您的频道：

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
  },
}
```

然后登陆 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

---

## 8) 无界面模式运行虚拟机

关闭虚拟机并以无显示模式重启：

```bash
lume stop openclaw
lume run openclaw --no-display
```

虚拟机将在后台运行。OpenClaw 守护进程保持网关在线。

查看状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 额外：iMessage 集成

这是在 macOS 上运行的最大特色。使用 [BlueBubbles](https://bluebubbles.app) 让 OpenClaw 支持 iMessage。

在虚拟机内：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles 的 webhook 指向您的网关（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

在您的 OpenClaw 配置中添加：

```json5
{
  channels: {
    bluebubbles: {
      serverUrl: "http://localhost:1234",
      password: "your-api-password",
      webhookPath: "/bluebubbles-webhook",
    },
  },
}
```

重启网关。现在您的代理可以发送和接收 iMessage。

完整设置详情见：[BlueBubbles 频道](/channels/bluebubbles)

---

## 保存黄金镜像

在进一步自定义之前，快照您的干净状态：

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

---

## 全天候运行

保持虚拟机运行建议：

- 保持 Mac 连接电源
- 在“系统设置”→“节能”中禁用睡眠
- 如有需要，使用 `caffeinate` 命令防止休眠

如果需要真正的全天候运行，考虑使用专用 Mac mini 或小型 VPS。详见 [VPS 托管](/vps)。

---

## 故障排除

| 问题                      | 解决方案                                               |
| ------------------------- | ------------------------------------------------------ |
| 无法 SSH 连接虚拟机        | 确认虚拟机系统设置中的“远程登录”已启用                |
| 虚拟机 IP 不显示           | 等待虚拟机完全启动，再次运行 `lume get openclaw`       |
| 找不到 Lume 命令           | 将 `~/.local/bin` 添加到您的 PATH                       |
| WhatsApp 二维码无法扫描    | 确保运行 `openclaw channels login` 时已登录虚拟机（非宿主机） |

---

## 相关文档

- [VPS 托管](/vps)
- [节点](/nodes)
- [远程网关](/gateway/remote)
- [BlueBubbles 频道](/channels/bluebubbles)
- [Lume 快速开始](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守虚拟机设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker 沙箱](/install/docker)（另一种隔离方案）
