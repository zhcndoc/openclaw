---
summary: "Bun 运行时要求、macOS SQLite 选择、限制和发布历史记录"
title: "Bun 兼容性"
read_when:
  - "您想要检查 Bun 运行时支持和限制"
  - "您需要为 macOS 上的 Bun 选择 SQLite 库"
---

Bun是独立的显式选择运行时OpenClaw CLI、网关和受管节点主机安装。Node仍然是他们的主要和推荐的运行时间。当地人macOS应用程序和新的本地 Tauri 安装Linux和Windows使用OpenClaw Bunfork 其应用程序管理的运行时。本参考涵盖Bun要求和兼容性；看[包子](/install/bun)用于独立安装和选择加入步骤，或者[Node.js兼容性](/install/node-compatibility)为了Node要求。

即使 `Module.registerHooks` 可用，插件分辨率仍保留在 Bun 的 native/Jiti 加载程序和 Bun 上的 `Bun.plugin` 上； Node 使用 `Module.registerHooks`。 Windows 路径本身不会强制本机加载：捕获的源使用与其他平台相同的基于功能的选择，并且停用插件生成会删除其本机和 Jiti 缓存记录。本机 SDK 别名从 `require.resolve()` 返回平台本机文件名； Jiti 变换贴图保留其自己的路径拼写。

## <a id="requirements"></a> 要求

OpenClaw 仅支持 **最新稳定版 Bun（当前为 1.4.3）** 和 **固定 OpenClaw Bun 叉**。在 CLI 或网关工作之前，较早的库存版本会被拒绝，即使它们的 SQLite 检查通过。两种受支持的运行时都需要可用的 **`node:sqlite`** API 以及与 Node](/install/node-compatibility#why-the-floors-exist) 相同的 [WAL-safe SQLite 底线。

| 平台 | SQLite 库 Bun 使用                       | 扩展加载              | OpenClaw 的作用                                 |
| -------- | --------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| Linux    | 静态链接SQLite； 3.53.4 在 Bun 1.4.3 | 支持                      | 无需额外的库设置。                |
| macOS    | Apple 系统默认为SQLite                | Apple 的库中不可用 | 选择受支持的库或拒绝；见下文。 |
| Windows  | 与 Linux 相同的静态 SQLite 构建             | 支持                      | 无需额外的库设置。                |

平台默认来自[Bun的SQLite构建策略](https://github.com/oven-sh/bun/blob/bun-v1.4.3/scripts/build/deps/sqlite.ts)； [Bun 1.4.3 版本定义](https://github.com/oven-sh/bun/blob/bun-v1.4.3/src/jsc/bindings/sqlite/sqlite3_local.h) 引脚 SQLite 3.53.4.

## <a id="macos-app-private-runtime"></a> macOS 应用程序私有运行时

桌面应用程序和CI消费单`scripts/lib/openclaw-bun.json`别针。每个 repin 都需要两者CI已配对Bun重播和Bun-只有烟，和当地人macOS应用程序的检查和二元测试集；其中任何一个出现故障都会阻止所有消费者使用 pin。看[共享运行时引脚](/platforms/mac/dev-setup#shared-bun-pin-and-repin-gate)。这LinuxTauri 应用程序在启动和更新时保持现有网关服务不变。切换到当前的捆绑包Bun需要**使用捆绑运行时...**；看[显式运行时选择](/platforms/linux#adopt-the-bundled-runtime). macOSTauri 保持其现有的运行时行为，与本机分离macOS应用程序。Windows当 Tauri 的 pin 包含签名时，它使用相同的共享运行时所有者Windows叉构建。如果没有该条目，本地设置会报告缺少运行时间，并且远程连接仍然可用；未签名的试运行不可发货。

OpenClaw.app 捆绑了一个固定的 [OpenClaw Bun fork](https://github.com/openclaw/bun)、完整匹配的 OpenClaw 包以及一个符合 WAL 安全地板并支持扩展加载的签名 SQLite 库。其私有 `node worker` 和 Chrome-extension 设置在 Bun 可执行文件上运行，其中 `OPENCLAW_SQLITE_LIBRARY` 指向捆绑库。这些帮助程序不需要安装 Node 或 Homebrew SQLite。捆绑的本机库仍由团队签名；只有 Bun 可执行文件禁用库验证来加载运行时安装的插件插件。请参阅 [ 签名权衡 ](/platforms/mac/signing)。

该套件包括 CLI、网关、Control UI、npm 和 `sqlite-vec`。新的本地配置文件使用捆绑的网关。符合条件的应用管理的 Node 服务在相同版本切换到 Bun 之前通过已安装的更新程序迁移，并经过验证的 Node 回滚。独立管理的服务和保存的操作员运行时密码仍归其现有所有者所有。请参阅 macOS 上的 [Gateway](/platforms/mac/bundled-gateway) 和 [macOS 开发人员设置](/platforms/mac/dev-setup)。

<a id="sqlite-library-selection" />

## <a id="sqlite-library-selection-on-macos"></a> SQLite macOS 上的库选择

macOS 上的外部 Bun 安装需要 Homebrew SQLite 或其他支持的库。 macOS 应用程序的私有运行时已包含其自己的库。

```sh
brew install sqlite
```

在打开数据库之前，OpenClaw 按以下顺序选择一个库：

1. 内部提供的显式库路径，否则为`OPENCLAW_SQLITE_LIBRARY`。
2. `$HOMEBREW_PREFIX/opt/sqlite/lib/libsqlite3.dylib`.
3. `/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib`.
4. `/usr/local/opt/sqlite/lib/libsqlite3.dylib`.
5. `/opt/local/lib/libsqlite3.dylib` (MacPorts).

考生在选拔前必须满足 WAL 安全地板并支持延伸负载。内存 KNN 子项使用相同的选定库。

如果自动发现没有找到合格的库，OpenClaw 将拒绝打开数据库，而不是使用 Bun 的运行时库。该库是 Apple 的修补系统 SQLite，它偏离上游 SQLite，其中 OpenClaw 的只读连接依赖于它。在 `-wal` 和 `-shm` 文件存在 （`unable to open database file`） 之前，它无法以只读方式打开 WAL 数据库。在回滚日志模式下，当同一进程中的只读连接持有读锁时，它也无法开始写入事务 （`disk I/O error`）。拒绝列出了任何无法加载的现有候选者：

```text
No supported SQLite library for Bun on macOS (<arch>); unusable: <path> (<reason>). Apple's system SQLite fails OpenClaw's read-only database connections. Install one with brew install sqlite, or set OPENCLAW_SQLITE_LIBRARY to a libsqlite3.dylib built for <arch>.
```

在 Rosetta 下运行的 x64 Bun 无法加载仅限 arm64 的 Homebrew 库。将 `OPENCLAW_SQLITE_LIBRARY` 指向通用或 x86_64 版本，例如从源结账生成的 `scripts/build-mac-sqlite.sh universal <runtime-directory>`。

SQLite 存储工作线程继承主进程选择的库。打开另一个数据库或重新启动存储工作线程会重复使用该选择，而无需重复 Bun 的一次性库初始化。

包更新恢复保留 Bun 准入期间选择的库。在macOS上，复制打印的恢复命令，包括其`OPENCLAW_SQLITE_LIBRARY`前缀；它可以在全新的 shell 中工作，无需服务环境或自定义 `HOMEBREW_PREFIX`。如果恢复不能满足SQLite安全底线，它会在打开日志之前拒绝并命名要恢复的记录库输入。版本 1 恢复日志格式未更改。

在启动 OpenClaw 之前在进程环境中设置 `OPENCLAW_SQLITE_LIBRARY` 以覆盖发现：

```sh
OPENCLAW_SQLITE_LIBRARY=/path/to/libsqlite3.dylib bun openclaw.mjs gateway
```

在 macOS、`openclaw gateway install --runtime bun`、`openclaw node install --runtime bun` 和基于包装器的安装上，`OPENCLAW_SQLITE_LIBRARY` 和 `HOMEBREW_PREFIX` 从安装 shell 保留到托管服务定义中，因此服务选择相同的库。要更改已安装服务的这些值，请从具有所需值的 shell 中使用 `openclaw gateway install --runtime bun --force`（或 `openclaw node install --runtime bun --force` 对于受管节点主机）重新安装；直接重新安装已加载的服务是无操作的。直接 Node-runtime 服务永远不会保留它们。

无效覆盖失败并显示：

```text
Cannot use SQLite library <path>: <reason>. Fix or unset OPENCLAW_SQLITE_LIBRARY; install a supported library with brew install sqlite.
```

Node 和非 macOS Bun 忽略此覆盖，并在网关启动日志中发出警告。选择库后，网关启动会记录 `SQLite: using <path> (<version>, extension loading enabled)`。 `openclaw doctor` 报告医生进程的选择。

守护进程安装、`openclaw gateway start` 修复、`openclaw doctor` 和服务审核通过相同的选择检查候选 Bun 可执行文件，因此它们判断并报告网关实际打开的库，而不是 Bun 的运行时 SQLite。无效覆盖会使这些检查失败并显示上述消息，而不是建议 Bun 升级或将服务切换到 Node。

如果您之前使用了调用 `Database.setCustomSQLite()` 的预加载，请将其删除并将 `OPENCLAW_SQLITE_LIBRARY` 设置为相同的路径。该钩子是一次性的：保持预加载会导致 `SQLite already loaded`，即使两个选择都命名相同的库。 OpenClaw 的覆盖还将路径转发到 KNN 子项。

## <a id="memory-search-without-an-extension-capable-library"></a> 没有可扩展库的内存搜索

当 KNN 子级无法加载扩展时，内存搜索将回退到批量嵌入扫描。它保留了提供者和源过滤器以及批次之间的取消检查，但在大型索引上可能会变慢。参见[内存配置](/reference/memory-config)。

## <a id="browser-subprocesses"></a> 浏览器子进程

浏览器插件使用运行 OpenClaw 的 Bun 可执行文件启动其帮助程序进程，因此浏览器自动化不需要单独安装 Node：

- **Chrome MCP：** [现有会话配置文件](/tools/browser/existing-session)开始打包Chrome DevTools MCP服务器开启Bun为了`--autoConnect`， `browserUrl`， 和`wsEndpoint`附件。操作、快照、屏幕截图、坐标单击、跨站点导航等待以及服务器进程树的清理行为与 onNode。定制`mcpCommand`按配置运行。
- **Chrome 扩展：macOS 和 Linux 上的**、本机消息传递主机及其启动的中继守护程序使用运行 `openclaw browser extension install` 的运行时。

## <a id="bun-only-installs"></a> Bun-仅安装

[Bun 安装程序](/install/bun#bun-only-global-install) 可解析并验证 OpenClaw 版本的叉形引脚，而不需要 Node。 Node 仍然是默认安装程序运行时；显式选择 `--runtime bun`。

受信任的 Bun-only 在 macOS 和 Linux 上进行全局安装，在 Bun 的现有全局 bin 目录 （`bun pm bin -g`） 中安装 `openclaw` shell 启动器。它记录来自 `OPENCLAW_PACKAGE_BUN_LAUNCHER` 的绝对 Bun 可执行文件和已安装的包入口点，因此 `openclaw --version`、`openclaw status --json` 和网关命令无需 Node 即可工作。将该 bin 目录添加到 PATH。 npm 软件包的 Node shebang 和 Node 安装保持不变； Windows Bun 启动器尚不受支持。

将网关服务固定到您的 Bun 可执行文件，以便更新和 Doctor 保留它：

```sh
openclaw gateway install --runtime bun --runtime-path <bun> --force
```

更新、修复和医生维护子项使用正在运行的 Bun 可执行文件。 Bun 包管理器检查并安装使用显式可执行文件：更新其根时验证的服务 Bun，否则当更新程序在 Bun 下运行时使用 `process.execPath`，然后从 PATH 中裸露 `bun` 作为最终后备。即使 PATH 没有 Bun 或包含不同的版本，这也会保留选定的 Bun。

当拥有的托管 Bun 网关提供与 CLI 不同的软件包根目录时，`openclaw update` 将网关安装推进到位，并使调用的 CLI 安装保持不变。更新程序验证该服务的 Bun 1.4.3+ 和 WAL-safe `node:sqlite` 的实际 Bun，而不将其模拟的 Node 版本与 `engines.node` 进行比较。如果更新程序在 Node 上运行，则该 Node 还必须满足目标包的 Node 和 SQLite 要求，因为最终化会使用它。现有服务install/restart路径保留记录的Bun引脚。 Node 分割根路由不变，并且单独在 `~/.openclaw` 下的路径不会建立 Bun 全局安装所有权。

Doctor 和来自另一个安装的 `openclaw update repair` 将此 Bun 网关保留在其自己的根目录中。显式修复报告安装漂移并在停止服务之前拒绝维护。使用 `<bun> <service-root>/openclaw.mjs update repair` 或 `<bun> <service-root>/openclaw.mjs doctor --fix` 从服务安装进行修复。

没有持久 Node 的首次安装和更新程序分段需要将 `OPENCLAW_PACKAGE_BUN_LAUNCHER` 设置为启动 CLI 的绝对 Bun 可执行文件。更新程序在Bun下运行时自动设置；应用程序必须将其设置为其第一个 `bun add -g --trust openclaw@<version>`。预安装会将该启动器验证为 Bun 1.4.3+，而不会生成不存在或不可执行的 Node 候选者。如果没有该标记，预安装仍然需要持久的 Node；即使设置了标记，在 PATH 上找到的 Node 也必须满足包的 Node 要求。

仅当 Bun 的现有全局 bin 指向该包并且不存在持久性 Node 时，可信包生命周期才会创建启动器。更新会在私有暂存箱中创建它，然后重新定位并与包一起发布；回滚恢复以前的启动器。重新安装包会刷新记录的Bun路径。生命周期警告不会中止原本可用的包更新。

启动器路径是文字数据：空格、撇号、双引号、美元符号、反引号、反斜杠和通配符在分阶段安装路径和最终安装路径中都有效。已发布的更新程序可以重新定位原始路径字节，而无需将其转换为 shell 代码。启动器使用 shell 内置函数读取自己的数据行，然后使用 `exec` 来保留参数、标准输入、退出状态和信号，而无需包装进程、子进程或临时文件。

渲染器需要不带 NUL、换行符或回车符的绝对路径。对于不受支持的路径，安装后 Bun 的原始符号链接保持不变，Doctor 报告原因但不提供启动器修复。直接调用 `<bun> <package-root>/openclaw.mjs`，根据需要使用 shell 引用，或使用单行路径。如果发布的更新程序在最终路径中引入换行符，则拆分数据永远不会执行：启动程序退出 127，并显示目标未找到消息。即使发布的更新程序插入了回车路径，仍然不受支持；严格的启动器解析器不采用修改后的启动器。

如果启动器丢失、重新链接或仍然命名已移动的启动器Bun可执行文件，运行`<bun> <package-root>/openclaw.mjs doctor --fix`从那个安装。医生报告问题并使用现有的修复同意规则。它保留属于另一个安装的命令。风俗Bunglobal-bin 设置必须可供安装过程和 Doctor 使用；一次性的`bun --config`参数不会被包生命周期子项继承。`bunx --bun openclaw`选择Bun仅适用于该调用，不适用于普通 shell 命令。

`install-cli.sh` 仍提供 Node 并使用其现有的 npm 或 Git 安装路径。 macOS 应用程序单独拥有自己的启动器。它可以在其现有的 CLI 位置重用此 POSIX 数据线启动器合约、可执行模式和原子发布。当应用程序的运行时或包根目录发生更改时，应用程序必须重新生成启动器。

Bun 的卸载清理会删除悬挂的符号链接，但会留下生成的 shell 启动器；请参阅 [ 删除 CLI](/install/uninstall#remove-the-cli)。

通过 2026.9.6 发布的更新程序无法更新仅 Bun- 安装。他们没有设置此标记，因此新软件包的预安装会停止暂存 （`global-install-failed`）。如果调用者设置了标记，则他们自己的裸 `node` 检查将无法启动（`update-executor-settlement-failed`）。两次拒绝都发生在网关停止之前，并且网关继续运行。固定版本必须驱动更新；安装固定候选程序无法更改已运行的更新程序。

首先运行已安装的更新程序。在 Linux 分根夹具中，当 Bun 不在 PATH 中时，发布的 2026.9.6 会提前拒绝 `ENOENT`，从而使网关和两个安装保持不变。通过在 PATH 上分叉 Bun，同一已发布的驱动程序更新了网关安装并正常重新启动，同时保持调用 CLI 不变。上述路由和显式 Bun 选择适用于包含修复程序的第一个更新程序；新的候选者无法更改已安装更新程序的第一跳行为。

Npm 来源的插件在 Bun 下使用 OpenClaw 的捆绑 npm 12.1.0 CLI，不需要单独的 Node 或 npm 安装。

## <a id="sqlite-worker-lifecycle"></a> SQLite 工人生命周期

SQLite 工作线程请求和回复使用 Node 和 Bun 上独占的传输缓冲区。 Bun的串行器可以返回共享后备存储； OpenClaw 在传输之前复制这些字节，包括准备好的打开和大型命令帧。医生迁移和运行时数据库操作保留其现有的准入、字节限制和本机清理。

选择 SQLite 后，在 macOS 和 Linux 上拥有 SQLite 池的长期网关、节点和工作主机将等待检查 Bun 的普通 `DatabaseSync.close()` 和 `Symbol.dispose()` 是否发布本机语句和WAL 资源。该检查在一个小型隔离工作线程中运行一次；它使用行为，而不是 Bun 版本字符串。短 CLI 路径不运行它。通过的结果启用了 Node 上使用的共享写入器池和目标读取器清理。

库存 Bun 1.4.3 未通过此检查并保留下面的保守生命周期。错误、超时和不受支持的 WAL 行为也会保留该生命周期并记录原因。超时或错误会返回保守决策，而无需等待工作线程清理。在删除其私有文件之前，清理会等待工作进程退出最多五秒钟。未经确认的退出会使工作程序未被引用，其目录完好无损，并带有命名保留路径的 `SQLITE_CLOSE_PROBE_CLEANUP` 警告。通过检查在接受成功之前也会使用此有界连接。 Windows Bun 保持保守，不运行检查，直到 Windows 一致性合格。在结果可用之前，每个操作的读取器和关闭路径使用保守的清理，而不修复全局决策；后续操作可以使用完成的结果。每个写入代理在创建时都会将放置、本地停止确认和退出策略固定在一起。即使检查后来通过，早期的保守经纪人也会保留该政策，并用一次性 `SQLITE_EARLY_TOPOLOGY` 警告解释其保留的布局。工人继承创建时的决定；那些在完成之前开始的工作人员在其一生中保持保守，而后来的工作人员继承了完成的结果。

在保守的运行时，成功的服务运行时引脚检查可以使私有快照文件等待清理，直到进程退出。 OpenClaw 记录清理警告并保留这些文件的所有权，而不会导致检查失败。读取错误和所需清理失败仍然会停止操作；原始状态数据库不变。

当 Windows 在成功读取后将私有快照报告为繁忙时，网关发现、数据库模式预检和状态所有权检查遵循相同的策略。在没有合格本机关闭的运行时，启动会记录 `SQLite snapshot cleanup deferred` 警告，并保留注册的快照，以便在退出时或通过下一个进程的废弃快照回收进行清理。读取、模式、准入、本机关闭和其他删除错误仍然失败；具有合格本机关闭的运行时仍然需要立即清理。

结果永远不会保存在配置或状态中。每个新的长期主机都会再次检查其选定的运行时和库，包括在升级、降级或回滚之后。不需要架构或数据迁移，并且安装的更新程序保持不变。不确定的能力检查不会阻塞其他支持的运行时；现有的运行时间和 SQLite 安全要求仍然适用。

对于内部比较，请在启动 Bun 之前设置 `OPENCLAW_DIAGNOSTICS=sqlite.close.conservative`。这个精确的标准化条目会跳过检查并记录决定的保守结果及其原因；通配符或所有诊断条目不会更改策略。它不能强制执行积极的能力，不会影响Node的能力，并且只能从进程环境中读取，从不保存在配置或状态中。网关启动日志包括决定及其原因。

## <a id="known-limitations"></a> 已知限制

- **监督命令输出：** 大型管道响应，包括 CUA 屏幕截图，在 Bun 下保留背压。完成的输出达到 EOF，同时进程清理保留权限，包括保留重复标准输出描述符的构建。已关闭其输出套接字的运行时不会触发后代清理。
- **Desktop WebSockets：** OpenClaw 使用已安装的 `ws` 传输用于桌面观察者和配对节点 desktop/portal 流。 Bun 1.4.3 的内置 `ws` 服务器适配器缺少 pause/resume 和 Duplex 流桥；当桌面断开连接时，安装的传输会保留背压、有效负载限制和清理。
- **生命周期脚本：** Bun 会阻止依赖生命周期脚本，除非明确受 `bun pm trust` 信任。
- **包脚本：** 某些脚本硬编码pnpm，因此`bun run`仍然在内部调用pnpm。
- **PTY 终端：** macOS 和 Linux 使用 Bun 的本机 PTY，不带 Node 运行时，仅在构建时提供`Bun.Terminal.pause()` 和 `Bun.Terminal.resume()`，例如 OpenClaw Bun 分支版本，还带有 [macOS 子出口修复程序 ](https://github.com/openclaw/bun/pull/11)。其他 Bun 版本使用 Node 帮助程序，并需要为终端 I/O. 安装 Node 运行时，在选择该运行时（包括在 `bun --bun` 下），OpenClaw 会跳过 Bun 的 `node` 填充程序。 Windows 保留 `node-pty`。
- **Windows 浏览器扩展：** 本机消息传递注册仅接受 `node.exe` 作为主机解释器。在 Windows 上运行 `openclaw browser extension install` 和 Node。
- **启动的桌面应用程序：** Node 在启动时将继承的描述符标记为 close-on-exec，而 Bun 1.4.3 则不会，因此网关计算机控制启动的应用程序会继承帮助程序的标准流。然后，网关的 30 秒清理超时会在应用程序执行结束时停止该应用程序。 OpenClaw 的 Bun 前叉采用了 Node 在 [openclaw/bun#12](https://github.com/openclaw/bun/pull/12) 中的行为。
- **SQLite 处理：** Bun 未通过 [native-close 功能检查的构建 ](/install/bun-compatibility#sqlite-worker-lifecycle)，包括库存 Bun 1.4.3，可以关闭或处置后保留语句句柄和 WAL/shared-memory 文件。 OpenClaw 无法通过 Bun 的公共 `node:sqlite` API 来最终确定它们，并等待工人退出。使用 [upstream 关​​闭修复 ](https://github.com/oven-sh/bun/pull/40005) 的构建可以在通过检查后使用定向清理。 Windows 以及未完成准入的流程保留保守策略。
- **共享状态读取：** 成功的读取在两个生命周期策略上重用其工作线程和本机读取器。借助本机关闭功能，空闲读取器会在 30 分钟后关闭，并且有针对性的清理可以留住工作人员。如果没有它，关闭或更换读取器会等待工作线程退出，包括主机请求的清理；空闲的读者与他们的工作人员一起退休，而转录发现在释放捕获的数据库别名之前退休其工作人员。失败的读取和不确定的清理会在每个运行时保留其现有的退休规则。
- **SQLite 存储工作线程：** 在没有本机关闭功能的情况下创建的 Bun 代理为每个不同的数据库使用一个工作线程，在主机的 64 个客户端上限内最多可使用 64 个专用工作线程。同一数据库的客户端共享其worker，关闭最后一个客户端等待worker退出。产能耗尽会拒绝新的工作，而不会中断现有的商店。 Node 和 Bun 代理创建时具有基于可用 CPU 跨 2 到 8 个共享工作线程复用数据库的功能；确认的关闭仅释放关闭的参与者，而失败或空的插槽仍然会退出。
- **Windows 上的无头节点更新：** 在 Bun 上运行的节点主机仍准备使用 npm 进行更新，因为 Bun 的 Windows 二进制启动器无法暂存。 Windows Bun-only 主机在每小时检查时记录该故障并继续运行其当前版本。
- **工作空间安装：** `bun install` 无法解析此存储库的 pnpm 工作空间布局。使用 `pnpm install`。

有关工作流和生命周期信任命令，请参阅 [Bun](/install/bun)。

## <a id="history-across-releases"></a> H跨版本的历史记录

| 发布版本                            | 变更                                                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 未发布（主要）                  | 启动和预安装包时需要 Bun 1.4.3+，保留固定的 OpenClaw 叉；删除了固定的 JSC 段查找解决方法。                                                           |
| 未发布（主要）                  | 当发现没有发现支持的库时，拒绝 Apple 的系统 macOS 上的 SQLite，命名可卸载的候选库，例如 x64 Rosetta Bun 下的 arm64 Homebrew 库。                               |
| 未发布（主要）                  | 在 macOS 或 Linux 上的本机关闭检查通过后重用 SQLite 工作线程。库存 Bun、1.4.2、Windows 和非结论性检查保留保守清理。                                             |
| 未发布（主要）                  | 在 OpenClaw Bun 分支上运行 macOS 应用程序的私有工作程序和 Chrome 设置，将完整包和具有签名扩展功能的 SQLite 捆绑在一个共享运行时中。网关托管仍然是外部的。 |
| 未发布（主要）                  | macOS 和 Linux 上的无头节点更新会在进程中获取和验证注册表存档，并使用 Bun 准备专用运行时，而无需 Node 或 npm。 Windows 准备工作仍需要 npm。 #160575    |
| 未发布（主要）                  | 更新拥有的分根 Bun 网关安装，保留其运行时引脚，并使用显式 Bun 可执行文件进行包管理器检查和安装。                                   |
| 未发布（主要）                  | 保留 Bun 维护子项和服务运行时选择，并添加 `OPENCLAW_PACKAGE_BUN_LAUNCHER` 用于 Bun-only 安装和更新程序暂存的预安装验证。                            |
| 未发布（主要）                  | 无头节点更新检查在 Bun 下读取 npm 注册表，而不是运行 `npm view`。 #160154                                                                                         |
| 未发布（主要）                  | 在 Bun 下运行捆绑的 npm 12.1.0 CLI，以进行 npm-sourced 插件安装、更新和删除，无需单独安装 Node 或 npm。                                                          |
| 未发布（主要）                  | 隐式网关和受管节点主机重新安装、更新刷新以及 Doctor 的卸载服务重新安装保留受支持的记录的 Bun 可执行文件，而无需创建运行时 pin。                 |
| 未发布（主要）                  | 工具搜索代码模式（`tool_search_code`）已停用；结构化工具搜索在 Bun 下不需要 Node。                                                                                                |
| 未发布（主要）                  | 使用当前运行时启动打包的 Chrome DevTools MCP 服务器，因此现有会话浏览器配置文件不再需要在 Bun 下安装 Node。                                        |
| 未发布（主要）                  | 网关计算机控制在网关自己的运行时上运行其主机工作线程，因此 Bun 网关无需安装 Node 即可控制其托管桌面。                                                  |
| 未发布（主要）                  | 在带有 `Terminal.pause()`/`resume()` 的 macOS/Linux 上使用没有 Node 的原生 PTY（带有 macOS 退出修复的 OpenClaw 分支）；其他 Bun 版本保留 Node 帮助程序。 Windows 保留 `node-pty`。                 |
| 未发布（主要）                  | 将 Bun SQLite 存储从四个数据库扩展到现有 64 个客户端上限内最多 64 个专用工作人员，同时保留工作人员出口清理。                                                   |
| 未发布（主要）                  | macOS 上的托管 Bun 服务从安装 shell 中保留 OPENCLAW_SQLITE_LIBRARY 和 HOMEBREW_PREFIX。                                                                                          |
| 未发布（主要）                  | 守护进程安装、修复、修复和服务审核通过与网关启动相同的 SQLite 库选择来检查 Bun 可执行文件，并具有最小的检查环境。 #142186                      |
| 未发布（主要）                  | 自动选择 WAL- 安全、可扩展的 macOS SQLite 库并将其传播到内存 KNN 子项。添加 `OPENCLAW_SQLITE_LIBRARY`。 #141854                                           |
| 未发布（主要）                  | 文档 Bun 1.4.2 在关闭或处置后保留本机语句和 WAL/shared-memory 文件，并在提示文件发布重要时通知 Node。 #141846                                      |
| 未发布（主要）                  | 当 KNN 子级无法加载扩展时，添加批量嵌入扫描回退，保留 provider/source 过滤器和批次之间的取消。 #141104                                          |
| 未发布（主要）                  | 允许在 SQLite 上构建普通代理数据库，无需加载扩展。原生向量搜索仍然需要一个具有扩展能力的库。 #139487                                                    |
| v2026.8.2                          | 修复了 Bun 1.4 认证网关 WebSocket 与已安装的 npm 接收器的兼容性，保留有效负载限制和请求调度。 #134282                                              |
| v2026.8.1                          | 恢复 CLI、网关和受管节点主机的显式受管服务选择，需要 Bun、1.4.0+、`node:sqlite` 和 WAL-safe SQLite。 #129593                                            |
| v2026.7.2-beta.5；稳定 v2026.8.1 | 恢复对提供 `node:sqlite` 的构建的实验性 CLI/Gateway 支持，记录为 1.4.0 canary 及更高版本；在此阶段，警卫使用 API 检查，而没有最小数字 Bun。 #114256  |
| v2026.7.2-beta.5；稳定 v2026.8.1 | 记录 `bun install` 在 pnpm 工作区布局上失败，并将依赖项指令更改为 `pnpm install`； Bun 仍然是脚本运行程序。 #114256                                              |
| v2026.7.1；主要 v2026.7.2-beta.1   | 由于 `node:sqlite` 不可用而拒绝使用 Bun CLI/Gateway，仅选择托管运行时 Node-，并将旧版 Bun 服务定向到 Node。包脚本的使用仍然可用。 #106065   |
| v2026.1.12                         | 标签 Bun 网关使用实验性且不推荐，因为 WhatsApp/Telegram 错误；推荐Node进行生产。                                                                            |
| v2026.1.9                          | 从交互式守护程序运行时选择器中删除 Bun，而显式验证器仍然接受 Bun。                                                                                                |
| v2026.1.8                          | 将 Bun 记录为本地 builds/tests 的可选包脚本运行程序，当时带有可选的依赖项安装。 pnpm 仍然是主要的。                                                  |
| v2026.1.8                          | 文档忽略了 pnpm 锁定文件、历史安装后补丁桥、生命周期信任以及内部调用 pnpm 的脚本。补丁桥不是当前的安装建议。          |
| v2026.1.8                          | 当禁用 WhatsApp 时引入可选的 `--daemon-runtime bun`，因为 Baileys WebSocket 重新连接路径可能会损坏 Bun 下的内存。 Node 仍然是默认值和推荐值。        |

## <a id="related"></a> 相关内容

- [Bun](/install/bun)
- [环境变量](/help/environment)
- [内存配置](/reference/memory-config)
- [Node.js 兼容性](/install/node-compatibility)
