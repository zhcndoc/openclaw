---
summary: "为 OpenClaw 安装和配置 Node.js - 版本要求、安装选项和 PATH 故障排除"
title: "Node.js"
read_when:
  - "安装OpenClaw之前需要先安装Node.js"
  - "你已经安装了 OpenClaw，但 `openclaw` 命令未找到"
  - "npm install -g 因权限或 PATH 问题而失败"
---

OpenClaw 需要 **Node 24.16+ 或 Node 26.1+** 以及 WAL- 复位安全链接的 SQLite 库。 **Node 26 是建议的运行时** — 它启动网关的速度明显比 Node 24 快，并且使用的内存更少。安装程序在 macOS 和受支持的 Node 24 上配置 Node 26当 Node 缺失时，LTS 线位于 Linux 上； CI 和发布工作流程还固定 Node 24。在基于 RPM- 的 Linux 上，安装程序保留受支持的发行版拥有的 Node 包，该包链接不安全的 SQLite 并使用用户空间 Node 运行时改为 OpenClaw。 Node 22、23 和 25 不受支持。 [ 安装程序脚本](/install#recommended-installer-script) 自动检测并安装 Node — 当您想要自己设置 Node（版本、PATH、全局安装）时，请使用此页面。

## <a id="check-your-version"></a> 检查你的版本

```bash
node -v
```

建议使用 `v26.1.0` 或更新版本的默认值。还支持 `v24.16.0` 或更新的 24.x，并且是 CI 使用的 LTS 系列。不支持 Node 22、23、25、24.16.0 之前的 Node 24 和 26.1.0 之前的 Node 26。如果 Node 缺失或超出此范围，请选择下面的安装方法。

在更新 OpenClaw 之前先升级 Node，以避免 SQLite TEXT 截断。有关 SQLite 安全地板和 macOS/ARMv7 支持限制，请参阅 [Node.js 兼容性 ](/install/node-compatibility)。

### <a id="update-from-the-cli"></a> 来自 CLI 的更新

如果您使用不兼容的 Node.js 运行 `openclaw`，则启动时首先检查是否有可用的兼容运行时：私有 OpenClaw 运行时、托管网关服务中记录的 Node、PATH 上的 Node，然后是 nvm、fnm、Volta 和默认为 Homebrew。每个候选者必须通过与正常启动相同的 SQLite 能力检查。第一个通过的运行时会在没有提示的情况下重试原始命令，包括旧更新程序启动的非交互式 Doctor 命令。保留参数、工作目录、标准流和退出状态。所选的 Node 目录会添加到子进程的 PATH 之前，因此包管理器和生命周期脚本也使用兼容的运行时。其他环境设置（包括 `npm_config_node`）均被保留。具有精确进程身份要求的命令无法使用此恢复。

在 OpenClaw 加载任何 `.env` 文件之前，运行时发现使用 CLI 启动时继承的环境。在 shell 环境中配置版本管理器根目录；工作区 `.env` 值无法选择 Node 可执行文件进行恢复。

相对于主目录的服务和版本管理器路径针对继承的 `HOME` 或 `USERPROFILE` 扩展了 `~`。即使 `OPENCLAW_HOME` 选择不同的私有运行时主目录，服务路径也会使用该主目录。当前工作目录内的裸相对路径和服务或管理器元数据将被拒绝。

恢复会忽略在当前工作目录内解析的相对 PATH 条目和运行时，除非绝对 PATH 条目显式命名其目录。还允许 OpenClaw 自己的私有恢复目录，因此当您从主目录启动时，缓存的运行时重用和安装提供工作。此异常不会扩展到其他内部可执行文件或管理器根目录。在 Windows 上，服务读取器遵循记录的代码页和 Unicode 字节顺序标记。如果当前的 Node 版本无法安全地解码服务脚本，OpenClaw 将打印代码页并继续搜索其他源。不支持的 OEM 页面（例如 CP850）将被跳过而不是猜测。 CP949 也被跳过：Node 的 ICU `euc-kr` 解码器默默地错误解码 UHC 扩展字符。这两种情况都不会检查服务可执行文件；使用 PATH 和其他可用的运行时源继续恢复。

如果没有可用的并且您位于交互式终端中，则 CLI 提供：

```text
Update NodeJS: Y/N [N]:
```

输入 **Y** 下载 OpenClaw 的兼容 Node.js 并重试相同的命令。下载的内容经过校验和验证并存储在 `~/.openclaw/tools/cli-node` 下（或 `OPENCLAW_HOME` 选择的主目录）。 Node.js 安装不会替换系统 Node.js、更改 shell 设置、重新安装 OpenClaw 或 repair/restart 网关服务。重试的命令保持其正常行为。

当活动 Node.js 不兼容时，稍后的 CLI 调用将重用该运行时。支持的活动 Node.js 仍然优先。输入 **N**，按 Enter，或取消以保持安装不变并查看手动升级说明。

自动安装在x64/ARM64. Alpine/musl上支持macOS、Windows和基于glibc的Linux，其他架构需要手动安装。非交互式、CI、JSON 和 `--yes` 调用中的启动恢复从不提示或安装 Node.js。需要精确进程标识的命令（例如 `hooks relay` 和 `webhooks gmail run`）还需要在其现有执行路径上有兼容的 Node.js。

### <a id="node-requirements-during-an-update"></a> 更新期间的 Node 要求

`openclaw update` 启动后，它会在替换软件包之前检查所请求版本的 Node 要求。如果当前运行时无法运行该版本，则更新程序会选择兼容的已安装 Node 或在上述支持的平台上悄悄提供经过验证的专用运行时。这种目标感知恢复也适用于 `--yes` 和 `--json`；它不会更改系统 Node 或 shell 设置。仅当更新程序确认原始请求和安装所有权仍然有效后，安装程序才会启动。在该检查之前撤销的请求不会安装专用运行时。

版本管理器切换后，重新启动更新会将调用的 OpenClaw 安装保留为其目标，并将其拥有的网关服务重新绑定到该安装。当 CLI 软件包已与请求的版本匹配时，这也适用。在 Windows 上，或者当托管服务定义无法更改或具有无法恢复的操作员覆盖时，更新程序会将现有服务安装作为其目标；它不会将服务重新绑定到调用 CLI。此回退路径上的成功更新不会对齐不同的 CLI 和网关安装前缀。 `--no-restart` 也不重新绑定服务。外部调度程序和固定的 crontab 路径仍然由操作员管理。

## <a id="install-node"></a> 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew**（推荐）：

    ```bash
    brew install node
    ```

    或者从 [nodejs.org](https://nodejs.org/). 下载 macOS 安装程序

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL:**

    ```bash
    sudo dnf install nodejs
    ```

    一些发行版 Node 软件包链接系统 SQLite 库。推荐的 OpenClaw 安装程序检查有效的 Node 和 SQLite 组合，并在发行版构建不安全时自动使用用户空间 Node 运行时；它不会删除发行版包。

    或使用版本管理器（见下文）。

  </Tab>
  <Tab title="Windows">
    **winget**（推荐）：

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **巧克力：**

    ```powershell
    choco install nodejs-lts
    ```

    或者从 [nodejs.org](https://nodejs.org/). 下载 Windows 安装程序

  </Tab>
</Tabs>

<Accordion id="using-a-version-manager-nvm-fnm-mise-asdf" title="使用版本管理器（nvm、fnm、mise、asdf）">
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

## <a id="troubleshooting"></a> 故障排查

### <a id="homebrew-upgrades-while-the-gateway-is-running"></a> Homebrew 在网关运行时升级

如果 Homebrew 删除正在运行的网关的 Node 可执行文件，命令中继及其进程组锚点将使用公式的可用稳定 Homebrew 路径进行新启动。当原始可执行文件存在时，他们会继续使用它。共享本机模块或 V8 消息的工作人员（包括生成代理）会保留准确的运行时间，并在运行时间消失时报告重新启动操作。升级 Node 后重新启动网关，将网关本身移至新的运行时。

### `openclaw: command not found`

这几乎总是意味着 npm 的全局 bin 目录没有加入你的 PATH。

<Steps>
  <Step id="find-your-global-npm-prefix" title="查找您的全球 npm 前缀">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step id="check-if-its-on-your-path" title="检查它是否在您的 PATH 上">
    ```bash
    echo "$PATH"
    ```

    在输出中查找 `<npm-prefix>/bin`（macOS/Linux）或 `<npm-prefix>`（Windows）。

  </Step>
  <Step id="add-it-to-your-shell-startup-file" title="将其添加到您的 shell 启动文件中">
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

### <a id="permission-errors-on-npm-install--g-(linux)"></a><a id="permission-errors-on-npm-install-g-linux"></a> `npm install -g` 的权限错误（Linux）

如果你看到 `EACCES` 错误，请将 npm 的全局前缀切换到一个用户可写的目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 这一行添加到你的 `~/.bashrc` 或 `~/.zshrc` 中，以使其永久生效。

## <a id="related"></a> 相关内容

- [安装Overview](/install) - 所有安装方法
- [更新](/install/updating) - 保持 OpenClaw 为最新版本
- [获取 Started](/start/getting-started) - 安装后的第一步
