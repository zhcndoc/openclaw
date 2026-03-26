---
summary: "安装 OpenClaw — 安装脚本，npm/pnpm，源码，Docker 等多种方式"
read_when:
  - 你需要除快速入门外的其他安装方法
  - 你想要部署到云平台
  - 你需要更新、迁移或卸载
title: "安装"
---

# 安装

## 推荐：安装脚本

最快的安装方式。它会检测你的操作系统，必要时安装 Node，安装 OpenClaw，并启动引导流程。

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

如需安装但不运行引导流程：

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

有关所有标志以及 CI/自动化选项，请参阅 [安装器内部](/install/installer)。

## 系统要求

- **Node 24**（推荐）或 Node 22.14+ — 安装脚本会自动处理
- **macOS、Linux 或 Windows** — 原生 Windows 和 WSL2 都受支持；WSL2 更稳定。参见 [Windows](/platforms/windows)。
- 只有在从源码构建时才需要 `pnpm`

## 其他安装方式

### npm 或 pnpm

如果你已经自行管理 Node：

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm 需要对带有构建脚本的包进行显式批准。首次安装后请运行 `pnpm approve-builds -g`。
    </Note>

  </Tab>
</Tabs>

<Accordion title="疑难解答：sharp 构建错误（npm）">
  如果由于全局安装的 libvips 导致 `sharp` 失败：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

</Accordion>

### 从源码安装

适用于贡献者或任何想从本地检出版本运行的人：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm ui:build && pnpm build
pnpm link --global
openclaw onboard --install-daemon
```

或者跳过 link，直接在仓库内使用 `pnpm openclaw ...`。完整开发工作流请参见 [设置](/start/setup)。

### 从 GitHub main 安装

```bash
npm install -g github:openclaw/openclaw#main
```

### 容器和包管理器

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    Docker 的无根容器替代方案。
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    通过 Nix flake 进行声明式安装。
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    仅通过 Bun 运行时使用 CLI。
  </Card>
</CardGroup>

## 验证安装

```bash
openclaw --version      # 确认 CLI 可用
openclaw doctor         # 检查配置问题
openclaw gateway status # 验证 Gateway 正在运行
```

## 托管和部署

将 OpenClaw 部署到云服务器或 VPS：

<CardGroup cols={3}>
  <Card title="VPS" href="/vps">任何 Linux VPS</Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">共享的 Docker 步骤</Card>
  <Card title="Kubernetes" href="/install/kubernetes">K8s</Card>
  <Card title="Fly.io" href="/install/fly">Fly.io</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner</Card>
  <Card title="GCP" href="/install/gcp">Google Cloud</Card>
  <Card title="Azure" href="/install/azure">Azure</Card>
  <Card title="Railway" href="/install/railway">Railway</Card>
  <Card title="Render" href="/install/render">Render</Card>
  <Card title="Northflank" href="/install/northflank">Northflank</Card>
</CardGroup>

## 更新、迁移或卸载

<CardGroup cols={3}>
  <Card title="更新" href="/install/updating" icon="refresh-cw">
    保持 OpenClaw 最新。
  </Card>
  <Card title="迁移" href="/install/migrating" icon="arrow-right">
    迁移到新机器。
  </Card>
  <Card title="卸载" href="/install/uninstall" icon="trash-2">
    完全移除 OpenClaw。
  </Card>
</CardGroup>

## 疑难解答：找不到 `openclaw`

如果安装成功，但在终端中找不到 `openclaw`：

```bash
node -v           # Node 已安装？
npm prefix -g     # 全局包在哪？
echo "$PATH"      # 全局 bin 目录是否在 PATH 中？
```

如果 `$(npm prefix -g)/bin` 不在你的 `$PATH` 中，请将其添加到你的 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

然后打开一个新的终端。更多详情请参见 [Node 设置](/install/node)。
