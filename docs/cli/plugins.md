---
summary: "CLI `openclaw plugins` 的参考（初始化、构建、验证、列出、安装、重新加载、市场、卸载、enable/disable、医生）"
read_when:
  - "你想安装或管理网关插件或兼容捆绑包"
  - "你想为简单的工具插件搭建脚手架或验证"
  - "你想调试插件加载失败问题"
title: "插件 CLI"
sidebarTitle: "插件"
---

# `openclaw plugins`

管理网关插件、钩子包和兼容捆绑包。

当网关运行时，安装、卸载、启用、禁用和重新加载使用其现有的网关路由。地方后备措施需要独家的线下国家所有权。在运行 `plugins update`、`plugins registry --refresh`、市场源刷新或 hook-pack 安装回退之前，通过其服务所有者停止网关。 `plugins marketplace entries --offline` 读取保存的提要而不刷新它。拒绝的命令报告如何重试。

当插件或配置操作正在运行时，CLI 仅在网关确认其不接受突变时才会等待并重试。入场费用保持在司令部现有的十分钟预算范围内，包括 `plugins reload --wait`。中断该命令会取消待处理的准入重试。一个已经被接受的突变可能仍然会完成；在重试之前检查插件状态。丢失回复和接受后失败会报告，但不会自动重播；在重试之前检查插件状态。不提供准入事实的旧网关保留显式忙响应。

如果命令遇到数据库离线维护，则报告原因，但不带 `OPENCLAW_DEBUG`。等待维护完成，然后重试该命令。

`plugins enable` 和 `plugins disable` 接受不区分大小写的插件 ID，包括当网关停止时。报告的 ID 保留其明显拼写；配置中的插件策略键使用所需的小写形式。相同的策略适用于实时激活和下一次网关启动。运行时 ID 和网关方法名称保留插件声明的拼写。

<CardGroup cols={2}>
  <Card title="插件系统" href="/tools/plugin">
    安装、启用和排查插件问题的最终用户指南。
  </Card>
  <Card title="管理插件" href="/plugins/manage-plugins">
    安装、列出、更新、卸载和发布的快速示例。
  </Card>
  <Card title="插件捆绑包" href="/plugins/bundles">
    捆绑包兼容性模型。
  </Card>
  <Card title="插件清单" href="/plugins/manifest">
    清单字段和配置模式。
  </Card>
  <Card title="安全" href="/gateway/security">
    为插件安装提供安全加固。
  </Card>
</CardGroup>

## <a id="commands"></a> 命令

```bash
openclaw plugins list [--enabled] [--verbose] [--json]
openclaw plugins search <query> [--limit <n>] [--json]
openclaw plugins install <path-or-spec> [--link] [--force] [--pin] [--no-enable] [--accept-capabilities] [--acknowledge-install-policy-warning] [--marketplace <source>]
openclaw plugins inspect <id> [--runtime] [--json]
openclaw plugins inspect --all [--runtime] [--json]
openclaw plugins info <id>                    # alias for inspect
openclaw plugins enable <ids...> [--accept-capabilities]
openclaw plugins disable <ids...>
openclaw plugins reload <ids...> [--wait] [--accept-capabilities] [--json]
openclaw plugins uninstall <ids...> [--dry-run] [--keep-files] [--force]
openclaw plugins update <ids-or-npm-specs...> | --all [--dry-run]
openclaw plugins registry [--refresh] [--json]
openclaw plugins doctor [--json]
openclaw plugins init <id> [--name <name>] [--type tool|provider|feature] [--directory <path>]
openclaw plugins build [--root <path>] [--entry <path>] [--check]
openclaw plugins validate [--root <path>] [--entry <path>] [--json]
openclaw plugins pack [--root <path>] [--out <file.tgz>] [--json]
openclaw plugins marketplace entries [--offline] [--feed-profile <name>] [--json]
openclaw plugins marketplace list <source> [--json]
openclaw plugins marketplace refresh [--feed-profile <name>] [--expected-sha256 <sha256>] [--json]
```

对于缓慢的安装、检查、卸载或 registry-refresh 排查，请使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。该跟踪会将各阶段耗时写入 stderr，并保持 JSON 输出可解析。参见 [调试](/help/debugging#plugin-lifecycle-trace)。

<Note>
在 Nix 模式 （`OPENCLAW_NIX_MODE=1`） 下，`openclaw.json` 是不可变的。 `install`、`update`、`uninstall`、`enable` 和 `disable` 均拒绝运行。管理此安装的 Nix 源中的这些选择（对于 nix-openclaw 为 `programs.openclaw.config` 或 `instances.<name>.config`），然后重建。当不需要记录新的能力同意时，重新加载仍然可用；它保留配置和安装状态。请参阅代理优先 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。
</Note>

<Note>
捆绑插件随 OpenClaw 一起提供。默认情况下启用了略多于一半的功能——主要是模型和语音提供程序，还有其他一些提供程序，例如捆绑的浏览器插件。其他捆绑插件需要显式启用或相关配置。启用并不意味着当前正在使用。提供程序的使用取决于配置和请求。需要身份验证的提供商需要凭证；无钥匙提供商如 Microsoft 语音则没有。 `plugins list` 中启用的条目并不意味着该插件正在工作。

原生 OpenClaw 插件会随 `openclaw.plugin.json` 一起提供，并内嵌 JSON Schema（`configSchema`，即使为空也是如此）。兼容的捆绑包则使用各自的 bundle manifest。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细 list/info 输出还显示捆绑包子类型（`agent (Agent Plugins)`、`codex`、`claude` 或 `cursor`）以及检测到的捆绑包功能。
</Note>

## <a id="plugins-pages"></a> 插件页面

此页是一个索引。 `openclaw plugins` 共六页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                              | 读它的时候                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [作者插件](/cli/plugins/authoring)                          | 您正在创建、构建、验证或打包插件项目。             |
| [安装插件](/cli/plugins/install)                           | 您将从 ClawHub、npm、git、路径、存档或市场进行安装。 |
| [列出已安装的插件](/cli/plugins/list)                       | 您需要安装的清单、发现诊断或插件索引。    |
| [卸载和更新插件](/cli/plugins/uninstall-and-update) | 您正在删除或重新加载插件，或更新其版本和源。      |
| [检查和诊断插件](/cli/plugins/inspect-and-diagnose) | 您需要插件标识、运行时注册、加载错误或注册表状态。 |
| [市场供稿](/cli/plugins/marketplace)                     | 您正在浏览、列出或刷新市场或托管签名源。    |

## <a id="where-each-section-moved"></a> 各部分移动的地方

以前的单页版本中的每个部分锚点都会在此处保留其 id，因此现有链接（例如 `/cli/plugins#registry`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="author" />[作者](/cli/plugins/authoring#author)
- <a id="feature-scaffold-and-artifacts" />[特征脚手架和工件](/cli/plugins/authoring#feature-scaffold-and-artifacts)
- <a id="provider-scaffold" />[供应商脚手架](/cli/plugins/authoring#provider-scaffold)
- <a id="install" />[安装](/cli/plugins/install#install)
- <a id="config-includes-and-invalid-config-repair" />[配置包括和无效配置修复](/cli/plugins/install#config-includes-and-invalid-config-repair)
- <a id="force-confirmation-and-reinstall-vs-update" />[`--force` 确认并重新安装与更新](/cli/plugins/install#force-confirmation-and-reinstall-vs-update)
- <a id="pin-scope" />[`--pin`范围](/cli/plugins/install#pin-scope)
- <a id="acknowledge-install-policy-warning" />[`--acknowledge-install-policy-warning`](/cli/plugins/install#acknowledge-install-policy-warning)
- <a id="clawhub-security-audit" />[ClawHub 安全 Audit](/cli/plugins/install#clawhub-security-audit)
- <a id="hook-packs-and-npm-specs" />[H钩包和npm规格](/cli/plugins/install#hook-packs-and-npm-specs)
- <a id="git-repositories" />[Git 存储库](/cli/plugins/install#git-repositories)
- <a id="archives" />[档案](/cli/plugins/install#archives)
- <a id="marketplace-shorthand" />[市场简写](/cli/plugins/install#marketplace-shorthand)
- <a id="marketplace-sources" />[市场来源](/cli/plugins/install#marketplace-sources)
- <a id="remote-marketplace-rules" />[远程市场规则](/cli/plugins/install#remote-marketplace-rules)
- <a id="list" />[列表](/cli/plugins/list#list)
- <a id="param-enabled" />[`--enabled`](/cli/plugins/list#param-enabled)
- <a id="param-verbose" />[`--verbose`](/cli/plugins/list#param-verbose)
- <a id="param-json" />[`--json`](/cli/plugins/list#param-json)
- <a id="plugin-index" />[插件索引](/cli/plugins/list#plugin-index)
- <a id="reload" />[重新加载](/cli/plugins/uninstall-and-update#reload)
- <a id="uninstall" />[卸载](/cli/plugins/uninstall-and-update#uninstall)
- <a id="update" />[更新](/cli/plugins/uninstall-and-update#update)
- <a id="resolving-plugin-id-vs-npm-spec" />[解析插件ID与npm规范](/cli/plugins/uninstall-and-update#resolving-plugin-id-vs-npm-spec)
- <a id="beta-channel-updates" />[Beta 通道更新](/cli/plugins/uninstall-and-update#beta-channel-updates)
- <a id="existing-plugin-source-choices" />[现有插件源选择](/cli/plugins/uninstall-and-update#existing-plugin-source-choices)
- <a id="version-checks-and-integrity-drift" />[版本检查和完整性漂移](/cli/plugins/uninstall-and-update#version-checks-and-integrity-drift)
- <a id="acknowledge-install-policy-warning-on-update" />[`--acknowledge-install-policy-warning` 更新](/cli/plugins/uninstall-and-update#acknowledge-install-policy-warning-on-update)
- <a id="clawhub-security-audit-on-update" />[ClawHub 更新安全审核](/cli/plugins/uninstall-and-update#clawhub-security-audit-on-update)
- <a id="inspect" />[检查](/cli/plugins/inspect-and-diagnose#inspect)
- <a id="doctor" />[医生](/cli/plugins/inspect-and-diagnose#doctor)
- <a id="registry" />[注册表](/cli/plugins/inspect-and-diagnose#registry)
- <a id="marketplace" />[市场](/cli/plugins/marketplace#marketplace)

## <a id="related"></a> 相关内容

- [构建插件](/plugins/building-plugins)
- [CLI 参考](/cli)
- [ClawHub](/clawhub)
- [ClawHub CLI](/clawhub/cli) - 独立注册表命令
- [ClawHub 发布](/clawhub/publishing) - 所有者、范围和发布审核
