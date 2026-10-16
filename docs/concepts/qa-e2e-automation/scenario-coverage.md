---
doc-schema-version: 1
summary: "分类覆盖 ID、场景 YAML 和配置文件如何选择 QA 运行以及 Multipass suite 运行程序执行的内容。"
read_when:
  - "您正在选择运行涵盖哪些场景"
  - "您需要多通道套房通道"
title: "场景覆盖"
---

<a id="canonical-scenario-coverage" />

## <a id="scenario-coverage"></a> 场景覆盖

根 `taxonomy.yaml` 定义语义覆盖 ID。 `qa/scenarios/` 下的场景 YAML 文件将每个场景映射到这些 ID 和自己的执行元数据； `execution.channel` 或 `execution.channels` 声明通道要求。分类配置文件选择覆盖范围 ID 或整个类别，目录解析其主要场景所有者。传输运营商将渠道和提供商资格应用于该结果，而不是保留场景 ID 许可名单。通道驱动程序是可互换的运行级实现选择。

对于 `qa suite`、`qa run --qa-profile` 和专用传输 QA 命令（例如 `qa telegram`），省略 `--scenario` 以使用默认选择。供货时，至少需要一个非空场景 ID；有效 ID 周围的空格和空白值将被忽略。在调度运输运行程序之前，全空白选择将被拒绝。

静态 `qa coverage` 输出报告分类到场景的映射。实际证据来自`qa-evidence.json`，它记录了执行的场景、覆盖ID、通道、实际使用的驱动程序和结果。渠道和驱动因素是报告维度，而不是额外的覆盖范围 - ID 词汇表或场景资格轴。

对于一次性 Linux VM 通道而不将 Docker 引入 QA 路径，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这将启动一个新的 Multipass 来宾，安装依赖项，在来宾内构建 OpenClaw，并运行 `qa suite`。来宾通过已安装的工作区将正常的 QA 报告和摘要写入主机上的 `.artifacts/qa-e2e/...` 中，包括场景失败时。它在主机上重用与 `qa suite` 相同的场景选择行为。

主机和 Multipass suite 运行默认会并行执行多个已选场景，并使用隔离的网关 worker。`qa-channel` 默认并发数为 4，并受所选场景数量上限限制。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。使用 `qa run --qa-profile personal-agent --provider-mode mock-openai` 运行个人助手基准测试，或使用 `--qa-profile observability` 运行源码检出遥测检查。CI 对 `smoke-ci` 使用相同的 profile 解析器；这些选择器都不会维护第二份场景 ID 列表。

当任何场景失败时，命令会以非零状态退出。当你想要获取工件但不希望失败导致退出码非零时，请使用 `--allow-failures`。

Live 向前运行对来宾实用的受支持的 QA 身份验证输入：基于 env 的提供程序密钥、QA 实时提供程序配置路径以及 `CODEX_HOME`（如果存在）。在存储库根目录下使用存储库相关的 `--output-dir`，以便来宾可以通过已安装的工作区写回。
