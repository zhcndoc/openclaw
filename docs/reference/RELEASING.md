---
doc-schema-version: 1
summary: "OpenClaw 发布渠道、版本号、验证和已发布资产"
title: "发布策略"
read_when:
  - "选择发布渠道"
  - "了解版本号和版本检查"
  - "检查已发布哪些软件包和应用程序"
---

OpenClaw 提供适合日常使用的稳定版本、用于测试的 beta 版本以及适合喜欢旧网关维护系列的用户的扩展稳定版本。此页面解释了这些选择以及已检查版本的内容。切换通道请参见[释放通道](/install/development-channels)。

## <a id="release-channels"></a> 发布渠道

| 渠道         | 你得到什么                                                                               |
| --------------- | ------------------------------------------------------------------------------------------ |
| 稳定的          | 常规版本升级为npm `latest`。                                              |
| 贝塔            | npm `beta` 上的候选人。这可能是预发布版本或等待促销的最终版本。 |
| 延长稳定期 | 上个月 npm `extended-stable` 上的网关维护版本。 |
| 开发者             | `main`摇头灯，供开发。                                                |

扩展稳定版包括网关、官方 npm 插件和 Docker 映像。它不包括本机应用程序或 ClawHub 出版物，并且不会更改常规稳定渠道。其 GitHub 版本未标记为“最新”。当 `main` 进入下个月时，每月行将停用。仅维护一条扩展稳定行：相对于 `main` 版本的跟踪完成月份；较旧的 `.33+` 系列已退役。发布退役的线路需要明确的维护者决定；切勿绕过释放防护装置。

## <a id="version-naming"></a> 版本命名

| 发布版本            | 版本示例                                                       |
| ------------------ | --------------------------------------------------------------------- |
| 常规决赛      | `2026.9.6`                                                            |
| 测试版预发布    | `2026.9.6-beta.1`                                                     |
| 定期修正 | `2026.9.6-1`                                                          |
| 延长稳定期    | `2026.8.33`，随后是 `2026.8.34` 的下一个维护版本 |

版本使用 `year.month.patch`，无零填充。补丁是当月内的版本号，而不是当月的某一天。常规版本使用 `33` 以下的补丁；扩展稳定从 `33` 开始。 Git 标签添加 `v`，如 `v2026.9.6`。发布标签带有注释和签名。共享发布工作流程在签出或下载证据之前验证标签签名，并拒绝轻量级、未签名或未经验证的标签。这也适用于恢复和重新发布：历史未签名标签不符合共享发布工作流程，并且恢复必须使用新的签名发布版本而不是替换标签。

已发布的 npm 版本和发布标签永远不会被替换。修复后会收到新版本。历史上的仅 alpha 版本不会提前常规版本号； alpha 版本已退役。

## <a id="release-cadence"></a> 发布节奏

版本通常首先进入测试版，并在验证后进入稳定版。对于核心和每个已发布的官方 npm 插件，`beta` 必须至少与 `latest` 一样新；已经较新的测试版保持不变。预发行版比具有相同基数的最终版本更旧。

发布到 Beta 通道的最终版本仍必须满足以下稳定验证要求。 npm 通道本身并不能确定应用哪些检查。

## <a id="release-validation"></a> 发布验证

稳定的发布需要稳定或全面的验证、更长时间运行的浸泡测试以及阻塞性能检查。这些要求也适用于首次在 Beta 渠道上发布的最终版本。 Beta 型证据不能保持稳定。

每个失败的测试都需要一个明确的发布主导决定：阻止或薄片。在同一版本 SHA 上重新运行 flake 最多两次，在 `main` 上提交其并行修复问题或 PR，并保留原始故障。不要仅仅为了清除碎片而重新切割、更改工具或启动另一次完整发布验证；保持红色的选定作业会阻止发布。

阻止作业包括 CI 覆盖门、seal/evidence、构建工件、安装烟雾、幸存者通道、`update-first-hop-compat*`、pack/npm 资格、包完整性和所有 Linux/Windows/macOS 网关检查，包括发布中的 Windows 打包的 install/upgrade 检查检查。取消的运行仍然会阻塞。选中的`openclaw/ci-gate`一定成功；失败、丢失、跳过或取消的覆盖块。出版豁免不能绕过失败或所需的覆盖范围。验证涵盖源 CI、软件包、插件、网关安装和升级以及选定的应用程序、UI、Telegram、QA 和实时提供商检查。全组资格包括 Linux、Windows 和 macOS 中的所有九个 Gateway install/upgrade 组合。覆盖范围因配置文件和所选操作系统而异。检查发布的记录覆盖范围：跳过或推迟的检查都不算通过。

默认的 stable/full 实时提供商覆盖范围包括阻塞 `live-cache` 套件；当选择 repo/live 覆盖范围时，beta 包括它。它的断言需要通过 Anthropic 消息和 OpenAI 响应以及 OpenRouter（当其凭证可用时）实现序列化提示前缀稳定性和提供程序缓存重用。实时代理场景执行指令刷新、激活提示挂钩和持续提示投影补充，同时通过冷提供商传输强制完整历史请求。这不是网关进程重新启动或保留的 HTTP 继续检查。重点验证使用`rerun_group=live-e2e`和`live_suite_filter=live-cache`；交叉 OS `provider` 和 `mode` 输入不会缩小这些缓存检查的范围。离线覆盖范围还比较经过身份验证的网关聊天、生成的子进程的私有完成、进程内服务器 stop/start 以及同一持久会话中的后续经过身份验证的聊天的请求。它不会重新启动 OS 进程。确定性接纳代理和网关回归提供了来自成功的实时提供商测量的单独证据；请参阅 [ 提示缓存回归覆盖率 ](/help/testing/suites#prompt-cache-regression-coverage)。

对于选定的官方 npm 插件，完整版本验证会打包并限定用于发布的确切 tarball，并记录其不可变工件描述符。发布消耗相同的字节。未打包的源装置不参与，除非 npm 将它们包含在发货的 tarball 中。

依赖项建议永远不会阻止 CI、本地提交或延迟发布。普通的pull-request、push和预定的CI会跳过生产依赖审核。它仅针对以 `full-release-validation-` 或 `release-native-android-` 开头的发布调度 ID 运行，其中每次审核失败都是退出代码为 0 的警告。可选的生产审核预提交挂钩遵循相同的策略。单独的每日依赖性审计对于分类保持严格，并且不是必需的 PR 检查。发布依赖证据记录每一个咨询结果，无论其严重程度如何。依赖项修复在发布后通过 `main` 发布。 `pnpm deps:vuln:gate` 版本仍然停止发布已知恶意软件，该恶意软件标识的是受感染的软件包，而不是漏洞通报。

`main` CI 的运行状况不会限制发布。验证和发布从带有固定发布工具的发布分支运行，因此红色 `main` 不是等待、重新剪切或暂停的理由。

请参阅 [ 完整版本验证](/reference/full-release-validation) 了解按配置文件的覆盖范围以及如何解释结果。

### <a id="operator-capabilities"></a> 操作员能力

存储库写入访问、组织成员资格、分支策略读取、CI 旁路、发布环境批准和生产部署是单独的功能。不可用的 [prior-CI 例外 ](/reference/scripts/prior-ci) 不是全面发布阻止程序或环境批准不可用的证据。相反，存储库 MAINTAIN 访问权限或 CI-bypass 权限不会授权环境批准或生产部署。

候选清单报告其经过身份验证的调用者的待定环境批准。仅当 GitHub 报告调用者可以批准时，才打印批准命令；否则，合格的环境审查员必须采取行动。不可用的批准状态读取被报告为未知，而不是没有待批准，并且不会停止验证监控。公开发布的证据仍然可以使用其现有的匿名速率限制回退；调用者特定的批准读取不能。

### <a id="plugin-sdk-evidence-transport"></a> 插件 SDK 证据传输

SDK 比较报告和发布证据使用 `openclaw.plugin-sdk-api-encoded/v1` JSON 信封以及 `encoding: "gzip+base64"` 和 `data` 字符串。传输保留完整的逻辑报告、比较摘要和特定于通道的确认。 Markdown 摘要仍然可以直接读取。 `scripts/plugin-sdk-api-release-evidence.mjs` 中的共享 `decodePluginSdkApiArtifact` 函数对 JSON 包络进行解码以进行检查。

信封仅限序列化JSON的16个MiB；每个解码的扩展限制为 64 MiB，包括所有串联的 gzip 成员。这不是进程范围的内存预算：压缩的缓冲区、解码的文本、解析的对象和并发消费者可以共存。现有的存档、文件和清单大小限制仍然独立适用。压缩不会取代不可变的工件哈希、生产者身份、完整差异验证或确认检查。

在生成新证据之前，在选定的工具切割中一起升级生产者和受信任的 qualification/publication 读取器。年长的冻结读者拒绝接受信封；移动 `main` 不会升级冻结的工作流程。新读者仍然接受历史上未编码的收据。通过协调的工具切割重新生成并验证证据；切勿重写现有的经过身份验证的收据或将其摘要重复用于不同的字节。此工具更改并不授权发布调度或发布。

### <a id="frozen-qualification-identity"></a> 冻结资质身份

新的候选人资格记录了三个独立的身份：

- **C — 候选者：** 检查其源和发布字节的确切提交。
- **Q — 资格：** C 处的完整工作流闭合，包括可重用工作流、本地操作、脚本、规划器、合同和覆盖数据。默认情况下**Q=C**。
- **P — 准入、验证和发布工具：** 独立可信的主修订版或受保护的发布标签。 P 可能与 C/Q 不同； C/Q 不需要是 P 的祖先。对 P 的信任并不能取代 C 的资格。

标准 SHA-pinned 帮助程序首先要求 P 在不可变的准入工件中记录经过审查的操作员证明、完整的标准化输入以及仅数据冻结的 Q 覆盖范围。只有这样，同一个帮助程序才会从 Q 处的不可变 `release-ci/*` 引用分派完整发布验证。发布 `release-publish/*` 标记属于 P，而不是仅仅为了运行验证而属于 Q。录取并不意味着成功的考试结果或出版批准。

`pnpm release:candidate --workflow-sha <P>` 引脚辅助器和发布工具，而不是鉴定harness。稳定的 `npm-stable-v1` 和公认的 stable/full 资格已包含模拟提供商包 Telegram 证明。助手重复使用该经过验证的证据来获取确切的 FRV- 合格包，而无需 Telegram 豁免； `npm-beta-v1` 仍然被推迟，从未通过。单独打包的历史包和明确选择的实时提供商 Telegram 检查需要在 C 处有自己的证明。补充检查仅使用在 Q=C 处验证的原始保留的 `release-ci/*` 参考，并将 `harness_ref` 固定到 SHA；缺少或移动的裁判需要新绑定的候选证据，而不是回退到主要证据。补充运行 ID 保留在候选证据包中，而不是发布者的可选发布后诊断输入。本地 Parallels 资格同样使用来自经过验证的候选检查的 C 工具和依赖项。

缺少所需资格合同的候选人需要故意向后移植。帮助器不会默默地使用 future-main 检查或导入仅 main 的场景。对资格证书的修复会改变 C 和 Q，并需要新的绑定证据； P-仅 verifier/publisher 修复可以保留 C/Q 及其原始工件。显式可信主或受保护标签交叉修订验证仅限于诊断、主资格和发布后置信度请求。它不能提供新的最终候选人资格。现有的历史发布请求保留其原始含义并保持可恢复。新的发布资格要求承认Q=C。

证据重用保留了原始生产者身份和当前消费者身份、输入、覆盖范围和工件来源。它不能将旧的运行重新标记为候选人拥有。调节是只读的；显式简历仅限于任何资格引用突变或 FRV 调度之前的候选人请求。不确定的写入永远不会授权另一次调度。所有发布门、稳定浸泡、阻塞性能、环境批准和精确字节检查保持不变。

本地合约测试可以证明输入绑定、拒绝和恢复行为。它们不证明托管工作流准入、环境访问、OIDC、签名或发布。分别报告托管证据和未经测试的部署先决条件；本地绿色支票不是托管发布收据。

## <a id="packages-and-apps-can-become-available-at-different-times"></a> 软件包和应用程序可能在不同时间可用

发布的 Gateway 版本并不意味着每个本机应用程序都已准备就绪。应用程序的签名和发布可以与 npm、Docker 和 GitHub 版本分开完成。

检查每个平台的版本资产和公告。待处理的应用程序构建或已接受的发布请求不是已完成的应用程序版本。 Extended-stable 是一个 Gateway 发行版，不发布本机应用程序。

## <a id="release-notes-and-verification"></a> 发行说明和验证

[ 发行说明](/releases) 描述了面向用户的更改。 GitHub 版本还包含验证结果、依赖性报告和已发布包的检查。这些记录标识测试的版本和发送的文件。稍后的文档更新可能会改进发行说明，而无需重建或替换软件包。

Beta 发行说明显示了自 npm 的 `beta` 频道在发布之前选择的版本以来的变化。当`beta`和`latest`选择相同的封装时，该基线可以是稳定版本；它不一定是最后一个 GitHub 预发行版。每个测试版都会冻结自己的变更日志和贡献记录。自上一个稳定版本以来，稳定版本说明保持累积状态。

有关依赖性审查，请参阅 [ 依赖性锁定](/gateway/security/dependency-locking)。版本依赖档案包括与包 tarball 分开的 npm- 格式锁。

### <a id="downstream-packaging"></a> 下游包装

要使用释放锁：

1. 从 GitHub 版本下载 `openclaw-<version>-dependency-evidence.zip`。打开 `dependency-evidence/npm-package-locks.json` （`schemaVersion: 1`） 并选择与确切的包 `name` 和 `version` 匹配的 `packages` 条目。
2. 拒绝具有非空 `omittedWorkspaceDependencies` 数组的条目。这些是部分锁定：生成器忽略在同一版本中发布的同级 `workspace:` 运行时依赖项。该报告对 `packagesWithOmittedWorkspaceDependencies` 中的这些条目进行计数。
3. 验证 `dependency-evidence/dependency-evidence-manifest.json` 的 `releaseSha`、报告的 `sourceSha` 和 OpenClaw 提交您的 pin 是否全部匹配。该报告还记录了来源 `pnpm-lock.yaml` SHA-256。
4. 使用两个空格 JSON 缩进和尾随换行符将 `entry.lock` 序列化为 `package-lock.json`，然后根据 `entry.lockSha256` 验证其 SHA-256。
5. 在`npm ci`之前，将源`pnpm-workspace.yaml`覆盖携带到消费`package.json`中，或者将嵌套的`dependencies`和`optionalDependencies`规范重写为其锁定版本。生成的锁会对工作区覆盖进行编码，因此未修改的规范可能会导致 npm 的锁同步检查失败。

配套产品 `npm-package-locks.md` 包括计数和封装表。每个条目记录 `bundleRuntimeDependencies` 和直接依赖项计数，以便打包者可以识别需要外部锁的无锁包。每个条目还记录一个按路径排序的 `bundledDependencies` 数组，其中包含 `path`、`name`、`version` 和 `parent`。这些依赖项在npm锁中携带`inBundle: true`； `parent` 标识最近的封闭非捆绑包，其 `resolved` 和 `integrity` 验证携带其字节的 tarball。该报告拒绝丢失或无法验证的载体并保留锁定有效负载。 Markdown 表对每个包的捆绑依赖项进行计数并包含其总数。

## <a id="maintainer-procedures"></a> 维护程序

发布准备、发布命令、批准和恢复位于 [ 发布维护人员技能 ](https://github.com/openclaw/openclaw/tree/main/.agents/skills/release-openclaw-maintainer) 中。凭证处理和紧急程序仍保留在私人维护人员操作手册中。下面的前一节链接可引导至相应的过程。

<a id="linux-companion-publication" />

[Linux 出版物](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/platform-publication.md#linux)。

<a id="release-changelog-artifacts" />

[发布变更日志](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/preparation.md#changelog-and-release-notes)。

<a id="changelog-only-evidence-reuse" />

[ 仅更改日志资格](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#qualify-publication-bytes)。

<a id="monthly-gateway-extended-stable-publication" />
<a id="prepare-and-stabilize-the-candidate" />
<a id="publish-the-npm-packages" />
<a id="publish-the-release" />

[延长稳定的制备和出版](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/extended-stable-publish.md)。

<a id="verify-and-recover" />

[延长稳定恢复](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/extended-stable-publish.md#trusted-main-npm-recovery)。

<a id="regular-release-operator-checklist" />
<a id="fast-path-default" />
<a id="fast-path-(default)" />
<a id="stable-release-process" />
<a id="full-checklist" />
<a id="manual-fallback" />

[定期发布清单](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#freeze-and-validate-code)。

<a id="orchestrated-stable-release" />

[可恢复发布编排](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#orchestrated-stable-release)。

<a id="release-priority" />

[延期CI恢复](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#deferred-ci-recovery)。

<a id="continuous-release-readiness" />

[夜间验证重用](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#continuous-release-readiness)。

<a id="release-tooling-fast-lane" />

[释放工具CI范围](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#release-tooling-fast-lane)。

<a id="stable-main-closeout" />

[主要平仓稳定](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/stable-main-closeout.md)。

每次稳定版本发布后，使用 `pnpm plugin-sdk:shipped-surface:gen -- --release <stable tag>` 在 `main` 上重新生成已提交的已交付插件 SDK 表面，然后运行 ​​`pnpm plugin-sdk:surface:check`。提交生成的 `scripts/lib/plugin-sdk-shipped-surface.json` 作为稳定平仓的一部分；不要手动编辑它。库存记录了稳定标签的键入公开声明，因此后来的出口预算削减无法授权将其删除。

<a id="post-release-documentation-publication" />

[发布后文档出版物](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-changelog-update/SKILL.md#post-release-docs-mirrors)。

<a id="release-preflight" />
<a id="required-checks" />

[源和封装门](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/validation.md#source-and-package-gates)。

<a id="previous-updater-compatibility" />

[较旧的更新程序验证](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/validation.md#older-updater-checks)。

<a id="design-proposal%3A-immutable-runtime-generations" />
<a id="design-proposal-immutable-runtime-generations" />

[运行时生成设计方案（未发货行为）](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/validation.md#immutable-runtime-generation-proposal)。

<a id="release-test-boxes" />
<a id="vitest" />
<a id="docker" />
<a id="qa-lab" />

[发布验证通道](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#dispatch)。

<a id="package" />

[封装Acceptance](/ci/release-validation/package-acceptance)。

<a id="regular-release-publish-automation" />
<a id="check-publication-gates" />

[发表资格](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#qualify-publication-bytes)。

<a id="probe-the-bootstrap-token" />

[引导令牌验证](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/publication-recovery.md#check-the-bootstrap-token)。

<a id="prepare-once%2C-then-use-the-release-button" />
<a id="prepare-once-then-use-the-release-button" />

[准备出版物](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#prepared-publication)。

<a id="recover-a-failed-download" />

[ 中断准备和出版](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/publication-recovery.md#interrupted-preparation-and-publication)。

<a id="direct-publication-and-owner-recovery" />

[发布版本恢复](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/publication-recovery.md#published-version-failed-parent)。

<a id="npm-workflow-inputs" />
<a id="regular-beta%2Flatest-stable-release-sequence" />
<a id="regular-beta/latest-stable-release-sequence" />

[定期发布并验证](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#publish-and-verify)。

<a id="publication-modes%3A-strict-default-and-operator-fast-path" />
<a id="publication-modes-strict-default-and-operator-fast-path" />

<a id="publication-requirements" />

[发布要求](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#publication-requirements)。

<a id="public-references" />
<a id="related" />

[发布工作流程参考](/reference/full-release-validation)。
