---
summary: "安装脚本的工作原理（install.sh、install-cli.sh、install.ps1）、参数及自动化"
read_when:
  - 你想了解 `openclaw.ai/install.sh`
  - 你想自动化安装（CI / 无头环境）
  - 你想从 GitHub 源码安装
title: "安装器内部原理"
---

# 安装器内部原理

OpenClaw 提供了三个安装脚本，由 `openclaw.ai` 提供。

| 脚本                              | 平台                  | 功能                                                                                      |
| --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL   | 如有必要安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并可运行引导流程。                |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL   | 在本地前缀目录（`~/.openclaw`）安装 Node + OpenClaw，无需 root 权限。                     |
| [`install.ps1`](#installps1)       | Windows (PowerShell)  | 如有必要安装 Node，通过 npm（默认）或 git 安装 OpenClaw，并可运行引导流程。                |

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
如果安装成功但新终端中找不到 `openclaw`，请参见 [Node.js 故障排查](/install/node#troubleshooting)。
</Note>

---

## install.sh

<Tip>
推荐用于 macOS/Linux/WSL 上的大多数交互式安装。
</Tip>

### 流程（install.sh）

<Steps>
  <Step title="检测操作系统">
    支持 macOS 和 Linux（包括 WSL）。检测到 macOS 时，如缺少 Homebrew，则安装 Homebrew。
  </Step>
  <Step title="确保默认使用 Node.js 24">
    检查 Node 版本，必要时安装 Node 24（macOS 使用 Homebrew，Linux 使用 NodeSource 设置脚本 apt/dnf/yum）。OpenClaw 仍支持 Node 22 LTS，目前为 `22.16+`，以保证兼容性。
  </Step>
  <Step title="确保 Git">
    如缺少 Git，则进行安装。
  </Step>
  <Step title="安装 OpenClaw">
    - 通过 `npm` 方法（默认）：全局 npm 安装
    - 通过 `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后在 `~/.local/bin/openclaw` 安装包装器
  </Step>
  <Step title="安装后任务">
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽最大努力）
    - 在合适时尝试引导（有 TTY，有权限，未禁用引导，且通过 bootstrap/config 检查）
    - 默认设定环境变量 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### 源码检出检测

如果在 OpenClaw 源码检出目录下运行（存在 `package.json` 和 `pnpm-workspace.yaml`），脚本会提供选择：

- 使用源码检出 (`git`)，或
- 使用全局安装 (`npm`)

若无 TTY 且未指定安装方式，默认为 `npm` 并给出警告。

如选择方式无效或 `--install-method` 值不正确，脚本以代码 `2` 退出。

### 示例（install.sh）

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
  <Tab title="GitHub main via npm">
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
  <Accordion title="参数参考">

| Flag                                  | Description                                                |
| ------------------------------------- | ---------------------------------------------------------- |
| `--install-method npm\|git`           | 选择安装方法（默认：`npm`）。别名：`--method`              |
| `--npm`                               | npm 方法快捷方式                                          |
| `--git`                               | git 方法快捷方式。别名：`--github`                         |
| `--version <version\|dist-tag\|spec>` | npm 版本、分发标签或包规范（默认：`latest`）               |
| `--beta`                              | 优先使用 beta 分发标签（若可用），否则回退至 `latest`        |
| `--git-dir <path>`                    | 源码检出目录（默认：`~/openclaw`）。别名：`--dir`           |
| `--no-git-update`                     | 跳过已有检出目录的 `git pull`                              |
| `--no-prompt`                         | 禁用提示                                                  |
| `--no-onboard`                        | 跳过引导                                                  |
| `--onboard`                           | 启用引导                                                  |
| `--dry-run`                           | 打印操作但不执行更改                                      |
| `--verbose`                           | 启用调试输出（`set -x`，npm 通知级别日志）                |
| `--help`                              | 显示用法（`-h`）                                         |

  </Accordion>

  <Accordion title="环境变量参考">

| Variable                                                | Description                                   |
| ------------------------------------------------------- | --------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安装方法                                    |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、分发标签或包规范                   |
| `OPENCLAW_BETA=0\|1`                                    | 如可用，使用 beta 版本                       |
| `OPENCLAW_GIT_DIR=<path>`                               | 源码检出目录                                |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 是否启用 git 更新                           |
| `OPENCLAW_NO_PROMPT=1`                                  | 禁用提示                                    |
| `OPENCLAW_NO_ONBOARD=1`                                 | 跳过引导                                    |
| `OPENCLAW_DRY_RUN=1`                                    | 演练模式                                    |
| `OPENCLAW_VERBOSE=1`                                    | 调试模式                                    |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日志级别                               |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行为（默认：`1`）         |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>
设计用于希望将所有内容安装到本地前缀目录（默认 `~/.openclaw`）且无系统 Node 依赖的环境。
</Info>

### 流程（install-cli.sh）

<Steps>
  <Step title="Install local Node runtime">
    Downloads a pinned supported Node LTS tarball (the version is embedded in the script and updated independently) to `<prefix>/tools/node-v<version>` and verifies SHA-256.
  </Step>
  <Step title="确保 Git">
    如缺少 Git，尝试在 Linux 上通过 apt/dnf/yum，macOS 上通过 Homebrew 安装。
  </Step>
  <Step title="在前缀目录安装 OpenClaw">
    使用 `npm` 并加 `--prefix <prefix>` 安装，然后写入包装器到 `<prefix>/bin/openclaw`。
  </Step>
</Steps>

### 示例（install-cli.sh）

<Tabs>
  <Tab title="默认">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```
  </Tab>
  <Tab title="自定义前缀与版本">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest
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
  <Accordion title="参数参考">

| 参数                  | 描述                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `--prefix <path>`     | 安装前缀目录（默认：`~/.openclaw`）                                           |
| `--version <ver>`     | OpenClaw 版本或分发标签（默认：`latest`）                                    |
| `--node-version <ver>` | Node 版本（默认：`22.22.0`）                                                 |
| `--json`              | 输出 NDJSON 事件                                                              |
| `--onboard`           | 安装后运行 `openclaw onboard`                                                 |
| `--no-onboard`        | 跳过引导（默认）                                                              |
| `--set-npm-prefix`    | Linux 下，如当前 prefix 不可写，强制将 npm prefix 设置为 `~/.npm-global`     |
| `--help`              | 显示用法帮助（`-h`）                                                         |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                                       | 描述                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | 安装前缀                                                               |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或分发标签                                               |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                                                             |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳过引导                                                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日志级别                                                        |
| `OPENCLAW_GIT_DIR=<path>`                   | 旧版清理查找路径（移除早期 `Peekaboo` 子模块源码时使用）            |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行为（默认：`1`）                                 |

  </Accordion>
</AccordionGroup>

---

## install.ps1

### 流程（install.ps1）

<Steps>
  <Step title="确保 PowerShell + Windows 环境">
    需要 PowerShell 5 及以上版本。
  </Step>
  <Step title="确保默认使用 Node.js 24">
    如缺少 Node，尝试先通过 winget 安装，再尝试 Chocolatey，最后尝试 Scoop。 Node 22 LTS，目前为 `22.16+`，仍然支持以保证兼容性。
  </Step>
  <Step title="安装 OpenClaw">
    - 通过 `npm` 方法（默认）：使用选定 `-Tag` 的全局 npm 安装
    - 通过 `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖并构建，然后安装包装器到 `%USERPROFILE%\.local\bin\openclaw.cmd`
  </Step>
  <Step title="安装后任务">
    尽可能将需要的 bin 目录添加到用户 PATH，然后升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽最大努力）。
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
  <Tab title="GitHub main via npm">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw"
    ```
  </Tab>
  <Tab title="演练模式">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
  <Tab title="调试跟踪">
    ```powershell
    # install.ps1 目前没有专门的 -Verbose 参数。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="参数参考">

| Flag                        | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                                    |
| `-Tag <tag\|version\|spec>` | npm 分发标签、版本或包规范（默认：`latest`）              |
| `-GitDir <path>`            | 源码检出目录（默认：`%USERPROFILE%\openclaw`）             |
| `-NoOnboard`                | 跳过引导                                                  |
| `-NoGitUpdate`              | 跳过 `git pull`                                           |
| `-DryRun`                   | 仅打印操作                                                |

  </Accordion>

  <Accordion title="环境变量参考">

| 变量                           | 描述         |
| ------------------------------ | ------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方式    |
| `OPENCLAW_GIT_DIR=<path>`      | 源码检出目录 |
| `OPENCLAW_NO_ONBOARD=1`        | 跳过引导     |
| `OPENCLAW_GIT_UPDATE=0`        | 禁用 git pull |
| `OPENCLAW_DRY_RUN=1`           | 演练模式     |

  </Accordion>
</AccordionGroup>

<Note>
如果使用 `-InstallMethod git` 且缺少 Git，脚本会退出并打印 Git for Windows 链接。
</Note>

---

## CI 与自动化

使用非交互参数/环境变量以确保运行可预测。

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
  <Tab title="install-cli.sh（JSON 输出）">
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
    Git 是 `git` 安装方式的必备工具。即使是 `npm` 安装方式，也会检测并安装 Git，以避免依赖回退到 git URL 导致的 `spawn git ENOENT` 错误。
  </Accordion>

  <Accordion title="为什么 Linux 上 npm 会遇到 EACCES 权限错误？">
    部分 Linux 配置会将 npm 全局前缀目录指向由 root 拥有的路径。`install.sh` 可以切换前缀到 `~/.npm-global` 并向 shell rc 文件追加 PATH 导出（当这些文件存在时）。
  </Accordion>

  <Accordion title="sharp/libvips 相关问题">
    脚本默认设置了 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 避免 sharp 编译时链接系统 libvips。如需覆盖：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Accordion>

  <Accordion title='Windows: "npm error spawn git / ENOENT" 错误'>
    请安装 Git for Windows，重新打开 PowerShell 后重新运行安装脚本。
  </Accordion>

  <Accordion title='Windows: "openclaw is not recognized" 错误'>
    运行 `npm config get prefix`，将该目录添加到用户 PATH（Windows 上无须 `\bin` 后缀），然后重新打开 PowerShell。
  </Accordion>

  <Accordion title="Windows: 如何获取安装器详细输出">
    `install.ps1` 目前不支持 `-Verbose` 参数。
    你可以使用 PowerShell 跟踪功能获取脚本级别诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```
  </Accordion>

  <Accordion title="安装后找不到 openclaw 命令">
    通常是 PATH 配置问题。请参考 [Node.js 故障排查](/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>