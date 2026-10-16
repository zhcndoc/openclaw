---
summary: "在具有 SSH 访问权限和签名预览 URL 的 Daytona 云沙箱中运行 OpenClaw"
read_when:
  - "在 Daytona 沙盒中运行 OpenClaw"
  - "您想要 OpenClaw 的云沙箱而不管理 VPS"
title: "代托纳"
---

在 [Daytona](https://www.daytona.io) 云沙箱中运行持久性 OpenClaw 网关：具有 SSH 访问权限和内置预览 URL 的隔离 Linux 环境，无需 VPS 管理。 OpenClaw 预安装在 `daytona-medium` 快照中，因此安装程序会在 SSH 之后立即开始。

保持网关处于环回状态，并通过 Daytona 的签名预览 URL 访问仪表板。请勿将网关端口直接暴露于公共互联网。

## <a id="what-you-need"></a> 准备工作

- [Daytona 账户](https://app.daytona.io)（提供免费套餐）
- 从 [Daytona 控制面板](https://app.daytona.io/dashboard/keys) 获取的 Daytona API 密钥
- 模型提供商的 API 密钥（Anthropic、OpenAI 等）

## <a id="install-the-daytona-cli"></a> 安装 Daytona CLI

<Tabs>
  <Tab title="macOS / Linux">
    ```bash
    brew install daytonaio/cli/daytona
    ```
  </Tab>
  <Tab title="Windows">
    ```powershell
    powershell -Command "irm https://get.daytona.io/windows | iex"
    ```
  </Tab>
</Tabs>

验证安装：

```bash
daytona --version
```

较旧的 CLI 版本缺少较新的沙箱命令；请保持其为最新版本（例如 `brew upgrade daytonaio/cli/daytona`）。

## <a id="authenticate"></a> 身份验证

```bash
daytona login --api-key=YOUR_API_KEY
```

## <a id="create-a-sandbox"></a> 创建沙盒

```bash
daytona sandbox create --name openclaw --snapshot daytona-medium --auto-stop 0
```

| 标志                        | 原因                                                |
| --------------------------- | -------------------------------------------------- |
| `--snapshot daytona-medium` | 提供足够的内存余量以运行网关 |
| `--auto-stop 0`             | 让沙盒持续运行，直到手动停止   |

## <a id="connect-via-ssh"></a> 通过 SSH 连接

```bash
daytona ssh openclaw
```

## <a id="run-onboarding"></a> Run 入门

在沙箱中通过一条命令配置 OpenClaw：

```bash
openclaw onboard --non-interactive --accept-risk \
  --anthropic-api-key YOUR_ANTHROPIC_KEY \
  --skip-daemon --skip-channels --skip-skills --skip-hooks --skip-health
```

`--skip-daemon` 很重要：Daytona 沙箱不运行服务管理器，因此你需要在下方手动启动 Gateway。将密钥标志替换为你的提供商对应的选项（`--openai-api-key`、`--openrouter-api-key` 等）；`openclaw onboard --help` 会列出所有选项。此处会跳过频道、技能和钩子的配置，稍后再进行配置。

不带标志运行 `openclaw onboard` 会改为启动交互式设置助手，并且需要交互式终端；`openclaw onboard --classic` 会运行较旧的分步向导。

载入配置网关身份验证令牌。随时从沙箱上的交互式终端打印它：

```bash
openclaw gateway auth-token --show
```

当 stdout 不是交互式终端时，该命令拒绝打印令牌，因此无法通过管道或命令替换捕获它。

`openclaw config get gateway.auth.token` 返回的是 `__OPENCLAW_REDACTED__`，而不是实际值，因为 CLI 会在输出中隐藏机密信息。

## <a id="allow-the-preview-url-origin"></a> 允许预览 URL 的来源

Gateway 仅接受来自允许来源的浏览器连接，而 Daytona 的预览代理位于其前面。请在启动 Gateway 之前配置这两项。

在**本地终端**（而不是沙盒 SSH 会话）中，为 Gateway 端口生成一个签名的预览 URL：

```bash
daytona preview-url openclaw --port 18789
```

复制它打印的 URL。返回沙箱 SSH 会话，允许该来源并信任沙箱内预览代理，将示例 URL 替换为您自己的：

```bash
openclaw config set gateway.controlUi.allowedOrigins '["PASTE_YOUR_PREVIEW_URL"]'
openclaw config set gateway.trustedProxies '["127.0.0.1"]'
```

请完全按照输出的内容粘贴 URL：仅包含协议和主机，不要带末尾斜杠，也不要带路径。Gateway 会逐字比较浏览器来源，而浏览器发送的是不带末尾斜杠的 `https://host`，因此 `https://host/` 无法匹配，连接会被拒绝。浏览器地址栏通常会显示末尾斜杠，所以请直接从终端复制。

## <a id="start-the-gateway"></a> 启动网关

```bash
nohup openclaw gateway run > /tmp/gateway.log 2>&1 &
```

网关在后台运行，即使 SSH 连接断开也会继续运行。验证其是否已启动：

```bash
openclaw gateway health
```

该命令会报告网关状态，因此显示 `OK` 意味着可以继续操作。

稍后重启网关（配置更改或更新后）：

```bash
pkill -f "openclaw gateway" || true
nohup openclaw gateway run > /tmp/gateway.log 2>&1 &
```

## <a id="open-the-dashboard"></a> 打开控制面板

打开您之前在浏览器中生成的预览 URL。 Control UI 在第一次连接时请求网关令牌；粘贴您在入门引导后打印的值。

### <a id="approve-your-device"></a> 批准你的设备

首次浏览器连接会将设备配对请求加入队列。返回你的沙箱 SSH 会话：

```bash
# List pending requests and copy the request id
openclaw devices list

# Approve it
openclaw devices approve REQUEST_ID
```

## <a id="security"></a> 安全

访问网关受到三层保护：

| 层           | 描述                                            |
| --------------- | ------------------------------------------------------ |
| 预览 URL     | 有效期有限的签名 URL（1 小时后过期）         |
| 网关令牌   | 需要通过 Control UI 连接                 |
| 设备批准 | 每个新浏览器或客户端都必须经过明确批准 |

将您的网关令牌和预览 URL 保密。网关保持环回绑定状态； Daytona 的预览代理处理外部访问。

## <a id="channel-setup"></a> 频道设置

默认情况下，未知发件人需要配对批准；请参阅 [配对](/channels/pairing)。

### Telegram

使用 [@BotFather](https://t.me/botfather) （`/newbot`） 创建机器人，复制令牌，然后从沙箱 SSH 会话配置 OpenClaw：

```bash
export TELEGRAM_BOT_TOKEN="<bot-token>"
openclaw channels add --channel telegram --use-env
```

还将 `TELEGRAM_BOT_TOKEN=<bot-token>` 存储在 `~/.openclaw/.env` 中，以便后台网关在重新启动后收到它。 `--use-env` 验证令牌，而不将其复制到 `openclaw.json` 中。

重新启动网关（见上文），向您的机器人发送 DM，然后批准其报告的配对代码：

```bash
openclaw pairing list telegram
openclaw pairing approve telegram PAIRING_CODE
```

配对代码在 1 小时后过期。完整参考：[Telegram](/channels/telegram)。

### WhatsApp

WhatsApp 作为独立插件提供，因此请先安装并启用它：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
openclaw plugins enable whatsapp
```

安装不会启用插件，因此必须执行 `enable` 步骤；否则网关会将该频道报告为已配置但不受信任。 如果未先安装就运行下面的登录命令，系统会提示你从 ClawHub 或 npm 下载插件。

然后通过从沙箱 SSH 会话扫描 QR 代码来链接帐户：

```bash
openclaw channels login --channel whatsapp
```

在手机上：**设置→链接设备→链接设备**，然后扫描终端中显示的QR代码。链接后重新启动网关，然后在 WhatsApp 上向自己发送消息，并在该聊天中回复 OpenClaw。

不需要配对批准：未配置允许列表时，关联账户自己的号码默认获准。 配对适用于未知发件人，因此 Telegram 需要配对，而自聊不需要。有关允许列表、 个人号码模式和自聊的详细信息，请参阅：[WhatsApp](/channels/whatsapp)。

## <a id="updating"></a> 更新

快照的全局 npm 树归 root 所有，因此直接运行 `openclaw update` 无法写入其中。请从沙箱 SSH 会话中运行：

以下命令适用于 npm 12 或 npm 11.16+。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
sudo env "PATH=$PATH" npm install --global openclaw@latest --allow-scripts=openclaw
openclaw doctor
```

更新后，`openclaw doctor` 会迁移任何较旧的配置。随后重启网关（见上文）。

## <a id="stop-and-resume-the-sandbox"></a> 停止并恢复沙盒

```bash
# Stop
daytona sandbox stop openclaw

# Resume
daytona sandbox start openclaw
```

沙箱状态在 stop/start 周期内持续存在，但网关进程不会自动启动。恢复后，重新连接并重新启动：

```bash
daytona ssh openclaw
nohup openclaw gateway run > /tmp/gateway.log 2>&1 &
```

## <a id="troubleshooting"></a> 故障排查

### <a id="gateway-not-running-after-sandbox-restart"></a> 沙盒重启后网关未运行

网关进程无法在沙盒重启后继续运行。使用 `daytona ssh openclaw` 重新连接，并使用上面的 `nohup` 命令再次启动它。

### <a id="preview-url-expired"></a> 预览 URL 已过期

预览 URL 有时间限制（默认 3600 秒）。从本地终端重新生成，可选择更长的有效期：

```bash
daytona preview-url openclaw --port 18789 --expires 86400
```

每个生成的URL都有不同的主机，因此它是一个新的起源。重新生成后，请使用新的 URL 更新 `gateway.controlUi.allowedOrigins` 并重新启动网关，否则 Control UI 将被拒绝并显示为 `origin not allowed`。

### <a id="sandbox-auto-stopped"></a> 沙盒自动停止

如果创建沙盒时未使用 `--auto-stop 0`，它会在空闲时自动停止。使用 `daytona sandbox start openclaw` 恢复它。

### <a id="gateway-port-not-reachable"></a> 无法访问网关端口

确认网关正在运行并处于监听状态：

```bash
openclaw gateway health
tail -20 /tmp/gateway.log
```

如果更改了网关端口，请将相同的端口传递给 `daytona preview-url`。

## <a id="notes"></a> 说明

- 如需以编程方式配置沙箱，请参阅 [Daytona OpenClaw SDK 指南](https://www.daytona.io/docs/en/guides/openclaw/openclaw-sdk-sandbox/)

## <a id="related"></a> 相关内容

- [网关远程访问](/gateway/remote)
- [网关安全](/gateway/security)
- [更新 OpenClaw](/install/updating)
