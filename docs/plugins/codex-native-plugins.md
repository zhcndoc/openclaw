---
summary: "为 Codex-mode OpenClaw agents 配置迁移后的原生 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - 你希望 Codex-mode OpenClaw agents 使用原生 Codex 插件
  - 你正在迁移从源码安装的 openai-curated Codex 插件
  - 你正在排查 codexPlugins、应用清单、破坏性操作或插件应用诊断问题
---

原生 Codex 插件支持允许 Codex-mode OpenClaw agent 在处理 OpenClaw 回合的同一个 Codex
线程中，使用 Codex
app-server 自身的应用和插件能力。

OpenClaw 不会把 Codex 插件转换为合成的 `codex_plugin_*`
OpenClaw 动态工具。插件调用会保留在原生 Codex 转录中，并且
Codex app-server 负责基于应用的 MCP 执行。

请在基础 [Codex harness](/plugins/codex-harness) 已正常工作后使用本页。

## 要求

- 选定的 OpenClaw agent 运行时必须是原生 Codex harness。
- `plugins.entries.codex.enabled` 必须为 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 true。
- V1 仅支持迁移时在源 Codex home 中观察到为 source-installed 的 `openai-curated` 插件。
- 目标 Codex app-server 必须能够看到预期的 marketplace、插件和应用清单。

`codexPlugins` 对 OpenClaw 运行、普通 OpenAI provider 运行、ACP
会话绑定或其他 harness 没有影响，因为这些路径不会创建带有原生 `apps` 配置的
Codex app-server 线程。

OpenAI 侧的 Codex 访问权限、应用可用性，以及工作区应用/插件控制
均来自已登录的 Codex 账户。关于 OpenAI 账户和管理员模型，
请参阅 [在 ChatGPT 计划中使用 Codex](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 快速开始

从源 Codex home 预览迁移：

```bash
openclaw migrate codex --dry-run
```

当你希望在规划原生插件启用之前检查源应用可访问性时，使用严格的源应用验证：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

当计划看起来正确时，应用迁移：

```bash
openclaw migrate apply codex --yes
```

迁移会为符合条件的插件写入显式的 `codexPlugins` 条目，并调用
Codex app-server 的 `plugin/install` 来安装所选插件。一个典型的迁移后
配置如下所示：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

更改 `codexPlugins` 后，新的 Codex 对话会自动获取更新后的应用集。
使用 `/new` 或 `/reset` 来刷新当前对话。
插件启用或禁用的更改不需要重启网关。

## 从聊天中管理插件

当你想要在操作 Codex harness 的同一聊天中，检查或修改已配置的原生 Codex
插件时，使用 `/codex plugins`：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的别名。列表输出会显示
已配置的插件键、开/关状态、Codex 插件名称，以及来自
`plugins.entries.codex.config.codexPlugins.plugins` 的 marketplace。

`enable` 和 `disable` 只会写入 OpenClaw 配置，位于
`~/.openclaw/openclaw.json`；它们不会编辑 `~/.codex/config.toml`，也不会安装
新的 Codex 插件。只有所有者或具有
`operator.admin` 作用域的网关客户端才能更改插件状态。

启用已配置的插件也会打开全局的
`codexPlugins.enabled` 开关。如果该插件因为迁移返回 `auth_required` 而被写入为禁用，
请先在 Codex 中重新授权该应用，再在 OpenClaw 中启用它。

## 原生插件设置如何工作

该集成有三个独立状态：

- Installed：Codex 已在目标 app-server 运行时中拥有本地插件包。
- Enabled：OpenClaw 配置允许该插件对 Codex
  harness 回合可用。
- Accessible：Codex app-server 确认该插件的应用条目对当前账户可用，
  并且可以映射到迁移后的插件身份。

迁移是持久化安装/资格判定步骤。在规划阶段，OpenClaw
读取源 Codex 的 `plugin/read` 详情，并检查源 Codex
app-server 账户响应是否为 ChatGPT 订阅账户。非 ChatGPT 或
缺失的账户响应会跳过基于应用的插件，并标记为
`codex_subscription_required`。默认情况下，迁移不会调用源
`app/list`；通过账户门槛的基于应用的源插件会在不进行源应用可访问性验证的情况下被规划，
而账户查找传输失败会以 `codex_account_unavailable` 跳过。使用 `--verify-plugin-apps` 时，
迁移会获取一份新的源 `app/list` 快照，并要求每个自有应用在规划原生启用之前都必须存在、已启用且可访问。
在该模式下，账户查找传输失败会落到源应用清单门槛。运行时应用清单是迁移后的目标会话可访问性检查。
随后 Codex harness 会话设置会为已启用且可访问的插件应用计算一个限制性的线程应用配置。

OpenClaw 在建立 Codex harness 会话或替换失效的 Codex 线程绑定时，会计算线程应用配置。
它不会在每个回合都重新计算，因此 `/codex plugins enable` 和 `/codex plugins disable` 会影响新的 Codex
对话。当前对话需要获取更新后的应用集时，请使用 `/new` 或 `/reset`。

## V1 支持边界

V1 的范围有意保持狭窄：

- 只有已经安装在源 Codex app-server 清单中的 `openai-curated` 插件才符合迁移条件。
- 基于应用的源插件必须通过迁移时的订阅门槛。
  `--verify-plugin-apps` 会增加源应用清单门槛。受订阅门槛影响的账户以及在验证模式下不可访问、已禁用、缺失的源应用或源应用清单刷新失败，
  都会作为已跳过的手动项报告，而不是作为已启用配置条目。不可读的插件详情会在源应用清单门槛之前跳过。
- 迁移会写入带有 `marketplaceName` 和
  `pluginName` 的显式插件身份；它不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。
- 不存在 `plugins["*"]` 通配符，也没有授予任意安装权限的配置键。
- 不支持的 marketplace、缓存的插件包、hooks 和 Codex 配置文件会保留在迁移报告中以供人工审查。

## 应用清单与所有权

OpenClaw 通过 app-server 的 `app/list` 读取 Codex 应用清单，将其缓存一小时，并异步刷新过期或缺失的条目。
该缓存仅存在于内存中；重启 CLI 或网关会清除它，而 OpenClaw 会从下一次 `app/list` 读取重新构建它。

迁移和运行时使用不同的缓存键：

- 源迁移验证使用源 Codex home 和源 app-server 启动选项。只有在设置了 `--verify-plugin-apps` 时才会运行，并且它会为该规划运行强制执行一次新的源 `app/list` 遍历。
- 目标运行时设置在构建 Codex 线程应用配置时，会使用目标 agent 的 Codex app-server 身份。插件激活会使该目标缓存键失效，然后在 `plugin/install` 之后强制刷新它。

只有当 OpenClaw 能通过稳定的所有权关系将插件应用映射回已迁移插件时，才会暴露该应用：

- 来自插件详情的精确应用 id
- 已知的 MCP server 名称
- 唯一且稳定的元数据

仅有显示名称或所有权不明确的情况会被排除，直到下一次清单刷新证明所有权。

## 线程应用配置

OpenClaw 会为 Codex 线程注入一个限制性的 `config.apps` 补丁：
`_default` 被禁用，并且只有属于已启用迁移插件的应用才会被启用。

OpenClaw 会根据有效的全局或按插件 `allow_destructive_actions` 策略设置应用级的 `destructive_enabled`，并让 Codex 从其原生应用工具注解中强制执行破坏性工具元数据。`_default` 应用配置被禁用且 `open_world_enabled: false`。已启用的插件应用会以 `open_world_enabled: true` 输出；OpenClaw 不会暴露单独的插件 open-world 策略开关，也不会维护按插件的破坏性工具名称拒绝列表。

插件应用的工具审批模式默认是 automatic，因此非破坏性的读取工具可以在同一线程中无需审批 UI 运行。破坏性工具仍由每个应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

迁移后的 Codex 插件默认允许破坏性插件触发，而不安全的 schema 和有歧义的所有权仍然会失败并关闭：

- 全局 `allow_destructive_actions` 默认值为 `true`。
- 按插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false` 时，OpenClaw 会返回确定性的拒绝。
- 当策略为 `true` 时，OpenClaw 只会自动接受它能映射为批准响应的安全 schema，例如布尔型 approve 字段。
- 缺失的插件身份、所有权歧义、缺失的 turn id、错误的 turn id，或不安全的触发 schema 都会直接拒绝，而不是提示。

## 故障排查

**`auth_required`：** 迁移已安装插件，但其某个应用仍需要认证。显式插件条目会被写为禁用状态，直到你重新授权并启用它。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
在设置了 `--verify-plugin-apps` 时，迁移没有安装该插件，因为源 Codex 应用清单没有显示所有自有应用都同时存在、已启用且可访问。请在 Codex 中重新授权或启用该应用，然后重新运行带有 `--verify-plugin-apps` 的迁移。

**`app_inventory_unavailable`：** 迁移没有安装该插件，因为请求了严格的源应用验证，而源 Codex 应用清单刷新失败。请修复源 Codex app-server 访问，或者如果你接受更快的基于账户门槛的计划，则不使用 `--verify-plugin-apps` 重试。

**`codex_subscription_required`：** 迁移没有安装这个基于应用的插件，因为源 Codex app-server 账户不是使用 ChatGPT 订阅账户登录的。请使用订阅认证登录 Codex 应用，然后重新运行迁移。

**`codex_account_unavailable`：** 迁移没有安装这个基于应用的插件，因为无法读取源 Codex app-server 账户。请修复源 Codex app-server 认证，或者如果你希望在账户查找失败时由源应用清单决定资格，则使用 `--verify-plugin-apps` 重新运行。

**`marketplace_missing` 或 `plugin_missing`：** 目标 Codex app-server 无法看到预期的 `openai-curated` marketplace 或插件。请针对目标运行时重新运行迁移，或者检查 Codex app-server 插件状态。

**`app_inventory_missing` 或 `app_inventory_stale`：** 应用就绪状态来自空缓存或过期缓存。OpenClaw 会安排一次异步刷新，并在所有权和就绪状态明确之前排除插件应用。

**`app_ownership_ambiguous`：** 应用清单只通过显示名称匹配，因此该应用不会暴露给 Codex 线程。

**配置已更改，但 agent 看不到插件：** 使用 `/codex plugins
list` 确认已配置状态，然后使用 `/new` 或 `/reset`。现有
Codex 线程绑定会保留其启动时的应用配置，直到 OpenClaw
建立新的 harness 会话或替换失效的绑定。

**破坏性操作被拒绝：** 检查全局和按插件的 `allow_destructive_actions` 值。即使策略为 true，不安全的触发 schema 和有歧义的插件身份仍然会失败并关闭。

## 相关

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [配置参考](/gateway/configuration-reference#codex-harness-plugin-config)
- [迁移 CLI](/cli/migrate)
