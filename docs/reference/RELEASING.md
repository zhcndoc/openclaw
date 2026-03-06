---
title: "发布清单"
summary: "npm + macOS 应用的逐步发布清单"
read_when:
  - 发布新的 npm 版本时
  - 发布新的 macOS 应用版本时
  - 发布前验证元数据时
---

# 发布清单（npm + macOS）

从仓库根目录使用 `pnpm`（Node 22+）。在打标签/发布之前保持工作树干净。

## 操作者触发

当操作者说“发布”时，立即执行此预检（除非被阻止，不额外提问）：

- 阅读本文档和 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量，确认设置了 `SPARKLE_PRIVATE_KEY_FILE` 及 App Store Connect 变量（`SPARKLE_PRIVATE_KEY_FILE` 应存在于 `~/.profile` 中）。
- 如有需要，使用 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 中的 Sparkle 密钥。

1. **版本与元数据**

- [ ] 更新 `package.json` 中的版本号（例如，`2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync`，使插件包版本和更新日志保持一致。
- [ ] 更新 [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) 中的 CLI/版本字符串，以及 [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts) 中的 Baileys 用户代理字符串。
- [ ] 确认包的元数据（名称、描述、仓库、关键词、许可），以及 `bin` 映射指向 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs) 用于 `openclaw` 命令。
- [ ] 如果依赖发生变化，运行 `pnpm install` 以确保 `pnpm-lock.yaml` 是最新。

2. **构建与产物**

- [ ] 如果 A2UI 输入发生变化，执行 `pnpm canvas:a2ui:bundle` 并提交任何更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] 运行 `pnpm run build`（重新生成 `dist/`）。
- [ ] 验证 npm 包的 `files` 配置包含所有必需的 `dist/*` 文件夹（尤其是用于无头 node + ACP CLI 的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认存在 `dist/build-info.json` 文件并包含预期的 `commit` 哈希（CLI 横幅用于 npm 安装时）。
- [ ] 可选：构建后运行 `npm pack --pack-destination /tmp`；检查 tarball 内容并备用于 GitHub 发布（**不要**提交该文件）。

3. **更新日志与文档**

- [ ] 更新 `CHANGELOG.md`，加入面向用户的亮点（若无则创建）；条目严格按版本降序排列。
- [ ] 确保 README 示例和参数与当前 CLI 行为一致（特别是新命令或新选项）。

4. **验证**

- [ ] 运行 `pnpm build`
- [ ] 运行 `pnpm check`
- [ ] 运行 `pnpm test`（或者需要覆盖率时运行 `pnpm test:coverage`）
- [ ] 运行 `pnpm release:check`（验证 npm 包内容）
- [ ] 运行 `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必须）
  - 如果已知前一个 npm 版本有问题，设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` 跳过预安装步骤。
- [ ] （可选）完整安装器冒烟测试（增加非 root 和 CLI 覆盖率）：`pnpm test:install:smoke`
- [ ] （可选）安装器端到端测试（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，完成引导后调用真实工具）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个密钥；同时测试两个提供商）
- [ ] （可选）如果更改影响发送/接收路径，抽查 web 网关。

5. **macOS 应用（Sparkle）**

- [ ] 构建并签名 macOS 应用，然后打包成 zip 供分发。
- [ ] 通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 生成 Sparkle 应用播报（HTML 更新说明），并更新 `appcast.xml`。
- [ ] 准备好应用 zip（以及可选的 dSYM zip）以便将其附加到 GitHub 发布中。
- [ ] 遵循 [macOS 发布](/platforms/mac/release) 指南执行准确命令及设置所需环境变量。
  - `APP_BUILD` 必须是数值型且单调递增的（不能含 `-beta`），以确保 Sparkle 正确比较版本。
  - 如果需要公证，使用由 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（参见 [macOS 发布](/platforms/mac/release)）。

6. **发布（npm）**

- [ ] 确认 git 状态干净；按需提交并推送。
- [ ] 执行 `npm login`（确认双因素认证）如有必要。
- [ ] 执行 `npm publish --access public`（预发布版本加上 `--tag beta`）。
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags`，以及用 `npx -y openclaw@X.Y.Z --version`（或 `--help`）确认。

### 故障排除（摘自 2.0.0-beta2 发布笔记）

- **npm pack/publish 卡住或产生巨大 tarball**：dist 中的 macOS 应用包 `dist/OpenClaw.app`（及发布 zip）被包含进包。解决方法是在 `package.json` 的 `files` 中白名单发布内容（包含 dist 子目录、文档、技能；排除应用包）。用 `npm pack --dry-run` 确认不包含 `dist/OpenClaw.app`。
- **npm 认证网页循环提示验证码**：使用旧版认证获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证失败：`ECOMPROMISED: Lock compromised`**：尝试清缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **修复后需要重新指向标签**：强制更新并推送标签，再确认 GitHub 发布资产匹配：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7. **GitHub 发布 + 应用播报**

- [ ] 打标签并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
- [ ] 创建/刷新 GitHub 发布，版本号为 `vX.Y.Z`，**标题格式为 `openclaw X.Y.Z`**（非纯标签）；正文包含该版本的**完整**更新日志（亮点 + 变更 + 修复），内联（无裸链接），且**标题不要出现在正文中**。
- [ ] 附加发布产物：可选的 `npm pack` tarball、`OpenClaw-X.Y.Z.zip` 和（若生成）`OpenClaw-X.Y.Z.dSYM.zip`。
- [ ] 提交更新后的 `appcast.xml` 并推送（Sparkle 从 main 分支获取）。
- [ ] 在干净的临时目录（无 `package.json`）运行 `npx -y openclaw@X.Y.Z send --help`，确认安装和 CLI 入口正常。
- [ ] 宣布并分享发布说明。

## 插件发布范围（npm）

我们只发布存在于 npm 上的 `@openclaw/*` 范围内**已有的 npm 插件**。未上 npm 的内置插件保持**仅磁盘树上**（仍随 `extensions/**` 一起发货）。

确定列表的流程：

1. 运行 `npm search @openclaw --json`，获取包名列表。
2. 与 `extensions/*/package.json` 中的名称对比。
3. 只发布**两者交集**（已上 npm 的包）。

当前 npm 插件列表（按需更新）：

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

发布说明中还必须指出**新增的可选内置插件**，这类插件**默认不启用**（例如 `tlon`）。
