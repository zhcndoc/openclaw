---
summary: "用于 `openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - 您想要交互式调整凭据、设备或代理默认设置时
title: "configure"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

注意：**模型** 部分现在包含 `agents.defaults.models` 允许列表的多选（即 `/model` 和模型选择器中显示的内容）。

提示：不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。

相关：

- 网关配置参考：[配置](/gateway/configuration)
- 配置 CLI：[配置](/cli/config)

说明：

- 选择网关运行位置时总会更新 `gateway.mode`。如果只需要这一项，可以选择“继续”跳过其他部分。
- 面向频道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置过程中会提示输入频道/房间允许列表。您可以输入名称或 ID；向导会尽可能将名称解析为 ID。
- 如果执行守护进程安装步骤，令牌认证需要令牌，而 `gateway.auth.token` 由 SecretRef 管理，配置会验证 SecretRef，但不会将已解析的明文令牌值持久化到 supervisor 服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，配置会阻止守护进程安装，并提供可执行的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，配置会阻止守护进程安装，直到明确设置认证模式。

## 示例

```bash
openclaw configure
openclaw configure --section model --section channels
```
