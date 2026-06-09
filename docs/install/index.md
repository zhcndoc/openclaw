---
summary: "安装 OpenClaw - 安装脚本、npm/pnpm/bun、源码、Docker 等"
read_when:
  - 当你需要除“Getting Started”快速入门之外的安装方式时
  - 当你想部署到云平台时
  - 当你需要更新、迁移或卸载时
title: "安装"
---

## 系统要求

- **Node 24**（推荐）或 Node 22.19+ - 安装脚本会自动处理
- **macOS、Linux 或 Windows** - Windows 用户可以从原生 Windows Hub 应用、PowerShell CLI 安装程序或 WSL2 Gateway 开始。参见 [Windows](/platforms/windows)。
- `pnpm` 仅在你从源码构建时需要

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
    托管安装程序会清除 OpenClaw 包安装所使用的 npm 新鲜度过滤条件，例如 `min-release-age`。
    如果你手动使用 npm 安装，你自己的 npm 策略仍然会生效。
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 对带有构建脚本的包需要显式批准。首次安装后运行 `pnpm approve-builds -g`。
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    Bun 支持全局 CLI 安装路径。对于 Gateway 运行时，Node 仍然是推荐的 daemon 运行时。
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
    通过 Bun 运行时仅使用 CLI。
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

将 OpenClaw 部署到云服务器或 VPS：

<CardGroup cols={3}>
  <Card title="VPS" href="/vps">
    任何 Linux VPS。
  </Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">
    共享 Docker 步骤。
  </Card>
  <Card title="Kubernetes" href="/install/kubernetes">
    K8s 部署。
  </Card>
  <Card title="Fly.io" href="/install/fly">
    在 Fly.io 上部署。
  </Card>
  <Card title="Hetzner" href="/install/hetzner">
    Hetzner 部署。
  </Card>
  <Card title="GCP" href="/install/gcp">
    Google Cloud 部署。
  </Card>
  <Card title="Azure" href="/install/azure">
    Azure 部署。
  </Card>
  <Card title="Railway" href="/install/railway">
    Railway 部署。
  </Card>
  <Card title="Render" href="/install/render">
    Render 部署。
  </Card>
  <Card title="Northflank" href="/install/northflank">
    Northflank 部署。
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

如果安装成功了，但在终端中找不到 `openclaw`：

```bash
node -v           # Node 已安装？
npm prefix -g     # 全局包位于哪里？
echo "$PATH"      # 全局 bin 目录是否在 PATH 中？
```

如果 `$(npm prefix -g)/bin` 不在你的 `$PATH` 中，请将其添加到你的 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

然后打开一个新的终端。更多详情请参阅 [Node 设置](/install/node)。
