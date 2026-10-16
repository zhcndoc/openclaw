---
summary: "安装 Microsoft Teams 插件，注册机器人和 Teams 应用程序，然后针对开发隧道运行"
read_when:
  - "首次设置Microsoft Teams通道"
  - "手动注册 Azure Bot 和 Teams 应用程序"
  - "针对本地开发隧道运行 Teams"
title: "Microsoft Teams 设置"
sidebarTitle: "设置"
---

安装插件，注册机器人和 Teams 应用程序，将 Teams 指向可访问的端点，并验证结果。

## <a id="bundled-plugin"></a> 捆绑插件

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

详细信息：[插件](/tools/plugin)

## <a id="quick-setup"></a> 快速设置

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 可通过一条命令处理机器人注册、清单创建和凭据生成。

**1. 安装并登录**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>
Teams CLI 在 `@preview` dist-tag 下发布（请参阅上面的安装命令）。命令和标志可能会在版本之间发生变化。
</Note>

**2. 启动隧道**（Teams 无法访问 localhost）

如有需要，请安装并验证 devtunnel CLI（[入门指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 18789 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>
`--allow-anonymous` 是必需的，因为 Teams 无法对 devtunnels 进行身份验证。每个传入的机器人请求仍会由 Teams SDK 验证。
</Note>

替代方案：`ngrok http 18789` 或 `tailscale funnel 18789`（每个会话的 URL 可能会更改）。如果不同，请使用您配置的网关端口。配置反向代理时，仅公开所需的 Webhook 路径。

新安装仅使用网关端口。 Doctor 在现有安装上使用一次性 `channels.msteams.legacyWebhook` 引脚保留端口 `3978`。移动回调并验证通过网关端口的传递后，删除该引脚以关闭旧端口。

**3. 创建应用**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

这将创建一个 Entra ID （Azure AD） 应用程序，生成客户端密钥，构建并上传 Teams 应用清单（带有图标），并注册 Teams- 托管机器人（无需 Azure 订阅）。输出包括 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 和 **Teams 应用程序 ID**；它还提供直接在 Teams 中安装该应用程序。

**4. 使用输出中的凭据配置 OpenClaw**：

```json5
{
  bindings: [{ agentId: "main", match: { channel: "msteams", accountId: "default" } }],
  channels: {
    msteams: {
      enabled: true,
      tenantId: "<TENANT_ID>",
      webhook: { path: "/api/messages" },
      accounts: {
        default: {
          appId: "<CLIENT_ID>",
          appPassword: "<CLIENT_SECRET>",
        },
      },
    },
  },
}
```

这种基于帐户的形状适用于一个或多个机器人。环境变量（`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`）仅适用于 `default` 账户。每个指定帐户在同一网关端口上都有自己的机器人凭据和 Webhook 路径。有关端点示例，请参阅 [ 多个机器人帐户](/channels/msteams/configuration#multiple-bot-accounts)。

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

对于生产，请考虑使用 [ 联合身份验证](/channels/msteams/authentication#federated-authentication-certificate-plus-managed-identity)（证书或托管身份）而不是客户端密钥。

<Note>
群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许任何成员（默认仍需提及）。
</Note>

## <a id="goals"></a> 目标

- 通过 Teams DM、群聊或频道与 OpenClaw 交谈。
- 回复始终返回到他们到达的频道。
- 默认采用安全的频道行为（除非另有配置，否则需要提及）。

<details>
<summary><strong>手动设置（无需 Teams CLI）</strong></summary>

### <a id="how-it-works"></a> 工作原理

1. 检查 Microsoft Teams 插件是否可用（捆绑在当前版本中）。
2. 创建一个 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建引用机器人的**Teams应用程序包**，包括[RSC权限](/channels/msteams/manifest-and-permissions#current-teams-rsc-permissions-manifest)。
4. Upload/install 将 Teams 应用程序纳入团队（或 DM 的个人范围）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams` 并启动网关。
6. 网关通过 Teams SDK JWT 身份验证在 `/api/messages` 上的 `gateway.port`（默认 `18789`）上提供 Bot Framework Webhook 流量。

### <a id="step-1%3A-create-azure-bot"></a><a id="step-1-create-azure-bot"></a> 第 1 步：创建 Azure Bot

1. Go 到 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **基础信息** 选项卡：

   | 字段              | 值                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **机器人手柄**     | 您的机器人名称，e.g.，`openclaw-msteams`（必须是唯一的） |
   | **订阅**   | 选择你的 Azure 订阅                           |
   | **资源组** | 新建或使用现有                               |
   | **定价层**   | **Free** 适用于 dev/testing                                 |
   | **应用类型**    | **单租户**（推荐；见下方说明）          |
   | **创建类型**  | **创建新的 Microsoft 应用 ID**                          |

<Warning>
新多租户机器人的创建在 2025-07-31 之后已被弃用。新机器人请使用 **单租户**。
</Warning>

3. 点击 **检查 + 创建**，然后点击 **创建**（约 1-2 分钟）。

### <a id="step-2%3A-get-credentials"></a><a id="step-2-get-credentials"></a> 第 2 步：获取凭据

1. Azure Bot 资源 → **配置** → 复制 **Microsoft 应用 ID**（即你的 `appId`）。
2. **管理密码** → 应用注册 → **证书和机密** → **新建客户端机密** → 复制 **值**（即你的 `appPassword`）。
3. **概览** → 复制 **目录（租户）ID**（即你的 `tenantId`）。

### <a id="step-3%3A-configure-messaging-endpoint"></a><a id="step-3-configure-messaging-endpoint"></a> 第 3 步：配置消息端点

1. Azure Bot → **配置**。
2. 设置 **消息传递端点**：
   - 生产环境：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（参见[本地开发](#local-development-tunneling)）

### <a id="step-4%3A-enable-teams-channel"></a><a id="step-4-enable-teams-channel"></a> 第 4 步：启用 Teams 通道

1. Azure Bot → **频道**。
2. 单击**Microsoft Teams**→配置→保存。
3. 接受服务条款。

### <a id="step-5%3A-build-teams-app-manifest"></a><a id="step-5-build-teams-app-manifest"></a> 第 5 步：构建 Teams 应用清单

- 包含一个 `bot` 条目，并设置 `botId = <App ID>`。
- 作用域：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人作用域文件处理所必需）。
- 添加RSC权限（参见[RSC权限](/channels/msteams/manifest-and-permissions#current-teams-rsc-permissions-manifest)）。
- 创建图标：`outline.png`（32x32）和 `color.png`（192x192）。
- 将 `manifest.json`、`outline.png` 和 `color.png` 一起打包成 zip。

### <a id="step-6%3A-configure-openclaw"></a><a id="step-6-configure-openclaw"></a> 第 6 步：配置 OpenClaw

```json5
{
  bindings: [{ agentId: "main", match: { channel: "msteams", accountId: "default" } }],
  channels: {
    msteams: {
      enabled: true,
      tenantId: "<TENANT_ID>",
      webhook: { path: "/api/messages" },
      accounts: {
        default: {
          appId: "<APP_ID>",
          appPassword: "<APP_PASSWORD>",
        },
      },
    },
  },
}
```

环境变量仅配置默认帐户。有关其他机器人注册和路由，请参阅 [ 多个机器人帐户](/channels/msteams/configuration#multiple-bot-accounts)。

### <a id="step-7%3A-run-the-gateway"></a><a id="step-7-run-the-gateway"></a> 第 7 步：运行网关

当插件可用且 `msteams` 配置包含凭据时，Teams 通道会自动启动。

</details>

## <a id="local-development-(tunneling)"></a><a id="local-development-tunneling"></a> 本地开发（隧道）

Teams 无法访问 `localhost`。请使用持久化开发隧道，以便 URL 在各次会话之间保持稳定：

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 18789 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 18789` 或 `tailscale funnel 18789`（每个会话的 URL 可能会更改）。如果不同，请使用您配置的网关端口。配置反向代理时，仅公开所需的 Webhook 路径。

如果隧道 URL 发生变化，请更新端点：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## <a id="testing-the-bot"></a> 测试机器人

**运行诊断：**

```bash
teams app doctor <teamsAppId>
```

一次性检查机器人注册、AAD 应用、清单和 SSO 配置。

**发送测试消息：**

1. 安装 Teams 应用（从 `teams app get <id> --install-link` 获取安装链接）。
2. 在Teams中找到机器人并发送DM。
3. 检查网关日志中是否有传入活动。
