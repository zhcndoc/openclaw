---
summary: "安装脚本如何工作（install.sh、install-cli.sh、install.ps1）、标志以及自动化"
read_when:
  - 你想了解 `openclaw.ai/install.sh`
  - 你想自动化安装（CI / 无头环境）
  - 你想从 GitHub 检出版本安装
title: "安装器内部机制"
---

OpenClaw 提供三个安装脚本，托管在 `openclaw.ai` 上。

| 脚本                             | 平台                 | 作用                                                                                          |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 如有需要会安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并可运行引导流程。       |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 通过 npm 或 git 将 Node + OpenClaw 安装到本地前缀（`~/.openclaw`）。无需 root。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 如有需要会安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并可运行引导流程。       |

这三个脚本都支持 Node **22.19+、23.11+ 或 24+**；对于全新安装，默认目标是 Node 24。

## 快速命令

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install-cli.sh">
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
适用于 macOS/Linux/WSL 上大多数交互式安装，推荐使用。
</Tip>

### 流程 (install.sh)

<Steps>
  <Step title="检测操作系统">
    支持 macOS 和 Linux（包括 WSL）。
  </Step>
  <Step title="默认确保 Node.js 24">
    检查 Node 版本，并在需要时安装 Node 24（macOS 上使用 Homebrew，Linux 的 apt/dnf/yum 使用 NodeSource 安装脚本）。在 macOS 上，仅当安装程序需要 Homebrew 来安装 Node 或 Git 时才会安装 Homebrew。出于兼容性考虑，仍支持 Node 22.19+ 和 23.11+。
    在 Alpine/musl Linux 上，安装程序会使用 apk 包而不是 NodeSource；配置的 Alpine 仓库必须提供受支持的 Node 版本（撰写本文时为 Alpine 3.21 或更高版本）。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，会使用检测到的包管理器安装，包括 macOS 上的 Homebrew 和 Alpine 上的 apk。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方式（默认）：全局 npm 安装
    - `git` 方式：克隆/更新仓库，用 pnpm 安装依赖、构建，然后在 `~/.local/bin/openclaw` 安装包装器

  </Step>
  <Step title="安装后任务">
    - 尽力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）
    - 在合适时尝试引导配置（TTY 可用、未禁用 onboarding，且 bootstrap/config 检查通过）
    - 当设置了 `--verify` 时运行安装后的冒烟验证

  </Step>
</Steps>

### 源码检出检测

如果在 OpenClaw 检出版本中运行（`package.json` + `pnpm-workspace.yaml`），脚本会提供：

- 使用检出版本（`git`），或
- 使用全局安装（`npm`）

如果没有可用的 TTY 且未设置安装方式，则默认使用 `npm` 并发出警告。

如果方法选择无效或 `--install-method` 值无效，脚本会以退出码 `2` 退出。

### 示例 (install.sh)

<Tabs>
  <Tab title="默认">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="跳过引导">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Git 安装">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```
  </Tab>
  <Tab title="GitHub main 检出">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
    ```
  </Tab>
  <Tab title="Dry run">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run
    ```
  </Tab>
  <Tab title="安装后验证">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard --verify
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                                    | Description                                                             |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `--install-method \| --method npm\|git` | 选择安装方式（默认：`npm`）                                              |
| `--npm`                                 | npm 方式快捷参数                                                        |
| `--git \| --github`                     | git 方式快捷参数                                                        |
| `--version <version\|dist-tag\|spec>`   | npm 版本、dist-tag 或包规格（默认：`latest`）                            |
| `--beta`                                | 如果可用则使用 beta dist-tag，否则回退到 `latest`                      |
| `--git-dir \| --dir <path>`             | 检出目录（默认：`~/openclaw`）                                           |
| `--no-git-update`                       | 跳过现有检出版本的 `git pull`                                           |
| `--no-prompt`                           | 禁用提示                                                                |
| `--no-onboard`                          | 跳过引导                                                                |
| `--onboard`                             | 启用引导                                                                |
| `--verify`                              | 运行安装后的冒烟验证（`--version`，以及在已加载时检查 gateway 健康状况） |
| `--dry-run`                             | 打印操作但不应用更改                                                    |
| `--verbose`                             | 启用调试输出（`set -x`，npm notice 级别日志）                            |
| `--help \| -h`                          | 显示用法                                                               |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                          | Description                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                | 安装方式                                                            |
| `OPENCLAW_VERSION=latest\|next\|<semver>\|<spec>` | npm 版本、dist-tag 或包规格                                          |
| `OPENCLAW_BETA=0\|1`                              | 如果可用则使用 beta                                               |
| `OPENCLAW_HOME=<path>`                            | OpenClaw 状态以及默认 git/onboarding 路径的基础目录               |
| `OPENCLAW_GIT_DIR=<path>`                         | 检出目录                                                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                        | 切换 git 更新                                                       |
| `OPENCLAW_NO_PROMPT=1`                            | 禁用提示                                                            |
| `OPENCLAW_VERIFY_INSTALL=1`                       | 运行安装后的冒烟验证                                                |
| `OPENCLAW_NO_ONBOARD=1`                           | 跳过引导                                                            |
| `OPENCLAW_DRY_RUN=1`                              | Dry run 模式                                                       |
| `OPENCLAW_VERBOSE=1`                              | 调试模式                                                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`       | npm 日志级别（默认：`error`，会隐藏 npm 弃用提示噪音）               |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>
专为希望将所有内容都放在本地前缀
（默认 `~/.openclaw`）下、且不依赖系统 Node 的环境而设计。默认支持 npm 安装，
也支持在相同前缀流程下进行 git 检出安装。
</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="安装本地 Node 运行时">
    下载一个已固定且受支持的 Node LTS tarball（版本内嵌在脚本中并独立更新，默认 `22.22.0`）到 `<prefix>/tools/node-v<version>`，并验证 SHA-256。
    在 Alpine/musl Linux 上，由于 Node 不会为该固定运行时发布兼容的 tarball，会使用 `apk` 安装 `nodejs` 和 `npm`，并将该运行时链接到前缀包装器路径中。Alpine 仓库必须提供受支持的 Node 版本（22.19+、23.11+ 或 24+）；如果较旧的仓库只提供 Node 20 或 21，请使用 Alpine 3.21 或更高版本。
  </Step>
  <Step title="确保 Git 可用">
    如果缺少 Git，会尝试通过 Linux 上的 apt/dnf/yum/apk 或 macOS 上的 Homebrew 安装。
  </Step>
  <Step title="在前缀下安装 OpenClaw">
    - `npm` 方式（默认）：通过 npm 安装到前缀下，然后将包装器写入 `<prefix>/bin/openclaw`
    - `git` 方式：克隆/更新一个检出目录（默认 `~/openclaw`），并仍然将包装器写入 `<prefix>/bin/openclaw`

  </Step>
  <Step title="刷新已加载的网关服务">
    如果已有网关服务从同一前缀加载，脚本会运行
    `openclaw gateway install --force`，然后运行 `openclaw gateway restart`，
    并尽力探测网关健康状态。
  </Step>
</Steps>

### 示例 (install-cli.sh)

<Tabs>
  <Tab title="默认">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```
  </Tab>
  <Tab title="自定义前缀 + 版本">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest
    ```
  </Tab>
  <Tab title="Git 安装">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw
    ```
  </Tab>
  <Tab title="自动化 JSON 输出">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab title="运行引导">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                                    | Description                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `--prefix <path>`                       | 安装前缀（默认：`~/.openclaw`）                                                  |
| `--install-method \| --method npm\|git` | 选择安装方式（默认：`npm`）                                                     |
| `--npm`                                 | npm 方式快捷选项                                                               |
| `--git \| --github`                     | git 方式快捷选项                                                               |
| `--git-dir \| --dir <path>`             | Git 检出目录（默认：`~/openclaw`）                                              |
| `--version <ver>`                       | OpenClaw 版本或 dist-tag（默认：`latest`）                                      |
| `--node-version <ver>`                  | Node 版本（默认：`22.22.0`）                                                    |
| `--json`                                | 输出 NDJSON 事件                                                               |
| `--onboard`                             | 安装后运行 `openclaw onboard`                                                  |
| `--no-onboard`                          | 跳过引导（默认）                                                               |
| `--set-npm-prefix`                      | 在 Linux 上，如果当前前缀不可写，则强制将 npm 前缀设为 `~/.npm-global`         |
| `--help \| -h`                          | 显示用法                                                                      |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                    | Description                                                        |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                                                         |
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
`openclaw@main` 和其他 GitHub 源规格并不是 npm 安装可用的 `--version` 目标。请改用 `--install-method git --version main`。
</Note>

---

<a id="installps1"></a>

## install.ps1

### 流程（install.ps1）

<Steps>
  <Step title="确保 PowerShell + Windows 环境">
    需要 PowerShell 5+。
  </Step>
  <Step title="默认确保 Node.js 24">
    如果缺失，会先尝试通过 winget 安装，然后是 Chocolatey，最后是 Scoop。如果没有可用的包管理器，脚本会将官方 Node.js 24 Windows zip 下载到 `%LOCALAPPDATA%\OpenClaw\deps\portable-node`，并将其添加到当前进程和用户 PATH 中。为兼容性起见，仍支持 Node 22.19+ 和 23.11+。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方法（默认）：使用所选的 `-Tag` 进行全局 npm 安装，并从可写的安装临时目录启动，因此即使在受保护的文件夹（如 `C:\`）中打开的 shell 也能正常工作
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装器。如果缺少 Git，脚本会在 `%LOCALAPPDATA%\OpenClaw\deps\portable-git` 下引导安装用户本地 MinGit，并将其添加到当前进程和用户 PATH。

  </Step>
  <Step title="安装后任务">
    - 在可能的情况下，将所需的 bin 目录添加到用户 PATH
    - 最佳努力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（最佳努力）

  </Step>
  <Step title="处理失败">
    `iwr ... | iex` 和 scriptblock 安装会报告终止性错误，但不会关闭当前 PowerShell 会话。直接通过 `powershell -File` / `pwsh -File` 安装时仍会以非零状态退出，便于自动化处理。
  </Step>
</Steps>

### 示例（install.ps1）

<Tabs>
  <Tab title="默认">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
  <Tab title="Git 安装">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git
    ```
  </Tab>
  <Tab title="GitHub main 检出">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -Tag main
    ```
  </Tab>
  <Tab title="自定义 git 目录">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw"
    ```
  </Tab>
  <Tab title="试运行">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                        | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                                     |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或包规范（默认：`latest`）               |
| `-GitDir <path>`            | 检出目录（默认：`%USERPROFILE%\openclaw`）                 |
| `-NoOnboard`                | 跳过引导流程                                              |
| `-NoGitUpdate`              | 跳过 `git pull`                                           |
| `-DryRun`                   | 仅打印操作                                                |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                           | Description        |
| ---------------------------------- | ------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方法           |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录           |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过引导流程       |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull      |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式         |

  </Accordion>
</AccordionGroup>

<Note>
如果使用了 `-InstallMethod git` 且缺少 Git，脚本会先尝试引导安装用户本地 MinGit，然后再打印 Git for Windows 链接。
</Note>

---

## CI 和自动化

使用非交互标志/环境变量以获得可预测的运行结果。

<Tabs>
  <Tab title="install.sh（非交互 npm）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard
    ```
  </Tab>
  <Tab title="install.sh（非交互 git）">
    ```bash
    OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \
      curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="install-cli.sh（JSON）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab title="install.ps1（跳过引导）">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## 故障排查

<AccordionGroup>
  <Accordion title="为什么需要 Git？">
    `git` 安装方式需要 Git。对于 `npm` 安装，仍会检查/安装 Git，以避免依赖使用 git URL 时出现 `spawn git ENOENT` 失败。
  </Accordion>

  <Accordion title="为什么 npm 在 Linux 上会遇到 EACCES？">
    某些 Linux 环境会将 npm 的全局前缀指向由 root 拥有的路径。`install.sh` 可以将前缀切换为 `~/.npm-global`，并把 PATH 导出项追加到 shell 的 rc 文件中（如果这些文件存在）。
  </Accordion>

  <Accordion title='Windows: "npm error spawn git / ENOENT"'>
    重新运行安装程序，让它引导安装用户本地 MinGit，或者安装 Git for Windows 后重新打开 PowerShell。
  </Accordion>

  <Accordion title='Windows: "openclaw is not recognized"'>
    运行 `npm config get prefix`，并将该目录添加到你的用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。
  </Accordion>

  <Accordion title="Windows: how to get verbose installer output">
    `install.ps1` 不提供 `-Verbose` 开关。
    使用 PowerShell 跟踪来进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安装后找不到 openclaw">
    通常是 PATH 问题。请参见 [Node.js 故障排查](/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## 相关内容

- [安装概览](/install)
- [更新](/install/updating)
- [卸载](/install/uninstall)