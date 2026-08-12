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
| `operator.read`         | 只读状态、列表、目录、日志、会话读取、保留的审计和执行身份诊断，以及其他非变更调用。                       |
| `operator.write`        | 会产生变更的操作员操作：发送消息、调用工具、更新对话/语音设置、节点命令中继。同时满足 `operator.read`。                |
| `operator.admin`        | 管理员访问权限。满足所有 `operator.*` 作用域。配置变更、更新、原生钩子、保留命名空间和高风险审批均需要此权限。 |
| `operator.pairing`      | 设备和节点配对管理：列出、批准、拒绝、移除、轮换、撤销。                                                                            |
| `operator.approvals`    | 执行和插件审批 API。                                                                                                                                |
| `operator.questions`    | 列出、读取、回答和解决交互式问题。                                                                                             |
| `operator.talk`         | 在不具备常规 Gateway 写入权限的情况下创建、控制和关闭 Talk 会话。`operator.write` 同样满足此作用域。                               |
| `operator.talk.secrets` | 读取包含机密信息的 Talk 配置。                                                                                                             |

未知的未来 `operator.*` 作用域除非调用方
已经持有 `operator.admin`，否则需要精确匹配。

## 身份范围授权

`gateway.auth.identityScopes` 向来自 trusted-proxy auth 或 Tailscale WhoIs 的已验证用户身份授予操作员范围：

```json5
{
  gateway: {
    auth: {
      identityScopes: {
        "admin@example.com": ["operator.admin"],
        "operator@example.com": ["operator.read", "operator.write"],
      },
    },
  },
}
```

键是已验证的代理身份或 Tailscale WhoIs 登录名。电子邮件键不区分大小写；非电子邮件身份必须完全匹配。配置验证会拒绝上述固定集合之外的范围名称。

连接权限按以下顺序解析：

1. 对于 trusted-proxy Control UI 连接，`x-openclaw-scopes` 首先限制设备注册或升级请求。随后，设备授权建立持久范围；无设备会话不会贡献自行声明的范围。
2. OpenClaw 将匹配的服务器端身份授权与这些范围合并。
3. OpenClaw 将 `x-openclaw-scopes` 应用于最终合并结果，作为会话范围上限。缺少标头表示不设上限；存在但为空的标头表示没有范围。

该结果同时用于 `hello.auth.scopes` 和 Gateway 方法授权。身份授权仅限于会话：不会创建或修改配对记录，也不会请求设备范围升级。Token、密码和无身份验证连接不携带已验证身份，因此不会获得授权。

## 方法作用域只是第一道关卡

每个网关 RPC 都有一个最小权限方法作用域，用于决定请求是否会到达其处理程序。参数感知的方法会在分发前派生该作用域，因此授权失败会返回一个统一的结构化响应：

- `agent` 在普通轮次中需要 `operator.write`，在 `/new` 或 `/reset` 会话生命周期命令中需要 `operator.admin`。
- `node.invoke` 在普通中继命令中需要 `operator.write`，在 `browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 和
  `terminal.upload` 中需要 `operator.admin`。
- `talk.config` 需要 `operator.read`；`includeSecrets: true` 还需要 `operator.talk.secrets`。
- `talk.client.*`、`talk.session.*`、`talk.speak` 和 `talk.mode` 需要 `operator.talk`（或兼容的更宽泛作用域 `operator.write`）。
- `sessions.patch` 对会话组织字段和按会话设置的 `model` 覆盖需要 `operator.write`。
  其他运行时覆盖项，包括思考、快速、详细、跟踪和推理级别，都需要 `operator.admin`。
  将所选模型持久化为配置的代理默认模型同样仅限管理员。

一些处理程序随后会根据正在批准或修改的具体对象应用更严格的检查：

- `device.pair.approve` 在具备 `operator.pairing` 时可达，但批准一个 operator 设备时，只能铸造或保留调用方已经持有的作用域。
- `node.pair.approve` 在具备 `operator.pairing` 时可达，然后会根据待批准节点声明的命令列表派生额外的批准作用域。
- `chat.send` 是一个写作用域方法，但 `/config set` 和 `/config unset` 聊天命令除了该作用域之外，还要求具备 `operator.admin`，不受调用方 chat-send 作用域的影响。

这样就允许低作用域的操作员执行低风险的配对操作，而不必把所有配对批准都变成仅管理员可用。

会话修改 RPC 根据其协商得到的操作员作用域进行授权，与连接客户端的 `client.id` 或 `client.mode` 无关。客户端身份仍可能影响连接和设备身份验证策略，但既不会授予也不会移除会话修改权限。

`audit.run.inspect` 特意使用 `operator.read`。网关操作员域中拥有该作用域的每个客户端都可能接收到保留的执行身份上下文，包括经过限制的假名化引用和已对机密信息进行删减的显示标签。`operator.read` 不是按用户划分的隐私边界，也不是面向恶意多租户环境的隐私边界。必须将这些数据彼此隔离的操作员需要使用独立的网关信任域。

## 设备配对批准

设备配对记录是已批准角色和作用域的持久来源。
已经配对的设备不会在未被告知的情况下获得更广泛的访问权限：如果某次重新连接请求了更广泛的角色或更广泛的作用域，就会创建一个新的待升级请求。

明确的例外是由 `openclaw dashboard` 或图形化引导直接在 Gateway 主机上签发的、具备管理员能力的控制 UI 所有者配置文件。其短期、一次性的引导凭据只有在绑定到同一个已签名的浏览器密钥对时，才能为新的浏览器批准准确的封闭作用域集合，或升级现有限制凭据。通用控制 UI 和 Telegram 交接、移动端设置配置文件、共享凭据、本地性以及由调用者选择的作用域均不享有此例外。

批准设备请求：

- 不包含 operator 角色的请求不需要批准 operator 作用域。
- 非 operator 设备角色（例如 `node`）的请求需要
  `operator.admin`，即使 `device.pair.approve` 本身只需要
  `operator.pairing`。
- 对 `operator.read`、`operator.write`、`operator.approvals`、
  `operator.questions`、`operator.pairing`、`operator.talk` 或
  `operator.talk.secrets` 的请求要求调用者已经拥有相应作用域，或拥有
  `operator.admin`。
- 对 `operator.admin` 的请求需要 `operator.admin`。
- 没有显式作用域的修复请求可以继承现有 operator 令牌的作用域；如果该令牌具有管理员作用域，批准仍然需要 `operator.admin`。

非管理员的共享密钥和可信代理会话只能在其自身声明的 operator 作用域内批准 operator-device 请求；即使这些会话在其他情况下可以使用 `operator.pairing`，批准非 operator 角色仍然仅限管理员。

对于已配对设备的令牌会话，管理操作默认仅限于自身作用域，除非调用者具有 `operator.admin`：非管理员调用者只能看到自己的配对条目，并且只能批准、拒绝、轮换、撤销或移除自己的设备条目。

## 节点配对批准

旧版 `node.pair.*` 方法使用由 Gateway 单独拥有的节点配对存储。
WS 节点则改用设备配对（`role: node`），但适用相同的批准术语。有关这两个存储之间的关系，请参见 [Gateway 配对](/gateway/pairing)。

`node.pair.approve` 会根据待处理请求的命令列表推导出额外所需的作用域：

| 声明的命令                                                                                                                                     | 所需作用域                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 无                                                                                                                                              | `operator.pairing`                    |
| 普通节点命令                                                                                                                                    | `operator.pairing` + `operator.write` |
| `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 或 `system.execApprovals.get/set` | `operator.pairing` + `operator.admin` |

批准节点声明会记录其命令接口。对于 `computer.act`，
节点只有在本地启用计算机控制后才会公布该接口；配对更新获批准后，通过 `node.invoke` 调用它时，每个操作都需要写入作用域，但不需要管理员作用域。被归类为危险或高度涉及隐私的命令，除了配对之外，仍需要持久的
`gateway.nodes.commands.allow` 条目。

节点配对用于建立身份和信任；它不会替代节点自身的 `system.run` exec 批准策略。

## 共享网关令牌/密码认证

共享网关令牌/密码认证会被视为该 Gateway 的受信任操作员访问。OpenAI 兼容的 HTTP 接口、`/tools/invoke` 以及 HTTP session-history 端点，会为 shared-secret bearer auth 恢复完整的默认操作员作用域集，即使调用方发送了更窄的已声明作用域也是如此。

带有身份信息的模式，例如受信代理认证或 private-ingress `none`，仍然可以遵循显式声明的作用域。若要实现真正的信任边界隔离，请使用独立的 Gateway。
