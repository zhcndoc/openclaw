---
summary: "用于 `openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - 您想以交互方式调整凭据、设备或代理默认值
title: "配置"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

<Note>
**模型** 部分包含一个用于 `agents.defaults.models` 允许列表的多选项（这些内容会显示在 `/model` 和模型选择器中）。按提供商范围的设置选项会将所选模型合并到现有允许列表中，而不是替换配置中已经存在的其他提供商。通过 configure 重新运行提供商认证时，会保留现有的 `agents.defaults.model.primary`。如果您有意要更改默认模型，请使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。
</Note>

当 configure 从提供商认证选项启动时，默认模型和允许列表选择器会自动优先显示该提供商。对于 Volcengine 和 BytePlus 这类成对提供商，同样的偏好也会匹配它们的编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果首选提供商过滤器会产生空列表，configure 会回退到未过滤的目录，而不是显示空白选择器。

<Tip>
不带子命令的 `openclaw config` 会打开相同的向导。对于非交互式编辑，请使用 `openclaw config get|set|unset`。
</Tip>

对于 Web 搜索，`openclaw configure --section web` 允许您选择提供商并配置其凭据。某些提供商还会显示特定于提供商的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY`，并让您选择 `x_search` 模型。
- **Kimi** 可能会询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）以及默认的 Kimi Web 搜索模型。

相关内容：

- 网关配置参考：[配置](/gateway/configuration)
- 配置 CLI：[配置](/cli/config)

## 选项

- `--section <section>`: 可重复的部分过滤器

可用部分：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

注意：

- 选择网关运行位置时总会更新 `gateway.mode`。如果只需要这一项，可以选择“继续”跳过其他部分。
- 面向频道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置过程中会提示输入频道/房间允许列表。您可以输入名称或 ID；向导会尽可能将名称解析为 ID。
- 如果执行守护进程安装步骤，令牌认证需要令牌，而 `gateway.auth.token` 由 SecretRef 管理，配置会验证 SecretRef，但不会将已解析的明文令牌值持久化到 supervisor 服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，配置会阻止守护进程安装，并提供可执行的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，配置会阻止守护进程安装，直到明确设置认证模式。

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
