---
summary: "安装 OpenClaw 并在几分钟内进行首次聊天。"
read_when:
  - 从零开始的首次设置
  - 你想快速实现可用的聊天功能
title: "入门指南"
---

# 入门指南

安装 OpenClaw，运行引导流程，并与你的 AI 助手聊天——全部只需
大约 5 分钟。到最后，你将拥有一个正在运行的 Gateway、已配置的认证，
以及一个可用的聊天会话。

## 你需要什么

- **Node.js** — 推荐 Node 24（也支持 Node 22.14+）
- **来自模型提供商的 API 密钥**（Anthropic、OpenAI、Google 等）——引导流程会提示你

<Tip>
使用 `node --version` 检查你的 Node 版本。
**Windows 用户：** 原生 Windows 和 WSL2 都受支持。WSL2 更加
稳定，推荐用于完整体验。参见 [Windows](/platforms/windows)。
需要安装 Node？参见 [Node setup](/install/node)。
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
      <Tab title="Windows（PowerShell）">
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

    向导将引导你选择模型提供商、设置 API 密钥，
    并配置 Gateway。大约需要 2 分钟。

    完整参考请见 [引导流程（CLI）](/start/wizard)。

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

    这会在你的浏览器中打开 Control UI。如果能加载出来，一切都正常。

  </Step>
  <Step title="发送你的第一条消息">
    在 Control UI 的聊天中输入一条消息，你应该会收到 AI 的回复。

    想改为从手机聊天？最快的设置渠道是
    [Telegram](/channels/telegram)（只需一个 bot token）。查看 [Channels](/channels)
    了解所有选项。

  </Step>
</Steps>

## 接下来做什么

<Columns>
  <Card title="连接一个渠道" href="/channels" icon="message-square">
    WhatsApp、Telegram、Discord、iMessage 等等。
  </Card>
  <Card title="配对与安全" href="/channels/pairing" icon="shield">
    控制谁可以给你的代理发消息。
  </Card>
  <Card title="配置 Gateway" href="/gateway/configuration" icon="settings">
    模型、工具、沙箱和高级设置。
  </Card>
  <Card title="浏览工具" href="/tools" icon="wrench">
    浏览器、exec、网页搜索、技能和插件。
  </Card>
</Columns>

<Accordion title="高级：环境变量">
  如果你将 OpenClaw 作为服务账号运行，或希望使用自定义路径：

- `OPENCLAW_HOME` — 用于内部路径解析的主目录
- `OPENCLAW_STATE_DIR` — 覆盖状态目录
- `OPENCLAW_CONFIG_PATH` — 覆盖配置文件路径

完整参考：[环境变量](/help/environment)。
</Accordion>
