---
summary: "通过外部 openclaw-zaloclawbot 插件进行 Zalo ClawBot 渠道设置"
read_when:
  - "您想要一个具有 QR- 代码登录的个人 Zalo 助理机器人"
  - "你正在安装或排查 openclaw-zaloclawbot 渠道插件"
title: "Zalo ClawBot"
---

OpenClaw 通过目录列出的外部 `@zalo-platforms/openclaw-zaloclawbot` 插件连接到 Zalo ClawBot。登录使用Zalo小程序QR代码；配置中的插件 ID 是 `openclaw-zaloclawbot`。

<Note>
  该插件的运行时完全位于外部 `@zalo-platforms/openclaw-zaloclawbot` 包中。此页面上除安装和配置之外的行为详细信息由插件维护者报告，未根据 OpenClaw 核心源进行验证。
</Note>

## <a id="compatibility"></a> 兼容性

| 插件版本 | OpenClaw 版本 | npm 距离标签 | 状态        |
| -------------- | ---------------- | ------------ | ------------- |
| 0.1.4          | >=2026.4.10      | `latest`     | 活跃 / 测试版 |

## <a id="prerequisites"></a> 先决条件

- Node.js >= 22
- 已安装 [OpenClaw](/install)（`openclaw` CLI 可用）
- A Zalo 账户在移动设备上扫描登录QR码

## <a id="install-with-onboard-(recommended)"></a><a id="install-with-onboard-recommended"></a> 使用 onboard 安装（推荐）

```bash
openclaw onboard
```

从通道菜单中选择 **Zalo ClawBot**。该向导会从官方目录中安装插件（经过完整性验证），在终端中呈现登录名 QR，并在使用 Zalo 应用程序扫描后完成频道。

## <a id="manual-installation"></a> 手动安装

要将该渠道添加到已经接入的网关：

### <a id="1.-install-the-plugin"></a><a id="1-install-the-plugin"></a> 1. 安装插件

```bash
openclaw plugins install "@zalo-platforms/openclaw-zaloclawbot@0.1.4"
```

请使用精确锁定的版本，以便 OpenClaw 在安装期间根据目录完整性哈希验证该软件包。

<a id="2-enable-the-plugin-in-config" />

### <a id="2.-enable-the-plugin"></a><a id="2-enable-the-plugin"></a> 2。启用插件

```bash
openclaw plugins enable openclaw-zaloclawbot
```

登录前检查 [ 应用程序结果](/plugins/manage-plugins#apply-changes-and-inspect)。重新安装会保留您明确禁用的插件。

### <a id="3.-generate-a-qr-code-and-log-in"></a><a id="3-generate-a-qr-code-and-log-in"></a> 3。生成QR代码并登录

```bash
openclaw channels login --channel openclaw-zaloclawbot
```

使用Zalo移动应用扫描终端渲染的QR代码，接受Zalo迷你应用内的使用条款，并授权会话。

<a id="4-restart-the-gateway" />

### <a id="4.-verify-the-channel"></a><a id="4-verify-the-channel"></a> 4。验证通道

```bash
openclaw channels status --probe
```

如果网关离线，请启动网关。配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。如果正在运行的通道未获取已保存的登录名，请运行 `openclaw plugins reload openclaw-zaloclawbot`，然后再次检查其状态。

## <a id="how-it-works"></a> 工作原理

不同于标准的 Zalo 渠道，它需要你注册自己的 Zalo 官方账号（OA）并配置静态开发者凭据，Zalo ClawBot 是在共享官方基础设施上的一个**绑定所有者的个人助手**：

1. **Onboarding：** QR 代码解析为 Zalo 迷你应用程序，该应用程序将共享官方 OA 下新配置的私有机器人直接绑定到您的 Zalo 用户ID。
2. **绑定所有者的隐私：** 该机器人只与其所有者通信。来自其他用户的消息会在平台层被丢弃。
3. **官方 API 路径：** 该插件使用的是 Zalo Bot Platform APIs，而不是浏览器或 Web 会话自动化。

## <a id="under-the-hood"></a> 引擎内部

该插件通过持久长轮询循环 （`getUpdates`） 与 Zalo 进行通信。默认情况下，本地 desktop/terminal 网关运行的 Webhook 处于禁用状态。消息在客户端进行处理并映射到本地代理运行时。

该插件在 OpenClaw 状态目录下管理机器人凭据。请将该目录视为敏感目录，并按照与 OpenClaw 其余状态相同的访问控制和备份策略进行保护。

## <a id="troubleshooting"></a> 故障排查

- **QR 登录超时：** 出于安全考虑，登录令牌 （`zbsk`） 在 5 分钟后过期。如果 QR 代码在扫描之前已过期，请重新运行登录命令以生成新代码。
- **网关加载失败：**确认您的OpenClaw主机版本为`2026.4.10`或更高版本。旧版本不支持 ID 所需的外部 npm- 插件安装分类帐。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Zalo](/channels/zalo) - 捆绑的 Zalo Bot Creator / Marketplace 渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [Plugins](/tools/plugin) - 安装和管理插件
