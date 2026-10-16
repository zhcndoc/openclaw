---
summary: "在 Crostini Linux 容器内的 ChromeOS 上运行 OpenClaw 网关"
read_when:
  - "在 Chromebook 或 ChromeOS 设备上安装 OpenClaw"
  - "调试缺少提供商密钥或重启后 Gateway 消失的问题"
title: "ChromeOS"
---

ChromeOS 通过 **Crostini** 运行 Linux 软件，Google 公开为“Linux 开发环境”的托管 Debian 容器。网关在该容器内运行，与任何其他 Linux 安装完全相同，因此 [Linux 指南 ](/platforms/linux) 完全适用。本页介绍了 ChromeOS 的具体设置以及与普通 Linux 主机不同的问题。

Node 是主要的、默认的和推荐的运行时。 Bun 1.4.3+ 使用 WAL- 重置安全构建 `node:sqlite` 可以作为显式选择运行 CLI 和网关，并且 Bun 还可以运行包脚本。下面的安装路径使用Node。

## <a id="enable-the-linux-container"></a> 启用 Linux 容器

在安装任何内容之前，先启用 Crostini：

1. 打开 ChromeOS **设置**。
2. Go 到 **关于 ChromeOS** 然后是 **开发者**。
3. 在 **Linux 开发环境**旁边，选择 **设置**，然后按照提示操作。ChromeOS 会下载 Debian 容器并打开一个**终端**。

在该终端中运行以下每条命令。

## <a id="quick-path"></a> 快速路径

1. 通过安装脚本安装（它会为你安装受支持的 Node 版本）：

   ```bash
   curl -fsSL https://openclaw.ai/install.sh | bash
   ```

2. 完成初始化并安装服务：

   ```bash
   openclaw onboard --install-daemon
   ```

3. 确认 Gateway 正在运行：

   ```bash
   openclaw gateway status
   ```

完整的服务器指南请参阅 [Linux 指南](/platforms/linux) 和 [Gateway 运行手册](/gateway)。

## <a id="prefer-the-native-install-over-docker"></a> 优先使用原生安装，而不是 Docker

在单用户 Chromebook 上，使用本机 npm 安装（安装程序脚本，或 npm 12 上的 `npm i -g openclaw@latest --allow-scripts=openclaw` 或 npm 11.16+），而不是 [Docker](/install/docker)。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

Docker 可以在 Crostini 中运行，但在 Crostini 中使用 Docker 会增加额外的麻烦：如果你使用 Claude Code CLI 作为模型运行时，就必须将其安装并登录在**持久化的容器主目录中**，而容器重建时这个目录很容易丢失。原生安装会将 CLI 及其登录信息直接保存在 Crostini 文件系统中，因此重建 Docker 镜像不会将其删除。

## <a id="node-version"></a> Node 版本

Crostini 容器中提供的 Node 版本可能低于 OpenClaw 的最低版本。 OpenClaw 需要 Node 24.16+ 或 Node 26.1+； Node 26 是建议的默认值。安装程序脚本会检测缺失或不受支持的 Node 版本，并自动配置受支持的版本。

如果你安装了Node之前的自己OpenClaw，升级它**前**安装OpenClaw：

```bash
node -v
```

有关受支持版本，请参阅 [Node 安装指南](/install/node)。

## <a id="provider-keys-and-environment-variables"></a> 提供商密钥和环境变量

Gateway 作为 **systemd 用户服务**运行，因此在交互式终端中执行的 `export VAR=...` 不会被已安装的服务继承。

请将提供商密钥放入 `~/.openclaw/.env`，每行一个：

```bash
DEEPSEEK_API_KEY=your-key-here
```

然后重启，以便服务读取这些密钥：

```bash
openclaw gateway restart
```

有关完整的优先级和来源规则，请参阅[环境变量](/help/environment)。

## <a id="crostini-is-not-always-on"></a> Crostini 并不总是处于运行状态

不要将 Crostini 视为始终运行的主机。ChromeOS 重启后，请先打开一次 **终端** 以启动 Linux 环境，然后再依赖网关。

接着验证服务：

```bash
openclaw gateway status
```

## <a id="related"></a> 相关内容

- [Linux 指南](/platforms/linux)
- [安装概览](/install)
- [Node 安装指南](/install/node)
- [Gateway 运行手册](/gateway)
- [网关配置](/gateway/configuration)
- [Google：在 Chromebook](https://support.google.com/chromebook/answer/9145439) 上设置 Linux
