# 用于 Discord 频道和 Telegram 主题的 ACP 持久绑定

状态：草案

## 摘要

引入持久的 ACP 绑定，将：

- Discord 频道（及必要时的现有线程），和
- Telegram 群组/超级群组中的论坛主题（`chatId:topic:topicId`）

映射到长期存在的 ACP 会话，绑定状态存储在顶层 `bindings[]` 条目中，使用显式的绑定类型。

这使得在高流量消息频道中使用 ACP 可预测且持久，用户可创建专用频道/主题，例如 `codex`、`claude-1` 或 `claude-myrepo`。

## 原因

当前的线程绑定 ACP 行为针对临时的 Discord 线程工作流优化。Telegram 不具备相同的线程模型；它在群组/超级群组中有论坛主题。用户希望在聊天界面中拥有稳定、长期开启的 ACP “工作区”，而不仅仅是临时的线程会话。

## 目标

- 支持持久的 ACP 绑定用于：
  - Discord 频道/线程
  - Telegram 论坛主题（群组/超级群组）
- 使绑定来源于配置并作为真理源。
- 保持 `/acp`、`/new`、`/reset`、`/focus` 以及消息传递行为在 Discord 和 Telegram 之间的一致性。
- 保留现有的临时绑定流程以支持临时使用。

## 非目标

- 全面重设计 ACP 运行时/会话内部结构。
- 移除现有的临时绑定流程。
- 首批迭代涵盖所有频道。
- 本阶段中不实现 Telegram 频道的直接消息主题（`direct_messages_topic_id`）。
- 本阶段中不实现 Telegram 私聊主题的变体。

## 用户体验方向

### 1) 两种绑定类型

- **持久绑定**：保存在配置中，启动时同步，用于“命名工作区”频道/主题。
- **临时绑定**：仅运行时存在，依据空闲时间/最大寿命策略过期。

### 2) 命令行为

- `/acp spawn ... --thread here|auto|off` 继续可用。
- 增加显式绑定生命周期控制：
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` 显示绑定是 `persistent` 或 `temporary`。
- 在绑定的对话中，`/new` 和 `/reset` 会原地重置绑定的 ACP 会话，并保持绑定连接。

### 3) 会话身份识别

- 使用规范化的对话 ID：
  - Discord：频道/线程 ID。
  - Telegram 主题：`chatId:topic:topicId`。
- 绝不单独使用裸露的 Telegram 主题 ID 作为键值。

## 配置模型（提议）

统一顶层 `bindings[]` 中的路由和持久 ACP 绑定配置，使用显式的 `type` 区分：

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "runtime": { "type": "embedded" },
      },
      {
        "id": "codex",
        "workspace": "~/.openclaw/workspace-codex",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "codex",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-a",
          },
        },
      },
      {
        "id": "claude",
        "workspace": "~/.openclaw/workspace-claude",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "claude",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-b",
          },
        },
      },
    ],
  },
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "allowedAgents": ["codex", "claude"],
  },
  "bindings": [
    // 路由绑定（现有行为）
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },
    // 持久 ACP 会话绑定
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
      "acp": {
        "label": "codex-main",
        "mode": "persistent",
        "cwd": "/workspace/repo-a",
        "backend": "acpx",
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
      "acp": {
        "label": "claude-repo-b",
        "mode": "persistent",
        "cwd": "/workspace/repo-b",
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1001234567890:topic:42" },
      },
      "acp": {
        "label": "tg-codex-42",
        "mode": "persistent",
      },
    },
  ],
  "channels": {
    "discord": {
      "guilds": {
        "111111111111111111": {
          "channels": {
            "222222222222222222": {
              "enabled": true,
              "requireMention": false,
            },
            "333333333333333333": {
              "enabled": true,
              "requireMention": false,
            },
          },
        },
      },
    },
    "telegram": {
      "groups": {
        "-1001234567890": {
          "topics": {
            "42": {
              "requireMention": false,
            },
          },
        },
      },
    },
  },
}
```

### 最小示例（无每个绑定的 ACP 覆盖）

```jsonc
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "runtime": { "type": "embedded" } },
      {
        "id": "codex",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "codex", "backend": "acpx", "mode": "persistent" },
        },
      },
      {
        "id": "claude",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "claude", "backend": "acpx", "mode": "persistent" },
        },
      },
    ],
  },
  "acp": { "enabled": true, "backend": "acpx" },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },

    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1009876543210:topic:5" },
      },
    },
  ],
}
```

注意：

- `bindings[].type` 是显式的：
  - `route`：正常的代理路由。
  - `acp`：为匹配的会话节点绑定持久 ACP 运行环境。
- 对于 `type: "acp"`，`match.peer.id` 是规范的会话关键字：
  - Discord 频道/线程：原始频道/线程 ID。
  - Telegram 主题：`chatId:topic:topicId`。
- `bindings[].acp.backend` 是可选的，后备顺序为：
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. 全局 `acp.backend`
- `mode`、`cwd` 和 `label` 同样遵循覆盖顺序（绑定覆盖 -> 代理运行时默认 -> 全局/默认行为）。
- 保留现有的 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 以支持临时绑定策略。
- 持久条目声明期望状态，运行时负责与实际 ACP 会话/绑定同步。
- 预期模型为每个会话节点仅存在一个活跃的 ACP 绑定。
- 向后兼容：缺少 `type` 的条目视为 `route`（兼容旧条目）。

### 后端选择

- ACP 会话初始化时会根据当前配置选择后端（即今天的 `acp.backend`）。
- 本提案扩展了 spawn/同步逻辑，实现优先选用类型 ACP 绑定覆盖：
  - 会话本地覆盖使用 `bindings[].acp.backend`。
  - 代理默认值使用 `agents.list[].runtime.acp.backend`。
- 无覆盖时，保持现有行为（使用全局 `acp.backend`）。

## 在现有系统中的架构契合

### 复用现有组件

- `SessionBindingService` 已支持通道无关的会话引用。
- ACP spawn/绑定流程已通过服务 API 支持绑定。
- Telegram 已通过 `MessageThreadId` 和 `chatId` 传递主题/线程上下文。

### 新增/扩展组件

- **Telegram 绑定适配器**（与 Discord 适配器并行）：
  - 为每个 Telegram 账号注册适配器，
  - 按规范化会话 ID 解析/列出/绑定/解绑/触达绑定。
- **类型绑定解析器/索引**：
  - 将 `bindings[]` 拆分为 `route` 和 `acp` 两种视图，
  - `resolveAgentRoute` 仅对 `route` 绑定生效，
  - 从 `acp` 绑定解析持久 ACP 意图。
- **Telegram 的入站绑定解析**：
  - 在路由决策前解析绑定的会话（Discord 已实现该行为）。
- **持久绑定同步器**：
  - 启动时：加载配置的顶层 `type: "acp"` 绑定，确保 ACP 会话和绑定存在。
  - 配置变更时：安全应用变更。
- **切换模型**：
  - 不读取频道本地的 ACP 绑定回退，
  - 持久 ACP 绑定仅来自顶层 `bindings[].type="acp"` 条目。

## 分阶段交付

### 第 1 阶段：类型绑定模式基础

- 扩展配置 Schema 支持 `bindings[].type` 区分：
  - `route`，
  - `acp`，可选覆盖对象 `acp`（`mode`、`backend`、`cwd`、`label`）。
- 扩展代理 Schema，运行时描述符标记 ACP 原生代理（`agents.list[].runtime.type`）。
- 添加解析器/索引器分离以支持路由与 ACP 绑定。

### 第 2 阶段：运行时解析 + Discord/Telegram 等价

- 根据顶层 `type: "acp"` 条目解析持久 ACP 绑定，用于：
  - Discord 频道/线程，
  - Telegram 论坛主题（`chatId:topic:topicId` 规范化 ID）。
- 实现 Telegram 绑定适配器以及与 Discord 等价的入站绑定会话覆盖。
- 本阶段不包含 Telegram 直接消息/私聊主题变体。

### 第 3 阶段：命令等价与重置

- 对绑定的 Telegram/Discord 会话，统一 `/acp`、`/new`、`/reset` 和 `/focus` 行为。
- 确保绑定在重置流程中按配置保持有效。

### 第 4 阶段：强化

- 改进诊断 (`/acp status`、启动同步日志)。
- 冲突处理与健康检查。

## 规章与策略

- 精确遵守现有的 ACP 启用与沙盒限制。
- 保持明确的账号范围 (`accountId`) 以避免跨账号干扰。
- 对模糊路由失败采取封闭原则。
- 保持各频道中提及/访问策略的显式配置。

## 测试计划

- 单元测试：
  - 会话 ID 规范化（特别是 Telegram 主题 ID），
  - 同步器的创建/更新/删除路径，
  - `/acp bind --persist` 和解绑流程。
- 集成测试：
  - 入站 Telegram 主题 -> 持久 ACP 会话解析，
  - 入站 Discord 频道/线程 -> 持久绑定优先级。
- 回归测试：
  - 临时绑定继续正常工作，
  - 无绑定的频道/主题保持当前路由行为。

## 未决问题

- Telegram 主题中 `/acp spawn --thread auto` 是否默认等同于 `here`？
- 持久绑定的会话中是否总是绕过提及门控，还是需要显式配置 `requireMention=false`？
- `/focus` 是否应添加 `--persist` 作为 `/acp bind --persist` 的别名？

## 推出计划

- 以对话为单位选择性启用（存在 `bindings[].type="acp"` 条目）。
- 从 Discord + Telegram 开始部署。
- 添加文档示例：
  - “每个代理一个频道/主题”
  - “同一代理多个频道/主题，但不同 `cwd`”
  - “团队命名模式（如 `codex-1`、`claude-repo-x`）”。
