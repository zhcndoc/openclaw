---
summary: "Control UI 路由、焦点演示、稳定会话链路、连接切换参数"
read_when:
  - "您需要添加书签或共享 Control UI 会话"
  - "您需要发布或撤销世界可读的会话记录"
  - "您在登录代理后面运行 Control UI，并且需要社交预览才能展开"
  - "您正在添加或更改 Control UI 路由"
  - "您需要终端、桌面、审批、入门引导或远程网关 URL"
title: "Control UI 网址"
---

Control UI 使用页面和会话链接的可读路径。配置的 `gateway.controlUi.basePath` 为以下每个路径添加前缀。例如，当基本路径为 `/openclaw` 时，`/chat/main` 变为 `/openclaw/chat/main`。

## <a id="session-and-dashboard-urls"></a> 会话和仪表板 URL

**在配置 `gateway.publicOrigin` 时，会话菜单中的复制链接** 使用连接的网关的公共 Control UI 地址，包括其 `gateway.controlUi.basePath`。当桌面应用程序通过本地 SSH 隧道连接时，这可以保持链接可共享。如果没有公共来源，复制的链接将使用连接的网关的 HTTP（S） 地址；仅隧道地址仍然是本地地址。正常导航并在**中打开**继续使用当前的UI。复制的链接不包含连接凭据。除非线程启用了 [ 公共访问](/web/urls#public-session-transcripts)，否则收​​件人需要网关访问权限。

如果在加载会话链接时网关断开连接，Control UI 在重新连接后会重试中断的加载。导航到其他地方会取消恢复；它不会重新打开旧目标或添加浏览器历史记录条目。已加载的对话在重新连接时保持安装状态。

仪表板库将 `?dashboard=expanded` 添加到所属任务的聊天链接，例如 `/chat/main/deploy-monitor-6db92d48?dashboard=expanded`。这使得仪表板成为主视图并使其成为焦点。 **恢复拆分**将侧面板放在仪表板旁边。普通任务导航会恢复浏览器保存的任务排列，而不是强制显示仅仪表板视图。

聊天和仪表盘视图是并行路由命名空间：

```text
/chat/main/deploy-monitor-6db92d48
/dashboard/main/deploy-monitor-6db92d48
/chat/main/telegram/12345
/chat/main/cron/nightly/run/8821
/chat/main
```

路径语法如下：

```text
/<namespace>/<agentId>
/<namespace>/<agentId>/<sessionRef>
/<namespace>/<agentId>/<restSegment>/<restSegment>...
```

`<namespace>` 要么是 `/chat`，要么是 `/dashboard`。第一种形式会打开该 agent 的主会话。其他形式通过两种方式之一编码一个不可变会话键。

当密钥剩余时，短 ID 形式适用于非隐身会话，`agent:<agentId>:` 之后的所有内容均以 UUID 结尾。 `<sessionRef>` 是可选的显示名称段加上短 ID，例如 `deploy-monitor-6db92d48`。在路径中指定的代理中，短 ID 具有权威性：从密钥的尾随 UUID 开始至少有 8 个小写十六进制字符，并省略 UUID 破折号。接受最长 32 个十六进制字符的前缀。该行的旋转 `sessionId` 不是 URL 标识的一部分。

默认情况下，Control UI 生成包含所有 32 个 UUID 字符的链接，因此即使另一个会话共享其前缀和显示名称，选定的会话仍会保留其身份。现有的较短链接仍然可以解析，并且消歧视图可以提供最短的唯一前缀。解析 UUID 会话的文字或显示名称链接也会将完整的 UUID 保留在其标准 URL 中。

所有其他键都使用文字键形式。 `agent:<agentId>:` 之后的每个冒号分隔的段都成为一个 URL-encoded 路径段。例如，`agent:main:telegram:12345` 变为 `/chat/main/telegram/12345`，`agent:main:cron:nightly:run:8821` 变为 `/chat/main/cron/nightly/run/8821`。

隐身会话始终使用文字密钥形式，即使其密钥以 UUID 结尾。例如，隐身链接看起来像 `/chat/main/dashboard/incognito-12345678-90ab-cdef-1234-567890abcdef`。隐身会话被排除在短 ID 和显示名称发现之外；它们的确切链接仍然需要管理员访问权限，并且可以在会话存在于正在运行的网关中时重新加载。重新加载浏览器并不会结束会话；重新启动网关即可。从侧边栏重新打开现有会话，以替换报告 **Session not found** 的旧短 ID 链接。

完全等于 `.` 或 `..` 的文字剩余段使用 `~dot` 和 `~dotdot`，因此浏览器无法将它们折叠为相对路径段。以 `~` 开头的文字段将前导字符加倍以保持编码可逆。当原本的单段休止符可能被误认为是短 ID 时，构建器会在其前面插入 `~key`，例如 `agent:main:release-deadbeef` 变为 `/chat/main/~key/release-deadbeef`。当引用可能不明确时，标记会强制按字面解释。构建者还将其用于普通密钥 `agent:research:global`，生成 `/chat/research/~key/global`，以将其与使用 `/chat/research` 的原始 `global` 家庭会话密钥区分开来。现有的 `/chat/research/global` 文字链接仍解析为 `agent:research:global`。

保留的单段文字其余名称为 `main`、`global`、`boot` 和 `sessions`。当代理 id 被保留或不包含有效的短 id 时，代理 id 后面的恰好一个段是文字；否则它是一个简短的参考。代理 ID 后面的两个或多个段始终是文字。

主会话 `agent:research:main` 使用仅代理路径 `/chat/research`。配置加载会忽略自定义 `session.mainKey` 值；将其设置为 `"workspace"` 不会使 `/chat/research/workspace` 成为主会话路由。它遵循普通的会话查找；如果没有现有会话匹配，则显示 **Session not found**。

### <a id="stability-contract"></a> 稳定性约定

以下部分是稳定的 URL 约定：

- `/chat` 和 `/dashboard` 这两个命名空间词。
- 代理 id 和密钥 UUID 短 id 一起出现在短 id URL 中。
- 上述的参数个数以及短／字面解析规则。

在短 ID 形式中，代理段的范围是会话查找；它不是装饰性的。更改它可能会使链接停止解析或选择具有相同 UUID 前缀的不同可见会话。即使链接包含全部 32 个 UUID 字符，这也适用。更改代理的显示名称不会更改其在 URL 中的 ID。

slug 是一个可选的显示名称提示。过时的 slug 不会使所选代理中唯一的 UUID- 前缀匹配无效。如果多个可见会话与前缀匹配，则匹配的 slugs 会缩小候选范围。只剩下一名候选人做出决定；否则显示消歧视图。与所有候选者均不匹配的 slug 将被忽略。解析后，Control UI 将地址栏替换为标准会话路径和当前显示名称别名，而不添加浏览器历史记录条目。

重命名会话或轮换其 `sessionId` 不会破坏其他唯一的短 ID 链接。此稳定性保证不涵盖将会话移动到不同的代理 ID；使用其当前链接。 URL 不会绕过会话授权或启用公共访问。

在字面键形式中，agent 段是权威的，因为它是重建会话键的一部分。其余字面段也同样是权威的。slug（如果存在）始终只是装饰性的；字面键形式不会自动生成 slug。

为了尽最大努力提供便利，还会根据显示名称段检查未解析为确切会话密钥的未转义单段文字。地址栏中的一个精确的 slug 匹配将被替换为其完整的 `/<namespace>/<agentId>/<slug>-<shortId>` 参考。如果多个会话共享该段，UI 将显示用于短 ID 关系的相同消歧视图，而不是猜测。精确的短 ID 和文字键引用总是胜过 slug 匹配。

如果一个短 ID 匹配多个会话并且 slug 没有解决它，则 UI 不会猜测。它显示了一个小的消歧视图，其中包含匹配的显示名称、代理和较长的 ID 前缀。使用更长的前缀使 URL 具有唯一性。当前网关最多返回十个最近的候选者；当达到该界限时，视图将结果视为不完整而不是猜测。

在 `/` 或 `/chat` 打开 Control UI 将恢复浏览器上次选择的会话。如果该会话不再存在，UI 将打开其代理的主会话；如果代理已被删除，它将使用当前代理。指向丢失会话的显式链接不断显示“找不到会话”恢复页面。

如需在终端中继续使用其中一个链接或附加编码 harness，请参阅 [会话同步和附加](/concepts/session-attachment)。

标准链路不使用 `?session=` 或 `?face=`。发布的链接（例如 `/chat?session=<sessionKey>`）仅在应用程序边界作为迁移辅助被接受，并立即重写到标准路径，而不添加浏览器历史记录。已发布的 `?face=dashboard` 同伴在重写期间选择 `/dashboard` 命名空间。加载器和页面代码永远不会读取查询表单标识，并且新链接不得发出它。会话列表保留其自己的 `?session=` 参数，因为该参数扩展一行；它不是会话深层链接。聊天和仪表板会话路径仍然支持一次性编写器值 `?draft=`。

### <a id="native-catalog-links"></a> 本机目录链接

本机目录线程将代理路径与源查询结合使用：

```text
/chat/<agentId>?catalog=<catalogId>&host=<hostId>&thread=<threadId>
```

URL-encode 每个查询值。路径中的代理拥有 OpenClaw 窗格，包括目录读取和延续； `catalog`、`host` 和 `thread` 标识本机源。在不同代理下打开相同的源可以使它们的窗格和草稿分开，包括在拆分视图中。继续线程导航到采用的 OpenClaw 会话链接。相同的目录查询也适用于 `/dashboard/<agentId>`。

## <a id="social-previews"></a> 社交预览

使用会话菜单中的 **高级 → 复制详细信息 → 预览链接** 与 OpenClaw 社交卡共享链接。它会打开一个小型公共登陆页面； **打开仪表板**或**打开会话**然后将收件人带到正常的经过身份验证的视图。 **复制链接根菜单中的**仍然复制直接链接。

例如，`/share/dashboard/main/deploy-monitor-6db92d48` 预览 `/dashboard/main/deploy-monitor-6db92d48`。配置的 Control UI 基本路径为这两个路径添加前缀。预览版在 `/share/card.png` 上提供 Open Graph 元数据和 1200 × 630 PNG，无需 JavaScript 或网关连接。

该卡片显示通用 OpenClaw 品牌，而不是会话的标题、消息、仪表板小部件或屏幕截图。预览请求从不查找会话状态，因此页面不会显示目标是否存在。链接本身仍然包含会话路由，对于目录会话，还包含目录路由字段。将这些 URL 视为您选择共享的信息。

### <a id="behind-a-login-proxy"></a> 登录代理背后

链接抓取工具无法登录您的代理。允许匿名 `GET` 和 `HEAD` 请求 **only** 到 Control UI 的 `/share/*` 命名空间（例如，`/openclaw/share/*` 表示 `/openclaw` 基本路径）。保护仪表板、WebSocket、引导程序、API 和其他路由。不要根据爬网程序的用户代理授予经过身份验证的访问权限。

对于 Cloudflare 访问，使用与该公共路径匹配的单独应用程序和旁路策略；为主机的其余部分保留现有的经过身份验证的应用程序。请参阅 [Cloudflare 的应用程序路径规则](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)。这是操作员部署步骤； OpenClaw 不更改代理策略。

当 TLS 在代理处终止时，将现有的 `gateway.publicOrigin` 设置为外部 HTTP（S） 源，因此图像和标准 URL 使用公共 HTTPS 地址。如果没有它，预览将使用请求的主机和直接连接协议；公共预览 URL 不信任转发的标头。

验证预览版 URL 及其 `/share/card.png` 返回 `200` 且不带 cookie，然后检查打开仪表板是否仍然需要登录。如果聊天应用程序显示登录页面或没有图像，请检查两个预览请求上的代理重定向。普通仪表板 URL 仍然受到保护，并且无法从此功能中获得爬网程序访问权限。

## <a id="public-session-transcripts"></a> 公开会话记录

一个线程有一个普通的 `/chat/<agentId>/<sessionRef>` URL 供登录者和匿名读者使用。会话创建者和网关管理员可以打开 **会话共享 → 公共访问 → 启用公共访问** 来发布其现有和未来的对话，包括图像和工具调用摘要。 **复制公共链接**复制普通线程URL，而不是单独的查看器地址。启用访问时，聊天标题显示 **Public**。

已注销的访问者会看到带有 **登录** 按钮的公共对话。登录返回到同一线程并应用该人的现有权限；它不授予编辑或访问其他会话的权限。没有私人访问权限的登录人员仍然可以阅读公共版本。私有、缺失和模糊的匿名目标会显示相同的不可用页面，而不会泄露姓名或候选会话。当受保护的登录切换检查访问时，私有线程页面显示 **Loading conversation**，而不是不可用错误。失败的访问检查会提供重新加载或登录，而不是声明访问被拒绝。如果没有 JavaScript，通用不可用页面仍然可读。

重新打开、重新加载或点击聊天链接时，保存了该网关凭证的 Token/password 操作员会自动继续进入 Control UI。浏览器使用其会话令牌或配对设备凭据；密码仅保留在内存中。这也适用于环回 HTTP，它允许公共读者。在网关更新期间聊天链接仍然可重新加载；应用程序启动时，临时恢复标记将被删除。在可信代理部署中，由已安装的 Control UI 服务工作人员控制的浏览器在重新打开聊天深层链接时直接请求受保护的会话条目应用程序文档，而无需首先加载公共阅读器或探测访问权限。注册只是一个导航提示：受保护的切换仍会检查当前权限。拒绝访问或登录重定向会退回到公共读者。没有工作人员的浏览器保留公共文档和受保护的访问探针。准备好应用程序文档后，切换会重新检查该对话的当前访问权限。其他对话中的活动不会重新启动导航。如果在准备过程中访问权限发生变化，则切换会停止并出现明显错误，并提供重新加载或登录；它不会重定向回另一个自动探测器。匿名专用线程文档最初返回 `404`，然后允许的浏览器通过会话条目切换以 `200` 响应打开应用程序。不需要额外的**登录**点击。如果没有保存的凭据，**登录**将打开正常的登录门。在公共记录不可用的非安全入口上，token/password 部署直接为应用程序 shell 提供服务。

指定另一个所有者并不转移公共共享权限。如果控件不可用，请确认会话已保存、不是隐身模式，并且您是其创建者或网关管理员。请参见 [ 多用户模式](/concepts/multi-user#world-readable-session-links)。

公共访问权限与队友可见性和编辑权限是分开的。公共读者不会打开网关 WebSocket、订阅会话名册、发送消息、调用工具或打开私有仪表板。它显示每条用户和助理文本消息，包括进度更新，以及 Markdown 格式和代码复制控件。相邻的工具调用出现在折叠的步骤中，并带有工具名称和简短的命令、路径或查询摘要；工具结果文本保持私密。用户、助手和工具结果图像通过绑定到同一出版物和文字记录条目的公共媒体路径以全尺寸打开。检查字节后，仅提供大小上限的 PNG、JPEG、GIF 和 WebP 图像。其他附件显示为文件名片，没有下载链接。推理、可执行小部件、内部元数据和隐藏消息被省略。包含的文本未经过秘密屏蔽。在发布之前检查对话中的凭据和其他敏感内容；未来的消息也会公开。

最新的公共视图在可见时大约每 15 秒检查一次更新，并在选项卡返回或连接恢复在线时赶上。当您看到最新消息时，更新会跟随对话，但当您向后滚动时，会保留您的位置和扩展的工具步骤。 **Top** 和 **Latest** 让您无需重新加载即可跳跃； **立即刷新** 检查到位并在连接失败时显示重试状态。 **较旧的消息** 打开较早的页面而不自动刷新； **返回最新**返回实时视图。页面包含大约 50 个可见消息和工具步骤组，最新页面在前，每个页面内按时间顺序排列。阅读和消息大小限制仍然适用，并带有明显的遗漏通知。初始对话和社交元数据无需 JavaScript 即可工作。

公共会话链接包括一张 1200 × 630 预览卡，其中包含会话标题和开放公共请求。当记录的工作树更改已可用时，该卡会显示包含更改计数和记录的 PR/check 详细信息的工作收据。卡片保留包含的文本，无需秘密屏蔽，并且从不获取 Git 或 GitHub 数据；遗漏的事实被省略。不可用的会话使用通用 OpenClaw 卡。撤销后，预览图像可能会被收件人缓存五分钟。

当请求期间会话发生更改时，公共读取会等待当前共享事实。如果页面在准备过程中发生变化，读者可以返回暂时不可用的响应；重试会读取当前出版物。

### <a id="revocation-and-older-links"></a> 撤销和旧链接

**禁用公共访问**通过正常线程URL停止匿名读取。重新启用发布使相同的 URL 再次可读。重置、替换、分叉或删除会话不会将其发布传输到新实例。禁用访问无法撤回读者已下载的副本。

之前发布的 `/share/session` 令牌链接仍与其原始出版物和确切的会话实例绑定。禁用和重新启用公共访问不会恢复那些旧的令牌链接。它们的加密令牌仍然与安装身份绑定，与网关登录密码或令牌无关。完整备份保留该身份和会话数据库；仅将代理数据库移动到另一个安装会使其旧令牌链接失效。普通线程URL不是秘密能力：当前公共共享状态决定是否允许匿名访问。

### <a id="login-proxy-deployment"></a> Login-代理部署

在更改代理之前部署公共线程处理程序。允许 Control UI 的 `/chat/*` 命名空间和现有 `/share/*` 命名空间（包括配置的基本路径）下的匿名线程文档请求。网关拒绝公共线程文档上的突变方法。将根应用程序、WebSocket、引导程序、API、媒体、仪表板、设置和受保护的 `/__openclaw__/session-entry` 登录切换保留在身份验证后面。不要绕过整个主机或 `__openclaw__` 命名空间的身份验证。

公共线程路由不信任绕过路径上的身份标头。它的小型浏览器帮助程序检查受保护的会话进入路由，并仅通过现有的身份验证和会话权限所有者进入经过身份验证的应用程序。登录返回目标必须是同源聊天路径；外部 URL 和任意 application/API 路径都会被拒绝。

将 `gateway.publicOrigin` 设置为外部 HTTPS 源，并使可信代理使用外部方案覆盖 `X-Forwarded-Proto`。验证公共线程和共享卡不带 cookie、私有线程不公开、登录返回同一线程以及所有受保护路由上的身份验证。 OpenClaw 不会自动更改 Cloudflare 访问或其他代理策略。

### <a id="reader-capacity"></a> 读卡器容量

公共页面共享有界渲染表示和正在进行的工作。提交的会话和记录更改使受影响的页面无效；每个回复，包括`304 Not Modified`，仍然检查实时发布权限。表示仅保留在服务器上，而不保留在共享 browser/CDN 缓存中。可以同时运行八个不同的构建，一个发布运行两个，还有 32 个附加构建排队。过载返回 `503` 和 `Retry-After`。

一个归因客户端的请求预算为每分钟 120 个，一个发布的请求预算为每分钟 240 个，包括缓存的响应。这些读卡器可在默认刷新间隔下容纳 1 个 IP 后面的 20 个读卡器，而不会消除滥用限制。它们是准入预算，而不是每台主机上吞吐量的保证。

## <a id="person-activity-urls"></a> 个人活动 URL

使用可读的活动链接打开某人最近的会话：

```text
/activity/ada-12345678abcd
/activity/ada-12345678abcd?time=30d&q=release
```

新链接使用此人的显示名称别名及其个人资料的前 12 个小写十六进制字符 UUID，并省略 UUID 破折号。这个名字是装饰性的：重命名的人和过时的名字仍然通过 id 前缀解析。缺少名称会产生裸前缀链接。

接受 8 到 32 个十六进制字符的前缀。如果前缀与多个配置文件匹配，“活动”将显示错误而不是选择人员。如果配置文件行丢失，保留会话中记录的配置文件身份仍然可以解析；它们还在会话过滤器之前参与歧义检查。对于受限读者，查找仅使用调用者可见的会话关联；隐藏草稿和隐身会话不会影响分辨率或模糊性。搜索、时间窗口和分页不会缩小可见范围。使用较长的前缀、完整的 32 个字符紧凑 UUID 或完整的虚线 UUID 来选择确切的配置文件。名字永远不会打破平局。

现有的 `/activity?person=<profile-id>` 链接仍然被接受，并在解析后替换为人员路径，而不添加浏览器历史记录。搜索和时间过滤器仍然是查询参数。精确的 UUID 书签保留所有 32 个十六进制字符，并且未解析的 ID 永远不会重定向到更短的前缀。清除人员过滤器会返回到 `/activity`，同时保留这些过滤器。正常网关身份验证和会话可见性规则适用于每种表单。

## <a id="terminal-urls"></a> 终端 URL

主终端页面保留侧边栏和应用程序镶边：

```text
/terminal
/terminal/<terminalSessionId>
/terminal?catalog=<catalogId>&host=<hostId>&thread=<threadId>
```

`/terminal` 打开终端的默认恢复或选取器视图。 `/terminal/<terminalSessionId>` 附加`sessions.catalog.startTerminal`或`terminal.open`返回的网关终端会话；将 ID 编码为一个路径段。目录查询恢复由本机目录链接使用的相同 `catalog`、`host` 和 `thread` 值标识的本机 CLI 线程。使用 `URLSearchParams` 对查询值进行编码。显式终端会话 ID 优先于目录查询。

从新会话启动本机 CLI 会将草稿 URL 替换为其终端会话 URL。目录 **在终端中打开** 操作打开目录查询表单。离开终端页面会保留其网关 PTY 以便重新连接，并受 [ 终端会话生命周期 ](/web/control-ui/panels#operator-terminal) 的约束。

`/terminal` 是 `/focus/terminal` 的正常路由对应项，它删除了侧边栏和应用程序镶边。两者都需要终端能力和运营商访问权限。所有终端路径均接受配置的 Control UI 基本路径。

## <a id="focus-presentation-routes"></a> 焦点演示路线

焦点路由会渲染一个受支持的内容表面，而无需正常的 Control UI 应用程序镶边。焦点演示与浏览器全屏分离：打开焦点路线不会调用浏览器全屏 API。

紧接着配置的 Control UI 基本路径之后插入 `/focus`。如果存在则删除它会返回相应的正常路由：

```text
/dashboard/roboclaw/the-daily-claw-6d7c9ccb
/focus/dashboard/roboclaw/the-daily-claw-6d7c9ccb

/openclaw/dashboard/roboclaw/the-daily-claw-6d7c9ccb
/openclaw/focus/dashboard/roboclaw/the-daily-claw-6d7c9ccb
```

仪表板焦点路线使用上面完整的标准 `/dashboard` 格式：

```text
/focus/dashboard/<agentId>
/focus/dashboard/<agentId>/<sessionRef...>
```

Control UI 在将仪表板路由传递到共享会话解析器之前删除焦点修饰符。地址栏更新和模糊候选链接保留 `/focus`。丢失、不明确和不可用的会话仍然可见，并且在解析会话密钥之前不会读取仪表板。

其他重点目标是：

```text
/focus/terminal

/focus/desktop
/focus/desktop/source/<encodedSource>
/focus/desktop/session/<encodedExactSessionKey>
/focus/desktop/control
/focus/desktop/control/source/<encodedSource>
/focus/desktop/control/session/<encodedExactSessionKey>
```

使用 `encodeURIComponent` 对桌面源和精确会话密钥值进行编码，以便每个值占用一个路径段。空源和会话值被省略。如果本机调用者提供两个非空值，则源形式获胜。可选的`control`段请求初始控制；它不授予控制权或授权连接。

焦点目标和桌面标识或选项仅是路径。凭据不属于这些 URL。每个目标都保留其正常或嵌入式表面的启动、身份验证、权限和功能检查。特别是，终端仍然需要 `gateway.terminal.enabled` 和 `operator.admin` 连接。

之前发布的稳定版本 `/?view=terminal`。 Control UI 仅在应用程序根目录（或 `<basePath>/?view=terminal`）接受该表单，并立即在浏览器历史记录中将其替换为同一基本路径下的 `/focus/terminal`，从而删除旧的 `view` 参数。新链接必须使用 `/focus/terminal`。该查询表单在其他应用程序路径上无法识别，并且不接受已删除的桌面和仪表板查询表单。

`/focus` 和不受支持的 `/focus/*` 目标在没有普通应用程序 shell 的情况下显示错误。他们不开辟正常的申请途径。

## <a id="beam-share-urls"></a> Beam 分享 URL

Beam 上传返回专用共享路径，例如：

```text
/beam/fix-the-upload-flow-0123456789ab
```

该路由是现有只读 Beam 会话目录的适配器，而不是单独的记录或存储路径。当目录记录呈现时，它保留在浏览器地址栏中。正常网关身份验证仍然适用； URL 标识Beam 行但不授权访问。

共享链接在默认代理的聊天中打开。侧边栏和仪表板导航保留显式目录查询 URL，以便保留选定的代理和视图。

新 URL 使用与常规会话链接相同的显示名称 slug，后跟第一个12小写十六进制字符32- 字符光束 ID。 slug 是装饰性的：裸 ID 链接和过时的名称仍然通过 id 解析，浏览器会用当前标题替换 slug，而不添加历史记录。如果标题没有产生 slug，则URL仅包含 id 前缀。十二个字符提供48位；反对梁的500-行保留界限，任何对共享该前缀的概率约为1 in 2.26十亿。分辨率仍然从不假定唯一性：必须恰好有一个保留行匹配。缺少的前缀显示会话恢复链接，而不明确的前缀显示匹配的行并要求更长的 ID。任何更长的小写十六进制前缀到完整的32- 接受角色 ID。大写、非十六进制、较短和较长的 id 后缀或额外的路径段均无效。

对于 `gateway.controlUi.basePath: "/openclaw"`，请使用 `/openclaw/beam/fix-the-upload-flow-0123456789ab`。

## <a id="route-table"></a> 路由表

此表列出了每个 Control UI 应用路由。破折号表示该路由没有特定于路由的 URL 参数。

| 页面                | 主要路径                                   | 别名                   | 参数或动态形式                                                       |
| ------------------- | ---------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| 聊天                | `/chat`                                        | -                         | 上述基于键的会话形式；`?draft=<text>`                                   |
| 仪表板           | `/dashboard`                                   | -                         | 上述基于键的会话形式；`?draft=<text>`                                   |
| 光束转录本     | `/beam/<title>-<beam-id>`                      | `/beam/<beam-id>`         | 可选的标题和 12-32 个小写十六进制 ID 字符                 |
| 仪表盘列表          | `/dashboards`                                  | -                         | -                                                                                 |
| 询问 OpenClaw        | `/custodian`                                   | -                         | `?intent=new-agent`, `?onboarding=1`                                              |
| 新会话         | `/new`                                         | -                         | `?agent=<agentId>`, `?catalog=<catalogId>`                                        |
| 活动            | `/activity`                                    | -                         | `?view=run&run=<run-id>`, `?view=run&execution=<execution-id>`                    |
| 人员活动     | `/activity/<name>-<profile-id>`                | -                         | 可选名称 slug 和 8-32 个小写十六进制 id 字符                   |
| 应用                | `/apps`                                        | -                         | -                                                                                 |
| 门户网站             | `/portals`                                     | -                         | -                                                                                 |
| 智能体              | `/settings/agents`                             | `/agents`                 | `/settings/agents/<agentId>[/<panel>]`                                            |
| 渠道            | `/settings/channels`                           | `/channels`               | 下面的共享设置参数                                                  |
| 连接          | `/settings/connection`                         | -                         | 下面的共享设置参数                                                  |
| 旧版常规设置      | `/settings/general`                            | `/config`                 | 重定向到外观 → 语言                                                |
| 配置文件             | `/settings/profile`                            | `/profile`                | 下面的共享设置参数                                                  |
| 通信      | `/settings/communications`                     | `/communications`         | 下面的共享设置参数                                                  |
| 外观          | `/settings/appearance`                         | `/appearance`             | 下面的共享设置参数                                                  |
| 通知       | `/settings/notifications`                      | -                         | 下面的共享设置参数                                                  |
| 安全            | `/settings/security`                           | -                         | 下面的共享设置参数                                                  |
| 密钥             | `/settings/secrets`                            | -                         | 下面的共享设置参数                                                  |
| 高级            | `/settings/advanced`                           | -                         | 下面的共享设置参数                                                  |
| 批准           | `/settings/approvals`                          | -                         | 下面的共享设置参数                                                  |
| 自动化设置 | `/settings/automation`                         | `/automation`             | 下面的共享设置参数                                                  |
| MCP                 | `/settings/mcp`                                | `/mcp`                    | 下面的共享设置参数                                                  |
| 记忆              | `/settings/memory`                             | -                         | `/settings/memory/memories\|dreams\|settings`                                     |
| 基础设施      | `/settings/infrastructure`                     | `/infrastructure`         | 下面的共享设置参数                                                  |
| 实验室                | `/settings/labs`                               | -                         | 下面的共享设置参数                                                  |
| 关于               | `/settings/about`                              | -                         | 下面的共享设置参数                                                  |
| AI 和 Agents       | `/settings/ai-agents`                          | `/ai-agents`              | 下面的共享设置参数                                                  |
| 模型设置         | `/settings/model-setup`                        | `/model-setup`            | `?firstRun=1`                                                                     |
| 模型提供商     | `/settings/model-providers`                    | `/model-providers`        | 下面的共享设置参数                                                  |
| 导入记忆       | `/memory-import`                               | `/settings/memory-import` | -                                                                                 |
| 工作看板           | `/workboard`                                   | -                         | `/workboard/<boardId>`                                                            |
| 工作树           | `/worktrees`                                   | `/settings/worktrees`     | -                                                                                 |
| 会话            | `/sessions`                                    | `/settings/sessions`      | `?session=<sessionKey>`, `?status=archived\|all`                                  |
| 用量               | `/usage`                                       | -                         | -                                                                                 |
| 调试               | `/debug`                                       | -                         | -                                                                                 |
| 日志                | `/logs`                                        | -                         | -                                                                                 |
| 技能工作坊      | `/skills/workshop`                             | -                         | -                                                                                 |
| 技能              | `/skills`                                      | -                         | -                                                                                 |
| 插件             | `/plugins`                                     | -                         | -                                                                                 |
| 插件设置     | `/settings/plugins`                            | -                         | `?tab=advanced`, `/settings/plugins/<pluginId>`                                   |
| 自动化         | `/automations`                                 | `/cron`                   | `?job=<jobId>`, `?job=<jobId>&run=<runId>`                                        |
| 设备             | `/settings/devices`                            | `/nodes`                  | 下面的共享设置参数                                                  |
| 插件标签页宿主     | 发布广告时为 `/<slug>`； `/plugin` 否则 | -                         | 通用主机：`?plugin=<pluginId>&id=<tabId>`；选项卡参数：`?p.<key>=<value>` |

一旦插件选项卡已知，带有可用 slug 的选项卡的通用 `/plugin?plugin=<pluginId>&id=<tabId>` 链接在浏览器历史记录中就会被替换为 `/<slug>`，从而保留 `p.*` 参数和片段。没有可用 slug 的选项卡保留通用 URL。两种形式在 Control UI shell 内安装相同的插件页面； slugs 不会创建插件 HTTP 路由。打开或重新加载 slug 会在网关连接时保留该目标，即使浏览器记住了聊天会话也是如此。在网关提供其插件选项卡后，未知的 slugs 会重新开始聊天。

自动化链接独立于当前列表过滤器或加载的页面打开确切的作业。添加 `run` 将打开其运行历史记录并突出显示匹配的加载运行。丢失的作业表明网关的查找错误。

使用基于 schema 的深链接的设置路由接受 `?section=<section>`、 `?advanced=1` 和 `#<setting-id>`。这些值用于选择页面内的内容； 它们不会改变路由标识。

移动到另一个页面的“设置”部分的链接将旧的 URL 替换为当前目标，同时保留设置锚点。后退返回到链接之前的页面，前进返回到当前目标。

与 `?firstRun=1` 或 `?firstRun=explicit` 的模型设置链接保留首次运行的载入流程。如果没有任一标记，`/settings/model-setup` 和 `/model-setup` 会重定向到 `/settings/model-providers?connect=1`，这将打开模型上的连接对话框。否则，在连接提供商或查看网关发现时，模型页面将保持不变。

提供者登录后，模型会刷新凭据和共享模型目录，而无需重新加载其现有行、使用情况或成本请求。如果凭证已保存但状态无法刷新，页面将保留其行并提供 **Retry**。

已弃用的常规路由及其 `/config` 别名会被一次性替换为 `/settings/appearance?section=__appearance__#settings-language`。历史上的 `#settings-general-model` 目标则会跳转到“模型”行为部分。

内存选项卡使用表中的路径而不是 `?tab=`。具有 `?tab=memories|dreams|settings`、`?tab=dreaming`、`?tab=search` 或 `?section=memory` 的旧内存链接将被替换为相应的路径一次，同时保留任何设置锚点和其他查询参数。当匹配字段被高级时，内存设置搜索会添加 `?advanced=1`，从而打开高级组，而无需更改浏览器保存的高级设置首选项。重新加载或包含 `advanced=1` 的旧内存链接后，相同的显示仍然存在。

插件目录标签页也使用路径，而不是 `?tab=`。带有 `?tab=discover|installed` 的旧版链接会被一次性替换为相应路径，同时保留其他查询参数和片段。

代理选择及其 `overview|files|tools|skills|channels|cron|memory` 面板使用路径。带有 `?agent=<agentId>` 的旧版链接会被一次性替换为代理路径，同时保留其他查询参数和片段。

<a id="special-documents-and-startup-modes" />

## <a id="other-special-documents-and-startup-modes"></a> 其他特殊文件及启动方式

这些由 Gateway 提供的文档位于应用路由表之外：

- `/?onboarding=1` 打开首次运行引导演示。
- `/approve/<approvalId>` 打开独立的审批文档。对于基本路径，请使用 `<basePath>/approve/<approvalId>`。 id标识批准但从未授权；正常的网关身份验证仍然适用。批准通知使用范围相对批准路径，并且当所属网关具有 `gateway.publicOrigin` 时，可以添加 `#gatewayUrl=<encoded-ws-url>`。 Control UI 在身份验证之前剥离该片段，并应用下面的正常远程网关切换。

注册的精确和前缀插件HTTP路由可以拥有`/focus`和`/focus/*`。插件身份验证和调度拒绝请求后，网关使用这些路径作为 Control UI 焦点回退：无人认领的 `GET` 和 `HEAD` 请求提供 Control UI 文档，而其他方法则返回 `404`。当 Control UI 服务被禁用时，每个无人认领的方法都会返回 `404`。 `/focused` 等相似项不属于焦点后备的一部分。

对于所有 HTTP 方法，审批命名空间都会在插件 HTTP 路由之前被保留。当禁用 Control UI 提供服务时，它会返回 `404`，而不是继续匹配到插件路由。

## <a id="remote-gateway-handoff"></a> 远程 Gateway 交接

Vite开发UI可以连接不同的网关：

```text
http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
```

URL-encode 完整的 `ws://` 或 `wss://` 值。 `gatewayUrl` 仅在顶级窗口中被接受，加载后存储，并从地址栏中删除。首选 `#token=`，因为片段不会进入 HTTP 请求日志或 Referer 标头。旧版 `?token=` 切换仍然是仅引导程序的凭证回退，并会立即被剥离。密码仅保留在内存中。

当 `gatewayUrl` 选择另一个 Gateway 时，UI 不会回退到本地配置或环境凭据。请显式提供远程 Gateway 的 token 或密码，并在 TLS 后面使用 `wss://`。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [Beam插件](/plugins/beam)
- [仪表盘](/web/dashboard)
- [会话仪表盘](/web/dashboards)。
