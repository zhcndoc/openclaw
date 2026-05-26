---
summary: "为工作区一致性添加由策略支持的 doctor 检查。"
read_when:
  - "在安装、配置或审计策略插件时"
title: "策略插件"
---

# 策略插件

为工作区一致性添加由策略支持的 doctor 检查。

## 分发

- 包：`@openclaw/policy`
- 安装路径：已包含在 OpenClaw 中

## 面向对象

plugin

## 行为

Policy 插件为由策略管理的 OpenClaw 设置和受管的工作区声明提供 doctor 健康检查。当前 Policy 涵盖通道一致性、受管工具元数据、MCP 服务器姿态、模型提供方姿态、私有网络访问姿态、Gateway 暴露姿态、代理工作区/工具姿态、已配置的全局/按代理工具姿态，以及 OpenClaw 配置密钥提供方/认证配置文件姿态。

Policy 将编写的要求存储在 `policy.jsonc` 中，将现有的 OpenClaw 设置和工作区声明作为证据进行观察，并通过 `openclaw policy check` 和 `openclaw doctor --lint` 报告偏差。干净的 policy 检查会输出 policy、证据、发现项和证明哈希，供运维人员记录用于审计。

工具姿态规则可以要求已批准的配置文件、仅限工作区的文件系统工具、受限的 exec 安全/ask/host 设置、禁用提升模式、精确的 `alsoAllow` 条目，以及必需的工具拒绝条目。证据会记录累加性的 `alsoAllow` 条目，因为它们可能扩大有效的工具姿态。这些检查仅观察配置一致性；它们不会读取运行时批准状态，也不会添加运行时强制执行。

`scopes.<scopeName>` 下的命名代理策略作用域可以为 `agentIds` 中列出的运行时代理 id 添加更严格的普通策略部分。初始的作用域部分是 `tools` 和 `agents.workspace`；未来像 sandbox 或 ingress 这样的部分，只要其证据携带代理身份，也可以加入同一个容器。`policy.jsonc` 中存在的每个作用域都必须对其选择器有效且可强制执行。覆盖规则是附加性声明，因此它们不会削弱顶层策略，并且当相同的已观测配置同时违反两个作用域时，可以产生它们自己的发现项。未在 `agents.list[]` 中明确列出的运行时代理 id，会根据继承的全局/默认姿态进行检查，而不是在没有证据的情况下静默通过。

## 相关文档

- [policy](/cli/policy)
