---
summary: OpenClaw 最高风险路径的机器验证安全模型。
title: 形式化验证（安全模型）
read_when:
  - 审阅形式化安全模型的保证或限制
  - 复现或更新 TLA+/TLC 安全模型检查
permalink: /security/formal-verification/
---

此页面跟踪 OpenClaw 的**形式化安全模型**（当前为 TLA+/TLC；如有需要还会增加更多）。

> 注：某些较旧的链接可能仍指向之前的项目名称。

**目标（北极星）：** 在明确假设下，提供一份机器验证的论证，证明 OpenClaw 会强制执行其
预期的安全策略（授权、会话隔离、工具门控和
错误配置安全性）。

**当前是什么：** 一个可执行、由攻击者驱动的**安全回归测试套件**：

- 每个声明都有一个可运行的模型检查，覆盖有限状态空间。
- 许多声明都有配对的**负向模型**，能够为现实中的某类 bug 生成反例轨迹。

**当前不是什么：** 不是“OpenClaw 在所有方面都安全”的证明，也不是完整 TypeScript 实现正确性的证明。

## 模型存放位置

这些模型维护在单独的仓库中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，不是完整的 TypeScript 实现。模型与代码之间可能存在偏差。
- 结果受 TLC 探索到的状态空间限制；“绿色”并不意味着在建模假设和边界之外也安全。
- 某些声明依赖明确的环境假设（例如，正确部署、正确的配置输入）。

## 复现结果

目前，复现方式是将模型仓库克隆到本地并运行 TLC（见下文）。未来的迭代可以提供：

- 带公开产物的 CI 运行模型（反例轨迹、运行日志）
- 一个托管的“运行此模型”工作流，用于小规模、有界检查

开始使用：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 该仓库内置了固定版本的 `tla2tools.jar`（TLA+ 工具），并提供 `bin/tlc` + Make 目标。

make <target>
```

### 网关暴露与开放网关错误配置

**声明：** 在没有认证的情况下绑定到回环地址之外，可能会导致远程入侵成为可能 / 增加暴露面；令牌/密码会阻止未经认证的攻击者（在模型假设下）。

- 绿色运行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另见：模型仓库中的 `docs/gateway-exposure-matrix.md`。

### Node exec 管道（最高风险能力）

**声明：** `exec host=node` 需要：(a) node 命令允许列表以及已声明的命令，并且 (b) 在已配置时需要实时审批；审批使用令牌化以防止重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**声明：** 配对请求会遵守 TTL 和待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口门控（mentions + control-command 绕过）

**声明：** 在需要 mention 的群组上下文中，未经授权的“control command”不能绕过 mention 门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由/会话密钥隔离

**声明：** 来自不同对端的 DM 不会合并到同一个会话中，除非显式链接/配置。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`

## v1++：额外的有界模型（并发、重试、轨迹正确性）

这些是后续模型，围绕真实世界的故障模式（非原子更新、重试和消息扇出）进一步提高保真度。

### 配对存储并发 / 幂等性

**声明：** 配对存储即使在交错执行下也应强制执行 `MaxPending` 和幂等性（即“先检查再写入”必须是原子的 / 加锁的；刷新不应创建重复项）。

其含义是：

- 在并发请求下，某个通道的 `MaxPending` 不能被超出。
- 针对同一个 `(channel, sender)` 的重复请求/刷新，不应创建重复的存活待处理行。

- 绿色运行：
  - `make pairing-race`（原子/加锁的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative`（非原子的 begin/commit 上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口轨迹关联 / 幂等性

**声明：** 摄取应在消息扇出过程中保持轨迹关联，并且在提供方重试下保持幂等。

其含义是：

- 当一个外部事件变成多个内部消息时，每一部分都保留相同的轨迹/事件标识。
- 重试不会导致重复处理。
- 如果提供方事件 ID 缺失，去重会回退到安全键（例如 trace ID），以避免丢弃不同事件。

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

**声明：** 路由必须默认保持 DM 会话隔离，并且只有在显式配置时才合并会话（通道优先级 + identity links）。

其含义是：

- 通道特定的 dmScope 覆盖必须优先于全局默认值。
- identityLinks 只应在显式链接的组内合并，不应跨不相关的对端。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

## 相关内容

- [威胁模型](/security/THREAT-MODEL-ATLAS)
- [参与威胁模型贡献](/security/CONTRIBUTING-THREAT-MODEL)
