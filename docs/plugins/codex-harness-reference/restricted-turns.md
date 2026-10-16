---
summary: "当工具策略限制 Codex 本机表面时，零环会添加什么"
read_when:
  - "您正在为 Codex 设置工具允许或拒绝策略"
  - "您需要经过审核的安全拒绝工具名称"
  - "您正在调试没有本机代码模式的回合"
title: "Codex 限制转弯"
sidebarTitle: "限制转弯"
---

哪些工具策略将 Codex 转向受限制的本机表面。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

## <a id="restricted-turns"></a> 限制转弯

Codex harness会评估每个回合的有效工具策略。当任何显式策略都会将 Codex-native 能力留在 OpenClaw 策略边界之外时，它标志着策略限制的转变。

限制源包括全局、提供者、代理、组、发送者、沙箱、子代理、继承、scheduled/runtime 和每次运行工具策略。有限的允许列表始终限制本机表面。当扩展条目未知或不存在于审核的安全拒绝集中时，拒绝列表会对其进行限制；这包括通配符和包含任何不安全条目的工具组。 `disableTools` 成为空的每次运行允许列表，因此也限制本机表面。默认刀具轮廓缩小不是明确的限制，并且不会激活此模式。

当前审核的安全拒绝名称是：

```text
agents_list, automations, canvas, dashboard, gateway, heartbeat_respond,
image_generate, memory_get, memory_search, message, music_generate, openclaw,
progress_card, session_status, show_widget, skill_workshop, tts, video_generate,
web_fetch, x_search
```

仅包含这些拒绝的策略保留在正常的 Codex 本机表面上；该harness直接应用名为 OpenClaw 的拒绝。任何其他拒绝均使用受限表面。例如，`tools.deny: ["nodes"]` 限制本机表面，因为 `nodes` 不在审核集中。

仅 OpenClaw 管理和状态拒绝不会删除本机 Codex 工具。会话和对话工具否认仍然限制本机表面：受支持的运行时尚未有资格独立于可选挂钩强制执行相同的目标边界。因此，默认的 OpenClaw 子项仍然受到限制。 OpenClaw 的本机输入准入检查发送者的准入树，但该钩端检查不能替代本机执行。

达到其配置的委派深度上限的子级也会失去本机协作，就像显式本机工具拒绝、有限允许列表或其他不安全限制一样。受限轮次不会在其开发人员说明中宣传本机帮助程序，例如 `spawn_agent`。

策略限制轮流没有 Codex 环境选择或本机代码模式。 OpenClaw 禁用继承和配置的 MCP 服务器，证明它们保持禁用状态，禁用本机挂钩中继，并将有效策略应用于其动态工具。对现有会话的临时限制使用瞬态 Codex 线程，并保留不受限制的绑定以供以后恢复。

零环不是可配置的策略配置文件。它是 OpenClaw 设置和修复流程使用的主机范围的系统代理路径。主机必须激活系统代理权限并提供准确的单一工具白名单 `["openclaw"]`。零环应用受限的工具表面以及主机编写的基本指令和零项目文档预算。它还会抑制 OpenClaw 的 `AGENTS.md` 开发人员指令载体，因此环境工作区指令无法进入 setup/repair 回合。

仅消息源回复也使用受限工具界面。轻量级引导转向和工具禁用的内部转向另外将项目文档预算设置为零。即使它们的最终线程配置重叠，这些模式也是单独的输入。
