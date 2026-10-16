---
summary: "将 OpenShell 作为 OpenClaw 代理的托管沙盒后端使用"
title: "OpenShell"
read_when:
  - "您需要 OpenShell- 管理的本地或远程沙箱"
  - "你正在设置 OpenShell 插件"
  - "你需要在 mirror 和 remote 工作区模式之间做选择"
---

OpenShell是一个托管沙箱后端：OpenClaw将沙箱生命周期委托给`openshell` CLI并执行命令SSH。所选择的OpenShell网关可以在本地管理沙箱Docker， Podman或虚拟化，或在单独的基础设施上运行它们。这OpenShell网关不同于OpenClaw网关，继续运行代理和主机端插件。

该插件复用了通用 [SSH 后端](/gateway/sandboxing#ssh-backend) 的相同 SSH 传输和远程文件系统桥接，并额外提供 OpenShell 生命周期管理（`sandbox create/get/delete/ssh-config`）以及可选的 `mirror` 工作区同步模式。

## <a id="prerequisites"></a> 先决条件

- `openshell` CLI 安装在 OpenClaw 网关进程的 `PATH` 上（或通过 `plugins.entries.openshell.config.command` 的自定义绝对路径）
- Gateway 主机上提供 OpenSSH 客户端
- 配置 OpenShell 工作区时使用 OpenShell `v0.0.88` 或更高版本
- 一个活跃、可访问的 OpenShell 网关，有权创建沙箱。本地网关不需要云帐户
- 使用本地沙箱时，A 支持 OpenShell 网关主机上的计算运行时
- OpenClaw Gateway 正在主机上运行。

安装 CLI 并使用 [NVIDIA OpenShell 文档 ](https://docs.nvidia.com/openshell/latest) 配置 OpenShell 网关。在配置 OpenClaw 之前，请验证 OpenShell CLI 是否与运行 OpenClaw 网关的操作系统用户相同：

```bash
openshell --version
openshell gateway list
openshell sandbox list
```

`gateway list` 用 `*` 标记活动网关。如果未选择网关，则运行`openshell gateway select <gateway-name>`。要注册现有本地网关端点，请运行 `openshell gateway add http://127.0.0.1:8080 --local`。将端点替换为正在运行的网关的地址。对于经过身份验证的远程网关，请按照 `openshell gateway login <gateway-name>` 的登录流程进行操作。

OpenClaw 网关服务必须看到与这些预检命令相同的 OpenShell、CLI、网关注册、凭据和 OpenShell 工作区选择。仅 shell `PATH` 或 `OPENSHELL_WORKSPACE` 设置不会自动到达后台服务。

## <a id="quick-start"></a> 快速开始

```bash
openclaw plugins install @openclaw/openshell-sandbox
```

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

验证配置并重新启动 OpenClaw 网关：

```bash
openclaw config validate
openclaw gateway restart
```

在下一个代理回合中，OpenClaw 创建一个 OpenShell 沙箱并通过它路由工具执行。验证插件和有效沙箱：

```bash
openclaw plugins inspect openshell --runtime --json
openclaw sandbox list
openclaw sandbox explain
openshell sandbox list
```

`openclaw sandbox list` 为空，直到沙盒代理首先需要运行时。

## <a id="workspace-modes"></a> 工作区模式

这是最重要的 OpenShell 决策。

OpenShell 还有一个名为 **workspace** 的控制平面资源。它与下文所述的文件系统工作区相互独立：它用于限定沙箱、providers、policies、推理路由和成员关系。设置 `plugins.entries.openshell.config.workspace` 可使用现有的非默认 OpenShell 工作区。该插件不会创建 OpenShell 工作区，也不会管理其成员关系。未设置此项时，插件会保留 OpenShell CLI 当前的 `OPENSHELL_WORKSPACE` 选择；如果不存在当前选择，则使用 CLI 的 `default` 回退值。

### <a id="mirror-(default)"></a><a id="mirror-default"></a> mirror（默认）

`plugins.entries.openshell.config.mode: "mirror"` 将 **本地工作空间保留为事实来源**：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到沙箱中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地。
- 在一个 OpenClaw 网关进程内，共享工作空间的命令和文件工具操作等待当前操作完成。该锁涵盖完整的上传、命令和下载，或完整的文件 read/mutation 及其同步。单独的后端句柄共享相同的锁。
- 文件工具通过沙箱桥接，但在两次交互之间，本地仍是事实来源。
- 工作目录检查检查将要上传的主机目录并在返回之前释放其锁定。执行拥有自己完整的上传到下载操作。放弃的检查不能阻止后续工具。执行开始时会检查远程权限和特定于图像的限制。

最适合开发工作流程：OpenClaw 之外的本地编辑将显示在下一次执行中，并且沙箱的行为接近 Docker 后端。

权衡：每次执行时的上传+下载成本。

外部编辑器和其他网关进程不参与该锁定。避免在镜像命令运行时更改本地工作区，因为其下载可以替换这些外部编辑。

### <a id="remote"></a> 远程

`mode: "remote"` 使 **远程工作空间成为事实来源**：

- 创建沙箱后首次使用时，OpenClaw从本地种子一次远程工作区。如果网关在第一次使用之前重新启动，则下次使用会检测仍然为空的远程工作区并为其播种。已保存内容的远程工作区永远不会重新播种。
- 此后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 都直接作用于远程工作区。OpenClaw **不会** 将远程更改同步回本地。
- Initialization 在每个远程运行时进行序列化，但命令和文件工具可以在初始化后重叠，包括跨代理轮流。因此，后台命令可以等待稍后写入的文件。对同一文件的并发写入遵循正常的远程文件系统语义。
- 具体化技能会在后端初始化回合时刷新，而不是在每次文件系统操作之前刷新。与其他沙箱后端一样，稍后的回合可以在运行较旧的后台命令时刷新技能。
- 即时媒体读取仍然有效（file/media 工具通过沙箱桥读取）。
- 出站图像和其他附件可以使用配置的远程工作空间下的路径，例如 `/sandbox/chart.png`。

最适合长时间运行的代理和 CI：每轮开销更低，且主机本地编辑不会悄悄覆盖远程状态。

<Warning>
在首次种子化之后，如果在 OpenClaw 之外于主机上编辑文件，远程沙箱将无法感知。运行 `openclaw sandbox recreate` 以重新种子化。
</Warning>

### <a id="choosing-a-mode"></a> 选择模式

|                          | `mirror`                   | `remote`                  |
| ------------------------ | -------------------------- | ------------------------- |
| **事实来源**      | 本地主机                 | 远程 OpenShell          |
| **同步方向**       | 双向（每次 exec） | 一次性种子化             |
| **每轮开销**    | 更高（上传 + 下载） | 更低（直接远程操作） |
| **本地编辑可见吗？** | 是，在下一次 exec 时可见          | 否，直到重新创建        |
| **最适合**             | 开发工作流      | 长时间运行的代理、CI   |

## <a id="configuration-reference"></a> 配置参考

所有 OpenShell 配置都位于 `plugins.entries.openshell.config` 下：

| 键                       | 类型                     | 默认值       | 描述                                                                            |
| ------------------------- | ------------------------ | ------------- | -------------------------------------------------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                                                    |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                                                    |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建时的沙箱源                                                   |
| `gateway`                 | `string`                 | 未设置         | OpenShell 网关名称（顶层 `--gateway`）                                         |
| `gatewayEndpoint`         | `string`                 | 未设置         | OpenShell 网关端点（顶层 `--gateway-endpoint`）                            |
| `workspace`               | `string`                 | 未设置         | 用于每个 CLI 操作的现有 OpenShell 工作区                              |
| `policy`                  | `string`                 | 未设置         | OpenClaw 网关主机上沙箱策略 YAML 文件的路径                        |
| `providers`               | `string[]`               | `[]`          | 创建沙箱时附加的 Provider 名称（去重，每个条目使用一个 `--provider` 标志） |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源（`--gpu`）                                                        |
| `autoProviders`           | `boolean`                | `true`        | 创建期间传递 `--auto-providers`（为 false 时传递 `--no-auto-providers`）            |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内主要的可写工作区                                          |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作区挂载路径（当工作区访问权限不是 `rw` 时为只读）               |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                                                 |

`remoteWorkspaceDir` 和 `remoteAgentWorkspaceDir` 必须是绝对路径并位于托管根 `/sandbox` 或 `/agent` 下。其他绝对路径将被拒绝。选择不同的、不重叠的目录，因为 OpenClaw 独立管理其内容。为了升级兼容性，之前配置的重叠根仍然被接受。

`timeoutSeconds` 适用于普通 OpenShell CLI 操作。沙箱创建始终至少收到 300 秒的时间，因此映像构建和首次配置不会因默认的 120 秒命令超时而缩短。

`policy` 是文件路径，而不是策略名称或 ID。首选绝对路径，例如 `/etc/openclaw/openshell-policy.yaml`。相对路径是在沙箱创建期间从代理的本地工作区解析的。显式策略会覆盖 OpenShell CLI 的 `OPENSHELL_SANDBOX_POLICY` 环境变量。当两者均未设置时，OpenShell 使用其正常策略选择和默认值。

`providers` 命名所选 OpenShell 工作区中的现有 OpenShell 凭证提供程序。对于 `autoProviders: true`，OpenShell 可能会根据网关进程已可用的凭据创建缺失的提供程序。使用 `autoProviders: false`，首先创建所需的提供程序并使用 `openshell --workspace <workspace-name> provider list` 验证它们。将 API 密钥保留在 OpenShell 提供程序中，而不是将它们添加到沙箱环境变量中。

`workspace` 必须与 OpenShell 的当前工作区名称约定匹配：1-19 个小写字母数字字符或单个连字符，没有前导、尾随或连续连字符。首先使用 `openshell workspace create --name <name>` 创建它。当所选工作区不存在或正在删除时，OpenShell 拒绝沙箱操作。将其设置为 `"default"` 以显式覆盖环境非默认 OpenShell 工作区。

该设置适用于此插件实例管理的每个 OpenShell 沙箱。它无法为每个 OpenClaw 代理或会话选择不同的 OpenShell 工作区。更改它不会迁移现有沙箱。在旧工作区仍配置的情况下删除 OpenClaw 的 OpenShell 沙箱，然后更改设置并重新启动网关。

沙箱级设置（`mode`、`scope`、`workspaceAccess`）位于 `agents.defaults.sandbox` 下，与其他后端相同。完整矩阵请参阅 [沙箱机制](/gateway/sandboxing)。

要将非秘密环境值传递到沙盒命令中，请使用现有的 `agents.defaults.sandbox.docker.env` 设置。 OpenShell 后端也在命令执行期间应用这些值。 OpenShell 目前不会将它们注入沙箱创建或后台服务中。将凭证保存在 OpenShell 提供商或其他专用秘密传递机制中。

## <a id="examples"></a> 示例

### <a id="minimal-remote-setup"></a> 最小远程配置

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### <a id="mirror-mode-with-gpu"></a> 带 GPU 的 mirror 模式

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### <a id="per-agent-openshell-with-custom-gateway"></a> 带自定义网关的按代理 OpenShell

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    entries: {
      researcher: {
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          workspace: "research",
          policy: "/etc/openclaw/openshell-policy.yaml",
        },
      },
    },
  },
}
```

## <a id="lifecycle-management"></a> 生命周期管理

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all

# Recreate only one agent or the exact session scope shown by sandbox list
openclaw sandbox recreate --agent researcher
openclaw sandbox recreate --session "agent:researcher:main"
```

对于 `remote` 模式，重新创建尤其重要：它会删除该范围的主远程工作区，并在下一次使用时从本地创建一个新的工作区。对于 `mirror` 模式，重新创建主要重置远程执行环境，因为本地仍然是事实来源。

沙盒列表和重新创建命令在检查或删除之前激活配置的后端拥有的插件以及每个记录的运行时的所有者。这些操作不会加载不相关的插件，并且仅限浏览器的命令仍然独立于 OpenShell 后端。

OpenClaw 在升级后保留已注册沙箱附带的旧运行时名称，因此其远程工作区仍然可寻址。重新创建该范围会删除旧运行时。下一次使用将创建当前的 19 个字符的运行时名称。

OpenShell v0.0.92 仍然可以找到由 v0.0.68 创建的沙箱记录，但在网关升级后，Docker- 支持的沙箱可能仍处于非就绪阶段。 OpenClaw 保留注册的运行时标识，拒绝隐式创建替换，并报告作用域 `openclaw sandbox recreate` 命令。在 `remote` 模式下将该游戏视为破坏性的，因为远程工作空间是事实的来源。

在更改以下任一项后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`
- `plugins.entries.openshell.config.providers`, `gpu`, or `autoProviders`
- `plugins.entries.openshell.config.remoteWorkspaceDir` or
  `remoteAgentWorkspaceDir`

更改 OpenShell 网关或 OpenShell 工作区时，请在仍选择旧网关和工作区的情况下重新创建受影响的沙箱。否则，清理将针对新位置而不是现有沙箱。

如果 OpenShell 无法删除沙箱，OpenClaw 会报告失败并保留运行时注册表项，以便可以安全地重试重新创建或修剪。恢复原始网关、工作区、身份验证和连接，使用 `openshell --workspace <workspace-name> sandbox get <sandbox-name>` 检查运行时，然后重新运行作用域 `openclaw sandbox recreate` 命令。请勿切换已配置的工作区或删除注册表项来隐藏故障。

## <a id="security-hardening"></a> 安全加固

镜像模式文件系统桥会固定本地工作空间根目录，并在每次读取、写入、mkdir、删除和重命名之前重新检查已解析的文件系统路径（通过实际路径），拒绝中间路径符号链接。符号链接交换或重新安装的本地工作区无法将文件访问重定向到镜像树之外。

工作区同步不包括两个方向的 `.git`、`hooks` 和 `git-hooks`。存储库凭据、历史记录和受信任的挂钩代码保留在 OpenClaw 网关主机上，而不是复制到不受信任的沙箱中。

镜像同步绝不会将其无法表示的条目（例如符号链接、FIFO 或 Unix 套接字）复制到任一工作区中。这些类型的现有主机条目及其父目录在每个深度都保持完整，即使沙箱删除了这些目录或用文件替换它们也是如此。与这些保留的主机路径冲突的远程替换将被忽略。普通文件和目录仍然会受到远程更改和删除。

## <a id="custom-image-contract"></a> 自定义镜像契约

OpenShell 源镜像拥有远程操作系统和软件包集。 OpenClaw 不会将 Docker 镜像、根文件系统、网络、用户或软件包设置应用于此后端。

与 OpenClaw 文件系统桥接配合使用的自定义镜像必须提供：

- `/bin/sh`
- `sleep`为持久沙箱主进程，当OpenShell CLI支持分离沙箱创建时（`sandbox create --detach`）
- `python3` 用于固定远程文件系统读取和突变
- GNU-兼容`stat`（`-c`）、`readlink`（`-f`）和`find`
- 标准的 `mkdir`、`mv`、`rm` 和 `rmdir` 实用程序

当代理工作区与沙箱工作区不同时，沙箱用户和策略还需要对两个配置的远程根具有写入权限。标准非特权映像通常无法创建默认的 `/agent` 目录。在映像和策略中创建并授予对 `/agent` 的访问权限，或者在已可写的沙箱根目录下配置两个不重叠的目录：

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          remoteWorkspaceDir: "/sandbox/workspace",
          remoteAgentWorkspaceDir: "/sandbox/agent",
        },
      },
    },
  },
}
```

软件包安装和私有证书根必须包含在源镜像中，或从沙箱内部安装。所选的 OpenShell 策略必须允许所需的网络目标，并且沙箱用户和文件系统必须允许写入。`sandbox.docker.network`、`sandbox.docker.readOnlyRoot`、 `sandbox.docker.user` 和 `sandbox.docker.setupCommand` 不会配置 OpenShell。

## <a id="current-limitations"></a> 当前限制

- Sandbox 浏览器不支持 OpenShell 后端。
- One 插件实例使用一个 OpenShell 工作区。不支持按代理或按会话 OpenShell 工作区选择。
- `sandbox.docker.binds` 不适用于 OpenShell。如果配置了绑定，沙箱创建将失败。
- Docker- `sandbox.docker.*`（`env` 除外）下的特定运行时旋钮仅适用于 Docker 后端。
- 原生插件代码和 Gateway RPC 保留在 Gateway 主机上。仅当沙箱工具策略允许时， 插件所有和 MCP 工具才可用于沙箱会话。

## <a id="troubleshooting"></a> 故障排查

首先单独的 OpenClaw 网关运行状况、插件激活和 OpenShell 网关连接：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect openshell --runtime --json
openclaw sandbox explain
openclaw sandbox list
openshell gateway list
openshell sandbox list
openclaw logs --follow
```

- **插件丢失或后端不可用：** 安装 `@openclaw/openshell-sandbox`，设置 `plugins.entries.openshell.enabled: true`，验证配置，然后重新启动 OpenClaw 网关。运行 `openclaw plugins inspect openshell --runtime --json` 以检查正在运行的网关，而不仅仅是磁盘上的插件注册。
- 未找到 **`openshell`：** 为运行网关的用户安装 CLI，或将 `plugins.entries.openshell.config.command` 设置为其绝对可执行路径。工作的交互式 shell 不能证明托管服务具有相同的 `PATH`。
- **无活动网关、未经授权或连接失败：** 检查`openshell gateway list`，选择所需网关，并在部署需要登录时使用`openshell gateway login <gateway-name>`重新进行身份验证。当服务不应依赖于交互式 CLI 的活动选择时，显式设置 `plugins.entries.openshell.config.gateway`。
- **工作空间丢失或沙箱列表错误：** 使用`openshell workspace list`验证所选的OpenShell工作空间，然后运行`openshell --workspace <workspace-name> sandbox list`。使用 `openshell workspace create --name <workspace-name>` 创建缺失的工作区，然后在 OpenClaw 中启用它们。请记住，网关服务可能不会从交互式 shell 继承 `OPENSHELL_WORKSPACE`。
- **策略文件无法读取或出站流量被拒绝：** 使用绝对主机路径配置现有 YAML 策略文件，检查其权限，并验证策略是否允许目标和请求的二进制文件。使用 `openshell sandbox get <sandbox-name> --policy-only` 检查正在运行的沙箱。 Docker network settings do not change OpenShell policy。
- **Provider 创建失败：** 使用 `openshell provider list` 检查选定的 OpenShell 工作区，然后使用 OpenShell 记录的凭证流创建或刷新所需的提供程序。如果 `autoProviders` 被禁用，则所需的提供程序必须已存在。
- **本地远程文件丢失：** 这在 `remote` 模式下是预期的。远程文件是事实来源，不会同步回主机。当需要主机可见的更改时，请使用 `mirror` 模式。重新创建远程沙箱会破坏其仅限远程的文件。
- **无法发送图像或附件：** 使用配置的`remoteWorkspaceDir`下的路径，例如`/sandbox/report.png`，而不是假设每个后端都使用Docker的`/workspace`目录。
- **镜像同步报告恢复路径：** OpenClaw将主机影子保留在工作区之外，因为其移动或恢复无法完成。该错误标识了保留的路径和工作空间路径并保留了原始故障。在删除任一副本之前比较两个路径并恢复所需的文件。部分移动可能会在每个路径中留下不同的文件。OpenClaw保留剩余的工作区条目，而不是用不完整或未经验证的备份覆盖它们。如果恢复完成但仅清理保存目录失败，则错误会确认恢复的工作空间路径并标识剩余目录。
- **重新创建或修剪无法删除沙箱：** 恢复对原始 OpenShell 网关和工作区的访问，确认沙箱与 `openshell --workspace <workspace-name> sandbox get <sandbox-name>` 仍然存在，然后重试范围内的重新创建。 OpenClaw 保留注册表项，直到删除成功。

## <a id="how-it-works"></a> 工作原理

1. OpenClaw 为沙箱名称运行 `sandbox get`（使用选定的 OpenShell 工作区和任何配置的 `--gateway`/`--gateway-endpoint`）。如果失败，它会在与 `sandbox create` 相同的 OpenShell 工作区中创建一个，并传递 `--name`、`--from`、设置时的 `--policy`、启用时的 `--gpu`、`--auto-providers`/`--no-auto-providers` 以及每个配置的提供程序一个 `--provider` 标志。
2. OpenClaw 为沙箱名称运行 `sandbox ssh-config`，以获取 SSH 连接详细信息。
3. Core 将 SSH 配置写入临时文件，并通过与通用 SSH 后端相同的远程文件系统桥接层打开 SSH 会话。
4. 在 `mirror` 模式下：执行前将本地同步到远程，运行后再同步回来。
5. 在`remote`模式下：首次使用时播种一次，然后直接在远程工作空间上操作。

## <a id="related"></a> 相关内容

- [沙箱](/gateway/sandboxing) - 模式、范围和后端比较
- [Sandbox vs 工具策略 vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) - 调试被阻止的工具
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) - 每个代理覆盖
- [沙箱 CLI](/cli/sandbox) - `openclaw sandbox` 命令。
