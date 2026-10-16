---
summary: "为正在开发 OpenClaw macOS 应用的开发者提供的设置指南"
read_when:
  - "配置 macOS 开发环境时"
title: "macOS 开发设置"
---

# <a id="macos-developer-setup"></a> macOS 开发者设置

从源代码构建并运行 OpenClaw macOS 应用。

The packaged app requires macOS 26.2 or later.构建主机还必须满足以下 Xcode 要求。

## <a id="prerequisites"></a> 先决条件

- **Xcode 26.4+**（Swift 6.3 工具链），位于软件更新中提供的最新 macOS 上。
- **Node.js 24.16+ or 26.1+ & pnpm**对于网关，CLI，以及打包脚本。SwiftPM和 Xcode 生成具有第一个支持的网关协议模型Node on `PATH`， 然后`/opt/homebrew/bin/node` or `/usr/local/bin/node`。版本管理器垫片（例如 mise、asdf 或 Volta）解析为Node他们启动的二进制文件。

macOSshell工具使用系统`/bin/bash` （3.2）； Homebrew不需要 Bash。直接运行脚本或使用`/bin/bash`。重击5.3+ 可以在阅读器开始之前停止定界文档，从而在管道缓冲区压力下使打包或签名日志为空。可移植脚本入口点切换到`/bin/bash` on macOS，以及流式安装程序（`curl ... | bash`）通过在重新执行之前将其余输入捕获到私有临时文件中来执行相同的操作，因此记录的安装命令不需要更改。

## <a id="1.-install-dependencies"></a><a id="1-install-dependencies"></a> 1. 安装依赖

```bash
pnpm install
```

## <a id="2.-build-and-package-the-app"></a><a id="2-build-and-package-the-app"></a> 2. 构建并打包应用

```bash
./scripts/package-mac-app.sh
```

输出`dist/OpenClaw.app`。默认情况下，这是带有开发包标识符的调试配置构建`ai.openclaw.mac.debug`，意味着在已安装的版本旁边运行。要替换发行版安装，请参阅[替换已安装的发布应用程序](#replace-an-installed-release-app)。默认情况下，打包需要真实的签名身份，如果没有可用的签名身份，则会失败。临时签名是一种明确的选择加入；它不保留TCC权限。看[macOS 签名](/platforms/mac/signing)。

包装构建了JavaScript运行时和Control UI，然后将具有生产依赖项的完整标准包暂存在`Contents/Resources/runtime/lib/node_modules/openclaw`。它保留已发布的包的`files`过滤器，包括其CLI， 网关，Control UI， npm，以及可选的`sqlite-vec`。在确切的发布标签上构建保留已发布的插件布局。其他提交还暂存使用该提交构建的官方外部插件，包括它们的目标架构依赖项。如果他们的估计额外大小超过300 MiB， 仅包装阶段Codex用于自动设置。安装程序更喜欢这些分阶段副本并记录它们的捆绑路径，因此开发版本不会混合较新的版本SDK使用旧的注册表插件。插件更新和 Doctor 保留相同版本的副本，直到应用程序本身更新。发布自动化通行证`RELEASE_TAG`及其经过验证的`RELEASE_SHA`如此浅层、无标签的结帐保留了发布布局。分期拒绝tag/version/commit不匹配。仅与`RELEASE_TAG`，它在需要时获取该标签；如果没有明确的发布标识，本地构建将使用指向当前提交的标签。根 tarball 使用存储库固定的pnpm包装工；支持仅 Corepack 设置。`scripts/stage-mac-runtime.sh`使用构建时安装软件包Node和npm，然后阶段Bun和SQLite. No Node可执行文件或npm/corepack/npx垫片在应用程序中发货。

对于可执行文件加 sidecar 打包输入，单独的 [ 独立构建器 ](/install/standalone) 会发出 `openclaw`、`runtime/` 以及具有编译器出处和特定于模式的签名权利的清单。桌面包装拥有完整工件的播种和替换。

这OpenClaw Bun叉子有一个共享销钉`scripts/lib/openclaw-bun.json`，消耗于macOS包装、Tauri 应用程序以及CI's `setup-test-bun`行动。`scripts/stage-openclaw-bun.sh <runtime> <darwin|linux> <arm64|x64> [...]`下载它；达尔文接受通用二进制的两种架构。档案缓存在`.cache/openclaw-bun/<tag>/`。登台验证发布清单`SHA256SUMS`，它的身份和工件字段针对 pin，每个存档针对两个源，然后是可执行校验和，本机架构和可运行的分支修订版。 fork 的软件包自动安装默认保持关闭状态；OpenClaw运行时准入在启动时仍然适用。`scripts/build-mac-sqlite.sh`构建固定合并`scripts/lib/sqlite-macos.json`，缓存在`apps/macos/.build/sqlite/<version>/`。生成的签名库支持SQLite扩展而不依赖Apple的系统SQLite or Homebrew。

包装验证Bun修订，CLI版本、网关帮助、SQLite和`sqlite-vec`签名前后的加载、本机功能和工作人员准备情况处于临时状态，然后替换以前的应用程序。它还拒绝任何Node在应用程序中可执行。`scripts/restart-mac.sh`使用相同的路径；`SKIP_TSC=1`不会绕过运行时构建。现有的内容检查构建缓存仍然可以避免不必要的声明工作。

私人工作人员保留应用程序保存的桌面共享首选项和配置文件选择。打包检查启用、禁用和未指定共享的启动情况，包括签名之前和之后的命名配置文件启动。

放`OPENCLAW_NODE_VERSION=<version>`封装时选择支持的Node临时包安装的版本。如果未设置或为空，则CLI应用安装程序的默认值。此构建时覆盖不会更改捆绑的Bun别针。

运行时在请求的 `BUILD_ARCHS` 架构之间共享一个 JavaScript 包。通用构建将 Bun 和 SQLite 组合成通用二进制文件，并保留单独的 arm64 和 x64 Darwin 本机包。分段安装每个 CPU 的可选依赖项，合并匹配的共享文件，并在共享路径处组合不同的 Mach-O 切片。其他共享文件冲突导致打包失败。单一架构构建仅保留其兼容的本机有效负载。 Linux 和 Windows 预构建已删除；兼容JavaScript、WASM等资源保持原样。 Apple 芯片上的通用暂存需要 Rosetta 进行 x64 依赖项安装挂钩，该挂钩使用临时 x64 Node 驱动程序执行本机代码。

打包对每个可运行架构执行验证。在 Apple 芯片上验证 x86_64 需要 Rosetta；如果没有它，打包报告架构的执行检查被跳过。缺少二进制架构或不可移植的本机依赖项会导致打包失败。下载和包安装需要构建主机上的网络访问权限。打包的应用程序在载入过程中不需要运行时下载：它将有效负载播种到配置文件的状态目录中，并使用 Bun 托管网关。阶段脚本写入包的 `openclaw-install-owner.json` 标记，以便网关更新仍归应用程序所有。

打包使用 Swift Build （`--build-system swiftbuild`） 构建 MLX 语音助手，并将其 SwiftPM 资源包复制到 `Contents/Resources` 中。本机 SwiftPM 后端不编译 MLX 的 Metal 着色器。如果助手的 `mlx-swift_Cmlx.bundle/Contents/Resources/default.metallib` 丢失，则打包失败，而不是运送在第一次语音请求时失败的助手。

私人工作人员使用只读核心配置引导程序而不是网关范围的医生预检。 Node 插件验证、MCP 生命周期以及节点拥有的身份和执行批准启动迁移保持启用状态。请参阅 [ 网关所有权 ](/platforms/mac/bundled-gateway) 了解边界。

设置 `OPENCLAW_SKIP_MLX_TTS=1` 以打包 dev/proof 版本，而无需本地 MLX 语音助手。这会跳过 `openclaw-mlx-tts` 二进制文件及其大型 mlx-swift Metal 着色器堆栈，某些 beta Xcode 工具链无法编译这些堆栈。生成的应用程序没有设备上的 MLX 语音；它被 `release` 构建拒绝，该构建必须运送帮助程序。

有关开发运行模式、签名标志和团队 ID 故障排除，请参阅 [apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md). 来自存储库根的快速开发循环：`scripts/restart-mac.sh`（添加 `--no-sign` 用于临时签名；TCC 权限不与 `--no-sign` 保持一致）。

<Note>
临时签名的应用可能会触发安全提示。如果应用立即崩溃并显示“Abort trap 6”，请参见[故障排查](#troubleshooting)。
</Note>

### <a id="replace-an-installed-release-app"></a> 替换已安装的发布应用程序

`scripts/package-mac-app.sh`默认为`BUILD_CONFIG=debug`和`BUNDLE_ID=ai.openclaw.mac.debug`。复制过来`/Applications/OpenClaw.app`，该构建仍然是一个不同的应用程序macOS并到OpenClaw：

- 调试包 ID 有自己的 TCC 授权，对于默认配置文件，它有自己的 `ai.openclaw.mac.debug` 默认域。 Packaging 会清除其 Sparkle feed，因此它永远不会更新。
- 发布应用创建的Keychain项，例如`ai.openclaw.tls-pinning`，仅信任发布应用的代码签名。读取它们会引发登录钥匙串密码提示。
- 调试 Swift 配置从单独的 `ai.openclaw.gateway-profiles.debug` 钥匙串服务读取保存的网关配置文件，因此发布应用程序保存的网关丢失。

要替换发行版安装，请从干净的签出中打包发行版标识：

```bash
BUILD_CONFIG=release BUNDLE_ID=ai.openclaw.mac ./scripts/package-mac-app.sh
```

发布配置运行 `scripts/apple-release-source-check.sh`，除非在正在构建的提交时签出是干净的，否则它将失败，并且它需要 MLX 语音助手。除非您设置 `BUILD_ARCHS`（例如 `BUILD_ARCHS=arm64`），否则它会构建通用应用程序。安装前请检查指定要求：

```bash
codesign -dr - dist/OpenClaw.app
```

输出必须包含 `identifier "ai.openclaw.mac"`。钥匙串和 TCC 访问遵循整个要求，而不仅仅是标识符：使用与安装的应用程序来自同一团队的开发人员 ID 应用程序身份进行签名，或者 macOS 仍将构建视为不同的应用程序。 Sparkle 在此版本中保持启用状态，因此更新的发布版本可以取代它。

保留在已安装版本旁边运行的开发版本的默认调试标识。

### <a id="shared-bun-pin-and-repin-gate"></a> 共享Bun引脚和repin栅极

JSON 架构具有顶级 `tag`、`commit`、`revision` 和 `artifacts`。 `artifacts` 由 `darwin-arm64`、`darwin-x64`、`linux-arm64`、`linux-x64`、`windows-arm64` 和 `windows-x64` 进行加密；每个条目包含 `asset`、`sha256`、`executable` 和 `executableSha256`。 Windows 条目还包含 `authenticodeSigned: true` 和 `testOnly: false`。这些是已发布的分叉版本 `manifest.json` 的投影，而不是独立维护的应用程序或 CI 引脚。未签名的 Windows 试运行工件不可发货。

每个 repin 都需要同一已发布标签上的两个门：CI 的配对 Bun-lane 重播和 Bun-only 烟雾，加上 macOS 运行时检查和双二进制测试集。当任一门失败时，应用程序和 CI 都不会前进。 Linux-only 回归也会停止共享 repin。调查时保留两个大门允许的最后一个标签；单独发布的预发行并不构成入场许可。在 PR 中记录准确的标签和门证据。请参见 [CI 运行时选择](/ci/pipeline#test-runtime-selection)。

通过之后，从该确切版本下载 `manifest.json` 和 `SHA256SUMS` 并验证清单和资产校验和。一起重新生成所有六个条目：

```sh
jq '{tag, commit: .bun.commit, revision: .bun.revision,
  artifacts: (.assets | map(
    select(.target | IN("darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "windows-arm64", "windows-x64")) |
    {key: .target, value: ({asset: .name, sha256,
      executable: .executable.path, executableSha256: .executable.sha256} +
      (if .os == "windows" then {authenticodeSigned: .executable.authenticodeSigned,
        testOnly: .executable.testOnly} else {} end))}
  ) | from_entries)}' manifest.json > scripts/lib/openclaw-bun.json
```

在一个 PR 中重新固定一个共享所有者，并为所有四个 Darwin/Linux 目标运行共享 stager；在匹配的主机上执行本机证明（Rosetta 可以验证 Darwin x64）。已签名的 Windows 条目可用于 Windows 封装集成。请勿推进单个工件或将 pin 复制到应用程序或工作流程中。

## <a id="3.-install-the-cli-and-gateway"></a><a id="3-install-the-cli-and-gateway"></a> 3. 安装 CLI 和 Gateway

在打包应用程序的新配置文件中，在入门引导期间选择 **This Mac**。该应用程序准备其捆绑的 Bun 运行时，将网关作为其子项启动，并创建配置文件的终端 CLI 填充程序。它不会调用 `scripts/install-cli.sh`、安装 Node 或请求安装通道。未捆绑的 DEBUG 版本保留安装程序和频道选择器。

运行时副本位于 `<state>/runtime/<runtimeBuildId>/`。应用程序托管的子项和应用程序管理的 Bun LaunchAgents 使用具体构建路径；仅终端垫片使用 `runtime/current`。更新后设置会在验证运行状况和收集旧版本之前重新播种有效负载并刷新应用程序拥有的 Bun 服务引脚。请参阅 macOS](/platforms/mac/bundled-gateway) 上的 [Gateway。

如需手动开发恢复，请自行安装配套的CLI。从应用程序中读取版本：在菜单栏中选择 **About OpenClaw**，或运行 `openclaw-mac status --json`，它会报告应用程序版本和构建。

下面的 npm 命令适用于 npm 12 或 npm 11.16+。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
npm install -g openclaw@<version> --allow-scripts=openclaw
```

`pnpm add -g --allow-build=openclaw openclaw@<version>` 和 `bun add -g --trust openclaw@<version>` 也可以工作。 Bun 的 `--trust` 允许用于该安装的 OpenClaw 生命周期脚本。 Node 仍然是网关本身的推荐运行时。

## <a id="run-native-tests-safely"></a> 安全运行本机测试

在一次性 macOS VM 或 CI 工作线程中运行完整的 macOS 应用程序测试套件，无需操作员凭据、配置或运行网关。 AppKit 测试可以显示窗口，WebKit 启动帮助程序进程。临时 `HOME`、`TMPDIR` 或命名应用程序配置文件本身并不是沙箱：固定首选项域和钥匙串访问仍然可以访问这些目录之外的 macOS 服务。

本机测试包链接 `OpenClawWebKitTestSupport`，这会抑制测试过程中每个 `WKWebView` 的 WebKit 屏幕时间观察。 WebKit 在释放期间删除主线程上的 KVO 观察者，而 ScreenTime 在专用队列上传递配置。在第一次提交后立即拆除窗口化的 HTTP（S） Web 视图可能会引发这场竞争，并使用 `NSInternalInconsistencyException` 中止该进程。产品版本保留屏幕时间。

`macos-swift` GitHub CI 作业使用运行程序的正常 SwiftPM 缓存构建测试，然后通过 `scripts/test-macos-native.mts` 运行构建的套件。每次调用在加载任何测试包之前都会选择私有 `HOME` 和 `CFFIXED_USER_HOME`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR` 以及短 `TMPDIR`。尊重 `TMPDIR` 的工具使用该启动器拥有的目录；基金会使用 Darwin 的每用户临时目录，该目录由一次性 OS 工作人员拥有和丢弃。完整套件显式选择默认配置文件，保留其本地网关生命周期合同。 AppState 生命周期测试和交互式聊天装置使用唯一的命名配置文件单独运行；没有测试会运行两次。子环境排除继承的应用程序设置和凭据，同时保留工具链和运行时加载程序路径。在 Swift 启动之前，启动器会在其私有 `HOME/Library/Keychains` 下创建一个空密码测试钥匙串，将其解锁，禁用该资源的自动锁定，并将用户域默认值和搜索列表设置为该文件。这使得真正的目录迁移无需交互式登录-钥匙串创建提示即可保存。其安全偏好设置位于私有 `HOME/Library/Preferences` 中；公共和动态钥匙串域保持不变。进程生命周期单例和保留窗口的资源仍然可用；托管进程组和输出管道关闭后，启动器将删除其钥匙串和文件。一次性运行者拥有默认首选项和系统服务状态；命名配置文件首选项使用新的域，并且也会与运行程序一起丢弃。如果无法验证进程清理或钥匙串删除失败，则启动程序将失败并保留其文件以供检查。仅发布的捆绑恢复应用程序主机通道保留一次性帐户的规范主页，以便真正的 CLI 可以管理其独特的命名配置文件服务。它的状态和偏好使用该配置文件。应用程序主机和安全命令共享帐户的用户Keychain域，选择启动器拥有的空密码Keychain文件；临时文件也仍然属于启动器所有。仅在服务及其观察到的进程组退出后，清理才会删除配置文件状态。未经验证的停用会保留配置文件状态和临时资源。

CI 环境标记仅捕获意外调用；它们不会强制隔离或确保操作员桌面安全。

对于在一次性 macOS CI 运行器 **内集中重新运行**，在正常测试构建之后：

```bash
node scripts/test-macos-native.mts named \
  --package-path apps/macos --build-system native --enable-code-coverage \
  --skip-build --filter "AppStateIsolationTests|ProfileChatPreferencesTests"
```

普通的 CI 调用将 Swift 测试并行性限制为运行程序的逻辑 CPU 计数，上限为 12。它使用覆盖检测按顺序运行三个不相交的分区：默认配置文件套件、在新的默认配置文件进程中呈现的快速聊天以及命名配置文件装置。呈现的分区保留目录、公开和快捷方式顺序，而不共享来自其他测试的进程范围执行器更改。两个交互式装置都使用 Swift 测试，并在执行本机菜单之前启动 AppKit 拥有的运行循环，因此 XCTest 之后不必重新获得其外部等待循环。具有启动器的历史目标保留其原始的默认配置文件分区和命名配置文件分区。本地 `scripts/prepush-ci.sh` 运行 Swift lint/format 检查和发布版本，但不运行本机测试。对于本机更改，它退出非零，并要求获得准确的提交 `macos-swift` CI 结果；本地构建成功并不代表本地测试成功。

在操作员桌面上，仅运行 OS 沙箱内经过审核的子集，该子集会阻止操作员文件、首选项和钥匙串服务、不需要的网络访问以及 desktop/helper 进程。 Swift 测试过滤器本身并不是隔离边界。如果无法建立该边界，请改用一次性 macOS 环境。

测试应该拥有自己的资源：具有清理功能的独特默认套件、非持久性 WebKit 数据存储、临时环回固定端点以及植根于 `FileManager.temporaryDirectory` 的临时文件。 Unix 域套接字装置需要一个简短的测试拥有的路径；过长的路径会失败，而不是默默地在该目录之外写入。协作 `TestIsolation` 帮助程序序列化并恢复参与测试的环境和选定的默认突变。仅配置作用域还拥有一个用于配置 health/audit 写入的临时状态目录，并在异步主体完成（包括错误）时将其删除。调用者仍然拥有他们的配置固定文件，并且必须在离开范围之前加入任何异步工作。这些独特的灯具目录由其所有者清理；剩余的基金会临时文件将与工作人员一起丢弃，而不是与启动器的根一起丢弃。切勿在测试内更改 `OPENCLAW_PROFILE`：`AppProfile` 和 `AppDefaults` 冻结进程的身份。需要另一个单例身份的测试需要一个新的过程。协作助手不会将不相关的测试或进程与主机隔离。

Swift 测试在一个进程中同时运行套件，因此永远不要替换全局执行器（例如 `withMainSerialExecutor` 或 ConcurrencyExtras 中的 `uncheckedUseMainSerialExecutor`）。它的钩子将所有其他套件的全局工作、演员工作和计时器唤醒移动到主线程上；那里的一个非产生循环会导致取消它的超时，并且作业会挂起，直到 CI 取消它。要断言迟到的答复没有改变任何内容，请等待解决该答复的任务，因为提供程序向导和手动键操作会返回它。

测试开始的工作必须以测试结束，因为过程比测试更长久。关闭测试打开的网关通道和连接；否则，他们的看门狗会通过测试的固定装置不断重新连接。当读取被取消时，假传输和套接字必须停止等待，就像生产流传输一样：`AsyncTimeout` 取消并放弃失去竞争的操作而不是加入它，因此忽略取消的假传输会继续轮询剩余的运行。

## <a id="troubleshooting"></a> 故障排查

### <a id="build-fails-while-freezing-peekaboo-sources"></a> Build 在冻结 Peekaboo 源时失败

如果打包在 `Freezing authenticated Peekaboo sources in a read-only snapshot` 处停止，请检查 stderr 上的 `hdiutil` 错误。常规图像创建和附件输出保持安静，但保留了诸如 `hdiutil: attach failed - Permission denied` 之类的故障。快照图像和构建输出保留在结帐中。它们的只读挂载目录使用 macOS 的每用户临时位置 （`getconf DARWIN_USER_TEMP_DIR`），独立于 `TMPDIR`，因此外部签出不需要支持嵌套挂载。如果附件仍然失败，请检查该位置的安装权限。未经验证的清理会保留安装目录并在错误中打印的路径处构建锁定。此步骤在签名之前运行；仍然需要源验证和只读快照。

### <a id="build-fails%3A-toolchain-or-sdk-mismatch"></a><a id="build-fails-toolchain-or-sdk-mismatch"></a> 构建失败：工具链或 SDK 不匹配

macOS 应用程序构建需要最新的 macOS SDK 和 Swift 6.3 工具链 （Xcode 26.4+）。

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，请更新 macOS/Xcode 后重新运行构建。

### <a id="build-fails%3A-mlx-voice-helper-metal-shaders"></a><a id="build-fails-mlx-voice-helper-metal-shaders"></a> Build 失败：MLX 语音助手金属​​着色器

在仅限测试版的 Xcode 工具链上（例如带有 macOS 27 SDK 的 Xcode 27），只有 `openclaw-mlx-tts` 帮助程序可能会失败，而主应用程序构建正常。 mlx-swift Metal 编译意外失败（每次运行不同的 `.metal` 文件，`Could not read serialized diagnostics file`，然后非零 `metal` 退出），因为 beta `metal` 编译器及其单独下载的 Metal 工具链仍然不稳定。这是上游工具链问题，而不是 OpenClaw 问题。

如果您不需要设备上的 MLX 语音，请跳过帮助程序：

```bash
OPENCLAW_SKIP_MLX_TTS=1 ./scripts/package-mac-app.sh
```

否则，安装 Metal Toolchain （`xcodebuild -downloadComponent MetalToolchain`） 并从稳定的 Xcode 版本进行构建。

### <a id="app-crashes-on-permission-grant"></a> 授权后应用崩溃

如果你在尝试允许 **Speech Recognition** 或 **Microphone** 访问时应用崩溃，可能是 TCC 缓存损坏或签名不匹配。

1. 为调试 bundle id 重置 TCC 权限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果失败，请临时更改 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`，以强制 macOS 重新开始。

### <a id="gateway-%22starting...%22-indefinitely"></a><a id="gateway-starting--indefinitely"></a> Gateway 一直显示“Starting...”

检查是否有僵尸进程占用了该端口：

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手动运行占用了端口，请停止它（Ctrl+C），或者最后手段是杀掉上面找到的 PID。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [安装概览](/install)
