---
summary: "`openclaw agents` 的命令行参考（列表/添加/删除/绑定/解绑/设置身份）"
read_when:
  - 你想要多个隔离的代理（工作空间 + 路由 + 认证）
title: "代理"
---

# `openclaw agents`

管理隔离的代理（工作空间 + 认证 + 路由）。

相关内容：

- [多代理路由](/concepts/multi-agent)
- [代理工作空间](/concepts/agent-workspace)
- [技能配置](/tools/skills-config)：技能可见性配置。

## 示例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将传入频道流量固定到特定代理。

如果你还希望每个代理显示不同的技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.list[].skills`。请参见 [技能配置](/tools/skills-config) 和 [配置参考](/gateway/config-agents#agents-defaults-skills)。

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

如果省略 `accountId` (`--bind <channel>`)，OpenClaw 会在可用时从频道默认和插件设置钩子中解析它。

如果在 `bind` 或 `unbind` 中省略 `--agent`，OpenClaw 将针对当前默认代理。

### 绑定作用域行为

- 不带 `accountId` 的绑定只匹配频道默认账号。
- `accountId: "*"` 是频道范围的后备（所有账号），其优先级低于明确账号绑定。
- 如果同一代理已有不带 `accountId` 的匹配频道绑定，之后你绑定了明确或解析过的 `accountId`，OpenClaw 会在原地升级该绑定，而不是添加重复项。

示例：

```bash
# 初始频道绑定（仅频道）
openclaw agents bind --agent work --bind telegram

# 后续升级为账号作用域绑定
openclaw agents bind --agent work --bind telegram:ops
```

升级后，该绑定的路由作用域为 `telegram:ops`。如果你还想要默认账号路由，需要显式添加（例如 `--bind telegram:default`）。

移除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一个或多个 `--bind` 值，但不能同时使用。

## 命令界面

### `agents`

不带子命令运行 `openclaw agents` 等同于 `openclaw agents list`。

### `agents list`

选项：

- `--json`
- `--bindings`：包含完整路由规则，而不仅是每个代理的计数/摘要

### `agents add [name]`

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重复)
- `--non-interactive`
- `--json`

注意：

- 传递任何显式的添加标志会将命令切换到非交互模式。
- 非交互模式需要代理名称和 `--workspace`。
- `main` 是保留字，不能用作新代理 id。

### `agents bindings`

选项：

- `--agent <id>`
- `--json`

### `agents bind`

选项：

- `--agent <id>` (默认为当前默认代理)
- `--bind <channel[:accountId]>` (可重复)
- `--json`

### `agents unbind`

选项：

- `--agent <id>` (默认为当前默认代理)
- `--bind <channel[:accountId]>` (可重复)
- `--all`
- `--json`

### `agents delete <id>`

选项：

- `--force`
- `--json`

注意：

- `main` 不能被删除。
- 不带 `--force` 时，需要交互式确认。
- 工作空间、代理状态和会话记录目录会移动到废纸篓，而不是永久删除。
- 如果另一个代理的工作空间与此工作空间路径相同、位于此工作空间内部，或包含此工作空间，
  则保留该工作空间，并且 `--json` 会报告 `workspaceRetained`、
  `workspaceRetainedReason` 和 `workspaceSharedWith`。

## 身份文件

每个代理工作空间可在工作空间根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作空间根目录（或显式指定的 `--identity-file`）读取

头像路径相对于工作空间根目录解析。

## 设置身份

`set-identity` 将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（相对于工作空间的路径，http(s) URL，或数据 URI）

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

注意：

- 可以使用 `--agent` 或 `--workspace` 来选择目标代理。
- 如果依赖 `--workspace` 且多个代理共享该工作空间，命令将失败并要求您传递 `--agent`。
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

## 相关内容

- [CLI 参考](/cli)
- [多代理路由](/concepts/multi-agent)
- [代理工作空间](/concepts/agent-workspace)
