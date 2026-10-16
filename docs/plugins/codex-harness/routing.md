---
summary: "选择 OpenAI 路由选择 Codex 并围绕它们塑造部署"
read_when:
  - "您需要知道哪些模型引用选择了 Codex 运行时"
  - "您需要 Codex 来执行"
  - "您正在配置混合提供商队列"
title: "Codex 路由部署"
sidebarTitle: "路由和部署"
---

哪些有效路由选择 Codex 运行时，以及基于该策略构建的部署形状。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="routing-and-model-selection"></a> 路由和模型选择

当账户支持时，`openai/gpt-6-astra` 默认通过共享 OpenAI 提供程序策略进行 `medium` 推理工作。对于 OpenClaw- 托管轮次，已解决的工作量在 Codex `turn/start` 请求中发送，包括 `collaborationMode.settings.reasoning_effort`，因此本机线程使用与 Control UI 相同的默认值。明确的思维设置仍然获胜；为 `high` 配置的现有会话或代理保留在 `high`。附加有保留的本机设置的线程保留其本机工作。

将提供方引用和运行时策略分开：

- 使用`openai/gpt-*`进行标准OpenAI模型选择。单独的前缀永远不会选择 Codex。
- 当运行时未设置或设为 `auto` 时，只有完全匹配的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由，且未编写提供方请求覆盖，才可以隐式选择 Codex。有效的模型级快速模式和截止时间控制不计为已编写的请求参数。
- 不要在配置中使用旧版 Codex GPT 引用；运行 `openclaw doctor --fix` 以修复旧版引用和过时的会话路由固定。
- `agentRuntime.id: "codex"` 使 Codex 成为兼容路由所需的运行时。它不会使不兼容的有效路由变得兼容。
- 当有意为提供方或模型启用嵌入式 OpenClaw 运行时时，使用 `agentRuntime.id: "openclaw"`。
- `/codex ...` 用于从聊天中控制原生 Codex 应用服务器对话。
- ACP/acpx 是独立的外部运行器路径。仅当用户要求使用 ACP/acpx 或外部运行器适配器时才使用它。

| 用户意图                                                | 用途                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加当前聊天                                    | `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]`                    |
| 恢复现有 Codex 线程                            | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                               | `/codex threads [filter]`                                                                             |
| 读取或更新绑定线程的原生目标              | `/codex goal [status\|set <objective>\|pause\|resume\|block\|complete\|clear]`                        |
| 列出原生 Codex 插件                                  | `/codex plugins list`                                                                                 |
| 发现可用的原生 Codex 市场插件        | `/codex plugins available`                                                                            |
| 安装并授权一个原生 Codex 插件              | `/codex plugins install <plugin>@<marketplace>`                                                       |
| 启用或禁用已配置的原生 Codex 插件         | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| 将已存储的 Codex CLI 会话作为配对节点轮次恢复    | `/codex sessions --host <node> [filter]`，然后运行 `/codex resume <session-id> --host <node> --bind here` |
| 查看各计算机上的未归档 Codex 会话          | 启用 Codex 监督并打开 **Codex Sessions**                                                  |
| 更改绑定线程的模型、快速模式或权限 | `/codex model <model>`, `/codex fast [on\|off\|status]`, `/codex permissions [default\|yolo\|status]` |
| 压缩当前 Codex 会话                          | `/codex compact`                                                                                      |
| 停止或引导活动轮次                              | `/codex stop`, `/codex steer <text>`                                                                  |
| 解除当前绑定                                 | `/codex detach`（别名 `/codex unbind`）                                                               |
| 仅发送 Codex 反馈                                   | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                                     | ACP/acpx 会话命令，而不是 `/codex`                                                               |

| 使用场景                                        | 配置                                                                                                            | 验证                                  | 笔记                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| 具有本机 Codex 运行时的合格 OpenAI 路由 | 精确的官方 HTTPS Responses/ChatGPT 路由，无授权提供者请求覆盖，并启用了 `codex` 插件 | `/status` 显示 `Runtime: OpenAI Codex` | 有效的快速运行时控件不会取消此路径的资格    |
| 如果 Codex 不可用则停止执行          | provider 或 model 的 `agentRuntime.id: "codex"`                                                                         | 缺少harness导致转弯失败          | 编写的请求覆盖仍然可以使用声明的后备 |
| 通过 OpenClaw 直接 OpenAI API-key 流量  | 提供商或模型 `agentRuntime.id: "openclaw"` 和普通 OpenAI 身份验证                                               | `/status` 显示 OpenClaw 运行时        | 仅当 OpenClaw 有意时使用                      |
| 旧版配置                                   | 旧版 Codex GPT 引用                                                                                                | `openclaw doctor --fix` 会将其重写     | 不要以这种方式编写新配置                           |
| ACP/acpx Codex 适配器                          | ACP `sessions_spawn({ runtime: "acp" })`                                                                             | ACP task/session 状态                 | 与原生 Codex harness分离                         |

`agents.defaults.imageModel` 遵循相同的前缀拆分规则。正常的 OpenAI 路由请使用 `openai/gpt-*` ；只有当图像理解应通过受限的 Codex 应用服务器轮次运行时，才使用 `codex/gpt-*`。Doctor 会将旧版 Codex GPT 引用重写为 `openai/gpt-*`。

### <a id="operator-role-model-permissions"></a> 操作员角色模型权限

角色的 [ 模型策略 ](/gateway/operator-scopes#named-operator-roles) 适用于每个本机推理请求，包括重试、子轮流、普通评论、本机图像和搜索请求以及压缩。 OpenClaw 在转发之前会根据作品的原始权限和当前策略检查实际模型。已验证的目录到本机模型映射仍然有效。删除模型会取消受影响的推理，同时允许的工作继续进行。

重用本机子项不会永久附加其创建者的权限。在前一轮解决后，具有明确源属性的后轮使用其提交操作员的权限。当本机钩子集成处于活动状态时，将输入发送到活动回合需要相同的原始权限，包括本机执行可以在该回合中使用的后续请求。 Native Guardian 审查和配置的内存处理保留其现有的服务权限，并通过本机请求来源及其拥有的执行或配置的服务进行验证。

受限运行需要 OpenClaw- 拥有的本机推理路由。托管 stdio 连接可以通过公共 HTTPS 保留 HTTP 或 WebSocket 响应提供程序；已经拥有的本机绑定可以重用该路由。提供商投影共享连接的八条路由限制；多余的提供程序仍然无法用于受限的本机恢复，并且在达到容量后选择新路由需要新的托管本机连接。自定义提供程序需要显式的本机 `base_url`；查询字段使用本机 `query_params` 表。无主附件、本机本地模型提供程序、AWS-签名请求、系统代理配置文件、自定义本机证书文件以及无法同时保留上游路由和私有环回访问的代理设置无法建立此保证。 OpenClaw 在启动之前拒绝这些路径上的受限运行。没有模型策略的角色保留其现有的本机连接和可选挂钩行为。在不合格的操作符执行处于活动状态时引入模型策略会取消直接拥有的和其他明确绑定的工作，包括其不合格的子项。

当工作人员在没有模型策略的情况下运行并且合格的本机挂钩被禁用或不可用时，本机执行可以将接受的输入混合到现有轮次中，或将来自多个发送者的排队输入组合到新轮次中，而不保留唯一的发送者属性。在贡献发送者的授权结束或受到限制之后，先前接受的不再被唯一地归因的不受限制的输入可以在接收执行的有效权限下继续。仅匹配的本地根并不能证明唯一的归属。 OpenClaw 不会中断独立授权接收器的工作来猜测它消耗了哪个输入。

此限制并不免除新限制的工作或撤销直接或以其他方式明确约束的源。准确的归因需要合格的本机挂钩集成。访客访问需要明确的模型策略；其Codex运行需要合格的集成，因此其正常的限制流量不能进入此可选人员配置。

## <a id="deployment-patterns"></a> 部署模式

### <a id="basic-codex-deployment"></a> 基础 Codex 部署

使用 OpenAI 模型的快速启动配置，其有效的官方 HTTPS 路由有资格隐式选择 Codex：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
    },
  },
}
```

### <a id="mixed-provider-deployment"></a> 混合提供商部署

配置一个 Claude `main` agent，并添加一个命名的 Codex agent：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    ownership: "explicit",
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    entries: {
      main: {
        model: "anthropic/claude-opus-4-6",
      },
      codex: {
        name: "Codex",
        model: "openai/gpt-6-astra",
      },
    },
  },
}
```

该显式车队没有默认代理；目标`main` or `codex`通过一次会话，`--agent`，或绑定。这`main`代理使用其正常的提供者路径。这`codex`代理用途Codexapp-server何时生效OpenAI路线保持兼容；添加显式模型范围`agentRuntime.id: "codex"`什么时候Codex应该是必需的。

<a id="fail-closed-codex-deployment" />

### <a id="require-codex-for-deployment"></a> 部署需要Codex

当捆绑插件可用时，符合条件的确切官方 HTTPS OpenAI 路由可以解析为 Codex。为配置的要求添加显式运行时策略以使用 Codex：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

在强制使用 Codex 的情况下，如果插件被禁用、应用程序服务器太旧或无法启动，或者 route/auth 支持在没有声明后备的情况下被拒绝，则 OpenClaw 会提前失败。编写的请求覆盖可以改为使用 [ 选择时间 OpenClaw 回退 ](/concepts/agent-runtimes#runtime-selection) 来保留确切的请求。一旦Codex启动，其故障就不会通过OpenClaw重放。
