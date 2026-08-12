---
summary: "OpenClaw 沙箱化的工作方式：模式、作用域、工作区访问和镜像"
title: "沙箱化"
sidebarTitle: "沙箱化"
read_when: "你想要了解沙箱化的专门说明，或者需要调整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在沙箱后端中运行工具执行，以减小影响范围。沙箱化默认处于关闭状态，由 `agents.defaults.sandbox`（全局）或 `agents.entries.*.sandbox`（按代理）控制。网关进程始终运行在主机上；只有在启用沙箱化时，工具执行才会移入沙箱。

<Note>
这并不是完美的安全边界，但当模型做出一些愚蠢操作时，它确实能显著限制文件系统和进程访问。
</Note>

## 什么会被沙箱化

- 工具执行：`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等。
- 可选的沙箱化浏览器（`agents.defaults.sandbox.browser`）。

未被沙箱化的内容：

- Gateway 进程本身。
- 任何通过 `tools.elevated` 明确允许在沙箱外运行的工具。提升权限的 `exec` 会绕过沙箱，并在配置的逃逸路径上运行（默认是 `gateway`，或者当 exec 目标是 `node` 时为 `node`）。如果沙箱化关闭，`tools.elevated` 不会改变任何内容，因为 `exec` 此时本来就运行在主机上。请参阅 [Elevated Mode](/tools/elevated)。

## 模式、作用范围和后端

三个独立设置控制沙箱行为：

| 设置    | 键                                | 值                                     | 默认值   |
| ------- | --------------------------------- | -------------------------------------- | -------- |
| 模式    | `agents.defaults.sandbox.mode`    | `off`、`non-main`、`all`               | `off`    |
| 作用范围 | `agents.defaults.sandbox.scope`   | `agent`、`session`、`shared`           | `agent`  |
| 后端    | `agents.defaults.sandbox.backend` | `docker`、`podman`、`ssh`、`openshell` | `docker` |

**模式** 控制何时应用沙箱：

- `off`：不使用沙箱。
- `non-main`：为除代理主会话之外的每个会话启用沙箱。主会话键始终是 `agent:<agentId>:main`（如果 `session.scope` 为 `"global"`，则为 `global`）；它不可配置。组/频道会话使用各自的键，因此它们始终被视为非主会话并会被沙箱化。
- `all`：每个会话都在沙箱中运行。

**作用范围** 控制会创建多少个容器/环境：

- `agent`：每个代理一个容器。
- `session`：每个会话一个容器。
- `shared`：所有被沙箱化的会话共享一个容器（在此作用范围下，按代理的 `docker`/`ssh`/`browser` 覆盖项会被忽略）。

非共享运行时身份还包括解析后的代理工作区路径。这可以防止共用主机且重复使用相同代理或会话键的工作区共享 Docker、浏览器、SSH、OpenShell 或插件提供的沙箱状态。`shared` 作用范围则有意与工作区无关。

从旧版本升级后的首次使用，会在包含工作区信息的身份下创建非共享运行时和沙箱工作区。现有的非共享运行时不会被接管；这是一次有意的重置。它们可以通过配置的清理设置自然过期，也可以使用 `openclaw sandbox recreate` 移除；下次使用时会为当前身份配置运行时。

**后端** 控制哪个运行时执行沙箱化工具。Docker 和 Podman 共享 `agents.defaults.sandbox.docker`；SSH 特定配置位于 `agents.defaults.sandbox.ssh` 下；OpenShell 特定配置位于 `plugins.entries.openshell.config` 下。

|                     | Docker 或 Podman 后端                    | SSH                            | OpenShell                                           |
| ------------------- | ----------------------------------------- | ------------------------------ | --------------------------------------------------- |
| **运行位置**        | 本地 Docker 或 Podman 容器                | 任何可通过 SSH 访问的主机       | 由 OpenShell 管理的沙箱                              |
| **设置**            | Docker 和/或 Podman                       | SSH 密钥 + 目标主机             | 已启用 OpenShell 插件                                |
| **工作区模型**      | 绑定挂载或复制                            | 远程规范化（初始化一次）         | `mirror` 或 `remote`                                |
| **网络控制**        | `docker.network`（默认：无）              | 取决于远程主机                  | 取决于 OpenShell                                     |
| **浏览器沙箱**      | 仅 Docker 引擎                            | 不支持                          | 尚不支持                                             |
| **绑定挂载**        | `docker.binds`                            | 不适用                          | 不适用                                               |
| **适用场景**        | 本地开发和容器隔离                        | 将任务转移到远程机器            | 具有可选双向同步功能的托管远程沙箱                     |

## 支持的能力矩阵

沙箱后端会隔离工具执行。它们不会将 Gateway、原生插件或控制平面 RPC 移入沙箱。

| 能力                       | Docker                                                                  | SSH                                                  | OpenShell                                                         |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Shell 和子进程             | 在容器内受支持                                                          | 在远程主机上受支持                                   | 在受管理的沙箱内受支持                                            |
| 文件工具                   | 通过容器文件系统桥接受支持                                              | 通过 SSH 文件系统桥接受支持                          | 在 `mirror` 或 `remote` 模式下通过 SSH 桥接受支持                 |
| 工作区访问                 | `none`、`ro` 和 `rw`                                                     | `none`、`ro` 和 `rw`                                  | `none`、`ro` 和 `rw`                                              |
| 网络限制                   | `docker.network`；默认为 `"none"`                                       | 由远程主机控制                                       | 由所选 OpenShell 策略控制                                         |
| 沙箱浏览器                 | 在独立的浏览器容器中受支持                                              | 不受支持                                             | 不受支持                                                         |
| 其他主机文件夹             | 使用明确的 `:ro` 或 `:rw` 的 `docker.binds`                              | 不支持作为挂载；请改为预置或复制文件                 | 不支持作为挂载；请使用工作区同步或远程文件                         |
| 软件包和运行时             | 构建自定义镜像，或使用具有所需权限的 `setupCommand`                      | 在远程主机上配置                                     | 将其包含在源镜像中，或在策略允许时安装                             |
| 私有证书根                 | 将其构建或挂载到镜像中，并配置使用它的运行时                            | 配置远程主机信任存储                                 | 将其包含在源镜像中，或在沙箱内进行配置                             |
| 插件和 MCP 工具访问        | 网关侧执行，并另外受沙箱工具策略限制                                     | 网关侧执行，并另外受策略限制                         | 网关侧执行，并另外受沙箱工具策略限制                              |

原生插件与 Gateway 保持进程内运行，并共享其信任边界。
沙箱会话只有在常规工具策略和 `tools.sandbox.tools` 都允许时，才能使用插件拥有的工具和 MCP 工具。请参阅
[MCP 和插件工具在沙箱工具策略中的使用](/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)
和[插件执行模型](/plugins/architecture#execution-model)。

## Docker 后端

Docker 后端通过 `docker` CLI 在本地运行工具。其选择和错误行为保持不变；它不会探测或回退到 Podman。

默认值：`network: "none"`（无外部网络访问）、`readOnlyRoot: true`、`capDrop: ["ALL"]`、镜像 `openclaw-sandbox:bookworm-slim`。

此显式配置使代理工作区保持只读，并保留默认的受限运行时状态：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "docker",
        scope: "session",
        workspaceAccess: "ro",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          capDrop: ["ALL"],
        },
      },
    },
  },
}
```

OpenClaw 还会为 Docker 沙箱容器创建 init 进程，并启用
`no-new-privileges`。使用 `workspaceAccess: "ro"` 时，代理工作区会以只读方式挂载到
`/agent`；对代理工作区的写入操作会被拒绝，而配置的 tmpfs 路径仍保持可写。

要公开主机 GPU，请将 `agents.defaults.sandbox.docker.gpus`（或每个代理的覆盖项）设置为类似 `"all"` 或 `"device=GPU-uuid"` 的值。该值会传递给所选容器引擎兼容 Docker 的 `--gpus` 标志，并且需要兼容的主机 GPU 配置。Podman 使用此选项需要 5.0 或更高版本。

<Warning>
**Docker-out-of-Docker（DooD）限制**

如果你将 OpenClaw Gateway 本身部署为 Docker 容器，它会使用主机的 Docker socket（DooD）编排同级沙箱容器。这会引入路径映射约束：

- **配置需要主机路径**：`openclaw.json` 中的 `workspace` 必须包含**主机的绝对路径**（例如 `/home/user/.openclaw/workspaces`），而不是 Gateway 容器内部的路径。Docker 守护进程会基于主机 OS 命名空间计算路径，而不是 Gateway 自己的命名空间。
- **需要匹配的 volume 映射**：Gateway 进程也会将心跳和桥接文件写入该 `workspace` 路径。请为 Gateway 容器提供相同的 volume 映射（`-v /home/user/.openclaw:/home/user/.openclaw`），这样相同的主机路径在 Gateway 容器内也能正确解析。映射不一致时，Gateway 尝试写入心跳会出现 `EACCES`。
- **Codex 代码模式**：当 OpenClaw 沙箱处于活动状态时，OpenClaw 会在该轮禁用 Codex app-server 原生 Code Mode、用户 MCP 服务器以及由应用托管的插件执行（这些功能运行在 Gateway 所在主机上的 app-server 进程中，而不是 OpenClaw 沙箱后端），除非沙箱工具策略暴露了所需工具，并且你选择了实验性的 sandbox exec-server 路径。此时 Shell 访问会通过 OpenClaw 沙箱支持的工具路由，例如 `sandbox_exec` 和 `sandbox_process`。不要将主机 Docker socket 挂载到代理沙箱容器或自定义 Codex 沙箱中。完整行为请参见 [Codex Harness](/plugins/codex-harness)。

在启用了 Docker 沙箱模式的 Ubuntu/AppArmor 主机上，Codex app-server 的 `workspace-write` Shell 执行需要在沙箱容器内具备非特权用户命名空间，而当服务用户无法创建这些命名空间时，可能会在 Shell 启动前失败。如果 Docker 沙箱的出站网络被禁用（`network: "none"`，默认值），这还需要非特权网络命名空间。常见症状包括：`bwrap: setting up uid map: Permission denied` 和 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。运行 `openclaw doctor`；如果它报告 Codex bwrap 命名空间探测失败，请优先使用能够为 OpenClaw 服务进程授予所需命名空间的 AppArmor 配置文件。`kernel.apparmor_restrict_unprivileged_userns=0` 是带有安全权衡的主机级回退方案；仅在该主机安全态势可接受时使用。
</Warning>

### 沙箱浏览器

- 沙箱浏览器会在浏览器工具需要时自动启动（确保 CDP 可访问）。通过 `agents.defaults.sandbox.browser.autoStart`（默认值为 `true`）和 `autoStartTimeoutMs`（默认值为 12 秒）进行配置。
- 沙箱浏览器容器使用专用 Docker 网络（`openclaw-sandbox-browser`），而不是全局的 `bridge` 网络。通过 `agents.defaults.sandbox.browser.network` 进行配置。
- 不支持沙箱浏览器网络模式 `"none"`，因为浏览器控制需要主机发布 CDP 端口。请使用专用默认网络、`bridge` 或其他自定义 bridge 网络。`openclaw doctor --fix` 会禁用受影响的持久化 sidecar，并恢复专用网络，不会在不提示的情况下启用出站访问。
- `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表限制容器边缘的 CDP 入站流量（例如 `172.21.0.1/32`）。
- noVNC 观察者访问默认受密码保护；OpenClaw 会生成一个短时有效的令牌 URL，该 URL 提供本地引导页面，并将密码放入 URL 片段中（不会出现在查询字符串或请求头日志中），然后打开 noVNC。
- `agents.defaults.sandbox.browser.allowHostControl`（默认值为 `false`）允许沙箱会话显式指定主机浏览器作为目标。
- 可选的允许列表会限制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

## Podman 后端

使用 `sandbox.backend: "podman"` 可直接选择原生 `podman` CLI。这是内置后端，而不是插件。即使已安装 `docker` 可执行文件，它也不会探测或选择 Docker。

Podman 会复用现有的 `sandbox.docker.*` 设置和当前原生 `podman` CLI 上下文；它不会添加单独的连接配置界面。

Rootless Podman 对可写工作区挂载默认使用 `--userns=keep-id`。长时间运行的沙箱可能会预留从属 ID，并阻塞无关的 `--userns=auto` 工作负载；在启动这些工作负载之前请将其移除。将 `sandbox.docker.user` 设置为非零数字 UID 或 UID:GID，以控制容器用户。Rootless Podman 会拒绝 UID 或 GID 0，因为 Podman 4.x 无法在保留工作区绑定所有权的同时重新映射命名空间 root；请将需要 root 权限的设置构建到镜像中，或使用 rootful Podman。除此之外，Rootful Podman 会在可用时使用工作区所有者。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "podman",
        scope: "session",
        workspaceAccess: "rw",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          network: "none",
          readOnlyRoot: true,
          capDrop: ["ALL"],
        },
      },
    },
  },
}
```

启用后端之前，请先将沙箱镜像构建或拉取到所选的 Podman 存储中。在源代码检出目录中，可以使用 Podman 构建相同的沙箱 Dockerfile：

```bash
podman build -t openclaw-sandbox:bookworm-slim -f scripts/docker/sandbox/Dockerfile .
```

Podman 注意事项：

- Podman 不支持浏览器沙箱；请保持 `sandbox.browser.enabled` 关闭，或安装 Docker 并选择 `backend: "docker"`。
- 支持本地 Podman 引擎和 Podman Machine。Podman Machine 的绑定源必须位于主机主目录下，因为该目录是其默认共享卷。拒绝任意远程 Podman 连接；远程执行请使用 SSH 后端。
- 自定义 `tmpfs` 或绑定挂载不得覆盖 `/run/podman-init`；OpenClaw 会拒绝这些配置，以确保沙箱清理继续正常工作。

<Warning>
**Podman 外部运行 Podman 的限制**

容器化的 Gateway 会通过主机的本地 Podman 引擎或 Podman Machine 创建同级沙箱。

- **始终一致地使用主机路径**：使用主机绝对路径配置 `workspace`，然后将完整的状态根目录和工作区以相同路径挂载到 Gateway 中。否则，沙箱可能能够挂载工作区，而 Gateway 无法写入心跳文件或技能工作区文件。
- **Podman Machine 设置**：绑定源必须位于主机主目录下。将 Gateway 的 `HOME` 设置为该路径，并将 `OPENCLAW_HOME`、`OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_DIR` 指向规范的已挂载状态根目录。镜像需要兼容的 Podman 客户端、其命名连接和 SSH 身份，以及专用的可写 SSH 目录来保存已知主机元数据。
- **仅允许 Gateway 访问 Podman**：绝不要将引擎套接字、连接材料或 SSH 身份挂载到代理沙箱中。不支持任意远程连接；请改用 SSH 后端。

</Warning>

## SSH 后端

使用 `backend: "ssh"` 可将 `exec`、文件工具和媒体读取沙箱化到任意可通过 SSH 访问的机器上。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 或者使用 SecretRefs / 内联内容代替本地文件：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

默认值：`command: "ssh"`、`workspaceRoot: "/tmp/openclaw-sandboxes"`、`strictHostKeyChecking: true`、`updateHostKeys: true`。

- **生命周期**：OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。首次使用（创建或重新创建后）时，它会从本地工作区向该远程工作区初始化一次内容。之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示中的媒体读取以及入站媒体暂存都会直接通过 SSH 针对远程工作区运行。OpenClaw 不会自动将远程变更同步回本地工作区。
- **认证材料**：`identityFile`/`certificateFile`/`knownHostsFile` 引用的是现有的本地文件。`identityData`/`certificateData`/`knownHostsData` 接受内联字符串或 SecretRefs，通过正常的 secrets 运行时快照解析，写入权限为 `0600` 的临时文件，并在 SSH 会话结束时删除。如果同一项同时设置了 `*File` 和 `*Data` 变体，则该会话中以 `*Data` 为准。
- **远程为准的后果**：在初次初始化之后，远程 SSH 工作区将成为真正的沙箱状态。在初始化步骤之后，如果在 OpenClaw 之外对主机本地进行编辑，这些更改在远程不可见，直到你重新创建沙箱。`openclaw sandbox recreate` 会删除按作用域划分的远程根目录，并在下次使用时再次从本地初始化。此后端不支持浏览器沙箱化，且 `sandbox.docker.*` 设置不适用于它。

## OpenShell 后端

使用 `backend: "openshell"` 可将工具隔离在由 OpenShell 管理的远程环境中。OpenShell 复用与通用 SSH 后端相同的 SSH 传输和远程文件系统桥接，并额外提供 OpenShell 生命周期（`sandbox create/get/delete/ssh-config`）以及可选的 `mirror` 工作区同步模式。

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
          mode: "remote", // mirror | remote
        },
      },
    },
  },
}
```

`mode: "mirror"`（默认）会保持本地工作区为权威来源：OpenClaw 会在 `exec` 之前将本地内容同步到沙箱中，并在之后同步回来。`mode: "remote"` 会先从本地向远程工作区初始化一次，然后直接针对远程工作区执行 `exec`/`read`/`write`/`edit`/`apply_patch`，而不会再同步回本地；在种子初始化之后对本地所做的编辑在你执行 `openclaw sandbox recreate` 之前都不可见。在 `scope: "agent"` 或 `scope: "shared"` 下，该远程工作区会在相同作用域内共享。当前限制：尚不支持沙箱浏览器，且 `sandbox.docker.binds` 不适用于此后端。

`openclaw sandbox list`/`recreate`/`prune` 都将 OpenShell 运行时与 Docker 运行时视为相同；清理逻辑会根据后端进行区分。

有关完整的前置条件、配置参考、工作区模式对比以及生命周期细节，请参阅 [OpenShell](/gateway/openshell)。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制沙箱可见的内容：

| 值               | 行为                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `none`（默认）   | 工具会看到位于 `~/.openclaw/sandboxes` 下的隔离沙箱工作区。                                   |
| `ro`             | 将代理工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。                  |
| `rw`             | 将代理工作区以读写方式挂载到 `/workspace`。                                                  |

使用 OpenShell 后端时，`mirror` 模式在各次 exec 之间仍然使用本地工作区作为权威来源，`remote` 模式在初始种子之后使用远程 OpenShell 工作区作为权威来源，而 `workspaceAccess: "ro"`/`"none"` 仍以相同方式限制写入行为。

传入媒体会被复制到活动沙箱工作区（`media/inbound/*`）。

<Note>
**技能**：`read` 工具以沙箱为根。对于 `workspaceAccess: "none"`，OpenClaw 会将符合条件的技能镜像到沙箱工作区（`.../skills`），以便读取。对于 `"rw"`，工作区技能可从 `/workspace/skills` 读取，而符合条件的受管理、捆绑或插件技能会被实体化到生成的只读路径 `/workspace/.openclaw/sandbox-skills/skills`。
</Note>

## 一个代理使用多个文件夹

当一个沙箱代理需要使用主工作区之外的其他目录时，请使用 Docker 绑定挂载。每个条目都会将主机文件夹映射到容器路径，并明确指定访问模式：

```text
主机目录:容器目录:ro
主机目录:容器目录:rw
```

- `ro` 使挂载的文件夹在沙箱内只读。
- `rw` 允许沙箱中的工具和进程修改主机文件夹。
- 容器路径是代理使用的路径。主机路径不会自动暴露。

此示例为 `research` 代理提供一个可写的主工作区、挂载到 `/reference` 的只读参考资料，以及挂载到 `/drafts` 的单独可写输出文件夹：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        scope: "agent",
      },
    },
    entries: {
      research: {
        default: true,
        workspace: "/srv/openclaw/research-workspace",
        sandbox: {
          workspaceAccess: "rw",
          docker: {
            binds: ["/srv/shared/reference:/reference:ro", "/srv/shared/drafts:/drafts:rw"],
            // 由于这些源位于代理工作区之外，因此是必需的。
            dangerouslyAllowExternalBindSources: true,
          },
        },
      },
    },
  },
}
```

`workspaceAccess` 和绑定模式彼此独立：

| 设置                           | 控制范围                                                                   |
| ------------------------------ | -------------------------------------------------------------------------- |
| `workspaceAccess: "none"`      | 使用隔离的沙箱工作区；不暴露代理工作区。                                   |
| `workspaceAccess: "ro"`        | 将代理工作区以只读方式挂载到 `/agent`。                                    |
| `workspaceAccess: "rw"`        | 将代理工作区以读写方式挂载到 `/workspace`。                                |
| `docker.binds` 条目 `:ro`/`:rw` | 仅控制配置的容器路径上的额外主机文件夹。                                   |

更改 `workspaceAccess` 不会将额外绑定从 `ro` 改为 `rw`，反之亦然。全局和每个代理的 `docker.binds` 会进行合并。对于每个代理的绑定，请保留 `scope: "agent"` 或 `"session"`；`scope: "shared"` 会忽略所有每个代理的 Docker 覆盖设置，仅使用全局绑定。

绑定挂载是支持多文件夹边界的方式，因为 Docker 会通过挂载隔离来构建容器的文件系统视图，并且 `ro`/`rw` 模式会应用于沙箱中的每个进程。该边界涵盖 `exec`、文件系统工具、子进程和库，无需在每个 OpenClaw 代码路径中重复路径授权检查。当允许的 shell 或依赖项可以直接访问文件时，主机侧路径允许列表无法提供同样完整的边界。

选择启用的 `dangerouslyAllowExternalBindSources` 仅允许使用工作区根目录之外的源。它不会禁用 OpenClaw 对系统路径、凭据、Docker socket、符号链接父级或保留目标的阻止检查。请优先选择最小范围的文件夹；除非确实需要写入，否则使用 `ro`，并在更改挂载后重新创建沙箱：

```bash
openclaw sandbox recreate --agent research
```

### 其他绑定行为

`agents.defaults.sandbox.docker.binds` 用于配置全局挂载。格式同样是 `主机:容器:模式`（例如 `"/home/user/source:/source:rw"`）。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到 **sandbox browser** 容器中。设置该项时（包括 `[]`），它会替换 browser 容器的 `docker.binds`；如果未设置，browser 容器会回退到 `docker.binds`。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    entries: {
      build: {
        default: true,
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    },
  },
}
```

<Warning>
**绑定安全性**

- 绑定会绕过 sandbox 文件系统：它们会以你设置的任意模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 默认会阻止危险的绑定源：系统路径（`/etc`、`/proc`、`/sys`、`/dev`、`/root`、`/boot`）、Docker socket 目录（`/run`、`/var/run` 及其 `docker.sock` 变体），以及常见的家目录凭据根目录（`~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm`、`~/.ssh`）。
- 验证会先规范化源路径，然后通过最深的已存在祖先目录再次解析，再重新检查被阻止的路径和允许的根目录，因此即使最终叶子节点尚不存在，符号链接父级逃逸也会被安全地拒绝（例如：如果 `run-link` 指向 `/var/run`，则 `/workspace/run-link/new-file` 仍会解析为 `/var/run/...`）。
- 覆盖保留的容器挂载点（`/workspace`、`/agent`）的绑定目标也会被默认阻止；可通过 `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets: true` 覆盖。
- 默认情况下，位于 workspace/agent-workspace 允许列表根目录之外的绑定源会被阻止；可通过 `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources: true` 覆盖。允许的根目录会以相同方式进行规范化，因此一个在符号链接解析前看起来位于允许列表内的路径，仍会被判定为位于允许根目录之外而拒绝。
- 敏感挂载（密钥、SSH 密钥、服务凭证）应尽量使用 `:ro`，除非绝对必要。
- 如果你只需要对 workspace 进行只读访问，请结合使用 `workspaceAccess: "ro"`；绑定模式彼此独立。
- 有关绑定如何与工具策略和提升权限执行交互，请参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

</Warning>

## 镜像与设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Note>
**源码检出 vs npm install**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 辅助脚本仅在从 [源码检出](https://github.com/openclaw/openclaw) 运行时可用。它们不包含在 npm 包中。

如果你是通过 `npm install -g openclaw` 安装的，请改用下面展示的内联 `docker build` 命令。
</Note>

<Steps>
  <Step title="构建默认镜像">
    从源码检出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    从 npm 安装（不需要源码检出）：

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    默认镜像**不**包含 Node。如果某个技能需要 Node（或其他运行时），请构建自定义镜像，或通过 `sandbox.docker.setupCommand` 安装（需要网络外连 + 可写根目录 + root 用户）。

    如果 `openclaw-sandbox:bookworm-slim` 缺失，OpenClaw **不会**静默替换为普通的 `debian:bookworm-slim`。目标为默认镜像的沙箱运行会在你构建它之前直接失败，并给出构建说明，因为内置镜像包含用于沙箱写入/编辑辅助工具的 `python3`。

  </Step>
  <Step title="可选：构建常用镜像">
    为获得一个带有常用工具（例如 `curl`、`jq`、Node 24、pnpm、`python3` 和 `git`）的功能更完整的沙箱镜像：

    从源码检出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    从 npm 安装时，请先构建默认镜像（见上文），然后使用仓库中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其基础上构建常用镜像。

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="可选：构建沙箱浏览器镜像">
    从源码检出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    npm 包不包含浏览器 Dockerfile 或入口点。请使用源码检出构建此镜像。

  </Step>
</Steps>

默认情况下，本地容器沙箱运行时**不使用网络**。通过 `agents.defaults.sandbox.docker.network` 覆盖此设置。

<Note>
软件包安装和证书存储变更属于镜像配置，而不是正常的沙箱轮次行为。默认设置会有意结合无网络、只读根文件系统和非 root 镜像用户，因此在轮次中进行软件包安装应该会失败。建议使用已经包含所需软件包和私有证书根的自定义镜像。如果 Node 进程需要私有 CA，还应配置 Node 的 CA 路径，例如通过自定义镜像或 `sandbox.docker.env` 设置 `NODE_EXTRA_CA_CERTS`。
</Note>

<AccordionGroup>
  <Accordion title="沙箱浏览器 Chromium 默认值">
    内置沙箱浏览器镜像会为容器化工作负载应用保守的 Chromium 启动标志：

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--password-store=basic`
    - `--use-mock-keychain`
    - 启用 `browser.headless` 时使用 `--headless=new`。
    - `--no-sandbox --disable-setuid-sandbox`（在沙箱浏览器容器中始终启用）。
    - 默认使用 `--disable-3d-apis`、`--disable-gpu`、`--disable-software-rasterizer`；这些图形强化标志有助于在不支持 GPU 的容器中运行。若工作负载需要 WebGL 或其他 3D 功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - 默认使用 `--disable-extensions`；对于依赖扩展的流程，请设置 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0`。
    - 默认使用 `--renderer-process-limit=2`；由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保留 Chromium 的默认值。

    如果你需要不同的运行时配置，请使用自定义浏览器镜像并提供自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 追加额外的启动标志。

  </Accordion>
  <Accordion title="网络安全默认值">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
    - 紧急放行覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关位于此处：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。可通过 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后**只运行一次**（不是每次运行都执行）。它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 单个代理：`agents.entries.*.sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常见问题">
    - 默认的 `docker.network` 是 `"none"`（无外网访问），因此安装软件包会失败。
    - `docker.network: "container:<id>"` 要求设置 `dangerouslyAllowContainerNamespaceJoin: true`，且仅限在紧急情况下使用。
    - `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false`，或构建自定义镜像。
    - 安装软件包时，`user` 必须为 root。Docker 可以省略 `user`，或设置为
      `user: "0:0"`；rootful Podman 必须设置 `user: "0:0"`，因为其默认设置会保留工作区所有权。Rootless Podman
      会拒绝值为零的用户；请将软件包预先构建到镜像中，或使用 rootful Podman。
    - 沙箱执行不会继承主机的 `process.env`。请使用 `agents.defaults.sandbox.docker.env`（或自定义镜像）来配置技能 API 密钥。
    - `agents.defaults.sandbox.docker.env` 中的值会作为显式容器环境变量传入。任何有权访问所选容器引擎的人员，都可以通过 `docker inspect` 或 `podman inspect` 等元数据命令查看这些值。如果无法接受此类元数据暴露，请使用自定义镜像、挂载的密钥文件或其他密钥传递方式。

  </Accordion>
</AccordionGroup>

## 工具策略与逃生阀

在沙箱规则之前，工具的允许/拒绝策略仍然适用。如果某个工具在全局或按代理层面被拒绝，沙箱化也不会把它恢复。

`tools.elevated` 是一个显式逃生阀，会在沙箱外运行 `exec`（默认在 `gateway`，如果 exec 目标是 `node`，则在 `node` 中运行）。`/exec` 指令仅适用于授权发送者，并且按会话持久化；若要彻底禁用 `exec`，请使用工具策略拒绝（参见 [沙箱、工具策略与提权](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- `openclaw sandbox list` 会显示沙箱容器、状态、镜像匹配、运行时长、空闲时间，以及关联的会话/代理。
- `openclaw sandbox explain [--session <key>] [--agent <id>]` 会检查有效的沙箱模式、宿主工作区、运行时工作目录、Docker 挂载、工具策略和修复配置键。其 `workspaceRoot` 字段仍然是配置的沙箱根目录；`effectiveHostWorkspaceRoot` 显示当前活动工作区实际所在位置。
- `openclaw sandbox recreate [--all | --session <key> | --agent <id>] [--browser] [--force]` 会移除容器/环境，以便它们在下次使用时按当前配置重新创建。
- 参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解“为什么会被阻止？”这一思维模型。

## 多代理覆盖

每个代理都可以覆盖沙箱和工具：`agents.entries.*.sandbox` 以及 `agents.entries.*.tools`（此外还有用于沙箱工具策略的 `agents.entries.*.tools.sandbox.tools`）。有关优先级，请参阅[多代理沙箱和工具](/tools/multi-agent-sandbox-tools)。

## 最小启用示例

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## 相关内容

- [多智能体沙箱与工具](/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖与优先级
- [OpenShell](/gateway/openshell) -- 托管沙箱后端设置、工作区模式和配置参考
- [沙箱配置](/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么这被阻止了？”
- [安全性](/gateway/security)
