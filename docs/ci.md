---
summary: "CI 作业图、范围门控、发布总罩，以及本地命令等价项"
title: "CI 流水线"
read_when:
  - "你需要了解某个 CI 作业为什么运行或未运行"
  - "你正在调试一个失败的 GitHub Actions 检查"
  - "你正在协调一次发布验证运行或重跑"
  - "你正在更改 ClawSweeper 派发或 GitHub 活动转发"
---

CI 在完整版本验证期间继续；旧版发布优先级变量不会暂停工作流准入。请参阅 [deferred CI recovery](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-ci/SKILL.md#deferred-ci-recovery) 了解已被旧工作流程修订推迟的运行。

现有的 `live-cache` 发布作业有 30 分钟的预算，用于对一个运行程序进行三个连续的 8 分钟检查：存储的缓存层、传输前缀和代理轮次前缀。请参阅 [ 提示缓存回归覆盖率 ](/help/testing/suites#prompt-cache-regression-coverage)。

原生视频烟雾覆盖使用四个提供商的四个分片。每个提供商都有 10 分钟的操作超时加上 30 秒的测试开销；每个分片都有 50 分钟的作业预算，留出 8 分钟进行设置。这些碎片使全模式视频测试处于禁用状态。

`Linux App` Linux 配套和 Windows 安装程序作业允许 105 分钟进行源暂存、打包和本机验证。他们的规范核心构建使用现有的 `OPENCLAW_DOCKER_PACKAGE_BUILD_TIMEOUT_MS` 覆盖，并有 60 分钟的余量：冷声明超出了默认的 45 分钟包期限。 Linux 运行在截止日期之前 38 分钟内完成了包裹申报，中断了后续申报阶段；此前，完整的 Windows 安装程序工作需要 78 分钟。剩余的工作预算包括依赖项安装、Rust 编译、桌面测试和安装程序打包。覆盖保留在每个源构建步骤上；发布工作流程预算和包完整性检查保持不变。

当基于时间的分割超过 130 行矩阵上限时，广泛的 PR 保留其紧凑的选定所有者 Node 计划。请参见 [ 节点测试通道 ](/ci/scope-and-routing/node-test-lanes)。

代理身份验证存储准入和配置的模型所有者更改显式选择网关代理配置准备套件。它的惰性启动路径对于有界导入图来说并不完全可见；所有者手表保留重叠覆盖范围。

此页是一个索引。 CI 共九页，每个读者作业一页。打开与您的任务匹配的页面。

存储引擎 PR 和计划的主要运行包括托管的 PostgreSQL 17 [ 一致性作业 ](/help/testing/suites#postgresql-conformance)，选择时 CI 门需要它。

完全混合扩展 lint 将相同的标准块打包到三个现有行中，在每行中共享设置和 SDK 准备工作。定向计划和冻结航线保留现有布局；请参阅 [runner 配置文件](/ci/runners#runner-backend-modes)。

完全混合 PR 检查与核心 lint stripe 1 共享中央格式和脚本 lint（当这些是完整的中央命令清单时）。现有的 16 级运行程序在 15 分钟期限内按顺序执行它们，从而删除了一次签出和依赖设置。附加的中央检查、目标核心条带和没有其他所需检查行的计划保留其单独的 lint 作业。中央 lint 在核心 lint 失败后仍然运行，并且如果失败则共享作业也会失败。

默认分叉首先尝试在 Blacksmith16 上运行现有的核心 lint 条带，保留相同的核心和扩展块分配以及仅恢复缓存。重试和 GitHub 覆盖保持托管状态；请参阅 [ 跑步者放置位置 ](/ci/runners#runners)。

[自动化准入](/ci/scheduled-workflows#comment-automation)在运行器分配和并发之前过滤已知的无操作事件，从而在GitHub-托管运行器上保持自动化。

PR 作业和独立检查在失败后运行直至完成，包括分叉和重试。设置、规划、构建依赖项、取消和看门狗截止日期仍然会阻止无法安全进行的工作。因此，失败的跑步需要更长的时间并占用跑步者更多的时间；成功的运行会保留相同的选定检查、作业名称和并发性。 `pr-failure-report` 将每个失败或超时作业与最新完成的计划主 CI 运行进行比较，并发布 **pre-existing**、**new**，或**unknown** 的摘要分类和 `openclaw/ci-gate`，具有机器可读的 JSON 输出。当 GitHub 仅报告成功或跳过的先决条件时，报告器会记录没有失败需要分类，而无需枚举作业页面。 CI 闸门仍会检查选定的通道并拒绝意外跳过。原因识别匹配的签名或仅职位名称匹配。现有的已知主红津贴和入场结果保持不变。检测到的构建验证程序或 lint 模式范围差异为 **unknown**；其他原因表明未对所选范围进行比较。请参阅 [ 作业排序和故障报告](/ci/pipeline#fail-fast-order)。

在 PR 运行之前添加 `ci:full` 以选择每个 `checks-ui` 单元分片、所有 `checks-ui-e2e` 分片（Control UI 和浏览器扩展）以及每个 `checks-ui-e2e-real-gateway` 分片，包括桌面调整大小证明。它们使用与计划的 `main` CI 相同的 UI 库存和分片预算。未标记的 PR 保留更改选定的 UI 覆盖范围；该标签不会扩展不相关的站台车道。

Real-Gateway UI 分片在正常铁匠路径上有 30 分钟的整体工作预算。 16班作业成功完成时间为19分04秒，与之前的20分钟限制相比，剩下的时间太少了。托管路径和重试路径保留其 40 分钟预算；跑步者规模、工人数量、分片分割和个人测试截止日期均保持不变。

第一跳兼容性使用 3,200 秒容器预算和 3,500 秒通道预算，基于具有慢速主机余量的托管 4-vCPU 测量。发布自我升级作业在 npm 限制为 5 时为第一跳通道权重为 2，最多同时接纳两个。它允许 210 分钟进行三波六源版本、幸存者和设置。经过身份验证的更新重新启动使用 3,420 秒容器预算、62 分钟通道预算和特定于通道的 1,500 秒命令超时。其专用恢复块允许 75 分钟；剩余的 OpenAI 包块允许 60 分钟。请参阅 [release-path chunks](/ci/release-validation/install-smoke-and-docker-e2e#release-path-chunks)。

对于已发布的升级回归门，请参阅 [ 选择和路由](/ci/scope-and-routing#scope-and-routing)、[runner 预算](/ci/capacity#runner-registration-budget) 和 [ 包验收基线](/ci/release-validation#suite-profiles)。每周验证列在 [Update Migration](/ci/scheduled-workflows#update-migration) 下。

更新程序、状态租赁、SQLite 身份、本机插件、启动跟踪和更新程序工具 PR 还需要 [ 已发布驱动程序更新单元 ](/ci/scope-and-routing/selection#published-driver-update-cell)。一项 GitHub- 托管的 Linux 作业使用两个合成代理针对候选包运行最新的稳定 npm 更新程序。其二十分钟的预算和结果包含在`openclaw/ci-gate`中；更广泛的 main/release Docker 幸存者仍然是独立的。

满的`main` CI和缓存变暖是[默认每小时](/ci/scheduled-workflows#hourly-main-ci)； `OPENCLAW_CI_ON_PUSH=true`恢复现有的每次推送入场许可。CodeQL、工作流程健全性和CI's `security-fast`保留现有的主推范围。仅限文档`main`推送仍然跳过CI工作流程和推送触发的缓存预热。缓存预热器独立于长构建发布依赖项，并在混合模式下维护有界托管种子。每一个进入上游`main`运行练习一位已发布的驱动程序 × 候选者Docker升级；普通的manual/release验证添加了其他五个Docker种子车道。QA冒烟、真实网关浏览器检查和命名过程证明保留其选择的`main`覆盖范围和manual/release验证。拉取请求和精确头PR回退调度运行静态正确性门、所有者边界测试、传递导入消费者、受保护的回归和六个文件运行时烟雾集。Node最多目标行数150预计测试秒数。单个文件和不可分割的标准组可以超出该目标；设置、构建和队列与测试时间是分开的。Node分片选择沙盒容器E2E案例准备Docker当跑步者还没有沙箱图像时。缺少或无限制的运行时选择会导致预检失败，而不是回退到每个测试。Windows、浏览器、Docker， QA烟、包装、合同和扩展家庭通过其现有所有者选择加入；各个内置过程证明具有独立的所有者标志。完全静态后备不会扩大它们。这[PR-豁免整合层](/ci/scope-and-routing/node-test-lanes)保留每小时测量的慢速测试`main`和完整的发布验证，PR当他们的测试或科目发生变化时选择加入。现有的插件预发布工作流程拥有完整的扩展运行时覆盖率（每小时）和完整发布验证；普通的CI选择 PR 上受影响的扩展所有者。Windows保留每小时主要和普通的五个测量文件分片的完整库存manual/release验证；Windows-所有者 PR 保留完整的库存。

每小时 iOS 保留 `ios-build (tests)` 与 Rust、语音、本机 Access 和重点生命周期覆盖。调试版本在编译之前选择其模拟器，将其引导和 SimSlim 准备与编译重叠，并在任一聚焦模拟器测试组之前加入准备。准备失败或超时连接导致作业及其日志失败；测试选择和构建设置保持不变。当前烟雾构建用`build-for-testing`准备一次测试产品；语音清理和生命周期组分别将这些产品与 `test-without-building` 一起重复使用。历史目标和其他阶段保留其现有的构建操作。托管附件 UI/export、监视操作和监视交付 UI 套件保留完整 manual/release 验证中的每个断言。主层模拟器构建使用本机架构，无需索引或详细的测试诊断；日志和 xcresult 包仍然可用。合并计划的 iOS 取消可以使 `openclaw/ci-gate` 保持绿色，并发出通知，将 iOS 证明委派给稍后计划的作业；它不会验证已取消的修订，并且仍可以取消工作流程。真正的失败仍然是红色。屏幕截图捕获运行其自己更改的输入和完整的 manual/release 验证。有关覆盖权衡，请参阅 [scope 选择](/ci/scope-and-routing/selection) 和 [capacity](/ci/capacity#owner-path-and-release-coverage)。

当前的 iOS 构建恢复了三个独立的输入缓存：经过验证的 Mermaid 资产、SwiftPM 源包和二进制工件，以及 Watch RTC Cargo 注册表和编译的模拟器库。只有受信任的 `main` 推送和计划运行才能保存它们； PR 仅恢复。冻结的目标保留其原始的冷路径。 Mermaid 在复制资源之前验证源和输出哈希值。它的密钥涵盖了渲染器的完整锁定依赖关系图，包括工作区源和可选的构建依赖关系，因此不相关的根依赖关系升级可以重用资产。 SwiftPM 密钥涵盖 Xcode、包清单和可用的 `Package.resolved` 文件；自动解析保持启用状态（生成的 iOS 项目当前没有跟踪的锁定文件）。监视键涵盖 Xcode、架构、目标映射、固定的 Rust 工具链、锁定文件、crate 源和 iOS 构建设置；构建阶段在重用之前验证库校验和和输入指纹，否则运行锁定的 Cargo 构建。当新的运行者使用新时间戳安装 `rust-src` 时，缓存已完成的切片可以避免重建 Rust 标准库。每小时的 Watch 引擎测试共享注册表下载，而其主机调试产品则不包含在模拟器发布缓存中。

当前的 iOS 调试在 Xcode 执行周围立即构建日志 CPU 计数、内存、机器模型、启动的模拟器和时间戳。只读硬件和模拟器检查各有五秒的限制；不可用的诊断不会阻止构建。这些标记将模拟器查询延迟与 Xcode 启动、包解析和编译区分开来。

共享 OpenClawKit 外围设备扫描可恢复由可信主 CI 发布的相同经过验证的 Watch RTC 库，而不保存缓存。两个 Apple 消费者都在单独的定时步骤中构建完整的索引，并将流输出保留为消费者工件中的 `build.log`。 iOS 使用新的运行拥有的索引；外围设备分析该精确索引而无需重建。扫描范围和共享死代码交集保持不变。缓存未命中会保留锁定的 Cargo 版本。

iOS截图分片、发布资质、Store发布及其纯截图操作使用[更大的托管容量](/ci/runners)。屏幕截图捕获使用库存模拟器并一次创建和清理一个；仅屏幕截图操作可以验证选定的分支，而无需签名或上传版本。配对、聊天和本机概述测试保留其现有的断言和截止日期。

Android 屏幕截图输入 PR 和普通完整手册 CI 在一项托管 Ubuntu 作业中运行现有手机和 Wear 商店捕获脚本。最终的CI门需要捕获才能成功；仅单元测试和文档更改省略了它。请参阅 [ 作业图 ](/ci/pipeline#pipeline-overview) 以获取捕获证据和范围详细信息。

Android 版本 E2E 在选择 Android 时，将一项托管 Ubuntu KVM 作业添加到精确来源、全面的手动验证中，与 iOS 资格选择相匹配。 The final CI gate requires its success.手动 Android 商店发布还需要在 signing/upload 作业之前进行资格认证；内部发行版和 Gateway APK 出版物保留其现有路径。它根据固定的稳定网关、本机转录和键盘行为以及通过 Google 数据层边界上的本地原始消息传输来验证手机 onboarding/chat/relaunch 以及磨损本机输入、聊天、历史记录、重新启动和回复阅读器行为。生产有线编解码器、电话 bridge/controller、网关和 response/event 路径仍然执行。真正的 Google 功能发现、侦听器服务交付和 Play 服务 package/signature 实施保持独立的物理设备烟雾覆盖。内置调试 APK 哈希、签名、包、版本和侦听器声明检查保留在门中； Release/R8、商店签名和上传仍归现有发布通道所有。有关证据、重新运行和覆盖范围的详细信息，请参阅 [Android 发布验证合同](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md#release-validation)。在安装过程中下载标准 SDK 映像和构建依赖项；未配置 Google 帐户、配套 APK 或配对设备映像。

当签出中存在每个选定的编译器输入时，合格的核心源代码和核心测试 PR 会使用目标类型检查。删除的 Markdown 文件和 UI 样式表不会阻止伴随代码更改的缩小范围。 GitHub 和混合配置文件将选定的消费者分布在其现有的核心条带上；铁匠资料会在中间行检查它们。不明确的所有权和删除的编译器输入保留了完整的类型检查覆盖范围。

预检将步骤之间的完整更改路径清单作为本地 JSON 文件传递​​，因此大型 PR 不会丢失操作输出的测试计划输入或环境大小限制。在此传输之前的冻结目标保留其有限制的 JSON 输出合约。丢失或无效的输入仍然会拒绝当前的 PR Node 规划。

[Testbox 检查工作流程](/ci/local-proof#testbox-validation) 请求铁匠 16 级提供例行调度证明，总工作期限为 60 分钟，包括水合作用。显式高内存 32 级工作流程可为占用大量内存的全套门保留 240 分钟。外部GitHub截止时间可以终止活动的SSH命令；单独的 15 分钟空闲限制不会延长它。 PR 水合检查保留在托管的 Ubuntu 上；个别考试截止日期保持不变。

所有五个租赁工作流程从调度到准入和跑步者启动最多需要 60 分钟，然后在结帐和补充之前拒绝过期的请求。此队列限额不会延长正在运行的作业或空闲的最后期限；请参阅 [ 测试盒支出限制](/ci/runners#testbox-spending-limits)。

完整的 GitHub 和混合类型检查独立运行五个核心条带，每个作业保留两个编译器子代。最后四行每行串行运行一个根测试分区，将扩展测试和脚本留在中间行。窄计划在可用时重用四个已选择的行；较小的选择保留中央根检查。这不会增加作业或编译器重叠。当前的混合完整运行使用三个托管的扩展 lint 作业；有针对性的布局保留了六个条纹标识。值得信赖的混合首次尝试在 Blacksmith 16 级上保留了两个打包的核心棉绒行。普通上游混合推送和计划运行，加上同存储库 PR，将 `preflight`、选定的 `pr-failure-report` 和 `openclaw/ci-gate` 放置在托管 `ubuntu-24.04` 上；分叉首次尝试，所有调度、资格、发布和其他后端路由保留其现有覆盖。强制控制计入现有托管行预算。请参见 [ 关键路径分配证据 ](/ci/routing-costs#hosted-assignment-on-the-critical-path)。冻结的目标保持其先前的布局；参见[静态检查](/ci/runners#runner-backend-modes)。

额外的检查和窄 PR 防护和依赖性扫描在预检后立即开始。选择 Madge 或 Kysely 的普通 PR 将防护分为 `check-guards` 和 `check-guards-architecture`，具有相同的运行器路由并且没有编译器计划等待。清单将每项检查保留一次，并且两个选定的行都必须通过。其他事件保留其现有行。守卫保留精确的比较基数和共享的检查命令；编译器和 lint 行等待它们选择的图。已知的完整编译器选择会跳过发现，同时保留现有所需所有者的核心图边界；参见 [ 管道订购 ](/ci/pipeline#fail-fast-order)。

更改的编译器计划从一个本机编译器快照读取每个选定的程序。如果未设置 `OPENCLAW_CI_TYPE_PLAN_SERIAL`，则可以避免串行编译器发现，而无需更改图形成员身份或完全回退。 Cold Linux 在四个可用 CPU 上重放编译器规划时间从 77-91 秒缩短至 17-21 秒；完整的物化器达到了14.8 GiB峰值RSS。当后端未设置时，上游首次尝试 `check-plan` 作业使用 16 类、`blacksmith` 或 `hybrid`，包括分叉 PR。叉型条纹也使用未设置或 `blacksmith` 后端的 16 级；它们的逻辑 GitHub 配置文件和仅恢复缓存策略保持不变。现有的混合运行状况准入、显式 GitHub 覆盖、重试和冻结路由仍然有效。将 `OPENCLAW_CI_TYPE_PLAN_SERIAL` 设置为 `true` 或 `1` 以恢复串行查询。

扩展包边界行有 40 分钟的作业预算，用于 SDK 准备、所有选定的插件编译、输入收据验证、所需的负金丝雀和清理。托管四次 CPU 运行仅在编译命令上花费了大约 19 分钟；其中一个完成了编译和金丝雀，但超出了之前 20 分钟的整个工作截止日期。托管的 `ubuntu-24.04` 的发布验证后来花了大约 6 分钟准备和 23 分钟编译 128 个插件，通过了两项检查，并在前 30 分钟截止日期被取消。可选的混合托管溢出在 Blacksmith 上保留此行：编译的收据存档包括特定于结帐的路径和链接，并且托管冷运行超过 22 分钟。显式托管覆盖、重试和信任回退仍然可用。其他职位保持现有的录取门槛；托管行总数仅计算实际卸载的行。编译器并发性、覆盖率和缓存防护保持不变。

插件 SDK API diff 行也有 30 分钟的作业预算。两次托管运行分别花费了 722 和 725 秒来渲染基础修订版，然后在渲染候选版本时达到了之前的 20 分钟截止日期。预算允许完整的修订渲染以及设置和清理。低于 8 个 CPU 或 24 GiB 内存时，渲染保持串行；较大的主机保留两个渲染工作人员。其他附加检查行保留 20 分钟。

Core lint 发现单独的源和 UI TypeScript 项目，保留共享的环境声明和导入的依赖项。源项目还包括`src/**/*.test-support.cjs`；不相关的 JavaScript 文件不会添加为根。请参阅 [ 本地检查 ](/ci/local-proof#local-equivalents)。

运行时拓扑检查继承现有的 [Go 内存默认值 ](/ci/local-proof#local-equivalents)，并保留调用者覆盖和完整的架构检查序列。

完整发布验证的 Docker 种子子项在未配置发布运行程序组时使用 16 级 Blacksmith 运行程序，准备现有的烟雾包，并保留串行加权通道准入。托管中断覆盖和重试会保留其恢复路线。普通手动调度保留托管串行执行。所有六个车道均保持选中状态。三个长的、未安装的托管测试行（`core-runtime-config`、`agentic-cli-process` 和 `agentic-control-plane-agent-chat`）的作业上限为 90 分钟，直到完整的计时观察结果允许发布规划人员将其拆分。目标 `update-restart-auth` 通道的预算为 62 分钟，作业上限为 75 分钟。当选择多个基线时，发布路径迁移矩阵将通道切换和每个发布的基线隔离在单独的运行器上；每个主机的加权资源限制和精确候选工件检查保持不变。 Package Acceptance 承认在扩展场景作业和订单之前，其独立的升级通道很长，并且将最新的基线队列固定在第一位，而无需更改其矩阵上限或场景覆盖范围。

Android 本机资源准备使用 Mermaid 渲染器的过滤依赖项安装，包括可选的构建工具。 Pnpm 保留根依赖但省略不相关的插件包； Gradle 仍然构建资产并运行选定的本机测试和 lint。历史目标保留其兼容性路径。

Android 电话测试在 Blacksmith 上使用最多四个独立的 JVM，并保留 [Gradle 拥有的缓存过期 ](/ci/runners#runner-backend-modes)。相同的四个正常行将手机测试与应用程序 lint 分开：Wear 拥有 Wear 测试和 lint 加上第三方应用程序 lint，而 Kotlin lint 拥有 Play/shared lint。上游铁匠推和 PR 第一次尝试，包括叉子，重叠所有四行； GitHub 覆盖、重试、手动调度、计划和其他存储库保留两个。所有测试和 lint 任务均保持选中状态。

macOS Swift CI 在单独的 [native 阶段 ](/ci/pipeline#macos-swift-phases) 中运行应用程序和独立包套件，保留每个测试和现有的并发限制。普通原生阶段保留30分钟预算；完整的非发布应用程序主机恢复证明有 75 分钟的时间来构建和暂存确切的运行时、练习重试并验证新进程重新启动。

本机测试构建保留覆盖范围和源代码行回溯，同时省略 IDE 索引和完整的调试器类型元数据。本地开发版本保留其正常的调试设置。

短期混合作业使用 [40-row 基本阈值和 45 行托管准入限制 ](/ci/capacity#bounded-hybrid-hosted-offload)，覆盖范围不变，并且当可选工作不适合时，铁匠回退。

其他混合检查卸载需要 [ 新鲜的托管分配证据 ](/ci/runners#hybrid-hosted-assignment-guard)。合格的 PR 可以移动依赖性、核心类型和拓扑检查；主推送还可以在同一托管行限制内移动 lint 和中心类型。 Artifact 构建保留了 Blacksmith，因为其测量的托管尾部没有为 [15- 分钟路由目标 ](/ci/routing-costs) 留下空间。

Windows 将其完整的显式测试清单保留在五个 [ 测量的项目对齐分片 ](/ci/runners#runner-backend-modes) 中，用于主要和发布验证。 Windows-owner PR 保留完整的家族；不相关的 PR 省略它。

Real-Gateway 浏览器检查使用与其所选运行程序 ](/ci/runners#blacksmith-runner-capacity) 匹配的 [ 作业预算。

Control UI、存储库 E2E 和本机实时浏览器 CI 恢复由所选目标的已安装 Playwright 软件包固定的 Chromium 修订版，具有单独的 OS/architecture 缓存键且没有回退前缀。 protected-main Vitest 缓存预热器在 Linux 后端的短依赖作业中发布浏览器缓存； PR 和发布作业仍仅恢复。缓存未命中仍会安装托管浏览器，并且当前目标使用安装程序的 `--require-playwright-chromium` 模式，而不是替换系统 Chrome。历史目标保留其 Playwright 安装程序和 Linux 依赖项设置。浏览器启动诊断包括提供程序、页面、WebSocket 和 Chromium 进程事件，以诊断会话就绪超时，即使仅在无关单元工作完成后才报告该超时。

当更改的路径触及其交互所有者、其样式或 `ui/vitest.config.ts` 中的子集时，第一个 `checks-ui` 分片还会运行策划的 WebKit 覆盖和作曲家焦点项目。清单拥有该选择。 WebKit 在现有的 UI 测试之后按顺序运行，具有相同的三人限制，并且没有额外的运行程序或矩阵行。没有更改路径的计划运行和冻结目标将忽略它。所选行安装固定的 Playwright WebKit 浏览器和 Linux 依赖项。使用 `OPENCLAW_UI_WEBKIT=1 pnpm --dir ui test --project=webkit --maxWorkers=3` 显式运行同一项目；普通UI测试运行仅保留Chromium-。 CDP- 依赖的模态媒体和可访问性树套件保留在 Chromium 上，直到其浏览器中立的替代品落地。

WebKit 项目要求每个选定的断言都通过，没有预期失败的例外。共享装置等待可用的覆盖内容，检查本机采用的样式表，并独立于 Safari 的指针焦点行为建立键盘遍历。

Linux 基线棘轮和本机 grep 测试重用现有的 `rg` 或将校验和固定的 ripgrep 15.2.0 版本直接下载到运行程序的临时目录中。安装程序不使用 apt、sudo、包索引刷新或包管理器锁。小档案下载具有有限的重试和传输超时；不支持的架构和校验和失败会导致作业失败。

浏览器扩展 CI 直接在 Node 和固定的 Bun 分支上启动已安装、修补的 Chrome MCP 依赖项。

构建、QA 和测试编排恢复相同的 [protected Node 编译缓存](/ci/scope-and-routing/node-test-lanes)。可信温暖器在收集测试导入之前填充构建工具，包括 Node 上相同的七个 Control UI 种子文件以及两个 Linux 缓存后端中固定的 Bun 分叉；普通 CI 仍然仅恢复。

进程内网关测试配置在现有打包作业 ](/ci/capacity#measured-shard-weights) 中使用 [ 独占计划准入。

更改所有者的 Node 行使用现有的 file/group 计时证据，具有 150 测试秒的准入目标和现有的 130 行 PR 上限。完整的文件、标准配置和工作人员策略保持不变；预测的测试秒数与测量的 CI 墙上时间分开。当选定的子集定价时，已知的不可分割文件成本仍然是一个下限；较旧的完整组测量无法限制这些成本。进程繁重的工作树和更新程序套件具有明确的案例成本权重，因此它们不会共享默认的每个文件估计的行。

对插件敏感的 PR 选择其所有者测试、传递导入消费者、受保护的回归和策略监视。现有的插件预发布工作流程每小时保留完整的扩展覆盖范围，并且在完整发布验证中；参见[节点测试通道](/ci/scope-and-routing/node-test-lanes)。

宽敞的串行铁匠 Node 作业使用 [ 测量的 Vitest 工人大小调整 ](/ci/capacity#vitest-worker-sizing)，具有现有的托管、冻结目标和重叠计划限制。

仅源 Linux Node 分片可以重用来自受保护的预热器的经过内容验证的编译工作线程； [ 固定准备成本](/ci/capacity#fixed-job-preparation) 与测试执行和运行能力保持独立。

执行文件路由使用 E2E 配置的更改目标分片在启动测试子项之前准备一次 private-QA 运行时，即使选择将这些文件映射到已注册的单元套件所有者也是如此。准备构建运行时 JavaScript 和资产，无需全局声明发射； AI封装测试单独准备其所需的声明。只有成功的准备步骤才能实现预构建的消费，因此孩子们可以重复使用其 JavaScript、资产和新鲜度邮票，而不是开始另一个完整的构建。

Vitest 转换缓存指纹排除生成的 `.ci-harness` 签出，因此 CI 消费者和受保护的温暖散列相同的源输入。 Node 字节码缓存对于普通 Vitest 运行保持启用状态； Vitest 拥有 [ 本地测试 ](/reference/test/local#core-commands) 中描述的工作人员级别覆盖保障。

转换键还包括每个项目的依赖优化器目录。当集中运行和完整运行共享持久缓存时，这可以防止缓存的 UI 导入混合单独项目的 Lit 实例。

Linux PR 测试使用 Bun 进行兼容单元通道和 Control UI Vitest 选择。经过审核的同步单元快速测试可以使用 Bun 的本机运行器；更改的测试或设置字节返回到 Vitest。完整版本验证保留完整的 Node 覆盖范围以及合格的 Bun 覆盖范围；参见[测试运行时选择](/ci/pipeline#test-runtime-selection)。两个运行时都按环境对未缓存、非隔离的 UI 文件进行批量分组，以减少工作线程重新启动，同时保留本机分片所有权和工作线程预算。 Bun UI 工作线程还使用 [ 基于分配的收集触发器](/ci/scope-and-routing/job-budgets) 来保留三个本机分片之间的内存空间。 Main 在 Node 上运行 UI，因此更改运行时所有者 （`scripts/lib/ci-test-runtime.mts`） 的 PR 会选择 Bun 上的三个现有 UI 单元分片；参见[范围选择](/ci/scope-and-routing/selection)。

冻结目标 CI 从固定的 `workflow_sha` 结帐加载其 Node 分片规划器、规划助手和测量成本。测试发现和执行仍然使用候选源，因此当前的分片预算不会替换发布字节。

npm/ClawHub 发布决策将正常的 CI 测试、插件预发布、跨 OS、性能和 QA 通道视为咨询记录证据。仍然需要 Artifact、install-smoke、survivor、所有第一跳兼容性、pack/npm 资格、包完整性和目标解析证明。聚合器遵循所需的输入；身份和来源验证仍然适用。

为了便于发布，密封清单提供了 SDK 证据摘要、每个包裹的 npm 决策以及任何批准的 `OPENCLAW_RELEASE_STABLE_SOAK_WAIVER` 文本。显式发布者输入会覆盖这些默认值；历史舱单保留其现有的输入合同。 SDK API 更改仍需要操作员提供的确认，并且密封豁免仅在存储库变量仍保留相同文本时适用。发布者仍然在突变边界验证实时权限、工件字节和注册表状态。

不稳定的测试永远不会阻止 npm/ClawHub 发布：记录咨询失败并调查其所有者，而无需等待绿色重新运行。仅通过重播并不能证明解决问题。所需的工件、安装、更新、目标和来源证明仍然有效。原生应用发布与npm/ClawHub、GitHub最终确定和主要收尾完全解耦；分别报告每个平台的准备情况。大约 20 分钟的验证和 1 小时的发布目标需要托管时间证据才能声明。

发布结束刷新了 `node --import ./scripts/tsx.mjs scripts/ci-shard-timings-refresh.mts --run <ci-child-run-id>` 托管的完整发布分片成本。生成器在现有 `config/ci-test-timings.json` 商店中记录成功的托管作业墙，包括设置。释放钥匙与紧凑型 CI 跨度分开，并能承受日常改装。托管的完整规划器在文件捆绑后 12 分钟以上分割测量的行，保留准确的覆盖范围和工作人员设置。完全分裂的世代使后续计划无法重新组合昂贵的工作。添加或删除文件时，代理支持、CLI-process、网关聊天、网关方法和运行时配置所有者保留其完整的托管成本，直到完整的观察涵盖新清单。部分世代永远不会提供该楼层。他们的完全验证行使用现有的 `-hosted-N` 拆分，而紧凑主路由和 PR 路由保留其现有策略。一项不可分割的超预算测试未能通过其所有者的计划；在达到 20 分钟目标之前，未测量的行仍然需要本地计时证据。

完整版本验证的精确目标 UI 作业保留两个运行时的当前三个本机分片。历史兼容性目标保留其原始的未分片包命令；请参阅 [UI 作业预算](/ci/scope-and-routing/job-budgets)。

设置存储库变量 `OPENCLAW_RELEASE_RUNNER_GROUP` 为完整发布验证及其工件、验证和可重用工作人员作业保留运行程序组。 Release Publish 父级及其分派的发布子级读取相同的变量。它选择组；它不会配置运行程序或增加并发限制。缺少组容量队列作业。共享工作流程从其发布调用方接收可选的 `runner_group`，包括来自发布发布的 `docker-release.yml` 和 `vercel-container-registry-publish.yml`； `docker-image-refresh.yml`、普通 CI、预定性能和不相关的可重用呼叫者保留其路由。批准和凭证发布作业（npm 可信发布、ClawHub、Docker 和 GitHub 应用程序支持的发布调度）保留其默认 GitHub- 托管标签，并且仅当发布发布调度它时，每小时插件 npm 预览路由。跑步者数量、矩阵上限和默认标签不会更改。

要在普通 PR/main 池之外预留容量：

1. 创建一个组织运行程序组，其中包含标记为 `ubuntu-latest`/`ubuntu-24.04` 的 Linux 运行程序以及验证使用的 Windows/macOS 标签。
2. 授予 `openclaw/openclaw` 对组的访问权限。
3. 设置`OPENCLAW_RELEASE_RUNNER_GROUP`为组名；取消设置以释放保留并恢复普通路由。

设置 `semantic-checks: true` 的作业的 Linux 运行程序还需要：

- systemd 为 PID 1 和活动的 `systemd-logind` 服务。
- 非交互式 sudo 访问权限，用于检查登录、为运行者用户启用 linger，并启动该用户的 systemd 管理器。
- cgroup v2，具有内存和交换会计功能，委托给用户管理器。

这些要求适用于自定义发布组以及普通跑步者。共享设置操作启动用户管理器，并在检查运行之前验证真实的 64 MiB 作用域（禁用交换并终止组 OOM）。不受支持的运行器无法设置；在分配验证标签之前配置这些功能，或者取消设置发布组覆盖以恢复普通路由。设置使后端合格；它本身并不限制以后的 lint 或编译器命令。

完整发布验证在准入和重用选择后与工件生产者一起启动仅源子项。候选人消费者一经验证就开始，同时 npm 资格和独立验证可以继续；参见[发布流程](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md)。

发布派发的验证子项每个添加一项尽力而为的托管收据作业，每个完整活动最多可添加七项，而普通 PR/main CI 则不会添加一项。它保留作业结果，独立于父级的完成情况。使用 `reuse_evidence=true`，每个调度都会检查其确切目标和输入（包括候选字节）的先前收据，并仅采用经过验证的成功子级。其他角色依然派遣。失败的、被取消的、积极的父母可以提供绿色的孩子；当前的父级密封并重新验证每个不可变的选择。发现没有增加任何工作或铁匠注册，并且会在错过时退回到新工作。

自动回复回复测试与每个紧凑组的两个工作人员并行运行文件。他们的规划器使用单独的并行计时标识；在进行测量之前，串行组成本除以有效工作人员数量，单文件组保留其全部成本。

Gateway isolated/database-worker 队列保留了两名工人的预算，包括宽敞的串行铁匠和混合工作，以便在现有的测试期限内为冷启动留出空间。其他分组保留其现有的上限。

命令测试在独立文件之间共享现有的工作人员预算。医生会话 SQLite 病例按手术分割，同时保留完整的修复和恢复覆盖范围；请参阅 [ 分片权重 ](/ci/capacity#measured-shard-weights)。

完整的 [startup 语料库 ](/ci/pipeline) 使用八个状态测试文件，因此现有工作人员可以共享其 release/config 矩阵。它的显式回退会准备一次运行时，并使用最多四个工作线程，并以可用的 CPU 并行度为上限；历史冻结目标通过 CPU-bounded 准入保留其遗留流程布局。

| 页面                                                           | 读它的时候                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [CI 管道作业](/ci/pipeline)                               | 作业表、作业排序和故障报告以及 Control UI 大小预算。                                 |
| [观看 CI 运行](/ci/watching-runs)                            | 等待一个拉取请求头，恢复卡住的运行，并通过证据门。                                     |
| [CI 结帐所有权](/ci/checkout)                          | 共享结帐锚点、获取重试预算和可信操作策略。                                            |
| [CI 范围和路由](/ci/scope-and-routing)                  | 为什么作业运行或未运行：范围更改检测和手动调度。                                          |
| [CI 跑步者班](/ci/runners)                               | 基于信任的跑步者路线、飞行前和棘轮准入、铁匠课程和跑步者后端模式。          |
| [CI 容量和分片权重](/ci/capacity)                  | 运行器注册、有界 PR 并发性以及测量的分片打包。                                            |
| [发布验证工作流程](/ci/release-validation)         | 完整版本验证、实时和 E2E 分片、包验收、安装烟雾、Docker E2E 和插件预发布。 |
| [计划和维护工作流程](/ci/scheduled-workflows) | OpenClaw 性能、QA 实验室、CodeQL、维护作业和 ClawSweeper 活动转发。                    |
| [本地检查和Testbox](/ci/local-proof)                    | 在本地复制一条通道，保留仅收缩棘轮，并运行 Crabbox 或 Testbox 证明。                          |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/ci#pipeline-overview`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="pipeline-overview" />[管道概述](/ci/pipeline#pipeline-overview)
- <a id="fail-fast-order" />[作业排序和故障报告](/ci/pipeline#fail-fast-order)
- <a id="control-ui-size-budgets" />[控制UI尺寸预算](/ci/pipeline#control-ui-size-budgets)
- <a id="watching-pull-request-ci" />[观看拉取请求 CI](/ci/watching-runs#watching-pull-request-ci)
- <a id="recover-an-existing-pr-run-first" />[恢复现有 PR 首先运行](/ci/watching-runs#recover-an-existing-pr-run-first)
- <a id="pr-context-and-evidence" />[PR 背景和证据](/ci/watching-runs#pr-context-and-evidence)
- <a id="checkout-ownership" />[结帐所有权](/ci/checkout#checkout-ownership)
- <a id="scope-and-routing" />[范围和路由](/ci/scope-and-routing#scope-and-routing)
- <a id="measured-shard-weights" />[测量的碎片权重](/ci/capacity#measured-shard-weights)
- <a id="clawsweeper-activity-forwarding" />[爪扫地活动转发](/ci/scheduled-workflows#clawsweeper-activity-forwarding)
- <a id="manual-dispatches" />[手动调度](/ci/scope-and-routing#manual-dispatches)
- <a id="windows-testbox-probe" />[Windows 测试盒 Check](/ci/scope-and-routing#windows-testbox-probe)
- <a id="runners" />[跑步者](/ci/runners#runners)
- <a id="blacksmith-runner-capacity" />[铁匠转轮能力](/ci/runners#blacksmith-runner-capacity)
- <a id="runner-backend-modes" />[Runner后端模式](/ci/runners#runner-backend-modes)
- <a id="runner-registration-budget" />[跑步者报名预算](/ci/capacity#runner-registration-budget)
- <a id="surface-ratchets" />[表面棘轮](/ci/local-proof#surface-ratchets)
- <a id="local-equivalents" />[本地等效项](/ci/local-proof#local-equivalents)
- <a id="openclaw-performance" />[OpenClaw Performance](/ci/scheduled-workflows#openclaw-performance)
- <a id="vitest-paired-benchmark" />[Vitest配对基准](/ci/scheduled-workflows#vitest-paired-benchmark)
- <a id="full-release-validation" />[完整版本Validation](/ci/release-validation#full-release-validation)
- <a id="live-and-e2e-shards" />[Live 和 E2E 分片](/ci/release-validation#live-and-e2e-shards)
- <a id="package-acceptance" />[封装 Acceptance](/ci/release-validation#package-acceptance)
- <a id="jobs" />[工作](/ci/release-validation#jobs)
- <a id="candidate-sources" />[候选来源](/ci/release-validation#candidate-sources)
- <a id="suite-profiles" />[套件简介](/ci/release-validation#suite-profiles)
- <a id="legacy-compatibility-windows" />[旧版兼容性 Windows](/ci/release-validation#legacy-compatibility-windows)
- <a id="examples" />[示例](/ci/release-validation#examples)
- <a id="install-smoke" />[装烟](/ci/release-validation#install-smoke)
- <a id="local-docker-e2e" />[本地 Docker E2E](/ci/release-validation#local-docker-e2e)
- <a id="tunables" />[可调参数](/ci/release-validation#tunables)
- <a id="reusable-livee2e-workflow" />[可重复使用 live/E2E 工作流程](/ci/release-validation#reusable-live/e2e-workflow)
- <a id="release-path-chunks" />[发布路径块](/ci/release-validation#release-path-chunks)
- <a id="plugin-prerelease" />[插件 Prerelease](/ci/release-validation#plugin-prerelease)
- <a id="qa-lab" />[QA Lab](/ci/scheduled-workflows#qa-lab)
- <a id="codeql" />[代码QL](/ci/scheduled-workflows#codeql)
- <a id="security-categories" />[安全类别](/ci/scheduled-workflows#security-categories)
- <a id="platform-specific-security-shards" />[平台特定安全分片](/ci/scheduled-workflows#platform-specific-security-shards)
- <a id="critical-quality-categories" />[关键质量类别](/ci/scheduled-workflows#critical-quality-categories)
- <a id="maintenance-workflows" />[维护工作流程](/ci/scheduled-workflows#maintenance-workflows)
- <a id="dependency-audit" />[依赖项 Audit](/ci/scheduled-workflows#dependency-audit)
- <a id="docs-agent" />[文档 Agent](/ci/scheduled-workflows#docs-agent)
- <a id="duplicate-prs-after-merge" />[Merge](/ci/scheduled-workflows#duplicate-prs-after-merge) 之后的重复 PR
- <a id="local-check-gates-and-changed-routing" />[本地检查门和更改路线](/ci/local-proof#local-check-gates-and-changed-routing)
- <a id="config-baseline-count-ratchet" />[配置基线计数棘轮](/ci/local-proof#config-baseline-count-ratchet)
- <a id="testbox-validation" />[测试箱验证](/ci/local-proof#testbox-validation)

## <a id="related"></a> 相关内容

- [测试](/reference/test)
- [脚本](/help/scripts)
- [成熟度记分卡](/maturity/scorecard)
- [安装概览](/install)
- [发布渠道](/install/development-channels)

普通 PR iOS Smoke 保留应用程序和测试包编译，同时由源所有者选择其两个模拟器组。如果没有选择任何组，则将跳过模拟器准备。 `OPENCLAW_CI_IOS_SIMULATOR_FULL=true` 恢复 PR 的完整执行； [选择和路由](/ci/scope-and-routing/selection)记录了所有者和完整的hourly/release覆盖范围。
