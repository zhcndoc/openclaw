---
summary: "添加基于策略的 doctor 检查，用于工作区一致性。"
read_when:
  - 当你正在安装、配置或审计 policy 插件时
title: "Policy 插件"
---

# Policy 插件

添加基于策略的 doctor 检查，用于工作区一致性。

## 分发

- 包：`@openclaw/policy`
- 安装方式：已包含在 OpenClaw 中

## 表面

plugin

## 行为

Policy 插件为受策略管理的 OpenClaw 设置和受治理的工作区声明提供 doctor 健康检查。Policy 目前覆盖通道一致性、受治理的工具元数据、MCP 服务器姿态、模型提供方姿态、私有网络访问姿态、Gateway 暴露姿态、agent 工作区/工具姿态、已配置的全局/按 agent 工具姿态、已配置的沙箱运行时姿态、入口/通道访问姿态、数据处理姿态，以及 OpenClaw 配置密钥提供方/auth 配置文件姿态。

Policy 将编写的需求存储在 `policy.jsonc` 中，将现有 OpenClaw 设置和工作区声明作为证据进行观察，并通过 `openclaw policy check` 和 `openclaw doctor --lint` 报告偏差。干净的 policy 检查会输出 policy、evidence、findings 和 attestation 哈希，供运维人员记录以用于审计。

`openclaw policy compare --baseline <file>` 将一个 policy 文件与另一个 policy 文件进行比较。它只做配置级一致性检查：使用 policy 规则元数据来验证被检查的 policy 没有缺失，也没有比编写的基线更弱，并且不会检查运行时状态、凭据或密钥值。

工具姿态规则可以要求已批准的配置文件、仅限工作区的文件系统工具、受限制的 exec security/ask/host 设置、禁用提升模式、精确的 `alsoAllow` 条目，以及必需的工具拒绝条目。证据会记录累加式的 `alsoAllow` 条目，因为它们可能扩大有效的工具姿态。这些检查只观察配置一致性；它们不会读取运行时批准状态，也不会增加运行时强制执行。

沙箱姿态规则可以要求已批准的沙箱模式/后端、禁止宿主容器网络、禁止容器命名空间加入、要求容器挂载为只读、禁止容器运行时 socket 挂载和未受限的容器配置文件，并要求沙箱浏览器 CDP 源范围。这些检查只观察配置一致性；它们不会读取运行时批准状态，不会检查正在运行的容器，也不会增加运行时强制执行。

数据处理规则可以要求对敏感日志进行脱敏、禁止遥测内容捕获、要求维护会话保留，并禁止会话转录的内存索引。这些检查只观察配置一致性；它们不会检查原始日志、遥测导出、转录内容、内存文件、密钥或个人数据。

`scopes.<scopeName>` 下的命名策略范围可以为它们列出的选择器增加更严格的普通策略部分。`agentIds` 支持 `tools`、`agents.workspace`、`sandbox` 和 `dataHandling.memory`；`channelIds` 支持 `ingress.channels`。未在 `agents.list[]` 中显式列出的运行时 agent id 会根据继承的全局/默认姿态进行检查，而不是在没有证据的情况下默默通过。`policy.jsonc` 中存在的每个范围都必须对其选择器有效且可执行。叠加规则是额外声明，因此它们不会削弱顶层策略，并且当同一被观察到的配置同时违反两个范围时，它们可以产生自己的 findings。

## 相关文档

- [policy](/cli/policy)