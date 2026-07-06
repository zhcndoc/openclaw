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

常见的插件管理命令。有关完整的命令约定、标志、
来源选择规则以及边缘情况，请参阅 [`openclaw plugins`](/cli/plugins)。

典型工作流程：找到一个包，从 ClawHub、npm、git 或本地路径安装它，
让受管理的 Gateway 自动重启（或手动重启），
然后验证插件的运行时注册情况。

## 列出和搜索插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

`--json` 用于脚本：

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是一次冷态清单检查：OpenClaw 能从配置、清单以及持久化的插件注册表中发现什么。它并不能证明某个已运行的 Gateway 已经导入了插件运行时。JSON 输出包含注册表诊断信息以及每个插件的 `dependencyStatus`（即声明的 `dependencies`/`optionalDependencies` 是否能在磁盘上解析）。

`plugins search` 会查询 ClawHub 中可安装的插件包，并为每个结果打印一个安装提示（`openclaw plugins install clawhub:<package>`）。

## 启用和禁用插件

```bash
openclaw plugins enable <plugin-id>
openclaw plugins disable <plugin-id>
```

在不触碰已安装文件的情况下切换插件的配置项。一些
捆绑插件（捆绑的模型/语音提供方、捆绑的浏览器插件）
默认已启用；其他插件在安装后需要使用 `enable`。

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

# 从本地 npm-pack 工件安装。
openclaw plugins install npm-pack:<path.tgz>

# 从 git 或本地开发检出安装。
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

裸包规范会在启动切换期间从 npm 安装，除非名称与捆绑或官方插件 id 匹配，在这种情况下 OpenClaw 会改用该本地/官方副本。请使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:` 以实现确定性的源选择。

仅在需要覆盖来自不同来源的现有安装目标时使用 `--force`。对于已跟踪的 npm、ClawHub 或 hook-pack 安装的常规升级，请改用 `openclaw plugins update`；`--link` 不支持 `--force`。

## 重启和检查

启用了配置重载的正在运行的托管 Gateway 在安装、更新或卸载插件代码后会自动重启。  
如果 Gateway 是非托管的，或者已禁用重载，请在检查在线运行时表面之前手动重启它：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

`inspect --runtime` 会加载插件模块，并证明它已注册运行时表面（工具、钩子、服务、Gateway 方法、HTTP 路由、插件拥有的 CLI 命令）。普通的 `inspect` 和 `list` 仅进行冷态清单/配置/注册表检查。

## 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

传入插件 ID 会复用其已跟踪的安装规格：已保存的 dist-tag
（`@beta`）和精确锁定的版本都会沿用到后续的 `update <plugin-id>`
运行中。

`openclaw plugins update --all` 是批量维护路径。它仍然
遵循普通的已跟踪安装规格，但受信任的官方 OpenClaw
插件记录会同步到当前官方目录目标，而不是
继续停留在一个过时的精确官方包上；当 `update.channel` 为
`beta` 时，这种同步会优先选择 beta 发布线。使用有针对性的
`update <plugin-id>` 可以让精确或带标签的官方规格保持不变。

对于 npm 安装，请传入明确的包规格以切换已跟踪记录：

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二条命令会在插件先前被锁定到精确版本或标签时，将其移回
注册表的默认发布线。

有关确切的回退和锁定规则，请参见 [`openclaw plugins`](/cli/plugins#update)。

## 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

卸载会移除插件的配置项、持久化的插件索引记录、
允许/拒绝列表条目，以及在适用时关联的 `plugins.load.paths` 条目。
除非你传入 `--keep-files`，否则会删除受管理的安装目录。
当卸载更改了插件源时，正在运行的受管理 Gateway 会自动重启。

在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，插件的安装、更新、卸载、
启用和禁用都将被禁用；请改为在 Nix 源中管理这些安装选项。

## 选择来源

| 来源        | 适用场景                                                                  | 示例                                                         |
| ----------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | 你希望使用 OpenClaw 原生发现、扫描摘要、版本和提示                            | `openclaw plugins install clawhub:<package>`                   |
| git         | 你希望从仓库中获取分支、标签或提交                                           | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| local path  | 你正在同一台机器上开发或测试插件                                              | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | 你正在安装一个与 Claude 兼容的市场插件                                        | `openclaw plugins install <plugin> --marketplace <source>`     |
| npm pack    | 你正在通过 npm install 语义验证本地包制品                                     | `openclaw plugins install npm-pack:<path.tgz>`                 |
| npmjs.com   | 你已经在发布 JavaScript 包，或需要 npm dist-tags/私有仓库                      | `openclaw plugins install npm:@acme/openclaw-plugin`           |

受管理的本地路径安装必须是插件目录或归档文件。请将独立的插件文件放在
`plugins.load.paths` 中，而不是通过 `plugins install` 安装它们。

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

原生 npm 插件在发布前必须同时提供插件清单（`openclaw.plugin.json`）以及
`package.json` 元数据：

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

请使用以下页面了解完整的发布契约，而不是将此页面视为发布参考：

- [ClawHub 发布](/clawhub/publishing) 说明所有者、作用域、
  发布、审核、包验证和包转移。
- [构建插件](/plugins/building-plugins) 展示完整的插件
  包结构（包括 `openclaw.plugin.json`）以及首次发布
  工作流。
- [插件清单](/plugins/manifest) 定义原生插件清单
  字段。

如果同一个包同时在 ClawHub 和 npm 上可用，请使用明确的
`clawhub:` 或 `npm:` 前缀来强制指定来源。

## 相关内容

- [插件](/tools/plugin) - 安装、配置、重启和故障排查
- [`openclaw plugins`](/cli/plugins) - 完整的 CLI 参考
- [社区插件](/plugins/community) - 公开发现和 ClawHub 发布
- [ClawHub](/clawhub/cli) - 注册表 CLI 操作
- [构建插件](/plugins/building-plugins) - 创建插件包
- [插件清单](/plugins/manifest) - 清单和包元数据
