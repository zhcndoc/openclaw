---
summary: "范围变化检测、车道路由和手动调度行为"
title: "CI 范围和路由"
read_when:
  - "你需要了解某个 CI 作业为什么运行或未运行"
  - "您正在更改更改范围检测或调度输入"
---

此页是一个索引。范围和路线记录在四页上，每个读者作业一页。打开与您的任务匹配的页面。

全主CI默认为[每小时](/ci/scheduled-workflows#hourly-main-ci)，使用普通的全手动覆盖，没有改变路径过滤。当 `OPENCLAW_CI_ON_PUSH=true` 时，适用以下推送路由规则。

每个承认的上游 `main` 推送运行都会选择已发布的升级 Docker 幸存者； QA Smoke 保留所有者路径选择。拉取请求和精确头 PR 回退会忽略这些证明，同时保留 unit/boundary 检查。 Control UI 性能使用其 UI/build/import 所有者。普通手动和发布验证选择所有六个 Docker 种子通道和完整的 QA 烟雾剖面，与更改的路径无关。合并后的选择加入主推不会累积差异；每小时完整运行独立覆盖生成的主树。参见[选择](/ci/scope-and-routing/selection)和[手动调度](/ci/scope-and-routing/manual-dispatches)。

| 页面                                                                | 读它的时候                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [范围选择](/ci/scope-and-routing/selection)                  | 为什么选择或不选择车道：范围变化检测和每个区域的路由规则。    |
| [节点测试通道](/ci/scope-and-routing/node-test-lanes)            | 如何分割、平衡、打包和缓存最慢的 Node 测试系列。                    |
| [作业预算和平台通道](/ci/scope-and-routing/job-budgets) | UI 分片、并发和矩阵预算、lint 内存策略、Android 行和粘性磁盘。 |
| [手动调度](/ci/scope-and-routing/manual-dispatches)        | 手动 CI 调度行为、释放门回退和 Windows 测试盒检查。            |

短混合作业使用 [bounded 托管卸载](/ci/capacity#bounded-hybrid-hosted-offload)：完整选定的基础必须适合 40 个托管行，然后才能从 Blacksmith 移动最多 5 个托管行。覆盖范围选择保持不变。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/ci/scope-and-routing#manual-dispatches`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="scope-and-routing" />[范围和路由](/ci/scope-and-routing/selection#scope-and-routing)
- <a id="manual-dispatches" />[手动调度](/ci/scope-and-routing/manual-dispatches#manual-dispatches)
- <a id="windows-testbox-probe" />[Windows 测试盒 Check](/ci/scope-and-routing/manual-dispatches#windows-testbox-probe)

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [发布渠道](/install/development-channels)
