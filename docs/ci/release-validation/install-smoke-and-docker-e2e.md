---
summary: "安装 Smoke 覆盖范围、本地 Docker E2E 聚合和发布路径 Docker 块"
read_when:
  - "您正在运行或调试 Docker E2E 通道"
  - "您需要本地 Docker E2E 可调参数或发布路径块名称"
title: "安装烟雾 Docker E2E"
sidebarTitle: "安装烟雾 Docker E2E"
---

安装 Smoke 覆盖范围、本地 Docker E2E 聚合及其可调参数、可重用 live/E2E 工作流程以及发布路径块。 [ 发布验证工作流程](/ci/release-validation) 索引的一部分。

## <a id="install-smoke"></a> 安装烟测

`Install Smoke` 工作流程不再在拉取请求或 `main` 推送上运行。它的 nightly/manual 包装器和发布验证都调用只读 `install-smoke-reusable.yml` 核心，并且每次运行都采用 GitHub-hosted 运行器上的完整安装烟雾路径：

- 根 Dockerfile 烟雾映像针对每个目标 SHA 构建一次，绑定到工作流程修订和生产者在不可变工件中的尝试，然后由 CLI 烟雾加载，代理删除共享工作空间 CLI 烟雾、容器网关网络 E2E 和捆绑的 `matrix` 插件build-arg 烟雾。插件 Smoke 验证运行时依赖项安装镜像，并且插件加载时无需进行入口转义诊断。
- QR 软件包安装和 installer/update Docker 冒烟（包括 Rocky Linux 安装程序通道和针对可配置 `update_baseline_version` npm 基线的更新通道）作为单独的作业运行，因此安装程序工作不会在根映像后面等待抽烟。

缓慢的 Bun 全局安装和运行时烟雾由 `run_bun_global_install_smoke` 单独控制。它使用受信任的生命周期脚本安装候选程序，然后验证 Bun 1.4.3 或更新版本下的代表性 CLI、本地代理和网关路径。它按每晚计划运行，默认启用来自发布检查的工作流调用，并且可以选择手动 `Install Smoke` 调度。正常的 PR CI 仍然运行快速 Bun 启动器回归通道以进行 Node- 相关更改。 QR 和安装程序 Docker 测试保留自己的以安装为中心的 Dockerfile。

Bun-only 运行时烟雾将经过验证的候选 tarball 与来自 `setup-test-bun` 的校验和固定的 Bun 分支重用。它通过在私有挂载命名空间中记录哨兵来屏蔽系统 Node，保持主机不变，并使用子 PID- 相关的生成跟踪来检测 Node 跨安装、CLI、网关、节点-主机配对、模拟代理轮次、Doctor、终端和浏览器步骤的尝试。该通道进行一次 Node-less `bun install` 尝试，并将 `OPENCLAW_PACKAGE_BUN_LAUNCHER` 设置为固定的 Bun 可执行文件；安装失败会使通道失败，而无需使用 Node 重试。安装将其他 Node 启动器的哨兵放在 PATH 上，使 `node` 不在安装哨兵目录中，以便 Bun 可以注入其生命周期填充程序。 Node 在烟雾将其隐藏之前仍可用于有效载荷准备和验证。 Bun-only 通道仅通过其自己的 `run_bun_only_runtime_smoke` 输入在发布检查（完整发布验证）中运行，从不在夜间计划或手动 `Install Smoke` 调度上运行，并跳过冻结目标。目前是建议性的（`continue-on-error`）：在运行时记录失败，而不会阻止发布。 `scripts/e2e/lib/bun-only-runtime/expected-node-blockers.json` 中存在已知的 Node 要求：未列出的 Node 尝试失败，并且不再重现的列出的阻止程序将失败，直到其条目被删除。

## <a id="local-docker-e2e"></a> 本地 Docker E2E

`pnpm test:docker:all` 会预构建一个共享的 live-test 镜像，打包一次 OpenClaw 作为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个裸的 Node/Git 运行器，用于 installer/update/plugin-dependency 这些 lane；
- 一个功能性镜像，将同一个 tarball 安装到 `/app` 中，用于普通功能 lane。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mts` 中，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mts` 中，并且运行器仅执行选定的计划。调度程序使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 选择每个通道的图像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。使用这些包镜像的实时通道不需要单独的源实时测试镜像； model/backend 消耗源图像的通道仍在准备它。

### <a id="tunables"></a> 可调参数

| 变量                               | 默认值 | 用途                                                                                       |
| -------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 主池中普通 lane 的并发槽位数。                                                        |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对 provider 敏感的尾池槽位数。                                                      |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发 live lane 上限，避免 provider 限流。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 5       | 并发 npm install lane 上限。                                                              |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务 lane 上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 为避免 Docker daemon 创建风暴，lane 启动之间的错峰间隔；设为 `0` 可取消错峰。     |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个 lane 的兜底超时时间（120 分钟）；被选中的 live/tail lane 使用更严格的上限。           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置   | `1` 会打印调度计划而不运行 lane。                                          |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置   | 逗号分隔的精确 lane 列表；会跳过 cleanup smoke，方便 agent 复现某个失败 lane。 |

权重超过其有效上限的 lane 仍然可以从空池中启动，然后会单独运行直到释放容量。本地聚合流程会预检 Docker、移除过时的 OpenClaw E2E 容器、输出活跃 lane 状态、持久化 lane 耗时以支持最长优先排序，并且默认在首次失败后停止调度新的池化 lane。

### <a id="reusable-live%2Fe2e-workflow"></a><a id="reusable-live/e2e-workflow"></a> 可复用的 live/E2E 工作流

存储库 E2E 作为 9 个独立作业运行：四个持续时间加权网关分片、四个持续时间加权 Control UI 分片以及独立代理插件网关测试。两个独立的生产者为每个配置文件构建一次选定的源：用于网关 package/type 检查的完整私有 QA 构建，以及用于 UI 和代理插件测试的 CI 工件构建。消费者恢复精确的生产者工件，包括生成的插件资产和本地构建元数据，并安装自己的 Chromium 和沙箱先决条件。每组有四个测试槽，因此 UI 分片可以一起启动，而无需等待网关声明或测试。失败的生产者会阻止自己的消费者；其他诊断仍在继续。

网关分片保留现有的四个新进程边界和两人限制。每个 UI 分片最多与两个工作线程运行其捆绑文件，然后依次运行其私有服务器、真实网关和运行时预算文件。根排序器将两个项目中的文件分配给相同的四个加权分片。没有测试被过滤掉，现有的 90 分钟作业截止日期也没有改变。本地`pnpm test:e2e`仍然按顺序运行其套件命令；每个 UI 命令使用相同的项目策略。

这消除了每次调用的 7 个构建，并将峰值测试并发数从 6 提高到 8。发布检查通过 `gateway_repo_e2e_use_github_hosted_runners: false` 将完整的网关构建和四个网关测试分片路由到现有的 `blacksmith-32vcpu-ubuntu-2404` 配置文件。每个活动需要 5 个 Blacksmith 注册，同时最多有 4 个 Gateway 测试运行者； UI、插件和其他现场套件路由保持不变。其他调用者将网关选项默认为 true 并保留其总体托管运行程序选择。独立的 Blacksmith 调用可以注册 11 个运行程序：两个生产者和九个测试作业。生产者工件身份在仅消费者重试后仍然存在；消费者永远不会根据自己当前的尝试次数来选择工件。

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个 package、image kind、live image、lane 和凭据覆盖。然后 `scripts/docker-e2e.mjs` 会把该计划转换为 GitHub outputs 和 summaries。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的 package artifact，或者从 `package_artifact_run_id` 下载 package artifact，然后验证 tarball 清单。默认的 `no-push-artifact` 路径会通过 Blacksmith 的 Docker layer cache 构建带有 package-digest 标签的 bare/functional 镜像，将精确的镜像字节打包进不可变的 workflow artifact，并让每个消费者验证并加载该 artifact。`existing-only` 则要求显式提供 `docker_e2e_bare_image`/`docker_e2e_functional_image` 的 GHCR 引用，并且从不构建或推送。这些 registry 拉取使用有上限的 180 秒单次尝试超时，因此卡住的流会快速重试，而不是占用大部分 CI 关键路径。在成功完成调度验证后，`openclaw-scheduled-live-checks.yml` 会将不可变的已测试镜像清单传递给独立的 package-write 发布器；只读的 release 和 prerelease 调用方永远不会进入该写入流程。

### <a id="release-path-chunks"></a> Release-path 分块

Release Docker 覆盖使用更小的分块作业，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个分块只验证并加载它所需的 artifact-backed 镜像种类（或者在显式 `existing-only` 复用下拉取它），并通过同一个加权调度器执行多个 lane：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-restart-auth | package-update-onboarding | package-update-migrations | package-update-self-upgrade | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h | openwebui`

当前版本 Docker 块为 `core`、`package-update-openai`、`package-update-restart-auth`、`package-update-onboarding`、`package-update-migrations`、`package-update-self-upgrade`、`plugins-runtime-plugins`、`plugins-runtime-services`、 `plugins-runtime-install-a` 至 `plugins-runtime-install-h` 和 `openwebui`。 `package-update-openai` 包括实时 Codex 插件包通道，该通道安装候选 OpenClaw 包、从 `codex_plugin_spec` 或具有明确 Codex CLI 安装批准的相同引用 tarball 安装 Codex 插件、运行 Codex CLI 预检和同一会话代理转向，然后运行零重试中等思维转向，发送进度，读取随机工作区输入，写入其确切的工件，并发送完成。 `plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍保留聚合 plugin/runtime 别名。 `install-e2e` 通道别名仍然是两个提供商安装程序通道的聚合手动重新运行别名。

stable/full Docker `core` 块包括 `live-anthropic-cache`。它通过候选包的 Anthropic 提供程序和托管传输发送八个有界请求，检查会话缓存重用，同时临时运行时上下文移过两个真实工具结果和后续用户轮流。缺少凭据、不正确的缓存标记、更改的缓存前缀或重复的历史记录写入都会导致通道失败，而无需重试。这补充了基于源的实时缓存层；它不执行网关会话调度。调度程序为此通道声明 `anthropic-api-key`，并且全块和目标通道预检都特别需要 `ANTHROPIC_API_KEY`； OAuth 凭证仍为支持它们的其他 Anthropic 通道所接受。

第一跳兼容通道共享 3,200 秒内部容器预算和 3,500 秒外部通道预算。托管 4-vCPU 运行 `36506342273` 在最终候选跳跃之前花费了大约 1,558 秒；该跳跃需要另外 560 秒，断言大约需要 5 秒，预计完整通道大约需要 2,125 秒。大约 1.5× 慢速主机余量提供 3,200 秒，另外 300 秒用于主机端工作。每次更新的目标运行时间大约为 540-720 秒；每个通道执行多次更新，因此这不是完整的通道持续时间。在未更改的 npm 权重限制为 5 的情况下，第一跳通道的权重为 2，同时最多允许两个，以减少 npm 和磁盘争用。 20 分钟的三重幸存者可以重叠第一跳车道。自我升级工作允许 210 分钟：三个 3,500 秒的波浪加上幸存者的保守 20 分钟和 10 分钟的设置和工件，总共 205 分钟，四舍五入。目标第一跳作业保留其 60 分钟作业预算。阶段和更新步骤持续时间打印在通道日志中。

经过身份验证的更新重新启动使用 3,420 秒容器预算和 3,720 秒（62 分钟）通道预算。 10 月 6 日至 7 日托管的发布检查在 1,678-2,290 秒内通过，并且在恢复期间也达到了之前的 2,280 秒容器上限。大约 1.5× 2,290 秒的慢速主机余量给出了 3,420 秒，另外 300 秒用于主机端工作。其重启命令在托管运行 `36506210440` 中花费了 856 秒，在四台 CPU Crabbox 上花费了 993 秒； 993 × 1.5 提供特定于通道的 1,500 秒命令超时。共享 900 秒命令默认值保持不变。单独的 `package-update-restart-auth` 作业允许 75 分钟，匹配目标重启验证作业，并在通道预算之外留出 13 分钟用于设置和工件。剩余的 `package-update-openai` 作业允许 60 分钟。这些封闭的预算不会解决在重新启动的网关变得正常后仍处于待处理状态的恢复命令。

提供商中立的包检查在三个平衡行中运行：加入和安装切换、channel/published 迁移和自我升级。这可以避免在一个运行程序的 npm 资源限制之后序列化八个 npm-heavy 通道。聚合 `package-update-core` 和 `package-update` 名称仍然可用于手动运行。 `package-update-openai` 行还运行根管理的 VPS 升级； `package-update-restart-auth`拥有经过认证的更新重启证明。调度程序资源限制保持不变。凭证预检失败仍处于阻塞状态，而以下诊断池会耗尽非活动通道；早期的设置失败和取消仍然会阻止执行。

只要稳定或完整的发布路径覆盖需要，OpenWebUI 就会在专用大磁盘 Blacksmith 运行器上作为独立的 `openwebui` 块运行，即使可重用工作流将支持的作业路由到 GitHub-hosted 运行器也是如此。保持外部镜像拉取分离可以防止大镜像与`plugins-runtime-services`中的共享包和插件镜像竞争；旧版聚合 plugin/runtime 块仍包含 OpenWebUI，以实现兼容的手动重新运行。捆绑通道更新通道会针对暂时性 npm 网络故障重试一次。

每个分块都会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢 lane 表，以及每个 lane 的重跑命令。工作流的 `docker_lanes` 输入会针对为该次运行准备好的镜像执行所选 lane，而不是运行分块作业，这样失败 lane 的调试就被限制在一个定向的 Docker 作业中；如果所选 lane 是 live Docker lane，那么定向作业会为那次重跑在本地构建 live-test 镜像。重跑辅助工具会验证失败 artifact 的精确 selected target SHA，而手动触发会重新打包该 ref，因为内部可复用 workflow 的 package tuple 不属于 `workflow_dispatch` schema。生成的命令只有在这些输入是 GHCR-backed 时才会包含已准备好的镜像输入和 `shared_image_policy=existing-only`；runner 本地的 artifact tags 会被省略，这样新 runner 会重新构建它们。显式的 target override 会丢弃恢复出的 GHCR 镜像引用，除非 artifact 证明它们与 override 匹配。由 artifact 生成的 workflow-definition refs 也会被省略，因为 full-release 临时分支会被删除；dispatch 会使用仓库默认分支，除非操作员显式覆盖它。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

计划中的 live/E2E 工作流会每天运行完整的 release-path Docker 套件，并在成功后为精确的已测试镜像工件调用显式发布器。
