---
summary: "发布通道、操作员检查清单、验证框、版本命名和发布节奏"
title: "发布策略"
read_when:
  - 寻找公开发布通道定义
  - 运行发布验证或包验收
  - 寻找版本命名和发布节奏
---

OpenClaw 有三个公开发布通道：

- stable：默认发布到 npm `beta` 的带标签发布版本，或在明确请求时发布到 npm `latest`
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 分支的移动头部（最新提交）

## 版本命名

- 稳定版发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- 稳定修正版发布版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月份和日期不要补零
- `latest` 表示当前已晋级的稳定 npm 发布
- `beta` 表示当前 beta 安装目标
- 稳定版和稳定修正版默认发布到 npm `beta`；发布操作员可以显式指定 `latest`，或者稍后再将经过验证的 beta 构建提升为稳定版
- 每个稳定版 OpenClaw 发布都会同时发布 npm 包和 macOS 应用；
  beta 发布通常先验证并发布 npm/包路径，而 mac app 的构建/签名/notarize 默认留给稳定版，除非明确请求

## 发布节奏

- 发布先走 beta
- 只有在最新 beta 通过验证后才发布稳定版
- 维护者通常从由当前 `main` 分支创建的 `release/YYYY.M.D` 分支切出发布；
  这样发布验证和修复不会阻塞 `main` 上的新开发
- 如果 beta 标签已经推送或发布且需要修复，维护者会切出下一个 `-beta.N` 标签，而不是删除或重建旧的 beta 标签
- 详细发布流程、审批、凭据和恢复说明仅供维护者使用

## 发布操作员检查清单

此检查清单是发布流程的公开形式。私有凭据、
签名、notarization、dist-tag 恢复和紧急回滚细节保留在
仅维护者可见的发布操作手册中。

1. 从当前 `main` 开始：拉取最新代码，确认目标提交已推送，
   并确认当前 `main` 的 CI 足以从其分支出去。
2. 使用 `/changelog` 根据真实提交历史重写顶部的 `CHANGELOG.md` 部分，
   保持条目面向用户，提交并推送，然后在分支前再 rebase/pull 一次。
3. 审查
   `src/plugins/compat/registry.ts` 和
   `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。仅当升级路径仍被覆盖时才移除已过期的兼容性，或者记录为何有意保留。
4. 从当前 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上进行正常发布工作。
5. 为目标标签更新所有必需的版本位置，然后运行本地确定性预检：
   `pnpm check:test-types`、`pnpm check:architecture`、
   `pnpm build && pnpm ui:build`，以及 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在标签尚不存在之前，
   允许使用完整的 40 字符发布分支 SHA 仅用于验证性预检。保存成功的 `preflight_run_id`。
7. 使用针对发布分支、标签或完整 commit SHA 的 `Full Release Validation` 启动所有预发布测试。
   这是四个大型发布测试框的唯一手动入口：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，在发布分支上修复并重新运行能证明修复的最小失败
   文件、lane、workflow job、package profile、provider 或 model allowlist。
   只有当变更面使先前证据失效时，才重新运行完整的总验证。
9. 对于 beta，标记 `vYYYY.M.D-beta.N`，使用 npm dist-tag `beta` 发布，然后针对已发布的 `openclaw@YYYY.M.D-beta.N`
   或 `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的 beta 需要修复，切出下一个 `-beta.N`；不要删除或重写旧的 beta。
10. 对于 stable，仅在经过验证的 beta 或 release candidate 具有所需验证证据后继续。稳定版 npm 发布通过 `preflight_run_id` 复用成功的预检产物；
    稳定版 macOS 发布就绪状态还要求在 `main` 上存在已打包的 `.zip`、`.dmg`、`.dSYM.zip` 和更新后的 `appcast.xml`。
11. 发布后，运行 npm 发布后验证器、在需要发布后通道证明时可选运行独立的已发布 npm Telegram E2E、需要时进行 dist-tag 晋级、基于完整匹配 `CHANGELOG.md` 部分生成 GitHub release/prerelease notes，以及发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，这样测试 TypeScript 可以在更快的本地 `pnpm check` 门禁之外保持覆盖
- 在发布预检之前运行 `pnpm check:architecture`，这样更广泛的导入循环和架构边界检查可以在更快的本地门禁之外保持通过
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，这样 pack 验证步骤所需的 `dist/*` 发布产物和 Control UI bundle 会存在
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口启动所有预发布测试框。它接受分支、标签或完整 commit SHA，分发手动 `CI`，并分发
  `OpenClaw Release Checks`，用于安装 smoke、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab parity、Matrix 和 Telegram lanes。仅在包已发布且也应运行发布后 Telegram E2E 时提供 `npm_telegram_package_spec`。当私有证据报告应证明验证与已发布的 npm 包一致而无需强制 Telegram E2E 时，提供 `evidence_package_spec`。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你在发布工作继续进行时，希望为某个包候选获得侧路证明，可运行手动 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或确切发布版本使用 `source=npm`；使用 `source=ref` 将受信任的 `package_ref` 分支/标签/SHA 与当前 `workflow_ref` harness 一起打包；对带有必需 SHA-256 的 HTTPS tarball 使用 `source=url`；或对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该工作流会将候选项解析为
  `package-under-test`，针对该 tarball 复用 Docker E2E 发布调度器，并且可使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  常见配置：
  - `smoke`：安装/通道/agent、gateway 网络和配置重载 lanes
  - `package`：不含 OpenWebUI 或 live ClawHub 的原生包/更新/plugin lanes
  - `product`：包配置加上 MCP channels、cron/subagent 清理、
    OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径 chunks
  - `custom`：用于定向重跑的精确 `docker_lanes` 选择
- 当你只需要为发布候选提供完整常规 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 分发会绕过变更范围并强制执行 Linux Node shards、bundled-plugin shards、channel contracts、Node 22 兼容性、`check`、`check-additional`、build smoke、docs checks、Python skills、Windows、macOS、Android 和 Control UI i18n lanes。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP receiver 对 QA-lab 进行测试，并验证导出的 trace span 名称、受限属性以及内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在每次带标签发布前运行 `pnpm release:check`
- 发布检查现在在单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布批准前运行 QA Lab mock parity gate，以及快速 live Matrix profile 和 Telegram QA lane。live lanes 使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当你希望并行获取完整的 Matrix 传输、媒体和 E2EE 库存时，请运行手动 `QA-Lab - All Lanes` 工作流，并设置 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统安装和升级运行时验证是公开 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用可复用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这样拆分是有意为之：保持真实的 npm 发布路径简短、
  确定性且以产物为中心，同时将较慢的 live 检查保留在它们自己的 lane 中，以免拖慢或阻塞发布
- 带密钥的发布检查应通过 `Full Release Validation`
Validation` 或从 `main`/release 工作流 ref 分发，以便工作流逻辑和
  密钥保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整 commit SHA，只要解析出的提交可从 OpenClaw 分支或发布标签到达即可
- `OpenClaw NPM Release` 的仅预检预检也接受当前完整的 40 字符 workflow-branch commit SHA，而无需已推送的标签
- 该 SHA 路径仅用于验证，不能晋级为真正的发布
- 在 SHA 模式下，工作流仅为包元数据检查综合生成 `v<package.json version>`；真正发布仍然需要真实的发布标签
- 两个工作流都将真实的发布和晋级路径保留在 GitHub 托管 runner 上，而非变更型验证路径可以使用更大的 Blacksmith Linux runner
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布预检不再等待独立发布检查通道
- 运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配 beta/修正标签）
- 发布后运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/修正版本）以在新的临时前缀中验证已发布的注册表安装路径
- 在 beta 发布后，运行
  `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享租用的 Telegram 凭据池验证已安装包的入门流程、Telegram 设置以及真实 Telegram E2E，针对已发布的 npm 包进行验证。维护者在本地的一次性操作可以省略 Convex 变量，并直接传入三个
  `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 维护者可以通过 GitHub Actions 中的手动
  `NPM Telegram Beta E2E` 工作流运行相同的发布后检查。它是有意设置为仅手动运行，不会在每次合并时执行。
- 维护者发布自动化现在使用先预检后晋级：
  - 真正的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真正的 npm 发布必须与成功预检运行相同的 `main` 或
    `release/YYYY.M.D` 分支触发
  - 稳定 npm 发布默认发布到 `beta`
  - 稳定 npm 发布可以通过工作流输入显式指定目标为 `latest`
  - 基于 token 的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公开仓库保持仅 OIDC 的发布
  - 公开的 `macOS Release` 仅用于验证
  - 真正的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会晋级已准备好的产物，而不是再次重新构建它们
- 对于 `YYYY.M.D-N` 这样的稳定修正版发布，发布后验证器
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  因此发布修正不能悄悄让旧的全局安装仍停留在
  基础稳定载荷上
- npm 发布预检会在 tarball 不同时包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 载荷时失败关闭，
  这样我们就不会再次发布空白浏览器仪表板
- 发布后验证还会检查已发布的注册表安装是否在根目录 `dist/*`
  布局下包含非空的已捆绑插件运行时依赖。若发布时缺少或为空的已捆绑插件
  依赖载荷，发布后验证器将失败，
  且无法晋级到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新 tarball 强制执行 npm pack 的
  `unpackedSize` 预算，因此安装器 e2e 可以在发布路径之前捕获意外的打包膨胀
- 如果此次发布工作涉及 CI 规划、扩展时间清单或扩展测试矩阵，请在批准前从 `.github/workflows/ci.yml`
  重新生成并审查由 planner 拥有的 `checks-node-extensions` 工作流矩阵输出，
  以免发布说明描述了过时的 CI 布局
- 稳定版 macOS 发布就绪状态还包括更新器相关面：
  - GitHub release 最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在发布后必须指向新的稳定 zip
  - 打包好的应用必须保留非调试 bundle id、非空的 Sparkle feed
    URL，以及不低于该发布版本对应规范 Sparkle build floor 的 `CFBundleVersion`

## 发布测试盒

`Full Release Validation` 是操作员从一个入口点启动所有预发布测试的方式。请从受信任的 `main` 工作流 ref 运行它，并将发布分支、标签或完整 commit SHA 作为 `ref` 传入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

该工作流会解析目标 ref，分派手动 `CI` 并设置 `target_ref=<release-ref>`，分派 `OpenClaw Release Checks`，并在设置了 `npm_telegram_package_spec` 时可选地分派独立的发布后 Telegram E2E。随后，`OpenClaw Release Checks` 会并行展开安装冒烟测试、跨操作系统发布检查、实时/E2E Docker 发布路径覆盖、包含 Telegram 包 QA 的 Package Acceptance、QA Lab 一致性检查、实时 Matrix，以及实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 都成功，并且任何可选的 `npm_telegram` 子流程要么成功要么被有意跳过时，完整运行才是可接受的。子工作流会从运行 `Full Release Validation` 的受信任 ref 分派，通常是 `--ref main`，即使目标 `ref` 指向较旧的发布分支或标签也是如此。没有单独的 Full Release Validation workflow-ref 输入；请选择工作流运行 ref 来选择受信任的执行框架。

根据发布阶段使用以下变体：

```bash
# 验证一个尚未发布的候选发布分支。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both

# 验证一个精确推送的 commit。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# 在发布 beta 之后，增加已发布包的 Telegram E2E。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

在有针对性的修复之后，不要把完整总控流程作为第一次重跑。如果某个盒子失败，请在下一次验证中使用失败的子工作流、作业、Docker 线路、包配置、模型提供方或 QA 线路。只有当修复改动了共享的发布编排，或者让更早的全盒证据变得过时时，才再次运行完整总控流程。总控流程的最终验证器会重新检查已记录的子工作流运行 id，因此当某个子工作流成功重跑后，只需重跑失败的 `Verify full validation` 父作业。

为了进行有限恢复，请向总控流程传入 `rerun_group`。`all` 是真正的发布候选运行，`ci` 只运行普通 CI 子流程，`release-checks` 运行所有发布盒，而更窄的发布组包括 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live`，以及在提供独立包 Telegram 线路时的 `npm-telegram`。

### Vitest

Vitest 盒子就是手动的 `CI` 子工作流。手动 CI 会故意绕过变更范围限制，并为发布候选强制使用正常的测试图：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 兼容性、`check`、`check-additional`、构建冒烟、文档检查、Python skills、Windows、macOS、Android，以及 Control UI i18n。

使用这个盒子来回答“源代码树是否通过了完整的正常测试套件？”它不等同于发布路径的产品验证。需要保留的证据包括：

- `Full Release Validation` 摘要中显示分派出的 `CI` 运行 URL
- 针对精确目标 SHA 的绿色 `CI` 运行
- 在调查回归时，CI 作业中的失败或缓慢分片名称
- 当运行需要性能分析时，Vitest 时间统计工件，例如 `.artifacts/vitest-shard-timings.json`

只有当发布确实需要确定性的正常 CI，而不需要 Docker、QA Lab、实时、跨操作系统或包盒子时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 盒子位于 `OpenClaw Release Checks` 中，通过
`openclaw-live-and-e2e-checks-reusable.yml`，以及发布模式下的
`install-smoke` 工作流来实现。它通过打包后的 Docker 环境而不只是源代码级测试来验证发布候选。

发布 Docker 覆盖包括：

- 启用慢速 Bun 全局安装冒烟的完整安装冒烟测试
- 仓库 E2E 线路
- 发布路径 Docker 分块：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-core`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `bundled-channels-core`、`bundled-channels-update-a`、
  `bundled-channels-update-b`、以及 `bundled-channels-contracts`
- 在请求时，`plugins-runtime-core` 分块内的 OpenWebUI 覆盖
- 将捆绑 channel 依赖线路拆分为 channel-smoke、update-target，
  以及 setup/runtime contract 分块，而不是一个大的 bundled-channel 作业
- 拆分的 bundled plugin 安装/卸载线路
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-7`
- 当 release checks 包含实时套件时的 live/E2E provider 套件和 Docker live 模型覆盖

重跑前请先使用 Docker 工件。发布路径调度器会上传
`.artifacts/docker-tests/`，其中包含线路日志、`summary.json`、`failures.json`、
阶段耗时、调度计划 JSON，以及重跑命令。对于有针对性的恢复，请在可复用的 live/E2E 工作流上使用
`docker_lanes=<lane[,lane]>`，而不是重跑所有发布分块。生成的重跑命令会在可用时包含先前的
`package_artifact_run_id` 和已准备好的 Docker 镜像输入，因此失败的线路可以复用同一个 tarball 和 GHCR 镜像。

### QA Lab

QA Lab 盒子也是 `OpenClaw Release Checks` 的一部分。它是面向智能体行为和 channel 级别的发布闸门，独立于 Vitest 和 Docker 包机制。

发布 QA Lab 覆盖包括：

- 使用 agentic parity pack，将 OpenAI 候选线路与 Opus 4.6 基线进行比较的 mock 一致性闸门
- 使用 `qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭据租约的实时 Telegram QA 线路
- 当发布遥测需要明确的本地证据时，运行 `pnpm qa:otel:smoke`

使用这个盒子来回答“发布在 QA 场景和实时 channel 流程中是否表现正确？”在批准发布时，请保留 parity、Matrix 和 Telegram 线路的工件 URL。完整的 Matrix 覆盖仍可作为手动分片 QA-Lab 运行，而不是默认的发布关键线路。

### Package

Package 盒子是可安装产品的闸门。它由 `Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 提供支持。解析器会将候选内容规范化为
`package-under-test` tarball，供 Docker E2E 使用，验证包清单，记录包版本和 SHA-256，并保持工作流执行框架 ref 与包源 ref 分离。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest`，或一个精确的 OpenClaw 发布版本
- `source=ref`：使用选定的 `workflow_ref` 执行框架，将受信任的 `package_ref` 分支、标签或完整 commit SHA 打包
- `source=url`：下载带有必需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：复用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 会运行 `source=ref` 的 Package Acceptance，使用
`package_ref=<release-ref>`、`suite_profile=custom`、
`docker_lanes=bundled-channel-deps-compat plugins-offline`，以及
`telegram_mode=mock-openai`。发布路径 Docker 分块覆盖重叠的安装、更新和插件更新线路；Package Acceptance 保持与工件原生的 bundled-channel 兼容性、离线插件 fixture，以及针对同一已解析 tarball 的 Telegram 包 QA。对于以前需要 Parallels 的大多数 package/update 覆盖，这是 GitHub 原生替代方案。跨操作系统发布检查对于与 OS 相关的引导、安装器和平台行为仍然重要，但 package/update 产品验证应优先使用 Package Acceptance。

历史 package-acceptance 的宽松策略被有意设定了时间范围。对于 `2026.4.25` 之前的包，若 npm 上已发布的元数据存在缺口，可使用兼容路径：tarball 中缺少的私有 QA inventory 条目、缺少 `gateway install --wrapper`、tarball 派生 git fixture 中缺少补丁文件、缺少持久化的 `update.channel`、旧版插件安装记录位置、缺少 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。`2026.4.25` 之后的包必须满足现代包契约；这些相同的缺口会导致发布验证失败。

当发布问题关乎一个真正可安装的包时，请使用更广泛的 Package Acceptance 配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

常见的包配置文件：

- `smoke`：快速的包安装/channel/agent、gateway 网络和配置重载线路
- `package`：不包含 live ClawHub 的安装/更新/插件包契约；这是发布检查的默认项
- `product`：`package` 加上 MCP channels、cron/subagent 清理、OpenAI web 搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径分块
- `custom`：用于有针对性重跑的精确 `docker_lanes` 列表

对于包候选的 Telegram 证明，请在 Package Acceptance 上启用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。该工作流会将解析后的 `package-under-test` tarball 传递给 Telegram 线路；独立的 Telegram 工作流在发布后检查时仍接受已发布的 npm 规格。

## NPM workflow inputs

`OpenClaw NPM Release` 接受以下操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符 workflow-branch commit SHA，仅用于验证预检
- `preflight_only`：`true` 表示仅验证/构建/打包，`false` 表示
  真正的发布路径
- `preflight_run_id`：在真正发布路径上必需，以便工作流复用成功预检运行中准备好的 tarball
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下操作员控制的输入：

- `ref`：用于验证的 branch、tag 或完整 commit SHA。带密钥的检查要求解析后的 commit 可从 OpenClaw 分支或发布标签到达。

规则：

- 稳定版和修正版标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，完整 commit SHA 输入仅在 `preflight_only=true` 时允许
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终仅用于验证
- 真正的发布路径必须使用与预检期间相同的 `npm_dist_tag`；
  工作流会在发布前验证该元数据持续一致

## 稳定 npm 发布序列

进行稳定 npm 发布时：

1. 运行 `OpenClaw NPM Release`，并设置 `preflight_only=true`
   - 在标签尚不存在之前，你可以使用当前完整的 workflow-branch commit
     SHA 对预检工作流进行仅验证的 dry run
2. 对于正常的 beta-first 流程，选择 `npm_dist_tag=beta`；只有在你有意
   直接发布稳定版时才选择 `latest`
3. 在发布分支、发布标签或完整 commit SHA 上运行 `Full Release Validation`，当你希望从一个手动工作流获得常规 CI 加上 live prompt cache、Docker、QA Lab、Matrix 和 Telegram 覆盖时
4. 如果你有意只需要确定性的常规测试图，则改为在发布 ref 上运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 再次运行 `OpenClaw NPM Release`，将 `preflight_only=false`、相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 一并传入
7. 如果发布落在 `beta` 上，使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果发布有意直接发布到 `latest`，并且 `beta` 应立即跟随同一个稳定构建，则使用同一个私有
   工作流将两个 dist-tag 都指向该稳定版本，或者让其计划中的自愈同步稍后将 `beta` 移动过去

dist-tag 的变更位于私有仓库中以确保安全，因为它仍然
需要 `NPM_TOKEN`，而公开仓库保持仅 OIDC 的发布。

这保持了直接发布路径和 beta 优先提升路径都有文档记录且对操作员可见。

如果维护者必须回退到本地 npm 认证，仅在专用的 tmux 会话内运行任何 1Password
CLI（`op`）命令。不要直接从主代理 shell 调用 `op`；将其保留在 tmux 中可使提示、
警报和 OTP 处理保持可见，并防止重复的主机警报。

## 公共参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用私有发布文档
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
用于实际运行手册。

## 相关内容

- [发布通道](/install/development-channels)
