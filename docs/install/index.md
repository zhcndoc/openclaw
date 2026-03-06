---
summary: "安装 OpenClaw — 安装脚本，npm/pnpm，源码，Docker 等多种方式"
read_when:
  - 你需要除快速入门外的其他安装方法
  - 你想要部署到云平台
  - 你需要更新、迁移或卸载
title: "安装"
---

# 安装

已经阅读过[快速入门](/start/getting-started)？那你已经准备好了——本页介绍替代安装方法、特定平台说明及维护相关内容。

## 系统要求

- **[Node 22+](/install/node)** （如果缺失，[安装脚本](#install-methods)会自动安装）
- macOS、Linux 或 Windows
- 仅当你从源码构建时需要 `pnpm`

<Note>
在 Windows 上，我们强烈推荐在 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) 下运行 OpenClaw。
</Note>

## 安装方法

<Tip>
**安装脚本** 是推荐的 OpenClaw 安装方式。它一步完成 Node 的检测、安装和引导流程。
</Tip>

<Warning>
对于 VPS/云主机，尽量避免使用第三方的“单击安装”市场镜像。建议使用干净的基础操作系统镜像（例如 Ubuntu LTS），然后用安装脚本自行安装 OpenClaw。
</Warning>

<AccordionGroup>
  <Accordion title="安装脚本" icon="rocket" defaultOpen>
    下载 CLI，通过 npm 全局安装并启动引导向导。

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

    就这样——脚本会处理 Node 检测、安装和引导。

    若想跳过引导，直接安装二进制文件：

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

    有关所有标志、环境变量和 CI/自动化选项，请参见[安装器内部](/install/installer)。

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    如果你已经有 Node 22+ 并且想自己管理安装：

    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```

        <Accordion title="sharp 构建错误？">
          如果你全局安装了 libvips（macOS 上通常通过 Homebrew 安装），且 `sharp` 构建失败，强制使用预编译二进制：

          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```

          若遇到 `sharp: Please add node-gyp to your dependencies`，请安装构建工具（macOS：Xcode CLT + `npm install -g node-gyp`）或者使用上面提到的环境变量。
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # 批准 openclaw、node-llama-cpp、sharp 等包的构建
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm 需要明确批准带有构建脚本的包。首次安装出现“忽略构建脚本”警告后，运行 `pnpm approve-builds -g` 并选择列出的包。
        </Note>
      </Tab>
    </Tabs>

  </Accordion>

  <Accordion title="从源码安装" icon="github">
    适用于贡献者或希望从本地代码库运行的用户。

    <Steps>
      <Step title="克隆并构建">
        克隆 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 并构建：

        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="链接 CLI">
        使 `openclaw` 命令在全局可用：

        ```bash
        pnpm link --global
        ```

        或者，你也可以跳过链接，直接在仓库目录内使用 `pnpm openclaw ...` 运行命令。
      </Step>
      <Step title="运行引导">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    关于更深入的开发流程，请参见[设置](/start/setup)。

  </Accordion>
</AccordionGroup>

## 其他安装方式

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    容器化或无头部署。
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    无根容器：执行一次 `setup-podman.sh`，然后运行启动脚本。
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    通过 Nix 的声明式安装。
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    自动化集群配置。
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    仅通过 Bun 运行时使用 CLI。
  </Card>
</CardGroup>

## 安装后

验证一切正常：

```bash
openclaw doctor         # 检查配置问题
openclaw status         # 网关状态
openclaw dashboard      # 打开浏览器 UI
```

如果你需要自定义运行时路径，请使用：

- `OPENCLAW_HOME` 指定基于家目录的内部路径
- `OPENCLAW_STATE_DIR` 指定可变状态存储位置
- `OPENCLAW_CONFIG_PATH` 指定配置文件位置

详见[环境变量](/help/environment)了解优先级及完整细节。

## 故障排查：找不到 `openclaw`

<Accordion title="PATH 诊断和修复">
  快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在**你的 `$PATH` 中，shell 无法找到全局 npm 二进制（包含 `openclaw`）。

修复方法——添加到 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Windows 上，将 `npm prefix -g` 的输出路径添加到 PATH 环境变量。

然后打开新终端（或在 zsh 中执行 `rehash`，bash 中执行 `hash -r`）。
</Accordion>

## 更新 / 卸载

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
