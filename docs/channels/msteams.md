---
summary: "Microsoft Teams 机器人支持状态、能力和配置"
read_when:
  - 处理 Microsoft Teams 频道功能时
title: "Microsoft Teams"
---

状态：支持文本和私信附件；频道/群组文件发送需要 `sharePointSiteId` + Graph 权限（参见 [在群聊中发送文件](#sending-files-in-group-chats)）。投票通过自适应卡片发送。消息操作显式提供 `upload-file`，用于先发送文件后发送消息的场景。

## 捆绑插件

Microsoft Teams 在当前 OpenClaw 版本中作为捆绑插件提供；在正常的打包发行版中，无需单独安装。

如果你使用的是较旧的版本，或者是未包含捆绑 Teams 的自定义安装，请直接安装 npm 包：

```bash
openclaw plugins install @openclaw/msteams
```

使用裸包以跟随当前官方发布标签。仅当需要可复现的安装时，才固定到确切版本。

本地检出（从 git 仓库中运行）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详情：[插件](/tools/plugin)。

## 快速设置

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 可通过一条命令处理机器人注册、清单创建和凭据生成。

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

如有需要，请安装并验证 devtunnel CLI（[入门指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# 一次性设置（跨会话保持固定 URL）：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每个开发会话：
devtunnel host my-openclaw-bot
# 你的端点：https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>
`--allow-anonymous` 是必需的，因为 Teams 无法对 devtunnels 进行身份验证。每个传入的机器人请求仍会由 Teams SDK 验证。
</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（URL 可能会在每次会话中发生变化）。

**3. 创建应用**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

这会创建一个 Entra ID（Azure AD）应用，生成客户端密钥，构建并上传 Teams 应用清单（包含图标），并注册一个由 Teams 管理的机器人（无需 Azure 订阅）。输出中包括 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 和一个 **Teams App ID**；它还会提示你直接在 Teams 中安装该应用。

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

`teams app create` 会提示你安装该应用；请选择“Install in Teams”。如需稍后获取安装链接：

```bash
teams app get <teamsAppId> --install-link
```

**6. 验证一切正常**

```bash
teams app doctor <teamsAppId>
```

会对机器人注册、AAD 应用配置、清单有效性和 SSO 设置执行诊断。

用于生产环境时，建议使用 [联合身份验证](#federated-authentication-certificate-plus-managed-identity)（证书或托管身份）替代客户端密钥。

<Note>
群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许任何成员（默认仍需提及）。
</Note>

## 目标

- 通过 Teams 私信、群聊或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终回到它们进入时所在的频道。
- 默认采用安全的频道行为（除非另有配置，否则需要提及）。

## 配置写入

默认情况下，Microsoft Teams 可以写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

可以通过以下设置禁用此功能：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（DM + 群组）

**DM 访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者在获批前会被忽略。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID 或静态发送者访问组，例如 `accessGroup:core-team`。
- 不要依赖 UPN/显示名称匹配来做允许列表；它们可能会变化。OpenClaw 默认禁用直接名称匹配；如需启用，请设置 `channels.msteams.dangerouslyAllowNameMatching: true`。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则会被阻止）。当未设置 `channels.msteams.groupPolicy` 时，`channels.defaults.groupPolicy` 可以覆盖共享默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者、静态发送者访问组或群组/频道会话 ID 可以在群聊/频道中触发（回退到 `channels.msteams.allowFrom`）。会话 ID 可以使用 `19:...@thread.tacv2`、`19:...@thread.v2` 或 `19:...@thread.skype`；请保留 ID 的精确大小写。OpenClaw 会忽略 `;messageid=...` 后缀。会话 ID 永远不会授予个人 DM 访问权限。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认仍需通过提及触发）。
- 若要阻止**所有**频道，请设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000", "accessGroup:core-team"],
    },
  },
}
```

**团队 + 频道允许列表**

- 通过在 `channels.msteams.teams` 下列出团队和频道，限定群组/频道回复的范围。
- 使用 Teams 链接中的稳定 Teams 会话 ID 作为键，而不是可变的显示名称（参见[团队和频道 ID](#team-and-channel-ids-common-gotcha)）。
- 当 `groupPolicy="allowlist"` 且存在团队允许列表时，只有列出的团队/频道会被接受（需要提及才能触发）。
- `groupAllowFrom` 授权群组发送者，而不是授权通过委托 Graph 读取其他频道。如果现有配置仅设置了 `groupAllowFrom`，请保留默认的 `groupPolicy: "allowlist"`，并在 `channels.msteams.teams.<team>.channels` 下配置目标。
- 另外，也可以有意将 `groupPolicy: "open"` 设置为允许更广泛的委托读取。这同样会允许**任何群组发送者**（默认仍需提及才能触发），因此其限制性低于限定范围的团队/频道路由。
- 直接操作员读取以及当前会话中的读取不需要额外的团队/频道路由。
- 配置向导接受 `Team/Channel` 条目，并会为你保存这些条目。
- 启动时，OpenClaw 会将团队/频道和用户允许列表中的名称解析为 ID（当 Graph 权限允许时），并记录映射关系。无法解析的名称会按输入内容保留，但在路由时会被忽略，除非设置了 `channels.msteams.dangerouslyAllowNameMatching: true`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000"],
      teams: {
        "19:team-id@thread.tacv2": {
          channels: {
            "19:channel-id@thread.tacv2": { requireMention: true },
          },
        },
      },
    },
  },
}
```

<details>
<summary><strong>手动设置（无需 Teams CLI）</strong></summary>

### 工作原理

1. 确保 Microsoft Teams 插件可用（当前版本已内置）。
2. 创建一个 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建一个引用该 bot 的 **Teams 应用包**，并包含下面的 RSC 权限。
4. 将 Teams 应用上传/安装到某个团队中（如果是 DM，则安装到个人作用域）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams`，然后启动网关。
6. 网关默认在 `/api/messages` 上监听 Bot Framework 的 webhook 流量。

### 第 1 步：创建 Azure Bot

1. 前往[创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **基础信息** 选项卡：

   | 字段               | 值                                                       |
   | ------------------ | -------------------------------------------------------- |
   | **机器人句柄**     | 你的机器人名称，例如 `openclaw-msteams`（必须唯一）      |
   | **订阅**           | 选择你的 Azure 订阅                                      |
   | **资源组**         | 新建或使用现有                                            |
   | **定价层**         | 开发/测试使用 **免费**                                   |
   | **应用类型**       | **单租户**（推荐；见下方说明）                            |
   | **创建类型**       | **创建新的 Microsoft 应用 ID**                           |

<Warning>
新多租户机器人的创建在 2025-07-31 之后已被弃用。新机器人请使用 **单租户**。
</Warning>

3. 点击 **检查 + 创建**，然后点击 **创建**（约 1-2 分钟）。

### 第 2 步：获取凭据

1. Azure Bot 资源 → **配置** → 复制 **Microsoft 应用 ID**（即你的 `appId`）。
2. **管理密码** → 应用注册 → **证书和机密** → **新建客户端机密** → 复制 **值**（即你的 `appPassword`）。
3. **概览** → 复制 **目录（租户）ID**（即你的 `tenantId`）。

### 第 3 步：配置消息端点

1. Azure Bot → **配置**。
2. 设置 **消息传递端点**：
   - 生产环境：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（参见[本地开发](#local-development-tunneling)）

### 第 4 步：启用 Teams 通道

1. Azure Bot → **频道**。
2. 点击 **Microsoft Teams** → **配置** → **保存**。
3. 接受服务条款。

### 第 5 步：构建 Teams 应用清单

- 包含一个 `bot` 条目，并设置 `botId = <App ID>`。
- 作用域：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人作用域文件处理所必需）。
- 添加 RSC 权限（参见[当前 Teams RSC 权限](#current-teams-rsc-permissions-manifest)）。
- 创建图标：`outline.png`（32x32）和 `color.png`（192x192）。
- 将 `manifest.json`、`outline.png` 和 `color.png` 一起打包成 zip。

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

当插件可用且 `msteams` 配置包含凭据时，Teams 通道会自动启动。

</details>

## 联邦认证（证书 + 托管标识）

对于生产环境，OpenClaw 通过 `channels.msteams.authType: "federated"` 支持**联邦认证**，作为客户端密钥的替代方案。两种方法：

### 选项 A：基于证书的认证

使用与你的 Entra ID 应用注册关联的 PEM 证书。

**设置：**

1. 生成或获取证书（包含私钥的 PEM 格式）。
2. Entra ID → 应用注册 → **证书和密码** → **证书** → 上传公钥证书。

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

在 Azure 基础设施（AKS、App Service、Azure VM）上使用 Azure 托管标识进行无密码认证。

**工作原理：**

1. bot pod/VM 具有托管标识（系统分配或用户分配）。
2. 联邦身份凭据将托管标识链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 端点获取令牌。
4. 该令牌会传递给 Teams SDK，用于 bot 认证。

**前置条件：**

- 启用了托管标识的 Azure 基础设施（AKS 工作负载标识、App Service、VM）。
- 已在 Entra ID 应用注册上创建联邦身份凭据。
- 从 pod/VM 到 IMDS（`169.254.169.254:80`）的网络访问。

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

**配置（用户分配托管标识）：** 在上面的配置块中添加 `managedIdentityClientId: "<MI_CLIENT_ID>"`。

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅用户分配时）

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

5. **允许网络访问** IMDS（`169.254.169.254`）：如果使用 NetworkPolicy，请为端口 80 上的 `169.254.169.254/32` 添加一条 egress 规则。

### 认证类型对比

| 方式                 | 配置                                           | 优点                               | 缺点                                   |
| -------------------- | ---------------------------------------------- | ---------------------------------- | -------------------------------------- |
| **客户端密钥**        | `appPassword`                                  | 设置简单                           | 需要轮换密钥，安全性较低                |
| **证书**              | `authType: "federated"` + `certificatePath`    | 网络中不传共享密钥                 | 需要管理证书                          |
| **托管标识**          | `authType: "federated"` + `useManagedIdentity` | 无密码，不需要管理密钥             | 需要 Azure 基础设施                    |

`certificateThumbprint` 可以与 `certificatePath` 一起设置，但目前认证路径不会读取它；它仅为向前兼容而接受。

**默认值：** 当未设置 `authType` 时，OpenClaw 使用客户端密钥认证（`appPassword`）。现有配置将保持不变，继续正常工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。请使用持久化开发隧道，以便 URL 在各次会话之间保持稳定：

```bash
# 一次性设置：
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# 每次开发会话：
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（每次会话的 URL 可能会变化）。

如果隧道 URL 发生变化，请更新端点：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## 测试机器人

**运行诊断：**

```bash
teams app doctor <teamsAppId>
```

一次性检查机器人注册、AAD 应用、清单和 SSO 配置。

**发送测试消息：**

1. 安装 Teams 应用（从 `teams app get <id> --install-link` 获取安装链接）。
2. 在 Teams 中找到该机器人并发送一条私信。
3. 检查网关日志中是否有传入活动。

## 环境变量

这些与身份验证相关的配置键可以通过环境变量设置，而不是通过 `openclaw.json`（其他配置键，例如 `groupPolicy` 或 `historyLimit`，只能通过配置文件设置）：

| 环境变量                               | 配置键                    | 说明                               |
| ------------------------------------ | ------------------------- | ----------------------------------- |
| `MSTEAMS_APP_ID`                     | `appId`                   |                                     |
| `MSTEAMS_APP_PASSWORD`               | `appPassword`             |                                     |
| `MSTEAMS_TENANT_ID`                  | `tenantId`                |                                     |
| `MSTEAMS_AUTH_TYPE`                  | `authType`                | `"secret"` 或 `"federated"`         |
| `MSTEAMS_CERTIFICATE_PATH`           | `certificatePath`         | 联合身份验证 + 证书 |
| `MSTEAMS_CERTIFICATE_THUMBPRINT`     | `certificateThumbprint`   | 可接受，但不是身份验证所必需 |
| `MSTEAMS_USE_MANAGED_IDENTITY`       | `useManagedIdentity`      | 联合身份验证 + 托管身份 |
| `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` | `managedIdentityClientId` | 仅限用户分配的托管身份 |

## 成员信息操作

OpenClaw 为 Microsoft Teams 提供了一个基于 Graph 的 `member-info` 操作，使代理和自动化能够解析已配置会话的已验证成员名单详情。

要求：

- `ChannelSettings.Read.Group` 和 `TeamMember.Read.Group` RSC 权限（已包含在推荐的清单中）。

只要配置了 Graph 凭据，该操作即可使用；不存在单独的 `channels.msteams.actions.memberInfo` 开关。  
标准频道查询会返回匹配的团队成员身份、显示名称、电子邮件和角色。  
在当前 DM 或群聊中，该操作可以返回受信任发送者的稳定用户 ID。  
私有/共享频道以及非当前聊天成员的查询需要额外的成员名单权限，  
并且会被默认权限基线拒绝。

## 历史上下文

- `channels.msteams.historyLimit` 控制有多少最近的频道/群组消息会被封装到提示中。若未设置，则回退到 `messages.groupChat.historyLimit`，再默认值为 50。设为 `0` 可禁用。
- 获取的线程历史会根据发送者允许列表（`allowFrom` / `groupAllowFrom`）进行过滤，因此线程上下文种子只包含来自允许发送者的消息。
- 引用的附件上下文（从回复自身附件中的 Skype Reply-schema HTML 解析得到）会不经筛选直接传递；目前只有线程历史种子应用了发送者允许列表过滤。
- DM 历史可通过 `channels.msteams.dmHistoryLimit`（用户回合）进行限制。按用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限（清单）

这些是我们 Teams 应用清单中**现有的 resourceSpecific 权限**。它们仅适用于安装应用的团队/聊天范围内。

**适用于频道（团队范围）：**

- `ChannelMessage.Read.Group`（Application）- 无需 @提及即可接收所有频道消息
- `ChannelMessage.Send.Group`（Application）
- `Member.Read.Group`（Application）
- `Owner.Read.Group`（Application）
- `ChannelSettings.Read.Group`（Application）
- `TeamMember.Read.Group`（Application）
- `TeamSettings.Read.Group`（Application）

**适用于群聊：**

- `ChatMessage.Read.Chat`（Application）- 无需 @提及即可接收所有群聊消息

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
    name: "你的组织",
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

### 清单注意事项（必需字段）

- `bots[].botId` **必须** 与 Azure Bot App ID 匹配。
- `webApplicationInfo.id` **必须** 与 Azure Bot App ID 匹配。
- `bots[].scopes` 必须包含你计划使用的范围（`personal`、`team`、`groupChat`）。
- 在个人范围内进行文件处理时，需要 `bots[].supportsFiles: true`。
- `authorization.permissions.resourceSpecific` 必须包含用于频道流量的频道读取/发送权限。

### 更新现有应用

```bash
# 下载、编辑并重新上传清单
teams app manifest download <teamsAppId> manifest.json
# 在本地编辑 manifest.json...
teams app manifest upload manifest.json <teamsAppId>
# 如果内容发生变化，版本会自动提升
```

更新后，请在每个团队中重新安装该应用，并且**完全退出并重新启动 Teams**（而不只是关闭窗口），以清除缓存的应用元数据。

<details>
<summary>手动更新清单（不使用 CLI）</summary>

1. 使用新的设置更新 `manifest.json`。
2. **递增 `version` 字段**（例如，`1.0.0` → `1.1.0`）。
3. **重新压缩**清单及图标（`manifest.json`、`outline.png`、`color.png`）。
4. 上传新的 zip：
   - **Teams 管理中心：** Teams 应用 → 管理应用 → 找到你的应用 → 上传新版本。
   - **旁加载：** Teams → 应用 → 管理你的应用 → 上传自定义应用。

</details>

## 功能：仅 RSC 与 Graph 对比

### 使用 **Teams 仅 RSC**（已安装应用，无 Graph API 权限）

可用：

- 读取频道消息的 **文本** 内容。
- 发送频道消息的 **文本** 内容。
- 接收 **个人（DM）** 文件附件。

不可用：

- 频道/群组 **图片或文件内容**（有效负载中仅包含一个 HTML 占位符）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 读取超出实时 webhook 事件之外的消息历史记录。

### 使用 **Teams RSC + Microsoft Graph 应用程序权限**

新增：

- 下载托管内容（粘贴到消息中的图片）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取频道/聊天消息历史记录。

### RSC 与 Graph API 对比

| 功能                     | RSC 权限             | Graph API                           |
| ------------------------ | -------------------- | ----------------------------------- |
| **实时消息**             | 是（通过 webhook）   | 否（仅轮询）                        |
| **历史消息**             | 否                   | 是（可以查询历史记录）              |
| **设置复杂度**           | 仅需应用清单         | 需要管理员同意 + token 流程         |
| **离线可用**             | 否（必须运行中）     | 是（可随时查询）                    |

**结论：** RSC 用于实时监听；Graph API 用于历史访问。若要在离线期间补取错过的消息，你需要带有 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## 启用 Graph 的媒体 + 历史记录

仅启用 Teams 范围和你所使用数据所需的 Microsoft Graph 应用程序权限：

1. Entra ID（Azure AD）**应用注册** → 添加 Graph **应用程序权限**：
   - `ChannelMessage.Read.All` 用于频道附件和频道历史记录。
   - `Chat.Read.All` 用于群聊附件和群聊历史记录。
   - 当附件字节必须从 SharePoint/OneDrive 存储中下载时使用 `Files.Read.All`；仅历史记录的配置不需要它。
2. 为租户**授予管理员同意**。
3. 提升 Teams 应用 **manifest 版本**，重新上传，并**在 Teams 中重新安装该应用**。
4. **完全退出并重新启动 Teams**，以清除缓存的应用元数据。

### 频道/群组文件恢复（`graphMediaFallback`）

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

**用户提及：** 对于已经在会话中的用户，@mention 可开箱即用。若要动态搜索并提及**不在当前会话中的**用户，请添加 `User.Read.All`（应用程序）权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。OpenClaw 对该 webhook 监听器应用固定的 HTTP 服务器超时：30 秒无活动、30 秒总请求时间，以及 15 秒接收头部。可选的入站媒体和上下文增强共享 10 秒预算。SDK 在原始 activity 被持久追加后返回；agent turn 独立处理并主动回复。如果请求处理或持久接收未在传输窗口内完成，Teams 可能会重试该 activity，而 ingress tombstone 会拒绝重复的 event ID。

### Teams 云环境和 service URL 支持

此 SDK 支持的 Teams 路径已针对 Microsoft Teams 公有云进行在线验证。

入站回复使用传入的 Teams SDK turn context。上下文外的主动操作——发送、编辑、删除、卡片、投票、文件同意消息，以及排队的长时间运行回复——使用已存储的会话引用 `serviceUrl`。公有云默认使用 Teams SDK 公有云环境，并允许在公有 Teams Connector 主机上存储引用：`https://smba.trafficmanager.net/`。

公有云是默认配置。对于正常的公有云机器人，你无需设置 `channels.msteams.cloud` 或 `channels.msteams.serviceUrl`。

对于非公有 Teams 云环境，请在 Microsoft 发布后设置 `cloud` 以及相应的主动边界：

- `channels.msteams.cloud` 选择用于身份验证、JWT 验证、令牌服务和 Graph 范围的 Teams SDK 云预设。
- `channels.msteams.serviceUrl` 选择用于在主动发送、编辑、删除、卡片、投票、文件同意消息以及排队的长时间运行回复之前验证已存储会话引用的 Bot Connector 端点边界。对于 USGov 和 DoD SDK 云，这是必需的。对于 China/21Vianet，OpenClaw 使用 SDK 的 `China` 预设，并且仅接受 Azure China Bot Framework channel 主机上的存储/配置的 service URL。

Microsoft 在 Teams 主动消息文档的 [创建会话](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) 部分发布了全局主动 Bot Connector 端点。优先使用传入活动的 `serviceUrl`（如果可用）；否则使用下表中的 Microsoft 值。

| Teams 环境 | OpenClaw 配置                                             | 主动 `serviceUrl`                                 |
| ---------- | --------------------------------------------------------- | -------------------------------------------------- |
| 公有       | 无需 cloud/serviceUrl 配置                                | `https://smba.trafficmanager.net/teams`            |
| GCC        | 设置 `serviceUrl`；不存在单独的 Teams SDK 云预设          | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC High   | `cloud: "USGov"` + `serviceUrl`                           | `https://smba.infra.gov.teams.microsoft.us/teams` |
| DoD        | `cloud: "USGovDoD"` + `serviceUrl`                        | `https://smba.infra.dod.teams.microsoft.us/teams` |
| China/21Vianet | `cloud: "China"`                                      | 使用传入活动的 `serviceUrl`                         |

GCC 的示例，其中 Microsoft 文档提供了单独的主动 service URL，但 Teams SDK 不暴露单独的 GCC 云预设：

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

GCC High 的示例：

```json
{
  "channels": {
    "msteams": {
      "cloud": "USGov",
      "serviceUrl": "https://smba.infra.gov.teams.microsoft.us/teams"
    }
  }
}
```

`channels.msteams.serviceUrl` 仅限于受支持的 Microsoft Teams Bot Connector 主机。当配置了 service URL 时，OpenClaw 会在主动发送、编辑、删除、卡片、投票或排队的长时间运行回复执行前，检查已存储会话的 `serviceUrl` 是否使用相同的主机。采用默认的公有云配置时，如果存储的会话指向公有 Teams Connector 主机之外，OpenClaw 会以关闭式失败。更改 cloud/service URL 设置后，请从该会话接收一条新消息，以便更新存储的会话引用。

China/21Vianet 在 Microsoft 的 Teams 主动端点表中没有单独的全局主动 `smba` URL。配置 `cloud: "China"`，以便 Teams SDK 使用 Azure China 的身份验证、令牌和 JWT 端点。随后，主动发送需要来自传入 China Teams 活动的已存储会话引用，或者在 Azure China Bot Framework channel 边界（`*.botframework.azure.cn`）上显式配置的 service URL。对于 `cloud: "China"`，基于 Graph 的 Teams 辅助功能会被禁用，直到 OpenClaw 将 Graph 请求路由到 Azure China Graph 端点为止。

### 格式

Teams 的 markdown 比 Slack 或 Discord 更受限制：

- 基本格式可用：**粗体**、_斜体_、`代码`、链接。
- 复杂 markdown（表格、嵌套列表）可能无法正确渲染。
- 自适应卡片支持投票和语义展示发送（见下文）。

## 配置

关键设置（共享通道模式请参见 [/gateway/configuration](/gateway/configuration)）：

- `channels.msteams.enabled`：启用/禁用该通道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.cloud`：Teams SDK 云环境（`Public`、`USGov`、`USGovDoD` 或 `China`；默认 `Public`）。对于 USGov/DoD SDK 云环境，请与 `serviceUrl` 一起设置；China 使用 SDK 预设和已存储的 Azure China Bot Framework 会话引用，并禁用基于 Graph 的辅助功能，直到 Azure China Graph 路由上线。
- `channels.msteams.serviceUrl`：用于 SDK 主动操作的 Bot Connector 服务 URL 边界。公有云使用 SDK 默认值；用于 GCC（`https://smba.infra.gcc.teams.microsoft.com/teams`）、GCC High 或 DoD 时请设置。China 在存储的会话引用来自 21Vianet 运营的 Teams 时，接受 Azure China Bot Framework 通道主机。
- `channels.msteams.webhook.port`（默认 `3978`）。
- `channels.msteams.webhook.path`（默认 `/api/messages`）。
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认 `pairing`）。
- `channels.msteams.allowFrom`：私信允许列表（推荐使用 AAD 对象 ID）。在具备 Graph 访问权限时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：紧急开关，用于重新启用可变的 UPN/显示名称匹配以及直接的团队/频道名称路由。
- `channels.msteams.textChunkLimit`：发出文本分块的字符数上限（默认 `4000`，且无论配置更高值都硬性上限为 `4000`）。
- `channels.msteams.streaming.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）拆分，再按长度分块。
- `channels.msteams.mediaAllowHosts`：入站附件主机的允许列表（默认 Microsoft/Teams 域名：Graph、SharePoint/OneDrive、Teams CDN、Bot Framework、Azure Media Services）。
- `channels.msteams.mediaAuthAllowHosts`：在媒体重试时附加 Authorization 标头的允许列表（默认 Graph + Bot Framework 主机）。
- `channels.msteams.graphMediaFallback`：当频道/组 HTML 省略文件标记时，启用 Graph 消息查找（默认 `false`；参见 [频道/组文件恢复](#channelgroup-file-recovery-graphmediafallback)）。
- `channels.msteams.mediaMaxMb`：按通道覆盖媒体大小限制，单位为 MB。未设置时回退到 `agents.defaults.mediaMaxMb`。
- `channels.msteams.requireMention`：在频道/组中要求 @提及（默认 `true`）。
- `channels.msteams.replyStyle`：`thread | top-level`（参见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按团队覆盖。
- `channels.msteams.teams.<teamId>.tools`：默认的按团队工具策略覆盖（`allow`/`deny`/`alsoAllow`），在缺少频道覆盖时使用。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的按团队按发送者工具策略覆盖（支持 `*` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按频道按发送者工具策略覆盖（支持 `*` 通配符）。
- `toolsBySender` 键应使用显式前缀：`channel:`、`id:`、`e164:`、`username:`、`name:`（旧的无前缀键仍然仅映射到 `id:`）。
- `channels.msteams.authType`：身份验证类型 - `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件路径（联合 + 证书认证）。
- `channels.msteams.certificateThumbprint`：证书指纹；可接受，但认证不要求。
- `channels.msteams.useManagedIdentity`：启用托管标识认证（联合模式）。
- `channels.msteams.managedIdentityClientId`：用户分配托管标识的客户端 ID。
- `channels.msteams.sharePointSiteId`：用于群聊/频道中文件上传的 SharePoint 站点 ID（参见 [在群聊中发送文件](#sending-files-in-group-chats)）。
- `channels.msteams.welcomeCard`、`channels.msteams.groupWelcomeCard`、`channels.msteams.promptStarters`：首次私信/群组联系时显示的欢迎 Adaptive Card，以及其建议的提示按钮。
- `channels.msteams.responsePrefix`：添加到外发回复前的文本前缀。
- `channels.msteams.feedbackEnabled`（默认 `true`）、`channels.msteams.feedbackReflection`（默认 `true`）、`channels.msteams.feedbackReflectionCooldownMs`：对回复进行点赞/点踩反馈，以及负面反馈后的反思跟进。
- `channels.msteams.sso`、`channels.msteams.delegatedAuth`：用于基于 SSO 流程的 Bot Framework OAuth 连接和委托的 Graph 作用域；`sso.enabled: true` 需要 `sso.connectionName`。

## 路由与会话

- 会话键遵循标准代理格式（参见 [/concepts/session](/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群组消息使用会话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：Threads 与 Posts

Teams 在同一底层数据模型上有两种频道 UI 样式：

| 样式                     | 描述                                                   | 推荐的 `replyStyle` |
| ------------------------ | ------------------------------------------------------ | ------------------ |
| **Posts**（经典）        | 消息以卡片形式显示，下面带有线程回复                    | `thread`（默认）   |
| **Threads**（类似 Slack）| 消息线性流动，更像 Slack                               | `top-level`        |

**问题在于：** Teams API 不会暴露某个频道使用的是哪种 UI 样式。如果你使用了错误的 `replyStyle`：

- 在 Threads 风格的频道中使用 `thread` → 回复会以嵌套方式出现，显得别扭。
- 在 Posts 风格的频道中使用 `top-level` → 回复会作为独立的顶层帖子出现，而不是线程内回复。

**解决方案：** 根据频道的配置方式，按频道设置 `replyStyle`：

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

### 优先级顺序

当机器人向频道发送回复时，`replyStyle` 会从最具体的覆盖项逐级回退到默认值。第一个非 `undefined` 的值生效：

1. **按频道** - `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **按团队** - `channels.msteams.teams.<teamId>.replyStyle`
3. **全局** - `channels.msteams.replyStyle`
4. **隐式默认值** - 由 `requireMention` 推导：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果你在全局将 `requireMention: false` 设为默认，而没有显式设置 `replyStyle`，那么在 Posts 风格频道中的提及消息会以顶层帖子形式出现，即使入站消息原本是一个线程回复。请在全局、团队或频道级别固定设置 `replyStyle: "thread"`，以避免意外行为。

对于发送到已保存的频道会话的主动消息（排队的工具调用回复、长时间运行的代理），同样适用团队/频道解析规则；群聊和个人（DM）会话在主动发送时始终解析为 `top-level`，不受 `replyStyle` 影响。

### 线程上下文保留

当 `replyStyle: "thread"` 生效，并且机器人是在频道线程内被 @ 提及的情况下，OpenClaw 会将原始线程根重新附加到出站会话引用（`19:...@thread.tacv2;messageid=<root>`），从而让回复落在同一个线程中。这对实时（在同一次交互中）发送和在 Bot Framework 轮次上下文过期后发出的主动发送都适用（例如：长时间运行的代理、通过 `mcp__openclaw__message` 发送的排队工具调用回复）。

线程根会从存储在会话引用中的 `threadId` 取出。旧版引用如果还不包含 `threadId`，则回退使用 `activityId`（即最近一次提供会话上下文的入站活动），因此现有部署无需重新播种也能继续工作。

当 `replyStyle: "top-level"` 生效时，来自频道线程的入站消息会被刻意作为新的顶层帖子回复；不会附加线程后缀。这对于 Threads 风格频道是正确的；如果你期望的是线程回复却看到顶层帖子，说明该频道的 `replyStyle` 设置不正确。

## 附件和图片

**当前限制：**

- **私信：** 图片和文件附件通过 Teams 机器人文件 API 处理。
- **频道/群组：** 附件存储在 M365 存储（SharePoint/OneDrive）中。Webhook 负载仅包含 HTML 占位符片段，不包含实际文件字节。**下载频道附件需要 Graph API 权限**。
- 对于显式预上传发送，请使用 `action=upload-file`，并包含 `media` / `filePath` / `path`；可选的 `message` 将作为附带文本/评论使用，而 `filename`（或 `title`）将覆盖上传后的名称。

如果没有 Graph 权限，包含图片的频道消息将以纯文本形式到达（机器人无法访问图片内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。你可以使用 `channels.msteams.mediaAllowHosts` 覆盖此设置（使用 `["*"]` 可允许任何主机）。
Authorization 标头仅会附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免使用多租户后缀）。

## 在群聊中发送文件

机器人可以使用内置的 FileConsentCard 流程在私聊中发送文件。**在群聊/频道中发送文件** 需要额外配置：

| 上下文                     | 文件发送方式                                  | 所需配置                                      |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| **私聊**                  | FileConsentCard → 用户接受 → 机器人上传      | 开箱即用                                       |
| **群聊/频道**              | 上传到 SharePoint → 原生文件卡片              | 需要 `sharePointSiteId` + Graph 权限          |
| **图像（任何上下文）**      | 内联 Base64 编码                              | 开箱即用                                       |

### 为什么群聊需要 SharePoint

机器人使用应用身份，而 Microsoft Graph 的 `/me` 资源 [需要已登录用户](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0)。要在群聊/频道中发送文件，机器人会将文件上传到一个 **SharePoint 站点** 并创建共享链接。

### 配置

1. **在 Entra ID（Azure AD）→ 应用注册中添加 Graph API 权限**：
   - `Sites.ReadWrite.All`（应用程序）- 将文件上传到 SharePoint。
   - `ChatMember.Read.All`（应用程序）- 用于群聊文件发送的租户范围最小权限。`Chat.Read.All` 也可用，并且在启用群聊历史记录时已包含此权限。作为按聊天的替代方案，可使用 `ChatMember.Read.Chat` [特定于资源的同意权限](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)。
2. **为该租户授予管理员同意**。
3. **获取你的 SharePoint 站点 ID：**

   ```bash
   # 通过 Graph Explorer 或使用带有效令牌的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：站点位于 "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应包含： "id": "contoso.sharepoint.com,guid1,guid2"
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

| 上下文和权限                                                          | 共享行为                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 频道 + `Sites.ReadWrite.All`                                           | 组织范围共享链接（组织中的任何人都可以访问）               |
| 群聊 + `Sites.ReadWrite.All` + 受支持的群聊成员读取授权                | 按用户共享链接（只有群聊成员可以访问）                     |
| 群聊，但没有受支持的群聊成员读取授权                                    | 发送安全失败                                               |

按用户共享更安全，因为只有聊天参与者才能访问该文件。OpenClaw 要求群聊成员查询成功；超时、传输失败、空结果以及 Graph API 拒绝都会导致发送失败，而不是将访问范围扩大到整个组织。

### 回退行为

| 场景                                                            | 结果                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| 群聊 + 文件 + 已配置 SharePoint 和成员权限                       | 上传到 SharePoint，发送原生文件卡片              |
| 群聊 + 文件 + 缺少 SharePoint 或成员权限                         | 失败，并显示可执行的配置错误                     |
| 频道 + 文件 + 已配置 `sharePointSiteId`                          | 上传到 SharePoint，发送原生文件卡片              |
| 私聊 + 文件                                                     | FileConsentCard 流程（无需 SharePoint 即可工作）  |
| 任何上下文 + 图像                                               | 内联 Base64 编码（无需 SharePoint 即可工作）      |

### 文件存储位置

上传的文件会存储在所配置 SharePoint 站点默认文档库中的 `/OpenClawShared/` 文件夹里。

## 投票（Adaptive Cards）

OpenClaw 通过 Adaptive Cards 发送 Teams 投票（没有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> --poll-question "..." --poll-option "..." --poll-option "..."`。
- 投票由网关记录到 OpenClaw plugin-state SQLite 中的 `state/openclaw.sqlite`。
- 现有的 `msteams-polls.json` 文件由 `openclaw doctor --fix` 导入，而不是由运行中的插件导入。
- 网关必须保持在线才能记录投票。
- 投票不会自动发布结果摘要，目前也还没有 poll-results CLI。

## 演示卡片

使用 `message` 工具、CLI，或普通回复向 Teams 用户或会话传递语义化的演示载荷。OpenClaw 会根据通用演示契约，将它们渲染为 Teams 自适应卡片。

`presentation` 参数接受语义块。当提供 `presentation` 时，消息文本是可选的。按钮会渲染为自适应卡片的提交或 URL 操作。选择菜单不是 Teams 渲染器的原生支持，因此 OpenClaw 会在发送前将其降级为可读文本。

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

有关 target 格式的详细信息，请参见下方的 [目标格式](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和会话：

| 目标类型         | 格式                           | 示例                                                                                                |
| -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 用户（按 ID）        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`                                                            |
| 用户（按名称）      | `user:<display-name>`            | `user:John Smith`（需要 Graph API）                                                                  |
| 群组/频道       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`                                                               |
| 群组/频道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2`、`19:...@unq.gbl.spaces`，或裸露的 `a:`/`8:orgid:`/`29:` Bot Framework ID |

**命令行示例：**

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
如果没有 `user:` 前缀，名称默认会按群组或团队解析。按显示名称定位到个人时，请始终使用 `user:`。
</Note>

## 主动消息

- 主动消息仅在用户已经进行交互**之后**才可能发送，因为 OpenClaw 会在此时存储会话引用。
- 有关 `dmPolicy` 和 allowlist 门控，请参见 [/gateway/configuration](/gateway/configuration)。

## 团队和频道 ID（常见误区）

Teams URL 中的 `groupId` 查询参数**不是**配置所使用的团队 ID。请从 URL 路径中提取 ID：

**团队 URL：**

```text
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    团队会话 ID（对其进行 URL 解码）
```

**频道 URL：**

```text
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      频道 ID（URL 解码）
```

**用于配置：**

- 团队键 = `/team/` 后面的路径段（URL 解码，例如 `19:Bk4j...@thread.tacv2`；较旧的租户可能会显示 `@thread.skype`，这也是有效的）。
- 频道键 = `/channel/` 后面的路径段（URL 解码）。
- 在 OpenClaw 路由中请**忽略** `groupId` 查询参数。它是 Microsoft Entra 组 ID，而不是传入 Teams 活动中使用的 Bot Framework 会话 ID。

## 私有频道

机器人在私有频道中的支持有限：

| 功能                         | 标准频道              | 私有频道               |
| ---------------------------- | ----------------- | ---------------------- |
| 机器人安装                   | 是                | 有限                   |
| 实时消息（webhook）          | 是                | 可能无法工作           |
| RSC 权限                     | 是                | 可能表现不同           |
| @提及                       | 是                | 如果机器人可访问       |
| Graph API 历史记录           | 是                | 是（需具备权限）       |

**如果私有频道无法正常工作，可采用以下替代方案：**

1. 使用标准频道进行机器人交互。
2. 使用私信；用户始终可以直接向机器人发送消息。
3. 使用 Graph API 访问历史记录（需要 `ChannelMessage.Read.All`）。

## 故障排查

### 常见问题

- **频道中图片不显示：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **频道中没有响应：** 默认需要提及；将 `channels.msteams.requireMention=false`，或按团队/频道进行配置。
- **版本不匹配（Teams 仍显示旧的 manifest）：** 移除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 未授权：** 在没有 Azure JWT 的情况下手动测试时属于预期现象；这表示端点可达，但认证失败。请使用 Azure Web Chat 进行正确测试。

### manifest 上传错误

- **“Icon file cannot be empty”：** manifest 引用了 0 字节的图标文件。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id already in use”：** 该应用仍安装在其他团队/聊天中。先找到并卸载它，或者等待 5-10 分钟让变更传播完成。
- **上传时出现 “Something went wrong”：** 改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发者工具（F12）→ Network 选项卡，并检查响应体中的实际错误。
- **侧载失败：** 尝试使用“Upload an app to your org's app catalog”而不是“Upload a custom app”；这通常可以绕过侧载限制。

### RSC 权限不生效

1. 确认 `webApplicationInfo.id` 与你的 bot App ID 完全一致。
2. 重新上传应用，并在团队/聊天中重新安装。
3. 检查你的组织管理员是否已阻止 RSC 权限。
4. 确认你使用的是正确的作用域：团队使用 `ChannelMessage.Read.Group`，群聊使用 `ChatMessage.Read.Chat`。

## 参考资料

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams 开发者门户](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams 应用清单架构](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot 文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群组需要 Graph）
- [主动消息发送](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于 bot 管理的 Teams CLI

## 相关内容

- [频道概览](/channels) - 所有受支持的频道
- [配对](/channels/pairing) - DM 认证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [频道路由](/channels/channel-routing) - 消息的会话路由
- [安全性](/gateway/security) - 访问模型和加固。
