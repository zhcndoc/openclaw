---
summary: "通过 computer 工具和 computer.act 节点命令实现基于能力的桌面控制"
read_when:
  - 让网关代理看到并控制已配对的桌面
  - 启用、权限或 computer 使用的安全性
  - 扩展 computer.act 节点命令或其实现器
title: "计算机使用"
---

计算机使用允许网关代理查看并控制一个具备能力的已配对桌面。资格基于能力：已连接的节点必须同时声明 `computer.act` 和 `screen.snapshot`，其结果必须包含 `displayFrameId`。该工具会捕获一张截图作为参考帧，然后通过 `computer.act` 驱动指针和键盘。动作集遵循核心 Anthropic computer-use 动作；可选的 `computer_20251124` 缩放不对外暴露。一个具备视觉能力的模型通过内置的 `computer` 代理工具来驱动它。

代理只发出一个统一命令 `computer.act`；它无法知道节点如何实现该命令。随附的 macOS 应用会在进程内处理该命令，结合嵌入式 Peekaboo 服务和较小范围的 CoreGraphics 原语（正确的 TCC 权限，无额外进程）。Windows 和 Linux 可以使用可选的、实验性的 `cua-computer` 插件，并配合单独安装的 `cua-driver` 二进制文件。两种实现器都使用相同的持久本地启用和配对策略。

## 要求

- 一个成对、连通的节点，同时提供 `computer.act` 和 `screen.snapshot`，其中 `screen.snapshot` 返回 `displayFrameId`。
- **macOS 执行器：** 已启用应用设置 **允许计算机控制**。它默认开启；如果明确选择关闭，则保持关闭。
- **macOS 执行器：** 已向 OpenClaw 授予 **辅助功能** 和事件注入访问权限（用于指针/键盘注入），以及 **屏幕录制** 权限（用于 `screen.snapshot`）。
- **Windows/Linux 执行器：** 已启用捆绑的 `cua-computer` 插件，并安装了兼容的 `cua-driver` 0.10.x 可执行文件。
- 已在网关上批准包含 `computer.act` 的配对更新。
- 一个具备视觉能力的代理模型。
- 暴露 `computer` 的工具策略。默认的 `coding` 配置文件不会暴露它。将 `computer` 添加到 `tools.alsoAllow`；沙箱化代理还需要将其添加到 `tools.sandbox.tools.alsoAllow`。

## `computer` 代理工具

内置 `computer` 工具每次调用只执行一个动作。坐标是最近一次截图中的非负整数像素；节点会将它们映射到显示点。坐标类动作必须回显截图结果中的 `frameId`，并且显式的 `screenIndex` 必须与该帧匹配。OpenClaw 还会将节点发出的显示标识从截图带入动作，因此如果显示重新连接或几何形状发生变化，就会闭合失败，而不会静默地将同一索引重新定向。这些检查会拒绝猜测的令牌以及来自其他已交付帧或显示的令牌。令牌并不保证新鲜度：应用程序可能在捕获后更改同一显示上的像素，因此只要场景可能已发生变化，就应重新截图。

- 读取：`screenshot`。
- 指针：`left_click`、`right_click`、`middle_click`、`double_click`、`triple_click`、`mouse_move`、`left_click_drag`（带 `startCoordinate`）、`left_mouse_down`、`left_mouse_up`。
- 滚动：`scroll`，带 `scrollDirection`（`up|down|left|right`）和 `scrollAmount`（鼠标滚轮刻度）。
- 键盘：`type`（文本）、`key`（如 `cmd+shift+t` 或 `Return` 这样的组合键）、`hold_key`（持续 `duration` 秒的 `text` 组合键）。
- 节奏控制：`wait`（`duration` 秒）。

修饰键通过点击和滚动动作上的 `text` 字段传递（`shift`、`ctrl`、`alt`、`cmd`）。在输入动作之后，工具会返回一张新的截图，以便模型观察结果。如果连接了多个支持 computer 的节点，请显式传入 `node`。

截图仅供**模型内部使用**：它们绝不会自动传送到聊天频道。请将所有屏幕内容视为不受信任的输入；工具会警告模型不要遵循与用户请求相冲突的屏幕上的指令。

## Windows 和 Linux（实验性，通过 cua-driver）

捆绑的 `cua-computer` 插件为 Windows 和 Linux 节点主机提供了一个实验性的执行器。它默认禁用，并且需要预发布版 0.10.x 驱动契约：

1. 从 [上游发布](https://github.com/trycua/cua/releases) 中安装 `cua-driver` 0.10.x 二进制文件，并使其可在 `PATH` 中使用。若要使用其他可执行文件位置，请设置 `plugins.entries.cua-computer.config.driverPath`。
2. 启用插件：

   ```bash
   openclaw plugins enable cua-computer
   ```

3. 在交互式桌面会话中启动 `openclaw node run`。当第一个截图或操作到来时，插件会按需启动本地驱动守护进程。

此执行器目前仅控制主显示器。X11/XWayland 是 Linux 的首选路径。原生 Wayland 仍然是上游的可选启用项：请在启动节点之前自行设置 `CUA_DRIVER_RS_ENABLE_WAYLAND`；OpenClaw 从不自动设置它。上游原生 Wayland 输入路径不支持 KDE/KWin。由于 cua-driver 0.10.x 没有跨平台的桌面范围按住契约，`hold_key`、`left_mouse_down` 和 `left_mouse_up` 不可用。带修饰键的滚动和拖拽在两个平台上都不可用，而在 Linux 上带修饰键的点击也不可用。`key` 操作接受命名按键、字母和修饰键组合（例如 `cmd+c` 或 `Return`）；数字和标点按键会被拒绝，因为驱动会丢弃其与布局相关的 Shift 状态，因此请改用 `type` 操作发送这些文本。文本输入在 `type_text` 驱动调用过程中无法中途取消。

由于 cua-driver 不报告稳定的显示身份，帧授权会绑定到驱动连接以及当前主显示器几何信息。守护进程或会话重连会使未完成的帧失效，但若保持连接打开，且主显示器在几何信息相同的情况下被替换，则无法检测到；对于此执行器，建议使用稳定的单显示器会话。

OpenClaw 会为其管理的 `mcp` 和 `serve` 进程禁用 cua-driver 遥测和更新检查。它不会下载或更新驱动二进制文件。

### 故障排除

`cua-computer` 执行器会在工具结果和节点日志中显示类型化错误代码。常见的有：

| Code                                                 | Cause                                                                                                                                                           | Fix                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMPUTER_DRIVER_UNAVAILABLE`                        | `cua-driver` 二进制文件不在 `PATH` 中（或 `driverPath` 配置错误）、守护进程未能及时就绪，或者该节点不是 Windows/Linux。                 | 将 `cua-driver` 0.10.x 安装到 `PATH` 中，或设置 `driverPath`。请在交互式桌面会话中运行 `openclaw node run`；在 Linux 上，请确保存在 X11 `DISPLAY`（或带有 `CUA_DRIVER_RS_ENABLE_WAYLAND` 的 `WAYLAND_DISPLAY`）。 |
| `COMPUTER_DRIVER_UNSUPPORTED`                        | 已连接的驱动不是 `cua-driver` 0.10.x，或者其能力/模式版本不同。                                                                      | 安装受支持的 0.10.x 构建版本。插件在你修正后大约 30 秒会重新探测，因此无需重启节点。                                                                                                          |
| `COMPUTER_REFUSED_<code>`                            | 驱动以结构化代码拒绝了该操作，例如 `background_unavailable`、`background_occluded` 或 `foreground_unavailable`（KDE/KWin Wayland）。   | 将目标窗口置于前台，切换到 X11，或使用受支持的合成器。请参见上面的兼容性说明。                                                                                                                    |
| `COMPUTER_STALE_FRAME`                               | 这些坐标引用的是一个已不再是当前状态的截图（上下文压缩、显示几何变化，或参考宽度变化）。                 | 在执行坐标操作前，先拍摄一张新的 `screenshot`。                                                                                                                                                                              |
| `COMPUTER_UNSUPPORTED_ACTION`                        | 此执行器无法忠实完成的操作：`hold_key`、`left_mouse_down`、`left_mouse_up`、带修饰键的拖拽/滚动，或在 Linux 上带修饰键的点击。 | 使用受支持的操作。cua-driver 0.10.x 没有桌面范围的按住输入契约。                                                                                                                                                  |
| `COMPUTER_UNSUPPORTED_DISPLAY`                       | 非主 `screenIndex`、捕获/屏幕几何不匹配，或光标位于主显示器之外。                                                       | 仅驱动主显示器。                                                                                                                                                                                                      |
| `COMPUTER_UNSUPPORTED_KEY`                           | 驱动无法可靠复现的 `key` 值：数字键或其 Shift 状态依赖布局的标点键，或者未知按键。                        | 改用 `type` 操作发送这些文本。                                                                                                                                                                                    |
| `COMPUTER_DRIVER_ERROR` / `COMPUTER_INVALID_REQUEST` | 驱动失败但没有结构化代码，或者操作参数格式错误。                                                                            | 检查驱动状态并重新截图；更正操作参数。                                                                                                                                                        |

## `computer.act` 节点命令

`computer.act` 是工具路由输入所使用的唯一节点命令（通过 `node.invoke`，命令为 `"computer.act"`）。它具有以下特点：

- **本地启用**：只有在启用 Computer Control 时，节点才会宣告该能力。网关可以在配对时一次性批准该已宣告的能力面。
- **基于能力**：该工具要求已连接节点同时宣告 `computer.act` 和 `screen.snapshot`。内置的 macOS 应用和可选择启用的实验性 `cua-computer` 插件提供相同的命令对。

读取会复用 `screen.snapshot`；没有第二种捕获路径。有关共享捕获命令，请参见 [Camera and screen nodes](/nodes/camera)。

## 授权

1. 启用平台执行器：在 macOS 上，**Settings → Allow Computer Control** 默认已开启，然后在 **Settings → Permissions** 下授予 **Accessibility** 和 **Screen Recording**；在 Windows/Linux 上，请按照上方实验性的 `cua-computer` 设置进行。
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

一旦启用节点本地控制并批准配对更新，只要节点继续声明该能力，`computer.act` 就会持续可用。这里没有租约、过期或 arm/disarm 命令。本地禁用 Computer Control 会移除已声明的命令，且节点会在调用时重新检查该开关。

在 macOS 上，默认开启意味着，一旦所需的 macOS 授权存在，已配对的网关就可以立即驱动指针和键盘输入。没有逐次操作确认。请在配对之前，或之后的任何时候，关闭 **Allow Computer Control**，以停止声明并接受 `computer.act`。

`gateway.nodes.commands.deny` 仍然是显式的全局撤销，并且始终优先生效。`computer.act` 不需要 `gateway.nodes.commands.allow` 条目。拥有 `operator.write` 的已认证操作员可以通过 `node.invoke` 调用已启用且已配对的命令；这里没有逐次操作的管理员检查。

## 安全

- 每一层（工具策略、网关命令策略、配对、node-app 设置，以及平台权限）都必须一致。对于当前的 macOS 执行器，这包括 **允许控制计算机**、辅助功能和屏幕录制。只要这些持久性控制保持启用，操作就会执行；没有每次操作的确认。
- macOS 执行器一次发送一个字素的文本，因此取消、断开连接、暂停、禁用或端点替换都会在下一个字素之前将其停止。实验性的 cua-driver 执行器无法在 `type_text` 调用进行到一半时取消。
- 截图仅供模型使用，不会自动发送到聊天（问题 [#44759](https://github.com/openclaw/openclaw/issues/44759)）。
- 将屏幕内容视为不可信；它可能包含提示注入。

## macOS 权限故障排除

**设置 → 通用 → 功能** 中的计算机控制状态会分别检查辅助功能、事件发布和屏幕录制。即使输入仍被拒绝，屏幕捕获也可能正常工作，因为 macOS 会将这些授权存储在不同的 TCC 存储桶中。

如果状态显示 **辅助功能授权可能已过期**，即使 macOS 拒绝它，OpenClaw 也可能已经在 **系统设置 → 隐私与安全性 → 辅助功能** 下显示为已启用。当辅助功能条目固定到较旧的应用构建版本时，就会发生这种情况。在该列表中选择 OpenClaw，使用 **−** 将其移除，然后重新添加 `/Applications/OpenClaw.app`。更改授权后，请退出并重新打开 OpenClaw，因为 macOS 可能会在进程生命周期内缓存辅助功能信任。

## 与其他桌面控制路径的关系

这是由代理驱动的路径。请参见 [Peekaboo bridge](/platforms/mac/peekaboo)，了解它与 PeekabooBridge 主机、Codex Computer Use 以及直接的 `cua-driver` MCP 之间的关系。
