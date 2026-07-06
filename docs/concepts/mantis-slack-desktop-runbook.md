---
summary: "面向 Mantis Slack 桌面 QA 的操作手册：GitHub 派发、本地 CLI、热 VNC 租约、hydrate 模式、时间解释、制品和失败处理。"
read_when:
  - 从 GitHub 或本地运行 Mantis Slack 桌面 QA
  - 调试缓慢的 Mantis Slack 桌面运行
  - 选择 source、prehydrated 或 warm-lease 模式
  - 将截图和视频证据发布到 PR
title: "Mantis Slack 桌面运行手册"
---

Mantis Slack 桌面 QA 是面向 Slack 类 bug 的真实 UI 线路，这类 bug 需要
Linux 桌面、VNC 救援、Slack Web、真实的 OpenClaw 网关、截图、
视频以及 PR 证据评论。 当单元测试或无头的
Slack live 线路无法证明该 bug 时，请使用它。

## 存储模型

Mantis 使用三个存储层：

- **Provider image** - 由 Crabbox 拥有，存储在云服务提供商账户中。
  包含机器能力（Chrome/Chromium、ffmpeg、scrot、
  Node/corepack/pnpm、原生构建工具）以及空的缓存目录。
- **Warm lease state** - 由当前 operator session 拥有。可以在 lease 有效期间保存
  已登录的浏览器配置文件、`/var/cache/crabbox/pnpm`，以及已准备好的源码
  checkout。
- **Mantis artifacts** - 由 OpenClaw run 拥有。位于
  `.artifacts/qa-e2e/mantis/...` 下；GitHub Actions 会上传它们，Mantis
  GitHub App 会在 PR 上以内联方式评论证据。

绝不要将 secrets、浏览器 cookies、Slack 登录状态、仓库 checkout、
`node_modules` 或 `dist/` 烘焙进 provider image。

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

`candidate_ref` 受到限制，因为该工作流使用实时凭据：它
必须解析为当前 `main` 的祖先、发布标签，或 `openclaw/openclaw` 中一个已打开 PR 的头部提交。

该工作流会生成：

- 已上传的制品 `mantis-slack-desktop-smoke-<run-id>-<attempt>`
- 来自 Mantis GitHub App 的内联 PR 评论
- `slack-desktop-smoke.png`、`slack-desktop-smoke.mp4`
- `slack-desktop-smoke-preview.gif`、`slack-desktop-smoke-change.mp4`
- `mantis-slack-desktop-smoke-summary.json`、`mantis-slack-desktop-smoke-report.md`
- 远程日志：`slack-desktop-command.log`、`openclaw-gateway.log`、`chrome.log`、`ffmpeg.log`

PR 评论会通过隐藏的 `<!-- mantis-slack-desktop-smoke -->` 标记在原位更新。

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

仅当复用的远程工作区已经具有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`；否则 Mantis 会在关闭状态下失败。

证明原生 Slack 审批 UI：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer \
  --hydrate-mode source
```

`--approval-checkpoints` 与 `--gateway-setup` 互斥。除非你传入显式的审批检查点 `--scenario`，否则它会运行可选加入的 `slack-approval-exec-native` 和 `slack-approval-plugin-native` 场景；其他 Slack 场景会在 VM 启动前被拒绝。Slack QA 运行器会根据其观察到的真实 Slack API 消息写入每个检查点 JSON 文件，然后远程观察器会将该消息渲染到 `approval-checkpoints/<scenario>-pending.png` 和 `approval-checkpoints/<scenario>-resolved.png` 中。如果任何检查点 JSON、消息证据、ack JSON 或渲染后的截图缺失或为空，则运行失败。

冷启动的 GitHub Actions 租约没有 Slack Web cookie，因此其浏览器捕获可能会落在 Slack 登录界面上。对于审批检查点证明，请信任渲染后的检查点图片和 Slack QA 工件，而不是 `slack-desktop-smoke.png`。只有当浏览器截图本身必须显示 Slack Web 时，才使用保留的热租约以及手动登录的 Slack Web 配置文件。

## Hydrate 模式

| 模式          | 适用场景                                  | 远程行为                                                                       | 取舍                                                     |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `source`      | 正常的 PR 证明、冷机器、CI        | 在 VM 内运行 `pnpm install --frozen-lockfile --prefer-offline` 和 `pnpm build` | 最慢，但源代码检出证明最强                 |
| `prehydrated` | 你有意准备了一个可重用的租约 | 需要已有的 `node_modules` 和 `dist/`；跳过 install/build                     | 快，但只对操作员可控的热租约有效 |

GitHub Actions 总是在 VM 运行之前准备候选检出内容。其
pnpm 存储按 OS、Node 版本和 lockfile 进行缓存。VM 的 `source` 运行在存在时也会重用 `/var/cache/crabbox/pnpm`。

## 时间解释

`mantis-slack-desktop-smoke-report.md` 包含各阶段耗时：

- `crabbox.warmup` - 云提供商启动、桌面/浏览器就绪、SSH。
- `crabbox.inspect` - 租约元数据查询。
- `credentials.prepare` - Convex 凭据租约获取。
- `crabbox.remote_run` - 同步、浏览器启动、OpenClaw 安装/构建或
  水合校验、网关启动、截图和视频捕获。
- `artifacts.copy` - 从虚拟机通过 rsync 拉回。

当 Crabbox 返回非零远程状态码，但 Mantis 复制了元数据，证明 OpenClaw 网关
设置已完成，或者 Slack QA 命令本身已成功退出时，`crabbox.remote_run` 可能显示
`accepted`。将 `accepted` 视为“通过但附带说明”，而不是失败场景。

如果运行很慢：

- `warmup` 占主导：预烘焙，或升级为更好的 Crabbox 提供商镜像。
- `remote_run` 在 `source` 模式下占主导：使用热租约，改进 pnpm store
  复用，或将机器前置条件移入提供商镜像。
- `remote_run` 在 `prehydrated` 模式下占主导：远程工作区实际上并未就绪，
  或者网关/浏览器/Slack 设置很慢。
- `artifacts.copy` 占主导：检查视频大小和产物目录内容。

## 证据检查清单

一个好的 PR 评论应展示：

- 场景 id 和候选 SHA
- GitHub Actions 运行 URL 和制品 URL
- 内联 approval-checkpoint 截图，或来自已登录 warm lease 的 Slack Web 截图
- 如有可用，内联动画预览
- 完整 MP4 和裁剪后的 MP4 链接
- 通过/失败状态以及报告的时间摘要

不要把截图或视频提交到仓库中。请将它们保留在 GitHub
Actions 制品或 PR 评论里。

## 失败处理

如果工作流在 VM 运行之前就失败了，请先检查 Actions job。
常见原因包括：不受信任的 `candidate_ref`、缺少环境密钥，或者
候选安装/构建失败。

如果 VM 运行失败但截图已拷回，请检查：

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

如果运行保留了租约，请使用报告中的 `crabbox vnc ...`
命令通过 VNC 打开，然后在完成后停止租约：

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

如果 Slack 登录已过期，请在保留的租约上通过 VNC 修复，然后使用
`--lease-id` 重新运行。不要把那个浏览器配置文件烘焙进 provider image 中。

## 相关

- [QA 概览](/concepts/qa-e2e-automation)
- [Slack 频道](/channels/slack)
- [测试](/help/testing)
