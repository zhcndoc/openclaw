---
summary: "使用 1Password CLI 解析 Gateway 密钥，并让代理使用内置的 1password skill"
read_when:
  - 你希望将 API 密钥从 openclaw.json 中移出并存放到 1Password 中
  - 你以无头方式运行 Gateway，并且需要用于 op 的服务帐户认证
  - 你希望代理使用 op CLI 读取或注入密钥
title: "1Password"
---

OpenClaw 通过两种相互独立的方式与 **1Password** 配合：

- **配置密钥：** `openclaw.json` 中任何 [SecretRef](/gateway/secrets) 字段都可以在运行时通过 `op` CLI 解析，因此 API 密钥不会存储在配置文件中。
- **代理工作流：** 内置的 `1password` skill 会教代理使用 `op` 登录并读取或注入密钥，以完成它们自己的任务。

## 要求

- 在 Gateway 主机上安装 [1Password CLI](https://developer.1password.com/docs/cli/get-started/)（`op`）（在 macOS 上使用 `brew install 1password-cli`）。
- `op` 的一种认证模式：
  - **服务账号**（推荐用于无头 Gateway）：在 Gateway 服务环境中导出 `OP_SERVICE_ACCOUNT_TOKEN`。无需桌面应用，无需交互式登录。
  - **桌面应用集成**：1Password 应用运行在同一台机器上，并启用了 CLI 集成。首次调用可能会触发 Touch ID 或系统认证。
  - **独立登录**：`op signin` 每个会话都会提示。通过该技能可供代理使用，但不适合在无头 Gateway 上解析配置密钥。

## 使用 op 解析配置密钥

声明一个执行型密钥提供方，它运行 `op read` 并使用 `op://vault/item/field` 引用，然后将任何支持 SecretRef 的字段指向它：

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所需
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

各部分如何协同工作：

- `command` 必须是绝对路径；`trustedDirs` 会将其目录标记为受信任目录，而 `allowSymlinkCommand` 是必需的，因为 Homebrew 会将 `op` 以符号链接形式安装。
- `args` 原样传递 `op://vault/item/field` 引用。OpenClaw 本身不会解析 `op://` 协议；由 `op` 二进制来解析它。
- `passEnv` 将列出的变量从 Gateway 环境中传递过去。桌面应用集成需要 `HOME`；服务账户还需要在 Gateway 服务环境中存在 `OP_SERVICE_ACCOUNT_TOKEN`（将其添加到 `passEnv`，或者仅在你接受该令牌可在配置文件中被读取时通过 `env` 设置）。
- 对于单值输出，请保留 `id: "value"`。如果使用 `jsonOnly: true` 且输出为 JSON，则改为使用 JSON pointer 形式的 `id` 来定位字段。
- 每个密钥使用一个 provider 条目可保持引用可审计；请按其使用者命名 provider（`onepassword_openai`、`onepassword_telegram`）。

有关解析顺序、缓存和失败语义，请参阅 [Gateway secrets](/gateway/secrets)；有关所有接受 SecretRef 的字段，请参阅 [SecretRef Credential Surface](/reference/secretref-credential-surface)。

## 无头 Gateway 的服务账户设置

1. 在你的 1Password 账户中创建一个服务账户，并仅授予其对 Gateway 所需的 vault 项目的读取访问权限。
2. 将 `OP_SERVICE_ACCOUNT_TOKEN` 提供给 Gateway 服务（launchd plist、systemd unit 或容器环境变量）。
3. 将 `"OP_SERVICE_ACCOUNT_TOKEN"` 添加到 provider 的 `passEnv` 列表中。
4. 从 Gateway 主机环境中验证：`op whoami` 应直接输出该服务账户，而不会提示输入。

服务账户读取要求在 `op://` 引用中明确指定 vault 名称。请严格收窄该账户的权限范围；它是一个持有者凭证。

## 适用于代理的 1password 技能

OpenClaw 捆绑了一个 `1password` 技能，可将代理变成熟练的 `op` 操作员：它会检测可用的认证模式（服务账户、桌面应用集成或独立登录），在读取任何内容之前使用 `op whoami` 验证访问权限，并且优先使用 `op run` / `op inject`，而不是将密钥值写入磁盘。该技能需要 `op` 二进制文件，并在缺失时提供 Homebrew 安装方式。

代理会将其用于自己的工作流，例如在任务进行中读取部署令牌，或将环境变量注入到命令中。它独立于配置密钥解析；Gateway 会在不涉及任何技能的情况下解析 SecretRefs。

## 安全说明

- 通过 exec providers 解析的密钥值会保留在 Gateway 内存中；配置快照和 `config.get` 响应会对 SecretRef 字段进行脱敏。
- 切勿将密钥值放在 `openclaw.json`、日志或聊天中。将条目名称保留在配置中，值存放在 1Password 中。
- 1Password 审计日志会显示每次服务账户读取记录，这使得密钥轮换和事件审查变得可行。

## 故障排查

- 出现 `command not found` 或 spawn 错误：使用绝对路径的 `op`，并将其目录包含在 `trustedDirs` 中。
- `op` 可以解析但读取时因符号链接错误失败：对于 Homebrew 安装，设置 `allowSymlinkCommand: true`。
- `account is not signed in`：对于服务账户，请确认 `OP_SERVICE_ACCOUNT_TOKEN` 已传递到 Gateway 服务并列在 `passEnv` 中；对于桌面集成，请确认应用正在运行且已解锁。
- 首次读取较慢：提高 provider 上的 `timeoutMs`；在繁忙主机上，`op` 冷启动可能会超过严格的超时时间。
