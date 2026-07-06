---
summary: "通过外部 openclaw-zaloclawbot 插件进行 Zalo ClawBot 渠道设置"
read_when:
  - 你想要一个带二维码登录的个人 Zalo 助手机器人
  - 你正在安装或排查 openclaw-zaloclawbot 渠道插件
title: "Zalo ClawBot"
---

OpenClaw 通过目录中列出的外部 `@zalo-platforms/openclaw-zaloclawbot` 插件连接到 Zalo ClawBot。登录使用 Zalo Mini App 二维码；配置中的插件 id 为 `openclaw-zaloclawbot`。

## 兼容性

| 插件版本 | OpenClaw 版本 | npm dist-tag | 状态 |
| -------------- | ---------------- | ------------ | ------------- |
| 0.1.4          | >=2026.4.10      | `latest`     | 活跃 / 测试版 |

## 前置条件

- Node.js >= 22
- [OpenClaw](https://docs.openclaw.ai/install) 已安装（可用 `openclaw` CLI）
- 一个可在移动设备上扫描登录二维码的 Zalo 账户

## 使用 onboard 安装（推荐）

```bash
openclaw onboard
```

从频道菜单中选择 **Zalo ClawBot**。向导会从官方目录（已验证完整性）安装插件，在终端中渲染登录二维码，并在你使用 Zalo 应用扫描后完成频道设置。

## 手动安装

要将该渠道添加到已经接入的网关：

### 1. 安装插件

```bash
openclaw plugins install "@zalo-platforms/openclaw-zaloclawbot@0.1.4"
```

请使用精确锁定的版本，以便 OpenClaw 在安装期间根据目录完整性哈希验证该软件包。

### 2. 在配置中启用插件

```bash
openclaw config set plugins.entries.openclaw-zaloclawbot.enabled true
```

### 3. 生成二维码并登录

```bash
openclaw channels login --channel openclaw-zaloclawbot
```

使用 Zalo 移动应用扫描终端中渲染的二维码，在 Zalo Mini App 内接受使用条款，并授权该会话。

### 4. 重启网关

```bash
openclaw gateway restart
```

## 工作原理

不同于标准的 Zalo 渠道，它需要你注册自己的 Zalo 官方账号（OA）并配置静态开发者凭据，Zalo ClawBot 是在共享官方基础设施上的一个**绑定所有者的个人助手**：

1. **注册开通：** 扫描二维码后会跳转到一个 Zalo Mini App，它会将一个新创建的、私有的机器人绑定到共享官方 OA 下，并直接关联到你的 Zalo 用户 ID。
2. **绑定所有者的隐私：** 该机器人只与其所有者通信。来自其他用户的消息会在平台层被丢弃。
3. **官方 API 路径：** 该插件使用的是 Zalo Bot Platform APIs，而不是浏览器或 Web 会话自动化。

## 引擎内部

该插件通过一个持久的长轮询循环（`getUpdates`）与 Zalo 通信。对于本地桌面/终端网关运行，Webhook 默认处于禁用状态。消息在客户端侧处理，并映射到你的本地代理运行时。

该插件在 OpenClaw 状态目录下管理机器人凭据。请将该目录视为敏感目录，并按照与 OpenClaw 其余状态相同的访问控制和备份策略进行保护。

此插件的运行时完全存在于外部的 `@zalo-platforms/openclaw-zaloclawbot` 包中；下方除安装/配置之外的行为细节均来自插件维护者的说明，未经过 OpenClaw 核心源代码验证。

## 故障排查

- **二维码登录超时：** 登录令牌（`zbsk`）出于安全原因会在 5 分钟后过期。如果二维码在你扫描之前就过期了，请重新运行登录命令以生成新的二维码。
- **网关加载失败：** 请确认你的 OpenClaw 主机版本为 `2026.4.10` 或更高。较旧版本不支持此 ID 所需的外部 npm-plugin 安装账本。

## 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Zalo](/channels/zalo) - 捆绑的 Zalo Bot Creator / Marketplace 渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [Plugins](/tools/plugin) - 安装和管理插件
