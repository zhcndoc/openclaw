---
summary: "通过 Raft CLI 唤醒桥支持 Raft External Agent"
read_when:
  - 你想将 OpenClaw 连接到 Raft workspace
  - 你正在配置 Raft External Agent
  - 你正在调试 Raft 唤醒投递
title: "Raft"
sidebarTitle: "Raft"
---

Raft 支持通过本地 Raft CLI，将 OpenClaw agent 连接到 Raft External Agent。Raft 会向 Gateway 发送经过身份验证的唤醒提示。随后 agent 使用 Raft CLI 检查并发送消息。

## 安装

Raft 是一个官方外部插件。在 Gateway 主机上安装它：

```bash
openclaw plugins install @openclaw/raft
openclaw gateway restart
```

详情：[插件](/tools/plugin)

## 前置条件

- 一个带有 External Agent 的 Raft workspace。
- 已安装在与 OpenClaw Gateway 相同主机上的 Raft CLI。
- 一个已经登录并与该 External Agent 关联的 Raft CLI profile。

该插件不会存储 Raft 凭据。Raft CLI 会将该身份验证保存在自己的 profile 中。

## 配置

在配置中设置 profile：

```json5
{
  channels: {
    raft: {
      enabled: true,
      profile: "openclaw",
    },
  },
}
```

对于默认账户，你也可以在 Gateway 环境中设置 `RAFT_PROFILE`：

```bash
RAFT_PROFILE=openclaw
```

当一个 Gateway 连接多个 Raft External Agent 时，请使用命名账户：

```json5
{
  channels: {
    raft: {
      accounts: {
        support: {
          profile: "support-agent",
        },
        engineering: {
          profile: "engineering-agent",
        },
      },
    },
  },
}
```

交互式设置流程会记录相同的 profile：

```bash
openclaw channels setup raft
```

## 工作原理

当 Gateway 启动时，插件会：

1. 在临时端口上打开一个仅限回环的 HTTP 唤醒端点。
2. 使用该端点和一个每进程令牌启动 `raft --profile <profile> agent bridge`。
3. 仅接受来自本地 bridge 的已认证、无内容且带有重放身份的唤醒提示。
4. 要求提供 `eventId`、`attemptId`、`messageId`、`delivery_id`、`wake_id` 或 `id` 中的一个。
5. 按 bridge event id 对最近重试的唤醒投递去重，包括跨 Gateway 重启的情况。
6. 为当前 bridge 返回一个稳定的运行时会话，以及一个空的活动清空批次，供 Raft CLI 协议使用。
7. 为每个被接受的唤醒启动一个串行的 OpenClaw agent 回合。

该 bridge 负责 Raft 投递重试和重连。OpenClaw 回合只接收一个唤醒通知，而不是复制的 Raft 消息正文。它会使用 CLI 读取待处理消息并发送响应：

```bash
raft --profile openclaw message check
raft --profile openclaw message send
```

<Note>
Raft 不是普通的推送消息传输。OpenClaw 不会自动通过 bridge 将模型的最终文本发送回去，因此 agent 必须在处理唤醒后使用 Raft CLI。
</Note>

## 验证

检查 OpenClaw 是否能找到 CLI，并且是否配置了 profile：

```bash
openclaw channels status --probe
openclaw plugins inspect raft --runtime --json
```

然后向 Raft External Agent 发送一条消息。Gateway 日志应显示 Raft bridge 启动，随后出现一条入站唤醒。agent 应使用已配置的 Raft profile 检查其待处理消息。

## 故障排除

<AccordionGroup>
  <Accordion title="Raft CLI is missing">
    在 Gateway 主机上安装 Raft CLI，并使 `raft` 在该服务的 `PATH` 中可用。使用 `raft --help` 验证，然后重启 Gateway。
  </Accordion>
  <Accordion title="The bridge exits immediately">
    验证所配置的 profile 已登录，并且属于目标 Raft External Agent。直接运行 `raft --profile <profile> agent bridge` 以查看 CLI 诊断信息。
  </Accordion>
  <Accordion title="A wake arrives but no Raft response is sent">
    当 agent 没有调用 Raft CLI 时，这是预期行为。唤醒 bridge 不会传递消息正文，也不会自动发送最终回复。检查 agent 的工具策略，并确保它可以运行 `raft --profile <profile> message check` 和 `message send`。
  </Accordion>
</AccordionGroup>

## 参考资料

- [Raft](https://raft.build/)
- [Raft 文档](https://docs.raft.build/welcome/)
- [Hermes Raft 集成](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/raft)
