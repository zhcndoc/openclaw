---
summary: "OpenClaw（macOS 应用）的首次运行引导流程"
read_when:
  - 设计 macOS 引导助手时
  - 实现身份验证或身份设置时
title: "引导（macOS 应用）"
sidebarTitle: "引导：macOS 应用"
---

# 引导（macOS 应用）

本文档描述了**当前**的首次运行引导流程。目标是打造顺畅的“第 0 天”体验：选择 Gateway 运行位置，连接身份验证，运行向导，并让代理自我初始化。  
有关引导路径的总体介绍，请参见 [引导概览](/start/onboarding-overview)。

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
<Step title="欢迎及安全通知">
<Frame caption="阅读显示的安全通知并据此决定">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是个人代理：一个受信任的操作边界。
- 共享/多用户配置需要锁定措施（拆分信任边界，保持工具访问最小化，并遵循[安全](/gateway/security)）。
- 本地引导现在默认新配置为 `tools.profile: "messaging"`，因此广泛的运行时/文件系统工具需主动启用。
- 如果启用了 hooks/webhooks 或其他不受信内容源，请使用强大的现代模型层，并保持严格的工具策略/沙箱限制。

</Step>
<Step title="本地 vs 远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 运行在哪？

- **本机（仅本地）：** 引导可以配置身份验证并在本地写入凭据。
- **远程（通过 SSH/Tailnet）：** 引导不会配置本地身份验证；凭据必须存在于 Gateway 主机上。
- **稍后配置：** 跳过设置，保持应用未配置状态。

<Tip>
**Gateway 身份验证提示：**

- 向导现会生成**令牌**，即使是环回地址，故本地 WS 客户端也必须认证。
- 如果禁用身份验证，任何本地进程均可连接；仅在完全信任的机器上使用此选项。
- 多机器访问或非环回绑定时，使用**令牌**。

</Tip>
</Step>
<Step title="权限">
<Frame caption="选择您希望授予 OpenClaw 的权限">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

引导请求的 TCC 权限包括：

- 自动化（AppleScript）
- 通知
- 辅助功能
- 屏幕录制
- 麦克风
- 语音识别
- 摄像头
- 定位

</Step>
<Step title="命令行工具">
  <Info>此步骤为可选</Info>
  应用可以通过 npm/pnpm 安装全局 `openclaw` CLI，使终端工作流和 launchd 任务开箱即用。
</Step>
<Step title="引导聊天（专用会话）">
  设置完成后，应用将打开专用引导聊天会话，代理可自我介绍并引导后续步骤。这样首次运行指导与您的正常对话分开。  
  参见 [引导启动](/start/bootstrapping) 查看代理首次运行时 Gateway 主机上的操作。
</Step>
</Steps>
