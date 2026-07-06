---
summary: OpenClaw 最高风险路径的机器检查安全模型。
title: 形式化验证（安全模型）
read_when:
  - 审阅形式化安全模型的保证或限制
  - 复现或更新 TLA+/TLC 安全模型检查
permalink: /security/formal-verification/
---

OpenClaw 的形式化安全模型（目前为 TLA+/TLC）提供了一个机器检查的论证：在明确陈述的假设下，特定的最高风险路径——授权、会话隔离、工具门控以及错误配置安全性——会强制执行其预期策略。

> 注：某些较旧的链接可能仍指向之前的项目名称。

## 这是什么

一个可执行、由攻击者驱动的安全回归测试套件：

- 每一条声明都带有一个可在有限状态空间上运行的模型检查。
- 许多声明都配有一个成对的负向模型，它会为现实中的某类漏洞生成反例轨迹。

这**不是**对 OpenClaw 在所有方面都安全的证明，也不会验证完整的 TypeScript 实现。

## 模型存放位置

这些模型维护在一个单独的仓库中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

<Note>
该仓库目前无法访问（截至撰写本文时，GitHub 返回“Repository not found”）。如果对你来说它仍然有问题，请先在 OpenClaw 维护者频道中询问当前的位置，再假定这些模型已经被移除。
</Note>

## 注意事项

- 这些是模型，不是完整的 TypeScript 实现——模型与代码之间可能存在偏差。
- 结果受 TLC 探索的状态空间限制。绿色并不意味着在所建模的假设和边界之外也具备安全性。
- 某些声明依赖于明确的环境假设（例如，正确的部署和正确的配置输入）。

## 复现结果

克隆 models 仓库并运行 TLC：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 该仓库内置了一个固定版本的 tla2tools.jar，并提供 bin/tlc 以及 Make 目标。

make <target>
```

目前这个仓库还没有集成 CI；未来的迭代可以添加在 CI 中运行的模型，并提供公开产物（反例轨迹、运行日志），或者为小规模有界检查提供一个托管的“运行此模型”工作流。

## 主张与目标

### 网关暴露与开放网关配置错误

**主张：** 在没有认证的情况下，绑定到回环地址之外可能导致远程被攻陷，并增加暴露面；根据模型假设，令牌/密码可以阻止未认证攻击者。

| 结果           | 目标                                                             |
| -------------- | ---------------------------------------------------------------- |
| 绿色          | `make gateway-exposure-v2`, `make gateway-exposure-v2-protected` |
| 红色（预期）  | `make gateway-exposure-v2-negative`                              |

另见模型仓库中的 `docs/gateway-exposure-matrix.md`。

### 节点 exec 管道（最高风险能力）

**主张：** `exec host=node` 需要：(a) 节点命令白名单以及已声明的命令，且 (b) 在配置了审批时需要实时审批；在模型中，审批使用令牌化以防止重放。

| 结果           | 目标                                                        |
| -------------- | --------------------------------------------------------------- |
| 绿色          | `make nodes-pipeline`, `make approvals-token`                   |
| 红色（预期）  | `make nodes-pipeline-negative`, `make approvals-token-negative` |

### 配对存储（DM 门控）

**声明：** 配对请求会遵守 TTL 和待处理请求上限。

| 结果           | 目标                                                 |
| -------------- | ---------------------------------------------------- |
| 绿色          | `make pairing`, `make pairing-cap`                   |
| 红色（预期）  | `make pairing-negative`, `make pairing-cap-negative` |

### 入口门控（提及与控制命令绕过）

**主张：** 在需要提及的群组上下文中，未经授权的控制命令不能绕过提及门控。

| 结果           | 目标                        |
| -------------- | ------------------------------ |
| 绿色          | `make ingress-gating`          |
| 红色（预期）  | `make ingress-gating-negative` |

### 路由与会话密钥隔离

**主张：** 来自不同对端的私信不会合并到同一会话中，除非显式关联或进行了配置。

| 结果           | 目标                           |
| -------------- | --------------------------------- |
| 绿色          | `make routing-isolation`          |
| 红色（预期）  | `make routing-isolation-negative` |

## v1++ 模型：并发、重试、追踪正确性

围绕真实世界故障模式进一步收紧保真度的后续模型：非原子更新、重试，以及消息扇出。

### 配对存储并发与幂等性

**声明：** 配对存储即使在交错执行下也能强制执行 `MaxPending` 和幂等性——检查再写入必须是原子/加锁的，刷新也不能创建重复项。具体来说：并发请求对某个通道的数量不能超过 `MaxPending`，并且对同一 `(channel, sender)` 的重复请求/刷新不会创建重复的存活待处理行。

| 结果           | 目标                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 绿色          | `make pairing-race`（原子/加锁的上限检查）、`make pairing-idempotency`、`make pairing-refresh`、`make pairing-refresh-race`                                              |
| 红色（预期） | `make pairing-race-negative`（非原子 begin/commit 上限竞争）、`make pairing-idempotency-negative`、`make pairing-refresh-negative`、`make pairing-refresh-race-negative` |

### 入口追踪关联与幂等性

**声明：** 当一个外部事件变成多个内部消息时，摄取过程会在扇出过程中保持追踪关联，并且在提供方重试下保持幂等性。每个部分都保持相同的追踪/事件标识；重试不会重复处理；如果缺少提供方事件 ID，则去重会回退到一个安全键（例如 trace ID），以避免丢弃不同事件。

| 结果           | 目标                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 绿色          | `make ingress-trace`、`make ingress-trace2`、`make ingress-idempotency`、`make ingress-dedupe-fallback`                                     |
| 红色（预期） | `make ingress-trace-negative`、`make ingress-trace2-negative`、`make ingress-idempotency-negative`、`make ingress-dedupe-fallback-negative` |

### 路由 dmScope 优先级与 identityLinks

**声明：** 路由默认保持 DM 会话隔离，并且只有在显式配置时，才会通过通道优先级和身份链接折叠会话。通道特定的 `dmScope` 覆盖优先于全局默认值；`identityLinks` 只会在显式链接的分组内折叠会话，不会跨越不相关的对端。

| 结果           | 目标                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| 绿色          | `make routing-precedence`、`make routing-identitylinks`                   |
| 红色（预期） | `make routing-precedence-negative`、`make routing-identitylinks-negative` |

## 相关内容

- [威胁模型](/security/THREAT-MODEL-ATLAS)
- [为威胁模型做贡献](/security/CONTRIBUTING-THREAT-MODEL)
- [事件响应](/security/incident-response)
