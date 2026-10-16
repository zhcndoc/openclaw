---
summary: "安装脚本如何工作（install.sh、install-cli.sh、install.ps1）、标志以及自动化"
read_when:
  - "你想了解 `openclaw.ai/install.sh`"
  - "你想自动化安装（CI / 无头环境）"
  - "你想从 GitHub 检出版本安装"
  - "您想要安装专用 Node 运行时而不重新安装 OpenClaw"
title: "安装器内部机制"
---

OpenClaw 提供三个安装脚本，托管在 `openclaw.ai` 上。

Node 仍然是默认运行时。 `install.sh --runtime bun` 是 x64 和 arm64 上 macOS 和 glibc Linux 上的显式 Bun-only 替代方案。它可以安装 OpenClaw 版本的固定 Bun 前叉，而不需要 Node。请参阅 [Bun-only 全局安装](/install/bun#bun-only-global-install)。

源签出中的 shell 入口点共享 `scripts/install-policy.sh`。在复制、管道传输或发布之前，运行 `node scripts/build-installers.mjs` 以在 `dist/installers/` 中组装独立副本。网站同步和本机构建使用这些组装的脚本。 npm 软件包将两个源文件保存在一起，以实现已安装更新程序的兼容性。从网站安装永远不会下载单独的策略帮助程序。

| 脚本                             | 平台                      | 它的作用                                                                                                                   |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`install.sh`](#installsh)         | macOS / Linux / WSL           | 如果需要，安装 Node，通过 npm（默认）或 git 安装 OpenClaw，可以运行入门。                                       |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL / FreeBSD | 通过 npm （FreeBSD） 或 npm/git （macOS/Linux/WSL） 将 Node + OpenClaw 安装到本地前缀 （`~/.openclaw`）。无需root。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell)          | 如果需要，安装 Node，通过 npm（默认）或 git 安装 OpenClaw，可以运行入门。                                       |

三人都支持Node **24.16+ or 26.1+**与一个WAL-重置安全链接SQLite图书馆。什么时候Node丢失且未检测到 nvm，`install.sh`规定Node 26通过Homebrew on macOS以及所支持的Node 24 LTS线通过NodeSource on Linux。当受支持的RPM-拥有的Node链接不安全SQLite， `install.sh`保留发行版包并提供用户空间Node运行时通过`install-cli.sh`。无根者`install-cli.sh`下载Node 24.21.0 on macOS和 glibcLinux. FreeBSD使用已安装的系统运行时。Linux不支持 ARMv7。在Windows， winget/Chocolatey/Scoop安装支持的Node LTS线，以及便携式后备下载Node 26.

在更改软件包之前，每个安装程序都会检查它将使用的确切 npm 可执行文件。 npm 11.15及更早版本安装正常； npm 11.16 及更高版本（包括 npm 12）仅针对 npm- 解析的 OpenClaw 候选身份接收 `--allow-scripts`。不可读的 npm 版本在包突变之前停止。剩余的 `.openclaw-lifecycle-pending` 标记或旧版 `dist/openclaw-install-guard` 会使安装失败，而不是将跳过生命周期的包报告为成功。

在 npm 12 上，本地 `.tgz` 和 `.tar.gz` 安装和更新需要无逗号的存档文件名和父路径。 npm 使用逗号分隔生命周期批准，因此在重试之前将存档移动到无逗号的路径。仍然支持相对 tarball 参数；安装程序解析其完整路径以供批准。

安装方法开关会在当前所有者退休之前验证更换情况。源包装器使用同目录原子替换；当 npm 填充程序共享该路径时，安装程​​序仅将身份匹配的源包装器移到一边，并在 npm 安装、生命周期检查或候选验证失败时恢复它。升级时，`install.sh`和`install.ps1`运行`openclaw doctor --fix`；修复或最终验证失败退出非零，并且仅在这些步骤完成后才会出现成功横幅。

## <a id="private-node-recovery"></a> 私人Node恢复

当不支持主用Node.js时，CLI可以在加载OpenClaw之前提供`Update NodeJS: Y/N [N]:`。输入 **Y** 以安装经过校验和验证的专用运行时，然后重试相同的命令。配置使系统 Node.js、shell 设置、OpenClaw 软件包和网关服务保持不变；重试的命令保持其正常行为。输入 **N**，按 Enter，或取消接收手动升级说明。

安装方案要求 stdin 和 stderr 都是交互式终端。 CLI 绝不会在 CI 或 `--json`、`--yes` 或 `--non-interactive` 中提示或安装运行时。恢复支持x64/ARM64、macOS、Windows、glibc Linux； Alpine/musl等架构需要手动安装。具有精确进程标识要求的命令（包括 `hooks relay` 和 `webhooks gmail run`）保留其现有的运行时要求。

CLI 将私有运行时存储在 `~/.openclaw/tools/cli-node` 下，设置时使用 `OPENCLAW_HOME` 代替主目录。稍后需要受支持的运行时的启动会从该位置重用兼容的运行时，包括非交互式启动，而无需其他安装提示。支持的活动 Node.js 优先。下面的 Node-only 安装程序示例明确填充此位置；如果您使用 `OPENCLAW_HOME`，请调整其主路径。有关手动安装指南，请参阅 [Node.js](/install/node)。

### <a id="diagnostics-on-an-unsupported-node"></a> 在不受支持的 Node 上进行诊断

启动器首先重用兼容的私有运行时，包括用于诊断。如果没有，诊断需要 Node 22 或更新版本（`node:sqlite` 可用）。较旧的运行时在加载任何诊断代码之前保留交互式恢复提议或非交互式拒绝。

在功能强大且不受支持的运行时上，`openclaw --version`（`-V` 或 `-v`）、`--help`（`-h`）、`gateway status`、`doctor --lint`、`update status` 和`triage --json` 或 `triage --non-interactive` 仍然可用。普通 `doctor` 在不受支持的 Node 上运行只读 lint 检查。修复标志、网关启动和分类代理执行仍然需要受支持的运行时。 `openclaw update` 可以在承认更新或写入其运行分类帐之前报告确切的 Node 安装说明。

这些命令打印 `Running on an unsupported Node (<version>); diagnostics may show truncated text`。调查结果仍然可见，包括 CLI 和记录的服务 Node 版本及其维修说明。 `update status --json` 包括 `runtimeFindings`（如果存在），更新失败问题报告记录报告进程的 Node 版本。单独成功安装 npm 并不能建立运行时兼容性：npm 可能会跳过预安装检查。

诊断读取器保留实时 SQLite 文件。他们可以恢复一次性的私有副本，以便在崩溃后提交的状态仍然可读；运行时豁免不允许可写的实时数据库访问。

## <a id="source-build-toolchain"></a> Source 构建工具链

在 FreeBSD 上，使用 [install-cli.sh](/install/installer#install-clish). 中描述的 npm 方法当前不支持 Source/git 安装。

对于源安装，安装程序在选择结帐参考后选择 pnpm。它使用 Corepack 在安装程序拥有的临时目录中创建 pnpm 垫片，然后从检出运行它们，以便 Corepack 读取该目标的包管理器引脚。同一目录引导 `PATH` 进行嵌套安装和构建命令；工作区和锁定文件环境覆盖仅绑定到这些子项的目标签出。较旧的环境 `pnpm --version` 不是安全选择检查：其版本切换路径可以修改目标锁定文件。

如果 Corepack 丢失或无法配置固定版本，安装程序将使用其选择的 npm 可执行文件将确切的 pnpm 版本安装到临时前缀中，从而保留 npm 的版本特定生命周期批准。他们直接使用该前缀的可执行文件，包括嵌套命令。此引导程序既不会激活全局 Corepack shims，也不会更改用户 pnpm 配置；安装程序退出后，临时垫片和软件包将被清除。

这不会安装或替换 shell 的全局 pnpm 命令。在以后的手动构建之前，请按照 [From source](/install#from-source) 选择签出固定的工具链，而不是重用旧的环境启动器。

## <a id="quick-commands"></a> 快速命令

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab id="install-cli-sh-1" title="安装-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>
如果安装成功但在新的终端中找不到 `openclaw`，请参阅 [Node.js 故障排查](/install/node#troubleshooting)。
</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>
建议用于 macOS/Linux/WSL. 上的大多数交互式安装
</Tip>

### <a id="flow-(install.sh)"></a><a id="flow-install-sh"></a> 流程 (install.sh)

安装程序网络操作允许连接或停止传输五分钟。当数据不断到达时，安装程​​序管理的下载可能需要更长的时间；他们没有固定的总下载期限。注册表元数据检查也默认为五分钟。

<Steps>
  <Step id="detect-os" title="检测OS">
    支持 macOS 和 Linux（包括 WSL）。
  </Step>
  <Step id="install-a-supported-node-js-runtime" title="安装受支持的 Node.js 运行时">
    <a id="ensure-a-supported-nodejs-runtime" />
    <a id="ensure-a-supported-node-js-runtime" />
    检查 Node 版本和链接的 SQLite 库，然后根据需要安装 Node（macOS 上的 Node 26 到 Homebrew `node`；Node 24 LTS 到 Linux 上的 NodeSource 设置脚本 （apt/dnf/yum）。在基于 RPM- 的 Linux 上，链接不安全 SQLite 的受支持发行版 Node 仍保持安装，而 OpenClaw 接收用户空间 Node 运行时。在 macOS 上，仅当安装程序需要 Node 或 Git 时才安装 Homebrew。支持Node 24.16+和Node 26.1+；不支持 Node 22、23 和 25。在 Alpine/musl Linux 上，安装程序使用 apk 包而不是 NodeSource 并验证实际链接的 SQLite 版本。当前稳定的 Alpine 包流可以提供足够新的 Node 以及易受攻击的系统 SQLite；发生这种情况时，请使用官方 `node:26-alpine` 容器或基于 glibc 的主机。
  </Step>
  <Step id="install-git-if-missing" title="如果缺少，请安装 Git">
    <a id="ensure-git" />
    如果缺少，则使用检测到的包管理器安装 Git，包括 macOS 上的 Homebrew 和 Alpine 上的 apk。
  </Step>
  <Step id="install-openclaw" title="安装 OpenClaw">
    - `npm` 方式（默认）：全局 npm 安装
    - `git` 方法：clone/update 存储库，使用 pnpm 安装 deps，构建，然后在 `~/.local/bin/openclaw` 安装包装器

  </Step>
  <Step id="post-install-tasks" title="安装后任务">
    - 解析刚安装的 `openclaw` 二进制文件，以便后续命令使用
    - npm-前缀和守护程序状态检查使用默认的五秒超时；已完成的支票无需等待截止日期即可返回。
    - 对于未配置的安装，在医生或网关检查之前开始登录。如果有 `--no-onboard` 或没有 TTY，它会打印命令以稍后完成设置。
    - 对于配置的安装，尽力刷新并重新启动已加载的网关服务并运行修复医生。升级修复失败是致命的；插件更新失败仍然是警告。
    - 当运行 `--verify` 时，仅在存在配置后才会检查已安装版本并检查 gateway 健康状况。

  </Step>
</Steps>

### <a id="bun-runtime"></a> Bun 运行时

```sh
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --runtime bun
```

Bun 路径解析 npm 的小标签文档中的 dist 标签，无需 Node（确切版本跳过该查找），读取该版本的 Bun 引脚，验证存档和可执行 SHA-256 哈希值和分叉版本，然后将运行时暂存在 `~/.openclaw/tools/bun-<tag>/bun` （`OPENCLAW_HOME` 替换主目录）。它与`bun add -g --trust`一起安装，验证软件包的匹配引脚和Bun启动器，并在shell PATH中赋予Bun的全局bin目录优先级。封装引脚不匹配导致验证失败。省略该文件的已发布版本（包括 `2026.10.1`）使用其确切版本标签中经过验证的引脚，并且必须通过生成的启动器报告请求的版本。定制封装规格仍然需要捆绑引脚。使用较新的版本重新运行会阶段其新 pin 并重新 pin 现有网关服务，而无需重置配置。这些服务重新固定保持状态和配置不变；当您需要维修或迁移时，单独运行 Doctor。如果无法安全更新 shell 配置文件，安装将继续并打印手动 PATH 设置命令；现有的网关服务仍在重新固定。服务安装程序接收调用者的原始临时目录环境，因此该服务永远不会保留安装程序的一次性临时目录。

在macOS上，安装程序在设置时使用`OPENCLAW_SQLITE_LIBRARY`；否则，它确保安装 Homebrew SQLite 并导出 `HOMEBREW_PREFIX`。它在安装 OpenClaw 之前验证 SQLite。新的交互式入门接收 `--install-daemon --daemon-runtime bun`，然后使用确切的 Bun 运行时路径进行网关安装。 `--no-onboard` 保留全新安装而不提供服务；现有已安装的服务仍会重新固定。

`--bun-path` 接受绝对可执行的 OpenClaw 分叉路径，其文件名为 `bun` 或 `bun.exe`（不区分大小写），与网关运行时引脚合约匹配。在软件包安装或 shell 配置文件更改之前，其他文件名将被拒绝。对于已发布的版本，它必须与 pin 匹配，包括其可执行哈希值。自定义封装规范需要此选项；在调用 CLI 之前检查其安装的引脚。 Git-checkout 构建需要 Node/pnpm 并且不能使用 `--runtime bun`。 Windows、musl/Alpine 和没有引脚工件的平台将被拒绝。

`--dry-run` 获取注册表和 pin 元数据并打印版本、pin 标签、资产和目标路径，而无需下载运行时或安装包。对于固定镜，`OPENCLAW_INSTALL_NPM_REGISTRY` 替换 `https://registry.npmjs.org`，`OPENCLAW_INSTALL_BUN_PIN_URL` 设置引脚 URL（可选的 `{version}` 替换为解析版本），`OPENCLAW_INSTALL_BUN_RELEASE_BASE_URL` 替换 `https://github.com/openclaw/bun/releases/download`。

### <a id="existing-nvm-installations"></a> 现有 nvm 安装

`install.sh` 保留了主动兼容的 Node，包括 `nvm use system`。如果不支持活动运行时，它首先检查已安装的 nvm 版本，然后检查其他可用的 Node 二进制文件，包括 Homebrew。每个候选者必须通过版本和 SQLite 能力检查。选择现有的 nvm 版本仅更改安装程序会话；该脚本会打印 `nvm use <version>` 以用于后续命令，并保持默认别名和 shell 配置文件不变。

安装程序通过 `NVM_DIR`、`~/.nvm` 和 shell 启动挂钩检测 nvm。它使用 `--no-use` 加载 `nvm.sh`，而不是激活默认值。启动文件永远不会被执行以进行发现。如果自定义或惰性挂钩是唯一可用的位置，请在重新运行安装程序之前在 shell 中加载 nvm。

当 nvm 存在但没有可用的兼容运行时时，安装程​​序会在现有安装中运行 `nvm install 26`。由于 nvm 会刷新 LTS 别名，因此如果刷新会更改其分辨率，则提示还会要求通过固定其别名来保留当前默认版本。即使下载失败，该同意也适用。当不存在默认值时，提示会明确包含 nvm 创建的默认值。安装程序会记录任何批准的别名更改和最终默认版本。拒绝或以非交互方式运行会以要运行的确切命令退出非零，而无需配置 Node 或更改 nvm、npm 配置或 shell 配置文件。安装程序绝不会安装第二个 nvm。

在 Linux 上，不可写的系统 npm 前缀也会通过现有的 nvm 安装进行路由。安装程序重复使用兼容的 nvm Node 或要求安装一个；它不会写入会破坏后续 `nvm use` 命令的 npm `prefix` 设置。如果没有 nvm，现有的用户本地 npm 前缀设置仍然适用。

### <a id="source-checkout-detection"></a> 源码检出检测

如果在 OpenClaw 检出版本中运行（`package.json` + `pnpm-workspace.yaml`），脚本会提供：

- 使用检出版本（`git`），或
- 使用全局安装（`npm`）

如果没有可用的 TTY 且未设置安装方式，则默认使用 `npm` 并发出警告。

由于方法选择无效或 `--install-method` 值无效，脚本退出并显示代码 `2`。

现有的签出根可以使用 `.git` 目录或 `.git` 文件，包括链接的 Git 工作树。所有三个安装程序都会在更新之前验证签出自己的提交，并拒绝不完整的签出或非空非存储库路径。当另一个工作树拥有请求的分支时，`install.sh` 和 `install-cli.sh` 会分离检出其选定的提交。对于 `main`，它们从本地分支开始，仅当启用 Git 更新时才重新建立到 `origin/main`；其他分支选择器使用获取的 `origin` 分支。即使 `HEAD` 分离，这些仍然是移动分支安装。

对于 `--install-method git`，`install.sh` 和 `install-cli.sh` 接受完整的 40 个字符提交 SHA 到 `--version`。安装程序使用现有对象或从 `origin` 获取确切的提交，将其分离检出，并使用冻结的锁定文件安装依赖项。同名的分支不能替换所请求的提交。 `--no-git-update` 跳过分支变基；它不会阻止获取丢失的请求提交。如果请求的对象不可用或无法解析为提交，则安装失败。

### <a id="examples-(install.sh)"></a><a id="examples-install-sh"></a> 示例 (install.sh)

<Tabs>
  <Tab id="default" title="默认值">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab id="skip-onboarding" title="跳过引导">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab id="git-install" title="git安装">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```
  </Tab>
  <Tab id="github-main-checkout" title="GitHub 主要结帐">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
    ```
  </Tab>
  <Tab id="dry-run" title="试运行">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run
    ```
  </Tab>
  <Tab id="verify-after-install" title="安装后验证">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard --verify
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion id="flags-reference" title="标志参考">

| 标志                                    | 描述                                                             |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `--install-method \| --method npm\|git` | 选择安装方式（默认：`npm`）                                  |
| `--runtime node\|bun`                   | 选择运行时间（默认：`node`）； Bun 需要公开的叉销     |
| `--bun-path <absolute path>`            | 使用现有的、经过验证的 OpenClaw Bun 分叉                             |
| `--npm`                                 | npm 方法的快捷方式                                                 |
| `--git \| --github`                     | git方法的快捷方式                                                 |
| `--version <version\|dist-tag\|spec>`   | npm 版本、dist-tag 或包规格（默认：`latest`）              |
| `--beta`                                | 如果可用则使用 beta dist-tag，否则回退到 `latest`              |
| `--git-dir \| --dir <path>`             | 检出目录（默认：`~/openclaw`）                              |
| `--no-git-update`                       | 跳过现有检出版本的 `git pull`                                   |
| `--no-prompt`                           | 禁用提示                                                         |
| `--no-onboard`                          | 跳过引导                                                         |
| `--onboard`                             | 启用引导                                                       |
| `--verify`                              | 运行安装后的冒烟验证（`--version`，以及在已加载时检查 gateway 健康状况） |
| `--dry-run`                             | 打印操作但不应用更改                                  |
| `--verbose`                             | 启用调试输出（`set -x`，npm notice 级别日志）                   |
| `--help \| -h`                          | 显示用法                                                              |

  </Accordion>

  <Accordion id="environment-variables-reference" title="环境变量参考">

| 变量                                          | 描述                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                | 安装方式                                                     |
| `OPENCLAW_VERSION=latest\|next\|<semver>\|<spec>` | npm 版本、dist-tag 或包规格                             |
| `OPENCLAW_RUNTIME=node\|bun`                      | 运行时（默认：`node`）                                          |
| `OPENCLAW_BUN_PATH=<absolute path>`               | 现有 OpenClaw Bun fork 可执行文件                              |
| `OPENCLAW_BETA=0\|1`                              | 如果可用则使用 beta                                              |
| `OPENCLAW_HOME=<path>`                            | OpenClaw 状态以及默认 git/onboarding 路径的基础目录 |
| `OPENCLAW_GIT_DIR=<path>`                         | 检出目录                                                 |
| `OPENCLAW_GIT_UPDATE=0\|1`                        | 切换 git 更新                                                 |
| `OPENCLAW_NO_PROMPT=1`                            | 禁用提示                                                    |
| `OPENCLAW_VERIFY_INSTALL=1`                       | 运行安装后的烟雾验证                                  |
| `OPENCLAW_NO_ONBOARD=1`                           | 跳过引导                                                    |
| `OPENCLAW_DRY_RUN=1`                              | 试运行模式                                                       |
| `OPENCLAW_VERBOSE=1`                              | 调试模式                                                         |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`       | npm 日志级别（默认：`error`，会隐藏 npm 弃用提示噪音）      |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## <a id="install-cli.sh"></a><a id="install-cli-sh"></a> 安装-cli.sh

<Info>
专为您希望所有内容都位于本地前缀（默认 `~/.openclaw`）的环境而设计。默认支持 npm 安装，加上 git-checkout 在 macOS/Linux/WSL. 上安装 FreeBSD 使用 npm 方法。 FreeBSD和Alpine使用系统Node封装。
</Info>

### <a id="flow-(install-cli.sh)"></a><a id="flow-install-cli-sh"></a> 流程 (install-cli.sh)

<Steps>
  <Step id="install-local-node-runtime" title="安装本地 Node 运行时">
    下载固定支持的Node LTS tarball（版本嵌入在脚本中并独立更新，默认`24.21.0`）到`<prefix>/tools/node-v<version>`并验证SHA-256。 Linux ARMv7 在安装前停止，因为官方 Node 24+ ARMv7 二进制文件不可用。在兼容硬件或其他支持的主机上使用 64 位 OS。在 Alpine/musl Linux 上，其中 Node 不发布固定运行时的兼容 tarball，使用 `apk` 安装 `nodejs` 和 `npm`，然后验证 Node 和实际链接的 SQLite图书馆。即使使用足够新的 Node，当前稳定的 Alpine 包流仍可能链接易受攻击的 SQLite；当安全检查拒绝包裹时，使用官方 `node:26-alpine` 容器或基于 glibc 的主机。
  </Step>
  <Step id="install-git-if-missing-1" title="如果缺少，请安装 Git">
    <a id="ensure-git-1" />
    如果缺少 Git，请尝试通过 Linux 上的 apt/dnf/yum/apk 或 macOS 上的 Homebrew 进行安装。在 FreeBSD 上，使用 `pkg install git` 安装 Git，然后重试。
  </Step>
  <Step id="install-openclaw-under-prefix" title="在前缀下安装 OpenClaw">
    - `npm` 方式（默认）：通过 npm 安装到前缀下，然后将包装器写入 `<prefix>/bin/openclaw`
    - `git` 方法：clones/updates 签出（默认 `~/openclaw`），并且仍然将包装器写入 `<prefix>/bin/openclaw`

  </Step>
  <Step id="verify-the-installed-cli" title="验证已安装的CLI">
    运行 `<prefix>/bin/openclaw --version` 并停止并出现错误，除非安装的包装器以非空版本成功退出。
  </Step>
  <Step id="refresh-loaded-gateway-service" title="刷新加载的网关服务">
    如果已从同一前缀加载网关服务，则脚本将运行 `openclaw gateway install --force`，这会激活替换服务，然后尽力检查网关运行状况。
  </Step>
</Steps>

在 FreeBSD 上，将默认的 npm 方法 （`--install-method npm`） 与已发布版本或兼容的内置 `.tgz` 包一起使用。不支持 Source/git 安装。如果 OpenClaw 由 pkg 或 Ports 管理，请继续使用该包所有者，而不是在其上安装。

在FreeBSD上，在运行安装程序之前，通过`pkg`安装`bash`、`node24`、`npm-node24`、`git`、`python3`和`gmake`。 Python 和 GNU 支持本机 npm 依赖项构建。如果运行时检查失败，请系统管理员更新这些软件包。安装程序需要 `PATH` 上支持的 Node 和 npm 命令，并验证实际的 SQLite 库。它将运行时链接到本地​​前缀，而无需更改系统包。显式 `--node-version` 设置 FreeBSD 上可接受的最低系统版本。

上游 Codex CLI 不提供 FreeBSD 二进制目标。成功安装或 `openclaw doctor --fix` 不会验证本机 Codex 执行。对于 OpenAI API 模型，配置 API-key 身份验证配置文件。为您使用的模型明确选择 `agentRuntime.id: "openclaw"`。 API-key 访问使用 OpenAI 平台计费，与 ChatGPT/Codex 订阅分开。请参阅 [OpenAI 设置 ](/providers/openai/setup) 和 [ 运行时选择 ](/providers/openai/runtimes#implicit-agent-runtime)。

对于 `--node-only`，`install-cli.sh` 在将 Node 供应到 `<prefix>/tools/node-v<version>` 并更新 `<prefix>/tools/node` 别名后停止。它跳过 Git、OpenClaw 安装、入门和网关服务工作。该模式拒绝 musl Linux 和 FreeBSD。手动更新其系统 Node 软件包。

对于 `--runtime-only`，该脚本会安装 Node 和 CLI，但会跳过网关服务发现、刷新和载入，即使还提供了 `--onboard`。 npm 路径还会跳过系统 Git 配置。桌面浏览器设置将此与 `--npm`、精确的应用程序版本和单独的应用程序拥有的前缀结合使用；它不会取代独立管理的网关运行时。正常安装会保留其现有的服务刷新行为。

### <a id="examples-(install-cli.sh)"></a><a id="examples-install-cli-sh"></a> 示例 (install-cli.sh)

<Tabs>
  <Tab id="default-2" title="默认值">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```
  </Tab>
  <Tab id="custom-prefix-%2B-version" title="自定义前缀+版本">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest
    ```
  </Tab>
  <Tab id="node-only" title="仅限 Node">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --node-only --prefix "$HOME/.openclaw/tools/cli-node"
    ```
  </Tab>
  <Tab id="git-install-macos%2Flinux%2Fwsl" title="Git 安装 （macOS/Linux/WSL）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw
    ```
  </Tab>
  <Tab id="automation-json-output" title="自动化 JSON 输出">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab id="run-onboarding" title="运行入门引导培训">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion id="flags-reference-1" title="标志参考">

| 标志                                    | 描述                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `--prefix <path>`                       | 安装前缀 (默认: `~/.openclaw`)                                           |
| `--install-method \| --method npm\|git` | 选择安装方式（默认：`npm`）                                            |
| `--npm`                                 | npm 方法的快捷方式                                                           |
| `--git \| --github`                     | git方法的快捷方式                                                           |
| `--git-dir \| --dir <path>`             | Git 检出目录 (默认: `~/openclaw`)                                    |
| `--no-git-update`                       | 跳过 `git pull` 进行现有 git checkout                                      |
| `--version <ver>`                       | OpenClaw 版本或 dist-tag (默认: `latest`)                                  |
| `--compatible-with <ver>`               | 拒绝无法修改 `<ver>` 编写的配置的 CLI                         |
| `--node-version <ver>`                  | Node版本（默认：`24.21.0`）                                                 |
| `--node-only`                           | 仅在 `--prefix` 下安装私有 Node 运行时；没有系统包更改 |
| `--runtime-only`                        | 安装 Node 和 CLI，无需网关检查、服务刷新或加入       |
| `--json`                                | 输出 NDJSON 事件                                                                |
| `--onboard`                             | 安装后运行 `openclaw onboard`                                              |
| `--no-onboard`                          | 跳过引导 (默认)                                                         |
| `--set-npm-prefix`                      | 在 Linux 上，如果当前前缀不可写，则强制将 npm 前缀设为 `~/.npm-global`   |
| `--help \| -h`                          | 显示用法                                                                        |

  </Accordion>

  <Accordion id="environment-variables-reference-1" title="环境变量参考">

| 变量                                    | 描述                                                        |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                                                     |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | 安装方式                                                     |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或 dist-tag                                       |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                                                       |
| `OPENCLAW_HOME=<path>`                      | OpenClaw 状态以及默认 git/onboarding 路径的基础目录 |
| `OPENCLAW_GIT_DIR=<path>`                   | git 安装所用的 Git 检出目录                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | 为现有检出切换是否进行 git 更新                          |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳过引导                                                    |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日志级别（默认：`error`）                                   |

  </Accordion>
</AccordionGroup>

<Note>
`openclaw@main` 和其他 GitHub 源规范对于 npm 安装来说不是有效的 `--version` 目标。在 macOS/Linux/WSL 上，请改用 `--install-method git --version main`。 FreeBSD 需要已发布的 npm 版本或兼容的构建包。
</Note>

---

<a id="installps1"></a>

## install.ps1

### <a id="flow-(install.ps1)"></a><a id="flow-install-ps1"></a> 流程（install.ps1）

<Steps>
  <Step id="check-powershell-and-windows" title="检查 PowerShell 和 Windows">
    <a id="ensure-powershell-windows-environment" />
    <a id="ensure-powershell-%2B-windows-environment" />
    需要 PowerShell 5+。
  </Step>
  <Step id="install-a-supported-node-js-runtime-1" title="安装受支持的 Node.js 运行时">
    <a id="ensure-a-supported-nodejs-runtime-1" />
    <a id="ensure-a-supported-node-js-runtime-1" />
    如果丢失，请尝试通过 winget 安装，然后是 Chocolatey，然后是 Scoop。如果这些方法不可用、失败或留下不受支持的运行时，该脚本会将官方 Node.js 26 Windows zip 下载到 `%LOCALAPPDATA%\OpenClaw\deps\portable-node` 中，并将其添加到当前进程和用户 PATH 中。支持Node 24.16+和Node 26.1+； Node 22、23 和 25 不受支持。
  </Step>
  <Step id="install-openclaw-1" title="安装 OpenClaw">
    - `npm` 方法（默认）：使用所选的 `-Tag` 进行全局 npm 安装，并从可写的安装临时目录启动，因此即使在受保护的文件夹（如 `C:\`）中打开的 shell 也能正常工作
    - `git` 方法：clone/update 存储库、install/build 和 pnpm，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装器。如果缺少 Git，脚本会引导 `%LOCALAPPDATA%\OpenClaw\deps\portable-git` 下的用户本地 MinGit，并将其添加到当前进程和用户 PATH。

  </Step>
  <Step id="post-install-tasks-1" title="安装后任务">
    - 在可能的情况下，将所需的 bin 目录添加到用户 PATH
    - 最佳努力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --fix --non-interactive`；失败会阻止升级成功结果

  </Step>
  <Step id="handle-failures" title="处理失败">
    `iwr ... | iex` 和 scriptblock 安装会报告终止性错误，但不会关闭当前 PowerShell 会话。直接通过 `powershell -File` / `pwsh -File` 安装时仍会以非零状态退出，便于自动化处理。
  </Step>
</Steps>

使用 `-NodeOnly`，`install.ps1` 下载官方 Node 存档，验证其 SHA-256 校验和和运行时兼容性，然后将 Node 及其匹配的 npm/npx 安装到 `-NodePrefix` 中。前缀必须是绝对私有目录，而不是文件系统根目录。此模式会跳过包管理器、OpenClaw 安装、载入和网关服务工作，并保持进程、用户和计算机 PATH 不变。 `-NodePrefix` 需要 `-NodeOnly`； `-DryRun` 无需安装即可预览目标。

<Note>
完整的本机 Windows 启动器 → PowerShell → 下载的 Node 切换在本机 Windows 上仍未得到验证。 PowerShell 安装程序装置涵盖校验和故障和安装隔离，但没有建立完整的恢复流程。
</Note>

### <a id="examples-(install.ps1)"></a><a id="examples-install-ps1"></a> 示例（install.ps1）

<Tabs>
  <Tab id="default-3" title="默认值">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
  <Tab id="node-only-2" title="仅限 Node">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NodeOnly -NodePrefix "$HOME\.openclaw\tools\cli-node\tools\node"
    ```
  </Tab>
  <Tab id="git-install-2" title="git安装">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git
    ```
  </Tab>
  <Tab id="github-main-checkout-2" title="GitHub 主要结帐">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -Tag main
    ```
  </Tab>
  <Tab id="custom-git-directory" title="自定义 git 目录">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw"
    ```
  </Tab>
  <Tab id="dry-run-2" title="试运行">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion id="flags-reference-2" title="标志参考">

| 标志                        | 描述                                                |
| --------------------------- | ---------------------------------------------------------- |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                            |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或包规范（默认：`latest`） |
| `-GitDir <path>`            | 检出目录（默认：`%USERPROFILE%\openclaw`）     |
| `-NoOnboard`                | 跳过引导                                            |
| `-NoGitUpdate`              | 跳过 `git pull`                                            |
| `-DryRun`                   | 仅打印操作                                         |
| `-NodeOnly`                 | 仅安装私有 Node 运行时；保留 PATH 不变  |
| `-NodePrefix <path>`        | `-NodeOnly` 所需的绝对私有目录        |
| `-Help`                     | 显示下载的脚本块调用的用法           |

  </Accordion>

  <Accordion id="environment-variables-reference-2" title="环境变量参考">

| 变量                           | 描述        |
| ---------------------------------- | ------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方式     |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录 |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过引导    |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull   |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式       |

  </Accordion>
</AccordionGroup>

<Note>
按名称传递安装程序选项。在下载、PATH 更改或安装开始之前，未知选项和位置参数将被拒绝。将 `-?` 与保存的 `install.ps1` 文件一起使用，或将 `-Help` 与下载的脚本块表单一起使用。
</Note>

<Note>
如果使用了 `-InstallMethod git` 且缺少 Git，脚本会先尝试引导安装用户本地 MinGit，然后再打印 Git for Windows 链接。
</Note>

---

## <a id="ci-and-automation"></a> CI 和自动化

使用非交互式 flags/env 变量进行可预测的运行。

<Tabs>
  <Tab id="install-sh-non-interactive-npm" title="install.sh（非交互式npm）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard
    ```
  </Tab>
  <Tab id="install-sh-non-interactive-git" title="install.sh（非交互式 git）">
    ```bash
    OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \
      curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab id="install-cli-sh-json" title="安装-cli.sh （JSON）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab id="install-ps1-skip-onboarding" title="install.ps1（跳过入门）">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="why-is-git-required" title="为什么需要 Git？">
    `git` 安装方法需要 Git。对于 `npm` 安装，Git 仍然是 checked/installed，以避免依赖项使用 git URL 时 `spawn git ENOENT` 失败。
  </Accordion>

  <Accordion id="why-does-npm-hit-eacces-on-linux" title="为什么 npm 在 Linux 上命中 EACCES？">
    某些 Linux 环境会将 npm 的全局前缀指向由 root 拥有的路径。`install.sh` 可以将前缀切换为 `~/.npm-global`，并把 PATH 导出项追加到 shell 的 rc 文件中（如果这些文件存在）。
  </Accordion>

  <Accordion id="windows-npm-error-spawn-git-enoent" title='Windows：“npm 错误生成 git / ENOENT”'>
    重新运行安装程序，让它引导安装用户本地 MinGit，或者安装 Git for Windows 后重新打开 PowerShell。
  </Accordion>

  <Accordion id="windows-openclaw-is-not-recognized" title='Windows：“无法识别张开爪”'>
    运行 `npm config get prefix`，并将该目录添加到你的用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。
  </Accordion>

  <Accordion id="windows-how-to-get-verbose-installer-output" title="Windows：如何获取详细的安装程序输出">
    `install.ps1` 使用 `CmdletBinding`，因此它接受 PowerShell 的公共 `-Verbose` 参数。安装程序当前不编写专用的详细流。对于脚本级诊断，请使用 PowerShell 跟踪：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion id="openclaw-not-found-after-install" title="安装后找不到openclaw">
    通常是 PATH 问题。请参见 [Node.js 故障排查](/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [更新](/install/updating)
- [卸载](/install/uninstall)
