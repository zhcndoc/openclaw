---
summary: "将可选的 1Password 插件用作经过审计的代理密钥代理"
read_when:
  - 当你希望代理请求经过筛选的 1Password 密钥时
  - 你需要按密钥的审批策略和审计历史时
  - 你正在为 OpenClaw 配置 1Password 服务账户时
title: "1Password 密钥代理"
---

# 1Password 密钥代理

内置的 `onepassword` 插件为代理提供了一个受策略控制的工具，用于读取经过筛选的一组 1Password 字段。它默认处于禁用状态，并且在 `plugins.entries.onepassword.config` 存在之前不会执行任何操作。

这是一个代理工具，而不是 SecretRef 提供程序。它不会注入环境变量，也不会解析 OpenClaw 配置密钥。

## 安全模型

- 仅使用服务帐户认证。令牌保留在本地凭据
  文件中，并且绝不会在 `openclaw.json` 中被接受。
- 仅限精选注册表。代理可以列出已配置的 slug，但插件绝不会
  枚举 1Password 保管库。
- 每个 slug 具有 `auto`、`approve` 或 `deny` 策略。
- 批准授权会过期。缓存值绝不会绕过当前策略。
- 每次访问尝试都会记录在 OpenClaw 共享的 SQLite 状态中。审计
  行包含所提供的原因；请保持原因不包含敏感信息。代理程序
  绝不会将获取的值或服务令牌复制到审计行中。
- 在当前工具执行结束后，OpenClaw 所拥有的转录持久化机制会
  将成功的 `get` 值替换为已脱敏的元数据。
- 该值在该次执行中对模型可见。如果模型将其复制到后续的工具调用或回复中，
  那条单独记录将不在此插件的持久化钩子范围内。请将策略保持得足够严格，并且不要要求模型重复输出某个值。
- 对于每次缓存未命中，插件只会调用一次 `op`。它不会重试速率限制或
  其他失败。

仅授予该服务帐户对插件配置中注册的保管库和项目的只读访问权限。

## 开始之前

你需要：

- 在 Gateway 主机上安装 1Password CLI（`op`）
- 一个有权访问所选项目的 1Password 服务账户
- 一个专用的服务账户令牌文件

启用内置插件：

```bash
openclaw plugins enable onepassword
```

在 OpenClaw 状态目录下创建令牌目录和文件：

```bash
mkdir -p ~/.openclaw/credentials/onepassword
chmod 700 ~/.openclaw/credentials/onepassword
printf '%s' "$OP_SERVICE_ACCOUNT_TOKEN" > \
  ~/.openclaw/credentials/onepassword/service-account-token
chmod 600 ~/.openclaw/credentials/onepassword/service-account-token
unset OP_SERVICE_ACCOUNT_TOKEN
```

当设置了 `OPENCLAW_STATE_DIR` 时，请将 `~/.openclaw` 替换为该目录。
如果令牌文件对组用户或其他用户可读或可写，插件会发出一次警告。

## 配置已注册的密钥

将插件配置添加到 `openclaw.json`：

```jsonc
{
  "plugins": {
    "entries": {
      "onepassword": {
        "enabled": true,
        "config": {
          "vault": "Automation",
          "defaultPolicy": "approve",
          "cacheTtlSeconds": 300,
          "grantTtlHours": 720,
          "opTimeoutMs": 15000,
          "items": {
            "repository-token": {
              "item": "Repository automation token",
              "field": "credential",
              "policy": "approve",
              "description": "Repository automation 的令牌",
            },
            "model-key": {
              "item": "模型提供商密钥",
              "vault": "Agent credentials",
              "policy": "auto",
            },
          },
        },
      },
    },
  },
}
```

Slug 使用小写字母、数字和连字符，以字母或数字开头，并且最多包含 64 个字符。一个注册表最多可包含 32 个 slug；描述最多可包含 200 个字符。`field` 接受一个字段标签或 ID，不能包含逗号，默认值为 `credential`。条目级别的 `vault` 会覆盖默认 vault。`opBin` 可以设置 `op` 可执行文件的绝对路径；否则插件会从 `PATH` 中解析 `op`。条目标题不能以连字符开头。

## 使用 agent 工具

工具名称是 `onepassword`。

列出已注册的 slug：

```json
{ "action": "list" }
```

结果只包含 slug、描述、策略，以及是否存在有效的常设授权。它绝不会包含秘密值，也不会查询 1Password。

请求一个密钥：

```json
{
  "action": "get",
  "slug": "repository-token",
  "reason": "Authenticate the requested repository operation"
}
```

`reason` 是必需的，必须非空，并且限制为 300 个字符。成功的 `get` 会返回该值以及配置的 slug、项目标题和字段标签。

## 策略层级和审批

- `auto`：立即获取并审计请求。
- `deny`：阻止并审计请求。
- `approve`：使用未过期的常设授权，或请人工允许一次、
  始终允许，或拒绝。

允许一次只授权当前工具调用。始终允许会为该代理和 slug 写入一个常设
授权到 SQLite；其他代理必须获得各自的
审批。OpenClaw 仅在调用方具有明确的代理
身份时提供始终允许。该授权在 `grantTtlHours`
后过期，默认值为 720 小时。
未解决或超时的审批会拒绝该请求；最长审批
等待时间为 600 秒。插件最多保留 1,024 个常设授权；达到该
上限时，最旧的授权会被移除，其代理必须批准下一次访问。

内存缓存默认持续 300 秒，并受已配置的
slug 注册表限制。将 `cacheTtlSeconds` 设为 `0` 可禁用它。策略会在每次缓存查询之前进行评估，且缓存命中会被审计。运行时配置重载会在每个策略和执行边界生效；禁用插件或
移除、拒绝或重定向某个 slug 会使待处理授权和
缓存值失效。

## 检查状态和审计历史

显示就绪状态和注册数量：

```bash
openclaw onepassword status
```

这会报告令牌文件是否存在、`op` 是否已解析及其路径、
已注册条目数量，以及按策略划分的数量。它绝不会读取或打印
令牌或密钥值。

显示最近 50 条审计记录：

```bash
openclaw onepassword audit
openclaw onepassword audit --limit 100
```

记录按最新优先显示，并展示时间戳、agent、slug、结果，以及截断的
原因。原因会按提供时原样存储；broker 绝不会将获取到的
值添加到审计日志中。

## 1Password CLI 行为

每次缓存未命中都会使用已配置的项目、保险库和精确的字段选择器运行 `op item get`，输出 JSON，设置有界超时，并带上 `--cache=false`。子进程只接收该字段，而不是整个项目。子进程环境中仅包含 `OP_SERVICE_ACCOUNT_TOKEN` 和 `HOME`。

插件只会尝试一次。`RATE_LIMITED` 错误应通过在后续代理请求之前等待来处理；插件不会创建自动重试循环。其他稳定错误代码用于区分缺失的令牌或二进制文件、缺失的项目或字段、身份验证失败、超时，以及其他 `op` 失败。
