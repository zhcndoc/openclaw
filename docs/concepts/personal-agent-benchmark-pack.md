---
summary: "用于隐私保护型个人助手工作流检查的本地 qa-channel 场景。"
read_when:
  - 运行本地个人代理可靠性检查时
  - 扩展仓库支持的 QA 场景目录时
  - 验证提醒、回复、记忆、脱敏、安全工具跟进、任务状态、可共享诊断、基于证据的完成声明以及失败恢复时
title: "个人代理基准包"
---

个人代理基准包是一个体积较小、由仓库支持的 QA 场景包，用于本地个人助手工作流。它不是一个通用模型基准，也不需要新的运行器：它复用了私有 QA 栈（[QA 概览](/concepts/qa-e2e-automation)）、合成的 [QA channel](/channels/qa-channel)，以及现有的 `qa/scenarios` YAML 目录。

## 场景

`qa/scenarios/personal/*.yaml` 中定义了十个场景：

| 场景 id                                | 检查内容                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `personal-reminder-roundtrip`          | 通过本地 cron 投递的虚拟个人提醒                                                               |
| `personal-channel-thread-reply`        | 通过 `qa-channel` 进行虚拟 DM 和线程回复路由                                                   |
| `personal-memory-preference-recall`    | 从临时 QA 工作区内存文件中进行虚拟偏好回忆                                                     |
| `personal-redaction-no-secret-leak`    | 虚拟机密不回显检查                                                                             |
| `personal-tool-safety-followthrough`   | 在简短的审批式回合后进行安全的、基于读取的工具跟进                                             |
| `personal-approval-denial-stop`       | 对敏感本地读取请求的审批拒绝停止行为                                                           |
| `personal-task-followthrough-status`  | 基于证据的任务状态报告，将 pending、blocked 和 done 明确区分                                   |
| `personal-share-safe-diagnostics-artifact` | 共享安全的诊断工件，在保留有用状态的同时省略原始个人内容                                     |
| `personal-no-fake-progress`           | 基于证据的完成声明，避免在本地证据不存在之前伪造进展                                           |
| `personal-failure-recovery`           | 故障恢复，报告部分状态并保持重试边界清晰                                                       |

机器可读的包元数据（id 列表、标题、描述）位于
`extensions/qa-lab/src/scenario-packs.ts` 中的 `QA_PERSONAL_AGENT_SCENARIO_IDS`。
使用 `--pack personal-agent` 运行该包：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 可与重复的 `--scenario` 标志叠加使用。显式指定的场景会先运行，
然后按 `QA_PERSONAL_AGENT_SCENARIO_IDS` 的顺序运行包内场景，并去重。

该包面向 `qa-channel`，使用 `mock-openai` 或其他本地 QA provider
lane。不要将其指向在线聊天服务或真实个人账户。

## 隐私模型

场景仅使用假用户、假偏好设置、假密钥以及由测试套件创建的临时 QA 网关工作区。它们不得读取或写入真实的 OpenClaw 用户记忆、会话、凭据、启动代理、全局配置或实时网关状态。

工件保留在现有的 QA 测试套件工件目录下，并被视为测试输出。脱敏检查使用假标记，因此即使失败，检查结果也可以安全地查看并在 issue 中提交。

## 扩展包

在 `qa/scenarios/personal/` 下添加新的 `.yaml` 案例，然后将场景 id
加入 `QA_PERSONAL_AGENT_SCENARIO_IDS`。保持每个案例都足够小、在 `mock-openai` 中本地且确定性，并专注于一种个人助手行为。

不错的后续候选项：脱敏轨迹导出检查、仅本地
插件工作流检查。

在场景目录积累足够稳定的案例以证明需要该表面之前，不要添加新的运行器、插件、依赖、实时传输或模型裁判。
