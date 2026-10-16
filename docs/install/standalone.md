---
summary: "使用 Bun 和配套运行时目录构建独立的 OpenClaw 可执行文件"
read_when:
  - "您想要将 OpenClaw 构建或打包为独立的可执行文件"
  - "您需要独立输出或macOS签订合同"
  - "您正在比较 JIT、字节码和实验性 AOT 版本"
title: "独立构建"
---

独立构建器将 OpenClaw 和 Bun 打包到一个可执行文件中，并带有一个用于本机库、插件和其他资源的配套 `runtime/` 目录。这也称为 **fat 二进制** 构建。它无需单独安装 Node 或 Bun 即可运行，但可执行文件及其 sidecar 必须保持在一起。

使用此路径从源签出中准备应用程序或部署工件。对于正常的 CLI 安装，请从 [Install](/install) 开始。

## <a id="build-the-default-jit-executable"></a> 构建默认的JIT可执行文件

使用存储库的固定包管理器和 `scripts/lib/openclaw-bun.json` 中的生产 Bun 引脚。在编译独立可执行文件之前安装依赖项并完成运行时构建：

```bash
pnpm install
pnpm build
scripts/stage-openclaw-bun.sh ./standalone-compiler darwin arm64
./standalone-compiler/bin/bun scripts/build-bun-standalone.mjs ./standalone-jit
./standalone-jit/openclaw --version
./standalone-jit/openclaw --help
```

此示例针对 Apple 硅。该构建器支持macOS和Linux主机；不支持 Windows 独立构建。基于运行结果的平台和架构进行构建；选择匹配的固定 Bun 工件。登台助手验证下载的校验和和 Bun 身份。为每个构建使用新的输出目录，以便较早的运行时快照不会泄漏到结果中。

清单读取 OpenClaw 版本并从 `dist/build-info.json` 提交。源更改后重新运行 `pnpm build`；单独更改签出不会更新现有运行时构建的标识。

在 macOS 上，构建器使用 `scripts/build-mac-sqlite.sh` 和 `scripts/lib/sqlite-macos.json` 中的引脚来包含目标架构的 `runtime/lib/libsqlite3.dylib`。它遵循 `OPENCLAW_MACOS_DEPLOYMENT_TARGET`（默认 `15.0`）。独立构建在主机发现之前更喜欢这个库；显式的 `OPENCLAW_SQLITE_LIBRARY` 仍然是覆盖。运行该工件不需要 Homebrew。请参阅 [SQLite 库选择](/install/bun-compatibility#sqlite-library-selection)。

该构建准确地生成了这些可交付成果：

```text
standalone-jit/
├── openclaw
├── runtime/
└── manifest.json
```

移动或分发完整目录。 `runtime/` 相对于可执行文件进行解析；仅移动 `openclaw` 会留下所需的资源。

## <a id="choose-a-compilation-mode"></a> 选择编译模式

| 模式     | 建造者选项  | 行为                                                                            |
| -------- | --------------- | ----------------------------------------------------------------------------------- |
| JIT      | 无            | 默认。嵌入 JavaScript 并让 Bun 在运行时编译它。                      |
| 字节码 | `--bytecode`    | 嵌入 Bun 字节码以减少启动时的 JavaScript 解析。它仍然使用JIT。 |
| AOT      | `--compile-aot` | **Experimental.** 需要支持 AOT- 的 Bun 构建，并在禁用 JIT 的情况下运行。 |

```bash
./standalone-compiler/bin/bun scripts/build-bun-standalone.mjs ./standalone-bytecode --bytecode
```

生产固定的 Bun 支持 JIT 和字节码。它不提供实验性 AOT 编译器。选择 `--compile-aot` 以及缺乏该功能的 Bun 会停止并进行诊断；它不会默默地回退到 JIT 或字节码。 AOT 工件需要自己的运行时和签名资格。

## <a id="read-the-manifest"></a> 读取清单

`manifest.json` 描述了打包和验证的输出。其版本1合约是：

| 字段           | 内容                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | 清单架构版本，`1`。                                                                                     |
| `mode`          | `jit`, `bytecode`, or `aot`.                                                                                      |
| `target`        | `platform` 和 `arch` 用于编译的可执行文件。                                                                |
| `bun`           | 编译器 `version`、`revision`、`commit` 和 `executableSha256`。                                                 |
| `openclaw`      | OpenClaw `version` 和来源 `commit`。                                                                           |
| `executable`    | 相对 `path`、`sizeBytes` 和 `sha256`。                                                                       |
| `runtime`       | 相对 `path`、`sizeBytes`、`sha256`、`fileCount`、`symlinkCount`、资源 `categories` 和 `sidecarPlugins`。 |
| `embedded`      | 计数 `workers`、`plugins`、`modules` 和 `inlineWorkers`。                                                  |
| `pruning`       | 资源 `policy`、`removedFiles`、`removedBytes` 和 `removedSymlinks`。                                         |
| `macos`         | 仅限 macOS：`hardenedRuntime` 和所选模式的 `entitlements` 地图。                                         |

在签署或打包可执行文件时保留编译器来源。签名改变其字节：签名后刷新`executable.sizeBytes`和`executable.sha256`。如果包装改变了边车，也刷新其记录的库存。

`runtime.categories` 记录每个资源类别的 `{ "files": number, "bytes": number }`。其总数等于 `runtime.fileCount` 和 `runtime.sizeBytes`。 `runtime.sidecarPlugins` 为空，因为捆绑的插件代码嵌入在可执行文件中。作为插件资产的浏览器脚本被计为资源。

`runtime.sqlite` 记录所选的 SQLite 版本、编译选项和扩展加载支持。对于 macOS，它还记录捆绑库的相对 `path`、`sha256`、公共域许可证和固定源存档出处。在构建器验证其版本和所需功能后，Linux 使用 Bun 的内置 SQLite。

sidecar 摘要涵盖常规文件和符号链接，按其相对关系排序POSIX路径在UTF-16词汇顺序。每个文件都有贡献`path\0file\0content-sha256\n`；每个链接都有贡献`path\0symlink\0link-target\n`。散列这些UTF-8记录与SHA-256。目录条目和符号链接目标不再计入`runtime.sizeBytes`。清单生成拒绝绝对符号链接、悬空符号链接以及解析目标位于外部的链接`runtime/`，因此当工件移动时链接仍然有效。

### <a id="macos-signing"></a> macOS 签约

使用强化的运行时和 `macos.entitlements` 中声明的确切权利对可执行文件进行签名。从此映射派生权利 plist，而不是复制单独的 `runtime/bin/bun` 可执行文件的权利。该集合是特定于模式的；字节码不是禁用 JIT 权限的理由。

根据包的所有权和签名政策对本机 sidecar 库和插件进行签名。使用应用程序的签名身份对 `runtime/lib/libsqlite3.dylib` 进行签名，并在签名后更新其 `runtime.sqlite.sha256` 和 sidecar 库存。运行时可以从已安装的插件加载本机代码，包括具有不同签名标识的插件。通过下面的功能活动验证签名的输出；成功的 `--version` 探针不会执行本机插件加载。请参阅 [macOS 签名](/platforms/mac/signing)。

## <a id="update-the-complete-artifact"></a> 更新完整神器

独立可执行文件不是包管理器或 git 安装。 `openclaw update` 拒绝修改它并显示下一步：更新所属桌面应用程序，或重建并替换独立输出。生成的 `runtime/openclaw-install-owner.json` 标记使用现有的安装所有者合同。 Gateway/UI 更新请求遵循相同的边界，自动软件包更新被禁用，并且 `openclaw update status` 仍然可以报告主机管理的安装。

桌面打包负责播种工件、对其进行签名以及将可执行文件和 sidecar 一起替换。对于手动管理的部署，构建并验证新的输出目录，通过当前的主管停止网关，替换完整的工件，然后重新启动并验证准备情况。切勿将新的可执行文件复制到旧的 sidecar 上，或使用 npm、pnpm 或 git 就地更新 sidecar。将用户配置和状态保留在构建输出之外。备份升级前的状态；请参阅 [Updating](/install/updating)。

## <a id="runtime-contents-and-limits"></a> 运行时内容和限制

构建器嵌入应用程序模块、捆绑的插件入口点、工作程序以及运行时所需的生成元数据。它保留了惰性模块边界。 sidecar 包含从磁盘读取的资源：

- 公共文档 Markdown/MDX 及其导航元数据，以及工作区模板，包括 JSON 团队预设和工作区说明。
- 捆绑和托管技能，包括其支持文件。
- Plugin 清单、包元数据和资产，例如浏览器脚本、样式、WebAssembly、SQL 模板、浏览器扩展和插件声明的静态文件。
- Control UI 静态文件。
- Canvas A2UI 捆绑包、会话卡字体、HTML 导出模板和捆绑的挂钩元数据。
- Native 插件、共享库、依赖资源及其包和许可证元数据。
- 运行时身份和启动元数据、安装所有者元数据和许可证通知。

该构建器删除了嵌入式应用程序和捆绑插件 JavaScript、源映射、声明、开发工具和包管理器链接。需要磁盘资源的依赖项使用版本化的 `runtime/native/` 目录中的常规文件；打包的 sidecar 没有符号链接或 pnpm 存储。不可变的可执行元数据提供捆绑的插件源代码检查和 Doctor 合约哈希。安装的插件保留其正常的文件系统准入和加载规则，并存在于配置的状态目录中。

安装的 TypeScript 插件使用嵌入式 Jiti 加载器和 Babel 变压器。构建器在编译之前捕获恒定的条件导出分辨率；这些模块仍然是惰性的，并且不需要在 sidecar 中使用 JavaScript。

私有 `docs/internal/` 内容和根文档创作说明（`docs/AGENTS.md` 和 `docs/CLAUDE.md`）不包括在快照和 sidecar 中。

捆绑的钩子处理程序和插件帮助程序使用可执行文件的嵌入式子入口点。浏览器脚本和 HTML 导出脚本仍然是物理资产，因为它们在浏览器中运行，而不是在 OpenClaw 进程中运行。

资源策略是声明性的，源自编译的依赖关系图。运行时跟踪验证所执行的路径；它们不是要发送的冻结文件列表。即使应用程序 JavaScript 从映像执行，浏览器 JavaScript 和技能脚本仍保留磁盘资源。

构建器在编译可执行文件之前验证资源计划。当内容哈希匹配时，针对同一资源路径的提升副本共享一个文件；冲突的副本会停止构建并识别两个源路径。

本机依赖项必须与目标平台和体系结构相匹配。独立构建不会使任意插件可移植、提供签名身份、安装服务或在编译期间迁移用户状态。

可执行文件是 OpenClaw 启动程序，而不是通用 Bun CLI。构建器嵌入了已知的工人和儿童程序。使用 `process.execPath` 运行任意脚本或 Bun 标志的插件需要单独的运行时或其自己的独立集成和资格。

共享 `cli-invocation.mjs` 模块拥有用于启动重生、更新帮助程序和服务启动程序的 OpenClaw CLI 启动参数。独立调用将 CLI 参数直接传递给可执行文件，包括根选项，例如 `--profile`；它不会在前面添加脚本路径或解释器标志。松散的 Node 或 Bun 调用保留其运行时标志和入口脚本。独立标识来自嵌入式运行时位置或相邻清单，而不是可执行文件的文件名。

## <a id="qualify-an-artifact-before-packaging"></a> 打包前对工件进行鉴定

CI 涵盖了构建者廉价的纯合约：工人发现、清单形状和代码生成。完全独立的编译和运行时活动是手动的，因为它们的资源成本对于例行 PR 检查来说太高了。

对于每个生产固定的 JIT 和字节码工件：

1. 记录编译器修订版和校验和、OpenClaw 提交、输出大小和哈希值以及特定于模式的签名权利。
2. 使用隔离的HOME、配置、状态、工作区和临时目录。在每次 CLI 启动时传递相同的显式 `--profile <isolated-name>`，包括 version/help、Doctor、网关命令和代理轮次。保持正常启动重生并启用编译缓存行为。预留端口`19995`和`19996`；如果另一个进程拥有它们，则拒绝运行。沙盒医生，因此它无法检查或改变运营商的实时状态或服务。
3. 每种模式运行一项严格的跟踪活动和至少四项功能活动。练习 version/help、配置 set/get/validate、医生、网关准备情况、代理轮次和网关 stop/restart. 通过其当前主管执行正在运行的网关的重新启动请求，并验证替换的运行状况和另一个代理轮次。对于外部监控器，请在开始更换之前使用精确的 PID 重新启动切换。跟踪必须观察每个 JavaScript VM 和工作线程，协调工作线程创建收据，并在所执行的路径上发现没有磁盘 JavaScript 读取、解析或缓存条目。
4. 仅使用声明的权利运行已签名的功能活动。在单独的阴性对照中删除每项声明的权利，并记录使其必要的具体失败。放弃没有明确要求的权利。 PID、启动窗口、可执行路径和 Mach-O UUID 的审核崩溃，包括活动后的延迟审核。
5. 报告经过秒数、退役指令的三轮运行中位数，以及 CLI 操作、网关准备情况和代理轮次的 RSS。将峰值 CLI RSS 与固定网关 RSS 分开，并确定每个计数器覆盖哪些进程。用`cp -X`单独测量新鲜副本首次启动；从性能中值中排除跟踪运行。

将命令、跟踪、清单、签名工件身份、阴性对照和结果与鉴定报告一起保存。不同的编译器、目标、编译模式或本机依赖项集需要新的证据。

### <a id="sandboxed-doctor-on-macos"></a> macOS 上的沙盒医生

SQLite 快照工作线程在 `<TMPDIR>/oc-br-*/resource.sock` 使用经过身份验证的本地代理。共享快照所有者使用此代理来独立于暂存工作线程保留本机清理保管权。松散和独立运行时采用相同的路径；嵌入式工作线程替换不会引入此套接字。沙箱的 `(deny network*)` 也会拒绝 Unix 域 IPC，即使允许在套接字路径上进行文件写入也是如此。

网络拒绝后，仅允许在隔离根内绑定和连接：

```scheme
(allow network-bind
  (local unix-socket (subpath (param "ISOLATED_ROOT"))))
(allow network-outbound
  (remote unix-socket (subpath (param "ISOLATED_ROOT"))))
```

保持 IP 网络、运营商的 home、Keychain、launchctl 和主机 SQLite 库被拒绝。这两个操作都不会联系 IP 网络服务。

使用短的、规范的临时根：Darwin 将 Unix 套接字路径限制为 103 字节。代理对较长路径的回退位于隔离根之外，并且应继续被验证者拒绝。

手动证明脚本将完整的工件克隆到新的根中，并运行版本、网关帮助和具有 `--profile standalone-verify` 的 Doctor 和 60 秒的截止日期。它使启动重生保持启用状态，因此检查还涵盖跨编译的 CLI 重新启动的配置文件参数：

```bash
node scripts/verify-standalone-doctor.mjs ./standalone-jit
node scripts/verify-standalone-doctor.mjs ./standalone-jit --deny-local-ipc
```

第二个命令故意拒绝代理套接字，并要求 Doctor 因错误退出，而不报告完成或挂起。为签名的 JIT 和字节码工件运行这两个命令。
