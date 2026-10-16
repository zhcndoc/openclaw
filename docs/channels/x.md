---
summary: "X / Twitter 提及、列入白名单的公开回复、线程上下文和事件模式"
read_when:
  - "将 X bot 帐户连接到 OpenClaw 代理"
  - "管理谁可以触发 X 上的公开回复"
  - "X 活动流或提及轮询故障排除"
title: "X/推特"
---

X 插件将对您的机器人帐户的提及转变为代理对话，并将代理的答案作为公开回复发布。默认情况下，只有列入白名单的作者才能触发回复。除非您启用访客模式，否则未知作者将被悄悄删除；他们没有收到配对提示。

每个 X 会话都是一个由 `conversation_id` 标识的组线程。代理收到触发提及以及可用的祖先、对话帖子和引用的帖子。最初的提及仍然是用户可见的消息。不支持私信、原创帖子、点赞、关注和媒体上传。

## <a id="setup"></a> 设置

该插件与包含 `extensions/x` 的版本捆绑在一起。要将其从本地结帐添加到 OpenClaw 2026.9.8 安装：

```bash
openclaw plugins install --link ./extensions/x
```

使用 X 机密 OAuth2 应用程序并使用 `tweet.read tweet.write users.read offline.access` 授权机器人帐户。保留其客户端 ID、客户端机密和用户上下文刷新令牌。该插件使用 HTTP 基本客户端身份验证刷新访问令牌。可选的、单独的仅应用程序不记名令牌可启用活动 API。

X 可以在发出访问令牌时轮换刷新令牌。该插件将最新的令牌保存在私有的、由工作人员支持的插件状态（`x.oauth`）中，因此它可以在重新启动后继续存在。更改配置的刷新令牌种子会启动新的令牌沿袭。此存储不承诺静态加密；保护网关的状态目录及其备份作为凭证。

设置机器人的数字用户 ID 和用户名，然后将至少一个维护者的数字 X 用户 ID 添加到 `allowFrom`：

```json5
{
  channels: {
    x: {
      enabled: true,
      userId: "123456789",
      username: "example_bot",
      clientId: "example-x-client-id",
      clientSecret: { source: "env", provider: "default", id: "X_CLIENT_SECRET" },
      refreshToken: { source: "env", provider: "default", id: "X_REFRESH_TOKEN" },
      bearerToken: { source: "env", provider: "default", id: "X_BEARER_TOKEN" },
      allowFrom: ["987654321"],
      groupPolicy: "allowlist",
      dmPolicy: "disabled",
      events: { mode: "auto", pollSeconds: 60 },
      threadContext: { maxPosts: 50 },
      costLimits: { dailyUsd: 100, monthlyUsd: 1000, cycleStartDay: 1 },
    },
  },
  bindings: [{ agentId: "main", match: { channel: "x" } }],
}
```

替换示例 ID 和用户名。使引用的环境变量可供网关使用。省略 `bearerToken` 以在没有活动 API 的情况下使用轮询。所有三个秘密字段还接受明文或支持的 [SecretRef 输入 ](/gateway/secrets)。

运行 `openclaw config validate` 和 `openclaw channels status`。在列入许可名单的帐户中，在帖子中提及该机器人。成功的转向会在该帖子下方产生公开回复。正常[频道绑定](/channels/channel-routing)选择座席和会话；该插件不会覆盖会话范围。

对于多个机器人，请将帐户特定值放在 `channels.x.accounts.<accountId>` 下。根字段是共享默认值；默认账户ID为`default`。

## <a id="public-work-sessions"></a> 公共工作会话

设置 `channels.x.accounts.<accountId>.autoPublishWorkSessions: true`（或共享根默认值 `channels.x.autoPublishWorkSessions`）以发布由承认的维护者提及直接产生的新鲜的、独立的可见工作会话。来宾提及仍然仅限于隐藏的助手，并且不能发布工作会话。默认为 **off**。它通过同一 `/chat` 链接向匿名读者公开该孩子的对话；它不会改变团队协作权利。仅针对其工作旨在公开的代理启用它。

发布需要配置 **app-only** `bearerToken`。在准入之前，该插件使用仅应用程序身份验证查找提供的线程上下文中包含的每个帖子，并需要明确的 `protected: false` 作者元数据。丢失、编辑、受保护、保留或不可用的帖子以及失败的查找会拒绝自动发布。永久链接或成功的用户上下文查找并不能证明公众受众。验证读取共享账户的X API预算；预算不足会在不绕过成本限制的情况下拒绝出版。

该权限仅属于传入的调用：它不存储在 X 会话中、由孙子继承，也不在模型创作的生成参数中接受。分叉、private/draft 会话、隐身会话和现有会话无法自动发布。更改帐户配置或许可名单会停用正在进行的发布权限。创造物所有者在其第一回合之前向子代提交公共授权，并且生成收据仅针对所提交的授权报告 `publicRead`。没有该收据的链接被标记为需要登录。该通道需要实时进程内网关；它不会降级为失去调用权限的传输。

手册发布仍受现有 creator/administrator 共享控制的约束。没有 X 身份被提升为团队配置文件或管理员。

## <a id="work-sessions-and-replies"></a> 工作会话和回复

由经过验证的 X 提及启动的可见工作会话保留触发帖子的 URL、作者句柄和发件人层。会话的系统指令包括该来源，并且在回复 X 之前需要手动批准。无论是否启用自动公共共享，这都适用。

当会话有发现、修复、PR 或明确的“无法重现”结果时，它会起草最多 280 个字符的回复，并询问是否发布它。明确告知会话发布草案；它使用消息工具，以通道 `x` 和原始帖子 URL 作为目标。如果没有答案，它会在最后的总结中提醒您一次。发送适配器将工作会话限制为其原始帖子或同一 X 对话中提及的另一个机器人。主机尚未向该适配器公开用户轮次来源，因此批准规则是通过会话的指令而不是在发送时进行用户轮次检查来强制执行的。

X 前门代理继续直接回复传入的提及。

## <a id="reply-outcomes-and-failures"></a> 回复结果和失败

仅当代理声明成功时才会发布对提及的自动回复。通道的传递规则要求代理以 `[[x_success]]` 或 `[[x_failure]]` 开始每个回复；标签在发布前被删除。标记为 `[[x_failure]]` 的回复、未标记的回复和主机错误回复将从 X 中保留。`NO_REPLY` 和空回复将被删除。如果模型省略了成功答案上的标签，则该答案将被保留而不是发布。

如果没有失败路由，则保留的回复将被丢弃并记录为 `reply withheld post=<id> reason=<failure|error|unclassified> route=none`。使用 `failureRoute`，OpenClaw 通过目标渠道的正常出站传递发送通知：提及的帖子 URL、作者句柄以及最多 500 个字符的经过编辑的摘要。尽最大努力交付；失败的通知将与其结果一起记录，并且永远不会回退到 X。

```json5
{
  channels: {
    x: {
      failureRoute: { channel: "discord", to: "channel:<channelId>" },
    },
  },
}
```

设置`failureRoute.accountId`选择路由通道的账户。该路由不能定位 `x`。来自工作会话的消息工具帖子仍保持手动状态：`[[x_success]]` 标签被删除，标记为 `[[x_failure]]` 的草稿被拒绝。

## <a id="manage-the-allowlist"></a> 管理白名单

以管理员身份打开Control UI中的**X回复**。该页面显示配置 `allowFrom` 条目、通过页面添加的用户以及配置 [GitHub 验证](/channels/x#verify-github-collaborators) 时 GitHub- 派生用户的有效并集。添加用户名以将其解析为稳定的数字X用户ID。存储的条目保留解析的用户名、显示名称、添加运算符和时间戳。从页面中删除存储的条目；配置条目是只读的，必须从配置中删除。 **From GitHub** 部分也是只读的，并显示每个 X 句柄、其源 GitHub 登录、存储库权限和上次同步时间。删除存储的条目不会撤销另一个源授予的访问权限。

该页面还显示该帐户今天的预计 X API 支出以及当前计费周期与其限额的对比。选择 **Refresh** 以更新只读总计。 `x.allowlist.list` 中包含相同的支出快照。

本地链接安装使用 [ 自定义插件 UI 设置 ](/plugins/feature-plugins#enable-custom-plugin-ui)。启用 **Settings → 实验室 → 自定义插件 UI**，然后使用网关通过 HTTPS 或可信环回提供服务的 Control UI。捆绑安装不需要该设置。

网关方法 `x.allowlist.list`、`x.allowlist.add` 和 `x.allowlist.remove` 需要 `operator.admin`。通过数字 ID（`987654321` 或 `x:987654321`）授权发件人；句柄属于按句柄添加 UI，而不是 `allowFrom`。

`guests.enabled` 控制维护者白名单之外的准入。旧版 `groupPolicy: "open"` 设置是不必要的，并且无法绕过访客交换机。 `groupPolicy: "disabled"` 关闭所有入站转弯。 `dmPolicy` 仅接受 `disabled`。

## <a id="verify-github-collaborators"></a> 验证 GitHub 合作者

设置 `verifiedFromGitHub.repo` 以向对 GitHub 存储库具有写入权限并在其 GitHub 配置文件中声明 X 帐户的人员授予经过验证的维护者级别。默认为 **off**。派生的数字 X 用户 ID 加入配置 `allowFrom` 和管理员管理的条目；他们收到相同的维护者会话、工具和回复行为。

```json5
{
  channels: {
    x: {
      verifiedFromGitHub: {
        repo: "openclaw/openclaw",
        minPermission: "push",
        refreshMinutes: 60,
        token: { source: "env", provider: "default", id: "X_GITHUB_TOKEN" },
      },
    },
  },
}
```

这些设置从 `channels.x` 继承到每个帐户，并具有每个字段帐户覆盖。 `repo` 使用 `owner/name` 格式。 `minPermission` 接受 `push`（写入、维护或管理）、`maintain`（维护或管理）或 `admin`。刷新间隔默认为60分钟，且不能小于15分钟。

X 插件使用其配置的 GitHub 令牌对 `api.github.com` 进行只读 REST 调用。现有的 GitHub 工具身份不会公开共享的经过身份验证的 REST 客户端，因此单独配置 `tools.github` 不会提供此凭据。将 `token` 设置为网关可用的 [SecretRef](/gateway/secrets)。该凭证必须能够列出所选存储库上的所有协作者（包括他们的权限），并读取公共用户配置文件和社交帐户。对于细粒度令牌，授予对该存储库和 **Metadata 的访问权限：read**；组织政策可能还需要批准或 SSO 授权。无法列出协作者的凭据会产生可见的同步错误，而不是默默地将存储库视为空。

插件服务在启动时按照配置的时间间隔进行同步。它对所有协作者进行分页，按存储库权限进行过滤，并读取每个符合条件的 GitHub 个人资料的 `twitter_username` 和 Twitter/X 社交帐户链接。合并多个有效声明并删除重复的句柄。接受裸句柄、`@handles` 和 X/Twitter 个人资料 URL。它使用帐户的现有 X API 客户端和预算，以最多 100 个批次解析声明的数字 X ID 句柄。每个返回用户的费用为 **$0.01**。 Handle-to-ID 缓存可避免重复付费查找未更改的句柄。无法解析的句柄将被跳过、缓存并显示在状态中。要重试未更改的未解析声明，请将其删除以进行同步，然后将其添加回来，或者更改声明。 GitHub 配置文件缓存在可用的情况下使用 ETag，并持续运行服务的生命周期。

派生条目和句柄分辨率缓存位于 `x.verified-github` 下的工作线程支持的插件键控状态中。成功的同步会替换派生集。失去所需的存储库权限或删除声明的句柄会在下次成功同步时删除该条目。删除使用现有的许可名单撤销围栏，使正在进行的授权失效。其他许可名单来源仍然适用。失败的同步会保留最后一个好的设置，将其标记为过时，并在每次失败时记录一次；它不会在 GitHub 中断期间撤销所有人。即使后面的批次失败，成功的付费查找批次也会被缓存，因此下一次同步可以完成，而无需再次为这些用户付费。未更改的刷新和陈旧状态更新会保留正在进行的授权。

通道状态包括 `verifiedFromGitHub`、`repo`、`entries`、`unresolvedHandles`、`lastSyncAt` 和 `stale`。 **来自 GitHub** 部分的 **X 回复** 显示相同的来源归属和新鲜度。页面**Refresh**重新加载当前快照；插件服务拥有同步。

### <a id="trust-model"></a> 信任模型

GitHub 帐户所有者声明了 X 句柄并且已经具有对存储库的写访问权限。将该帐户映射到经过验证的层不会在此信任模型中添加任何有意义的权力。剩余风险是合作者声明他们不拥有 X 句柄。管理员可以检查 **X 回复** 上每个派生条目的源 GitHub 登录。撤销协作者的存储库访问权限或删除配置文件声明会在下次成功同步时删除派生条目，但会受到失败期间最后良好设置行为的影响。

主机授权解析的数字 X ID，而不是帖子或模型中提供的句柄。发送者行记录来源，例如：

```text
This is from a verified user: @example (Example), X user id 123, GitHub @example-dev with write access to openclaw/openclaw.
```

### <a id="enable-yourself"></a> 启用自己

1. 登录具有所需存储库权限的GitHub帐户。
2. 打开**设置→公开档案**。
3. 将您的 X 句柄添加到 **Twitter 用户名** 字段，或在 **社交帐户** 下添加您的 `https://x.com/your_handle` 个人资料 URL。
4. 保存您的个人资料并等待下一次同步（默认情况下为 60 分钟）。
5. 提及该 X 帐户中的 X 机器人。管理员可以在 **X 回复中确认您的映射 → 来自 GitHub**。

如果没有声明的、可解析的 X 句柄，仅存储库访问无法将您映射到 X 帐户。您还可以要求管理员手动添加您的 X 帐户。要删除派生映射，请从您的 GitHub 配置文件中删除声明或撤销您的存储库权限。

## <a id="guest-mode"></a> 访客模式

访客模式允许维护者许可名单之外的人询问存储库问题。它默认为关闭。配置如下前门代理后，在 **X 回复** 上使用 **访客模式** 开关，或运行：

```bash
openclaw config set channels.x.guests.enabled true
openclaw config set channels.x.guests.enabled false
```

配置观察程序会重新加载 X 通道，而无需重新启动网关。 UI 使用仅限管理员的 `x.guests.set` 方法并保留相同的配置。对于显式配置的帐户，交换机会写入该帐户的覆盖；否则，它会写入 `channels.x.guests.enabled`。帐户覆盖从频道根继承其他访客设置。

客人收到核心`read`、`ls`、`sessions_spawn`、`sessions_yield`和`subagents`工具，进一步受到智能体正常政策的限制。他们可以启动同一代理的隐藏助手。助手继承来宾的受限工具和存储库根；他们无法成为可见的工作会话或针对其他代理。 `sessions_yield` 等待助手完成，`subagents` 列出、等待或取消助手。

来宾无法编辑文件、运行命令、浏览或获取网络、使用内存、发送消息或检查不相关的会话。可选`guests.tools.allow`可以缩小五种默认工具；空数组会禁用所有工具。 `guests.tools.deny` 优先。这两种设置都无法添加更强大的工具。

捆绑的 X 插件使用当前主机对这些限制的强制执行。核心授权隐藏的助手并保留来宾的受限工具表面和存储库根。

每个来宾提及都会获得一个单独的通道会话和引用的 X 线程上下文。它不会重用维护者的对话历史记录、权限模式、根目录或选定的技能。维护人员保留现有的会话、工具和工作会话回复。来宾回复可能会引用文档 URL，但 OpenClaw 绝不会在来宾回复中附加工作会话链接。

### <a id="repository-containment"></a> 存储库遏制

工具名称本身并不能限制文件系统读取。将 X 前门代理的 `cwd` 和 `workspace` 配置为 OpenClaw 克隆，并启用核心的仅工作区文件防护。支持的来宾设置还会禁用选定的技能和 Docker/remote 沙箱模式：技能目录和沙箱装载是核心中的显式读取异常，并且可以公开该克隆外部的文件。例如，将这些字段添加到您的 X 绑定选择的代理中：

```json5 validate=false
{
  workspace: "/srv/openclaw",
  cwd: "/srv/openclaw",
  skills: [],
  sandbox: { mode: "off" },
  tools: { fs: { workspaceOnly: true } },
}
```

有效的文件系统设置是 `agents.entries.<agentId>.tools.fs.workspaceOnly`，回退到 `tools.fs.workspaceOnly`。当该设置不存在或为 false、启用技能或沙箱模式处于活动状态时，X 插件会在线程扩展之前拒绝来宾。通道状态将所需的更正报告为 `guestModeBlockedReason`；维护者提及正常继续。

访客模式还需要队列模式，该模式无法引导或中断活动转弯。在启用访客之前设置频道覆盖：

```json5
{
  messages: { queue: { byChannel: { x: "followup" } } },
}
```

还支持 `collect`。如果没有通道覆盖，`messages.queue.mode` 必须是 `followup` 或 `collect`；默认 `steer` 和显式 `interrupt` 在线程扩展之前阻止来宾准入。 **X 回复** 页面显示其现有访客就绪消息中所需的设置。将队列模式更改回不安全值会阻止后续来宾提及。

核心拥有路径和符号链接遏制，并拒绝使用 `Path escapes sandbox root` 的会话根外部读取。将访客频道会话保留在其初始权限中：不授予完全权限、扩大其会话根目录或通过操作员控件附加外部技能或技能库引脚。这些操作员行为故意更改核心的文件系统权限。访客没有可以进行这些更改的工具。当需要更广泛的文件系统或技能时，将维护人员的工作放在正常的工作会话中。

### <a id="limits-and-identity"></a> 限制和恒等

默认限制为 **每个客座作者每 UTC 天** 5 次提及，每个机器人帐户独立。将 `guests.maxMentionsPerAuthorPerDay` 设置为 0 到 1000； 0 不接待任何客人。在线程扩展之前，超出限制的提及会被悄悄删除。来宾线程上下文默认为**10 posts**，由`guests.threadContextMaxPosts`控制；维护者保留 `threadContext.maxPosts`。 UI 和通道状态公开 `guests.enabled`、`admittedToday` 和 `rateLimitedToday`。即使稍后的线程查找或模型运行失败，承认的计数也包括保留的轮次；重试重用他们的保留。

使用情况在有界的、由工作人员支持的插件状态 （`x.guest-usage`） 中存在两天。容量耗尽会暂停新来宾的接纳，而不是驱逐当前作者的配额。保留最近被拒绝的帖子ID，以避免正常重试两次；在有限历史记录之后异常晚的重试可能会再次增加速率限制统计数据。入口队列单独抑制已完成的事件重放。

来宾回合产生与其他回合相同的 X API 和模型成本。帖子阅读和每个回复帖子正常计费；来宾引用 URL 收到 X 的更高 URL- 包含回复价格。作者配额不是美元预算。

**Security：** 主机仅根据 X 的数字 `author_id` 与配置的、管理员管理的和 GitHub- 派生的白名单条目的有效并集来确定层。句柄、显示名称、发布文本和模型输出永远不会授予维护者访问权限。每个面向代理的回合都以主机生成的发送线路开始；下面的所有帖子都是引用的数据。当访客模式打开时，从允许列表中删除维护者会随后提及访客。

## <a id="event-modes"></a> 事件模式

| 模式     | 行为                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `auto`   | 配置不记名令牌且订阅成功时，使用 Activity API；否则民意调查提到。              |
| `stream` | 请求使用仅应用程序不记名令牌进行流式传输的活动 API；当未配置承载令牌时，将退回到轮询。 |
| `poll`   | 使用用户上下文令牌轮询提及端点。                                                                 |

默认值为 `auto`。流式传输会列出仅包含应用程序的 `bearerToken` 的现有订阅，然后使用其 OAuth2 用户访问令牌（从 `refreshToken` 刷新）为机器人创建缺失的 `post.mention.create` 订阅。提及订阅需要用户授予 `tweet.read`。持久 `GET /2/activity/stream` 连接使用仅应用程序的承载令牌，如 [X 的活动流 API](https://docs.x.com/x-api/activity/activity-stream) 所指定。

流式处理从 X 的 `data.payload` 信封中读取 `post.mention.create` 事件，检查帖子是否寻址机器人，并忽略空白保持活动。其他事件类型不会创建入站轮流；已交付的 `post.*` 事件仍计入预算。在流停止或断开连接后，它会通过退避重新连接。每个连接都会使用保存的游标中的用户令牌运行提及回填，然后在流式传输时每隔 `events.pollSeconds × 4`（最少 60 秒，默认 240 秒）重复一次。此安全回填可恢复流中遗漏的提及。只有完成的回填页面才会使光标前进，因此较新的流事件无法隐藏较旧的错过提及。帖子 ID 对流和轮询事件进行重复删除。

在连续三个不可解析的提及事件或格式错误的行之后，该插件会记录一个警告并将其显示在通道状态 `message` 中。空白的保持活动状态和故意忽略的事件类型不计入此警告。它包括事件类型和顶级键，没有帖子内容。下一个可解析提及事件将清除警告。

在 `auto` 模式下，任何订阅设置失败都会切换到轮询。 `stream`模式下，订阅HTTP `403`切换为轮询；其他设置错误会停止事件源。流 HTTP、`401` 或 `403` 将任一模式切换为轮询。通道状态 `message` 包括失败的端点、HTTP 状态和第一个 X 错误消息（如果可用），并带有经过编辑的凭据。例如：

```text
X API /2/activity/subscriptions failed (HTTP 400): OauthAccessTokenRequired: OAuth user access token is required for this event type; polling
```

此消息解释了 Activity 无法启动的原因；投票仍然活跃。不可读的错误体仍然报告 HTTP 状态。网络和令牌刷新失败报告其客户端错误，但没有提供商响应详细信息。

轮询默认为 60 秒； `events.pollSeconds` 不能小于 15。每个请求要求 10 次提及、X 的最小页面大小，并在仍有积压时遵循分页。这使得每个请求的预订量很小，同时仍然赶上所有可用的提及。在光标前进之前，入站帖子会持久排队。已完成的事件 ID 最多保留 30 天，每个帐户最多可完成 2,000 个条目，从而防止在重新连接和重新启动后重复轮流，同时保留这些条目。

## <a id="thread-context-and-replies"></a> 线程上下文和回复

该插件将最早的可用线程帖子呈现为 `@handle (time): text`，并标记触发提及。它遵循回复祖先，阅读最近的对话，并包括引用的帖子。 `threadContext.maxPosts` 默认为 50；当达到限制时，根帖子和最新帖子将被保留。最近的搜索范围仅限于 7 天，不能包含不可用或已删除的帖子。

对话搜索请求 10 到 100 个帖子，以剩余的上下文余量为限； X 至少需要 10。达到上下文限制时分页停止。如果预算无法覆盖更多上下文，代理会收到提及信息以及已获取的任何上下文，并标记为“线程上下文被预算截断”

回复被分成一个自我回复链，每个帖子最多包含 280 个加权字符；每个 URL 算作 23 个字符。最后一个块接收 `replySignature`，默认为 `🤖 automated reply`。将其设置为空字符串以禁用签名。

当维护者轮流启动可见工作会话时，其第一个会话 URL 会附加到回复中，除非文本已包含该 URL。仅当创建收据确认发布时，会话链接才可公开读取；否则，它会被标记为“工作会话（需要登录）”。两者都使用X的URL-包含回复价格。

对于通过消息工具或 CLI 的直接回复，请使用 `x:` 前缀或其完整 X 状态 URL 定位帖子 ID：

```bash
openclaw message send --channel x --target x:1234567890123456789 --message "Reply text"
```

目标必须满足X的回复资格：其作者提及或引用了应用程序帐户。不支持发送媒体或创建原始帖子。

<a id="costs" />

## <a id="costs-and-limits"></a> 成本和限制

该插件默认每个帐户的 **每 UTC 天** 100 美元，**每个计费周期** 1,000 美元。这些限制仅涵盖 X API 呼叫；模型令牌是分开的。将 `costLimits.cycleStartDay` 设置为 X 计费周期开始月份的 UTC 天，从 1 到 28。例如，`20` 使周期从 20 日 00：00 UTC 运行到下个月的 20 日。帐户条目从 `channels.x` 继承这些字段，并且可以单独覆盖它们。

这两个限额都接受非负美元金额。 `0` 阻止付费请求。没有无限的设置；如果您想要更高的上限，请使用较大的限制。 X 自己的每周期上限仍然适用，并且可以独立拒绝请求。

该估算使用 X 的 [ 发布的按使用付费费率 ](https://docs.x.com/x-api/getting-started/pricing)，于 2026 年 10 月 4 日验证：

| 手术                                                   | 预计 X API 价格                              |
| ----------------------------------------------------------- | -------------------------------------------------- |
| 读后                                                   | 每个返回的帖子 $0.005，包括扩展的帖子 |
| 用户阅读                                                   | 每个返回用户 $0.01，包括扩展用户  |
| 活动 `post.*` 事件                                     | 每次交付的事件 $0.005                         |
| 没有 URL 的回复                                         | 每个回复帖子 $0.015                              |
| 包含 URL 的回复                                      | 每个回复帖子 $0.20                               |
| 空资源响应                                     | $0                                                 |
| 订阅管理、令牌刷新、无资源列表 | $0                                                 |

线程扩展读取额外的帖子。长答案会创建多个计费回复帖子。在允许列表 UI 中添加句柄会执行付费用户名查找。这些是 X API 成本，与代理的模型使用情况分开。

支出以整数微美元的形式存储在插件的工作人员支持的状态中，每个帐户都有单独的每日和计费周期存储桶。该插件在每个付费请求之前保留最坏情况的成本，并根据返回的资源进行结算，释放任何未使用的预留。并发请求共享相同的帐户预算。丢失响应、HTTP 5xx 或无法解析的成功会保留完整保留，因为调度可能已成功；只有经过验证的非调度或明确的 HTTP 4xx 拒绝才会在没有资源的情况下释放它。显示的支出包括待处理的预订。跨越 UTC 午夜的请求保守地计入这两天，但仅计入共享计费周期一次。跨越计费周期边界将计入两个周期。中断的请求在重新启动后保留其完整保留。

会计故意忽略UTC天内X的资源重复数据删除，因此重复读取再次计数。 X是否向扩大的用户计费尚未确定；该插件包含它们是为了避免低估支出，包括随活动事件返回的扩展。所有交付的 `post.*` 活动事件都会计数，即使它们不产生智能体轮次。因此，估价可能会超过 X 的发票。 X 的活动和定价页面对于 `post.delete` 是否计费存在分歧；该插件保守地以与其他发布事件相同的速率对其进行计数。

活动流使用固定的 **$0.50 净空**。如果任何一个剩余预算低于它，插件将关闭流并使用门控提及轮询，直到受影响的预算重置。在流关闭之前已交付的事件 X 仍会收费并被接纳；他们可以将记录的支出推至超出限额。净空降低了这种风险，但它并不是对 X 已交付的突发的严格限制。轮询请求仅在其全部预留满足时才继续。

当没有付费民意调查适合时，入口会暂停直到重置，而不前进其 `since_id` 光标。已经获取的提及会被持久地接受，并且它们的下一页令牌会保存在光标旁边，以便在重置或重新启动后可以继续回填旧页面。如果 X 拒绝保存的令牌，则插件会从 `since_id` 重新启动回填；入口队列对已经承认的提及进行重复删除。通道状态报告当前支出、限制、周期开始和恢复时间，并带有诸如 `X API daily budget of $100 reached; resumes at 2026-10-06T00:00Z` 之类的原因。该插件在达到限制时记录一次，在重置时记录一次。无法提供的答复将被拒绝，并出现不可重试的错误；回复链按块收费。

当活动事件省略提及实体时，插件会查找帖子以验证它是否针对此机器人。如果预算无法支付验证费用，则在重置后，在任何代理轮流之前，都会对提及进行持久排队和验证。未经验证的事件和另一个机器人的事件不会推进此帐户的光标。如果提及实体仅提供用户名，则插件会执行 $0.01 用户查找以验证数字收件人 ID；仅配置的用户名无法授权回复。

## <a id="configuration-reference"></a> 配置参考

除非另有说明，这些字段适用于 `channels.x` 和个人帐户条目。

| 字段                               | 默认值                 | 用途                                                                           |
| ----------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `enabled`                           | `true`                  | 启用频道或帐户。                                                   |
| `name`                              | 取消设置                   | 可选的帐户显示名称。                                                    |
| `userId`                            | 必需的                | 机器人帐户的数字用户 ID。                                               |
| `username`                          | 必需的                | 不带 `@` 的机器人用户名。                                                         |
| `clientId`                          | 必需的                | OAuth2机密应用程序客户端ID。                                        |
| `clientSecret`                      | 必需的                | 应用秘密；支持SecretRef。                                           |
| `refreshToken`                      | 必需的                | 机器人的用户上下文 OAuth2 刷新令牌；支持SecretRef。                      |
| `bearerToken`                       | 取消设置                   | 用于活动和公共上下文验证的应用程序专用承载；支持SecretRef。 |
| `autoPublishWorkSessions`           | `false`                 | 发布新的可见工作会话以供经过验证的公共维护者提及。      |
| `events.mode`                       | `auto`                  | `auto`, `stream`, or `poll`.                                                      |
| `events.pollSeconds`                | `60`                    | 提及轮询间隔，最少 15 秒。                                    |
| `allowFrom`                         | `[]`                    | 数字作者 ID，可以选择以 `x:` 为前缀。                                |
| `verifiedFromGitHub.repo`           | 取消设置（关闭）             | 其协作者可以被验证的存储库，采用 `owner/name` 形式。         |
| `verifiedFromGitHub.minPermission`  | `push`                  | 最低存储库权限：`push`、`maintain` 或 `admin`。                    |
| `verifiedFromGitHub.refreshMinutes` | `60`                    | 同步间隔（以分钟为单位），最小 15。                                             |
| `verifiedFromGitHub.token`          | 取消设置                   | GitHub 读取凭证；支持SecretRef。                                       |
| `groupPolicy`                       | `allowlist`             | `allowlist`, `open`, or `disabled`.                                               |
| `dmPolicy`                          | `disabled`              | 仅接受 `disabled`。                                                      |
| `threadContext.maxPosts`            | `50`                    | 代理线程上下文中包含的最大帖子数，从 2 到 100。                    |
| `guests.enabled`                    | `false`                 | 为非允许的作者启用仅限存储库的答案。                      |
| `guests.maxMentionsPerAuthorPerDay` | `5`                     | 每个作者、每个帐户 UTC-day 限制，从 0 到 1000。                            |
| `guests.threadContextMaxPosts`      | `10`                    | 来宾线程上下文上限，从 2 到 100 个帖子。                                    |
| `guests.tools.allow`                | 主机支持的默认值 | 缩小默认访客工具范围；空数组会禁用所有工具。               |
| `guests.tools.deny`                 | `[]`                    | 进一步拒绝访客工具；否认胜利。                                            |
| `costLimits.dailyUsd`               | `100`                   | 最大估计XAPI每花费UTC天；`0`阻止付费电话。                 |
| `costLimits.monthlyUsd`             | `1000`                  | 每个计费周期的预计最高支出 X API； `0` 阻止付费电话。           |
| `costLimits.cycleStartDay`          | `1`                     | UTC 每月的计费周期开始日，从 1 到 28。                           |
| `replySignature`                    | `🤖 automated reply`    | 添加到最后一个回复块；最多 140 个字符，为空则禁用。           |
| `failureRoute`                      | 取消设置（丢弃）         | `{ channel, to, accountId? }` 拒绝 X 答复的通知目标。          |
| `accounts`                          | 取消设置                   | 指定帐户覆盖；仅通道根。                                       |
| `defaultAccount`                    | `default`               | 未指定帐户时选择的帐户；仅通道根。                       |

## <a id="troubleshooting"></a> 故障排查

**无回复：** 检查帐户状态、数字机器人 ID 和有效白名单。被删除的提及计数器和最后被删除的作者解释了故意沉默。没有配对流程。空的允许列表会阻止默认策略下的所有作者。

**GitHub 验证已过时：** 检查 `verifiedFromGitHub` 的通道状态和 **X 回复→来自 GitHub** 的最后一次成功同步和错误。确认令牌可以列出协作者，其存储库访问已获得批准，并且 X API 预算允许新的句柄查找。最后一个好的组保持活动状态，直到同步成功。对于未解析的句柄，请检查协作者的公共 GitHub 个人资料以及 X 帐户是否存在。

**Streaming 回退：** 检查活动端点的状态消息、HTTP 状态和 X 错误详细信息。验证应用程序持有者和机器人的 OAuth2 授权，包括 `tweet.read`。如果没有应用程序承载，`auto` 和 `stream` 使用轮询。检查报告的事件模式、流connection/backoff、最后一个事件和光标。当任一预算中剩余金额少于 $0.50 时，流式传输也会切换到轮询，并在预算重置后恢复。

**预算暂停：**查看通道状态中的`spend`或**X回复**页面。状态消息给出了受影响的限制和重置时间。将 `costLimits.cycleStartDay` 与您的 X 计费周期保持一致，并根据需要增加适用的限额。更改限额不会删除记录的支出。

**Token 刷新失败：** 检查客户端 ID、客户端密钥、刷新令牌和授予的 OAuth2 范围。状态报告刷新状态而不暴露秘密。

**回复被拒绝：**确认来源作者提到或引用了该应用程序帐户并且该应用程序具有`tweet.write`。在重试部分发送的回复链之前检查错误。

回复 POST 之前的失败可以安全地重试。如果 POST 的结果不确定，OpenClaw 会保留该不确定性，而不是自动再次发送回复。在手动重试不确定或部分发送的回复之前，请检查 X。

## <a id="related"></a> 相关内容

- [频道路由](/channels/channel-routing)
- [配置](/gateway/configuration)
- [秘密](/gateway/secrets)
- [管理插件](/plugins/manage-plugins)
