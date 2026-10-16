---
summary: "安装 OpenClaw - 桌面应用程序下载、安装程序脚本、npm/pnpm/bun、来自源、Docker 等"
read_when:
  - "当你需要除“入门”快速开始之外的安装方式时"
  - "您想要下载 Windows Hub 或 macOS 桌面应用程序而不是 CLI"
  - "当你想部署到云平台时"
  - "当你需要更新、迁移或卸载时"
title: "安装"
---

## <a id="system-requirements"></a> 系统要求

- **Node 24.16+ or 26.1+** - Node 26被推荐；安装者规定Node 26 on macOS和Node 24 LTS on Linux什么时候Node缺失（参见[Node.js兼容性](/install/node-compatibility)）。
- **macOS、Linux 或 Windows** - Windows 用户可以从原生 Windows Hub 应用、PowerShell CLI 安装程序或 WSL2 Gateway 开始。请参阅 [Windows](/platforms/windows)。
- 只有在从源代码构建时才需要 `pnpm`。

## <a id="download-the-desktop-app"></a> 下载桌面应用程序

更喜欢普通的应用程序下载而不是 CLI？ OpenClaw 附带桌面伴侣：

- **Windows（推荐）**：本机 [Windows Hub](/platforms/windows#recommended-windows-hub) 配套应用程序 — 您可以像任何 Windows 应用程序一样下载和运行的签名安装程序，具有设置、托盘状态、聊天和节点模式：
  - [OpenClawCompanion-设置-x64.exe](https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-x64.exe)
  - [OpenClawCompanion-设置-arm64.exe](https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-arm64.exe)
  - 所有 Hub 版本：[Windows Hub 发布页面](https://github.com/openclaw/openclaw-windows-node/releases/latest)
- **macOS**：[macOS 菜单栏应用程序](/platforms/macos) — 从以下位置下载 `OpenClaw-<version>.dmg`（首选）或 `.zip` 资源[OpenClaw GitHub 发布](https://github.com/openclaw/openclaw/releases)，然后安装并启动**OpenClaw.app**。有关详细信息，请参阅 [macOS 应用程序页面](/platforms/macos)，包括当最新版本未提供 macOS 资产时应执行的操作。

在 Windows 上，跨平台 [Tauri 桌面应用程序](/platforms/windows#backup-tauri-desktop-app) 是备份选项。其 `OpenClaw-<version>-windows-x86_64.exe` 安装程序随常规 [OpenClaw 版本 ](https://github.com/openclaw/openclaw/releases) 一起提供，并且可以设置带有捆绑的 Bun 的本地 Windows 网关或远程连接。

两个本机桌面应用程序都可以在首次运行设置期间配置本地网关，或连接到现有的远程网关。

## <a id="recommended%3A-installer-script"></a><a id="recommended-installer-script"></a> 推荐：安装脚本

最快的安装方式。它会检测您的 OS，根据需要安装 Node，安装 OpenClaw，然后启动登录。

<Note>
对于 Windows 桌面设置，我们建议使用本机 [Windows Hub](/platforms/windows#recommended-windows-hub) 配套应用程序，其中包括设置、托盘状态、聊天、节点模式和本地 MCP 模式。
</Note>

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
</Tabs>

若要安装但不运行引导流程：

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

对于所有标志和 CI/automation 选项，请参阅 [Installer 内部 ](/install/installer)。

## <a id="alternative-install-methods"></a> 其他安装方式

### <a id="local-prefix-installer-(install-cli.sh)"></a><a id="local-prefix-installer-install-cli-sh"></a> 本地前缀安装器（`install-cli.sh`）

当你希望将 OpenClaw 和 Node 保持在本地前缀下，例如 `~/.openclaw`，而不依赖系统级 Node 安装时，请使用此方式：

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

默认支持 npm 安装，并且也支持在相同前缀流程下进行 git 检出安装。完整参考：[安装程序内部机制](/install/installer#install-clish)。

已经安装好了？可通过 `openclaw update --channel dev` 和 `openclaw update --channel stable` 在包安装和 git 安装之间切换。请参阅 [更新](/install/updating#switch-between-npm-and-git-installs)。

### <a id="npm%2C-pnpm%2C-or-bun"></a><a id="npm-pnpm-or-bun"></a> npm、pnpm 或 bun

如果你已经自行管理 Node：

<Tabs>
  <Tab title="npm">
    On npm 12 or npm 11.16+:

    ```bash
    npm install -g openclaw@latest --allow-scripts=openclaw
    openclaw onboard --install-daemon
    ```

    在 npm 11.15 及更早版本上，使用相同的命令而不使用 `--allow-scripts=openclaw`。

    <Note>
    npm 12 默认情况下会阻止未经批准的包生命周期脚本。 `--allow-scripts=openclaw` 选项明确允许 OpenClaw 的 `preinstall` 和 `postinstall` 步骤；如果没有它，npm 将它们报告为 `blocked because they are not covered by allowScripts`。

    npm 11.16 接受该选项，但仅警告脚本是 `not yet covered by allowScripts` 并且仍然运行它们。 npm 11.15 及更早版本既没有策略也没有选项，因此必须取消标记它们的命令。 npm 11.16 建议的 `npm approve-scripts openclaw` 命令不适用于全局安装 - 它会失败并显示 `ENOMATCH  No installed packages match: openclaw`。
    </Note>

    <Note>
    托管安装程序清除 npm 新鲜度过滤器，例如用于 OpenClaw 软件包安装的 `min-release-age`。如果您使用 npm 手动安装，您自己的 npm 策略仍然适用。
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g --allow-build=openclaw openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 需要对带有构建脚本的包进行明确批准。全局安装不支持 `approve-builds -g`，因此请在 `pnpm add -g` 命令上传递 `--allow-build=openclaw`。
    </Note>

  </Tab>
  <Tab id="bun" title="包子">
    ```bash
    bun add -g --trust openclaw@latest
    bun run --bun openclaw onboard --install-daemon --daemon-runtime bun
    ```

    <Note>
    `--trust` 允许使用 OpenClaw 的软件包生命周期脚本进行此安装。 Bun 1.4.3 或更新版本还可以运行 OpenClaw 的 CLI、本地代理和网关。 Node 仍然是主要运行时，因此普通的 `openclaw` 可执行文件保留其 Node shebang。 `bun run --bun` 强制使用 Bun 运行时，而 `--daemon-runtime bun` 在 Bun 下安装受管网关。
    </Note>

  </Tab>
</Tabs>

### <a id="from-source"></a> 来自源码

适用于贡献者或任何想要从本地检出版本运行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
corepack enable
pnpm install && pnpm build && pnpm ui:build
pnpm add --global "openclaw@link:$PWD"
openclaw onboard --install-daemon
```

`pnpm add --global "openclaw@link:$PWD"` 将 CLI 链接到此签出，而不更改其包文件。如果 pnpm 报告其全局 bin 目录不在 `PATH` 上，请运行 `pnpm setup`，重新打开 shell，然后重试。

对于仅运行 OpenClaw 的服务器签出，请使用 `pnpm build:runtime` 构建 JavaScript、插件、Control UI 和元数据，而无需 TypeScript 声明。使用`pnpm build`进行需要声明及其验证的开发或包装； CI 类型检查仍然适用于仅运行时的构建。

Corepack 从 `package.json`（当前为 pnpm 12）中选择确切的 pnpm 版本。如果 Corepack 不可用，请从结帐中读取该版本并显式安装它：

```bash
pnpm_spec=$(node -p "require('./package.json').packageManager.split('+')[0]")
npm install -g "$pnpm_spec" --allow-scripts="$pnpm_spec"
```

`+` 后缀记录 Corepack 的完整性哈希，不是 npm 包说明符的一部分。保持 npm 安装脚本和可选依赖项启用，以便 pnpm 可以配置其本机可执行文件。

或者跳过全局安装并从存储库内部使用 `pnpm openclaw ...`。有关完整的开发工作流程，请参阅 [Setup](/start/setup)。

### <a id="standalone-builds"></a> 独立构建

对于没有单独安装 Node 或 Bun 的应用程序打包或部署，请从源构建可执行文件和配套运行时目录。有关模式、输出文件、签名和更新边界，请参阅 [Standalone builds](/install/standalone)。

### <a id="install-from-the-github-main-checkout"></a> 从 GitHub main 检出版本安装

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
```

### <a id="containers-and-package-managers"></a> 容器和包管理器

<CardGroup cols={2}>
  <Card title="安西布尔" href="/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    可选依赖安装器和包脚本运行器。
  </Card>
  <Card title="Docker" href="/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="尼克斯" href="/install/nix" icon="snowflake">
    通过 Nix flake 进行声明式安装。
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    Docker 的无 root 容器替代方案。
  </Card>
</CardGroup>

## <a id="verify-the-install"></a> 验证安装

```bash
openclaw --version      # confirm the CLI is available
openclaw doctor         # check for config issues
openclaw gateway status # verify the Gateway is running
```

如果你希望安装后由系统托管启动：

- macOS：通过 `openclaw onboard --install-daemon` 或 `openclaw gateway install` 创建 LaunchAgent
- Linux/WSL2：通过相同命令创建 systemd 用户服务
- 原生 Windows：优先使用计划任务；如果创建任务被拒绝，则回退为每用户的 Startup 文件夹登录项

## <a id="next%3A-run-onboarding-and-connect-a-channel"></a><a id="next-run-onboarding-and-connect-a-channel"></a> Next：运行载入并连接通道

<CardGroup cols={2}>
  <Card title="入门" href="/start/getting-started" icon="rocket">
    运行入门，安装网关服务，然后打开仪表板。
  </Card>
  <Card title="连接渠道" href="/channels" icon="message-square">
    通过 Telegram、Discord、Slack、WhatsApp 等向您的代理发送消息。
  </Card>
</CardGroup>

## <a id="hosting-and-deployment"></a> 托管与部署

在云服务器或VPS上部署OpenClaw。请参阅 [Linux 服务器](/vps) 了解完整的提供商选择器（DigitalOcean、Hetzner、Hostinger、Fly.io、GCP、Azure、Railway、Northflank、Oracle Cloud、 Raspberry Pi 等），在 [Render](/install/render) 上以声明方式部署，或尝试实验性 [Cloudflare Containers](/install/cloudflare) 模板。

<CardGroup cols={3}>
  <Card title="Cloudflare" href="/install/cloudflare">
    实验性的 Worker + Container 部署。
  </Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">
    共享 Docker 步骤。
  </Card>
  <Card title="Kubernetes" href="/install/kubernetes">
    K8s 部署。
  </Card>
  <Card title="macOS VM" href="/install/macos-vm">
    隔离本地或托管 macOS 部署。
  </Card>
  <Card title="上传盒子" href="/install/upstash">
    通过 SSH- 隧道访问托管 Linux 主机。
  </Card>
  <Card title="VPS" href="/vps">
    选择一个提供商。
  </Card>
</CardGroup>

## <a id="back-up%2C-update%2C-migrate%2C-or-uninstall"></a><a id="back-up-update-migrate-or-uninstall"></a> 备份、更新、迁移或卸载

<CardGroup cols={3}>
  <Card title="备份" href="/install/backups" icon="archive">
    创建、验证和恢复状态档案。
  </Card>
  <Card title="更新" href="/install/updating" icon="refresh-cw">
    使 OpenClaw 保持最新。
  </Card>
  <Card title="迁移" href="/install/migrating" icon="arrow-right">
    迁移到新机器。
  </Card>
  <Card title="卸载" href="/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

## <a id="troubleshooting%3A-openclaw-not-found"></a><a id="troubleshooting-openclaw-not-found"></a> 故障排查：找不到 `openclaw`

这几乎总是一个 PATH 问题：npm 的全局 bin 目录不在你的 shell 的 `PATH` 中。请参阅 [Node.js 故障排查](/install/node#troubleshooting) 获取完整修复方法，包括 Windows 路径。

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```
