---
summary: "部署具有 Cloudflare 访问权限的共享团队网关，验证 GitHub 身份、角色、会话共享和可恢复操作"
read_when:
  - "为值得信赖的团队部署始终在线的 OpenClaw 服务器"
  - "将 Cloudflare 登录连接到网关配置文件和 GitHub 身份"
  - "操作单独的协作和发布网关"
title: "部署团队服务器"
doc-schema-version: 1
---

本指南连接生产团队部署的各个部分：持久网关、Cloudflare 隧道和访问、个人登录、GitHub 身份、操作员角色以及来自另一个网关的可选只读共享。从一台服务器开始。当需要不同的凭据、更新时间或操作员时，添加单独的发布或登台服务器。

有关较短的协作演练，请参阅 [ 团队设置](/start/teams)。本指南使用 `team.example.com` 进行协作，使用 `release.example.com` 作为可选的第二个网关。将它们替换为您自己的主机名；每个网关都需要自己的配置和状态。

## <a id="how-we-build-openclaw-with-openclaw"></a> 我们如何用OpenClaw构建OpenClaw

我们使用 [team.openclaw.ai](https://team.openclaw.ai) 作为 OpenClaw 本身的共享开发工作区。维护者和代理在相同的对话中完成存储库更改：

1. **启动存储库任务。** 在**新对话**中选择OpenClaw项目，并为[托管选择**Worktree**分支并结帐](/concepts/managed-worktrees)。为代理提供具体的更改并进行检查以证明其有效。
2. **一起工作。** 具有访问权限的队友可以打开会话、添加上下文并引导下一个回合。 [分配所有者](/concepts/multi-user#assigning-an-owner)进行后续处理；创建者和参与者的归属保持独立。
3. **审查工作。** 检查代理的结果和结账差异，运行相关测试，并在着陆前解决审查结果。
4. **发布并关注CI.**检查所选[GitHub发布帐户](/concepts/user-model#github-connections)后使用**发布PR**。链接的拉取请求及其 CI 详细信息在对话中保持可用。

![ Team 服务器上的 OpenClaw 开发任务，包含分析、测试结果和已发布的拉取请求](https://github.com/user-attachments/assets/b64f4d3a-3988-4f59-ac73-27552b6bdd30)

屏幕截图显示了一个实时存储库任务，并被裁剪到其对话中。有关 diff、文件和 PR 控件，请参阅 [Chat 和代码审查 ](/web/control-ui/chat)。

构建下一个版本不会替换正在运行的服务器。我们将部署置于其自己的批准和生命周期所有者之下，并协调激活和验证。请参阅 [ 保持操作可恢复 ](/gateway/team-server#keep-operations-recoverable)。

## <a id="before-you-begin"></a> 开始之前

- A Linux 具有持久存储和专用服务帐户的主机。使用 [ 支持的 Node 运行时 ](/install/node) 和 [OpenClaw 安装 ](/install)。
- A Cloudflare- 托管域、零信任帐户和主机上的 `cloudflared`。
- 身份提供商和明确的登录策略。
- Model 凭据，以及用于团队聊天的机器人帐户（如果需要）。
- 管理 SSH 访问、私有秘密存储以及服务器故障域之外的备份目标。

网关是一个信任边界。角色和会话所有权支持协作；它们不会将敌对用户彼此隔离。将不受信任的代码保存在沙箱或远程工作人员中。对于相互不信任的团队使用单独的网关、OS 用户或主机。参见[安全信任模型](/gateway/security/trust-model)。

## <a id="1.-install-under-one-service-account"></a><a id="1-install-under-one-service-account"></a> 1。在一个服务帐户下安装

使用将运行网关的帐户完成 [ 入门 ](/start/getting-started) ，包括模型设置和托管服务安装：

```bash
openclaw onboard --install-daemon
openclaw gateway status --deep
```

将后续配置、备份和更新命令保留在同一帐户下。稍后以 root 身份运行安装程序会创建不同的主目录并可以选择不同的网关。在服务和维护环境中保留任何自定义 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和配置文件选择器。在Linux上，验证用户注销后服务是否仍然可用；参见[网关服务管理](/cli/gateway/service)。

仅允许来自您的管理网络的 SSH。保持网关处于环回状态，并且不要公开打开 TCP 18789。 Cloudflare隧道建立出站连接；它不需要入站网关防火墙规则。

选择代理 ID，例如 `assistant`，并在通道绑定和角色代理列表中一致使用它。以下示例假设代理已存在。保持共享工作区说明简洁，并避免 `AGENTS.md`、`IDENTITY.md` 和个人说明中出现部署机密。

## <a id="2.-configure-the-public-url-and-authenticated-ingress"></a><a id="2-configure-the-public-url-and-authenticated-ingress"></a> 2。配置公共 URL 和经过身份验证的入口

在公开隧道之前，为 `team.example.com` 创建访问应用程序。最初仅允许将完成设置的管理员。选择由您的目标身份提供商支持的访问策略；不要为 Control UI 或其 WebSocket 创建公共旁路。

按照 [Cloudflare Tunnel 和 Access](/gateway/cloudflare-access) 创建隧道和 DNS 记录。它的入口应该仅将选定的主机名路由到环回网关：

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json
ingress:
  - hostname: team.example.com
    service: http://localhost:18789
  - service: http_status:404
```

保护隧道凭证文件并将 `cloudflared` 作为服务运行。使用 [SecretRef](/gateway/secrets) 保留私有本地维护密码；下面的示例预计 `OPENCLAW_GATEWAY_PASSWORD` 可用于网关服务和所属帐户的 CLI。不要将该密码分发给队友：本地密码访问代表共享所有者。

将以下内容合并到现有配置中，保留您的代理、模型和渠道：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    publicOrigin: "https://team.example.com",
    trustedProxies: ["127.0.0.1", "::1"],
    auth: {
      mode: "trusted-proxy",
      password: { source: "env", provider: "default", id: "OPENCLAW_GATEWAY_PASSWORD" },
      identityScopes: {
        "admin@example.com": ["operator.admin"],
      },
      trustedProxy: {
        userHeader: "cf-access-authenticated-user-email",
        requiredHeaders: ["cf-access-jwt-assertion"],
        allowLoopback: true,
        deviceAutoApprove: {
          enabled: true,
          scopes: ["operator.read", "operator.write", "operator.approvals", "operator.questions"],
        },
      },
    },
    roles: {
      default: "observer",
      definitions: {
        observer: {
          sessions: { others: "view" },
          agents: [],
          scopes: ["operator.read"],
        },
        member: {
          sessions: { others: "write" },
          agents: ["assistant"],
          scopes: ["operator.read", "operator.write", "operator.approvals", "operator.questions"],
        },
        administrator: {
          sessions: { others: "write" },
          agents: "*",
          scopes: ["operator.admin"],
        },
      },
    },
  },
}
```

切换到可信代理身份验证时，删除任何早期的 `gateway.auth.token` 和 `OPENCLAW_GATEWAY_TOKEN`：共享令牌​​与此模式不兼容。支持私有本地密码后备。验证配置，然后使用所属服务的生命周期来激活设置更改：

```bash
openclaw config validate --json
openclaw gateway restart
openclaw gateway status --deep
```

`allowLoopback` 信任本地进程以及 `cloudflared`。 OpenClaw 检查代理源和所需的标头；他们的存在是无法访问JWT签名验证的。外部身份验证边界是访问加上私有源。请勿运行可访问此侦听器的恶意工作负载。请参阅 [Trusted-proxy auth](/gateway/trusted-proxy-auth) 了解标头和客户端地址要求。

<a id="set-both-url-settings" />

### <a id="set-the-public-url-once"></a> 设置一次公共URL

`publicOrigin` 告诉 OpenClaw 哪个外部 URL 进行广告并提供默认的浏览器来源白名单。对于从同一来源提供的 Control UI，请保留 `gateway.controlUi.allowedOrigins` 未设置。

仅当您需要不同的浏览器策略（例如单独托管的 Control UI）时，才设置显式 `allowedOrigins` 列表。显式列表取代了公共源默认值；如果两者都应该连接，也包括公共来源。显式空列表不会继承 `publicOrigin`。现有的本地和专用网络来源规则仍然适用。

如果没有 `gateway.publicOrigin`，浏览器可以在代理的会话查找没有链接构建规则并且其运行时上下文没有会话 URL 时工作。设置裸 HTTPS 原点，不带路径、查询或凭据。如果Control UI使用路径前缀，则需要单独配置`gateway.controlUi.basePath`。

对于仅缺少此设置的现有服务器：

```bash
openclaw config set gateway.publicOrigin https://team.example.com --expect-current-absent
```

此条件写入拒绝覆盖现有值。启用实时配置重新加载后，无需重新启动网关即可应用公共源。继承允许列表后，使用旧源的浏览器必须从接受的源重新连接。明确的允许名单保持不变。新准备的工具上下文接收链接规则；已经运行的转弯可以保留其先前的上下文。在第二台服务器上设置 `https://release.example.com`，而不是复制第一台服务器的 URL。

现有安装保留其显式允许列表，包括早期安装或 Doctor 运行保存的值。升级到具有此默认值的版本后，如果您希望它遵循 `publicOrigin`，请删除带有 `openclaw config unset gateway.controlUi.allowedOrigins` 的列表；首先检查是否不需要额外的 UI 原点。 Startup 和 Doctor 将继承的默认值保留在保存的配置之外。

## <a id="3.-bootstrap-administrators-and-assign-roles"></a><a id="3-bootstrap-administrators-and-assign-roles"></a> 3。 Bootstrap 管理员并分配角色

让管理员通过 Access 登录一次。他们的持久网关配置文件已创建，最初是观察者角色。从本地维护 shell 中，列出配置文件并识别经过验证的人员：

```bash
openclaw users list --json
openclaw gateway call users.setRole \
  --params '{"profileId":"<administrator-profile-id>","role":"administrator"}' \
  --json
```

角色更改会关闭该人员的活动网关连接。重新连接浏览器。管理员需要显式 `identityScopes` 授予和管理角色上限。本地共享所有者仍然可以进行维护，并且不能分配个人角色。

将访问政策扩展到您的团队。每个成员首次登录后，通过相同的方法为其个人资料分配 `member` 角色。在此示例中，观察者可以读取可见会话，但无法启动代理工作。不要暂时将默认角色设置为管理角色以引导某人。

该示例故意自动批准具有非管理范围的 UI 设备，然后通过角色限制每个人。如果您想要手动设备注册，请忽略自动批准。不要将 `operator.admin` 添加到自动设备授予中；请改用选定的经过验证的身份。请参阅 [Operator 范围](/gateway/operator-scopes) 以了解较窄的仅限会话和沙箱所需的角色。

对于发布网关，保持观察者默认并仅分配几个发布操作员是有用的。角色分配是每个网关本地的；进入协作服务器并不授予发布权限。

### <a id="invite-guests"></a> 邀请嘉宾

要在有限的时间内允许团队外的个人，请使用 [Visitor Access 插件](/plugins/reference/visitor-access)（可从源结帐中获取）。它管理一个专用的访问允许策略，将每封受邀请的电子邮件或经过验证的 GitHub 帐户添加到其中，并在授权到期（默认情况下为 14 天）或被撤销时结束网关访问。

访客访问需要 `gateway.roles.default` 为受限访客角色：

```json5 validate=false
// Inside gateway.roles
default: "guest",
definitions: {
  guest: {
    sessions: { others: "view" },
    agents: ["assistant"],
    scopes: ["operator.sessions.write"],
    sandbox: "required",
    accessPolicyPlugin: "visitor-access",
    modelPolicy: {},
  },
},
```

每个解析为默认角色的人都需要当前访客授予。在切换默认值之前，请为每个员工分配一个显式角色 `users.setRole` 或 `gateway.roles.assignments.byGithubLogin`。然后，管理员要求代理使用 GitHub 登录名或电子邮件呼叫 `visitor_invite`；访客在普通团队 URL 签到。

来宾可以在列出的代理上创建沙盒会话，并通过共享的 GitHub 帐户从自己的会话发布草稿拉取请求。它们不能通过 OpenClaw 合并。在邀请任何人之前，请检查所需沙箱不包含的路径（在 [ 命名操作员角色 ](/gateway/operator-scopes#named-operator-roles) 和 [ 工作流和 CI 更改 ](/gateway/config-tools/github-identity#workflow-and-ci-changes) 下列出）以供发布。

## <a id="4.-synchronize-people-with-verified-github-identities"></a><a id="4-synchronize-people-with-verified-github-identities"></a> 4。将人员与经过验证的 GitHub 身份同步

将这些职责分开：

| 责任               | 配置或所有者                       |
| ---------------------------- | -------------------------------------------- |
| 谁可以访问该网站    | Cloudflare Access 及其身份提供商  |
| 哪个人登录了    | 验证登录和网关配置文件     |
| 那人可能会做什么      | 连接范围和命名操作员角色   |
| 哪个账号发布代码 | 系统、代理或个人 GitHub 连接 |

通过 Access 中的 GitHub 身份提供程序，OpenClaw 查询 Access 的身份终结点，验证其电子邮件是否与经过身份验证的代理主体匹配，并将不可变数字 GitHub 帐户 ID 解析为其当前登录名。然后，姓名和头像可以通过正常的符号 in/profile 同步进行更新。保存的自定义配置文件选择仍受 [ 用户模型 ](/concepts/user-model) 的控制。

这是登录驱动的同步，而不是每个 GitHub 组织成员的后台导入。配置文件和角色对于每个网关来说都是本地的。相同的经过验证的 GitHub 帐户可以识别两个服务器上的人员，而无需使本地配置文件 ID 相等。

### <a id="use-an-oidc-provider-without-losing-existing-profiles"></a> 使用 OIDC 提供商而不会丢失现有配置文件

OIDC 登录可以通过其经过验证的电子邮件保留现有配置文件。在更改提供商或电子邮件地址之前，请将新的已验证地址链接到管理员维护会话中的现有人员：

```bash
openclaw users link-email new-address@example.com \
  --to <existing-profile-id> --json
```

在切换登录之前，还将新的经过验证的地址添加到该人员所需的任何 `gateway.auth.identityScopes` 授权中。对于上述管理员，新地址需要自己的 `["operator.admin"]` 条目：链接电子邮件会保留配置文件和角色，但不会复制旧地址的范围授权。根据需要更新任何访问策略或 `trustedProxy.allowUsers` 电子邮件白名单。在迁移期间保留旧授权，在重新连接新地址后验证配置文件、别名、角色和有效权限，然后在该身份不再具有访问权限时撤销旧授权。不要通过显示名称合并人员或在实时服务器之间复制配置文件数据库。

对于通过 OIDC 验证的 GitHub 信用，请配置 [Cloudflare OIDC setup](/gateway/cloudflare-access#verified-github-credit-through-oidc) 中描述的显式 `cloudflareAccessOidc` 发行人、提供商 ID 和账户 ID 声明。提供商必须验证链接的 GitHub 帐户，并且 Access 必须转发其数字帐户 ID 声明。用户名或任意 OIDC 主体不是经过验证的 GitHub 帐户 ID。冲突需要管理员链接；该声明不会分配角色或更改发布代码的帐户。

如果准入取决于 GitHub 组织成员资格或存储库权限，请在 Access 或身份提供程序中强制执行。 GitHub IdP 的组织策略不会自动覆盖单独的 OIDC IdP。了解何时重新检查资格，并在删除必须在正常到期之前生效时撤销现有的访问会话。

### <a id="configure-github-access-for-repository-work"></a> 配置 GitHub 存储库工作的访问权限

为网关服务帐户安装 `gh`。在**设置→个人资料→GitHub连接**中，管理员选择**为系统**连接共享发布帐户。代理可以在 **Agents → Tools** 下拥有管理覆盖。发布前验证所选帐户。

**My GitHub** 是明确选择的出版物的单独个人连接。它不会更改共享 shell 帐户或建立经过验证的登录身份。 Git 共同作者信用也是独立的：它使用经过验证的人类参与者及其保存的同意偏好。

使用网关的 **Publish PR** 操作作为其托管发布路径。托管标识不会重写现有本地存储库的 SSH 远程或 Git 网络凭据。成功的帐户验证也不能证明对每个存储库的写入权限。请参阅 [ 代理工具的 GitHub 身份 ](/gateway/config-tools/github-identity)。

可选的 `gateway.controlUi.github.token` 服务于 GitHub 查找和项目发现。对于 Enterprise，将 `gateway.controlUi.github.host` 设置为选定的 `gateway.github.host`，以便服务凭证仅用于该主机。将其保存在专用的 SecretRef 中，而不是通过流程范围的 `GH_TOKEN` 或 `GITHUB_TOKEN` 意外选择发布者。阅读凭证、发布凭证、每个人的登录身份都有不同的工作。

## <a id="5.-connect-chat-and-remote-clients"></a><a id="5-connect-chat-and-remote-clients"></a> 5。连接聊天和远程客户端

按照 [ 团队设置 ](/start/teams#step-2-connect-the-team-chat) 获取渠道许可名单、提及要求和 DM 配对。网站准入不会配置机器人的频道白名单。如果通道发送者应解析为现有人员，请使用 [ 用户模型](/concepts/user-model) 中明确的管理员证明的通道身份链接；匹配的显示名称不够。

浏览器 cookie 不会验证 CLI、TUI 或节点连接。远程CLI客户端需要`gateway.remote.edgeAuth`和自己的Access登录；参见[远程访问](/gateway/remote#gateway-behind-an-identity-aware-proxy)。

节点和云工作人员需要一个路由来验证每个所需的加入、WebSocket 和传输请求。首选 [Cloudflare 计算机 access](/gateway/cloudflare-access#step-4-decide-how-nodes-and-workers-get-in) 中的访问服务令牌设置。当`openclaw connect`收到HTTP 302时浏览器正在工作，意味着机器请求到达Access，而不是节点配对成功。将计算机凭据保留在浏览器链接之外，并且不要绕过整个网关的访问。

可信中继插件可以使用 [ 主体绑定的远程入口 ](/plugins/sdk-gateway-ingress) 进行远程 Control UI 和 MCP 调用； [MCP Relay](/plugins/mcp-relay#team-gateways) 使用它将团队网关引入 ChatGPT 和 Codex。团队授权属于在此网关的 Control UI 中批准该授权的经过验证的人员，而不是共享所有者或环回密码。插件的同意流程应默认为 **Read + write** 并在该人的当前角色内提供 **Full**。完全授予管理员管理访问权限，并且不会提升受限角色。 UI 和 RPC 必须共享相同的实时授权；插件和中继自己的到期和撤销。入口重新连接是无令牌的，并且不发出可重复使用的设备令牌。此 SDK 功能本身不会安装或配置中继服务。

## <a id="6.-give-widgets-a-separate-sandbox-origin"></a><a id="6-give-widgets-a-separate-sandbox-origin"></a> 6。为小部件提供单独的沙箱来源

内联画布小部件和 MCP 应用程序使用单独的沙箱侦听器。在 HTTPS 入口后面，配置到达该侦听器的第二个主机名，而不是让浏览器在端口 18790 上尝试网关的公共主机名：

```json5
{
  mcp: {
    apps: {
      sandboxOrigin: "https://team-sandbox.example.com",
    },
  },
}
```

为指向 `<tunnel-id>.cfargotunnel.com` 的 `team-sandbox.example.com` 创建单独的代理 DNS CNAME，然后将 `team-sandbox.example.com -> http://localhost:18790` 在其包罗万象规则之前添加到隧道入口，如果不同，则使用配置的沙箱端口。单独添加入口规则不会创建 DNS 记录。请参阅 Cloudflare 的 [tunnel DNS 路由 ](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/)。将此主机名保留在交互式 Access 应用程序之外，并仅将其路由到沙箱侦听器，而不是主网关。沙箱服务于隔离的渲染器外壳；经过身份验证的小部件内容通过网关传输。不要将其他经过身份验证的应用程序放在沙箱源上。

即使未启用 MCP 应用程序，Canvas 也可以延迟启动此侦听器。仅当您需要该功能时才单独启用 MCP 应用程序；参见 [MCP Apps](/cli/mcp/apps)。设置后测试真实的小部件：正常的聊天页面并不能证明其 iframe 可以加载。

## <a id="7.-share-selected-sessions-from-another-gateway"></a><a id="7-share-selected-sessions-from-another-gateway"></a> 7。从另一个网关共享选定的会话

要在协作服务器上显示发布服务器对话，请配置 [Session Share](/plugins/session-share)。在源上，使用显式组启用插件：

```json5
{
  plugins: {
    entries: {
      "session-share": {
        enabled: true,
        config: { share: { groups: ["Team"] } },
      },
    },
  },
}
```

在接收器上，当环回网关没有其他通告的路由时，上面配置的 `gateway.publicOrigin` 提供加入端点。对于上面的访问服务令牌拓扑，请使用相同的 HTTPS 主机名。如果您操作单独的经过身份验证的计算机端点，请将 `plugins.entries.device-pair.config.publicUrl` 设置为其 URL：

```bash
openclaw plugins enable session-share
openclaw devices join-code
```

在回退到 `publicOrigin` 之前，加入代码保留现有的 Tailscale、远程和绑定派生路由。特定于配对的 `publicUrl` 覆盖优先于发现。不需要启用 `device-pair` 插件来创建核心连接代码。请参阅 [ 节点加入 ](/nodes/node-host)。

在源上，使用两个只读会话命令在源网关的帐户、状态目录和配置下运行节点：

```bash
openclaw connect <join-url> --service \
  --commands openclaw.sessions.list.v1,openclaw.sessions.read.v1
```

批准接收器上的预期设备并确认两个命令允许列表。将选定的源会话移动到 **Team** 组中。子代理和隐身会话仍被排除在外。删除群组会撤销新的阅读内容，但无法撤回某人已阅读的文本。

为配对节点 ID 配置的接收端 `linkGitHubIdentities: true` 可以将经过验证的远程 GitHub 帐户 ID 显示为匹配的本地配置文件。这是归属，而不是角色或所有权授予。视图保持只读状态；它不授权继续源会话或在那里执行命令。普通源会话 URL 仍然指向该源自己的 `publicOrigin` 并且需要源访问。

## <a id="8.-verify-the-complete-flow"></a><a id="8-verify-the-complete-flow"></a> 8。验证完整流程

使用主机检查和两个真实用户帐户：

1. 作为服务所有者运行`openclaw config validate --json`、`openclaw gateway status --deep`和`openclaw security audit`。解决意外暴露问题。
2. 确认未经身份验证的公共请求满足Access，然后登录并到达连接的Control UI。仅访问重定向并不能证明网关的健康状况。
3. 确认两个人的不同配置文件、administrator/member 行为和观察者限制。更改角色后重新连接。
4. 向代理询问当前会话的链接和不同的可见会话的链接。打开两者并检查主机和目标。缺失链接规则指向 `publicOrigin`，而不是 `allowedOrigins`。
5. 执行一个模型回合、预期的通道回复、一个小部件（如果启用）以及一个节点连接（如果使用）。在请求发布之前检查所选的 GitHub 帐户和实际存储库权限。
6. 如果共享会话，则从接收方读取选定的源会话，然后从源组中删除一次性共享会话，并验证新的接收方读取是否被拒绝。

## <a id="keep-operations-recoverable"></a> 保持操作可恢复

每次安装使用一个生命周期所有者。对于正常的托管安装，请使用 `openclaw update` 和本机网关服务命令。如果外部部署系统拥有该服务，请改用该所有者；不要与第二个更新程序、直接重新启动或就地源构建竞争。与团队协调中断并在激活后验证服务版本。请参阅[更新](/install/updating)和[重新启动恢复](/gateway/restart-recovery)。

协作服务器和发布服务器可以故意遵循不同的更新计划。明确每项政策；复制配置不应在其他服务器上静默启用自动部署。通过 `gateway.controlUi.environment` 保持视觉环境标签清晰。

在重大更新之前创建并验证备份：

```bash
openclaw backup create --verify
openclaw backup restore <archive.tar.gz> --target <fresh-restore-directory>
```

恢复命令暂存恢复数据；激活它是一个单独的离线操作。保护凭证和脱离主机的副本。使用本机备份所有者的 SQLite 快照，而不是复制实时 database/WAL 文件。不要通过用旧快照覆盖其当前数据库来回滚活动服务器。请参阅 [Backups](/install/backups)。

为依赖项、构建、SQLite 快照验证和备份分配永久磁盘和临时空间的预算。较大的可用根磁盘对较小的 `/tmp` 配额没有帮助。在实际服务环境中配置需要的临时空间，而不仅仅是SSH shell。在 Btrfs 上，检查元数据分配和保留的快照以及 `df`：删除文件后快照可以固定空间。仅淘汰已知的一次性数据和已完成的恢复点。

监视进程重新启动、准备情况、通道连接、存储和实际 session/model 故障。将事件警报保留在可能出现故障的网关之外。绿色 HTTP 根、安静的机器人或成功的 Access 登录不足以确定服务可以完成工作。

## <a id="troubleshooting"></a> 故障排查

| 症状                                                       | 检查                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 浏览器正常工作；代理无法提供会话链接             | 设置本服务器的`gateway.publicOrigin`；重新加载后准备新的回合。                                       |
| 访问成功但网关拒绝连接            | 检查环回信任、转发的客户端地址、所需的身份标头和 `allowedOrigins`。               |
| 管理员以观察员身份登录                         | 分配真实配置文件的管理角色并授予经过验证的身份 `operator.admin`，然后重新连接。  |
| OIDC 迁移创建了另一个人                         | 验证登录电子邮件并将其别名明确链接到现有配置文件。                                  |
| GitHub 登录看起来正确，但发布使用另一个帐户 | 分别检查 system/agent/personal 发布选择和存储库 Git 身份验证。              |
| 聊天可以工作，但小部件失败                                   | 检查不同的沙箱来源、隧道端口以及该主机名上是否存在交互式访问质询。 |
| Node 加入收到 HTTP 302                                   | 在每个所需的路由上提供机器访问身份验证。                                                    |
| 共享会话丢失或名称未链接              | 检查源组、节点 account/state、两个命令白名单、接收者角色以及经过验证的数字 GitHub ID。   |
| 尽管有可用磁盘，更新仍失败                                | 在重试之前检查服务临时空间配额、文件系统元数据和保留的快照。                |
