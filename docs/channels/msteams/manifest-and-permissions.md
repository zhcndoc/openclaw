---
summary: "Microsoft Teams 应用清单、RSC 权限以及每个功能所需的图形权限"
read_when:
  - "构建或更新 Teams 应用清单"
  - "决定授予 RSC 或 Microsoft Graph 权限"
  - "频道图像或历史记录丢失"
title: "Microsoft Teams 清单和权限"
sidebarTitle: "清单和权限"
---

Teams 应用清单、其声明的特定于资源的同意权限以及解锁媒体和历史记录的 Microsoft 图形权限。

## <a id="current-teams-rsc-permissions-(manifest)"></a><a id="current-teams-rsc-permissions-manifest"></a> 当前 Teams RSC 权限（清单）

这些是我们的 Teams 应用清单中的 **现有资源特定权限**。它们仅适用于安装应用程序的 team/chat 内部。

**适用于频道（团队范围）：**

- `ChannelMessage.Read.Group`（应用程序）-接收所有没有@mention的通道消息
- `ChannelMessage.Send.Group`（应用）
- `Member.Read.Group`（应用）
- `Owner.Read.Group`（应用）
- `ChannelSettings.Read.Group`（应用）
- `TeamMember.Read.Group`（应用）
- `TeamSettings.Read.Group`（应用）

**适用于群聊：**

- `ChatMessage.Read.Chat`（应用程序）-接收所有没有@mention的群聊消息

通过 Teams CLI 添加 RSC 权限：

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## <a id="example-teams-manifest-(redacted)"></a><a id="example-teams-manifest-redacted"></a> Teams 清单示例（已脱敏）

带有必填字段的最小有效示例。替换 ID 和 URL。

```json5
{
  $schema: "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  manifestVersion: "1.23",
  version: "1.0.0",
  id: "00000000-0000-0000-0000-000000000000",
  name: { short: "OpenClaw" },
  developer: {
    name: "Your Org",
    websiteUrl: "https://example.com",
    privacyUrl: "https://example.com/privacy",
    termsOfUseUrl: "https://example.com/terms",
  },
  description: { short: "OpenClaw in Teams", full: "OpenClaw in Teams" },
  icons: { outline: "outline.png", color: "color.png" },
  accentColor: "#5B6DEF",
  bots: [
    {
      botId: "11111111-1111-1111-1111-111111111111",
      scopes: ["personal", "team", "groupChat"],
      isNotificationOnly: false,
      supportsCalling: false,
      supportsVideo: false,
      supportsFiles: true,
    },
  ],
  webApplicationInfo: {
    id: "11111111-1111-1111-1111-111111111111",
  },
  authorization: {
    permissions: {
      resourceSpecific: [
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChannelMessage.Send.Group", type: "Application" },
        { name: "Member.Read.Group", type: "Application" },
        { name: "Owner.Read.Group", type: "Application" },
        { name: "ChannelSettings.Read.Group", type: "Application" },
        { name: "TeamMember.Read.Group", type: "Application" },
        { name: "TeamSettings.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ],
    },
  },
}
```

### <a id="manifest-caveats-(must-have-fields)"></a><a id="manifest-caveats-must-have-fields"></a> 清单注意事项（必需字段）

- `bots[].botId` **必须** 与 Azure Bot App ID 匹配。
- `webApplicationInfo.id` **必须** 与 Azure Bot App ID 匹配。
- `bots[].scopes` 必须包含你计划使用的范围（`personal`、`team`、`groupChat`）。
- 在个人范围内进行文件处理时，需要 `bots[].supportsFiles: true`。
- `authorization.permissions.resourceSpecific` 必须包含用于通道流量的通道 read/send。

### <a id="updating-an-existing-app"></a> 更新现有应用

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

更新后，请在每个团队中重新安装该应用，并且**完全退出并重新启动 Teams**（而不只是关闭窗口），以清除缓存的应用元数据。

<details>
<summary>手动更新清单（不使用 CLI）</summary>

1. 使用新的设置更新 `manifest.json`。
2. **增加 `version` 字段**（e.g.、`1.0.0` → `1.1.0`）。
3. **重新压缩**清单及图标（`manifest.json`、`outline.png`、`color.png`）。
4. 上传新的 zip：
   - **Teams 管理中心：** Teams 应用 → 管理应用 → 找到你的应用 → 上传新版本。
   - **旁加载：** Teams → 应用 → 管理你的应用 → 上传自定义应用。

</details>

## <a id="capabilities%3A-rsc-only-vs-graph"></a><a id="capabilities-rsc-only-vs-graph"></a> 功能：仅 RSC 与 Graph 对比

### <a id="with-teams-rsc-only-(app-installed%2C-no-graph-api-permissions)"></a><a id="with-teams-rsc-only-app-installed-no-graph-api-permissions"></a> 使用 **Teams 仅 RSC**（已安装应用，无 Graph API 权限）

可用：

- 读取频道消息的 **文本** 内容。
- 发送频道消息的 **文本** 内容。
- 接收 **个人（DM）** 文件附件。

NOT 是否有效：

- Channel/group **图像或文件内容**（有效负载仅包括HTML存根）。
- 下载SharePoint/OneDrive.中存储的附件
- 读取超出实时 webhook 事件之外的消息历史记录。

### <a id="with-teams-rsc-%2B-microsoft-graph-application-permissions"></a><a id="with-teams-rsc-+-microsoft-graph-application-permissions"></a> 使用 **Teams RSC + Microsoft Graph 应用程序权限**

新增：

- 下载托管内容（粘贴到消息中的图片）。
- 下载SharePoint/OneDrive.中存储的文件附件
- 通过图表读取 channel/chat 消息历史记录。

### <a id="rsc-vs-graph-api"></a> RSC 与 Graph API 对比

| 能力              | RSC 权限      | 图API                           |
| ----------------------- | -------------------- | ----------------------------------- |
| **实时消息**  | 是（通过 webhook）    | 否（仅轮询）                   |
| **历史消息** | No                   | 是（可以查询历史记录）             |
| **设置复杂度**    | 仅需应用清单    | 需要管理员同意 + token 流程 |
| **离线可用**       | 否（必须运行中） | 是（可随时查询）                 |

**结论：** RSC 用于实时监听；Graph API 用于历史访问。若要在离线期间补取错过的消息，你需要带有 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## <a id="graph-enabled-media-%2B-history"></a><a id="graph-enabled-media-+-history"></a> 启用 Graph 的媒体 + 历史记录

仅启用 Teams 范围和您使用的数据所需的 Microsoft 图形应用程序权限：

1. Entra ID（Azure AD）**应用注册** → 添加 Graph **应用程序权限**：
   - `ChannelMessage.Read.All` 用于频道附件和频道历史记录。
   - `Chat.Read.All` 用于群聊附件和群聊历史记录。
   - 当附件字节必须从 SharePoint/OneDrive 存储中下载时使用 `Files.Read.All`；仅历史记录的配置不需要它。
2. **向租户授予管理员同意**。
3. 提升 Teams 应用 **manifest 版本**，重新上传，并**在 Teams 中重新安装该应用**。
4. **完全退出并重新启动 Teams**，以清除缓存的应用元数据。

### <a id="channel%2Fgroup-file-recovery-(graphmediafallback)"></a><a id="channel/group-file-recovery-graphmediafallback"></a> Channel/group 文件恢复 （`graphMediaFallback`）

Teams 可能会从发送给 bot 的 HTML 活动中移除文件标记。在这种情况下，Bot Framework activity 与普通 HTML 消息无法区分；完整的附件引用只存在于该消息的 Graph 副本中。

在授予上述权限后启用该回退：

```json5
{
  channels: {
    msteams: {
      graphMediaFallback: true,
    },
  },
}
```

这仅适用于频道和群聊。它会在 HTML activity 没有产生可直接下载的媒体时增加一次 Graph 消息查询，包括普通消息或仅提及消息。默认值为 `false`，因此现有安装不会自动获得额外的 Graph 流量或权限错误。

**用户提到：** @mentions 对于已经在对话中的用户来说是开箱即用的。要动态搜索和提及不在当前对话中的用户 ****，请添加 `User.Read.All`（应用程序）权限并授予管理员同意。
