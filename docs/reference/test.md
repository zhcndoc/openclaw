---
summary: "OpenClaw 测试参考的索引，每个读者作业一页"
read_when:
  - "运行或修复测试时"
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[测试](/help/testing)
- 更新和插件包验证：[测试更新和插件](/help/testing-updates-plugins)。

对于证明选择，请遵循规范的 [ 证明策略 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)。

此页是一个索引。测试参考记录有六页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                           | 读它的时候                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [本地运行测试](/reference/test/local)                     | 重点本地证明、核心命令表和可选的完整本地运行。         |
| [控制 UI、TUI 和 E2E 通道](/reference/test/lanes)        | Control UI、TUI、分机、网关和实时通道命令和灯具规则。     |
| [Docker 测试套件](/reference/test/docker)                   | 加权 Docker 调度程序、其旋钮以及著名的 Docker 通道。            |
| [测试性能和基准](/reference/test/performance) | 导入分析、CPU 和堆配置文件、分片计时和基准脚本。 |
| [测试运行器内部](/reference/test/runner-internals)      | 共享构建锁、隔离测试状态和 home，以及 JSON 报告合并。        |
| [远程测试证明](/reference/test/remote-proof)              | 当代理使用 Crabbox 或 Testbox 以及包装器、租赁和信任规则时。       |

## <a id="local-command-guidance"></a> 本地命令引导

对于普通本地测试，从`docs/reference/test.md#routine-local-order`（[例行本地命令](/reference/test/local#routine-local-order)）和`#core-commands`开始；当范围或运行者行为很重要时，请阅读 [CI](/ci)。遵循所触及的子树的 `AGENTS.md`。

`pnpm verify` 运行完整的 `check`，然后在该范围合理时运行 `test`。对于工人敏感的故障，`OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test <path>` 提供了集中串行探针；不要在强制环境下进行修复。在运行所选计划之前，使用 `node scripts/check-changed.mjs --dry-run -- <paths...>` 检查更改的检查。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/reference/test#core-commands`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="agent-default" />[代理默认](/reference/test/remote-proof#agent-default)
- <a id="crabbox-repository-setup" />[Crabbox 存储库设置](/reference/test/remote-proof#crabbox-repository-setup)
- <a id="routine-local-order" />[常规本地订单](/reference/test/local#routine-local-order)
- <a id="core-commands" />[核心命令](/reference/test/local#core-commands)
- <a id="source-tests-and-subprocess-builds" />[源测试和子进程构建](/reference/test/local#source-tests-and-subprocess-builds)
- <a id="shared-test-state-and-process-helpers" />[共享测试状态和过程助手](/reference/test/runner-internals#shared-test-state-and-process-helpers)
- <a id="control-ui%2C-tui%2C-and-extension-lanes" /><a id="control-ui-tui-and-extension-lanes" />[控制UI、TUI和延伸通道](/reference/test/lanes#control-ui-tui-and-extension-lanes)
- <a id="real-gateway-control-ui-fixture-lifetimes" />[Real-Gateway Control UI 夹具寿命](/reference/test/lanes#real-gateway-control-ui-fixture-lifetimes)
- <a id="retained-mocked-control-ui-proof" /><a id="retained-control-ui-proof" />[保留Control UI证明](/reference/test/lanes#retained-control-ui-proof)
- <a id="screenshots-during-chromium-recordings" />[Chromium 录制期间的屏幕截图](/reference/test/lanes#screenshots-during-chromium-recordings)
- <a id="gateway-and-e2e" />[网关和E2E](/reference/test/lanes#gateway-and-e2e)
- <a id="full-docker-suite-(pnpm-test%3Adocker%3Aall)" /><a id="full-docker-suite-pnpm-testdockerall" />[完整 Docker 套件](/reference/test/docker#full-docker-suite-pnpm-testdockerall)
- <a id="notable-docker-lanes" />[著名 Docker 车道](/reference/test/docker#notable-docker-lanes)
- <a id="sandbox-compatibility-lanes" />[沙箱兼容性通道](/reference/test/docker#sandbox-compatibility-lanes)
- <a id="local-pr-gate" />[本地PR门](/reference/test/local#local-pr-gate)
- <a id="json-reports-across-native-processes" />[JSON 跨本机进程的报告](/reference/test/runner-internals#json-reports-across-native-processes)
- <a id="test-performance-tooling" />[测试性能工装](/reference/test/performance#test-performance-tooling)
- <a id="benchmarks" />[基准](/reference/test/performance#benchmarks)
- <a id="model-latency-scripts-bench-model-ts" />[模型延迟基准](/reference/test/performance#model-latency-scripts-bench-model-ts)
- <a id="cli-startup-scripts-bench-cli-startup-ts" />[CLI启动基准](/reference/test/performance#cli-startup-scripts-bench-cli-startup-ts)
- <a id="gateway-startup-scripts-bench-gateway-startup-ts" />[网关启动基准](/reference/test/performance#gateway-startup-scripts-bench-gateway-startup-ts)
- <a id="gateway-restart-scripts-bench-gateway-restart-ts" />[网关重启基准](/reference/test/performance#gateway-restart-scripts-bench-gateway-restart-ts)
- <a id="onboarding-e2e-(docker)" /><a id="onboarding-e2e-docker" />[入门引导 E2E （Docker）](/reference/test/docker#onboarding-e2e-docker)
- <a id="qr-import-smoke-(docker)" /><a id="qr-import-smoke-docker" />[QR进口烟（Docker）](/reference/test/docker#qr-import-smoke-docker)

## <a id="related"></a> 相关内容

- [测试](/help/testing)
- [现场测试](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
