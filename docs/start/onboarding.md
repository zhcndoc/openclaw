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

<Tip>
需要先获取应用？[下载适用于 macOS 的 OpenClaw](/platforms/macos#download)，
然后返回这里进行首次运行设置。
</Tip>

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
  已连接的 Gateway 如果已经配置了代理模型，会直接跳过此
  页面并打开正常的代理界面。OpenClaw 和提供方设置
  仅会在全新或未完整配置的 Gateway 上运行。

一旦 Gateway 就绪，上手流程会查找你已经拥有的 AI 访问权限：
Claude Code 或 Codex 登录、`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`，或者
一个具备工具能力且已经安装在可访问的 Ollama 或 LM Studio 服务器中的模型，
其测得的有效上下文至少为 16K。检测会在 Gateway 主机上运行，
包括 macOS 应用连接到 Linux Gateway 的情况。系统会用真实补全测试最佳
选项，并且只有在其成功响应后才会保存；如果测试失败，应用会自动尝试
下一个选项，并显示前一个选项失败的原因。如果找到多个选项，你可以在继续之前
在它们之间切换。自动本地发现不会拉取或下载模型。

如果 Gateway 主机上没有 Claude CLI 登录，但你想使用 Claude 订阅，请在任意
安装了 Claude Code 的机器上运行 `claude setup-token`，然后将打印出的 token 作为
**Anthropic setup-token** 粘贴到 **Connect with an API key or token** 中。

已安装的 Gemini CLI、Antigravity、Pi 和 OpenCode CLI 会在它们不能作为
可复用的引导式设置推理路径被选中时显示为上下文信息。Gemini 和 Antigravity
无法强制执行免工具推理探测。Pi 和 OpenCode 是完整代理的运行框架，而不是
设置推理路径；它们的会话集成需要单独的运行时和插件设置。

你也可以通过提供方自己的 OAuth 或设备配对流程登录。
内置选项包括 OpenAI/ChatGPT、OpenRouter、GitHub Copilot、Google
Gemini CLI、xAI、MiniMax Global 和 CN，以及 Chutes。该列表来自
Gateway 当前启用的文本推理提供方插件，而不是固定的应用列表，
因此其他提供方无需添加特定于提供方的 macOS 代码也可以选择接入。

The manual key/token picker uses the same provider registry. In every route,
the provider supplies its starter model and configuration; OpenClaw verifies
the credential with the same live test before storing its auth profile. Next
remains locked until one backend has passed, so the first agent chat cannot
start without working inference. After that live check passes, OpenClaw becomes
available to help configure the remaining workspace, Gateway, channels, and
other optional features. When OpenClaw offers a short list of choices, the app
shows native option cards; choosing one sends the selection, and **Skip for
now** always leaves the choice optional. OpenClaw is also available later under
Settings → OpenClaw.
</Step>
<Step title="导入记忆（检测到时显示）">
对于本地 Gateway，上手流程会检查 Mac 上来自受支持 AI 工具的记忆：Claude Code
自动记忆、Codex 汇总记忆以及 Hermes 记忆文件。找到任何内容时，此页面会列出每个来源及其记忆数量，
并允许你将选中的来源导入到代理工作区的 `memory/imports/` 中以便索引回忆。已导入的文件会被跳过，
且当没有任何可导入内容时该页面不会出现。跳过是安全的；仪表板中的 Memory 导入页面稍后也提供
相同的导入功能，并支持按文件控制。
</Step>
<Step title="权限">

<Frame caption="选择要授予 OpenClaw 的权限">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

上手流程会请求以下 TCC 权限：Automation（AppleScript）、Notifications、Accessibility、Screen Recording、Microphone、Speech Recognition、Camera 和 Location。

</Step>
<Step title="完成">
  推理通过后，OpenClaw 会接管其余可选设置，并可以将你
  交接到正常的代理聊天。完成权限引导后会打开同样的聊天；
  应用不会在 OpenClaw 之前创建工作区或启动单独的代理设置对话。
  关于代理首次真正运行时在 gateway 主机上会发生什么，请参见
  [启动引导](/start/bootstrapping)。
</Step>
</Steps>

## 相关

- [上手引导概述](/start/onboarding-overview)
- [开始使用](/start/getting-started)
