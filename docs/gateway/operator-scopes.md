---
summary: "Gateway 客户端的操作员角色、作用域和批准时检查"
read_when:
  - 调试缺失操作员作用域错误
  - 审查设备或节点配对批准
  - 添加或分类 Gateway RPC 方法
title: "操作员作用域"
---

操作员作用域会限制 Gateway 客户端在完成身份验证后可以执行的操作。  
它们是单一受信任的 Gateway 操作员域中的一种控制平面防护措施，  
而不是用于对抗性多租户隔离。若要在人员、团队或机器之间实现强隔离，  
请在不同的 OS 用户或主机下运行彼此独立的 Gateway。

相关内容：[安全](/gateway/security)、[Gateway 协议](/gateway/protocol)、
[Gateway 配对](/gateway/pairing)、[设备 CLI](/cli/devices)。

## 角色

每个 Gateway WebSocket 客户端都以一种角色连接：

- `operator`：控制平面客户端，例如 CLI、控制 UI、自动化，以及
  受信任的辅助进程。
- `node`：能力宿主（macOS、iOS、Android、无头），通过
  `node.invoke` 暴露命令。

Operator RPC 方法需要 `operator` 角色；来自 node 的方法
需要 `node` 角色。

## 作用域级别

| 作用域                   | 含义                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | 只读状态，列表、目录、日志、会话读取，以及其他不修改状态的调用。                                                                          |
| `operator.write`        | 会修改状态的操作：发送消息、调用工具、更新对话/语音设置、节点命令转发。也满足 `operator.read`。                |
| `operator.admin`        | 管理员访问权限。满足所有 `operator.*` 作用域。配置修改、更新、原生钩子、保留命名空间以及高风险审批都需要此权限。 |
| `operator.pairing`      | 设备和节点配对管理：列表、批准、拒绝、移除、轮换、撤销。                                                                            |
| `operator.approvals`    | 执行和插件审批 API。                                                                                                                                |
| `operator.talk.secrets` | 读取包含密钥的 Talk 配置。                                                                                                             |

未知的未来 `operator.*` 作用域除非调用方
已经持有 `operator.admin`，否则需要精确匹配。

## 方法作用域只是第一道关卡

每个 Gateway RPC 都有一个最小权限的方法作用域，用于决定请求是否能够到达其处理程序。随后，一些处理程序会基于被批准或被修改的具体对象应用更严格的检查：

- `device.pair.approve` 在具备 `operator.pairing` 时可达，但批准一个 operator 设备时，只能铸造或保留调用方已经持有的作用域。
- `node.pair.approve` 在具备 `operator.pairing` 时可达，然后会根据待批准节点声明的命令列表派生额外的批准作用域。
- `chat.send` 是一个写作用域方法，但 `/config set` 和 `/config unset` 聊天命令除了该作用域之外，还要求具备 `operator.admin`，不受调用方 chat-send 作用域的影响。

这样就允许低作用域的操作员执行低风险的配对操作，而不必把所有配对批准都变成仅管理员可用。

## 设备配对批准

设备配对记录是已批准角色和作用域的持久来源。
已经配对的设备不会在未被告知的情况下获得更广泛的访问权限：如果某次重新连接请求了更广泛的角色或更广泛的作用域，就会创建一个新的待升级请求。

批准设备请求：

- 不包含 operator 角色的请求不需要 operator 作用域批准。
- 请求非 operator 设备角色（例如 `node`）需要 `operator.admin`，即使 `device.pair.approve` 本身只需要 `operator.pairing`。
- 请求 `operator.read`、`operator.write`、`operator.approvals`、`operator.pairing` 或 `operator.talk.secrets` 需要调用者已经持有该作用域，或者持有 `operator.admin`。
- 请求 `operator.admin` 需要 `operator.admin`。
- 不包含显式作用域的修复请求可以继承现有 operator 令牌的作用域；如果该令牌具有 admin 作用域，批准仍然需要 `operator.admin`。

非管理员的共享密钥和可信代理会话只能在其自身声明的 operator 作用域内批准 operator-device 请求；即使这些会话在其他情况下可以使用 `operator.pairing`，批准非 operator 角色仍然仅限管理员。

对于已配对设备的令牌会话，管理操作默认仅限于自身作用域，除非调用者具有 `operator.admin`：非管理员调用者只能看到自己的配对条目，并且只能批准、拒绝、轮换、撤销或移除自己的设备条目。

## 节点配对批准

旧版 `node.pair.*` 方法使用由 Gateway 单独拥有的节点配对存储。
WS 节点则改用设备配对（`role: node`），但适用相同的批准术语。有关这两个存储之间的关系，请参见 [Gateway 配对](/gateway/pairing)。

`node.pair.approve` 会根据待处理请求的命令列表推导出额外所需的作用域：

| 声明的命令                                                                                                          | 所需作用域                            |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 无                                                                                                                   | `operator.pairing`                    |
| 普通节点命令                                                                                                         | `operator.pairing` + `operator.write` |
| `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`fs.listDir` 或 `system.execApprovals.get/set` | `operator.pairing` + `operator.admin` |

批准节点声明不会启用具有单独运行时允许列表门控的命令。例如，批准一个声明了
`computer.act` 的节点需要配对加写入作用域，但只会记录该表面。管理员或所有者仍然必须为
`computer.act` 重新武装。只要它保持
武装状态，通过具备写入作用域的 `node.invoke` 方法调用它时，每个操作都不需要 admin 作用域。

节点配对用于建立身份和信任；它不会替代节点自身的 `system.run` exec 批准策略。

## 共享网关令牌/密码认证

共享网关令牌/密码认证会被视为该 Gateway 的受信任操作员访问。OpenAI 兼容的 HTTP 接口、`/tools/invoke` 以及 HTTP session-history 端点，会为 shared-secret bearer auth 恢复完整的默认操作员作用域集，即使调用方发送了更窄的已声明作用域也是如此。

带有身份信息的模式，例如受信任代理认证或 private-ingress `none`，仍然可以遵循显式声明的作用域。若要实现真正的信任边界隔离，请使用独立的 Gateway。
