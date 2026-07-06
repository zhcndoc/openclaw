---
summary: "Zalo 个人插件：通过原生 zca-js 实现二维码登录 + 消息发送（插件安装 + 渠道配置 + 工具）"
read_when:
  - 你想在 OpenClaw 中支持 Zalo 个人版（非官方）
  - 你正在配置或开发 zalouser 插件
title: "Zalo 个人插件"
---

通过使用原生 `zca-js` 的插件，为 OpenClaw 提供 Zalo Personal 支持，
自动化一个普通的 Zalo 用户账号。不需要外部 `zca`/`openzca` CLI 二进制文件。

<Warning>
非官方自动化可能导致账号被停用或封禁。请自行承担风险。
</Warning>

## 命名

Channel id 是 `zalouser`，以明确表示这会自动化一个 **个人 Zalo
用户账号**（非官方）。单独的 `zalo` channel id 是官方的、
捆绑的 Zalo Bot/webhook 集成 - 参见 [Zalo](/channels/zalo)。

## 运行位置

此插件运行在 **Gateway 进程内部**。对于远程 Gateway，
请在该主机上安装/配置它，然后重启 Gateway。

## 安装

### 来自 npm

```bash
openclaw plugins install @openclaw/zalouser
```

使用裸包以跟随当前官方发布标签；只有在你需要可复现的安装时才固定
一个精确版本。之后重启 Gateway。

### 来自本地文件夹（开发）

```bash
PLUGIN_SRC=./path/to/local/zalouser-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

之后重启 Gateway。

## 配置

渠道配置位于 `channels.zalouser` 下（不是 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

请参阅 [Zalo 个人渠道配置](/channels/zalouser)，了解 DM/群组访问控制、多账号设置、环境变量以及故障排除。

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels login --channel zalouser --account <name>
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "来自 OpenClaw 的你好"
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "name"
openclaw directory groups members --channel zalouser --group-id <id>
```

## Agent 工具

工具名称：`zalouser`

操作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

Channel 消息操作（不是 agent 工具）也支持 `react`，用于消息
反应。

## 相关内容

- [Zalo 个人频道配置](/channels/zalouser)
- [Zalo（官方 Bot/webhook 频道）](/channels/zalo)
- [构建插件](/plugins/building-plugins)
- [ClawHub](/clawhub)
