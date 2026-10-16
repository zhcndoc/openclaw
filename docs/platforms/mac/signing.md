---
summary: "打包脚本生成的 macOS 调试构建签名步骤"
read_when:
  - "构建或签署 mac 调试构建"
title: "macOS 签名"
---

# <a id="mac-signing-(debug-builds)"></a><a id="mac-signing-debug-builds"></a> mac 签名（调试构建）

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建一个分阶段应用程序，调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh)，并在替换 `dist/OpenClaw.app` 之前验证签名的运行时。 macOS 将 TCC 权限与捆绑包 ID 和代码签名联系起来。在重建过程中保持稳定，并使应用程序保持在固定的路径上。然后，macOS 保留其 TCC 授权（通知、可访问性、屏幕录制、麦克风、语音）。

- 调试 bundle identifier 默认值为 `ai.openclaw.mac.debug`（可通过 `BUNDLE_ID=...` 覆盖）。
- 构建时 Node：`>=24.16.0 <25` 或 `>=26.1.0`（存储库 `package.json` `engines`）。该应用程序捆绑了固定的 OpenClaw Bun 叉（而不是 Node），以及 OpenClaw 包和 Control UI （`pnpm ui:build`）。
- 默认需要真实签名身份。如果 codesign 脚本找不到标识并且未设置 `ALLOW_ADHOC_SIGNING`，则它会退出并显示错误。临时签名 （`SIGN_IDENTITY="-"`） 是显式选择加入，并且不会在重建过程中保留 TCC 权限。请参阅 [macOS 权限](/platforms/mac/permissions)。
- 从环境中读取 `SIGN_IDENTITY`（e.g. `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"` 或开发人员 ID 应用程序证书）。如果没有它，`codesign-mac-app.sh` 会自动选择身份。顺序是开发者 ID 应用程序、Apple 分发、Apple 开发，然后找到第一个有效的代码签名身份。
- `SIGN_IDENTITY` 还接受证书 SHA-1 哈希来区分具有相同公用名称的证书。
- `CODESIGN_TIMESTAMP=auto`（默认）为开发人员 ID 按名称或证书哈希选择的应用程序签名启用可信时间戳。设置 `on`/`off` 以强制任一方式。
- 印记 Info.plist 与 `OpenClawBuildTimestamp` （ISO8601 UTC）、`OpenClawGitCommit` 和 `OpenClawRuntimeBuildID`。提交值是完整的 40 个字符的十六进制提交，或者在本地构建不可用时为 `unknown`。本机 **About** 选项卡显示构建时间戳和 git 提交。启动前，私有运行时的包元数据必须与应用程序的版本、提交、时间戳和运行时构建 ID 匹配。
- 签名后审核本机签名格式和团队 ID。默认情况下，元数据失败、非本机签名、团队 ID 丢失和团队 ID 不匹配都会失败。 `SKIP_TEAM_ID_CHECK=1` 仅跳过 Team ID 比较。本机签名格式检查仍在运行。
- 在密封应用程序之前对私有运行时的本机代码进行签名。当捆绑插件包含 JIT 内存权利（`com.apple.security.cs.allow-jit` 和 `com.apple.security.cs.allow-unsigned-executable-memory`）时，仅适用于 `runtime/bin/bun` 和 Claude 代理 SDK `claude` 可执行文件。仅 `runtime/bin/bun` 额外收到 `com.apple.security.cs.disable-library-validation`。签名者对其他本机助手、`.node` 模块和库（包括 `runtime/lib/libsqlite3.dylib`）进行明文签名。所有捆绑的本机代码都使用应用程序的签名身份。捆绑的 Anthropic 插件使用单独安装的 Claude Code 可执行文件。打包在为其可以执行的每个架构签名之前和之后验证临时状态下的本机功能和工作人员准备情况；当 Rosetta 不可用时，它会报告 x86_64 验证跳过。

私人的Bun运行时可以加载本机插件npm在运行时安装的插件，其二进制文件未经应用程序团队签名ID。对此可执行文件禁用库验证与官方一致Node和Bun macOS二进制文件和外部网关的先前Node运行时。运行时已经执行任意插件JavaScript并产生进程，因此对其进行库验证并不是一个有意义的安全边界。捆绑的本机仍由团队签名，并且应用程序的可执行文件，Claude SDK CLI，和其他帮助程序保留库验证。此异常不会更改应用程序的开发覆盖或云工作人员对该覆盖的拒绝。

签名使用`/usr/bin/python3`扫描文件头并通过`/usr/bin/file`批量候选。然后，Apple 的 `/usr/bin/otool` 检查每个架构的本机标头，包括 `file` 报告为数据的 fat64 容器。混合签名类别和格式错误的本机标头将停止签名。 Java 类、静态档案和 Mach-O 链接器、调试和核心工件是资源密封的，而不是直接签名的。 Discovery 打开目录而不遵循符号链接，并对打开的文件描述符而不是可重定向路径进行分类。它不会运行捆绑的 Bun 来对自身进行签名。在发布之前，扫描会检查每个观察到的输入，包括目录命名空间和本机列表中省略的资源。它拒绝不完整的遍历和观察到的变化。这不是原子文件系统快照。

签名审核还需要本机 Mach-O 签名。某些 Apple 工具链在将原始 fat64 签名为通用数据时返回成功，没有本机权利。审计拒绝了这一结果。签名者不会精简或转换输入容器。在打包之前将不受支持的本机有效负载重建为协同设计兼容的代码，而不是依赖通用签名验证。

签名者在嵌套代码之后对 App 和 Sparkle 捆绑包所有者进行一次密封。捆绑包的主要可执行文件上的单独签名也会重新封装该捆绑包的资源。签名者密封应用程序后，新的库存将提供给团队 ID 和提升审核。扫描仪或分类器故障停止签名。运行时可移植性检查检查每个本机体系结构并拒绝不可移植的依赖项以及损坏或转义的符号链接。

签署没有其他进程修改的私有暂存副本。签名者在属性清理之前拒绝硬链接文件和特殊文件（例如 FIFO）。如果此检查失败，请复制或重建捆绑包。属性清理和签名使用 macOS `/usr/bin/sandbox-exec`。它限制文件系统写入固定应用程序和临时签名目录。额外继承的文件描述符被关闭。如果此突变边界无法启动，签名就会失败。没有无限制的后备。

在签名之前，发布和开发版本通过 `scripts/lib/desktop-runtime-prune.mjs` 删除 TypeScript 声明、声明映射和审核的依赖项 source/test/example 文件。所有 Markdown 文档、许可证、包清单、可执行源映射、本机插件和插件拥有的树仍然可用。依赖源修剪是特定于版本的；新版本保留其来源直至经过审核。 Tauri 在对资源进行哈希和编码之前，在暂存其捆绑的 OpenClaw 包时使用相同的修剪所有者。

对于 [ 独立可执行文件 ](/install/standalone#macos-signing)，请在其 `manifest.json` 中使用特定于模式的 `macos.entitlements` 映射，而不是应用单独的 Bun 运行时的权利列表。签名并验证完整的可执行文件加 sidecar 输出，然后刷新清单中的可执行文件哈希。

## <a id="permission-evidence"></a> 许可证据

平台声明需要真实设备证据。 macOS 权限证明需要稳定的签名应用程序：在重建过程中保持捆绑包 ID、签名身份和应用程序路径稳定。临时签名或更改签名不符合 TCC 权限持久性证明。

## <a id="usage"></a> 用法

```bash
# from repo root
scripts/package-mac-app.sh                                                      # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh                                 # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh                                     # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh                          # dev-only Sparkle Team ID mismatch workaround
```

运行时打包遵循现有的 `OPENCLAW_DOCKER_PACKAGE_INVENTORY_TIMEOUT_MS`、`OPENCLAW_DOCKER_PACKAGE_PACK_TIMEOUT_MS` 和 `OPENCLAW_DOCKER_PACKAGE_TARBALL_CHECK_TIMEOUT_MS` 预算。库存和 tarball 检查默认为五分钟；包创建默认为十五分钟。当打包需要更多时间时，设置一个以毫秒为单位的正整数。这些预算通过运行时的隔离环境，而不会暴露操作员凭据或状态。 tarball 检查预算涵盖整个检查，包括提取和验证。

`DISABLE_LIBRARY_VALIDATION=1` 开发覆盖适用于应用程序的 Sparkle 解决方法，而不是其私有运行时。 `OpenClawCloudWorker.app` 完全拒绝该覆盖；其海拔主机应用程序可执行文件始终保留库验证。私有 Bun 运行时的插件加载异常独立于该开发标志而应用。

### <a id="ad-hoc-signing-note"></a> 临时签名说明

`SIGN_IDENTITY="-"` 禁用强化运行时 （`--options runtime`）。当应用程序加载不共享同一团队 ID 的嵌入式框架（如 Sparkle）时，这可以防止崩溃。临时签名也会破坏 TCC 权限持久性。有关恢复步骤，请参阅 [macOS 权限](/platforms/mac/permissions)。

## <a id="build-metadata-for-about"></a> 关于的构建元数据

选择 **About OpenClaw** 以在本机连接窗口中选择 **About**。即使没有网关连接，它也会显示应用程序版本和构建号、构建日期以及来自 Info.plist 的缩短的 git 提交。将鼠标悬停在提交或日期上以获取完整值，或选择 **Copy Build Info** 以复制所有构建元数据。缺少或无效的时间戳和提交值显示为不可用。代码更改后重新运行打包程序以刷新这些值。应用程序更新控制位于 **Dashboard → 设置 → 更新 → 此 Mac** 下。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
