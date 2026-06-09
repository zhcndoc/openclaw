---
summary: "Gateway 客户端的操作员角色、作用域和批准时检查"
read_when:
  - 调试缺失操作员作用域错误
  - 审查设备或节点配对批准
  - 添加或分类 Gateway RPC 方法
title: "操作员作用域"
---

操作员作用域定义了 Gateway 客户端在完成身份验证后可以执行的操作。
它们是在单个受信任的 Gateway 操作员域内部的控制平面护栏，
而不是面向敌对多租户场景的隔离机制。如果你需要在人员、团队或机器之间实现强隔离，
请在不同的操作系统用户或主机下运行独立的 Gateway。

相关内容：[安全](/gateway/security)、[Gateway 协议](/gateway/protocol)、
[Gateway 配对](/gateway/pairing)、[设备 CLI](/cli/devices)。

## 角色

Gateway WebSocket 客户端以一种角色连接：

- `operator`：控制平面客户端，例如 CLI、控制 UI、自动化程序，以及
  受信任的辅助进程。
- `node`：能力宿主，例如 macOS、iOS、Android 或无头节点，
  通过 `node.invoke` 暴露命令。

操作员 RPC 方法要求 `operator` 角色。源自节点的方法
要求 `node` 角色。

## 作用域级别

| Scope                   | Meaning                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | 只读状态、列表、目录、日志、会话读取，以及其他不修改状态的控制平面调用。                                                                                                               |
| `operator.write`        | 常规的会修改状态的操作员操作，例如发送消息、调用工具、更新 talk/voice 设置，以及节点命令中继。同时也满足 `operator.read`。                                                             |
| `operator.admin`        | 管理级控制平面访问。满足所有 `operator.*` 作用域。配置修改、更新、本地钩子、敏感保留命名空间和高风险批准都需要它。                                                                   |
| `operator.pairing`      | 设备和节点配对管理，包括列出、批准、拒绝、移除、轮换和撤销配对记录或设备令牌。                                                                                                         |
| `operator.approvals`    | Exec 和插件批准 API。                                                                                                                                                                  |
| `operator.talk.secrets` | 读取包含密钥的 Talk 配置。                                                                                                                                                              |

未知的未来 `operator.*` 作用域需要精确匹配，除非调用方拥有
`operator.admin`。

## 方法作用域只是第一道关卡

每个 Gateway RPC 都有一个最小权限的方法作用域。该方法作用域决定了
请求是否可以到达处理器。随后，一些处理器会根据被批准或被修改对象的具体内容，
应用更严格的批准时检查。

示例：

- `device.pair.approve` 可通过 `operator.pairing` 访问，但批准一个
  操作员设备时，只能签发或保留调用方已拥有的作用域。
- `node.pair.approve` 可通过 `operator.pairing` 访问，然后会根据
  待处理节点命令列表推导出额外的批准作用域。
- `chat.send` 通常是一个 write 作用域方法，但持久化的 `/config set`
  和 `/config unset` 在命令级别需要 `operator.admin`。

这使得低作用域的操作员可以执行低风险的配对操作，而不必把
所有配对批准都设为仅管理员可用。

## 设备配对批准

设备配对记录是已批准角色和作用域的持久来源。
已配对设备不会在无提示的情况下获得更广泛的访问权限：如果重连时请求了更高的角色或更宽的作用域，
将会创建一个新的待处理升级请求。

批准设备请求时：

- A request with no operator role does not need operator token scope approval.
- A request for a non-operator device role, such as `node`, requires
  `operator.admin`, even when `device.pair.approve` is reachable with
  `operator.pairing`.
- A request for `operator.read`, `operator.write`, `operator.approvals`,
  `operator.pairing`, or `operator.talk.secrets` requires the caller to hold
  those scopes, or `operator.admin`.
- A request for `operator.admin` requires `operator.admin`.
- A repair request with no explicit scopes can inherit the existing operator
  token scopes. If that existing token is admin-scoped, approval still requires
  `operator.admin`.

Non-admin shared-secret and trusted-proxy sessions can approve operator-device
requests only inside their own declared operator scopes. Approving non-operator
roles is admin-only even when those sessions can otherwise use
`operator.pairing`.

For paired-device token sessions, management is also self-scoped unless the
caller has `operator.admin`: non-admin callers see only their own pairing
entries, can approve or reject only their own pending request, and can rotate,
revoke, or remove only their own device entry.

## 节点配对批准

旧版 `node.pair.*` 使用单独的、由 Gateway 拥有的节点配对存储。WS 节点
使用 `role: node` 的设备配对，但同样的批准级别术语
仍然适用。

`node.pair.approve` 使用待处理请求的命令列表来推导额外的
所需作用域：

- 无命令请求：`operator.pairing`
- 非 exec 节点命令：`operator.pairing` + `operator.write`
- `system.run`、`system.run.prepare` 或 `system.which`：
  `operator.pairing` + `operator.admin`

节点配对建立的是身份和信任。它不会替代节点自身的
`system.run` exec 批准策略。

## 共享密钥认证

共享 Gateway 令牌/密码认证会被视为该 Gateway 的受信任操作员访问。OpenAI 兼容的 HTTP 表面、`/tools/invoke` 和 HTTP 会话历史端点会为共享密钥 bearer 认证恢复正常的完整操作员默认作用域集，即使调用方发送了更窄的声明作用域也是如此。

带有身份信息的模式，例如受信任代理认证或 private-ingress `none`，
仍然可以遵循显式声明的作用域。若要实现真正的信任边界隔离，请使用独立的 Gateway。
