---
summary: "个人资料广告、授权、引导、注册和拆卸的症状和修复"
title: "云工作人员故障排除"
doc-schema-version: 1
read_when: "云调度、移动、停止或发布失败，您需要匹配的修复。"
---

您在调度到云工作人员或在云工作人员上运行时可能会看到的症状，以及解决每个问题的检查。

设置机密需要受保护的、目标绑定的共享存储条目和 Crabbox 在自有协调器 Linux 租约上的本机出口助手。不受支持的 CLI 需要更新；缺少运行时助手需要重新安装匹配的完整 Crabbox 版本。协调器登录错误需要网关主机上的 `crabbox login --url <broker-url>`。代理不可用错误需要检查网关的秘密代理先决条件并在修复后重新启动网关。这些错误都不会退回到明文或直接秘密出口。

对于未映射的存储库机密，请将其名称添加到所选配置文件的 `settings.setupSecrets` 中。对于 missing/unbound 存储条目，将其保存为受保护的机密，并使用 `openclaw secrets store set <NAME> --allow-host <host>` 设置其确切的 HTTPS 目标。如果配置文件仍使用 `setupEnv`，请运行 `openclaw doctor --fix` 并解决其报告的缺失绑定或冲突值，然后重试。现有租约仍可解除。

## <a id="troubleshooting"></a> 故障排查

- **“节点在回合结束前断开连接”** — 节点主机在执行过程中停止或连接丢失。对于 OpenClaw 工作轮换模式下的聊天轮换，OpenClaw 会保存收到的部分文本和每个未完成工具的结果未知的错误结果，然后在正常的两分钟准入窗口内等待工作区恢复和节点。具有自己的回复所有者的已承认轮次会在更新的排队输入之前自动继续会话一次，而不会重播中断的工具调用。非幂等命令可能在丢失之前已完成；模型必须在重试之前检查文件、正在运行的进程或其他受影响的状态。第二次丢失、成绩单保存失败、工作人员不可用或缺少匹配的延续所有者都会以“本轮不会自动继续”结束。在发送另一条消息之前恢复节点并检查会话状态；正常放置恢复后会话仍然可用。
- **`Worker transcript commit failed; check Gateway logs.`** — 网关无法完成副本提交。永久性故障（包括格式错误的数据库准入收据）会导致回合结束；在重试之前，请检查 `worker transcript commit failed` 警告以了解根本原因。临时准入失败，包括并发模式发布使收据无效、重新连接并使用新准入重放。失败并不能证明没有坚持下去。从删除的确认中恢复仍会重播原始提交标识以避免重复消息。
- **`Crabbox profile setup failed`、`Crabbox node runtime preparation failed` 或 `Crabbox node enrollment setup failed` 以及 `coordinator read retry N/M reason=timeout` 和 `context deadline exceeded`** — OpenClaw 重试同一固定租用命令最多 3 次当每条输出线都是协调器超时诊断时，在现有阶段预算内进行回退。任何脚本输出都会阻止重试。耗尽的错误保留协调器诊断和尝试计数；在再次调度之前检查协调员的可用性。
- **`provider=<backend> does not support fixed idempotent lease IDs`** - OpenClaw 云工作人员需要具有固定租用 ID 支持的 Crabbox 后端。选择兼容的后端；不要删除 `--lease-id`。这种精确的 exit-2 拒绝发生在 Crabbox 请求机器之前，因此如果没有清理请求，新的调度将永久失败。其他 exit-2 失败和重播期间的拒绝保留可能的分配责任。
- **A 工人仍为 `destroying` 和 `has no local claim`、`does not match a valid ... claim`、`no exact resource-bound local claim` 或 `strict claim identifier mismatch`** — 丢失或不匹配的本地所有权记录并不能证明远程缺勤。检查提供商清单中的确切租约并恢复正确的 Crabbox 状态，或在重试停止之前遵循提供商的所有权恢复程序。 “如果较早停止证实缺席，则无需采取任何行动”的措辞是有条件的； OpenClaw 不能单独使用它来清除现有的清理义务。

- **A 工作线程在有心跳或打开桌面的情况下仍会过期** — 心跳刷新空闲时间，而不是总生命周期。使用 `crabbox inspect --provider <backend> --id <lease> --json` 检查确切的租约，并阅读其有效政策和经过净化的政策通知。 TTL 和空闲的默认时间为 30 分钟，最长为 4 小时；业主或组织的政策可能有所不同，并且可能会限制实时租赁。在到期前保存并协调工作，然后使用普通的停止或挂起生命周期。
- **Capture 报告生命周期不足或延期拒绝** — `lease_extension_denied` 或 `lease_extension_budget_exceeded` 表示未授予额外时间； `lease_extension_not_advancing` 表示目标或政策上限无法提前。 `lease_not_active` 无法恢复租约。创建固定的提供商（例如 Daytona）在创建时需要足够的 TTL，并拒绝使用 `lease_extension_unsupported_provider` 进行扩展。明显跳过可选捕获；所需的捕获准备失败。不要无限期地更换提供商或重复延期。尽管提供者的截止日期更长，但直接来宾刷新失败可能会使旧的机上截止日期仍然有效；在依赖之前使用相同的固定总 TTL 和 Crabbox 状态进行协调。
- **直接分配被拒绝**— Crabbox 值得信赖`directLeases: deny`配置阻止其之外的提供者`directLeaseAllow`；使用其配置的协调器路径。更正 Crabbox 配置，而不是使用直接凭据绕过它。

- **没有公布云配置文件** — 运行 `operator.read`-scoped `openclaw gateway call environments.list --params '{}'`。如果响应中没有 `profiles`，请要求管理员验证 `cloudWorkers.profiles` 并检查提供程序插件；配置更改无需重新启动即可重新加载；使用`gateway.reload.mode: "off"`，网关配置写入如Control UI保存重新启动网关，直接文件编辑等待手动`openclaw gateway restart`。这是配置或提供程序激活问题，而不是授权结果。
- **云目标被隐藏或 RPC 被拒绝** — 云配置文件调度和配置文件目标移动需要 `operator.admin`。 `operator.write`可以调度或移动到符合条件的配对设备，移动到网关，并收回放置； `operator.read` 可以单独发现配置文件，但无法启动、停止或移动会话。配置文件配置、基础设施配对、连接机器、原始环境生命周期、直接 `execNode` 执行、隐身会话以及任意主机或节点路径仍保留为 `operator.admin`。
- **所选运行时缺乏云放置支持** — 选择其宣传的运行时支持云放置的模型。支持捆绑的 OpenClaw 和 Codex 运行时；未声明的运行时仍然仅限于本地。
- **Codex 无法使用云配置文件** — 验证配置文件是否通告 `remote-exec`、网关是否启用受信任的 Codex 插件安装，以及 `gateway.nodes.commands.allow` 是否包含 `codex.exec-server.stdio.v1` 而没有匹配的拒绝规则。 Bootstrap 自动提供云节点插件。出现提示时批准确切的节点调用。 Codex 不需要可用的 OpenClaw 工作插槽；必须纠正丢失的插件或被拒绝的命令，而不是通过网关或 SSH 执行绕过。
- **门户工具在工作线程上不可用** - 确认会话在通告门户流支持的注册节点上使用 OpenClaw `worker-turn`。必要时更新旧的节点包。 SSH- 支持的 `remote-exec` 展示位置（包括 Codex 会话）不运行 OpenClaw 辅助工具循环；当需要网关托管的门户时，使用 `sessions.move` 将会话移回网关。
- **Node 工具链下载或 SHA-256 验证失败** — 允许 HTTPS 访问 `nodejs.org`，检查下载代理和可用磁盘空间，然后重试准备。 Linux x64/arm64 映像需要兼容 glibc、`curl`、`tar` 和 `sha256sum`。不要绕过校验和验证。不受支持的存储库 Node 要求必须在其版本声明中修复。 macOS 和 Windows 仍需要镜像中支持的 Node 和 npm 或可选的 `settings.setup`；请参见 [自动 Linux Node 工具链](/gateway/cloud-workers/setup-and-bundle-installation#automatic-linux-node-toolchains)。
- 云工作者上的 **`gh: command not found`** — 在 `settings.setup` 中安装 GitHub CLI（请参阅 [ 设置命令 ](/gateway/cloud-workers/setup-and-bundle-installation#the-setup-command)），或将其安装在配对的工作主机。 Crabbox 开发者镜像包含它；密封的工作包则没有。
- **存储库准备报告 `clone-failed` 或 `checkout-failed`** — 放置错误包括 Git 阶段、退出或终止状态以及有界的、经过编辑的 stderr。在重试调度之前，使用该详细信息检查节点上的 Git 可用性、存储库访问或网络连接。本机 Windows 存储库准备启用了 Git 的长路径处理，因为当部分克隆创建 `.promisor` 文件时，嵌套会话目录可能会超出限制。
- **准备的项目 Git 验证失败** — 该错误标识了 Git 子命令以及它是否超时、超出其输出缓冲区、启动失败、退出失败或收到信号。准备好的工作空间 Git 操作最多允许十分钟，在提供商的总体命令期限内匹配种子验证。 `git fsck` 超时可能表示从新启动的快照读取速度缓慢；不成功的退出需要调查工作人员的 Git 对象存储。在缓存重用之前仍会运行完整的完整性检查。
- **Windows 工作区传输报告 `Filename too long`** — 更新网关并重新配置工作线程。新传输的工作空间在其私有存储库中启用 Git 的长路径处理，因此包导入、签出和稍后的工作空间捕获可以使用深度嵌套的会话路径。全局 Git 配置和 Windows 注册表设置保持不变。
- **AWS 实例角色证明失败** — 清除 `aws.instanceProfile`（以及 `CRABBOX_AWS_INSTANCE_PROFILE`，如果已设置）。该插件在 AWS 入场之前自动安装支持的 Crabbox；使用 `openclaw doctor --fix` 诊断失败的托管安装。
- **调度或工作区恢复失败**——检查 `environments.list` 和 `sessions.describe`。失败的环境会公开其有界环境错误。失败的放置会公开 `recoveryError` 以及其持久化的每会话 `terminalReason`；选定的 Control UI 聊天会在编辑框上方显示该终止原因。如有必要进行更深入的诊断，Gateway 主机上的操作员可以只读方式检查持久化的 worker 状态。不要编辑状态数据库来绕过生命周期围栏。
- **Node 工作程序启动被拒绝** — 该错误命名失败的启动、状态或取消命令，并包括节点的有限、经过编辑的诊断。当节点以无效为由拒绝新的启动请求（`INVALID_REQUEST`）时，轮次会立即失败而不会取消，因为该节点从未注册过该启动；无效的启动描述符通常意味着网关和节点运行不同的版本，因此请更新旧版本。如果无法确认取消，则错误还包括取消失败；在重试之前检查工人的状态。失败的放置会保留其记录的原因；仅当该原因识别出构建不匹配时，才会出现构建更新指南。
- **存档失败** — Control UI 立即隐藏会话并仅在存档本身被拒绝时才恢复会话。活动会话工作必须完成停止；重复的请求不能替代已经停止该工作的操作。可以对已经失败的工作线程进行归档，同时提供程序清理仍处于待处理状态，并保留其工作树和恢复记录。保存存档后工作树清理错误将被记录下来以供以后清理。客户端超时不会取消已接受的请求或证明其结果；在重试之前检查会话的当前存档状态。
- **Crabbox 设置无法达到租约** — 检查 [Crabbox 提供商参考 ](https://crabbox.sh/providers/index.html) 中所选后端的网络和设置传输要求。更正 Crabbox 的配置并重新运行 `crabbox doctor --provider <backend> --json`，然后重试。
- **Crabbox 命令执行失败** — 该错误保留有界的、经过编辑的运行程序诊断。进程启动后（包括输出捕获或清理期间）可能会发生执行失败。 Bootstrap 版本验证和插件激活错误包括退出代码、信号和已清理的 stderr 尾部；使用该原因来诊断丢失的依赖项或终止的进程。
- **A Linux 配置文件分配另一个操作系统** — 更新网关。 Linux 分配明确请求 Linux，覆盖环境 Crabbox 目标或配置默认值。 Windows模式和macOS市场选择仍然遵循已解决的配置文件。
- **Crabbox 检查报告协调员读取重试** — Crabbox 拥有在一分钟预算内的读取重试。 OpenClaw 允许每次租约检查两分钟，其中包括在已加载主机上进程启动和退出的一分钟； Machine0 保留五分钟的准备时间。配置读取也尊重剩余的总体截止日期。如果检查仍然失败，请在重试调度之前检查协调器可用性和 `crabbox inspect --provider <backend> --id <lease> --json` 的租约。
- **Crabbox 工作人员在其租约从未被承认后仍留在 `destroying`** — 更新网关。在下一次协调时，协调器租约读取和释放的正常退出停止报告 `404/not_found` 完成拆卸并释放热映像分配所有权。两个响应都必须命名该租约。公认的直接提供商 exit-4 缺席也完成了拆解；身份验证错误、超时、输出不完整和发布失败仍然是错误。
- **Session 在空闲后显示回收或暂停的徽章** — 当其配置文件设置 `suspendAfter` 时，这是预期的。下一条消息提供了一个替代工作人员，当图像存在时，它会很温暖。
- **A 热映像不可用** — 新分配可以在记录其选择之前选择冷配置。已承认的分配通过重试保留其原始 cold/checkpoint 选择。如果其检查点无法分叉，请解决提供者错误或在开始替换之前停止该分配；重试不会静默切换图像。
- **热映像迁移或容量块调度** — 运行 `openclaw doctor --fix` 以获取旧状态并遵循其确切的清理指南。对于容量，停止杰出​​的工作人员或使用 `openclaw crabbox warm-images` 解决挂起的图像清理问题；分配选择和清理义务永远不会被驱逐以腾出空间。
- **`checkpoint mode must be auto, native, or archive` 和暂停的捕获** — 后端拒绝本机捕获，但较旧的 CLI 没有报告明确的拒绝。在配置文件使用的可执行路径中使用 Crabbox 0.77.0 或更新版本，或运行 `openclaw doctor --fix` 来准备 OpenClaw 的托管 CLI。明确拒绝允许继续注册并在 `warmImages.refreshAfter` 后重试捕获；现有的兼容快照仍然可用。在协调源租赁和提供者工件之后，已经不确定的捕获仍然需要 [ 暂停捕获恢复](/gateway/cloud-workers/warm-images#recover-a-paused-capture)。在存储库表中查找恢复，或者在没有存储库的情况下进行捕获的 **高级 → 机器映像** 中查找恢复。设置 `settings.warmImage: false` 以停止捕获尝试。

- **项目图像捕获失败** — 会话在捕获恢复指令之前报告底层提供程序诊断，例如检查点配额拒绝。在重试之前解决该原因。未解决的捕获仍然会阻止注册，直到提供者工件和记录的捕获得到协调。
- **Cloud 引导程序请求重建** — 在网关源签出中运行 `pnpm build`，然后重新启动网关并重试。正在运行的构建、其包元数据和构建的插件输出必须一致；仅编辑源代码或匹配显示的版本是不够的。
- **Cloud 引导程序下载失败** — 该错误标识连接、TLS、HTTP- 响应或正文传输阶段。 Crabbox 以指数退避重试瞬时传输故障和 HTTP 502/503/504/520/521/522/523/524/530 响应，在九次连续失败且没有字节进展后停止。新下载需要大约 24-40 秒的总退避时间，以度过短暂的网关边缘中断； HTTP 525/526 TLS 错误仍然立即停止。尝试增加保留的部分文件会重置该失败计数。总工作量仍受现有核心大小的设置命令截止时间的限制，并且每个停滞的连接或正文传输在两分钟空闲后超时。中断的下载保留其部分文件并使用 `Range: bytes=N-` 请求剩余字节，因此缓慢或易于重置的代理不会强制每次尝试返回字节零。完整的 HTTP 200 响应替换部分文件；不一致的范围会丢弃它，并在相同的无进度限制内从零开始重试。安装前完整的存档必须仍与其声明的大小和 SHA-256 相符；完整性失败丢弃部分字节并停止。每个引导程序令牌允许最多 256 个串行服务，计算已完成和中断的完整或范围响应。此固定上限可容纳频繁的恢复，同时限制工件重播，包括缓冲代理重置其下游连接时。并发请求收到HTTP 503和`transfer_in_progress`；这些繁忙的响应在设置命令的最后期限内以退避方式等待，而不花费无进展故障预算。其他 HTTP 503 响应仍计入该限制。 Bootstrap 和 Node-Worker-Bundle 传输代币共享 45-95 分钟的大小衍生的 Bootstrap 操作窗口，并在注册或操作结束后立即撤销； node-worker-bundle 传输令牌仅允许一次服务。范围减少每次服务的字节数；重试永远不会延长这些生命周期、提高服务预算或绕过所有者撤销。每次重试都会记录阶段、错误代码、尝试计数和连续的无进展失败。完整性、身份、不安全路径、TLS-pin 和 HTTP 401/403/404/409/410 故障立即停止。 `download TLS` 复位发生在 HTTP 响应之前；从工作线程（而不仅仅是网关主机）检查工作线程提供商的出站策略和网关的 TLS 端点。对于 HTTP 状态，请检查代理路由和下载授权。 `download body` 错误表示响应标头已到达；检查中断的传输、本地磁盘或存档完整性错误。使用提供商政策允许的网关源；不要禁用证书验证或绕过该策略。
- **Bootstrap 下载失败，并显示 `ECONNRESET` / 从工作器重置连接** — 重复的连接级故障且没有保留字节意味着工作器无法到达错误中指定的网关公共源。从提供商沙箱内部探测该来源，例如 `curl -v --connect-timeout 15 --max-time 30 https://gateway.example.com/`（将示例替换为报告的来源；不需要工件 URL 或令牌）。 HTTP响应表明TLS连接成功；在任何响应指向提供商的出站网络策略或源的 TLS 端点之前进行重置。从其他主机成功下载并不能证明该源是可访问的。一些提供商的出口过滤器将 TLS 重置为快速隧道主机名，例如 `*.trycloudflare.com`；这是在 2026 年 10 月 3 日在代托纳观察到的。在可从该提供商访问的主机名上配置 `gateway.publicOrigin`，然后重试调度。
- **Node 注册超时** — 该命令现在使用核心大小的引导窗口进行下载和安装，而不是固定的 15 分钟截止时间。较大的工件和较慢的网关上行链路会获得更多时间，包括恢复的传输。项目准备会计算两个存档，因为并发下载共享上行链路。外部拨款预算在拨款存在之前保留这项工作，并保留单独的连接等待、诊断和清理津贴。配对持续时间为实时注册及其大小派生窗口，包括节点连接等待，而不是在十分钟后过期。关闭或超时未完成的注册会撤销其配对凭证并阻止其配对；重播为相同的设置身份颁发新的凭据。检查注册错误中包含的引导下载或安装错误、节点进程状态和有界节点日志尾部。验证自动 Linux 引导程序（或 macOS/Windows 映像）是否提供受支持的 Node.js 和 npm、npm 是否可以访问依赖项注册表，以及该框是否可以访问网关公布的 TLS URL。通过代理转发 `/__openclaw__/worker-bootstrap/artifacts/<sha256>` 以及公共 worker/node WebSocket 路由。如果错误包含`proxy_attribution_required`，请将反向代理的源地址添加到`gateway.trustedProxies`。
- **客户端调度时超时** — `openclaw gateway call` 默认为 10 秒超时；大方地传`--timeout`。无论哪种方式，Dispatch 都会在服务器端保持运行，并且在同一网关上进行相同的重试会加入该正在进行的操作，而不是配置另一个工作线程。使用不同配置文件或会话身份的重试将被拒绝。
- **`doctor` 通过后，提供者授权失败** — 只读就绪状态并不能证明分配或拆除租约的权限。检查被拒绝的操作并遵循 [Crabbox 提供程序参考 ](https://crabbox.sh/providers/index.html) 中所选提供程序的配置和清理要求。
- **网关更新后工作程序运行时更新** — OpenClaw 在现有计算机上安装当前工作程序包，保留其工作区、已安装的软件包和桌面。后台协调开始在重新连接的配对主机上安装新的运行时并保留会话，通常在重新连接后大约一分钟内。在网关日志中跟踪该安装，该日志记录开始、每 30 秒的进度、有原因的中断以及完成；会话 RPC（例如 `sessions.describe` 和 `sessions.list`）可以等待协调传递完成。对于通过首次调度或提交的回合执行的安装，配置或活动会话放置中的 `workerRuntimeInstall` 以及 Control UI 聊天通知还会显示传输和安装进度。同时提交的轮次等待同一次传输；卡住会话诊断报告该等待轮次的 `worker:runtime_refresh` 和执行安装的第一次调度的 `worker:runtime_install`。失败的运行时更新保留机器以进行恢复；检查网关的工作环境日志中是否有安装程序错误。中断的节点通过具有新的执行权限的正常会话恢复来恢复。显式停止和移动请求仍会完成其拆卸，并且提供商已丢失的机器无法重新使用。
- **`Cloud worker finished, but its workspace result could not be reconciled`** — 阅读 `node workspace command failed (<code>)` 和节点主机日志中匹配警告之后的详细信息。工作区错误保留有限的、经过编辑的诊断信息，包括文件系统和进程帮助程序故障。如果 root 拥有的容器报告 `workspace quiescence refuses root-owned worker sessions`，请更新节点主机以及网关；本机 Linux 帮助程序支持 root 拥有的会话，而无需冻结其他 root 进程。较旧的分离脚本仍然需要非根工作人员帐户。
- **云工作区冲突通知**——该轮次已完成，并保留了所列每个路径的本地版本。使用通知中的 staged-ref 命令检查或获取云端版本；对于非冲突变更无需重试，因为这些变更已经应用。
- **云会话磁盘空间警告** — 从远程工作区删除不需要的文件或在进行大量写入之前停止云工作线程。下一个成功的样本显示足够的可用空间后，警告会自动清除；失败的示例会留下最后一次成功的警告，并且不会影响会话生命周期。
- **“上一个云轮次的工作区结果仍在协调中”**——Gateway 曾短暂等待上一个结果的持久化围栏，但无法获取会话声明。请等待协调完成，然后重试该轮次；重启 Gateway 是安全的，因为恢复过程会在回收失效 worker 前保留暂存结果。
- **GitHub发布失败**— 通过 Gateway 代理发布**发布PR**或远程执行`github_publish`， 打开**代理 → 工具 →GitHub身份**并确认有效`@login`、选定范围、访问过期和刷新状态。重新连接GitHub当刷新过期或不可用时；使用托管的PAT仅作为明确的后备。对于推送拒绝，检查存储库写入访问和分支漂移；`/user`验证并不能证明存储库写入访问权限，并且代理永远不会重写已发布的历史记录。如果已发布的分支不再适合已接受的历史记录，请保留本地工作并在已发布的头部上应用预期的编辑以刷新现有的PR，或使用新的会话分支并替换PR故意改写历史。不要仅仅为了使重新定位的分支可推送而重复发布相同的分歧或合并旧历史记录。失败的分支观察需要恢复读取access/connectivity，不假设分支不存在。对于拉取请求拒绝，授予拉取请求写入权限并重试**发布PR**或致电`github_publish`再次调用新工具。
- **存储库发布不可用** - Git 清理过滤器、不安全的 Git 配置或失败的发布快照验证可能会阻止准备可发布的检查点。原始恢复检查点和正常停止仍然保留已接受的更改。更正存储库配置，然后运行另一轮或保存编辑以在再次请求发布之前准备新的检查点。
- **租赁内务** — `crabbox list --provider <backend> --json` 是只读库存。 `crabbox stop --provider <backend> --id <lease>` 和 `crabbox release --provider <backend> --id <lease>` 具有破坏性，手动释放租约。 OpenClaw 在拥有放置的会话或源相关捕获时刷新有效空闲窗口，并在释放之前停止心跳。这些心跳不会延长总TTL；有效的生命周期策略仍然限制机器。暂时的心跳故障（包括租约索赔冲突）会发出警告并保留下一次预定的续订。不支持租约心跳的后端会产生警告；该插件在使用前会检查 CLI 本身是否支持该命令。

协调员支持的 `crabbox list` 默认显示实时租约。添加 `--retained` 以调查未确认清理的保留终端资源。使用精确的 ID 检查和阻塞 `crabbox stop --provider <backend> --id <lease> --wait` 来协调清理；不在实时列表中并不能证明完成。
