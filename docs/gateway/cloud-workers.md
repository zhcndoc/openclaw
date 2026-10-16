---
summary: "通过 OpenClaw 工作轮流或 Codex 远程执行将会话工作分派到一次性云计算机"
title: "云工作器"
sidebarTitle: "云工作器"
read_when: "您希望代理会话工作在临时云计算机上运行，​​或者您正在配置 cloudWorkers 配置文件。"
status: active
doc-schema-version: 1
---

云工作人员在一次性计算机上运行会话的编码工作，而其记录和接受的工作区更改则保留在网关中。通过在网关主机上配置 Crabbox，OpenClaw 可以选择计算机、准备存储库并保存快照，而无需自定义设置脚本。

## <a id="quick-start"></a> 快速开始

打开 **New Session**，选择存储库或 **New 工作区**，然后选择 **Cloud**。如果不存在云配置文件，OpenClaw 可以从您配置的 Crabbox 后端建议一个云配置文件，并在您选择时保存它。查看建议不会安装 CLI、保存配置或分配机器。保存需要管理员权限；现有配置文件优先。

建议的 `cloud` 配置文件使用 Linux、最小的广告标准类、4 小时的总生命周期以及 45 分钟的空闲超时和挂起。启用暖图像。稍后在 **设置 → 连接 → 云环境** 中进行编辑。如果禁用配置重新加载，则保存会安排网关重新启动；等待配置文件变为活动状态并重试选择。

### <a id="first-session"></a> 第一节

对于符合条件的 Linux 存储库，第一个会话会配置其自己的计算机，准备选定的提交和依赖项，安装 OpenClaw 运行时，并在注册节点之前启动快照捕获。启动行显示**正在准备云环境…**，然后**正在保存快照…**。在支持的 AWS 工作线程上，上传可以在会话运行时完成；稍后的会话将重用可用的快照。参见[首次捕获要求](/gateway/cloud-workers/warm-images#first-session-for-a-repository)。

仅存储库的 GitHub 会话不需要网关签出。从网关签出启动的会话通过其 [ 托管工作树 ](/concepts/managed-worktrees) 保留本地和未发布的内容，并在捕获后应用会话更改。 **新工作区** 启动为空，并使用共享运行时映像而不是存储库快照。

### <a id="later-sessions"></a> 后续课程

稍后的会话采用匹配的就绪工作线程或分叉兼容的快照。分叉在注册之前刷新结帐并充值当前运行时间。仅运行时更新不会使存储库快照失效；更改的设置配方或机器设置可能需要冷构建。 [暖图](/gateway/cloud-workers/warm-images)解释了重用、刷新、保留、存储费用和恢复。

### <a id="customize-preparation-and-startup"></a> 定制准备和启动

提交 [`.devcontainer/devcontainer.json`](/gateway/cloud-workers/environment-file) 以进行存储库设置和每次启动命令。 OpenClaw 运行主机模式子集：`onCreateCommand` 和 `updateContentCommand` 准备快照； `postCreateCommand` 和 `postStartCommand` 在会话绑定后运行。如果没有 devcontainer 文件，它使用可执行文件 `.openclaw/worktree-setup.sh`，然后使用 JavaScript 锁定文件检测。

Linux x64和arm64工作人员在需要时会收到经过验证的Node工具链，并且运行时来自正在运行的网关。您的配置文件中不需要全局 OpenClaw 安装或软件包 URL。使用可选的 `settings.setup` 来满足其他机器先决条件；请参阅 [ 设置和捆绑安装 ](/gateway/cloud-workers/setup-and-bundle-installation)。

对于私有依赖项，配置 [setup Secrets](/gateway/config-cloud-workers#setup-secrets)。命令接收不透明的占位符；受保护的出口替代经批准的 HTTPS 目标处的凭证。秘密不会禁用快照。

## <a id="configuration"></a> 配置

**设置 → 连接 → 云环境** 按存储库对快照、设置结果和准备好的工作人员进行分组。选择一个存储库来检查它或使用 **Machine → Change** 选择其默认配置文件。该页面会在工作插件激活后更新，包括保存第一个建议的配置文件后。

展开 **Advanced** 以管理 **Machines**，检查 **Pool**，更改 **快照保留**，或检查**机器映像**，没有存储库。有关配置文件字段和示例，请参阅 [ 页面的操作 ](/gateway/cloud-workers/warm-images#inspect-snapshots-in-the-control-ui)、[ 每个存储库默认值 ](/gateway/cloud-workers/per-project-default-profiles) 和 [ 云工作线程配置参考 ](/gateway/config-cloud-workers)。

根据默认重新加载策略，保存的设置无需重新启动网关即可应用。对于 `gateway.reload.mode: "off"`，从该页面保存会重新启动网关；直接配置编辑需要手动重新启动。保存机器设置不会启动构建； **Rebuild** 准备合格的已记录本地项目。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [云工作人员热图像](/gateway/cloud-workers/warm-images) — 捕获边界、图像重用和刷新、快照固定、删除和回滚、保留策略以及恢复暂停的捕获或旧热图像状态。
- [每项目默认配置文件](/gateway/cloud-workers/per-project-default-profiles) - `cloudWorkers.projectProfiles`，以及固定的Crabbox租赁ID如何使中断的供应可重播。
- [Worker 设置和捆绑包安装](/gateway/cloud-workers/setup-and-bundle-installation) — 用于安全重复命令的 `settings.setup` 合约、网关准备的运行时存档以及构建完整的自定义节点包。
- [验证云工作人员配置文件](/gateway/cloud-workers/verify-the-profile) — 配置验证、应用更改、Codex 命令启用以及依赖配置文件之前的端到端检查。
- [调度云会话](/gateway/cloud-workers/dispatching-a-session) — 资格门槛、新工作区和存储库选择、云子会话以及哪些运行时支持云放置。
- [放置和机器选择](/gateway/cloud-workers/placement-and-machine-selection) - 配对设备上的Codex，Crabbox 配置文件上的harness以及每个会话操作系统和机器级覆盖。
- [云会话生命周期和持久性](/gateway/cloud-workers/session-lifecycle) — `sessions.dispatch` 的作用、工作区协调和冲突、移动、停止和回收、恢复以及死机的生存。
- [Cloud Worker Desktop](/gateway/cloud-workers/desktop) — 桌面实验室和 `settings.desktop`、Crabbox 提供的内容以及查看者如何在没有公共入口的情况下访问它。
- [云工作人员安全模型](/gateway/cloud-workers/security-model) — 封闭的工作人员入口、网关拥有的工具权限、铸造凭证、注册绑定和凭证边界。
- [云工作人员故障排除](/gateway/cloud-workers/troubleshooting) - 广告、授权、引导、注册、协调、发布和拆卸的症状和修复。

## <a id="what-runs-where"></a> 运行位置说明

| 关注点                            | OpenClaw `worker-turn` 模式                          | Codex `remote-exec` 模式                                |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| 代理运行时间和回合循环        | 云盒（`openclaw worker`）                        | 网关（Codex 应用程序服务器）                              |
| Shell 命令和工作区文件 | 云盒                                            | 云节点、配对设备或 SSH- 支持的提供商       |
| 模型推理和提供者身份验证  | 网关，由 `{provider, model}` 参考代理    | 网关，包括ChatGPT订阅或API-key认证 |
| 成绩单和实时会话状态  | 网关，由工作人员的可重播事件流提供 | 通过正常本地harness路径的网关           |
| 工作区文件状态               | 盒子上已更改；由网关协调        | 远程更改；由网关协调             |

用于 Web 搜索、Web 获取、内存和消息传递的 OpenClaw 工具在会话准备的策略和实时权限下在网关上执行。命令或应用程序发出的 HTTP 请求仍然在其位置执行。

进行自己的模型 API 调用的应用程序需要单独的凭据路由。对于独占协调器支持的 Linux 租约，当应用程序使用受保护的出口桥时，使用 [`openclaw crabbox run`](/gateway/secrets/secret-store-and-egress#model-credentials-for-crabbox-commands) 将配置的 API 密钥保留在主机上。

捆绑的 Crabbox 云提供商通过其注册的节点传输来宣传 `worker-turn` 和 `remote-exec`，因此相同的云配置文件可用于这两个工具。 Codex 还可以使用明确授权的配对设备或保留 SSH- 支持的远程执行运营商的提供商。仅通告一种模式的配置文件对于其他运行时仍然不可用。

Crabbox 设置后，云节点通过出站 WebSocket 拨打网关的公共 TLS 端点。工作器控制、Codex 远程执行和工作区传输使用经过身份验证的节点或工作器通道，而不是网关创建的反向隧道或 rsync。 Crabbox 本身可能仍然需要 SSH 可访问性，而其 CLI 运行提供商拥有的设置命令。出站互联网访问和设置可达性遵循所选后端的网络策略；在 Crabbox 中配置它们。

OpenClaw `worker-turn` 会话可以在节点支持的云工作人员（包括捆绑的 Crabbox 提供程序）上打开 [portals](/gateway/portals)。对于每个代理的 HTTP 或 WebSocket 连接，注册节点通过 TLS- 固定到网关的 WebSocket 兑换一次性票据，并连接到工作人员选择的环回端口。这将保留现有的 **Control UI → Portals** 体验、身份验证和实时重新加载，而无需打开入站工作端口或创建 SSH 隧道。仅当节点通告门户流支持时，该工具才可用；较旧的节点包不会收到它。 SSH- 支持的 `remote-exec` 展示位置（包括 Codex 会话）不运行 OpenClaw 辅助工具循环，因此 `portal` 工具不适用于此处。当需要网关托管的门户时，更新不受支持的节点或使用 `sessions.move` 将会话移回网关。

对于公共 HTTPS 入口后面的环回网关，请将 `gateway.publicOrigin` 设置为代理的裸源。云节点注册明确要求共享配对解析器优先选择公共入口：`plugins.entries.device-pair.config.publicUrl` 获胜，然后是 `gateway.publicOrigin`，然后是现有的 remote/Tailscale/bind 发现。这可以保留云注册行为，并避免在配置公共源时将新工作人员定向到私有 LAN 或 tailnet 地址。针对本地网关的呼叫者忽略了远程 URL。 HTTP（S） URL 成为匹配 `ws:`/`wss:` 配对端点。

设备加入代码 `/pair` 和 `openclaw qr` 使用相同解析器的默认意图，保留其通告的地址：配对覆盖、首选远程 URL、Tailscale Serve/Funnel、非首选远程 URL，然后绑定派生地址。他们仅使用 `gateway.publicOrigin` 作为仅环回错误之前的最终后备，因此添加公共源不会更改现有的设备配对路由。

云调度在分配机器之前拒绝环回、链路本地或未指定的网关地址。如果公共 URL 位于反向代理（包括 cloudflared、nginx 或外部管理的 Tailscale Serve）后面，则 `gateway.trustedProxies` 必须包含代理的源地址（通常是同一主机代理的环回）。否则，转发的客户端标头会导致节点注册失败并显示 `proxy_attribution_required`。

代理还必须将 `/__openclaw__/worker-bootstrap/artifacts/<sha256>` 及其公共节点和工作路由转发到网关。新的云节点先通过此经过身份验证的 HTTP 路由下载其运行时，然后才能通过 WebSocket 进行连接。保留`Authorization`标头；不要通过未经身份验证的静态文件路径公开这些档案。

Node 和 SSH 工作区访问和协调比工作人员 RPC 凭证过期，因此空闲会话仍然可以安全地停止、移动或暂停。两者都保留现有的撤销和所有者纪元检查；节点传输还保留自己的十分钟到期和会话所有权检查。

## <a id="requirements"></a> 要求

- A 工作提供者插件。捆绑的 `crabbox` 插件驱动 [Crabbox](https://crabbox.sh/) CLI； Crabbox 拥有受支持的云后端及其配置。该插件会自动为网关用户准备其支持的 CLI，从而使托管发行版与操作员安装的二进制文件分开。它还可以使用 `PATH` 或 `settings.binary` 中受支持的可执行文件。需要 Crabbox 0.77.0 或更新版本。有关托管 CLI 安装和受限主机升级，请参阅 [Crabbox 配置](/gateway/config-cloud-workers#crabbox-profile)。
- 对于Crabbox AWS工人，有效的`aws.instanceProfile`必须为空。提供者在分配之前检查`crabbox config show --json`，然后要求`crabbox inspect --json`从EC2 `DescribeInstances`报告`providerMetadata.instanceProfileAttached: false`。具有实例角色或不具有权威元数据的租约将被停止并拒绝。本地 CLI/configuration 准备失败在分配边界之前完成，并且不会为不存在的租约留下清理请求。分配请求后的失败仍然保留其确切的清理所有者，直到 Stop 证明已释放。
- 在Linux x64/arm64上，OpenClaw在需要时自动安装经过验证的官方Node.js工具链；该映像必须提供兼容的 glibc、`curl`、`tar` 和 `sha256sum`，其中 HTTPS 访问 nodejs.org. macOS 和 Windows 需要受支持的 Node.js 和npm 由图像或可选配置文件 `setup` 提供。本机 Windows 需要在机器 `PATH` 上使用它们。 Headless Windows 工作线程还需要 Crabbox 的托管分离进程启动器；请参阅 [Windows 先决条件](/gateway/cloud-workers/setup-and-bundle-installation#native-windows-prerequisites)。该计算机还需要注册表访问权限来安装其操作系统和 CPU 的运行时依赖项。
- GitHub CLI （`gh`） 位于工作人员的 `PATH` 上，用于 GitHub 命令和 HTTPS 推送。密封的工作程序包包括凭据绑定启动器，而不是 GitHub CLI。 Crabbox 开发者镜像包括 `gh`；将其安装在 `settings.setup` 中以获取其他图像。
- A 使用 `repository: { url, ref? }` 创建的存储库会话，或使用 `worktree: true` 创建的实时、注册表拥有的会话管理工作树。添加 `worktreeSource: "empty"` 以创建一个没有用户存储库的全新工作区。存储库源需要托管节点和对上游 Git 存储库的访问权限。不会复制或发送任意普通网关文件夹；选择一个新的工作空间。

<a id="coordinator-backed-crabbox" />

### <a id="crabbox-provider-support"></a> Crabbox 提供商支持

因确切的 `provider=<backend> does not support fixed idempotent lease IDs` 能力拒绝而退出的新分配将永久失败，而不安排对不存在的租约进行清理。选择具有固定租用 ID 支持的后端。重播期间的相同拒绝不能反驳先前的分配，因此其清理责任仍然存在，直到确认释放或缺席为止。

选择带有 `settings.provider` 的 Crabbox 后端。使用 [Crabbox 提供程序参考](https://crabbox.sh/providers/index.html) 了解支持的提供程序、身份验证、大小调整、快照、网络和特定于提供程序的限制。 OpenClaw不维护单独的后端目录；接受配置文件并不表明后端可以托管云会话。

安装的 Crabbox 版本和选定的后端必须支持固定 ID `warmup --lease-id`、通过 `run --script-stdin` 执行目标本机脚本，以通过分配的租约 ID 进行设置和注册、租约检查和拆卸。脚本在本机 Windows 上使用 PowerShell，在 Linux、macOS 和 Windows （WSL2） 上使用 POSIX shell。切勿删除 `--lease-id` 来绕过后端功能拒绝：它可以防止中断调度后的重复分配。 OpenClaw 保留不支持的后端诊断；单独升级 CLI 并不能建立后端支持。心跳支持刷新有效空闲窗口；它不会延长总寿命。可选桌面和暖图像功能具有 [ 暖图像](/gateway/cloud-workers/warm-images) 和 [Cloud Worker Desktop](/gateway/cloud-workers/desktop) 中所述的附加要求。

当所选后端支持 Linux、Windows （WSL2）、Windows 和 macOS 时，Crabbox 会宣传它们。该插件在读取后端目录之前准备好支持的CLI。 Windows 表示本机 Windows （`windows/normal`），带有 PowerShell 设置命令。桌面支持Linux、原生Windows、以及准备好的macOS镜像； WSL2 桌面不受支持。仅保留暖色图像 Linux。请参阅 [ 桌面先决条件 ](/gateway/cloud-workers/desktop)。 AWS macOS 工作人员需要可用的 EC2 Mac 专用主机并使用按需分配。对于固定的专用主机，通过 Crabbox 环境或网关主机上的配置提供主机 pin 和所需的协调器管理员身份验证。切勿将代理凭据放入 OpenClaw 配置文件设置中。有关每个会话覆盖的信息，请参阅 [ 操作系统选择](/gateway/cloud-workers/placement-and-machine-selection#choose-an-operating-system-and-machine-class-per-session)。

为运行网关的操作系统用户配置 Crabbox。按照其 [ 身份验证指南 ](https://crabbox.sh/features/auth-admin.html) 进行协调员访问，或按照所选提供商的指南获取直接凭证。将凭据保留在 OpenClaw 配置文件设置和命令参数之外，并在网关重新启动时保留 Crabbox 的状态目录，以便可以安全地恢复分配和清理。

检查已安装的提供商合同并检查准备情况，而无需分配机器：

```bash
crabbox providers --json
crabbox providers describe <backend> --json
crabbox doctor --provider <backend> --json
```

只读就绪状态并不证明分配、设置、注册或清理。在依赖新的配置文件之前验证完整的会话流程；请参阅 [ 验证配置文件 ](/gateway/cloud-workers/verify-the-profile)。

### <a id="lease-lifetime"></a> 租赁寿命

工作人员的 TTL 从创建开始计数，包括配置。其空闲超时会计算不活动情况，较早的截止日期会结束租约。建议的 `4h` / `45m` 配置文件符合 Crabbox 默认的四小时最大值。所有者或组织策略可以允许更长的 TTL（最长 24 小时）、拒绝延期或限制请求的持续时间；政策收紧也适用于活租。 OpenClaw 使用有效的政策并表面消毒夹钳通知。参见[Crabbox配置](/gateway/config-cloud-workers#crabbox-profile)。

`keep` 在一条命令后保留一台机器；它不会阻止过期。普通心跳和桌面活动不会更新总计 TTL。 Crabbox `run` 仅在命令执行时且仅在策略和预算范围内才能请求有界自动扩展。长会话必须在到期前保存和协调工作，并使用正常的停止或挂起生命周期。像 Daytona 这样的创造固定提供商在分配时需要足够的 TTL。 [暖图像捕获](/gateway/cloud-workers/warm-images#capture-lifetime)单独检查其源的剩余寿命。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个标题都在此处保留其锚点，因此现有链接（例如 `/gateway/cloud-workers#bundle-installation`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="warm-images" />[温馨画面](/gateway/cloud-workers/warm-images#warm-images)
- <a id="recover-a-paused-capture" />[恢复暂停的捕获](/gateway/cloud-workers/warm-images#recover-a-paused-capture)
- <a id="upgrade-warm-image-state" />[升级暖图像状态](/gateway/cloud-workers/warm-images#upgrade-warm-image-state)
- <a id="per-project-default-profiles" />[每个项目默认配置文件](/gateway/cloud-workers/per-project-default-profiles#per-project-default-profiles)
- <a id="the-setup-command" />[设置命令](/gateway/cloud-workers/setup-and-bundle-installation#the-setup-command)
- <a id="bundle-installation" />[捆绑安装](/gateway/cloud-workers/setup-and-bundle-installation#bundle-installation)
- <a id="build-a-complete-custom-node-package" />[构建完整的自定义节点包](/gateway/cloud-workers/setup-and-bundle-installation#build-a-complete-custom-node-package)
- <a id="verify-the-profile" />[验证配置文件](/gateway/cloud-workers/verify-the-profile#verify-the-profile)
- <a id="dispatching-a-session" />[调度会话](/gateway/cloud-workers/dispatching-a-session#dispatching-a-session)
- <a id="cloud-child-sessions" />[云子会话](/gateway/cloud-workers/dispatching-a-session#cloud-child-sessions)
- <a id="runtime-support" />[运行时支持](/gateway/cloud-workers/dispatching-a-session#runtime-support)
- <a id="codex-on-a-paired-device" />[配对设备上的Codex](/gateway/cloud-workers/placement-and-machine-selection#codex-on-a-paired-device)
- 云配置文件上的 <a id="codex-or-openclaw-on-a-cloud-profile" />[Codex 或 OpenClaw](/gateway/cloud-workers/placement-and-machine-selection#codex-or-openclaw-on-a-cloud-profile)
- <a id="choose-a-machine-class-per-session" />[选择每个会话的机器类别](/gateway/cloud-workers/placement-and-machine-selection#choose-a-machine-class-per-session)
- <a id="choose-an-operating-system-and-machine-class-per-session" />[选择每个会话的操作系统和机器类别](/gateway/cloud-workers/placement-and-machine-selection#choose-an-operating-system-and-machine-class-per-session)
- <a id="what-survives-a-dead-machine" />[死机里还有什么](/gateway/cloud-workers/session-lifecycle#what-survives-a-dead-machine)
- <a id="desktop-(interactive)" /><a id="desktop-interactive" />[桌面（交互式）](/gateway/cloud-workers/desktop#desktop-interactive)
- <a id="security-model" />[安全模型](/gateway/cloud-workers/security-model#security-model)
- <a id="troubleshooting" />[故障排除](/gateway/cloud-workers/troubleshooting#troubleshooting)

## <a id="related"></a> 相关内容

- [Sandboxing](/gateway/sandboxing) — 限制本地工具可能造成的损害
- [Sessions CLI](/cli/sessions) — 检查已存储的会话
- [配置参考](/gateway/configuration-reference)
- [`openclaw worker`](/cli/worker) - 网关拥有的启动器在准备好的工作环境中启动的受限运行时入口点
- [Gateway RPC 方法](/gateway/protocol/rpc-methods) — RPC 方法系列、发现和事件系列
- [Operator 范围](/gateway/operator-scopes) — 这些工作线程调用被授权的范围
