---
summary: "禁用 SIP 和库验证，注入 imsg 帮助程序，并验证私有 API 桥"
read_when:
  - "启用 iMessage 反应、编辑、效果、投票或群组操作"
  - "决定是否禁用系统完整性保护"
  - "调试失败的 imsg 启动"
title: "启用 imsg 专用 API"
sidebarTitle: "私人API"
---

私有 API 模式解锁本机 iMessage 操作。它需要关闭 SIP、放松库验证以及成功的帮助程序注入。

## <a id="enabling-the-imsg-private-api"></a> 启用 imsg 私有 API

`imsg` 有两种运行模式。对于 OpenClaw，推荐使用私有 API 模式，因为它能为该通道提供用户期望的原生 iMessage 操作。基础模式仍然适用于低风险安装、初始验证，或无法禁用 SIP 的主机。

- **基本模式**（默认，无需SIP更改）：通过`send`出站文本和媒体，入站watch/history，聊天列表。这是您从新的 `brew install steipete/tap/imsg` 加上标准 [macOS 权限 ](/channels/imessage/setup#requirements-and-permissions-macos) 中获得的开箱即用的内容。
- **私有 API 模式**：`imsg` 会向 `Messages.app` 注入一个 helper dylib，以调用内部 `IMCore` 函数。这将解锁 `react`、`edit`、`unsend`、`reply`（线程式）、`sendWithEffect`、`poll` 和 `poll-vote`（原生 Messages 投票）、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及输入指示和已读回执。

本页推荐的操作面需要私有 API 模式。`imsg` README 对此要求写得很明确：

> 诸如 `read`、`typing`、`launch`、基于桥接的富发送、消息变更和聊天管理等高级功能都是可选的。它们需要禁用 SIP，并将一个 helper dylib 注入到 `Messages.app` 中。启用 SIP 时，`imsg launch` 会拒绝注入。

辅助注入技术使用 `imsg` 自己的 dylib 来访问消息私有 API。 OpenClaw iMessage 路径中没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用SIP是一个真正的安全权衡。** SIP是macOS针对运行修改的系统代码的核心保护之一；在系统范围内将其关闭会产生更多攻击系统的方法并产生其他副作用。值得注意的是，**在 Apple Silicon Mac 上禁用 SIP 还会禁用在 Mac** 上安装和运行 iOS 应用程序的功能。

将此视为一个深思熟虑的操作选择，尤其是在主要的个人 Mac 上。对于生产质量的 OpenClaw iMessage，更喜欢专用的 Mac 或机器人 macOS 用户，您可以轻松地启用桥接。如果您的威胁模型无法容忍 SIP 在任何地方关闭，则 iMessage 插件仅限于基本模式 - 仅文本和媒体 send/receive，没有反应/编辑/取消发送/效果/组操作。
</Warning>

### <a id="setup"></a> 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级）`imsg`**：

   ```bash
   brew install steipete/tap/imsg
   brew update && brew upgrade imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 的输出会报告 `bridge_version`、`rpc_methods` 以及每个方法的 `selectors`，这样你就能在开始之前看到当前构建支持哪些能力。

2. **禁用系统完整性保护和（在现代 macOS 上）库验证。** 将非 Apple 帮助程序 dylib 注入 Apple-signed `Messages.app` 需要SIP 关闭 **和** 库验证放松。恢复模式 SIP 步骤是 macOS- 版本特定的：
   - **macOS 10.13-10.15（Sierra-Catalina）：** 通过 Terminal 禁用 Library Validation，重启进入恢复模式，运行 `csrutil disable`，然后重启。
   - **macOS 11+（Big Sur 及更高版本），Intel：** 进入恢复模式（或 Internet Recovery），运行 `csrutil disable`，然后重启。
   - **macOS 11+，Apple Silicon：** 使用电源键启动流程进入恢复模式；在较新的 macOS 版本上，点击 Continue 时按住 **Left Shift** 键，然后运行 `csrutil disable`。虚拟机环境遵循单独流程，因此请先拍摄 VM 快照。

   **在 macOS 11 及更高版本上，单独执行 `csrutil disable` 通常还不够。** Apple 仍然会将 `Messages.app` 作为平台二进制文件执行 library validation，因此即使关闭 SIP，adhoc 签名的 helper 也会被拒绝（`Library Validation failed: ... platform binary, but mapped file is not`）。在禁用 SIP 之后，还要禁用 library validation 并重启：

   ```bash
   sudo defaults write /Library/Preferences/com.apple.security.libraryvalidation.plist DisableLibraryValidation -bool true
   ```

   **macOS 26 （Tahoe），在 26.5.1：** SIP off **plus** 上验证，上面的 `DisableLibraryValidation` 命令足以注入助手26.0 到 26.5.x. **不需要启动参数。** plist 是决定性因素，也是 Tahoe 上注入失败时最常见的缺失步骤：
   - **有 plist：** `imsg launch` 会完成注入，并且 `imsg status` 会报告 `advanced_features: true`。
   - **没有 plist（即使 SIP 已关闭）：** `imsg launch` 会失败，并报出 `Failed to launch: Timeout waiting for Messages.app to initialize`。AMFI 在加载时拒绝了 adhoc helper，因此 bridge 永远无法就绪，启动最终超时。这个超时是大多数人在 Tahoe 上遇到的症状；修复方法就是上面的 plist，而不是采取更激进的手段。

   如果在 macOS 升级后，`imsg launch` 注入失败，或者某些特定 `selectors` 开始返回 false，通常就是这个门槛导致的。在假设 SIP 步骤本身失败之前，请先检查你的 SIP 和 library-validation 状态。如果这些设置都正确，但 bridge 仍然无法注入，请收集 `imsg status --json` 和 `imsg launch` 的输出并反馈给 `imsg` 项目，而不是进一步削弱系统级安全控制。

3. **注入 helper。** 在禁用 SIP 且已登录 Messages.app 的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍然启用时，`imsg launch` 会拒绝注入，因此这也可作为第 2 步是否生效的确认。

4. **从 OpenClaw 验证桥接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 `works`，`imsg status --json | jq '{rpc_methods, selectors}'` 应显示 macOS 构建公开的功能。创建民意调查需要 `selectors.pollPayloadMessage`；投票需要 `selectors.pollVoteMessage` 和 `poll.vote` RPC 方法。 OpenClaw 插件仅通告缓存检查支持的操作，而空缓存则保持乐观状态并在首次调度时进行检查。

如果 `openclaw channels status --probe` 将通道报告为 `works` 但特定操作在调度时抛出“iMessage `<action>` 需要 imsg 私有 API 桥”，请再次运行 `imsg launch` — 帮助程序可能会退出（Messages.app 重新启动， OS 更新等）和缓存的 `available: true` 状态将保持广告操作，直到下一次检查刷新。

### <a id="when-sip-stays-enabled"></a> 当 SIP 保持启用时

如果根据你的威胁模型不能关闭 SIP：

- `imsg` 会回退到基本模式——仅支持文本＋媒体＋接收。
- OpenClaw插件仍然通告text/media发送和入站监控；它隐藏了操作界面中的 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和组操作（根据每个方法的功能门）。
- 您可以在关闭 SIP 的情况下运行单独的非 Apple-Silicon Mac（或专用机器人 Mac）来处理 iMessage 工作负载，同时在主要设备上保持启用 SIP。请参阅 [ 专用机器人 macOS 用户（单独的 iMessage 身份）](/channels/imessage/deployment#deployment-patterns)。
