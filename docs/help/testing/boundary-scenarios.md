---
summary: "请求合同、带薪工作合同、恢复合同、违约合同和计量证明合同"
title: "行为证明场景"
read_when:
  - "您正在更改提供商请求、付费工作、恢复或默认设置"
  - "您正在进行缓存、计费或性能声明"
---

## <a id="scenario-contracts"></a> 场景合约

通过生产所有者使用固定外部 I/O 夹具进行集中集成测试。保留独立单位合同。应用[测试值门](https://github.com/openclaw/openclaw/blob/main/.agents/skills/test-audit/SKILL.md)和[证明策略](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)。

- 命名调用者可见的合约、可信回归和证明限制。使用独立的期望值和调用者的接口。当精确的字节、存储、调用计数和排序保护存储、计费、交付或协议合约时，它们就属于它们。
- 在垂直切片中工作：失败行为、连贯修复、通过证明。回归必须在原始缺陷上失败，而不是在夹具设置上失败；报告无法提供基线证明。绿色测试下的重构；在替换冗余测试之前检查不同的合同。
- 捕获最终序列化请求并在实际组装后解析路由：指令、tools/order、输入前缀、参数、缓存标识、端点和身份验证模式。热前缀重用共享一个制剂所有者；记录允许的差异。独立的摘要需要一份有意的合同。
- 保留付费提供商结果或从不请求它。在呼叫之前预检可预测的故障。区分未发送、不确定、已完成、持续；调和不确定性。恰好一次声明需要证明重试不能重复效果。注入相关故障并断言物理 requests/usage，包括拒绝的结果。本地处理错误切不可默默再买一个电话；保留有效结果而不绕过编辑、取消或授权。
- 通过其诊断消费者使用经过消毒的 reason/outcome. 证明恢复情况警告意外降级；预期恢复可以使用记录的结构化结果。保留重播决策、重建并执行下一个请求。涵盖相关的压缩、切换和并发编辑；暂时性错误不得成为永久性禁令。
- Exercise 通过执行的资格所有者默认影响受影响的路由、身份验证模式、功能和存储状态。涵盖支持和不支持的情况，而不是复制的功能表或预先计算的标志。
- 支持 cost/performance 声明，具有可比较的请求计数、input/cached/输出令牌和延迟；名称模型、路线和条件。实时缓存或计费索赔需要实时证据；标签估计。不相关的编辑不需要付费基准。

使用合成内容；确保凭证不被捕获。从变更后的合同中选择失败案例。许多私人控制表明所有权分散，不需要更多仅测试出口。

## <a id="secretref-registry-regression-contract"></a> SecretRef 注册表回归合约

扩展 SecretRef 注册表覆盖范围时，请保留以下创作要求：

- `src/secrets/exec-secret-ref-id-parity.test.ts` 应从注册表元数据 （`listSecretTargetRegistryEntries()`） 为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
- 如果您在 `src/secrets/target-registry-data.ts` 中添加新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。护栏必须在未分类的目标 id 上失败，因此不能默默地跳过新类别。

当前的奇偶校验测试涵盖共享的 exec-id 向量，但不再包含注册表采样器或 `classifyTargetClass`；在扩展注册表系列时恢复该覆盖范围，而不是假设向量检查涵盖注册表遍历。
