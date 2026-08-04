---
summary: "安装 OpenClaw - 安装脚本、npm/pnpm/bun、源码、Docker 等"
read_when:
  - 当你需要除“入门”快速开始之外的安装方式时
  - 当你想部署到云平台时
  - 当你需要更新、迁移或卸载时
title: "安装"
---

## 系统要求

- **Node 22.22.3+、24.15+ 或 25.9+** - Node 26 是推荐的默认版本；如果未安装 Node，安装脚本会自动配置该版本。
- **macOS、Linux 或 Windows** - Windows 用户可以从原生 Windows Hub 应用、PowerShell CLI 安装程序或 WSL2 Gateway 开始。请参阅 [Windows](/platforms/windows)。
- 只有在从源代码构建时才需要 `pnpm`。

## 推荐：安装脚本

最快的安装方式。它会检测你的操作系统，如有需要会安装 Node，安装 OpenClaw，并启动引导流程。

<Note>
Windows 桌面用户也可以安装原生的 [Windows Hub](/platforms/windows#recommended-windows-hub) 配套应用，其中包括设置、托盘状态、聊天、node 模式和本地 MCP 模式。
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

有关所有标志以及 CI/自动化选项，请参阅 [安装程序内部机制](/install/installer)。

## 其他安装方式

### 本地前缀安装器（`install-cli.sh`）

当你希望将 OpenClaw 和 Node 保持在本地前缀下，例如
`~/.openclaw`，而不依赖系统级 Node 安装时，请使用此方式：

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

默认支持 npm 安装，并且也支持在相同
前缀流程下进行 git 检出安装。完整参考：[安装程序内部机制](/install/installer#install-clish)。

已经安装好了？可通过
`openclaw update --channel dev` 和 `openclaw update --channel stable` 在包安装和 git 安装之间切换。请参阅
[更新](/install/updating#switch-between-npm-and-git-installs)。

### npm、pnpm 或 bun

如果你已经自行管理 Node：

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    npm 12 默认会阻止包生命周期脚本，因此上面的命令会跳过 OpenClaw 的
    `preinstall` 和 `postinstall` 步骤——npm 会将它们报告为
    `blocked because they are not covered by allowScripts`。请显式允许它们：

    ```bash
    npm install -g openclaw@latest --allow-scripts openclaw
    ```

    npm 11.16.x 只会警告这些脚本 `not yet covered by
    allowScripts`，但仍会运行它们。如果你想消除该警告，请注意，它建议使用的
    `npm approve-scripts openclaw` 命令无法用于全局安装——它会失败并显示
    `ENOMATCH  No installed packages
    match: openclaw`。npm 11.12 及更早版本没有此策略。
    </Note>

    <Note>
    托管安装器会清除 OpenClaw 包安装的 `min-release-age` 等 npm 新鲜度筛选条件。如果你使用 npm 手动安装，则仍会应用你自己的 npm 策略。
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g --allow-build=openclaw openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 要求明确批准带有构建脚本的包。全局安装不支持
    `approve-builds -g`，因此请改为在 `pnpm add -g` 命令中传入
    `--allow-build=openclaw`。
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    Bun 可以安装全局包，但生成的 `openclaw` 可执行文件需要受支持的 Node 运行时，因为 OpenClaw 状态使用了 `node:sqlite`。
    </Note>

  </Tab>
</Tabs>

### 来自源码

适用于贡献者或任何想要从本地检出版本运行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
openclaw onboard --install-daemon
```

或者跳过链接，直接在仓库内使用 `pnpm openclaw ...`。请参阅 [设置](/start/setup) 获取完整的开发工作流。

### 从 GitHub main 检出版本安装

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
```

### 容器和包管理器

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    Docker 的无 root 容器替代方案。
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    通过 Nix flake 进行声明式安装。
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    可选依赖安装器和包脚本运行器。
  </Card>
</CardGroup>

## 验证安装

```bash
openclaw --version      # 确认 CLI 可用
openclaw doctor         # 检查配置问题
openclaw gateway status # 验证 Gateway 正在运行
```

如果你希望安装后由系统托管启动：

- macOS：通过 `openclaw onboard --install-daemon` 或 `openclaw gateway install` 创建 LaunchAgent
- Linux/WSL2：通过相同命令创建 systemd 用户服务
- 原生 Windows：优先使用计划任务；如果创建任务被拒绝，则回退为每用户的 Startup 文件夹登录项

## 托管与部署

在云服务器或 VPS 上部署 OpenClaw。完整的
提供商选择器请参见 [Linux 服务器](/vps)（DigitalOcean、Hetzner、Hostinger、Fly.io、GCP、Azure、Railway、
Northflank、Oracle Cloud、Raspberry Pi 等），或者在
[Render](/install/render) 上进行声明式部署。

<CardGroup cols={3}>
  <Card title="VPS" href="/vps">
    选择一个提供商。
  </Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">
    共享 Docker 步骤。
  </Card>
  <Card title="Kubernetes" href="/install/kubernetes">
    K8s 部署。
  </Card>
</CardGroup>

## 更新、迁移或卸载

<CardGroup cols={3}>
  <Card title="更新" href="/install/updating" icon="refresh-cw">
    保持 OpenClaw 为最新版本。
  </Card>
  <Card title="迁移" href="/install/migrating" icon="arrow-right">
    迁移到新机器。
  </Card>
  <Card title="卸载" href="/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

## 故障排查：找不到 `openclaw`

这几乎总是一个 PATH 问题：npm 的全局 bin 目录不在你的 shell 的 `PATH` 中。请参阅 [Node.js 故障排查](/install/node#troubleshooting) 获取完整修复方法，包括 Windows 路径。

```bash
node -v           # Node 已安装？
npm prefix -g     # 全局包位于哪里？
echo "$PATH"      # 全局 bin 目录是否在 PATH 中？
```
