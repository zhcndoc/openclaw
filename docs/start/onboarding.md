---
summary: "OpenClaw 的首次运行设置流程（macOS 应用）"
read_when:
  - 设计 macOS 上手助手
  - 实现身份验证或身份设置
title: "上手引导（macOS 应用）"
sidebarTitle: "上手引导：macOS 应用"
---

本文档描述了**当前**的首次运行设置流程。目标是提供一种顺畅的“第 0 天”体验：选择 Gateway 运行的位置，连接身份验证，运行向导，并让代理自动完成引导。
有关上手路径的一般概述，请参阅 [Onboarding Overview](/start/onboarding-overview)。

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

- 默认情况下，OpenClaw 是一个个人代理：只有一个受信任的操作员边界。
- 共享/多用户设置需要锁定（拆分信任边界、将工具访问保持在最低限度，并遵循 [安全](/gateway/security)）。
- 本地上手引导现在默认将新配置设置为 `tools.profile: "coding"`，因此新的本地设置会保留文件系统/运行时工具，而不会强制使用不受限制的 `full` 配置文件。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型等级，并保持严格的工具策略/沙箱隔离。

</Step>
<Step title="本地还是远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 运行在哪里？

- **这台 Mac（仅本地）：** 上手引导可以配置身份验证并将凭据写入本地。
- **远程（通过 SSH/Tailnet）：** 上手引导**不会**配置本地身份验证；凭据必须已存在于 gateway 主机上。
- **稍后配置：** 跳过设置并保持应用未配置。

<Tip>
**Gateway 身份验证提示：**

- 向导现在即使对回环地址也会生成一个 **token**，因此本地 WS 客户端必须进行身份验证。
- 如果你禁用身份验证，任何本地进程都可以连接；仅在完全受信任的机器上使用该选项。
- 对于多机器访问或非回环绑定，请使用 **token**。

</Tip>
</Step>
<Step title="权限">
<Frame caption="选择你想授予 OpenClaw 哪些权限">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

上手引导会请求以下所需的 TCC 权限：

- 自动化（AppleScript）
- 通知
- 辅助功能
- 屏幕录制
- 麦克风
- 语音识别
- 摄像头
- 定位

</Step>
<Step title="CLI">
  <Info>此步骤是可选的</Info>
  应用可以通过 npm、pnpm 或 bun 安装全局 `openclaw` CLI。
  它会优先使用 npm，然后是 pnpm，如果检测到的唯一包管理器是 bun，则使用 bun。对于 Gateway 运行时，Node 仍然是推荐路径。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  设置完成后，应用会打开一个专门的上手引导聊天会话，这样代理就可以
  自我介绍并指导后续步骤。这使首次运行的引导与
  你的常规对话分开。有关首次代理运行期间在 gateway 主机上发生的情况，请参阅 [Bootstrapping](/start/bootstrapping)。
</Step>
</Steps>

## 相关

- [上手引导概述](/start/onboarding-overview)
- [开始使用](/start/getting-started)
