---
summary: "openclaw agents 的 CLI 参考（list/add/delete/bindings/bind/unbind/set identity）"
read_when:
  - 你需要多个隔离的 agent（工作区 + 路由 + 认证）
title: "Agent"
---

# `openclaw agents`

管理隔离的 agent（工作区 + 认证 + 路由）。不带子命令运行 `openclaw agents` 等同于 `openclaw agents list`。

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

## 命令界面

### `agents list`

选项：`--json`、`--bindings`（包含完整路由规则，而不仅仅是每个 agent 的计数/摘要）。

### `agents add [name]`

选项：`--workspace <dir>`、`--model <id>`、`--agent-dir <dir>`、`--bind <channel[:accountId]>`（可重复）、`--non-interactive`、`--json`。

- 传入任何明确的添加标志都会将命令切换为非交互路径。
- 非交互模式需要同时提供 agent 名称和 `--workspace`。
- `main` 为保留项，不能用作新的 agent id。
- 交互模式会通过仅复制可移植的静态凭据（`api_key` 和静态 `token` 配置文件）来初始化认证，除非某个凭据通过 `copyToAgents: false` 选择不复制；OAuth 刷新令牌配置文件不会被复制，除非提供方通过 `copyToAgents: true` 选择复制。若不复制，OAuth 仅可通过从真实的 `main` agent 存储进行读穿继承来保持可用。如果配置的默认 agent 不是 `main`，请为新 agent 上的 OAuth 配置文件单独登录。

### `agents bindings`

选项：`--agent <id>`、`--json`。

### `agents bind`

选项：`--agent <id>`（默认为当前默认 agent）、`--bind <channel[:accountId]>`（可重复）、`--json`。

### `agents unbind`

选项：`--agent <id>`（默认为当前默认 agent）、`--bind <channel[:accountId]>`（可重复）、`--all`、`--json`。只接受 `--all` 或一个或多个 `--bind` 值，不能同时使用。

### `agents set-identity`

选项：`--agent <id>`、`--workspace <dir>`、`--identity-file <path>`、`--from-identity`、`--name <name>`、`--theme <theme>`、`--emoji <emoji>`、`--avatar <value>`、`--json`。另见下方的 [Set identity](#set-identity)。

### `agents delete <id>`

选项：`--force`、`--json`。

- `main` 不能被删除。
- 如果没有 `--force`，则需要交互式确认（在非 TTY 会话中会失败；请使用 `--force` 重新运行）。
- 工作区、agent 状态和会话转录目录会移动到 Trash，而不是直接硬删除。如果 Trash 不可用，agent 配置删除仍会成功，并报告需要手动清理的路径。
- 当 Gateway 可达时，删除会通过 Gateway 路由，因此配置和会话存储清理会与运行时流量使用同一个写入端。如果 Gateway 不可达，CLI 会回退到离线本地路径。
- 如果另一个 agent 的工作区与此工作区是同一路径、位于此工作区内，或包含此工作区，则会保留该工作区，并且 `--json` 会报告 `workspaceRetained`、`workspaceRetainedReason` 和 `workspaceSharedWith`。

## 路由绑定

使用路由绑定将入站频道流量固定到特定的 agent。

如果你还想为不同的 agent 显示不同的可见技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.entries.*.skills`。参见 [Skills config](/tools/skills-config) 和 [Configuration reference](/gateway/config-agents#agentsdefaultsskills)。

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

| Format                       | Meaning                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `--bind <channel>:*`         | 匹配该频道上的所有账户。                                                                                 |
| `--bind <channel>:<account>` | 匹配一个账户。                                                                                     |
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

## 身份文件

每个 agent 工作区都可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录（或显式指定的 `--identity-file`）读取。

头像路径会相对于工作区根目录解析，并且不能逃离该目录，即使通过符号链接也不行。

## 设置身份

`set-identity` 会将字段写入 `agents.entries.*.identity`：`name`、`theme`、`emoji`、`avatar`（工作区相对路径、http(s) URL 或 data URI）。

- `--agent` 或 `--workspace` 用于选择目标代理。如果 `--workspace` 匹配多个代理，命令会失败，并提示你传入 `--agent`。
- 本地工作区相对路径的头像图片文件大小限制为 2 MB。HTTP(S) URL 和 `data:` URI 不受本地文件大小限制检查。
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
          theme: "太空龙虾",
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
