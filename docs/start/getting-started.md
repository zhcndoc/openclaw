---
summary: "安装 OpenClaw 并在几分钟内运行你的第一个聊天。"
read_when:
  - 从零开始的首次设置
  - 你想最快速地实现一个可用的聊天
title: "入门指南"
---

# 入门指南

目标：以最小的设置步骤，从零开始实现第一个可用聊天。

<Info>
最快的聊天方式：打开控制界面（无需设置渠道）。运行 `openclaw dashboard`，
在浏览器中聊天，或者打开 <http://127.0.0.1:18789/>，
位于 <Tooltip headline="Gateway 主机" tip="运行 OpenClaw 网关服务的机器。">网关主机</Tooltip>。
文档：[Dashboard](/web/dashboard) 和 [控制界面](/web/control-ui)。
</Info>

## 前提条件

- Node 版本 22 或更新

<Tip>
如果不确定，使用 `node --version` 检查你的 Node 版本。
</Tip>

## 快速设置（CLI）

<Steps>
  <Step title="安装 OpenClaw（推荐）">
    <Tabs>
      <Tab title="macOS/Linux">
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
    其他安装方法和需求： [安装](/install)。
    </Note>

  </Step>
  <Step title="运行入门向导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导会配置认证、网关设置和可选渠道。
    详情见 [入门向导](/start/wizard)。

  </Step>
  <Step title="检查网关状态">
    如果你安装了服务，它应该已经在运行：

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="打开控制界面">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
如果控制界面加载成功，你的网关已准备就绪。
</Check>

## 可选检查和附加操作

<AccordionGroup>
  <Accordion title="在前台运行网关">
    适用于快速测试或故障排查。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="发送测试消息">
    需要先配置渠道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 有用的环境变量

如果你以服务账户运行 OpenClaw 或想自定义配置/状态文件位置：

- `OPENCLAW_HOME` 设置用于内部路径解析的主目录。
- `OPENCLAW_STATE_DIR` 覆盖状态目录位置。
- `OPENCLAW_CONFIG_PATH` 覆盖配置文件路径。

完整环境变量参考：[环境变量](/help/environment)。

## 深入了解

<Columns>
  <Card title="入门向导（详细信息）" href="/start/wizard">
    完整的 CLI 向导参考及高级选项。
  </Card>
  <Card title="macOS 应用入门" href="/start/onboarding">
    macOS 应用的首次运行流程。
  </Card>
</Columns>

## 你将拥有

- 一个正在运行的网关
- 配置好的认证
- 可访问的控制界面或已连接的渠道

## 后续步骤

- DM 安全和审批：[配对](/channels/pairing)
- 连接更多渠道：[渠道](/channels)
- 高级工作流及源码使用：[设置](/start/setup)
