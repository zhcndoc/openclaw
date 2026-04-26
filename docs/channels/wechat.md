---
summary: "通过外部 openclaw-weixin 插件设置微信频道"
read_when:
  - 您希望将 OpenClaw 与微信连接
  - 您正在安装或排查 openclaw-weixin 频道插件的问题
  - 您需要了解外部频道插件如何与网关协同运行
title: "微信"
---

OpenClaw 通过腾讯的外部
`@tencent-weixin/openclaw-weixin` 频道插件连接到微信。

状态：外部插件。支持直接聊天和媒体，不广播群聊。

## 命名

- **微信（WeChat）** 是文档中面向用户的名称。
- **微信（Weixin）** 是腾讯软件包和插件 ID 使用的名称。
- `openclaw-weixin` 是 OpenClaw 频道 ID。
- `@tencent-weixin/openclaw-weixin` 是 npm 包。

在 CLI 命令和配置路径中使用 `openclaw-weixin`。

## 工作原理

微信代码不位于 OpenClaw 核心仓库中。OpenClaw 提供通用频道插件契约，外部插件提供微信特定运行时：

1. `openclaw plugins install` 安装 `@tencent-weixin/openclaw-weixin`。
2. 网关发现插件清单并加载插件入口点。
3. 插件注册频道 ID `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 启动二维码登录。
5. 插件在 OpenClaw 状态目录下存储账户凭据。
6. 网关启动时，插件为每个配置的账户启动微信监控器。
7. 入站微信消息通过频道契约标准化，被路由到选定的 OpenClaw 代理，并通过插件出站路径发送回去。

这种分离很重要：OpenClaw 核心应保持频道无关性。微信登录、腾讯 iLink API 调用、媒体上传/下载、上下文令牌和账户监控均由外部插件管理。

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

安装后重启网关：

```bash
openclaw gateway restart
```

## 登录

在与运行网关的同一机器上运行二维码登录：

```bash
openclaw channels login --channel openclaw-weixin
```

使用手机微信扫描二维码并确认登录。插件在成功扫描后本地保存账户令牌。

要添加另一个微信账户，重复运行相同的登录命令。对于多个账户，通过账户、频道和发送者隔离直接消息会话：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## 访问控制

直接消息使用正常的 OpenClaw 配对和允许列表模型用于频道插件。

批准新发送者：

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

有关完整的访问控制模型，请参见 [配对](/channels/pairing)。

## 兼容性

插件在启动时检查宿主 OpenClaw 版本。

| 插件版本 | OpenClaw 版本        | npm 标签  |
| -------- | ----------------------- | -------- |
| `2.x`    | `>=2026.3.22`           | `latest` |
| `1.x`    | `>=2026.1.0 <2026.3.22` | `legacy` |

如果插件报告您的 OpenClaw 版本过旧，请更新 OpenClaw 或安装旧版本插件：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## 侧边进程

微信插件可以在网关旁边运行辅助进程，同时监控腾讯 iLink API。在问题 #68451 中，该辅助路径暴露了 OpenClaw 通用陈旧网关清理中的一个错误：子进程可能尝试清理父网关进程，导致在 systemd 等进程管理器下出现重启循环。

当前 OpenClaw 启动清理会排除当前进程及其祖先，因此频道辅助进程不得杀死启动它的网关。这是一个通用修复；它不是核心中的微信特定路径。

## 故障排查

检查安装和状态：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果频道显示已安装但未连接，请确认插件已启用并重启：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

如果启用微信后网关重复重启，请同时更新 OpenClaw 和插件：

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

临时禁用：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## 相关文档

- 频道概览：[聊天频道](/channels)
- 配对：[配对](/channels/pairing)
- 频道路由：[频道路由](/channels/channel-routing)
- 插件架构：[插件架构](/plugins/architecture)
- 频道插件 SDK：[频道插件 SDK](/plugins/sdk-channel-plugins)
- 外部软件包：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
