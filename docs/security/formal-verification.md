---
summary: "OpenClaw 最高风险路径的机器检查安全模型。"
title: "形式化验证（安全模型）"
read_when:
  - "审阅形式化安全模型的保证或限制"
  - "复现或更新 TLA+/TLC 安全模型检查"
permalink: /security/formal-verification/
---

OpenClaw 的正式安全模型（今天的 TLA+/TLC）涵盖了特定的最高风险路径：授权、会话隔离、工具门控和错误配置安全。对于每条路径，模型都会给出一个经过机器检查的论据，表明它在明确规定的假设下执行其预期策略。

> 注：某些较旧的链接可能仍指向之前的项目名称。

## <a id="what-this-is"></a> 这是什么

一个可执行、由攻击者驱动的安全回归测试套件：

- 每一条声明都带有一个可在有限状态空间上运行的模型检查。
- 许多声明都配有一个成对的负向模型，它会为现实中的某类漏洞生成反例轨迹。

这**不是**对 OpenClaw 在所有方面都安全的证明，也不会验证完整的 TypeScript 实现。

## <a id="where-the-models-live"></a> 模型存放位置

模型保存在一个单独的仓库中：`vignesh07/openclaw-formal-models`。

<Note>
该仓库目前无法访问（截至撰写本文时，GitHub 返回“Repository not found”）。如果对你来说它仍然有问题，请先在 OpenClaw 维护者频道中询问当前的位置，再假定这些模型已经被移除。
</Note>

## <a id="caveats"></a> 注意事项

- 这些是模型，不是完整的 TypeScript 实现——模型与代码之间可能存在偏差。
- 结果受 TLC 探索的状态空间限制。绿色并不意味着在所建模的假设和边界之外也具备安全性。
- 某些声明依赖于明确的环境假设（例如，正确的部署和正确的配置输入）。

## <a id="reproducing-results"></a> 复现结果

在先前记录的模型仓库无法公开访问时，复现说明不可用。在尝试下面的目标之前，请在 OpenClaw 维护者频道中询问经过验证的当前位置。

目前还没有 CI 集成回此存储库中。未来的迭代可以添加具有公共工件（例如反例跟踪和运行日志）的 CI-run 模型。它还可以添加托管的“运行此模型”工作流程以进行小型有界检查。

## <a id="claims-and-targets"></a> 主张与目标

### <a id="gateway-exposure-and-open-gateway-misconfiguration"></a> 网关暴露与开放网关配置错误

**声明：**在没有身份验证的情况下超越环回绑定可以使远程妥协成为可能并增加曝光。根据模型的假设，token/password 会阻止未经身份验证的攻击者。

| 结果         | 目标                                                          |
| -------------- | ---------------------------------------------------------------- |
| 绿色          | `make gateway-exposure-v2`, `make gateway-exposure-v2-protected` |
| 红色（预期） | `make gateway-exposure-v2-negative`                              |

另见模型仓库中的 `docs/gateway-exposure-matrix.md`。

### <a id="node-exec-pipeline-(highest-risk-capability)"></a><a id="node-exec-pipeline-highest-risk-capability"></a> Node 执行管道（最高风险能力）

**Claim：** `exec host=node` 需要 （a） 节点命令白名单加上声明的命令，以及 （b） 配置时的实时批准。在模型中，批准被标记化以防止重播。

| 结果         | 目标                                                         |
| -------------- | --------------------------------------------------------------- |
| 绿色          | `make nodes-pipeline`, `make approvals-token`                   |
| 红色（预期） | `make nodes-pipeline-negative`, `make approvals-token-negative` |

### <a id="pairing-store-(dm-gating)"></a><a id="pairing-store-dm-gating"></a> 配对存储（DM 门控）

**声明：** 配对请求会遵守 TTL 和待处理请求上限。

| 结果         | 目标                                              |
| -------------- | ---------------------------------------------------- |
| 绿色          | `make pairing`, `make pairing-cap`                   |
| 红色（预期） | `make pairing-negative`, `make pairing-cap-negative` |

### <a id="ingress-gating-(mentions-and-control-command-bypass)"></a><a id="ingress-gating-mentions-and-control-command-bypass"></a> 入口门控（提及与控制命令绕过）

**主张：** 在需要提及的群组上下文中，未经授权的控制命令不能绕过提及门控。

| 结果         | 目标                        |
| -------------- | ------------------------------ |
| 绿色          | `make ingress-gating`          |
| 红色（预期） | `make ingress-gating-negative` |

### <a id="routing-and-session-key-isolation"></a> 路由与会话密钥隔离

**主张：** 来自不同对端的私信不会合并到同一会话中，除非显式关联或进行了配置。

| 结果         | 目标                           |
| -------------- | --------------------------------- |
| 绿色          | `make routing-isolation`          |
| 红色（预期） | `make routing-isolation-negative` |

## <a id="v1%2B%2B-models%3A-concurrency%2C-retries%2C-trace-correctness"></a><a id="v1++-models-concurrency-retries-trace-correctness"></a> v1++ 模型：并发、重试、追踪正确性

围绕真实世界故障模式进一步收紧保真度的后续模型：非原子更新、重试，以及消息扇出。

<a id="pairing-store-concurrency-and-idempotency" />

### <a id="pairing-store-concurrency-and-duplicate-prevention"></a> 配对存储并发和防止重复

**Claim：** 配对存储强制执行 `MaxPending` 并防止重复，即使请求重叠 - 先检查后写入必须是 atomic/locked，并且刷新不得创建重复。具体来说：一个通道的并发请求不能超过 `MaxPending`，并且同一 `(channel, sender)` 的重复 requests/refreshes 不会创建重复的实时挂起行。

| 结果         | 目标                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 绿色          | `make pairing-race`（atomic/locked 帽检查）、`make pairing-idempotency`、`make pairing-refresh`、`make pairing-refresh-race`                                              |
| 红色（预期） | `make pairing-race-negative`（非原子 begin/commit 上限竞争）、`make pairing-idempotency-negative`、`make pairing-refresh-negative`、`make pairing-refresh-race-negative` |

<a id="ingress-trace-correlation-and-idempotency" />

### <a id="ingress-trace-correlation-and-duplicate-prevention"></a> Ingress 痕迹关联和重复预防

**声明：** 摄取保留了扇出之间的跟踪相关性，并且不会处理提供程序重试两次。当一个外部事件变成多个内部消息时，每个部分都保持相同的 trace/event 标识。如果提供程序事件 ID 丢失，重复数据删除会回退到安全密钥（例如跟踪 ID）以避免丢失不同的事件。

| 结果         | 目标                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 绿色          | `make ingress-trace`, `make ingress-trace2`, `make ingress-idempotency`, `make ingress-dedupe-fallback`                                     |
| 红色（预期） | `make ingress-trace-negative`, `make ingress-trace2-negative`, `make ingress-idempotency-negative`, `make ingress-dedupe-fallback-negative` |

### <a id="routing-dmscope-precedence-and-identitylinks"></a> 路由 dmScope 优先级与 identityLinks

**Claim：** `dmScope` 优先级和标识链接遵循固定规则。默认的 `main` 范围在单个所有者的 DM 之间共享一个滚动会话（个人代理默认值）。任何配置的隔离范围（`per-peer`、`per-channel-peer`、`per-account-channel-peer`）都会使 DM 会话严格分离。特定于通道的 `dmScope` 会覆盖全局默认值。 `identityLinks` 仅在显式链接组内折叠会话，而不会在不相关的对等方之间折叠会话。多用户收件箱应选择进入隔离范围（运行时安全审核在检测到多用户 DM 流量时建议这样做）。

| 结果         | 目标                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| 绿色          | `make routing-precedence`, `make routing-identitylinks`                   |
| 红色（预期） | `make routing-precedence-negative`, `make routing-identitylinks-negative` |

## <a id="related"></a> 相关内容

- [威胁模型](/security/THREAT-MODEL-ATLAS)
- [为威胁模型做贡献](/security/CONTRIBUTING-THREAT-MODEL)
- [事件响应](/security/incident-response)
