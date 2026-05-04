---
summary: "Zalo 个人插件：通过原生 zca-js 实现二维码登录 + 消息发送（插件安装 + 渠道配置 + 工具）"
read_when:
  - 你想在 OpenClaw 中支持 Zalo 个人版（非官方）
  - 你正在配置或开发 zalouser 插件
title: "Zalo 个人插件"
---

# Zalo 个人版（插件）

通过插件为 OpenClaw 提供 Zalo 个人版支持，使用原生 `zca-js` 自动化一个普通的 Zalo 用户账号。

<Warning>
非官方自动化可能导致账号被停用或封禁。请自行承担风险。
</Warning>

## 命名

渠道 id 使用 `zalouser`，以明确表示这是在自动化一个**个人 Zalo 用户账号**（非官方）。我们保留 `zalo`，以便将来可能接入官方 Zalo API。

## 运行位置

此插件运行在 **Gateway 进程内部**。

如果你使用远程 Gateway，请在**运行 Gateway 的机器**上安装/配置，然后重启 Gateway。

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 安装

### 选项 A：从 npm 安装

```bash
openclaw plugins install @openclaw/zalouser
```

使用裸包以跟随当前官方发布标签。只有在你需要可复现安装时才固定到某个精确版本。

之后重启 Gateway。

### 选项 B：从本地文件夹安装（开发）

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

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "来自 OpenClaw 的问候"
openclaw directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名称：`zalouser`

操作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

渠道消息操作还支持 `react`，用于消息表情回应。

## 相关内容

- [构建插件](/plugins/building-plugins)
- [社区插件](/plugins/community)
