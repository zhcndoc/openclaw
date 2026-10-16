---
summary: "Linux 支持 + 配套应用状态"
read_when:
  - "寻找 Linux 配套应用状态"
  - "在 Linux 节点主机上启用摄像头、位置或通知"
  - "规划平台覆盖范围或贡献"
  - "调试 Linux 上 VPS 或容器中的 OOM 杀死或退出 137"
title: "Linux 应用"
---

Linux 完全支持网关。 Node 是主要的、默认的、推荐的运行时； Bun 1.4.3+ 使用 WAL- 重置安全 `node:sqlite` 构建，可以将 OpenClaw 作为显式选择运行。使用 `pnpm` 而不是 Bun 进行依赖安装。

## <a id="desktop-companion"></a> 桌面伴侣

OpenClaw Linux 配套产品是一款适用于本地和远程网关的 Tauri 桌面应用程序。在Windows上，推荐原生[Windows Hub](/platforms/windows#recommended-windows-hub)；此跨平台 [Tauri 应用程序 ](/platforms/windows#backup-tauri-desktop-app) 是备份，可在常规 OpenClaw 版本中使用，并与本地 Windows 网关捆绑 Bun。在 Linux 上，它：

- 自动为全新安装设置本地网关，如果安装失败，可以选择手动本地、发现远程、直接 URL 和 SSH
- 安装 OpenClaw CLI 并在捆绑的 OpenClaw Bun 分支上运行全新的本地安装，无需全局安装 CLI；发布版本安装其匹配的稳定版本，而开发版本使用开发进行自动设置
- 在尝试服务变更之前会附加到健康的 Gateway
- 将安装、启动、停止和重新启动操作委托给 CLI- 托管的 systemd 用户服务
- 发现附近的 Bonjour Gateways，并在按路由作用域的窗口中打开每个 Control UI，因此可以让多个 Gateway 仪表板保持连接并同时使用
- 使用其已解析的认证 URL 打开 Gateway 提供的 Control UI
- 在自动本地设置后打开托管人入门引导，以准备 AI 访问并解释选择；手动设置保留显式模型设置选择器
- 连接新模型后继续进入引导式登录；入门引导可以将检测到的 Claude Code、Codex 或 Hermes 内存导入代理工作区（相同的导入稍后在“设置”→“导入内存”下保持可用）
- 当窗口关闭时，仍可从系统托盘访问

窗口控件共享仪表板的顶行。拖动空白标题空间或会话标题以移动窗口，然后双击以最大化或恢复窗口。顶部调整大小边缘下方的细条也会移动窗口。最小化，maximize/restore，然后关闭坐在右上角；窗口边缘保持可调整大小。关闭主窗口后，系统托盘中将保留 OpenClaw。当连接到其仪表板不支持此布局的旧网关时，配套设备将保留系统标题栏。更新网关以启用统一的窗口控件。

本地启动、设置、恢复、网关管理器和快速聊天屏幕共享浅色和深色样式，并在打开时遵循系统外观变化。连接草稿、凭据可见性和快速聊天回复保持不变。连接的仪表板保留其自己的 Web UI 外观设置。

远程设置和连接设置使用 **Authentication** 选项作为令牌或密码。 **显示凭据**显示输入的值；切换类型会清除草稿并屏蔽新字段。按 Enter 或 **Connect 到 Gateway** 进行连接。在连接设置中，空白凭据将重复使用同一端点所保存的凭据。

### <a id="chrome-extension-setup"></a> Chrome 扩展设置

该应用程序在启动时和 CLI 安装后准备本地 Chrome 本机帮助程序。发布版本重用匹配的 CLI 或在其自己的应用程序数据目录下安装版本匹配的浏览器运行时。此下载不会创建、检查、刷新或重新启动网关服务、替换其运行时或更改选定的远程连接。它需要互联网连接。

在托盘中选择“**设置 Chrome 扩展...**”以重试设置，并在本机注册成功后打开官方 Chrome Web 商店列表。 Google Linux上的Chrome仍然需要**添加到商店中的Chrome**；该应用程序不会使用企业强制安装策略或在每次启动时重新打开应用程序商店。启用后，受支持的主机本地设置会自动配对，无需复制凭据。仅远程桌面连接仍需要此计算机上的浏览器节点才能将其选项卡公开给远程网关。

开发构建使用现有的本地 CLI，而不是下载不相关的稳定运行时。 Windows Tauri 版本不提供此运行时安装程序。请参阅 [Chrome 扩展 ](/tools/chrome-extension) 以进行批准、断开连接和手动恢复。

### <a id="desktop-compatibility"></a> 桌面兼容性

Linux 配套产品与本机 macOS 应用程序和 CI 共享一个 Bun 叉形引脚。运行时准入、SQLite 安全检查和分叉禁用的隐式包自动安装仍保持启用状态。 macOS Tauri 测试版本保留其现有的运行时行为；本机 macOS 应用程序拥有其单独的捆绑运行时。 Windows Tauri 版本使用来自共享引脚的签名 Windows 分叉进行本地设置；未签名的试运行不可发货。请参阅 [Bun 兼容性 ](/install/bun-compatibility)。

已发布的 AMD64 AppImages 构建于 Ubuntu 22.04 之上，需要 glibc 2.35 或更新版本以及提供 `GLIBCXX_3.4.30` 的 `libstdc++`。 Ubuntu、22.04和Debian 12接ABI地板。 RHEL 9 和 Rocky Linux 9 附带 glibc 2.34，因此它们无法运行已发布的 AppImage。提取 AppImage 不会绕过此要求。

`.deb` 安装仍由系统包管理器拥有；安装下载不会添加 APT 存储库。 AppImages 使用签名的应用内更新程序。

X11 上提供全局快捷方式。在 Wayland 上，当您的桌面提供托盘主机时，请使用托盘的 **Quick Chat** 条目；全局快捷方式不可用。托盘访问是一种快捷方式回退，而不是本机 Wayland 兼容性保证。

shell 不会向其嵌入的 WebKitGTK WebView 授予麦克风捕获功能，因此 `getUserMedia` 预计会在此处失败。在常规浏览器中打开网关的 Control UI，以获取 [ 通话模式 ](/nodes/talk)。

桌面作为网关操作员进行连接，并使用本地 CLI 与其主网关共享此计算机的桌面。其应用程序拥有的节点仅公开桌面流。其他设备命令属于[CLI节点主机](/cli/node)及其[Linux Node插件](/platforms/linux#node-capabilities)。

[native macOS 应用程序](/platforms/macos) 和[Windows Hub](/platforms/windows) 是单独的应用程序。 Windows Hub是推荐的Windows应用程序；这个金牛座外壳是备用。 macOS Tauri 版本仍然是一个选择加入的测试包。请参阅平台页面了解要求和功能。

### <a id="gateway-selection"></a> 网关选择

打开**网关 → 管理网关...**从本机应用程序或托盘菜单直接保存URL or SSH联系。选择**添加网关** or **编辑**打开连接表单；**返回网关**返回到已保存的列表并放弃未保存的更改。在下面**验证**，选择令牌或密码，并仅在需要时输入凭据。保存的凭据保持隐藏状态；将该字段留空以使它们保持相同的连接。切换身份验证类型会清除您输入的凭据。SSH证书密码在下面**高级连接设置**。

仪表板的配置文件菜单仅切换其当前窗口；Control-单击打开一个附加窗口。从本机菜单中选择网关会聚焦其现有窗口，而无需重新加载它，而**在新窗口中打开...**创建一个独立的。

主网关继续拥有快速聊天和桌面连接。更改它需要单独的**设置为主要**对保存的令牌验证连接进行确认。其他网关窗口保留自己的目标。同伴会记住成功的显式选择，在删除保存的连接时返回到主节点，并将凭据保留在操作系统的凭据存储中。Linux需要解锁的特勤局，例如GNOMEKeyring 或 KWallet 的特勤局支持。

不可用的凭证存储会显示可忽略的通知，而不会阻止仪表板。保存的连接保持不变；使用 **管理网关... → 解决报告的凭证存储问题后重试**。

当保存的网关加载失败时，同一窗口将返回到其本地连接编辑器。仅在新仪表板成功加载后，更正端点才会更新记住的选择。

这macOSTauri 构建被命名**OpenClaw-金牛座**并将其保存的连接与本机连接分开**OpenClaw**应用程序。

<a id="adopt-the-bundled-runtime" />

### <a id="use-the-bundled-runtime"></a> 使用捆绑的运行时

在 Linux 上，全新的本地设置通过标准 CLI 在捆绑的 OpenClaw Bun 分支上安装网关。安装防护要求该服务仍然不存在。安装过程中出现的服务会阻止该安装。应用程序的运行时标记仅供参考，并且从不授权自动服务更改。

对于使用其他运行时的任何现有网关，请选择**使用捆绑运行时...**在托盘菜单中。这包括Node， 较旧的捆绑包Bun应用程序更新后以及操作员选择的运行时。确认信息显示当前运行时间。这CLI安装会检查服务定义和运行时 pin 是否仍与您在切换到当前捆绑之前确认的内容匹配Bun。如果其中任何一个发生更改，则该操作将拒绝。暂停或停止的网关保持停止状态；选择**启动网关**在切换运行时之前。

该应用程序在安装后检查网关的运行状况。失败时，它会显示错误和 CLI 命令以返回到先前的运行时。它不会自动恢复运行时。要返回 Node，请安装 [ 支持的 Node 版本 ](/install/node-compatibility)（如果需要），然后运行：

```sh
openclaw gateway install --force --runtime node
```

要返回到特定的先前可执行文件，请使用 `openclaw gateway install --force --runtime-path /absolute/path/to/node-or-bun`。 CLI 拥有服务安装。切换现有网关的运行时会使其 CLI 启动器保持不变。

启动和应用程序更新永远不会更改现有的网关服务或运行时 pin。应用程序更新后，当前服务将保留其现有运行时，直到您再次选择 **使用捆绑运行时…**。保留不可变的应用程序运行时目录，因此更新永远不会删除服务引用的运行时。这些动作仅限Linux-； macOS Tauri 保持其现有行为，与 [native macOS 应用程序 ](/platforms/mac/bundled-gateway) 分开。

### <a id="desktop-sharing"></a> 桌面共享

打开 **设置 → 本计算机 → 功能 → 桌面共享** 更改设置。 macOS Tauri 版本将此部分标记为 **This Mac**。共享开始启用；现有的 `desktop.host.enabled: false` 会保持关闭状态，直到您在应用程序中明确启用它为止。您的选择在应用程序重新启动后仍然存在，并且独立于 **保持计算机唤醒**。

共享需要本地 OpenClaw CLI（包括当您的网关位于远程时）以及经过身份验证的本地 VNC 服务器。在macOS上，在系统设置中启用**屏幕共享**。根据请求在主网关上批准计算机的桌面功能，然后从 **Systems** 打开其桌面。请参阅 [ 配对节点桌面](/gateway/config-browser-ui-desktop#paired-node-desktops) 了解身份验证、配对和升级行为。

状态行显示应用程序的桌面进程是否正在运行或需要关注。在桌面打开之前，配对批准和本地 VNC 服务器也必须准备就绪。此处出现缺少 CLI 或无效配置错误。关闭共享、更改主网关或退出应用程序会停止旧的桌面连接。关闭托盘窗口可使共享保持活动状态。

### <a id="first-run-setup"></a> 首次运行设置

没有保存的情况下OpenClaw配置或网关配置文件时，应用程序会自动启动本地设置并在Control UI。保管人准备可用AI访问并解释选择和替代方案。**使用不同的网关**打开管理网关，**审核权限**打开这台计算机的权限，并且**打开AI设置**打开模型设置。该卡标记本地网关**这台电脑**并按名称保存远程网关；其本机操作保留所选网关的基本路径。

自动安装使用与手动本地安装相同的捆绑运行时、安装程序和 CLI- 托管服务。它永远不会自动加入已发现的网关。现有配置和远程设置保持其当前行为。无法读取的已保存配置文件存储或任何自动设置失败都会返回到手动选择，并显示错误。

在手动设置中，选择您的助手应该居住的地方：

- **在此计算机上，** 安装所有缺少的本地必备组件，并将网关作为 systemd 用户服务启动。
- **在另一台电脑上**连接到现有网关。选择一个发现的网关，在下面输入其地址**网关URL**，或选择**SSH隧道**并输入SSH目标例如`user@gateway-host`。网关端口默认为`18789`。

如果远程网关需要身份验证，请展开 **Gatewayauthentication** 并输入其令牌或密码。使用一种与远程网关的配置相匹配的凭证类型。远程设置不会安装或启动本地网关服务；远程主机拥有其模型、提供者凭据和代理状态。

使用 HTTPS 或 `wss://` 进行公共直接连接。普通 HTTP 或 `ws://` 应仅限于环回、受信任的专用网络和 Tailnet 主机。当保存的配置包含`gateway.remote.tlsFingerprint`时，请选择**SSH隧道**而不是直接连接。嵌入式浏览器无法强制执行证书 pin，因此应用程序在加载远程仪表板或公开其凭据之前拒绝直接连接。保存的远程令牌和密码值可以使用环境或文件支持的 SecretRefs； exec 和共享存储引用必须在其所属的网关主机上解析。 SSH 使用您现有的 OpenSSH 身份验证和主机密钥验证。请参阅 [ 远程访问 ](/gateway/remote) 以了解安全网关配置。

手动连接成功后，模型设置会发现所选网关可用的 AI 访问权限并将其显示为选项。 Discovery 不会导入或复制帐户。在新访问时，伴侣不会选择、测试、安装或保存提供程序，直到您选择其操作。需要时提供提供商登录或 API-key 条目，并且在打开代理之前需要成功的模型响应。已配置的网关在验证后会打开其正常仪表板；新配置的访问继续进入引导式入门。

如果网关在保存模型和凭据之前确认实时模型测试失败，请关闭错误并重试或选择其他连接。不确定的错误会阻止替换设置，因为设置可能已被保存。在设置开始之前确认的取消和拒绝的请求可以立即重试。

模型设置可以在网关重新启动或应用程序重新打开时恢复激活，同时其临时恢复记录有效。恢复保持绑定到相同的网关、代理和身份验证。当已知的激活目标仍然与所选模型匹配时，OpenClaw在继续引导引导之前验证确切的模型，而不是再次激活提供程序。对于未解决的结果，请使用**验证并使用所选模型**显式验证并采用显示的模型，或等待设置尝试的有界窗口结束后再选择**再次检查**。该记录过期、浏览器存储变得不可用或被清除、或者网关、代理或身份验证发生更改后，无法保证恢复。

Ollama 自动发现使用内存中已加载的合格模型，而不是磁盘上安装的所有模型。要使用空闲安装的模型，请选择 **在其 Ollama 卡上选择连接**，然后选择 **仅本地**。请参见 [Ollama](/providers/ollama)。

对于 OpenAI，选择 **ChatGPT Login** 以使用 ChatGPT 或 Codex 订阅，或选择 **OpenAI API Key** 用于 API 计费。浏览器登录在网关主机上完成。如果该主机是远程的或者无法到达其本地主机回调，请从其他登录选项中选择 **ChatGPT 设备配对**； device pairing works without a localhost callback. See [OpenAI](/providers/openai) and [OAuth](/concepts/oauth)。

当桌面应用程序在其环境中使用受支持的提供程序 API 密钥启动时，网关服务会将该专用推理凭据保留在仅限所有者的环境文件中。提供商管理密钥、GitHub 令牌和不相关的环境变量不会复制到服务中。

### <a id="host-sleep"></a> 主机休眠

在本机托盘菜单中选择“**保持计算机唤醒”**，以防止桌面伴侣运行时（包括窗口关闭时）空闲睡眠。该设置默认处于关闭状态，并会在应用程序重新启动时记住您的选择。关闭或退出 OpenClaw 会释放保持唤醒请求。它不会更改您的永久电源设置或解锁计算机。如果操作系统无法满足已保存的请求，菜单会标记选中的首选项 **inactive** 并报告错误。您仍然可以取消选中它以关闭保存的首选项。

Linux用途GNOME的会话管理器或支持空闲抑制的 xdg-desktop-portal 后端。根据桌面的不同，这还可以防止显示变暗和自动锁定；手动锁定仍然可用。可选的macOS和WindowsTauri 构建可防止系统空闲睡眠而不请求显示器保持打开状态。

在使用 systemd-logind 的系统上，伴侣会在主机休眠前为其本地 Gateway 准备挂起租约。唤醒后，它会重新连接并恢复 Gateway；远程 Gateway 路由保持不变。如果 logind 或系统总线不可用，休眠挂钩会自行禁用，应用继续正常运行。

从 `main` 或其匹配的 `release/YYYY.M.PATCH` 分支构建的稳定版本 `.deb` 和 AppImage 捆绑包作为 [GitHub 版本 ](https://github.com/openclaw/openclaw/releases) 标签上的资产，名为 `OpenClaw-<version>-amd64.deb` 和 `OpenClaw-<version>-amd64.AppImage`，带有`SHA256SUMS.linux-app.txt` 校验和文件位于它们旁边。下载`.deb`并与`sudo apt install ./OpenClaw-<version>-amd64.deb`一起安装，或标记AppImage可执行文件并直接运行。 AppImage 运行时需要 FUSE 2（`sudo apt install libfuse2` 或 Ubuntu 24.04+ 上的 `libfuse2t64`）；如果没有它，请使用 `APPIMAGE_EXTRACT_AND_RUN=1` 运行 AppImage。

定期稳定发布请求Linux网关版本可见后会自动捆绑。Linux独立完成构建、签名、发布。虽然这些捆绑包正在等待处理，但应用程序更新程序将继续提供之前发布的Linux版本通过其原始签名下载。

仅下载包含名为 Linux 捆绑包和校验和文件的版本；仅新的网关版本并不能证明新的 Linux 应用程序可用。附带的更新程序仍然使用 `releases/latest/download/latest.json`。独立的 `linux-stable` 发布工具不是客户端端点或下载链接迁移。该激活需要单独的发布批准和签名的安装客户端证明；请参阅 [Linux 配套出版物 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/platform-publication.md#linux)。

### <a id="media-codecs"></a> 媒体编解码器

该伴侣使用 GStreamer 插件进行音频和视频播放。 WebM/VP9、Opus、Vorbis 和 WAV 通常通过 `plugins-good` 工作。 H.264/MP4、AAC 和 MP3 需要 `libav` and/or `plugins-bad` 封装。 `.deb` 使用主机的插件并将所有三个包声明为依赖项。 AppImage 捆绑了 GStreamer 媒体框架和这些格式所需的插件。对于源构建或重建 Linux 捆绑包时，请显式安装包和检查工具：

```bash
sudo apt update && sudo apt install gstreamer1.0-libav gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-tools patchelf xdg-utils unzip
```

打包脚本仅在 Tauri 调用 linuxdeploy 之前暂存该媒体功能集。这可以防止可选主机插件将不相关的系统库添加到AppImage依赖关闭。

包装流程规定了 Tauri 的五个AppImage工具放入干净的、摘要固定的缓存中。 Tauri 建成后AppImage，终结器重新验证该缓存，从保留的中删除捆绑的 Wayland 客户端库AppDir，并重建工件。WebKitGTK然后 Mesa 使用一个兼容的主机堆栈。

你也可以从源码检出目录构建相同的软件包：

```bash
plugins=$(mktemp -d)
cache=$(mktemp -d)
trap 'rm -rf "$plugins" "$cache"' EXIT
export XDG_CACHE_HOME="$cache"
apps/linux/scripts/stage-appimage-gstreamer.sh "$plugins"
apps/linux/scripts/tauri-appimage-tools.sh prepare
apps/linux/scripts/tauri-appimage-tools.sh verify pre-build
export LDAI_RUNTIME_FILE="$(apps/linux/scripts/tauri-appimage-tools.sh runtime-path)"
(
  cd apps/linux/src-tauri
  GSTREAMER_PLUGINS_DIR="$plugins" \
    pnpm dlx @tauri-apps/cli@2.11.4 build --bundles deb,appimage \
      --config '{"bundle":{"createUpdaterArtifacts":false,"useLocalToolsDir":false}}'
)
apps/linux/scripts/finalize-appimage.sh \
  apps/linux/src-tauri/target/release/bundle/appimage
```

`Linux App` 工作流程通过 Rust 测试、本机构建和本机内联浏览器烟雾检查受影响的拉取请求；它不会为拉取请求构建捆绑包。手动运行构建并上传 `.deb` 和 AppImage 作为 `openclaw-linux-companion` 工作流程工件；他们不发布版本。请参阅存储库中的 `apps/linux/README.md`，了解 Linux 构建依赖项和开发命令。

### <a id="quick-chat"></a> 快速聊天

`Ctrl+Shift+O`仅在聚焦的仪表板中打开新会话。伴侣不会全局保留此和弦，因此其他前台应用程序会保留自己的快捷方式行为。

使用 `Ctrl+Shift+Space` 或托盘项 **快速聊天** 打开快速聊天。agent 徽章会显示已配置的头像、表情符号或字母组合；选择它可切换 agent。 消息使用所选 agent 的主会话，并遵循全局会话作用域。 原生 Rust 客户端拥有持久的 Ed25519 设备身份。它仅使用 CLI 交接中的共享令牌或密码来启动配对，然后在后续连接中存储并优先使用 Gateway 签发的设备令牌。身份和设备令牌位于应用配置目录中的一个模式为 `0600` 的文件内；快速聊天的 WebView 不会接收任何凭据或 WebSocket。

当原生连接不可用时，快速聊天会显示 **Gateway 无法访问——正在重试**，并在重新连接前禁用发送。已进入配对阶段的远程设备会显示 **请在仪表板的 （Nodes）中批准此设备**，如果 Gateway 提供了短设备 ID，则会一并显示。需要缺失共享凭据的 Gateway 会显示 **Gateway 需要凭据——请在 Gateway 主机上打开仪表板**；在这种状态下不会有等待批准的配对请求。只有当服务器提供的修复指导更具体时，才会用其替换这些回退提示。 对于 TLS Gateway，CLI 会将 Gateway 证书的 SHA-256 指纹传递给应用；原生客户端会固定该证书，并单独报告 **Gateway TLS 信任失败——请检查证书指纹**，与宕机状态区分开来。 通过 SecretRef 配置共享密钥的 Gateways 会在 CLI 交接中省略它。已存在的配对安装会通过其存储的设备令牌继续工作，但新安装无法在共享密钥认证下、没有该启动凭据的情况下创建待处理的配对请求。 Setup-code 和 `bootstrapToken` 的兑换需要专门的产品 UI，仍然是后续事项；快速聊天不会尝试这两种流程。

On X11，使用“快速聊天”中的齿轮来记录或重置自定义快捷方式。这**快速聊天快捷方式**托盘切换启用或禁用它而不禁用普通**快速聊天**托盘项目。全局快捷方式在 Wayland 上不可用，因此快捷方式设置被隐藏，托盘项仍然是入口点。接受发送后，快速聊天将保持打开状态，并在底部编辑器上方流式传输所选代理的纯文本回复，以及您提交的消息和回复。折叠回复以保持紧凑的作曲家；展开它可以恢复实时文本和任何小部件内容。您可以在收到回复时准备下一份草稿，然后在回合结束时发送。 Return 发送，Shift-Return 添加换行符，并且`Ctrl+Enter`发送并打开仪表板。**打开仪表板**也可以在作曲家控件旁边使用。按`Esc`驳回该条及其答复。

## <a id="cli-and-ssh-alternative"></a> CLI 和 SSH 替代方案

这CLI仍然是无头服务器最简单的选择，或者VPS。使用手册SSH没有连接时的隧道Linux桌面伴侣：

1. 安装Node 26（推荐），或其他受支持的版本：Node 24.16+ or Node 26.1+。
2. On npm 12 or npm 11.16+，运行`npm i -g openclaw@latest --allow-scripts=openclaw`. On npm 11.15以及之前，省略`--allow-scripts=openclaw`。
3. `openclaw onboard --install-daemon`
4. 在你的笔记本电脑上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/`，并使用已配置的共享密钥进行身份验证（默认是 token；如果 `gateway.auth.mode` 是 `"password"`，则使用密码）。

完整服务器指南：[Linux Server](/vps)。分步 VPS 示例：[exe.dev](/install/exe-dev).

## <a id="node-capabilities"></a> Node 功能

捆绑的 Linux Node 插件可让 CLI 的 `openclaw node` 服务无需桌面应用即可获得设备能力。只有当某项能力已启用且所需的本地工具存在时，对应命令才会向 Gateway 公布。

| 能力                              | 默认值 | 要求                                                           |
| --------------------------------------- | ------- | --------------------------------------------------------------------- |
| 桌面通知 (`system.notify`) | On      | 来自 libnotify 的 `notify-send` 以及桌面通知会话       |
| 摄像头照片和短片 (`camera.*`)    | 关闭     | FFmpeg、V4L2 摄像头访问，以及用于短片音频的 PulseAudio 或 PipeWire |
| 位置 (`location.get`)               | 关闭     | GeoClue2 及其 `where-am-i` 演示程序                                    |

在 `openclaw.json` 中配置该插件：

```json5
{
  plugins: {
    entries: {
      "linux-node": {
        config: {
          notify: { enabled: true },
          camera: { enabled: true },
          location: { enabled: true },
        },
      },
    },
  },
}
```

更改这些设置后，请重启 node 服务。可用性会在每个进程中判断一次，并且 node 广告会在重启时重建。

Gateway 会将 node 的命令和能力范围与设备配对分开审核。首次启动时，或在启用更多能力之后，请批准待处理的范围：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

在有效的 `caps` 和 `commands` 为空之前，node 仍可以保持连接并完成设备配对，直到该批准完成。

摄像头设备必须允许服务用户读取，通常通过 `video` 组实现。当 `includeAudio` 为 true 时，摄像头短片会使用默认的 PulseAudio 或 PipeWire 音源；麦克风音频只会作为该短片轨道存在，而不是作为独立命令。位置功能要求主机的 GeoClue 策略允许 node-service 用户访问。

`camera.snap` 和 `camera.clip` 也需要通过 `gateway.nodes.commands.allow` 显式启用。有关负载、限制和错误，请参见 [摄像头采集](/nodes/camera) 和 [位置命令](/nodes/location-command)。

## <a id="retired-linux-canvas"></a> 退役 Linux 帆布

捆绑的 Linux Canvas 桥及其桌面 Canvas 窗口已被删除。对于 Control UI 中的内联小部件，请使用 [`show_widget`](/tools/show-widget)。单独的 [macOS 小部件面板](/platforms/mac/canvas) 需要连接的 Mac 并且仅进行渲染。这些小部件表面不会恢复以前的 Linux Canvas 桥或其 A2UI 推送命令。

## <a id="install"></a> 安装

- [获取Started](/start/getting-started)
- [安装与更新](/install/updating)
- 可选： [Bun 包工作流](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

## <a id="gateway-service-(systemd)"></a><a id="gateway-service-systemd"></a> 网关服务（systemd）

On Linux没有受支持的服务管理器的主机，请在前台或通过您自己的主管运行网关，例如rc.d. `openclaw gateway status --deep`报告**未检测到支持的服务管理器**并将剩余的服务单元标识为过时的。该记录单元不选择状态检查的配置或端口。更新继续并发出服务警告；更新后重新启动手动启动的网关。上不可用的用户会话总线systemd主机仍然是一个单独的服务访问诊断。

使用以下任一方式安装：

```bash
openclaw onboard --install-daemon
openclaw gateway install
openclaw configure   # select "Gateway service" when prompted
```

修复或迁移现有安装：

```bash
openclaw doctor
```

`openclaw gateway install` 默认会生成一个 systemd **用户**单元。完整的服务指南，包括适用于共享或始终在线主机的 **系统**级单元变体，请参见 [网关运行手册](/gateway#supervision-and-service-lifecycle)。

托管单元自动转义文字路径。在自定义单元中，请勿在 `WorkingDirectory=` 或 `EnvironmentFile=` 路径周围添加 shell 引号，即使它们包含空格也是如此。为每个绝对路径使用单独的 `EnvironmentFile=` 指令； systemd 忽略相对路径。写 `%%` 作为字面百分号。 `EnvironmentFile=` 还接受 glob 模式，因此使用反斜杠转义文字 glob 字符。托管工作目录路径不得以空格或制表符结尾：systemd 255 在启动进程时会丢失尾随空格。 OpenClaw 拒绝这些路径，而不是冒险使用不同的目录；选择没有尾随空格的路径。

仅在自定义设置时才手动编写单元。最小用户单元示例 （`~/.config/systemd/user/openclaw-gateway[-<profile>].service`）：

```ini
[Unit]
Description=OpenClaw Gateway (profile: <profile>)
After=network-online.target
Wants=network-online.target
StartLimitBurst=10
StartLimitIntervalSec=300

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
RestartPreventExitStatus=78
TimeoutStopSec=330
TimeoutStartSec=30
SuccessExitStatus=0 143
OOMPolicy=continue
KillMode=mixed

[Install]
WantedBy=default.target
```

手写单元不会继承 `openclaw gateway install` 为受管网关服务写入的自适应堆大小设置。请优先使用受管安装程序，或者在自定义 supervisor 中在考虑本地内存余量后设置显式堆限制。

`TimeoutStopSec=330`涵盖网关的五分钟合作排水和拆卸储备。要检查当前托管单元主体，请运行`systemctl --user cat openclaw-gateway.service` （or `systemctl --user cat openclaw-gateway-<profile>.service`对于命名配置文件）。

启用它：

```bash
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## <a id="memory-pressure-and-oom-kills"></a> 内存压力和 OOM 杀死

在 Linux 上，当主机、VM 或容器 cgroup 内存不足时，内核会选择 OOM 受害者。网关是一个可怜的受害者，因为它拥有长期会话和通道连接，因此 OpenClaw 会在可能的情况下偏向首先杀死瞬时子进程。

对于符合条件的 Linux 子进程启动，OpenClaw 会将命令包装在一个简短的 `/bin/sh` shim 中，尝试将子进程自身的 `oom_score_adj` 提高到 `1000`，然后 `exec` 真实命令。此操作无需特权：进程始终可以提高自身的 OOM 分数。

小型生成代理和服务子锚避免了这种额外的 shell 执行：它们暂时提高了本地生成的分数，然后恢复它。子级在执行或分叉后代之前继承 `1000`。如果助手无法调整其分数，则会使用垫片。直接启动和 PTY 保持垫片，因此 Gateway 自己的分数永远不需要改变。

覆盖的子进程表面包括：

- Supervisor 管理的命令子进程
- PTY shell 子进程
- MCP stdio 服务器子进程
- 管理本地模型和嵌入服务子代
- OpenClaw-启动了browser/Chrome进程（通过插件SDK进程运行时）

沙箱后端传输保留其准备好的环境并继承 OOM 分数，而不是接收此包装器。工作负载资源策略属于沙箱后端；普通主机命令和 PTY 保留子优先的偏见。

包装器为 Linux-only，当 `/bin/sh` 不可用时，或者当子环境将 `OPENCLAW_CHILD_OOM_SCORE_ADJ` 设置为 `0`、`false`、`no` 或 `off` 时，包装器将被跳过。仅将此选择退出用于受控诊断：它消除了子优先 OOM 保护，并使网关在实际内存压力下更有可能被选为受害者。

当托管本地模型和嵌入服务的有效环境定义了 `SHELLOPTS`、`BASHOPTS`、`BASH_FUNC_*` 密钥或保留的 `OC_INTERNAL_OOM_EXEC_{BASH_ENV,ENV,CDPATH,PS4}` 载体时，托管本地模型和嵌入服务将回退到直接生成。在这些情况下，精确的环境保真度和 shell 启动安全性优先，因此 OpenClaw 不会尝试更改 `oom_score_adj`；使用下面的验证来检查子项的有效值。

验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

写入成功时，受覆盖子进程的预期值为 `1000`。 如果 `/proc` 不可用或不可写入，子进程仍会运行，但不会应用 OOM 偏置。Gateway 进程本身保持其正常分数（通常为 `0`）。

当 OOM 杀手选择瞬态子级时，systemd 单元的 `OOMPolicy=continue` 使网关服务保持活动状态，而不是将整个单元标记为故障并重新启动所有通道；失败的 child/session 报告其自身的错误。

这不能替代正常的内存调优。如果 VPS 或容器反复杀死子进程，请提高内存限制、降低并发，或添加更强的资源控制（systemd `MemoryMax=`、容器内存限制）。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Linux 服务器](/vps)
- [ChromeOS （Crostini）](/platforms/chromeos)
- [覆盆子 Pi](/install/raspberry-pi)
- [Gateway 运行手册](/gateway)
- [网关配置](/gateway/configuration)
