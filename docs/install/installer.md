## install.ps1

<Warning>
Windows 安装器遵循与 `install.sh` 类似的高级流程，但会使用 PowerShell 友好的检测与安装方式（例如使用 winget/choco/scoop，具体取决于可用情况）。
</Warning>

### 流程（install.ps1）

<Steps>
  <Step title="确保 Node.js">
    检查是否存在受支持的 Node 版本，并在需要时安装。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，则安装它。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方式（默认）：全局 npm 安装
    - `git` 方式：克隆/更新仓库，安装依赖，构建，然后安装包装器/命令入口

  </Step>
  <Step title="安装后任务">
    - 尝试刷新 gateway 服务
    - 在合适时运行 onboarding
    - 支持 dry run / 非交互式自动化

  </Step>
</Steps>

### 示例（install.ps1）

<Tabs>
  <Tab title="默认">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
  <Tab title="Beta + 跳过 onboarding">
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
建议用于在 macOS/Linux/WSL 上进行大多数交互式安装。
</Tip>

### 流程（install.sh）

<Steps>
  <Step title="检测操作系统">
    支持 macOS 和 Linux（包括 WSL）。如果检测到 macOS 且未安装 Homebrew，则会安装 Homebrew。
  </Step>
  <Step title="默认确保 Node.js 24">
    检查 Node 版本，并在需要时安装 Node 24（macOS 上使用 Homebrew，Linux 上使用 NodeSource 设置脚本配合 apt/dnf/yum）。为兼容性起见，OpenClaw 仍支持 Node 22 LTS，目前为 `22.16+`。
  </Step>
  <Step title="确保 Git">
    如果缺少 Git，则安装它。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方法（默认）：全局 npm 安装
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装依赖，构建，然后将包装器安装到 `~/.local/bin/openclaw`

  </Step>
  <Step title="安装后任务">
    - 尽力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）
    - 在合适时尝试 onboarding（TTY 可用、未禁用 onboarding，且 bootstrap/config 检查通过）
    - 默认设置 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`

  </Step>
</Steps>

### 源代码检出检测

如果在 OpenClaw 检出目录中运行（`package.json` + `pnpm-workspace.yaml`），脚本会提供以下选项：

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
  <Tab title="Git 安装">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "$HOME\openclaw"
    ```
  </Tab>
  <Tab title="Dry run">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="标志参考">

| Flag | Description |
| ---- | ----------- |
| `--install-method npm\|git` | 选择安装方式（默认：`npm`） |
| `-Version <version>` | 包版本、dist-tag 或规格 |
| `-Beta` | 如果可用则使用 beta |
| `-GitDir <path>` | Git 检出目录 |
| `-NoPrompt` | 禁用提示 |
| `-NoOnboard` | 跳过 onboarding |
| `-Onboard` | 安装后运行 onboarding |
| `-DryRun` | 打印计划中的操作 |
| `-Verbose` | 启用详细输出 |
| `-Help` | 显示帮助 |

  </Accordion>
</AccordionGroup>

## 自动化说明

对于 CI、容器或其他无头环境：

- 优先使用明确的标志/环境变量，而不是交互式提示
- 在不需要用户设置时使用 `--no-onboard` / `-NoOnboard`
- 使用 `--dry-run`、`--json` 或详细日志先行验证行为
- 在 Linux/macOS 上，如果希望本地化、无 root 的安装，优先使用 `install-cli.sh`
- 如果从 GitHub 检出版本安装，请确保构建工具和 `pnpm` 可用

## 从 GitHub 检出版本安装

当使用 git 安装方式时，安装器通常会：

1. 克隆仓库（如果尚不存在）
2. 拉取最新更改（除非禁用更新）
3. 安装依赖
4. 构建项目
5. 将 `openclaw` 命令连接到已构建的检出版本

这在以下情况下很有用：

- 测试 `main`
- 使用尚未发布的更改
- 开发或调试 OpenClaw 本身

## 故障排查提示

- 如果 `openclaw` 已安装但无法找到，请检查你的 `PATH`
- 如果全局 npm 安装失败，请考虑使用 `install-cli.sh`
- 如果 gateway 未刷新，请手动运行 `openclaw gateway install --force`
- 如果 Node 版本过旧，请重新运行安装器，让其升级受支持的 Node 版本

## 相关内容

- [Node.js 故障排查](/install/node#troubleshooting)
- [OpenClaw Gateway](/gateway)
- [Onboarding](/onboarding)

## install.ps1

### 流程（install.ps1）

<Steps>
  <Step title="确保 PowerShell + Windows 环境">
    需要 PowerShell 5+。
  </Step>
  <Step title="默认确保 Node.js 24">
    如果缺少，则尝试依次通过 winget、Chocolatey、Scoop 安装。为兼容性起见，仍支持 Node 22 LTS，目前为 `22.16+`。
  </Step>
  <Step title="安装 OpenClaw">
    - `npm` 方法（默认）：使用所选的 `-Tag` 进行全局 npm 安装，从可写的安装程序临时目录启动，因此在诸如 `C:\` 之类的受保护文件夹中打开的 shell 仍然可以工作
    - `git` 方法：克隆/更新仓库，使用 pnpm 安装/构建，并将包装器安装到 `%USERPROFILE%\.local\bin\openclaw.cmd`

  </Step>
  <Step title="安装后任务">
    - 在可行时将所需的 bin 目录添加到用户 PATH
    - 尽力刷新已加载的 gateway 服务（`openclaw gateway install --force`，然后重启）
    - 在升级和 git 安装时运行 `openclaw doctor --non-interactive`（尽力而为）

  </Step>
  <Step title="处理失败">
    `iwr ... | iex` 和 scriptblock 安装会报告终止性错误，但不会关闭当前 PowerShell 会话。直接使用 `powershell -File` / `pwsh -File` 仍会以非零状态退出，以便自动化处理。
  </Step>
</Steps>

### 示例（install.ps1）

<Tabs>
  <Tab title="默认">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
  <Tab title="Git install">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git
    ```
  </Tab>
  <Tab title="Install GitHub main via npm">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw"
    ```
  </Tab>
  <Tab title="试运行">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
  <Tab title="Debug tracing">
    ```powershell
    # install.ps1 当前没有专用的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flag reference">

| 标志                        | 描述                                                   |
| --------------------------- | ------------------------------------------------------ |
| `-InstallMethod npm\|git`   | 安装方法（默认：`npm`）                                 |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或包规范（默认：`latest`）            |
| `-GitDir <path>`            | 检出目录（默认：`%USERPROFILE%\openclaw`）              |
| `-NoOnboard`                | 跳过 onboarding                                       |
| `-NoGitUpdate`              | 跳过 `git pull`                                         |
| `-DryRun`                   | 仅打印操作                                             |

  </Accordion>

  <Accordion title="Environment variable reference">

| 变量                              | 描述           |
| --------------------------------- | -------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安装方法       |
| `OPENCLAW_GIT_DIR=<path>`          | 检出目录       |
| `OPENCLAW_NO_ONBOARD=1`            | 跳过 onboarding |
| `OPENCLAW_GIT_UPDATE=0`            | 禁用 git pull  |
| `OPENCLAW_DRY_RUN=1`               | 试运行模式     |

  </Accordion>
</AccordionGroup>

<Note>
如果使用 `-InstallMethod git` 且缺少 Git，脚本会退出并打印 Git for Windows 链接。
</Note>

---

## CI and automation

对可预测的运行使用非交互式标志/环境变量。

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
    `git` 安装方式需要 Git。对于 `npm` 安装，仍会检查/安装 Git，以避免依赖项使用 git URL 时出现 `spawn git ENOENT` 失败。
  </Accordion>

  <Accordion title="为什么 npm 在 Linux 上会遇到 EACCES？">
    某些 Linux 配置会将 npm 全局前缀指向 root 拥有的路径。`install.sh` 可以将前缀切换到 `~/.npm-global`，并将 PATH 导出追加到 shell rc 文件（如果存在）。
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

  <Accordion title="Windows: how to get verbose installer output">
    `install.ps1` 当前没有提供 `-Verbose` 开关。
    使用 PowerShell 跟踪进行脚本级诊断：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="Can't find openclaw after install">
    这通常是 PATH 问题。请参阅 [Node.js 故障排查](/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## 另请参阅

- [安装概览](/install)
- [更新](/install/updating)
- [卸载](/install/uninstall)
