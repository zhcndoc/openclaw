---
summary: "openclaw agents 的 CLI 参考（list/add/delete/bindings/bind/unbind/set identity）"
read_when:
  - 你需要多个隔离的 agent（工作区 + 路由 + 认证）
title: "Agents"
---

# `openclaw agents`

管理隔离的 agent（工作区 + 认证 + 路由）。

相关：

- [多 agent 路由](/concepts/multi-agent)
- [Agent 工作区](/concepts/agent-workspace)
- [Skills 配置](/tools/skills-config)：技能可见性配置。

## 示例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将入站频道流量固定到特定的 agent。

如果你还想为每个 agent 配置不同的可见技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.list[].skills`。参见 [Skills 配置](/tools/skills-config) 和 [配置参考](/gateway/config-agents#agents-defaults-skills)。

列出绑定：

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

添加绑定：

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

你也可以在创建 agent 时添加绑定：

```bash
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:* --bind discord:*
```

如果你省略 `accountId`（`--bind <channel>`），OpenClaw 会从插件设置钩子、强制账户绑定或该频道配置的账户数量中解析它。

如果你在 `bind` 或 `unbind` 中省略 `--agent`，OpenClaw 会将目标设为当前默认 agent。

### `--bind` 格式

| 格式                         | 含义                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `--bind <channel>:*`         | 匹配该频道上的所有账户。                                                                |
| `--bind <channel>:<account>` | 匹配一个账户。                                                                                |
| `--bind <channel>`           | 仅匹配默认账户，除非 CLI 能安全解析出特定于插件的账户作用域。 |

### 绑定作用域行为

- 不带 `accountId` 的已存储绑定仅匹配该频道的默认账户。
- `accountId: "*"` 是频道级回退（所有账户），其具体性低于显式账户绑定。
- 如果同一个 agent 已经有一个不带 `accountId` 的匹配频道绑定，而你随后使用显式或已解析的 `accountId` 进行绑定，OpenClaw 会就地升级现有绑定，而不是添加重复项。

示例：

```bash
# 匹配该频道上的所有账户
openclaw agents bind --agent work --bind telegram:*

# 匹配特定账户
openclaw agents bind --agent work --bind telegram:ops

# 初始仅频道绑定
openclaw agents bind --agent work --bind telegram

# 之后升级为账户作用域绑定
openclaw agents bind --agent work --bind telegram:alerts
```

升级后，该绑定的路由将限定为 `telegram:alerts`。如果你还想要默认账户路由，请显式添加它（例如 `--bind telegram:default`）。

移除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一个或多个 `--bind` 值，但不能同时使用两者。

## 命令表面

### `agents`

不带子命令直接运行 `openclaw agents` 等同于 `openclaw agents list`。

### `agents list`

选项：

- `--json`
- `--bindings`：包含完整路由规则，而不只是每个 agent 的计数/摘要

### `agents add [name]`

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

说明：

- 传入任何显式的 add 参数都会使命令切换到非交互路径。
- 非交互模式要求同时提供 agent 名称和 `--workspace`。
- `main` 是保留值，不能作为新的 agent id 使用。
- 在交互模式下，认证种子只会复制可移植的静态配置文件
  （默认情况下包括 `api_key` 和静态 `token`）。OAuth 刷新令牌配置仍然
  只能通过对真实 `main` agent 存储的读取继承来获得。
  如果配置的默认 agent 不是 `main`，请在新 agent 上单独登录 OAuth
  配置。

### `agents bindings`

选项：

- `--agent <id>`
- `--json`

### `agents bind`

选项：

- `--agent <id>`（默认当前默认 agent）
- `--bind <channel[:accountId]>`（可重复）
- `--json`

### `agents unbind`

选项：

- `--agent <id>`（默认当前默认 agent）
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

### `agents delete <id>`

选项：

- `--force`
- `--json`

说明：

- `main` 不能被删除。
- 未使用 `--force` 时，需要交互式确认。
- 工作区、agent 状态以及会话转录目录会移动到废纸篓，而不是直接硬删除。
- 当 Gateway 可达时，删除会通过 Gateway 发送，因此配置和会话存储清理会与运行时流量共享同一个写入方。如果 Gateway 不可达，CLI 会回退到离线本地路径。
- 如果另一个 agent 的工作区与此工作区是同一路径、位于此工作区内部，或包含此工作区，
  则会保留该工作区，并且 `--json` 会报告 `workspaceRetained`、
  `workspaceRetainedReason` 和 `workspaceSharedWith`。

## 身份文件

每个 agent 工作区都可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 会从工作区根目录（或显式指定的 `--identity-file`）读取

头像路径会相对于工作区根目录解析。

## 设置身份

`set-identity` 会将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（工作区相对路径、http(s) URL 或 data URI）

选项：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

说明：

- 可使用 `--agent` 或 `--workspace` 来选择目标 agent。
- 如果你依赖 `--workspace`，而多个 agent 共享该工作区，命令会失败并要求你传入 `--agent`。
- 当未提供显式身份字段时，命令会从 `IDENTITY.md` 读取身份数据。

从 `IDENTITY.md` 加载：

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

显式覆盖字段：

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

配置示例：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```

## 相关

- [CLI 参考](/cli)
- [多 agent 路由](/concepts/multi-agent)
- [Agent 工作区](/concepts/agent-workspace)
