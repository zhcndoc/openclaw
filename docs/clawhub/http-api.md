---
summary: "HTTP API 参考（公共 + CLI 端点 + 身份验证）。"
read_when:
  - "Adding/changing 端点"
  - "调试 CLI ↔ 注册表请求"
---

# HTTP API

基础 URL：`https://clawhub.ai`（默认）。

所有 v1 路径均位于 `/api/v1/...` 下。为了兼容，保留旧版 `/api/...` 和 `/api/cli/...`（请参阅 `DEPRECATIONS.md`）。 OpenAPI：`/api/v1/openapi.json`。

## <a id="public-catalog-reuse"></a> 公共目录复用

第三方目录可以使用公共读取端点来列出或搜索 ClawHub 技能。请缓存结果，尊重 `429`/`Retry-After`，将用户链接回规范的 ClawHub 列表 （`https://clawhub.ai/<owner>/skills/<slug>`），并避免暗示 ClawHub 认可第三方网站。请勿尝试在公共 API 表面之外镜像隐藏、私人或受审核阻止的内容。

Web slug 快捷方式可跨注册表系列解析，但 API 客户端应使用读取端点返回的规范 URL，而不是重建路由优先级。

## <a id="rate-limits"></a> 速率限制

执行模式：

- 匿名请求：根据 IP 强制执行。
- 经过身份验证的请求（有效的承载令牌）：每个用户存储桶强制执行。
- 如果令牌是 missing/invalid，则行为回退到 IP 强制执行。
- 当服务器知道原因时， 经过身份验证的写入端点不应返回裸 `Unauthorized`。丢失的代币、invalid/revoked 代币和 deleted/banned/disabled 帐户都应该获得可操作的文本，以便 CLI 客户端可以告诉用户是什么阻止了他们。

- 读取：每个 IP 3000/分钟，每个键 12000/分钟
- 写入：每个 IP 300/分钟，每个键 3000/分钟
- 下载：每个 IP 1200/分钟，每个密钥 6000/分钟（下载端点）

标题：

- 旧版兼容性：`X-RateLimit-Limit`、`X-RateLimit-Reset`
- 标准化：`RateLimit-Limit`、`RateLimit-Reset`
- 在`429`上：`X-RateLimit-Remaining: 0`和`RateLimit-Remaining: 0`
- On `429`: `Retry-After`

标头语义：

- `X-RateLimit-Reset`：绝对 Unix 纪元秒
- `RateLimit-Reset`：复位前的秒数（延迟）
- `X-RateLimit-Remaining` / `RateLimit-Remaining`：准确的剩余预算（如果存在）。分片成功的请求会忽略此标头，而不是返回近似的全局值。
- `Retry-After`：在 `429` 上重试（延迟）之前等待的秒数

`429` 响应示例：

```http
HTTP/2 429
content-type: text/plain; charset=utf-8
x-ratelimit-limit: 20
x-ratelimit-remaining: 0
x-ratelimit-reset: 1771404540
ratelimit-limit: 20
ratelimit-remaining: 0
ratelimit-reset: 34
retry-after: 34

Rate limit exceeded
```

客户指导：

- 如果 `Retry-After` 存在，请等待几秒后再重试。
- 使用抖动退避以避免同步重试。
- 如果 `Retry-After` 丢失，则回退到 `RateLimit-Reset`（或从 `X-RateLimit-Reset` 计算）。

IP 来源：

- 仅当部署显式启用可信转发标头时，才使用可信客户端 IP 标头，包括 `cf-connecting-ip`。
- ClawHub 使用可信转发标头来识别边缘的客户端 IP。
- 如果没有可信客户端 IP 可用，则匿名请求将使用仅受速率限制类型限制的后备存储桶。这些后备存储桶不包括调用者提供的路径、slugs、包名称、版本、查询字符串或其他工件参数。

## <a id="error-responses"></a> 错误响应

公共 v1 错误响应是带有 `content-type: text/plain; charset=utf-8` 的纯文本。这包括验证失败 （`400`）、缺少公共资源 （`404`）、身份验证和权限失败 （`401`/`403`）、速率限制 （`429`） 以及阻止的下载。客户端应将响应正文作为人类可读的字符串来读取。为了兼容性，未知的查询参数将被忽略，但已识别的具有无效值的查询参数将返回 `400`。

## <a id="public-endpoints-(no-auth)"></a><a id="public-endpoints-no-auth"></a> 公共端点（无身份验证）

### <a id="plugin-sdk-usage"></a> 插件 SDK 用法

这些端点报告每个代码或捆绑插件的最新合格公开版本中的静态 SDK 引用。私有、已删除、未发布和受审核阻止的版本不包括在内。导入或调用站点是依赖关系的证据，而不是代码执行的证据。更改 SDK 时，类型依赖性也很重要。

所有三个端点均接受 `limit`（整数 1–100，默认 50）和不透明 `cursor`。跟随 `nextCursor` 直到 `null`，包括在空白页之后。计数仅描述其页面，而不是整个目录。页面是实时读取的，而不是冻结的快照；按包和版本进行重复数据删除，如果版本在遍历期间发生更改，则重试。

使用情况查找和覆盖范围还接受 `releasedSince`：以毫秒为单位的包容性 Unix 时间戳。这会选择在该时刻或之后上传了 **最新合格公开版本** 的插件，使用其不可变的 `createdAt` 时间戳。公众批准可能会稍后发生。列表编辑和重新扫描时间不会更改发布年龄。在两个端点上使用相同的截止值，以便消费者数量和覆盖范围描述相同的人群。响应回显 `releasedSince`（未过滤时为 `null`），返回的 `coverageUrl` 保留它。分页时保持截止值不变。对于日历月窗口，在查询之前计算一次 UTC 截止值，并在答案中说明该确切时刻。

#### `GET /api/v1/sdk-usage?key=api-member%3Aapi.registerTool`

`key` 是必需的，并使用以下规范形式之一：

| 类型              | 示例                                                        |
| ----------------- | -------------------------------------------------------------- |
| SDK模块        | `sdk-module:openclaw/plugin-sdk/core`                          |
| SDK 出口        | `sdk-export:openclaw/plugin-sdk/core#definePluginEntry`        |
| 插件 API 会员 | `api-member:api.registerTool`                                  |
| 运行时成员    | `runtime-member:runtime.channel.reply.dispatchReplyFromConfig` |
| 钩子              | `hook:hook.before_agent_start`                                 |
| 清单合同 | `manifest-contract:manifest.contracts.tools:example_tool`      |

返回 `{ key, items, nextCursor, counts, coverage, coverageUrl }`。每一项都标识了程序包、版本、发行版和 `releaseCreatedAt`（Unix 毫秒），后跟使用条目和扫描元数据。 `counts` 包含 `{ scope: "page", distinctPlugins }`。 `coverage`为第一覆盖页（最多100个包）；跟随光标到 `coverageUrl`。

用法条目包含 `key`、`kind`、`identity`、`classification`（`runtime`、`type`、`mixed` 或 `declarative`）、`referenceKinds`、 `deprecationCodes`，来源 `evidence`。每个证据项具有 `path`、`line`、`snippet` 以及可选的 `note`。 ClawHub 每个身份最多保留三个示例； `evidenceCount` 记录提供的总数。过滤非空 `deprecationCodes` 数组以查找已弃用的用法。现有的作者警告和补救措施仍然可以通过现有验证 UI 获得。

#### `GET /api/v1/sdk-usage/coverage`

返回 `{ scope: "page", counts, unresolvedReferences, items, nextCursor }`。 `counts` 包括 `eligible`、`complete`、`partial`、`failed`、`missing` 和 `incompatible`。每个名册项目包含 `packageName`、`version`、`releaseId`、`releaseCreatedAt`、`status` 和 `unknownCount`。这使客户端能够协调实际检查的插件，包括未观察到 SDK 使用情况的插件。覆盖范围检查每个包的当前版本，因此历史版本不会添加页面。如果部署使光标无效，请从第一页重新启动。

#### `GET /api/v1/sdk-usage/plugin?package=example-plugin`

需要 `package`。返回 `{ packageName, version, releaseId, releaseCreatedAt, scan, items, nextCursor }`。缺少或不合格的公共插件返回 `404`。没有当前可用库存的插件返回空 `items` 和显式 `missing`、`failed` 或 `incompatible` 扫描状态。成功检查且没有引用的插件将返回 `complete` 和空 `items`。

扫描元数据包括 `inputKind`（适用于合格库存的 `artifact`）、库存 schema/analysis 版本、检查器版本、目标 OpenClaw 版本、工件哈希、完成时间、覆盖计数器、条目和未知计数以及有界未知示例。部分清单公开已解决的参考文献并保留未解决的案例。较旧的或失败的扫描无法使新版本看起来已被覆盖。

**解释零结果：** 检查规范密钥并完成使用和覆盖遍历。缺失、失败、部分、不兼容或未解决的分析会使答案不完整。即使完全覆盖也仅意味着“在这个公开的最新发布语料库中没有观察到参考文献”；它不授权删除或确定私人、未发布或动态选择的用途不存在。

### `GET /api/v1/search`

查询参数：

- `q`（必填）：查询字符串
- `limit`（可选）：整数
- `mode`（可选）：`exact` 用于确定性精确段匹配
- `highlightedOnly`（可选）：`true` 用于过滤突出显示的技能
- `nonSuspiciousOnly`（可选）：`true`隐藏可疑（`flagged.suspicious`）技能
- `nonSuspicious`（可选）：`nonSuspiciousOnly` 的旧别名

搜索模式：

- 对于默认的相关性排名技能搜索，省略 `mode`。
- `mode=exact` 将 `q` 视为精确的技能 slug，并绕过本机 semantic/vector 召回。
- 无效的 `mode` 值返回 `400 Invalid search mode`。

回复：

```json
{
  "results": [
    {
      "score": 0.123,
      "slug": "gifgrep",
      "displayName": "GifGrep",
      "summary": "…",
      "version": "1.2.3",
      "updatedAt": 1730000000000,
      "ownerHandle": "openclaw",
      "owner": {
        "handle": "openclaw",
        "displayName": "OpenClaw",
        "image": "https://example.com/avatar.png"
      }
    }
  ]
}
```

注意：

- 结果按相关顺序返回（嵌入相似性+精确的slug/name代币提升+少量的流行度优先）。
- 相关性强于流行度。精确的 slug 或显示名称标记匹配可以以更强的参与度超越松散的匹配。
- ASCII 文本在单词和标点符号边界上进行标记。例如，`personal-map` 包含独立的 `map` 代币，而 `amap-jsapi-skill` 包含 `amap`、`jsapi` 和 `skill`；因此，搜索 `map` 会为 `personal-map` 提供比 `amap-jsapi-skill` 更强的词汇匹配。
- 流行度按对数缩放并有上限。当查询文本匹配较弱时，高参与度技能的排名可能会较低。
- 可疑或隐藏的审核状态可以根据呼叫者过滤器和当前审核状态从公共搜索中删除技能。

发布商可发现性指南：

- 将用户将按字面搜索的术语放在显示名称、摘要和标签中。仅当您想要保留独立的 slug 令牌时，才使用它。
- 不要仅仅为了追逐一个查询而重命名 slug，除非新的 slug 是更好的长期规范名称。旧的 slug 成为重定向别名，但规范的 URL、显示的 slug 和未来的搜索摘要使用新的 slug。
- Rename 别名保留旧 URL 的解析并通过注册表解析安装，但搜索排名基于重命名索引后的规范技能元数据。现有的统计数据与技能保持一致。
- 如果技能意外不可见，请在登录后先使用 `clawhub inspect @owner/slug` 检查审核状态，然后再更改与排名相关的元数据。

### `GET /api/v1/skills`

查询参数：

- `limit`（可选）：整数（1–200）
- `cursor`（可选）：用于任何非 `trending` 排序的分页游标
- `sort`（可选）：`updated`（默认）、`recommended`（别名：`default`）、`createdAt`（别名：`newest`）、`downloads`、 `stars`（别名：`rating`）、`name`，旧版安装别名 `installsCurrent`/`installs`/`installsAllTime` 映射到 `downloads`、`trending`
- `prefix`（可选）：字面技能-slug前缀；结果使用升序段，并且在提供 `sort` 时需要 `sort=name`
- `nonSuspiciousOnly`（可选）：`true`隐藏可疑（`flagged.suspicious`）技能
- `nonSuspicious`（可选）：`nonSuspiciousOnly` 的旧别名

无效的 `sort` 值返回 `400`。

注意：

- `recommended` 使用参与度和新近度信号。
- `trending` 按过去 7 天内的安装量排名（基于遥测）。
- `createdAt`对于新技能爬取稳定；当现有技能重新发布时，`updated` 会发生变化。
- 每个项目由所有者限定对 `ownerHandle/slug` 标识； slugs 在各个发行商中并不是全局唯一的。
- `latestVersion` 始终存在。该技能无公开版本时为`null`。
- 前缀列表已跨页完成：继续关注`nextCursor`，直到它是`null`。
- 当 `nonSuspiciousOnly=true` 时，基于游标的排序可能会在页面上返回少于 `limit` 的项目，因为在页面检索后会过滤掉可疑技能。
- 使用 `nextCursor` 继续分页（如果存在）。短页面本身并不意味着结果的结束。

回复：

```json
{
  "items": [
    {
      "ownerHandle": "steipete",
      "slug": "gifgrep",
      "displayName": "GifGrep",
      "summary": "…",
      "topics": ["Productivity"],
      "tags": { "latest": "1.2.3" },
      "stats": {},
      "createdAt": 0,
      "updatedAt": 0,
      "latestVersion": { "version": "1.2.3", "createdAt": 0, "changelog": "…" },
      "metadata": { "os": ["macos"], "systems": ["aarch64-darwin"] }
    }
  ],
  "nextCursor": null
}
```

### `GET /api/v1/skills/{slug}`

回复：

```json
{
  "skill": {
    "slug": "gifgrep",
    "displayName": "GifGrep",
    "summary": "…",
    "topics": ["Productivity"],
    "tags": { "latest": "1.2.3" },
    "stats": {},
    "createdAt": 0,
    "updatedAt": 0
  },
  "latestVersion": { "version": "1.2.3", "createdAt": 0, "changelog": "…" },
  "metadata": { "os": ["macos"], "systems": ["aarch64-darwin"] },
  "owner": { "handle": "steipete", "displayName": "Peter", "image": null },
  "moderation": {
    "isSuspicious": false,
    "isMalwareBlocked": false,
    "verdict": "clean",
    "reasonCodes": [],
    "summary": null,
    "engineVersion": "v2.0.0",
    "updatedAt": 0
  }
}
```

注意：

- 由所有者 rename/merge 创建的旧段头流解析为规范技能。
- `metadata.os`：技能前题中声明的 OS 限制（e.g. `["macos"]`、`["linux"]`）。如果未声明，则为 `null`。
- `metadata.systems`：Nix 系统目标 （e.g. `["aarch64-darwin", "x86_64-linux"]`）。如果未声明，则为 `null`。
- 如果技能没有平台元数据，则 `metadata` 为 `null`。
- 仅当技能被标记或所有者正在查看时，才会包含 `moderation`。

### `GET /api/v1/skills/{slug}/moderation`

返回结构化的审核状态。

回复：

```json
{
  "moderation": {
    "isSuspicious": true,
    "isMalwareBlocked": false,
    "verdict": "suspicious",
    "reasonCodes": ["suspicious.dynamic_code_execution"],
    "summary": "Detected: suspicious.dynamic_code_execution",
    "engineVersion": "v2.0.0",
    "updatedAt": 0,
    "legacyReason": null,
    "evidence": [
      {
        "code": "suspicious.dynamic_code_execution",
        "severity": "critical",
        "file": "index.ts",
        "line": 3,
        "message": "Dynamic code execution detected.",
        "evidence": ""
      }
    ]
  }
}
```

注意：

- 所有者和版主可以访问隐藏技能的审核详细信息。
- 公共呼叫者仅获得 `200` 已标记的可见技能。
- Evidence 已针对公共调用者进行了编辑，仅包含 owners/moderators. 的原始片段

### `POST /api/v1/skills/{slug}/report`

报告一项技能以供版主审核。报告是技能级别的，可以选择链接到版本，并提供给技能报告队列。

授权：

- 需要 API 令牌。

要求：

```json
{ "reason": "Suspicious install step", "version": "1.2.3" }
```

回复：

```json
{
  "ok": true,
  "reported": true,
  "alreadyReported": false,
  "reportId": "skillReports:...",
  "skillId": "skills:...",
  "reportCount": 1
}
```

### `GET /api/v1/skills/-/reports`

Moderator/admin 技能报告摄入端点。

查询参数：

- `status`（可选）：`open`（默认）、`confirmed`、`dismissed` 或 `all`
- `limit`（可选）：整数（1-200）
- `cursor`（可选）：分页光标

回复：

```json
{
  "items": [
    {
      "reportId": "skillReports:...",
      "skillId": "skills:...",
      "skillVersionId": "skillVersions:...",
      "slug": "gifgrep",
      "displayName": "GifGrep",
      "version": "1.2.3",
      "reason": "Suspicious install step",
      "status": "open",
      "createdAt": 1730000000000,
      "reporter": {
        "userId": "users:...",
        "handle": "reporter",
        "displayName": "Reporter"
      },
      "triagedAt": null,
      "triagedBy": null,
      "triageNote": null
    }
  ],
  "nextCursor": null,
  "done": true
}
```

### `POST /api/v1/skills/-/reports/{reportId}/triage`

Moderator/admin 用于解决或重新打开技能报告的端点。

要求：

```json
{ "status": "confirmed", "note": "Reviewed and hid affected version.", "finalAction": "hide" }
```

`confirmed`和`dismissed`需要`note`；将 `status` 设置回 `open` 时可以省略。将 `finalAction: "hide"` 与分类报告一起传递，以将技能隐藏在同一可审核工作流程中。

### `GET /api/v1/skills/{slug}/versions`

查询参数：

- `limit`（可选）：整数
- `cursor`（可选）：分页光标

### `GET /api/v1/skills/{slug}/versions/{version}`

返回版本元数据+文件列表。

- `version.security` 包括规范化扫描验证状态和扫描仪详细信息 （VirusTotal + LLM）（如果有）。

### `GET /api/v1/skills/{slug}/scan`

返回技能版本的安全扫描验证详细信息。

查询参数：

- `version`（可选）：特定版本字符串。
- `tag`（可选）：解析标记版本（例如 `latest`）。

注意：

- 如果`version`和`tag`均未提供，则使用最新版本。
- 包括标准化验证状态以及扫描仪特定的详细信息。
- 仅当扫描仪产生最终结论（`clean`、`suspicious` 或 `malicious`）时，`security.hasScanResult` 才为 `true`。
- `moderation` 是源自最新版本的当前技能级别审核快照。
- 查询历史版本时，先检查`moderation.matchesRequestedVersion`和`moderation.sourceVersion`，然后再将`moderation`和`security`视为同一版本上下文。

### `POST /api/v1/skills/-/scan`

新 ClawScan 作业的经过身份验证的提交端点。

不再支持本地上传扫描。使用 `multipart/form-data` 或 `{ "source": { "kind": "upload" } }` 的请求返回 `410`。

已发布的扫描使用 JSON：

```json
{
  "source": { "kind": "published", "slug": "gifgrep", "version": "1.2.3" },
  "update": false
}
```

注意：

- Scan 请求有效负载和可下载报告在保留窗口之后从扫描请求存储中过期。
- 发布的扫描需要 owner/publisher 管理访问权限或平台 moderator/admin 权限。
- 仅当 `update: true` 且扫描成功完成时，Published 扫描才会写回。
- 响应为 `202` 和 `{ "ok": true, "scanId": "...", "jobId": "...", "status": "queued", "sourceKind": "published", "update": false, "queue": { "queuedAhead": 0, "queuedAheadIsEstimate": false, "position": 1, "running": 0, "runningIsEstimate": false, "note": "Scans are asynchronous and may take time to complete." } }`。
- Scan 作业是异步的。手动扫描请求优先于正常的 publish/backfill 工作，但完成情况仍然取决于工作人员的可用性。

### `GET /api/v1/skills/-/scan/{scanId}`

已提交扫描的经过身份验证的轮询端点。

- 返回 queued/running/succeeded/failed 状态。
- 在排队时返回 `queue.queuedAhead` 和 `queue.position`，以便客户端可以显示有多少优先手动扫描领先于请求。非常大的队列受到限制并以 `queuedAheadIsEstimate: true` 进行报告。
- 当可用时，`report` 包含 `clawscan`、`skillspector`、`staticAnalysis` 和 `virustotal` 部分。
- 失败的扫描作业返回 `status: "failed"` 和 `lastError`。

### `GET /api/v1/skills/-/scan/{scanId}/download`

经过身份验证的报告存档端点。

- 需要扫描成功；非终端扫描返回 `409`。
- 返回 ZIP，其中包含 `manifest.json`、`clawscan.json`、`skillspector.json`、`static-analysis.json`、`virustotal.json` 和 `README.md`。

### `GET /api/v1/skills/-/scan/download/{name}?version=<version>&kind=skill|plugin`

已提交版本的经过身份验证的存储报告存档端点。

- 需要 owner/publisher 管理访问技能或插件或平台 moderator/admin 权限。
- 返回确切提交版本的存储扫描结果，包括阻止或隐藏的版本。
- `kind` 默认为 `skill`；使用 `kind=plugin` 进行 plugin/package 扫描。
- 返回与扫描请求下载相同的 ZIP 形状。

### `POST /api/v1/packages/-/scan/batch`

仅管理员批量 ClawScan 重新扫描活动 code/bundle 插件的最新版本。接受 `{ "mode": "all-active-latest", "cursor": null, "batchSize": 10, "dryRun": true }`。后端将页面限制为 10 个包行。跳过 Deleted/non-plugin 软件包和 missing/deleted/revoked 最新版本。保留现有的活跃工作；其他符合条件的版本将收到优先级最低的 `bulk-rescan` 作业。

返回 `ok`、`mode`、`queued`、`alreadyQueued`、`skipped`、`jobIds`、`nextCursor`、`done` 和 `sampleNames`。试运行返回带有空 `jobIds` 的预期队列计数，并且不创建作业或批次审核条目。以 `nextCursor` 继续；目录分页使用稳定的创建顺序。等待批处理后再提交下一页。无论 AIG 覆盖范围如何，现有的成功扫描均符合资格。

### `POST /api/v1/packages/-/scan/batch/status`

仅限管理员的作业状态聚合。接受 `{ "jobIds": ["..."] }`（最多 200 个）。返回 `ok`、`total`、`queued`、`running`、`succeeded`、`failed`、`missing`、`terminal`、`done` 和`failedJobIds`。 `done` 表示没有剩余职位 queued/running；检查 `failed` 和 `missing` 后报告成功。重复的 ID 计数一次。

### `POST /api/v1/skills/-/scan/batch`

仅供管理员使用的规范批量重新扫描路径。它接受与传统 `POST /api/v1/skills/-/rescan-batch` 相同的有效负载形状。

对于可恢复的营销活动，请在发送每批之前保存唯一的 `requestId`。它接受 1-128 个字母、数字、点、下划线、冒号或连字符，范围仅限于经过身份验证的管理员。重复相同的请求将返回原始收据和作业 ID，包括在这些作业成为终端之后。将 ID 与不同的游标、标准化批量大小、模式或预期版本列表重复使用会失败。试运行不保留请求 ID。

可选的 `expectedVersionIds`（最多 100 个）是捕获页面中符合条件的版本 ID 的有序列表。如果当前页面不同，则整个队列回滚。在检查当前页面内容之前会重播已保存的收据。恢复丢失的响应时保留原始请求参数。

### `POST /api/v1/skills/-/scan/batch/jobs`

仅限管理员、只读作业历史记录，以获取准确的技能版本。接受 `{ "versionId": "...", "cursor": null }`。返回 `ok`、`jobs`、`nextCursor` 和 `done`。每个作业都有 `jobId`、`versionId`、`source`、`status`、`createdAt`、`updatedAt` 和可为 null 的 `completedAt`。遵循 `nextCursor` 直到 `done`，然后得出旧队列没有创建作业的结论。此端点不会重试或替换作业，也不会公开工作线程租赁凭据。

### `POST /api/v1/skills/-/scan/batch/status`

仅限管理员的规范批次状态路由。它接受 `{ "jobIds": ["..."] }` 并返回与旧版 `POST /api/v1/skills/-/rescan-batch/status` 相同的聚合计数器。

### `GET /api/v1/skills/{slug}/verify`

返回`clawhub skill verify`和`openclaw skills verify`使用的技能卡验证信封。

如果卡再生失败，之前连接的卡仍然可用。成功再生后，现有的捆绑包指纹将继续解析。

查询参数：

- `ownerHandle`（可选）：所有者合格解析的发布者句柄。当多个发布者共享 slug 时使用此选项。
- `version`（可选）：特定版本字符串。
- `tag`（可选）：解析标记版本（例如 `latest`）。

注意：

- `ownerHandle` 通过修剪空白、删除前导 `@` 字符和小写来标准化。
- 仅当所选版本具有生成的技能卡、未通过审核阻止恶意软件且 ClawScan 验证干净时，`ok` 才是 `true`。
- Skill 身份、发布者身份和所选版本元数据是顶级信封字段（`slug`、`displayName`、`publisherHandle`、`version`、`resolvedFrom`、`tag`、`createdAt`），因此 shell 自动化可以无需解开嵌套包装即可阅读它们。
- `security` 是顶级 ClawScan/security 判决。自动化应关闭 `ok`、`decision`、`reasons` 和 `security.status`。
- `security.scannerReports.aig` 包含完整的上游 A.I.G SARIF JSON，`security.scannerReports.skillspector` 包含完整的上游 SkillSpector JSON，包括完整性、限制、结果和扫描仪特定的元数据。这些报告是支持证据；它们不会覆盖 ClawScan 判决或验证退出代码。
- Verification 仅在 `security.scannerReports` 下返回扫描仪详细信息；它不包含重复的 `security.signals` 摘要或顶级 `scannerReports` 字段。
- 当未为所选扫描保留原始报告时，该原始报告为 `null`。较旧的扫描需要重新扫描才能填充它。提交重新扫描时，如果报告不再与存储的扫描仪摘要匹配，则报告将被保留。这些原始报告中没有任何发现或字符串被截断。
- 默认情况下包含 Raw 报告，并且可以使验证输出变得更大。 CI 在需要时可以只选择已有的判决字段（例如：`jq '{ok, decision, reasons}'`）。
- 仅当 ClawHub 在发布或导入期间解析并存储 GitHub repo/ref/commit/path 时，`provenance` 才是 `server-resolved-github-import`；否则为`unavailable`。

### `POST /api/v1/skills/-/security-verdicts`

返回确切技能版本的当前紧凑安全判断。此收集端点适用于已经知道需要显示哪些已安装的 ClawHub 技能版本的客户端，例如 OpenClaw Control UI。

要求：

```json
{
  "items": [
    { "slug": "gifgrep", "ownerHandle": "steipete", "version": "1.2.3" },
    { "slug": "gifgrep", "ownerHandle": "another-publisher", "version": "1.2.3" }
  ]
}
```

注意：

- `ownerHandle` 为可选。当存在时，它会在精确版本解析之前选择该发布者的技能；省略它会保留遗留的无条件段头解析。
- Owner 句柄通过修剪空白、删除前导 `@` 字符和小写来标准化。
- `items` 必须包含 1-100 个唯一的 `{ ownerHandle?, slug, version }` 组合。相同的 slug 和版本可能出现在不同的所有者之下。
- 合格的成功和失败项目与归一化所有者呼应为`requestedOwnerHandle`；不合格的项目省略该字段。
- 结果按项目计算；一项缺失的技能、拥有者资格的技能或版本不会导致整个响应失败。
- 该响应仅用于安全。它不包括技能卡数据、生成的卡状态、工件文件列表或详细的扫描仪有效负载。
- 成功的项目包括顶级`overview`，这是由ClawScan摘要和指导组成的规范审核页面文本。安装客户端可能会显示此文本，而无需从扫描仪字段重建它。
- `security.signals` 仅包含状态级别的支持证据；使用 `/scan` 或 ClawHub 安全审核页获取完整的扫描仪详细信息。
- 技能卡缺失不影响本终端的`ok`、`decision`、`reasons`；客户端需要卡片内容时，应在本地读取已安装的 `skill-card.md`。
- 当您需要单技能技能卡验证信封时使用 `/verify`，当您需要生成卡片降价时使用 `/card`，当您需要详细的扫描仪数据时使用 `/scan`。

回复：

```json
{
  "schema": "clawhub.skill.security-verdicts.v1",
  "items": [
    {
      "ok": true,
      "decision": "pass",
      "reasons": [],
      "requestedSlug": "gifgrep",
      "requestedOwnerHandle": "steipete",
      "slug": "gifgrep",
      "displayName": "GifGrep",
      "publisherHandle": "steipete",
      "publisherDisplayName": "Peter",
      "requestedVersion": "1.2.3",
      "version": "1.2.3",
      "createdAt": 0,
      "checkedAt": 0,
      "skillUrl": "https://clawhub.ai/steipete/skills/gifgrep",
      "securityAuditUrl": "https://clawhub.ai/steipete/skills/gifgrep/security-audit?version=1.2.3",
      "overview": "ClawScan found no material security concerns.\n\nUse least-privileged credentials when configuring this skill.",
      "security": {
        "status": "clean",
        "passed": true,
        "signals": {
          "staticScan": { "status": "clean", "reasonCodes": [] },
          "virusTotal": null,
          "skillSpector": null,
          "dependencyRegistry": null
        }
      }
    },
    {
      "ok": false,
      "decision": "fail",
      "reasons": ["version.not_found"],
      "requestedSlug": "missing-version",
      "requestedOwnerHandle": "another-publisher",
      "requestedVersion": "1.0.0",
      "error": { "code": "version_not_found", "message": "Version not found" },
      "security": null
    }
  ]
}
```

### `GET /api/v1/skills/{slug}/file`

返回精确存储的文件字节作为下载。添加 `preview=1` 以请求有界转义文本预览；任何具有有效 UTF-8 字节的文件都可以预览，无论其扩展名或 MIME 元数据如何。

查询参数：

- `path`（必填）
- `version`（可选）
- `tag`（可选）
- `preview=1`（可选；当字节无效 UTF-8 时，返回 `text/plain` 或 `415`）

注意：

- 默认为最新版本。
- 原始下载限制：10MB。
- 文本预览限制：200KB。

### `GET /api/v1/packages`

统一目录端点：

- 技能
- 代码插件
- 捆绑插件

查询参数：

- `limit`（可选）：整数（1–100）
- `cursor`（可选）：分页光标
- `family`（可选）：`skill`、`code-plugin` 或 `bundle-plugin`
- `channel`（可选）：`official`、`community` 或 `private`
- `isOfficial`（可选）：`true` 或 `false`
- `sort`（可选）：`updated`（默认）、`recommended`、`trending`、`downloads`、旧别名 `installs`
- `category`（可选）：插件类别过滤器。仅当请求范围为插件包（`/api/v1/plugins`、`/api/v1/code-plugins`、`/api/v1/bundle-plugins` 或具有 `family=code-plugin`/`family=bundle-plugin` 的包端点）时才支持。受控类别和旧版 v1 过滤器别名记录在 `GET /api/v1/plugins` 下。

注意：

- `family`、`channel`、`isOfficial`、`featured`、`highlightedOnly` 或 `sort` 的无效值返回 `400`。未知的查询参数将被忽略。
- `GET /api/v1/code-plugins` 和 `GET /api/v1/bundle-plugins` 仍然是固定系列别名。
- 技能条目由技能注册表支持，并且仍然只能通过 `POST /api/v1/skills` 发布。
- `POST /api/v1/packages` 仍然仅适用于代码插件和捆绑插件版本。
- 匿名呼叫者只能看到公共套餐频道。
- List/search 默认为公共、已发布的插件包，包括经过身份验证的调用者。
- Explicit `channel=private` 返回经过身份验证的调用者可以读取的已发布私有包。
- 保留、未发布、删除、屏蔽的插件包均排除在list/search.之外
- Plugin 目录项公开当前发布者徽章的 `ownerOfficial`，与包 `isOfficial` 和 `channel` 分开。发布商徽章不会改变仅限官方的过滤或包认可。

### `GET /api/v1/packages/search`

跨技能+插件包的统一目录搜索。

查询参数：

- `q`（必填）：查询字符串
- `limit`（可选）：整数（1–100）
- `family`（可选）：`skill`、`code-plugin` 或 `bundle-plugin`
- `channel`（可选）：`official`、`community` 或 `private`
- `isOfficial`（可选）：`true` 或 `false`
- `category`（可选）：插件类别过滤器。仅当请求范围仅限于插件包时才支持。受控类别和旧版 v1 过滤器别名记录在 `GET /api/v1/plugins` 下。

注意：

- `family`、`channel`、`isOfficial`、`featured` 或 `highlightedOnly` 的无效值返回 `400`。未知的查询参数将被忽略。
- 匿名呼叫者只能看到公共套餐频道。
- Search 默认为公共、已发布的插件包，包括经过身份验证的调用者。
- Explicit `channel=private` 返回经过身份验证的调用者可以读取的已发布私有包。
- 保留、未发布、删除和阻止的插件包被排除在搜索之外。

### `GET /api/v1/plugins`

仅插件目录浏览代码插件和捆绑插件包。

查询参数：

- `limit`（可选）：整数（1-100）
- `cursor`（可选）：分页光标
- `isOfficial`（可选）：`true` 或 `false`
- `sort`（可选）：`recommended`（默认）、`trending`、`downloads`、`updated`、旧别名 `installs`
- `featured`（可选）：`true` 按最新功能顺序返回特色插件，无论 `sort` 为何。删除并重新添加插件会将其移至前面；保留现有选择可以保留其位置。
- `category`（可选）：插件类别过滤器。活动浏览值由 `GET /api/v1/plugins/categories` 返回，包括其描述和图标。这 23 个类别涵盖了核心配置表面和产品用途，包括用于交互式 desktop/browser 控制的 Web 之后的计算机用途。已停用的值 `tools`、`runtime` 和 `gateway` 对于现有元数据和链接仍然可读，但不会出现在活动浏览列表中。
- `curated`（可选）：`true` 需要 `category` 和 `sort=downloads`，且不能与 `featured` 或 `officialFirst` 组合。符合条件的规范包引脚排在第一位，然后是按下载量降序排列的剩余插件，规范名称升序排列，在页面和两个插件系列中保持一致。类别浏览保留所有列表语言。响应包括带有可选有序 `pinnedPackages` 的类别元数据。

读取端点仍接受旧版 v1 过滤器别名：

- `mcp-tooling`、`data` 和 `automation` 解析为 `tools`。
- `observability` 和 `deployment` 解析为 `gateway`。
- `dev-tools` 解析为 `runtime`。

`trending` 对最近 24 个已完成的 UTC 小时内的活动进行排名，每小时刷新一次。它的得分是下载量加上三倍净安装量，负净安装量被限制为零。趋势项目在可选的 `trending24h` 对象中公开窗口指标：下载、网络安装和 `windowStart`/`windowEnd` 时间戳（以毫秒为单位）（开始包含，结束排除）。常规`stats`字段不变； `stats.downloads` 仍然是生命周期下载总量。升级期间，现有排行榜在没有窗口指标的情况下仍然可用，直到第一个 24 小时快照准备就绪。在统一的 `/api/v1/packages` 端点上，它仅是插件；使用 `/api/v1/skills?sort=trending` 作为技能目录。

不接受旧别名作为存储的或作者声明的类别值。

### `GET /api/v1/plugins/overview`

返回在一个可缓存请求中呈现插件市场主页所需的有限数据：规范类别元数据加上每个类别的前八个精选、趋势和精选插件的并集。类别架在八张卡限制之前解析符合条件的规范引脚，然后按下载量降序和规范包名称升序排序。模型仅引脚 OpenAI、Anthropic 和 Google。主页部分省略了其他部分。主页发现在满足其限制之前适用英文列表资格；完整的类别浏览、搜索和直接查找保留所有列表语言。项目可能包括 `featured` 和 `trending` 标记。标记的项目还包括其从零开始的 `featuredRank` 或 `trendingRank`，因此客户端在删除重复元数据后保留每个架子的独立顺序。特色排名遵循最新特色顺序，匹配 `GET /api/v1/plugins?featured=true`。

响应是公共的并带有共享缓存标头。使用分页 `GET /api/v1/plugins` 端点进行搜索、类别扩展和完整的目录遍历。

### `GET /api/v1/plugins/categories`

按显示顺序返回规范插件发现分类法。每个类别包含 `slug`、`label`、`description`、裸露 Lucide `icon` 密钥和数字 `order`，以及用于策划订购的可选有序 `pinnedPackages`。这个完整的分类包括“其他”，尽管主页发现省略了它的架子。

使用每个类别的描述来选择某人安装该插件的主要原因。新的插件版本可能会在 `openclaw.plugin.json` 中声明一个类别，例如 `"categories": ["developer-tools"]`。当声明不存在时，ClawHub 默认使用 `gpt-5.6-luna` 从有界清单、包装和文档证据中生成一个类别。操作员可以使用 `OPENAI_PLUGIN_CATEGORY_MODEL` 覆盖此设置；技能总结模型设置不影响插件分类。

历史声明仍然可读。审查后的元数据刷新对源证据中已退役的或多个类别进行重新分类，保留当前的单一用途声明和存档的工件字节。新生成的分配和捆绑清单使用一个活动类别。失败的模型请求在发布期间回退到 `other`，并且不会被审核后的回填接受。

### `GET /api/v1/skills/export`

批量导出最新公共技能，供离线分析。

授权：

- 需要 API 令牌。

查询参数：

- `startDate`（必需）：技能 `updatedAt` 的 Unix 毫秒下限。
- `endDate`（必需）：技能 `updatedAt` 的 Unix 毫秒上限。
- `limit`（可选）：整数（1-250），默认`250`。
- `cursor`（可选）：来自上一个响应的分页光标。

回复：

- Body：ZIP 存档。
- 每个导出的技能植根于`{publisher}/{slug}/`。
- 托管技能包括最新存储的版本文件，并在`_manifest.json`和`sourceRef: "public-clawhub"`中列出。
- 当前通过 `clean` 或 `suspicious` 扫描支持 GitHub- 的技能包括 `_source_handoff.json` 和 `sourceRef: "public-github"`、存储库、提交、路径、内容哈希和存档 URL。它们不包括 ClawHub-hosted 源文件。
- 每个技能包括`_export_skill_meta.json`。
- Archive 条目路径在其签名的 JSON 编码中限制为 900 个字节；超出该限制的文件将在 `_errors.json` 中报告。
- `_manifest.json` 始终包含在 ZIP 根目录中。
- 当在密封存档清单之前无法导出个别技能或文件时，会包含 `_errors.json`。 `X-Export-Errors` 报告相同的预流错误。
- 流式传输开始后，每个托管文件都会按路径、大小和 SHA-256 绑定到签名的存档清单。如果签名文件消失或未通过完整性检查，则流终止，客户端必须丢弃部分 ZIP 并重试；代理绝不会发出 `_manifest.json` 或 `X-Export-Errors` 错误表述其内容的完整存档。

标题：

- `X-Next-Cursor`
- `X-Has-More`
- `X-Total-Returned`
- `X-Date-Range`
- `X-Export-Errors`

### `GET /api/v1/plugins/export`

批量导出最新的公共插件版本以进行离线分析。

授权：

- 需要 API 令牌。

查询参数：

- `startDate`（必需）：插件 `updatedAt` 的 Unix 毫秒下限。
- `endDate`（必需）：插件 `updatedAt` 的 Unix 毫秒上限。
- `limit`（可选）：整数（1-250），默认`250`。
- `cursor`（可选）：来自上一个响应的分页光标。
- `family`（可选）：`code-plugin` 或 `bundle-plugin`。省略意味着两个插件系列。

回复：

- Body：ZIP 存档。
- each 导出的插件植根于 `{family}/{packageName}/`。
- Each 导出的插件包括最新版本的存储文件。
- 每个插件导出元数据存储在 `__clawhub_export/{family}/{packageName}/plugin_meta.json`。
- `_manifest.json` 始终包含在 ZIP 根目录中。
- 当无法导出单个插件或文件时，将包含 `_errors.json`。

标题：

- `X-Next-Cursor`
- `X-Has-More`
- `X-Total-Returned`
- `X-Date-Range`
- `X-Export-Errors`

### `GET /api/v1/plugins/search`

仅插件搜索代码插件和捆绑插件包。

查询参数：

- `q`（必填）：查询字符串
- `limit`（可选）：整数（1-100）
- `isOfficial`（可选）：`true` 或 `false`
- `category`（可选）：插件类别过滤器。使用 `GET /api/v1/plugins/categories` 中的 22 个有效值。已停用的 `tools`、`runtime` 和 `gateway` 值对于现有元数据和链接仍然可读。

注意：

- `GET /api/v1/plugins` 下记录的旧版 v1 过滤器别名也被接受。
- Category 过滤是一个真正的 API 过滤器，由插件类别摘要行支持，而不是搜索查询重写。
- 结果按相关顺序返回，当前不分页。
- Browser UI 用于插件搜索的排序控件重新排序加载的相关结果，匹配当前的 `/skills` 浏览行为。

### `GET /api/v1/packages/{name}`

返回包详细元数据。 `owner.official` 标志是当前发布者徽章，独立于包的 `isOfficial` 标志。响应读取器允许在查询早于该字段的注册表时不存在该字段。

注意：

- Skills也可以通过统一目录中的该路径进行解析。
- 私有包返回`404`，除非调用者可以读取拥有的发布者。

### `GET /api/v1/packages/{name}/detail`

在一个请求中返回插件详细信息快照：`package`、`owner`、`versions`（前 10 个已发布版本和 `nextCursor`）、选定的 `version`、`readme` 和 `security`。现有的包、版本和安全字段形状将被保留。代码插件和捆绑插件支持此路线。

- `version`（可选查询参数）选择准确的版本；否则将选择当前最新版本。缺少确切的版本会返回 `404`。
- 包可见性和发布者权限与包元数据路由匹配。
- 缺失、审核被阻止或非文本 README 预览返回 `readme: null`。现有 200 个 KiB 预览限制适用；超大预览返回 `413`。
- Security 描述了所选版本。下载仍然强制执行自己当前的审核检查。不缓存响应。

### `DELETE /api/v1/packages/{name}`

软删除包和所有版本。

注意：

- 需要包所有者、组织发布者 owner/admin、平台管理员或平台管理员的 API 令牌。

### `GET /api/v1/packages/{name}/versions`

返回版本历史记录。

查询参数：

- `limit`（可选）：整数（1–100）
- `cursor`（可选）：分页光标

注意：

- 私有包返回`404`，除非调用者可以读取拥有的发布者。

### `GET /api/v1/packages/{name}/versions/{version}`

返回一个包版本，包括文件元数据、兼容性、验证、工件元数据和扫描数据。

注意：

- `version.pluginManifestSummary` 公开可选声明的 `contracts`（命名数组的功能系列）、`providers` 和 `channels`。例如，`contracts.tools` 命名插件工具； `contracts.videoGenerationProviders` 命名的是提供者，而不是工具。这些声明描述了已发布的工件，而不是当前的网关注册。较旧的摘要可能会省略这些字段。松散的 `SKILL.md` 不是捆绑技能，除非插件清单声明其技能根。
- `version.artifact.kind` 是旧世界包存档的 `legacy-zip` 或 ClawPack 支持的版本的 `npm-pack`。
- ClawPack 版本包括 npm- 兼容的 `npmIntegrity`、`npmShasum` 和 `npmTarballName` 字段。
- `version.sha256hash` 是旧客户端已弃用的兼容性元数据。它对 `/api/v1/packages/{name}/download` 返回的确切 ZIP 字节进行哈希处理。现代客户端应该使用 `version.artifact.sha256`，它标识规范的发布工件。
- 当扫描数据存在时，包含 `version.vtAnalysis`、`version.llmAnalysis` 和 `version.staticScan`。
- 私有包返回`404`，除非调用者可以读取拥有的发布者。

### `GET /api/v1/packages/{name}/versions/{version}/publication`

返回确切包版本的发布状态。这是 `read` 速率限制存储桶中的公共读取端点。可选的承载令牌会影响包的可见性，就像在版本端点上一样。将范围名称编码为 `%40openclaw%2Fdiscord`； `/@openclaw/discord/versions/...` 路径形式也适用。

响应是一个具有 `name`、`version` 和以下形状之一的闭合对象：

```json
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "published" }
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "absent" }
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "pending", "stage": "staging" }
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "pending", "stage": "checks", "attemptId": "..." }
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "pending", "stage": "finalization", "attemptId": "..." }
{ "name": "@openclaw/discord", "version": "2026.9.2", "state": "failed", "attemptId": "...", "recoverable": true }
```

未知版本返回 `200` 和 `absent`。没有绑定尝试的待发布版本返回 `staging`；检查和最终确定包括绑定尝试 ID。阻止或过期的尝试以及阻止的释放将返回 `failed` 和 `recoverable: false`。仅当未绑定尝试行时，失败的响应才会忽略 `attemptId`。 `recoverable` 是建议性静态恢复资格：它检查 artifact/token 绑定、包系列和审核，但不检查调用者的发布者成员资格、活动声明或存储的字节。恢复会重新验证所有这些，并需要当前发布者的用户 API 令牌。

不可见或软删除的包和技能名称返回 `404 Package not found`。已发布的版本遵循现有版本端点的可见性：隐藏的已发布版本返回 `404 Version not found`，而其元数据仍然可读的审核版本返回 `published`。发布状态并不意味着下载权限。错误文本、扫描结果、身份、令牌 ID、GitHub 运行 ID、幂等性密钥、工件摘要和存储 ID 永远不会返回。尝试 ID 不授予对尝试详细信息或恢复的访问权限。

较旧的服务器可能会为此路径提供普通版本 JSON。客户应使用公认的有效 `state` 响应；在 `404` 或没有 `state` 的 `200` 上，回退到 `GET /api/v1/packages/{name}/versions/{version}`（`200` 表示已发布，`404` 表示未发布）。状态未知或识别形状错误的 `200` 必须无法关闭。其他非 2xx 响应保留正常的错误处理和重试。

### `GET /api/v1/packages/{name}/versions/{version}/security`

返回安装客户端的确切包版本安全性和信任摘要。这是公共 OpenClaw 消费面，用于决定是否可以安装已解决的版本。

授权：

- 公共读取端点。不需要所有者、发布者、版主或管理员令牌。

回复：

```json
{
  "overview": "ClawScan found no material security concerns.\n\nUse least-privileged credentials when configuring this plugin.",
  "securityAuditUrl": "https://clawhub.ai/openclaw/plugins/example-plugin/security-audit?version=1.2.3",
  "verdict": "malicious",
  "package": {
    "name": "@openclaw/example-plugin",
    "displayName": "Example Plugin",
    "family": "code-plugin"
  },
  "release": {
    "releaseId": "packageReleases:...",
    "version": "1.2.3",
    "artifactKind": "npm-pack",
    "artifactSha256": "0123456789abcdef...",
    "npmIntegrity": "sha512-...",
    "npmShasum": "0123456789abcdef0123456789abcdef01234567",
    "npmTarballName": "example-plugin-1.2.3.tgz",
    "createdAt": 1730000000000
  },
  "trust": {
    "scanStatus": "malicious",
    "moderationState": "quarantined",
    "blockedFromDownload": true,
    "reasons": ["manual:quarantined", "scan:malicious"],
    "pending": false,
    "stale": false
  }
}
```

响应字段：

- `overview` 是软件包安全审核页面显示的规范摘要和指导文本。安装客户端可以在不从扫描仪字段重建审核文本的情况下呈现它。
- `verdict` 是软件包安全审核页面使用的组合显示结论，包括静态分析和可见的代理风险结果。它可能与下载策略 `trust.scanStatus` 不同。较旧的注册表可能会省略它；客户端应将其视为不可用的显示元数据。
- `securityAuditUrl` 链接到确切版本的包安全审核页面。
- `package.name`、`package.displayName` 和 `package.family` 标识已解析的注册表包。
- `release.releaseId`、`release.version` 和 `release.createdAt` 标识所评估的确切版本。
- 当已知发布工件时，存在 `release.artifactKind`、`release.artifactSha256`、`release.npmIntegrity`、`release.npmShasum` 和 `release.npmTarballName`。
- `trust.scanStatus` 是通过扫描仪输入和手动发布审核得出的有效信任状态。
- `trust.moderationState` 可为空。当不存在手动发布审核时，为`null`。
- `trust.blockedFromDownload` 是安装块信号。当该值为 `true` 时，OpenClaw 和其他安装客户端应阻止安装，而不是从扫描仪或审核字段重新导出阻止规则。
- `trust.reasons` 是面向用户和审计的解释列表。原因代码是稳定、紧凑的字符串，例如 `manual:quarantined`、`scan:malicious` 和 `package:malicious`。
- `trust.pending` 表示一项或多项信任输入仍在等待完成。
- `trust.stale` 表示信任摘要是根据过时的输入计算得出的，应视为在高置信度允许决策之前需要刷新。

注意：

- 此端点是版本精确的。客户端应该在解析他们打算安装的包版本之后调用它，而不是在读取最新的包元数据之后调用它。
- 私有包返回`404`，除非调用者可以读取拥有的发布者。
- 此端点故意比 owner/moderator 审核端点更窄。它公开了安装决定和公开解释，而不是报告者身份、报告机构、私人证据或内部审查时间表。

### `GET /api/v1/packages/{name}/versions/{version}/artifact`

返回包版本的显式工件解析器元数据。

注意：

- Legacy 软件包版本返回 `legacy-zip` 工件和旧版 ZIP `downloadUrl`。
- ClawPack 版本返回 `npm-pack` 工件、npm 完整性字段、`tarballUrl` 和旧版 ZIP 兼容性 URL。
- 这是OpenClaw旋转变压器表面；它避免从共享 URL 猜测存档格式。

### `GET /api/v1/packages/{name}/versions/{version}/artifact/download`

通过显式解析器路径下载版本工件。

注意：

- ClawPack 版本流式传输确切上传的 npm-pack `.tgz` 字节。
- 旧版 ZIP 版本重定向到 `/api/v1/packages/{name}/download?version=`。
- 使用下载速率桶。

### `GET /api/v1/packages/{name}/readiness`

返回未来 OpenClaw 消耗的计算准备情况。

准备情况检查包括：

- 官方频道状态
- 最新版本可用性
- ClawPack npm-pack 工件可用性
- artifact 摘要
- 源代码库和提交来源
- OpenClaw 兼容性元数据
- 主机目标
- 扫描状态

回复：

```json
{
  "package": {
    "name": "@openclaw/example-plugin",
    "displayName": "Example Plugin",
    "family": "code-plugin",
    "isOfficial": true,
    "latestVersion": "1.2.3"
  },
  "ready": false,
  "checks": [
    {
      "id": "clawpack",
      "label": "ClawPack artifact",
      "status": "fail",
      "message": "Latest version is legacy ZIP-only."
    }
  ],
  "blockers": ["clawpack"]
}
```

### `GET /api/v1/packages/migrations`

用于列出官方 OpenClaw 插件迁移行的主持人端点。

授权：

- 需要主持人或管理员用户的 API 令牌。

查询参数：

- `phase`（可选）：`planned`、`published`、`clawpack-ready`、`legacy-zip-only`、`metadata-ready`、`blocked`、`ready-for-openclaw` 或`all`（默认）。
- `limit`（可选）：整数（1-100）
- `cursor`（可选）：分页光标

回复：

```json
{
  "items": [
    {
      "migrationId": "officialPluginMigrations:...",
      "bundledPluginId": "core.search",
      "packageName": "@openclaw/search-plugin",
      "packageId": "packages:...",
      "owner": "platform",
      "sourceRepo": "openclaw/openclaw",
      "sourcePath": "plugins/search",
      "sourceCommit": "abc123",
      "phase": "blocked",
      "blockers": ["missing ClawPack"],
      "hostTargetsComplete": true,
      "scanClean": false,
      "moderationApproved": false,
      "runtimeBundlesReady": false,
      "notes": null,
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    }
  ],
  "nextCursor": null,
  "done": true
}
```

### `POST /api/v1/packages/migrations`

用于创建或更新官方插件迁移行的管理端点。

授权：

- 管理员用户需要 API 令牌。

请求正文：

```json
{
  "bundledPluginId": "core.search",
  "packageName": "@openclaw/search-plugin",
  "owner": "platform",
  "sourceRepo": "openclaw/openclaw",
  "sourcePath": "plugins/search",
  "sourceCommit": "abc123",
  "phase": "blocked",
  "blockers": ["missing ClawPack"],
  "hostTargetsComplete": true,
  "scanClean": false,
  "moderationApproved": false,
  "runtimeBundlesReady": false,
  "notes": "waiting on publisher upload"
}
```

注意：

- `bundledPluginId` 标准化为小写，是稳定的 upsert 密钥。
- `packageName` 是 npm- 标准化名称；对于计划的迁移，该包可能会丢失。
- 这仅跟踪迁移准备情况。它不会突变 OpenClaw 或生成 ClawPacks。

### `GET /api/v1/packages/moderation/queue`

Moderator/admin 软件包发布审核队列的端点。

授权：

- 需要主持人或管理员用户的 API 令牌。

查询参数：

- `status`（可选）：`open`（默认）、`blocked`、`manual` 或 `all`
- `limit`（可选）：整数（1-100）
- `cursor`（可选）：分页光标

状态含义：

- `open`：可疑、恶意、待定、隔离、撤销或报告的版本。
- `blocked`：隔离、吊销或恶意发布。
- `manual`：具有手动调节覆盖的任何版本。
- `all`：具有手动覆盖、非干净扫描状态或包报告的任何版本。

回复：

```json
{
  "items": [
    {
      "packageId": "packages:...",
      "releaseId": "packageReleases:...",
      "name": "@openclaw/example-plugin",
      "displayName": "Example Plugin",
      "family": "code-plugin",
      "channel": "community",
      "isOfficial": false,
      "version": "1.2.3",
      "createdAt": 1730000000000,
      "artifactKind": "npm-pack",
      "scanStatus": "malicious",
      "moderationState": "quarantined",
      "moderationReason": "manual review",
      "sourceRepo": "openclaw/example-plugin",
      "sourceCommit": "abc123",
      "reportCount": 2,
      "lastReportedAt": 1730000001000,
      "reasons": ["manual:quarantined", "scan:malicious", "reports:2"]
    }
  ],
  "nextCursor": null,
  "done": true
}
```

### `POST /api/v1/packages/{name}/report`

报告包以供版主审核。报告是包级别的，可以选择链接到版本。它们会进入审核队列，但不会自动隐藏或阻止下载；审核者应该使用发布审核来批准、隔离或撤销工件。

授权：

- 需要 API 令牌。

要求：

```json
{ "reason": "Suspicious native binary", "version": "1.2.3" }
```

回复：

```json
{
  "ok": true,
  "reported": true,
  "alreadyReported": false,
  "packageId": "packages:...",
  "releaseId": "packageReleases:...",
  "reportCount": 1
}
```

### `GET /api/v1/packages/reports`

Moderator/admin 包报告接收端点。

授权：

- 需要主持人或管理员用户的 API 令牌。

查询参数：

- `status`（可选）：`open`（默认）、`confirmed`、`dismissed` 或 `all`
- `limit`（可选）：整数（1-100）
- `cursor`（可选）：分页光标

回复：

```json
{
  "items": [
    {
      "reportId": "packageReports:...",
      "packageId": "packages:...",
      "releaseId": "packageReleases:...",
      "name": "@openclaw/example-plugin",
      "displayName": "Example Plugin",
      "family": "code-plugin",
      "version": "1.2.3",
      "reason": "Suspicious native binary",
      "status": "open",
      "createdAt": 1730000000000,
      "reporter": {
        "userId": "users:...",
        "handle": "reporter",
        "displayName": "Reporter"
      },
      "triagedAt": null,
      "triagedBy": null,
      "triageNote": null
    }
  ],
  "nextCursor": null,
  "done": true
}
```

### `GET /api/v1/packages/{name}/moderation`

Owner/moderator 端点用于包审核可见性。

授权：

- 需要包所有者、发布者成员、审核者或管理员用户的 API 令牌。

回复：

```json
{
  "package": {
    "packageId": "packages:...",
    "name": "@openclaw/example-plugin",
    "displayName": "Example Plugin",
    "family": "code-plugin",
    "channel": "community",
    "isOfficial": false,
    "reportCount": 2,
    "lastReportedAt": 1730000001000,
    "scanStatus": "malicious"
  },
  "latestRelease": {
    "releaseId": "packageReleases:...",
    "version": "1.2.3",
    "artifactKind": "npm-pack",
    "scanStatus": "malicious",
    "moderationState": "quarantined",
    "moderationReason": "manual review",
    "blockedFromDownload": true,
    "reasons": ["manual:quarantined", "scan:malicious", "reports:2"],
    "createdAt": 1730000000000
  }
}
```

### `POST /api/v1/packages/reports/{reportId}/triage`

Moderator/admin 用于解析或重新打开包报告的端点。

要求：

```json
{
  "status": "confirmed",
  "note": "Reviewed and quarantined affected release.",
  "finalAction": "quarantine"
}
```

`confirmed`和`dismissed`需要`note`；将 `status` 设置回 `open` 时可以省略。通过带有确认报告的 `finalAction: "quarantine"` 或 `finalAction: "revoke"` 来在同一可审核工作流程中应用发布审核。

回复：

```json
{
  "ok": true,
  "reportId": "packageReports:...",
  "packageId": "packages:...",
  "status": "confirmed",
  "reportCount": 0
}
```

### `POST /api/v1/packages/{name}/versions/{version}/moderation`

Moderator/admin 用于软件包发布审核的端点。

要求：

```json
{ "state": "quarantined", "reason": "Suspicious native payload." }
```

支持的状态：

- `approved`：人工审核并允许。
- `quarantined`：已阻止待处理的后续操作。
- `revoked`：在发布之前被信任后被阻止。

隔离和撤销的版本从工件下载路径返回 `403`。每次更改都会写入审核日志条目。

### `GET /api/v1/packages/{name}/file`

返回精确存储的包文件字节作为下载。添加 `preview=1` 以请求用于技能文件的相同有界 UTF-8 文本预览。

查询参数：

- `path`（必填）
- `version`（可选）
- `tag`（可选）
- `preview=1`（可选；当字节无效 UTF-8 时，返回 `text/plain` 或 `415`）

注意：

- 默认为最新版本。
- 使用读取速率存储桶，而不是下载存储桶。
- 原始下载限制：10MB。
- 文本预览限制：200KB；不透明文件仅针对预览请求返回 `415`。
- Pending VirusTotal 扫描不会阻止读取；恶意发布可能仍会在其他地方被阻止。
- 私有包返回`404`，除非调用者可以读取拥有的发布者。

### `GET /api/v1/packages/{name}/download`

下载包版本的旧确定性 ZIP 存档。

查询参数：

- `version`（可选）
- `tag`（可选）

注意：

- 默认为最新版本。
- 技能重定向到`GET /api/v1/download`。
- Plugin/package 存档是具有 `package/` 根的 zip 文件，因此旧的 OpenClaw 客户端可以继续工作。
- 此航线仅停留ZIP-。它不流式传输 ClawPack `.tgz` 文件。
- 响应包括用于解析器完整性检查的 `ETag`、`Digest`、`X-ClawHub-Artifact-Type` 和 `X-ClawHub-Artifact-Sha256` 标头。
- 仅注册表元数据不会注入到下载的存档中。
- 待处理的 VirusTotal 扫描不会阻止下载；恶意版本返回`403`。
- 私有包返回 `404` 除非调用者是所有者。

### `GET /api/npm/{package}`

返回 ClawPack 支持的软件包版本的 npm- 兼容软件包。

注意：

- 仅列出带有上传的 ClawPack npm-pack tarball 的版本。
- Legacy ZIP-only 版本被故意省略。
- `dist.tarball`、`dist.integrity` 和 `dist.shasum` 使用 npm- 兼容字段，因此用户可以选择将 npm 指向镜像。
- Scoped 包包支持 `/api/npm/@scope/name` 和 npm 的编码 `/api/npm/@scope%2Fname` 请求路径。

### `GET /api/npm/{package}/-/{tarball}.tgz`

为 npm 镜像客户端传输确切上传的 ClawPack tarball 字节。

注意：

- 使用下载速率桶。
- 下载标头包括 ClawHub SHA-256 以及 npm integrity/shasum 元数据。
- 审核和私有包访问检查仍然适用。

### `GET /api/v1/resolve`

由 CLI 用于将本地指纹映射到已知版本。

查询参数：

- `slug`（必填）
- `hash`（必需）：捆绑指纹的 64 字符十六进制 sha256

回复：

```json
{ "slug": "gifgrep", "match": { "version": "1.2.2" }, "latestVersion": { "version": "1.2.3" } }
```

### `GET /api/v1/download`

下载托管技能版本 ZIP，或使用 `clean` 或 `suspicious` 扫描且无托管版本返回当前 GitHub- 支持的技能的 GitHub 源切换。

查询参数：

- `slug`（必填）
- `version`（可选）：semver 字符串
- `tag`（可选）：标签名称（e.g. `latest`）

注意：

- 如果`version`和`tag`都没有提供，则使用最新版本。
- 软件删除版本返回 `410`。
- 托管技能版本返回流式确定性 ZIP 和 `Content-Disposition: attachment; filename="<slug>-<version>.zip"`。 ClawHub 在流式传输之前应用审核、速率限制和下载计量。
- GitHub-支持的技能切换不代理或镜像字节。 JSON响应包括`sourceRef: "public-github"`、`repo`、`commit`、`path`、`contentHash`和`archiveUrl`； scan/current 状态是一个门，不包含在成功负载元数据中。
- 下载统计数据按 UTC 天计为唯一身份（当 API 令牌有效时为 `userId`，否则为 IP）。

## <a id="auth-endpoints-(bearer-token)"></a><a id="auth-endpoints-bearer-token"></a> Auth 端点（不记名令牌）

所有端点都需要：

```
Authorization: Bearer clh_...
```

### `GET /api/v1/whoami`

验证令牌并返回用户句柄。

### `POST /api/v1/skills`

发布新版本。

- 首选：`multipart/form-data` 与 `payload` JSON + `files[]` 斑点。
- 也接受带有 `files`（基于 storageId）的 JSON 主体。
- 可选负载字段：`ownerHandle`。如果存在，API 会在服务器端解析该发布者，并要求参与者具有发布者访问权限。
- 可选有效负载字段：`migrateOwner`。当 `true` 与 `ownerHandle` 一起使用时，如果执行者在当前发布商和目标发布商上都是 admin/owner，则现有技能可能会转移给该所有者。如果没有此选择加入，所有者变更将被拒绝。

### `POST /api/v1/packages`

发布代码插件或捆绑插件版本。

- 需要承载令牌身份验证。
- 需要 `multipart/form-data`。
- 允许的表单字段为 `payload`、重复的 `files` blob 或一个 `clawpack` tarball 引用。 `clawpack` 可以是 `.tgz` blob 或 upload-url 流返回的存储 ID。分阶段存储 ID 发布还必须包含随上传 URL 返回的 `clawpackUploadTicket`。
- 使用 `files` 或 `clawpack`，切勿在同一请求中同时使用两者。
- JSON 主体和调用者提供的 `payload.files` / `payload.artifact` 元数据被拒绝。
- Direct 多部分发布请求的上限为 4MB，因为公共 API 是通过 Vercel 函数提供服务的，在 ClawHub 看到它们之前，该函数会拒绝带有 `413` 的较大请求主体。较大的 ClawPack tarball 必须使用 upload-url 流，最高可达 120MB tarball 上限。
- 可选负载字段：`ownerHandle`。参与者必须具有对所选发布者的发布访问权限。

验证亮点：

- `family` 必须是 `code-plugin` 或 `bundle-plugin`。
- 插件包需要`openclaw.plugin.json`。 ClawPack `.tgz` 上传必须将其包含在 `package/openclaw.plugin.json` 中。
- Code 插件需要 `package.json`、源存储库元数据、源提交元数据、配置架构元数据、`openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion`。
- `openclaw.hostTargets` 和 `openclaw.environment` 是可选元数据。
- 只有`openclaw`组织发布者和当前`openclaw`组织成员的个人发布者可以发布到`official`频道。
- 代表发布仍根据目标所有者帐户验证官方渠道资格。

### `POST /api/v1/publish/attempts/{id}/recover`

使用普通用户承载令牌和当前包发布访问权限恢复失败的分阶段 OpenClaw 插件版本。唯一接受的 JSON 字段是：

```json
{ "manualOverrideReason": "Retry the retained artifacts after workflow failure" }
```

原因修剪后必须包含 1-500 个字符。新的后继者返回`202`；精确的授权重播返回 `200` 及其现有结果。响应包含 `ok`、`attemptId`、`recoveredFromAttemptId`、`packageId`、`releaseId`、`name`、`version`、`status`、`publicationStatus` 和`reused`。使用相同的用户令牌跟随 `GET /api/v1/publish/attempts/{id}` 的后继者。待定未发布；在保留的版本公开之前，必须通过新的安全检查和当前授权。

无效主体返回 `400`、无效凭据 `401`、未公开或丢失的尝试 `404` 以及冲突或不合格的恢复状态 `409`。 `409` 和 `Retry-After` 表示密封尝试仍然有效，可以在指定的延迟后重试；其他 `409` 响应是该请求的终端。

### `DELETE /api/v1/skills/{slug}` / `POST /api/v1/skills/{slug}/undelete`

软删除/恢复技能（所有者、版主或管理员）。

可选JSON机身：

```json
{ "reason": "Held for moderation pending legal review." }
```

如果存在，`reason` 将作为技能审核注释存储并复制到审核日志中。所有者发起的软删除会将 slug 保留 30 天，然后其他发布者可以声明该 slug 的所有权。当此到期日适用时，删除响应包括 `slugReservedUntil`。 Moderator/admin 隐藏和安全删除不会以这种方式过期。

删除回复：

```json
{ "ok": true, "slugReservedUntil": 1730000000000 }
```

状态代码：

- `200`: ok
- `401`：未经授权
- `403`：禁止
- `404`：未找到skill/user
- `500`：内部服务器错误

### `POST /api/v1/users/publisher`

仅限管理员。确保句柄存在组织发布者。如果句柄仍然指向旧共享user/personal发布者，端点首先将其迁移到组织发布者中。对于新创建的组织，提供`memberHandle`；代理管理员不会添加为成员。`memberRole`默认为`owner`。

- 主体：`{ "handle": "openclaw", "displayName": "OpenClaw", "memberHandle": "alice", "memberRole": "owner", "trusted": true }`
- 响应：`{ "ok": true, "publisherId": "...", "handle": "openclaw", "created": true, "migrated": false, "trusted": true, "member": { "userId": "...", "handle": "alice", "role": "owner" } }`

### `POST /api/v1/publishers`

经过身份验证的自助组织发布者创建。创建新的组织发布者并将调用者添加为所有者。此端点不会迁移现有的 user/personal 句柄，也不会标记发布者 trusted/official.

- 主体：`{ "handle": "opik", "displayName": "Opik" }`
- 响应：`{ "ok": true, "publisherId": "...", "handle": "opik", "created": true, "trusted": false }`
- 当句柄已被发布者、用户或个人发布者使用时，返回 `409`。

### `POST /api/v1/users/reserve`

仅限管理员。为合法所有者保留根 slugs 和包名称，而无需发布版本。包名称成为没有发布行的私有占位符包，因此同一所有者稍后可以将真正的代码插件或捆绑插件版本发布到该名称中。

- 主体：`{ "handle": "openclaw", "slugs": ["diffs"], "packageNames": ["@openclaw/diffs"], "reason": "reserved for official OpenClaw plugin" }`
- 响应：`{ "ok": true, "succeeded": 2, "failed": 0, "results": [{ "kind": "slug", "name": "diffs", "ok": true, "action": "reserved" }] }`

### `POST /api/v1/users/publisher-recovery`

仅限管理员。恢复经过验证的替换 GitHub OAuth 主体的个人发布者，而无需编辑 Convex Auth 帐户行。该请求必须命名两个不可变的 GitHub 提供商帐户 ID；可变手柄仅用作面向操作员的防护装置。

端点默认为空运行。在工作人员独立验证两个 GitHub 主体之间的连续性后，应用恢复需要 `dryRun: false` 和 `confirmIdentityVerified: true`。当目标用户的当前个人发布者具有技能、包或 GitHub 技能源时，恢复将失败关闭。恢复还会迁移恢复的发布者技能、技能别名、包、包检查器警告和派生搜索摘要行的旧 `ownerUserId` 字段，以便直接所有者路径与新发布者权限一致。已恢复句柄的活动受保护句柄保留也会重新分配给替换用户，因此以后的配置文件同步无法恢复前用户的竞争权限。每个主表的每个应用事务仅限 100 行；较大的恢复必须首先使用可恢复的所有者迁移。 GitHub 技能源是发布者范围的，并报告为已检查而不是重写。

- 主体：`{ "handle": "gingiris", "nextUserHandle": "gingiris-1031", "previousGitHubProviderAccountId": "123", "nextGitHubProviderAccountId": "456", "reason": "Verified account continuity for issue #2555", "confirmIdentityVerified": true, "dryRun": false }`
- 响应：`{ "ok": true, "dryRun": false, "recovered": true, "publisherId": "...", "handle": "gingiris", "previousUser": { "userId": "...", "handle": "gingiris", "nextHandle": "gingiris-recovered", "githubProviderAccountId": "123", "authAccountCount": 1 }, "nextUser": { "userId": "...", "handle": "gingiris-1031", "nextHandle": "gingiris", "githubProviderAccountId": "456", "authAccountCount": 1 }, "retiredPersonalPublisher": null, "resourceOwnerMigration": { "limitPerTable": 100, "skills": 1, "skillSlugAliases": 1, "packages": 0, "packageInspectorWarnings": 0, "githubSourcesChecked": 1, "handleReservations": 1 }, "identityVerified": true, "reason": "Verified account continuity for issue #2555" }`

### <a id="owner-slug-management-endpoints"></a> Owner slug 管理端点

- `POST /api/v1/skills/{slug}/rename`
  - 主体：`{ "newSlug": "new-canonical-slug" }`
  - 响应：`{ "ok": true, "slug": "new-canonical-slug", "previousSlug": "old-slug" }`
- `POST /api/v1/skills/{slug}/merge`
  - 主体：`{ "targetSlug": "canonical-target-slug" }`
  - 响应：`{ "ok": true, "sourceSlug": "old-slug", "targetSlug": "canonical-target-slug" }`

注意：

- 两个端点都需要 API 令牌身份验证，并且仅适用于技能所有者。
- `rename` 保留前一个 slug 作为重定向别名。
- `merge` 隐藏源列表并将源段重定向到目标列表。

### <a id="transfer-ownership-endpoints"></a> 转移所有权端点

- `POST /api/v1/skills/{slug}/transfer`
  - 主体：`{ "toUserHandle": "target_handle", "message": "optional" }`
  - 响应：`{ "ok": true, "transferId": "skillOwnershipTransfers:...", "toUserHandle": "target_handle", "expiresAt": 1730000000000 }`
- `POST /api/v1/skills/{slug}/transfer/accept`
- `POST /api/v1/skills/{slug}/transfer/reject`
- `POST /api/v1/skills/{slug}/transfer/cancel`
  - 响应（accept/reject/cancel）：`{ "ok": true, "skillSlug": "demo-skill?" }`
- `GET /api/v1/transfers/incoming`
- `GET /api/v1/transfers/outgoing`
  - 响应形状：`{ "transfers": [{ "_id": "...", "skill": { "slug": "demo", "displayName": "Demo" }, "fromUser"|"toUser": { "handle": "..." }, "message": "...", "requestedAt": 0, "expiresAt": 0 }] }`

### `POST /api/v1/users/ban`

禁止用户并硬删除拥有的技能（仅限 moderator/admin）。

身体：

```json
{ "handle": "user_handle", "reason": "optional ban reason" }
```

or

```json
{ "userId": "users_...", "reason": "optional ban reason" }
```

回复：

```json
{ "ok": true, "alreadyBanned": false, "deletedSkills": 3 }
```

### `POST /api/v1/users/unban`

取消禁止用户并恢复符合条件的技能（仅限管理员）。

身体：

```json
{ "handle": "user_handle", "reason": "optional unban reason" }
```

or

```json
{ "userId": "users_...", "reason": "optional unban reason" }
```

回复：

```json
{ "ok": true, "alreadyUnbanned": false, "restoredSkills": 3 }
```

### `POST /api/v1/users/reclassify-ban`

更改现有禁令的存储原因，而无需取消禁止或恢复内容（仅限管理员）。默认为空运行，除非 `dryRun` 为 `false`。

身体：

```json
{ "handle": "user_handle", "reason": "bulk publishing spam", "dryRun": true }
```

or

```json
{ "userId": "users_...", "reason": "bulk publishing spam", "dryRun": false }
```

回复：

```json
{
  "ok": true,
  "dryRun": false,
  "userId": "users_...",
  "handle": "user_handle",
  "previousReason": "malware auto-ban",
  "nextReason": "bulk publishing spam",
  "changed": true
}
```

### `POST /api/v1/users/role`

更改用户角色（仅限管理员）。

身体：

```json
{ "handle": "user_handle", "role": "moderator" }
```

or

```json
{ "userId": "users_...", "role": "admin" }
```

回复：

```json
{ "ok": true, "role": "moderator" }
```

### `GET /api/v1/users`

列出或搜索用户（仅限管理员）。

查询参数：

- `q`（可选）：搜索查询
- `query`（可选）：`q` 的别名
- `limit`（可选）：最大结果（默认 20，最大 200）

回复：

```json
{
  "items": [
    {
      "userId": "users_...",
      "handle": "user_handle",
      "displayName": "User",
      "name": "User",
      "role": "moderator"
    }
  ],
  "total": 1
}
```

### `POST /api/v1/stars/{slug}` / `DELETE /api/v1/stars/{slug}`

Add/remove 书签。为了兼容，保留旧版 `stars` 路由和响应字段名称。两个端点都是幂等的。

回应：

```json
{ "ok": true, "starred": true, "alreadyStarred": false }
```

```json
{ "ok": true, "unstarred": true, "alreadyUnstarred": false }
```

## <a id="legacy-cli-endpoints-(deprecated)"></a><a id="legacy-cli-endpoints-deprecated"></a> 旧版 CLI 端点（已弃用）

仍支持较旧的 CLI 版本：

- `GET /api/cli/whoami`
- `POST /api/cli/upload-url`
- `POST /api/cli/publish`
- `POST /api/cli/telemetry/install` — 也被当前的 CLI 用于安装事件。
- `POST /api/cli/skill/delete`
- `POST /api/cli/skill/undelete`

拆除计划见`DEPRECATIONS.md`。

`POST /api/cli/upload-url` 返回 `uploadUrl` 和 `uploadTicket`。暂存 ClawPack tarball 的包发布必须将生成的存储 ID 作为 `clawpack` 发送，并将返回的票证作为 `clawpackUploadTicket` 发送。 GitHub Actions 发布使用单独的上传和发布范围的凭据；仅当两个凭据属于同一授权事务时，服务器才接受该票证。

## <a id="agent-skills-discovery"></a> Agent Skills 发现

`GET` 和 `HEAD /{owner}/skills/{slug}/.well-known/agent-skills/index.json` 代表技能的 Agent Skills 索引。每个上游请求都有一个十秒的截止时间，涵盖响应标头和完整的 GET 正文。上游超时导致发现失败，而不是返回部分索引。完成的响应保留上游状态、内容类型和缓存策略； HEAD 不返回正文。

## <a id="registry-discovery-(%2F.well-known%2Fclawhub.json)"></a><a id="registry-discovery-/-well-known/clawhub-json"></a> 注册表发现 （`/.well-known/clawhub.json`）

CLI 可以从站点发现 registry/auth 设置：

- `/.well-known/clawhub.json`（JSON，首选）
- `/.well-known/clawdhub.json`（旧版）

架构：

```json
{ "apiBase": "https://clawhub.ai", "authBase": "https://clawhub.ai", "minCliVersion": "0.0.5" }
```

如果您自行托管，请提供此文件（或显式设置 `CLAWHUB_REGISTRY`；旧版 `CLAWDHUB_REGISTRY`）。

## <a id="staff-featured-curation"></a> 员工精选策展

这些端点需要活动的 moderator/admin API 令牌并返回私有的、未缓存的结果。建议永远不会自行发布。

- `GET /api/v1/featured/{plugin|skill}` 按明确顺序返回编辑修订、保留（包括未决原因）和最后批准的出版物。
- `POST /api/v1/skills-sh/{owner}/{repo}/{slug}/featured` 接受 `{ "featured": true }`（或 `false`）作为公共、可安装的镜像条目。它共享十六个槽位的技能限制，保留重复添加的时间戳，并记录员工审核历史记录。 CLI：`clawhub-admin skills feature skills-sh:humanlayer/skills/show-me`。
- `POST /api/v1/featured/plugin/editorial` 接受 `expectedRevision` 和最多 8 个 `{ id, name, displayName, reason }` 条目。身份使用 `plugin:<package>`。缺失的目录条目仍保留；保存不会更改公共徽章。
- `POST /api/v1/featured/{plugin|skill}/publish` 正好接受 16 个不同的 `items`、经过审核的建议 `reportId`、`expectedEditorialRevision`、`expectedPublicationAt`（最初为空）、`periodStart`、`periodEnd` 和`dryRun`。时间戳是 Unix 毫秒；证据期限为三十完成UTC天，结束排他。

每个出版物项目都有 `id`、`version`、`selectionBasis`（`editorial` 或 `telemetry`）和 `reason`。遥测条目包括在同一窗口内计数的正 `installs30d` 和非负 `installs7d`。插件顺序是所有八个已保存的编辑保留，然后是八个遥测选择。技能使用十六个本地 `clawhub:<skill-id>` 身份，所有遥测选择。当报告提供编辑安装计数时，也包括它们。当存在 skills.sh 选择时，无法发布纯本机技能报告；首先删除这些选择。

通过 `POST /api/v1/search-insights/reports` 使用 `view: "recommendations"`、目录和完成的 `endDay` 创建推荐报告，然后读取其准备好的结果。出版物必须与保存的报告的确切身份、顺序、版本、原因、计数和期间相符。过期的报告或更改的证据需要新的报告和审查。私人报告过期后，该出版物保留其报告 ID 和证据哈希。

在更改任何徽章之前，出版物会重新验证当前的公共版本、安全性和可安装性。 Version/revision/publication 冲突返回`409`；其他无效选择返回`400`。使用 `dryRun: true`，徽章、审核记录或通知不会发生变化。以原子方式应用该集会删除其外部的前成员，保留保留的徽章时间戳，在审核历史记录中记录选择 provenance/order，并且不发送摘要或特色通知。

工作人员 CLI 读取相同的 API 并发出 JSON：

```bash
clawhub-admin featured get plugin
clawhub-admin featured editorial editorial.json
clawhub-admin featured publish plugin approved-plugins.json
clawhub-admin featured publish plugin approved-plugins.json --apply
clawhub-admin featured publish skill approved-skills.json --apply
```

无论文件的 `dryRun` 值如何，`publish` 默认为试运行。仅在确切选择获得批准后才可使用 `--apply`。计数描述的是记录的安装事件，而不是唯一用户或经过验证的成功运行时安装。
