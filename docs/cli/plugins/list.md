---
summary: "`plugins list` 输出和选项、发现诊断以及持久插件索引"
title: "列出已安装的插件"
read_when:
  - "您想要检查插件是否已安装、启用且可发现"
  - "您正在调试 `plugins.allow` 警告或持久插件索引"
---

本页面涵盖 `openclaw plugins list`、其选项和发现诊断，以及支持它的机器管理插件索引。

## <a id="list"></a> 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换为按插件逐行显示详细信息，包含 format/source/origin/version/activation 元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单，并附带 registry 诊断和包依赖安装状态。
</ParamField>

<Note>
`plugins list` 首先读取持久的本地插件注册表，当注册表丢失或无效时，仅使用清单派生的回退。它对于检查插件是否已安装、启用以及对冷启动计划可见非常有用，但它不是对已运行的网关进程的实时运行时检查。编辑插件代码后，在期望运行新的 `register(api)` 代码或挂钩之前，针对服务于通道的网关运行 [`plugins reload <id>`](/cli/plugins/uninstall-and-update#reload)。默认的混合重新加载模式还应用插件配置和发现路径更改；当禁用被动重新加载时，管理员 `plugins.refresh` RPC 显式刷新清单。

`plugins list --json` 包括来自 `package.json`、`dependencies` 和 `optionalDependencies` 的每个插件的 `dependencyStatus`。 OpenClaw 检查这些包名称是否存在于插件的正常 Node `node_modules` 查找路径中；它不导入插件运行时代码、运行包管理器或修复丢失的依赖项。
</Note>

如果启动记录 `plugins.allow is empty; discovered non-bundled plugins may auto-load: ...`，请使用列出的插件 ID 运行 `openclaw plugins list --enabled --verbose` 或 `openclaw plugins inspect <id>` 以确认插件 ID，并将受信任的 ID 复制到 `openclaw.json` 中的 `plugins.allow` 中。当警告可以列出每个发现的插件时，它会打印一个已包含这些 ID 的可粘贴的 `plugins.allow` 片段。如果加载的插件没有 install/load-path 来源，请检查该插件 ID，然后将可信 ID 固定在 `plugins.allow` 中，或者从可信来源重新安装插件，以便 OpenClaw 记录安装来源。

对于打包在 Docker 镜像内的捆绑插件工作，请将插件源码目录通过 bind-mount 挂载到匹配的打包源码路径上，例如 `/app/extensions/synology-chat`。OpenClaw 会在 `/app/dist/extensions/synology-chat` 之前发现该挂载的源码覆盖层；直接复制的源码目录仍然不会生效，因此正常的打包安装仍会使用编译后的 dist。

用于运行时 hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 显示来自模块加载检查通道的已注册挂钩和诊断。运行时检查使用未缓存、非激活的注册表，并在打印结果之前发布其检查声明。它等待该版本的处置，并且失败会阻止成功的结果。如果 SDK 主机仍然从检查中借用提供者回调，则该主机将保留其支持资源并在拆卸期间报告任何后续处理失败；参见[保留的SDK合约](/plugins/sdk-migration/compatibility-policy#retained-helper-contracts)。这不会停止正在运行的网关或调用上下文引擎工厂。运行时检查永远不会安装依赖项；使用 `openclaw doctor --fix` 清理遗留依赖状态或恢复 config 引用的丢失的可下载插件。
- `openclaw gateway status --deep --require-rpc` 确认可访问的网关 URL/profile、service/process 提示、配置路径和 RPC 运行状况。
- 如果某个仅包含 hook 的插件未出现在运行时检查中，请确认其[hook 启动意图](/tools/plugin#plugin-hooks)：要么清单中的 `activation.onCapabilities: ["hook"]` 配合显式启用插件，要么使用会发出启动信号的 `plugins.entries.<id>.hooks` 策略，例如 `allowConversationAccess: true`。全局禁用、拒绝规则和限制性 allowlist 仍然优先。
- 非捆绑的会话 hook（`before_model_resolve`、`agent_turn_prepare`、`before_prompt_build`、`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_run`、`before_agent_finalize`、`agent_end`）要求 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- `session_end` 元数据不需要会话访问权限。它的有界 `ctx.endedTranscript` 阅读器执行此操作，并在授权不存在时报告 `conversation-access-required`。

### <a id="plugin-index"></a> 插件索引

插件安装元数据是机器管理的状态，而不是用户配置。安装和更新将其写入活动 OpenClaw 状态目录下的共享 SQLite 状态数据库。由 `plugins.installedIndex` 键入的 `config_machine_state` 值存储持久的 `installRecords` 元数据，包括损坏或丢失的插件清单的记录，以及 `openclaw plugins update` 使用的清单派生的冷注册表缓存、卸载、诊断和冷插件注册表。

不可读的索引并不是无效数据。权限、锁定和其他读取错误会停止回退、迁移并刷新原始错误。恢复数据库访问，然后重新运行 `openclaw plugins registry` 以在尝试修复之前检查状态。除非检查成功并确认安装记录无效，否则不要删除 `plugins.installedIndex` 行；仅读取失败并不能证明删除是合理的。

通过状态模式 13 升级旧版插件索引时，格式错误的 JSON 或意外的 JSON 形状不再丢弃安装分类帐。迁移将 `diagnostic_events` 中的完整原始行保留在 `plugins.installedIndex.quarantine` 下，记录警告，然后继续。即使派生的注册表元数据损坏，有效的安装记录仍然可用。运行 `openclaw doctor --fix` 或 `openclaw plugins registry --refresh` 以重建该元数据。无效的安装记录仍标记为无效，并需要从保留的行或经过验证的备份中恢复；它们永远不会被视为空装置。恢复记录可以在重新开放和普通诊断保留中保存。如果保存失败，迁移将回滚并保持旧行完好无损。

`plugins.installs` 是已退役的创作配置表面。运行时和更新命令仅读取 SQLite 机器状态插件索引。运行 `openclaw doctor --fix` 将旧配置记录导入索引并在正常运行时使用之前删除已停用的密钥。
