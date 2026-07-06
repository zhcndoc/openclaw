---
summary: "在几分钟内安装 OpenClaw 并运行你的第一场聊天。"
read_when:
  - 第一次从零开始设置
  - 你想用最快的方式获得一个可用的聊天
title: "入门"
---

安装 OpenClaw，运行入门流程，并在大约 5 分钟内与你的 AI 助手聊天。到最后，你将拥有一个正在运行的 Gateway、已配置的认证，以及一个可用的聊天会话。

## 你需要什么

- **Node.js 22.19+, 23.11+, or 24+** (24 是推荐默认版本)
- **来自模型提供商的 API 密钥**（Anthropic、OpenAI、Google 等）——入门时会提示你

<Tip>
使用 `node --version` 检查你的 Node 版本。
**Windows 用户：** 原生 Windows Hub 应用是最简单的桌面路径。PowerShell 安装程序和 WSL2 Gateway 路径也受支持。参见 [Windows](/platforms/windows)。
需要安装 Node？参见 [Node 设置](/install/node)。
</Tip>

## 快速设置

<Steps>
  <Step title="安装 OpenClaw">
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
  <Step title="运行引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导会引导你选择模型提供商、设置 API 密钥，
    并配置 Gateway。QuickStart 通常只需几分钟，但
    提供商登录、通道配对、daemon 安装、网络下载、技能，
    或可选插件都可能让完整的引导过程花费更长时间。你可以跳过可选
    步骤，稍后再使用 `openclaw configure` 返回继续。

    查看 [引导（CLI）](/start/wizard) 获取完整参考。

  </Step>
  <Step title="验证 Gateway 是否正在运行">
    ```bash
    openclaw gateway status
    ```

    你应该会看到 Gateway 正在 18789 端口上监听。

  </Step>
  <Step title="打开仪表板">
    ```bash
    openclaw dashboard
    ```

    这会在你的浏览器中打开 Control UI。如果成功加载，一切就正常了。

  </Step>
  <Step title="发送你的第一条消息">
    在 Control UI 聊天中输入一条消息，你应该会收到 AI 回复。

    想改用手机聊天？最容易设置的渠道是
    [Telegram](/channels/telegram)（只需要一个机器人令牌）。查看 [渠道](/channels)
    获取所有选项。

  </Step>
</Steps>

<Accordion title="高级：挂载自定义 Control UI 构建">
  如果你维护本地化或自定义的仪表板构建，请将
  `gateway.controlUi.root` 指向一个包含你构建好的静态
  资源和 `index.html` 的目录。

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# 将你构建好的静态文件复制到该目录中。
```

然后设置：

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
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

## 接下来做什么

<Columns>
  <Card title="连接一个渠道" href="/channels" icon="message-square">
    Discord、飞书、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo 等更多渠道。
  </Card>
  <Card title="配对与安全" href="/channels/pairing" icon="shield">
    控制谁可以给你的代理发送消息。
  </Card>
  <Card title="配置 Gateway" href="/gateway/configuration" icon="settings">
    模型、工具、沙箱和高级设置。
  </Card>
  <Card title="浏览工具" href="/tools" icon="wrench">
    浏览器、exec、网页搜索、技能和插件。
  </Card>
</Columns>

<Accordion title="高级：环境变量">
  如果你将 OpenClaw 作为服务账户运行，或想使用自定义路径：

- `OPENCLAW_HOME` — 内部路径解析所使用的 home 目录
- `OPENCLAW_STATE_DIR` — 覆盖状态目录
- `OPENCLAW_CONFIG_PATH` — 覆盖配置文件路径

完整参考：[环境变量](/help/environment)。
</Accordion>

## 相关内容

- [安装概览](/install)
- [渠道概览](/channels)
- [设置](/start/setup)
