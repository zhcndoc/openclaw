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

### mirror（默认）

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
| `mode`                    | `"mirror"` or `"remote"` | `"mirror"`    | 工作区同步模式                                                                         |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                                                           |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建时使用的沙箱来源                                                               |
| `gateway`                 | `string`                 | unset         | OpenShell 网关名称（顶层 `--gateway`）                                                 |
| `gatewayEndpoint`         | `string`                 | unset         | OpenShell 网关端点（顶层 `--gateway-endpoint`）                                        |
| `policy`                  | `string`                 | unset         | 用于创建沙箱的 OpenShell 策略 ID                                                     |
| `providers`               | `string[]`               | `[]`          | 在创建沙箱时附加的提供者名称（去重，每个条目对应一个 `--provider` 标志）              |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源（`--gpu`）                                                               |
| `autoProviders`           | `boolean`                | `true`        | 创建期间传递 `--auto-providers`（为 false 时传递 `--no-auto-providers`）               |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内主要的可写工作区                                                                 |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作区挂载路径（当工作区访问权限不是 `rw` 时为只读）                             |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                                                         |

`remoteWorkspaceDir` 和 `remoteAgentWorkspaceDir` 必须是绝对路径，并且
必须位于受管理的根目录 `/sandbox` 或 `/agent` 之下；其他绝对路径会被
拒绝。

沙箱级设置（`mode`、`scope`、`workspaceAccess`）与其他后端一样，位于
`agents.defaults.sandbox` 下。完整矩阵请参见
[沙箱化](/gateway/sandboxing)。

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

在更改以下任一项后执行 recreate：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

## 安全加固

镜像模式文件系统桥接会固定本地工作区根目录，并在每次读取、写入、mkdir、删除和重命名之前重新检查规范路径（通过 realpath），拒绝路径中间的符号链接。符号链接替换或重新挂载的工作区都无法将文件访问重定向到镜像树之外。

## 当前限制

- OpenShell 后端不支持 Sandbox browser。
- `sandbox.docker.binds` 不适用于 OpenShell；如果配置了 binds，sandbox 创建会失败。
- `sandbox.docker.*` 下的 Docker 特定运行时选项（`env` 除外）仅适用于 Docker 后端。

## 工作原理

1. OpenClaw 会针对沙箱名称运行 `sandbox get`（使用任何已配置的
   `--gateway`/`--gateway-endpoint`）；如果失败，则会通过
   `sandbox create` 创建一个，并在设置时传入 `--name`、`--from`、`--policy`，
   在启用时传入 `--gpu`，传入 `--auto-providers`/`--no-auto-providers`，
   并为每个已配置的 provider 传入一个 `--provider` 标志。
2. OpenClaw 会针对沙箱名称运行 `sandbox ssh-config` 以获取 SSH
   连接详情。
3. Core 会将 SSH 配置写入临时文件，并通过与通用 SSH 后端相同的远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：在执行前将本地同步到远端，运行后再同步回来。
5. 在 `remote` 模式下：仅在创建时进行一次初始化，然后直接在远程工作区上操作。

## 相关内容

- [沙箱](/gateway/sandboxing) - 模式、范围和后端比较
- [沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) - 调试被阻止的工具
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) - 每个代理的覆盖设置
- [沙箱 CLI](/cli/sandbox) - `openclaw sandbox` 命令
