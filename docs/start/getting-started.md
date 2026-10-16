---
summary: "在几分钟内安装 OpenClaw 并运行你的第一场聊天。"
read_when:
  - "第一次从零开始设置"
  - "你想用最快的方式获得一个可用的聊天"
title: "入门"
---

安装 OpenClaw，运行入门流程，并在大约 5 分钟内与你的 AI 助手聊天。到最后，你将拥有一个正在运行的 Gateway、已配置的认证，以及一个可用的聊天会话。

## <a id="what-you-need"></a> 准备工作

- **Node.js 24.16+ 或 26.1+**（推荐使用 Node 26 运行时）
- **已有的 Claude Code 或 Codex CLI 登录状态，或提供商的 API 密钥**——入门引导可以直接复用

<Tip>
使用 `node --version` 检查你的 Node 版本。 **Windows 用户：** 原生 Windows Hub 应用是最简单的桌面路径。PowerShell 安装程序和 WSL2 Gateway 路径也受支持。参见 [Windows](/platforms/windows)。 需要安装 Node？参见 [Node 设置](/install/node)。
</Tip>

## <a id="try-it-in-one-command"></a> 用一条命令试用

```bash
npx openclaw@latest
```

首次安装时，看到指向[安全指南](/gateway/security)的简短提示后，选择 **Quick start**。如果已有可用的 AI 访问凭据，这就是入门引导中唯一需要选择的选项：OpenClaw 会查找已有的 Claude Code 或 Codex CLI 登录状态或 API 密钥，通过一次实际的模型请求验证凭据，保存配置并打开网页仪表盘。

Gateway 会在当前终端中运行，直到你按下 **Ctrl+C**；配置会持续保存。如果检测到的访问方式都不可用，入门引导会打开提供商的手动设置界面。选择 **Custom setup** 则可逐项完成全部引导选项。

要让 Gateway 在后台持续运行，请按下文安装 CLI，然后运行 `openclaw gateway install`。运行 `openclaw` 可打开 TUI，运行 `openclaw dashboard` 可重新打开网页界面。

## <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="install-openclaw" title="安装 OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安装脚本流程"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    其他安装方式（Docker、Nix、npm）：[安装](/install)。
    </Note>

  </Step>
  <Step id="complete-onboarding" title="完成入门引导">
    安装程序会自动启动入门设置向导。选择 **Quick start** 可复用检测到的 AI 访问凭据并打开仪表盘；选择 **Custom setup** 可完成全部引导流程。提供商登录和可选设置可能需要更多时间。之后可运行 `openclaw configure` 补充设置。`openclaw onboard --classic` 则会打开经典的分步设置向导。

    查看 [引导（CLI）](/start/wizard) 获取完整参考。

  </Step>
  <Step id="install-the-gateway-service" title="安装 Gateway 服务">
    Quick start 会让 Gateway 在当前终端的前台运行。后续步骤需要它在后台运行。按 **Ctrl+C** 停止前台的 Gateway，然后安装服务：

    ```bash
    openclaw gateway install
    ```

    这会在 macOS 上安装 LaunchAgent，在 Linux 和 WSL2 上安装 systemd 用户单元，或在原生 Windows 上安装 Scheduled Task（如果不允许创建任务，则回退到当前用户启动文件夹中的登录启动项）。停止和安装服务不会丢失已保存的配置。

  </Step>
  <Step id="verify-the-gateway-is-running" title="确认 Gateway 正在运行">
    ```bash
    openclaw gateway status
    ```

    你应该会看到 Gateway 正在 18789 端口上监听。

  </Step>
  <Step id="open-the-dashboard" title="打开仪表盘">
    ```bash
    openclaw dashboard
    ```

    这会在浏览器中打开 Control UI。如果页面正常加载，说明一切已就绪。

  </Step>
  <Step id="send-your-first-message" title="发送第一条消息">
    在 Control UI 的聊天界面输入一条消息，你应该会收到 AI 的回复。

    想改用手机聊天？最容易设置的渠道是 [Telegram](/channels/telegram)（只需要一个机器人令牌）。查看 [渠道](/channels) 获取所有选项。

  </Step>
</Steps>

<Accordion id="advanced-mount-a-custom-control-ui-build" title="高级：挂载自定义 Control UI 构建">
  如果你维护本地化或自定义的仪表板构建，请将 `gateway.controlUi.root` 指向一个包含你构建好的静态资源和 `index.html` 的目录。

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# Copy your built static files into that directory.
```

然后设置：

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "${HOME}/.openclaw/control-ui-custom"
    }
  }
}
```

重启 gateway 并重新打开仪表板：

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## <a id="if-setup-does-not-work"></a> 如果设置未成功

一条命令就能检查当前安装状态，并给出可执行的诊断结果：

```bash
openclaw triage
```

它会执行只读健康检查，生成一段经过脱敏、说明检查结果的提示词，然后让你选择是否将提示词交给本机检测到的编程智能体——Claude Code、Codex CLI 或 OpenClaw 内置智能体——让智能体在启动时就获得诊断信息。如果你希望自行执行交接，请选择“just print the commands”。

在你选择智能体之前，所有内容都保留在本机；提示词不会包含密钥、令牌、原始聊天载荷或原始日志。

如果你希望自行查看检查结果，请运行 [`openclaw doctor`](/cli/doctor)。要根据具体症状查找排查步骤，请参阅[故障排除](/help/troubleshooting)。

## <a id="what-to-do-next"></a> 接下来做什么

<Columns>
  <Card title="连接渠道" href="/channels" icon="message-square">
    Discord、Feishu、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo 等。
  </Card>
  <Card title="配对与安全" href="/channels/pairing" icon="shield">
    控制谁可以向你的智能体发送消息。
  </Card>
  <Card title="配置 Gateway" href="/gateway/configuration" icon="settings">
    模型、工具、沙箱和高级设置。
  </Card>
  <Card title="浏览工具" href="/tools" icon="wrench">
    浏览器、exec、网页搜索、技能和插件。
  </Card>
</Columns>

<Accordion id="advanced-environment-variables" title="高级：环境变量">
  如果你将 OpenClaw 作为服务账户运行，或想使用自定义路径：

- `OPENCLAW_HOME` — 内部路径解析所使用的 home 目录
- `OPENCLAW_STATE_DIR` — 覆盖状态目录
- `OPENCLAW_CONFIG_PATH` — 覆盖配置文件路径

完整参考：[环境变量](/help/environment)。
</Accordion>

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [渠道概览](/channels)
- [设置](/start/setup)
- [个人助手设置](/start/openclaw)——通过专用号码搭建全天候助手的完整指南
- [诊断分流](/cli/triage)
- [故障排查](/help/troubleshooting)
