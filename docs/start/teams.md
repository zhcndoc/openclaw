---
summary: "为团队设置共享 OpenClaw 网关：工作区聊天、共享会话、所有权和角色"
read_when:
  - "为团队或共享工作区设置 OpenClaw"
  - "将队友添加到现有网关"
  - "在一个共享网关和单独网关之间做出选择"
title: "团队设置"
---

本指南设置了整个团队使用的一个 OpenClaw 网关：您已有的工作区聊天中的机器人、每个人都可以在 Control UI 中打开和引导的共享会话，以及限制每个人可以执行的操作的角色。它与[个人助理设置](/start/openclaw)是同一产品-团队操作是配置，而不是单独的版本。

对于具有 Cloudflare 访问、GitHub 身份同步、角色引导和操作的始终在线 Linux 部署，请遵循 [ 部署团队服务器](/gateway/team-server)。

## <a id="before-you-begin"></a> 开始之前

- A 用于保持开启状态的网关的主机：小型 VPS、办公室 Mac 或任何 [ 支持的安装目标 ](/install)。
- OpenClaw 在该主机上安装并登录 - 请参阅 [ 入门 ](/start/getting-started)。
- 团队已使用的 A 聊天工作区（Discord、Google Chat、Mattermost、Microsoft Teams、Slack、Telegram，...） - 请参阅[频道](/channels)。
- A强劲的最新一代模型。共享网关比单独设置看到更多不同的输入，并且现代模型对提示注入的抵抗力显着增强 - 请参阅 [Security](/gateway/security/prompt-injection)。
- 可选：队友的 GitHub 帐户（如果您想验证身份并提交信用）。

## <a id="one-trust-boundary"></a> One信任边界

网关是一个信任域。每个可以向支持工具的代理发送消息的人都共享该代理的委派工具权限，并且具有操作员访问权限的每个人都共享一个控制平面。对于成员已经相互信任的团队来说，这是正确的模型 - 会话所有权、存在和 [roles](/gateway/operator-scopes#named-operator-roles) 是边界内的协作护栏，而不是对手之间的隔离。

如果您需要为相互不信任的人员或组织提供服务，请改为为每个租户运行一个网关：[ 安全信任模型](/gateway/security/trust-model)。

## <a id="step-1%3A-give-the-team-access-to-the-gateway"></a><a id="step-1-give-the-team-access-to-the-gateway"></a> 第 1 步：授予团队访问网关的权限

网关默认绑定到环回。通过经过身份验证的入口而不是公共绑定为队友提供访问权限：

- **Tailnet（推荐）：** 将主机放在尾网上并启用 [Tailscale Serve](/gateway/tailscale)。通过 `gateway.auth.allowTailscale`、Control UI 登录可以使用每个人的 Tailscale 身份 - 无需分发共享密钥。
- **可信代理：**在网关前面使用身份感知代理，例如Cloudflare访问 - 请参阅[可信代理auth](/gateway/trusted-proxy-auth)。
- **共享秘密：** 令牌或密码身份验证适用于小型团队，但每个人都使用一个所有者配置文件而不是每个人的身份 - 请参阅 [Authentication](/gateway/authentication)。

身份支持的选项值得设置：它们将会话 UI 中的“某人做了某事”转变为“谁做了什么”，并在下面提交了信用。

## <a id="step-2%3A-connect-the-team-chat"></a><a id="step-2-connect-the-team-chat"></a> 第 2 步：连接团队聊天

连接您的团队所在的频道。示例：一个 Slack 机器人，允许在一个团队频道中，当提到时会回复：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      groupPolicy: "allowlist",
      channels: {
        "<SLACK_CHANNEL_ID>": { requireMention: true },
      },
    },
  },
}
```

群聊是一流的部署。默认情况下已经是团队形状了。每个房间都允许群组访问，并且回复时需要提及。私信保持配对默认设置：队友第一次私信机器人时，他们会获得配对代码。使用 `openclaw pairing approve slack <code>` 进行批准。因此，机器人会在接到指令时参与，否则保持安静。在您信任其成员的私人房间中，这就是您所需要的全部门控。对于宽阔或公共会议室，请添加发件人允许列表和 `contextVisibility` - 请参阅 [Groups](/channels/groups)。

如果应允许相同的人员跨多个频道，请将列表定义为 [ 访问组 ](/channels/access-groups) 并从每个频道的允许列表中引用它。

## <a id="step-3%3A-sign-the-team-in-to-the-control-ui"></a><a id="step-3-sign-the-team-in-to-the-control-ui"></a> 步骤 3：将团队登录到 Control UI

通过按人登录，每位队友通过步骤 1 的入口打开 [Control UI](/web/control-ui)。每个人都会获得持久的网关配置文件：显示名称、头像和每个人的外观首选项。共享秘密连接使用相同的所有者配置文件。通过 Cloudflare Access 或 Tailscale Serve，GitHub- 支持的登录验证配置文件背后的帐户 - 请参阅 [ 用户模型 ](/concepts/user-model)。

队友还可以在**插件→技能**下创建并导入[个人技能](/tools/skills#personal-skills-on-a-shared-gateway)，而无需更改共享网关配置。在与团队明确共享之前，技能始终是个人的。当另一个队友加入时，会话会保留其选定的修订版本；改变其受让人并不会取代其技能。您现有的工作空间技能仍然存在，并且一名操作员的额外渠道身份无法启用特定于团队的指导。

## <a id="step-4%3A-work-in-shared-sessions"></a><a id="step-4-work-in-shared-sessions"></a> 步骤 4：在共享会话中工作

在团队频道中开始的对话可以作为整个团队可以打开、引导和接管的会话继续。 [多用户模式](/concepts/multi-user)为每个会话提供三层归因：不可变的创建者、可分配的所有者以及实际提示者的历史记录。从会话上下文菜单中分配诸如 GitHub 问题的会话。多用户模式还添加了实时 [presence](/concepts/presence)。状态显示谁正在查看和谁正在打字，草稿永远不会到达模型或文字记录。

对于编码工作，经过验证的 GitHub 身份在提交时得到回报：启用 **Git 合著者 Credit** 后，来自共享会话的提交将为引导它的人员携带 `Co-authored-by` 预告片，并生成返回到会话的拉取请求链接，以便审阅者可以阅读产生差异的对话。

队友可以使用每个提供商提供的登录方法在 **设置 → 个人资料 → 连接帐户** 下添加自己的提供商帐户。他们的新会话更喜欢该帐户，而不将其设为网关范围的默认帐户。协作者使用会话的选定帐户，并且共享的同一提供商故障转移仍然可以应用 - 请参阅 [ 每人模型帐户](/concepts/multi-user#per-person-model-accounts)。

要让队友从个人网关读取选定的会话而不控制该计算机，请使用 [Session Share](/plugins/session-share)。源操作员选择会话组并配对仅通告两个只读会话命令的节点。共享的成绩单出现在团队 Control UI 的该节点下；查看需要查看其他会话的权限，并且不允许继续源会话。

## <a id="step-5%3A-bound-what-each-person-can-do"></a><a id="step-5-bound-what-each-person-can-do"></a> 步5：限制每个人可以做的事情

命名的操作员角色将经过身份验证的配置文件绑定到策略：他们可以接触哪些会话，他们可以使用哪些代理，操作员范围的最大集合，以及他们的新会话是否必须沙箱化：

```json5
{
  gateway: {
    roles: {
      default: "guest",
      definitions: {
        maintainer: {
          sessions: { others: "write" },
          agents: ["roboclaw"],
          scopes: ["operator.read", "operator.write", "operator.approvals"],
        },
        guest: {
          sessions: { others: "view" },
          agents: ["roboclaw"],
          scopes: ["operator.sessions.write"],
          sandbox: "required",
        },
      },
    },
  },
}
```

为来宾提供仅限会话的 `operator.sessions.write` 范围，该范围也允许读取。 `operator.read` 和 `operator.write` 是网关范围的：它们添加通道发送、节点和计算机控制、日志、用户目录以及访客不需要的其他共享表面。使用 `sessions.others: "view"`，来宾仍然可以读取每个共享会话，包括工具输出。将敏感工作保留在草稿会话中。

使用`users.setRole`网关方法分配角色；有关完整策略表面，请参阅 [ 命名操作员角色 ](/gateway/operator-scopes#named-operator-roles)；有关每会话工具状态，请参阅 [ 权限模式 ](/gateway/permission-modes)。要允许和终止个别外部访客，请参阅 [ 邀请访客 ](/gateway/team-server#invite-guests)。

### <a id="coding-as-a-guest"></a> 以访客身份编码

需要沙箱的来宾无需管理员角色即可工作。使用默认的 `workspaceAccess: "none"`，文件和 shell 工具使用可写的私有工作区，而不是共享代理工作区。托管技能指令保持只读状态。即使代理的默认沙盒模式关闭，子会话也会继承父会话的沙盒要求。

本地容器沙箱默认没有网络。如果来宾需要克隆公共存储库或安装项目本地依赖项，请显式启用编码代理的出站网络，例如：

```json5
{
  agents: {
    entries: {
      roboclaw: {
        sandbox: {
          workspaceAccess: "none",
          docker: { network: "bridge" },
        },
      },
    },
  },
}
```

网络访问不会授予主机执行或注入共享凭据。使用已安装所需运行时的沙箱映像；只读根文件系统仍然会阻止系统包安装。启用出口允许向容器可访问的目标发出请求，因此当访问需要更严格的控制时，请使用受限的容器网络。有关工作区和网络策略，请参阅 [Sandboxing](/gateway/sandboxing#workspace-access)。

来宾通过 **Publish PR** 从他们创建的会话中发布。发布使用共享的 GitHub 帐户并打开草稿拉取请求； OpenClaw 永远不会合并。使用 GitHub 规则保护基础分支，以便共享帐户无法合并或绕过审核。如果签出的 `origin` 是上游存储库，则来宾分支位于该存储库中，并且其拉取请求工作流接收存储库机密。将 `origin` 指向共享帐户拥有的分叉，以便来宾拉取请求来自分叉，其中 GitHub 默认保留 `pull_request` 工作流程的机密。请参阅 [ 工作流程和 CI 更改 ](/gateway/config-tools/github-identity#workflow-and-ci-changes)。

## <a id="verify"></a> 验证

- 在允许的团队频道中提及机器人并确认它在那里回复。
- 以两个不同的人身份打开 Control UI：两人都应该看到会话、其所有者头像以及彼此的存在。
- 在主机上运行 `openclaw security audit` 并解决其标记的有关入站访问或暴露的任何内容。

## <a id="when-to-split-things-up"></a> 何时拆分

- **单独的工作区或角色**（不得共享内存或文件的项目）：在一个网关上使用多个代理 - 请参阅[多代理路由](/concepts/multi-agent)。
- **相互不信任的用户、客户或组织：**单独的网关，理想情况下单独的OS用户或主机 - 请参阅[安全信任模型](/gateway/security/trust-model)和[安全](/gateway/security)。

## <a id="related"></a> 相关内容

- [为什么 OpenClaw：一起工作](/start/why-openclaw#working-together) - 团队协作集中在一处
- [多用户模式](/concepts/multi-user) - 所有权、参与者和所有者深度过滤
- [操作员范围](/gateway/operator-scopes) - 连接角色、范围和角色分配
- [Groups](/channels/groups) - 群组行为、提及门控和上下文可见性
- [Security](/gateway/security) - 一边界规则背后的信任模型
