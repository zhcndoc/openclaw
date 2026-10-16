---
summary: "医生检查和插件健康检查执行的detect/repair合约"
title: "结构化健康检查合约"
read_when:
  - "您正在撰写或转换医生支票"
  - "您正在通过插件 SDK 添加插件支持的运行状况检查"
---

本页描述了检查作者的结构化健康检查合同。运营商不需要它来运行医生。

## <a id="structured-health-checks"></a> 结构化健康检查

要检查注册表克隆形状，请运行 `openclaw doctor --lint --only core/doctor/project-clone-shape --json`。此检查也在普通 Doctor 和 `--lint --all` 中运行。不可读的克隆会产生跳过检查警告，但不会中止其余检查。修复指南删除所有部分克隆过滤器，从源重新获取（仅在需要时取消浅化），通过 ID 获取丢失的对象，清除承诺者设置和 `extensions.partialclone`，然后重新打包。在手动运行这些网络和磁盘操作之前，请参阅 [ 修复序列](/gateway/doctor#11e-project-clone-shape)。

使用结构化健康注册表的医生检查声明一份小型分割合同：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 为 `doctor --lint` 提供动力。 `repair()` 是可选的，仅在 `doctor --fix` / `doctor --repair` 下运行。仅声明 `run()` 处理程序而不是 `healthChecks` 的医生贡献不会通过此合约公开。

修复上下文可以携带`dryRun`/`diff`请求；修复结果可以返回结构化的 `diffs`（config/file 编辑）和 `effects`（服务、流程、包、状态或其他副作用），因此转换后的检查可以向 `doctor --fix --dry-run` 增长，而无需将突变计划移至 `detect()`。

`repair()` 会报告 `status: "repaired" | "skipped" | "failed"`（省略 status 表示 `repaired`）。当修复返回 `skipped` 或 `failed` 时，doctor 会报告原因并跳过该检查的验证。成功修复后，doctor 会针对已修复的发现结果重新运行带范围限制的 `detect()`；如果该发现仍然存在，doctor 会报告修复警告，而不是将该变更视为完成。

一个发现结果包含：

| 字段             | 用途                                                |
| ----------------- | ------------------------------------------------------ |
| `checkId`         | 用于 skip/only 过滤和 CI 白名单的稳定 id。     |
| `severity`        | `info`、`warning` 或 `error`。                         |
| `message`         | 面向人的问题描述。                      |
| `path`            | 可用时的配置、文件或逻辑路径。          |
| `line` / `column` | 可用时的源位置。                        |
| `ocPath`          | 当检查可以指向一个精确 `oc://` 地址时使用。 |
| `fixHint`         | 建议的操作员动作或修复摘要。           |

声明结构化健康检查的核心医生检查与拥有其人类 `doctor` / `doctor --fix` 行为的有序医生贡献相关。共享的结构化健康注册表是扩展点：一旦其所属的包将它们注册到活动命令路径中，捆绑和插件支持的检查就会在核心医生检查之后运行。 `openclaw/plugin-sdk/health` 为插件作者公开了相同的合同。
