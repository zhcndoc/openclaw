---
summary: "通过 computer 工具和 computer.act 节点命令实现基于能力的桌面控制"
read_when:
  - 让网关代理看到并控制已配对的桌面
  - 启用、权限或 computer 使用的安全性
  - 扩展 computer.act 节点命令或其实现器
title: "计算机使用"
---

计算机使用允许网关代理查看并控制一个具备能力的已配对桌面。资格基于能力：已连接的节点必须同时声明 `computer.act` 和 `screen.snapshot`，其结果必须包含 `displayFrameId`。该工具会捕获一张截图作为参考帧，然后通过 `computer.act` 驱动指针和键盘。动作集遵循核心 Anthropic computer-use 动作；可选的 `computer_20251124` 缩放不对外暴露。一个具备视觉能力的模型通过内置的 `computer` 代理工具来驱动它。

代理会发出一个统一的命令 `computer.act`；它无法得知节点是如何实现该命令的。随附的 macOS 应用会通过嵌入式 Peekaboo 服务和精简的 CoreGraphics 原语在进程内处理该命令（使用正确的 TCC 权限，无需额外进程）。Windows 和 Linux 可以使用可选的实验性 `cua-computer` 插件，该插件会直接调用打包的 CUA Driver SDK。两种实现器都使用相同的持久化本地启用和配对策略。

## 要求

- 一个已配对且已连接的节点，同时提供 `computer.act` 和 `screen.snapshot`，其中 `screen.snapshot` 返回 `displayFrameId`。
- **macOS 执行端：**已启用应用设置 **允许电脑控制**。该设置默认为开启；明确选择关闭后将保持关闭。
- **macOS 执行端：**已向 OpenClaw 授予 **辅助功能**和事件发布访问权限（用于指针/键盘注入），以及 **屏幕录制**权限（用于 `screen.snapshot`）。
- **Windows/Linux 执行端：**已启用捆绑的 `cua-computer` 插件。其软件包包含固定版本的 CUA Driver SDK 0.14.1 运行时；未配置 `cua-driver` 可执行文件、守护进程或 MCP 服务器。
- 已在网关上批准包含 `computer.act` 的配对更新。
- 具备视觉能力的智能体模型。
- 可公开使用 `computer` 的工具策略。默认的 `coding` 配置文件不包含该工具。将 `computer` 添加到 `tools.alsoAllow`；沙箱智能体还需要将其添加到 `tools.sandbox.tools.alsoAllow`。

## `computer` 代理工具

内置 `computer` 工具每次调用只执行一个动作。坐标是最近一次截图中的非负整数像素；节点会将它们映射到显示点。坐标类动作必须回显截图结果中的 `frameId`，并且显式的 `screenIndex` 必须与该帧匹配。OpenClaw 还会将节点发出的显示标识从截图带入动作，因此如果显示重新连接或几何形状发生变化，就会闭合失败，而不会静默地将同一索引重新定向。这些检查会拒绝猜测的令牌以及来自其他已交付帧或显示的令牌。令牌并不保证新鲜度：应用程序可能在捕获后更改同一显示上的像素，因此只要场景可能已发生变化，就应重新截图。

- 读取：`screenshot`。
- 指针：`left_click`、`right_click`、`middle_click`、`double_click`、`triple_click`、`mouse_move`、`left_click_drag`（带 `startCoordinate`）、`left_mouse_down`、`left_mouse_up`。
- 滚动：`scroll`，带 `scrollDirection`（`up|down|left|right`）和 `scrollAmount`（鼠标滚轮刻度）。
- 键盘：`type`（文本）、`key`（如 `cmd+shift+t` 或 `Return` 这样的组合键）、`hold_key`（持续 `duration` 秒的 `text` 组合键）。
- 节奏控制：`wait`（`duration` 秒）。

修饰键通过点击和滚动动作上的 `text` 字段传递（`shift`、`ctrl`、`alt`、`cmd`）。在输入动作之后，工具会返回一张新的截图，以便模型观察结果。如果连接了多个支持 computer 的节点，请显式传入 `node`。

截图仅供**模型内部使用**：它们绝不会自动传送到聊天频道。请将所有屏幕内容视为不受信任的输入；工具会警告模型不要遵循与用户请求相冲突的屏幕上的指令。

## Windows 和 Linux（实验性，通过 CUA Driver SDK）

捆绑的 `cua-computer` 插件为 Windows 和 Linux 节点主机提供了一个实验性的执行器。它默认处于禁用状态，并直接使用固定版本的 CUA Driver SDK 0.14.1 契约：

1. 启用插件：

   ```bash
   openclaw plugins enable cua-computer
   ```

2. 在交互式桌面会话中启动 `openclaw node run`。该插件会按需创建其配置的 SDK 运行时，然后为节点主机命令执行创建一个由 OpenClaw 所有的可信会话。当命令主机停止或重启时，它会关闭该会话并关闭运行时。

该执行器目前只能控制主显示器。由于 CUA Driver SDK 没有桌面范围的按键保持输入契约，因此 `hold_key`、`left_mouse_down` 和 `left_mouse_up` 不可用。由于类型化桌面方法不接受修饰键，因此带修饰键的点击、滚动和拖动会被拒绝。`key` 操作接受命名键、字母和修饰键组合（例如 `cmd+c` 或 `Return`）；数字和标点键会被拒绝，因为驱动会丢弃它们依赖布局的 Shift 状态，因此请改用 `type` 操作发送这类文本。每次节点调用都会将取消操作传递给 SDK。

该插件调用的是 `CuaDriver.createConfigured`，从不调用裸 `create()`。其授权上限、可信会话标识符、TTL 以及桌面范围均由 OpenClaw 固定；面向模型的 `screen.snapshot` 和 `computer.act` 输入无法选择会话或扩大该授权范围。由于驱动不会报告稳定的显示器标识，帧授权会绑定到可信会话代次以及实时主显示器几何信息。新会话会使未完成的帧失效，但在同一会话中发生具有相同几何信息的主显示器替换时无法检测到；对于此执行器，建议使用稳定的单显示器会话。

这是对原有 0.10 守护进程/MCP 集成的彻底替换。OpenClaw 不会启动 CUA 进程，不会代理 MCP 客户端，也不会回退到其他 CUA 运行时。

### 故障排除

`cua-computer` 执行器会在工具结果和节点日志中显示类型化错误代码。常见的有：

| Code                                                 | Cause                                                                                                                                                         | Fix                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPUTER_DRIVER_UNAVAILABLE`                        | CUA Driver SDK 运行时无法初始化，节点不是 Windows/Linux，或者其桌面权限/会话不可用。                              | 在交互式桌面会话中运行 `openclaw node run`，并检查平台桌面权限。如果捆绑的 CUA Driver SDK 软件包缺失，请重新安装 OpenClaw。 |
| `COMPUTER_REFUSED_<code>`                            | 驱动使用结构化代码拒绝了操作，例如 `background_unavailable`、`background_occluded` 或 `foreground_unavailable`（KDE/KWin Wayland）。 | 将目标窗口置于前台，切换到 X11，或使用受支持的合成器。请参阅上面的兼容性说明。                                                               |
| `COMPUTER_STALE_FRAME`                               | 坐标引用的截图已不再是当前截图（上下文压缩、显示器几何信息发生变化或引用宽度发生变化）。               | 在执行坐标操作前获取一张新的 `screenshot`。                                                                                                                         |
| `COMPUTER_UNSUPPORTED_ACTION`                        | 该执行器无法准确执行的操作：`hold_key`、`left_mouse_down`、`left_mouse_up`，或带修饰键的点击/拖动/滚动。                       | 使用受支持的操作。类型化的 CUA Driver 桌面契约没有为这些调用提供保持输入或修饰键参数。                                                           |
| `COMPUTER_UNSUPPORTED_DISPLAY`                       | 非主显示器的 `screenIndex`、捕获区域/屏幕几何信息不匹配，或光标位于主显示器之外。                                                     | 仅操作主显示器。                                                                                                                                                 |
| `COMPUTER_UNSUPPORTED_KEY`                           | 驱动无法可靠复现的 `key` 值：Shift 状态依赖键盘布局的数字或标点键，或未知键。                      | 改用 `type` 操作发送这类文本。                                                                                                                               |
| `COMPUTER_DRIVER_ERROR` / `COMPUTER_INVALID_REQUEST` | 驱动未提供结构化代码便执行失败，或操作参数格式错误。                                                                          | 检查驱动状态并重新获取截图；修正操作参数。                                                                                                   |

## `computer.act` 节点命令

`computer.act` 是工具路由输入所使用的唯一节点命令（通过 `node.invoke`，命令为 `"computer.act"`）。它具有以下特点：

- **本地启用**：只有在启用计算机控制时，节点才会宣告该能力。网关可以在配对时一次性批准该已宣告的能力面。
- **基于能力**：该工具要求已连接节点同时宣告 `computer.act` 和 `screen.snapshot`。内置的 macOS 应用和可选择启用的实验性 `cua-computer` 插件提供相同的命令对。

读取会复用 `screen.snapshot`；没有第二种捕获路径。有关共享捕获命令，请参见 [摄像头和屏幕节点](/nodes/camera)。

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

一旦启用节点本地控制并批准配对更新，只要节点继续声明该能力，`computer.act` 就会持续可用。这里没有租约、过期或启用/禁用命令。本地禁用 Computer Control 会移除已声明的命令，且节点会在调用时重新检查该开关。

在 macOS 上，默认开启意味着，一旦所需的 macOS 授权存在，已配对的网关就可以立即驱动指针和键盘输入。没有逐次操作确认。请在配对之前，或之后的任何时候，关闭 **Allow Computer Control**，以停止声明并接受 `computer.act`。

`gateway.nodes.commands.deny` 仍然是显式的全局撤销，并且始终优先生效。`computer.act` 不需要 `gateway.nodes.commands.allow` 条目。拥有 `operator.write` 的已认证操作员可以通过 `node.invoke` 调用已启用且已配对的命令；这里没有逐次操作的管理员检查。

## 安全

- 每一层（工具策略、网关命令策略、配对、节点应用设置和平台权限）都必须保持一致。对于当前的 macOS 执行器，这包括 **允许计算机控制**、辅助功能和屏幕录制。只要这些持久控制措施保持启用，操作就会执行；不会针对每个操作进行确认。
- macOS 执行器一次发送一个字素，因此取消、断开连接、暂停、禁用或端点替换都会在发送下一个字素之前停止执行。实验性的 CUA Driver 执行器会在每次调用时将节点取消操作传递给 SDK。
- 截图仅供模型使用，不会自动发送到聊天中（问题 [#44759](https://github.com/openclaw/openclaw/issues/44759)）。
- 将屏幕内容视为不受信任内容；其中可能包含提示注入。

## macOS 权限故障排除

**设置 → 通用 → 功能** 中的计算机控制状态会分别检查辅助功能、事件发布和屏幕录制。即使输入仍被拒绝，屏幕捕获也可能正常工作，因为 macOS 会将这些授权存储在不同的 TCC 存储桶中。

如果状态显示 **辅助功能授权可能已过期**，即使 macOS 拒绝它，OpenClaw 也可能已经在 **系统设置 → 隐私与安全性 → 辅助功能** 下显示为已启用。当辅助功能条目固定到较旧的应用构建版本时，就会发生这种情况。在该列表中选择 OpenClaw，使用 **−** 将其移除，然后重新添加 `/Applications/OpenClaw.app`。更改授权后，请退出并重新打开 OpenClaw，因为 macOS 可能会在进程生命周期内缓存辅助功能信任。

## 与其他桌面控制路径的关系

这是由代理驱动的路径。请参见 [Peekaboo bridge](/platforms/mac/peekaboo)，了解它与 PeekabooBridge 主机、Codex Computer Use 以及直接的 `cua-driver` MCP 之间的关系。
