---
title: OpenShell
summary: "使用 OpenShell 作为 OpenClaw 代理的托管沙盒后端"
read_when:
  - 你想要云托管沙盒而非本地 Docker
  - 你正在设置 OpenShell 插件
  - 你需要在 mirror 和 remote 工作区模式之间做出选择
---

# OpenShell

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 不是在本地运行 Docker 容器，而是将沙盒生命周期委托给 `openshell` CLI，该工具会预置支持基于 SSH 命令执行的远程环境。

OpenShell 插件复用了与通用 [SSH 后端](/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统桥接。它添加了 OpenShell 特定的生命周期管理（`sandbox create/get/delete`、`sandbox ssh-config`）以及可选的 `mirror` 工作区模式。

## 先决条件

- 已安装 `openshell` CLI 并在 `PATH` 中（或通过 `plugins.entries.openshell.config.command` 设置自定义路径）
- 具有沙盒访问权限的 OpenShell 账户
- 在主机上运行的 OpenClaw Gateway

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

2. 重启 Gateway。在下一次代理回合时，OpenClaw 会创建一个 OpenShell 沙盒并通过它路由工具执行。

3. 验证：

```bash
# 列出所有沙盒运行时（Docker + OpenShell）
openclaw sandbox list
# 检查有效策略
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决定。

### `mirror`

当你希望**本地工作区保持权威**时，使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在执行 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙盒中。
- 在执行 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥接操作，但本地工作区在回合之间保持为真相来源。

最适合：

- 你在 OpenClaw 外部本地编辑文件，并希望这些更改在沙盒中自动可见。
- 你希望 OpenShell 沙盒的行为尽可能类似于 Docker 后端。
- 你希望主工作区在每个执行回合后反映沙盒的写入。

权衡：每次执行前后的额外同步开销。

### `remote`

当你希望 **OpenShell 工作区成为权威**时，使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 当沙盒首次创建时，OpenClaw 会从本地工作区一次性初始化远程工作区。
- 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接针对远程 OpenShell 工作区操作。
- OpenClaw**不会**将远程更改同步回本地工作区。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过沙盒桥接读取。

最适合：

- 沙盒应主要存在于远程端。
- 你希望每回合的同步开销更低。
- 你不希望主机本地的编辑静默覆盖远程沙盒状态。

重要提示：如果在初始初始化后你在 OpenClaw 外部的主机上编辑文件，远程沙盒**不会**看到这些更改。使用 `openclaw sandbox recreate` 重新初始化。

### 选择模式

| | `mirror` | `remote` |
| ------------------------ | -------------------------- | ------------------------- |
| **权威工作区** | 本地主机 | 远程 OpenShell |
| **同步方向** | 双向（每次执行） | 一次性初始化 |
| **每回合开销** | 较高（上传 + 下载） | 较低（直接远程操作） |
| **本地编辑可见？** | 是，下次执行时 | 否，直到重新创建 |
| **最适合** | 开发工作流 | 长时间运行的代理、CI |

## 配置参考

所有 OpenShell 配置位于 `plugins.entries.openshell.config` 下：

| 键 | 类型 | 默认值 | 描述 |
| ------------------------- | ------------------------ | ------------- | ----------------------------------------------------- |
| `mode` | `"mirror"` 或 `"remote"` | `"mirror"` | 工作区同步模式 |
| `command` | `string` | `"openshell"` | `openshell` CLI 的路径或名称 |
| `from` | `string` | `"openclaw"` | 首次创建时的沙盒源 |
| `gateway` | `string` | — | OpenShell 网关名称（`--gateway`） |
| `gatewayEndpoint` | `string` | — | OpenShell 网关端点 URL（`--gateway-endpoint`） |
| `policy` | `string` | — | 沙盒创建的 OpenShell 策略 ID |
| `providers` | `string[]` | `[]` | 沙盒创建时要附加的提供程序名称 |
| `gpu` | `boolean` | `false` | 请求 GPU 资源 |
| `autoProviders` | `boolean` | `true` | 在沙盒创建期间传递 `--auto-providers` |
| `remoteWorkspaceDir` | `string` | `"/sandbox"` | 沙盒内的主可写工作区 |
| `remoteAgentWorkspaceDir` | `string` | `"/agent"` | 代理工作区挂载路径（用于只读访问） |
| `timeoutSeconds` | `number` | `120` | `openshell` CLI 操作的超时时间 |

沙盒级设置（`mode`、`scope`、`workspaceAccess`）与其他后端一样，在 `agents.defaults.sandbox` 下配置。参见 [Sandboxing](/gateway/sandboxing) 获取完整矩阵。

## 示例

### 最小化远程设置

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

### 带 GPU 的 Mirror 模式

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

### 使用自定义网关的每代理 OpenShell

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

OpenShell 沙盒通过常规沙盒 CLI 进行管理：

```bash
# 列出所有沙盒运行时（Docker + OpenShell）
openclaw sandbox list

# 检查有效策略
openclaw sandbox explain

# 重新创建（删除远程工作区，下次使用时重新初始化）
openclaw sandbox recreate --all
```

对于 `remote` 模式，**重新创建尤为重要**：它会删除该范围的权威远程工作区。下次使用时会从本地工作区初始化一个全新的远程工作区。

对于 `mirror` 模式，重新创建主要重置远程执行环境，因为本地工作区保持权威。

### 何时重新创建

在更改以下任何一项后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 当前限制

- OpenShell 后端不支持沙盒浏览器。
- `sandbox.docker.binds` 不适用于 OpenShell。
- `sandbox.docker.*` 下的 Docker 特定运行时参数仅适用于 Docker 后端。

## 工作原理

1. OpenClaw 调用 `openshell sandbox create`（根据配置带有 `--from`、`--gateway`、`--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 `openshell sandbox ssh-config <name>` 以获取沙盒的 SSH 连接详情。
3. Core 将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：执行前将本地同步到远程，运行，执行后同步回本地。
5. 在 `remote` 模式下：创建时初始化一次，然后直接在远程工作区上操作。

## 另请参见

- [Sandboxing](/gateway/sandboxing) -- 模式、范围和后端比较
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试被阻止的工具
- [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools) -- 每代理覆盖
- [Sandbox CLI](/cli/sandbox) -- `openclaw sandbox` 命令
