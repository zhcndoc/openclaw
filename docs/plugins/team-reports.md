---
summary: "来自 GitHub 活动和 Discord 讨论的每日、每周和每月团队报告"
read_when:
  - "您正在安装、启用或配置团队报告插件"
  - "您想要 Control UI 中的团队活动报告"
  - "您需要生成、导出存储的团队报告或对其进行故障排除"
title: "团队报告插件"
---

团队报告将 GitHub 组织活动和可选的 Discord 讨论收集到每日、每周和每月报告中。它在网关上保留报告历史记录，并将 **Reports** 选项卡添加到 [Control UI](/web/control-ui)。报告包括活动计数、每人历史记录、来源警告和可选的模型编写摘要。

Team Reports 是一个官方外部软件包：它不是核心 `openclaw` npm 软件包的一部分，而是根据需要从 ClawHub 或 npm 安装。存储库的源签出直接从 `extensions/team-reports` 加载它。在您启用它之前，它会保持禁用状态。报告页面使用网关身份验证。他们的默认HTTP路由是`/plugins/team-reports/`； Control UI 选项卡在 `/reports` 处打开，前缀为任何配置的 Control UI 基本路径。

## <a id="before-you-begin"></a> 开始之前

您需要一个 GitHub 令牌来读取您配置的组织、存储库和团队成员资格。集合只能包含令牌可以访问的数据。对于 Discord，使用可访问所选公会、频道、线程和消息历史记录的机器人令牌。仅显式配置的通道及其线程才计数。

支持细粒度 GitHub 令牌。问题搜索始终指定 `is:issue` 或 `is:pull-request`，合并搜索仅限于拉取请求。

模型编写的摘要使用代理配置的模型和凭据。发送到该模型的证据可以包括存储库活动和选择加入的 Discord 摘录。设置 `summaries.enabled: false` 以生成具有固定模板文本且无摘要模型调用的报告。

## <a id="install-and-enable-team-reports"></a> 安装并启用团队报告

安装该软件包，除非您从已包含该软件包的源签出运行网关：

```bash
openclaw plugins install @openclaw/team-reports
```

然后将以下内容添加到您的 OpenClaw 配置中，用您自己的组织、团队和登录名替换示例组织、团队和登录名：

```json5
{
  plugins: {
    entries: {
      "team-reports": {
        enabled: true,
        config: {
          github: {
            token: {
              source: "env",
              provider: "default",
              id: "TEAM_REPORTS_GITHUB_TOKEN",
            },
            orgs: ["example-org"],
            teams: [{ org: "example-org", slug: "maintainers" }],
          },
          people: [{ github: ["example-member"], display: "Example Member" }],
          summaries: { enabled: false },
        },
      },
    },
  },
}
```

使引用的环境变量可供网关进程使用。有关其他秘密提供者，请参阅 [ 秘密管理](/gateway/secrets)。如果您使用 `plugins.allow`，请将 `team-reports` 包含在该列表中。

插件配置更改会自动应用默认的混合重新加载模式。如果网关处于离线状态，请使用其配置的可用机密启动它。如果更改了其进程环境，请使用更新后的环境重新启动它。然后检查插件：

```bash
openclaw team-reports status --json
openclaw dashboard
```

启动不会触发报告作业。第一次计划运行收集昨天的已关闭报告和今天的部分报告，以及启动前一天（当该运行在下一个 UTC 午夜之后发生时），重用来自同一组织范围的健康的已关闭每日报告。这也可以恢复部分失败的运行，而无需重新收集接受的关闭天数。手动生成仍然刷新请求的日期。周和月报告使用存储的日常活动。收集和聚合在工作线程中运行，并在插件的 SQLite 连接中暂存有界批次。当该连接关闭时，Scratch 活动就会消失；已接受的报告历史记录和保留不变。

状态显示运行、存储周期、下一个计划时间和源警告。要立即请求报告，请使用：

```bash
openclaw team-reports generate --intraday
```

在记录运行之后、收集和汇总完成之前，生成返回运行 ID。检查 `status` 的结果，然后打开 Control UI 中的 **Reports**。

## <a id="read-reports-in-the-control-ui"></a> 阅读 Control UI 中的报告

对于已启用的插件以及与 `operator.read` 的 Control UI 连接，将显示 **Reports** 选项卡。它将报告页面嵌入沙盒框架中。网关提供并更新范围内的身份验证 cookie；没有网关令牌添加到报告 URL。

每条报告路由需要`operator.read`； `operator.write` 和 `operator.admin` 也满足该要求。 Control UI 选项卡通过其作用域 cookie 授予 `operator.read`。 CLI 的网关 RPC 方法已声明其所需的读取或生成范围。

使用 HTTPS、[Tailscale Serve](/gateway/tailscale) 或浏览器信任的环回源。 LAN 主机名上的普通 HTTP 无法验证该帧。阻止所有第三方 cookie 的浏览器也可能使该选项卡不可用。

GitHub 和其他外部链接可能无法在沙盒框架内打开。每个页面都包含 **在新窗口中打开** 以及该页面自己的 URL。如果浏览器也阻止该操作，请将链接复制到新选项卡中。网关身份验证仍然适用于此。

### <a id="work-sessions"></a> 工作会话

概述显示此网关上最近的 **工作会话**。打开 **所有工作会话**（或报告导航中的 **工作会话**）以翻阅当前会话列表。每个条目都链接到对话并显示其当前所有者、运行状态和项目（如果存在）。会话按最近的活动排序。

每个人的历史记录页面以及每日、每周和每月报告中的每个成员部分还显示 **当前工作/拥有的会话**，包括按人员过滤报告时。这些直接对话链接反映当前所有权，而不是历史报告窗口。 **所有拥有的会话** 打开一个分页目录，在分页之前过滤到该成员。

成员使用其配置和报告的 GitHub 别名与网关配置文件上链接的 GitHub 身份进行不区分大小写的匹配。合并的配置文件解析为其主要所有者。未链接或不明确的身份与链接成员分开标记，您看不到任何会话。显示名称绝不会用于推断所有权。

当您使用现有会话权限打开或刷新页面时，会读取该列表。已存档、隐身、自动化、系统和隐藏的子代理会话被排除在外。无法从 GitHub 句柄或显示名称猜测会话所有者。这是当前工作视图，而不是历史贡献计数：它不会更改每日总计、模型摘要、Markdown 或 JSON 导出或存储的报告历史记录。会话记录不会复制到报告数据库中。

在 Control UI 内，选择一个会话可通过主机导航打开其聊天。在嵌入选项卡之外，会话链接是普通的 Control UI 链接。如果会话发现失败，页面将显示 **工作会话不可用**，而存储的报告仍然可用。

页面反映了维护者报告站点布局：横幅和活动日期线、最新时期的快速卡、day/week/month 历史记录、人员时间表和每人日历。生成面板显示调度程序和源运行状况。封闭期和部分期仍然不同，报告旁边有报道范围和摘要警告。

主题选择将跟随您通过页面片段（`#theme=light` 或 `#theme=dark`）进行选项卡内导航。在沙盒报告选项卡内，它持续到该访问。仅当存储可用时（例如在单独的窗口中），它才会在每个浏览器中持续存在。页面首先从片段中选择主题，然后是浏览器存储（如果可用），然后是操作系统的浅色或深色首选项，与 Control UI 主题无关。

相对时间和开放日倒计时通过内容安全策略允许随机数的小型内联脚本进行刷新。相同的脚本支持历史记录切换、成员过滤和安静成员切换。在没有 JavaScript 的情况下，页面仍然可以工作：所有历史记录行和成员仍然可用，并且时间戳具有服务器呈现的回退。

螃蟹艺术品和图标由插件自己的 `assets` 路由提供，与报告页面具有相同的身份验证和范围检查。这些资产使用私人一日缓存；报告页面和导出保持未缓存。

名册成员和其他 GitHub 演员使用主要 GitHub 登录名显示来自 `avatars.githubusercontent.com` 的 GitHub 化身。图像延迟加载而不发送引荐来源网址。当图像无法加载时，缩写仍然可见；无效登录仅使用缩写。显示名称和 Discord ID 绝不会用于构造头像 URL。这些页面捆绑了它们的样式并使用系统字体，因此不需要外部样式表、Web 字体或脚本。

## <a id="configuration"></a> 配置

以下所有密钥均位于 `plugins.entries.team-reports.config` 下。未知的密钥将被拒绝。配置更改使用默认的混合重新加载模式重新加载正在运行的插件；请参阅 [ 热重载 ](/gateway/configuration/hot-reload)。当报表服务启动时，机密就会解析。旋转文件、执行或存储机密后，运行 `openclaw plugins reload team-reports`。环境更改需要使用更新的环境重新启动网关。

| 键               | 默认值                   | 行为                                                                                                                                                                                                                                                               |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basePath`        | `"/plugins/team-reports"` | 使用字母、数字、`.`、`_` 和 `-` 的非空路径段的绝对路由根。它不得使用 `.` 或 `..` 段、`/api/channels` 前缀，也不得等于或位于显式配置的 Control UI 基本路径之下。尾随斜杠被标准化。 |
| `displayTimezone` | `"UTC"`                   | 显示时间戳的 IANA 时区。报告窗口始终使用 UTC。                                                                                                                                                                                                 |
| `github`          | 必填                  | GitHub 采集配置，如下所述。                                                                                                                                                                                                                      |
| `discord`         | 未设置                     | 可选Discord采集配置。省略它仅收集 GitHub。                                                                                                                                                                                             |
| `people`          | 未设置                     | 内联身份条目。与 `peopleFile` 互斥。                                                                                                                                                                                                         |
| `peopleFile`      | 未设置                     | 常规 JSON 文件的绝对路径，最多 2 个 MiB，形状为 `{ "people": [...] }` 并使用下面的标识字段。                                                                                                                                            |
| `summaries`       | 默认值如下            | 模型选择和摘要启用。                                                                                                                                                                                                                                |
| `schedule`        | 默认值如下            | UTC 收集时间和聚合刷新。                                                                                                                                                                                                                          |
| `retention.days`  | `400`                     | 关闭日运行后删除超过此天数的存储报告； `0` 保留所有历史记录。                                                                                                                                                                          |

### GitHub

| 键                                 | 默认值                    | 行为                                                                                                                                  |
| ----------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `github.token`                      | 必填                   | 非空标记字符串或 SecretRef `{ source, provider, id }`。秘密来源是 `env`、`file`、`exec` 和 `store`。更喜欢 SecretRef。 |
| `github.orgs`                       | 必填                   | 要收集的组织名称的非空数组。                                                                                          |
| `github.teams`                      | `[]`                       | 名册来源形状为 `{ org, slug }`。                                                                                                 |
| `github.includeDirectCollaborators` | `false`                    | 添加对名册具有推送、维护或管理访问权限的直接存储库协作者。                                                   |
| `github.excludeRepos`               | `[]`                       | 要跳过的 `owner/name` 形式的存储库名称。存档存储库也会被跳过。                                                    |
| `github.apiBaseUrl`                 | `"https://api.github.com"` | HTTPS API 底座 URL；为 GitHub Enterprise Server 设置此项。                                                                                |
| `github.ignoreCommentPatterns`      | `[]`                       | 正则表达式源字符串。排除匹配的问题评论和 PR 审阅评论。无效模式将被拒绝。            |

### Discord

以下是可选的部分配置示例。 ID 是说明性的：

```json5 validate=false
discord: {
  token: {
    source: "env",
    provider: "default",
    id: "TEAM_REPORTS_DISCORD_TOKEN",
  },
  guildId: "123456789012345678",
  channels: [
    { id: "234567890123456789", excerpts: true },
    { id: "345678901234567890" },
  ],
  excerptMaxChars: 260,
},
```

| 键                           | 默认值                             | 行为                                                                                                                    |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `discord.token`               | 配置 Discord 时需要 | 机器人令牌字符串或 SecretRef ，其形状与 `github.token` 相同。                                                        |
| `discord.guildId`             | 配置 Discord 时需要 | 公会ID。                                                                                                                   |
| `discord.channels`            | 配置 Discord 时需要 | 通道条目的非空数组，每个条目都有一个 `id` 和可选的 `excerpts`。他们的线程也很重要。                     |
| `discord.channels[].excerpts` | `false`                             | 在报告和摘要证据中包括有限的消息摘录。当这是 `false` 时，消息计数仍然会起作用。 |
| `discord.excerptMaxChars`     | `260`                               | 每个摘录的最大字符数；从 `1` 到 `4000` 的整数。                                                             |

### <a id="people-and-identity"></a> 人物和身份

该名册包含 GitHub 团队成员、活动身份条目以及启用后的直接协作者。使用身份条目加入某人的 GitHub 别名和 Discord 用户 ID：

```json5 validate=false
people: [
  {
    github: ["example-member", "example-member-old"],
    display: "Example Member",
    affiliation: "Example Company",
    roleGroup: "core",
    roleLabel: "Maintainer",
    access: ["release"],
    areas: ["documentation"],
    discordUserId: "456789012345678901",
    discordUsername: "example-member",
    status: "active",
  },
],
```

| 字段             | 必需的 | 行为                                                                                                                                      |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `github`          | 是      | 非空登录数组。首次登录为主要身份；其余登录名是别名。                                                  |
| `display`         | no       | 显示名称；默认为主登录。                                                                                                  |
| `affiliation`     | no       | 可选的附属标签。                                                                                                                   |
| `roleGroup`       | no       | 组标签，例如`core`、`volunteer`或`readonly`；接受自定义字符串。                                                         |
| `roleLabel`       | no       | 人类可读的角色标签。                                                                                                                    |
| `access`          | no       | 自由格式标签，例如 `release` 或 `moderation`；默认为空列表。这些标签不授予权限。                        |
| `areas`           | no       | 所有权领域；默认为空列表。                                                                                                   |
| `discordUserId`   | no       | Discord 用于将消息归属于此人的身份。                                                                                   |
| `discordUsername` | no       | 可选的 Discord 用户名元数据。                                                                                                           |
| `status`          | no       | `active` 或 `archived`；省略的条目处于活动状态。已存档的人员将从当前报告中排除，而存储的历史记录仍然可用。 |
| `archivedAt`      | no       | 存档日期采用 `YYYY-MM-DD` 形式。                                                                                                            |

### <a id="summaries"></a> 总结

| 键                   | 默认值 | 行为                                                                                                                                                    |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summaries.enabled`   | `true`  | 生成模型编写的概述、亮点和每人摘要。 `false` 使用固定模板后备文本。                                           |
| `summaries.model`     | 未设置   | 请求`provider/model`参考；否则使用目标代理的默认模型。需要以下主机策略才能生效。                        |
| `summaries.reasoning` | 未设置   | 要求的思维水平：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 或 `ultra`。主机将其标准化为所选模型。 |
| `summaries.agentId`   | 未设置   | 使用其模型和凭证的代理。跨代理选择受主机的 `llm.allowAgentIdOverride` 策略的约束。                               |

要允许配置汇总模型，请设置 `plugins.entries.team-reports.llm.allowModelOverride: true`。 `llm` 对象是 `config` 的同级对象，而不是其中的字段：

```json5 validate=false
"team-reports": {
  enabled: true,
  llm: { allowModelOverride: true },
  config: {
    // Keep your github and identity configuration here.
    summaries: {
      enabled: true,
      model: "openai/gpt-5.6-sol",
      reasoning: "high",
    },
  },
},
```

如果没有选择加入，团队报告将使用目标代理的默认模型。主机模型允许列表仍然适用。有关这些策略，请参阅 [ 插件 LLM 运行时](/plugins/sdk-runtime)。

摘要以有限的证据摘要为基础：总数、主要存储库和渠道、选定的活动项目以及选择的摘录。它们描述观察到的活动，而不是推断绩效、就业或私人事实。安静的成员仍保留在报告中，并带有低活跃度注释。

该插件验证模型的 JSON 响应并重试一次以修复无效输出或丢失的成员。如果重试失败，它会保留收集的报告并显示带有可见后备横幅的固定模板摘要。产出预算与名册规模有关；失败的模型尝试包括报告中有限的、无凭据的原因、Markdown 导出、最新状态和网关日志。未更改的证据重用存储的摘要，而不是进行另一个模型调用。集合在汇总之前存储，这可能需要几分钟的时间。

### <a id="schedule"></a> 时间表

| 键                           | 默认值   | 行为                                                                                                             |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `schedule.enabled`            | `true`    | 运行自动收集和追赶。 `false` 保持存储的报告、工作会话和手动生成可用。 |
| `schedule.closedDayUtc`       | `"00:05"` | 抖动之前的每日运行时间为 `HH:MM` UTC。生成昨天的关闭报告和今天的部分报告。        |
| `schedule.intradayEveryHours` | `4`       | 刷新今天关于一致 UTC 小时边界的报告；从 `0` 到 `24` 的整数。 `0` 禁用盘中运行。         |
| `schedule.jitterMinutes`      | `5`       | 添加到计划运行的最大随机延迟；从 `0` 到 `59` 的整数。                                              |
| `schedule.weekly`             | `true`    | 每日采集后刷新当前 ISO 周聚合。                                                       |
| `schedule.monthly`            | `true`    | 每日收集后刷新当月聚合。                                                          |

要保留报告阅读器而不自动收集，请设置 `schedule.enabled: false`。状态报告 `scheduleEnabled: false` 和空 `nextDue` 对象。手动 `generate` 命令仍然可以收集请求的日期并刷新其配置的每周和每月聚合。此设置不会禁用插件或更改其源凭据要求。

一次仅执行一次运行。计划的工作等待活动运行；当另一个运行处于活动状态时，手动生成被拒绝。跑步有 45 分钟的截止时间。服务启动后自动收集至少等待五分钟。该窗口内的日内边界将被跳过；窗口内的休市运行将等待结束。后来的跑步保持平常的节奏。停止服务会取消其计时器，并等待最多 30 秒的活动工作，然后取消远程收集和汇总。任何已在进行的数据库操作和最终运行结果都会在存储关闭之前完成。

## <a id="understand-report-windows-and-counts"></a> 了解报告窗口和计数

每日窗口为 UTC 午夜至下一个 UTC 午夜，并有独占结束时间。今天的报告标记为 **partial**。 ISO 周从星期一开始，使用 `2026-W34` 等密钥；月份使用 `2026-08` 等密钥。 `displayTimezone` 仅更改时间戳标签，而不会更改哪个报告接收事件。

每周和每月报告汇总存储的每日报告。他们无法从 API 中回忆起同一时期的情况。缺少天数会产生源警告；在依赖汇总的完整性之前生成缺失的每日报告。当 UTC 日期跨越期间边界时，休市运行也会结束包含昨天的一周或一个月。

GitHub 合并活动记入合并 PR 的人员。每人一次对作者和每个映射的合著者进行信用承诺。同一演员和评论类型的相同评论在窗口内算一次。机器人活动被排除，非成员 GitHub 参与者仅单独显示计数。没有活动的成员仍然出现在名册中。

不收集拉取请求审核提交，包括批准和请求更改机构；包括内联评论意见。

Discord 总数包括未映射的作者，但不匹配的条目仅包含作者 ID 和计数，不包含消息内容。摘录仅来自 `excerpts: true` 的频道，使用折叠空白，并保留每人最新的八个。当一个人的 GitHub 或 Discord 计数不为零时，该人处于活动状态。

报告每人最多保留 200 个 GitHub 项目和 8 个 Discord 摘录，最多包含 80 个合计顶级项目。存储的报告JSON上限为2个MiB；使用固定规则截断项目列表，首先保留最新的项目，并且报告指示截断。因此，计数可能会超过显示的项目。

## <a id="cli-and-exports"></a> CLI 并出口

CLI 与正在运行的网关通信，并支持 `--json` 以及标准 [ 网关客户端选项 ](/cli/gateway)。读取需要`operator.read`；一代需要 `operator.admin`。

```bash
openclaw team-reports status --json
openclaw team-reports list --json
openclaw team-reports show day 2026-08-20
openclaw team-reports show week 2026-W34 --markdown
openclaw team-reports generate --date 2026-08-20
openclaw team-reports generate --intraday
```

如果没有日期或 `--intraday`，则生成选择昨天。 `--intraday` 选择今天； `--date` 接受过去一天或今天。今天的报告仍然片面。未来日期或 `--intraday` 与过去日期的组合将被拒绝。

**Reports** 侧栏选项卡在 Control UI shell 内打开 `/reports`，并在前面添加任何配置的 Control UI 基本路径。固定 `basePath: "/reports"` 会隐藏根安装的 Control UI `/reports` 页面，因此侧边栏会回退到通用 `/plugin?plugin=team-reports&id=team-reports` 选项卡 URL。

使用默认值 `basePath`，经过身份验证的读者可以使用：

| 路径                                        | 结果                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `/plugins/team-reports/`                    | 报告指数及近期活动趋势。                                 |
| `/plugins/team-reports/latest/`             | 重定向至最新的每日封闭报告。                             |
| `/plugins/team-reports/day/<key>/`          | 每日HTML报告；对于聚合，将 `day` 替换为 `week` 或 `month`。 |
| `/plugins/team-reports/day/<key>/report.md` | Markdown 出口；也可提供数周和数月的服务。                   |
| `/plugins/team-reports/day/<key>/data.json` | 结构化报告；也可提供数周和数月的服务。                 |
| `/plugins/team-reports/sessions/`           | 当前的工作会话，以及他们的对话的链接。               |
| `/plugins/team-reports/people/`             | 名册索引。                                                           |
| `/plugins/team-reports/people/<login>/`     | 每人的历史记录、日历和 30 天趋势。                         |
| `/plugins/team-reports/index.json`          | 最新密钥和存储周期索引。                                    |
| `/plugins/team-reports/status`              | 以 JSON 的形式运行状态、计划和源警告。                      |

报告和导出路由仅接受 `GET` 和 `HEAD` 并发送 `Cache-Control: private, no-store`。使用CLI或认证网关方法生成报告；读取报告页面不会触发收集。

报告和运行记录位于插件拥有的数据库 `<state-dir>/plugins/team-reports/team-reports.sqlite` 中。该插件在禁用或重新启动时将其关闭。保留在封闭日生成后运行；设置 `retention.days: 0` 以保留所有报告历史记录。

## <a id="troubleshooting"></a> 故障排查

**“报告”选项卡丢失或不可用。** 确认插件已启用，`plugins.allow` 允许（如果存在），并且 Control UI 会话具有 `operator.read`。配置更改会自动重新加载插件。如果修复配置后仍然不可用，请运行`openclaw plugins reload team-reports`。对于不可用的帧，请检查 HTTPS 或可信环回访问和第三方 cookie 策略。

**目前还没有报告。** 运行`openclaw team-reports status --json`。第一次自动收集会等待其计划时间，并且收集或模型调用可能仍在运行。使用 `generate --intraday` 获取今天的部分报告。 `/latest/` 要求至少一份封闭式日报。

**A 源有警告或报告看起来不完整。** 阅读状态和报告中的警告。运行失败错误会命名每个受影响的期间和来源（例如，`day/2026-08-20/github`）。检查 GitHub 令牌访问、organization/team 名称、排除的存储库以及 Discord 机器人对每个配置通道及其历史记录的访问。速率限制可能会延迟运行。一旦访问或速率限制恢复，重新生成受影响的天数，然后刷新聚合。旋转文件、执行或存储机密后，运行 `openclaw plugins reload team-reports`；环境更改需要使用更新的环境重新启动网关。

存储库建议是可选的。返回 HTTP 403 或 404 的咨询请求计入 GitHub 源统计信息中的 `advisoriesSkipped`，而不添加警告或标记为过时。速率限制响应仍然等待并重试；其他咨询失败则保留警告。

Discord 集合包括活动和存档线程，包括论坛和媒体帖子。私人档案需要`MANAGE_THREADS`和`READ_MESSAGE_HISTORY`；如果 Discord 返回 HTTP 403，则收集将回退到机器人已使用 `READ_MESSAGE_HISTORY` 加入的私有线程。如果两个私有存档端点都返回 HTTP 403，则该通道将计入 Discord 源统计信息中的 `privateArchivesSkipped`，而不会出现警告或过时状态；其他故障保留警告。机器人无法访问的私有线程不在报告的覆盖范围内。

当花名册、存储库、问题搜索、提交、comment/advisory 和 Discord 收集阶段完成时，长运行会在网关日志中发出 `team-reports:` 进度行。这些行包含计数和提交策略，没有令牌或消息内容。

**A 成员缺失或 Discord 活动不匹配。** 检查 GitHub 团队花名册和身份条目。将别名放入同一个 `github` 数组中，使用此人的 Discord 用户 ID，并检查该条目是否未存档。 `discordUsername` 本身不会将消息映射到某个人。

**Summaries 显示回退横幅或忽略请求的模型。** 检查目标代理的身份验证和默认模型、摘要设置以及主机 LLM 策略。请求的模型需要 `config` 之外的 `llm.allowModelOverride: true`。当模型被禁用、不可用或返回无效输出时，后备文本会保留报告。

**Generation 表示运行已处于活动状态。** 检查 `status` 并等待该运行的结果。调度程序可以防止重叠收集，并且每次运行都受其截止日期的限制。

另请参见：[插件配置](/tools/plugin)、[控制UI](/web/control-ui)和[秘密管理](/gateway/secrets)。
