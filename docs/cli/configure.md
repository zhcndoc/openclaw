---
summary: "openclaw configure 的 CLI 参考（交互式配置提示）"
read_when:
  - 你想以交互方式微调凭据、设备或代理默认设置
title: "配置"
---

# `openclaw configure`

针对现有设置进行定向更改的交互式提示：凭据、设备、代理默认值、网关、频道、插件、技能以及健康检查。

使用 `openclaw onboard` 或 `openclaw setup` 进行完整的首次运行引导流程，使用 `openclaw setup --baseline` 仅创建基础配置/工作区，以及在你只需要频道账号设置时使用 `openclaw channels add`。

<Tip>
不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。
</Tip>

## 选项

`--section <section>`：可重复的分区过滤器。可用分区：

`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

选择 `gateway`、`daemon` 或 `health`（或在不带 `--section` 的情况下运行完整向导）时，会提示 Gateway 运行位置并更新 `gateway.mode`。跳过这三项的分区过滤器会直接进入所请求的设置，不会出现 gateway 模式提示。选择远程 gateway 模式会写入远程配置并立即退出；它不会执行诸如插件安装之类的仅限本地的步骤。

<Note>
`openclaw configure` 需要一个交互式终端（stdin 和 stdout 都必须是 TTY）。如果没有，它会打印等价的非交互式 `openclaw config get|set|patch|validate` 命令，并以错误退出，而不是部分运行。
</Note>

## 模型部分

<Note>
**Model** 包括一个多选项，用于显式的 `agents.defaults.modelPolicy.allow` 列表（即 `/model` 和模型选择器中显示的内容）。按提供商范围的配置选项会将其选中的模型合并到现有列表中，而不是替换配置中已存在的其他提供商。逐模型别名和参数仍保留在 `agents.defaults.models` 下；这些条目本身不会限制模型覆盖。

从 configure 中重新运行提供商认证时，即使该提供商的认证步骤返回了带有其推荐默认模型的 config patch，也会保留现有的 `agents.defaults.model.primary`。添加或重新认证某个提供商会使其模型可用，但不会接管你当前的主模型。可使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>` 来有意更改默认模型。
</Note>

当 configure 从某个提供商认证选项启动时，默认模型和模型策略选择器会自动优先显示该提供商。对于 Volcengine 和 BytePlus 这类配对提供商，同样的优先级也会匹配它们的编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果首选提供商过滤后会得到空列表，configure 会回退到未过滤的目录，而不是显示空白选择器。

## Web 部分

`openclaw configure --section web` 会选择一个网页搜索提供商并配置其凭据。某些提供商会显示特定于提供商的后续设置：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 xAI OAuth 配置文件或 API 密钥，并允许你选择一个 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）以及默认的 Kimi 网页搜索模型。

## 其他说明

- 在本地配置写入后，当所选设置路径需要时，会配置安装所选的可下载插件。远程网关配置不会安装本地插件包。
- 面向频道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置期间会提示输入频道/房间允许列表。你可以输入名称或 ID；向导会在可能时将名称解析为 ID。
- 如果你运行守护进程安装步骤，令牌认证需要一个 token。若 `gateway.auth.token` 由 SecretRef 管理，configure 会验证该 SecretRef，但不会将解析后的明文 token 值持久化到 supervisor 服务环境元数据中；如果该 SecretRef 未解析，configure 会阻止守护进程安装，并提供可执行的修复指导。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，configure 会阻止守护进程安装，直到你显式设置该模式。

## 相关

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
- 配置 CLI: [配置](/cli/config)
