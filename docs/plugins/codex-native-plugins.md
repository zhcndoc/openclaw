---
summary: "为 Codex-mode OpenClaw agents 配置迁移后的原生 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - 你希望 Codex-mode OpenClaw agents 使用原生 Codex 插件
  - 你正在迁移从源码安装的 openai-curated Codex 插件
  - 你正在排查 codexPlugins、应用清单、破坏性操作或插件应用诊断问题
---

原生 Codex 插件支持让 Codex-mode OpenClaw agent 在处理 OpenClaw turn 的同一个 Codex thread 中使用 Codex
app-server 自身的 app 和插件能力。插件调用保留在原生 Codex transcript 中；Codex app-server 负责基于 app 的 MCP 执行。OpenClaw 不会把
Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

请在基础 [Codex harness](/plugins/codex-harness) 已经可用之后再使用本页。

## 要求

- 代理运行时必须是原生 Codex 运行环境。
- `plugins.entries.codex.enabled` 为 `true`。
- `plugins.entries.codex.config.codexPlugins.enabled` 为 `true`。
- 目标 Codex app-server 必须能够看到预期的 marketplace、插件和
  应用清单。
- V1 仅支持迁移过程中观察到在源 Codex home 中作为 source-installed 的
  `openai-curated` 插件。

`codexPlugins` 对 OpenClaw-provider 运行、ACP 会话
绑定或其他运行环境没有影响，因为这些路径从不会使用原生 `apps` 配置
创建 Codex app-server 线程。

OpenAI 侧的 Codex 账户、应用可用性以及工作区应用/插件控制
来自已登录的 Codex 账户。有关 OpenAI 账户和管理员模型，请参见
[将 Codex 与你的 ChatGPT 计划一起使用](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 快速开始

从源 Codex home 预览迁移：

```bash
openclaw migrate codex --dry-run
```

添加 `--verify-plugin-apps` 以使迁移调用源 `app/list`，并且在计划原生激活之前要求每个已拥有的 app 都存在、已启用且可访问：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

当计划看起来正确时，应用迁移：

```bash
openclaw migrate apply codex --yes
```

迁移会为符合条件的插件写入明确的 `codexPlugins` 条目，并为选定的插件调用 Codex app-server 的 `plugin/install`。迁移后的配置如下所示：

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

在 `codexPlugins` 发生更改后，新的 Codex 对话会自动获取更新后的 app 集合。运行 `/new` 或 `/reset` 可刷新当前对话。对于插件启用/禁用的更改，不需要重启 gateway。

## 从聊天中管理插件

`/codex plugins` 会检查或更改你运行 Codex harness 的同一聊天中已配置的原生 Codex 插件：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的别名。该列表会显示每个已配置插件的键、开关状态、Codex 插件名称，以及来自 `plugins.entries.codex.config.codexPlugins.plugins` 的市场来源。

`enable`/`disable` 只会写入 `~/.openclaw/openclaw.json`；它们不会编辑 `~/.codex/config.toml`，也不会安装新的 Codex 插件。只有所有者或具有 `operator.admin` 范围的网关客户端才能运行它们。

启用已配置的插件还会打开全局的 `codexPlugins.enabled` 开关。如果某个插件因迁移返回 `auth_required` 而被写入为禁用状态，请先在 Codex 中重新授权该应用，然后再在 OpenClaw 中启用它。

## 原生插件设置如何工作

集成跟踪三种状态：

| 状态      | 含义                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 已安装  | Codex 已将本地插件包部署到目标 app-server 运行时中。                                                              |
| 已启用  | OpenClaw 配置允许 Codex harness 回合使用该插件。                                                                       |
| 可访问 | Codex app-server 确认该插件的 app 条目对当前账户可用，并且映射到已迁移的插件标识。 |

迁移是持久化安装/资格确认步骤：

- 在规划阶段，OpenClaw 会读取源 Codex `plugin/read` 详情，并
  检查源 Codex app-server 账户是否为 ChatGPT 订阅
  账户。非 ChatGPT 账户或缺失账户响应会跳过具备应用支持的
  插件，并标记为 `codex_subscription_required`。
- 默认情况下，迁移会跳过源 `app/list` 调用：通过账户门控的具备应用支持的源
  插件会在没有源应用
  可访问性验证的情况下进行规划，而账户查询传输失败会跳过并返回
  `codex_account_unavailable`。
- 使用 `--verify-plugin-apps` 时，迁移会获取一个新的源 `app/list`
  快照，并要求每个所属应用在规划原生激活之前都必须存在、
  处于启用状态且可访问。此时账户查询传输失败会转入源应用清单门控，
  而不是直接跳过。

运行时应用清单是在迁移后执行的目标会话可访问性检查。Codex harness 会话设置会基于已启用且可访问的插件应用计算一个限制性的线程应用配置；它不会在每个回合重新计算，因此 `/codex plugins enable`/`disable` 只会影响新的 Codex 对话。使用 `/new` 或 `/reset` 可在当前对话中应用该更改。

## V1 支持边界

- 只有已安装在源 Codex app-server 清单中的 `openai-curated` 插件才具备迁移资格。
- 由 App 支持的源插件必须通过迁移时的订阅门控。
  `--verify-plugin-apps` 会添加源 app 清单门控。订阅受限的账户，以及在验证模式下不可访问/已禁用/缺失的源 app 或 app 清单刷新失败，都会被报告为跳过的手动项，而不是已启用的配置条目。在通过 app 清单门控之前，无法读取的插件详细信息会被跳过。
- 迁移会写入显式的插件标识（`marketplaceName` 和 `pluginName`）；不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是唯一的全局启用开关；不存在 `plugins["*"]` 通配符，也不存在可授予任意安装权限的配置键。
- 不支持的 marketplace、已缓存的插件 bundle、hooks 以及 Codex 配置文件会保留在迁移报告中供人工审核，不会自动激活。

## 应用清单与所有权

OpenClaw 通过 app-server 的 `app/list` 读取 Codex 应用清单，将其缓存到内存中一小时，并异步刷新过期或缺失的条目。该缓存仅限于进程本地；重启 CLI 或网关会清除它，OpenClaw 会在下一次读取 `app/list` 时重新构建缓存。

迁移和运行时使用不同的缓存键：

- 源迁移验证使用源 Codex home 和启动选项。它仅在 `--verify-plugin-apps` 下运行，并在该规划运行中强制对源端 `app/list` 进行一次新的遍历。
- 目标运行时设置在构建线程应用配置时使用目标代理的 Codex app-server 标识。插件激活会使该目标缓存键失效，然后在 `plugin/install` 之后强制刷新。

只有当 OpenClaw 能通过稳定所有权将插件应用映射回已迁移的插件时，才会暴露该插件应用：来自插件详情中的精确应用 id、已知的 MCP 服务器名称，或唯一的稳定元数据。仅凭显示名称，或所有权存在歧义的情况，都会被排除，直到下一次清单刷新证明其所有权。

## 线程应用配置

OpenClaw 为 Codex 线程注入了一个受限的 `config.apps` 补丁：
`_default` 被禁用，且只有由已启用的已迁移插件拥有的应用才会被
启用。

每个应用上的 `destructive_enabled` 来自生效的全局或
按插件的 `allow_destructive_actions` 策略；`true`、`"auto"` 和 `"ask"`
都会将 `destructive_enabled` 设为 `true`，而 `false` 会将其设为 `false`。Codex 仍然
根据其原生应用工具注解强制执行破坏性工具元数据。
`_default` 使用 `open_world_enabled: false` 进行禁用；已启用的插件应用将
`open_world_enabled: true`。OpenClaw 不提供单独的
插件级 open-world 策略开关，也不维护按插件划分的破坏性工具名拒绝列表。

插件应用的工具审批模式默认是自动，因此非破坏性的
读取工具可以在不需要同线程审批提示的情况下运行。破坏性工具仍然受
每个应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

对于已迁移的 Codex 插件，默认允许破坏性插件请求；而不安全的 schema 和所有权不明确的情况会直接拒绝：

- 全局 `allow_destructive_actions` 默认值为 `true`。
- 每个插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- `false`：OpenClaw 返回确定性的拒绝。
- `true`：OpenClaw 仅对其能映射为批准响应的安全 schema 自动接受，例如布尔类型的 approve 字段。
- `"auto"`：OpenClaw 将破坏性插件操作暴露给 Codex，然后在返回 Codex 批准响应之前，把可证明具有所有权的 MCP 批准请求转换为 OpenClaw 插件批准。
- `"ask"`：OpenClaw 使用与 `"auto"` 相同的 Codex 写入/破坏性操作门控，在线程开始前清除该应用的持久化 Codex 按工具批准覆盖，并且只提供一次性的批准或拒绝，因此持久化批准不会抑制后续的写操作提示。对于每个采用 `"ask"` 的已接入应用，OpenClaw 会为该应用选择 Codex 的 human approvals 审核者，从而让 Codex 将其批准请求发送给 OpenClaw；其他应用以及非应用线程批准则保留其已配置的审核者和策略。
- 缺少插件身份、所有权不明确、turn id 缺失或不匹配，或者不安全的 elicitation schema 都会直接拒绝，而不是提示用户。

## 故障排查

| Code                                              | Meaning                                                                                                                              | Fix                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `auth_required`                                   | 迁移已安装该插件，但其某个应用仍需要身份验证。在你重新授权之前，该条目会以禁用状态写入。 | 在 Codex 中重新授权该应用，然后在 OpenClaw 中启用该插件。                                                      |
| `app_inaccessible`, `app_disabled`, `app_missing` | 使用 `--verify-plugin-apps` 时，来源 Codex 应用清单未显示所有归属应用都处于存在、已启用且可访问的状态。         | 在 Codex 中重新授权或启用该应用，然后使用 `--verify-plugin-apps` 重新运行迁移。                              |
| `app_inventory_unavailable`                       | 已请求严格的源应用验证，但源 Codex 应用清单刷新失败。                                      | 修复源 Codex app-server 访问，或在不使用 `--verify-plugin-apps` 的情况下重试，以接受更快的账户门控方案。   |
| `codex_subscription_required`                     | 源 Codex app-server 账户不是 ChatGPT 订阅账户。                                                          | 使用订阅身份验证登录 Codex 应用，然后重新运行迁移。                                                  |
| `codex_account_unavailable`                       | 无法读取源 Codex app-server 账户。                                                                               | 修复源 Codex app-server 身份验证，或重新运行并使用 `--verify-plugin-apps` 让源应用清单决定资格。 |
| `marketplace_missing`, `plugin_missing`           | 目标 Codex app-server 无法看到预期的 `openai-curated` marketplace 或插件。                                          | 针对目标运行时重新运行迁移，或检查 Codex app-server 插件状态。                                 |
| `app_inventory_missing`, `app_inventory_stale`    | 应用就绪状态来自空缓存或过期缓存。                                                                                     | OpenClaw 会自动安排异步刷新；在确认所有权和就绪状态之前，插件应用将继续被排除。  |
| `app_ownership_ambiguous`                         | 应用清单仅通过显示名称匹配。                                                                                          | 在后续刷新证明所有权之前，该应用将继续对 Codex 线程隐藏。                                     |

**配置已更改，但代理无法看到插件：**运行 `/codex plugins
list` 以确认已配置的状态，然后执行 `/new` 或 `/reset`。现有的
Codex 线程绑定会保留它们启动时使用的应用配置，直到 OpenClaw
建立新的 harness 会话或替换过期绑定。

**拒绝了破坏性操作：**检查全局和每个插件的
`allow_destructive_actions` 值。即使设置为 `true`、`"auto"` 或 `"ask"`，
不安全的引导提取模式和不明确的插件身份仍会默认失败。

## 相关

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [配置参考](/gateway/configuration-reference#codex-harness-plugin-config)
- [迁移 CLI](/cli/migrate)
