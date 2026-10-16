---
summary: "OpenClaw 如何审查依赖项更改并打包插件运行时依赖项"
read_when:
  - "您正在审查依赖性变更或供应链风险"
  - "您在发布之前验证根或插件 npm 包"
  - "您想了解捆绑插件的依赖关系"
title: "依赖锁定"
---

作为依赖项审查者或发布工程师阅读此页面：它涵盖了审查供应链风险的依赖项更改，以及在发布之前验证根和插件 npm 包。

OpenClaw 使用 `pnpm-lock.yaml` 作为其承诺的产品依赖性审查边界。它记录了源签出和 CI 使用的已解析依赖关系图，因此传递更改在代码审查中仍然可见。

OpenClaw 不会提交产品包的 npm- 格式锁或在包 tarball 中发布它们。 [npm 12 删除了收缩包装支持 ](https://github.com/npm/cli/releases/tag/v12.0.0)，包括 `npm shrinkwrap` 命令以及从包根或依赖项 tarball 加载 `npm-shrinkwrap.json`。

受信任的 ClawHub 和 Vercel 发布工具链是单独的例外：`.github/release/clawhub-cli/package-lock.json` 和 `.github/release/vercel-cli/package-lock.json` 是发布自动化使用的提交的 npm 项目锁。两者均未采用 OpenClaw 包装发货。

这些项目不继承根 pnpm 覆盖。 Vercel 项目使用经过批准的版本范围 npm 覆盖易受攻击的上游引脚；当其所属的依赖项接受固定版本时，删除每个覆盖。锁定审核涵盖已解析的包标识，而不是已捆绑到上游 CLI 工件中的代码。

## <a id="check-dependency-advisories"></a> 检查依赖性建议

普通的拉取请求、推送和计划的 CI 不运行生产依赖性审计。 `security-fast` 作业仅针对以 `full-release-validation-` 或 `release-native-android-` 开头的 `workflow_dispatch` ID 运行它。这些发布检查和可选的生产审核预提交挂钩打印审核结果，并将每个审核失败转换为退出代码 0 的警告，包括不可用或无效的咨询数据。依赖项建议永远不会阻止 CI、本地提交或发布验证。

单独的每日 [ 依赖性审计工作流程 ](/ci/scheduled-workflows#dependency-audit) 仍然严格：调查结果、不可用的建议或无效数据可以将其保留为红色作为分类信号，但这不是必需的 PR 检查。调查该信号并跟进 `main` 上的依赖性碰撞。这些零安装检查查询产品生产图的 npm 批量咨询数据，而不是上游存储库建议。通过的结果仅限于该来源和图表；它并不能证明依赖关系不受所有已知漏洞的影响。

`pnpm deps:vuln:gate` 由发布依赖性证据使用，审计目标的产品 pnpm 锁以及其包存在于该目标中的每个发布工具锁。它检查 npm 咨询数据并添加来自经过验证的公共 GitHub 存储库的已发布安全建议。存储库映射来自精确锁定的 npm 软件包版本的清单，而不是软件包的最新清单。在使用显式 `state=published` 过滤器请求建议之前，该门会验证每个存储库是否是公开的。它不会扫描私人存储库或未发布的建议。

已知的恶意软件是唯一的阻止类别：任何经过审核的锁定文件中任何位置的恶意软件公告都会失败并停止发布，因为它标记的是受损的程序包而不是漏洞报告。每个图表中的每种严重性的漏洞建议都会被无阻塞地记录：门将每个漏洞打印为 GitHub Actions 警告注释，并且发布依赖性证据摘要将它们列在“非阻塞建议结果”下。新发布的公告绝不会延迟发布；发布后通过 `main` 上的正常依赖项修复它。 GitHub 的 `medium` 严重性映射到这些报告中的 `moderate`。上游发现将 npm 软件包标识和受影响的版本范围与确切的锁定版本进行匹配；仅添加相应锁定文件和图表的 npm 结果中缺少的匹配项。报告保留源锁定文件，因此发布工具的发现并不意味着产品运行时暴露。声明的依赖图的锁丢失或无效会使门失败。

发布自动化仅针对 GitHub API 请求重用其现有标准 `GH_TOKEN`，而绝不会针对 npm 注册表请求。没有该令牌的本地运行使用匿名 GitHub 请求及其速率限制。不需要新的 OpenClaw 配置或操作员凭证设置。

### <a id="interpret-coverage"></a> 解读覆盖范围

发布工件和 GitHub 操作步骤摘要显示 npm 覆盖范围为 `checked`、上游覆盖范围为 `checked` 或 `partial`、映射的包版本计数、检查的存储库计数、覆盖问题和仅限上游的结果。调查结果表明其来源为 `npm-bulk` 或 `github-repository`；上游发现还记录了匹配的锁定版本。即使 `checked` 的覆盖范围也仅限于这些咨询来源，并不能保证所有漏洞都已被排除。

上游扫描具有固定范围：2,500 个精确包版本、4,000 个 HTTP 请求，每次运行五分钟。它使用四个并发请求，每个存储库最多 5 页，每页 100 个建议，每次运行最多 10,000 个建议。每个响应限制为 2 MiB，每个请求限制为 15 秒。它不会重试或重用过时的缓存结果。

每个存储库页面的匹配结果会保留所有工作人员的请求容量，并在该任务继续发现之前根据 GitHub 审查的咨询范围进行检查。这可以防止以后的存储库扫描消耗协调已发现的结果所需的预算。缺少经过审查的证据保留了出版商的发现并记录了部分报道。

存储库元数据丢失或不受支持、受影响版本范围格式错误、请求或分页预算耗尽以及请求或速率限制失败会产生 `partial` 上游覆盖，而不是不受影响的结果。已确认的调查结果仍保留在同一政策下的报告中。在解释零发现结果之前，检查覆盖范围问题的主题和原因。

## <a id="published-package-behavior"></a> 发布的包行为

默认情况下，已发布的 OpenClaw 插件包将其运行时依赖文件捆绑在 tarball 中。这些字节随插件一起提供，并以相同的方式工作，无论操作员是否使用 npm、pnpm 或 Bun。

本机重插件选择退出运行时依赖项捆绑，因为它们的依赖项树包含特定于平台的或大型本机工件。这些插件在安装时从精确固定的直接依赖关系中解析依赖关系。根 `openclaw` 包还在安装时解析依赖关系，并且不捆绑其完整依赖关系树。

在准备带有捆绑依赖项的包时，OpenClaw 还会使用经过验证的 npm 依赖关系图将其提升的可选平台包声明为根 `optionalDependencies`。这保留了 npm 10 全局安装的平台过滤，包括禁用生命周期脚本的安装，而无需删除已修补的捆绑运行时。

捆绑的 Anthropic 插件直接与单独安装的 `claude` 可执行文件通信。它不依赖于 Claude 代理 SDK 也不将其复制到 OpenClaw 的包中。外部ACPX插件独立声明了一个依赖于SDK的ACP适配器； ACPX 将这些依赖项留给从 npm 安装，而不是将它们捆绑到其发布的包中。

这两个路径都不发布锁定文件：

- root 和插件 tarball 既不包含 `npm-shrinkwrap.json` 也不包含 `package-lock.json`；
- `pnpm-lock.yaml` 仍然是经过审查的源依赖图；
- 当 OpenClaw 验证包图或运行 `npm ci` 来组装捆绑插件时，npm 包锁仅暂时存在。

## <a id="validate-npm-dependency-graphs"></a> 验证 npm 依赖关系图

npm-lock 检查器在临时目录中生成 `package-lock.json`，应用工作区覆盖，并拒绝 `pnpm-lock.yaml` 中缺少的任何生成的注册表版本。它保留 `optional` 元数据，并验证每个声明的 `os`、`cpu` 和 `libc` 约束是否与 pnpm 锁匹配。它不会将锁定文件写入结账中。

```bash
# Root and every publishable package
pnpm deps:npm-lock:check

# Only packages affected by the current changeset
pnpm deps:npm-lock:check:changed
```

## <a id="inspect-a-plugin-tarball"></a> 检查插件 tarball

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep -E '^package/(npm-shrinkwrap|package-lock)\.json$' && exit 1 || true
```

`node_modules` 条目证明该插件携带其捆绑的运行时负载。最终检查证明 npm 锁定文件格式均未包含在 tarball 中。

## <a id="related"></a> 相关内容

- [发布性能扫描](/reference/release-performance-sweep) - 2026 年 5 月的包大小、依赖项和收缩包装审计此策略来自
