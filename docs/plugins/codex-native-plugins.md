---
summary: "为 Codex-mode OpenClaw 代理配置原生 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - 您希望 Codex-mode OpenClaw 代理使用原生 Codex 插件
  - 您正在迁移源安装的 openai-curated Codex 插件
  - 您正在配置现有的工作区目录 Codex 插件
  - 您正在排查 codexPlugins、应用清单、破坏性操作或插件应用诊断
---

原生 Codex 插件支持让 Codex-mode OpenClaw agent 在处理 OpenClaw turn 的同一个 Codex thread 中使用 Codex
app-server 自身的 app 和插件能力。插件调用保留在原生 Codex transcript 中；Codex app-server 负责基于 app 的 MCP 执行。OpenClaw 不会把
Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

请在基础 [Codex harness](/plugins/codex-harness) 已经可用之后再使用本页。

## 要求

- 代理运行时必须是原生 Codex harness。
- `plugins.entries.codex.enabled` 必须为 `true`。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 `true`。
- 目标 Codex app-server 必须能够看到预期的 marketplace、插件和
  应用库存。
- 迁移仅支持其在源 Codex home 中观察到为源安装的 `openai-curated` 插件。
- 手动配置的 `workspace-directory` 插件需要一个 Codex app-server，其 `plugin/list` 接受 `marketplaceKinds`，并且其不带路径的工作区摘要包含 `remotePluginId`。该插件必须已经安装并启用，并且其拥有的应用必须可在 `app/list` 中访问。

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

迁移仍然仅限于 `openai-curated`。要使用现有的
`workspace-directory` 插件，请使用 `plugin/list` 返回的精确
marketplace-qualified `summary.id` 手动添加。例如，如果
Codex 返回 `example-plugin@workspace-directory`，请配置该完整
值，而不是其显示名称：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            plugins: {
              "example-plugin": {
                enabled: true,
                marketplaceName: "workspace-directory",
                pluginName: "example-plugin@workspace-directory",
              },
            },
          },
        },
      },
    },
  },
}
```

OpenClaw 不会为 `workspace-directory` 插件调用 `plugin/install` 或启动身份验证。在添加或启用 OpenClaw 策略之前，请先在 Codex 中安装、启用并完成身份验证。OpenClaw 在响应省略了精确的 marketplace、插件 ID、详情 ID 或 app 就绪证据时，会保持应用隐藏。如果 Codex 拒绝显式的 workspace `plugin/list` 请求，OpenClaw 会为每个已启用的 workspace 插件报告 `marketplace_missing`，并保留任何单独发现的 curated 插件可用。

在 `codexPlugins` 变更后，新的 Codex 会话会自动获取更新后的
app 集。运行 `/new` 或 `/reset` 以刷新当前
会话。插件启用/禁用变更不需要重启 gateway。

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

启用已配置的插件也会打开全局的 `codexPlugins.enabled`
开关。如果某个精选插件因迁移返回
`auth_required` 而被写入为禁用状态，请先在 Codex 中重新授权该应用，然后再在 OpenClaw 中启用它。
对于 `workspace-directory` 条目，在此处启用它只会更改 OpenClaw
策略；该插件和应用必须已经在 Codex 中处于激活状态。

## 原生插件设置如何工作

集成跟踪三种状态：

| State      | Meaning                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Installed  | Codex 在目标应用服务器运行时中包含该插件 bundle。                                                                      |
| Enabled    | Codex 报告该插件已启用，且 OpenClaw 配置允许它用于 Codex harness turns。                                           |
| Accessible | Codex app-server 确认该插件的应用条目对当前账户可用，并映射到配置的插件身份。 |

对于 `openai-curated` 插件，迁移是持久化安装/资格判定
步骤：

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

对于 `workspace-directory` 插件，设置发生在 OpenClaw 之外。OpenClaw
仅在至少配置了一个已启用的 workspace 条目时查询该 marketplace，按精确的 `summary.id` 解析每个插件，并复用现有的
`plugin/read` 所有权和 `app/list` 就绪检查。未安装、
已禁用、不可访问或未认证的插件不会暴露任何应用；OpenClaw
不会尝试安装或认证。

运行时应用清单是已迁移的 curated 插件和手动配置的 workspace 插件的目标会话可访问性检查。Codex
harness 会话设置会基于已启用且可访问的插件应用计算一个受限的线程应用配置；它不会在每一轮都重新计算，因此
`/codex plugins enable`/`disable` 只会影响
新的 Codex 对话。使用 `/new` 或 `/reset` 来让当前对话
获取该变更。

## V1 支持边界

- 只有已经安装在源 Codex 应用服务器库存中的 `openai-curated` 插件才具备迁移资格。
- 运行时还支持在 app-server 构建上显式的 `workspace-directory` 条目，这些构建的 `plugin/list` 实现了 `marketplaceKinds`，并且会为无路径的 workspace 摘要返回 `remotePluginId`。这些条目必须使用其精确的带 marketplace 限定的 `summary.id`，并且必须已经安装、启用且可被应用访问。被拒绝的 workspace 列表请求会产生现有的按插件 `marketplace_missing` 诊断；缺少 marketplace、插件、详情或应用证据时，不会暴露 workspace app。默认列表请求中的 curated 库存仍然可用。
- 基于应用的源插件必须通过迁移时的订阅门控。`--verify-plugin-apps` 会添加源 app 库存门控。订阅受限账户，以及在验证模式下不可访问/已禁用/缺失的源应用或 app 库存刷新失败，都会作为被跳过的手动项报告，而不是作为已启用的配置条目。不可读取的插件详情会在 app 库存门控之前被跳过。
- 迁移会写入显式的插件身份（`marketplaceName` 和 `pluginName`）；不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是唯一的全局启用开关；不存在 `plugins["*"]` 通配符或可授予任意安装权限的配置键。
- 非 curated 的 marketplace、缓存的插件包、hooks，以及 Codex 配置文件都会保留在迁移报告中供人工审查，不会自动激活。运行时接受手动配置的 `workspace-directory` 条目；其他 marketplace 仍不受支持。

## 应用清单与所有权

OpenClaw 通过 app-server 的 `app/list` 读取 Codex 应用清单，将其缓存到内存中一小时，并异步刷新过期或缺失的条目。该缓存仅限于进程本地；重启 CLI 或网关会清除它，OpenClaw 会在下一次读取 `app/list` 时重新构建缓存。

迁移和运行时使用不同的缓存键：

- 源迁移验证使用源 Codex home 和启动选项。它仅在 `--verify-plugin-apps` 下运行，并且会为该规划运行强制执行一次新的源 `app/list` 遍历。
- 目标运行时设置在构建线程应用配置时，使用目标代理的 Codex app-server 身份。策划的插件激活会使该目标缓存键失效，然后在 `plugin/install` 之后强制刷新它。
  `workspace-directory` 设置从不运行此激活路径。

只有当 OpenClaw 能通过稳定所有权将插件应用映射回已配置的插件时，才会公开该插件应用：来自插件详情的精确 app id、已知的 MCP 服务器名称，或唯一的稳定元数据。仅有显示名称或所有权存在歧义的情况会被排除，直到下一次清单刷新证明其所有权。

## 已连接的账户应用

由所有者运营的代理可以选择接入其 Codex 账户中已连接的每个应用，而无需匹配的插件包：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_all_plugins: true,
            allow_destructive_actions: "auto",
          },
        },
      },
    },
  },
}
```

`allow_all_plugins: true` 在建立新的原生 Codex 线程时会获取完整的 `app/list` 快照，并且只允许该账户被标记为可访问的应用。它不会全局安装、认证或启用应用。现有线程会保留其持久化的应用集合；请使用 `/new`、`/reset`，或重启网关，以获取新连接或已撤销的应用。

账户应用会继承全局的 `codexPlugins.allow_destructive_actions` 值，该值可接受 `true`、`false`、`"auto"` 或 `"ask"`。针对重叠应用 id 的显式按插件策略会覆盖全局策略。清单获取失败时会关闭失败，而不是回退到不受限制的默认值。

## 线程应用配置

OpenClaw 会为 Codex 线程注入一个受限的 `config.apps` 补丁：
`_default` 被禁用，且只有由已启用的已配置插件拥有的应用，或
被 `allow_all_plugins` 允许访问的账户应用，才会被启用。

每个应用上的 `destructive_enabled` 来自生效的全局或
按插件的 `allow_destructive_actions` 策略；`true`、`"auto"` 和 `"ask"`
都会将 `destructive_enabled` 设为 `true`，而 `false` 会将其设为 `false`。Codex 仍然
根据其原生应用工具注解强制执行破坏性工具元数据。
`_default` 使用 `open_world_enabled: false` 进行禁用；已启用的插件应用将
`open_world_enabled: true`。OpenClaw 不提供单独的
插件级 open-world 策略开关，也不维护按插件划分的破坏性工具名拒绝列表。

工具批准模式对已接纳的应用默认设为自动，因此非破坏性
读取工具可以在不触发同一线程批准提示的情况下运行。破坏性工具仍然
由各自应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

对已配置的 Codex 插件，默认允许破坏性插件请求；而不安全的 schema 和所有权不明确的情况则会关闭处理：

- 全局 `allow_destructive_actions` 默认值为 `true`。
- 每个插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- `false`：OpenClaw 返回确定性的拒绝。
- `true`：OpenClaw 仅对其能映射为批准响应的安全 schema 自动接受，例如布尔类型的 approve 字段。
- `"auto"`：OpenClaw 将破坏性插件操作暴露给 Codex，然后在返回 Codex 批准响应之前，把可证明具有所有权的 MCP 批准请求转换为 OpenClaw 插件批准。
- `"ask"`：OpenClaw 使用与 `"auto"` 相同的 Codex 写入/破坏性操作门控，在线程开始前清除该应用的持久化 Codex 按工具批准覆盖，并且只提供一次性的批准或拒绝，因此持久化批准不会抑制后续的写操作提示。对于每个采用 `"ask"` 的已接入应用，OpenClaw 会为该应用选择 Codex 的 human approvals 审核者，从而让 Codex 将其批准请求发送给 OpenClaw；其他应用以及非应用线程批准则保留其已配置的审核者和策略。
- 缺少插件身份、所有权不明确、turn id 缺失或不匹配，或者不安全的 elicitation schema 都会直接拒绝，而不是提示用户。

## 故障排查

| Code                                              | 含义                                                                                                                                 | 修复                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `auth_required`                                   | 迁移已安装该插件，但其某个应用仍需要身份验证。在你重新授权之前，该条目会以禁用状态写入。                                                            | 在 Codex 中重新授权该应用，然后在 OpenClaw 中启用该插件。                                                                |
| `app_inaccessible`, `app_disabled`, `app_missing` | 使用 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有已拥有的应用都处于存在、已启用且可访问状态。                                               | 在 Codex 中重新授权或启用该应用，然后使用 `--verify-plugin-apps` 重新运行迁移。                                         |
| `app_inventory_unavailable`                       | 请求了严格的源应用验证，但源 Codex 应用清单刷新失败。                                                                                             | 修复源 Codex app-server 访问，或在不使用 `--verify-plugin-apps` 的情况下重试，以接受更快的账户门控方案。                 |
| `codex_subscription_required`                     | 源 Codex app-server 账户不是 ChatGPT 订阅账户。                                                                                                 | 使用订阅认证登录 Codex 应用，然后重新运行迁移。                                                                         |
| `codex_account_unavailable`                       | 无法读取源 Codex app-server 账户。                                                                                                               | 修复源 Codex app-server 认证，或使用 `--verify-plugin-apps` 重新运行，让源应用清单决定是否符合条件。                    |
| `marketplace_missing`, `plugin_missing`           | 市场或精确插件不可用；显式的工作区目录请求可能被拒绝；工作区应用采用失败即关闭策略。                                                               | 验证下面描述的兼容 app-server 协议和精确 ID。                                                                           |
| `plugin_detail_unavailable`                       | OpenClaw 无法读取插件所有权详情。                                                                                                                | 检查目标 app-server 的 `plugin/list` 和 `plugin/read` 响应。                                                            |
| `plugin_disabled`                                 | Codex 报告该插件已安装但已禁用。                                                                                                                | 经过整理的激活可能会修复它；在重试之前先在 Codex 中启用一个工作区插件。                                                  |
| `plugin_activation_failed`                        | 插件激活未完成。                                                                                                                            | 使用附带的诊断信息区分市场、认证、刷新或工作区就绪性失败。                                                              |
| `app_inventory_missing`, `app_inventory_stale`    | 应用就绪性来自空缓存或过期缓存。                                                                                                                | OpenClaw 会自动安排异步刷新；在确认所有权和就绪性之前，插件应用会一直被排除。                                          |
| `app_ownership_ambiguous`                         | 应用清单仅通过显示名称匹配。                                                                                                                  | 在后续刷新证明所有权之前，该应用会继续对 Codex 线程隐藏。                                                               |

**工作区插件已安装但不可见：**确认工作区的
`plugin/list` 结果报告所配置的精确 ID 已安装且已启用，
然后确认 `app/list` 报告同一 Codex
账户下每个已拥有应用都可访问。即使账户清单当前报告该应用已禁用，OpenClaw 也可以为线程启用一个可访问的应用。如果你在网关缓存了应用
清单之后更改了该状态，请等待一小时的缓存刷新或重启网关，然后使用
`/new` 或 `/reset`。OpenClaw 不会修复或验证工作区插件。
如果显式的工作区列表请求被拒绝，每个已启用的工作区
条目都会报告 `marketplace_missing`; 其他未相关的整理条目仍会根据默认列表响应继续处理。

对于 `plugin_detail_unavailable`，无路径的工作区摘要必须包含
`remotePluginId`; 当该选择器或后续的
`plugin/read` 结果不可用时，OpenClaw 会将已拥有的应用隐藏。对于
`plugin_activation_failed`，整理后的插件可能会报告市场、认证或
安装后刷新失败。工作区插件在尚未处于活动状态时会报告此代码；请在 OpenClaw 之外安装、启用并认证它。

**配置已更改但代理无法看到插件：**运行 `/codex plugins
list` 以确认已配置状态，然后执行 `/new` 或 `/reset`。现有的
Codex 线程绑定会保留其启动时的应用配置，直到 OpenClaw 建立新的运行时会话或替换过时的绑定。

**拒绝了破坏性操作：**检查全局和每个插件的
`allow_destructive_actions` 值。即使设置为 `true`、`"auto"` 或 `"ask"`，
不安全的引导提取模式和不明确的插件身份仍会默认失败。

## 相关

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [配置参考](/gateway/configuration-reference#codex-harness-plugin-config)
- [迁移 CLI](/cli/migrate)
