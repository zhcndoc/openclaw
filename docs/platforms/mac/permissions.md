---
summary: "macOS 权限持久化（TCC）和签名要求"
read_when:
  - "调试缺失或卡住的 macOS 权限提示"
  - "授予访问权限后，屏幕录制仍然显示缺失"
  - "决定是否向 node 或 CLI 运行时授予辅助功能权限"
  - "了解锁定的桌面或保持计算机处于唤醒状态"
  - "打包或签名 macOS 应用"
  - "更改捆绑包 ID 或应用程序安装路径"
title: "macOS 权限"
---

macOS 权限授权是脆弱的。TCC 会将权限授权与应用的代码签名、bundle 标识符以及磁盘上的路径关联起来。如果其中任何一项发生变化，macOS 就会将该应用视为新的应用，并且可能会丢弃或隐藏提示。

在 macOS 应用程序中打开 **Dashboard → 设置 → 本机 → 权限**，检查每个权限、请求访问权限或打开其 macOS 系统设置窗格。该页面还控制位置访问和精度。当您在系统设置中更改授权、聚焦仪表板或完成权限请求后返回应用程序时，权限状态会刷新。打开仪表板窗口不会启动后台权限轮询。

## <a id="when-a-tool-needs-permission"></a> 当工具需要权限时

本机工具在需要时检查权限。缺少权限会停止使用 `PERMISSION_MISSING` 的命令，识别受影响的 Mac 和功能，并在 Control UI 对话中显示内联 **Grant** 卡。计算机 Control 一起报告其缺少的辅助功能、事件发布、屏幕录制和 OpenClaw 功能授予。代理会等待您的确认，然后重试。

在 Mac 应用程序中，卡的主要操作遵循当前权限状态：**Grant _permission_** 请求访问、**打开系统设置** 处理被拒绝或过时的授权、**重新启动OpenClaw** 处理所需的重新启动，并且 **Enable _capability_** 使用与 **Settings → 此 Mac** 相同的本机确认打开 OpenClaw 中关闭的功能。需要删除并重新添加过时的辅助功能授权。一旦应用程序观察到所需的授权，**再次尝试** 会向代理发送一条简短的确认。授予权限不会自动重复该命令。

对于同时需要 OpenClaw 功能和 macOS 权限的请求，**Enable** 按钮仅命名禁用的功能。该卡在说明下方列出了剩余权限，然后在启用该功能后更新其操作。每次单击仅调度当前步骤的功能；以后的许可授予和重新启动需要他们自己的卡操作。

位置对其 OpenClaw 模式和 macOS 授权使用相同的功能。如果“位置”已关闭且 macOS 已拒绝或限制访问，或者系统范围的“定位服务”已关闭，则该卡将首先提供用于定位服务的 **“打开系统设置”**，而不要求启用“位置”。当应用程序仍然有授权但定位服务已关闭时，这也适用。访问恢复后，**Enable Location** 在使用访问时打开并进行本机确认。如果macOS还没有询问，则启用Location请求访问一次；如果您拒绝，该模式将保持关闭状态。

每次本机授予尝试（包括取消或失败的请求）后，卡都会刷新权限状态。拒绝屏幕录制提示会将下一步操作更改为 **打开系统设置**； macOS 不再显示提示。在系统设置中更改访问权限后，返回应用程序会刷新卡。

在报告可能过时的授权之前明确请求可访问性。如果事件发布请求仍然被拒绝，请在系统设置中启用访问权限，然后使用**重新启动OpenClaw**： macOS可以缓存该拒绝，直到应用程序重新启动。

在浏览器中，或者当命令针对另一台 Mac 时，打开该 Mac 上的 OpenClaw 应用程序，然后转至 **设置 → 本机 → 权限**，授予请求的访问权限，然后在对话中确认。

结构化错误携带 `capabilities` 和一种修复 `state`：`not-determined`、`denied`、`restart-required`、`stale-grant` 或 `disabled-in-openclaw`。这些描述了本机授权或 OpenClaw 功能开关，与代理的工具批准无关。

摄像机发现 （`camera.list`） 需要 OpenClaw 摄像机交换机 （`cameraEnabled`），但不请求 macOS 摄像机访问。拍照、录制视频或控制相机移动还需要单独的 macOS 相机授权 （`camera`）。

屏幕录制和辅助功能显示 **Not granting**，直到确认访问为止； macOS 的二进制检查无法区分第一个请求和拒绝。单击“**Grant**”请求访问权限，然后再在“系统设置”中查找“OpenClaw”。如果访问被拒绝或不再出现提示，请使用相邻的 **“打开系统设置”** 操作。已确认拒绝的权限提供该操作，而不是 **Grant**。

启用摄像头访问、计算机 Control、桌面共享、保持计算机唤醒、Peekaboo 桥、浏览器 cookie 同步或连续语音唤醒监听需要本机确认，默认选择 **Cancel**。增加位置访问权限（从“关闭”到“使用时”或“始终”，或从“使用时”到“始终”）并启用精确定位也需要确认。即使在启用同步之前，添加 cookie 域也需要确认；更改目标需要在启用同步时进行。禁用这些功能或减少位置访问无需本机确认即可生效。取消 cookie 域或目标更改会恢复显示的本机值；较新的编辑将保持待处理状态，直到其自身的确认完成。

需要 macOS 授权的语音唤醒和位置更改将保持待定状态，直到获得许可。关闭或替换其仪表板文档将放弃挂起的更改。另一个仪表板窗口中的较新设置也会取代较旧的权限请求，因此其稍后完成无法撤消较新的选择。

## <a id="requirements-for-stable-permissions"></a> 稳定权限的要求

- 相同路径：从 `/Applications/OpenClaw.app` 运行发布版应用；将开发构建保留在一个固定路径，例如 `dist/OpenClaw.app`。
- 相同的捆绑包标识符：发布版本使用 `ai.openclaw.mac`；开发版本默认为 `ai.openclaw.mac.debug`。每个都有一个单独的权限标识。
- 已签名应用：未签名或 ad-hoc 签名的构建不会持久保留权限。
- 一致的签名：使用真实的 Apple Development 或 Developer ID 证书，这样签名在每次重建后都能保持稳定。

ad-hoc 签名每次构建都会生成一个新的身份。macOS 会忘记之前授予的权限，提示可能会完全消失，直到清除过期条目。

## <a id="screen-recording-still-appears-missing-after-granting-access"></a> 授予访问权限后屏幕录制仍然显示丢失

如果快速聊天仍然显示**需要额外权限：屏幕录制**：

1. 点击OpenClaw中的**授予**。
2. 如果 macOS 打开系统设置，请在 **隐私和安全 -> 屏幕和系统音频录制** 下启用正在运行的 OpenClaw 应用程序（在旧版上称为 **屏幕录制**） macOS 版本）。
3. 返回OpenClaw并重试屏幕截图。 **仪表板→设置→本机→权限**显示刷新的访问状态。

在显式 **Grant** 请求后，OpenClaw 检查 ScreenCaptureKit 以及 macOS 权限预检。这使得它可以在预检仍然报告旧的拒绝时识别访问。被动状态检查不会在您请求访问之前启动此检查。

如果访问权限仍然丢失，请从同一应用程序路径退出并重新打开 OpenClaw。某些 macOS 权限更改需要重新启动应用程序才能进行捕获。如果同时安装了发布版本和开发版本，请授予对您实际运行的版本的访问权限：批准 `/Applications/OpenClaw.app` 不会授予对具有不同捆绑包标识符的开发版本的访问权限。

## <a id="accessibility-grants-for-node-and-cli-runtimes"></a> Node 和 CLI 运行时的辅助功能权限授予

优先将辅助功能权限授予 OpenClaw.app、Peekaboo.app，或其他带有自己 bundle 标识符的已签名辅助程序，而不是通用的 `node` 二进制文件。

macOS TCC 会将辅助功能权限授予其所见进程的代码标识。若某个 Homebrew、nvm、pnpm 或 npm 工作流导致共享的 `node` 可执行文件获得了辅助功能权限，那么通过同一可执行文件启动的任何 JavaScript 包都可能继承 GUI 自动化权限。

请将系统设置中的 `node` 项视为授予该 Node 运行时的广泛权限，而不是只授予某个 npm 包的权限。除非你信任通过该特定 Node 安装启动的每个脚本和包，否则不要将辅助功能权限授予 `node`。

基本存在来自与 OpenClaw 的交互，不需要辅助功能授权。 **仪表板→设置→本机→权限→系统范围的存在检测**是一个单独的、默认关闭的控件，包括其他应用程序中的身体活动。仅可访问性批准并不能实现这一点。关闭它会清除系统范围的样本并回退到应用程序本地活动，而无需撤销可访问性或断开节点连接。

如果您不小心向 `node` 授予了可访问性，请从“系统设置”->“隐私和安全”->“可访问性”中删除该条目。然后授予应拥有 UI 自动化的签名应用程序或帮助程序。

## <a id="separate-computer-control-grants"></a> 独立计算机 Control 补助金

macOS 将辅助功能、事件发布、输入监听和屏幕录制保留在单独的 TCC 存储桶中。一项成功的资助并不能证明其他资助是可用的。 OpenClaw的计算机Control的状态分别检查辅助功能、事件发布和屏幕录制；这就是为什么屏幕截图可以成功而点击和打字却失败的原因。

辅助功能这一项也可能会在界面上仍然显示为已启用，但其代码要求实际上仍绑定到较早的构建版本。当 OpenClaw 报告 **辅助功能授权可能已过期** 时，请在 **系统设置 -> 隐私与安全性 -> 辅助功能** 中选中 OpenClaw，使用 **-** 将其移除，然后重新添加 `/Applications/OpenClaw.app`。之后退出并重新打开 OpenClaw，因为辅助功能信任信息可能仍然缓存在正在运行的进程中。

## <a id="desktop-availability-and-keeping-awake"></a> 桌面可用性和保持清醒

**仪表板→设置→此Mac**将**桌面可用性**显示为**Locked**、**Unlocked**，或**Unknown**，基于本机 macOS 会话。此操作状态独立于权限授予和可选的 **Active 计算机状态** 设置。连接的节点或成功的屏幕共享连接并不能证明桌面已解锁。

在计算机执行期间，OpenClaw 使用临时保持唤醒断言，从该执行的第一个操作开始最多一小时。这包括背景窗口和浏览器操作。完成、取消、断开连接、提供者替换或本地停止会释放执行的保持唤醒请求。 Web 桌面查看器不会创建 OpenClaw 保持唤醒执行。

要在作业之间保持专用 Mac 处于唤醒状态，请在同一设置页面上启用 **保持计算机唤醒** 并接受本机确认。它默认处于关闭状态，并且仅在该 Mac 连接并实际托管时才生效。它不会更改 macOS 电源或锁定设置。

当最后一个查看者断开连接时，屏幕共享可能会请求立即锁定。即使启用了 **Keep computer awake**，OpenClaw 也会遵守该锁定。

手动锁定、注销或未知的桌面状态会释放保持唤醒断言并终止活动的计算机执行。 OpenClaw 不会解锁 Mac 或在登录后恢复这些执行。通过屏幕共享或本地使用正常的 macOS 登录屏幕，然后启动新计算机执行。在验证解锁后，保持唤醒选项可以再次激活，同时其托管和连接要求仍然有效。

Web 桌面查看器仍可作为登录路径使用，并显示锁定或未知状态。 macOS可以限制对其安全登录屏幕的捕获；空的或仅包含壁纸的查看器并不能证明 Mac 已解锁。参见[计算机使用故障排除](/nodes/computer-use#macos-desktop-availability)。

## <a id="recovery-checklist-when-prompts-disappear"></a> 提示消失时的恢复清单

1. 退出应用。
2. 在系统设置 -> 隐私与安全性中移除该应用条目。
3. 从相同路径重新启动应用并重新授予权限。
4. 如果提示仍然没有出现，使用 `tccutil` 重置 TCC 条目并重试。
5. 某些权限只有在完整重启 macOS 后才会重新出现。

示例重置（使用 OpenClaw 的 bundle ID，`ai.openclaw.mac`）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
```

## <a id="files-and-folders-permissions-(desktop%2Fdocuments%2Fdownloads)"></a><a id="files-and-folders-permissions-desktop/documents/downloads"></a> 文件和文件夹权限（Desktop/Documents/Downloads）

macOS 还可以控制 terminal/background 进程的桌面、文档和下载。如果文件读取或目录列表挂起，请授予对执行文件操作的同一进程上下文的访问权限（例如 Terminal/iTerm、LaunchAgent 启动的应用程序或 SSH 进程）。

变通方法：如果你想避免逐文件夹授权，请将文件移动到 OpenClaw 工作区（`~/.openclaw/workspace`）。

如果你正在测试权限，请始终使用真实证书进行签名。仅在不涉及权限的快速本地运行中，才可接受 ad-hoc 构建。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [macOS 签名](/platforms/mac/signing)
