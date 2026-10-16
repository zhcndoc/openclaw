---
summary: "Google 了解 OAuth 设置、刷新令牌、预检和会议工件导出"
read_when:
  - "您正在为 Google Meet REST API 创建 Google 云凭证"
  - "您正在铸造或轮换 Google Meet 刷新令牌"
  - "您正在阅读 Meet 工件、出勤情况或成绩单导出"
title: "Google 认识 OAuth 和工件"
sidebarTitle: "OAuth 和文物"
---

Google 云凭证、刷新令牌、OAuth 验证以及阅读 Meet 工件、考勤和导出。 [Google Meet 插件](/plugins/google-meet) 指南的一部分。

## <a id="oauth-and-preflight"></a> OAuth 和预检

创建 Meet 链接时 OAuth 是可选的，因为 `googlemeet create` 可以回退到浏览器自动化。配置 OAuth 后，可用于通过官方 API 创建、解析空间，或执行 Meet Media API 预检。Chrome/Chrome-node 加入会议始终不依赖 OAuth；无论哪种方式，它们都使用已登录的 Chrome 配置文件、主机的原生虚拟音频后端，以及一个已连接的节点（对于 `chrome-node`）。

### <a id="create-google-credentials"></a> 创建 Google 凭据

在 Google Cloud Console 中：

<Steps>
<Step id="create-or-select-a-project" title="创建或选择项目">
</Step>
<Step id="enable-the-google-meet-rest-api" title="启用 Google 满足 REST API">
</Step>
<Step id="configure-the-oauth-consent-screen" title="配置 OAuth 同意屏幕">
对于 Google 工作区组织来说，内部是最简单的。 personal/test 设置的外部工作；当应用程序处于测试阶段时，添加将授权其作为测试用户的每个 Google 帐户。
</Step>
<Step id="add-the-requested-scopes" title="添加请求的范围">
- `https://www.googleapis.com/auth/meetings.space.created`
- `https://www.googleapis.com/auth/meetings.space.readonly`
- `https://www.googleapis.com/auth/meetings.space.settings`
- `https://www.googleapis.com/auth/meetings.conference.media.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`（Calendar 查找）
- `https://www.googleapis.com/auth/drive.meet.readonly`（transcript/smart-note文档正文导出）

</Step>
<Step id="create-an-oauth-client-id" title="创建 OAuth 客户端 ID">
应用类型 **Web application**。授权重定向 URI：

```text
http://localhost:8085/oauth2callback
```

</Step>
<Step id="copy-the-client-id-and-client-secret" title="复制客户端 ID 和客户端密钥">
</Step>
</Steps>

`meetings.space.created` 是 `spaces.create` 所必需的。 `meetings.space.readonly` 将 Meet URLs/codes 解析为空格。 `meetings.space.settings` 让 OpenClaw 在 API 房间创建过程中传递 `SpaceConfig` 设置，例如 `accessType`。 `meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体工作； Google 可能需要开发者预览版注册才能实际使用媒体 API。仅 `--today`/`--event` 日历查找需要 `calendar.events.readonly`。仅 `--include-doc-bodies` 导出需要 `drive.meet.readonly`。如果您只需要基于浏览器的 Chrome 加入，请完全跳过 OAuth。

### <a id="mint-the-refresh-token"></a> 获取刷新令牌

配置 `oauth.clientId`，并可选配置 `oauth.clientSecret`（或通过环境变量传入），然后运行：

```bash
openclaw googlemeet auth login --json
```

这将在 `http://localhost:8085/oauth2callback` 上运行带有本地主机回调的 PKCE 流，并打印带有刷新令牌的 `oauth` 配置块。当浏览器无法到达本地回调时，为 copy/paste 流添加 `--manual`：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 输出：

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

将 `oauth` 对象存放到插件配置中：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

当你不想把刷新令牌放入配置时，优先使用环境变量；配置优先解析，然后才会回退到环境变量。如果你是在会议创建、日历查找或文档正文导出支持加入之前完成认证的，请重新运行 `openclaw googlemeet auth login --json`，以确保刷新令牌覆盖当前作用域集合。

### <a id="verify-oauth-with-doctor"></a> 使用 doctor 验证 OAuth

```bash
openclaw googlemeet doctor --oauth --json
```

这会检查 OAuth 配置是否存在，以及刷新令牌是否可以获取访问令牌，而无需加载 Chrome 运行时或要求已连接的节点。报告只包含状态字段（`ok`、`configured`、`tokenSource`、`expiresAt`、检查消息），绝不会打印访问令牌、刷新令牌或客户端密钥。

| 检查                | 含义                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加 `oauth.refreshToken`，或者存在缓存的访问令牌 |
| `oauth-token`        | 缓存的访问令牌仍然有效，或者刷新令牌成功获取了新的访问令牌    |
| `meet-spaces-get`    | 可选的 `--meeting` 检查已解析出一个现有的 Meet 空间                       |
| `meet-spaces-create` | 可选的 `--create-space` 检查创建了一个新的 Meet 空间                         |

使用带副作用的创建检查来证明 Meet API 已启用且 `spaces.create` 作用域有效：

```bash
openclaw googlemeet doctor --oauth --create-space --json
```

证明对现有空间的读取权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

这些检查返回 `403` 通常意味着 Meet REST API 已被禁用、刷新令牌缺少所需作用域，或者 Google 账号无法访问该空间。刷新令牌错误则表示需要重新运行 `openclaw googlemeet auth login --json` 并保存新的 `oauth` 块。

浏览器回退不需要 OAuth；那里使用的 Google 登录来自所选节点上已登录的 Chrome 配置文件，而不是 OpenClaw 配置。

接受以下环境变量作为回退：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或 `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

### <a id="resolve%2C-preflight%2C-and-read-artifacts"></a><a id="resolve-preflight-and-read-artifacts"></a> 解析、预检和读取工件

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 创建会议记录之后：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting` 时，`artifacts` 和 `attendance` 默认使用最新的会议记录；传入 `--all-conference-records` 可获取所有保留的记录。

日历查找会在读取工件之前先从 Google Calendar 解析会议 URL（需要包含 Calendar events readonly 作用域的刷新令牌）：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 会在今天的 `primary` 日历中搜索带有 Meet 链接的事件；`--event <query>` 会搜索匹配的事件文本；`--calendar <id>` 可指定非主日历。`calendar-events` 会预览匹配的事件，并标记 `latest`/`artifacts`/`attendance`/`export` 将选择哪个事件。

如果您已经知道会议记录 ID，请直接寻址：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

关闭 API- 创建的空间的房间：

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

调用 `spaces.endActiveConference` 并需要 OAuth 以及授权帐户可以管理的空间的 `meetings.space.created` 范围。接受 Meet URL、会议代码或 `spaces/{id}` 并首先将其解析为 API 空间资源。这与 `googlemeet leave` 是分开的：`leave` 停止 OpenClaw 的 local/session 参与； `end-active-conference` 请求 Google Meet 结束该空间的活动会议。

生成可读报告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

对于 `artifacts` 和 `attendance`，`--output <path>` 将选定的格式（包括默认摘要）写入文件。如果没有 `--output`，报告将转至标准输出。

`artifacts` 在 Google 公开时返回会议记录元数据以及参与者、录音、转录本、结构化转录本条目和智能笔记资源元数据。 `--no-transcript-entries` 跳过大型会议的条目查找。 `attendance` 将参与者扩展到参与者会话行，其中包含 first/last 的查看次数、总会话持续时间、late/early-leave 标志以及按登录用户或显示名称合并的重复参与者资源； `--no-merge-duplicates` 将原始资源分开，`--late-after-minutes`/`--early-before-minutes` 调整阈值。

`export` 写入 `summary.md`、`attendance.csv`、`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的文件夹。 `manifest.json` 记录所选的输入、导出选项、会议记录、输出文件、计数、令牌源、使用的任何日历事件以及部分检索警告。 `--zip` 还在该文件夹旁边写入一个便携式存档。 `--include-doc-bodies` 通过 Drive `files.export` 导出链接的 transcript/smart-note Google 文档文本（需要 Drive Meet 只读范围）；如果没有它，导出将仅包括 Meet 元数据和结构化成绩单条目。部分工件失败（智能笔记列表、成绩单输入或文档正文错误）会将警告保留在 summary/manifest 中，而不是使整个导出失败。 `--dry-run` 获取相同的数据并打印清单 JSON，而不创建文件夹或 ZIP。

代理通过 `google_meet` 工具使用相同的操作（`export`、`create` 与 `accessType`、`end_active_conference`、`test_listen`）；请参见 [Tool](/plugins/google-meet/tool-and-modes#tool)。

### <a id="live-smoke-test"></a> 实况冒烟测试

`pnpm test:live` 需要 OpenClaw 存储库的源签出；下面的 `openclaw googlemeet` 命令可以从任何安装运行。

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

| 变量                                                                                                                  | 用途                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `OPENCLAW_LIVE_TEST=1`                                                                                                    | 启用受保护的实况测试                                             |
| `OPENCLAW_GOOGLE_MEET_LIVE_MEETING`                                                                                       | 保留的 Meet URL、代码或 `spaces/{id}`                              |
| `OPENCLAW_GOOGLE_MEET_CLIENT_ID` / `GOOGLE_MEET_CLIENT_ID`                                                                | OAuth 客户端 ID                                                        |
| `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` / `GOOGLE_MEET_REFRESH_TOKEN`                                                        | 刷新令牌                                                          |
| `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`, `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN`, `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` | 可选；不带 `OPENCLAW_` 前缀的同名回退环境变量也可用 |

底座artifact/attendance烟雾需要`meetings.space.readonly`和`meetings.conference.media.readonly`。日历查找需要`calendar.events.readonly`。驱动文档体导出需要`drive.meet.readonly`。

### <a id="create-examples"></a> 创建示例

```bash
openclaw googlemeet create
```

会打印新的会议 URI、来源和加入会话。启用 OAuth 时会使用 Meet API；未启用时则使用固定 Chrome 节点上已登录的配置文件。浏览器回退 JSON：

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

如果浏览器回退首先遇到 Google 登录或 Meet 权限阻止，`google_meet` 会返回结构化详情，而不是普通字符串：

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualAction": {
    "reason": "google-login-required",
    "message": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation."
  },
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

API 创建 JSON：

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

默认创建加入，但 Chrome/Chrome-node 仍需要登录的 Google 个人资料才能通过浏览器加入；如果注销，OpenClaw 将返回 `manualAction` 或浏览器回退错误，并要求操作员在重试之前完成 Google 登录。

仅在确认您的云项目、OAuth 主体和会议参与者已注册 Meet 媒体 API 的 Google 工作区开发者预览计划后，才可设置 `preview.enrollmentAcknowledged: true`。
