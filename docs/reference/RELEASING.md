---
summary: "公开发布通道、版本命名和发布节奏"
title: "发布策略"
read_when:
  - 查找公开发布渠道定义
  - 查找版本命名和发布节奏
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

## 发布预检

- 在发布预检前运行 `pnpm check:test-types`，这样测试 TypeScript 就能在更快的本地 `pnpm check` 门禁之外得到覆盖
- 在发布预检前运行 `pnpm check:architecture`，这样更广泛的导入循环和架构边界检查就能在更快的本地门禁之外保持绿色
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，这样 pack 验证步骤所需的 `dist/*` 发布产物和 Control UI bundle 就会存在
- 当你需要从一个入口获得完整的发布验证套件时，在发布批准前运行手动的 `Full Release Validation` 工作流。它接受分支、标签或完整 commit SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks`，用于安装烟测、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab parity、Matrix 和 Telegram 流水线。仅在包已发布且发布后的 Telegram E2E 也应运行时，才提供 `npm_telegram_package_spec`。
  示例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你只需要发布候选的完整常规 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 调度会绕过 changed scoping，并强制运行 Linux Node shards、bundled-plugin shards、channel contracts、Node 22 兼容性、`check`、`check-additional`、build smoke、docs checks、Python skills、Windows、macOS、Android 和 Control UI i18n 流水线。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP receiver 运行 QA-lab，并在不需要 Opik、Langfuse 或其他外部 collector 的情况下，验证导出的 trace span 名称、受限属性以及内容/标识符脱敏。
- 在每次带标签发布前运行 `pnpm release:check`
- 发布检查现在在一个单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布批准前运行 QA Lab mock parity 门禁以及实时 Matrix 和 Telegram QA 通道。实时通道使用
  `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。
- 跨操作系统安装和升级运行时验证由私有调用方工作流分发：
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`，
  该工作流会调用可复用的公开工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真实 npm 发布路径简短、确定且以产物为中心，而把较慢的 live 检查留在它们自己的通道中，这样它们就不会拖慢或阻塞发布
- 带密钥的发布检查应通过 `Full Release
Validation` 或从 `main`/release 工作流 ref 调度，以便工作流逻辑和
  密钥保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整 commit SHA，只要解析后的 commit 可从 OpenClaw 分支或发布标签到达
- `OpenClaw NPM Release` 仅验证预检也接受当前完整的 40 字符 workflow-branch commit SHA，而不需要已推送的标签
- 该 SHA 路径仅用于验证，不能晋级为真实发布
- 在 SHA 模式下，工作流只会为了包元数据检查合成 `v<package.json version>`；真实发布仍然需要真实的发布标签
- 这两个工作流都将真实发布和晋级路径保留在 GitHub 托管的 runner 上，而非变更性的验证路径可以使用更大的 Blacksmith Linux runner
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

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下操作员控制的输入：

- `tag`: 必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符 workflow-branch commit SHA，仅用于验证预检
- `preflight_only`: `true` 表示仅验证/构建/打包，`false` 表示
  真正的发布路径
- `preflight_run_id`: 在真正发布路径上必需，以便工作流复用成功预检运行中准备好的 tarball
- `npm_dist_tag`: 发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下操作员控制的输入：

- `ref`: branch, tag, or full commit SHA to validate. Secret-bearing checks
  require the resolved commit to be reachable from an OpenClaw branch or
  release tag.

规则：

- 稳定版和修正版标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，完整 commit SHA 输入仅在
  `preflight_only=true` 时允许
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

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用私有发布文档
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
用于实际运行手册。

## 相关内容

- [发布通道](/install/development-channels)
