---
summary: "查找并发布由社区维护的 OpenClaw 插件"
read_when:
  - 你想查找第三方 OpenClaw 插件
  - 你想在 ClawHub 上发布或列出你自己的插件
title: "社区插件"
doc-schema-version: 1
---

社区插件是第三方包，可通过渠道、工具、提供者、钩子或其他功能扩展 OpenClaw。使用 [ClawHub](/clawhub) 作为公开社区插件的主要发现入口。

## 查找插件

从 CLI 中搜索 ClawHub：

```bash
openclaw plugins search "calendar"
```

使用显式源前缀安装 ClawHub 插件：

```bash
openclaw plugins install clawhub:<package-name>
```

在上线切换期间，npm 仍然是受支持的直接安装路径：

```bash
openclaw plugins install npm:<package-name>
```

使用 [管理插件](/plugins/manage-plugins) 查看常见的安装、更新、
检查和卸载示例。使用 [`openclaw plugins`](/cli/plugins) 查看
完整的命令参考和源选择规则。

## 发布插件

在 ClawHub 上发布公开的社区插件，让 OpenClaw 用户可以发现并安装它们。ClawHub 负责实时的包列表、发布历史、扫描状态和安装提示；文档不会维护静态的第三方插件目录。

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

在发布之前，请确保插件具备包元数据、插件清单、设置文档以及明确的维护负责人。ClawHub 会在创建发布之前验证所有者范围、包名称、版本、文件限制和源元数据，然后在审查和验证完成之前，将新的发布内容隐藏在正常的安装和下载入口之外。

发布前检查清单：

| 要求                 | 原因                                                |
| -------------------- | --------------------------------------------------- |
| 在 ClawHub 上发布     | 用户需要 `openclaw plugins install` 提示才能正常工作 |
| 公开的 GitHub 仓库    | 源码审查、问题跟踪、透明度                          |
| 设置和使用文档        | 用户需要知道如何进行配置                            |
| 持续维护              | 近期更新或对问题的及时响应                          |

完整发布协议：

- [ClawHub 发布](/clawhub/publishing) - 所有者、范围、发布版本、
  审查、包验证和包转移
- [构建插件](/plugins/building-plugins) - 插件包结构
  和首次发布工作流
- [插件清单](/plugins/manifest) - 原生插件清单字段

## 相关内容

- [插件](/tools/plugin) - 安装、配置、重启和故障排查
- [管理插件](/plugins/manage-plugins) - 命令示例
- [ClawHub 发布](/clawhub/publishing) - 发布和发行规则
