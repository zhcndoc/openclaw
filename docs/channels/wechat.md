---
summary: "通过外部 openclaw-weixin 插件设置 WeChat 通道"
read_when:
  - "您想将OpenClaw连接到WeChat或微信"
  - "你正在安装或排查 openclaw-weixin 渠道插件"
  - "你需要了解外部渠道插件如何在 Gateway 旁运行"
title: "WeChat"
---

OpenClaw通过腾讯外部`@tencent-weixin/openclaw-weixin`通道插件连接到WeChat。

状态：外部插件，由腾讯微信团队维护。支持直接聊天和媒体。群聊未被插件能力元数据宣传（它仅声明支持直接聊天）。

## <a id="naming"></a> 命名

- **WeChat** 是这些文档中面向用户的名称。
- **Weixin** 是腾讯的包以及插件 id 中使用的名称。
- `openclaw-weixin` 是 OpenClaw 的渠道 id（`weixin` 和 `wechat` 可作为别名）。
- `@tencent-weixin/openclaw-weixin` 是 npm 包。

在 CLI 命令和配置路径中使用 `openclaw-weixin`。

## <a id="how-it-works"></a> 工作原理

WeChat 代码不在 OpenClaw 核心存储库中。 OpenClaw提供通用通道插件合约，外部插件提供WeChat-特定运行时：

1. `openclaw plugins install` 安装 `@tencent-weixin/openclaw-weixin`。
2. Gateway 发现插件清单并加载插件入口点。
3. 插件注册渠道 id `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 开始 QR 登录。
5. 插件将账号凭据存储在 OpenClaw 状态目录下 （默认是 `~/.openclaw`）。
6. 当 Gateway 启动时，插件会为每个已配置账号启动其微信监控器。
7. Inbound WeChat 消息通过通道合约进行规范化，路由到选定的 OpenClaw 代理，并通过插件出站路径发回。

这种分离很重要：OpenClaw 核心保持与通道无关。 WeChat 登录、腾讯 iLink API 通话、媒体 upload/download、上下文令牌和帐户监控均归外部插件所有。

## <a id="install"></a> 安装

快速安装：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

手动安装：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw plugins enable openclaw-weixin
```

插件命令将更改应用于正在运行的网关。查看[申请结果](/plugins/manage-plugins#apply-changes-and-inspect)；如果网关离线，则启动网关。

## <a id="login"></a> 登录

在运行网关的同一台计算机上运行 QR 登录：

```bash
openclaw channels login --channel openclaw-weixin
```

用手机上的WeChat扫描QR码并确认登录。成功扫描后，插件会将帐户令牌保存在本地。

要添加另一个 WeChat 帐户，请再次运行相同的登录命令。对于多个帐户，按帐户、渠道和发件人隔离直接消息会话：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## <a id="access-control"></a> 访问控制

版本 `2.4.8` 不会注册 OpenClaw 配对适配器或创建配对请求。标准配对列表和批准命令无法为此版本建立 DM 访问权限。 QR登录仍然可以让扫码的用户与机器人聊天。

此版本读取旧帐户白名单 JSON 文件，而不是 OpenClaw 的 SQLite 配对存储。当该列表为空时，它将回退到 QR 扫描仪的已保存用户 ID。如果两者都没有提供用户 ID，则其发件人检查会接纳其消息到达插件的任何发件人。

在当前的 OpenClaw 上，`openclaw doctor --fix` 将旧审批导入到 SQLite 并删除源文件。因此，之前批准的辅助发件人可能会失去 `2.4.8` 版本中的访问权限。撤销 SQLite 中的批准不会撤销插件的旧文件或扫描仪回退授予的访问权限。

请勿依赖标准配对来管理或撤销 `2.4.8` 版本的 DM 访问权限。如果您需要强制执行配对，[ 暂时禁用插件](/channels/wechat#troubleshooting)，直到有修复配对支持的版本可用。

有关实现 OpenClaw 的配对 API 的集成，请参阅 [Pairing](/channels/pairing)。

## <a id="compatibility"></a> 兼容性

该软件包声明了以下 OpenClaw 要求：

| 插件版本 | 声明 OpenClaw 要求 | npm 标签  |
| -------------- | ----------------------------- | -------- |
| `2.4.8`        | `>=2026.5.12`                 | `latest` |
| `1.x`          | `>=2026.1.0 <2026.3.22`       | `legacy` |

版本 `2.4.8` 声明 `>=2026.5.12`，但其启动版本防护仍然检查 `>=2026.3.22`。仅通过该警卫并不能满足声明的要求。

如果插件报告你的 OpenClaw 版本过旧，请更新 OpenClaw 或安装 legacy 插件分支：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

插件 2.4.6 导入已停用的 `openclaw/plugin-sdk/channel-runtime` 路径，并且无法加载到 OpenClaw 2026.8.1. 如果启动报告此子路径未导出，请更新到插件 2.4.8，该插件使用可用的 SDK 路径：

```bash
openclaw plugins update @tencent-weixin/openclaw-weixin@2.4.8
```

## <a id="sidecar-process"></a> Sidecar 进程

WeChat 插件可以在网关旁边运行辅助工作，同时监控腾讯 iLink API。在 [ 问题 #68451](https://github.com/openclaw/openclaw/issues/68451) 中，该帮助程序路径暴露了 OpenClaw 的通用陈旧网关清理中的错误：子进程可能会尝试清理父网关进程，从而导致 systemd 等进程管理器下的重新启动循环。

当前的 OpenClaw 启动清理排除了当前进程及其祖先，因此通道助手无法杀死启动它的网关。此修复是通用的； it is not a WeChat-specific path in core。

## <a id="troubleshooting"></a> 故障排查

检查安装和状态：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果通道显示为已安装但未连接，请启用它并检查正在运行的插件：

```bash
openclaw plugins enable openclaw-weixin
openclaw plugins inspect openclaw-weixin --runtime --json
```

如果启用 WeChat 后网关反复重启，请同时更新 OpenClaw 和插件：

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

如果启动报告已安装的插件包 `requires compiled runtime output for TypeScript entry`，则 npm 包已发布，但没有编译 JavaScript 运行时文件 OpenClaw 需要。插件发布者发布固定包后的 Update/reinstall ，或暂时 disable/uninstall 的插件。

临时禁用：

```bash
openclaw plugins disable openclaw-weixin
```

## <a id="related-docs"></a> 相关文档

- 频道概览：[聊天 Channels](/channels)
- 配对：[配对](/channels/pairing)
- 通道路由：[通道路由](/channels/channel-routing)
- 插件架构：[插件 Architecture](/plugins/architecture)
- 渠道插件 SDK：[渠道插件 SDK](/plugins/sdk-channel-plugins)
- 外部包：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
