---
summary: "用于列出、安装、更新、检查和卸载 OpenClaw 插件的快速示例"
read_when:
  - 你想查看插件列表、安装、更新、检查或卸载的快速示例
  - 你想选择插件安装来源
  - 你想找到发布插件包的正确参考资料
title: "管理插件"
sidebarTitle: "管理插件"
doc-schema-version: 1
---

本页用于常见的插件管理命令。有关完整的命令
契约、标志、来源选择规则和边缘情况，请参见
[`openclaw plugins`](/cli/plugins)。

大多数安装流程如下：

1. 找到一个包
2. 从 ClawHub、npm、git 或本地路径安装它
3. 重启为你的通道提供服务的 Gateway
4. 验证插件的运行时注册

## 列出和搜索插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

脚本中使用 `--json`：

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是一次冷态清单检查。它显示 OpenClaw 能够从配置、清单和插件注册表中发现的内容；它并不能证明
某个已经运行的 Gateway 已导入该插件运行时。JSON 输出包含
注册表诊断信息，以及当插件包声明了 `dependencies` 或 `optionalDependencies` 时，
每个插件的静态 `dependencyStatus`。

`plugins search` 会查询 ClawHub 中可安装的插件包，并打印
安装提示，例如 `openclaw plugins install clawhub:<package>`。

## 安装插件

```bash
# 在 ClawHub 中搜索插件包。
openclaw plugins search "calendar"

# 从 ClawHub 安装。
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# 从 npm 安装。
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# 从本地 npm pack 产物安装。
openclaw plugins install npm-pack:<path.tgz>

# 从 git 或本地开发检出安装。
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

裸包规格会在启动切换期间从 npm 安装。需要确定性来源选择时，请使用
`clawhub:`、`npm:`、`git:` 或 `npm-pack:`。
如果裸名称匹配官方插件 id，OpenClaw 可以直接安装
目录条目。

仅当你有意覆盖现有安装目标时才使用 `--force`。对于已跟踪的 npm、ClawHub 或 hook-pack 安装的常规升级，请使用
`openclaw plugins update`。

## 重启和检查

安装插件代码后，重启为你的通道提供服务的 Gateway：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

当你需要证明插件已注册运行时
表面，例如工具、hooks、服务、Gateway 方法、HTTP 路由或
插件拥有的 CLI 命令时，请使用 `inspect --runtime`。普通的 `inspect` 和 `list` 只是冷态的清单、
配置和注册表检查。

## 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

当你传入插件 id 时，OpenClaw 会复用已跟踪的安装规格。已存储的
dist-tag，例如 `@beta`，以及精确固定版本会在后续
`update <plugin-id>` 运行中继续使用。

对于 npm 安装，你可以传入显式包规格来切换已跟踪
记录：

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二条命令会在插件之前被固定到精确版本或标签时，将其移回注册表的默认发布线。

当 `openclaw update` 运行在 beta 通道上时，插件记录可以优先
匹配 `@beta` 发布。有关精确回退和固定规则，请参见
[`openclaw plugins`](/cli/plugins#update)。

## 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

卸载会移除插件的配置条目、持久化的插件索引记录、
允许/拒绝列表条目，以及在适用时的链接加载路径。受管安装
目录会被移除，除非你传入 `--keep-files`。

在 Nix 模式下（`OPENCLAW_NIX_MODE=1`），插件安装、更新、卸载、启用
和禁用命令都会被禁用。请在 Nix 源中管理这些安装选择。

## 选择来源

| 来源        | 适用场景                                                                  | 示例                                                         |
| ----------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | 你想要 OpenClaw 原生的发现、扫描摘要、版本和提示                          | `openclaw plugins install clawhub:<package>`                   |
| npmjs.com    | 你已经在发布 JavaScript 包，或需要 npm dist-tag/私有注册表                 | `openclaw plugins install npm:@acme/openclaw-plugin`           |
| git         | 你想要仓库中的分支、标签或提交                                             | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径     | 你正在同一台机器上开发或测试插件                                           | `openclaw plugins install --link ./my-plugin`                  |
| npm pack     | 你想通过 npm 安装语义来验证本地包产物                                       | `openclaw plugins install npm-pack:<path.tgz>`                 |
| marketplace  | 你正在安装一个与 Claude 兼容的 marketplace 插件                            | `openclaw plugins install <plugin> --marketplace <source>`     |

## 发布插件

ClawHub 是 OpenClaw 插件的主要公开发现入口。发布到这里，
当你希望用户在安装前先看到插件元数据、版本历史、注册表
扫描结果和安装提示时使用。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

原生 npm 插件在发布前必须包含插件清单和包元数据：

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

请使用这些页面获取完整的发布契约，不要将本页
视为发布参考：

- [ClawHub publishing](/clawhub/publishing) 解释所有者、作用域、发布、审核、
  包验证和包转移。
- [Building plugins](/plugins/building-plugins) 展示插件包结构
  和首次发布工作流。
- [Plugin manifest](/plugins/manifest) 定义原生插件清单字段。

如果同一个包同时可在 ClawHub 和 npm 上获得，在需要强制使用某一来源时，
请使用显式的 `clawhub:` 或 `npm:` 前缀。

## 相关内容

- [Plugins](/tools/plugin) - 安装、配置、重启和故障排查
- [`openclaw plugins`](/cli/plugins) - 完整的 CLI 参考
- [Community plugins](/plugins/community) - 公开发现和 ClawHub 发布
- [ClawHub](/clawhub/cli) - 注册表 CLI 操作
- [Building plugins](/plugins/building-plugins) - 创建插件包
- [Plugin manifest](/plugins/manifest) - 清单和包元数据
