---
summary: "单独的插件预发布工作流程、其批处理限制以及运行时间"
read_when:
  - "您正在运行或分类插件预售区"
title: "插件预售"
sidebarTitle: "插件预售"
---

单独的插件预发布工作流程、其批处理限制以及运行时间。 [ 发布验证工作流程](/ci/release-validation) 索引的一部分。

## <a id="plugin-prerelease"></a> 插件预发布

当唯一转发的选项是数字 `--retry` 和精确文件 `--exclude` 选择时，插件批量执行会保留现有进程限制。 Codex 每个顺序进程最多保留 12 个文件，包括使用这些选项运行的版本。监视模式、套件范围的保释或分片、报告、广泛排除模式和其他选项保留其单进程语义。

`Plugin Prerelease` 是更昂贵的 product/package 覆盖范围，因此它是由 `Full Release Validation` 或显式操作员调度的单独工作流程。正常拉取请求、`main` 推送和独立手动 CI 调度使该套件保持关闭状态。它平衡八个通用扩展工作人员的非 Telegram 捆绑插件测试；这些作业一次最多运行两个插件配置组，每组有一个 Vitest 工作线程和一个更大的 Node 堆。 Telegram 在最多 10 个测试文件的专用分片中运行，保留单文件 Vitest 进程，同时调度两个进程。组合扩展矩阵的并发作业数上限为 12 个。仅发布的 Docker 预发布路径（由 `full_release_validation` 输入启用）以四个为一组对目标 Docker 通道进行批处理，以避免为一到三分钟的作业保留数十个运行者。该工作流程还从 `@openclaw/plugin-inspector` 上传信息性 `plugin-inspector-advisory` 工件；检查员的发现是分类输入，不会更改阻塞插件售前门。
