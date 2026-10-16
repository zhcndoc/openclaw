---
summary: "Bun 安装、打包脚本和选择加入运行时使用的工作流程"
read_when:
  - "你想使用 Bun 安装依赖或运行包脚本"
  - "您想要使用最新稳定的 Bun 或固定的 OpenClaw 前叉运行 OpenClaw"
  - "你遇到 Bun install/patch/lifecycle 脚本问题"
title: "Bun"
---

<Warning>
Node 仍然是 OpenClaw 的主要、默认和推荐运行时。最新的稳定 Bun（当前为 1.4.3）和固定的 OpenClaw 分支可以作为显式选择运行 CLI、网关和受管节点主机。旧库存 Bun 发布被拒绝；运行 OpenClaw 之前升级。 [OpenClaw 需要 SQLite 3.51.3+、3.50.x 内的 3.50.7+ 或 3.44.x](/install/bun-compatibility) 内的 3.44.6+；较旧的 Bun 版本和具有不安全 SQLite 的构建将被拒绝。
</Warning>

桌面应用程序管理自己的运行时：本机 macOS 应用程序和 Linux 和 Windows 上的新本地 Tauri 安装使用相同的固定 OpenClaw Bun 分支。在 Windows 上，[Windows Hub](/platforms/windows#recommended-windows-hub) 是推荐的桌面应用程序；金牛座是替补。现有的 Linux Tauri 安装会在启动和应用程序更新时保留其运行时，直到您明确选择 **使用捆绑运行时…**。 macOS Tauri 保持其现有行为，与本机 macOS 应用程序分开。请参阅 [Linux 伴侣 ](/platforms/linux#adopt-the-bundled-runtime)。

Bun 仍可用作可选的包脚本运行程序。默认的包管理器仍然是 `pnpm`，文档工具完全支持和使用它。 Bun 无法使用 `pnpm-lock.yaml` 并忽略它，并且当前的 Bun 版本无法在 `bun install` 期间解析此存储库的 `pnpm-workspace.yaml` 布局，因此依赖项安装应使用 `pnpm install`。

要将 OpenClaw 编译为具有配套运行时目录的可执行文件，请参阅 [Standalone builds](/install/standalone)。该构建使用生产固定的 OpenClaw Bun 分支，并支持 JIT 和字节码模式。

## <a id="install"></a> 安装

<Steps>
  <Step id="install-dependencies" title="安装依赖项">
    ```sh
    pnpm install
    ```

    Bun 无法解析此存储库的 pnpm 工作区布局，因此 `bun install` 在工作区解析期间失败。使用 `pnpm install`。

  </Step>
  <Step id="build-and-test" title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```

    对于启动 OpenClaw 的命令，默认使用 Node。

    当从 Bun 下的源运行时，重用当前可执行文件的工作程序将使用 Bun 的本机 TypeScript 支持，即使可执行文件具有自定义文件名也是如此。明确需要 Node 的工作人员保留其 Node 加载程序。

  </Step>
  <Step id="run-openclaw-with-bun" title="使用 Bun 运行 OpenClaw">
    要在 Bun 下运行载入并在 Bun 下安装受管网关：

    ```sh
    bun --no-install openclaw.mjs onboard --install-daemon --daemon-runtime bun
    ```

    对于被管节点主机，单独选择Bun：

    ```sh
    bun --no-install openclaw.mjs node install --runtime bun
    ```

  </Step>
</Steps>

OpenClaw 将 `--no-install` 添加到其 Bun 服务命令和拥有的运行时子进程中，包括插件集成的 exec 秘密提供程序。即使工作目录的 `bunfig.toml` 设置了 `[install] auto = "fallback"`，缺少导入也会失败，而不是获取包。显式安装所需的依赖项。现有服务定义在正常服务重新安装或更新期间收到该标志；不需要状态迁移。这不控制第三方插件自行启动的进程。直接调用库存Bun时使用`--no-install`，如上图。

## <a id="bun-only-global-install"></a> Bun-仅限全局安装

在 macOS 和 glibc Linux（arm64 或 x64）上推荐的 Bun-only 安装是：

```sh
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --runtime bun
```

当省略 `--runtime` 时，Node 保持默认值。 Bun 路径不安装 Node 运行时：它解析已发布的 OpenClaw 版本，下载该版本的固定 [OpenClaw Bun fork](/install/bun-compatibility)，并验证存档、可执行文件、修订版和已安装的包 pin。在 macOS 上，如果需要，它会安装 Homebrew SQLite，或使用 `OPENCLAW_SQLITE_LIBRARY`。早于封装的 Bun 引脚（包括 `2026.10.1`）的已发布版本使用其确切版本标签中经过验证的引脚，并且必须通过生成的启动器报告请求的版本。定制封装必须包含其引脚。

使用 `--version <version-or-dist-tag>` 选择版本，使用 `--dry-run` 检查其运行时计划（仅获取元数据），或使用 `--no-onboard` 跳过设置。安装程序将现有网关服务固定到选定的 Bun。新入门使用 Bun 安装网关并记录其确切的运行时路径。 `--no-onboard` 不会在全新安装上创建服务。

对于现有的 fork 可执行文件，添加 `--bun-path /absolute/path/to/bun` 或设置 `OPENCLAW_BUN_PATH`。其文件名必须是 `bun` 或 `bun.exe`（不区分大小写），以便网关服务可以固定它。已发布的版本需要精确的固定可执行文件；自定义封装规格还需要 `--bun-path`，并在运行 CLI 之前根据已安装封装的引脚进行检查。此安装程序路径不支持 Stock Bun、git-checkout 版本、Windows 和 musl/Alpine。

对于使用受支持的 fork 可执行文件进行手动安装：

```sh
OPENCLAW_PACKAGE_BUN_LAUNCHER=/absolute/path/to/bun /absolute/path/to/bun add -g --trust openclaw
export PATH="$(/absolute/path/to/bun pm bin -g):$PATH"
openclaw --version
openclaw status --json
```

在没有 Node 的 macOS 和 Linux 上，可信软件包生命周期会安装使用确切的 Bun 可执行文件的启动程序。更新保留它。要修复旧的或丢失的启动器，请运行 `/absolute/path/to/bun <package-root>/openclaw.mjs doctor --fix`。带有空格、引号、美元符号、反引号、反斜杠和通配符的路径仍然是原义的。包含换行符或回车符的路径需要显式 Bun 调用，而不是生成的启动器。有关更新、回滚和自定义 bin 行为，请参阅 [Bun-only installs](/install/bun-compatibility#bun-only-installs)。

## <a id="lifecycle-scripts"></a> 生命周期脚本

Bun 会阻止依赖的生命周期脚本，除非显式信任它们。对于这个仓库，常见会被阻止的脚本并不需要：

- `baileys` `preinstall`：检查 Node 主要 >= 20（OpenClaw 需要 Node 24.16+ 或 26.1+，其中 Node 26推荐）
- `protobufjs` `postinstall`：发出有关不兼容版本方案的警告（无构建工件）

如果你遇到需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust baileys protobufjs
```

## <a id="caveats"></a> 注意事项

在macOS上，首先运行`brew install sqlite`：Bun上的OpenClaw拒绝Apple的系统SQLite，该系统也缺乏本机向量搜索。 Bun 1.4.3关闭后可以保留SQLite句柄和WAL/shared-memory文件；当提示文件发布很重要时，请使用 Node。有关库选择、要求和限制，请参阅 [Bun 兼容性](/install/bun-compatibility)。

某些包脚本在内部硬编码了 `pnpm`（例如 `check:docs`、`ui:*`、`protocol:check`）。即使通过 `bun run` 运行，它们仍然会调用 `pnpm`，所以请直接使用 `pnpm` 运行这些脚本。

存储库 npm 打包助手直接在 Bun 下运行打包的 npm CLI，包括在 Windows 上。除了 Bun 可执行文件之外，它们不需要 npm。明确选择的 Node 工具链仍使用其自己的相邻 npm 安装。

网关过程检查识别 Bun 的 `--watch` 和 `--hot` 标志。 ACP 桥接检测可识别 Bun 和当前运行时可执行文件，包括自定义文件名。当使用任一运行时构建时，便携式云工作线程存档目标 Node，并且工作线程推断错误会从其有限的诊断消息中忽略运行时堆栈属性。

## <a id="known-limitations"></a> 已知限制

### <a id="updating-from-2026.9.9-with-a-bun-gateway"></a><a id="updating-from-2026-9-9-with-a-bun-gateway"></a> 使用 Bun 网关从 2026.9.9 更新

2026.9.9 更新程序检查 Bun- 托管网关的运行时，就像 Node 一样。将网关服务固定到 Bun 后，2026.9.9 中的 `openclaw update` 在与 `global-install-failed` 进行包交换时失败（“恢复需要受支持的外部 Node 可执行文件”），并保持现有安装和网关运行。由 **2026.10.1** 驱动的更新以及稍后识别 Bun 运行时。

对于这一更新，请将网关返回到 Node，进行更新，然后使用更新后的 CLI 再次固定 Bun。已验证的序列将已发布的 2026.9.9 npm- 全局安装更新为 macOS 上的 2026.10.1：

```sh
node=/path/to/node-24/bin/node
bun=/path/to/openclaw-bun
package=/path/to/lib/node_modules/openclaw

"$node" "$package/openclaw.mjs" gateway install --runtime node --runtime-path "$node" --force --json
"$node" "$package/openclaw.mjs" update --yes
"$bun" --no-install "$package/openclaw.mjs" gateway install --runtime bun --runtime-path "$bun" --force --json
```

等待每个网关重新启动以报告准备就绪，然后再执行下一个命令。在macOS，从 shell 运行最后一个命令Homebrew `sqlite`安装或`OPENCLAW_SQLITE_LIBRARY`设置（参见[SQLite 库选择](/install/bun-compatibility#sqlite-library-selection)）；该服务保留该选择。重新固定的服务包括`--no-install`， 哪个2026.10.1添加到Bun服务命令。

### <a id="updating-from-2026.9.7-with-an-older-system-node"></a><a id="updating-from-2026-9-7-with-an-older-system-node"></a> 使用旧系统 Node 从 2026.9.7 更新

2026.9.7 CLI 将受信任的系统目录（`/usr/bin`、`/bin`）置于用户的 `PATH` 之前，以防止二进制劫持。因此，使用 Bun- 托管更新程序，npm 可以使用旧系统 Node 运行目标版本的安装检查，即使受支持的 Node 位于调用者的 `PATH` 上也是如此。如果 Node 低于支持的楼层，则暂存会拒绝更新并保持现有安装不变。此限制影响 **2026.9.7** 驱动的更新。

对于这一更新，请在支持的 Node 24**上运行** 网关和更新程序，然后切换回 Bun。仅切换更新程序是不够的。验证序列使用 Node 24.19.0 并在 270.9 秒内完成更新：

```sh
runtime=/path/to/node-24/bin/node
bun=/path/to/bun
package=/path/to/lib/node_modules/openclaw
export PATH="/path/to/node-24/bin:$PATH"

"$runtime" "$package/openclaw.mjs" gateway install --runtime node --runtime-path "$runtime" --force --json
```

使用您的实际绝对路径以及与网关相同的安装前缀、配置文件和 state/configuration。等待 Node 网关准备就绪，然后运行正常更新：

```sh
"$runtime" "$package/openclaw.mjs" update --yes
```

要定位特定版本或本地软件包，请添加 `--tag <version>` 或 `--tag ./openclaw.tgz`（请参阅 [Update](/cli/update)）。

更新成功后，恢复Bun：

```sh
"$bun" "$package/openclaw.mjs" gateway install --runtime bun --runtime-path "$bun" --force --json
```

等待 Bun 网关准备就绪，然后验证其状态：

```sh
"$bun" "$package/openclaw.mjs" gateway status --json
```

### <a id="rollback-finalization-on-2026.9.7"></a><a id="rollback-finalization-on-2026-9-7"></a> 2026.9.7 上的回滚完成

更新失败后，2026.9.7 更新程序可以逐字节恢复以前的安装，然后等待网关准备就绪，然后报告回滚成功，即使使用 `--no-restart` 也是如此。验证Node和Bun运行均与`--timeout 1200`等待约20分钟；这不是 Bun 特有的。让更新程序完成，然后按照其打印的恢复命令进行操作。如果网关服务停止，请运行 `openclaw gateway start`，或运行 `openclaw doctor` 以获取恢复指导（如果需要，请使用 Bun 显式调用它，如上所示）。成功的包回滚并不意味着失败的更新成功或网关准备情况已得到验证。

## <a id="related"></a> 相关内容

- [Bun兼容性](/install/bun-compatibility)
- [安装概览](/install)
- [Node.js 兼容性](/install/node-compatibility)
- [更新](/install/updating)
