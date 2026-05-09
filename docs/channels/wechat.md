---
summary: "通过外部 openclaw-weixin 插件进行微信渠道设置"
read_when:
  - 你想将 OpenClaw 连接到微信或 Weixin
  - 你正在安装或排查 openclaw-weixin 渠道插件
  - 你需要了解外部渠道插件如何在 Gateway 旁运行
title: "微信"
---

OpenClaw 通过腾讯的外部
`@tencent-weixin/openclaw-weixin` 渠道插件连接到微信。

状态：外部插件。支持私聊和媒体。不支持群聊，
当前插件能力元数据中也未声明群聊支持。

## 命名

- **微信** 是本文档中面向用户的名称。
- **Weixin** 是腾讯包名以及插件 id 中使用的名称。
- `openclaw-weixin` 是 OpenClaw 的渠道 id。
- `@tencent-weixin/openclaw-weixin` 是 npm 包。

在 CLI 命令和配置路径中使用 `openclaw-weixin`。

## 工作原理

微信代码不在 OpenClaw 核心仓库中。OpenClaw 提供通用的渠道插件契约，而外部插件提供微信特定的运行时：

1. `openclaw plugins install` 安装 `@tencent-weixin/openclaw-weixin`。
2. Gateway 发现插件清单并加载插件入口。
3. 插件注册渠道 id `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 启动二维码登录。
5. 插件将账号凭据存储在 OpenClaw 状态目录下。
6. 当 Gateway 启动时，插件会为每个已配置账号启动其 Weixin 监控器。
7. 传入的微信消息会通过渠道契约进行规范化，路由到选定的 OpenClaw 代理，然后通过插件的出站路径发回。

这种分离很重要：OpenClaw 核心应保持与渠道无关。微信登录、腾讯 iLink API 调用、媒体上传/下载、上下文令牌以及账号监控都由外部插件负责。

## 安装

快速安装：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

手动安装：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

安装后重启 Gateway：

```bash
openclaw gateway restart
```

## 登录

在运行 Gateway 的同一台机器上执行二维码登录：

```bash
openclaw channels login --channel openclaw-weixin
```

使用手机上的微信扫描二维码并确认登录。插件会在成功扫描后将账号令牌保存在本地。

要添加另一个微信账号，再次运行相同的登录命令。对于多个账号，请按账号、渠道和发送者隔离私聊会话：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## 访问控制

对于渠道插件，私聊使用标准的 OpenClaw 配对和允许名单模型。

批准新的发送者：

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

有关完整的访问控制模型，请参见 [Pairing](/channels/pairing)。

## 兼容性

插件会在启动时检查宿主 OpenClaw 版本。

| Plugin line | OpenClaw version        | npm tag  |
| ----------- | ----------------------- | -------- |
| `2.x`       | `>=2026.3.22`           | `latest` |
| `1.x`       | `>=2026.1.0 <2026.3.22` | `legacy` |

如果插件报告你的 OpenClaw 版本过旧，请更新 OpenClaw 或安装 legacy 插件分支：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Sidecar 进程

当微信插件监控腾讯 iLink API 时，它可以在 Gateway 旁运行辅助工作。在 issue #68451 中，该辅助路径暴露了 OpenClaw 通用 stale-Gateway 清理中的一个 bug：子进程可能会尝试清理父 Gateway 进程，导致 systemd 等进程管理器下出现重启循环。

当前 OpenClaw 启动清理会排除当前进程及其祖先，因此渠道辅助进程不得终止启动它的 Gateway。这个修复是通用的；它不是核心中的微信特定路径。

## 故障排查

检查安装和状态：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果渠道显示已安装但无法连接，请确认插件已启用并重启：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

如果在启用微信后 Gateway 反复重启，请同时更新 OpenClaw 和插件：

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

如果启动时报告已安装的插件包 `requires compiled runtime
output for TypeScript entry`，则说明该 npm 包发布时未包含 OpenClaw 需要的已编译
JavaScript 运行时文件。请在插件发布者提供修复后的包之后更新/重新安装，或者暂时禁用/卸载该插件。

临时禁用：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## 相关文档

- 渠道概览：[Chat Channels](/channels)
- Pairing：[Pairing](/channels/pairing)
- 渠道路由：[Channel Routing](/channels/channel-routing)
- 插件架构：[Plugin Architecture](/plugins/architecture)
- 渠道插件 SDK：[Channel Plugin SDK](/plugins/sdk-channel-plugins)
- 外部包：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
