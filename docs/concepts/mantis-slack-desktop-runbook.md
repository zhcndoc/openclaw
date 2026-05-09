---
summary: "面向 Mantis Slack 桌面 QA 的操作手册：GitHub 派发、 本地 CLI、热 VNC 租约、hydrate 模式、时间解释、制品和失败处理。"
read_when:
  - 从 GitHub 或本地运行 Mantis Slack 桌面 QA
  - 调试缓慢的 Mantis Slack 桌面运行
  - 选择 source、prehydrated 或 warm-lease 模式
  - 将截图和视频证据发布到 PR
title: "Mantis Slack 桌面运行手册"
---

Mantis Slack 桌面 QA 是面向需要
Linux 桌面、VNC 救援、Slack Web、真实 OpenClaw 网关、截图、
视频以及 PR 证据评论的 Slack 级别 bug 的真实 UI 线路。

当单元测试或无头的 Slack live 线路无法证明 bug 时使用它。

## 存储模型

Mantis 使用三层不同的存储：

- Provider image：由 Crabbox 拥有并存储在云提供商账户中。
  它包含 Chrome/Chromium、ffmpeg、scrot、
  Node/corepack/pnpm、本地构建工具以及空的缓存目录等机器能力。
- Warm lease state：由当前操作员会话拥有。它在租约存活期间可以包含
  已登录的浏览器配置文件、`/var/cache/crabbox/pnpm`，以及已准备好的源代码检出。
- Mantis artifacts：由 OpenClaw 运行拥有。它们位于
  `.artifacts/qa-e2e/mantis/...` 下，然后 GitHub Actions 会上传它们，
  Mantis GitHub App 会在 PR 上内联评论证据。

永远不要把密钥、浏览器 cookie、Slack 登录状态、仓库检出、
`node_modules` 或 `dist/` 放入预烘焙的 provider image 中。

## GitHub 派发

从 `main` 运行工作流：

```bash
gh workflow run mantis-slack-desktop-smoke.yml \
  --ref main \
  -f candidate_ref=<trusted-ref-or-sha> \
  -f pr_number=<pr-number> \
  -f scenario_id=slack-canary \
  -f crabbox_provider=aws \
  -f keep_vm=false \
  -f hydrate_mode=source
```

允许的 `candidate_ref` 值故意限制得很窄，因为工作流使用实时凭据：
当前 `main` 的祖先、发布标签，或者来自 `openclaw/openclaw` 的
开放 PR head。

工作流会写入：

- 上传的制品：`mantis-slack-desktop-smoke-<run-id>-<attempt>`;
- 来自 Mantis GitHub App 的 PR 内联评论；
- `slack-desktop-smoke.png`;
- `slack-desktop-smoke.mp4`;
- `slack-desktop-smoke-preview.gif`;
- `slack-desktop-smoke-change.mp4`;
- `mantis-slack-desktop-smoke-summary.json`;
- `mantis-slack-desktop-smoke-report.md`;
- 远程日志，例如 `slack-desktop-command.log`、`openclaw-gateway.log`、
  `chrome.log` 和 `ffmpeg.log`。

PR 评论会通过隐藏的
`<!-- mantis-slack-desktop-smoke -->` 标记原地更新。

## 本地 CLI

冷源代码证明：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --credential-source convex \
  --credential-role maintainer \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --scenario slack-canary \
  --hydrate-mode source
```

保留 VM 以便进行 VNC 救援：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

打开 VNC：

```bash
crabbox vnc --provider aws --id <cbx_id> --open
```

重用热租约：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --lease-id <cbx_id-or-slug> \
  --gateway-setup \
  --scenario slack-canary \
  --hydrate-mode source
```

仅当重用的远程工作区已经有 `node_modules` 和已构建的 `dist/` 时，
才使用 `--hydrate-mode prehydrated`。如果这些缺失，Mantis 会闭合失败。

## Hydrate 模式

| 模式          | 适用场景                                  | 远程行为                                                                       | 取舍                                                     |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `source`      | 正常的 PR 证明、冷机器、CI        | 在 VM 内运行 `pnpm install --frozen-lockfile --prefer-offline` 和 `pnpm build` | 最慢，但源代码检出证明最强                 |
| `prehydrated` | 你有意准备了一个可重用的租约 | 需要已有的 `node_modules` 和 `dist/`；跳过 install/build                     | 快，但只对操作员可控的热租约有效 |

GitHub Actions 总是在 VM 运行前准备候选代码检出。其
pnpm store 会按操作系统、Node 版本和 lockfile 缓存。VM 的 source 运行也会在存在时使用 `/var/cache/crabbox/pnpm`。

## 时间解释

`mantis-slack-desktop-smoke-report.md` 包含各阶段耗时：

- `crabbox.warmup`：云提供商启动、桌面/浏览器就绪以及 SSH。
- `crabbox.inspect`：租约元数据查找。
- `credentials.prepare`：Convex 凭据租约获取。
- `crabbox.remote_run`：同步、浏览器启动、OpenClaw 安装/构建或
  hydrate 验证、网关启动、截图和视频捕获。
- `artifacts.copy`：从 VM 通过 rsync 拷回。

当 Crabbox 在 Mantis 已复制证明 OpenClaw 网关存活且设置完成的元数据后返回非零
远程状态时，`crabbox.remote_run` 可能会被标记为 `accepted`。
将 `accepted` 视为“通过但有解释”，而不是失败场景。

如果运行很慢：

- warmup 占主导：预烘焙或升级到更好的 Crabbox provider image；
- `source` 中 remote_run 占主导：使用热租约，改进 pnpm store 复用，或把机器前置条件移入 provider image；
- `prehydrated` 中 remote_run 占主导：远程工作区实际上并未准备好，或者网关/浏览器/Slack 设置较慢；
- artifact copy 占主导：检查视频大小和制品目录内容。

## 证据检查清单

一条优秀的 PR 评论应展示：

- scenario id 和 candidate SHA；
- GitHub Actions 运行 URL；
- 制品 URL；
- 内联截图；
- 可用时的内联动图预览；
- 完整 MP4 和裁剪 MP4 链接；
- 通过/失败状态；
- 附加报告中的时间摘要。

不要把截图或视频提交到仓库中。请将它们保留在 GitHub
Actions 制品或 PR 评论里。

## 失败处理

如果工作流在 VM 运行前失败，先检查 Actions 作业。典型
原因是未受信任的 `candidate_ref`、缺少环境密钥，或者候选安装/构建失败。

如果 VM 运行失败但截图已拷回，请检查：

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

如果运行保留了租约，用报告中的 `crabbox vnc ...` 命令打开 VNC。
完成后停止租约：

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

如果 Slack 登录过期，在保留的租约上通过 VNC 修复，然后使用
`--lease-id` 重新运行。不要把那个浏览器配置文件烘焙进 provider image 中。

## 相关

- [QA 概览](/concepts/qa-e2e-automation)
- [Slack 频道](/channels/slack)
- [测试](/help/testing)
