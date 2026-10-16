---
summary: "菜单栏状态逻辑以及向用户展示的内容"
read_when:
  - "调整 mac 菜单 UI 或状态逻辑时"
title: "菜单栏"
---

默认情况下，**Open Dashboard** 和网关窗口操作使用 **Web** 体验。在 **Dashboard → 设置 → 本机 → App** 下启用 **本机体验（实验）** 以使用本机聊天窗口。该首选项适用于菜单栏、Dock、主 **Gateways** 菜单和 **File → 新网关窗口…** （Cmd-N）。设置始终打开 Web 仪表板设置页面。有关切换行为和本机聊天功能，请参阅 [WebChat](/platforms/mac/webchat)。

## <a id="what-is-shown"></a> 显示内容

- 菜单栏图标和菜单第一状态行显示当前座席工作状态。
- 工作进行时健康状态隐藏。一旦所有会话都空闲，它就会返回。
- 根级“Context”项会打开一个子菜单，其中显示最近的会话，而不是在根菜单中展开它们。
- 根菜单中的 A“设备”块仅列出配对的 **设备**（来自 `node.list`），而不列出 client/presence 条目。
- A 根“使用情况”部分显示在提供商使用情况快照可用时的上下文下方，后面是可用的成本详细信息。 **Today** 的成本总计和每日图表使用 Mac 的本地时区。
- 当两个或多个网关可用时，第一个状态行包括主网关名称。然后，根“网关”部分列出了每个网关及其运行状况和主要标记。选择一行以在所选体验中打开或聚焦该网关。按住选项可显示符合条件的已保存网关的“设置为主要...”。
- **快速聊天** 打开浮动主会话编辑器。其当前的全局快捷方式出现在该项目旁边。
- **设置…** （Cmd-，） 打开仪表板设置。应用程序和设备首选项位于 **This Mac** 下，语音控制位于 **Talk** 下，应用程序更新首选项位于 **Updates** 下。
- **Connection…** 打开本机连接窗口。这是一个标准的 macOS 设置窗口，带有 **Connection** 和 **Gateways** 工具栏选项卡。当启用开发人员切换时，也会出现 **Debug**。当网关无法访问时，该窗口仍然可用。
- **About OpenClaw** 在本机连接窗口中选择 **About**，其中包含应用程序版本、构建信息、资源链接和 **Copy Build信息**。它无需网关连接即可工作。

应用程序的主 **Gateways** 菜单始终存在。它列出了配置后的主网关，然后是 **This Mac**（当它还托管本地网关时），然后保存网关，并按该顺序分配 Command-1 到 Command-9。每张卡都会显示运行状况、版本和缩短的构建 ID、端点、延迟以及所选体验中可用的打开窗口的数量。经过浏览器验证的配置文件还显示 **Access** 及其会话到期时间。 **Primary** 徽章标识主网关。前窗口标记位于所选体验的最前面的网关窗口之后。选择一张卡会在所选体验中打开该网关或将其现有窗口置于前面。按住 Option 键可显示 **New … Window**，或按 Option-Command 键并输入相同的数字。两者都为该网关打开另一个独立窗口。 **管理网关…**打开**连接→网关**，并且在没有配置网关时保持可用。

右键单击 **打开仪表板** 和 **设置…** 的 OpenClaw Dock 图标。配置多个网关时，Dock 菜单还会列出同一目录中的每个网关，包括主网关、**This Mac**（如果可用）以及已保存的配置文件。选择一个将其打开或集中在所选体验中；复选标记标识该体验最前面的网关窗口。

网关状态点跟随每个打开的仪表板的实时连接，包括已保存的非主要网关。绿色表示已连接，红色表示连接错误，灰色表示当前没有连接结果。如果多个窗口显示相同的网关，则当其中任何一个已连接时，该网关将保持绿色。复选标记标识所选窗口的网关； **Primary** 是一个单独的设置。

网关运行状况检查仅在 **Gateways** 主菜单打开时运行。卡片在刷新时显示缓存的事实，或在第一个结果之前检查 **…**。失败后，它们会显示 **unreachable** 以及上次成功联系时间。关闭菜单会取消其检查，并断开用于在没有打开的 Web 或本机窗口的情况下进行检查的已保存网关。主连接保持连接状态，缓存的事实仍然可用，直到应用程序退出。

菜单打开时，设备和自动化摘要会刷新。关闭它会停止他们菜单拥有的轮询。重新打开同一个主网关时，缓存的摘要仍然可用。更改主要会刷新新选择的网关的设备、自动化、使用情况和成本详细信息。在仪表板的 **Cron Jobs** 页面中管理作业。

自动化摘要显示完整的启用作业计数并预览最多八个作业，按下次运行排序。

手动 Cron 刷新和成功的作业更改会取代旧的读取。因此，正在进行的响应无法将已删除的作业恢复到列表中。

## <a id="state-model"></a> 状态模型

- 来源：`WorkActivityStore`（`apps/macos/Sources/OpenClaw/WorkActivityStore.swift`）。
- 事件以 `ControlAgentEvent` 形式到达，带有 `runId`。处理程序 （`ControlChannel.routeWorkActivity`） 从事件负载中读取 `sessionKey`，如果不存在，则默认为 `"main"`。
- Priority：主会话（默认为 `sessionKey == "main"`）始终获胜。如果 main 处于活动状态，则其状态立即显示。如果主会话空闲，则会显示最近活动的非主会话。商店不会在活动中途翻转。仅当当前会话空闲或主会话变为活动状态时才会切换。
- 活动类型：
  - `job`：高层命令执行（`state: started|streaming|done|error|...`）。
  - `tool`：`phase: start|result` 与 `name`，可选 `meta`/`args`.

## <a id="iconstate-enum-(swift)"></a><a id="iconstate-enum-swift"></a> IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### <a id="activitykind--%3E-badge-symbol"></a><a id="activitykind->-badge-symbol"></a> ActivityKind -> 徽标符号

`ActivityKind` 封装了一个 `ToolKind`（`bash`、`read`、`write`、`edit`、`attach`、`other`）或一个裸 `job`。每种都会映射为绘制在小动物图标上的一个 SF Symbol 徽标（`IconState.badgeSymbolName`）：

| 类型            | 象征                             |
| --------------- | ---------------------------------- |
| `bash`          | `chevron.left.slash.chevron.right` |
| `read`          | `doc`                              |
| `write`         | `pencil`                           |
| `edit`          | `pencil.tip`                       |
| `attach`        | `paperclip`                        |
| `other` / `job` | `gearshape.fill`                   |

### <a id="visual-mapping"></a> 视觉映射

- `idle`：普通小动物，无徽标。
- `workingMain`：带符号的徽标，完整色调（`.primary` prominence），腿部“工作中”动画。
- `workingOther`：带符号的徽标，弱化色调（`.secondary` prominence），不奔跑。
- `overridden`：无论实际活动如何，都使用所选的 symbol/tint。

## <a id="context-submenu"></a> Context 子菜单

- 根菜单显示一个“上下文”行，其中包含一个会话 count/status. 该行打开一个子菜单 （`MenuSessionsInjector`）。
- 子菜单标题显示过去 24 小时内的活跃会话数量。
- 每个会话行都保留其 token 条、时长、预览、thinking/verbose 切换、重置、压缩和删除操作。
- 加载中、断开连接以及会话加载错误消息会显示在 Context 子菜单内。
- Usage 和 cost 部分仍然保留在 Context 下方的根级别，这样无需打开子菜单也能一眼查看。

## <a id="status-row-text-(menu)"></a><a id="status-row-text-menu"></a> 状态行文本（菜单）

- 当有两个或更多网关时，连接标签会附加主网关的目录显示名称，例如 `OpenClaw Active — Mac Studio`。
- 当工作处于活动状态时：`<Session role> · <activity label>`（`MenuContentView` 中的 `"\(roleLabel) · \(activity.label)"`），其中角色标签为 `Main` 或 `Other`。
- 在空闲时：回退为健康摘要。

## <a id="event-ingestion"></a> 事件接入

- 来源：control-channel 的 `agent` 事件，通过 `ControlChannel.routeWorkActivity(from:)` 路由。
- 解析字段：
  - `stream: "job"` 与 `data.state` 用于 start/stop.
  - `stream: "tool"`，带 `data.phase`、`data.name`，可选 `data.meta`/`data.args`.
- 工具标签来自`ToolDisplayRegistry.resolve(name:args:meta:)`。未解析的名称会回退到原始工具名称。

## <a id="debug-override"></a> 调试覆盖

- 在 **Dashboard → 设置 → 本机 → Developer** 中启用开发人员切换。然后打开**Connection…→调试→图标覆盖**：
  - `System (auto)`（默认）
  - `Working: main` / `Working: other`（每种工具类型：bash、读取、写入、编辑、其他）
  - `Idle`
- 存储在`UserDefaults`密钥`openclaw.iconOverride`下，并映射到`IconState.overridden`。

## <a id="testing-checklist"></a> 测试清单

- 触发主会话任务：图标立即切换，状态行显示主标签。
- 在主空闲时触发非主会话作业：icon/status 显示非主会话并保持稳定直至完成。
- 当另一个会话处于活动状态时启动主会话：图标会立即切换到主会话。
- 快速工具连发：徽章不闪烁（清除已完成工具之前的 2 秒宽限期，`WorkActivityStore.toolResultGrace`）。
- 当所有会话都空闲后，健康状态行会重新出现。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [菜单栏图标](/platforms/mac/icon)
- [使用情况跟踪](/concepts/usage-tracking)
