---
summary: "安装器脚本的工作原理（install.sh、install-cli.sh、install.ps1）、标志和自动化"
read_when:
  - 你想了解 `openclaw.ai/install.sh`
  - 你想自动化安装（CI / 无头环境）
  - 你想从 GitHub 检出版本进行安装
title: "安装器内部实现"
---

OpenClaw 提供了三个安装器脚本，由 `openclaw.ai` 托管。

| Script                             | Platform             | What it does                                                                                                   |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 如有需要会安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并且可以运行 onboarding。                         |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 使用 npm 或 git 检出模式，将 Node + OpenClaw 安装到本地前缀（`~/.openclaw`）下。无需 root 权限。              |
| [`install.ps1`](#installps1)       | Windows（PowerShell） | 如有需要会安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并且可以运行 onboarding。                         |

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
如果安装成功但在新的终端中找不到 `openclaw`，请查看 [Node.js 故障排查](/install/node#troubleshooting)。
</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>
推荐用于 macOS/Linux/WSL 上的大多数交互式安装。
</Tip>

### 流程（install.sh）

<Steps>
  <Step title="检测操作系统">
    支持 macOS 和 Linux（包括 WSL）。如果检测到 macOS，并且缺少 Homebrew，则会安装它。
  </Step>
  <Step title="默认确保 Node.js 24">
    检查 Node 版本，并在需要时安装 Node 24（macOS 上使用 Homebrew，Linux 上使用 NodeSource 设置脚本，适用于 apt/dnf/yum）。为兼容性起见，OpenClaw 仍支持 Node 22 LTS，目前为 `22.14+`。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，则安装它。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方式（默认）：全局 npm 安装
    - `git` 方式：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后在 `~/.local/bin/openclaw` 处安装包装器

  </Step>
  <Step title="安装后任务">
    - 尽力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装后运行 `openclaw doctor --non-interactive`（尽力而为）
    - 在合适时尝试 onboarding（TTY 可用、未禁用 onboarding，且 bootstrap/config 检查通过）
    - 默认设置 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`

  </Step>
</Steps>

### 源码检出检测

如果在 OpenClaw 检出目录中运行（`package.json` + `pnpm-workspace.yaml`），脚本会提供：

- 使用检出版本（`git`），或
- 使用全局安装（`npm`）

如果没有可用的 TTY 且未设置安装方式，则默认使用 `npm` 并给出警告。

如果方法选择无效或 `--install-method` 值无效，脚本会以代码 `2` 退出。

### 示例（install.sh）

<Tabs>
  <Tab title="默认">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="跳过 onboarding">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Git 安装">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```
  </Tab>
  <Tab title="通过 npm 安装 GitHub main">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main
    ```
  </Tab>
  <Tab title="Dry run">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                                  | Description                                                |
| ------------------------------------- | ---------------------------------------------------------- |
| `--install-method npm\|git`           | 选择安装方式（默认：`npm`）。别名：`--method`              |
| `--npm`                               | npm 方式快捷写法                                           |
| `--git`                               | git 方式快捷写法。别名：`--github`                         |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或包规格（默认：`latest`）              |
| `--beta`                              | 如果可用则使用 beta dist-tag，否则回退到 `latest`         |
| `--git-dir <path>`                    | 检出目录（默认：`~/openclaw`）。别名：`--dir`              |
| `--no-git-update`                     | 跳过现有检出版本的 `git pull`                              |
| `--no-prompt`                        | 禁用提示                                                  |
| `--no-onboard`                        | 跳过 onboarding                                           |
| `--onboard`                           | 启用 onboarding                                           |
| `--dry-run`                           | 打印操作但不应用更改                                       |
| `--verbose`                           | 启用调试输出（`set -x`、npm notice 级别日志）             |
| `--help`                              | 显示用法（`-h`）                                           |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                                | Description                                   |
| ------------------------------------------------------- | --------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安装方式                                      |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或包规格                   |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用则使用 beta                          |
| `OPENCLAW_GIT_DIR=<path>`                               | 检出目录                                      |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切换 git 更新                                  |
| `OPENCLAW_NO_PROMPT=1`                                  | 禁用提示                                      |
| `OPENCLAW_NO_ONBOARD=1`                                  | 跳过 onboarding                               |
| `OPENCLAW_DRY_RUN=1`                                    | Dry run 模式                                  |
| `OPENCLAW_VERBOSE=1`                                    | 调试模式                                      |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日志级别                                  |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行为（默认：`1`）           |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>
专为希望将所有内容放在本地前缀下
（默认 `~/.openclaw`），且不依赖系统 Node 的环境而设计。默认支持 npm 安装，
并在相同前缀流程下支持 git 检出安装。
</Info>

### 流程（install-cli.sh）

<Steps>
  <Step title="安装本地 Node 运行时">
    下载一个固定版本、受支持的 Node LTS tarball（版本写入脚本中，并独立更新）到 `<prefix>/tools/node-v<version>`，并校验 SHA-256。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，则尝试在 Linux 上通过 apt/dnf/yum 安装，或在 macOS 上通过 Homebrew 安装。
  </Step>
  <Step title="在前缀下安装 OpenClaw">
    - `npm` 方式（默认）：通过 npm 安装到前缀下，然后将包装器写入 `<prefix>/bin/openclaw`
    - `git` 方式：克隆/更新检出目录（默认 `~/openclaw`），并仍然将包装器写入 `<prefix>/bin/openclaw`

  </Step>
  <Step title="刷新已加载的 gateway 服务">
    如果已有 gateway 服务从相同前缀加载，脚本会运行
    `openclaw gateway install --force`，然后运行 `openclaw gateway restart`，
    并尽力探测 gateway 健康状态。
  </Step>
</Steps>

### 示例（install-cli.sh）

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
  <Tab title="运行 onboarding">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag                        | Description                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `--prefix <path>`           | 安装前缀（默认：`~/.openclaw`）                                                 |
| `--install-method npm\|git` | 选择安装方式（默认：`npm`）。别名：`--method`                                  |
| `--npm`                     | npm 方式快捷写法                                                                 |
| `--git`, `--github`         | git 方式快捷写法                                                                 |
| `--git-dir <path>`          | Git 检出目录（默认：`~/openclaw`）。别名：`--dir`                               |
| `--version <ver>`           | OpenClaw 版本或 dist-tag（默认：`latest`）                                      |
| `--node-version <ver>`      | Node 版本（默认：`22.22.0`）                                                     |
| `--json`                    | 输出 NDJSON 事件                                                               |
| `--onboard`                 | 安装后运行 `openclaw onboard`                                                   |
| `--no-onboard`              | 跳过 onboarding（默认）                                                         |
| `--set-npm-prefix`          | 在 Linux 上，如果当前 prefix 不可写，则强制将 npm prefix 设为 `~/.npm-global` |
| `--help`                    | 显示用法（`-h`）                                                                 |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                    | Description                                   |
| ------------------------------------------- | --------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                                      |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | 安装方式                                      |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或 dist-tag                      |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                                      |
| `OPENCLAW_GIT_DIR=<path>`                   | git 安装的 Git 检出目录                       |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | 切换现有检出版本的 git 更新                   |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳过 onboarding                               |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日志级别                                  |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行为（默认：`1`）           |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### 流程（install.ps1）

<Steps>
  <Step title="确保 PowerShell + Windows 环境">
    需要 PowerShell 5+。
  </Step>
  <Step title="默认确保安装 Node.js 24">
    如果缺失，会先尝试通过 winget 安装，然后是 Chocolatey，最后是 Scoop。为了兼容性，Node 22 LTS（当前为 `22.14+`）仍受支持。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方法（默认）：使用所选 `-Tag` 进行全局 npm 安装
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安装包装器

  </Step>
  <Step title="安装后任务">
    - 在可行时将所需的 bin 目录添加到用户 PATH
    - 尽力刷新已加载的网关服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）

  </Step>
  <Step title="处理失败">
    `iwr ... | iex` 和 scriptblock 安装会报告终止性错误，但不会关闭当前 PowerShell 会话。直接使用 `powershell -File` / `pwsh -File` 安装时仍会以非零退出，便于自动化处理。
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
  <Tab title="通过 npm 安装 GitHub main">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
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
  <Tab title="调试跟踪">
    ```powershell
    # install.ps1 目前还没有专门的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| 标志                        | 描述                                                   |
| --------------------------- | ------------------------------------------------------ |
| `-InstallMethod npm\|git`   | 安装方式（默认：`npm`）                                 |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或包规范（默认：`latest`）            |
| `-GitDir <path>`            | 检出目录（默认：`%USERPROFILE%\openclaw`）              |
| `-NoOnboard`                | 跳过 onboarding                                       |
| `-NoGitUpdate`              | 跳过 `git pull`                                         |
| `-DryRun`                   | 仅打印操作                                             |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                              | 描述        |
| --------------------------------- | ----------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方式    |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录    |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过 onboarding |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式  |

  </Accordion>
</AccordionGroup>

<Note>
如果使用 `-InstallMethod git` 且 Git 缺失，脚本会退出并打印 Git for Windows 链接。
</Note>

---

## CI 和自动化

使用非交互式标志/环境变量以获得可预测的运行结果。

<Tabs>
  <Tab title="install.sh（非交互式 npm）">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard
    ```
  </Tab>
  <Tab title="install.sh（非交互式 git）">
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
  <Tab title="install.ps1（跳过 onboarding）">
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
    某些 Linux 配置会将 npm 全局前缀指向 root 拥有的路径。`install.sh` 可以将前缀切换到 `~/.npm-global`，并将 PATH 导出追加到 shell rc 文件中（当这些文件存在时）。
  </Accordion>

  <Accordion title="sharp/libvips 问题">
    脚本默认设置 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`，以避免 sharp 使用系统 libvips 进行构建。若要覆盖：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

  <Accordion title='Windows: "npm error spawn git / ENOENT"'>
    安装 Git for Windows，重新打开 PowerShell，然后重新运行安装程序。
  </Accordion>

  <Accordion title='Windows: "openclaw is not recognized"'>
    运行 `npm config get prefix`，并将该目录添加到用户 PATH（在 Windows 上不需要 `\bin` 后缀），然后重新打开 PowerShell。
  </Accordion>

  <Accordion title="Windows: 如何获取详细的安装程序输出">
    `install.ps1` 当前没有提供 `-Verbose` 开关。
    使用 PowerShell 跟踪来进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安装后找不到 openclaw">
    通常是 PATH 问题。请参阅 [Node.js 故障排查](/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## 相关内容

- [安装概览](/install)
- [更新](/install/updating)
- [卸载](/install/uninstall)
