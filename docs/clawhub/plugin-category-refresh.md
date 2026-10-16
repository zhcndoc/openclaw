---
title: "刷新插件类别"
summary: "操作已审查的生产插件类别刷新和回滚工作流程"
read_when:
  - "您正在操作已批准的生产插件类别回填"
llms: false
---

# <a id="refreshing-plugin-categories"></a> 清爽插件类别

**Plugin 类别 Refresh** GitHub 工作流程使用现有生产环境凭证在生产 `wry-manatee-359` 上运行。它从不部署代码。首先通过正常的发布工作流程从 main 部署匹配的前端和后端。每个操作在继续之前都会验证确切部署的提交和公共类别词汇表。即使 main 已高级，也从 main 调度：工作流检查 `expected_sha` 并验证它是在运行任何存储库代码之前接收调度的主修订的祖先。操作员独立验证其实际的 Git 签出。这需要包含可恢复操作符的已部署修订版；较老的操作员无法仅通过更改调度修订版来获得此行为。

在整个刷新窗口内保持生产部署冻结。 SHA 检查是预检，而不是全局部署锁定。 Apply 启动异步迁移：等到状态报告完成后再允许任何部署，并在操作丢失响应时重新检查状态。后端分别重新检查每行的分类器、固定的捆绑分配、最新版本和源哈希。操作员应验证每个波周围部署的 SHA。

## <a id="preview-and-review"></a> 预览和评论

使用稳定运行的ID进行完整的遍历。预览写入日志行并可能调用 `gpt-5.6-luna`；它不会改变人们浏览的类别。生产 `OPENAI_API_KEY` 必须存在，并且 `OPENAI_PLUGIN_CATEGORY_MODEL` 必须未设置或 `gpt-5.6-luna`。状态将这些检查报告为布尔值，没有秘密。

```bash
gh workflow run plugin-category-refresh.yml --repo openclaw/clawhub --ref main \
  -f mode=status -f expected_sha="$DEPLOYED_SHA" -f run_id="$CATEGORY_RUN"

gh workflow run plugin-category-refresh.yml --repo openclaw/clawhub --ref main \
  -f mode=preview -f expected_sha="$DEPLOYED_SHA" -f run_id="$CATEGORY_RUN" \
  -f max_pages=20 -f workers=3 -f cursor="$PREVIEW_CURSOR"
```

每个预览最多处理十个包行的二十页，最多有四个同时操作。页面不能包含任何插件。下载工作流的 `plugin-category-refresh-*` 工件并使用其 `resumeCursor` 进行下一次调度。失败时，即使后面的页面已完成，该光标也会在第一个未完成的页面之前停止。重复使用相同的运行 ID：现有日记帐行将被跳过，从不替换。丢失响应的请求可能仍会在服务器上完成；等待其稳定后再重试。使用相同的运行 ID 从一开始运行一次最终遍历，以协调枚举期间的更改。每个页面都保留有界的包 ID 以及跳过或失败条目的诊断原因，包括从未生成日志行的条目。

对于小型修复，请选择 1-10 个不同的、准确的规范包名称，而不是遍历语料库。命名选择需要 `mode=preview`、`max_pages=1`，并且没有光标：

```bash
gh workflow run plugin-category-refresh.yml --repo openclaw/clawhub --ref main \
  -f mode=preview -f expected_sha="$DEPLOYED_SHA" -f run_id="$CATEGORY_RUN" \
  -f max_pages=1 -f package_names='["@example/browser","another-plugin"]'
```

将示例名称替换为现有插件包。丢失、重复、不规范和非插件名称会在日志写入之前拒绝请求。结果是一个终端页面；使用相同的运行 ID 和名称重试以跳过现有建议。对于正常的语料库分页，省略 `package_names`。命名选择会保留创作和审阅的作业，并且仍然需要单独的报告、接受和应用下面的步骤。

运行 `mode=report` 和 `cursor`/`max_pages`，每次调度最多导出 2,000 个日记帐行。报表光标和预览光标属于不同的表；不要互换它们。检查提议的类别、来源、证据、以前的类别、版本和状态。不能接受后备行；在新运行 ID 下重试失败的分类。当前的单一类别作者声明仍然具有权威性。旧功能数组和退役类别是根据插件的主要用途重新评估的。

发布和刷新共享有界清单、README/MDX 和捆绑技能证据。声明的技能优先于辅助文档；较长的 README 无法消耗整个文档预算。增强现有通道或为现有模型调整工具的插件是按该工作流程分类的，而不是按其使用的传输或模型分类的。可重复使用的可配置 API/MCP 客户端将集成作为其自身的目的。类别示例很说明性：已知的工作流程可以适合广泛的类别，而无需确切的专业标签。其他需要没有支持的目的或证据不足的；在接受之前检查该解释。

从一个小的试点开始，为一个波次选择最多 100 行。将 `report` 与 JSON `reviewed_ids` 数组结合使用，以获得精确选定的行及其 `reviewHash`。哈希绑定发布、源哈希、分类和类别分配。它有意排除可变的日记状态，因此当作业从预览变为已接受再变为已应用时，它仍然有效。

```bash
gh workflow run plugin-category-refresh.yml --repo openclaw/clawhub --ref main \
  -f mode=report -f expected_sha="$DEPLOYED_SHA" -f run_id="$CATEGORY_RUN" \
  -f reviewed_ids="$REVIEWED_IDS_JSON"

gh workflow run plugin-category-refresh.yml --repo openclaw/clawhub --ref main \
  -f mode=accept -f expected_sha="$DEPLOYED_SHA" -f run_id="$CATEGORY_RUN" \
  -f reviewed_ids="$REVIEWED_IDS_JSON" -f review_hash="$REVIEW_HASH"
```

接受将已审核的行标记为已接受，并通过回滚事务排练前十行。类别状态保持不变。排练失败后，已接受的行可供检查。新生成的预览必须使用分类器 `plugin-single-category-v7`；捆绑预览必须与签出清单中固定的 OpenClaw 源提交和清单哈希相匹配。

## <a id="apply%2C-monitor%2C-and-undo"></a><a id="apply-monitor-and-undo"></a> 应用、监视和撤消

演练成功后，使用相同的已审核 ID 和哈希值调度 `mode=apply`。 Apply 重复前十次排练并验证它处理了多少行，因此之前失败或丢失的排练响应无法绕过此门。该工作流要求接受每个选定的行，并在另一个迁移工作线程运行或存在任何未经审核的已接受行时拒绝启动。共享迁移工作人员应用十个批次。其接受行索引涵盖所有运行，因此请将此工作流程用作波次期间的唯一操作员。

轮询 `mode=status`，然后导出 `mode=report`。组件的已处理计数包括尝试次数；分别计算实际的 `applied` 和 `stale` 日记帐行。申请时后台再次核对最新发布及证据；更改的行会变得陈旧，而不是覆盖新的工作。等待工作人员完成并验证 browse/detail 输出，然后再开始另一波。

如果浪潮中途停止，则仅报告并选择其剩余的已接受行，获取新的审核哈希，然后再次调度应用。仅当没有工作线程处于活动状态时，工作流才会重新启动接受的索引。对于回滚，报告并选择应用的行，然后使用这些 ID 和哈希值调度 `mode=rollback`。当较新的出版物或类别编辑更改了应用状态时，回滚会被拒绝。部分回滚失败后，在重试之前仅报告并选择剩余的已应用行。保留日志和下载的工件，直到验证完成；文物将在三十天后过期。
