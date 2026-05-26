---
summary: "用于隐私保护型个人助手工作流检查的本地 qa-channel 场景。"
read_when:
  - 运行本地个人代理可靠性检查时
  - 扩展仓库支持的 QA 场景目录时
  - 验证提醒、回复、记忆、脱敏、安全工具跟进、任务状态、可共享诊断、基于证据的完成声明以及失败恢复时
title: "个人代理基准包"
---

个人代理基准包是一个用于本地个人助手工作流的小型、由仓库支持的 QA 场景包。它不是通用模型基准，也不需要新的运行器。该包复用了 [QA 概览](/concepts/qa-e2e-automation) 中描述的私有 QA 栈、合成的 [QA 通道](/channels/qa-channel) 以及现有的 `qa/scenarios` markdown 目录。

第一版包有意保持范围很窄：

- 通过本地 cron 投递的伪造个人提醒
- 通过 `qa-channel` 的伪造 DM 和线程回复路由
- 来自临时 QA 工作区记忆文件的伪造偏好回忆
- 伪造机密的无回显检查
- 在一轮简短的审批式对话后进行安全的、基于读取的工具跟进
- 对敏感的本地读取请求进行审批拒绝的停止行为
- 基于证据的任务状态报告，保持 pending、blocked 和 done 相互分离
- 保留有用状态、同时省略原始个人内容的可共享诊断产物
- 在本地证据存在之前避免伪造进度的、基于证据的完成声明
- 报告部分状态并保持重试边界清晰的失败恢复

## 场景

机器可读的包元数据位于
`extensions/qa-lab/src/scenario-packs.ts`。使用
`--pack personal-agent` 运行该包：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 会与重复的 `--scenario` 标志叠加。显式场景会先运行，然后按照 `QA_PERSONAL_AGENT_SCENARIO_IDS` 的顺序运行包内场景，并去除重复项。

该包面向 `qa-channel` 搭配 `mock-openai` 或其他本地 QA 提供者通道设计。不应将其指向实时聊天服务或真实个人账户。

## 隐私模型

这些场景只使用伪造用户、伪造偏好、伪造机密以及套件创建的临时 QA 网关工作区。它们不得读取或写入真实的 OpenClaw 用户记忆、会话、凭据、启动代理、全局配置或实时网关状态。

产物保留在现有 QA 套件产物目录下，应视为测试输出。脱敏检查使用伪造标记，因此即使失败也可安全查看并在 issue 中反馈。

## 扩展该包

在 `qa/scenarios/personal/` 下添加新案例，然后将场景 id 添加到 `QA_PERSONAL_AGENT_SCENARIO_IDS`。保持每个案例小巧、本地、在 `mock-openai` 中确定性，并聚焦于一种个人助手行为。

合适的后续候选：

- 脱敏轨迹导出检查
- 仅限本地的插件工作流检查

在场景目录积累足够稳定的案例以证明需要该表面之前，不要添加新的运行器、插件、依赖、实时传输或模型裁判。
