---
summary: "将 OpenShell 作为 OpenClaw 代理的托管沙盒后端使用"
title: OpenShell
read_when:
  - 你想使用云端托管沙盒而不是本地 Docker
  - 你正在设置 OpenShell 插件
  - 你需要在 mirror 和 remote 工作区模式之间做选择
---

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 不再在本地运行 Docker
容器，而是将沙盒生命周期交由 `openshell` CLI 管理，后者通过基于 SSH 的命令执行来提供远程环境。

OpenShell 插件重用与通用 [SSH 后端](/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统
桥接。它增加了 OpenShell 特有的生命周期管理（`sandbox create/get/delete`、`sandbox ssh-config`）
以及可选的 `mirror` 工作区模式。

## 前提条件

- 已安装 `openshell` CLI 并且可通过 `PATH` 访问（或者通过
  `plugins.entries.openshell.config.command` 设置自定义路径）
- 一个具有沙盒访问权限的 OpenShell 账户
- 运行在主机上的 OpenClaw Gateway

## 快速开始

1. 启用插件并设置沙盒后端：

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

2. 重启 Gateway。在下一个代理回合中，OpenClaw 会创建一个 OpenShell
   沙盒，并通过它路由工具执行。

3. 验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决策。

### `mirror`

当你希望**本地工作区保持为权威来源**时，使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙盒中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥接进行操作，但本地工作区
  在各轮之间仍然是事实来源。

适用场景：

- 你在 OpenClaw 外部本地编辑文件，并希望这些更改自动在
  沙盒中可见。
- 你希望 OpenShell 沙盒尽可能像 Docker 后端一样运行。
- 你希望宿主工作区在每次 exec 回合后反映沙盒写入。

权衡：每次 exec 前后都会产生额外的同步成本。

### `remote`

当你希望**OpenShell 工作区成为权威来源**时，使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 当沙盒首次创建时，OpenClaw 会仅从本地工作区向远程工作区播种一次。
- 此后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 会直接针对
  远程 OpenShell 工作区操作。
- OpenClaw **不会**将远程更改同步回本地工作区。
- 提示时的媒体读取仍然可用，因为文件和媒体工具是通过
  沙盒桥接读取的。

适用场景：

- 沙盒应主要驻留在远程侧。
- 你希望更低的每轮同步开销。
- 你不希望宿主本地编辑悄悄覆盖远程沙盒状态。

<Warning>
如果你在初始播种之后在主机上、OpenClaw 之外编辑文件，远程沙盒将**不会**看到这些更改。使用 `openclaw sandbox recreate` 重新播种。
</Warning>

### 选择模式

|                          | `mirror`                   | `remote`                  |
| ------------------------ | -------------------------- | ------------------------- |
| **权威工作区**           | 本地主机                   | 远程 OpenShell           |
| **同步方向**             | 双向（每次 exec）          | 一次性播种                |
| **每轮开销**             | 更高（上传 + 下载）        | 更低（直接远程操作）      |
| **本地编辑可见吗？**     | 是，在下一次 exec 时       | 否，直到 recreate        |
| **最适合**               | 开发工作流                 | 长时间运行的代理、CI     |

## 配置参考

所有 OpenShell 配置都位于 `plugins.entries.openshell.config` 下：

| 键                        | 类型                     | 默认值        | 描述                                              |
| ------------------------- | ------------------------ | ------------- | ------------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                    |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                      |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建时的沙盒来源                              |
| `gateway`                 | `string`                 | —             | OpenShell 网关名称（`--gateway`）                 |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 网关端点 URL（`--gateway-endpoint`）    |
| `policy`                  | `string`                 | —             | 用于创建沙盒的 OpenShell 策略 ID                  |
| `providers`               | `string[]`               | `[]`          | 创建沙盒时要附加的提供商名称                      |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源                                     |
| `autoProviders`           | `boolean`                | `true`        | 创建沙盒时传递 `--auto-providers`                 |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙盒内主要可写工作区                               |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | 代理工作区挂载路径（用于只读访问）                |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                   |

沙盒级设置（`mode`、`scope`、`workspaceAccess`）与任何后端一样，都在
`agents.defaults.sandbox` 下配置。完整矩阵请参见
[Sandboxing](/gateway/sandboxing)。

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

OpenShell 沙盒通过常规沙盒 CLI 管理：

```bash
# 列出所有沙盒运行时（Docker + OpenShell）
openclaw sandbox list

# 检查生效策略
openclaw sandbox explain

# 重新创建（删除远程工作区，并在下次使用时重新播种）
openclaw sandbox recreate --all
```

对于 `remote` 模式，**recreate 尤其重要**：它会删除该作用域的权威
远程工作区。下一次使用时会从本地工作区播种一个新的远程工作区。

对于 `mirror` 模式，recreate 主要是重置远程执行环境，因为
本地工作区仍然是权威来源。

### 何时 recreate

在更改以下任一项后执行 recreate：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全加固

OpenShell 会固定工作区根 fd，并在每次读取前重新检查沙盒身份，
因此 symlink 替换或重新挂载的工作区无法将读取重定向到预期的远程工作区之外。

## 当前限制

- OpenShell 后端不支持沙盒浏览器。
- `sandbox.docker.binds` 不适用于 OpenShell。
- `sandbox.docker.*` 下的 Docker 特定运行时参数仅适用于 Docker
  后端。

## 工作原理

1. OpenClaw 调用 `openshell sandbox create`（按配置传入 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 `openshell sandbox ssh-config <name>` 获取沙盒的 SSH 连接
   详细信息。
3. 核心将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的
   远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：在 exec 前将本地同步到远程，运行后再同步回来。
5. 在 `remote` 模式下：创建时播种一次，然后直接操作远程
   工作区。

## 相关内容

- [Sandboxing](/gateway/sandboxing) -- 模式、作用域和后端比较
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试被阻止的工具
- [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools) -- 按代理覆盖
- [Sandbox CLI](/cli/sandbox) -- `openclaw sandbox` 命令
