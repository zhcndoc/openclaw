---
summary: "Zalo 个人插件：QR 登录 + 通过本机 zca-js 消息传递（插件安装 + 频道配置 + 工具）"
read_when:
  - "您需要 Zalo OpenClaw 中的个人（非官方）支持"
  - "你正在配置或开发 zalouser 插件"
title: "Zalo 个人插件"
---

zalouser 插件为 OpenClaw 添加了非官方 Zalo 个人支持。它使用本机 `zca-js` 来自动化普通的 Zalo 用户帐户。不需要外部 `zca`/`openzca` CLI 二进制文件。

<Warning>
非官方自动化可能导致账号被停用或封禁。请自行承担风险。
</Warning>

## <a id="naming"></a> 命名

Channel id 是 `zalouser`，以明确表示这会自动化一个 **个人 Zalo 用户账号**（非官方）。单独的 `zalo` channel id 是官方的、 捆绑的 Zalo Bot/webhook 集成 - 参见 [Zalo](/channels/zalo)。

## <a id="where-it-runs"></a> 运行位置

该插件在网关进程**内运行**。对于远程网关，install/configure 位于该主机上。安装自动应用于正在运行的网关；如果离线，配置完成后启动。

## <a id="install"></a> 安装

### <a id="from-npm"></a> 来自 npm

```bash
openclaw plugins install @openclaw/zalouser
```

使用裸包遵循当前官方发布标签；仅当您需要可重复安装时才固定精确版本。检查安装的应用结果；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

### <a id="from-a-local-folder-(dev)"></a><a id="from-a-local-folder-dev"></a> 来自本地文件夹（开发）

```bash
cd ./path/to/local/zalouser-plugin
pnpm install
openclaw plugins install --link .
```

后续源或清单编辑后，运行 `openclaw plugins reload zalouser`。

## <a id="config"></a> 配置

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

有关 DM/group 访问控制、多帐户设置、环境变量和故障排除，请参阅 [Zalo 个人频道配置](/channels/zalouser)。

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels login --channel zalouser --account <name>
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "name"
openclaw directory groups members --channel zalouser --group-id <id>
```

## <a id="agent-tool"></a> 代理工具

工具名称：`zalouser`

操作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

Channel 消息操作（不是 agent 工具）也支持 `react`，用于消息反应。

## <a id="related"></a> 相关内容

- [Zalo 个人频道配置](/channels/zalouser)
- [Zalo（官方 Bot/webhook 频道）](/channels/zalo)
- [构建插件](/plugins/building-plugins)
- [ClawHub](/clawhub)
