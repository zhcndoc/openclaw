---
summary: "外部应用、脚本、仪表板、CI 作业和 IDE 扩展的当前集成路径"
title: "面向外部应用的 Gateway 集成"
sidebarTitle: "外部应用"
read_when:
  - 你正在构建一个与 OpenClaw 通信的外部应用、脚本、仪表板、CI 作业或 IDE 扩展
  - 你正在 Gateway RPC 和 Plugin SDK 之间做选择
  - 你正在与 Gateway 的 agent 运行、会话、事件、审批、模型或工具集成
---

外部应用通过 Gateway 协议与 OpenClaw 通信：WebSocket
传输加上 RPC 方法。当脚本、仪表板、CI 作业、IDE
扩展或其他进程需要启动 agent 运行、流式接收事件、等待
结果、取消工作或检查 Gateway 资源时，请使用它。

<Warning>
  目前还没有公开的 npm 客户端包。在发布说明宣布已发布的包并且此页面包含安装说明之前，不要将 OpenClaw 客户端包名称添加为应用依赖项。
</Warning>

<Note>
  本页适用于运行在 OpenClaw 进程之外的代码。运行在 OpenClaw 内部的插件代码应改用文档化的 `openclaw/plugin-sdk/*` 子路径。
</Note>

## 当前可用内容

| 表面                                   | 状态  | 适用场景                                                                                      |
| -------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| [Gateway protocol](/gateway/protocol)   | 已就绪 | WebSocket 传输、连接握手、认证范围、协议版本控制和事件。                                         |
| [Gateway RPC reference](/reference/rpc) | 已就绪 | 当前面向 agents、sessions、tasks、models、tools、artifacts 和 approvals 的 Gateway 方法。 |
| [`openclaw agent`](/cli/agent)         | 已就绪 | 当通过 shell 调用 CLI 已足够时，用于一次性脚本集成。                                             |
| [`openclaw message`](/cli/message)     | 已就绪 | 从脚本发送消息或通道操作。                                                                       |

内部正在推进一个未来的客户端库包，但它目前还不是公开的安装入口。请将其视为预览实现细节，直到某个发布版本宣布了一个已发布、带版本号的包。

## 推荐路径

1. 运行或发现一个 Gateway。
2. 通过 [Gateway protocol](/gateway/protocol) 连接。
3. 调用 [Gateway RPC reference](/reference/rpc) 中记录的 RPC 方法。
4. 固定你所测试的 OpenClaw 版本。
5. 升级 OpenClaw 时重新检查 RPC 参考文档。

对于代理运行，请从 `agent` RPC 开始，并将其与 `agent.wait` 配对，以获取最终结果。对于持久会话状态，请使用 `sessions.*` 方法。对于 UI 集成，请订阅 Gateway 事件，并且只渲染你的应用能够理解的事件族。

## 应用代码 vs 插件代码

当代码运行在 OpenClaw 之外时，请使用 Gateway RPC：

- 启动或观察 agent 运行的 Node 脚本
- 调用 Gateway 的 CI 作业
- 仪表板和管理面板
- IDE 扩展
- 不需要成为通道插件的外部桥接
- 使用假或真实 Gateway 传输的集成测试

当代码运行在 OpenClaw 内部时，请使用 Plugin SDK：

- provider 插件
- channel 插件
- 工具或生命周期钩子
- agent harness 插件
- 受信任的运行时辅助工具

外部应用不应导入 `openclaw/plugin-sdk/*`；这些子路径是供 OpenClaw 加载的插件使用的。

## 相关内容

- [网关协议](/gateway/protocol)
- [网关 RPC 参考](/reference/rpc)
- [CLI 代理命令](/cli/agent)
- [CLI 消息命令](/cli/message)
- [代理循环](/concepts/agent-loop)
- [代理运行时](/concepts/agent-runtimes)
- [会话](/concepts/session)
- [后台任务](/automation/tasks)
- [ACP 代理](/tools/acp-agents)
- [插件 SDK 概览](/plugins/sdk-overview)
