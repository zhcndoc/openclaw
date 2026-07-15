---
summary: "通过 computer 工具和 computer.act 节点命令在配对的 macOS 节点上进行代理驱动的桌面控制"
read_when:
  - 让网关代理查看并控制 Mac 桌面
  - 启用、权限或 computer use 的安全性
  - 扩展 computer.act 节点命令或其执行器
title: "Computer use"
---

Computer use 让网关代理能够查看并控制一个配对的 **macOS** 桌面：它使用现有的 `screen.snapshot` 节点命令捕获屏幕截图，并通过一个单一且危险的节点命令 `computer.act` 来驱动鼠标指针和键盘。动作集合遵循 Anthropic computer-use 的核心动作；可选的 `computer_20251124` 缩放未暴露。一个具备视觉能力的模型通过内置的 `computer` 代理工具来驱动它。

代理只发出一个统一的命令，`computer.act`；它无法知道某个节点是如何实现它的。macOS 节点通过进程内实现来完成 `computer.act`，结合嵌入式 Peekaboo 服务和有限的 CoreGraphics 原语（正确的 TCC 权限，无额外进程）。其他平台之后也可以实现同样的命令，而无需更改面向代理的契约。

## 要求

- 一个配对的 **macOS** 节点（以 node 模式运行的 OpenClaw macOS 应用）。
- 在 macOS 应用中启用 **Allow Computer Control** 设置（默认：关闭）。
- 已向 OpenClaw 授予 macOS **Accessibility** 权限（用于指针/键盘注入）以及 **Screen Recording** 权限（用于 `screen.snapshot`）。
- 在网关上已启用 `computer.act` 命令（它是危险的，默认处于未启用状态）。
- 一个具备视觉能力的 agent 模型。
- 公开 `computer` 的工具策略。默认的 `coding` 配置不提供它。将 `computer` 添加到 `tools.alsoAllow`；沙箱化 agent 还需要将其添加到 `tools.sandbox.tools.alsoAllow`。

## `computer` 代理工具

内置 `computer` 工具每次调用只执行一个动作。坐标是最近一次截图中的非负整数像素；节点会将它们映射到显示点。坐标类动作必须回显截图结果中的 `frameId`，并且显式的 `screenIndex` 必须与该帧匹配。OpenClaw 还会将节点发出的显示标识从截图带入动作，因此如果显示重新连接或几何形状发生变化，就会闭合失败，而不会静默地将同一索引重新定向。这些检查会拒绝猜测的令牌以及来自其他已交付帧或显示的令牌。令牌并不保证新鲜度：应用程序可能在捕获后更改同一显示上的像素，因此只要场景可能已发生变化，就应重新截图。

- 读取：`screenshot`。
- 指针：`left_click`、`right_click`、`middle_click`、`double_click`、`triple_click`、`mouse_move`、`left_click_drag`（带 `startCoordinate`）、`left_mouse_down`、`left_mouse_up`。
- 滚动：`scroll`，带 `scrollDirection`（`up|down|left|right`）和 `scrollAmount`（鼠标滚轮刻度）。
- 键盘：`type`（文本）、`key`（如 `cmd+shift+t` 或 `Return` 这样的组合键）、`hold_key`（持续 `duration` 秒的 `text` 组合键）。
- 节奏控制：`wait`（`duration` 秒）。

修饰键通过点击和滚动动作上的 `text` 字段传递（`shift`、`ctrl`、`alt`、`cmd`）。在输入动作之后，工具会返回一张新的截图，以便模型观察结果。如果连接了多个支持 computer 的节点，请显式传入 `node`。

截图仅供**模型内部使用**：它们绝不会自动传送到聊天频道。请将所有屏幕内容视为不受信任的输入；工具会警告模型不要遵循与用户请求相冲突的屏幕上的指令。

## `computer.act` 节点命令

`computer.act` 是工具路由输入所使用的唯一节点命令（通过 `node.invoke`，命令为 `"computer.act"`）。它具有以下特点：

- **默认危险**：列在内置的危险节点命令中，并且在显式启用之前会被排除在运行时允许列表之外。macOS 节点在配对时仍可能声明它，以便该能力一旦开放就已获批准。
- **目前仅限 macOS**：只有启用了 **允许电脑控制** 的 macOS 节点才会公开该命令。

读取会复用 `screen.snapshot`；没有第二种捕获路径。有关共享捕获命令，请参见 [Camera and screen nodes](/nodes/camera)。

## 启用并武装

1. 在 macOS 应用中，启用 **Settings → Allow Computer Control**。然后打开 **Settings → Permissions**，并在 macOS 系统设置中授予 **Accessibility** 和 **Screen Recording**。
2. 在网关上批准配对更新（新命令会强制重新配对）。
3. 将该工具暴露给具备视觉能力的代理。对于默认的 `coding` 配置文件：

   ```json5
   {
     tools: {
       alsoAllow: ["computer"],
       // 沙箱化代理也需要这个第二道关卡：
       sandbox: { tools: { alsoAllow: ["computer"] } },
     },
   }
   ```

4. 为受限时间窗口武装 `computer.act`。`phone-control` 插件暴露了一个 `computer` 组：

   ```text
   /phone arm computer 30m
   /phone status
   /phone disarm
   ```

   武装需要 `operator.admin`（或所有者）权限，并会自动过期。旧的 `/phone arm all` 组有意不包含桌面控制；请使用显式的 `computer` 组。武装只会切换网关可调用的内容；macOS 应用仍会强制执行其 **Allow Computer Control** 设置和操作系统权限。

对于持久授权，请将 `computer.act` 添加到 `gateway.nodes.allowCommands`，并**将其从** `gateway.nodes.denyCommands` 中移除；拒绝列表优先。持久授权不会自动过期。`/phone arm` 之前已存在的条目在 `/phone disarm` 之后仍会保留；不要在其处于武装状态时将临时授权转换为持久授权。

授权在启用和使用之间被刻意拆分。武装或持久配置 `computer.act` 需要管理员权限。一旦武装，具有 `operator.write` 的已认证操作员即可通过 `node.invoke` 调用 `computer.act`，直到授权过期或解除武装为止；每次操作都不会再单独进行管理员检查。批准声明 `computer.act` 的节点只会记录该能力，以便之后可以武装，并不会自行启用调用。

## 安全

- 在授权之前，每一层（工具策略、网关命令策略、macOS 设置、辅助功能和屏幕录制）都必须一致。一旦进入武装状态，操作会在不逐项确认的情况下执行，直到过期或执行 `/phone disarm`。
- 文本输入按每个字素逐个发送。取消、断开、暂停、禁用或替换端点会在下一个字素之前停止它，而不是让过期的剩余内容继续发送。
- 截图仅供模型使用，绝不会自动发送到聊天中（问题 [#44759](https://github.com/openclaw/openclaw/issues/44759)）。
- 请将屏幕内容视为不可信；其中可能包含提示注入。

## 与其他桌面控制路径的关系

这是由代理驱动的路径。请参见 [Peekaboo bridge](/platforms/mac/peekaboo)，了解它与 PeekabooBridge 主机、Codex Computer Use 以及直接的 `cua-driver` MCP 之间的关系。
