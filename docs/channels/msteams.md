---
summary: "Microsoft Teams 机器人支持状态、能力和配置"
read_when:
  - 处理 Microsoft Teams 频道功能时
title: "Microsoft Teams"
---

状态：支持文本 + DM 附件；频道/群组文件发送需要 `sharePointSiteId` + Graph 权限（参见 [在群聊中发送文件](#sending-files-in-group-chats)）。投票通过 Adaptive Cards 发送。消息操作显式提供 `upload-file`，用于先文件后发送的场景。

## Bundled plugin

Microsoft Teams 在当前 OpenClaw 版本中作为捆绑插件随附提供，因此在正常的打包构建中无需单独安装。

如果你使用的是较旧的构建，或者自定义安装中排除了捆绑的 Teams，请在有可用的新 npm 包时安装当前版本：

```bash
openclaw plugins install @openclaw/msteams
```

如果 npm 报告 OpenClaw 维护的包已弃用，请使用当前的打包版 OpenClaw 构建，或者先使用本地检出路径，直到发布更新的 npm 包。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详情： [插件](/tools/plugin)

## 快速设置

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 通过一个命令即可完成机器人注册、清单创建和凭据生成。

**1. 安装并登录**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # 验证你已登录并查看你的租户信息
```

<Note>
Teams CLI 目前处于预览版。命令和标志在不同版本之间可能会变化。
</Note>

**2. 启动隧道**（Teams 无法访问 localhost）

如果你还没有安装并验证 devtunnel CLI，请先安装并认证它（[入门指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# 一次性设置（跨会话保持固定 URL）：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每个开发会话：
devtunnel host my-openclaw-bot
# 你的端点：https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>
需要 `--allow-anonymous`，因为 Teams 无法使用 devtunnels 进行身份验证。每个传入的机器人请求仍会由 Teams SDK 自动验证。
</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（但这些可能会在每次会话中更改 URL）。

**3. 创建应用**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

这条单命令会：

- 创建一个 Entra ID（Azure AD）应用程序
- 生成客户端密钥
- 构建并上传 Teams 应用清单（含图标）
- 注册机器人（默认由 Teams 托管——无需 Azure 订阅）

输出将显示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 以及一个 **Teams App ID** —— 请记录这些信息以便下一步使用。它还会提供直接在 Teams 中安装该应用的选项。

**4. 使用输出中的凭据配置 OpenClaw**：

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<CLIENT_ID>",
      appPassword: "<CLIENT_SECRET>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

或者直接使用环境变量：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

**5. 在 Teams 中安装应用**

`teams app create` 会提示你安装应用——请选择“Install in Teams”。如果你跳过了这一步，之后可以通过以下命令获取链接：

```bash
teams app get <teamsAppId> --install-link
```

**6. 验证一切正常**

```bash
teams app doctor <teamsAppId>
```

这会跨机器人注册、AAD 应用配置、清单有效性和 SSO 设置运行诊断。

对于生产部署，建议使用 [联合身份验证](/channels/msteams#federated-authentication-certificate-plus-managed-identity)（证书或托管身份）而不是客户端密钥。

<Note>
群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许任何成员（默认仍需提及）。
</Note>

## 目标

- 通过 Teams 私信、群聊或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终回到它们进入时所在的频道。
- 默认采用安全的频道行为（除非另有配置，否则需要提及）。

## 配置写入

默认情况下，Microsoft Teams 允许由 `/config set|unset` 触发的配置更新写入（需要 `commands.config: true`）。

可通过以下方式禁用：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（DM + 群组）

**DM 访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者在获批前会被忽略。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID。
- 不要依赖 UPN/显示名称匹配来做允许列表——它们可能会变化。OpenClaw 默认禁用直接名称匹配；如需启用，请显式设置 `channels.msteams.dangerouslyAllowNameMatching: true`。
- 向导可以在凭据允许时通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则被阻止）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可以在群聊/频道中触发（回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 可允许任何成员（默认仍需提及）。
- 要允许**没有任何频道**，请设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
  },
}
```

**Teams + 频道允许列表**

- 通过在 `channels.msteams.teams` 下列出 teams 和 channels 来限定群组/频道回复的范围。
- 键应使用稳定的 team ID 和 channel 会话 ID。
- 当 `groupPolicy="allowlist"` 且存在 teams 允许列表时，仅接受列出的 teams/channels（默认需要提及）。
- 配置向导接受 `Team/Channel` 条目并为你存储它们。
- 启动时，OpenClaw 会将 team/channel 和用户允许列表名称解析为 ID（当 Graph 权限允许时）
  并记录映射；无法解析的 team/channel 名称会按原样保留，但默认会被忽略，不用于路由，除非启用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            General: { requireMention: true },
          },
        },
      },
    },
  },
}
```

<details>
<summary><strong>手动设置（无需 Teams CLI）</strong></summary>

如果你不能使用 Teams CLI，可以通过 Azure Portal 手动设置机器人。

### 工作原理

1. 确保 Microsoft Teams 插件可用（当前版本中已捆绑）。
2. 创建一个 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建一个 **Teams 应用包**，引用该机器人并包含下面的 RSC 权限。
4. 将 Teams 应用上传/安装到某个团队中（或在个人范围中用于 DM）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams`，并启动网关。
6. 网关默认在 `/api/messages` 上监听 Bot Framework webhook 流量。

### 第 1 步：创建 Azure Bot

1. 前往 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **Basics** 选项卡：

   | Field              | Value                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **Bot handle**     | 你的机器人名称，例如 `openclaw-msteams`（必须唯一） |
   | **Subscription**   | 选择你的 Azure 订阅                           |
   | **Resource group** | 创建新的或使用现有的                               |
   | **Pricing tier**   | 开发/测试使用 **Free**                                 |
   | **Type of App**    | **Single Tenant**（推荐——见下方说明）         |
   | **Creation type**  | **Create new Microsoft App ID**                          |

<Warning>
新多租户机器人的创建在 2025-07-31 之后已被弃用。新机器人请使用 **Single Tenant**。
</Warning>

3. 点击 **Review + create** → **Create**（等待约 1-2 分钟）

### 第 2 步：获取凭据

1. 前往你的 Azure Bot 资源 → **Configuration**
2. 复制 **Microsoft App ID** → 这就是你的 `appId`
3. 点击 **Manage Password** → 进入 App Registration
4. 在 **Certificates & secrets** 下 → **New client secret** → 复制 **Value** → 这就是你的 `appPassword`
5. 前往 **Overview** → 复制 **Directory (tenant) ID** → 这就是你的 `tenantId`

### 第 3 步：配置消息端点

1. 在 Azure Bot → **Configuration**
2. 将 **Messaging endpoint** 设置为你的 webhook URL：
   - 生产环境：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（见下方 [本地开发隧道](#local-development-tunneling)）

### 第 4 步：启用 Teams 频道

1. 在 Azure Bot → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

### 第 5 步：构建 Teams 应用清单

- 包含一个 `bot` 条目，其中 `botId = <App ID>`。
- Scopes：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人范围文件处理所需）。
- 添加 RSC 权限（参见 [RSC 权限](#current-teams-rsc-permissions-manifest)）。
- 创建图标：`outline.png`（32x32）和 `color.png`（192x192）。
- 将这三个文件打包在一起：`manifest.json`、`outline.png`、`color.png`。

### 第 6 步：配置 OpenClaw

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

环境变量：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

### 第 7 步：运行网关

当插件可用且 `msteams` 配置存在并带有凭据时，Teams 频道会自动启动。

</details>

## 联邦认证（证书 + 托管标识）

> 添加于 2026.4.11

对于生产环境部署，OpenClaw 支持 **联邦认证**，作为比客户端密钥更安全的替代方案。可用两种方式：

### 选项 A：基于证书的认证

使用与你的 Entra ID 应用注册关联的 PEM 证书。

**设置：**

1. 生成或获取一个证书（包含私钥的 PEM 格式）。
2. 在 Entra ID → 应用注册 → **证书和密码** → **证书** → 上传公钥证书。

**配置：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      certificatePath: "/path/to/cert.pem",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### 选项 B：Azure 托管标识

使用 Azure 托管标识进行无密码认证。这非常适合部署在 Azure 基础设施（AKS、App Service、Azure 虚拟机）上且可用托管标识的场景。

**工作原理：**

1. Bot Pod/虚拟机具有托管标识（系统分配或用户分配）。
2. 一个 **联邦身份凭据** 将该托管标识链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 端点（`169.254.169.254`）获取令牌。
4. 该令牌被传递给 Teams SDK 用于 bot 认证。

**前置条件：**

- 已启用托管标识的 Azure 基础设施（AKS 工作负载标识、App Service、虚拟机）
- 已在 Entra ID 应用注册上创建联邦身份凭据
- Pod/虚拟机可访问 IMDS（`169.254.169.254:80`）

**配置（系统分配托管标识）：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**配置（用户分配托管标识）：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      managedIdentityClientId: "<MI_CLIENT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅适用于用户分配）

### AKS 工作负载标识设置

对于使用工作负载标识的 AKS 部署：

1. 在你的 AKS 集群上**启用工作负载标识**。
2. 在 Entra ID 应用注册上**创建联邦身份凭据**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. 使用应用客户端 ID 为 Kubernetes service account 添加**注解**：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. 为工作负载标识注入**为 Pod 添加标签**：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **确保可访问 IMDS**（`169.254.169.254`）——如果使用 NetworkPolicy，请添加一条允许到 `169.254.169.254/32` 的 80 端口出站流量规则。

### 认证类型对比

| 方式                 | 配置                                           | 优点                               | 缺点                                   |
| -------------------- | ---------------------------------------------- | ---------------------------------- | -------------------------------------- |
| **客户端密钥**        | `appPassword`                                  | 设置简单                           | 需要轮换密钥，安全性较低                |
| **证书**              | `authType: "federated"` + `certificatePath`    | 网络中不传共享密钥                 | 需要管理证书                          |
| **托管标识**          | `authType: "federated"` + `useManagedIdentity` | 无密码，不需要管理密钥             | 需要 Azure 基础设施                    |

**默认行为：** 当未设置 `authType` 时，OpenClaw 默认使用客户端密钥认证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。请使用持久化开发隧道，以便你的 URL 在不同会话之间保持不变：

```bash
# 一次性设置：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每次开发会话：
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（每次会话 URL 可能会变化）。

如果你的隧道 URL 发生变化，请更新端点：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## 测试 Bot

**运行诊断：**

```bash
teams app doctor <teamsAppId>
```

一次性检查 bot 注册、AAD 应用、清单和 SSO 配置。

**发送测试消息：**

1. 安装 Teams 应用（使用 `teams app get <id> --install-link` 返回的安装链接）
2. 在 Teams 中找到 bot 并发送一条私信
3. 检查网关日志是否有传入活动

## 环境变量

所有配置键都可以改为通过环境变量设置：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（可选：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（联邦 + 证书）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（可选，认证不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（联邦 + 托管标识）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（仅用户分配 MI）

## 成员信息操作

OpenClaw 提供一个由 Graph 支持的 Microsoft Teams `member-info` 操作，使 agents 和自动化系统能够直接从 Microsoft Graph 中解析频道成员详细信息（显示名称、电子邮件、角色）。

要求：

- `Member.Read.Group` RSC 权限（已包含在推荐清单中）
- 对于跨团队查找：`User.Read.All` Graph 应用权限并获得管理员同意

该操作受 `channels.msteams.actions.memberInfo` 控制（默认：当 Graph 凭据可用时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制会封装进 prompt 的最近频道/群聊消息数量。
- 回退到 `messages.groupChat.historyLimit`。设为 `0` 可禁用（默认 50）。
- 获取到的线程历史会按发送者 allowlist（`allowFrom` / `groupAllowFrom`）过滤，因此线程上下文注入只包含来自允许发送者的消息。
- 引用附件上下文（从 Teams 回复 HTML 中派生的 `ReplyTo*`）当前会按接收到的内容传递。
- 换句话说，allowlist 仅用于限制哪些人可以触发 agent；目前只有特定的补充上下文路径会被过滤。
- 可通过 `channels.msteams.dmHistoryLimit` 限制 DM 历史（用户轮次）。按用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限（清单）

这些是我们 Teams 应用清单中**现有的 resourceSpecific 权限**。它们仅适用于应用已安装的团队/聊天内部。

**适用于频道（团队范围）：**

- `ChannelMessage.Read.Group` (Application) - 在无需 @mention 的情况下接收所有频道消息
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**适用于群聊：**

- `ChatMessage.Read.Chat` (Application) - 在无需 @mention 的情况下接收所有群聊消息

通过 Teams CLI 添加 RSC 权限：

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Teams 清单示例（已脱敏）

包含所需字段的最小有效示例。请替换 ID 和 URL。

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

### 清单注意事项（必需字段）

- `bots[].botId` **必须** 与 Azure Bot App ID 匹配。
- `webApplicationInfo.id` **必须** 与 Azure Bot App ID 匹配。
- `bots[].scopes` 必须包含你计划使用的入口（`personal`、`team`、`groupChat`）。
- 在个人范围内进行文件处理时需要 `bots[].supportsFiles: true`。
- 如果你希望接收频道流量，`authorization.permissions.resourceSpecific` 必须包含频道读/发权限。

### 更新现有应用

要更新一个已安装的 Teams 应用（例如添加 RSC 权限）：

```bash
# 下载、编辑并重新上传清单
teams app manifest download <teamsAppId> manifest.json
# 在本地编辑 manifest.json...
teams app manifest upload manifest.json <teamsAppId>
# 如果内容发生变化，版本会自动提升
```

更新后，请在每个团队中重新安装该应用以使新权限生效，并且**完全退出并重新启动 Teams**（而不只是关闭窗口）以清除缓存的应用元数据。

<details>
<summary>手动更新清单（不使用 CLI）</summary>

1. 使用新设置更新你的 `manifest.json`
2. **递增 `version` 字段**（例如，`1.0.0` → `1.1.0`）
3. **重新压缩**包含图标的清单（`manifest.json`、`outline.png`、`color.png`）
4. 上传新的 zip：
   - **Teams 管理中心：** Teams apps → Manage apps → 找到你的应用 → Upload new version
   - **侧载：** 在 Teams 中 → Apps → Manage your apps → Upload a custom app

</details>

## 功能：仅 RSC vs Graph

### 使用 **Teams 仅 RSC**（已安装应用，无 Graph API 权限）

可用：

- 读取频道消息的 **文本** 内容。
- 发送频道消息的 **文本** 内容。
- 接收 **个人（DM）** 文件附件。

不可用：

- 频道/群组的 **图片或文件内容**（payload 只包含 HTML 占位片段）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 读取消息历史记录（仅限实时 webhook 事件）。

### 使用 **Teams RSC + Microsoft Graph 应用程序权限**

新增：

- 下载托管内容（粘贴到消息中的图片）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取频道/聊天消息历史记录。

### RSC vs Graph API

| 功能                   | RSC 权限             | Graph API                           |
| ---------------------- | -------------------- | ----------------------------------- |
| **实时消息**           | 是（通过 webhook）    | 否（仅轮询）                         |
| **历史消息**           | 否                   | 是（可查询历史）                    |
| **配置复杂度**         | 仅需应用清单         | 需要管理员同意 + token 流程          |
| **离线可用**           | 否（必须运行中）      | 是（可随时查询）                    |

**结论：** RSC 用于实时监听；Graph API 用于历史访问。若要在离线期间补抓漏掉的消息，你需要带有 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## 启用 Graph 的媒体 + 历史记录（频道必需）

如果你需要在 **频道** 中处理图片/文件，或者想获取 **消息历史记录**，必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID（Azure AD）**应用注册**中，添加 Microsoft Graph **应用程序权限**：
   - `ChannelMessage.Read.All`（频道附件 + 历史记录）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）
2. 为租户 **授予管理员同意**。
3. 提升 Teams 应用 **manifest 版本**，重新上传，并 **在 Teams 中重新安装应用**。
4. **完全退出并重新启动 Teams**，以清除缓存的应用元数据。

**用户提及的额外权限：** 对于对话中的用户，用户 @mention 开箱即用。但如果你想动态搜索并提及 **不在当前对话中的** 用户，请添加 `User.Read.All`（Application）权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理耗时过长（例如 LLM 响应较慢），你可能会看到：

- 网关超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 通过快速返回并主动发送回复来处理这一点，但过慢的响应仍可能引发问题。

### 格式化

Teams 的 markdown 比 Slack 或 Discord 更受限：

- 基本格式可用：**粗体**、_斜体_、`代码`、链接
- 复杂 markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票和语义化展示发送（见下文）

## 配置

关键设置（共享频道模式见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用该频道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：DM 白名单（推荐使用 AAD 对象 ID）。当 Graph 可用时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：紧急开关，用于重新启用可变 UPN/显示名匹配以及直接的团队/频道名称路由。
- `channels.msteams.textChunkLimit`：出站文本分块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）拆分，再按长度分块。
- `channels.msteams.mediaAllowHosts`：入站附件主机白名单（默认 Microsoft/Teams 域名）。
- `channels.msteams.mediaAuthAllowHosts`：在媒体重试时附加 Authorization 头的主机白名单（默认 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`：在频道/群组中要求 @mention（默认 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按团队覆盖。
- `channels.msteams.teams.<teamId>.tools`：默认的团队级工具策略覆盖（当频道覆盖缺失时使用 `allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的团队级按发送者工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道的工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按频道按发送者的工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 键应使用明确前缀：
  `id:`、`e164:`、`username:`、`name:`（旧的无前缀键仍仅映射到 `id:`）。
- `channels.msteams.actions.memberInfo`：启用或禁用基于 Graph 的成员信息动作（默认：在 Graph 凭据可用时启用）。
- `channels.msteams.authType`：认证类型 — `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件路径（federated + certificate auth）。
- `channels.msteams.certificateThumbprint`：证书指纹（可选，认证不需要）。
- `channels.msteams.useManagedIdentity`：启用托管标识认证（federated 模式）。
- `channels.msteams.managedIdentityClientId`：用户分配托管标识的客户端 ID。
- `channels.msteams.sharePointSiteId`：用于群聊/频道文件上传的 SharePoint site ID（见 [在群聊中发送文件](#sending-files-in-group-chats)）。

## 路由与会话

- 会话键遵循标准代理格式（见 [/concepts/session](/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群组消息使用 conversation id：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：线程 vs 帖子

Teams 最近在同一底层数据模型之上引入了两种频道 UI 样式：

| 样式                     | 描述                                                   | 推荐的 `replyStyle` |
| ------------------------ | ------------------------------------------------------ | -------------------- |
| **Posts**（经典）        | 消息以卡片形式显示，下面带有线程回复                    | `thread`（默认）     |
| **Threads**（类似 Slack）| 消息线性流动，更像 Slack                              | `top-level`          |

**问题：** Teams API 不会暴露频道使用的是哪种 UI 样式。如果你使用了错误的 `replyStyle`：

- 在 Threads 风格频道中使用 `thread` → 回复会嵌套得很别扭
- 在 Posts 风格频道中使用 `top-level` → 回复会显示为单独的顶层帖子，而不是线程内回复

**解决方案：** 根据频道的设置情况，按频道配置 `replyStyle`：

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

## 附件与图片

**当前限制：**

- **DM：** 图片和文件附件可通过 Teams bot 文件 API 使用。
- **频道/群组：** 附件存储在 M365 存储中（SharePoint/OneDrive）。webhook payload 只包含 HTML 占位片段，不包含实际文件字节。**下载频道附件需要 Graph API 权限**。
- 对于显式“先文件”发送，请使用 `action=upload-file` 配合 `media` / `filePath` / `path`；可选的 `message` 会成为随附文本/评论，而 `filename` 会覆盖上传名称。

没有 Graph 权限时，带图片的频道消息会以纯文本接收（机器人无法访问图片内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。可通过 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 可允许任何主机）。
只有在 `channels.msteams.mediaAuthAllowHosts` 中列出的主机才会附加 Authorization 头（默认 Graph + Bot Framework 主机）。请保持此列表严格（避免使用多租户后缀）。

## 在群聊中发送文件

机器人可以使用 FileConsentCard 流程在 DM 中发送文件（内置支持）。不过，**在群聊/频道中发送文件** 需要额外配置：

| 场景                     | 文件发送方式                                      | 所需配置                                      |
| ------------------------ | ------------------------------------------------- | --------------------------------------------- |
| **DMs**                  | FileConsentCard → 用户接受 → 机器人上传           | 开箱即用                                      |
| **群聊/频道**            | 上传到 SharePoint → 分享链接                       | 需要 `sharePointSiteId` + Graph 权限          |
| **图片（任意场景）**     | Base64 编码内联                                   | 开箱即用                                      |

### 为什么群聊需要 SharePoint

机器人没有个人 OneDrive（`/me/drive` Graph API 端点对应用身份不起作用）。要在群聊/频道中发送文件，机器人会将文件上传到一个 **SharePoint site** 并创建分享链接。

### 设置

1. 在 Entra ID（Azure AD）→ 应用注册中 **添加 Graph API 权限**：
   - `Sites.ReadWrite.All`（Application）- 将文件上传到 SharePoint
   - `Chat.Read.All`（Application）- 可选，启用按用户共享链接

2. 为租户 **授予管理员同意**。

3. **获取你的 SharePoint site ID：**

   ```bash
   # 通过 Graph Explorer 或使用有效 token 的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：站点位于 "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应包含："id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **配置 OpenClaw：**

   ```json5
   {
     channels: {
       msteams: {
         // ... 其他配置 ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### 分享行为

| 权限                                  | 分享行为                                                 |
| ------------------------------------- | -------------------------------------------------------- |
| `Sites.ReadWrite.All` 仅此一项        | 组织范围分享链接（组织内任何人都可访问）                  |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户分享链接（只有聊天成员可访问）                     |

按用户分享更安全，因为只有聊天参与者可以访问该文件。如果缺少 `Chat.Read.All` 权限，机器人会回退为组织范围分享。

### 回退行为

| 场景                                             | 结果                                               |
| ------------------------------------------------ | -------------------------------------------------- |
| 群聊 + 文件 + 已配置 `sharePointSiteId`          | 上传到 SharePoint，发送分享链接                    |
| 群聊 + 文件 + 未配置 `sharePointSiteId`          | 尝试 OneDrive 上传（可能失败），仅发送文本         |
| 个人聊天 + 文件                                  | FileConsentCard 流程（无需 SharePoint 也可工作）    |
| 任意场景 + 图片                                  | Base64 编码内联（无需 SharePoint 也可工作）         |

### 文件存储位置

上传的文件会存储在所配置 SharePoint site 的默认文档库中的 `/OpenClawShared/` 文件夹内。

## 投票（Adaptive Cards）

OpenClaw 将 Teams 投票作为 Adaptive Cards 发送（没有原生的 Teams 投票 API）。

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- 票数由网关记录到 `~/.openclaw/msteams-polls.json`。
- 网关必须保持在线才能记录投票。
- 投票目前不会自动发布结果摘要（如有需要，请查看存储文件）。

## 演示卡片

使用 `message` 工具或 CLI 向 Teams 用户或会话发送语义化的演示载荷。OpenClaw 会根据通用的演示契约将其渲染为 Teams Adaptive Cards。

`presentation` 参数接受语义块。提供 `presentation` 时，消息文本是可选的。

**Agent tool:**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  presentation: {
    title: "你好",
    blocks: [{ type: "text", text: "你好！" }],
  },
}
```

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好！"}]}'
```

有关目标格式的详细信息，请参见下面的[目标格式](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和会话：

| 目标类型             | 格式                             | 示例                                                |
| -------------------- | -------------------------------- | --------------------------------------------------- |
| 用户（按 ID）        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| 用户（按名称）       | `user:<display-name>`            | `user:John Smith`（需要 Graph API）                 |
| 群组/频道            | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| 群组/频道（原始）     | `<conversation-id>`              | `19:abc123...@thread.tacv2`（如果包含 `@thread`）   |

**CLI 示例：**

```bash
# 通过 ID 向用户发送
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "你好"

# 通过显示名称向用户发送（会触发 Graph API 查找）
openclaw message send --channel msteams --target "user:John Smith" --message "你好"

# 向群聊或频道发送
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "你好"

# 向会话发送演示卡片
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好"}]}'
```

**Agent tool 示例：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "你好！",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  presentation: {
    title: "你好",
    blocks: [{ type: "text", text: "你好" }],
  },
}
```

<Note>
如果没有 `user:` 前缀，名称默认会按群组或团队解析。按显示名称定位到个人时，请始终使用 `user:`。
</Note>

## 主动消息

- 主动消息只有在用户与机器人发生交互**之后**才可能发送，因为我们会在那时保存会话引用。
- 有关 `dmPolicy` 和允许名单门控，请参见 `/gateway/configuration`。

## 团队和频道 ID（常见误区）

Teams URL 中的 `groupId` 查询参数**不是**配置所使用的团队 ID。请从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    团队 ID（对此进行 URL 解码）
```

**频道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      频道 ID（URL 解码）
```

**用于配置：**

- 团队 ID = `/team/` 后的路径段（URL 解码，例如 `19:Bk4j...@thread.tacv2`）
- 频道 ID = `/channel/` 后的路径段（URL 解码）
- **忽略** `groupId` 查询参数

## 私有频道

机器人在私有频道中的支持有限：

| 功能                         | 标准频道            | 私有频道               |
| ---------------------------- | ------------------- | ---------------------- |
| 机器人安装                  | 是                  | 有限                   |
| 实时消息（webhook）         | 是                  | 可能不起作用           |
| RSC 权限                    | 是                  | 行为可能不同           |
| @提及                       | 是                  | 如果机器人可访问        |
| Graph API 历史记录          | 是                  | 是（需要权限）         |

**如果私有频道不起作用，可尝试以下变通方案：**

1. 使用标准频道进行机器人交互
2. 使用私信 - 用户始终可以直接向机器人发消息
3. 使用 Graph API 访问历史记录（需要 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道中不显示图片：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **频道中没有响应：** 默认需要提及；设置 `channels.msteams.requireMention=false`，或按团队/频道单独配置。
- **版本不匹配（Teams 仍显示旧 manifest）：** 删除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 Unauthorized：** 在没有 Azure JWT 的情况下手动测试时这是预期现象——表示端点可达，但认证失败。请使用 Azure Web Chat 正确测试。

### manifest 上传错误

- **“Icon file cannot be empty”：** manifest 引用了 0 字节的图标文件。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id already in use”：** 该应用仍安装在其他团队/聊天中。请先找到并卸载它，或者等待 5-10 分钟让变更传播完成。
- **上传时出现 “Something went wrong”：** 改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发者工具（F12）→ Network 选项卡，并检查响应体中的实际错误。
- **侧载失败：** 尝试选择“Upload an app to your org's app catalog”，而不是“Upload a custom app”——这通常可以绕过侧载限制。

### RSC 权限不生效

1. 确认 `webApplicationInfo.id` 与你的机器人 App ID 完全一致
2. 重新上传应用，并在团队/聊天中重新安装
3. 检查组织管理员是否已阻止 RSC 权限
4. 确认你使用的是正确的作用域：团队使用 `ChannelMessage.Read.Group`，群聊使用 `ChatMessage.Read.Chat`

## 参考资料

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams 开发者门户](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams 应用 manifest 架构](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 机器人文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群组需要 Graph）
- [主动消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于机器人管理的 Teams CLI

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — 私信认证与配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型与加固
