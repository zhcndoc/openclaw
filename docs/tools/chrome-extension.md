---
summary: "Chrome 扩展：使用自动本地配对安全地自动化已登录的标签页"
read_when:
  - "你希望代理在无需远程调试提示的情况下操作已登录的 Chrome"
  - "你正在安装、配对、禁用或排查 OpenClaw Chrome 扩展的问题"
  - "你需要了解 Chrome 原生引导的安全性和平台支持模型"
title: "Chrome 扩展"
---

# <a id="chrome-extension"></a> Chrome 扩展

OpenClaw Chrome 扩展可以让浏览器工具自动化操作已登录 Chrome 配置文件中的符合条件的标签页。它使用 `chrome.debugger`，因此不需要 Chrome 阻止性的远程调试许可提示。

该扩展是浏览器自动化基础设施。它不包括聊天、页面共享、提示框或选项卡副驾驶。其弹出窗口显示连接状态、当前访问模式、当前符合条件的选项卡的 Pause/Allow 操作以及“设置”链接。

## <a id="requirements"></a> 要求

- Google Chrome、Chrome for Testing 或 Chromium
- OpenClaw 安装在与 Chrome 相同的计算机上，或者该计算机上的 OpenClaw 浏览器节点
- macOS/Linux 或 Windows 以及独立的 OpenClaw 本机引导程序可执行文件
- 对于 macOS 上的 Google Chrome 以外的浏览器，至少启动浏览器一次，以便其用户数据目录存在

Windows 使用 `OpenClaw.BrowserBootstrap.exe`，而不是批处理或 PowerShell 启动器。安装程序发现打包的帮助程序或 Windows 配套安装。便携式安装可以使用 `--native-host-executable` 选择其绝对本地路径。共享的 Windows 注册服务拥有本机注册和存储请求。独立的 Windows CLI 通过可执行文件的有界管理接口进行委托，显式绑定其 Windows Node/CLI、状态目录、配置路径和浏览器配置文件。 Companion 使用其单独的托管 WSL 模式和实时网关权限。当两种模式不可用时，这两种模式都会回退到另一种模式。私有的、经过验证的生成位于当前用户的本地应用程序数据 OpenClawTray 目录下。该服务在两个适用的用户注册表视图中注册 Chrome/Chromium 之前验证二进制成帧和准入。它不会覆盖外部注册、隐藏机器注册或将 WSL/UNC 路径或 SSH 环回 URL 视为本地 Windows 权限。 Missing/incompatible 可执行文件或不安全的 ACL 使安装程序受阻；没有脚本回退或复制键提示。不同的现有 mode/context 或遗留的无法识别的注册将被保留并报告为冲突，而不是默默地替换。没有干净收据的中断管理是一个未知的结果：在重试之前检查相同的上下文。 Windows 存储删除使用 `extension uninstall-host --remove-store`；这首先删除拥有的存储请求，然后删除拥有的本机注册。 macOS `uninstall-store` 命令继续保持本机注册不变。

## <a id="install"></a> 安装

在托管 Chrome 的计算机上运行此命令。 Google macOS上的Chrome可以在首次发布前准备好；其他支持的浏览器需要先启动一次。有关完整的 `browser extension` 子命令参考，请参阅 [`openclaw browser`](/cli/browser)：

```bash
openclaw browser extension install
```

在完成 Chrome 的设置时保持命令运行。在macOS上，它首先注册本机主机，然后要求Google Chrome安装官方商店扩展。 Chrome 在浏览器启动时发现该请求。如果Chrome已经在运行，请完全退出并在方便时重新打开它，然后批准或启用Chrome中的**OpenClaw**。 OpenClaw 永远不会重新启动 Chrome 或为您批准其权限提示。该请求适用于 Chrome 用户数据目录中的所有配置文件。 Chrome 控制每个配置文件中的审批。

本机 macOS 应用程序不会在启动时检查或更改 Chrome 数据。选择**在此设备上设置Chrome**以准备扩展。打包应用程序使用经过验证的私有运行时，因此仅限远程的 Mac 不需要单独安装 CLI。开始设置后，默认应用程序配置文件会在该应用程序会话期间刷新 CLI 更新上的注册。命名配置文件保留显式设置，因为 Chrome 为每个用户共享一个本机主机注册。

**仪表板→设置→本机→浏览器→在此设备上设置Chrome**重试相同的序列化设置控制器。它总是准备这台 Mac，而不是远程网关。浏览器设置和本机帮助程序读取配置，无需 Gateway-wide Doctor 或独立管理的 Gateway 数据库的迁移。普通浏览器命令仍然报告无效配置。基于浏览器的仪表板提供商店和设置指南链接，而不是在本地安装软件。

Tauri 桌面应用程序还在启动时和本地 CLI 设置后准备本地帮助程序。发布版本可以在其应用程序数据目录中配置匹配的仅浏览器运行时，而无需更改网关服务或其安装的代码。注册成功后，使用托盘中的“**设置Chrome扩展…**”重试并打开官方商店。启动永远不会打开商店窗口或撤消 Chrome removal/disable 选择。开发版本需要现有的 CLI，而 Windows Tauri 测试版本不提供此运行时。仅远程桌面连接仍然需要 Chrome 主机上的浏览器节点才能将其选项卡公开给网关。

在 **This Mac** 页面上选择 **Refresh setup status** 来检查安装情况。打开设置或从 Chrome 返回不会检查浏览器数据。现有扩展显示 **Installed**，包括当 Chrome 仍需要您启用它时。如果其本地助手丢失，**在此设备上设置 Chrome** 会修复自动配对，而不将扩展视为不存在。 **刷新安装状态**刷新此状态而不安装任何东西。安装状态不能证明实时连接；打开扩展程序来单独检查。当状态检查不可用时，较旧的 Mac 应用程序版本会保留其设置操作。更新 Mac 应用程序以检测现有安装，而无需运行安装程序。

在 Linux 和其他受支持的 Chromium 浏览器中，在本机主机注册成功后，从 Chrome Web Store](https://chromewebstore.google.com/detail/openclaw/kcdjddhmeafeomebliikmbpblkmkfoig) 添加 [OpenClaw。 Linux 不支持此每用户应用商店安装请求。在 Windows 上，在本机可执行文件通过设置后添加 Store 扩展。然后，支持的同主机配对通过本机通道进行，无需复制密钥。 Chrome 仍拥有其安装和许可批准。

如果 Chrome 不提供请求的安装，您也可以使用商店链接。如果您之前删除了该扩展，Chrome 会记住该选择。从 Store 中再次显式添加它。 OpenClaw 未明确 Chrome 的删除决定。

在 macOS 和 Linux 上，原点锁定的本机主机允许确切的官方商店身份和 OpenClaw 的路径派生开发 ID。启用后，分机将在其第一次本机呼叫时配对。安装程序会检查配置文件的 `Preferences` 和 `Secure Preferences` 支持文件，并独立于任何扩展路径验证确切的存储 ID。 Chromium 通过设置强制策略选择备份文件。 Linux 通常使用 `Preferences`。两个文件都接受相同的所有权、路径、文件类型、权限和大小检查。

对于扩展开发，请跳过创建应用商店安装请求：

```bash
openclaw browser extension install --no-store
```

这仍然会将捆绑的扩展复制到稳定的 OpenClaw-owned 目录并注册本机主机。它使任何现有的存储请求保持不变。使用解压的副本作为开发后备：

1. 打开 `chrome://extensions`。
2. 启用**开发者模式**。
3. 点击**加载已解压的扩展程序**。
4. 选择命令打印的路径。

在完成存储或开发设置时保持安装命令运行。对于解压开发，安装程序会验证 Chrome 是否在其预测路径派生的 ID 下加载了批准的真实路径。

安装程序只能通过确切的 Foundation Store ID 来识别官方商店安装。该身份永远不会使记录路径 OpenClaw- 拥有。对于脱壳开发，仅当所有这些都为真时，它才接受 ID：

- 、ID 与 Chrome 的 32 字符扩展 ID 格式匹配。
- Chrome 将安装位置记录为解压后的位置。
- 记录的扩展路径完全解析为已安装或捆绑的 OpenClaw 扩展目录。
- 记录的 ID 等于 Chromium 的路径导出 ID 的确切解析路径。

扩展名不受信任。具有相同主机名的现有本机主机文件不会被覆盖，除非它们是可验证的 OpenClaw- 拥有的。

需要时可以使用不同的有界等待时间：

```bash
openclaw browser extension install --wait-ms 60000
```

对于自动化，请使用 `--json`。结果分别报告应用商店安装请求、应用商店发现和批准、批准的解压 ID 和路径以及本机主机注册运行状况。这些本地观察并不能证明存在实时连接。验证扩展的连接状态并针对预期网关或浏览器节点运行 `openclaw browser --browser-profile chrome tabs`。 JSON 输出从不包含中继密钥或配对字符串。

## <a id="shared-setup-controller"></a> 共享设置控制器

CLI、本机桌面适配器和终端设置流程在托管 Chrome 的计算机上使用相同的浏览器拥有的控制器。

安装程序的安装状态描述为 Google Chrome。 `openclaw browser extension install` 和 `openclaw browser extension status` 命令还支持 Chromium 和 Chrome 进行测试。

```bash
openclaw browser extension setup --action inspect --json
openclaw browser extension setup --action install --json
openclaw browser extension setup --action verify --browser-profile chrome --json
```

`inspect` 无需安装或连接即可读取安装状态。 `install` 准备自动本地引导程序； Chrome 仍拥有扩展安装和权限审批。对于受支持的本地本机引导程序，无需复制配对代码。现有的配对和明确的自动设置选择退出保持不变。 `verify` 使用现有的每主机密钥对确切的本地配置文件中继进行身份验证。它不会创建密钥、启动另一个中继或获取远程网关密钥。

在 macOS 和 Linux 上，受支持的捆绑包路径迁移会保留来自经过验证的私有清单和启动器的已保存配置文件。现有的单槽原始迁移规则保持不变：在修复之前，注册已被拥有，但尚未准备好用于新捆绑。没有保存选择器的旧启动器保留其原始选择：第一个配置的扩展配置文件，独立于 `browser.defaultProfile`。无选择器设置拒绝未经验证或外国注册。显式 `inspect` 和 `verify` 请求必须与注册的配置文件匹配；使用 `setup --action install --browser-profile <name>` 进行更改。显式选择不能绕过所有权或来源检查。安装程序不会轮换现有中继密钥或重写 Chrome 配对首选项。

安装程序还保留注册状态和配置选择。如果当前进程使用不同的配置，它将在安装或中继访问之前停止。用匹配的`OPENCLAW_STATE_DIR`和`OPENCLAW_CONFIG_PATH`重新运行；选择其他浏览器配置文件并不授权更改配置文件。隐式默认配置及其显式路径算作相同的选择。安装程序会在发布替换本机主机清单之前重新检查已保存的选择。

在 Windows 上，省略的配置文件选择使用已配置的扩展配置文件的有界、串行只读检查。只有当前匹配的 C# 注册描述符（针对其绑定和请求的上下文进行独立验证）才能选择已保存的配置文件。安装程序在继续之前确认观察结果； C# 所有者重新验证单个安装操作。未知、冲突、更改或不可用的证据绝不会默默地选择 `chrome`。真正缺少注册的可以使用现有的全新安装默认设置。

如果不再配置保存的配置文件，或者 Node/CLI 路径或批准的扩展源已更改，则 Windows 合约可能会返回不匹配的描述符。然后自动选择将停止，无需尝试安装。查看预期的现有配置文件并明确修复，例如 `openclaw browser extension setup --action install --browser-profile work`。这不是自动运行时升级恢复：不同的状态、配置、配置文件或伴侣模式仍然是上下文冲突而不是接管。

JSON 结果包含 `action`、带有 `kind: "local-host"`、平台、主机名、配置文件和中继端口的 `target`，以及 `phase`、`reason`、`installation`、`connection` 和`nextAction`。安装报告将已安装的配置文件与已启用的配置文件分开计数，因此禁用的扩展不会显示为缺失。有效待处理或阻止结果成功退出；命令或执行失败退出非零。结果从不包含配对字符串或中继密钥。现有的 `install` 和 `status` 命令保留其记录的输出格式。

安装、Chrome 批准和经过身份验证的连接是不同的事实。 `ready` 表示所选中继具有经过验证的分机；这并不意味着存在符合条件的选项卡。空选项卡列表不是断开连接的分机。在使用自动化之前，请通过预期的网关或浏览器节点检查选项卡。

目标是进程主机，而不是显示远程仪表板的计算机。通过 SSH 到达的 TUI 在该 SSH 主机上运行安装程序。环回 URL 可以是 SSH 隧道，并不能证明网关和 Chrome 共享一台机器。本机设置不会默默地重定向到当前显示的网关。仅网络仪表板提供商店和设置指南链接，而不是安装在查看器上。

## <a id="use-it"></a> 使用它

选择内置的 `chrome` 配置文件，或将其设为默认配置文件：

```bash
openclaw config set browser.defaultProfile chrome
```

```json5
{
  browser: {
    profiles: {
      chrome: { driver: "extension" },
    },
  },
}
```

新的自动配对使用 **All tabs**。现有的有效配对不会被覆盖，较旧的配对会保留其存储的访问模式。

对于全新的本地设置，本机引导程序通过本地网关的确切 `/browser/extension` 路由连接扩展。第一个经过身份验证的连接会唤醒惰性浏览器控制服务并启动配置文件的环回中继。然后，OpenClaw 和本地客户端（例如 mcporter）使用该配置文件中继端口。保持 `openclaw gateway run` 或托管网关服务运行。不需要单独的浏览器请求或预热步骤。

浏览器节点设置仍然不同：扩展程序会连接到浏览器节点主机上的中继，而节点使用其配置的远程 Gateway。使用明确的 `--gateway-url` 进行配对时，会直接连接到该远程 Gateway，并且仍然只能手动完成。

### <a id="standalone-direct-loopback-relay"></a> 独立式直接环回继电器

`ws://127.0.0.1:<port>/extension` 上的配对可以在没有本地网关或浏览器节点的情况下运行。在 macOS 和 Linux 上，捆绑的扩展可以要求安装的本机主机在重新连接到该端点时启动独立中继。必须启用自动设置。请求仅限每分钟一次。该扩展仍然使用连接绑定的 v2 证明对中继进行身份验证。这需要更新的本机主机和包含中继唤醒支持的扩展构建。商店发布可能会滞后于捆绑的扩展。捆绑的解压开发副本是源构建验证路径。

自动唤醒需要守护程序所服务的确切 `127.0.0.1` 主机。其他环回别名（包括 `localhost` 和 IPv6）不会触发唤醒。配对进行独立操作时，请使用标准 IPv4 端点。

唤醒使用分机现有配对中的端口。它不会切换到第一个配置的配置文件。本机主机解析当前的 [`browser.profiles`](/gateway/config-browser-ui-desktop#browser) 并仅允许扩展驱动程序中继端口，包括自动分配的端口和显式 `cdpPort` 引脚。已删除的配置文件或过时的端口将被拒绝。更正配对以匹配当前配置文件。网关 `/browser/extension` 路由和远程配对永远不会触发本地守护程序唤醒。即使网关提示指向远程主机，使用直接环回中继的浏览器节点配对也可以使用它。

现有侦听器保留其端口的所有权。否则，本机主机将生成 `dist/extensions/browser/relay-daemon-entry.js` 作为独立进程。该守护进程使用相同的每主机中继密钥，并在扩展或 CDP 客户端连接时保持活动状态。两者断开连接后，它会在十分钟不活动后退出，每 30 秒检查一次。当 CDP 客户端保持连接时，单独关闭 Chrome 并不能阻止它。稍后重新连接可以再次唤醒它。

独立守护程序默认为仅 **v2 身份验证**，与网关中继的旧默认值无关。只有显式 [`browser.extensionRelay.allowLegacyAuth=true`](/gateway/config-browser-ui-desktop#browser) 才能启用旧式身份验证。未设置的值、`false` 或配置读取失败永远不会启用它。首选 v2 客户端，这样持久密钥就不会泄露给占用端口的进程。

网关浏览器控制可以加入已拥有配置的配置文件和端口的独立中继。它使用 v2 验证确切的所有者并使用其现有的网桥。它不会启动第二个侦听器。停止 Gateway 仅释放 Gateway 的连接，使守护程序、其直接扩展连接和其他 CDP 客户端保持运行。仍然支持通过 `/browser/extension` 进行网关优先自动设置。

守护进程和网关都必须运行实现所有者访问协议的构建。不支持混合版本。不匹配的配置文件、端口、密钥或更严格的身份验证策略会产生错误。网关永远不会接管侦听器或回退到旧凭据。守护程序更严格的仅 v2 默认值与网关的默认值兼容。

### <a id="choose-tab-access"></a> 选择标签页访问权限

- **All tabs** 会公开该 Chrome 配置文件中所有符合条件的普通标签页，但当前浏览器会话中已暂停的标签页除外。在弹出窗口中使用 **Pause on this tab** 和 **Allow on this tab**。
- **选定选项卡** 使用 **OpenClaw** 选项卡组作为访问控制边界。将选项卡移至组中即可授予访问权限。将其移出将取消访问权限。

打开扩展程序的“设置”页面以更改访问模式。切换到“选定”选项卡会立即分离未分组的选项卡，包括已在运行中的附件。在任一模式下，代理创建的选项卡都保留在 OpenClaw 组中。

该扩展会排除无痕标签页、`chrome://` 和 `chrome-extension://` 等内部页面，以及没有可用当前 URL 的标签页。访问 `file://` 还需要启用 Chrome 的 **Allow access to file URLs** 设置。

代理创建的选项卡可能从 `about:blank` 开始，而 CDP 客户端会在导航之前对其进行初始化。该扩展允许特定的初始选项卡，将其保留在 OpenClaw 组中，并应用相同的暂停和访问模式控件。正常导航使选项卡在任一访问模式下都可用。飞行中的 CDP 缓存、额外标头和服务工作线程旁路设置也可以在允许的导航中保留。暂停访问、从 OpenClaw 组中删除选定的选项卡或分离其调试器仍然会拒绝运行中的命令结果。现有的空白选项卡、手动分组的空白和其他 `about:` 页面仍然不可用。离开、更换选项卡、重新启动或重新连接分机将结束初始的空白准入。返回 `about:blank` 并不能恢复它。

如果在扩展返回目标之前创建失败，它只会在仍拥有该选项卡时尝试关闭该选项卡。您在创建过程中暂停、移动或导航的选项卡将保持不变。重定向、丢失连接或工作进程关闭可能会留下一个选项卡。如果需要，请手动关闭它。

授权选项卡的显式命令主机导航也可以使用精确的 `about:blank`，例如在性能跟踪重置期间。 Chrome 必须确认根框架和装载机位于同一附件上。仅 iframe 导航或空白 URL 不会授予访问权限。

该临时准入在下一个非空白文档、调试器分离、访问模式更改、暂停、组或窗口更改、选项卡关闭或替换、重新连接或扩展重新启动时结束。失败的导航永远不会关闭现有选项卡或通过导航恢复 URL。

## <a id="automatic-setup-controls"></a> 自动设置控件

设置显示经过编辑的 relay/native 引导程序状态和 **使用自动本地设置** 开关。

- 关闭自动设置可保留有效的现有配对，但会阻止新的本机引导程序和独立继电器唤醒尝试。
- **断开连接并禁用自动设置**会立即撤销配对、分离调试器会话，并持久化退出选择。
- **使用本地 OpenClaw**会清除退出选择并重试原生主机。
- 保存明确的手动配对也会清除退出选择。

在本地 Gateway 唤醒路由之前完成配对的预发布开发安装会保留其现有配对不变。在设置中，使用**断开连接并禁用自动设置**，然后使用**本地 OpenClaw**来创建新的本地配对。发布版本不需要此恢复步骤。

### <a id="upgrades-from-the-retired-tab-copilot"></a> 从已停用的标签页副驾驶升级

如果设置显示自动化已暂停，以保护升级前的 copilot 会话，请确认旧的运行任务已完成。然后点击**断开连接并禁用自动设置**以丢弃已停用的恢复状态，随后点击**使用本地 OpenClaw**重新连接。在明确断开连接成功之前，扩展会保留已停用状态，并阻止中继连接、原生设置、手动配对、标签页访问权限更改和调试器附加。

Chromium 缓存正在运行的浏览器进程的第一个丢失本机主机结果。如果现有扩展在安装本机主机之前已尝试自动设置，请重新启动 Chrome 一次（完整的浏览器进程重新加载）。从弹出窗口或“设置”中重试无法清除该进程级缺失。正常设置可以通过在添加或重新打开应用商店扩展之前预先注册主机来避免这种情况。开发时，在**加载解压后的**之前预先注册。

## <a id="status-and-removal"></a> 状态和移除

在不打印凭据的情况下检查安装：

```bash
openclaw browser extension status
openclaw browser extension status --json
```

JSON `storeInstallRequests` 条目对于经过验证的 OpenClaw- 拥有的请求报告 `requested`，当不存在请求时报告 `missing`，对于无法识别的注册报告 `foreign`，或者当无法安全读取或验证文件时报告 `invalid`。 `storeDiscovered` 分别报告 `enabled` 和 `awaitingApproval`。请求的安装、发现的扩展或启用的扩展不能证明经过身份验证的中继连接。

`owned` 本机主机注册不一定可启动。状态报告其注册的运行时和本机条目的文件系统就绪情况快照。它不执行任何目标或验证其代码是否会成功运行。如果升级删除了任一目标，请重新运行 `openclaw browser extension install` 以修复拥有的注册。所有权检查仍然拒绝外来或畸形的清单和启动器。

托管部署所有者可以检查注册的入口点，而无需读取 Chrome 配置文件或存储请求：

```bash
openclaw browser extension repair --dry-run --json
```

该报告包括`retainedNativeHostPaths`和`retentionSafe`。保留引用的软件包版本，直到其注册发生变化。如果检查不完整（`retentionSafe: false`），则保留释放并报告警告；这不能将浏览器修复失败变成网关更新失败。

要仅刷新属于一个已停用软件包的注册，请使用确切的旧入口点从其替换安装中运行命令：

```bash
openclaw browser extension repair --from /path/to/old/package/dist/extensions/browser/native-host-entry.js --json
```

修复使不相关的安装、丢失的注册、稳定的扩展副本、浏览器配置文件、存储请求和配对凭据保持不变。即使修复命令在不同的环境设置下运行，它也会保留启动器的已保存状态和配置选择。它使用与显式安装相同的所有权和来源检查。它不会重新启动 Chrome 或证明中继连接。替换启动器是不可变的；本机清单仅在其启动器完成后才会切换，因此清单写入失败后，先前的注册可用于重试。 General Doctor 仍然会跳过个人浏览器配置文件发现；首次设置时使用 `extension install`。

仅删除 OpenClaw 的 macOS Chrome 存储安装请求：

```bash
openclaw browser extension uninstall-store
```

删除请求后，Chrome 可能会在下次启动时删除外部安装的扩展。此命令使本机主机注册和开发副本保持不变，并拒绝外部或格式错误的请求文件。

仅删除 OpenClaw- 拥有的本机主机清单和启动器：

```bash
openclaw browser extension uninstall-host
```

这不会从 Chrome 中删除存储或解压的扩展。使用 `chrome://extensions` 即可。它还不会删除稳定开发副本或现有的中继密钥。

`openclaw browser extension path` 为只读命令。存在稳定版已安装副本时，它会打印该副本；否则打印捆绑的源目录。

## <a id="advanced-manual-pairing"></a> 高级手动配对

Settings 页面负责手动配对。生成主机本地配对字符串：

```bash
openclaw browser extension pair
```

手动配对对于不受支持的拓扑和恢复仍然有用。将完整的配对字符串视为密码。

如果没有 `--gateway-url` 或 `--local-gateway`，此命令将保留主机本地 `/extension` 继电器以进行独立手动配对。它不会唤醒浏览器控件。安装本机唤醒支持并启用自动设置后，扩展程序可以在重新连接时启动该中继，而无需本地网关。否则，中继必须已经在运行，例如通过浏览器控件或浏览器节点。

桌面本机助手可以使用 `openclaw browser extension pair --local-gateway --json` 来获取与自动本机引导相同的本地网关唤醒路由。这需要本地网关配置，拒绝`--gateway-url`，并保持普通手动配对不变。其输出包含中继凭证，不得记录。

对于安装了 Chrome 但不运行 OpenClaw 或浏览器节点的笔记本电脑，请直接配对到远程 Gateway：

```bash
openclaw browser extension pair \
  --gateway-url wss://gateway.example.com
```

将该字符串粘贴到 **设置 → 高级手动配对** 中。此流程无法使用本机引导程序：远程网关拥有不同的中继密钥，并且本地本机主机永远不会获取或复制它。非环回远程 URL 需要 `wss://`，并且网关必须公开准确的 `/browser/extension` WebSocket 路径，而无需路径重写代理前缀。

## <a id="external-cdp-clients"></a> 外部 CDP 客户端

中继支持浏览器中继身份验证 v2 客户端，例如 mcporter。 OpenClaw 和外部客户端可以保持连接在一起。当客户端启用运行时时，扩展会在中继向新订阅者重播现有执行上下文之前检查当前选项卡访问。这不会重置另一个客户端的运行时会话。

运行时绑定回调仅进入成功注册绑定名称的逻辑会话，与 `Runtime.enable` 和 `Runtime.disable` 无关。删除绑定或断开客户端连接会保留其他客户端的同名注册。具有相同名称的上下文特定注册仍然共享底层本机运行时。当客户需要单独的上下文选择时，请使用不同的名称。

每个本机目标会话的获取请求拦截都有一个所有者。另一个客户端可以使用其他 CDP 域，但无法替换该所有者的拦截设置或解决其暂停的请求。竞争的拦截请求会返回错误，而不是默默地更改活动所有者的策略。获取响应流也属于获取它们的逻辑会话。

相关目标（例如框架和工作人员）对于每个感兴趣的父级都有单独的逻辑会话。每个父级的有序自动附加过滤器都会被保留。本机附件使用它们的联合。只有在分机接受命令后，新的或扩大的兴趣才会接收现有的子项。本机暂停连接设置保持共享：最新更新获胜，包括 DevTools suspend/resume. 恢复等待目标会影响其所有逻辑会话。

客户端仍然共享底层选项卡。导航或页面更改可能会使另一个客户端的快照引用无效。这不是每个客户端的隔离浏览器，也不是每个 CDP 域和竞争客户端策略的完全隔离。当本机目标尚无法与 Playwright 页面匹配时，完整的选项卡列表请求将返回错误，而不是将部分列表报告为完整。 Chrome 永久拒绝调试的页面（例如 Chrome Web Store）不在此列表中。网关记录一条警告，指出跳过的选项卡和 Chrome 的拒绝；普通选项卡仍然可用。暂时的附件失败仍然无法完成完整的请求。此处理是网关端的，不需要新的 Chrome 扩展版本。

如果扩展连接断开，其调试器连接会在替换连接重新连接之前退出。不确定的本机 Fetch 操作还会停用受影响的附件，而不是针对替换项重试该操作。获取清理是有限的。调试器拆卸并不能保证挂起的网络请求被取消。这些路径不会更改访问模式或暂停的选项卡。在使用元素引用之前，在目标重新​​附加后拍摄新快照。如果客户端不再公开目标，请重新连接该客户端。

如果 Chrome 关闭本机目标，而其选项卡仍可访问，则中继会为仍订阅该选项卡的客户端恢复自动附件。它重新检查当前访问并为客户端提供新的会话；它永远不会重播失败的命令。显式客户端分离和 Chrome 的调试器取消操作仍然有效。恢复后继续之前拍摄新快照。

如果本机分离失败，则会报告错误，并且清理债务保留在该确切的附件中。其他选项卡仍然可用，但受影响的选项卡在清理成功之前无法获取替换选项卡。恢复 Chrome 访问权限后，重试显式附件或 **Disconnect**。 Chrome 的调试器取消操作也可以结束本机附件。单独删除或替换选项卡并不能视为其调试器客户端已关闭的证据。失败的 CDP 操作永远不会针对替换会话重试。

连接生命周期保护需要更新的扩展代码以及更新的 OpenClaw 安装。更新商店扩展（如果可用）。对于解压的开发副本，请重新运行 `openclaw browser extension install` 并从 `chrome://extensions` 重新加载已安装的副本。

打印非秘密端点元数据：

```bash
openclaw browser extension cdp
openclaw browser extension cdp --json
```

输出包括环回端点、协议版本、密钥 ID，以及固定的 challenge/complete 资源。不包括中继密钥或授权标头。

`cdp --legacy-bearer` 是针对无法使用浏览器中继身份验证 v2 的客户端的警告兼容性逃生舱口。它仅在 `browser.extensionRelay.allowLegacyAuth=true` 时有效，并根据请求打印旧凭证。

## <a id="permissions"></a> 权限

该扩展仅请求：

- `debugger`：将 CDP 命令发送到允许的选项卡。
- `tabs` 和 `tabGroups`：发现选项卡并强制执行访问模式。
- `storage`：持续配对、访问模式、会话暂停和引导选择退出。
- `alarms`：唤醒MV3工作线程进行relay/bootstrap重试。
- `nativeMessaging`：请求本地引导配对或唤醒其配置的继电器。

它不会请求 `activeTab`、`contextMenus`、`scripting` 或 `sidePanel`。

## <a id="native-bootstrap-security"></a> Native bootstrap 安全

本机主机是 `ai.openclaw.browser_bootstrap`。该扩展程序为一个请求打开 `chrome.runtime.connectNative` 端口，验证响应，然后断开连接。主机写入一个响应并退出。生成的独立中继比这种短暂的本机连接寿命更长。

该请求使用带有新的 16 字节随机数的版本化、长度前缀 JSON 帧。主机将输入上限设置为 4 KiB，需要致命的 UTF-8 解码和精确字段，根据精确安装的清单验证调用者来源，并仅返回本地生成的配对、中继状态或有界非秘密故障代码。引导请求仍然是 `{v:1, op:"bootstrap", nonce}`。中继唤醒使用 `{v:1, op:"ensure_relay", nonce, relayPort}` 以及所需的从 1 到 65535 的整数端口。丢失、重复、格式错误或多余的字段将被拒绝。在清单和调用者验证之后，主机在检查或生成之前根据当前扩展配置文件检查请求的端口。任何请求都不能向启动器提供主机、可执行路径或凭据。响应低于 Chrome 的 1 MiB 本机消息限制。配对密钥永远不会出现在启动器参数、清单、状态 JSON 或诊断中。

POSIX 启动器和清单使用 OpenClaw- 拥有的模式 `0700` 目录下的绝对解析路径。清单的模式为 `0600`。启动器可由所有者执行。符号链接、外国所有权、不安全模式、路径遍历、通配符来源和外国同名注册均被拒绝。

托管清单以固定顺序授权确切的 Foundation Chrome Web Store 源以及路径派生的开发源。商店身份是固定的产品信任授予，而不是任意路径是 OpenClaw- 拥有的证明。

安装官方 Chrome Web Store 版本即可正常使用。仅加载您信任的解压开发副本：Chrome 可以为密钥匹配的解压构建提供相同的扩展身份和本​​机主机访问权限。

解压后的开发ID计算与Chromium的`crx_file::id_util::GenerateIdForPath`匹配：将解析的绝对路径的原始字节与SHA-256（Windows上的本机UTF-16LE路径字节，仅小写驱动器号大写）进行散列，保留前16个摘要字节，然后映射十六进制数字 `0` 到 `f` 到字母 `a` 到 `p`。解压的扩展清单中没有 `key`。只有这些开发 ID 依赖于已批准的 OpenClaw- 拥有的真实路径。

中继本身使用连接绑定 HMAC 证明。在 v2 身份验证期间，不会在 URL、标头、WebSocket 子协议或应用程序帧中发送持久每主机密钥。在 POSIX 主机上，每个密钥读取都会拒绝外国拥有和非常规文件，并将拥有的 group/other-accessible 文件收紧为 `0600`。如果拧紧失败，钥匙将被拒绝。 Windows 使用其现有的 ACL 策略。

## <a id="troubleshooting"></a> 故障排查

```bash
openclaw browser extension status --json
openclaw browser doctor --browser-profile chrome
openclaw doctor
```

- **未预注册本机主机：** 检查前面的每个浏览器拒绝诊断并解决报告的路径、所有权或权限问题。此摘要并不意味着 Chrome 的用户数据目录丢失。如果 Chrome 从未启动过，请先启动它，然后在添加扩展之前重新运行 `extension install`。
- **未检测到扩展ID：**保持Chrome运行，重新运行`extension install`，然后添加官方商店扩展。仅在命令表明本机引导程序已准备就绪后，才使用 **Load unpacked** 作为开发回退。
- **Extension 在本机引导之前加载：** 重新启动 Chrome 一次以清除其缓存的本机主机未命中，然后重新运行有序安装流程。
- **扩展版本不匹配：**从`chrome://extensions`重新加载解压后的OpenClaw扩展，然后重新运行浏览器医生。如果运行版本和捆绑版本仍然不同，请完全重新启动 Chrome。
- **等待本地OpenClaw：**运行`extension status`。安装或修复拥有的本机主机。
- **自动设置已禁用：**在设置中启用它，或点击**使用本地 OpenClaw**。
- **需要手动设置：** 使用高级配对流程的设置。这对于仅直接扩展的远程网关设置来说是预期的。在 Windows 上，首先检查打包的本机可执行文件和匹配的本地 CLI 是否已安装，以及它们的私有 ACL/context 检查是否成功。
- **Relay 不可用：** 对于 `/browser/extension` 配对，确认目标网关正在运行。对于直接环回 `/extension` 配对，请检查本机主机注册、扩展构建中的唤醒支持、自动设置，以及配对端口是否仍属于扩展配置文件。允许一分钟的唤醒限制，然后运行浏览器医生。独立路径不需要本地网关。

请参阅 [Browser](/tools/browser)，了解完整的配置文件模型，以及托管的 `openclaw` 和 Chrome MCP `user` 配置文件。
