---
title: "发布清单"
summary: "npm + macOS 应用的逐步发布清单"
read_when:
  - 发布新的 npm 版本时
  - 发布新的 macOS 应用版本时
  - 发布前验证元数据时
---

# Release Checklist (npm + macOS)

使用仓库根目录下的 `pnpm`（Node 22+）。在打标签/发布前保持工作区干净。

## 操作触发

当操作员说“发布”时，立即执行此预检流程（除非被阻塞，否则不额外提问）：

- 阅读本文档和 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量，确认已设置 `SPARKLE_PRIVATE_KEY_FILE` 及 App Store Connect 变量（`SPARKLE_PRIVATE_KEY_FILE` 应存放于 `~/.profile` 中）。
- 如需要，使用位于 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 的 Sparkle 密钥。

## 版本管理

当前 OpenClaw 发布采用基于日期的版本号。

- 稳定版版本号：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
  - 仓库历史示例：`v2026.2.26`、`v2026.3.8`
- Beta 预发布版本号：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
  - 仓库历史示例：`v2026.2.15-beta.1`、`v2026.3.8-beta.1`
- 在所有地方使用完全相同的版本字符串，Git 标签外不带前导 `v`：
  - `package.json`: `2026.3.8`
  - Git 标签：`v2026.3.8`
  - GitHub 发布标题：`openclaw 2026.3.8`
- 月和日不补零。用 `2026.3.8`，不要用 `2026.03.08`。
- 稳定版和 beta 是 npm 的 dist-tag，不是不同的发布分支：
  - `latest` = 稳定版
  - `beta` = 预发布/测试版
- Dev 是 `main` 的滚动开发版本，不是正常 git 标签发布。
- 发布流程会强制检查当前稳定/β标签格式，且拒绝 CalVer 日期与发布日期相差超过 2 个 UTC 日历天的版本。

历史说明：

- 仓库历史中还存在旧标签，如 `v2026.1.11-1`、`v2026.2.6-3` 和 `v2.0.0-beta2`。
- 视它们为遗留标签模式，新发布应使用 `vYYYY.M.D`（稳定版）和 `vYYYY.M.D-beta.N`（Beta）。

1. **版本与元数据**

- [ ] 更新 `package.json` 中的版本号（例如 `2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync`，使插件包版本与更新日志一致。
- [ ] 更新 [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) 中的 CLI/版本字符串，以及 [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts) 中的 Baileys 用户代理字符串。
- [ ] 确认包的元数据（名称、描述、仓库、关键字、许可证）正确，`bin` 映射正确指向 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs) 用于 `openclaw` 命令。
- [ ] 若依赖有变，执行 `pnpm install` 保证 `pnpm-lock.yaml` 是最新的。

2. **构建与产物**

- [ ] 若 A2UI 输入有变，执行 `pnpm canvas:a2ui:bundle`，提交任何更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] 运行 `pnpm run build`（重新生成 `dist/`）。
- [ ] 确认 npm 包的 `files` 配置包含所有必需的 `dist/*` 文件夹（尤其是无头 node + ACP CLI 用的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认存在 `dist/build-info.json`，且包含预期的 `commit` 哈希（CLI 横幅用，npm 安装时显示）。
- [ ] 可选：构建后运行 `npm pack --pack-destination /tmp`；检查 tarball 内容，备用于 GitHub 发布（**不要**提交此文件）。

3. **更新日志与文档**

- [ ] 更新 `CHANGELOG.md`，加入面向用户的亮点（若无则新增）；条目严格按版本降序。
- [ ] 确保 README 中示例和参数与当前 CLI 行为一致（特别是新增命令或选项）。

4. **验证**

- [ ] 运行 `pnpm build`
- [ ] 运行 `pnpm check`
- [ ] 运行 `pnpm test`（或需要覆盖率时运行 `pnpm test:coverage`）
- [ ] 运行 `pnpm release:check`（验证 npm 包内的内容）
- [ ] 运行 `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必做）
  - 如已知前一 npm 版本存在问题，设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` 跳过预安装步骤。
- [ ] （可选）进行完整安装器冒烟测试（增加非 root 执行和 CLI 覆盖率）：`pnpm test:install:smoke`
- [ ] （可选）安装器端到端测试（Docker，执行 `curl -fsSL https://openclaw.ai/install.sh | bash`，完成引导后调用真实工具）：
  - `pnpm test:install:e2e:openai`（需 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个 API key，同时测试两提供商）
- [ ] （可选）如改动影响发送/接收路径，抽查 web 网关。

5. **macOS 应用（Sparkle）**

- [ ] 构建并签名 macOS 应用，打包为 zip 分发包。
- [ ] 运行 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 生成 Sparkle 应用播报（HTML 更新说明），更新 `appcast.xml`。
- [ ] 准备好应用 zip（及可选的 dSYM zip）以附加于 GitHub 发布。
- [ ] 按照 [macOS 发布](/platforms/mac/release) 指南执行准确命令，设置必要环境变量。
  - `APP_BUILD` 必须为数字且单调递增（不能带 `-beta`），确保 Sparkle 正确比较版本。
  - 如需公证，使用由 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（参见 [macOS 发布](/platforms/mac/release)）。

6. **发布（npm）**

- [ ] 确认 git 状态干净；必要时提交并推送。
- [ ] 确认已配置 npm 对 `openclaw` 包的受信任发布权限。
- [ ] 推送匹配的 git 标签以触发 `.github/workflows/openclaw-npm-release.yml`。
  - 稳定标签发布至 npm `latest`。
  - Beta 标签发布至 npm `beta`。
  - 工作流拒绝标签与 `package.json` 不匹配、不在 `main` 分支或 CalVer 日期距离发布日期超 2 个 UTC 天的版本。
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags`，以及 `npx -y openclaw@X.Y.Z --version`（或 `--help`）。

### 故障排除（摘录自 2.0.0-beta2 发布笔记）

- **npm pack/publish 卡住或产生巨大 tarball**：dist 中的 macOS 应用包 `dist/OpenClaw.app`（及发布 zip 包）被打包进 npm 包。解决方案是在 `package.json` 的 `files` 字段中仅白名单发布内容（包括 dist 子目录、文档、插件；排除应用包）。使用 `npm pack --dry-run` 确认不包含 `dist/OpenClaw.app`。
- **npm 认证页面循环请求短信验证码**：尝试使用旧版认证获取 OTP 方式：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证失败：`ECOMPROMISED: Lock compromised`**：尝试清缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **修复后需要重新发布标签**：强制更新并推送标签，确保 GitHub 发布资产正确：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7. **GitHub 发布 + 应用播报**

- [ ] 打标签并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
  - 推送标签即触发 npm 发布工作流。
- [ ] 创建/刷新针对 `vX.Y.Z` 的 GitHub 发布，**标题为 `openclaw X.Y.Z`**（非仅标签名）；正文应包含该版本的完整更新日志章节（亮点 + 变更 + 修复），正文内嵌，无裸链接，**正文不可重复标题文本**。
- [ ] 附加产物：`npm pack` 生成的 tarball（可选）、`OpenClaw-X.Y.Z.zip` 及 `OpenClaw-X.Y.Z.dSYM.zip`（若生成）。
- [ ] 提交并推送更新后的 `appcast.xml`（Sparkle 从 `main` 分支读取）。
- [ ] 在干净的临时目录（无 `package.json`）运行 `npx -y openclaw@X.Y.Z send --help`，确认安装和 CLI 入口正常。
- [ ] 发布公告/分享更新说明。

## 插件发布范围（npm）

我们只发布已存在于 npm 上的、`@openclaw/*` 作用域下的插件。未发布到 npm 的内置插件仅作为**磁盘树**存在（仍随发行包中 `extensions/**` 分发）。

确定发布列表流程：

1. 运行 `npm search @openclaw --json` 并获取包名列表。
2. 与 `extensions/*/package.json` 的包名对比。
3. 仅发布两者的**交集**（即已存在 npm 上的插件）。

当前 npm 插件列表（根据需要更新）：

- @openclaw/bluebubbles
- @openclaw/diagnostics-otel
- @openclaw/discord
- @openclaw/feishu
- @openclaw/lobster
- @openclaw/matrix
- @openclaw/msteams
- @openclaw/nextcloud-talk
- @openclaw/nostr
- @openclaw/voice-call
- @openclaw/zalo
- @openclaw/zalouser

发布说明中还需指出**新增的可选内置插件**，此类插件**默认不启用**（例如 `tlon`）。
