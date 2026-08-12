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

## 前置条件

- 已安装 OpenShell 插件（`openclaw plugins install @openclaw/openshell-sandbox`）
- `openshell` CLI 位于 `PATH` 中（或通过
  `plugins.entries.openshell.config.command` 使用自定义路径）
- Gateway 主机上提供 OpenSSH 客户端
- 配置 OpenShell 工作区时使用 OpenShell `v0.0.88` 或更高版本
- 拥有可访问沙箱的 OpenShell 账户
- OpenClaw Gateway 正在主机上运行。

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

OpenShell 还有一个名为 **workspace** 的控制平面资源。它与下文所述的文件系统工作区相互独立：它用于限定沙箱、providers、policies、推理路由和成员关系。设置 `plugins.entries.openshell.config.workspace` 可使用现有的非默认 OpenShell 工作区。该插件不会创建 OpenShell 工作区，也不会管理其成员关系。未设置此项时，插件会保留 OpenShell CLI 当前的 `OPENSHELL_WORKSPACE` 选择；如果不存在当前选择，则使用 CLI 的 `default` 回退值。

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
- 提示时的媒体读取仍然可用（文件／媒体工具通过沙箱桥接读取）。

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
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                                                        |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                                                           |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建时的沙箱源                                                                     |
| `gateway`                 | `string`                 | 未设置        | OpenShell 网关名称（顶层 `--gateway`）                                                 |
| `gatewayEndpoint`         | `string`                 | 未设置        | OpenShell 网关端点（顶层 `--gateway-endpoint`）                                        |
| `workspace`               | `string`                 | 未设置        | 每次 CLI 操作使用的现有 OpenShell 控制平面工作区                                       |
| `policy`                  | `string`                 | 未设置        | 用于创建沙箱的 OpenShell policy ID                                                     |
| `providers`               | `string[]`               | `[]`          | 创建沙箱时附加的 Provider 名称（去重，每个条目使用一个 `--provider` 标志）              |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源（`--gpu`）                                                               |
| `autoProviders`           | `boolean`                | `true`        | 创建期间传递 `--auto-providers`（为 false 时传递 `--no-auto-providers`）                 |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内主要的可写工作区                                                                   |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作区挂载路径（当工作区访问权限不是 `rw` 时为只读）                              |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                                                          |

`remoteWorkspaceDir` 和 `remoteAgentWorkspaceDir` 必须是绝对路径，并且
必须位于受管理的根目录 `/sandbox` 或 `/agent` 之下；其他绝对路径会被
拒绝。

`workspace` 必须符合 OpenShell 当前的工作区名称规则：由 1-19 个
小写字母数字字符或单个连字符组成，且不能以连字符开头或结尾，也不能包含
连续的连字符。请先使用
`openshell workspace create --name <name>` 创建它。如果所选工作区不存在或正在删除，OpenShell 会拒绝沙箱
操作。将其设置为 `"default"` 可显式覆盖当前环境中的非默认工作区。

该设置适用于此插件实例管理的每个 OpenShell 沙箱；
不能为每个 OpenClaw agent 或会话选择不同的 OpenShell 工作区。
更改该设置不会迁移现有沙箱。请在旧工作区仍处于配置状态时删除 OpenClaw 的 OpenShell
沙箱，然后更改设置并重启 Gateway。

沙箱级设置（`mode`、`scope`、`workspaceAccess`）位于
`agents.defaults.sandbox` 下，与其他后端相同。完整矩阵请参阅
[沙箱机制](/gateway/sandboxing)。

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
    entries: {
      researcher: {
        default: true,
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

OpenClaw 会在升级后保留已注册沙盒所附带的旧版运行时名称，以便其远程工作区仍然可寻址。重新创建该作用域会删除旧版运行时；下次使用时将创建当前的 19 个字符的运行时名称。

OpenShell v0.0.92 仍然可以定位由 v0.0.68 创建的沙盒记录，但由 Docker 支持的沙盒在网关升级后可能会停留在非 Ready 阶段。OpenClaw 会保留已注册的运行时身份，拒绝隐式创建替代运行时，并报告作用域限定的 `openclaw sandbox recreate` 命令。在 `remote` 模式下，应将此次重新创建视为破坏性操作，因为远程工作区是规范来源。

在更改以下任一项后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

## 安全加固

镜像模式文件系统桥接会固定本地工作区根目录，并在每次读取、写入、mkdir、删除和重命名之前重新检查规范路径（通过 realpath），拒绝路径中间的符号链接。符号链接替换或重新挂载的工作区都无法将文件访问重定向到镜像树之外。

## 自定义镜像契约

OpenShell 源镜像拥有远程操作系统和软件包集。
OpenClaw 不会将 Docker 镜像、根文件系统、网络、用户或软件包
设置应用于此后端。

与 OpenClaw 文件系统桥接配合使用的自定义镜像必须提供：

- `/bin/sh`
- 用于固定写入、编辑、重命名和删除操作的 `python3` 或 `python`
- GNU 兼容的 `stat` 和 `find`
- 标准的 `mkdir`、`mv`、`rm` 和 `rmdir` 实用程序

软件包安装和私有证书根必须包含在源镜像中，或从沙箱内部安装。所选的
OpenShell 策略必须允许所需的网络目标，并且沙箱用户和文件系统必须允许
写入。`sandbox.docker.network`、`sandbox.docker.readOnlyRoot`、
`sandbox.docker.user` 和 `sandbox.docker.setupCommand` 不会配置 OpenShell。

## 当前限制

- Sandbox 浏览器不支持 OpenShell 后端。
- 一个插件实例使用一个 OpenShell 工作区；不支持按代理或按会话选择
  OpenShell 工作区。
- `sandbox.docker.binds` 不适用于 OpenShell；如果配置了 binds，沙箱创建将失败。
- `sandbox.docker.*` 下特定于 Docker 的运行时选项（`env` 除外）
  仅适用于 Docker 后端。
- 原生插件代码和 Gateway RPC 保留在 Gateway 主机上。仅当沙箱工具策略允许时，
  插件所有和 MCP 工具才可用于沙箱会话。

## 工作原理

1. OpenClaw 为沙箱名称运行 `sandbox get`（使用选定的
   OpenShell 工作区以及任何已配置的 `--gateway`／`--gateway-endpoint`）；如果
   失败，则在同一个 OpenShell 工作区中使用 `sandbox create` 创建沙箱，
   并在设置时传递 `--name`、`--from`、`--policy`，启用时传递 `--gpu`，
   传递 `--auto-providers`／`--no-auto-providers`，并为每个已配置的提供商传递一个
   `--provider` 标志。
2. OpenClaw 为沙箱名称运行 `sandbox ssh-config`，以获取 SSH
   连接详细信息。
3. Core 将 SSH 配置写入临时文件，并通过与通用 SSH 后端相同的远程文件系统桥接层打开 SSH 会话。
4. 在 `mirror` 模式下：执行前将本地同步到远程，运行后再同步回来。
5. 在 `remote` 模式下：创建时初始化一次，之后直接在远程
   工作区中操作。

## 相关内容

- [沙箱](/gateway/sandboxing) - 模式、范围和后端比较
- [沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) - 调试被阻止的工具
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) - 每个代理的覆盖设置
- [沙箱 CLI](/cli/sandbox) - `openclaw sandbox` 命令。
