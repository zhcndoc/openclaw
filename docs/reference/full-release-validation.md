---
doc-schema-version: 1
summary: "完整版本验证参考索引，每个读者作业一页"
title: "完整发布验证"
read_when:
  - "运行或重运行完整发布验证"
  - "比较 stable 和完整发布验证配置"
  - "调试发布验证阶段失败"
---

`Full Release Validation` 是发布产品验证伞。大多数工作发生在子工作流程中，因此可以重新运行失败的框，而无需重新启动整个版本。

测试失败仍然是失败。完整版本验证绝不会自动重新运行失败或超时的作业。在使用显式操作员恢复命令之前诊断原始故障。

此页是一个索引。该参考文献共七页，每个读者作业一页。打开与您的任务匹配的页面并在那里完成验证通过。

对于冻结的目标，在初始请求中声明确切的测试遗漏；请参阅 [ 精确的冻结目标测试遗漏 ](/reference/full-release-validation/dispatch#exact-frozen-target-test-omissions)。 Node 和扩展输入验证所选清单并保持与不可变覆盖范围身份的绑定。

| 页面                                                                                                | 读它的时候                                                                                       |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [调度验证运行](/reference/full-release-validation/dispatch)                            | 开始运行：代码 SHA、工具 SHA、辅助输入和不可变的执行计划。            |
| [继续失败的验证](/reference/full-release-validation/continuation)                     | 在现有父级上重新运行一项作业或失败的子级，以及合并后继续证明。 |
| [扩展稳定和仅更改日志验证](/reference/full-release-validation/extended-stable) | 扩展稳定调度、仅变更日志重用、覆盖政策和 Telegram 豁免。           |
| [顶级平台](/reference/full-release-validation/stages)                                       | 伞状阶段矩阵、证据重用、工件生成器和决策状态。                |
| [发布检查阶段](/reference/full-release-validation/release-checks)                          | `OpenClaw Release Checks` 阶段矩阵和 Docker 释放路径块。                     |
| [发布配置文件并重点重播](/reference/full-release-validation/profiles)                  | 比较配置文件覆盖范围并选择有针对性的 `rerun_group` 或套件过滤器。                    |
| [保留证据](/reference/full-release-validation/evidence)                                     | 通过后记录证据以及支持工作流程文件。                                   |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/reference/full-release-validation#post-merge-continuation-proof`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="continue-failed-child-jobs" />[继续失败的子作业](/reference/full-release-validation/continuation#continue-failed-child-jobs)
- <a id="post-merge-continuation-proof" />[合并后延续证明](/reference/full-release-validation/continuation#post-merge-continuation-proof)
- <a id="extended-stable-validation" />[扩展稳定验证](/reference/full-release-validation/extended-stable#extended-stable-validation)
- <a id="top-level-stages" />[顶级阶段](/reference/full-release-validation/stages#top-level-stages)
- <a id="release-checks-stages" />[发布检查阶段](/reference/full-release-validation/release-checks#release-checks-stages)
- <a id="docker-release-path-chunks" />[Docker 发布路径块](/reference/full-release-validation/release-checks#docker-release-path-chunks)
- <a id="release-profiles" />[发布简介](/reference/full-release-validation/profiles#release-profiles)
- <a id="full-only-additions" />[仅完全添加](/reference/full-release-validation/profiles#full-only-additions)
- <a id="focused-reruns" />[重点重播](/reference/full-release-validation/profiles#focused-reruns)
- <a id="evidence-to-keep" />[保留证据](/reference/full-release-validation/evidence#evidence-to-keep)
- <a id="workflow-files" />[工作流程文件](/reference/full-release-validation/evidence#workflow-files)

## <a id="related"></a> 相关内容

- [释放](/reference/RELEASING)
- [发布验证工作流程](/ci/release-validation)
- [发布性能扫](/reference/release-performance-sweep)
