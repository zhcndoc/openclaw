---
summary: "发布 live/E2E 子工作流程中命名的实时分片和 E2E 分片"
read_when:
  - "您正在重新运行失败的实时分片或 E2E 分片"
  - "您需要手动一次性运行的分片名称"
title: "直播和 E2E 分片"
sidebarTitle: "直播和 E2E 分片"
---

指定的 live 和 E2E 分片发布 live/E2E 子进程运行，以及每个分片涵盖的内容。 [ 发布验证工作流程](/ci/release-validation) 索引的一部分。

## <a id="live-and-e2e-shards"></a> Live 和 E2E 分片

发布 live/E2E 子流程保留了广泛的原生 `pnpm test:live` 覆盖，但它通过 `scripts/test-live-shard.mjs` 以命名分片的方式运行，而不是一个串行任务：

- `native-live-src-agents`（代理、决策、LLM 和技能）和 `native-live-src-agents-zai-coding`
- `native-live-src-gateway-core`
- 按 provider 过滤的 `native-live-src-gateway-profiles` 任务
- `native-live-src-gateway-backends`
- `native-live-src-infra`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-moonshot`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒体audio/video分片和提供商过滤的音乐分片

这在保持相同文件覆盖范围的同时，使缓慢的 live provider 失败更容易重新运行和诊断。聚合的 `native-live-src-gateway`、`native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称仍然对手动一次性重跑有效。

Stable/full 发布验证包括 `native-live-test` 中的无配置 `agent exec --auth-env-only` 代码模式烟雾。测试运行程序在启动工作程序之前构建运行时。在源签出之外构建分发的烟雾副本，应用包的插件排除项，并重用已安装的依赖项。它仅向新的 CLI 环境提供 `OPENAI_API_KEY`，在没有运行时覆盖的情况下运行 `openai/gpt-5.6-luna`，并验证代码模式参与、嵌套工具调用和精确的读写工件。这证明了内置分布行为；包验收拥有 tarball 安装证明。分片需要通过该测试的证据；丢失钥匙或跳过测试无法满足释放门的要求。

网关配置文件分片和包含图像工具提供程序或 OpenAI 插件实时测试的分片在启动 Vitest 之前准备 `sourcePerformance` 构建配置文件。这提供了可执行的提供程序和代理运行时工件，无需构建声明或 Control UI。提供商的请求、断言和测试截止日期保持不变；网关诊断环境设置仅适用于网关配置文件分片。冷源插件 Jiti 导入成本仍然是单独的性能后续指标，而不是实时提供商延迟。

Stable/full释放运行显式启用OpenAI AgentSession反复压实`native-live-src-agents`和`OPENCLAW_LIVE_OPENAI_COMPACTION=1`和`OPENCLAW_LIVE_OPENAI_COMPACTION_FULL=0`。这使用有界 48k 上下文配置文件，并需要多次压缩和持久标记召回。手动分片运行保留显式选择加入；一旦启用，跳过的压缩测试就会导致分片的通过证据门失败。单独的 922k 全上下文压力配置文件仍然是手动选择加入。

本地直播媒体分片运行在`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，由`Live Media Runner Image`工作流程。该图像预安装`ffmpeg`和`ffprobe`；媒体作业仅在设置之前验证二进制文件。保持Docker-支持普通 Blacksmith 跑步者的实时套件 - 容器作业是启动嵌套的错误位置Docker测试。

发布和预定的实时检查向前推进`KIE_API_KEY`， `NOVITA_API_KEY`， 和`PIXVERSE_API_KEY`媒体工作流程及其独立的实时配置文件。配置这些存储库机密以行使他们的视频插件；缺少凭据不符合所选的完整版本覆盖范围。

Docker- 支持的实时 model/backend 分片针对每个选定的提交使用单独的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>-<extensions>` 映像。实时发布工作流程构建并推送该映像一次，然后 Docker 实时模型、提供商分片网关、CLI 后端、ACP 绑定和 Codex harness分片与 `OPENCLAW_SKIP_DOCKER_BUILD=1` 一起运行。网关 Docker 分片在工作流程作业超时以下具有显式脚本级 `timeout` 上限，因此卡住的容器或清理路径会快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则发布运行配置错误，并且会在重复的映像构建上浪费时钟。
