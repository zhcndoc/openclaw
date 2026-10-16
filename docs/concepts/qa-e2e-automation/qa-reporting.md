---
doc-schema-version: 1
summary: "QA 报告和证据工件、字符评估判断报告以及每次运行写入它们的位置。"
read_when:
  - "您正在阅读 QA 报告或证据文件"
  - "您需要character-eval判断报告格式"
title: "QA 报告"
---

## <a id="reporting"></a> 报告

`qa-lab` 会从观测到的 bus 时间线导出一份 Markdown 协议报告。 报告应回答：

- 哪些工作正常
- 哪些失败了
- 哪些仍然被阻塞
- 值得补充哪些后续场景

对于可用场景的清单 - 在确定后续工作规模或连接新传输时很有用 - 运行 `pnpm openclaw qa coverage` （添加 `--json` 以实现机器可读输出）。当为触摸行为或文件路径选择焦点证明时，请运行 `pnpm openclaw qa coverage --match <query>`。匹配报告搜索场景元数据、文档参考、代码参考、覆盖范围 ID、插件和提供程序要求，然后打印匹配的 `qa suite --scenario ...` 目标。生成的命令保留声明的通道驱动程序要求以及具有不同驱动程序要求的单独场景。如果没有驱动程序要求，非 QA 通道使用 `live`，而 `qa-channel` 保留其默认驱动程序。

每次 `qa suite` 运行都会为选定的场景集写入顶级 `qa-evidence.json`、`qa-suite-summary.json` 和 `qa-suite-report.md` 工件。声明 `execution.kind: vitest` 或 `execution.kind: playwright` 的场景运行匹配的测试路径并写入每个场景日志。声明`execution.kind: script`的场景在`execution.path`到`node --import tsx`上运行证据生产者（`${outputDir}`和`${scenarioId}`在`execution.args`中扩展）；生产者编写自己的 `qa-evidence.json`，其条目被导入到套件输出中，并且其工件路径相对于该生产者 `qa-evidence.json` 进行解析。当通过 `qa run --qa-profile` 到达 `qa suite` 时，相同的 `qa-evidence.json` 还包括所选分类类别的概要记分卡摘要。

运行时轴奇偶校验报告保留每个运行时记录的 `pass`、`fail` 或 `skip` 结果。运行时和传输失败会覆盖通过或跳过的结果；受控工具误差仍然可以接受。当其配对的运行时通过时，跟踪的 `known-harness-gap` 跳过可以让场景通过，但跳过的单元格仍标记为 `skip`。意外的跳过和跳过两个运行时间的配对仍然无法通过奇偶校验门。缺失的捕获标记为 `missing`。

就绪的 QA 子网关的意外退出会报告其退出代码和信号以及最近的网关日志。故意关闭和更换与运行时故障无关。

当流方案失败时，失败步骤的详细信息还会列出在该方案期间记录的网关日志哨兵结果，例如等待超时后的通道 `final reply failed` 行。场景级详细信息保持不变，因此奇偶校验分类从不依赖于该日志文本。

显式工具结果错误标志优先于返回文本中的关键字；错误结果块仍然失败。没有错误标志的结果保留基于文本的错误检测。因此，成功的文件读取可以包含诸如“失败”之类的单词，而不会丢失其成功的工具覆盖收据。

### <a id="scheduled-instances-and-retained-observations"></a> 计划实例和保留的观测值

Schema v3 证据为每个计划场景实例提供了自己的身份。重复的场景名称按照调度顺序保留单独的实例。一个实例指向它选择的结果；空结果意味着没有记录结果，不是通过。

本机脚本尝试保留子包及其原始实例 ID、选择指针和确切生产者文件的收据。顶层结果描述了外部预定的场景；嵌套实例保留可检查的子细节。单独运行的子包仍会报告其自己的预定结果。随附的尝试单独记录其目录覆盖上限。记分卡和显式证明检查与每个封闭的上限相交，而不更改子行或断言。次要主张永远不会成为主要主张；空上限不符合儿童索赔要求。没有上限的历史捆绑包保留其原始行为。

重试保留原始观察结果和工件。所选尝试控制有效报告计数和覆盖范围，而库则保留保留的行以供检查。选择适用于整个尝试，而不是来自不同尝试的传递行的混合。独立诊断保持独立。完整证据和薄弱证据都保留事件身份、行绑定和工件收据； slim 输出省略了详细的执行上下文。封闭的重试会改变其保留的子包是否有助于提供有效的证据。它不会重写子级的本地选择或原始行。

读者继续接受 schema v2 工件。历史行不会获取发明的尝试、断言、运行时或包标识。来源、包、协议和账户事实仍然未知，除非生产者在拥有观察的边界记录它们。准备好的 Docker 考生收据标识了考生清单和包裹；它不证明安装或运行时行为。

### <a id="explicit-proof-requirements"></a> 明确证明要求

分类配置文件可以声明 `proofRequirements` 以及指定所有者、接受参考、必需或咨询义务、重试策略和接受的身份替代方案。每个替代方案仅命名其所需的源、运行时、包、协议、帐户或证明类维度。一张装订收据必须满足替代收据；来自不相关观察的事实不能合并。 `selected-attempt` 策略排除非活动封闭尝试及其子包。 `all-recorded-attempts` 在评估证据时保留了他们的断言。

所需的缺失或不完整的断言仍然是不合格的。相互冲突的 pass/fail 断言保留了这两个结果。已知的身份不匹配已过时；缺少身份或错误的证明类别不足以证明，而不是发明的产品故障。咨询要求仍然是诊断性的。没有明确声明的配置文件保留其现有行为：仅主要覆盖范围不会创建发布要求。

### <a id="evidence-previews"></a> 证据预览

这QA实验室证据库使用识别的文件后缀来选择图像、视频、JSON，或文本预览。一个`.log`即使文件的自由格式工件类型包含媒体提示，例如`gif`。友善的提示仍然对无扩展名文件和未知后缀进行分类；保留完整的种类标签。

`qa confidence-report` 将 `productImpact` 和 `qaImpact` 注释保留在其自己的 Markdown 表格单元格中，折叠空白以进行显示。 JSON 摘要保留注释值，包括内部换行符。

对于 JSONL 重放通道，每个记录必须报告非负整数用户回合计数，以及两个运行时的漂移条目和结果的匹配数量。丢失或不匹配的证据被分类为 `unknown`，因此两种严格置信模式都会拒绝它。允许零回合转录与完整重播回合一起进行；没有重播用户轮流的报告仍然未知。

将 coverage 输出视为发现辅助，而不是 gate 的替代；所选场景仍然需要正确的 provider 模式、live transport、Multipass、Testbox 或 release lane，才能验证被测行为。关于评分卡上下文，请参阅 [成熟度评分卡](/maturity/scorecard)。

### <a id="character-and-style-evaluation"></a> 人物风格评价

对于字符和风格检查，跨多个 live 模型 ref 运行同一场景，并写出一份经评判的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.6-luna,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.6-sol,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA gateway 子进程，而不是 Docker。字符评估场景应通过 `SOUL.md` 设置 persona，然后运行普通的用户回合，例如聊天、工作区帮助和小文件任务。候选模型不应被告知它正在被评估。该命令会保留每份完整对话，记录基本运行统计，然后在支持的情况下以 `xhigh` 推理、fast 模式向裁判模型请求，按自然度、氛围和幽默感对运行结果进行排序。比较 provider 时使用 `--blind-judge-models`；裁判提示仍会获得每份对话和运行状态，但候选 ref 会被替换为中性标签，例如 `candidate-01`；报告会在解析后将排名映射回真实 ref。

候选运行默认使用 `high` 推理级别，GPT-5.6 Luna 使用 `medium`，支持该级别的较旧 OpenAI 评估 ref 使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 可在行内覆盖特定候选模型；行内选项还支持 `fast`、`no-fast` 和 `fast=<bool>`。`--thinking <level>` 仍会设置全局回退值，而较旧的 `--model-thinking <provider/model=level>` 形式则会继续保留以确保兼容性。OpenAI 候选 ref 默认启用 fast 模式，因此在 provider 支持时会使用优先级处理。只有在希望为每个候选模型强制启用 fast 模式时，才传递 `--fast`。报告会记录候选模型和裁判模型的运行时长，以便进行基准分析，但裁判提示会明确要求不要按速度进行排名。候选模型和裁判模型运行的默认并发数均为 16。当 provider 限制或本地 gateway 压力导致运行结果噪声过大时，请降低 `--concurrency` 或 `--judge-concurrency`。

未传入候选 `--model` 时，字符评估默认使用 `openai/gpt-5.6-luna`、`openai/gpt-5.2`、`openai/gpt-5`、 `anthropic/claude-opus-4-8`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、 `moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`。未传入 `--judge-model` 时，裁判模型默认为 `openai/gpt-5.6-sol,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-8,thinking=high`。
