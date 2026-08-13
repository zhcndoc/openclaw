---
summary: "为 Codex 模式的 OpenClaw 代理配置原生 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - 你希望 Codex 模式的 OpenClaw 代理使用原生 Codex 插件
  - 你正在迁移从源安装的 openai-curated Codex 插件
  - 你正在发现或安装 Codex 市场插件
  - 你正在排查 codexPlugins、应用清单、破坏性操作或插件应用诊断问题
---

原生 Codex 插件支持让 Codex 模式的 OpenClaw 代理在处理 OpenClaw 轮次时，使用同一个 Codex 线程中的 Codex
应用服务器自身的应用和插件能力。插件调用保留在原生 Codex 记录中；Codex 应用服务器负责基于应用的 MCP 执行。OpenClaw 不会把
Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

请在基础 [Codex 运行框架](/plugins/codex-harness) 已经可用之后再使用本页。

## 要求

- 代理运行时必须是原生 Codex harness。
- `plugins.entries.codex.enabled` 必须为 `true`。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 `true`。
- Codex app-server 必须准确报告稳定版本 `0.147.0`。官方插件附带
  `@openai/codex` `0.147.0`；自定义、远程和 macOS 桌面所有的二进制文件
  必须使用完全相同的版本。
- 目标 Codex app-server 必须能够看到预期的市场、插件和
  应用清单。
- 迁移仅支持在源 Codex home 中观察到的、从源安装的 `openai-curated` 插件。Codex 会以
  `openai-api-curated` wire 名称向 API-key 和 Bedrock 账户提供相同的目录；
  OpenClaw 将这两个名称视为同一个精选目录，因此已配置的
  `openai-curated` 插件可以从任一名称解析。
- 原生运行时还支持 Codex 已经可用的其他市场，例如 `openai-bundled`、`openai-primary-runtime`、
  `workspace-directory`，以及当前仓库中的市场清单。
  在所有者或 `operator.admin` 明确安装或启用其市场限定身份之前，插件仍然不可用。

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

添加 `--verify-plugin-apps`，使迁移读取源已安装应用
快照和应用元数据，并要求每个所属应用在规划原生激活之前都必须存在、已启用
且可访问：

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

迁移仍然仅限于 `openai-curated`。若要查找 Codex 已经可以看到的其他插件，请列出可用的市场目录，并安装准确的市场限定身份：

```text
/codex plugins available
/codex plugins install security-review@company-tools
```

Codex 会从当前对话工作区中的
`.agents/plugins/marketplace.json` 发现仓库市场。在列出或安装其插件之前，
所有者不需要将该市场添加到 OpenClaw 配置中。官方 bundled、primary-runtime、精选、
工作区、共享和个人市场取决于已登录的 Codex 账户以及上游功能或管理员策略。
当 Codex 要求显式配置或允许市场来源时，这些要求仍然适用；OpenClaw 不会绕过它们。

安装会写入类似以下内容的明确配置条目：

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
              "security-review@company-tools": {
                enabled: true,
                marketplaceName: "company-tools",
                pluginName: "security-review",
              },
            },
          },
        },
      },
    },
  },
}
```

安装命令会在调用 Codex `plugin/install` 之前检查经过身份验证的所有者或管理员。Codex 仍会继续执行市场来源、
工作区管理员、账户和连接器身份验证策略。需要 Codex 安装中间页的远程插件，或不会报告是否需要该中间页的远程插件，
必须先在 Codex 中安装；之后重新运行 OpenClaw 安装命令，以授权已经安装的插件。
当响应缺少准确的市场、插件身份、详细信息身份或应用就绪证据时，OpenClaw 会继续隐藏应用。
如果连接器需要额外登录，请先完成授权，然后再期待插件工具变得可用。

在 `codexPlugins` 变更后，新的 Codex 会话会自动获取更新后的
app 集。运行 `/new` 或 `/reset` 以刷新当前
会话。插件启用/禁用变更不需要重启 gateway。

## 定时自动化

当经过身份验证的所有者从 Codex 轮次创建自动化时，OpenClaw
会捕获该 Codex 线程中可调用的应用 ID 和审批上限。存储的权限绑定到创建者准备好的 Codex 配置文件和
账户。定时运行会将该上限与当前的 Codex 策略及应用可用性取交集。它们绝不会获得新的应用 ID，也不会获得更宽泛的破坏性操作、
开放世界操作或审批上限。对于已经捕获的应用中后来添加的工具，只有在存储的上限和当前策略均允许时才能运行。

定时应用调用是无人值守的。只有在任务创建时和运行时都明确允许的操作，才能在没有提示的情况下继续执行。仍然需要审批或信息收集的操作会被拒绝。账户发生变化、
运行时发生变化、应用被撤销、策略变得更严格或可用清单不可用时，会在应用执行前停止，并报告如何恢复访问权限或重新授权自动化。
模型回退无法将此权限转移到其他运行时或账户。

在捕获应用权限之前创建的任务可以保留其普通的 OpenClaw
工具上限并继续执行非应用工作，但无法自动恢复 Codex 应用访问权限。只有从新的、经过身份验证的所有者轮次中，重新创建或重新授权需要应用访问权限的任务。请参阅
[自动化](/automation/cron-jobs#codex-apps-in-scheduled-automations)。
普通编辑会保留已捕获的应用权限。在没有新的、经过身份验证的 Codex 权限捕获的情况下，显式替换任务的
`toolsAllow` 上限会清除此权限；下一次运行会报告应用访问权限需要重新授权。
从新的、经过身份验证的所有者轮次进行更新，则可以为更新后的任务捕获并存储新的应用上限。

## 从聊天中管理插件

`/codex plugins` 会检查或更改你运行 Codex harness 的同一聊天中已配置的原生 Codex 插件：

```text
/codex plugins
/codex plugins list
/codex plugins available
/codex plugins install security-review@company-tools
/codex plugins disable google-calendar
/codex plugins enable google-calendar
/codex plugins disable security-review@company-tools
```

`/codex plugins` 是 `/codex plugins list` 的别名。该列表会显示每个已配置插件的键、开关状态、Codex 插件名称，以及来自 `plugins.entries.codex.config.codexPlugins.plugins` 的市场来源。

`available` 会使用绑定的工作区读取 Codex 的市场目录，因此可以发现仓库本地插件，而无需启用它们。所有者范围的
`codex_plugins` 模型工具也是只读的：它可以推荐准确的安装命令，但不能安装、启用或添加市场。

`install`、`enable` 和 `disable` 要求所有者或具有
`operator.admin` 作用域的网关客户端。OpenClaw 保留的 `/codex` 命令会在代理调用之前分派，因此模型生成的推荐不算安装批准。
对于 Codex 尚未安装的插件，`install` 会调用 Codex app-server，并且只有在安装成功后才记录明确的插件策略。
如果 Codex 确认插件已经安装并启用，同一个命令会记录其授权，而不会再次安装。
`enable` 和 `disable` 会更改 OpenClaw 的持久化策略；限定身份和现有配置键均可接受。

安装或启用已配置的插件也会开启全局
`codexPlugins.enabled` 开关，但不会启用 `allow_all_plugins`。如果插件报告
`auth_required`，请在 Codex 中授权该应用，然后再开始新的对话。除非插件被禁用，或者上游账户或工作区撤销访问权限，
否则授权会对后续对话持续生效。

只安装你信任的插件。Codex 插件可以贡献 skills、应用、MCP 服务器和 hooks。
某些 hooks 可以参与权限决策，因此显式安装表示信任所选插件的代码；它不是安全审查，也不是隔离边界。

## 原生插件设置如何工作

集成跟踪三种状态：

| 状态       | 含义                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 已安装     | Codex 在目标应用服务器运行时中包含该插件 bundle。                                                                      |
| 已启用     | Codex 报告该插件已启用，且 OpenClaw 配置允许它用于 Codex harness 回合。                                           |
| 可访问     | Codex app-server 确认该插件的应用条目对当前账户可用，并映射到配置的插件身份。 |

对于 `openai-curated` 插件，迁移是持久化安装/资格判定
步骤：

- 在规划期间，OpenClaw 读取源 Codex 的 `plugin/read` 详情，并
  检查源 Codex app-server 账户。`codex_subscription_required`
  表示 `account/read` 已明确识别出 API 密钥或其他
  非 ChatGPT 账户；账户缺失并不能证明没有订阅。
- 默认情况下，迁移会跳过源应用清单调用：通过账户门槛的、基于应用的源
  插件会在不验证源应用可访问性的情况下完成规划。账户缺失或
  `account/read` 失败时，迁移会以 `codex_account_unavailable`
  跳过这些插件。
- 使用 `--verify-plugin-apps` 时，迁移会获取最新的源 `app/installed`
  快照，通过 `app/read` 获取经过身份验证的元数据，并要求每个
  所有者应用在源 Codex 账户中均已存在、启用且可访问，之后才会规划原生激活。
  如果 `account/read` 缺失或失败，严格验证仍可通过源 app-server 配置的
  bearer 或 header 身份验证来证明访问权限。已明确识别出的
  非 ChatGPT 账户仍然不符合资格。

对于来自任何已发现市场的明确批准插件，OpenClaw 使用其
`plugin/installed` 快照和 `plugin/read` 详情来确定准确的市场限定身份和应用所有权。普通线程设置期间的仅安装检查是只读的；
已禁用或未批准插件中的应用仍然会被拒绝。所有者发起的安装是明确的变更路径。所有权缺失或存在歧义时会安全失败，而不是授予账户范围的访问权限。

运行时应用清单是已迁移的精选插件和手动配置的工作区插件的目标会话可访问性检查。Codex
harness 会话设置会基于已启用且可访问的插件应用计算一个受限的线程应用配置；它不会在每一轮都重新计算，因此
`/codex plugins enable`/`disable` 只会影响
新的 Codex 对话。使用 `/new` 或 `/reset` 来让当前对话
获取该变更。

## 支持边界

- 只有已经安装在源 Codex app-server 应用清单中的 `openai-curated` 插件才符合迁移条件。
- 运行时支持来自 Codex 发现的官方、工作区、个人、共享和仓库本地市场中的明确批准插件。缺少
  市场、插件、所有权详情或应用就绪证据时，不会公开任何插件应用。
- 被明确识别为非 ChatGPT 的源账户无法通过订阅门槛。默认情况下，缺失或无法读取的源账户不可用。
  `--verify-plugin-apps` 则可以通过经过身份验证的源应用清单建立访问权限，包括使用 bearer 或 header 身份验证的 app-server。
  无法访问、已禁用或缺失的源应用，以及应用清单刷新失败，仍会被跳过并列为手动处理项。无法读取的插件详情会在应用清单门槛之前被跳过。
- 迁移会写入明确的插件身份（`marketplaceName` 和
  `pluginName`）；不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是唯一的全局启用开关；不存在
  `plugins["*"]` 通配符或授予任意安装权限的配置键。
- 迁移不会自动导入非精选市场、缓存的插件 bundle、hooks 或 Codex 配置文件。使用 `/codex plugins available`
  和所有者发起的 `/codex plugins install <plugin>@<marketplace>` 命令，
  选择加入其他已发现的插件。
- OpenClaw 不会在此流程中添加新的 Git 或本地市场来源。
  其他来源必须已经在 Codex 中配置，或能够从绑定的仓库中发现。

## 应用清单与所有权

OpenClaw 首先读取并缓存一个作用域限定于目标 Codex app-server 和已配置工作区的
`plugin/installed` 快照。该快照涵盖该作用域中可见市场的插件，包括已禁用的插件
身份；失败或不完整的快照绝不会被缓存。`plugin/read` 仅限于建立所有权所需的准确已配置插件详情。
显式发现会以对话工作区为参数查询 `plugin/list`，以查找仓库市场。
常规设置保留现有的精选恢复行为；其他市场的安装需要所有者或管理员发起的明确命令。

OpenClaw 通过 `app/installed` 读取已安装的应用运行时状态，并以每批最多 100 个应用 ID 的方式，通过 `app/read` 获取规范的应用元数据。首次读取会强制刷新冷启动的已安装运行时快照。当安装了多个已配置的精选插件时，OpenClaw 会将它们的缓存失效合并为一次应用清单刷新。普通的缓存读取不会因每个新线程而强制刷新连接器。OpenClaw 会将合并后的清单在内存中缓存一小时，并异步刷新过期或缺失的条目。该缓存仅限当前进程；重启 CLI 或网关会将其清除。

缺失的清单方法、身份验证错误、传输失败和连接器刷新失败都会采取安全失败策略。

迁移和运行时使用不同的缓存键：

- 源迁移验证使用源 Codex home 和启动选项。它仅在使用
  `--verify-plugin-apps` 时运行，并会为该规划运行强制刷新源运行时快照和元数据读取。
- 目标运行时设置在构建和验证线程应用配置时，使用目标代理的 Codex app-server 身份。
  精选插件激活会使该目标缓存键失效，然后在
  `plugin/install` 后强制刷新。显式市场安装会刷新相同的目标运行时状态，
  之后后续对话才能使用该插件。

只有当 OpenClaw 能通过稳定的所有权关系将插件应用映射回已配置的插件时，才会公开该插件应用：这可以依据插件详情中的精确 app id、已知的 MCP 服务器名称，或唯一的稳定元数据。仅有显示名称或所有权存在歧义的情况会被排除，直到下一次清单刷新证明其所有权。

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

`allow_all_plugins: true` 会在建立新的原生 Codex 线程时读取已安装的应用快照和已认证的元数据。它只会接纳账户可访问的应用。Codex 还必须确认每个被接纳的应用都已为该线程启用且可调用。OpenClaw 不会全局安装、认证或启用应用。现有线程会保留其已持久化的应用集合；使用 `/new`、`/reset` 或重启网关来获取新连接或已撤销的应用。

显式禁用的已配置插件始终会覆盖账户范围的应用访问权限。由于 Codex `app/read` 不会提供已禁用工作区插件的显示名称，OpenClaw 会使用其 `plugin/installed` 快照，并仅读取该确切已配置插件的详细信息，以保留其所拥有的应用 ID。此项范围狭窄的只读检查不会发现无关的市场应用、激活该插件或授予其应用权限。如果无法确认已禁用插件的所有权，账户范围的应用选择将默认拒绝。

账户应用会继承全局的 `codexPlugins.allow_destructive_actions` 值，该值可接受 `true`、`false`、`"auto"` 或 `"ask"`。针对重叠应用 id 的显式按插件策略会覆盖全局策略。清单获取失败时会关闭失败，而不是回退到不受限制的默认值。

## 线程应用配置

OpenClaw 会为 Codex 线程注入一个受限的 `config.apps` 补丁：
`_default` 被禁用，且只有由已启用的已配置插件拥有的应用，或
被 `allow_all_plugins` 允许访问的账户应用，才会被启用。

应用可以已安装并完成身份验证，但在 `_default` 被禁用时，仍可能无法在账户级快照中调用。OpenClaw 仅临时接纳所有权已得到证明且符合策略要求的应用，创建受限线程，然后使用生成的线程 ID 和
`forceRefresh: false` 再次读取一次 `app/installed`。在继续处理当前轮次之前，Codex 必须确认每个已接纳的应用在该线程的有效应用、托管、工作区和工具策略下均已启用且可调用。如果该证明失败，临时线程将永远不会被绑定或使用。OpenClaw 会删除失败的持久临时线程，取消订阅失败的临时线程；如果无法确认安全清理，则会停用应用服务器连接。

每个应用的 `destructive_enabled` 来自有效的全局或插件级
`allow_destructive_actions` 策略；`true`、`"auto"` 和 `"ask"`
都会将 `destructive_enabled: true`，而 `false` 会将其设为 `false`。Codex 仍会根据其原生应用工具注解强制执行破坏性工具元数据。
`_default` 通过 `open_world_enabled: false` 被禁用；已启用的插件应用会获得 `open_world_enabled: true`。OpenClaw 不提供单独的插件级开放世界策略开关，也不维护按插件划分的破坏性工具名称拒绝列表。

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

| 代码                                              | 含义                                                                                                                                 | 修复                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `auth_required`                                   | 迁移已安装插件，但其中一个应用仍需要身份验证。该条目会以禁用状态写入，直到你重新授权。 | 在 Codex 中重新授权该应用，然后在 OpenClaw 中启用插件。                                                      |
| `app_inaccessible`、`app_disabled`、`app_missing` | 使用 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有所属应用均存在、已启用且可访问。         | 在 Codex 中重新授权或启用应用，然后使用 `--verify-plugin-apps` 重新运行迁移。                              |
| `app_inventory_unavailable`                       | 请求进行严格的源应用验证，但源 Codex 应用清单刷新失败。                                      | 修复源 Codex app-server 访问，或不使用 `--verify-plugin-apps` 重试，以接受更快的账户门控计划。   |
| `codex_subscription_required`                     | 源 app-server 明确识别出 API-key 或其他非 ChatGPT 账户。                                                 | 使用订阅身份验证登录 Codex 应用，然后重新运行迁移。                                                  |
| `codex_account_unavailable`                       | 源账户缺失，或未进行严格应用验证时 `account/read` 失败。                                             | 恢复源账户访问，或在经过身份验证的源应用清单可以证明访问权限时使用 `--verify-plugin-apps`。 |
| `marketplace_missing`、`plugin_missing`           | 已安装快照中不存在准确的市场或已配置插件；插件应用安全失败。                        | 验证目标 app-server 的 `plugin/installed` 响应和准确的已配置插件身份。                       |
| `plugin_detail_unavailable`                       | OpenClaw 无法读取准确已配置插件的所有权详情。                                                             | 检查目标 app-server 的 `plugin/installed` 和 `plugin/read` 响应。                                        |
| `plugin_disabled`                                 | Codex 报告插件已安装但已禁用。                                                                                     | 在 Codex 中启用插件，或让所有者再次明确安装并授权它。                               |
| `plugin_activation_failed`                        | 插件激活未完成。                                                                                                  | 使用附带的诊断信息区分市场、身份验证、刷新或工作区就绪性故障。                |
| `app_inventory_missing`、`app_inventory_stale`    | 应用就绪状态来自空缓存或过期缓存。                                                                                     | OpenClaw 会自动安排异步刷新；在所有权和就绪状态明确之前，插件应用会继续被排除。  |
| `app_ownership_ambiguous`                         | 应用清单仅通过显示名称匹配。                                                                                          | 在后续刷新证明所有权之前，该应用会继续对 Codex 线程隐藏。                                     |

**工作区插件已安装但不可见：**确认工作区
`plugin/installed` 快照报告准确的已配置 ID 已安装且已启用，然后确认
`app/installed` 返回同一个 Codex 账户所拥有的每个应用，并且 `app/read` 返回其元数据。仅由账户范围默认设置禁用的应用，
可以在 OpenClaw 启动并验证其明确配置的线程后变得可调用。已撤销的身份验证、缺失的元数据、已禁用的工作区插件以及 Codex
托管或工作区限制仍会阻止访问。请在开始新线程前重新授权或修复这些上游条件。如果你在网关缓存应用清单后更改了该状态，请等待一小时缓存刷新或重启网关，然后使用 `/new` 或
`/reset`。OpenClaw 不会代表所有者对插件应用进行身份验证。

对于 `plugin_detail_unavailable`，请验证准确的已安装市场和插件身份能够选择匹配的
`plugin/read` 结果。当该选择器或所有权详情不可用时，OpenClaw 会继续隐藏
已拥有的应用。对于 `plugin_activation_failed`，请检查市场、应用授权和安装后刷新诊断。
明确批准的插件必须已安装、已启用并完成身份验证，其应用才会出现在一个线程中。

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
