---
summary: "完整发布验证、包验收、安装烟雾和 Docker E2E"
title: "发布验证工作流程"
read_when:
  - "你正在协调一次发布验证运行或重跑"
  - "您需要验证已发布的包或插件版本"
---

此页是一个索引。发布验证记录在五页上，每个读者作业一页。打开与您的任务匹配的页面。

完整版本验证通过其正常的 CI 子项保留所有六个 Docker 种子通道、QA Smoke 和 Control UI 性能。每个承认的上游主管道都保留已发布的升级幸存者；其他五个 Docker 种子通道在普通 manual/release 验证中运行，包括 npm 资格范围。拉取请求和精确头 PR 后备忽略 Docker 种子和 QA 烟雾。请参阅 [ 完整版本覆盖范围 ](/ci/release-validation/full-release-validation) 了解确切的幸存者合同和目标兼容性限制。

| 页面                                                                                | 读它的时候                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [完整版本Validation](/ci/release-validation/full-release-validation)           | 发布伞：Validation/Tooling SHA 绑定、发布发布、Docker 发布、配置文件和恢复。 |
| [Live 和 E2E 分片](/ci/release-validation/live-and-e2e-shards)                   | 名为 live/E2E 的分片、它们的覆盖范围以及它们运行的​​镜像。                                         |
| [封装 Acceptance](/ci/release-validation/package-acceptance)                     | 验证一个可安装的 tarball：作业、候选人来源、套件配置文件和示例。                     |
| [装烟 Docker E2E](/ci/release-validation/install-smoke-and-docker-e2e) | 安装 Smoke 覆盖范围、本地 Docker E2E 聚合和可调参数以及发布路径块。                  |
| [插件 Prerelease](/ci/release-validation/plugin-prerelease)                       | 单独的、更昂贵的插件 product/package 套件以及何时调度。                           |

[ 有界混合托管卸载](/ci/capacity#bounded-hybrid-hosted-offload) 仅适用于自动 CI 首次尝试。完整版本验证、candidate/artifact 工作流程和冻结目标工作负载保留其现有的覆盖范围和运行路线。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/ci/release-validation#suite-profiles`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="full-release-validation" />[完整版本Validation](/ci/release-validation/full-release-validation#full-release-validation)
- <a id="live-and-e2e-shards" />[Live 和 E2E 分片](/ci/release-validation/live-and-e2e-shards#live-and-e2e-shards)
- <a id="package-acceptance" />[封装 Acceptance](/ci/release-validation/package-acceptance#package-acceptance)
- <a id="jobs" />[工作](/ci/release-validation/package-acceptance#jobs)
- <a id="candidate-sources" />[候选来源](/ci/release-validation/package-acceptance#candidate-sources)
- <a id="suite-profiles" />[套件简介](/ci/release-validation/package-acceptance#suite-profiles)
- <a id="legacy-compatibility-windows" />[旧版兼容性 Windows](/ci/release-validation/package-acceptance#legacy-compatibility-windows)
- <a id="examples" />[示例](/ci/release-validation/package-acceptance#examples)
- <a id="install-smoke" />[装烟](/ci/release-validation/install-smoke-and-docker-e2e#install-smoke)
- <a id="local-docker-e2e" />[本地 Docker E2E](/ci/release-validation/install-smoke-and-docker-e2e#local-docker-e2e)
- <a id="tunables" />[可调参数](/ci/release-validation/install-smoke-and-docker-e2e#tunables)
- <a id="reusable-live/e2e-workflow" /><a id="reusable-live%2Fe2e-workflow" />[可重复使用 live/E2E 工作流程](/ci/release-validation/install-smoke-and-docker-e2e#reusable-live%2Fe2e-workflow)
- <a id="release-path-chunks" />[发布路径块](/ci/release-validation/install-smoke-and-docker-e2e#release-path-chunks)
- <a id="plugin-prerelease" />[插件 Prerelease](/ci/release-validation/plugin-prerelease#plugin-prerelease)

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [发布渠道](/install/development-channels)
