---
summary: "将会话分派到一次性云机器：预配、工作器运行时、代理推理和流式结果"
title: "云工作器"
sidebarTitle: "云工作器"
read_when: "当你希望代理会话在临时云机器上运行，而不是在 Gateway 主机上运行，或者你正在配置 cloudWorkers 配置文件时。"
status: active
doc-schema-version: 1
---

云工作器允许会话在一次性云机器上运行其代理循环，而会话的其他一切仍保留在原处：在侧边栏中可见、实时流式传输，并且转录内容由 Gateway 持有。Gateway 会租用一台机器，在其上安装固定版本的 OpenClaw，将会话的工作区同步过去，并将轮转循环交给一个受限制的 `openclaw worker` 进程。模型调用会通过 Gateway 代理返回，因此提供方凭据不会离开你的机器，而且由于提供方看到的是一条连续的流，提示缓存仍然有效。

工作完成后（或机器发生故障时），该机器会被丢弃。持久状态——转录内容、上次协调的工作区文件以及位置记录——与 Gateway 一起保存。

<Note>
云工作器默认不启用。配置文件之前，客户端会隐藏“云”目标，Gateway 也不会公布 `sessions.dispatch`。`cloudWorkers` 配置架构以及只读的 `environments.list` 和 `environments.status` 方法仍可用于配置和环境发现。
</Note>

## 运行位置说明

| 关注事项                                               | 位置                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Agent loop + tools (`exec`, `read`, `write`, `edit`, …) | Cloud worker box                                                                  |
| Model inference and provider credentials                | Gateway（通过 `{provider, model}` 引用代理）                                      |
| Transcript（durable, session store）                    | Gateway                                                                           |
| Live streaming into the sidebar                         | Gateway fanout，由 worker 的可重放事件流提供                                     |
| Workspace file state                                    | 在 box 上无凭据地更改；Gateway 协调文件并负责推送／PR                           |

该盒子除了 `sshd` 之外不需要任何入站端口：Gateway 通过固定的 SSH 连接发起外连，反向隧道将 worker 的 WebSocket 回传。捆绑的 Crabbox provider 强制使用公共 SSH 路由，并禁用托管的 Tailscale 注册。出站互联网访问由 provider 策略决定；默认的 AWS 配置文件可以访问互联网，除非你限制其网络或安全组。

## 要求

- 一个 worker provider 插件。捆绑的 `crabbox` 插件驱动 [Crabbox](https://github.com/openclaw/crabbox) CLI，该 CLI 跨云后端（AWS、Hetzner 及其他后端）协调租约。请为运行 Gateway 的操作系统用户安装 Crabbox 0.41.1 或更高版本，并将其放入该用户的 `PATH` 中，或者将 `settings.binary` 设置为其绝对路径。云端 worker 需要 Crabbox 固定的租约 ID 契约；旧版本的二进制文件会在分配前失败。
- 对于 Crabbox AWS worker，有效的 `aws.instanceProfile` 必须为空。provider 会在分配前检查 `crabbox config show --json`，随后要求 `crabbox inspect --json` 根据 EC2 `DescribeInstances` 报告 `providerMetadata.instanceProfileAttached: false`。带有实例角色或缺少权威元数据的租约将被停止并拒绝。
- 租用机器上的 Node.js。裸云镜像通常不包含它 — 请在 profile 的 `setup` 命令中安装。
- 一个由 registry 管理的、正在运行的 session worktree（使用 `worktree: true` 创建）。云端 dispatch 不接受任意的普通目录。dispatch 通过准入后，如果 Git 元数据之后变得不可用，工作区传输可能会使用清单镜像；这种传输行为不会使普通目录变得可 dispatch。

### 由协调器支持的 Crabbox

在托管模式下，Crabbox 协调器拥有云 provider 凭据，并代表 Gateway 用户配置 AWS。无需本地 AWS 密钥。进行交互式身份验证，然后验证已存储的协调器和 provider 状态：

Crabbox 通常会在请求租约时发现 Gateway 主机的出站 IPv4，并将该地址的 `/32` 作为有效的 SSH 入站策略发送。此发现值的作用域限定于请求，因此 `crabbox config show --json` 继续显示空的 `aws.sshCIDRs` 列表是完全正常的。

如需固定的入站策略，请自行确定出站 IPv4：

```bash
curl -fsS https://checkip.amazonaws.com
```

然后将该地址作为 `/32` 添加到 Crabbox 自身的配置中。例如，如果命令输出 `203.0.113.10`：

```yaml
aws:
  sshCIDRs:
    - 203.0.113.10/32
```

直接 SSH 连接源自 Gateway 主机，而协调器 API 可能会看到反向代理地址或请求源地址。当出站检测不可用或需要固定策略时，显式固定地址会很有用。

```bash
crabbox login --url <coordinator-url> --provider aws
crabbox config show --json
crabbox whoami --json
crabbox doctor --provider aws --json
```

在配置资源之前，请查看 `crabbox doctor --provider aws --json`，了解 provider 就绪检查失败的原因。如果显式配置了 `aws.sshCIDRs`，还要确认 `crabbox config show --json` 报告了预期的 `/32`；使用请求时发现时，列表为空是有效的。`doctor` 不会修改任何内容：它会检查协调器、broker 身份、本地工具以及只读的 AWS 控制平面访问权限，而不会创建或更改租约。它无法证明会修改资源的 IAM 权限，例如导入密钥对、启动实例、添加标签或终止实例；包含 `mutation=false` 的 direct-provider 报告并不能证明具有写入权限。受信任的自动化可以通过 stdin 传递已批准的协调器令牌，而不是将其放在命令行中：

```bash
printf '%s' "$CRABBOX_COORDINATOR_TOKEN" | crabbox login \
  --url <coordinator-url> \
  --provider aws \
  --token-stdin
```

不要将令牌放入仓库配置或 shell 参数中。

## 配置

在 `openclaw.json` 中的 `cloudWorkers.profiles` 下添加一个配置文件：

```json
{
  "cloudWorkers": {
    "profiles": {
      "aws": {
        "provider": "crabbox",
        "install": "bundle",
        "settings": {
          "provider": "aws",
          "class": "standard",
          "ttl": "8h",
          "idleTimeout": "45m",
          "setup": "test -x /usr/bin/node || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs)"
        }
      }
    }
  }
}
```

配置文件字段：

| Key        | Meaning                                                                                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | 由插件注册的 Worker provider id（捆绑插件使用 `crabbox`）。                                                                                                                                                                                                                   |
| `install`  | `bundle`（默认）会附带正在运行的 Gateway 构建版本；`npm` 会使用固定的完整性校验安装完全一致的已发布 Gateway 版本。`npm` 要求 Gateway 从打包的发布版本运行。                                                                                     |
| `settings` | 由 provider 所有的 JSON。对于 crabbox：`provider`（后端）、`class`（机器类别）、`ttl`、`idleTimeout`（Go durations）、可选的 `setup`、可选的 `desktop`（布尔值）以及绝对路径形式的 `binary`。OpenClaw 会强制这些租约使用公共 SSH，并禁用托管 Tailscale。 |

Crabbox inspect 会报告一个主要 SSH 端口，并可能公布按顺序排列的备用端口。OpenClaw 会在 Gateway 重启期间持久化该顺序。其共享的固定 SSH 传输仅会针对可安全重放的操作轮换候选端口：幂等探测、内容寻址传输、由回执／锁保护的构件安装、收敛式托管工作树镜像以及隧道重连。存在歧义且未受保护的有状态命令会在当前候选端口上安全失败，不会在另一个端口上重放。OpenClaw 绝不会自行生成未公布的端口。如果你的网络策略固定了 SSH 入站访问，请至少允许一个已公布的 Crabbox 候选端口。

OpenClaw 会从持久化的 provision 操作中派生唯一规范的 `cbx_...` 租约 ID，并将其传递给 `crabbox warmup --lease-id`；确定性 slug 仅作为显示元数据使用。如果 warmup 已提交但其响应丢失，Gateway 协调过程会使用相同的固定 ID 重复执行该操作，而 Crabbox 只会返回或接管经过完全验证、且 ID 完全匹配的租约。意图漂移、终端 ID 重用以及无法明确验证的资源都会安全失败，不会分配替代资源。在 OpenClaw 记录租约 ID 之前就中断的旧版 dispatch 无法安全识别，并且会明确失败，而不是回退到通过 slug 接管。

### setup 命令

`settings.setup` 会在租用的机器已准备好 SSH 后、安装 OpenClaw 之前运行。setup 成功后，OpenClaw 会重新执行一次 Crabbox inspect，并再次等待 SSH 就绪后再进行引导，因为 setup 可能会重启 SSH。它会在**每次** provision 尝试中运行（包括中断的 dispatch 重放），因此必须具备幂等性——应像示例中一样，使用 `command -v`／`test -x` 检查来避免重复安装。如果 setup 失败，提供商会停止该租约，并使 dispatch 安全失败；不会留下正在运行的半配置机器。

### 安装通道

- **`bundle`** 会打包当前运行的 Gateway 的 `dist`、经过裁剪的 `package.json`，以及构建所引用的任何工作区包，所有内容都由内容哈希覆盖。机器会先用该哈希验证原始 bundle，然后安装生产环境的 npm 依赖（禁用脚本）。这就是你在 worker 上运行开发构建的方式。
- **`npm`** 会证明该发布版确实存在于公共注册表中，固定其 SHA-512 完整性，并安装与 Gateway 完全一致的 `openclaw@<version>`。

### 验证配置文件

在重启 Gateway 之前进行验证：

```bash
openclaw config validate --json
openclaw plugins inspect crabbox --runtime --json
```

对 `cloudWorkers.profiles` 的更改需要重启 Gateway。默认的 `gateway.reload.mode: "hybrid"` 会监视配置并自动执行重启；如果禁用了重新加载监视，请运行 `openclaw gateway restart`。

Gateway 恢复后，确认配置文件已公布，并将其与 Crabbox 的只读租约清单进行比较：

```bash
openclaw gateway call environments.list --params '{}'
crabbox list --provider aws --json
```

`environments.list` 响应必须在 `profiles` 下包含已配置的 ID。`crabbox list` 不会修改任何内容。相比之下，`crabbox warmup` 会配置一个租约，而 `crabbox stop` 或 `crabbox release` 会拆除一个租约；只有在确实打算创建或销毁云资源时，才使用这些会修改状态的命令。

## 调度会话

在控制界面中，打开 **新建会话**，使用统一的 **位置**选择器，同时选择工作文件夹和一个 **云端 · 配置**目标。只有在以下三个资格条件全部满足时，才会显示云端目标：

1. 已连接的操作员拥有 `operator.admin` 作用域。
2. `environments.list` 至少公布了一个已配置的配置。
3. 选定的 Gateway 文件夹是一个可使用托管工作树的 Git 检出目录。

选择云端后，该工作树会自动启用。Gateway 创建会话、完成调度，然后才发送第一轮消息。会话侧边栏中的服务器徽章会显示持久化的位置状态。

云端工作者运行 OpenClaw 代理运行时。映射到外部运行时（例如 Codex 或 Claude CLI）的模型会在选择器中禁用；请选择一个解析为 OpenClaw 运行时的直接模型。外部 CLI 会话目录不会提供云端目标。

等效的 RPC 流程是：

创建一个带托管工作树的会话，然后调度它。该 RPC 要求 `operator.admin`，且仅在至少配置了一个工作者配置时公布：

```bash
openclaw gateway call sessions.create \
  --params '{"key":"agent:main:big-refactor","worktree":true,"cwd":"/path/to/repo","worktreeName":"big-refactor"}'

openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:big-refactor","profileId":"aws"}'
```

`sessions.dispatch` 会关闭本地回合接入，排空活动工作，验证符合条件的 Git 工作区清单，配置租约，运行设置，启动 OpenClaw，同步工作区，并在位置达到 `active` 工作者所有权后返回。清单验证发生在提供商分配之前；如果工作区无法调度，则会报告包含可操作大小或条目限制的无效请求。首次调度请预留几分钟；在提供商支持的情况下，租约和安装会被缓存。之后，像往常一样与会话交互——回合会自动路由到工作者。

已完成的工作者回合会在回合声明释放之前，将符合条件且大小受限的工作区文件同步回会话的托管工作树。终端工作者事件会在确认之前创建一个持久化的待处理结果栅栏。在应用结果之前，Gateway 会将完整的、经过身份验证的基准／当前清单，以及每个发生更改的结果 Blob 作为 Git 引用暂存到 `refs/openclaw/worker-results/` 下；删除会由清单表示，无需 Blob。这样，即使 Gateway 在应用过程中停止，云端差异仍可恢复，同时不会复制未更改的基线内容。工作区结果使用 Git 文件语义：普通文件、可执行位、符号链接、添加项、更改项和删除项都会被保留，而空目录和其他目录模式不会保留。生成的文件更改会留在托管工作树中，以便正常审查和提交。

应用操作使用调度时的清单作为合并基准。仅云端发生的更改会被应用，仅本地发生的更改保持不变，双方都更改的路径则采用三方保留本地策略。有冲突的回合仍会完成：会话记录会报告受限的路径摘要和暂存结果引用，位置会将相同冲突暴露给控制界面，并且不冲突的云端更改仍会被应用。通知中包含用于检查当前云端文件的 `git show <ref>:<path>`，以及可从任意工作区目录获取该文件的顶层字面路径规范 `git checkout <ref> -- <path>` 命令。请在 Bash 或 zsh 中运行这些命令（Windows 上使用 Git Bash）。如果检查显示路径不存在，说明云端结果删除了该路径；请验证后手动删除保留的本地路径。如果 checkout 报告文件／目录阻塞，请移动或删除造成阻塞的本地路径，然后重试。如果暂存引用本身已不存在，则将该通知视为过期，不要修改本地路径。有冲突的暂存引用在正常回合栅栏释放后仍然可用；后续的干净结果会清除通知并废弃旧引用，而显式移除栅栏则是最终清理边界。

当带栅栏的结果仍在同步时，新回合会等待最多 15 秒，以便前一个声明释放。如果仍处于忙碌状态，回合会失败，并显示可采取操作的“上一云端回合的工作区结果仍在同步”消息，稍后可以重试。重启时，恢复流程会在清理过期声明之前发现待处理和已暂存的结果，完成或重试其本地应用，并且只有在保留结果后才回收失效环境。受限的 SQLite 回滚日志使中断的文件系统应用过程能够恢复，而无需重放已经接受的变更。

工作完成且没有回合正在运行时，打开会话菜单并选择 **停止云端工作者……**。Gateway 会在销毁环境之前执行一次最终的工作区同步。已经处于 `draining` 或 `reconciling` 状态的位置正在完成拆除；请等待其徽章变为 `reclaimed` 后再删除会话。

归档一个仍有活跃位置的非主云端工作者会话时，Gateway 也会先执行这种安全停止和回收，然后再将其记录为已归档。如果位置仍在转换中，或失败但没有证据表明其环境已经消失，会话会保持未归档状态；请等待位置稳定后再重试。恢复会话会保留已回收的位置元数据，因此下一回合可以使用相同的工作区配置调度一个新的工作者。

对于损坏或失控的附加工作者，操作员可以在最后手段的情况下使用 `{ "force": true }` 调用 `environments.destroy`。强制拆除会持久化地将位置标记为失败，并在销毁环境之前放弃任何尚未同步的远程结果。

等效的管理 RPC 是：

```bash
openclaw gateway call sessions.reclaim \
  --timeout 600000 \
  --params '{"key":"agent:main:big-refactor"}'
```

位置会经过一个持久化状态机（`local → requested → provisioning → syncing → starting → active`），因此 Gateway 在调度过程中重启时会执行同步，而不是遗留机器。模型回合失败时，活跃位置仍可用于重试。工作区路径冲突会保留本地版本，应用云端结果的其余部分，并保留暂存的云端引用以供检查；其他同步或生命周期故障会保留其持久化恢复栅栏和诊断尾部，直到可以安全地重试恢复或回收环境。

## 机器故障后仍保留的内容

Gateway 会在 worker 的会话写入完成之前，将每条完整的用户、assistant 和工具结果消息提交到规范会话转录中。提交会按照顺序进行，并针对确切的转录叶节点保持幂等。如果机器在消息处理中消失，持久历史会截至最后一条已提交的消息。实时流已经显示的部分文本或工具进度可能会消失；失败的回合仍然可见，并且失败的位置会在编辑框上方记录一个有界的终止原因。

工作区状态的丢失窗口更大。已完成的回合会在释放其声明之前协调 worker 文件，而 **停止云端工作者……** 会在销毁机器前执行一次最终协调。两次协调之间所做的更改只存在于 worker 上，可能会丢失。删除会话不会同步正在运行的 worker：必须先停止或归档活跃位置。随后，删除操作会在移除托管工作树之前，将已经协调的托管工作树快照保存到 `refs/openclaw/snapshots/` 下。

位置失败后，请重新调度会话并重试该回合。已回收的位置会在下一回合自动重新调度。新的 worker 会根据 Gateway 转录重建其推理上下文，因此会从跨过持久化边界的消息继续运行。

## 桌面（交互式）

Cloud Worker Desktop 是一项实验性的 Labs 功能，默认关闭。请在 **设置 → Agents & Tools → Labs** 中启用 **Cloud Worker Desktop**，或设置 `cloudWorkers.desktop: true`，然后重启 Gateway，桌面面板才会显示。

在 crabbox 配置文件的 `settings` 中设置 `"desktop": true`，即可租用带有品牌化 XFCE 桌面、Browser 和 Terminal 的 worker box。Crabbox 会在 box 的回环接口上配置 TigerVNC，并为每个租约设置独立密码，同时向 Gateway 报告已安装应用的完整集合。Labs 门控会启用桌面 RPC 和面板；配置文件设置则会为新租用的 worker 启用桌面能力。桌面是一项预热时能力：无法添加到已经配置好的环境中，因此请在调度之前为配置文件启用该功能。

拥有 `operator.admin` 访问权限的操作员可以通过 Control UI 的 **Desktop** 面板（命令面板中也有该面板）查看并控制桌面。该面板会列出 `environments.list` 中具备桌面能力的环境，只显示提供方公布的应用，并通过 `worker.desktop.launch` 启动这些应用。它通过 Gateway 进行连接；Gateway 会使用与 worker 流量相同的固定 SSH 传输转发 box 的回环 VNC——桌面永远不会暴露在 box 的网络上，并且 VNC 密码只会出现在经过身份验证的 `worker.desktop.observe` RPC 结果中，绝不会存储在 Gateway 中。

连接以仅查看模式启动。**获取控制权**会请求建立可输入的连接；同一时间只能有一个控制者，获取控制权会断开之前的控制者（之前的控制者会降级为仅查看模式）。最多可有 8 名观察者查看同一环境。桌面转发会在首次观察时启动，并在最后一名观察者断开连接约一分钟后关闭；停止或回收环境会立即将其拆除。

Browser 启动器会在 worker 显示器上启动一个可见的 Chrome 或 Chromium 进程，其原始 CDP 绑定到 `127.0.0.1`，并使用一个全新的、作用域为当前租约的用户数据目录。它不会导入 Cookie、连接 Chrome 扩展中继，也不会使用 Chrome MCP。操作员工具栏和 cloud-worker agent 共享此进程。只有在租约公布了 Browser、内置 Browser 插件处于活动状态，并且正常的工具策略允许使用 `browser` 时，worker 才会收到常规的 `browser` 工具；不具备该能力的 worker 会继续使用现有的 coding-tool 目录。通用桌面 `computer` 控制不属于此 Labs 功能范围。

当 Gateway 自身运行在 Windows 上时，不支持桌面观察和应用启动。

## 安全模型

- **封闭的工作者入口。** 工作者通过隧道套接字上的专用协议进行通信，并使用封闭的方法允许列表——工作者无法调用操作员 RPC。
- **由网关拥有的工具权限。** 在每一轮开始之前，网关会将当前的配置、提供商、代理、组、发送方、沙箱、委派、继承和运行时能力策略应用到工作者固定的编码工具目录上。启动信封仅携带最终的封闭词汇子集。明确设置上限的计划轮次会复用其受信任的所有者组上下文，而不会将该身份发送到盒中，也不会重新应用新的发送方覆盖层。工作者目录之外的工具仍不可用；空结果会在无工具的情况下运行。
- **铸造凭据，静态哈希存储。** 每次调度都会铸造一个工作者凭据；网关仅存储其哈希值。凭据轮换和所有者纪元隔离保证每个会话最多只有一个有效所有者——重新连接的过期工作者会被隔离，绝不会被合并。
- **主机密钥固定。** 提供商必须在配置时提供盒的 SSH 主机密钥；引导程序使用严格固定的密钥进行连接，缺少该密钥时将安全失败。
- **盒上不保留长期有效的模型、代码托管或云凭据。** 模型身份验证保留在网关上（推理通过 `{provider, model}` 引用传递），工作区 Git 提交在没有代码托管凭据的情况下创建，并且会在设置之前权威检查 Crabbox AWS 租约元数据以确认实例角色。设置命令也必须不包含凭据。
- **由提供商负责的出口流量。** 反向隧道消除了 OpenClaw 直接访问模型的需要，但 OpenClaw 不会重写提供商防火墙。任务需要时，请在工作者提供商处限制出站流量。
- **持久化、严格一次的转录记录。** 工作者通过针对会话叶节点的比较并交换协议提交转录批次；基准过期时会停止运行，而不是重复或重新调整已付费的输出。

## 故障排查

- **未公布云配置文件**——以管理员身份运行 `openclaw gateway call environments.list --params '{}'`。如果响应中没有 `profiles`，请验证 `cloudWorkers.profiles`，检查 provider 插件，然后重启 Gateway。这是配置或 provider 激活问题，而不是授权结果。
- **云目标被隐藏或 RPC 被拒绝**——已连接的操作员缺少 `operator.admin`。请使用管理员范围重新连接；配置配置文件不会授予该范围。
- **“云 worker 轮次需要 OpenClaw runtime”**——请选择配置的 runtime 为 OpenClaw 的直接模型。映射到外部 Codex 或 Claude CLI runtime 的模型不支持 worker 推理。
- **“Worker 引导需要租用主机上的 Node.js”**——将 Node 安装添加到 `settings.setup` 中（见上文）。
- **AWS 实例角色证明失败**——清除 `aws.instanceProfile`（以及已设置的 `CRABBOX_AWS_INSTANCE_PROFILE`）。安装 Crabbox 0.41.1 或更高版本；旧版二进制不满足 AWS 准入所需的固定 ID 和权威 `providerMetadata.instanceProfileAttached` 契约。
- **调度或工作区恢复失败**——检查 `environments.list` 和 `sessions.describe`。失败的环境会公开其有界环境错误。失败的放置会公开 `recoveryError` 以及其持久化的每会话 `terminalReason`；选定的 Control UI 聊天会在编辑框上方显示该终止原因。如有必要进行更深入的诊断，Gateway 主机上的操作员可以只读方式检查持久化的 worker 状态。不要编辑状态数据库来绕过生命周期围栏。
- **无法连接任何 SSH 候选项**——将 Gateway 主机当前的出站 IPv4 与 `crabbox config show --json` 中显式配置的 `aws.sshCIDRs` 策略进行比较。如果匹配的 `/32` 不存在，请修正 Crabbox 的配置，并在重试前运行 `crabbox doctor --provider aws --json`。配置列表为空是有效的，因为 Crabbox 通常会在请求租约时发现并注入调用方的 `/32`；如果仍然无法连接，请显式固定该 `/32`。然后确保 Gateway 的出站路由和 worker 入站策略至少允许一个已公布的候选项。OpenClaw 仅会针对幂等探测、内容寻址传输、由收据／锁保护的构件安装、收敛式 managed-worktree 镜像以及隧道重连，使用相同身份和固定主机密钥轮换有序端口。含糊且未受保护的有状态命令会安全失败，不会在下一个端口上重放。
- **调度时客户端超时**——`openclaw gateway call` 默认超时时间为 10 秒；请传入足够大的 `--timeout`。无论结果如何，调度都会继续在服务器端运行，并且在同一 Gateway 上进行相同重试时，会加入正在进行的操作，而不是再配置一个 worker。使用不同配置文件或会话身份进行的重试会被拒绝。
- **通过 `doctor` 后直接 AWS 授权仍然失败**——`doctor` 证明的是只读 AWS 访问权限，而不是完整的变更策略。检查被拒绝的操作名称，只授予 Crabbox 所需的配置／清理操作，或改为配置由协调器支持的 Crabbox。新的直接 AWS 租约通常需要在 `RunInstances` 之前导入密钥对；此处的授权失败不会创建实例。
- **从 2026.7.2 beta 升级后 worker 被回收**——这些 beta 版本使用了较旧的 worker 启动契约。重启时，OpenClaw 会销毁空闲的不兼容 worker，保留会话和工作区，将放置标记为已回收，并在下一次调度或轮次时配置当前版本的 worker。在仍处于启动阶段时被中断的 beta worker 会在清理后被标记为失败；请重试调度，以使用当前契约配置它。
- **云工作区冲突通知**——该轮次已完成，并保留了所列每个路径的本地版本。使用通知中的 staged-ref 命令检查或获取云端版本；对于非冲突变更无需重试，因为这些变更已经应用。
- **“上一个云轮次的工作区结果仍在协调中”**——Gateway 曾短暂等待上一个结果的持久化围栏，但无法获取会话声明。请等待协调完成，然后重试该轮次；重启 Gateway 是安全的，因为恢复过程会在回收失效 worker 前保留暂存结果。
- **租约维护**——`crabbox list --provider <backend> --json` 是只读清单。`crabbox stop --provider <backend> --id <lease>` 和 `crabbox release --provider <backend> --id <lease>` 具有破坏性，会手动释放租约。空闲租约会在配置文件的 `idleTimeout` 时间到达后过期。

## 相关

- [沙箱化](/gateway/sandboxing) — 减少本地工具执行的影响范围
- [Sessions CLI](/cli/sessions) — 检查已存储的会话
- [配置参考](/gateway/configuration-reference)。
