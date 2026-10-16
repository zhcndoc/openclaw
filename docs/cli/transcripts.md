---
summary: "CLI `openclaw transcripts` 的参考（列出、显示和导出存储的转录本）"
read_when:
  - "你想从终端读取已存储的转录摘要"
  - "您需要成绩单 Markdown 摘要的路径"
  - "你正在调试核心转录存储布局"
  - "您希望代理或 Control UI 阅读过去的会议记录"
  - "您想要在 Control UI 中浏览会议或配置捕获"
title: "转录 CLI"
---

# `openclaw transcripts`

检查员和导出命令以获取持久的会议记录。 [Google Meet](/plugins/google-meet)、[Microsoft Teams](/plugins/teams-meetings)、[Slack huddles](/plugins/slack-huddles) 和 [Zoom](/plugins/zoom-meetings) 浏览器参与者自动捕获笔记； `transcripts`代理工具还支持提供商捕获和手动导入。

存储的转录本状态位于 `$OPENCLAW_STATE_DIR/state/openclaw.sqlite` 的共享 SQLite 数据库中。 `show` 和 `path` 在状态目录下显式实现面向用户的工件：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

这些文件是导出内容，不是第二份运行时存储。OpenClaw 在捕获、 摘要生成或列表过程中不会重新读取它们。默认状态目录是 `~/.openclaw`；可通过 `OPENCLAW_STATE_DIR` 覆盖。日期目录来自会话开始时间； 会话目录是根据会话 id 派生的适合文件系统的 slug。

## <a id="read-transcripts-in-the-control-ui"></a> 阅读Control UI中的成绩单

在 [Control UI](/web/control-ui/settings#meetings-page) 中，打开侧边栏的铅笔菜单（**编辑固定项目**）并选择 **Meetings** 以浏览相同的 SQLite 存档`/meetings`。您可以将会议固定到侧边栏；默认情况下它不被固定。会议记录与 **Sessions** 中的座席聊天历史记录是分开的。

会议显示在按开始日期分组的最新时间线中，并保存每个会议的摘要预览。打开库会以全宽显示时间线；选择会议将打开其阅读器。库和阅读器在获取数据时显示加载指示器，并且即使长时间会议超出聊天消息渲染限制，存储的注释也会呈现为 Markdown。

搜索标题、session/source ID、保存的摘要注释和成绩单文本；不搜索会议 URL。按确切的提供商、帐户或代理 ID 或按会话开始日期进行过滤。日期过滤器使用 UTC：**Started on or after** 包括选定的日期，**Started before** 排除它。结果加载在顺序一致的页面中。更改过滤器或选择 **Refresh** 会再次开始分页。

选择一个会议以打开其存储的 **Summary**。现有的 `/meetings?selector=...` 书签继续工作。选择 **Transcript** 作为带时间戳的演讲者文本。 **在此记录中搜索** 搜索网关上存储的话语，包括浏览器中尚未加载的文本。阅读器自动加载每一页并保持完整的文字记录可见。阅读器、下载和新生成的注释中省略了 `context:` 和 `###` 等独立转录工件。新捕获会跳过这些行；现有的原始存档行保持不变。 URL 保留选定的会议和选项卡。当您具有写入权限时，使用保存的语音打开会议会自动生成丢失的笔记。阅读器会显示生成进度，并在生成失败时提供重试。

**下载 Markdown** 包括文字记录和任何存储的摘要。 **Download JSONL** 导出读者的公共话语投影，不包括提供者私有元数据和本地文件系统路径。本地 CLI 导出保留其现有的原始格式。如果没有部分文件，浏览器导出大于 4 MiB 的文件会明显失败；在网关主机上使用 `openclaw transcripts path <session> --transcript` 或 `openclaw transcripts path <session> --dir` 进行较大的导出。

存档读取需要 `operator.read` 或其 write/admin 含义和读取共享存档的权限。在受限的多用户配置文件上，选择代理过滤器不会授予存档访问权限。捕获配置需要 `operator.admin`。

## <a id="commands"></a> 命令

```bash
openclaw transcripts list
openclaw transcripts show <session>
openclaw transcripts show YYYY-MM-DD/<session>
openclaw transcripts path <session>
openclaw transcripts path YYYY-MM-DD/<session>
openclaw transcripts path <session> --dir
openclaw transcripts path <session> --metadata
openclaw transcripts path <session> --transcript
openclaw transcripts list --json
openclaw transcripts show <session> --json
openclaw transcripts path <session> --json
```

| 命令                       | 描述                                          |
| ----------------------------- | ---------------------------------------------------- |
| `list`                        | 列出已存储的会话。                                |
| `show <session>`              | 打印并生成 `summary.md`。                  |
| `path <session>`              | 生成并打印 `summary.md` 路径。         |
| `path <session> --dir`        | 生成所有工件并打印其目录。 |
| `path <session> --metadata`   | 生成并打印 `metadata.json`。               |
| `path <session> --transcript` | 生成并打印 `transcript.jsonl`。            |
| `--json`                      | 输出机器可读格式结果（适用于任何子命令）。      |

使用 `list` 打印的选择器来寻址精确捕获。现有导出选择器的优先级高于具有相同文本的原始会话 ID。否则，`show` 和 `path` 接受 `YYYY-MM-DD/<raw-session-id>`，保留整个后缀文字，包括标点符号和斜杠。例如：

```bash
openclaw transcripts show '2026-05-22/notes: room/one'
```

如果两种限定形式均未找到捕获，则完整的输入将作为文字原始会话 ID 或导出 slug 进行匹配，区分大小写。原始 ID 中的类似日期的前缀不会阻止此查找。多个匹配需要一个带日期的选择器；没有对原始 ID 进行清理来选择捕获。默认会话 ID 包括时间戳和随机后缀；仅当 ID 在一天内唯一时，才为会话提供固定的 ID。

如果文件系统安全导出名称超过 255 个字节，OpenClaw 会将其缩短为前缀加上完整原始会话 ID 的 SHA-256 哈希值。仅导出导出名称及其选择器发生变化；原始会话 ID、提供商停止句柄和存储的注释保持不变。已经适合的名称保持不变。使用 `list` 打印的选择器作为缩写名称。对于存储名称过大的现有会话，运行 `openclaw doctor --fix` 来修复其派生选择器，而不更改存储的注释。

## <a id="output"></a> 输出

`list` 会为每个会话打印一行以制表符分隔的内容：选择器、开始时间、标题、 摘要路径。

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/user/.openclaw/transcripts/2026-05-22/standup/summary.md
```

选择器是传回给 `show` 或 `path` 时最安全的值。

## <a id="tool-selectors"></a> 工具选择器

### <a id="reading-notes-from-any-session"></a> 阅读任何会话的笔记

要求客服人员使用 `transcripts` 工具列出过去的会议并阅读他们的笔记。读取与捕获会议的代理会话无关。接线员呼叫者可以阅读网关上的所有会议。频道呼叫者只能阅读源提供商允许的会议； Discord 语音朗读保留在呼叫者行会内。这些读取权限不会更改捕获或摘要写入权限。

```json validate=false
{ "action": "list", "limit": 20 }
```

`list` 首先返回最新的会议，包括选择器、开始时间、标题或提供者名称、发言计数和参与者。 `limit` 默认为 20，接受 1 到 50 之间的整数。文本有界；结构化结果位于 `details.sessions` 中。

```json validate=false
{ "action": "show", "selector": "2026-05-22/notes-room-one" }
```

`show` 返回存储的注释 Markdown 和会话详细信息。其文本上限为 12,000 个字符；截断标记指向 `openclaw transcripts show <selector>` 以获得完整音符。没有摘要的捕获报告注释尚不可用，包括它是否处于活动状态。阅读笔记不会重新生成摘要或导出工件。

### <a id="selecting-a-capture"></a> 选择捕获

`transcripts` 工具从启动、导入、停止和汇总返回未更改的原始 `sessionId` 和导出 `selector`。授权的 `status` 结果包括用于主动捕获的选择器和等待最终确定的条目。其面向模型的文本显示最多三个完整的选择器，优先考虑等待最终确定的捕获并报告任何遗漏的计数。结构化状态详细信息保留完整的授权列表。有界主动捕获摘要包括源定位器和标题，以便代理可以识别预期的会议。优先选择 `selector` 进行后续显示、停止或汇总调用：

```json validate=false
{ "action": "summarize", "selector": "2026-05-22/notes-room-one" }
```

显示、停止和汇总需要 `selector` 或 `sessionId` 之一。其他动作拒绝`selector`；启动和导入继续通过 `sessionId` 接受原始 ID。显式 `selector` 输入接受导出选择器和上面的历史 date/raw-ID 形式，但永远不会回退到作为原始 ID 的整个输入。

旧版 `sessionId` 输入将合格的和 raw/slug 的含义一起考虑。如果他们识别出不同的捕获，该工具会报告歧义，但不会列出候选者详细信息。捕获结束后，这仍然不明确。使用由启动、导入或授权的 list/status 返回的选择器，或在本地检查 `openclaw transcripts list` 并在 `selector` 字段中传递所需的值。 raw-ID/selector 冲突的双方仍可由其自己的导出选择器寻址。

如果没有冲突的限定含义或不同的原始 ID/slug 候选者，旧版 `sessionId` 会选择当前精确的原始 ID 捕获进行停止和汇总，即使历史捕获重用该 ID 也是如此。由于没有当前捕获，重复的历史 ID 需要有日期的选择器。较旧捕获的显式选择器不会停止其较新的 Same-ID 同级。

`show` 选择并授权持久捕获，仅使用实时状态来报告捕获是否处于活动状态。即使一次捕获处于活动状态，重复的历史 ID 也需要一个带日期的选择器。

## <a id="gateway-and-control-ui-reads"></a> Gateway 和 Control UI 读取

在 [Control UI](/web/control-ui/settings#meetings-page) 中打开 **Meetings**，无需终端即可浏览捕获的会议和笔记。该页面和其他网关客户端使用以下 RPC 方法：

| 方法                  | 参数                                                                                                                                             | 结果                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transcripts.list`      | 可选 `limit`（1–200，默认 50）、`cursor`、`query`、精确 `providerId`/`accountId`/`agentId` 和 `startedAfter`/`startedBefore` 日期时间范围 | 最新优先 `sessions`，包括参与者、话语计数、活动状态、摘要可用性、有限概述和 `nextCursor`。                                |
| `transcripts.get`       | 需要`selector`；可选 `includeUtterances`、`limit` （1–100）、`cursor` 和话语 `query`                                                    | 1个`session`，存储`summary`，可选`utterances`和`nextCursor`。显式分页返回全文；旧请求保留如下所述的最近窗口。  |
| `transcripts.summarize` | 需要 `selector`                                                                                                                                    | 生成缺失的音符并返回与 `transcripts.get` 相同的 `session` 和 `summary` 形状。现有笔记被保留；并发请求共享摘要所有者。 |
| `transcripts.export`    | 需要 `selector` 和 `format`（`markdown` 或 `jsonl`）                                                                                               | 包含 `filename`、`mimeType` 和 `sizeBytes` 的 Base64 编码文件。                                                                                                         |
| `transcripts.status`    | 无                                                                                                                                                   | 捕获支持、提供商可用性和设置元数据、配置源运行状况、活动订阅以及最新保存的记录。                              |

读取方法需要 `operator.read` 或其 write/admin 含义； `transcripts.summarize` 需要 `operator.write`。所有方法都在一个受信任的网关域中公开会议。受限操作员配置文件需要读取共享存档的权限；选择代理过滤器并不授予访问权限。当读者需要隔离时，请使用单独的网关域。源定位器仅包含 `providerId`、`accountId`、`guildId`、`channelId`、`threadTs`、`fileId`、`kind` 和已清理的 `meetingUrl`（如果存在），绝不任意捕获元数据。请参见[网关协议](/gateway/protocol)。

列表搜索匹配标题、session/source ID、保存的摘要 Markdown 和概述以及存储的话语文本，不包括源会议 URL 和私有元数据。日期范围使用会话开始时间：包含 `startedAfter`，不包含 `startedBefore`。使用 JavaScript 日期字符串语义即时比较日期，包括存储的 UTC 偏移量。原始时间戳和选择器保持不变。不可解析的存储日期排在最后，并且被排除在日期范围之外。相等的时刻按会话 ID 排序，然后是原始时间戳。按时间顺序排列的页面选择会扫描候选捕获内容，并在搜索时扫描其保存的笔记和话语，然后仅投影所选页面的笔记和参与者。搜索时间随着搜索保存的文本而增加。游标属于其当前查询和过滤器；更改任何一个都需要新的首页。空 `nextCursor` 结束分页。

存储的摘要 Markdown 是保存的注释文本，与 CLI 的 `show` 输出匹配。读取不会生成摘要或具体化文件。除非 `includeUtterances` 为真，否则话语将被省略。提供 `limit`、`cursor` 或 `query` 选择分页读取：每页最多 100 个话语，默认 50 个，不截断存储的文本。 `query` 搜索完整存储的文字记录，包括卸载的页面。分页读取、列表和状态结果限制为 1 MiB，在传输到 JavaScript 之前强制执行存储的有效负载限制。过大的行或无效的游标会明显失败。参与者摘要和 model/heuristic 出处会在可用时显示；旧的摘要不需要包含它们。

为了与存档分页之前发布的客户端兼容，不带 `limit`、`cursor` 或 `query` 的 `transcripts.get` 按时间顺序保留最近的 2,000 个话语，每个清理后的文本被剪辑为 4,000 个 UTF-16 单元。这些旧请求返回 `nextCursor: null` 并保留 25 MiB 公共结果上限，与现有网关客户端传输限制相匹配。它们在文本剪辑和公共投影之前保留了原始的原始行阅读行为。发送显式 `limit` 以采用有界页面读取并检索完整文本；继续 `nextCursor` 直到它为空。所有存档访问检查都适用于这两种请求形状。

导出限制为 4 MiB，并且失败且不返回部分文件。 Markdown 保留存储的笔记并将完整的记录附加在单独的标题下。 JSONL 包含公共话语投影：序列、话语 ID、全文、说话者身份、源时间戳和最终性（如果可用）。它不包括私有提供者元数据和文件系统路径；本地 CLI 导出保留其原始话语格式。在网关主机上使用 `openclaw transcripts path <session> --transcript` 进行较大的导出。

状态报告已注册订阅，但未确认录制。 `armed`、`not-active` 和 `unknown` 保持不同；仅经过清理的 URL 无法证明哪个原始邀请启动了捕获。提供程序、配置源和活动列表的条目数限制为 100 个，并省略计数。保存的话语计数来自持久行。最新记录是最近更新的包含话语的会话；源语音时间不是摄取时间戳。

## <a id="json-output"></a> JSON 输出

`list --json` 返回带有 `sessionId`、`selector`、`date`、`title`、`startedAt`、`stoppedAt`、`source`、`path` 的对象， `summaryPath`、`hasSummary`。存储的会议源 URL 仅包含来源和路径；查询字符串、片段和嵌入的凭证在持久化之前被删除。

`show --json` 返回已存储的会话元数据、选择器、会话目录、摘要路径以及摘要 Markdown 文本。

`path --json` 返回所选路径以及该资源是否可以被物化。对于已存储的会话，元数据和转录导出始终存在；在会话拥有摘要之前，摘要路径会报告 `exists: false`。

## <a id="many-sessions-per-day"></a> 每天许多会话

会话按日期分组，然后按会话 ID 分组。一天十次会议变成十个兄弟文件夹：

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

使用默认生成的 id 进行自动化。仅当不会在同一日期重复时才使用 `standup` 等固定 ID。

## <a id="missing-summaries"></a> 缺失摘要

当新的演讲到达时，主动捕获大约每五分钟保存一次更新的笔记。每次更新都会总结保存的记录快照；生成期间到达的语音仍可用于下一次更新。安静捕获不会重复调用模型。停止捕获会在接收到的语音耗尽后保存最终摘要。 Control UI **Summary** 选项卡显示最新保存的笔记及其生成时间。使用已保存的演讲开始会议还可以通过 `transcripts.summarize` 请求丢失的笔记；这会重用捕获摘要所有者并保存注释而不导出文件。只读客户端可以查看现有笔记，但不能请求生成。存档读取 RPC 本身保持只读状态。

会议记录首先使用所有者智能体的实用模型，然后在需要时使用其主要模型。如果没有可用模型、请求超时或模型返回无效输出，OpenClaw 将改为保存基于规则的注释。模型生成增强了笔记；它不会拯救他们。注释包括概述、参与者、决策、行动项目、风险，最后是文字记录，因此有限的读者会在较长的文字记录之前看到注释。网关关闭、重新启动和捕获禁用引流可保存最终启发式注释，而无需启动新模型推理。网关再次可用后，您可以使用该工具的 `summarize` 操作从保存的记录中重新生成模型注释。参与者按照首次出现的顺序来自演讲者标签，而不是模型猜测。摘要 JSON 将 `source` 记录为 `model` 或 `heuristic`，并且对于模型注释，使用所使用的模型参考。

该模型最多接收 48,000 个转录字符，在必须省略中间时保留开头和结尾。存储的话语保持不变。使用 `transcripts summarize`（代理工具的 `summarize` 操作）从存储的记录中重新生成注释，包括在更改模型配置之后。

该工具的 `status` 操作列出了活动的捕获订阅，而不是历史记录。当提供商结束或更换订阅时，OpenClaw 记录 `stoppedAt` 并存储其摘要；该记录仍然可供 `list`、`show` 和该工具的 `summarize` 操作使用。临时传输断开不会终止订阅。停止历史记录不会停止较新的捕获或更改记录的停止时间。

提供程序驱动的完成存储摘要而不导出文件。显式工具停止、导入、汇总和配置的自动启动关闭也尝试实现 `summary.md`。如果终端持久性失败，`status` 会在 `pendingFinalization` 下报告已结束的捕获，与活动捕获分开。使用该工具的 `stop` 操作来重试该会话的持久性，而无需再次停止提供程序。

如果提供程序无法完成清理并且未报告捕获已结束，则 `status` 使用 `cleanupPending: true` 使捕获保持活动状态。现有的话语保持不变，最后的注释等待清理。提供程序恢复后，使用相同的选择器重试 `stop`。替换或禁用插件不会将清理工作转移到另一个提供程序实例。

如果捕获仍处于活动状态，如果提供程序在停止期间失败，或者如果在任何话语到达之前存储了元数据，则会话可能会出现在 `list` 中，而没有摘要。

使用 `path <session> --transcript` 来检查原始的仅追加转录，或者运行 `transcripts` 工具的 `summarize` 操作来重新生成 Markdown 摘要。

在可选工件导出之前，摘要保存在 SQLite 中。如果导出失败，即使 `summary.md` 丢失，保存的摘要仍然可用。配置的自动启动会在关闭期间捕获导出失败或提供程序停止错误的日志警告。纠正导出目标问题，然后运行 ​​`openclaw transcripts path <session>` 或 `openclaw transcripts show <session>` 重试导出；警告中的预期路径并不是导出文件的证据。

没有完整帐户所有者元数据的历史会话保留在本地恢复路径上。通过该代理的本地轮次来恢复该代理拥有的行；没有代理归属的行需要本地主代理轮流。没有帐户绑定的源在其正常表面上保留主代理访问权限。丢失的提供者、部分所有者元数据和无帐户历史源也保留在本地恢复路径上。

```bash
openclaw agent --agent <owning-agent-or-main> --local --message \
  "Use transcripts summarize for session <session>."
```

## <a id="upgrading-the-legacy-file-store"></a> 升级旧版文件存储

OpenClaw 早于 SQLite 存储的版本直接在 `$OPENCLAW_STATE_DIR/transcripts/` 下方写入运行时状态。跑步：

```bash
openclaw doctor --fix
```

Doctor 会将完整的旧版树导入 SQLite，验证行数和顺序，记录迁移回执，并将已验证的源树移动到带时间戳的 `transcripts.migrated-*` 归档中。运行时命令不会回退到旧版文件。请保留该归档，直到你已验证导入的会话以及你依赖的任何导出。

## <a id="configuration"></a> 配置

打开 **设置 → 通讯 → 会议捕获** 编辑现有的 `transcripts.enabled` 和 `transcripts.autoStart` 设置。 **启用转录本存储**控制是否允许持久捕获；每个自动启动源都会选择一个提供者和源。您可以添加或删除源并编辑其标题、帐户、源定位器和可选的自定义会话 ID。占用模式会自动选择会话 ID，因此其自定义 ID 字段将被禁用，同时保留保存的值。

这些控件使用共享设置草稿、自动保存、验证和应用流程。如果出现 **应用更改**，请使用它来激活保存的更改。如果重新启动中断了待处理的草稿，则重新连接后暂停的 **Autosave** 会保留该草稿，而不将其发送到新连接。查看它并在“设置”页脚中选择“**Save**”。完整的记录模式编辑器可在 **会议捕获 → 高级设置** 下找到。

会议捕获设置无需重新启动网关即可应用。删除或更改的来源耗尽了他们收到的演讲并在替换之前完成笔记；不变的来源继续记录。源标题编辑适用于将来的捕获。当前和历史笔记保留其原始标题、来源、代理归属和选择者。

仅当确切失败的提供程序尝试保留重试权限时，启动重试才会保留相同的已承认的 ID、原始标题、开始时间、来源和保存的注释。这适用于生成和配置的 ID。重试在十二次尝试、服务关闭、手动停止或保留清理保管的故障后停止。状态报告有界诊断，没有提供程序错误详细信息。在尝试新的捕获之前，使用该工具的 `stop` 操作恢复挂起的清理。

默认已启用会议转录捕获。如需全局关闭：

```json
{
  "transcripts": {
    "enabled": false
  }
}
```

- `enabled`（默认 `true`）：启用自动会议记录、记录工具和配置的自动启动源。当会议笔记不应保留在主机上时，将其设置为 `false`。明确请求的会议 `transcribe` 模式会保留其现有的有界实时字幕尾部，但在此设置为 false 时不会写入持久行。

使用 `transcripts.autoStart` 配置自动启动源。每个条目都是通过存在来启用的；省略一个条目以禁用该源。 `discord-voice` 是捆绑的具有自动启动功能的源，需要 `guildId` 和 `channelId`。当恰好有一个配置的 Discord 帐户启用了凭据和语音时，OpenClaw 会自动选择它。当多个帐户支持语音时，OpenClaw 选择支持语音的 `channels.discord.defaultAccount`。否则，将`accountId`设置为`channels.discord.accounts`下对应的key；省略的帐户因不明确而被拒绝：

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "accountId": "work",
        "guildId": "1234567890",
        "channelId": "2345678901",
        "whenOccupied": true
      }
    ]
  }
}
```

`whenOccupied` 默认为 `false`：捕获从网关开始并持续直至停止。将其设置为 `true` 以等待人类，然后捕获每个占用事件的一次会议。当人类已经在启动时就开始了；机器人永远不会计数。最后一人离开后，固定的 30 秒宽限期允许短暂重新连接，而不会中断会议。在此恩典期间返回的人类会取消停止。否则，OpenClaw 停止捕获并生成注释。

占用事件使用生成的 ID；条目的 `sessionId` 被忽略。要在网关重新启动后继续会议，OpenClaw 会重新打开同一提供商、帐户、行会和频道在过去 10 分钟内停止的最近会话，并且其存储的 ID 源为 `generated`。该会话保留其原始 ID、标题和开始时间，并附加新的话语。稍后在该窗口内返回也会重复使用该会议；在窗外，capture 获得了新的 ID。新录取记录是否生成或提供了成绩单 ID。如果最新的候选者提供了 ID，或者其来源丢失或无效，则捕获将重新开始，而无需搜索较旧的历史记录。现有注释保持不变且可读。因此，没有记录来源的旧版生成的会议可能会在升级或重新启动后分裂。 Doctor 在恢复元数据时保留记录的来源；它不会推断或回填缺失的起源。如果房间被路由到不同的代理，该代理将开始新的捕获；原始代理保留其存储的会议和摘要权限。

提供者必须报告占用情况。 `discord-voice` 支持；不受支持的提供商会记录警告并跳过该条目，而不是连续捕获。每个 Discord 帐户和行会最多配置一个 `whenOccupied: true` 条目，即使通道 ID 不同：Discord 机器人只能占用每个行会的一个语音通道。随后的冲突条目将被跳过并带有警告。有关完整的只听设置，请参阅 [Discord 会议记录](/channels/discord/voice-transcripts#meeting-notes)。

会议提供商 ID 为 `google-meet`、`teams`、`slack-huddle` 和 `zoom`。它们的别名分别是 `googlemeet`/`meet`、`teams-meetings`/`microsoft-teams`/`msteams`、`slack-huddles` 和 `zoom-meetings`。会议提供者附加到已经活跃的会议机器人会话；正常会议加入不需要 `autoStart` 条目。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [会议插件](/plugins/meeting-plugins) — 捕获这些记录的插件
