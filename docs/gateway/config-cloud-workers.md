---
doc-schema-version: 1
summary: "cloudWorkers下的云worker配置文件，包括Crabbox和静态SSH开发"
read_when:
  - "定义云工作人员环境"
  - "配置 Crabbox 配置文件"
  - "设置静态 SSH 开发工作线程"
title: "配置——云工作环境"
---

`cloudWorkers.*` 下的云工作线程环境密钥。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="cloud-worker-environments"></a> 云工作器环境

云工作者可以选择加入。如果 `cloudWorkers` 不存在，或者 `profiles` 为空，则 OpenClaw 不接受新的云工作线程创建，也不会通告云目标。 `sessions.dispatch` 可能仍可用于符合条件的配对设备目标。配置架构和只读 `environments.list` 和 `environments.status` 方法仍然可用。之前创建的持久记录仍然可以协调并保持可见；现有的 gateway/node 投影不变。

SSH- 支持的 `remote-exec` 提供者必须返回与 `algorithm base64` 完全相同的可信 `hostKey`，不带主机名或注释。 Bootstrap 将该密钥写入独立的 `known_hosts` 文件，使用 `StrictHostKeyChecking=yes`，并且在提供程序忽略它时在打开连接之前失败。不存在首次使用信任的后备机制。这些提供程序还通过单独的固定 SSH 连接传输工作区流量，因此 rsync 无法阻止控制流量。

Node- 支持的提供程序返回 `worker-turn` 或 `remote-exec` 的经过身份验证的节点设备 ID。网关安装当前固定的包并通过节点传输传输工作空间；这些租约不会返回或解析 OpenClaw SSH 端点凭证。 `worker-turn` 需要节点租用并启动受限制的 OpenClaw 工作子节点。 `remote-exec` 可以使用注册节点或现有的 SSH- 支持的提供程序，并在网关上保留harness加模型身份验证。

### <a id="required-worker-profile"></a> 所需工人资料

当网关必须在 OpenClaw 工作人员配置文件上运行每个代理会话时，将 `cloudWorkers.requiredProfile` 设置为已配置的配置文件 ID。这是服务器策略，而不是展示位置选择器的建议值。保留其未设置以保留可选的每会话放置和网关本地执行。

```json5
{
  cloudWorkers: {
    requiredProfile: "dedicated-native",
    profiles: {
      "dedicated-native": {
        provider: "device",
        settings: { device: "PAIRED_DEVICE_ID", inference: "worker" },
      },
    },
  },
}
```

新会话和所需的首轮恢复通过 `agents.list` 和 `includeSessionPlacement: true` 读取目标指令。该投影可供会话范围的编写器使用，并且仅包含所需配置文件的身份、推理位置和支持的所需执行模式，而不包含工作程序清单、计算机选项、端点设置或命令授予。普通`agents.list`回复不变。 Control UI 显示所需的目标，但没有放置、操作系统或机器选择器。所需的放置使用 OpenClaw 工作轮运行时；仅支持远程执行的提供程序无法满足此策略。普通会话创建使用服务器拥有的放置流程；用户不需要选择或管理云工作人员的权限。手动放置管理保留其现有权限。

网关也强制执行 API 和通道轮换的策略。当未选择存储库时，它会准备一个会话拥有的空工作区，使用现有的持久 dispatch/recovery 流程，并且如果放置失败，则不会在本地运行转向。丢失配置文件或断开连接的工作人员是可操作的错误，而不是网关推理的后备。当所需的配置文件尚不可用时，网关仍然可以启动，以便操作员可以注册或修复节点。

现有的安置保留其记录的工作空间和员工身份。更改所需的配置文件并不会默默地移动它们。如果失败的放置引用了丢失的环境记录，请在重试之前修复该记录：网关无法证明其原始配置文件，也不会自动选择新的配置文件。停止和恢复保留正常的贴装生命周期；停止工人并不授权本地轮流。无会话模型助手和本地 CLI 执行无法绕过该策略。

此设置选择执行，而不是提供者凭据或 OS 沙箱。对于仅节点凭证，请按照 [Worker-local inference](/gateway/cloud-workers/native-inference) 中所述配置所需的配置文件和节点。

### <a id="crabbox-profile"></a> Crabbox 配置

在 **设置 → 连接 → 云环境 → 高级 → 机器** 下管理配置文件。 [云环境](/gateway/cloud-workers/warm-images#inspect-snapshots-in-the-control-ui)中描述了存储库默认值、快照操作、池限制和保留。保存设置不会启动构建。

捆绑的 `crabbox` 提供程序通过本地 Crabbox CLI 提供一次性机器，将其注册为临时出站节点，并为 OpenClaw `worker-turn` 或 Codex `remote-exec` 返回相同的节点传输。因此，两个harness都可以选择一种配置的配置文件；所选会话运行时决定其执行语义。内部`settings.provider`选择Crabbox后端；它与外部 OpenClaw 提供商 ID 分开。

```json5
{
  gateway: {
    nodes: {
      commands: {
        // Required only when this profile also runs Codex remote-exec sessions.
        allow: ["codex.exec-server.stdio.v1"],
      },
    },
  },
  cloudWorkers: {
    preparedPool: { maxTotal: 4 },
    profiles: {
      production: {
        provider: "crabbox",
        suspendAfter: "45m",
        readyWorkers: 1,
        settings: {
          provider: "aws",
          class: "standard",
          ttl: "4h",
          idleTimeout: "45m",
          // Optional preferred executable. OpenClaw manages a current copy when needed.
          binary: "/usr/local/bin/crabbox",
        },
      },
    },
  },
}
```

- `settings.provider`（必需）：后端从[Crabbox提供商引用](https://crabbox.sh/providers/index.html)，通过`--provider`传递。直接或协调器支持的操作遵循 Crabbox 的配置。
- `settings.class`：可选的 Crabbox 机器类传递给 `--class`。省略将选择留给 Crabbox，除非布局提供 `machineClass`； OpenClaw 并未发明默认大小或硬件大小。显式 `null`、空字符串或空白字符串以及非字符串值无效。通过 **Settings → Advanced** 编辑无类别配置文件。
- `settings.ttl` 和 `settings.idleTimeout`（必需）：传递给 `--ttl` 和 `--idle-timeout` 的正 Go 持续时间字符串。 TTL 是从创建开始的总生命周期，包括配置；空闲超时是不活动窗口。截止日期较早者获胜。 Crabbox 可以将任一请求限制在有效的策略上；空闲永远不会超过 TTL。默认最大值为 `4h`，而显式所有者或组织覆盖可以允许更长的请求，最多为 `24h`。 OpenClaw 接受那些较长的配置值并使用 Crabbox 返回的有效策略。
- `settings.warmImage`：Linux 快照捕获和重用。当配置文件或会话选择机器类别（包括具有设置机密的配置文件）时默认启用。没有阶级，遗漏就会变得冰冷；显式 `true` 需要一个类。 `false` 禁用捕获和重用。存储库快照在注册之前修复其捕获点；支持的非阻塞 AWS 上传可以在会话运行时完成。空工作区共享在符合条件的拆卸时捕获的运行时图像。有关兼容性、刷新、存储费用和恢复的信息，请参阅 [ 暖映像 ](/gateway/cloud-workers/warm-images)。
- `settings.setup`：可选、可重复的机器设置命令。快照分叉重用其文件系统结果。存储库生命周期命令属于 [ 环境文件 ](/gateway/cloud-workers/environment-file)。
- `settings.setupSecrets`：操作员批准的环境名称到受保护存储 SecretRef 映射；请参阅 [ 设置机密 ](/gateway/config-cloud-workers#setup-secrets)。
- `settings.binary`：可选的绝对Crabbox可执行路径。 OpenClaw 需要每个目标的 Crabbox 0.77.0 或更新版本，并在省略路径时检查同级 Crabbox 签出和 `PATH`。如果所选二进制文件丢失或不受支持，它将在 `$OPENCLAW_STATE_DIR/tools/crabbox`（默认 `~/.openclaw/tools/crabbox`）下安装经过校验和和版本验证的托管版本，并保留现有二进制文件和设置。后续操作重用它；损坏的托管副本将替换为保留用于恢复的旧目录。 `openclaw doctor --fix` 可以在第一个工作程序或配置的沙箱操作之前安装它。只读配置文件建议永远不会安装 CLI。安装失败在分配之前停止并报告原因。
- `readyWorkers`：每个合格的本地项目或存储库和配置文件的非负整数目标；默认为 `1`。空的已提交工作区针对每个提供程序和配置文件共享一个单独的仅运行时目标，并在成功激活后进行补充。第一个空会话正常设置；仅浏览器的存在并不能温暖空的工作空间。设置 `0` 以禁用此配置文件的保留，同时保持暖图像重用。
- `cloudWorkers.preparedPool.maxTotal`：非负整数网关范围的储备上限；默认为 `4`。准备工作和未经确认的清理工作都计入这两个限制。设置 `0` 以排出未使用的储备并停止重新填充。预留会产生运行机器费用，并会因成功的会话激活或使用提供商现有空闲策略的显式构建需求而过期。请参阅 [ 就绪工人 ](/gateway/cloud-workers/warm-images#ready-workers)。

在校验和验证和提取之前，托管发布档案流入私有暂存文件，限制为 128 MiB。托管安装保留完整提取的发行版，包括 egress 等命令使用的配套运行时文件。下载进度有30秒的空闲限制和单独的10分钟总限制；失败的下载会在获取返回之前被清除。

还需要受支持的 CLI 检查并停止现有租约。在具有受限版本下载访问或托管工具写入权限的主机上，在现有配置文件使用的确切路径上配置受支持的可执行文件，或在推出 OpenClaw 更新之前暂存托管分发。支持的可执行文件和安装的托管副本不需要发布下载访问权限。如果两者都不可用，则必须先成功收购，然后才能继续进行租赁检查或拆除；实际释放会在尝试获取之前停止心跳。当提供者仍然需要源时，承认的依赖于源的捕获保留其心跳。

未知的设置被拒绝。后端凭证、协调器访问、网络和特定于提供商的快照支持仍保留在 [Crabbox](https://crabbox.sh/providers/index.html) 中配置，而不是 OpenClaw 设置中。在网关重新启动后保持 Crabbox 的状态。配置重试使用一个固定租约 ID；切勿通过手动分配替换来绕过固定的 ID 功能错误。请参阅 [ 提供商要求 ](/gateway/cloud-workers#crabbox-provider-support)。

云工作人员发现和生命周期命令从网关用户的主目录运行，因此网关存储库工作目录中的 `crabbox.yaml` 不会覆盖 Crabbox 的全局配置。项目范围的沙箱命令保留其显式工作区目录。

`--keep=true` 将正常的命令结束清理委托给 OpenClaw；它不会使租约持久化或免除其到期或直接清理。普通心跳仅刷新空闲时间。 OpenClaw 从有效空闲超时开始安排它们，并报告经过清理的策略通知，包括成功命令的通知。 Total TTL 仍会结束会话：在截止日期之前保存并协调工作，然后使用正常的停止、暂停和新分配生命周期。 OpenClaw 并没有默默地创造无限的替换租赁链。

当没有请求任何值时，协调器默认为 30 分钟 TTL 和空闲超时。其有效的所有者或组织策略可以缩短检查或心跳的实时租约。扩展需要所有者权限、策略许可和预算。在源相关图像捕获之前，OpenClaw仅在剩余生命周期不足且提供者支持运行时扩展时请求有界总数TTL；被拒绝的扩展会明显跳过可选的捕获或无法完成所需的准备。像 Daytona 这样的创建固定提供商在创建时需要足够的 TTL。请参阅 [ 捕获寿命 ](/gateway/cloud-workers/warm-images#capture-lifetime)。

Crabbox 还拥有是否允许直接租赁的权利。其受信任的 `directLeases: deny` 配置会阻止远程直接分配，除非 `directLeaseAllow` 明确允许所选提供商。存储库配置不能放松该策略。当直接分配被拒绝时，使用配置的协调器路径；不要切换凭据来绕过它。

Codex 远程执行需要 `codex.exec-server.stdio.v1` 位于节点命令白名单和关键调用批准中。 AWS 入场需要权威`providerMetadata.instanceProfileAttached: false`；具有实例角色的工作人员被拒绝。

#### <a id="crabbox-machine-catalog"></a> 蟹盒机目录

每个会话的机器选项来自 Crabbox 的映射目录，已知时显示 CPU 和 RAM。丢失或不可用的目录会隐藏机器选择器，同时使配置文件保持可选状态。无类别配置文件没有发明的默认值。参见[机器选型](/gateway/cloud-workers/placement-and-machine-selection#choose-an-operating-system-and-machine-class-per-session)。

### <a id="setup-secrets"></a> 设置秘密

将最多 16 个 POSIX 环境名称映射到受保护的共享存储 SecretRefs：

```json5
{
  cloudWorkers: {
    profiles: {
      cloud: {
        provider: "crabbox",
        settings: {
          provider: "aws",
          class: "standard",
          ttl: "4h",
          idleTimeout: "45m",
          setupSecrets: {
            NPM_TOKEN: { source: "store", provider: "default", id: "NPM_TOKEN" },
          },
        },
      },
    },
  },
}
```

每个选定的条目必须存在于受保护的共享存储中，且具有显式 `allowed_hosts`。内联值和 `env`、`file` 或 `exec` 引用将被拒绝。流道变量、proxy/CA 变量和 `OPENCLAW_*` 名称被保留。存储库的 [devcontainer `secrets` 请求 ](/gateway/cloud-workers/environment-file#setup-secrets) 必须映射到这些批准的名称；存储库元数据不授予访问权限。

配置文件设置和存储库生命周期命令通过协调员拥有的 Linux 租约上的 Crabbox 本机出口运行。普通公共下载仍然可用。命令接收不透明占位符和临时 CA 信任；网关仅在其绑定的 HTTPS 主机上替换每个秘密。 HTTPS 客户端必须遵守提供的代理和 CA 设置；普通 HTTP 下载直接进行，无法接收替代的秘密。秘密值保留在网关上，但服务可以在其响应中反映凭据，因此仅绑定受信任的主机。当命令确定或取消时访问结束；分离的进程无法保留它。缺少条目、绑定或出口支持会明显失败，并有修复指令且没有明文回退。受保护的存储库准备还需要已知的机器类，即使禁用了快照也是如此。

设置机密不会禁用快照。名称和商店引用会影响兼容性；值和临时占位符则不然。有关存储凭据和绑定目标的信息，请参阅 [ 作业范围设置授权](/gateway/secrets/secret-store-and-egress#job-scoped-setup-grants)。

`settings.setupEnv` 已退役。运行 `openclaw doctor --fix` 将现有配置文件迁移到同名受保护存储条目。 Doctor 需要明确的目标绑定和兼容的现有映射；缺少条目或冲突会使配置文件在修复指导下保持不变。它从不创建秘密值或推断目标。在配置之前完成修复。

### <a id="static-ssh-development-profile"></a> 静态 SSH 开发配置

```json5
{
  cloudWorkers: {
    profiles: {
      development: {
        provider: "static-ssh",
        settings: {
          host: "worker.example.test",
          port: 22,
          user: "openclaw",
          hostKey: "ssh-ed25519 <base64-public-host-key>",
          keyRef: {
            source: "env",
            provider: "default",
            id: "OPENCLAW_WORKER_SSH_KEY",
          },
        },
      },
    },
  },
}
```

- `profiles`：具有非空、去除首尾空白的 id 的命名工作器配置。每个配置选择一个由插件注册的提供商。
- `provider`：非空的工作器提供商 id。示例使用内置的 `crabbox` 提供商和 QA Lab 的 `static-ssh` 提供商。
- `install`：SSH-支持的`remote-exec`工人安装方法。 `"bundle"`（默认）传输网关已安装版本的内容散列包，并支持已发布、开发和未发布版本。 `"npm"` 是针对未修改的打包版本的选择加入优化；它从公共 npm 注册表安装 `openclaw@<exact gateway version>`，并且从不安装 `latest`。 Node- 支持的 `worker-turn` 和 `remote-exec` 提供商改为通过节点传输安装固定网关包。
- `suspendAfter`：可选的配置文件级别持续时间，例如 `45m`、`90m` 或 `2h`；最小 `1m`。在会话保持空闲这么长时间后，网关会安全地回收工作线程。下一条消息规定当图像存在时进行替换。省略此字段可禁用自动怠速暂停； Crabbox 的使用寿命限制仍然适用。
- 配置时会自动选择捆绑的提供商插件，但显式禁用和 `plugins.allow` 仍然适用。配置允许列表时，请包含提供商 id（例如 `crabbox`）。外部提供商插件还必须安装并显式启用。
- `settings`：由提供商管理的有界 JSON。所选插件定义并验证其中的键；对于包含机密的值，请使用 [SecretRef 对象](/gateway/secrets)。静态 SSH 提供商要求 `host`、`user`、`hostKey` 和 `keyRef`；`port` 默认为 `22`。`hostKey` 必须是从已知主机或其他受信任渠道获取的一行 OpenSSH 公共主机密钥（`algorithm base64`），且不得带有选项前缀。

必须已在工作线程上安装受支持的 Node 运行时（24.16+ 或 26.1+）以及 WAL- 重置安全 SQLite。选择加入 `"npm"` 方法还需要 `npm` 和出站 HTTPS 访问公共 npm 注册表。网络工具链设置是提供商的政策； bootstrap 报告可操作的错误，而不是安装工具链本身。

Node-backed `worker-turn` 默认启动独立的工作循环并通过网关代理模型推理。具有 `settings.inference: "worker"` 的设备提供商配置文件改为使用 [ 工作人员本地本机推理 ](/gateway/cloud-workers/native-inference) 和节点本地提供商凭据。 Node-backed 或 SSH-backed `remote-exec` 在网关上保留模型循环，并将沙箱操作路由到远程主机。 Node-支持的Codex接受进程、文件系统、功能和无凭据的HTTP操作；经过身份验证的 HTTP 在到达节点之前被拒绝。两种模式都可以在持久放置生命周期中协调会话工作空间和脚本。断开连接的节点支持的 Codex 尝试已终止；重新连接仅允许重新尝试，而不允许处理或流恢复。

每条持久化环境记录都会在创建时的配置快照中保留经过验证的提供商设置和解析后的安装方式。更改或移除命名配置会影响新的创建操作；只要所属插件仍然可用，现有记录会继续使用该快照进行生命周期协调。

使用默认的 `gateway.reload.mode: "hybrid"`，配置文件和池更改无需重新启动网关即可应用。新的分配使用更新的配置文件；现有分配保留其承认的提供商设置。未使用的储备金将根据当前配置文件和池限制进行检查，不兼容或多余的工人在其提供者工作解决后退休。更改后暂停适用于下一次自动耗尽之前的现有空闲会话。使用重新加载模式 `"off"`，重新启动网关以加载配置更改。

<Warning>
  `static-ssh` 提供程序是源树 QA Lab `remote-exec` 工具，不包含在打包发行版中。在其共享主机上运行的工作程序可以读取不相关的主机数据，因此不要使用此提供程序作为生产隔离边界。其运营商必须提供预期的 `hostKey`； OpenClaw 不会从第一次连接中学习或接受密钥。销毁其租约仅释放OpenClaw的逻辑记录；它不会停止或清理主机。
</Warning>

---
