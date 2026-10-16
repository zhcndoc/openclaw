---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - "在 OpenClaw.app 中托管 PeekabooBridge"
  - "通过 Swift Package Manager 集成 Peekaboo"
  - "更改 PeekabooBridge protocol/paths"
  - "在 PeekabooBridge、Codex Computer Use 和 cua-driver MCP 之间做选择"
title: "Peekaboo 桥接"
---

OpenClaw 可以将 **PeekabooBridge** 作为本地、具有权限感知的 UI 自动化代理（`PeekabooBridgeHostCoordinator`，由 `openclaw/Peekaboo` Swift 包支持）托管。这使得 `peekaboo` CLI 驱动 UI 自动化，同时重用 macOS 应用程序的 TCC 权限。

## <a id="what-this-is-(and-is-not)"></a><a id="what-this-is-and-is-not"></a> 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以充当 PeekabooBridge 主机。
- **Client**：`peekaboo` CLI，从[peekaboo.sh](https://peekaboo.sh/)安装（没有单独的`openclaw ui ...`表面）。
- **UI**：视觉叠加保留在 Peekaboo.app. 中 OpenClaw 是一个瘦代理主机。

## <a id="relationship-to-other-desktop-control-paths"></a> 与其他桌面控制路径的关系

OpenClaw 有四条刻意保持分离的桌面控制路径：

- **PeekabooBridge 主机**：OpenClaw.app 托管本地 PeekabooBridge 套接字。`peekaboo` CLI 是客户端，并使用 OpenClaw.app 的 macOS 权限来进行截图、点击、菜单、对话框、Dock 操作和窗口管理。
- **代理驱动计算机使用（`computer.act`）**：网关代理内置`computer`工具通过`screen.snapshot`捕获屏幕截图。它通过危险的`computer.act`节点命令来驱动指针和键盘。 macOS 节点在进程中履行 `computer.act`。它使用该桥公开的嵌入式 Peekaboo 自动化服务以及窄 CoreGraphics 原语。它不通过 PeekabooBridge 插座或 `peekaboo` CLI。参见[计算机使用](/nodes/computer-use)。
- **Codex 计算机使用**：捆绑的`codex`插件检查并可以安装Codex的`computer-use` MCP插件（`extensions/codex/src/app-server/computer-use.ts`）。然后，Codex 在 Codex- 模式轮流期间拥有本机桌面控制工具调用。 OpenClaw 不会通过 PeekabooBridge 代理这些操作。
- **Direct `cua-driver` MCP**：OpenClaw可以将TryCua的上游`cua-driver mcp`服务器注册为普通的MCP服务器。这为代理提供了 CUA 驱动程序自己的架构和 pid/window/element-index 工作流程。它不通过 Codex 市场或 PeekabooBridge 套接字进行路由。

通过 OpenClaw.app 的权限感知桥接主机，将 Peekaboo 用于广泛的 macOS 自动化表面。当网关代理应查看并控制桌面时，请使用代理驱动的计算机。它通过任何视觉模型都可以驱动的统一 `computer.act` 节点命令来实现这一点。使用 Codex 计算机当 Codex-mode 代理应依赖 Codex 的本机插件时使用。使用直接 `cua-driver mcp` 将 CUA 驱动程序作为普通 MCP 服务器公开给任何 OpenClaw- 托管运行时。

## <a id="enable-the-bridge"></a> 启用桥接

在 macOS 应用程序中，打开 **Dashboard → 设置 → 本机 → 功能** 并启用 **Peekaboo Bridge**。该桥需要打开 **计算机 Control**，因为两者都授予本地 UI 自动化。计算机 Control 关闭时，主机不运行。要在没有计算机 Control 的情况下驱动 Peekaboo，请运行 Peekaboo 自己的 Mac 应用程序作为主机。

启用后（且 Computer Control 已开启），OpenClaw 会在 `~/Library/Application Support/OpenClaw/<socket-name>` 启动一个本地 UNIX socket 服务器。若被禁用，主机将停止运行，`peekaboo` 会回退到其他可用主机。协调器还会维护旧版 socket 符号链接（`clawdbot`、`clawdis`、`moltbot` 位于 Application Support 下），它们指向当前 socket，以兼容较旧的 `peekaboo` 安装。

对于一次性无人值守运行，`--attach-only --background-only` 会抑制自动窗口和 GUI- 拥有的钥匙串加载。持久提升主机是 OpenClaw Foundation 发布操作员的托管部署路径。其 `package` 命令需要基金会签名身份和公证凭证。 OpenClaw 不发布一般下载高程存档。仅安装由授权发布运营商提供的经认证、源地址存档：

```bash
cd /path/to/elevation-artifact-set
export PREFIX="OpenClaw-<full-openclaw-sha>-Peekaboo-<full-peekaboo-sha>-stable"
export INSTALLER_SHA256="<authenticated-installer-sha256>"
export RECEIPT_SHA256="<authenticated-receipt-sha256>"
[[ "$(shasum -a 256 "$PREFIX-installer.sh" | awk '{print $1}')" == "$INSTALLER_SHA256" ]] || exit 1
shasum -a 256 -c "$PREFIX.zip.sha256"
shasum -a 256 -c "$PREFIX-installer.sh.sha256"
./"$PREFIX-installer.sh" verify \
  --archive "$PREFIX.zip" \
  --receipt "$PREFIX.json" \
  --receipt-sha256 "$RECEIPT_SHA256"
./"$PREFIX-installer.sh" migration-plan \
  --migrate-launch-agent "$HOME/Library/LaunchAgents/ai.openclaw.node.plist"
./"$PREFIX-installer.sh" install \
  --archive "$PREFIX.zip" \
  --receipt "$PREFIX.json" \
  --receipt-sha256 "$RECEIPT_SHA256" \
  --migrate-launch-agent "$HOME/Library/LaunchAgents/ai.openclaw.node.plist"
./"$PREFIX-installer.sh" status --state-dir "<existing-state-dir>"
```

传输完整的工件集：存档、收据、便携式安装程序以及两个校验和文件。目标 Mac 不需要 OpenClaw 源签出。授权操作员交接必须独立提供安装人员和收据 SHA-256 摘要。在计划切换之前，使用经过身份验证的收据摘要运行 `verify`。然后收据会选择批准的存档。 `verify` 重新验证基金会签名的应用程序、公证、订书钉、Gatekeeper 结果、架构、权利和两个源修订。便携式安装程序不包含在应用程序的代码签名中，因此这种显式的两次摘要发布操作员移交仍然是内部信任边界的一部分。

Elevation 工件需要通用共享应用程序代码和 `Contents/Resources/runtime/` 下的一个私有运行时。其 `bin/bun` 和 `lib/libsqlite3.dylib` 必须同时包含 `arm64` 和 `x86_64` Mach-O 切片。无论目标 Mac 的架构如何，`verify` 都会检查两者。运行时在架构之间共享完整的 OpenClaw 包，包括 CLI、工作线程、浏览器设置和 Control UI 入口点。包构建元数据必须与应用程序的版本、源提交、构建时间戳和 `OpenClawRuntimeBuildID` 匹配。本机依赖项，​​包括插件、静态档案和没有可执行权限位的库，必须支持arm64或x86_64；特定于体系结构的 Darwin 包共存于共享树中。外国平台本机代码和应用程​​序中的任何 Node 可执行文件都会被拒绝。可签名的 Mach-O 图像还必须公开每个切片的本机签名元数据。即使严格的整个应用程序验证成功，通用资源签名也不是本机签名证据。兼容的 Thin、FAT32 和 Fat64 静态存档仍然是受应用程序密封和体系结构检查保护的资源。他们不需要独立的 Mach-O 签名。混合 archive/native 容器未通过验证。检查永远不会稀释或重写所提供的有效负载。缺少运行时入口点或所需的 Bun/SQLite 切片、转义或循环运行时符号链接以及运行时外部的精简共享应用程序可执行文件或可执行库无法验证。违反此封闭性的依赖项必须在包装中修复，而不是排除在验证之外。便携式安装程序既不需要结账，也不需要单独的库存助手。

标准和提升打包都从具有生产依赖性的完整发布包构建了一个新的运行时。暂存会删除其声明的 OS 或 CPU 支持排除所请求的体系结构的软件包，并删除基于 Node- 的命令填充程序。然后，物化会保留 JavaScript、WASM、其他资源、模式和包含的相对符号链接，同时忽略无法在任何选定的 Darwin 架构上运行的本机映像。匹配的通用二进制文件保持不变。在保留的包中，Windows- 命名的源文件、脚本和 README 文件仍然存在；仅目录名称不会选择要省略的文件。无法分类的本机图像和链接会逃逸、循环或成为悬空停止包装。两种路径都使用相同的运行时验证和发布流程。构建元数据在具体化过程中保持不变。高程应用程序保留库验证并拒绝 `DISABLE_LIBRARY_VALIDATION=1`。其私有 Bun 可执行文件具有 [ 插件本机插件异常 ](/platforms/mac/signing)；其他助手保留库验证。

托管提升工作流程会升级已配对的 Mac。其选定的状态和配置必须使用字符串令牌或密码身份验证定义应用程序可读的直接远程网关路由，并且所选的 macOS 节点身份必须已配对。 `migration-plan` 执行这些检查而不更改应用程序、进程、LaunchAgent、状态或网关。它识别标准 CLI- 托管 `ai.openclaw.node` 作业和应用程序支持的后台 LaunchAgents。如果旧应用程序在后台模式下运行而没有 LaunchAgent，请使用 `--adopt-running-app` 而不是 `--migrate-launch-agent`，并在 state/config 路径不是默认值时显式传递其路径。

`--elevation-host` 是由已安装的作业暗示的。它使网桥、控制通道、Mac 节点、网关连接和终止处理保持活动状态，同时禁用自动窗口、更新程序启动、Dock 升级、配对和执行批准演示者、快速聊天热键、语音和 cookie 服务以及 GUI-owned 钥匙串读取。 `status` 报告缺少屏幕录制、辅助功能或事件合成。主机永远不会打开系统设置来授予它。一旦 launchd-owned 进程准备好桥接，即使这些授权仍未完成，安装也会成功，但只有在精确配对的节点身份作为 `openclaw-macos/node` 与新应用程序版本、`computer` 功能、`screen.snapshot`、`computer.act` 和计算机使用描述符重新连接后，安装才会成功。安装程序不复制网关凭据或交互式 `PATH`。它仅携带经过验证的 state/config 所有权路径，并使用配置的现有路由和身份验证。 `status` 重新检查网桥、网关节点和 TCC 准备情况。安装程序使用单独的 `ai.openclaw.mac.elevation-host` 作业，并拒绝竞争或重写登录时的普通 **Launch** （`ai.openclaw.mac`）。

切换是事务性的：安装程序会快照确切的应用程序和源 plist，停止先前的所有者，安装替换版本，并在 launchd、Bridge 或 Gateway 节点证明失败时自动恢复原始字节和加载状态。安装收据绑定回滚 plist 摘要、先前的应用程序 CDHash 以及任何先前的托管安装收据。一代独特的备份允许连续升级。 `recover` 将替换的应用程序保留在唯一的证据目录中，恢复之前的收据，并拒绝覆盖由其他所有者重新创建的源 LaunchAgent 路径。

海拔存档是基金会签名、公证、装订的，由完整的 OpenClaw 和 Peekaboo 源提交命名，并且完全包含 `OpenClaw.app`。它的收据绑定了存档和便携式安装程序名称和摘要、OpenClaw 和 Peekaboo 源版本、签名者、每个架构的 CDHashes、架构、权利摘要和 Apple 公证提交 ID。此工作流程中没有 AppleScript 或 Apple 事件权利。

## <a id="client-discovery-order"></a> 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整 UX）
2. Claude.app（如果已安装）
3. OpenClaw.app（轻量 broker）

使用 `peekaboo bridge status --verbose` 查看当前活动的主机以及正在使用的 socket 路径。可通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## <a id="security-and-permissions"></a> 安全与权限

- 桥接器检查**调用者代码签名**。生产 OpenClaw 主机仅接受由 Peekaboo 官方 current/legacy 发布签名者集（`FWJYW4S8P8` 和 `Y5PE65HELJ`）签名的确切 Peekaboo CLI 捆绑包 （`boo.peekaboo.peekaboo`）。共享应用程序的 UID 或使用应用程序开发团队签名的另一个客户端是不够的。
- 出于可访问性考虑，优先选择签名的 bridge/app 身份而不是通用 `node` 运行时。授予 `node` 的可访问性可以让该 Node 可执行文件启动的任何包继承 GUI 自动化访问权限。请参阅 [macOS 权限](/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes)。
- 请求在 10 秒后超时（`requestTimeoutSec: 10`）。
- 如果缺少所需权限，桥接会返回清晰的错误消息，而不是启动系统设置。

## <a id="snapshot-behavior-(automation)"></a><a id="snapshot-behavior-automation"></a> 快照行为（自动化）

`InMemorySnapshotManager` 将快照存储在内存中。它采用 10 分钟的有效期窗口和 50 个快照的上限。清理不会删除工件。如果您需要更长时间的保留，请从客户端重新捕获。

## <a id="troubleshooting"></a> 故障排查

- 更新OpenClaw.app以获取嵌入式自动化修复，包括关闭主机自己的窗口时的崩溃。仅更新 `peekaboo` CLI 不会替换桥主机的窗口自动化代码。
- 如果`peekaboo`报告“网桥客户端未授权”，请检查客户端是否已正确签名。作为替代方案，仅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行主机。
- 如果未找到主机，请打开主机应用程序之一（Peekaboo.app 或 OpenClaw.app）。然后检查是否已授予权限。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
- [Codex 计算机 Use](/plugins/codex-computer-use)
