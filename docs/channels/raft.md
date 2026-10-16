---
summary: "通过 Raft CLI 唤醒桥支持 Raft 外部代理"
read_when:
  - "你想将 OpenClaw 连接到 Raft workspace"
  - "你正在配置 Raft External Agent"
  - "你正在调试 Raft 唤醒投递"
title: "Raft"
sidebarTitle: "Raft"
---

Raft 通过本地 Raft CLI 将 OpenClaw 代理连接到 Raft 外部代理。 Raft 向网关发送经过身份验证的唤醒提示；然后，代理使用 Raft CLI 检查并发送消息。仅直接聊天（无群组）。

## <a id="install"></a> 安装

Raft 是一个官方外部插件。在 Gateway 主机上安装它：

```bash
openclaw plugins install @openclaw/raft
```

在继续之前检查 [ 申请结果](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="prerequisites"></a> 先决条件

- 一个带有外部代理的 Raft 工作区。
- Raft CLI 已安装在与 OpenClaw Gateway 相同的主机上，并且位于该服务的 `PATH` 中。
- 一个已登录并且已关联到该外部代理的 Raft CLI 配置文件。

该插件不会存储 Raft 凭据；Raft CLI 会在其自己的配置文件中保留该身份验证信息。

## <a id="configure"></a> 配置

在配置中设置配置文件：

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

对于默认帐户，您可以在网关环境中设置 `RAFT_PROFILE`：

```bash
RAFT_PROFILE=openclaw
```

当一个网关连接到多个 Raft 外部代理时，使用指定帐户：

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

交互式设置会记录相同的 profile：

```bash
openclaw channels add --channel raft
```

## <a id="how-it-works"></a> 工作原理

当 Gateway 启动时，插件会：

1. 在一个临时端口上打开仅限 loopback 的 HTTP 唤醒端点。
2. 使用该端点和一个按进程分配的 token 启动 `raft --profile <profile> agent bridge`。
3. 仅接受来自本地 bridge 的经过身份验证、无内容的唤醒提示，并带有重放标识。
4. 每个唤醒负载都必须包含 `eventId`、`attemptId`、`messageId`、`delivery_id`、`wake_id` 或 `id` 中的一个。
5. 通过 bridge 事件 id 对重试的唤醒投递进行去重，保留 24 小时，包括 Gateway 重启期间。
6. 为当前 bridge 返回一个稳定的运行时会话，并为 Raft CLI 协议返回一个空的活动排空批次。
7. 每次接受到唤醒时，启动一个序列化的 OpenClaw agent turn。

bridge 负责 Raft 投递重试和重新连接。OpenClaw turn 只接收唤醒通知，而不会接收复制过来的 Raft 消息正文。它使用 CLI 来读取待处理消息并发送响应：

```bash
raft --profile openclaw message check
raft --profile openclaw message send
```

<Note>
Raft 不是推送消息传输。OpenClaw 不会自动通过 bridge 将模型的最终文本发送回去，因此 agent 必须在处理唤醒后使用 Raft CLI。
</Note>

## <a id="verify"></a> 验证

检查 OpenClaw 是否能找到 CLI，并且是否已配置 profile：

```bash
openclaw channels status --probe
openclaw plugins inspect raft --runtime --json
```

然后向 Raft External Agent 发送一条消息。Gateway 日志应显示 Raft 桥接启动，随后出现一个入站唤醒。该代理应使用已配置的 Raft profile 来检查其待处理消息。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="raft-cli-is-missing" title="Raft CLI失踪了">
    在 Gateway 主机上安装 Raft CLI，并使 `raft` 在该服务的 `PATH` 中可用。使用 `raft --help` 验证，然后重启 Gateway。
  </Accordion>
  <Accordion id="the-bridge-exits-immediately" title="桥立即退出">
    验证所配置的 profile 已登录，并且属于目标 Raft External Agent。直接运行 `raft --profile <profile> agent bridge` 以查看 CLI 诊断信息。
  </Accordion>
  <Accordion id="a-wake-arrives-but-no-raft-response-is-sent" title="唤醒到达但未发送 Raft 响应">
    当代理不调用 Raft CLI 时，这是预期的。唤醒桥不携带消息体或自动最终回复。检查代理的工具策略并检查其是否可以运行`raft --profile <profile> message check`和`message send`。
  </Accordion>
</AccordionGroup>

## <a id="references"></a> 参考资料

- [筏](https://raft.build/)
- [Raft 文档](https://docs.raft.build/welcome/)
- [Hermes Raft 集成](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/raft)
