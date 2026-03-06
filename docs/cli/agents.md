---
summary: "`openclaw agents` 的命令行参考（列表/添加/删除/绑定/解绑/设置身份）"
read_when:
  - 您想要多个隔离的代理（工作空间 + 路由 + 认证）
title: "agents"
---

# `openclaw agents`

管理隔离的代理（工作空间 + 认证 + 路由）。

相关内容：

- 多代理路由：[多代理路由](/concepts/multi-agent)
- 代理工作空间：[代理工作空间](/concepts/agent-workspace)

## 示例

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将传入频道流量固定到特定代理。

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
