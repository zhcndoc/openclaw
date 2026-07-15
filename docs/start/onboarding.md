---
summary: "OpenClaw 的首次运行设置流程（macOS 应用）"
read_when:
  - 设计 macOS 上手助手
  - 实现身份验证或身份设置
title: "上手引导（macOS 应用）"
sidebarTitle: "上手引导：macOS 应用"
---

macOS 应用的首次运行流程：选择 Gateway 运行位置，连接已验证的 AI 后端，授予权限，然后交由代理自身的启动仪式继续。
关于 CLI 上手流程以及两种路径的对比，请参见 [上手概览](/start/onboarding-overview)。

<Steps>
<Step title="批准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="批准查找本地网络">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="欢迎与安全提示">
<Frame caption="阅读显示的安全提示并据此决定">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是一个个人代理：一个受信任的操作者边界。
- 共享/多用户设置需要锁定：拆分信任边界，尽量减少工具访问，并遵循 [安全](/gateway/security)。
- 本地上手会将新配置默认设为 `tools.profile: "coding"`，因此新安装会保留文件系统/运行时工具，而不会使用不受限制的 `full` 配置。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型层级，并保持严格的工具策略/沙箱隔离。

</Step>
<Step title="本地还是远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 运行在哪里？

- **这台 Mac（仅本地）**：上手流程会配置身份验证并将凭据写入本地。
- **远程（通过 SSH/Tailnet）**：上手流程**不会**配置本地身份验证；
  凭据必须已经存在于 gateway 主机上。远程 gateway token
  字段会存储 macOS 应用用于连接该 Gateway 的 token；
  现有的 `gateway.remote.token` SecretRef 值会被保留，直到你
  替换它们。
- **稍后配置**：跳过设置并保持应用未配置。

<Tip>
**Gateway 身份验证提示：**

- Gateway auth 模式默认是 `token`，即使是 loopback 绑定也是如此，因此本地 WS 客户端必须进行身份验证。
- 设置 `gateway.auth.mode: "none"` 会让任何本地进程都能连接；仅应在完全受信任的机器上使用。
- 对于多机器访问或非 loopback 绑定，请使用 token。

</Tip>
</Step>
<Step title="CLI">
  本地设置会通过 npm、pnpm 或 bun 安装全局 `openclaw` CLI，并优先使用 npm。Node 仍然是 Gateway
  本身的推荐运行时。现有的兼容安装会被复用。
</Step>
<Step title="连接你的 AI">
  已连接且已经配置好代理模型的 Gateway 会直接跳过此
  页面，并打开正常的代理 UI。Crestodian 和提供方设置
  仅适用于全新或未完成配置的 Gateway。

完成 Gateway 就绪后，上手流程会查找你已经拥有的 AI 访问权限：
Claude Code 或 Codex 登录，或者 `OPENAI_API_KEY` /
`ANTHROPIC_API_KEY`。最佳选项会通过一次真实补全进行测试，并且
只有在成功回答后才会保存；当测试失败时，应用会自动尝试
下一个选项，并显示前一个选项失败的原因。如果找到多个选项，
你可以在继续之前在它们之间切换。

Gemini CLI 在设置完成后的正常代理中仍然可用，但这里不会提供，
因为它无法强制执行无工具推理探测。

你也可以通过提供方自己的 OAuth 或设备配对流程登录。
内置选项包括 OpenAI/ChatGPT、OpenRouter、GitHub Copilot、Google
Gemini CLI、xAI、MiniMax Global 和 CN，以及 Chutes。该列表来自
Gateway 当前启用的文本推理提供方插件，而不是固定的应用列表，
因此其他提供方无需添加特定于提供方的 macOS 代码也可以选择接入。

手动密钥/token 选择器使用相同的提供方注册表。在所有路径中，
提供方都会提供其起始模型和配置；OpenClaw 会使用相同的实时测试验证
凭据，然后再保存其身份验证配置文件。下一步会保持锁定，直到某个后端通过，
因此第一个代理对话不能在推理可用之前开始。该实时检查通过后，Crestodian 就会
可用，用于帮助配置其余的工作区、Gateway、渠道以及
其他可选功能；你之后也可以在 设置 → Crestodian 中再次使用它。
</Step>
<Step title="权限">

<Frame caption="选择要授予 OpenClaw 的权限">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

上手流程会请求以下 TCC 权限：Automation（AppleScript）、Notifications、Accessibility、Screen Recording、Microphone、Speech Recognition、Camera 和 Location。

</Step>
<Step title="完成">
  推理通过后，Crestodian 会负责其余可选设置，并可以
  将你转交到正常的代理聊天界面。完成权限引导
  会打开同一个聊天界面；应用不会在 Crestodian 之前创建工作区或启动单独的
  代理设置对话。请参见
  [Bootstrapping](/start/bootstrapping) 了解代理首次真正运行时
  在 gateway 主机上会发生什么。
</Step>
</Steps>

## 相关

- [上手引导概述](/start/onboarding-overview)
- [开始使用](/start/getting-started)
