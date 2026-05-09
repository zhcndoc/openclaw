# 翻译工作流

文档发布流水线的内部说明。此文件位于 `docs/.i18n` 下，该目录会被 docs-site 构建忽略，并且不会发布。

## 目标

- 每次源文档同步后，英文文档都能快速部署。
- 不会对每一个高频的 `main` 提交都运行本地化翻译。
- 翻译工作会做防抖处理，因此一波文档提交会合并成一次翻译波次。
- 本地化任务只翻译自上次成功的本地化输出以来源哈希发生变化的页面。
- 即使一个或多个本地化任务失败，成功的本地化输出也会一起提交。
- 每周会执行一次对账，重新运行所有本地化/页面路径，以修复遗漏或不稳定的翻译。

## 事件流

1. `openclaw/openclaw` 将英文文档同步到 `openclaw/docs`。
2. GitHub Pages 立即根据同步提交部署英文/源内容变更。
3. `Translate All` 由同步提交、release dispatch、手动 dispatch 或每周计划触发。
4. 协调器在开始翻译前等待一个冷却窗口。
5. 冷却结束后，协调器读取当前的 `origin/main` 源元数据。
6. 如果在冷却期间有更新的文档同步到达，协调器会使用更新后的源状态。
7. 各本地化翻译任务以 `fail-fast: false` 并行运行。
8. 每个本地化任务都会为请求的源 SHA 上传一个 artifact。
9. 最终化器下载可用的 artifact，忽略过期或失败的负载，并推送一个聚合的 i18n 提交。
10. 聚合提交落地后，最终化器只会触发一次 Pages 部署。
11. Pages 工作流在部署后触发 live smoke。

## 防抖策略

协调器在文档同步或 release dispatch 之后等待 1 小时，然后重新读取 `origin/main`。

默认冷却时间由发布仓库变量 `OPENCLAW_DOCS_TRANSLATION_COOLDOWN_SECONDS` 控制，默认值为 `3600`。仓库 dispatch 调用方可以通过 `client_payload.cooldown_seconds` 覆盖它，手动运行也可以设置 `cooldown_seconds`。

如果等待期间 `.openclaw-sync/source.json` 发生变化，它会从较新的状态重新等待。如果 `main` 持续推进，等待时间上限由 `OPENCLAW_DOCS_TRANSLATION_MAX_WAIT_SECONDS` 控制，默认值为冷却时间值。达到上限后，会翻译最新观察到的状态。

手动和每周运行默认不等待。

## 增量翻译

每个已翻译页面都会存储 `x-i18n.source_hash`。本地化任务会将当前英文页面哈希与已存储的本地化哈希进行比较。

正常运行时只翻译以下内容：

- 缺失的本地化页面
- `x-i18n.source_hash` 过期的本地化页面
- 受源删除/清理影响的页面

`docs/.i18n/**` 下的内部文件不作为翻译输入。仅修改内部 i18n 文件的 push 触发运行会在进入本地化矩阵之前跳过。

如果某个本地化任务失败，其 artifact 会被标记为失败且不包含任何负载。最终化器仍然会提交成功的本地化内容。失败的本地化项会保持过期状态，并会在下一次增量运行中被拾取，因为它的源哈希仍然不匹配。

## Artifact 协议

每个本地化任务都会上传一个用语言环境和源 SHA 命名的 artifact：

```text
i18n-zh-cn-<source-sha>
```

artifact 内容：

```text
metadata.json
changed-files.txt
deleted-files.txt
payload/docs/<locale>/**
payload/docs/.i18n/<locale>.tm.jsonl
```

`metadata.json` 包含语言环境、语言环境 slug、源 SHA、待处理数量、变更数量以及任何失败原因。最终化器会拒绝 `source_sha` 与当前 `.openclaw-sync/source.json` 不匹配的 artifact。

源仓库 release 工作流会分发一个 `translate-all-release` 事件。为兼容性起见，协调器仍然接受旧的按语言环境划分的 release 事件，但那些只作为回退方案。

## 聚合提交

在正常路径中，最终化器拥有唯一的本地化推送。

提交信息：

```text
chore(i18n): refresh translations
```

该提交可以包含部分语言环境集。作业摘要会列出已应用的语言环境、无变更的语言环境、缺失或失败的语言环境、过期 artifact 和无效 artifact。

## 每周对账

每周运行使用 `full` 模式。它会对每个语言环境和每个源页面执行完整对账，而不是仅依赖已变更的源哈希。

术语表变更也会强制进行完整对账，因为术语表指导可能会影响源哈希未变更的页面。

预期行为：

- 重新生成或验证每个语言环境页面
- 清理过期的语言环境页面
- 按需刷新翻译记忆
- 仍然使用并行的语言环境任务
- 仍然提交一个聚合结果
- 仍然容忍单个语言环境失败

每周运行是用于修复 LLM 不稳定性、部分失败和遗漏的增量更新的补救机制。

## 部署策略

英文内容从源同步提交部署。

翻译内容在聚合 i18n 提交之后部署。最终化器只会分发一次 GitHub Pages，因为 GitHub 会抑制由 `GITHUB_TOKEN` 提交触发的常规 push 型工作流运行。Pages 工作流会在部署后触发 live smoke，这样冒烟测试检查的是已部署站点，而不是与部署竞争。

高频文档更新日应该产生许多快速的英文部署，但只产生少量的语言环境部署。

如果像 Mintlify 这样的外部部署提供商监视每一次 push，那么聚合 i18n 提交就是负载削减器。不要恢复将每个语言环境分别推送到 `main`。
