---
summary: "Microsoft Teams 机器人支持状态、功能和配置"
read_when:
  - 正在处理 Microsoft Teams 渠道功能
title: "Microsoft Teams"
---

状态：支持文本 + DM 附件；频道/群组文件发送需要 `sharePointSiteId` + Graph 权限（见 [在群聊中发送文件](#sending-files-in-group-chats)）。投票通过 Adaptive Cards 发送。消息操作显式提供 `upload-file`，用于优先发文件的发送方式。

## 捆绑插件

Microsoft Teams 在当前 OpenClaw 版本中作为捆绑插件提供，因此在正常的打包构建中不需要单独安装。

如果你使用的是较旧的构建，或者是排除了捆绑 Teams 的自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/msteams
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详情：[插件](/tools/plugin)

## 快速设置

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 通过单个命令处理机器人注册、manifest 创建和凭据生成。

**1. 安装并登录**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # 验证你已登录并查看租户信息
```

<Note>
Teams CLI 当前处于预览版。命令和标志可能会在不同版本之间发生变化。
</Note>

**2. 启动隧道**（Teams 无法访问 localhost）

如果你还没有安装并完成 devtunnel CLI 的身份验证，请先安装并认证它（[入门指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# 一次性设置（跨会话保持固定 URL）：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每次开发会话：
devtunnel host my-openclaw-bot
# 你的端点：https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>
需要 `--allow-anonymous`，因为 Teams 无法对 devtunnels 进行身份验证。每个传入的机器人请求仍会由 Teams SDK 自动验证。
</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（但这些可能会在每次会话更改 URL）。

**3. 创建应用**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

这个单个命令会：

- 创建一个 Entra ID（Azure AD）应用
- 生成客户端密钥
- 构建并上传 Teams 应用 manifest（含图标）
- 注册机器人（默认由 Teams 管理——无需 Azure 订阅）

输出将显示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID`，以及一个 **Teams App ID** —— 请为后续步骤记下这些信息。它还会提供直接在 Teams 中安装应用的选项。

**4. 使用输出中的凭据配置 OpenClaw：**

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

`teams app create` 会提示你安装应用——请选择“Install in Teams”。如果你跳过了，可以稍后获取链接：

```bash
teams app get <teamsAppId> --install-link
```

**6. 验证一切正常**

```bash
teams app doctor <teamsAppId>
```

这会对机器人注册、AAD 应用配置、manifest 有效性和 SSO 设置执行诊断。

对于生产部署，请考虑使用 [联合身份验证](/channels/msteams#federated-authentication-certificate-plus-managed-identity)（证书或托管标识）而不是客户端密钥。

<Note>
群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许任意成员（默认仍需 mention 才能触发）。
</Note>

## 目标

- 通过 Teams DM、群聊或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终返回到它们接收自的频道。
- 默认采用安全的频道行为（除非另有配置，否则需要 mention）。

## 配置写入

默认情况下，Microsoft Teams 被允许写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

可通过以下方式禁用：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（DM + 群组）

**DM 访问**

- 默认值：`channels.msteams.dmPolicy = "pairing"`。未知发送者会被忽略，直到获批。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID。
- 不要依赖 UPN/显示名称匹配来做允许列表——它们可能会变化。OpenClaw 默认禁用直接名称匹配；如需启用，请显式设置 `channels.msteams.dangerouslyAllowNameMatching: true`。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认值：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则会被阻止）。当未设置时，可使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可以在群聊/频道中触发（回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 允许任意成员（默认仍需 mention 才能触发）。
- 如需允许**任何频道都不允许**，设置 `channels.msteams.groupPolicy: "disabled"`。

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

- 通过在 `channels.msteams.teams` 下列出团队和频道来限定群组/频道回复范围。
- 键应使用稳定的团队 ID 和频道会话 ID。
- 当 `groupPolicy="allowlist"` 且存在 Teams 允许列表时，只接受列出的团队/频道（仍需 mention 才能触发）。
- 配置向导接受 `Team/Channel` 条目并为你保存。
- 启动时，OpenClaw 会将团队/频道和用户允许列表名称解析为 ID（当 Graph 权限允许时）
  并记录映射；未解析的团队/频道名称会按原样保留，但默认会被忽略，不用于路由，除非启用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

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
<summary><strong>手动设置（不使用 Teams CLI）</strong></summary>

如果你无法使用 Teams CLI，也可以通过 Azure Portal 手动设置机器人。

### 工作原理

1. 确保 Microsoft Teams 插件可用（当前版本中已捆绑）。
2. 创建一个 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建一个引用该机器人并包含下面 RSC 权限的 **Teams app package**。
4. 将 Teams 应用上传/安装到某个团队（或用于 DM 的个人作用域）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams`，并启动网关。
6. 网关默认监听 `/api/messages` 上的 Bot Framework webhook 流量。

### 第 1 步：创建 Azure Bot

1. 前往 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **Basics** 选项卡：

   | 字段              | 值                                                     |
   | ----------------- | ------------------------------------------------------ |
   | **Bot handle**    | 你的机器人名称，例如 `openclaw-msteams`（必须唯一）     |
   | **Subscription**  | 选择你的 Azure 订阅                                    |
   | **Resource group** | 新建或使用现有                                         |
   | **Pricing tier**  | 开发/测试使用 **Free**                                 |
   | **Type of App**   | **Single Tenant**（推荐 - 见下方说明）                  |
   | **Creation type** | **Create new Microsoft App ID**                        |

<Warning>
新建多租户机器人在 2025-07-31 之后已被弃用。新机器人请使用 **Single Tenant**。
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

### 第 4 步：启用 Teams Channel

1. 在 Azure Bot → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

### 第 5 步：构建 Teams 应用 Manifest

- 包含一个 `bot` 条目，且 `botId = <App ID>`。
- Scopes：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人作用域文件处理所必需）。
- 添加 RSC 权限（见 [RSC 权限](#current-teams-rsc-permissions-manifest)）。
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

当插件可用且存在包含凭据的 `msteams` 配置时，Teams 渠道会自动启动。

</details>

## 联合身份验证（证书加托管标识）

> 于 2026.3.24 新增

对于生产部署，OpenClaw 支持 **联合身份验证** 作为比客户端密钥更安全的替代方案。可用两种方法：

### 选项 A：基于证书的身份验证

使用已注册到你的 Entra ID 应用注册中的 PEM 证书。

**设置：**

1. 生成或获取证书（PEM 格式，包含私钥）。
2. 在 Entra ID → App Registration → **Certificates & secrets** → **Certificates** → 上传公钥证书。

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

使用 Azure 托管标识进行无密码身份验证。这非常适合在 Azure 基础设施（AKS、App Service、Azure VM）上部署且可用托管标识的场景。

**工作原理：**

1. 机器人 pod/VM 具有一个托管标识（系统分配或用户分配）。
2. 一个 **联合身份凭据** 将该托管标识链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 端点（`169.254.169.254`）获取令牌。
4. 该令牌传递给 Teams SDK 用于机器人身份验证。

**前提条件：**

- 启用了托管标识的 Azure 基础设施（AKS workload identity、App Service、VM）
- 在 Entra ID 应用注册上创建了联合身份凭据
- pod/VM 可访问 IMDS（`169.254.169.254:80`）

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅用于用户分配）

### AKS Workload Identity 设置

对于使用 workload identity 的 AKS 部署：

1. 在你的 AKS 集群上**启用 workload identity**。
2. 在 Entra ID 应用注册上**创建联合身份凭据**：

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

4. 为 workload identity 注入给 pod 添加**标签**：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. 确保可访问 IMDS（`169.254.169.254`）——如果使用 NetworkPolicy，请添加允许到 `169.254.169.254/32` 的 80 端口出站规则。

### 身份验证类型对比

| 方法                | 配置                                          | 优点                               | 缺点                                 |
| ------------------- | --------------------------------------------- | ---------------------------------- | ------------------------------------ |
| **客户端密钥**     | `appPassword`                                 | 设置简单                          | 需要轮换密钥，安全性较低             |
| **证书**           | `authType: "federated"` + `certificatePath`   | 网络中无共享密钥                  | 需要管理证书                         |
| **托管标识**       | `authType: "federated"` + `useManagedIdentity`| 无密码，无需管理密钥              | 需要 Azure 基础设施                  |

**默认行为：** 当未设置 `authType` 时，OpenClaw 默认使用客户端密钥身份验证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。请使用持久化开发隧道，这样你的 URL 在各次会话之间保持不变：

```bash
# 一次性设置：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每次开发会话：
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（URL 可能在每次会话中变化）。

如果你的隧道 URL 发生变化，请更新端点：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## 测试 Bot

**运行诊断：**

```bash
teams app doctor <teamsAppId>
```

一次性检查 bot 注册、AAD 应用、manifest 和 SSO 配置。

**发送测试消息：**

1. 安装 Teams 应用（使用 `teams app get <id> --install-link` 返回的安装链接）
2. 在 Teams 中找到 bot 并发送 DM
3. 查看网关日志中的传入活动

## 环境变量

所有配置键也可以改为通过环境变量设置：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（可选：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（federated + certificate）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（可选，认证不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（federated + managed identity）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（仅限用户分配的 MI）

## 成员信息 action

OpenClaw 提供了一个由 Graph 支持的 `member-info` action，供 Microsoft Teams 使用，使 agents 和自动化能够直接从 Microsoft Graph 解析频道成员详情（显示名称、邮箱、角色）。

要求：

- `Member.Read.Group` RSC 权限（已包含在推荐的 manifest 中）
- 对于跨团队查询：`User.Read.All` Graph Application 权限，并授予管理员同意

该 action 由 `channels.msteams.actions.memberInfo` 控制（默认：当 Graph 凭据可用时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制会包装进 prompt 的最近频道/群组消息数量。
- 回退到 `messages.groupChat.historyLimit`。设置为 `0` 可禁用（默认 50）。
- 获取到的线程历史会根据发送者白名单（`allowFrom` / `groupAllowFrom`）过滤，因此线程上下文种子只包含来自允许发送者的消息。
- 引用附件上下文（从 Teams 回复 HTML 派生的 `ReplyTo*`）目前会按接收到的内容直接传递。
- 换句话说，白名单控制的是谁可以触发 agent；目前只有特定的补充上下文路径会被过滤。
- DM 历史可以通过 `channels.msteams.dmHistoryLimit`（用户轮次）限制。按用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限（manifest）

这些是我们 Teams app manifest 中**现有的 resourceSpecific 权限**。它们只适用于安装了该应用的团队/聊天中。

**用于频道（team 范围）：**

- `ChannelMessage.Read.Group`（Application）- 无需 @mention 即可接收所有频道消息
- `ChannelMessage.Send.Group`（Application）
- `Member.Read.Group`（Application）
- `Owner.Read.Group`（Application）
- `ChannelSettings.Read.Group`（Application）
- `TeamMember.Read.Group`（Application）
- `TeamSettings.Read.Group`（Application）

**用于群聊：**

- `ChatMessage.Read.Chat`（Application）- 无需 @mention 即可接收所有群聊消息

通过 Teams CLI 添加 RSC 权限：

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Teams manifest 示例（已脱敏）

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
  description: { short: "Teams 中的 OpenClaw", full: "Teams 中的 OpenClaw" },
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

### manifest 注意事项（必需字段）

- `bots[].botId` **必须**与 Azure Bot App ID 匹配。
- `webApplicationInfo.id` **必须**与 Azure Bot App ID 匹配。
- `bots[].scopes` 必须包含你计划使用的界面（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 是个人范围内处理文件所必需的。
- 如果你希望接收频道流量，`authorization.permissions.resourceSpecific` 必须包含 channel read/send。

### 更新现有应用

要更新一个已安装的 Teams 应用（例如添加 RSC 权限）：

```bash
# 下载、编辑并重新上传 manifest
teams app manifest download <teamsAppId> manifest.json
# 在本地编辑 manifest.json...
teams app manifest upload manifest.json <teamsAppId>
# 如果内容已更改，版本会自动递增
```

更新后，请在每个团队中重新安装应用以使新权限生效，并且**完全退出并重新启动 Teams**（不要只是关闭窗口）以清除缓存的应用元数据。

<details>
<summary>手动更新 manifest（不使用 CLI）</summary>

1. 使用新设置更新你的 `manifest.json`
2. **递增 `version` 字段**（例如 `1.0.0` → `1.1.0`）
3. **重新压缩**包含图标的 manifest（`manifest.json`、`outline.png`、`color.png`）
4. 上传新的 zip：
   - **Teams Admin Center：** Teams apps → Manage apps → 找到你的应用 → Upload new version
   - **旁加载：** 在 Teams 中 → Apps → Manage your apps → Upload a custom app

</details>

## 能力：仅 RSC vs Graph

### 仅使用 **Teams RSC**（已安装应用，无 Graph API 权限）

可用：

- 读取频道消息的 **文本** 内容。
- 发送频道消息的 **文本** 内容。
- 接收 **个人（DM）** 文件附件。

不可用：

- 频道/群组的 **图片或文件内容**（payload 仅包含 HTML 占位片段）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 读取消息历史（超出实时 webhook 事件之外）。

### 使用 **Teams RSC + Microsoft Graph Application 权限**

新增：

- 下载托管内容（粘贴到消息中的图片）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取频道/聊天消息历史。

### RSC vs Graph API

| 能力                    | RSC 权限            | Graph API                          |
| ----------------------- | ------------------- | ---------------------------------- |
| **实时消息**            | 是（通过 webhook）  | 否（仅轮询）                       |
| **历史消息**            | 否                  | 是（可以查询历史）                |
| **设置复杂度**          | 仅 app manifest     | 需要管理员同意 + token 流程        |
| **离线可用**            | 否（必须运行中）    | 是（可随时查询）                  |

**结论：** RSC 适合实时监听；Graph API 适合历史访问。如果你需要在离线期间补回错过的消息，则需要带有 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## 启用 Graph 的媒体 + 历史（频道必需）

如果你需要在 **频道** 中处理图片/文件，或者想要获取 **消息历史**，就必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID（Azure AD）**App Registration** 中添加 Microsoft Graph **Application permissions**：
   - `ChannelMessage.Read.All`（频道附件 + 历史）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）
2. 为该租户**授予管理员同意**。
3. 提升 Teams app **manifest 版本**，重新上传，并且**在 Teams 中重新安装应用**。
4. **完全退出并重新启动 Teams**，以清除缓存的应用元数据。

**用户提及的额外权限：** 对话中的用户 @mention 默认可直接使用。但是，如果你希望动态搜索并提及**不在当前对话中**的用户，请添加 `User.Read.All`（Application）权限并授予管理员同意。

## 已知限制

### webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理时间过长（例如 LLM 响应很慢），你可能会看到：

- 网关超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 通过快速返回并主动发送回复来处理这种情况，但非常慢的响应仍然可能引发问题。

### 格式

Teams markdown 比 Slack 或 Discord 更受限：

- 基本格式可用：**粗体**、_斜体_、`code`、链接
- 复杂 markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票和语义化展示发送（见下文）

## 配置

关键设置（共享频道模式见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用该频道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：bot 凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：DM 白名单（推荐使用 AAD object IDs）。当 Graph 访问可用时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：紧急开关，用于重新启用可变 UPN/display-name 匹配以及直接团队/频道名称路由。
- `channels.msteams.textChunkLimit`：外发文本分块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）拆分，再按长度分块。
- `channels.msteams.mediaAllowHosts`：入站附件主机白名单（默认 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`：在媒体重试时附加 Authorization 头的主机白名单（默认 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`：在频道/群组中要求 @mention（默认 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按团队覆盖。
- `channels.msteams.teams.<teamId>.tools`：团队级默认工具策略覆盖（`allow`/`deny`/`alsoAllow`），在缺少频道覆盖时使用。
- `channels.msteams.teams.<teamId>.toolsBySender`：团队级按发送者工具策略覆盖（支持 `*` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按频道按发送者工具策略覆盖（支持 `*` 通配符）。
- `toolsBySender` 键应使用明确前缀：
  `id:`、`e164:`、`username:`、`name:`（旧的无前缀键仍然只映射到 `id:`）。
- `channels.msteams.actions.memberInfo`：启用或禁用由 Graph 支持的成员信息 action（默认：当 Graph 凭据可用时启用）。
- `channels.msteams.authType`：认证类型 — `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件路径（federated + certificate 认证）。
- `channels.msteams.certificateThumbprint`：证书指纹（可选，认证不需要）。
- `channels.msteams.useManagedIdentity`：启用 managed identity 认证（federated 模式）。
- `channels.msteams.managedIdentityClientId`：用户分配的 managed identity 的 client ID。
- `channels.msteams.sharePointSiteId`：群聊/频道中文件上传所用的 SharePoint site ID（见 [在群聊中发送文件](#sending-files-in-group-chats)）。

## 路由与会话

- 会话键遵循标准代理格式（参见 [/concepts/session](/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群组消息使用会话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：threads 与 posts

Teams 最近在相同的底层数据模型之上引入了两种频道 UI 样式：

| 样式                    | 描述                                               | 推荐的 `replyStyle` |
| ----------------------- | -------------------------------------------------- | ------------------- |
| **Posts**（经典）       | 消息以卡片形式显示，回复线程位于下方               | `thread`（默认）    |
| **Threads**（类似 Slack） | 消息线性流动，更像 Slack                          | `top-level`         |

**问题在于：** Teams API 不会暴露频道使用的是哪种 UI 样式。如果你使用了错误的 `replyStyle`：

- Threads 风格频道中的 `thread` → 回复会以嵌套方式显示，显得别扭
- Posts 风格频道中的 `top-level` → 回复会作为单独的顶层帖子显示，而不是在同一线程中

**解决方案：** 根据频道的配置方式，按频道单独配置 `replyStyle`：

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

- **DM：** 图片和文件附件通过 Teams bot 文件 API 正常工作。
- **频道/群组：** 附件存储在 M365 存储中（SharePoint/OneDrive）。Webhook 负载只包含一个 HTML 占位片段，而不是实际的文件字节。**下载频道附件需要 Graph API 权限**。
- 对于明确的先文件后消息发送方式，使用 `action=upload-file` 搭配 `media` / `filePath` / `path`；可选的 `message` 会成为附带文本/评论，而 `filename` 会覆盖上传时的文件名。

如果没有 Graph 权限，带图片的频道消息会被接收为纯文本（bot 无法访问图片内容）。
默认情况下，OpenClaw 只会从 Microsoft/Teams 主机名下载媒体。可通过 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任意主机）。
只有在 `channels.msteams.mediaAuthAllowHosts` 中的主机才会附加授权头（默认包含 Graph + Bot Framework 主机）。请保持此列表严格（避免使用多租户后缀）。

## 在群聊中发送文件

Bot 可以通过 FileConsentCard 流程（内置）在 DM 中发送文件。不过，**在群聊/频道中发送文件** 需要额外配置：

| 场景                    | 文件发送方式                           | 需要的配置                              |
| ----------------------- | -------------------------------------- | --------------------------------------- |
| **DM**                  | FileConsentCard → 用户同意 → bot 上传   | 开箱即用                                |
| **群聊/频道**           | 上传到 SharePoint → 分享链接            | 需要 `sharePointSiteId` + Graph 权限    |
| **图片（任何场景）**    | Base64 编码内联                        | 开箱即用                                |

### 为什么群聊需要 SharePoint

Bot 没有个人 OneDrive（`/me/drive` Graph API 端点对应用身份无效）。要在群聊/频道中发送文件，bot 会把文件上传到一个 **SharePoint 网站** 并创建一个分享链接。

### 配置步骤

1. **在 Entra ID（Azure AD）→ 应用注册中添加 Graph API 权限：**
   - `Sites.ReadWrite.All`（应用程序）- 将文件上传到 SharePoint
   - `Chat.Read.All`（应用程序）- 可选，启用按用户共享链接

2. **为租户授予管理员同意。**

3. **获取你的 SharePoint 网站 ID：**

   ```bash
   # 通过 Graph Explorer 或带有效 token 的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：对于位于 "contoso.sharepoint.com/sites/BotFiles" 的站点
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应中包含："id": "contoso.sharepoint.com,guid1,guid2"
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

### 共享行为

| 权限                                   | 共享行为                                           |
| -------------------------------------- | -------------------------------------------------- |
| 仅 `Sites.ReadWrite.All`               | 组织范围共享链接（组织内任何人都可访问）            |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户共享链接（只有聊天成员可访问）                |

按用户共享更安全，因为只有聊天参与者可以访问该文件。如果缺少 `Chat.Read.All` 权限，bot 会回退到组织范围共享。

### 回退行为

| 场景                                             | 结果                                               |
| ------------------------------------------------ | -------------------------------------------------- |
| 群聊 + 文件 + 已配置 `sharePointSiteId`          | 上传到 SharePoint，发送共享链接                     |
| 群聊 + 文件 + 未配置 `sharePointSiteId`          | 尝试 OneDrive 上传（可能失败），仅发送文本           |
| 私人聊天 + 文件                                   | FileConsentCard 流程（无需 SharePoint）             |
| 任意场景 + 图片                                   | Base64 编码内联（无需 SharePoint）                  |

### 文件存储位置

上传的文件会存储在所配置 SharePoint 网站默认文档库中的 `/OpenClawShared/` 文件夹里。

## 投票（自适应卡片）

OpenClaw 会将 Teams 投票作为自适应卡片发送（Teams 没有原生投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 票数由网关记录到 `~/.openclaw/msteams-polls.json`。
- 网关必须保持在线才能记录投票。
- 投票目前不会自动发布结果摘要（如有需要请检查存储文件）。

## 展示卡片

使用 `message` 工具或 CLI 向 Teams 用户或对话发送语义化展示载荷。OpenClaw 会基于通用展示契约，将其渲染为 Teams 自适应卡片。

`presentation` 参数接受语义块。当提供 `presentation` 时，消息文本是可选的。

**代理工具：**

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

**CLI：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好！"}]}'
```

有关目标格式的详细信息，请参见下方的 [目标格式](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和对话：

| 目标类型            | 格式                             | 示例                                               |
| ------------------ | -------------------------------- | -------------------------------------------------- |
| 用户（按 ID）       | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| 用户（按名称）     | `user:<display-name>`            | `user:John Smith`（需要 Graph API）                |
| 群组/频道           | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| 群组/频道（原始）   | `<conversation-id>`              | `19:abc123...@thread.tacv2`（如果包含 `@thread`）   |

**CLI 示例：**

```bash
# 按 ID 向用户发送
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "你好"

# 按显示名称向用户发送（触发 Graph API 查找）
openclaw message send --channel msteams --target "user:John Smith" --message "你好"

# 向群聊或频道发送
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "你好"

# 向对话发送展示卡片
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好"}]}'
```

**代理工具示例：**

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
如果没有 `user:` 前缀，名称默认会按群组或团队解析。按显示名称定位人时，请始终使用 `user:`。
</Note>

## 主动消息

- 只有在用户先进行过交互之后，才可以发送主动消息，因为我们会在那时存储会话引用。
- 有关 `dmPolicy` 和允许列表门控，请参见 `/gateway/configuration`。

## 团队和频道 ID（常见误区）

Teams URL 中的 `groupId` 查询参数**不是**用于配置的团队 ID。请改为从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    团队 ID（对其进行 URL 解码）
```

**频道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      频道 ID（对其进行 URL 解码）
```

**用于配置：**

- 团队 ID = `/team/` 之后的路径段（URL 解码后，例如 `19:Bk4j...@thread.tacv2`）
- 频道 ID = `/channel/` 之后的路径段（URL 解码后）
- **忽略** `groupId` 查询参数

## 私有频道

机器人在私有频道中的支持有限：

| 功能                         | 标准频道            | 私有频道              |
| ---------------------------- | ------------------- | --------------------- |
| 机器人安装                  | 是                  | 有限                  |
| 实时消息（webhook）         | 是                  | 可能不起作用          |
| RSC 权限                    | 是                  | 行为可能不同          |
| @提及                       | 是                  | 如果机器人可访问       |
| Graph API 历史记录         | 是                  | 是（需权限）           |

**如果私有频道不起作用，可采用以下变通方案：**

1. 使用标准频道进行机器人交互
2. 使用私信 - 用户始终可以直接向机器人发送消息
3. 使用 Graph API 访问历史记录（需要 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道中图片未显示：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **频道中没有响应：** 默认需要提及；设置 `channels.msteams.requireMention=false`，或按团队/频道单独配置。
- **版本不匹配（Teams 仍显示旧 manifest）：** 删除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 Unauthorized：** 在没有 Azure JWT 的情况下手动测试时，这是预期现象——表示端点可达，但认证失败。请使用 Azure Web Chat 正确测试。

### Manifest 上传错误

- **"Icon file cannot be empty"：** manifest 引用了大小为 0 字节的图标文件。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **"webApplicationInfo.Id already in use"：** 该应用仍安装在其他团队/聊天中。请先查找并卸载它，或者等待 5-10 分钟让更改传播。
- **上传时出现 "Something went wrong"：** 改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器 DevTools（F12）→ Network 选项卡，检查响应体中的实际错误。
- **侧载失败：** 尝试使用“将应用上传到你所在组织的应用目录”而不是“上传自定义应用”——这通常可以绕过侧载限制。

### RSC 权限不起作用

1. 确认 `webApplicationInfo.id` 与你的机器人 App ID 完全一致
2. 重新上传应用，并在团队/聊天中重新安装
3. 检查你的组织管理员是否阻止了 RSC 权限
4. 确认你使用的是正确的作用域：团队使用 `ChannelMessage.Read.Group`，群聊使用 `ChatMessage.Read.Chat`

## 参考资料

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams 开发者门户](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams 应用 manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 机器人文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群组需要 Graph）
- [主动消息发送](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于机器人管理的 Teams CLI

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — 私信认证与配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型与加固