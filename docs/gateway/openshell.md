---
summary: "将 OpenShell 作为 OpenClaw 代理的托管沙盒后端使用"
title: OpenShell
read_when:
  - 你想使用云端托管沙盒而不是本地 Docker
  - 你正在设置 OpenShell 插件
  - 你需要在 mirror 和 remote 工作区模式之间做选择
---

OpenShell 是一个托管的沙盒后端：OpenClaw 不再在本地运行 Docker 容器，而是将沙盒生命周期管理委托给 `openshell` CLI，由它来配置远程环境并通过 SSH 执行命令。

该插件复用了通用 [SSH 后端](/gateway/sandboxing#ssh-backend) 的相同 SSH 传输和远程文件系统桥接，并额外提供 OpenShell 生命周期管理（`sandbox create/get/delete/ssh-config`）以及可选的 `mirror` 工作区同步模式。

## Preconditions

- OpenShell plugin installed (`openclaw plugins install @openclaw/openshell-sandbox`)
- `openshell` CLI on `PATH` (or a custom path via
  `plugins.entries.openshell.config.command`)
- OpenSSH client available on the Gateway host
- OpenShell `v0.0.88` or newer when configuring an OpenShell workspace
- An OpenShell account with sandbox access
- OpenClaw Gateway running on the host

## 快速开始

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

重启 Gateway。在下一个 agent 回合中，OpenClaw 会创建一个 OpenShell
沙盒，并通过它路由工具执行。可通过以下命令验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是最重要的 OpenShell 决策。

OpenShell also has a control-plane resource named a **workspace**. That is
separate from the filesystem workspace described below: it scopes sandboxes,
providers, policies, inference routes, and membership. Set
`plugins.entries.openshell.config.workspace` to use an existing non-default
OpenShell workspace. The plugin does not create OpenShell workspaces or manage
their membership. When this setting is unset, the plugin preserves the
OpenShell CLI's ambient `OPENSHELL_WORKSPACE` selection, or the CLI's `default`
fallback when no ambient selection exists.

### mirror (default)

`plugins.entries.openshell.config.mode: "mirror"` 保持**本地工作区为权威**：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到沙箱中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地。
- 文件工具通过沙箱桥接，但在两次交互之间，本地仍是事实来源。

最适合开发工作流：在 OpenClaw 之外进行的本地编辑会在下一次 `exec` 时出现，且沙箱的行为更接近 Docker 后端。

权衡：每次 `exec` 都有上传 + 下载成本。

### remote

`mode: "remote"` 使 **OpenShell 工作区为权威**：

- 在首次创建沙箱时，OpenClaw 会仅一次性将本地内容种子化到远程工作区。
- 此后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 都直接作用于远程工作区。OpenClaw **不会** 将远程更改同步回本地。
- 提示时的媒体读取仍然可用（文件/媒体工具通过沙箱桥接读取）。

最适合长时间运行的代理和 CI：每轮开销更低，且主机本地编辑不会悄悄覆盖远程状态。

<Warning>
在首次种子化之后，如果在 OpenClaw 之外于主机上编辑文件，远程沙箱将无法感知。运行 `openclaw sandbox recreate` 以重新种子化。
</Warning>

### 选择模式

|                          | `mirror`                   | `remote`                  |
| ------------------------ | -------------------------- | ------------------------- |
| **权威工作区**           | 本地主机                   | 远程 OpenShell            |
| **同步方向**             | 双向（每次 exec）          | 一次性种子化              |
| **每轮开销**             | 更高（上传 + 下载）        | 更低（直接远程操作）      |
| **本地编辑可见吗？**     | 是，在下一次 exec 时可见   | 否，直到重新创建         |
| **最适合**               | 开发工作流                 | 长时间运行的代理、CI      |

## 配置参考

所有 OpenShell 配置都位于 `plugins.entries.openshell.config` 下：

| Key                       | Type                     | Default       | Description                                                                            |
| ------------------------- | ------------------------ | ------------- | -------------------------------------------------------------------------------------- |
| `mode`                    | `"mirror"` or `"remote"` | `"mirror"`    | Workspace sync mode                                                                    |
| `command`                 | `string`                 | `"openshell"` | Path or name of the `openshell` CLI                                                    |
| `from`                    | `string`                 | `"openclaw"`  | Sandbox source for first-time create                                                   |
| `gateway`                 | `string`                 | unset         | OpenShell gateway name (top-level `--gateway`)                                         |
| `gatewayEndpoint`         | `string`                 | unset         | OpenShell gateway endpoint (top-level `--gateway-endpoint`)                            |
| `workspace`               | `string`                 | unset         | Existing OpenShell control-plane workspace used for every CLI operation                |
| `policy`                  | `string`                 | unset         | OpenShell policy ID for sandbox creation                                               |
| `providers`               | `string[]`               | `[]`          | Provider names attached at sandbox creation (deduped, one `--provider` flag per entry) |
| `gpu`                     | `boolean`                | `false`       | Request GPU resources (`--gpu`)                                                        |
| `autoProviders`           | `boolean`                | `true`        | Pass `--auto-providers` (or `--no-auto-providers` when false) during create            |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | Primary writable workspace inside the sandbox                                          |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent workspace mount path (read-only when workspace access is not `rw`)               |
| `timeoutSeconds`          | `number`                 | `120`         | Timeout for `openshell` CLI operations                                                 |

`remoteWorkspaceDir` 和 `remoteAgentWorkspaceDir` 必须是绝对路径，并且
必须位于受管理的根目录 `/sandbox` 或 `/agent` 之下；其他绝对路径会被
拒绝。

`workspace` must match OpenShell's current workspace-name contract: 1-19
lowercase alphanumeric characters or single hyphens, with no leading,
trailing, or consecutive hyphen. Create it first with
`openshell workspace create --name <name>`. OpenShell rejects sandbox
operations when the selected workspace does not exist or is being deleted.
Set it to `"default"` to override an ambient non-default Workspace explicitly.

The setting applies to every OpenShell sandbox managed by this plugin instance;
it cannot select different OpenShell workspaces per OpenClaw agent or session.
Changing it does not migrate existing sandboxes. Delete OpenClaw's OpenShell
sandboxes while the old workspace is still configured, then change the setting
and restart the Gateway.

Sandbox-level settings (`mode`, `scope`, `workspaceAccess`) live under
`agents.defaults.sandbox` like any backend. See
[Sandboxing](/gateway/sandboxing) for the full matrix.

## 示例

### 最小远程配置

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

### 带 GPU 的 mirror 模式

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

### 带自定义网关的按代理 OpenShell

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
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
          policy: "strict",
        },
      },
    },
  },
}
```

## 生命周期管理

```bash
# 列出所有沙盒运行时（Docker + OpenShell）
openclaw sandbox list

# 检查生效策略
openclaw sandbox explain

# 重新创建（删除远程工作区，并在下次使用时重新播种）
openclaw sandbox recreate --all
```

对于 `remote` 模式，recreate 尤其重要：它会删除该作用域的规范远程工作区，并在下次使用时从本地重新播种一个新的工作区。对于 `mirror` 模式，recreate 主要是重置远程执行环境，因为本地仍然是规范来源。

OpenClaw keeps a registered sandbox's shipped legacy runtime name after an
upgrade so its remote workspace remains addressable. Recreating that scope
deletes the legacy runtime; the next use creates the current 19-character
runtime name.

OpenShell v0.0.92 can still locate a sandbox record created by v0.0.68, but a
Docker-backed sandbox may remain in a non-Ready phase after the gateway
upgrade. OpenClaw preserves the registered runtime identity, refuses to create
a replacement implicitly, and reports the scoped `openclaw sandbox recreate`
command. Treat that recreation as destructive in `remote` mode because the
remote workspace is canonical.

Recreate after changing any of:

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

## 安全加固

镜像模式文件系统桥接会固定本地工作区根目录，并在每次读取、写入、mkdir、删除和重命名之前重新检查规范路径（通过 realpath），拒绝路径中间的符号链接。符号链接替换或重新挂载的工作区都无法将文件访问重定向到镜像树之外。

## Custom image contract

The OpenShell source image owns the remote operating system and package set.
OpenClaw does not apply Docker image, root-filesystem, network, user, or package
settings to this backend.

Custom images used with the OpenClaw filesystem bridge must provide:

- `/bin/sh`
- `python3` or `python` for pinned write, edit, rename, and remove operations
- GNU-compatible `stat` and `find`
- standard `mkdir`, `mv`, `rm`, and `rmdir` utilities

Package installation and private certificate roots must be included in the
source image or installed from inside the sandbox. The selected OpenShell
policy must permit the required network destinations, and the sandbox user and
filesystem must permit the writes. `sandbox.docker.network`,
`sandbox.docker.readOnlyRoot`, `sandbox.docker.user`, and
`sandbox.docker.setupCommand` do not configure OpenShell.

## Current limitations

- Sandbox browser is not supported on the OpenShell backend.
- One plugin instance uses one OpenShell workspace; per-agent or per-session
  OpenShell workspace selection is not supported.
- `sandbox.docker.binds` does not apply to OpenShell; sandbox creation fails
  if binds are configured.
- Docker-specific runtime knobs under `sandbox.docker.*` (other than `env`)
  apply only to the Docker backend.
- Native plugin code and Gateway RPC stay on the Gateway host. Plugin-owned and
  MCP tools are available to sandboxed sessions only when sandbox tool policy
  allows them.

## 工作原理

1. OpenClaw runs `sandbox get` for the sandbox name (with the selected
   OpenShell workspace and any configured `--gateway`/`--gateway-endpoint`); if
   that fails it creates one in the same OpenShell workspace with
   `sandbox create`, passing `--name`, `--from`, `--policy` when set, `--gpu`
   when enabled, `--auto-providers`/`--no-auto-providers`, and one
   `--provider` flag per configured provider.
2. OpenClaw runs `sandbox ssh-config` for the sandbox name to fetch SSH
   connection details.
3. Core writes the SSH config to a temp file and opens an SSH session through
   the same remote filesystem bridge as the generic SSH backend.
4. In `mirror` mode: sync local to remote before exec, run, sync back after.
5. In `remote` mode: seed once on create, then operate directly on the remote
   workspace.

## 相关内容

- [沙箱](/gateway/sandboxing) - 模式、范围和后端比较
- [沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) - 调试被阻止的工具
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) - 每个代理的覆盖设置
- [沙箱 CLI](/cli/sandbox) - `openclaw sandbox` 命令
