---
summary: "Microsoft Teams 机器人支持状态、功能及配置"
read_when:
  - 处理 Microsoft Teams 频道功能时
title: "Microsoft Teams"
---

支持文本和私聊附件；频道和群组文件发送需要 `sharePointSiteId` + Graph 权限（参见 [在群聊中发送文件](#sending-files-in-group-chats)）。投票通过 Adaptive Cards 发送。消息操作显式提供 `upload-file` 以支持先文件后发送。

## 内置插件

Microsoft Teams 作为内置插件包含在当前的 OpenClaw 发布版中，因此正常打包构建无需单独安装。

如果您使用的是旧版本或排除了内置 Teams 的自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/msteams
```

本地代码检出时（从 git 仓库运行）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详情：[插件](/tools/plugin)

## 快速设置（初学者）

1. 确保 Microsoft Teams 插件可用。
   - 当前打包的 OpenClaw 发布版已内置该插件。
   - 旧版/自定义安装可通过上述命令手动添加。
2. 创建 **Azure Bot**（应用 ID + 客户端密钥 + 租户 ID）。
3. 使用这些凭据配置 OpenClaw。
4. 通过公共 URL 或隧道暴露 `/api/messages`（默认端口 3978）。
5. 安装 Teams 应用包并启动网关。

最小配置（客户端密钥）：

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

对于生产部署，建议使用 [联合身份验证](#federated-authentication)（证书或托管身份）代替客户端密钥。

注意：群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群回复，请设置 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 允许任何成员，需提及）。

## 配置写入

默认情况下，Microsoft Teams 允许通过 `/config set|unset` 命令触发的配置更新写入（需设置 `commands.config: true`）。

关闭方法：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私聊 + 群组）

**私聊访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者在获批前会被忽略。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID。
- 不要依赖 UPN/显示名称匹配来做白名单——它们可能会变化。OpenClaw 默认禁用直接名称匹配；如需启用，请显式设置 `channels.msteams.dangerouslyAllowNameMatching: true`。
- 当凭据允许时，向导可通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（阻止，除非添加 `groupAllowFrom`）。未设置时可用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可在群聊/频道触发（回退至 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 允许所有成员（默认仍需 @提及）。
- 若不允许任何频道，设置 `channels.msteams.groupPolicy: "disabled"`。

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

**Teams + 频道白名单**

- 通过在 `channels.msteams.teams` 下列出团队和频道限制组/频道回复范围。
- 键应使用稳定的团队 ID 和频道会话 ID。
- 当 `groupPolicy="allowlist"` 且存在团队白名单时，仅接受列出的团队/频道（需 @提及）。
- 配置向导接收 `Team/Channel` 条目并为您存储。
- 启动时，OpenClaw 会根据 Graph 权限解析团队/频道和用户白名单名称到 ID，并记录映射；未解析的团队/频道名称默认为保留原文，但默认不参与路由，除非启用 `channels.msteams.dangerouslyAllowNameMatching: true`。

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

## Azure Bot 设置

在配置 OpenClaw 之前，请先创建 Azure Bot 资源并获取其凭据。

<Steps>
  <Step title="创建 Azure Bot">
    前往 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot) 并填写 **基本信息** 选项卡：

    | Field              | Value                                                    |
    | ------------------ | -------------------------------------------------------- |
    | **Bot handle**     | 你的机器人名称，例如 `openclaw-msteams`（必须唯一）      |
    | **Subscription**   | 你的 Azure 订阅                                           |
    | **Resource group** | 新建或使用现有                                             |
    | **Pricing tier**   | **Free**，用于开发/测试                                   |
    | **Type of App**    | **Single Tenant**（推荐）                                 |
    | **Creation type**  | **Create new Microsoft App ID**                          |

    <Note>
    新的多租户机器人已于 2025-07-31 之后弃用。新机器人请使用 **Single Tenant**。
    </Note>

    点击 **Review + create** → **Create**（等待约 1-2 分钟）。

  </Step>

  <Step title="获取凭据">
    在 Azure Bot 资源中 → **Configuration**：

    - 复制 **Microsoft App ID** → `appId`
    - **Manage Password** → **Certificates & secrets** → **New client secret** → 复制值 → `appPassword`
    - **Overview** → **Directory (tenant) ID** → `tenantId`

  </Step>

  <Step title="配置消息端点">
    Azure Bot → **Configuration** → 设置 **Messaging endpoint**：

    - 生产环境：`https://your-domain.com/api/messages`
    - 本地开发：使用隧道（参见 [本地开发](#local-development-tunneling)）

  </Step>

  <Step title="启用 Teams 频道">
    Azure Bot → **Channels** → 点击 **Microsoft Teams** → Configure → Save。接受服务条款。
  </Step>
</Steps>

## 联合身份验证

> 添加于 2026.3.24

对于生产部署，OpenClaw 支持 **联合身份验证** 作为客户端密钥的更安全替代方案。提供两种方法：

### 选项 A：基于证书的身份验证

使用向 Entra ID 应用注册注册的 PEM 证书。

**设置：**

1. 生成或获取证书（含私钥的 PEM 格式）。
2. 在 Entra ID → 应用注册 → **证书和机密** → **证书** → 上传公钥证书。

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

### 选项 B：Azure 托管身份

使用 Azure 托管身份进行无密码身份验证。这对于部署在可用托管身份的 Azure 基础设施（AKS、App Service、Azure VMs）上非常理想。

**工作原理：**

1. 机器人 pod/VM 拥有托管身份（系统分配或用户分配）。
2. **联合身份凭据** 将托管身份链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 端点（`169.254.169.254`）获取令牌。
4. 令牌传递给 Teams SDK 用于机器人身份验证。

**前提条件：**

- 启用了托管身份的 Azure 基础设施（AKS 工作负载身份、App Service、VM）
- 在 Entra ID 应用注册上创建了联合身份凭据
- 从 pod/VM 到 IMDS（`169.254.169.254:80`）的网络访问

**配置（系统分配的托管身份）：**

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

**配置（用户分配的托管身份）：**

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (仅用于用户分配)

### AKS workload identity setup

对于使用工作负载身份的 AKS 部署：

1. **在 AKS 集群上启用工作负载身份**。
2. **在 Entra ID 应用注册上创建联合身份凭据**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. **注解 Kubernetes 服务账户** 添加应用客户端 ID：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. **标记 pod** 以进行工作负载身份注入：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **确保网络访问** 到 IMDS（`169.254.169.254`）— 如果使用 NetworkPolicy，添加允许流量到 `169.254.169.254/32` 端口 80 的出口规则。

### 身份验证类型比较

| 方法               | 配置                                         | 优点                               | 缺点                                  |
| -------------------- | ---------------------------------------------- | ---------------------------------- | ------------------------------------- |
| **客户端密钥**    | `appPassword`                                  | 设置简单                       | 需要密钥轮换，安全性较低 |
| **证书**      | `authType: "federated"` + `certificatePath`    | 网络上无共享密钥      | 证书管理开销       |
| **托管身份** | `authType: "federated"` + `useManagedIdentity` | 无密码，无需管理密钥 | 需要 Azure 基础设施         |

**默认行为：** 当未设置 `authType` 时，OpenClaw 默认为客户端密钥身份验证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`，本地开发时需使用隧道：

**方案 A：ngrok**

```bash
ngrok http 3978
# 复制 https URL，例如 https://abc123.ngrok.io
# 设置消息端点为：https://abc123.ngrok.io/api/messages
```

**方案 B：Tailscale Funnel**

```bash
tailscale funnel 3978
# 使用您的 Tailscale funnel URL 作为消息端点
```

## Teams 开发者门户（替代方案）

无需手动制作 manifest ZIP，可通过 [Teams 开发者门户](https://dev.teams.microsoft.com/apps)：

1. 点击 **+ 新应用**
2. 填写基本信息（名称、描述、开发者信息）
3. 转到 **应用功能** → **Bot**
4. 选择 **手动输入 Bot ID** 并粘贴 Azure Bot App ID
5. 勾选权限范围：**个人**、**团队**、**群组聊天**
6. 点击 **分发** → **下载应用包**
7. 在 Teams 中：**应用** → **管理你的应用** → **上传自定义应用** → 选择 ZIP 包

这通常比手动编辑 JSON manifest 更简单。

## 测试机器人

**方案 A：Azure Web Chat（先验证 webhook）**

1. 在 Azure 门户 → 您的 Azure Bot 资源 → **Web Chat 测试**
2. 发送消息，确认收到响应
3. 验证 webhook 是否正常，在 Teams 配置前先确认通畅

**方案 B：Teams（安装应用后）**

1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 查找机器人并发送私聊消息
3. 检查网关日志是否有收到请求

<Accordion title="Environment variable overrides">

任何机器人/身份验证配置键也可以通过环境变量设置：

- `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE` (`"secret"` 或 `"federated"`)
- `MSTEAMS_CERTIFICATE_PATH`, `MSTEAMS_CERTIFICATE_THUMBPRINT`（federated + certificate）
- `MSTEAMS_USE_MANAGED_IDENTITY`, `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（federated + managed identity；client ID 仅用于 user-assigned）

</Accordion>

## 成员信息操作

OpenClaw 为 Microsoft Teams 提供了基于 Graph 的 `member-info` 操作，以便代理和自动化可以直接从 Microsoft Graph 解析频道成员详细信息（显示名称、电子邮件、角色）。

要求：

- `Member.Read.Group` RSC 权限（已在推荐清单中）
- 对于跨团队查找：需要具有管理员同意的 `User.Read.All` Graph 应用程序权限

该操作受 `channels.msteams.actions.memberInfo` 控制（默认值：当 Graph 凭据可用时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制最近多少条频道/群组消息被包装进提示词。
- 回退到 `messages.groupChat.historyLimit`。设置为 `0` 禁用（默认 50）。
- 获取的线程历史会根据发送者白名单（`allowFrom` / `groupAllowFrom`）过滤，因此线程上下文种子仅包含来自允许发送者的消息。
- 引用的附件上下文（源自 Teams 回复 HTML 的 `ReplyTo*`）目前按原样传递。
- 换句话说，白名单控制谁能触发代理；目前仅过滤特定的补充上下文路径。
- 私聊历史可通过 `channels.msteams.dmHistoryLimit` 限制（用户轮数）。每用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限

以下是 Teams 应用 manifest 中的**资源特定权限**，仅适用于应用安装的团队或聊天内。

**频道（团队作用域）：**

- `ChannelMessage.Read.Group`（应用权限）- 接收所有频道消息（无需 @提及）  
- `ChannelMessage.Send.Group`（应用权限）  
- `Member.Read.Group`（应用权限）  
- `Owner.Read.Group`（应用权限）  
- `ChannelSettings.Read.Group`（应用权限）  
- `TeamMember.Read.Group`（应用权限）  
- `TeamSettings.Read.Group`（应用权限）  

**群聊：**

- `ChatMessage.Read.Chat`（应用权限）- 接收所有群聊消息（无需 @提及）

## 示例 Teams manifest

最低有效示例，含必需字段，ID 和 URL 请替换。

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
  description: { short: "OpenClaw 在 Teams 中", full: "OpenClaw 在 Teams 中" },
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

### Manifest 注意事项（必填字段）

- `bots[].botId` **必须**与 Azure Bot App ID 相符。
- `webApplicationInfo.id` **必须**与 Azure Bot App ID 相符。
- `bots[].scopes` 必须包含计划使用的范围（`personal`, `team`, `groupChat`）。
- `bots[].supportsFiles: true` 是个人作用域文件处理必需项。
- `authorization.permissions.resourceSpecific` 必须包含频道读写权限，才能访问频道消息。

### 更新已安装应用

1. 修改 `manifest.json` 加入新设置
2. **版本号递增**，如 `1.0.0` → `1.1.0`
3. 重新打包 `manifest.json` 和图标 (`outline.png`, `color.png`)
4. 上传新版本：
   - **方法 A（Teams 管理中心）**：Teams 管理中心 → Teams 应用 → 管理应用 → 找到您的应用 → 上传新版本
   - **方法 B（侧载）**：Teams → 应用 → 管理你的应用 → 上传自定义应用
5. **针对团队频道：** 需在每个团队中重新安装应用以应用新权限
6. **完全退出并重启 Teams**（非仅关闭窗口）以清理缓存的应用元数据

## 功能对比：仅 RSC 与 Graph API

### 使用 **仅 Teams RSC**（安装应用，无 Graph API 权限）

### 仅使用 Teams RSC（无 Graph API 权限）

- 读取频道消息**文本**内容。
- 发送频道消息**文本**内容。
- 接收**私聊（DM）**中的文件附件。

不支持：

- 频道/群组的**图片或文件内容**（载荷仅含 HTML 占位符）。
- 下载存储于 SharePoint/OneDrive 的附件。
- 阅读历史消息（仅限实时 webhook 事件）。

### 使用 **Teams RSC + Microsoft Graph 应用权限**

### Teams RSC 加 Microsoft Graph 应用权限

- 下载托管内容（消息中粘贴的图片）。
- 下载存储在 SharePoint/OneDrive 的文件附件。
- 通过 Graph 阅读频道/聊天历史消息。

### RSC 与 Graph API 对比

| 能力                      | 仅 RSC 权限                  | Graph API                                |
| ------------------------- | ---------------------------- | --------------------------------------- |
| **实时消息**              | 支持（通过 webhook）         | 不支持（仅轮询）                        |
| **历史消息**              | 不支持                      | 支持（可查询历史）                       |
| **配置复杂度**            | 仅应用 manifest             | 需管理员同意 + Token 流程              |
| **离线工作能力**          | 不支持（必须在线）           | 支持（可随时查询）                       |

**总结：**RSC 用于实时接收消息，Graph API 用于历史访问。若需离线时补充未读消息，需要管理员权限的 Graph API `ChannelMessage.Read.All`。

## 启用 Graph 权限获取频道多媒体及历史消息（频道必需）

需启用 Microsoft Graph 权限并授予管理员同意，步骤：

1. 在 Entra ID（Azure AD）应用注册中添加 Microsoft Graph **应用权限**：  
   - `ChannelMessage.Read.All`（频道附件与历史消息）  
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）

2. 为租户授予管理员同意。
3. 升级 Teams 应用 **manifest 版本**，重新上传，**重新安装应用**。
4. **完全退出并重启 Teams**，清除缓存的应用元数据。

**另外用户@提及：**会话内的用户@提及无需额外权限。如需动态查找及@不在会话内的用户，添加 `User.Read.All`（应用权限）并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 投递消息。如处理时间过长（例如 LLM 响应慢）：

- 网关超时
- Teams 可能重复投递（导致重复消息）
- 回复丢失

OpenClaw 通过快速返回并主动推送回复缓解此问题，但极慢的响应可能仍会出问题。

### 格式支持

Teams Markdown 比 Slack 或 Discord 受限：

- 基础格式可用：**粗体**、_斜体_、`代码`、链接
- 复杂 markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票和语义化展示发送（见下文）

## 配置

分组设置（共享频道模式见 `/gateway/configuration`）。

<AccordionGroup>
  <Accordion title="核心与 webhook">
    - `channels.msteams.enabled`
    - `channels.msteams.appId`, `appPassword`, `tenantId`: 机器人凭据
    - `channels.msteams.webhook.port`（默认 `3978`）
    - `channels.msteams.webhook.path`（默认 `/api/messages`）
  </Accordion>

  <Accordion title="身份验证">
    - `authType`: `"secret"`（默认）或 `"federated"`
    - `certificatePath`, `certificateThumbprint`: 联合身份 + 证书认证（指纹可选）
    - `useManagedIdentity`, `managedIdentityClientId`: 联合身份 + 托管标识认证
  </Accordion>

  <Accordion title="访问控制">
    - `dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）
    - `allowFrom`: DM 白名单，优先使用 AAD 对象 ID；当 Graph 可用时，向导会解析名称
    - `dangerouslyAllowNameMatching`: 用于可变 UPN/显示名称以及团队/频道名称路由的应急开关
    - `requireMention`: 在频道/群组中要求 @提及（默认 `true`）
  </Accordion>

  <Accordion title="团队与频道覆盖">
    以下所有项都会覆盖顶层默认值：

    - `teams.<teamId>.replyStyle`, `.requireMention`
    - `teams.<teamId>.tools`, `.toolsBySender`: 每个团队的工具策略默认值
    - `teams.<teamId>.channels.<conversationId>.replyStyle`, `.requireMention`
    - `teams.<teamId>.channels.<conversationId>.tools`, `.toolsBySender`

    `toolsBySender` 键接受 `id:`, `e164:`, `username:`, `name:` 前缀（无前缀键映射为 `id:`）。`"*"` 是通配符。

  </Accordion>

  <Accordion title="投递、多媒体与操作">
    - `textChunkLimit`: 发出的文本分块大小
    - `chunkMode`: `length`（默认）或 `newline`（先按段落边界再按长度拆分）
    - `mediaAllowHosts`: 入站附件主机白名单（默认 Microsoft/Teams 域）
    - `mediaAuthAllowHosts`: 可在重试时接收 Authorization 头的主机（默认包含 Graph + Bot Framework）
    - `replyStyle`: `thread | top-level`（见 [回复样式](#reply-style-threads-vs-posts)）
    - `actions.memberInfo`: 切换基于 Graph 的成员信息操作（Graph 可用时默认开启）
    - `sharePointSiteId`: 群聊/频道文件上传所必需（见 [在群聊中发送文件](#sending-files-in-group-chats)）
  </Accordion>
</AccordionGroup>

## 路由与会话

- 会话键遵循标准代理格式（详见 [/concepts/session](/concepts/session)）：
  - 私聊共用主会话：`agent:<agentId>:<mainKey>`
  - 频道/群组消息按会话 ID 区分：  
    - `agent:<agentId>:msteams:channel:<conversationId>`  
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：线程 vs 帖子

Teams 最近推出两种频道 UI 样式，数据模型相同：

| 样式            | 描述                                       | 推荐设置 `replyStyle`  |
| --------------- | ------------------------------------------ | ---------------------- |
| **帖子**（经典） | 消息以卡片形式出现，下方有线程回复        | `thread`（默认）       |
| **线程**（Slack 式） | 消息线性流动，更像 Slack                 | `top-level`            |

**问题：** Teams API 不支持查询频道使用哪种 UI 样式。选错 `replyStyle` 会导致：

- 线程样式频道用 `thread` → 回复会嵌套显示不协调
- 帖子样式频道用 `top-level` → 回复变成独立顶层帖子，非线程内

**解决方案：** 按频道实际 UI 设置 `replyStyle`：

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

- **私聊：** 图片和文件附件通过 Teams 机器人文件 API 实现。
- **频道/群组：** 附件存储在 M365 存储中（SharePoint/OneDrive）。Webhook 负载仅包含 HTML 占位符，而非实际文件字节。**需要 Graph API 权限**才能下载频道附件。
- 对于明确的优先文件发送操作，使用 `action=upload-file` 配合 `media` / `filePath` / `path`；可选的 `message` 将作为伴随文本/注释，而 `filename` 会覆盖上传的文件名。

无 Graph 权限时，频道消息中的图片以纯文本形式接收（无法访问图片内容）。默认只下载 Microsoft/Teams 域的媒体，可通过 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任意域）。  
只有在 `channels.msteams.mediaAuthAllowHosts` 中的域才附加 Authorization 头（默认含 Graph + Bot Framework 域）。该列表应保持严格，避免多租户后缀。

## 在群聊中发送文件

机器人可以使用内置的 FileConsentCard 流程发送私聊文件。但**群聊/频道发送文件**需要额外配置：

| 场景                        | 发送方式                      | 所需设置                             |
| --------------------------- | ---------------------------- | ----------------------------------- |
| **私聊**                    | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                           |
| **群聊/频道**               | 上传到 SharePoint → 发送共享链接 | 需要 `sharePointSiteId` + Graph 权限 |
| **任意场景，图片**           | Base64 编码内联               | 开箱即用                           |

### 为什么群聊需 SharePoint

机器人没有个人 OneDrive 驱动（应用身份无 `/me/drive` Graph API 端点），群聊/频道文件需上传到**SharePoint 站点**并创建共享链接。

### 设置步骤

1. 在 Entra ID（Azure AD）应用注册中添加 Graph API 权限：  
   - `Sites.ReadWrite.All`（应用） - 上传文件到 SharePoint  
   - `Chat.Read.All`（应用，选填） - 实现按用户共享链接

2. 为租户授予管理员同意。

3. 获取 SharePoint 站点 ID：

   ```bash
   # 可使用 Graph Explorer 或带有效授权的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：针对 "contoso.sharepoint.com/sites/BotFiles" 站点
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应含 "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. 配置 OpenClaw：

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

### 共享权限行为

| 权限组合                               | 共享行为                                         |
| ------------------------------------ | ------------------------------------------------ |
| 仅 `Sites.ReadWrite.All`               | 组织内共享链接（组织中任何人均可访问）             |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户共享链接（仅聊天成员可访问）                  |

按用户共享更安全，仅聊天成员有权访问。无 `Chat.Read.All` 权限时，回退为组织范围共享。

### 退回行为

| 场景                                   | 结果                                       |
| ------------------------------------ | ------------------------------------------ |
| 群聊 + 文件 + 配置了 `sharePointSiteId` | 上传至 SharePoint，发送共享链接             |
| 群聊 + 文件 + 未配置 `sharePointSiteId`   | 尝试 OneDrive 上传（可能失败），发送文本消息 |
| 个人聊天 + 文件                        | 使用 FileConsentCard 流程（无须 SharePoint） |
| 任意场景 + 图片                        | Base64 内联发送（无须 SharePoint）           |

### 文件存储位置

上传文件存储于配置的 SharePoint 站点默认文档库中的 `/OpenClawShared/` 文件夹。

## 投票（自适应卡片）

OpenClaw 使用 Adaptive Cards 发送 Teams 投票（Teams 没有原生投票 API）。

- CLI 示例：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票数据保存在 `~/.openclaw/msteams-polls.json`。
- 网关需保持在线以记录投票。
- 目前不会自动发布投票结果摘要（需自行查看存储文件）。

## 演示卡片

使用 `message` 工具或 CLI 将语义化演示载荷发送给 Teams 用户或会话。OpenClaw 会将其作为 Teams Adaptive Cards，从通用演示契约进行渲染。

`presentation` 参数接受语义块。提供 `presentation` 时，消息文本可选。

**Agent 工具示例：**

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

**CLI 示例：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好！"}]}'
```

有关目标格式的详细信息，请参见下方的 [目标格式](#目标格式)。

## 目标格式

MSTeams 目标使用前缀区分用户和会话：

| 目标类型      | 格式                          | 示例                                                  |
| ------------- | ----------------------------- | ----------------------------------------------------- |
| 用户（ID）   | `user:<aad-object-id>`        | `user:40a1a0ed-4ff2-4164-a219-55518990c197`          |
| 用户（名称） | `user:<display-name>`          | `user:John Smith`（需 Graph API 支持）                |
| 群组/频道    | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`               |
| 群组/频道（原始） | `<conversation-id>`          | `19:abc123...@thread.tacv2`（包含 `@thread` 时可用） |

**CLI 使用示例：**

```bash
# 按用户 ID 发送
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "你好"

# 按用户显示名发送（触发 Graph 查询）
openclaw message send --channel msteams --target "user:John Smith" --message "你好"

# 发送到群聊或频道
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "你好"

# 向会话发送演示卡片
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"你好","blocks":[{"type":"text","text":"你好"}]}'
```

**Agent 工具示例：**

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

注意：若无 `user:` 前缀，名称默认为组/团队解析。按名称给个人发送时请始终使用 `user:` 前缀。

## 主动消息

- 仅在用户首次交互后可发送主动消息，因为需存储会话引用。
- 详见 `/gateway/configuration` 的 `dmPolicy` 和允许列表设置。

## Team 和 channel ID

Teams URL 查询参数中的 `groupId` **不是**用于配置的团队 ID。请从 URL 路径提取：

**团队 URL 示例：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    团队 ID（需解码）
```

**频道 URL 示例：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      频道 ID（需解码）
```

**配置时：**

- 团队 ID = 路径 `/team/` 后的段（URL 解码）
- 频道 ID = 路径 `/channel/` 后的段（URL 解码）
- 忽略 `groupId` 查询参数

## 私有频道

机器人在私有频道支持有限：

| 功能                      | 标准频道支持          | 私有频道支持          |
| ------------------------- | --------------------- | --------------------- |
| 机器人安装               | 是                    | 有限制                |
| 实时消息（Webhook）       | 支持                  | 可能不支持            |
| RSC 权限                 | 支持                  | 可能表现不同          |
| @提及                    | 支持                  | 只要机器人可访问即可   |
| Graph API 历史访问       | 支持                  | 仅限权限下支持        |

**若私有频道不支持，建议：**

1. 使用标准频道与机器人交互
2. 使用私聊 - 用户始终能私聊机器人
3. 使用 Graph API 访问历史消息（需 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道图片不显示：** 缺少 Graph 权限或管理员同意。卸载重新安装 Teams 应用并完全退出重启 Teams。
- **频道无回复：** 默认需 @提及。可设置 `channels.msteams.requireMention=false` 或针对团队/频道配置。
- **版本不匹配（Teams 显示旧 manifest）：** 移除后重新添加应用，完全退出 Teams 刷新缓存。
- **Webhook 401 未授权：** 手动测试时常见，表示端点可达但身份认证失败。使用 Azure Web Chat 测试更合适。

### Manifest 上传错误

- **"图标文件不能为空"：** Manifest 引用的图标文件大小为 0。请创建有效 PNG 图标（outline.png 32x32，color.png 192x192）。
- **"webApplicationInfo.Id 已被使用"：** 应用仍安装在其他团队/聊天中。先找到并卸载，或等待 5-10 分钟传播。
- **上传出错"出了点问题"：** 使用 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发者工具（F12）→网络标签，查看响应体获得具体错误。
- **侧载失败：** 尝试"上传到组织应用目录"替代"上传自定义应用"，常能绕过侧载限制。

### RSC 权限无效

1. 核实 `webApplicationInfo.id` 与 Bot App ID 完全一致
2. 重新上传应用并重装团队/聊天中应用
3. 检查组织管理员是否禁用了 RSC 权限
4. 确认所用权限范围正确：团队为 `ChannelMessage.Read.Group`，群聊为 `ChatMessage.Read.Chat`

## 参考文档

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams 开发者门户](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams 应用 Manifest 架构](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [通过 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 机器人文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (频道/群组需要 Graph)
- [主动消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## 相关内容

<CardGroup cols={2}>
  <Card title="Channels overview" icon="list" href="/channels">
    所有支持的频道。
  </Card>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    DM 身份验证和配对流程。
  </Card>
  <Card title="Groups" icon="users" href="/channels/groups">
    群聊行为和提及门控。
  </Card>
  <Card title="Channel routing" icon="route" href="/channels/channel-routing">
    消息的会话路由。
  </Card>
  <Card title="Security" icon="shield" href="/gateway/security">
    访问模型和加固。
  </Card>
</CardGroup>
