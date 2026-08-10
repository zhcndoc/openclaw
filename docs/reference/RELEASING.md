---
doc-schema-version: 1
summary: "发布通道、操作清单、验证框、版本命名和发布节奏"
title: "发布策略"
read_when:
  - 查找公开发布通道定义时
  - 运行发布验证或包验收时
  - 查找版本命名和发布节奏时
---

OpenClaw 提供四个面向用户的更新通道：

- stable：在 npm `latest` 上提升后的常规发布
- extended-stable：上一个已完成月份的 `.33+` 维护线，位于
  npm `extended-stable`
- beta：npm `beta` 上的预发布标签
- dev：`main` 的移动头部

Extended-stable 提供上一个月份的网关、官方 npm 插件和
Docker 镜像，而不会移动常规的 `latest` 或 `main` 选择器。

Tideclaw alpha 构建是一个独立的内部预发布轨道（npm dist-tag `alpha`），其内容涵盖在 [NPM 工作流输入](#npm-workflow-inputs) 和 [发布测试环境](#release-test-boxes) 下。

## 版本命名

- 每月 Gateway extended-stable 发布版本：`YYYY.M.PATCH`，其中 `PATCH >= 33`，git tag 为 `vYYYY.M.PATCH`
- 每日/常规最终发布版本：`YYYY.M.PATCH`，其中 `PATCH < 33`，git tag 为 `vYYYY.M.PATCH`
- 常规回退修正发布版本：`YYYY.M.PATCH-N`，git tag 为 `vYYYY.M.PATCH-N`
- Beta 预发布版本：`YYYY.M.PATCH-beta.N`，git tag 为 `vYYYY.M.PATCH-beta.N`
- Alpha 预发布版本：`YYYY.M.PATCH-alpha.N`，git tag 为 `vYYYY.M.PATCH-alpha.N`
- 月份或 PATCH 绝不补零
- `PATCH` 是按顺序递增的每月发布列车编号，不是日历日期。常规最终版和 beta 版会推进当前列车；仅 alpha 的 tag 不会消耗或推进 beta/regular 的 patch 编号，因此在选择 beta 或常规列车时，请忽略 patch 编号更高的历史仅 alpha tag。
- Alpha/nightly 构建使用下一个尚未发布的 patch 列车，并且在重复构建时只递增 `alpha.N`。一旦该 patch 有了 beta，新 alpha 构建就会移动到下一个 patch。
- npm 版本是不可变的：绝不要删除、重新发布或复用已发布的 tag。应改为切出下一个预发布编号或下一个每月 patch。
- `latest` 继续跟随当前常规/每日 npm 版本线；`beta` 是当前 beta 安装目标
- `extended-stable` 指受支持的跨月 Gateway 分发版本，从 patch `33` 开始；patch `34` 及之后是在该每月版本线上的维护发布
- 常规最终版和常规修正版默认发布到 npm 的 `beta`；发布操作员可以显式指定目标为 `latest`，或者在之后将经过验证的 beta 构建提升为正式版
- Gateway extended-stable 会以一个精确版本同时发布 core、所有可发布到 npm 的官方插件，
  以及它的 Docker 镜像；请参阅下面专门的工作流。
- 每个常规最终发布会同时发布 npm 包、macOS 应用、已签名的独立 Android APK，以及已签名的 Windows Hub 安装程序。Beta 发布通常先验证并发布 npm/包路径，而原生应用的构建/签名/公证/提升则保留给常规最终版，除非明确要求。

## 发布节奏

- 发布先走 beta；只有在最新 beta 经过验证后，stable 才会跟进
- 维护者通常会从当前 `main` 创建的 `release/YYYY.M.PATCH` 分支中切发布，因此发布验证和修复不会阻塞 `main` 上的新开发
- 如果某个 beta 标签已经被推送或发布并且需要修复，维护者会切出下一个 `-beta.N` 标签，而不是删除或重建旧标签
- 详细的发布流程、审批、凭据和恢复说明仅限维护者查看

## 每月 Gateway extended-stable 发布

对于已完成的月份 `YYYY.M`，创建 `extended-stable/YYYY.M.33` 并从该分支发布
`.33+`。标签、分支、检出、包版本、预检和验证必须指向同一个提交。在 `.33` 之前，受保护的 `main` 必须包含较晚月份的最终版本，且补丁号低于 `33`；更晚的维护补丁仍然符合条件。

### 准备并稳定候选版本

审计未经审计的主线范围，协调私有安全工作，批准一个有边界的回移集合，并合并一个协调一致的 PR。不要直接推送规范分支。

在规范分支上，设置 `YYYY.M.P`，运行 `pnpm release:prep`，并要求每个可发布的官方插件都使用该版本。从已批准的清单生成并提交完整的 `## YYYY.M.P` 章节，其中包含 `### Highlights`、`### Changes` 和 `### Fixes`，并为等效回移引用原始合并到 `main` 的 PR。预检会拒绝缺失或为空的章节。

携带完整的当前 main Docker 发布通道单元：工作流、promoter、policy、共享分类器、测试以及工作流验证。GitHub 从已打标签的提交加载标签工作流；不完整的副本可能在构建后失败或移动常规别名。运行有针对性的检查。

冻结完整的分支头 SHA。打标签前，预检其精确的 npm 字节并针对该 SHA 运行完整发布验证：

```bash
RELEASE_SHA="$(git rev-parse HEAD)"

gh workflow run openclaw-npm-release.yml \
  --ref extended-stable/YYYY.M.33 \
  -f tag="$RELEASE_SHA" \
  -f preflight_only=true \
  -f npm_dist_tag=extended-stable

gh workflow run full-release-validation.yml \
  --ref extended-stable/YYYY.M.33 \
  -f ref=extended-stable/YYYY.M.33 \
  -f release_profile=stable
```

SHA 形式仅用于预检。请在规范分支上运行验证；发布会绑定其工作流引用、头部/目标 SHA、运行 ID 和尝试次数。保存这两个 ID 和成功的 `run_attempt`；拒绝 `release-ci/*` 证据。

在编辑之前对失败进行分类：

- 产品：再合并一个已批准的回移 PR。
- 冻结目标工具链：仅回移最小的兼容性修复，并测试旧产品保持不变。
- 提供方、审批、运行器或服务：保持候选版本不变，并使用有边界的重试路径。

任何分支变更都会使两个门禁失效。两者通过后，必须确认分支尖端仍等于
`RELEASE_SHA`，然后推送签名的 `vYYYY.M.P`。后续变更需要使用下一个补丁版本；绝不移动或删除标签。打标签会固定不可变的发布身份；它不会发布 Docker 镜像。

### 发布 npm 包

从同一个 SHA 发布所有可通过 npm 发布的官方插件，并保存成功的运行 ID：

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
gh workflow run plugin-npm-release.yml \
  --ref extended-stable/YYYY.M.33 \
  -f publish_scope=all-publishable \
  -f ref="$RELEASE_SHA" \
  -f npm_dist_tag=extended-stable
```

该工作流覆盖所有 `all-publishable` 包，包括未更改的包，并验证每个精确版本和选择器。重试会复用已发布的版本。

然后使用全部三个已保存的运行标识来发布准备好的核心 tarball：

```bash
gh workflow run openclaw-npm-release.yml \
  --ref extended-stable/YYYY.M.33 \
  -f tag=vYYYY.M.P \
  -f preflight_only=false \
  -f npm_dist_tag=extended-stable \
  -f preflight_run_id=<npm-preflight-run-id> \
  -f full_release_validation_run_id=<full-validation-run-id> \
  -f full_release_validation_run_attempt=<full-validation-run-attempt> \
  -f plugin_npm_run_id=<plugin-npm-run-id>
```

如果不可变候选版本已经通过保存的预检和完整发布验证，但核心发布需要仅限工作流的恢复，请改为调度受信任的当前 `main` 工作流。保持相同的标签和证据身份；不要移动标签或重新发布插件：

```bash
gh workflow run openclaw-npm-release.yml \
  --ref main \
  -f tag=vYYYY.M.P \
  -f preflight_only=false \
  -f npm_dist_tag=extended-stable \
  -f release_candidate_branch=extended-stable/YYYY.M.33 \
  -f preflight_run_id=<npm-preflight-run-id> \
  -f full_release_validation_run_id=<full-validation-run-id> \
  -f full_release_validation_run_attempt=<full-validation-run-attempt> \
  -f plugin_npm_run_id=<plugin-npm-run-id>
```

此恢复路径会检出并发布不可变标签，并要求使用该标签所隐含的规范分支。它直接接受来自规范候选分支的完整发布验证证据，直接接受当前 `main` 的证据（前提是其工作流 SHA 可从当前 `main` 访问），或接受来自固定于受信任 `main` 的测试工具的证据。每种被接受的形式都必须证明不可变标签的 SHA。仅当候选源和记录的证据未发生变化时才使用此路径。

仅用于非生产演练时，可在预检和发布中添加
`-f bypass_extended_stable_guard=true`。它仅绕过月份限制，绝不会绕过规范引用、SHA/标签/版本一致性、来源证明、审批或回读检查。绝不要在生产环境中使用。

### 验证与恢复

从一个单独的、干净的当前 `main` 检出中，而不是冻结分支，运行：

```bash
node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.P
npm view openclaw@YYYY.M.P version --userconfig "$(mktemp)"
npm view openclaw@extended-stable version --userconfig "$(mktemp)"
```

要求规范分支具备签名和 npm 来源证明，并且发布、预检和 tarball-digest 绑定到发布 SHA。这两个命令都必须返回 `YYYY.M.P`。验证每个准备好的核心包以及 `all-publishable` 官方插件的精确版本和选择器。

如果只有根选择器失败，请使用工作流摘要中打印的生成的
`npm dist-tag add openclaw@YYYY.M.P extended-stable` 修复命令。通过已批准的、凭证隔离的工具链修复现有插件或其他准备好的核心选择器；OIDC 来源不能修改它们。切勿重新发布不可变版本。

要求 `Docker Release` 在 GHCR 和 Docker Hub 中验证精确的默认、slim、browser 和架构镜像，包括证明和平台版本。它只能通过摘要更新
`extended-stable`、`extended-stable-slim` 和 `extended-stable-browser`；常规别名保持不变，并且拒绝自动回滚。

核心注册表回读成功后，只能通过 `OpenClaw Release Publish` 启动 Docker 发布。其仅限 Docker 的 extended-stable 路径会重新检查已保存的 npm 预检工件、精确的 `Full Release Validation` 证据、精确的 npm 版本和 `extended-stable` 选择器，以及已发布的 tarball 摘要，然后才会调用可复用的 `Docker Release` 工作流。推送标签本身绝不会自动发布 Docker 镜像：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref main \
  -f tag=vYYYY.M.P \
  -f preflight_run_id=<npm-preflight-run-id> \
  -f full_release_validation_run_id=<full-validation-run-id> \
  -f full_release_validation_run_attempt=<full-validation-run-attempt> \
  -f npm_dist_tag=extended-stable \
  -f publish_openclaw_npm=false \
  -f publish_docker_only=true
```

对于别名修复，请从当前的 `main` 使用该标签运行经过审批门禁的
`Docker Channel Promotion`。它会重复摘要、证明和平台检查，允许显式回滚，并且绝不会重新构建镜像。

Slack、Discord 和 Codex 是最初记录的支持面，而不是发布白名单：每个可通过 npm 发布的官方插件都会发货。常规检查清单独自负责 beta/`latest`、GitHub Releases、ClawHub、原生应用、移动端、网站和私有 dist-tag；对于此 Gateway 路径，不要执行这些步骤。

## 常规发布操作员检查清单

此检查清单是发布流程的公开形式。私有凭据、签名、公证、dist-tag 恢复以及紧急回滚细节保留在仅维护者可见的发布运行手册中。

1. 从当前的 `main` 开始：拉取最新代码，确认目标提交已推送，并确认 `main` 的 CI 状态足够绿色，可以从中创建分支。
2. 从该提交创建 `release/YYYY.M.PATCH`。是否回移植提交是可选的；仅应用操作员选定的集合。更新所有必需的版本位置，运行 `pnpm release:prep`，完成发布修复和所需的前向移植，并检查 `src/plugins/compat/registry.ts` 以及 `src/commands/doctor/shared/deprecation-compat.ts`。
3. 将产品完整、变更日志生成前的提交冻结为**代码 SHA**。运行确定性的源代码预检，然后使用 `node scripts/full-release-validation-at-sha.mjs --sha <code-sha> --target-ref release/YYYY.M.PATCH`。这会固定受信任的工作流工具，同时让完整的 Vitest、Docker、QA、软件包和性能矩阵针对确切的代码 SHA 运行。
4. 在编辑前先对失败进行分类。产品或代码失败会产生新的代码 SHA，并要求该 SHA 的完整验证通过。工作流、测试工具、凭据、审批或基础设施失败，应在其所属界面中修复，并针对同一个代码 SHA 重新运行。
5. 只有在代码 SHA 通过后，才根据自上一个可达的已发布标签以来已合并的 PR 和直接提交生成顶部的 `CHANGELOG.md` 部分。保持条目面向用户且去重。当分叉的已发布标签或之后的前向移植重新关联已经发布的 PR 时，显式传入 `--shipped-ref`。
6. 只提交 `CHANGELOG.md`。该提交就是**发布 SHA**。从代码 SHA 到发布 SHA 的完整差异必须恰好是 `CHANGELOG.md`；任何其他变更路径都会使发布返回第 2 步。
7. 针对发布 SHA 运行启用证据复用的 SHA 固定完整发布验证。轻量级父流程必须记录 `changelog-only-release-v1`，指向通过验证的代码 SHA，并且不得分发任何产品子流程。这会复用产品证据，但不会复用软件包字节内容。
8. 针对发布 SHA/标签运行 `OpenClaw NPM Release`，并设置 `preflight_only=true`。保存成功的 `preflight_run_id`。这会构建并检查包含最终变更日志的确切软件包字节内容。
9. 针对未打标签的发布 SHA 运行候选版本辅助工具，并使用成功的发布 SHA 验证父流程和 npm 预检，而不是再次分发这两者：

   ```bash
   pnpm release:candidate -- \
     --tag vYYYY.M.PATCH-beta.N \
     --target-sha <release-sha> \
     --full-release-run <release-sha-validation-run-id> \
     --npm-preflight-run <preflight-run-id> \
     --skip-dispatch
   ```

   对于稳定版，还要传入 `--windows-node-tag vX.Y.Z`。该辅助工具会验证发布说明来源、npm 预检字节内容、Parallels 安装/更新证明、Telegram 软件包证明以及插件发布计划，然后打印发布命令。成功完成后，在同一个发布 SHA 上创建并推送最终签名标签，然后运行打印出的发布命令。

   `pnpm release:candidate` 默认验证当前冻结分支顶端（或显式指定的 `--target-sha`），并拒绝已存在的标签。它会在推送最终签名标签前记录证据。

   `OpenClaw Release Publish` 会将选定的或所有可发布的插件软件包分发到 npm，并将同一组软件包并行分发到 ClawHub；随后，在插件 npm 发布成功后，使用匹配的 dist-tag 提升已准备好的 OpenClaw npm 预检工件。它会在验证注册表回读时保持 GitHub release 为草稿状态，使用不可变标签和发布 SHA 调用 `Docker Release`，并且仅在此之后完成 GitHub release。发布检出目录仍是产品/数据根目录，而计划和最终验证则从确切的受信任工作流源代码检出目录执行，因此较旧的发布提交无法悄悄使用过时的发布工具。在任何发布子流程启动前，它都会渲染并缓存确切的 GitHub release 正文。当完整且匹配的 `CHANGELOG.md` 部分符合 GitHub 的 125,000 个字符限制以及渲染器匹配的 125,000 字节安全上限时，页面会包含该确切的 `## YYYY.M.PATCH` 部分，包括其标题。当源部分超出限制时，页面会保留确切的分组编辑说明，并将过大的贡献记录替换为指向标签固定的 `CHANGELOG.md` 中完整记录的稳定链接；绝不会发布部分记录或截断的项目符号。工作流会在添加 `### Release verification` 之前选择完整正文或精简正文；如果证明尾部会超出限制，则保留规范正文，并依赖不可变的附加证据。发布到 npm `latest` 的稳定版会成为 GitHub 最新发布，而保留在 npm `beta` 上的稳定维护版本则会以 `GitHub latest=false` 创建。该工作流还会将预检依赖证据、完整验证清单以及发布后的注册表验证证据上传到 GitHub release，以便进行发布后事故响应。它会立即打印子流程运行 ID，自动批准工作流令牌有权批准的发布环境闸门，使用日志尾部汇总失败的子任务，预先创建 GitHub release 草稿页面，并在 OpenClaw npm 发布的同时并行提升 Windows 和 Android 资源；当 OpenClaw npm 正在发布时等待 ClawHub，然后运行受信任的 main beta 验证器，并将 GitHub release、npm 软件包、选定的插件 npm 软件包、选定的 ClawHub 软件包、子工作流运行 ID 以及可选的 NPM Telegram 运行 ID 的发布后证据上传到 GitHub release。ClawHub 引导验证器要求确切的受信任 main 工作流路径和 SHA、生产者及终端运行尝试、发布 SHA、请求的软件包集合、不可变软件包工件元组以及终端注册表回读工件；成功的旧版发布引用运行不会被接受。

   然后针对已发布的 `openclaw@YYYY.M.PATCH-beta.N` 或 `openclaw@beta` 包运行发布后包接受测试。如果已推送或已发布的预发布版需要修复，请切换到下一个匹配的预发布版本号；切勿删除或重写旧版本。

10. 在发布尝试失败时，保持发布 SHA 不变，除非失败证明存在产品或变更日志缺陷。恢复成功的不可变子流程和工件；切勿重建或重新发布已成功的软件包版本。
11. 对于稳定版，只有在经过审查的 beta 或候选发布版本具备所需验证证据后，才继续。稳定版 npm 发布也通过 `OpenClaw Release Publish` 进行，并通过 `preflight_run_id` 复用成功的预检工件。稳定版 macOS 发布就绪还要求在 `main` 上提供打包的 `.zip`、`.dmg`、`.dSYM.zip` 以及更新后的 `appcast.xml`；macOS 发布工作流在发布资源验证后会自动将已签名的 appcast 发布到公共 `main`，如果分支保护阻止直接推送，则会打开/更新一个 appcast PR。稳定版 Windows Hub 就绪要求在 OpenClaw GitHub release 上提供已签名的 `OpenClawCompanion-Setup-x64.exe`、`OpenClawCompanion-Setup-arm64.exe` 和 `OpenClawCompanion-SHA256SUMS.txt` 资源。将精确签名的 `openclaw/openclaw-windows-node` release tag 作为 `windows_node_tag` 传入，并将其候选批准的安装程序摘要映射作为 `windows_node_installer_digests` 传入；`OpenClaw Release Publish` 会保留 release 草稿，分发 `Windows Node Release`，并在发布前验证这三项资源。
12. 发布后，运行 npm 发布后验证器，在需要发布后渠道证明时可选运行独立的已发布 npm Telegram E2E，在需要时进行 dist-tag 推广，验证生成的 GitHub release 页面，运行发布公告步骤，然后在将稳定发布标记为完成之前，先完成[稳定版 main 收尾](#stable-main-closeout)。

## Stable 主线收尾

只有当 `main` 携带实际已发布的稳定版本状态时，稳定发布才算完成。

1. 从最新的干净 `main` 开始。将 `release/YYYY.M.PATCH` 与其进行审计，并将 `main` 中缺失的真实修复前向移植过来。不要把仅用于发布分支的兼容性、测试或验证适配器盲目合并到更新的 `main` 中。
2. 对于正常路径，将 `main` 设置为已发布的稳定版本。较晚的收尾可能会使用已经推进到更晚的稳定 OpenClaw CalVer 的 `main`；不要仅仅为了关闭前一个发布而把已经开始的发布列车降级。验证器仍然要求精确的已发布 changelog 章节和 appcast 条目，并记录 `main` 的实际版本和 SHA。任何根版本变更后都要运行 `pnpm release:prep`。
3. 使 `main` 上的 `CHANGELOG.md` 中 `## YYYY.M.PATCH` 章节与已打标签的发布分支完全一致。如果 mac 发行版发布了稳定的 `appcast.xml` 更新，也要包含进去。
4. 在操作员明确开始该发布列车之前，不要向 `main` 添加 `YYYY.M.PATCH+1`、beta 版本或空的未来 changelog 章节。
5. 运行 `pnpm release:generated:check`、`pnpm deps:npm-lock:check` 和 `OPENCLAW_TESTBOX=1 pnpm check:changed`。推送，然后在调用稳定发布完成之前，确认 `origin/main` 包含已发布版本和 changelog。
6. 在每次私有回滚演练之后，保持仓库变量 `RELEASE_ROLLBACK_DRILL_ID` 和 `RELEASE_ROLLBACK_DRILL_DATE` 为最新。

`OpenClaw Stable Main Closeout` 从携带已发布版本、changelog 和 appcast 的 `main` 推送开始，并且是在稳定发布之后进行的。它读取不可变的 postpublish 证据，将已发布标签绑定到其 Full Release Validation 和 Publish 运行，然后验证稳定主线状态、发布、强制稳定 soak 以及阻塞性的性能证据。它会将一个不可变的收尾清单和校验和附加到 GitHub release。自动推送触发会跳过早于不可变 postpublish 证据的旧发布，并且绝不会把这种跳过视为已完成的收尾。

完整的收尾需要清单和匹配的校验和。部分清单会重放其记录的 `main` SHA 和回滚演练，以重新生成完全相同的字节，然后附加缺失的校验和；无效的配对，或没有清单的校验和，都会保持阻塞状态。没有回滚演练仓库变量的推送触发运行会跳过而不完成收尾；缺失或超过 90 天的演练记录仍会阻塞基于证据的人工收尾。私有恢复命令仍保留在仅维护者可见的 runbook 中。仅在修复或重放一个有证据支持的稳定收尾时才使用手动派发。

如果 Release Publish 父流程仅在附加了不可变 npm/plugin 证据之后失败，那么应先修复并发布所有稳定平台资产。之后，维护者可以手动派发收尾并设置 `allow_failed_publish_recovery=true`；该模式只接受已完成的失败父流程，并且还要求精确的 Android 和 Windows 资产契约、GitHub SHA-256 摘要、校验和验证、Android provenance，以及一个由父流程派发且成功的 Windows 晋升，其 Authenticode 检查和候选版批准的摘要必须与已发布安装程序匹配，同时还要满足常规的 macOS/appcast 检查。自动推送收尾绝不会启用此恢复模式。

只有当修正标签解析到与基础稳定标签相同的源提交时，旧版回退修正标签才可以复用基础包证据。其 Android 发布会复用基础标签已验证的 APK，并为修正标签添加 provenance。若修正版本来自不同源，则必须发布并验证其自己的包证据，并使用更高的 Android `versionCode`。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以确保测试 TypeScript 检查在更快的本地 `pnpm check` 门禁之外也得到覆盖。
- 在发布预检之前运行 `pnpm check:architecture`，以确保更广泛的导入循环和架构边界检查在更快的本地门禁之外保持通过。
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以确保预期的 `dist/*` 发布产物和 Control UI 包在打包验证步骤中存在。
- 在根版本号提升之后、打标签之前运行 `pnpm release:prep`。它会运行所有通常会在版本/配置/API 变更后漂移的确定性发布生成器：插件版本、插件清单、基础配置 schema、打包后的 channel 配置元数据、配置文档基线、插件 SDK 导出、Plugin SDK API 合同清单，以及 Control UI 语言包。它还会阻塞直到原生应用翻译和平台生成的语言资源与源码清单一致；如果它们滞后，请等待或触发 `Native App Locale Refresh`，然后再冻结 Code SHA。`pnpm release:check` 会在检查模式下重新运行这些门禁以及临时 npm package-lock 验证（包括严格的语言门禁和插件 SDK 表面预算），并在运行包发布检查前一次性报告所有失败。
- 默认情况下，插件版本同步会将可发布的 `@openclaw/ai` 运行时包、官方插件包版本，以及现有的 `openclaw.compat.pluginApi` 下限更新为 OpenClaw 发布版本。请将该字段视为插件 SDK/运行时 API 下限，而不仅仅是包版本的拷贝：对于故意保持与旧版 OpenClaw 主机兼容的仅插件发布，请将下限保留为最旧受支持主机 API，并在插件发布证据中记录该决定。
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口触发所有预发布测试盒。它接受分支、标签或完整 commit SHA，分发手动 `CI`，并分发 `OpenClaw Release Checks`，覆盖安装烟雾测试、包验收、跨操作系统包检查、QA Lab 对齐、Matrix 和 Telegram 任务线。稳定版和完整版运行始终包含详尽的 live/E2E 和 Docker 发布路径 soak；`run_release_soak=true` 保留用于显式的 beta soak。Package Acceptance 在候选验证期间提供规范的包 Telegram E2E，避免第二个并发的 live 轮询器。

  在发布 beta 后提供 `release_package_spec`，即可在发布检查、Package Acceptance 和包 Telegram E2E 中复用已发布的 npm 包，而无需重新构建发布 tarball。只有当 Telegram 需要使用与其余发布验证不同的已发布包时，才提供 `npm_telegram_package_spec`。当 Package Acceptance 需要使用与发布包规格不同的已发布包时，提供 `package_acceptance_package_spec`。当发布证据报告应证明验证与已发布的 npm 包一致、但不强制 Telegram E2E 时，提供 `evidence_package_spec`。

  ```bash
  node scripts/full-release-validation-at-sha.mjs \
    --sha <code-sha> \
    --target-ref release/YYYY.M.PATCH
  ```

- 当你希望在发布工作继续进行时，为某个包候选获取侧信道证明，请运行手动 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或精确发布版本使用 `source=npm`；对使用当前 `workflow_ref` 运行时打包可信 `package_ref` 分支/标签/SHA 使用 `source=ref`；对带必需 SHA-256 和严格公共 URL 策略的公共 HTTPS tarball 使用 `source=url`；对使用必需 `trusted_source_id` 和 SHA-256 的命名可信来源策略使用 `source=trusted-url`；或者对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。

  该工作流会将候选解析为 `package-under-test`，对该 tarball 复用 Docker E2E 发布调度器，并且可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选 Docker 任务线包含 `published-upgrade-survivor` 时，包产物是候选包，而 `published_upgrade_survivor_baseline` 选择已发布的基线。`update-restart-auth` 将候选包同时作为已安装 CLI 和 `package-under-test`，因此它会演练候选更新命令的受管重启路径。

  示例：

  ```bash
  gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai
  ```

  常见配置：
  - `smoke`：安装/通道/代理、gateway 网络和配置重载任务线
  - `package`：原生包/更新/重启/插件任务线，不包含 OpenWebUI 或 live ClawHub
  - `product`：包配置文件加上 MCP 通道、cron/subagent 清理、OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径分块
  - `custom`：用于有针对性重跑的精确 `docker_lanes` 选择

- 当你只需要发布候选的确定性常规 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 调度会绕过变更范围控制，并强制执行 Linux Node 分片、捆绑插件分片、插件和 channel 合同分片、Node 22 兼容性、`check-*`、`check-additional-*`、已构建产物烟雾检查、文档检查、Python skills、Windows、macOS 以及 Control UI i18n 任务线。独立手动 CI 仅在带 `include_android=true` 调度时才运行 Android；`Full Release Validation` 会将该输入传给它的 CI 子任务。

  ```bash
  gh workflow run ci.yml --ref release/YYYY.M.PATCH -f include_android=true
  ```

- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP receiver 对 QA-lab 进行演练，并在不需要 Opik、Langfuse 或其他外部收集器的情况下，验证 trace、metric 和 log 导出，以及受限的 trace 属性和内容/标识符去标识化。
- 在验证收集器兼容性时运行 `pnpm qa:otel:collector-smoke`。它先将相同的 QA-lab OTLP 导出路由到一个真实的 OpenTelemetry Collector Docker 容器，然后再进行本地 receiver 断言。
- 在验证受保护的 Prometheus 抓取时运行 `pnpm qa:prometheus:smoke`。它会演练 QA-lab，拒绝未认证抓取，并验证发布关键的指标族保持不包含提示内容、原始标识符、认证令牌和本地路径。
- 将 `pnpm qa:observability:smoke` 用于源代码检出状态下的 OpenTelemetry 和 Prometheus 烟雾任务线，连续运行。
- 在每次打标签发布之前运行 `pnpm release:check`。
- `OpenClaw NPM Release` 预检在打包 npm tarball 之前生成依赖发布证据。npm advisory 漏洞门禁是发布阻断项。传递依赖清单风险、依赖所有权/安装表面，以及依赖变更报告仅作为发布证据。依赖变更报告会将发布候选与之前可达的发布标签进行比较。预检会将依赖证据作为 `openclaw-release-dependency-evidence-<tag>` 上传，并且还会将其嵌入到准备好的 npm 预检产物内的 `dependency-evidence/` 下。实际发布路径会复用该预检产物，然后将同样的证据作为 `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub release。
- 在标签存在后运行 `OpenClaw Release Publish` 执行有变更的发布序列。将常规 beta 和 stable 发布从受信任的 `main` 分发；发布标签仍会选择精确目标 commit，并且可能指向 `release/YYYY.M.PATCH`。Tideclaw alpha 发布仍保留在其匹配的 alpha 分支上。传入成功的 OpenClaw npm `preflight_run_id`、成功的 `full_release_validation_run_id` 和精确的 `full_release_validation_run_attempt`，并保持默认插件发布范围 `all-publishable`，除非你有意进行有针对性的修复。该工作流会串行化插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布，因此核心包不会在外部化插件之前发布；Windows 和 Android 推广会与核心 npm 发布并行运行，目标是草稿 release 页面。发布重跑支持断点续跑：一旦工作流证明 registry tarball 与标签的预检产物匹配，已经发布过的核心 npm 版本会跳过核心分发；如果 release 已经携带已验证的资产合同，则会跳过 Windows/Android 推广，因此重试只会重新执行失败的阶段。仅插件的有针对性的修复需要 `plugin_publish_scope=selected` 且非空插件列表。仅插件的 `all-publishable` 运行需要完整不可变预检和 Full Release Validation 证据；部分证据会被拒绝。
- Stable 的 `OpenClaw Release Publish` 需要精确的 `windows_node_tag`，且对应的非预发布 `openclaw/openclaw-windows-node` release 已存在，同时还需要候选批准的 `windows_node_installer_digests` 映射。在分发任何发布子任务之前，它会验证源 release 已发布、非预发布、包含所需的 x64/ARM64 安装程序，并且仍与该批准映射一致。然后在 OpenClaw release 仍处于草稿状态时分发 `Windows Node Release`，并原样携带固定的安装程序摘要映射。子工作流会从该精确标签下载已签名的 Windows Hub 安装程序，将它们与固定摘要进行比对，在 Windows runner 上验证其 Authenticode 签名使用的是预期的 OpenClaw Foundation 签名者，写入 SHA-256 清单，然后将安装程序及清单上传到规范的 OpenClaw GitHub release，接着重新下载已推广的资产并验证清单成员关系和哈希。父工作流在发布前验证当前的 x64、ARM64 和 checksum 资产合同。直接恢复会在用固定的源字节替换预期合同资产之前，拒绝意外的 `OpenClawCompanion-*` 资产名称。

  仅在恢复场景下手动分发 `Windows Node Release`，并且始终传入精确标签，绝不要用 `latest`，再加上来自已批准源 release 的显式 `expected_installer_digests` JSON 映射。网站下载链接应针对当前 stable 版的精确 OpenClaw release 资产 URL，或者仅在验证 GitHub 的 latest 重定向指向同一 release 后，使用 `releases/latest/download/...`；不要只链接到 companion 仓库 release 页面。

- 发布检查现在在单独的手动工作流中运行：`OpenClaw Release Checks`。它还会在发布批准之前运行 QA Lab mock parity 任务线，以及 Matrix catalog 和 Telegram QA 任务线。live 任务线使用 `qa-live-shared` 环境；Telegram 还会使用 Convex CI 凭据租约。
- 跨操作系统安装和升级运行时验证属于公开的 `OpenClaw Release Checks` 和 `Full Release Validation`，它们会直接调用可复用工作流 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`。这种拆分是有意为之的：让真实 npm 发布路径保持简短、确定且以产物为中心，同时将较慢的 live 检查保留在独立任务线中，避免其拖慢或阻塞发布。
- 包含机密信息的发布检查应通过 `Full Release Validation`，或从 `main`/发布工作流引用分发，以便工作流逻辑和机密信息保持受控。
- `OpenClaw Release Checks` 接受分支、标签或完整 commit SHA，前提是解析出的 commit 可从 OpenClaw 分支或发布标签到达。
- `OpenClaw NPM Release` 仅验证预检也接受当前完整的 40 字符工作流分支 commit SHA，无需推送标签。该 SHA 路径仅用于验证，不能推广为真实发布。在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；真实发布仍需要真实的发布标签。
- 两个工作流都会将真实发布和推广路径保留在 GitHub 托管的 runner 上，而不修改内容的验证路径可以使用更大的 Blacksmith Linux runner。
- 该工作流会使用工作流机密中的 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY`，运行 `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`。
- npm 发布预检不再等待独立的发布检查任务线。
- 在本地为发布候选打标签之前，运行 `RELEASE_TAG=vYYYY.M.PATCH-beta.N pnpm release:fast-pretag-check`。该辅助程序会按能够在 GitHub 发布工作流启动前发现常见审批阻断错误的顺序，运行快速发布护栏、插件 npm/ClawHub 发布检查、构建、UI 构建以及 `release:openclaw:npm:check`。
- 在审批之前运行 `RELEASE_TAG=vYYYY.M.PATCH node --import tsx scripts/openclaw-npm-release-check.ts`（或匹配的预发布/修正版标签）。
- npm 发布后，运行 `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.PATCH`（或匹配的 beta/修正版版本），以在全新的临时前缀中验证已发布的 registry 安装路径。
- beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.PATCH-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`，以使用共享的 Telegram 凭据租约池，针对已发布的 npm 包验证已安装包引导、Telegram 设置和真实 Telegram E2E。本地维护者的一次性运行可以省略 Convex 变量，直接传入三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 若要在维护者机器上运行完整的发布后 beta 烟雾测试，请使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助程序会运行 Parallels npm 更新/全新目标验证，分发 `NPM Telegram Beta E2E`，轮询精确的工作流运行，下载产物，并输出 Telegram 报告。
- 维护者也可以通过手动的 `NPM Telegram Beta E2E` 工作流，从 GitHub Actions 运行相同的发布后检查。该工作流特意仅支持手动运行，不会在每次合并时运行。
- 维护者发布自动化采用预检后推广：
  - 真实 npm 发布必须通过成功的 npm `preflight_run_id`。
  - 常规 beta 和 stable 发布编排及预检使用针对精确目标标签的受信任 `main`。Tideclaw alpha 发布和预检使用匹配的 alpha 分支。
  - Stable npm 发布默认使用 `beta`；stable npm 发布可以通过工作流输入显式指定 `latest`。
  - 基于令牌的 npm dist-tag 变更位于 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` 中，因为 `npm dist-tag add` 仍需要 `NPM_TOKEN`，而源代码仓库保持仅使用 OIDC 发布。
  - 公开的 `macOS Release` 仅用于验证；当标签仅存在于发布分支、但工作流从 `main` 分发时，设置 `public_release_branch=release/YYYY.M.PATCH`。
  - 真实 macOS 发布必须通过成功的 macOS `preflight_run_id` 和 `validate_run_id`。
  - 真实发布路径会推广已准备好的产物，而不是再次构建它们。
- 对于 `YYYY.M.PATCH-N` 等 stable 修正版发布，发布后验证器还会检查从 `YYYY.M.PATCH` 到 `YYYY.M.PATCH-N` 的相同临时前缀升级路径，确保发布修正不会悄悄让较旧的全局安装停留在基础 stable 负载上。
- npm 发布预检会在 tarball 不同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载时直接失败，从而避免再次发布空的浏览器仪表板。
- 发布后验证还会检查已发布插件入口点和包元数据是否存在于已安装的 registry 布局中。若发布内容缺少插件运行时负载，发布将无法通过发布后验证器，也不能被推广到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新 tarball 强制执行 npm pack 的 `unpackedSize` 预算，因此安装器 e2e 能够在发布路径之前捕获意外的打包膨胀。
- 如果发布工作涉及 CI 规划、扩展时序清单或扩展测试矩阵，请在审批前重新生成并审查 `.github/workflows/plugin-prerelease.yml` 中由规划器维护的 `plugin-prerelease-extension-shard` 矩阵输出，确保发布说明不会描述过时的 CI 布局。
- Stable macOS 发布就绪状态还包括更新器相关表面：GitHub release 最终必须包含打包后的 `.zip`、`.dmg` 和 `.dSYM.zip`；发布后，`main` 上的 `appcast.xml` 必须指向新的 stable zip（macOS 发布工作流会自动提交，或者在直接推送受阻时创建 appcast PR）；打包后的应用必须保持非调试 bundle id、非空的 Sparkle feed URL，以及不低于该发布版本规范 Sparkle 构建下限的 `CFBundleVersion`。

## 发布测试箱

`Full Release Validation` 是操作员从一个入口启动完整产品矩阵的方式。请使用该辅助命令，让每个子工作流都从一个临时分支运行，并固定在一个受信任的 `main` 工作流 SHA 上，而所请求的提交仍然作为待测候选版本：

```bash
pnpm ci:full-release \
  --sha <code-sha> \
  --target-ref release/YYYY.M.PATCH
```

该辅助命令会拉取当前的 `origin/main`，在该受信任的工作流提交上推送 `release-ci/<workflow-sha>-...`，根据 alpha/beta 包版本推断 `beta`，否则推断为 `stable`，然后从临时分支以 `ref=<target-sha>` 触发 `Full Release Validation`，验证每个子工作流的 `headSha` 都与固定的父工作流 SHA 一致，最后删除该临时分支。传入 `-f reuse_evidence=false` 可强制全新运行，传入 `-f release_profile=full` 可进行更广泛的顾问式扫描，或使用 `--workflow-sha <trusted-main-sha>` 固定到当前 `origin/main` 仍可达的较旧提交。工作流本身不会写入仓库引用。这使得仅限 main 的发布工具仍然可用，而不会给候选版本额外引入工具提交，并避免意外地用更新的 `main` 子运行来“证明”结果。

在 Code SHA 通过后，只提交 `CHANGELOG.md`，并使用 Release SHA 运行同一个辅助命令：

```bash
pnpm ci:full-release \
  --sha <release-sha> \
  --target-ref release/YYYY.M.PATCH
```

第二个父工作流只有在 GitHub 证明 Release SHA 继承自 Code SHA，并且完整的变更路径集合恰好只有 `CHANGELOG.md` 时，才会复用产品证据。它会记录 `changelog-only-release-v1`，并且不触发任何产品子工作流。由于其 tarball 字节发生了变化，Npm 预检和包/安装验收仍会在 Release SHA 上运行。

对于新的 Code SHA，工作流会解析目标，触发手动 `CI`，然后触发 `OpenClaw Release Checks`。`OpenClaw Release Checks` 会展开安装冒烟、跨 OS 发布检查、在启用 soak 时的 live/E2E Docker 发布路径覆盖、带有标准 Telegram 包 E2E 的 Package Acceptance、QA Lab 一致性检查、live Matrix，以及 live Telegram。只有当 `Full Release Validation` 汇总显示 `normal_ci`、`plugin_prerelease` 和 `release_checks` 都成功时，完整/全量运行才算可接受，除非一次有针对性的重跑有意跳过了单独的 `Plugin Prerelease` 子工作流。`npm-telegram` 独立子工作流仅用于带有 `release_package_spec` 或 `npm_telegram_package_spec` 的定向已发布包重跑。最终验证器摘要会为每个子运行包含最慢作业表，因此发布经理无需下载日志就能看到当前关键路径。

该发布路径中的产品性能子工作流仅产出工件。总控触发它时会设置 `publish_reports=false`，并且只有在其仅工件的守卫证明 Clawgrit 报告发布器确实保持跳过时，验证才会被接受。

请参阅 [完整发布验证](/reference/full-release-validation)，了解完整的阶段矩阵、精确的工作流作业名称、stable 与 full 配置文件差异、工件，以及定向重跑处理句柄。

子工作流会从运行 `Full Release Validation` 的 SHA 固定可信引用中触发。每个子运行都必须使用完全相同的父工作流 SHA。不要为了发布证明而使用原始的 `--ref main -f ref=<sha>` 触发方式；请使用 `pnpm ci:full-release --sha <target-sha> --target-ref release/YYYY.M.PATCH`。

使用 `release_profile` 来选择实时/提供方覆盖范围：

- `beta`：最快的发布关键 OpenAI/core live 和 Docker 路径
- `stable`：在 beta 基础上增加 stable 提供方/后端覆盖，以用于发布批准
- `full`：在 stable 基础上增加更广泛的顾问型提供方/媒体覆盖

Stable 和 full 验证在晋升前始终会运行完整的 live/E2E、Docker 发布路径，以及受限的已发布升级幸存者扫描。使用 `run_release_soak=true` 可对 beta 请求同样的扫描。该扫描覆盖最新的四个 stable 包，再加上固定的 `2026.4.23` 和 `2026.5.2` 基线，以及更早的 `2026.4.15` 覆盖；重复基线会被去重，每个基线都会分片到各自独立的 Docker runner 作业中。

`OpenClaw Release Checks` 会使用可信的工作流引用，将目标引用一次解析为 `release-package-under-test`，并在 soak 运行时在跨 OS、Package Acceptance 和发布路径 Docker 检查中复用该工件。这使所有面向包的检查都基于同一份字节内容，并避免重复打包。对于已在 npm 上发布的 beta，请设置 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，这样发布检查会一次下载已发布包，从 `dist/build-info.json` 中提取其构建源 SHA，并将该工件复用于跨 OS、Package Acceptance、发布路径 Docker 以及 package Telegram 线路。

跨 OS 的 OpenAI 安装冒烟会在仓库/组织变量已设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.6-luna`，因为这条线路验证的是包安装、引导、网关启动以及一次 live agent 交互，而不是对最强模型进行基准测试。更广泛的 live 提供方矩阵仍然是进行模型特定覆盖的地方。

根据发布阶段使用这些变体：

```bash
# 验证产品完整的 Code SHA。
pnpm ci:full-release \
  --sha <code-sha> \
  --target-ref release/YYYY.M.PATCH

# 通过复用 Code SHA 的产品证据来验证仅变更 changelog 的 Release SHA。
pnpm ci:full-release \
  --sha <release-sha> \
  --target-ref release/YYYY.M.PATCH

# 在发布 beta 后，增加已发布包的 Telegram E2E。
pnpm ci:full-release \
  --sha <release-sha> \
  --target-ref release/YYYY.M.PATCH \
  -f release_package_spec=openclaw@YYYY.M.PATCH-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.PATCH-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

不要在一次定向修复后的第一次重跑中使用完整总控。如果某个检查箱失败，请在下一次证明中使用失败的子工作流、作业、Docker 线路、包配置文件、模型提供方或 QA 线路。只有当修复更改了共享的发布编排，或者使之前的全箱证据过期时，才再次运行完整总控。总控的最终验证器会重新检查记录的子工作流运行 id，因此当某个子工作流成功重跑后，只需重跑失败的 `Verify full validation` 父作业。

如果发布配置文件、有效的 soak 设置和验证输入匹配，并且目标 SHA 要么完全相同，要么新的目标是其后代且完整变更路径集合恰好是 `CHANGELOG.md`，则 `rerun_group=all` 可以复用之前的绿色总控运行。精确目标复用会记录 `exact-target-full-validation-v1`；验证后的 Release SHA 会记录 `changelog-only-release-v1`。后者只复用产品验证。Npm 预检、包字节、发布说明来源，以及安装/更新验收仍然必须针对 Release SHA 运行。任何版本、源代码、生成物、依赖、包或工作流拥有的目标变更都需要新的 Code SHA 和全新的完整验证。同一 `release/*` 引用和相同重跑组的更新总控运行会自动取代进行中的运行。传入 `reuse_evidence=false` 可强制进行一次全新的完整运行。

对于受限恢复，请将 `rerun_group` 传给总控。`all` 是真实的发布候选运行，`ci` 只运行 normal CI 子工作流，`plugin-prerelease` 只运行仅发布使用的插件子工作流，`release-checks` 运行所有发布检查箱，而更窄的发布组包括 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。定向的 `npm-telegram` 重跑需要 `release_package_spec` 或 `npm_telegram_package_spec`；完整/all 运行会在 Package Acceptance 中使用标准包 Telegram E2E。定向的跨 OS 重跑可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/套件过滤器。QA 发布检查失败会阻止正常发布验证，包括 core runtime-pair 线路中 OpenClaw 动态工具漂移。Tideclaw alpha 运行仍可能将非包安全性的发布检查线路视为顾问性质。使用 `release_profile=beta` 时，`Run repo/live E2E validation` 的 live 提供方套件为顾问性质（警告，而非阻塞）；stable 和 full 配置文件则保持阻塞。当前者明确请求受控的 QA live 线路（如 Discord、WhatsApp 或 Slack）时，相应的 `OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 仓库变量必须已启用；否则输入捕获会失败，而不会悄悄跳过该线路。

### Vitest

Vitest 框是手动 `CI` 子工作流。手动 CI 会有意绕过变更范围限制，并强制对发布候选执行标准测试图：Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python skills、Windows、macOS，以及 Control UI i18n。当运行该框的 `Full Release Validation` 时会包含 Android，因为总流程会传入 `include_android=true`；而独立的手动 CI 需要 `include_android=true` 才能覆盖 Android。

当你需要回答“源代码树是否通过了完整的常规测试套件？”时使用此框。它不同于发布路径上的产品验证。需要保留的证据：

- `Full Release Validation` 摘要中显示的已派发 `CI` 运行 URL
- 精确目标 SHA 上绿色通过的 `CI` 运行
- 在调查回归时，CI jobs 中失败或耗时过长的分片名称
- 当运行需要性能分析时，Vitest 的计时产物，例如 `.artifacts/vitest-shard-timings.json`

仅当发布需要确定性的常规 CI，但不需要 Docker、QA Lab、live、cross-OS 或 package 框时，才直接运行手动 CI。非 Android 的直接 CI 使用第一条命令。若直接的发布候选 CI 必须覆盖 Android，则添加 `include_android=true`：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.PATCH -f include_android=true
```

### Docker

Docker 区块位于 `OpenClaw Release Checks` 中，通过 `openclaw-live-and-e2e-checks-reusable.yml` 实现，另外还有发布模式的 `install-smoke` 工作流。它通过打包后的 Docker 环境来验证发布候选版本，而不仅仅是源码级测试。

发布 Docker 覆盖包括：

- 启用慢速 Bun 全局安装 smoke 的完整安装 smoke
- 按目标 SHA 复用的 root Dockerfile smoke 镜像准备，以及 QR、root/gateway、installer/Bun smoke 作业作为独立的 install-smoke 分片运行
- 仓库 E2E 线路
- 发布路径 Docker 分块：`core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a` 到 `plugins-runtime-install-h`，以及 `openwebui`
- 在请求时，于专用大磁盘运行器上提供 OpenWebUI 覆盖
- 拆分的 bundled plugin 安装/卸载线路 `bundled-plugin-install-uninstall-0` 到 `bundled-plugin-install-uninstall-23`
- 当发布检查包含 live 套件时，live/E2E 提供方套件和 Docker live 模型覆盖

重新运行前请先使用 Docker artifacts。发布路径调度器会上传 `.artifacts/docker-tests/`，其中包含线路日志、`summary.json`、`failures.json`、阶段耗时、调度计划 JSON 以及重新运行命令。对于有针对性的恢复，请在可复用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是重新运行所有发布分块。生成的重新运行命令会在可用时包含之前的 `package_artifact_run_id` 和已准备好的 Docker 镜像输入，因此失败的线路可以复用同一个 tarball 和 GHCR 镜像。

### QA 实验室

QA 实验室盒子也是 `OpenClaw Release Checks` 的一部分。它是代理行为和渠道级发布门禁，独立于 Vitest 和 Docker 包机制。

发布 QA 实验室覆盖包括：

- 模拟一致性通道，将 OpenAI 候选通道与 `anthropic/claude-opus-4-8` 基线进行比较，使用代理行为一致性测试包
- 使用 `qa-live-shared` 环境的 Matrix 实时适配器目录通道
- 使用 Convex CI 凭证租约的 Telegram 实时 QA 通道
- 当发布遥测需要明确的本地证明时，运行 `pnpm qa:otel:smoke`、`pnpm qa:otel:collector-smoke`、`pnpm qa:prometheus:smoke` 或 `pnpm qa:observability:smoke`

使用这个盒子来回答“发布在 QA 场景和实时渠道流程中是否表现正确？”在批准发布时，请保留一致性、Matrix 和 Telegram 通道的制品 URL。Matrix 运行在定时、手动和发布工作流中使用相同的基于目录派生的分片选择。

### 软件包

Package box 是可安装产品的入口。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mts` 提供支持。解析器会将候选项规范化为 Docker E2E 使用的 `package-under-test` tarball，验证软件包清单，记录软件包版本和 SHA-256，并使工作流 harness 引用与软件包源引用保持分离。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest`，或任意精确的 OpenClaw 发布版本
- `source=ref`：使用所选的 `workflow_ref` 测试 harness 打包一个受信任的 `package_ref` 分支、标签或完整 commit SHA
- `source=url`：下载一个公开的 HTTPS `.tgz`，并且必须提供 `package_sha256`；URL 凭据、非默认 HTTPS 端口、私有/内部/特殊用途主机名或解析后的地址，以及不安全的重定向都会被拒绝
- `source=trusted-url`：从 `.github/package-trusted-sources.json` 中某个命名策略下载一个 HTTPS `.tgz`，并且必须提供 `package_sha256` 和来自该策略的 `trusted_source_id`；请将其用于维护者拥有的企业镜像或私有软件包仓库，而不是向 `source=url` 添加输入级的私有网络绕过
- `source=artifact`：重用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 以 `source=artifact`、准备好的发布软件包制品、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape`、`telegram_mode=mock-openai` 运行 Package Acceptance。Package Acceptance 会针对同一个已解析 tarball 保持迁移、更新、root 管理的 VPS 升级、已配置认证的更新重启、实时 ClawHub skill 安装、过时插件依赖清理、离线插件 fixture、插件更新、插件命令绑定逃逸加固以及 Telegram 软件包 QA。阻塞发布检查使用默认的最新已发布软件包基线；带有 `run_release_soak=true`、`release_profile=stable` 或 `release_profile=full` 的 beta 配置会将 `published-upgrade-survivor` 扫描扩展到 `last-stable-4`，以及固定的 `2026.4.23`、`2026.5.2` 和 `2026.4.15` 基线，并包含 `reported-issues` 场景。对于已经发布的候选项使用 `source=npm` 运行 Package Acceptance；在发布前对于带 SHA 支持的本地 npm tarball 使用 `source=ref`；对于维护者拥有的企业/私有镜像使用 `source=trusted-url`；或者对于由另一个 GitHub Actions 运行上传的准备好 tarball 使用 `source=artifact`。

它是 GitHub 原生的替代方案，用于此前大多需要 Parallels 才能覆盖的软件包/更新测试。跨操作系统的发布检查对于 OS 特定的入门、安装器和平台行为仍然重要，但软件包/更新产品验证应优先使用 Package Acceptance。

更新和插件验证的权威清单是[测试更新和插件](/help/testing-updates-plugins)。在决定哪个本地、Docker、Package Acceptance 或发布检查线路可以证明某个插件安装/更新、doctor 清理或已发布软件包迁移变更时，请使用它。对每个稳定版 `2026.4.23+` 软件包进行穷尽式已发布更新迁移，是单独的手动 `Update Migration` 工作流，不属于 Full Release CI 的一部分。

旧版 package-acceptance 的宽松规则是有意设置时间范围的。直到 `2026.4.25` 的软件包可以使用兼容路径来处理已发布到 npm 的元数据缺口：tarball 中缺失的私有 QA 清单条目、缺失的 `gateway install --wrapper`、tarball 派生 git fixture 中缺失的补丁文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 软件包对于已经发货的本地构建元数据戳文件可以发出警告。更晚的软件包必须满足现代软件包契约；这些相同的缺口会使发布验证失败。

当发布问题关乎实际可安装软件包时，请使用更宽泛的 Package Acceptance 配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常见的软件包配置文件：

- `smoke`：快速的软件包安装/通道/代理、gateway 网络和配置重载线路
- `package`：安装/更新/重启/插件软件包契约，以及实时 ClawHub skill 安装证明；这是发布检查的默认值
- `product`：`package` 加上 MCP 通道、cron/subagent 清理、OpenAI 网页搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径分块
- `custom`：用于定向重跑的精确 `docker_lanes` 列表

对于软件包候选项的 Telegram 证明，在 Package Acceptance 上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。该工作流会将解析后的 `package-under-test` tarball 传入 Telegram 线路；独立的 Telegram 工作流在发布后检查时仍然接受已发布的 npm spec。

## 常规发布发布自动化

对于 beta、`latest`、插件、GitHub Release 和平台发布，
`OpenClaw Release Publish` 是正常的变更型入口点。每月
`.33+` Gateway 扩展稳定路径不使用这个编排器。常规工作流按发布所需的顺序编排受信任发布者工作流：

1. 检出发布标签并解析其提交 SHA。
2. 验证该标签可从 `main` 或 `release/*`（或 alpha 预发布版本对应的 Tideclaw alpha 分支）访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和 `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 调度 `Plugin ClawHub Release`。
6. 在验证已保存的 `full_release_validation_run_id` 和准确的运行 attempt 后，使用发布标签、npm dist-tag 以及已保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。
7. 验证已发布的 npm 包和 selector 回读，然后使用不可变标签和 SHA 调用可复用的 `Docker Release`。对于稳定版本，将 GitHub release 创建或更新为草稿，使用明确的 `windows_node_tag` 和候选版本已批准的 `windows_node_installer_digests` 调度 `Windows Node Release`，并验证规范的 Windows 安装程序/校验和资产。同时调度 `Android Release`，以构建精确标签对应的已签名 APK 及其校验和和来源证明。只有在 Docker 和两个原生资产契约均成功后，才最终确定 GitHub release。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref main \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f full_release_validation_run_attempt=<successful-full-release-validation-run-attempt> \
  -f npm_dist_tag=beta
```

发布稳定版到默认 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref main \
  -f tag=vYYYY.M.PATCH \
  -f windows_node_tag=vX.Y.Z \
  -f windows_node_installer_digests='{"OpenClawCompanion-Setup-x64.exe":"sha256:<approved-x64-sha256>","OpenClawCompanion-Setup-arm64.exe":"sha256:<approved-arm64-sha256>"}' \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f full_release_validation_run_attempt=<successful-full-release-validation-run-attempt> \
  -f npm_dist_tag=beta
```

直接提升稳定版到 `latest` 是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref main \
  -f tag=vYYYY.M.PATCH \
  -f windows_node_tag=vX.Y.Z \
  -f windows_node_installer_digests='{"OpenClawCompanion-Setup-x64.exe":"sha256:<approved-x64-sha256>","OpenClawCompanion-Setup-arm64.exe":"sha256:<approved-arm64-sha256>"}' \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f full_release_validation_run_attempt=<successful-full-release-validation-run-attempt> \
  -f npm_dist_tag=latest
```

仅在需要有针对性的修复或重新发布工作时才使用更底层的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。`OpenClaw Release Publish` 在 `publish_openclaw_npm=true` 时会拒绝 `plugin_publish_scope=selected`，因此核心包不能在没有所有可发布的官方插件（包括 `@openclaw/diffs-language-pack`）的情况下发布。对于选定插件的修复，将 `publish_openclaw_npm=false` 与 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 一起设置，或者直接触发子工作流。

首次发布的 ClawHub 引导是例外：从受信任的 `main` 触发 `Plugin ClawHub New`，并通过 `ref` 传递完整的目标 release SHA。绝不要从发布标签或分支运行引导工作流本身：

```bash
gh workflow run plugin-clawhub-new.yml \
  --ref main \
  -f plugins=@openclaw/name \
  -f ref=<full-40-character-release-sha> \
  -f pretag_validation=true \
  -f dry_run=true
```

预标签验证要求 `dry_run=true`，拒绝 release-tag 和 parent-run 输入，并且只接受可从 `main` 或 `release/*` 到达的精确目标。它不会加载 ClawHub 凭证、发布包字节，或更改受信任发布者配置。工作流仍然会解析实时 registry 计划，仅在无密钥的作业中检出并打包目标，实例化锁定的 ClawHub 工具链，并在发布标签存在之前使用不可变 artifact 和 package slug/identity 进行验证。只有在无密钥的打包作业完成后，才批准 `clawhub-plugin-bootstrap` 环境；这个受保护的验证作业没有凭证或变更命令。

已批准的试运行或在打标签后的真实引导必须包含精确的 release tag，以及父级 `OpenClaw Release Publish` 的 run id、attempt 和 branch。父级证明其自身的 workflow SHA，以及用于 `Plugin ClawHub New` 的单独、精确的受信任 `main` SHA；子运行和每一个受保护环境的批准都必须与该已批准的子 SHA 匹配。在每次发布尝试和受信任发布者变更之前，都会重新检查 release tag。

打包作业会上传一个不可变 artifact，该 artifact 的名称、Actions artifact ID/digest、producer run/attempt、目标 SHA，以及每个包的 tarball SHA-256/size，都会传递到验证和受保护作业中。受保护作业仅检出受信任的 `main` 工具链，通过 GitHub API 验证 artifact 元组，按精确 artifact ID 下载，重新哈希每个 tarball，并使用已固定 CLI 的 USTAR 规范化规则验证本地 TAR 路径和 package identity。随后每个候选项都会通过固定 CLI 的发布试运行，该过程会在 registry 查找或认证之前返回。凭证作业的预过滤将压缩后的 ClawPack 上限设为 120 MiB，总文件负载上限为 50 MiB，展开后的 TAR 数据上限为 64 MiB，TAR 条目数上限为 10,000。现有包的受信任发布者修复仍然只是配置性操作，但它仍然会打包目标，并且在更改受信任发布者配置之前，需要请求的标签以及精确的 registry 字节和元数据相等。发布后的验证会下载 ClawHub artifact，并要求相同的 SHA-256 和大小。一次失败重试恢复只有在更早尝试中的 package artifact 对应的精确 producer 作业成功完成时，才能复用该 artifact。最终证据还会绑定锁定的 ClawHub 版本、lock SHA-256 和 npm integrity。不匹配则需要一个新的包版本。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作者控制的输入：

- `tag`: 必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1`、`v2026.4.2-beta.1` 或 `v2026.4.2-alpha.1`；当 `preflight_only=true` 时，也可以使用当前完整 40 字符的 workflow-branch commit SHA 进行仅验证预检
- `preflight_only`: `true` 表示仅验证/构建/打包，`false` 表示真正的发布路径
- `preflight_run_id`: 已存在且成功的预检运行 id，在真正发布路径中必需，以便工作流复用已准备好的 tarball 而不是重新构建
- `full_release_validation_run_id`: 该 tag/SHA 对应的成功 `Full Release Validation` 运行 id，真实发布时必需。Beta 发布可以仅基于预检并带警告继续，但稳定版/`latest` 推送仍然需要它。
- `full_release_validation_run_attempt`: 与 `full_release_validation_run_id` 配对的精确正整数运行尝试次数；只要提供了运行 id 就必需，这样重跑就不能在发布期间改变授权证据
- `release_publish_run_id`: 已批准的 `OpenClaw Release Publish` 运行 id；当该工作流由其父级触发时必需（bot-actor 真实发布调用）
- `plugin_npm_run_id`: 成功且与精确 head 匹配的 `Plugin NPM Release` 运行 id；真实的 `extended-stable` 核心发布时必需
- `npm_dist_tag`: 发布路径使用的 npm 目标标签；可接受 `alpha`、`beta`、`latest` 或 `extended-stable`，默认值为 `beta`。最终补丁号 `33` 及之后必须使用 `extended-stable`；默认情况下，`extended-stable` 会拒绝更早的补丁版本，并且始终拒绝非最终标签。
- `bypass_extended_stable_guard`: 仅供测试使用的布尔值，默认 `false`；当 `npm_dist_tag=extended-stable` 时，可绕过按月的 extended-stable 资格检查，同时保留发布身份、工件、审批和回读检查。

`Plugin NPM Release` 接受 `npm_dist_tag=default` 以沿用现有发布行为，或接受 `npm_dist_tag=extended-stable` 以进入受保护的按月路径。extended-stable 选项要求 `publish_scope=all-publishable`、`plugins` 输入为空、最终补丁号达到或高于 `33`，以及位于其精确顶端的规范化 `extended-stable/YYYY.M.33` 分支。它绝不会移动插件的 `latest` 或 `beta`。新包版本会通过 OIDC 可信发布（`npm publish --tag extended-stable`）以原子方式获得 `extended-stable`；该源工作流不使用令牌认证的 `npm dist-tag add`。重试会跳过 npm 中已存在的精确版本，然后在没有完整回读确认每个精确包和 `extended-stable` 标签都已收敛时，以失败关闭的方式终止。

`OpenClaw Release Publish` 接受以下由操作者控制的输入：

- `tag`: 必需的发布标签；必须已经存在
- `preflight_run_id`: 成功的 `OpenClaw NPM Release` 预检运行 id；当 `publish_openclaw_npm=true` 或 `plugin_publish_scope=all-publishable` 时必需
- `full_release_validation_run_id`: 成功的 `Full Release Validation` 运行 id；当 `publish_openclaw_npm=true` 或 `plugin_publish_scope=all-publishable` 时必需
- `full_release_validation_run_attempt`: 与 `full_release_validation_run_id` 配对的精确正整数运行尝试次数；只要提供了运行 id 就必需
- `windows_node_tag`: 精确的非预发布 `openclaw/openclaw-windows-node` 发布标签；稳定版 OpenClaw 发布时必需
- `windows_node_installer_digests`: 候选版本批准的紧凑 JSON 映射，将当前 Windows 安装程序名称映射到其固定的 `sha256:` 摘要；稳定版 OpenClaw 发布时必需
- `npm_telegram_run_id`: 可选的成功 `NPM Telegram Beta E2E` 运行 id，用于纳入最终发布证据
- `npm_dist_tag`: OpenClaw 软件包的 npm 目标标签，可选值为 `alpha`、`beta`、`latest` 或 `extended-stable`
- `publish_docker_only`: 仅适用于 extended-stable 的恢复/收尾路径。它要求 `publish_openclaw_npm=false`，并提供完整的预检和 Full Release Validation 证据，然后在调用 Docker 发布前验证精确的 npm 软件包、选择器和 tarball 摘要。
- `plugin_publish_scope`: 默认为 `all-publishable`；仅在 `publish_openclaw_npm=false` 时，将其设为 `selected` 用于针对特定插件的修复工作
- `plugins`: 当 `plugin_publish_scope=selected` 时，以逗号分隔的 `@openclaw/*` 软件包名称
- `publish_openclaw_npm`: 默认为 `true`；仅在将该工作流用作仅插件修复编排器时设为 `false`
- `release_profile`: 用于发布证据摘要的发布覆盖范围配置；默认为 `from-validation`，从验证清单中读取，或改为 `beta`、`stable` 或 `full`
- `wait_for_clawhub`: 默认为 `false`，因此 npm 可用性不会受到 ClawHub 旁路流程的阻塞；仅当工作流完成必须包含 ClawHub 完成状态时设为 `true`

`OpenClaw Release Checks` 接受以下由操作者控制的输入：

- `ref`: 要验证的分支、标签或完整 commit SHA。涉及密钥的检查要求解析后的 commit 必须可从 OpenClaw 分支或发布标签到达。
- `run_release_soak`: 为 beta 发布检查启用全面的实时/E2E、Docker 发布路径，以及所有自首次以来升级存活者 soak。它会被 `release_profile=stable` 和 `release_profile=full` 强制开启。

规则：

- 低于补丁号 `33` 的常规最终版和修正版可以发布到 `beta` 或 `latest` 中任一目标。补丁号达到 `33` 或更高的最终版本必须发布到 `extended-stable`，且该边界上的修正后缀版本会被拒绝。
- Beta 预发布标签只能发布到 `beta`；alpha 预发布标签只能发布到 `alpha`
- 对于 `OpenClaw NPM Release`，完整 commit SHA 输入仅在 `preflight_only=true` 时允许
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终仅用于验证
- 真正的发布路径必须使用与预检期间相同的 `npm_dist_tag`；工作流在发布前会验证该元数据是否继续保持一致。

## 常规 beta/latest 稳定版发布序列

这个旧版序列用于常规编排发布，它还负责插件、GitHub Release、Windows 以及其他平台工作。它不是本页顶部所记录的每月 `.33+` Gateway 扩展稳定版路径。

当进行常规编排稳定版发布时：

1. 运行带有 `preflight_only=true` 的 `OpenClaw NPM Release`。在尚未存在标签之前，你可以使用当前完整 workflow 分支的 commit SHA，对 preflight workflow 进行仅验证的 dry run。
2. 正常的 beta-first 流程请选择 `npm_dist_tag=beta`，只有在你有意直接发布稳定版时才选择 `latest`。
3. 当你希望通过一次手动 workflow 同时获得正常 CI、实时 prompt cache、Docker、QA Lab、Matrix 和 Telegram 覆盖时，在 release branch、release tag 或完整 commit SHA 上运行 `Full Release Validation`。如果你有意只需要确定性的正常测试图，则改为在 release ref 上手动运行 `CI` workflow。
4. 选择精确的非预发布 `openclaw/openclaw-windows-node` release tag，其签名过的 x64 和 ARM64 安装包应当发布。将其保存为 `windows_node_tag`，并将它们经过验证的 digest map 保存为 `windows_node_installer_digests`。release-candidate helper 会记录这两项，并将它们包含在其生成的发布命令中。
5. 保存成功的 `preflight_run_id`、`full_release_validation_run_id` 和精确的 `full_release_validation_run_attempt`。
6. 从受信任的 `main` 运行 `OpenClaw Release Publish`，使用相同的 `tag`、相同的 `npm_dist_tag`、所选的 `windows_node_tag`、其已保存的 `windows_node_installer_digests`、已保存的 `preflight_run_id`、`full_release_validation_run_id` 和 `full_release_validation_run_attempt`。它会先将外部化插件发布到 npm 和 ClawHub，然后再推进 OpenClaw npm 包。
7. 如果发布落在 `beta` 上，使用 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` workflow 将该稳定版本从 `beta` 提升到 `latest`。
8. 如果发布有意直接发布到 `latest`，并且 `beta` 应立即跟随同一个稳定构建，则使用相同的 release workflow 将两个 dist-tag 都指向该稳定版本，或者让其按计划运行的自愈同步稍后再将 `beta` 移动过去。

dist-tag 的变更保存在 release ledger 仓库中，因为它仍然需要 `NPM_TOKEN`，而源仓库保持仅 OIDC 的发布方式。这样既保留了直接发布路径，也保留了 beta-first 的晋升路径，并且两者都可记录且对操作者可见。

如果维护者必须回退到本地 npm 身份验证，只能在专用的 tmux 会话中运行任何 1Password CLI（`op`）命令。不要从主 agent shell 直接调用 `op`；将其保留在 tmux 中可以使提示、告警和 OTP 处理保持可见，并防止重复的主机告警。

## 公共参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`.github/workflows/docker-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/docker-release.yml)
- [`scripts/resolve-openclaw-package-candidate.mts`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mts)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者在 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中使用私有发布文档作为实际的操作手册。

## 相关

- [发布渠道](/install/development-channels)
