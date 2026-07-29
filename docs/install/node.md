---
summary: "为 OpenClaw 安装和配置 Node.js - 版本要求、安装选项和 PATH 故障排查"
title: "Node.js"
read_when:
  - "在安装 OpenClaw 之前，你需要先安装 Node.js"
  - "你已经安装了 OpenClaw，但 `openclaw` 命令未找到"
  - "`npm install -g` 因权限或 PATH 问题失败"
---

OpenClaw requires **Node 22.22.3+, Node 24.15+, or Node 25.9+** (which includes Node 26). **Node 26 is the default and recommended runtime** — it starts the Gateway noticeably faster and uses less memory than Node 24, and the installer script provisions it when Node is missing. CI and release workflows still pin Node 24; Node 22 remains supported via its LTS line. Node 23 is unsupported. The [installer script](/install#alternative-install-methods) detects and installs Node automatically — use this page when you want to set up Node yourself (versions, PATH, global installs).

## 检查你的版本

```bash
node -v
```

`v26` (any release) is the recommended default. `v24.15.0` or newer 24.x remains fully supported (and is what CI pins); `v22.22.3` or newer 22.x is the supported Node 22 LTS path; Node `v25.9.0+` is also supported. Node 23 is unsupported. If Node is missing or outside the supported range, pick an install method below.

## 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew**（推荐）：

    ```bash
    brew install node
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 macOS 安装程序。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian：**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL：**

    ```bash
    sudo dnf install nodejs
    ```

    或使用版本管理器（见下文）。

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
  版本管理器可以让你轻松在不同 Node 版本之间切换。常见选项：

- [**fnm**](https://github.com/Schniz/fnm) - 快速、跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) - 在 macOS/Linux 上广泛使用
- [**mise**](https://mise.jdx.dev/) - 多语言（Node、Python、Ruby 等）

使用 fnm 的示例：

```bash
fnm install 26
fnm use 26
```

  <Warning>
  请在你的 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中初始化版本管理器。如果跳过这一步，在新的终端会话中可能找不到 `openclaw`，因为 PATH 不会包含 Node 的 bin 目录。
  </Warning>
</Accordion>

## 故障排查

### `openclaw: command not found`

这几乎总是意味着 npm 的全局 bin 目录没有加入你的 PATH。

<Steps>
  <Step title="查找你的 npm 全局前缀">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="检查它是否在你的 PATH 中">
    ```bash
    echo "$PATH"
    ```

    在输出中查找 `<npm-prefix>/bin`（macOS/Linux）或 `<npm-prefix>`（Windows）。

  </Step>
  <Step title="将其添加到你的 shell 启动文件">
    <Tabs>
      <Tab title="macOS / Linux">
        添加到 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然后打开一个新的终端（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。
      </Tab>
      <Tab title="Windows">
        通过“设置”→“系统”→“环境变量”，将 `npm prefix -g` 的输出添加到系统 PATH 中。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` 的权限错误（Linux）

如果你看到 `EACCES` 错误，请将 npm 的全局前缀切换到一个用户可写的目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 这一行添加到你的 `~/.bashrc` 或 `~/.zshrc` 中，以使其永久生效。

## 相关内容

- [安装概览](/install) - 所有安装方式
- [更新](/install/updating) - 保持 OpenClaw 为最新版本
- [入门指南](/start/getting-started) - 安装后的第一步
