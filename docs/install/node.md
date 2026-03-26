---
title: "Node.js"
summary: "为 OpenClaw 安装和配置 Node.js — 版本要求、安装选项及 PATH 故障排除"
read_when:
  - "您需要在安装 OpenClaw 之前安装 Node.js"
  - "您已安装 OpenClaw，但提示找不到命令 `openclaw`"
  - "npm install -g 因权限或 PATH 问题失败"
---

# Node.js

OpenClaw 要求 **Node 22.14 或更新版本**。**Node 24 是安装、CI 和发布工作流的默认且推荐运行时**。Node 22 仍可通过当前 LTS 线路获得支持。[安装脚本](/install#alternative-install-methods) 会自动检测并安装 Node——本页适用于您希望自行设置 Node，并确保一切配置正确（版本、PATH、全局安装）时。

## 检查您的版本

```bash
node -v
```

如果输出 `v24.x.x` 或更高版本，说明您使用的是推荐的默认版本。如果输出 `v22.14.x` 或更高版本，说明您使用的是受支持的 Node 22 LTS 路线，但我们仍建议在方便时升级到 Node 24。如果尚未安装 Node，或版本过旧，请选择下面的一种安装方式。

## 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew**（推荐）：

    ```bash
    brew install node
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 macOS 安装包。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian：**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL：**

    ```bash
    sudo dnf install nodejs
    ```

    或者使用版本管理工具（见下文）。

  </Tab>
  <Tab title="Windows">
    **winget**（推荐）：

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey：**

    ```powershell
    choco install nodejs-lts
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 Windows 安装程序。

  </Tab>
</Tabs>

<Accordion title="使用版本管理器（nvm、fnm、mise、asdf）">
  版本管理器让您可以轻松切换 Node 版本。流行选项包括：

- [**fnm**](https://github.com/Schniz/fnm) — 快速，跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — macOS/Linux 上广泛使用
- [**mise**](https://mise.jdx.dev/) — 多语言支持（Node、Python、Ruby 等）

以 fnm 为例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  确保您的版本管理器在 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中被初始化。如果没有，新的终端会话中可能找不到 `openclaw` 命令，因为 PATH 中不包含 Node 的 bin 目录。
  </Warning>
</Accordion>

## 故障排除

### `openclaw: command not found`

这通常意味着 npm 的全局 bin 目录没有在您的 PATH 中。

<Steps>
  <Step title="查找您的全局 npm 安装路径">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="检查它是否在 PATH 中">
    ```bash
    echo "$PATH"
    ```

    查看输出中是否包含 `<npm-prefix>/bin`（macOS/Linux）或 `<npm-prefix>`（Windows）。

  </Step>
  <Step title="将其添加到您的 shell 启动文件">
    <Tabs>
      <Tab title="macOS / Linux">
        添加到 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然后打开新的终端窗口（或在 zsh 中运行 `rehash`，bash 中运行 `hash -r`）。
      </Tab>
      <Tab title="Windows">
        通过 设置 → 系统 → 环境变量，将 `npm prefix -g` 的输出路径添加到系统 PATH 中。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` 权限错误（Linux）

如果出现 `EACCES` 权限错误，请将 npm 的全局前缀目录切换到用户可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 这一行添加到 `~/.bashrc` 或 `~/.zshrc` 以实现永久生效。
