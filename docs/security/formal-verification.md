---
title: 形式验证（安全模型）
summary: OpenClaw 最高风险路径的机器校验安全模型。
read_when:
  - 审查正式安全模型保证或限制时
  - 复现或更新 TLA+/TLC 安全模型检查时
permalink: /security/formal-verification/
---

# 形式验证（安全模型）

本页跟踪 OpenClaw 的**正式安全模型**（当前为 TLA+/TLC；需要时可扩展）。

> 注意：一些较旧的链接可能指向之前的项目名称。

**目标（北极星）：** 在明确假设下，提供机器校验的论证，证明 OpenClaw 强制执行其预期的安全策略（授权、会话隔离、工具门控和配置错误安全性）。

**现状（今天）：** 一个可执行的、攻击者驱动的**安全回归测试套件**：

- 每个声明都包含一个可运行的有限状态空间模型检查。
- 许多声明配有相应的**负面模型**，能针对现实的漏洞类别生成反例执行轨迹。

**目前还不是：** “OpenClaw 在各方面均安全”的证明，或完整 TypeScript 实现正确性的证明。

## 模型所在位置

模型保存在单独的仓库：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，而非完整的 TypeScript 实现。模型与代码之间可能存在偏差。
- 结果受限于 TLC 探索的状态空间；“绿色”状态并不代表超出模型假设和限制范围的安全。
- 一些声明依赖显式的环境假设（如正确部署、正确配置输入）。

## 复现结果

当前，结果通过本地克隆模型仓库并运行 TLC 来复现（见下文）。未来迭代可能提供：

- CI 运行的模型及公共工件（反例轨迹、运行日志）
- 用于小规模、有界检查的托管“运行此模型”工作流

入门：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 仓库附带了固定版本的 `tla2tools.jar`（TLA+ 工具）并提供了 `bin/tlc` 和 Make 目标。

make <target>
```

### 网关暴露和开放网关配置错误

**声明：** 在无授权的情况下绑定到非回环地址可能导致远程被攻击的可能性增加／暴露度增加；令牌/密码阻止未经授权的攻击者（基于模型假设）。

- 绿色运行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另见模型仓库中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run 管道（最高风险能力）

**声明：** `nodes.run` 需要 (a) 节点命令允许列表加声明的命令，以及 (b) 配置时的实时审批；审批被令牌化以防止重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**声明：** 配对请求遵循 TTL 和待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口门控（提及 + 控制命令绕过）

**声明：** 在要求提及的人群上下文中，未经授权的“控制命令”无法绕过提及门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由/会话密钥隔离

**声明：** 来自不同对等方的 DM 除非明确链接/配置，否则不会合并到同一个会话。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`

## v1++：额外有界模型（并发，重试，轨迹正确性）

这些是后续模型，加强了对真实世界故障模式（非原子更新、重试和消息扇出）的真实性。

### 配对存储并发 / 幂等性

**声明：** 配对存储应在交错情况下强制实施 `MaxPending` 和幂等性（即，“先检查后写入”必须是原子/加锁的；刷新不应创建重复项）。

含义：

- 并发请求情况下，频道的待处理数量不能超过 `MaxPending`。
- 对相同 `(channel, sender)` 的重复请求/刷新不应创建重复的活动待处理行。

- 绿色运行：
  - `make pairing-race`（原子/加锁的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative`（非原子开始/提交上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口轨迹关联 / 幂等性

**声明：** 入口应保持轨迹关联，跨扇出一致，并在提供方重试时保持幂等。

含义：

- 当一个外部事件转换成多个内部消息时，每个部分保持相同轨迹/事件标识。
- 重试不会导致重复处理。
- 如果缺失提供方事件 ID，去重机制退回使用安全键（例如轨迹 ID）避免丢弃不同事件。

- 绿色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红色（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**声明：** 路由默认保持 DM 会话隔离，仅在明确配置时合并会话（频道优先级 + 身份链接）。

含义：

- 频道特定的 dmScope 覆盖必须胜过全局默认。
- identityLinks 只应在明确链接组内合并，不应跨无关对等方。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
