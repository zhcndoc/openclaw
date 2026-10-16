---
summary: "为 Codex-mode OpenClaw 代理配置本机 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - "您希望 Codex-mode OpenClaw 代理使用本机 Codex 插件"
  - "你正在迁移从源安装的 openai-curated Codex 插件"
  - "你正在发现或安装 Codex 市场插件"
  - "你正在排查 codexPlugins、应用清单、破坏性操作或插件应用诊断问题"
  - "您需要 OpenClaw 策略、本机应用程序默认值和每个工具覆盖的优先级"
---

本机 Codex 插件支持允许 Codex-mode OpenClaw 代理在处理 OpenClaw 回合的同一 Codex 线程内使用 Codex 应用程序服务器自己的应用程序和插件功能。插件调用保留在本机 Codex 记录中； Codex 应用程序服务器拥有应用程序支持的 MCP 执行。 OpenClaw 不会将 Codex 插件转换为合成 `codex_plugin_*` OpenClaw 动态工具。

请在基础 [Codex 运行框架](/plugins/codex-harness) 已经可用之后再使用本页。

## <a id="requirements"></a> 要求

- 代理运行时必须是原生 Codex harness。
- `plugins.entries.codex.enabled` 必须为 `true`。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 `true`。
- Codex 应用程序服务器报告 `0.149.0` 或更新版本。官方插件附带 `@openai/codex` `0.160.1`，并且可以选择更新安装的 Codex；较新的自定义、远程和 macOS 桌面拥有的二进制文件继续出现兼容性警告和正常运行时验证。
- 目标 Codex app-server 必须能够看到预期的市场、插件和应用清单。
- 迁移仅支持在源 Codex home 中观察到的、从源安装的 `openai-curated` 插件。Codex 会以 `openai-api-curated` wire 名称向 API-key 和 Bedrock 账户提供相同的目录； OpenClaw 将这两个名称视为同一个精选目录，因此已配置的 `openai-curated` 插件可以从任一名称解析。
- 原生运行时还支持 Codex 已经可用的其他市场，例如 `openai-bundled`、`openai-primary-runtime`、 `workspace-directory`，以及当前仓库中的市场清单。 在所有者或 `operator.admin` 明确安装或启用其市场限定身份之前，插件仍然不可用。
- OpenClaw 从 Codex 线程中排除 `visualize@openai-bundled` 技能。该技能发出 Codex- 特定的内联可视化指令，而 OpenClaw 可视化在支持的表面上使用 `show_widget` 工具。

`codexPlugins` 对 OpenClaw-provider 运行、ACP 会话绑定或其他运行环境没有影响，因为这些路径从不会使用原生 `apps` 配置创建 Codex app-server 线程。

OpenAI-side Codex 帐户、应用程序可用性和工作区 app/plugin 控件来自已登录的 Codex 帐户。请参阅 [ 将 Codex 与 ChatGPT 计划结合使用 ](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) 了解 OpenAI 帐户和管理模型。

## <a id="quickstart"></a> 快速开始

源 Codex 主目录是您要从中迁移的 Codex CLI 状态目录：默认情况下为 `~/.codex`，或者设置该变量时为 `CODEX_HOME`。请参阅 [`openclaw migrate`](/cli/migrate) 以指向与 `--from` 不同的一个。

从源 Codex home 预览迁移：

```bash
openclaw migrate codex --dry-run
```

添加 `--verify-plugin-apps`，使迁移读取源已安装应用快照和应用元数据，并要求每个所属应用在规划原生激活之前都必须存在、已启用且可访问：

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
/codex plugins status security-review@company-tools
```

Codex 会从当前对话工作区中的 `.agents/plugins/marketplace.json` 发现仓库市场。在列出或安装其插件之前， 所有者不需要将该市场添加到 OpenClaw 配置中。官方 bundled、primary-runtime、精选、 工作区、共享和个人市场取决于已登录的 Codex 账户以及上游功能或管理员策略。 当 Codex 要求显式配置或允许市场来源时，这些要求仍然适用；OpenClaw 不会绕过它们。

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

安装命令会在调用 Codex `plugin/install` 之前检查经过身份验证的所有者或管理员。Codex 仍会继续执行市场来源、 工作区管理员、账户和连接器身份验证策略。需要 Codex 安装中间页的远程插件，或不会报告是否需要该中间页的远程插件， 必须先在 Codex 中安装；之后重新运行 OpenClaw 安装命令，以授权已经安装的插件。 当响应缺少准确的市场、插件身份、详细信息身份或应用就绪证据时，OpenClaw 会继续隐藏应用。 如果连接器需要额外登录，请先完成授权，然后再期待插件工具变得可用。

安装插件包和配置 OpenClaw 应用程序访问不会确认托管应用程序连接。当安装返回仍需要登录的应用程序时，OpenClaw 会在 ChatGPT**中提供指向 Codex 返回的应用程序页面的**Open &lt;app&gt; 链接。使用 Codex harness使用的相同 ChatGPT 帐户和工作区登录。打开链接不会验证连接或使其工具在当前对话中可调用。如果浏览器显示目录而不是应用程序，或者没有可用的安全链接，请在 Codex CLI 中运行 `/apps` 并在其中选择应用程序。响应最多显示五个应用程序链接，并明确报告要在 Codex CLI 中查看的其他应用程序。这些链接适用于托管 ChatGPT 应用程序；本机 MCP 服务器设置保持独立。

当您第一次使用某个应用程序的工具时，应用程序还可以请求登录。在 Control UI 中，选择 **打开链接** 以在单独的选项卡中打开请求的页面。当您登录时，问题仍处于待处理状态。完成浏览器步骤后，选择 **我已完成此步骤** 并提交以让 Codex 刷新并重试。单独打开链接不会恢复该工具或确认连接。没有链接操作的客户端仍会显示 URL，需要在应答前手动打开。

对于在活动 Codex 登录提示之外完成的设置，请刷新当前 Codex account/runtime 的托管应用程序清单：

```text
/codex plugins refresh
```

此刷新涵盖该运行时中的所有托管应用程序；它不是每个插件的后端刷新。插件的 **Refresh 托管应用程序** 按钮运行此命令。单独的 **Check status** 按钮仅检查该插件，而不刷新托管工具。这两个操作都不会更改授权或当前对话的应用程序策略。连接后使用 `/new` 或 `/reset`，然后检查新会话中的状态。

`codexPlugins` 更改后，新的 Codex 对话会自动选取更新的应用程序集。运行`/new`或`/reset`刷新当前会话。插件 enable/disable 更改不需要重新启动网关。

## <a id="scheduled-automations"></a> 定时自动化

当经过身份验证的所有者从 Codex 轮次创建自动化时，OpenClaw 会捕获在该确切的 Codex 线程上可调用的应用程序 ID 和批准限制。存储的权限与创建者准备的Codex个人资料和账户绑定。计划运行将该上限与当前 Codex 策略和应用程序可用性相交。他们永远不会获得新的应用程序 ID 或更广泛的破坏性、开放世界或批准上限。仅当存储的上限和当前策略允许时，稍后在已捕获的应用程序中添加的工具才可以运行。

定时应用调用是无人值守的。只有在任务创建时和运行时都明确允许的操作，才能在没有提示的情况下继续执行。仍然需要审批或信息收集的操作会被拒绝。账户发生变化、 运行时发生变化、应用被撤销、策略变得更严格或可用清单不可用时，会在应用执行前停止，并报告如何恢复访问权限或重新授权自动化。 模型回退无法将此权限转移到其他运行时或账户。

这条路径比普通的交互转弯更严格。 OpenClaw 根据当前工具元数据和捕获的权限生成每个工具的 `enabled` 和 `approval_mode` 值。显式本机 `enabled: true` 无法覆盖已捕获或当前的 destructive/open-world 对计划运行的限制。如果任何一方需要，批准交叉口保留`"prompt"`； `"approve"` 服从对方。将 `"auto"` 与 `"writes"` 组合会产生 `"prompt"`，因为它们的注释相关规则不是完全有序的。

在应用程序权限捕获之前​​创建的作业可以保留其普通的 OpenClaw 工具上限并继续非应用程序工作，但无法自动恢复 Codex 应用程序访问权限。仅从新的经过身份验证的所有者轮流重新创建或重新授权需要应用程序访问权限的作业。请参阅 [Automations](/automation/cron-jobs#codex-apps-in-scheduled-automations)。普通编辑保留捕获的应用程序权限。如果在没有新的经过验证的 Codex 权限捕获的情况下接受 `toolsAllow` 替换，则会清除该权限；下一次运行报告应用程序访问需要重新授权。来自新的经过身份验证的所有者的更新可以改为捕获并存储更新作业的新应用程序上限。调用者必须匹配作业的原始所有者会话和帐户，并显式替换 `toolsAllow`。没有新捕获的所有者更新会失败，并显示请求的工具名称和重新创建自动化的说明。管理人员仍然可以更换其他所有者的工具帽；这会清除捕获的应用程序权限，并且下次运行会报告应用程序访问需要重新授权。

## <a id="manage-plugins-from-chat"></a> 从聊天中管理插件

`/codex plugins` 会检查或更改你运行 Codex harness 的同一聊天中已配置的原生 Codex 插件：

```text
/codex plugins
/codex plugins list
/codex plugins available
/codex plugins available security
/codex plugins available --page 2
/codex plugins install security-review@company-tools
/codex plugins status security-review@company-tools
/codex plugins refresh
/codex plugins disable google-calendar
/codex plugins enable google-calendar
/codex plugins disable security-review@company-tools
```

`/codex plugins` 是 `/codex plugins list` 的别名。该列表显示每个配置的插件的密钥、on/off 状态、Codex 插件名称以及 `plugins.entries.codex.config.codexPlugins.plugins` 的市场。

`available [query] [--page <n>]` 需要所有者或 `operator.admin`。它使用绑定的工作区（包括存储库本地插件）读取 Codex 的市场目录，而无需安装或启用它们。搜索会在完整返回的目录中不区分大小写地匹配名称、显示标题、出版商、市场和描述，然后每页显示十个结果。 **下一页**和**上一页** 保留您的搜索；没有按钮的通道显示要发送的命令。搜索文本限制为 100 个字符。在包含 `--page` 的文字搜索文本之前使用 `--`。

结果显示由 Codex 提供的显示标题、出版商和说明，并为缺少的出版商或说明提供明确的占位符。他们保留市场资格的身份和可用性限制；显示标题和发布者名称不会更改安装标识。这将搜索 Codex 目录，而不是 OpenClaw 的插件注册表或每个 ChatGPT 连接。所有者范围的 `codex_plugins` 模型工具使用相同的搜索匹配，并且也是只读的：它可以推荐精确的安装命令，但无法安装、启用或添加市场。

`status <name>@<marketplace> [page]` 仅检查一个已配置的插件，并需要所有者或 `operator.admin`。需要合格的身份；裸 `status` 或非限定名称返回指向 `list` 的使用指南。

状态分别显示捆绑包安装、市场限制、Codex 启用和共享 OpenClaw 应用程序访问。对 OpenClaw 应用程序访问权限的更改将在下一条消息时生效；他们不安装或启用 Codex 捆绑包。

应用程序结果每页最多显示五个应用程序。 ChatGPT 应用程序页面链接需要确认的托管应用程序运行时支持、其目录策略下的可用插件以及来自 `app/read` 的匹配授权元数据。插件的应用程序声明或设置 URL 本身并不能建立该访问权限。当符合条件的 ChatGPT 页面仍然可用时，可以禁用 OpenClaw 应用程序访问；打开该页面不会启用 OpenClaw 应用程序访问。没有托管应用程序的插件不会收到 ChatGPT 连接或设置指南。 Status 不会评估他们的技能或本机 MCP 服务器准备情况。

所选代理、身份验证配置文件、对话工作区和帐户 email/plan 可用时会显示。当 Codex 不报告时，ChatGPT 工作区身份仍然未知；打开符合条件的托管应用程序页面时，在浏览器中使用相同的帐户和工作区。

状态使用 `app/read` 作为应用程序元数据，并显示 `app/installed` 返回的 `enabled` 和 `callable` 标志。运行时范围是绑定的 Codex 线程（如果可用），否则是帐户。这些标志反映了有效的 Codex 配置和当前运行时工具快照；它们与 OpenClaw 应用程序访问是分开的。状态不会推断单独的连接状态。丢失的应用程序记录和失败的读取会被明确报告，而不是成为错误标志。

`/codex plugins refresh` 需要所有者或 `operator.admin` 权限，并在选定的 Codex account/runtime. 中确认托管应用程序支持。它无需配置插件即可工作。它使运行时的 OpenClaw 应用程序缓存无效，使用 `forceRefresh: true` 而不使用 `threadId` 调用 Codex `app/installed`，并读取返回的应用程序的元数据。它不会刷新市场目录、重新安装插件包或重新加载本机 MCP 服务器。

刷新后，使用`/codex plugins status <name>@<marketplace>`检查一个插件。状态从不强制托管刷新。禁用或阻止的插件仍保持禁用或阻止状态，但不会阻止其他允许的托管刷新。

已完成的请求并不能证明 Codex 替换了其快照或实时工具调用将会成功。刷新永远不会安装、启用、验证或替换线程，也不会重新加载其他对话。连接后，使用`/new`或`/reset`再次检查状态。浏览器设置不会更改 OpenClaw 应用程序访问权限；本地应用程序访问更改将在下一条消息时生效。不支持的方法、取消和刷新失败提供重试操作，而不将先前的库存视为已确认。

`install`、`enable` 和 `disable` 要求所有者或具有 `operator.admin` 作用域的网关客户端。OpenClaw 保留的 `/codex` 命令会在代理调用之前分派，因此模型生成的推荐不算安装批准。 对于 Codex 尚未安装的插件，`install` 会调用 Codex app-server，并且只有在安装成功后才记录明确的插件策略。 如果 Codex 确认插件已经安装并启用，同一个命令会记录其授权，而不会再次安装。 `enable` 和 `disable` 会更改 OpenClaw 的持久化策略；限定身份和现有配置键均可接受。

安装或启用已配置的插件也会开启全局 `codexPlugins.enabled` 开关，但不会启用 `allow_all_plugins`。如果插件报告 `auth_required`，请在 Codex 中授权该应用，然后再开始新的对话。除非插件被禁用，或者上游账户或工作区撤销访问权限， 否则授权会对后续对话持续生效。

只安装你信任的插件。Codex 插件可以贡献 skills、应用、MCP 服务器和 hooks。 某些 hooks 可以参与权限决策，因此显式安装表示信任所选插件的代码；它不是安全审查，也不是隔离边界。

## <a id="how-native-plugin-setup-works"></a> 原生插件设置如何工作

集成跟踪三种状态：

| 状态      | 含义                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 已安装  | Codex 在目标应用服务器运行时中包含该插件 bundle。                                                                      |
| 已启用    | Codex 报告该插件已启用，且 OpenClaw 配置允许它用于 Codex harness 回合。                                           |
| 可访问 | Codex app-server 确认该插件的应用条目对当前账户可用，并映射到配置的插件身份。 |

对于 `openai-curated` 插件，迁移是持久的 install/eligibility 步骤：

- 在规划期间，OpenClaw 读取源 Codex `plugin/read` 详细信息并检查源 Codex 应用服务器帐户。 `codex_subscription_required` 表示 `account/read` 主动识别出 API-key 或其他非 ChatGPT 账户；帐户丢失并不能证明订阅不存在。
- 默认情况下，迁移会跳过源应用清单调用：通过账户门槛的、基于应用的源插件会在不验证源应用可访问性的情况下完成规划。账户缺失或 `account/read` 失败时，迁移会以 `codex_account_unavailable` 跳过这些插件。
- 使用 `--verify-plugin-apps` 时，迁移会获取最新的源 `app/installed` 快照，通过 `app/read` 获取经过身份验证的元数据，并要求每个所有者应用在源 Codex 账户中均已存在、启用且可访问，之后才会规划原生激活。 如果 `account/read` 缺失或失败，严格验证仍可通过源 app-server 配置的 bearer 或 header 身份验证来证明访问权限。已明确识别出的非 ChatGPT 账户仍然不符合资格。

对于来自任何已发现市场的明确批准的插件，OpenClaw 使用其 `plugin/installed` 快照和 `plugin/read` 详细信息来建立确切的市场合格身份和应用程序所有权。普通线程设置期间的仅安装检查是只读的；来自已禁用或未经批准的插件的应用程序仍被拒绝。所有者发布的安装是显式突变路径。所有权缺失或不明确会阻止帐户范围内的访问。

运行时应用程序清单是针对迁移的策划插件和手动配置的工作区插件的目标会话可访问性检查。在启用策略转向（包括热重用和冷恢复）之前，Codex harness会根据当前本机设置重建限制性线程应用程序策略，同时重用其应用程序清单和插件元数据缓存。

## <a id="support-boundary"></a> 支持边界

- 只有已经安装在源 Codex app-server 应用清单中的 `openai-curated` 插件才符合迁移条件。
- Runtime 支持来自 Codex- 发现的官方、工作区、个人、共享和存储库本地市场的明确批准的插件。缺少市场、插件、所有权详细信息或应用程序准备情况证据不会公开任何插件应用程序。
- 被明确识别为非 ChatGPT 的源账户无法通过订阅门槛。默认情况下，缺失或无法读取的源账户不可用。 `--verify-plugin-apps` 则可以通过经过身份验证的源应用清单建立访问权限，包括使用 bearer 或 header 身份验证的 app-server。 无法访问、已禁用或缺失的源应用，以及应用清单刷新失败，仍会被跳过并列为手动处理项。无法读取的插件详情会在应用清单门槛之前被跳过。
- 迁移会写入明确的插件身份（`marketplaceName` 和 `pluginName`）；不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是唯一的全局启用开关；不存在 `plugins["*"]` 通配符或授予任意安装权限的配置键。
- 迁移不会自动导入非精选市场、缓存的插件 bundle、hooks 或 Codex 配置文件。使用 `/codex plugins available` 和所有者发起的 `/codex plugins install <plugin>@<marketplace>` 命令， 选择加入其他已发现的插件。
- OpenClaw 不会在此流程中添加新的 Git 或本地市场来源。 其他来源必须已经在 Codex 中配置，或能够从绑定的仓库中发现。

## <a id="app-inventory-and-ownership"></a> 应用清单与所有权

OpenClaw 首先读取并缓存一个范围为目标 Codex 应用程序服务器和配置的工作区的 `plugin/installed` 快照。该快照涵盖了该范围内可见的市场插件，包括禁用的插件标识；失败或不完整的快照永远不会被缓存。同一运行时和工作区中的对话共享此元数据，并且所有者安装会使所有对话都无效。应用程序准备情况仍然特定于每个线程。 `plugin/read` 仅限于建立所有权所需的精确配置的插件详细信息。显式发现通过对话工作区查询 `plugin/list` 以查找存储库市场。例行设置保留其现有的策划恢复行为；额外的市场安装需要明确的所有者或管理员命令。

Codex拥有技能、钩子和MCP插件安装后刷新。OpenClaw刷新其插件和应用程序清单，而无需重新加载不相关的线程。使用`/new` or `/reset`如果有较旧的习俗Codex运行时不会使新安装的插件在现有对话中可用。

OpenClaw 通过 `app/installed` 读取已安装的应用程序运行时状态，并通过 `app/read` 批量获取当前应用程序元数据，最多 100 个应用程序 ID。第一次读取强制刷新冷安装的运行时快照。当安装多个配置的精选插件时，OpenClaw 将其缓存失效合并到单个应用程序清单刷新中。普通缓存读取不会强制为每个新线程刷新连接器。 OpenClaw 将组合库存在内存中缓存一小时，并异步刷新过时或丢失的条目。缓存是进程本地的；重新启动 CLI 或网关会将其丢弃。

缺少清单方法、身份验证错误、传输失败和连接器刷新失败不允许应用程序工具使用。当库存超过其启动预算时，普通轮次（包括使用 `allow_destructive_actions: "ask"` 的轮次）可以在禁用本机应用程序的情况下继续。如果捕获的应用程序策略无法在该预算内重新验证，计划的运行将停止。

迁移和运行时使用不同的缓存键：

- 源迁移验证使用源 Codex home 和启动选项。它仅在使用 `--verify-plugin-apps` 时运行，并会为该规划运行强制刷新源运行时快照和元数据读取。
- 目标运行时设置在构建和验证线程应用配置时，使用目标代理的 Codex app-server 身份。 精选插件激活会使该目标缓存键失效，然后在 `plugin/install` 后强制刷新。显式市场安装会刷新相同的目标运行时状态， 之后后续对话才能使用该插件。

只有当 OpenClaw 能通过稳定的所有权关系将插件应用映射回已配置的插件时，才会公开该插件应用：这可以依据插件详情中的精确 app id、已知的 MCP 服务器名称，或唯一的稳定元数据。仅有显示名称或所有权存在歧义的情况会被排除，直到下一次清单刷新证明其所有权。

丢失的插件和市场保留在保存的设置中以供将来发现，但从有效的运行时插件策略中省略。 OpenClaw 记录错误并继续使用健康的插件和连接的帐户应用程序。缺少条目的权限不适用于其他应用程序，即使它们的显示名称匹配也是如此。下次正常库存刷新时会重新考虑该条目；没有保存的设置被删除。发现被管理员禁用的插件保留其限制。

## <a id="connected-account-apps"></a> 已连接的账户应用

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

在清单中找到的明确禁用的配置插件会覆盖帐户范围的应用程序访问权限。由于 Codex `app/read` 省略了禁用的工作区插件的显示名称，因此 OpenClaw 使用其 `plugin/installed` 快照并仅读取该确切配置的插件的详细信息以保留其拥有的应用程序 ID。这种狭窄的只读检查不会发现不相关的市场、激活插件或授予其应用程序。如果无法确定禁用插件的所有权，则帐户范围内的应用程序选择将被阻止。

帐户应用继承全局 `codexPlugins.allow_destructive_actions` 值，该值接受 `true`、`false`、`"auto"` 或 `"ask"`。显式的每个插件策略会覆盖重叠应用程序 ID 的全局策略。库存故障会阻止帐户范围内的应用程序选择，而不是回退到不受限制的默认值。

## <a id="thread-app-config"></a> 线程应用配置

OpenClaw 会为 Codex 线程注入一个受限的 `config.apps` 补丁： `_default` 被禁用，且只有由已启用的已配置插件拥有的应用，或被 `allow_all_plugins` 允许访问的账户应用，才会被启用。

当 `_default` 被禁用时，应用程序可以安装和验证，但在帐户范围快照中不可调用。 OpenClaw 暂时只允许经过所有权验证、策略允许的应用程序，创建限制性线程，然后使用生成的线程 ID 和 `forceRefresh: false` 重新读取 `app/installed` 一次。如果快照报告应用程序丢失、禁用或不可调用，OpenClaw 会记录一条警告，列出不可用的应用程序，并继续使用其余工具。 Codex 仍然强制执行线程的有效应用程序、托管、工作区和工具策略。不可用的可选应用程序不会阻止不相关的聊天或心跳运行。

如果快照请求本身失败，则永远不会绑定或使用临时线程。 OpenClaw 删除失败的持久临时线程，取消订阅失败的临时线程，并在无法确认安全清理的情况下退出应用程序服务器连接。

每个应用程序上的 `destructive_enabled` 来自有效的全局或每个插件 `allow_destructive_actions` 策略； `true`、`"auto"`和`"ask"`均设置为`destructive_enabled: true`，`false`设置为`false`。 Codex 仍按以下顺序评估本机工具启用和注释。 `_default` 与 `open_world_enabled: false` 一起禁用；启用的插件应用程序获取 `open_world_enabled: true`。 OpenClaw 不公开单独的插件级开放世界策略旋钮，也不维护每个插件的破坏性工具名称拒绝列表。

## <a id="approval-decision-order"></a> 批准决定令

对于普通交互式 Codex 回合，请按顺序遵循以下决策：

1. **Admission：** OpenClaw 选择此线程上允许的 plugin/app 身份。不可用的库存或未经证实的所有权不会授予访问权限。
2. **线程配置：** OpenClaw 将其应用程序策略覆盖在目标应用程序服务器的本机配置上。 Codex 管理要求仍然适用。
3. **工具启用：** Codex 决定特定工具是否可调用。无法通过批准提示来调用已禁用的工具。
4. **审批模式和审核人：** Codex 决定呼叫是否需要审核以及是否使用其自动审核人或发送用户审批请求。
5. **OpenClaw 响应：** 当插件批准请求到达 OpenClaw 时，其引出桥应用有效的 `allow_destructive_actions` 值。

这些是单独的决定。`enabled: true`并不意味着自动批准，并且`approval_mode: "approve"`不启用已禁用的工具。OpenClaw动态工具，普通MCP表单和本机 shell 权限都有自己的流程；看[本机权限和MCP引出](/plugins/codex-harness-runtime/permissions)。

### <a id="which-configuration-owns-each-setting"></a> 哪个配置拥有每个设置

| 设置                                                                         | 所有者与用途                                                                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins.entries.codex.config.codexPlugins`                                     | OpenClaw 的准入和插件诱导政策。                                                                                                                  |
| `codexPlugins.allow_destructive_actions`                                        | 配置的插件和允许的帐户应用程序的共享 OpenClaw 默认值。                                                                                            |
| `codexPlugins.plugins.<key>.allow_destructive_actions`                          | 显式覆盖该配置的插件。                                                                                                                        |
| 本机 `apps._default`、`apps.<appId>` 和 `apps.<appId>.tools`                | 配置层和 OpenClaw 线程补丁组合后，Codex 应用程序默认值和每个工具设置。                                                     |
| `plugins.entries.codex.config.appServer.approvalPolicy` 和 `approvalsReviewer` | 一般 Codex 审批姿势和审核人，与 app/tool 政策不同。请参阅 [ 审批和沙箱模式](/plugins/codex-harness-reference/approval-and-sandbox)。 |

OpenClaw 将破坏性操作设置解析为：

```text
per-plugin value ?? codexPlugins shared value ?? true
```

省略每个插件的值会继承共享值。显式的 `false`、`true`、`"auto"` 和 `"ask"` 都会覆盖它。特别是，生成的每个插件 `"auto"` 会覆盖共享的 `false`； `"auto"` 是一个策略值，而不是要继承的指令。

共享默认值与插件条目位于相同的 OpenClaw 配置中。它不需要单独的主机范围配置文件。本机 Codex 设置属于运行工具的应用程序服务器：默认托管本地服务器使用代理范围的 Codex 主目录；远程服务器使用自己的配置。从 OpenClaw 或部署管理器启动 Codex 不会删除此本机配置层。 OpenClaw 的线程补丁不会重写已保存的本机设置。

### <a id="native-tool-enablement"></a> 原生工具支持

在 OpenClaw 的准入补丁之后，Codex 按以下顺序评估应用程序工具：

1. A 禁用的应用程序会阻止其所有工具，包括显式启用的工具。托管应用程序禁用仍然具有权威性。
2. 对于该工具，显式的 `apps.<appId>.tools.<tool>.enabled` 获胜。
3. 否则，显式 `apps.<appId>.default_tools_enabled` 获胜。
4. 否则，Codex 根据工具的注释检查 `destructive_enabled` 和 `open_world_enabled`。每个类别设置从应用程序回退到 `apps._default`，然后回退到 `true`。对于此资格检查，缺少注释将被视为 destructive/open-world。

对于工具配置，精确的工具名称条目胜过工具标题条目。 Codex 首先选择整个条目；它不会填充标题条目中缺失的字段。省略`enabled`继承； TOML 没有 `null` 值。

例如，在带有 `destructive_enabled: false` 的已获认可的应用程序上，省略的工具 `enabled` 会导致破坏性工具被阻止。显式 `enabled: true` 允许特定工具通过此本机资格检查，而 `enabled: false` 会阻止它，即使应用程序允许破坏性工具也是如此。该通话仍需通过批准和执行检查。这是应用程序默认设置的例外，而不是启用未经许可的应用程序或扩大计划权限的方法。

### <a id="native-approval-mode"></a> 原生审批模式

对于已启用的工具，Codex 选择第一个适用的审批模式：

1. 管理每个工具的批准要求。
2. 所选本机工具条目为 `approval_mode`。
3. 所选连接账户的`apps.<appId>.links.<linkId>.default_tools_approval_mode`。
4. `apps.<appId>.default_tools_approval_mode`.
5. `apps._default.default_tools_approval_mode`.
6. `"auto"`.

帐户链接是用于此呼叫的连接帐户，而不是 OpenClaw 对话。以下模式决定是否需要审核；他们本身并不承诺 OpenClaw 提示：

| 本机模式 | 审批要求                                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"approve"` | 没有工具批准请求。其他访问和执行限制仍然适用。                                                                                                                        |
| `"prompt"`  | 需要批准，包括只读工具。                                                                                                                                                     |
| `"writes"`  | 需要批准，除非该工具明确声明自身为只读。                                                                                                                               |
| `"auto"`    | 使用注释：明确的破坏性工具需要批准；否则显式只读工具不会。当 destructive/open-world 提示为真或缺失时，其余工具需要批准。 |

审阅者选择是单独的：连接帐户的审阅者优先于应用程序审阅者，然后是 `apps._default.approvals_reviewer`，然后是主题审阅者。 Codex 仅接受管理要求允许的已配置审阅者；否则它会使用线程审查器。自动审核的特定于模型的要求优先。当工具的模式会跳过严格的自动审查时，也可能需要进行审查。

除非 OpenClaw 策略明确为 `"ask"`，否则允许的应用程序保留其本机审批模式和审阅者，包括应用程序默认值和保存的帐户链接或工具覆盖。这也适用于恢复线程或询问 `/btw` 附带问题时。如果没有本机批准设置，Codex 会回退到 `"auto"`。

使用 OpenClaw `allow_destructive_actions: "auto"` 通过 OpenClaw 同意路由本机人工批准请求。具有 `"auto_review"` 审阅者的本机 `"prompt"` 保留在 Codex 的自动审阅流程中。 OpenClaw `true` 也保留本机模式，但自动接受到达桥的支持的批准请求，如下所述。

OpenClaw `"ask"` 还覆盖当前非只读工具 names/aliases 和连接帐户的已保存批准字段，选择本机 `"auto"` 和人工 app/account 审阅者。它保留了工具支持。如果工具摘要不可用，它将针对所有已保存的工具批准条目。因此，`"ask"` 需要一次性同意 Codex 发送审批的操作；它并不意味着每次读取都使用本机 `"prompt"`。其他应用程序保留其审阅者。

在普通的原生插件轮次和带有绑定应用程序的 `/btw` 旁问中，OpenClaw 启用 MCP 启发委托，即使一般 `appServer.approvalPolicy` 是 `"never"` ；这不会启用不相关的 shell 批准类别。应用程序模式、审阅者和桥梁响应仍然决定结果。一般批准策略不能替代上述每个 app/tool 设置。

## <a id="destructive-action-policy"></a> 破坏性操作策略

默认情况下，对于已配置的 Codex 插件，允许破坏性插件引出，而拒绝不安全的模式和不明确的所有权：

- 全局 `allow_destructive_actions` 默认值为 `true`。
- 每个插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- `false`：OpenClaw设置原生`destructive_enabled: false`；工具资格遵循上述本机默认值和显式例外。对符合条件的托管应用程序工具的批准请求仍需经过 OpenClaw 同意，包括允许的读取和 `/btw` 附带问题。该桥不会再次对工具进行分类，也不会一揽子拒绝他们的请求。插件提供的 MCP 服务器批准请求仍会收到自动拒绝。
- `true`：OpenClaw 仅对其能映射为批准响应的安全 schema 自动接受，例如布尔类型的 approve 字段。
- `"auto"`：OpenClaw 向 Codex 公开破坏性插件操作，然后将经过所有权证明的 MCP 批准引发转换为 OpenClaw 插件批准，然后返回 Codex 批准响应。
- `"ask"`：OpenClaw 使用与 `"auto"` 相同的 Codex write/destructive 门控，应用上述 tool/account 批准覆盖，并且仅提供一次性批准或拒绝。保存的本机设置保持不变，并且用户配置重新加载保留线程的批准策略。这些检查也会在重用线程或回答 `/btw` 附带问题之前运行。更改的覆盖键使用当前策略重建线程。
- 缺少插件身份、所有权不明确、turn id 缺失或不匹配，或者不安全的 elicitation schema 都会直接拒绝，而不是提示用户。

即使本机 Codex 设置启用了超出许可策略的应用程序，它们也会保持禁用状态。必须先验证本机设置，然后启用的策略才能允许应用程序工具。当没有应用程序可以被接纳时，Codex 的应用程序工具表面将被禁用，而不读取本机应用程序设置。禁用插件应用程序也会跳过应用程序清单发现。活动的遗留托管应用程序设置优先于本机线程配置并阻止应用程序准入；将这些应用程序设置移动到支持的用户或项目配置层。当地的行政要求仍然具有权威性。

### <a id="approval-examples"></a> 认证示例

假设有一个经过认可的、经过身份验证的应用程序，没有冲突的托管要求，并且有人工审核员来处理需要批准的呼叫。下面的读取工具声明 `readOnlyHint: true` 和 `destructiveHint: false`：

| 配置                                                                                 | 普通转弯时可观察到的结果                                                                                                                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenClaw 共享 `false`，每个插件 `"auto"`                                                  | 插件覆盖获胜。破坏性工具符合资格；达到 OpenClaw 请求同意的批准引发。                                                |
| OpenClaw `"auto"`，原生应用默认`"prompt"`，无tool/link覆盖，无损读取 | 原生 `"prompt"` 幸存下来。读取请求同意；允许一次允许呼叫，拒绝一次则阻止呼叫。                                                              |
| OpenClaw `"auto"`，本机读取工具`approval_mode: "prompt"`                                 | 每个工具模式仍然存在。读取请求同意；允许一次允许呼叫，拒绝一次则阻止呼叫。                                                              |
| OpenClaw `false`，原生应用默认`"prompt"`，无tool/link覆盖，无损读取  | 本机资格允许读取，并且 OpenClaw 请求同意。允许一次允许呼叫，拒绝一次则阻止呼叫。                                                  |
| OpenClaw `false`，破坏性工具明确`enabled: true`和`approval_mode: "approve"`  | 本机工具例外绕过类别默认值，并且不需要工具批准请求。桥的下降路径不是执行时间类别上限。 |
| OpenClaw `"ask"`，保存非只读工具认可`"approve"`                               | 线程覆盖用本机 `"auto"` 替换已保存的批准；需要批准的呼叫使用一次性同意。                                                  |

如果本机 `"prompt"` 示例中的审阅者是 `"auto_review"` 而不是 `"user"`，则 Codex 会执行自动审阅，而不是显示 OpenClaw 同意提示。审阅者的选择均未启用未通过资格检查的工具。

记住批准和显式启用是不同的设置。 Codex 的持久应用程序工具批准写入 `approval_mode: "approve"`，而不是 `enabled: true`；允许一次不会保留任何设置。在解释工具运行的原因或未出现提示的原因时，请重新检查两者。

## <a id="troubleshooting"></a> 故障排查

| 代码                                              | 含义                                                                                                                              | 修复                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `auth_required`                                   | 迁移已安装插件，但其中一个应用仍需要身份验证。该条目会以禁用状态写入，直到你重新授权。 | 在 Codex 中重新授权该应用，然后在 OpenClaw 中启用插件。                                                      |
| `app_inaccessible`, `app_disabled`, `app_missing` | 使用 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有所属应用均存在、已启用且可访问。         | 在 Codex 中重新授权或启用应用，然后使用 `--verify-plugin-apps` 重新运行迁移。                              |
| `app_inventory_unavailable`                       | 请求进行严格的源应用验证，但源 Codex 应用清单刷新失败。                                      | 修复源 Codex app-server 访问，或不使用 `--verify-plugin-apps` 重试，以接受更快的账户门控计划。   |
| `codex_subscription_required`                     | 源 app-server 明确识别出 API-key 或其他非 ChatGPT 账户。                                                 | 使用订阅身份验证登录 Codex 应用，然后重新运行迁移。                                                  |
| `codex_account_unavailable`                       | 源账户缺失，或未进行严格应用验证时 `account/read` 失败。                                             | 恢复源账户访问，或在经过身份验证的源应用清单可以证明访问权限时使用 `--verify-plugin-apps`。 |
| `marketplace_missing`, `plugin_missing`           | 确切的市场或配置的插件在安装的快照中不可用；插件应用程序被阻止。                        | 验证目标 app-server 的 `plugin/installed` 响应和准确的已配置插件身份。                       |
| `plugin_detail_unavailable`                       | OpenClaw 无法读取准确已配置插件的所有权详情。                                                             | 检查目标 app-server 的 `plugin/installed` 和 `plugin/read` 响应。                                        |
| `plugin_disabled`                                 | Codex 报告插件已安装但已禁用。                                                                                     | 在 Codex 中启用插件，或让所有者再次明确安装并授权它。                               |
| `plugin_activation_failed`                        | 插件激活未完成。                                                                                                  | 使用附带的诊断信息区分市场、身份验证、刷新或工作区就绪性故障。                |
| `app_inventory_missing`, `app_inventory_stale`    | 应用就绪状态来自空缓存或过期缓存。                                                                                     | OpenClaw 会自动安排异步刷新；在所有权和就绪状态明确之前，插件应用会继续被排除。  |
| `app_ownership_ambiguous`                         | 应用清单仅通过显示名称匹配。                                                                                          | 在后续刷新证明所有权之前，该应用会继续对 Codex 线程隐藏。                                     |

**Workspace 插件已安装但不可见：** 确认工作区 `plugin/installed` 快照报告已安装并启用的确切配置的 ID，然后确认 `app/installed` 返回同一 Codex 帐户的每个拥有的应用程序，并且 `app/read` 返回其元数据。仅由帐户范围默认设置禁用的应用程序可以在 OpenClaw 启动并验证其显式配置的线程后变得可调用。撤销身份验证、丢失元数据、禁用工作区插件以及 Codex 托管或工作区限制仍然会阻止访问。在启动新线程之前重新授权或修复这些上游条件。如果您在网关缓存应用程序清单后更改了该状态，请运行 `/codex plugins refresh`，然后使用 `/new` 或 `/reset`。 OpenClaw 不代表所有者对插件应用程序进行身份验证。

对于 `plugin_detail_unavailable`，请验证准确的已安装市场和插件身份能够选择匹配的 `plugin/read` 结果。当该选择器或所有权详情不可用时，OpenClaw 会继续隐藏已拥有的应用。对于 `plugin_activation_failed`，请检查市场、应用授权和安装后刷新诊断。 明确批准的插件必须已安装、已启用并完成身份验证，其应用才会出现在一个线程中。

**配置已更改但代理无法看到插件：**运行 `/codex plugins list` 以确认已配置状态，然后执行 `/new` 或 `/reset`。现有的 Codex 线程绑定会保留其启动时的应用配置，直到 OpenClaw 建立新的运行时会话或替换过时的绑定。

**破坏性操作被拒绝：**检查全局和每个插件的`allow_destructive_actions`值。即使使用 `true`、`"auto"` 或 `"ask"`，不安全的引出模式和不明确的插件标识仍然会被拒绝。

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [配置参考](/gateway/config-extensions#codex-harness-plugin-config)
- [迁移 CLI](/cli/migrate)
