---
summary: "安装 OpenClaw 并在几分钟内进行首次聊天。"
read_when:
  - 从零开始的首次设置
  - 你想快速实现可用的聊天功能
title: "入门指南"
---

# 入门指南

目标：以最少的设置，从零开始实现第一个可用的聊天。

<Info>
最快的聊天方式：打开控制面板（无需设置频道）。运行 `openclaw dashboard`
并在浏览器中聊天，或打开 <http://127.0.0.1:18789/>，访问
<Tooltip headline="网关主机" tip="运行 OpenClaw 网关服务的机器。">网关主机</Tooltip>。
文档：[控制面板](/web/dashboard) 和 [控制 UI](/web/control-ui)。
</Info>

## 先决条件

- 推荐使用 Node 24（Node 22 LTS，当前版本为 `22.16+`，仍支持以保持兼容性）

<Tip>
如果不确定，可以用 `node --version` 查看你的 Node 版本。
</Tip>

## 快速设置（命令行）

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
      <Tab title="Windows（PowerShell）">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    其他安装方法及要求请见：[安装](/install)。
    </Note>

  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    引导配置认证、网关设置和可选的频道。
    详情见 [Onboarding (CLI)](/start/wizard)。

  </Step>
  <Step title="检查网关">
    如果你安装了服务，应该已在运行：

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="打开控制 UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
如果控制 UI 加载成功，说明你的网关已准备就绪。
</Check>

## 可选检查和附加功能

<AccordionGroup>
  <Accordion title="前台运行网关">
    适合快速测试或故障排查。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="发送测试消息">
    需要配置好的频道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 有用的环境变量

如果你以服务账号运行 OpenClaw 或想自定义配置/状态存放位置：

- `OPENCLAW_HOME` 设置用于内部路径解析的主目录。
- `OPENCLAW_STATE_DIR` 覆盖状态目录。
- `OPENCLAW_CONFIG_PATH` 覆盖配置文件路径。

完整环境变量参考：[环境变量](/help/environment)。

## 深入了解

<Columns>
  <Card title="Onboarding (CLI)" href="/start/wizard">
    完整的 CLI 引导参考和高级选项。
  </Card>
  <Card title="macOS 应用入门" href="/start/onboarding">
    macOS 应用的首次运行流程。
  </Card>
</Columns>

## 你将拥有

- 正在运行的网关
- 配置好的认证
- 控制 UI 访问权限或已连接的频道

## 下一步

- DM 安全和审批：[配对](/channels/pairing)
- 连接更多频道：[频道](/channels)
- 高级工作流及源码安装：[设置](/start/setup)
