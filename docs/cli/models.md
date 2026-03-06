---
summary: "命令行界面参考：`openclaw models`（状态/列表/设置/扫描，别名，回退，认证）"
read_when:
  - 你想更改默认模型或查看提供商认证状态
  - 你想扫描可用模型/提供商并调试认证配置文件
title: "models"
---

# `openclaw models`

模型发现、扫描与配置（默认模型、回退、认证配置文件）。

相关内容：

- 提供商 + 模型：[模型](/providers/models)
- 提供商认证设置：[快速开始](/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示解析后的默认模型/回退模型及认证概览。
当提供商使用快照可用时，OAuth/令牌状态部分包含提供商使用头信息。
添加 `--probe` 以对每个配置的提供商配置文件执行实时认证探测。
探测是实际请求（可能消耗令牌并触发速率限制）。
使用 `--agent <id>` 检查配置代理的模型/认证状态。若省略，
命令使用 `OPENCLAW_AGENT_DIR` 或 `PI_CODING_AGENT_DIR`（如果已设置），
否则使用配置的默认代理。

注意事项：

- `models set <model-or-alias>` 支持 `provider/model` 格式或别名。
- 模型引用通过第一个 `/` 分割解析。如果模型 ID 包含 `/`（OpenRouter 风格），需包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 将输入视为别名或**默认提供商**的模型（仅当模型 ID 中无 `/` 时有效）。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出码 1=过期/缺失，2=即将过期）
- `--probe`（对配置的认证配置文件进行实时探测）
- `--probe-provider <name>`（探测指定提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（配置代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 认证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 运行提供商插件的认证流程（OAuth/API 密钥）。
使用 `openclaw plugins list` 查看已安装的提供商。

注意事项：

- `setup-token` 会提示输入 setup-token 值（可通过任何机器上的 `claude setup-token` 生成）。
- `paste-token` 接受从其他地方生成或自动化产生的令牌字符串。
- Anthropic 策略提示：setup-token 支持是技术兼容性。Anthropic 过去曾阻止 Claude Code 以外的某些订阅使用，请在广泛使用前确认当前条款。
