---
summary: "设置命令（可以安全重复）、网关准备的运行时存档以及构建自定义节点包"
title: "Worker 设置和捆绑包安装"
doc-schema-version: 1
read_when: "您正在编写配置文件设置命令，或者您需要自定义节点分发。"
---

OpenClaw 自动从正在运行的网关安装其运行时。配置文件只需要可选的机器先决条件；存储库依赖项和启动命令属于 [cloud 环境文件 ](/gateway/cloud-workers/environment-file)。

## <a id="automatic-linux-node-toolchains"></a> 自动 Linux Node 工具链

Linux x64和arm64工作人员不需要在`settings.setup`中安装Node。当 npm、npx 和 Corepack 可用时，OpenClaw 在 `PATH` 上保留受支持的 Node；否则，它会在 SHA-256 验证后安装其固定的官方版本。该镜像需要兼容glibc、`curl`、`tar`和`sha256sum`，加上HTTPS访问nodejs.org.

准备好的存储库从 `.nvmrc`、`.node-version`、`.tool-versions`（`nodejs` 或 `node`）、`mise.toml`（`[tools] node`）中选择其 Node 要求，然后`package.json` `engines.node`。版本、专业、SemVer 范围、`node`/`latest` 和 LTS 别名解析为匹配的官方 Linux 版本； `system` 保留引导程序 Node。无效声明或缺失版本失败并显示修复提示。

经过验证的工具链可以在快照分叉中幸存下来。存储库命令首先使用准备好的 HOME 的 `.local/bin` 垫片。声明的 `packageManager` 无需 sudo 即可获得用户可写的 Corepack 垫片。 OpenClaw 运行时使用其自己支持的 Node，与存储库的版本无关。仍支持自定义配置文件 Node 安装。 macOS和Windows需要提供图像或设置Node和npm； OpenClaw 不在那里安装它们。

## <a id="the-setup-command"></a> 设置命令

`settings.setup` 在准备就绪后、存储库准备和注册之前在冷机器上运行。配置重放可以重复它，因此使其幂等。快照分叉会跳过它，因为它们的兼容映像已经包含其文件系统结果。将存储库 `postStartCommand` 用于必须在每个新工作线程上启动的进程。

不要全局安装 OpenClaw 或在安装程序中维护版本化的 runtime/plugin URL。 Bootstrap 提供网关的运行时和所需的插件。对于其他包，请考虑映像初始化：等待 cloud-init 并使用包管理器的锁定等待选项以避免在持有的锁定上第一次调度失败。设置或注册失败会报告错误并停止不完整的租用。

### <a id="protected-setup-secrets"></a> 受保护的设置秘密

私有包访问通过受保护的出口使用 [setup Secrets](/gateway/config-cloud-workers#setup-secrets)，包括禁用快照时。将原始凭据保留在安装命令和文件之外。

### <a id="native-windows-prerequisites"></a> Native Windows 先决条件

对于 `windows/normal`，Crabbox 执行 `settings.setup` 和 Windows PowerShell。为PowerShell写入设置命令； Linux、macOS 和 Windows （WSL2） 继续使用 POSIX 脚本。例如，此先决条件检查使用计算机的现有 Node 和 npm 安装：

```powershell
$ErrorActionPreference = 'Stop'
& (Get-Command node.exe -CommandType Application -ErrorAction Stop).Source --version
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Get-Command npm.cmd -CommandType Application -ErrorAction Stop).Source --version
exit $LASTEXITCODE
```

使用在机器 `PATH` 上提供受支持的 Node.js 版本和 npm 的 Crabbox 引导程序或映像，并将 npm 的 CLI 安装在 `node_modules/npm` 下的 `node.exe` 旁边。如果 Node 或 npm 安装缺失，OpenClaw 注册失败，并显示先决条件消息；它不安装 Node。 npm 安装节点运行时存档，OpenClaw 使用其 Node 存档库提取工作程序包。

Headless Windows 来宾必须包含 Crabbox 的托管启动器 `C:\Program Files\Crabbox\bin\Start-CrabboxDetachedProcess.ps1`。在 Crabbox 关闭其 SSH 命令后，它使节点保持活动状态。如果启动器不存在，注册将失败并带有指导。隐藏的 PowerShell 父级将节点输出重定向到其隔离状态目录下的 `node.log`，因为启动器不继承 SSH 输出句柄。

支持桌面的 Windows 工作人员使用 Crabbox 的交互式桌面服务；请参阅 [native 桌面先决条件 ](/gateway/cloud-workers/desktop#native-windows-prerequisites)。

## <a id="bundle-installation"></a> 捆绑安装

在注册之前，网关会从当前构建的安装中准备可重用的存档，包括所选执行模式所需的节点主机和受信任插件。 Codex 的插件和托管二进制引脚随之移动。存档包含运行时代码和包元数据，而不是网关配置、身份验证配置文件、会话或进程环境。

存档和成功安装通过内容摘要（而不是单独的版本）进行验证，并在匹配时重新使用。快照分叉在注册之前会填充较旧的运行时。为目标 OS 和 CPU 安装本机依赖项，​​因此仍需要注册表访问；这不是离线依赖包。注册和存档下载凭据不会传递到 npm 或节点进程。

对于源构建，请在调度之前运行 `pnpm build` 并重新启动网关。 Bootstrap 不会编译未构建的签出或在正在运行的构建上复制原始编辑。构建元数据丢失或不匹配会导致重建和重新启动错误。仅当构建元数据验证其所有权时，才会排除私有 QA-only 构建块；元数据不完整或导入准备失败。

OpenClaw 工作程序轮流安装匹配的工作程序包，重用准备好的映像中保留的经过验证的存档（如果可用）。 Codex 远程执行直接启动其托管执行服务器。 Node- 命令允许列表和调用批准仍然适用。请参阅[运行时支持](/gateway/cloud-workers/dispatching-a-session#runtime-support)和[安全模型](/gateway/cloud-workers/security-model)。

### <a id="reuse-a-node-runtime-archive-after-gateway-restart"></a> 网关重启后重用节点运行时存档

Linux 和 macOS 部署映像可以在正在运行的 OpenClaw 包根中（`package.json` 旁边）保留已准备好的节点运行时存档作为 `node-runtime.tgz`。在图像准备期间，在关闭生产者之前将生产者的档案复制到那里：

```bash
cp /path/to/prepared/node-runtime.tgz /path/to/openclaw/node-runtime.tgz
```

在 Linux 和 macOS 网关上，重新启动后的第一次准备会根据正在运行的发行版、选定的插件、依赖项引脚和导入来验证保留的存档。匹配跳过压缩；丢失、不安全、损坏或不匹配的存档使用正常的构建器。不同的执行模式可能需要不同的存档。 Windows 网关使用普通构建器。

当发行版或插件发生更改时，替换保留的文件，或将其删除以恢复正常准备。这节省了档案建设，而不是注册或工人安装。活跃消费者安定后，网关关闭会删除其临时副本。

## <a id="build-a-complete-custom-node-package"></a> 构建完整的自定义节点包

自动云引导不需要手动发布包。对于单独的部署或包验证工作流程，标准包构建器仍然可以生成完整的自定义发行版，并显式包含普通核心包排除的源拥有的插件：

```bash
source_sha="$(git rev-parse HEAD)"
node scripts/package-openclaw-for-docker.mjs \
  --bundle-plugin codex \
  --pnpm-pack \
  --allow-unreleased-changelog \
  --output-dir .artifacts/cloud-node \
  --output-name "openclaw-cloud-${source_sha}.tgz"
shasum -a 256 ".artifacts/cloud-node/openclaw-cloud-${source_sha}.tgz"
```

在安装了依赖项的干净、可信的结账中运行它。构建器编译运行时，包括所选插件的构建入口点和导入闭包，并重新生成安装清单。它临时将插件的确切运行时依赖项引脚添加到发行版清单中，拒绝冲突或未固定的依赖项，并将所选插件标记为发行版拥有的。包装后恢复来源清单和库存。对于其他源插件，请重复 `--bundle-plugin <id>`。如果没有该选项，普通核心包和外部插件发布合同将保持不变。

在更新期间，Doctor 会删除符合条件的托管 npm 副本，这些副本会影响此发行版中包含的插件，即使它们的版本字符串匹配也是如此。其他操作保留的副本保留其现有保护。插件设置和数据保留在状态目录中。包含必须与同一自定义包中未发布的主机 SDK 匹配的运行时插件；仅核心存档无法更新其单独发布的代码。

通过现有的不可变工件路径交付生成的存档，并在启用正常 npm 生命周期脚本的情况下安装它之前验证其 SHA-256。记录源 SHA 和存档摘要：不同的未发布版本可以共享一个版本。不要将插件复制到已安装的版本中，也不要将此发行版替换为独立的 `npm-pack:` 插件存档。云配置文件不消耗此URL；他们的注册工件来自正在运行的网关。

验证下载的存档后，使用 root 命令范围内的掩码进行安装，然后以运行它的用户身份验证版本：

```bash
sudo sh -c 'umask 022 && npm install -g /tmp/openclaw-cloud.tgz'
openclaw --version
```

使用已验证存档的路径代替 `/tmp/openclaw-cloud.tgz`。更改安装掩码不会修复现有的仅限根目录的父目录；如果无法访问较早的安装，请在重试注册之前正确访问该包及其父目录。

本机依赖项在发行版根目录中声明并为目标操作系统和 CPU 安装；存档不会复制构建主机的插件 `node_modules`。目标安装仍然需要注册表访问，并且不是离线依赖包。验证您部署的每个目标架构。仅当重用同一源版本的完整构建且所有选定的插件输出都存在时，才使用 `--skip-build`。
