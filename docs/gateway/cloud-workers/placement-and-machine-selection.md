---
doc-schema-version: 1
summary: "配对设备上的 Codex，或者在云配置文件上利用，以及每个会话操作系统和机器类别"
title: "放置和机器选择"
read_when: "您可以选择会话运行的位置，或者覆盖其操作系统或计算机大小。"
---

选择运行会话的机器：明确授权的配对设备、任一工具的 Crabbox 云配置文件以及每个放置的操作系统和机器类覆盖。

## <a id="a-deployment-required-openclaw-destination"></a> A 部署所需 OpenClaw 目标

当每个会话必须使用一个 OpenClaw 工作人员配置文件时，操作员可以设置 [`cloudWorkers.requiredProfile`](/gateway/config-cloud-workers#required-worker-profile)。 Control UI 在没有选择器的情况下显示该目标；它不是用户选择的云工作者。网关拥有放置，包括用于没有存储库的聊天的空托管工作区，并拒绝选择本地或不同执行目标的尝试。普通用户不需要手动调度权限。

如果准备失败，初始消息将保持未发送状态，并且现有放置恢复流程会提供“重试”或“停止”。没有本地回退。当网关没有必需的配置文件时，适用以下可选选择过程。

## <a id="codex-on-a-paired-device"></a> 配对设备上的 Codex

配对设备 Codex 放置需要在网关的配置和节点自己的本地配置中安装并启用 `codex` 插件。当任一计算机使用插件白名单时，将 `codex` 包含在任一计算机上的 `plugins.allow` 中。它还需要一个具有会话能力的连接节点来通告 `codex.exec-server`，以及 `codex.exec-server.stdio.v1` 的显式 `gateway.nodes.commands.allow` 条目。如果需要，批准节点更新的配对表面。在每次exec-server启动之前，OpenClaw还需要正常的节点调用批准；拒绝该请求不会启动进程。

Codex 直接启动其执行服务器，因此配对设备和云节点放置不会消耗 OpenClaw 工作插槽，并且在这些插槽已满时仍保持合格状态。 OpenClaw `worker-turn` 放置仍需要可用的工作插槽。

批准允许在节点操作系统帐户允许的任何地方执行进程和访问文件系统。确切的放置工作空间控制起始目录和协调的更改，而不是 OS- 级别的限制。信任配对的设备，并在需要隔离时使用单独的最低权限 OS 帐户。

在 Control UI **Place** 选择器中选择设备或通过授权操作员连接分派托管工作树会话：

```bash
openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:device-work","deviceId":"<paired-device-id>"}'
```

Codex 应用程序服务器、模型连接、提供者凭据和副本保留在网关上。配对节点在传输的工作空间中运行托管 Codex 执行服务器，并通过现有节点通道仅接收经过清理的进程、文件系统、功能发现和 HTTP 操作。它不会启动 OpenClaw 工作子进程。带有凭据的 HTTP 请求在到达配对设备之前被拒绝；在网关上运行经过身份验证的请求或使用故意无凭据的端点。支持正常的 Codex 回合，但 `/btw` 附带问题尚未受布局限制，并且会明显失败。已完成的更改将通过与工作人员轮流时相同的放置工作区协调返回。请参阅 [ 在配对设备上运行 Codex](/plugins/codex-harness/placement#run-codex-on-a-paired-device) 以了解确切的白名单配置和生命周期。

## <a id="codex-or-openclaw-on-a-cloud-profile"></a> 云配置文件上的 Codex 或 OpenClaw

相同配置的 Crabbox 配置文件可以承载任一harness。选择OpenClaw或Codex模型后，在**Cloud**下选择其配置文件行；所选运行时确定配置是否准备工作子级或托管 Codex 执行服务器。 Codex 云节点执行需要与配对设备执行相同的显式网关命令白名单和放置范围批准。如果节点命令丢失、被拒绝或断开连接，它永远不会回退到网关本地或 SSH 执行。

对于云配置文件放置，等效的 RPC 流程为：

创建一个存储库会话，分派它，然后发送它的第一条消息。配置文件调度需要 `operator.admin`，并且仅在至少配置了一个工作人员配置文件时可用：

```bash
openclaw gateway call sessions.create \
  --params '{"key":"agent:main:big-refactor","repository":{"url":"https://github.com/example/project.git","ref":"main"}}'

openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:big-refactor","profileId":"aws"}'
```

省略 `ref` 以使用存储库的远程默认分支。分支、标签或提交必须可从该存储库获取。第一次成功的准备会确定确切的提交；即使分支移动，稍后也会调度恢复该提交和接受的检查点。不要将 `repository` 与 `cwd`、`projectId`、`projectGitUrl`、`worktree` 或工作树命名选项结合使用，并且不要在此创建请求中包含初始消息。在主动放置之前发送将被拒绝并带有调度指南。

要保留现有的网关源流，请改为使用 `{"worktree":true,"cwd":"/path/to/repo","worktreeName":"big-refactor"}` 创建。 `projectGitUrl` 仍然表示网关管理的项目克隆。

存储库准备在符合条件的云分配之前固定不可变的源元数据，而无需创建托管网关签出。选择准备好的容量并将其绑定到会话验证当前访问和可见性，包括网关重新启动后中断的配置何时恢复。公共和私人准备身份仍然是分开的。私人准备使用网关上经过身份验证的临时 Git 对象，并仅将经过验证的包传输给工作人员。已经处于活动状态的会话在重新启动后仍会保留其签出和保存的更改；当 GitHub 访问更改时，这不会重新承认准备的容量或撤销下载的文件。没有项目准备的提供者在注册后保留普通结帐。仅当未配置共享或本机 GitHub 身份时，公共源才可以使用匿名访问；不可用的配置身份仍然是一个错误。

存储库准备和准备结账采用不会将 GitHub 凭证传输给工作人员。后续 OpenClaw 工作人员通过现有的 [ 单轮凭证绑定 ](/gateway/config-tools/github-identity)（如果可用）轮流使用有效共享或本机 GitHub 身份。

私有存储库获取使用有效的共享 [`tools.github`](/gateway/config-tools#tools-github) 身份。通过 Control UI 存储库选择器进行的访问本身并不授权该工作人员身份，并且个人发布凭证永远不会用于结账。

存储库设置使用节点上现有的可执行 `.openclaw/worktree-setup.sh` 合约。仅当创建请求设置为管理员并且当前调度调用者也是管理员时，它才会运行。中断的初始设置需要管理员重试调度，除非节点证明承认的设置已经完成。准备采用和检查点恢复不会重新运行安装程序。没有可从中复制 `.worktreeinclude` 文件的本地源。

## <a id="provider-identity-in-the-picker"></a> 选择器中的提供者身份

云配置文件行和选定的地点芯片显示配置的后端，包括 AWS、Azure、Daytona、Google Cloud 和 Hetzner。 Machine0 和 Incus 使用服务器字形；本地容器使用盒子；其他后端使用云。配置文件名称保持不变，即使配置文件名为 `production`，可访问标签也包括后端。重命名配置文件永远不会改变其提供者标记。

在新会话和移动中，公认的云提供商配置文件出现在本地容器、Incus 基础设施和自定义或未识别的后端之前。每个组均按配置文件名称的字母顺序排列。 Machine0 属于云提供商组，尽管它使用服务器标志符号；配置文件名称永远不会决定组。网关和配对设备部分保持现有顺序。

在手机上，新会话环境和工作区控件垂直堆叠并增长至最多可用行宽度的 90%。长选定的名称保留在一行上，并在后缘处淡出而不是换行。操作系统和计算机摘要位于环境名称下方，没有前导分隔符。桌面控件保持水平。

提供者可以通过他们的演示挂钩提供这个可选的只读身份。如果不可用，选择器将保留通用图标。显示 ID 不会更改路由、分配、权限或操作系统和机器选择。

<a id="choose-a-machine-class-per-session" />

## <a id="choose-an-operating-system-and-machine-class-per-session"></a> 选择每个会话的操作系统和机器类别

工作人员配置文件的 `settings.target` 和 `settings.class` 保持默认值；省略的 Crabbox 目标表示 Linux。在 Control UI 新会话选择器中，将鼠标悬停或聚焦在 **Cloud** 下的可配置配置文件以打开其 **操作系统** 和 **机器** 选项。仅显示可用的操作系统。在选择配置文件之前，虚线轮廓标识其默认值。选择任何选项都会选择该配置文件并激活其他设置的默认值。计算机列表显示所选操作系统的类，以及适用于每个系统的任何类，以及报告的 vCPU 和 RAM（如果可用）和默认标记。如果所选类别对于该系统不可用，则更改操作系统会清除该类别。

新会话、调度、移动和重新启动提交选择器中显示的计算机和操作系统。显式选择和配置的默认值优先。如果没有配置计算机默认值，则仅当其报告的 vCPU 和 RAM 都不大于该操作系统的所有其他可用类别时，选择器才会首选某个类别。相同的形状保持供应商的秩序。未知尺寸或 CPU/RAM 权衡保留第一个目录选择。这是硬件尺寸的偏好，而不是价格或工作负载能力的保证；诸如 Small 之类的类名在不同操作系统中的排名并不一致。

选定的配置文件行和关闭的选择器使用选定的值或配置文件默认值，在配置文件名称旁边以静音文本显示操作系统和计算机。仅显示提供者报告的元数据。要覆盖 RPC 上的一个新展示位置的操作系统或大小，请传递 `os` and/or `machineClass` 和 `profileId`：

```bash
openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:big-refactor","profileId":"aws","os":"linux","machineClass":"tiny"}'
```

当所选后端报告匹配目标时，捆绑的 Crabbox 提供程序会通告 Linux、Windows （WSL2）、本机 Windows 和 macOS。在读取目录或启动工作程序之前，该插件会解析受支持的 Crabbox 二进制文件，并在所选二进制文件过期或丢失时自动安装其托管副本。每个目标都使用相同的受支持版本；旧的本地 CLI 不再隐藏非 Linux 目标。有关托管安装策略，请参阅 [Crabbox 配置](/gateway/config-cloud-workers#crabbox-profile)。桌面支持Linux、原生Windows、以及准备好的macOS镜像；不支持 WSL2 桌面。仅保留暖色图像 Linux。请参阅 [ 桌面先决条件 ](/gateway/cloud-workers/desktop)。当目录包含可用的操作系统选项时，会出现 **操作系统** 部分； Crabbox 报告可用目标，每个 Crabbox 机器选项都会标识其 `os`。

对于本机 Windows 选择 `windows/normal`，对于 Windows 内的 Linux 环境选择 `windows/wsl2`。本机 Windows 将 `settings.setup` 作为 PowerShell 运行，并且需要在来宾上支持 Node.js 和 npm。 Headless Windows 工作人员还需要 Crabbox 的独立进程启动器。 Bash 设置配方不能在未更改的情况下重复用于该目标；请参阅 [ Worker 设置和捆绑安装](/gateway/cloud-workers/setup-and-bundle-installation#native-windows-prerequisites)。

选择器提供提供者报告的类以及配置的默认值，即使目录中不存在该默认值。独立显示报告的vCPU和RAM；缺失或不受支持的尺寸仍然未知，包括可选的 macOS 类。它永远不会根据本机类型名称猜测硬件。不可用或不可用的目录元数据会隐藏计算机选择器，但配置文件仍然可选：调度或移动而不覆盖会保留其配置。有关目录过滤、限制和尺寸格式，请参阅 [Crabbox 机器目录](/gateway/config-cloud-workers#crabbox-machine-catalog)。

成功的目录（包括有效的空目录）将在网关生命周期内进行缓存。失败的检查将由下一个发现请求重试；不需要重新启动网关即可恢复。

即使 Crabbox 忽略旧版 `classes` 摘要，映射的 Machine0 类也会出现。这些静态映射描述类选择，而不是当前容量或可用性。 OpenClaw 不会将提供者本机大小目录转换为类。在 Crabbox 的配置中保留本机大小选择：显式配置的本机大小仍然优先于类，因此选择器无法覆盖该引脚或承诺调整大小。通过 `machineClass` 接受本机服务器类型是特定于后端的，而不是通用的 Crabbox 合约。已认可的机器选择对于该放置保持固定，并通过配置重试重用；目录更改不会重写它。 `os` 和 `machineClass` 仅对 `profileId` 有效，对 `deviceId` 或 `autoDevice` 无效。省略任一字段都会使用相应的配置文件默认值。
