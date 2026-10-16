---
summary: "GitHub 的观察、发布和受保护的 Octopool 调度 scripts/pr"
read_when:
  - "更改 GitHub 观察、发布或受保护的 PR 合并传输"
title: "PR GitHub 运输"
---

# <a id="pr-github-transport"></a> PR GitHub 运输

这些合约归`scripts/pr`所有；他们不授权公共写入或绕过所需的门。

## <a id="github-observations-and-publication"></a> GitHub 观察结果和发布

`OPENCLAW_PR_GIT` 选择 Git 可执行文件。 Startup 在选择包装器代码之前会在 10 秒的期限内检查该二进制文件； Darwin 进程标识 Python 调用使用相同的截止时间。 PR 元数据、存储库权限、作者身份、评论、贡献者作者和作者权限更喜欢 REST，GraphQL 在确认的主核心配额耗尽后进行回退。审查快照会忽略未使用的检查汇总，而准备工作仅读取其消耗的实时头字段。存储库发现使用 CLI 的本地默认值和主机解析，没有依赖于配额的 HEAD 请求。主机合格定位器直接进入 API；审查元数据重用已解析的 URL。每个 PR-head 观察和合并快照都显式请求 `Cache-Control: max-age=0`：中继重新验证该读取并可能发布其结果，而单独的 before/after 观察绝不能重用一个缓存的事实。登陆快照 GraphQL 查询必须与已发送的 Octopool shim 的白名单完全匹配；分支标识来自现有的 REST 源获取和清理读取。写入器身份使用受保护的 CLI 以及两个传输上包含的标头来保留本机写入器路由。审阅者分配需要 REST 并验证保留的受让人。 CI 观察者轮询 GraphQL 摘要，在 CI 成功后扩展失败或挂起检查的详细信息；主要配额耗尽选择具有完整 check/status 和工作流程证据的 REST。

成功的身份验证在一个 shell 操作及其嵌套工作树条目中重复使用；新的流程和改变的凭证选择需要新的探测。这种私有进程状态永远不会被继承或写入工件。 `merge_verify` 与 `replacementHead`、`autoMergeRequested` 和 `observation` 取得一项期权记录；空观察请求重新读取。存储库标识来自与其主要事实相同的 PR 观察。调用者通过源获取和托管门进行观察；在不可变的获取之后，获取仍然独立地重新读取完整的源标识。在传输准备之后，在每次 Git/GraphQL 写入之前立即重新验证发布，并在获取之前比较成功的发布观察。

普通即刻南瓜更喜欢REST。已验证保留意图的显式恢复以 GraphQL 开始；正常的回退和仅立即恢复门仍然适用。仅针对已确认的主要配额耗尽或不受支持的 REST 策略或可合并性预测（包括 UNKNOWN），准入读取交换机传输；辅助限制和访问失败永远不会授权切换。 REST 需要经过验证，无需经典保护和合并队列、受支持的有效规则、精确的头发布者绑定检查以及保留结果生命周期。它保留来自固定已发布提交或 PR 正文的配置消息内容，并将标题保留为 GitHub。发货前选择运输方式；切勿通过另一个 API 重播不确定的突变。完成注释使用收据观察的传输并保留其一次性标记。自动合并、队列、管理准入和非挤压合并需要 GraphQL； GitHub 没有 REST 自动合并端点。旧托管工作流程证明需要 REST。回退永远不会放弃所需的门。 API 故障保留安全配额并重试原始响应中的元数据。当该响应没有可用的 HTTP 帧时，单独的 GraphQL/core 配额探测将被标记为补充，并且不会建立失败请求的重置。诊断永远不会添加自动重试。

### <a id="octopool-string-rewrite-protection"></a> Octopool字符串重写保护

将 `gh` 保留在 Octopool 垫片上；切勿禁用字符串重写保护或选择原始 GitHub CLI 来着陆。 `review-init` 使用本地 `gh browse` 命令和仅限子项的 URL-printing 启动器解析存储库。较旧的 Octopool 版本在其受保护的尽力而为路径之前拒绝此单例命令。升级到Octopool 0.7.1或更高版本；设置显式主机限定的 `GH_REPO=github.com/openclaw/openclaw` 还可以避免发现，同时保留后续的权威 API 检查。

普通直接REST南瓜使用`gh api --method PUT repos/OWNER/REPO/pulls/NUMBER/merge-async --input <absolute-file>`和JSON，其中包含充分准备的40-hex `sha`、`merge_method: "squash"`、`merge_action: "direct_merge"`、`bypass_rules: false`和经过检查的`commit_message`。它拒绝堆积的 PR，因为此工作流会审核一个 PR。结果保留轮询前返回的UUID；随后的`merge-run`调用读取UUID一次并协调权威PR/tree.接受和`enqueued`不是合并完成。失败、过期、冲突或丢失的响应绝不会授权自动重新提交或其他传输。现有auto/queue/admin、GraphQL配额航线保持各自合同；显式 [prior-CI 管理路由](/reference/scripts/prior-ci) 仍使用同步 `/merge` 端点。异步 PUT 和状态 GET 将 `-H 'X-Octopool-Require: merge-async-v1'` 作为第一个 API 选项，位于 `--hostname` 之前。这需要 [Octopool PR #231](https://github.com/openclaw/octopool/pull/231) 中的结构异步合并防护：较旧的受保护包装器在重写之前拒绝标记，或者本机 GitHub I/O. 如果被拒绝则升级 Octopool；切勿移除标记或重播不确定的意图。本机 `gh` 和空重写策略会在没有重写权限的情况下传递无害的标头。不需要工作人员部署或凭证更改。调度后检查响应不能取代该警卫。共享 GitHub 子进程所有者将内部 `--input -` 有效负载字节暂存在私有临时文件中，将子标准输入保持为空，并在同步完成后删除该文件。即使较新的 Octopool 可以解决缺失的问题，仍保留显式的 SHA。自动合并需要Octopool的受保护自动合并支持（openclaw/octopool#179）、数字PR、`--squash --auto --match-head-commit SHA`、显式`--subject`和`--body-file`。该包装器提供 GitHub 的当前头 `viewerMergeHeadlineText` 预览，因此存储库标题默认值保持不变。 Octopool 0.6.10 和 `641ce3c` 不支持该自动形状。

准备的审阅者分配使用确切的问题受让人 POST 和原始 `assignees[]` 字段。 Fork commit 发布声明其 GraphQL JSON 和 `--input`，因此守卫可以检查它； Octopool 的聚合输入限制仍然适用。本机 CLI 管理、非挤压、队列和自动取消变体不包含在上述可接受的形状中。不要用立即的 REST 合并替换它们，这会改变准入语义。阻塞的调度仍然遵循[保留结果恢复规则](/reference/scripts/merge-recovery)；通用保护错误不具有清除或重试意图的权限。
