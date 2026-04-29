---
summary: "openclaw configure 的 CLI 参考（交互式配置提示）"
read_when:
  - 你想以交互方式微调凭据、设备或代理默认设置
title: "配置"
---

# `openclaw configure`

用于设置凭据、设备和代理默认设置的交互式提示。

<Note>
**Model** 部分包含一个针对 `agents.defaults.models` 允许列表的多选项（即在 `/model` 和模型选择器中显示的内容）。按提供方范围的配置选项会将所选模型合并到现有允许列表中，而不是替换配置中已存在的其他提供方。通过 configure 重新运行提供方认证会保留现有的 `agents.defaults.model.primary`。如果你有意更改默认模型，请使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。
</Note>

当 configure 从某个提供方认证选项启动时，默认模型和允许列表选择器会自动优先显示该提供方。对于 Volcengine 和 BytePlus 这类成对的提供方，同样的偏好也会匹配它们的 coding-plan 变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果优先提供方过滤后会产生空列表，configure 会回退到未过滤的目录，而不是显示空白选择器。

<Tip>
不带子命令的 `openclaw config` 会打开同一个向导。对于非交互式编辑，请使用 `openclaw config get|set|unset`。
</Tip>

对于网页搜索，`openclaw configure --section web` 允许你选择一个提供方
并配置其凭据。某些提供方还会显示特定于提供方的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY`，并
  让你选择一个 `x_search` 模型。
- **Kimi** 可能会询问 Moonshot API 区域（`api.moonshot.ai` 与
  `api.moonshot.cn`）以及默认的 Kimi 网页搜索模型。

相关内容：

- 网关配置参考：[Configuration](/gateway/configuration)
- 配置 CLI：[Config](/cli/config)

## 选项

- `--section <section>`：可重复的 section 过滤器

可用 section：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

说明：

- 选择 Gateway 的运行位置时总会更新 `gateway.mode`。如果你只需要这个，可以不选择其他 section，直接选择“Continue”。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置期间会提示输入频道/房间允许列表。你可以输入名称或 ID；向导会在可能时将名称解析为 ID。
- 如果你运行 daemon 安装步骤，token 认证需要一个 token，并且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将解析后的明文 token 值持久化到 supervisor 服务环境元数据中。
- 如果 token 认证需要 token，而已配置的 token SecretRef 未解析，configure 会阻止 daemon 安装，并提供可操作的修复指导。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，configure 会阻止 daemon 安装，直到明确设置 mode。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相关内容

- [CLI reference](/cli)
- [Configuration](/gateway/configuration)
