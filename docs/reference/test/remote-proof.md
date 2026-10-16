---
summary: "当代理使用 Crabbox 或 Testbox 以及包装器、租赁和信任规则时"
title: "远程测试证明"
read_when:
  - "您正在本地证明和远程证明之间做出选择"
  - "您正在 Crabbox 或 Testbox 上运行 OpenClaw 测试"
---

<a id="agent-default" />

## <a id="remote-proof-policy-for-agents"></a> 智能体远程证明政策

使用规范的[proof策略](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)来选择合格的证明路由。首选可用主机上的有界本地证明；昂贵的检查和繁忙或不合格的本地主机可以使用远程证明。切勿在本地执行不受信任的存储库工具；使用秘密叉子 CI 或直接消毒的 AWS，切勿使用凭证水合 Testbox。

仅当命令准备好时才获取；重用任务拥有的租约并在切换之前停止它们。在同步或重用租约之前完成命令和清理。

测试盒 `run` 和 `warmup` 使用 `main` 的工作流程，因此新分配继承维护的支出限制。包装器会覆盖配置的工作流引用并拒绝除 `main` 之外的显式 `--blacksmith-ref`。在本地结帐中选择源版本；它的源胶囊和冻结依赖项安装独立于工作流引用保留该选择。明确的工作流程和工作选择支持明确的重点、常规和高内存配置文件。默认保持 16 级，直到真正的小型机器资格通过； `--class` 和 `--type` 大小均未委托 Testbox 租赁。

| 工作量                                     | 工作流                           | 跑步者等级 | 默认作业截止日期 | 最大明确期限 |
| -------------------------------------------- | ---------------------------------- | ----------- | -------------------- | ------------------------- |
| 集中测试和缩小范围检查              | `ci-check-focused-testbox.yml`     | 4级     | 60分钟           | 60分钟                |
| 有界例程证明                        | `ci-check-routine-testbox.yml`     | 8级     | 60分钟           | 120分钟               |
| 广泛的 compiler/lint 图表（当前默认） | `ci-check-testbox.yml`             | 16级    | 60分钟           | 240分钟               |
| 实测内存密集证明                  | `ci-check-high-memory-testbox.yml` | 32级    | 240分钟          | 240分钟               |

截止日期包括补水。较大的最大值需要显式工作流程 `timeout_minutes` 输入； Crabbox 不会转发该输入，并且 `--ttl` 不会扩展 Testbox 作业。跑步者类别需要标签；在选择工作负载之前验证实际的 CPU 和 RAM。请参阅 [ 观察到的流道容量 ](/ci/runners#blacksmith-runner-capacity)。

选择新租约 `--blacksmith-workflow .github/workflows/<workflow> --blacksmith-job check`。小配置文件是选择加入的资格候选者，不能证明任意编译器或 lint 图都适合。在提升工作负载之前捕获实际的 CPU 亲和力、cgroup 限制、峰值内存、OOM 事件、水合作用和有效负载时间；仅跑步者标签无法建立可用的 RAM。所有配置文件都保留相同的 32 槽并发命名空间；内存密集型证明仍然共享其中四个插槽。即使另一个槽空闲，哈希冲突也会排队。仅停止任务拥有的排队分配；不要用更大的盒子来补偿或在本地强制进行昂贵的工作。

在分配时，包装器在 `.crabbox/testbox-leases/` 下记录调用者任务、物理签出、HEAD、基础、依赖项输入和测试盒准备指纹。重用需要相同的任务、签出、基础、依赖项、准备和工作流程输入，包括在委派之前。仅源代码编辑和提交可以重用准备好的框。分配收据保持不变，而每个命令记录其当前源修订并同步结帐。准备期间的源代码编辑是尽最大努力；在开始校样之前完成编辑，或从预期候选位置重新运行。该源刷新合约属于OpenClaw包装器的可信任务路径；它不允许原始本地调用者或不受信任的证据在各个修订版中重用租约。较旧或丢失的收据需要停止拥有的租赁并通过包装器分配新的收据。 `OPENCLAW_TESTBOX_ALLOW_STALE` 无法绕过这些检查。所有提供商都需要 Crabbox 0.77.0 或更高版本。

对于直接和协调员管理的租赁，TTL 是自创建以来的总生命周期，包括水合作用；空闲超时是不活动窗口，截止日期较早者获胜。 Crabbox 默认为 30 分钟，最长为 4 小时；协调器所有者或组织覆盖和受信任的直接提供商配置最多可以允许 24 小时。阅读有效的政策和限制通知，而不是假设所请求的期限已获得批准。 `--keep` 跳过正常命令清理，但不会防止过期。普通心跳和手动桌面使用不会延长总TTL； `run` 仅在命令执行时请求有界自动扩展。创建固定的提供者在分配时需要足够的 TTL。延期拒绝和预算耗尽并不授权其他提供商或无限的租赁链。

Crabbox可信配置拥有`directLeases: deny`及其`directLeaseAllow`例外；被拒绝时，使用其配置的协调器路由而不是直接凭据。协调员支持的 `crabbox list` 默认显示实时租约； `--retained` 添加未确认清理的保留终端资源。保留确切的租约 ID 和本地恢复状态，直到阻止 `crabbox stop --provider <provider> --id <lease> --wait` 确认清理为止。成功的工作负载或丢失的实时列表行并不能保证清理。

Testbox 工作流程注册一个单独的一次性签出以进行本机同步。水合执行工作区保留在其原始绝对路径，因此本机 Git 清理和 rsync 无法删除依赖项、构建输出或忽略那里的运行时。包装器应用并验证该执行工作区中的源包，运行其冻结的依赖项安装，并在有效负载之前再次检查源和 Git 身份。安装输出转到 stderr；安装或验证失败会停止有效负载。它永远不会从调用者恢复运行时或更改选定的 rsync 二进制文件。

工作空间准备变更需要新的租约。执行工作区绑定丢失或重叠会停止有效负载；停止租约并取暖新租约。使用 OpenClaw 包装器进行证明：直接的原生 Blacksmith 命令针对传输结账，故意没有水合运行时。

带有 `--artifact-glob` 或 `--require-artifact` 的测试盒请求从准备好的执行工作区收集。跨有效负载目录更改和正常故障退出，集合保持锚定在那里；现有的取消和信号相关伪影保留保持不变。

包装器使用捆绑的 Crabbox 插件在提供程序发现、源同步或租赁工作之前更新丢失或过时的 CLI 二进制文件。每个命令均使用当前支持的CLI合约；对于工件、提供程序或 `sync-plan --json` 没有单独的版本要求。

Testbox 运行，POSIX 远程更改门将源代码冻结到固定基础上的 Git 包中。选择使用 Crabbox 的同步策略和 Git 的存储库、信息和有效的全局排除（包括存储库本地覆盖）来处理未跟踪的文件。跟踪的忽略文件和分阶段忽略的添加内容仍然是源代码；与所需跟踪源相冲突的显式隐私排除会在上传之前停止运行。

该命令绑定捆绑包摘要和原始源树。在运行有效负载之前，接收者会应用删除并恢复文件字节、符号链接目标字节和 Git 可执行模式，然后直接验证文件系统。 Git 文本过滤器不会规范化此快照。丢失、陈旧或不匹配的捆绑包将被拒绝。生产者声明的删除也必须不存在，即使远程索引已丢失它们。删除使用与源选择相同的隐私政策；未知的被忽略的运行时数据被保留。意外的非忽略接收器文件会停止运行而不是被删除。验证收据报告原始源修订与合成传输提交分开；远程 `HEAD` 识别已验证的传输树，并将更改的门与固定的基础进行比较。原始字节差异可以保守地选择额外的更改路径。 Git 路径名必须为 UTF-8；符号链接目标仍然是原始字节。符号链接存储库 Crabbox 配置或忽略文件以及排除隐私的运行时配置在上传之前会被拒绝，而不是更改其信任或隐私处理。

即使源树未更改，合成传输提交也可能在包装器调用之间发生变化。在一次有效负载中构建并使用其新鲜度绑定到 Git `HEAD` 的工件，就像 CI 在一次签出中所做的那样。单独的调用可能会触发意外的重建。不要重写新鲜度标记来绕过此检查。

请参阅 [ 本地命令](/reference/test/local) 以获取重点开发证明。

对于不可信的证明，用 `--provider aws` 懒洋洋地温暖。每次运行都必须在安装依赖项或运行测试之前设置 `CRABBOX_ENV_ALLOW=CI`、传递 `--provider aws --no-hydrate` 并使用新的临时远程 `HOME`。使用专用于该不可信来源的新热租约；切勿重复使用受信任或之前已水合的租约。从干净的可信 `main` 签出启动已安装的可信 Crabbox 二进制文件，并仅使用 `--fresh-pr` 获取远程 PR；切勿在本地执行不受信任的结账包装或配置。取消设置 `CRABBOX_AWS_INSTANCE_PROFILE` 并拒绝运行，除非解析的 `aws.instanceProfile` 为空。在任何 install/test 之前，使用受信任的绝对路径工具来要求 IMDSv2 令牌，证明 IAM 凭证端点返回 404，并验证远程 `git rev-parse HEAD` 等于经过全面审查的 PR 头 SHA。当头部更改时，将租约绑定到 SHA 和 stop/rewarm。从干净的 `main` 与 `--fresh-pr` 一起上传可信的 `scripts/crabbox-untrusted-bootstrap.sh`；它安装固定的 Node/pnpm，验证 SHA 和包管理器引脚，隔离 `HOME`，安装依赖项，然后执行请求的测试。如果代理无法证明没有角色或不存在远程 PR，请使用无秘密分叉 CI。请勿使用 `hydrate-github`、`--no-sync` 或凭证混合的 Testbox 工作流程。取消设置所有 `CRABBOX_TAILSCALE*` 覆盖、强制 `--network public --tailscale=false`、清除退出 node/LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前报告没有 Tailscale 状态的公共网络。

## <a id="focused-android-proof"></a> 聚焦Android证明

当重点 Gradle 任务需要新的 Testbox 时，选择 Android 条目：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox \
  --blacksmith-workflow .github/workflows/ci-android-focused-testbox.yml \
  --blacksmith-job check --label android-proof -- \
  node scripts/run-android-gradle.mts --proof \
  :app:testPlayDebugUnitTest --tests ai.openclaw.app.AndroidLicenseNoticesTest
```

Android 条目和现有的 shell 准备操作准备与 Android CI 相同的固定 Java/SDK 以及冻结的本机生成依赖项。 Android 参赛作品使用现有的重点跑步者预算；普通的专注测试盒不安装Android。 SDK 发现和 Gradle Java 属性在非登录 SSH shell 以及水合作用中工作。

`--proof` 在启动 Gradle 之前验证先决条件。不可用的先决条件会产生一个可操作的诊断和一个非零结果，明确记录没有执行任何测试。普通 Gradle 调用保持不变。 Gradle 启动后，build/generation 失败仍然不计为已执行的测试；使用所选任务的测试 XML 报告来确定执行情况和结果。 Linux ARM 无法使用 Google 的 x86_64 AAPT2 工件提供此证明。

## <a id="testbox-runner-sizing"></a> Testbox 流道尺寸

使用默认的 16 级工作流程进行例行远程校样，总作业截止时间为 60 分钟（包括水合）。保持 32 级稀有：记录命令及其测量的内存需求、较小的运行程序 OOM，或在选择之前进行显示较低总计费成本的受控比较。现有的内存密集型全套 Testbox PR 门使用此例外。一般故障、队列延迟或超时不是调整大小的信号。保持基于资源的工人限制；不要在较小的机器上强制更高的并行性。

使用新租约显式选择例外：

```bash
node scripts/crabbox-wrapper.mjs run \
  --blacksmith-workflow .github/workflows/ci-check-high-memory-testbox.yml \
  --blacksmith-job check --idle-timeout 15m \
  --label <task-and-memory-reason> --timing-json -- <command>
```

高内存配置文件最多使用共享 32 个 Testbox 并发插槽中的四个。两种配置文件的空闲时间上限均为 15 分钟。常规打样默认60分钟；显式高内存工作流程保留了已知重门的四小时期限。标准工作流程接受长达 240 分钟的显式 `timeout_minutes` 输入，但 Crabbox 不会转发任意工作流程输入，并且 `--ttl` 不会扩展 Testbox 作业。不要仅仅为了获得更多时间而选择较大的跑步者。直接提供者 `--class` 和 `--type` 标志不会调整测试盒的大小；工作流程选择拥有运行者。配置文件更改需要新的租约。有关队列行为，请参阅 [runner 限制](/ci/runners#testbox-spending-limits)。

## <a id="crabbox-repository-setup"></a> Crabbox 存储库设置

[Crabbox 技能](https://github.com/openclaw/openclaw/blob/main/.agents/skills/crabbox/SKILL.md) 拥有便携式租赁、信任、同步和清理程序。此部分拥有 OpenClaw 包装器和工作流输入。常规任务所需的 Crabbox/Testbox 使用和任务拥有的工作树不需要再次确认；保留不相关的工作以及现有的证书、制作、预算和出版边界。

通过包装器从存储库根运行受信任的 OpenClaw 远程证明：

```bash
node scripts/crabbox-wrapper.mjs run --help
```

在运行之前读取 `.crabbox.yaml` 和已解析的提供程序。存储库默认为 `blacksmith-testbox`，`.github/workflows/ci-check-testbox.yml` 拥有其准备好的环境。直接提供商使用 `.github/workflows/crabbox-hydrate.yml`。保留已解析的提供者，除非所请求的证明需要其他环境；能力或水合作用失败并不意味着不同的提供者是同等的。

当提供者准备就绪失败时，包装器会报告失败或丢失的医生检查名称以及有界的、经过清理的消息和分类提示。成功的检查和其他提供者详细信息被省略；计数可识别超出摘要限制的其他故障。错误保留医生退出状态和恢复说明，包括经纪人身份验证失败的登录指导。在共享之前使用 `crabbox doctor --provider <provider> --json` 在本地检查完整报告。

直接 `.github/workflows/windows-blacksmith-testbox.yml` 工作流程运行本机 Windows。包装器的 Blacksmith 适配器仅支持 Linux；显式 `--provider blacksmith-testbox` 会阻止自动 Azure 路由，但不会启用 Windows 支持。根据 2026 年 9 月 1 日的检查，Blacksmith CLI 0.4.57 的目标是 `runner`，并且没有本机用户名覆盖，因此此 Windows 映像上支持的 CLI sync/run 仍然被阻止。在依赖此之前，请重新检查较新的 CLI。使用每个测试盒密钥进行的本机 SSH 检查不是 CLI 端到端证明。

包装器检查可执行同级 `../crabbox/bin/crabbox`，然后检查 `PATH`，然后检查 Git 公共签出的同级。验证所选的二进制文件及其来源，而不是信任目录名称。当所选可执行文件丢失或过时时，该插件会安装经过验证的托管副本。对于显式的 [Crabbox](https://github.com/openclaw/crabbox) 源修复，请在干净的任务拥有的签出中构建 `./cmd/crabbox` 并保持操作员的安装不变。现有的 `OPENCLAW_CRABBOX_WRAPPER_IGNORE_REPO_BINARY=1` 设置会跳过第一个同级候选； `PATH` 上的任务二进制文件优先于公共结账候选者。肮脏或忙碌的兄弟姐妹并不是停下来询问的理由。

Mantis 使用相同的插件拥有的发现和托管安装。相对可执行文件覆盖和 `PATH` 条目从其请求的 `--repo-root` 解析，并且版本检查在与租用命令相同的环境下运行。其工作流程使用 `node scripts/crabbox-setup.mjs` 准备可执行文件；该命令将选定的二进制文件和经过验证的版本打印为 JSON，并在 GitHub 操作中将其目录添加到 `GITHUB_PATH`。稍后 QA 和媒体命令重用该可执行文件。

对于选定的受信任 Testbox 通道：

```bash
node scripts/crabbox-wrapper.mjs run --timing-json -- \
  CI=1 NODE_OPTIONS=--max-old-space-size=4096 \
  OPENCLAW_VITEST_MAX_WORKERS=1 \
  OPENCLAW_TESTBOX=1 OPENCLAW_TESTBOX_REMOTE_RUN=1 \
  pnpm test <path-or-filter>
```

对于多个命令，使用唯一的任务标签并保留第一个分配：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --keep --label <task-name> -- <first-command>
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --id <tbx_id> --label <task-name> -- <next-command>
node scripts/crabbox-wrapper.mjs stop --provider blacksmith-testbox <tbx_id>
```

在整个任务中使用返回的租约 ID 和相同的标签。 Codex、Claude Code 和 GitHub 操作还将重用绑定到其会话或运行身份。会话拥有的`warmup --timing-json`可以不带标签进行分配； human shell 使用上面标记为 `run --keep` 的流程。止损没有`--timing-json`。

- 任务结帐的温暖。索赔属于结帐路径； `--reclaim` 故意转移该所有权并且从不更改存储库身份。临时源运行后，包装器将保留的 Blacksmith 和 AWS 租赁声明恢复到调用结账。转移到其他地方的索赔不会受到影响。当另一个命令拥有租约时，请勿同步或回收。
- Wrapper 重用需要 Crabbox 创建的本地 SSH 密钥。钥匙丢失需要重新热身。由 Blacksmith 直接创建的租约仍然可以通过 `blacksmith testbox run --id <tbx_id>` 使用，而不是 Crabbox 包装器重用。
- 每个本机测试箱运行都会再次同步，包括重用的租约。 `--no-sync` 无法保留远程基线。在一个同步命令中比较单独远程工作树中的修订；切勿在同步根目录中切换引用。
- 复合远程shell命令使用`bash -lc`，而不是`sh -lc`；水合作用取决于 Bash 声明。 Testbox 的工作流程拥有 Chromium，因此不要将 Crabbox `--browser` 传递给该提供商。
- 保留上述租赁指纹检查。发布证明没有过时的租约覆盖。直接提供者标志（例如 `--fresh-pr`、`--full-resync`、`--script*`、`--env-helper`、capture/download 标志和 `--stop-after`）不能替代委托的 Testbox 工作流程。
- 对于 Testbox 脚本，运行同步文件作为尾随命令参数或使用 `--shell`。在源准备或租赁工作之前，活动的 `--script` 和 `--script-stdin` 上传将被拒绝。

Blacksmith 源胶囊在配置的同步根下为每个物理源工作树保留一个私有镜像。稍后再次运行枚举源资格，比较文件标识、大小、时间戳、模式和种类，并复制和散列更改的文件。未更改的源保留在适当的位置，并带有温暖的 Git 索引统计数据。 Git 的分阶段跟踪和最终的原始传输树使用单独的索引，保留相同的忽略文件和未跟踪文件选择规则。包装器报告复制和重用的文件计数以及准备时间。提交相同的保留源引用，保持镜像可重用；每个命令都会记录其捕获的源见证。

镜像在整个命令期间保持独占锁定状态，包括文物保存和租赁索赔恢复。来自同一工作树的重叠运行会打印一条消息并构建一个独立的新鲜胶囊。只有完成的清理才会记录一个空闲的镜像以供重用；失踪的证人、不受支持的暂存地点或未解决的所有者使用新的暂存。避免在冻结期间编辑源代码；胶囊使用其捕获的选择和字节，而无需最终的源重新扫描。缓存元数据、有效负载、见证存储库或引用，或 Git 版本不匹配，在上传前进行冷重建。源枚举和元数据检查仍然随存储库扩展；源字节复制和散列可在热运行时更改文件。私有镜像禁用 Git hooks 和 fsmonitor；源枚举还会在镜像模式下禁用 fsmonitor。其他活动的 Git 回调保留准备保留，并且无法创建可重用的缓存。普通新鲜胶囊的行为没有改变。

不同的工作树共享一个短分配锁。繁忙的分配器打印 `[crabbox] waiting for source mirror allocation...` 并等待最多 120 秒，然后再返回到新的胶囊。每镜像验证、冷准备和驱逐的有效负载删除在槽锁下运行，无需保留分配。

同步根最多允许 32 个镜像槽位。分配驱逐最近最少使用的空闲镜像；活动、所有权损坏或中断的插槽仍受保护并计入限制。如果没有可以安全回收的槽位，则运行将使用普通的新鲜暂存。 `staging inspect` 识别空闲镜像，`staging recover <id>` 可以删除其独占锁下的镜像。自动废弃分段恢复使空闲镜像可供重复使用。中断的命令保留现有的见证、声明和诊断恢复要求。逐出记录删除字节之前的处置，并保留其槽位直到删除完成。如果中断，`staging inspect` 将记录的处置报告为恢复候选；自动恢复或`staging recover <id>`获取独占槽位锁后即可恢复。替换的目录和未知元数据仍然受到保护。并发分配器在删除后重新检查容量；被处置的插槽仍计入 32 个插槽的限制。单独的处置收据在最终目录和锁定删除后仍然存在，因此即使在有效负载收据消失后，恢复也可以完成中断的命名空间清理。恢复会保留已记录的处置而不是重写它。其生产者已删除有效负载的插槽也会收到清理记录；该记录要求有效负载根不存在，并且从不授权删除替换根。两种形式都会阻止槽重用，直到清理完成。达到 256 MiB 的私有 Git 对象会在下次重用时触发冷重建，限制保留的对象历史记录，而无需修剪已保存索引后面的对象。

当远程同步使用隔离签出时，包装器会在删除该签出或将其镜像返回到空闲缓存之前，将本机 `.crabbox/runs` 和 `.crabbox/captures` 输出一起保留在新的 `.crabbox/wrapper-artifacts/run-*` 目录下。已验证的本机输出将从空闲镜像中删除，因此以后的运行仅保留其自己的诊断。其他本机`.crabbox`状态采用普通全检处理后神器保存；下一次运行将构建一个冷镜。当进程退出时，镜像锁会自动释放，但未解决的已承认消费者仍然需要现有的分段恢复检查，然后才能删除其快照。即使本机文件名匹配，重复运行也会保留单独的证据。包装器打印旧到新的根映射；本机日志和生成的证据可能仍引用旧路径。保存错误会使包装器失败，并在报告的路径上保留临时签出以进行手动恢复，从而保留子项的非零退出代码。包装器拒绝工件树和目标父级中的符号链接，并仅复制常规文件和真实目录。在 POSIX 系统上，保留文件使用模式 `0600`，新目录使用 `0700`。如果保存失败，请在删除之前从报告的签出中恢复输出。已识别的未更改的部分副本被删除；无法验证的部分目标将被保留并与原始输出一起报告。

在正常完成或受支持的 POSIX 中断时，包装器会在恢复保留的租约所有权、保留工件和删除一次性源之前解决其子进程树和输出流。允许包装器在 Ctrl-C 之后完成；额外的信号重用该关闭及其有限的升级。包管理器代理可以在包装器完成之前返回其中断状态。仅该状态或远程租约完成并不能确定本地清理已完成。

报告清理错误，并使原本成功的调用失败；保留现有的非零命令或取消状态。如果无法验证子终止，包装器将保留其本地输入并报告需要恢复。保留租赁所有权恢复失败也会保留结帐；将租约恢复到原始存储库或在删除签出之前停止它。在恢复工件或删除其临时输入之前，停止所有剩余的拥有的进程。

仅当可证明暂存位于源存储库之外时，包装器才会使用有效负载旁边的私有恢复元数据记录未来的临时签出。默认的 `~/.cache/openclaw/crabbox-sync` 位置通常满足此条件。配置的存储库本地根目录（包括 `.artifacts/` 等被忽略的目录）将继续通过普通的未标记暂存和清理工作。他们不会收到恢复收据或清单，并且在突然丢失后仍然受到保护。不确定的放置也使用兼容的未标记路径。

更改配置的根或忽略规则不会在存储库中创建新的恢复元数据。另一个根的现有副本不会被移动或采用；选择该根来检查它们。此功能不会过滤现有用户数据、更广泛的源范围或显式原始工作区安装。使用以下方法检查录制的副本：

```bash
node scripts/crabbox-wrapper.mjs staging inspect
node scripts/crabbox-wrapper.mjs staging recover <id>
```

这些本地命令使用现有的 Crabbox 二进制文件，无需安装它、启动提供程序、更改声明或停止租约。恢复检查原始本机声明命名空间，根据独立保留的 Git 引用验证记录的快照，并在删除未更改的暂存之前验证保存的诊断。仍命名暂存的声明要求操作员停止确切的租约或明确从真实存储库中回收它，然后重试。更改 `HOME` 或 `XDG_STATE_HOME` 无法在旧命名空间中建立缺失。

一个没有被允许的消费者的准备好的胶囊可以在它的主人消失后被找回。承认的消费者需要持久的作者结算收据。可能启动准备帮助程序或其他本地 Git 种子准备的 Git 配置仍会保留，因为父命令完成不会验证这些帮助程序。他们的正常执行没有改变。早期的实验收据版本也仍然受到保护。修复目标问题后，显式恢复可以重试挂起的诊断保留。自动恢复会保留工件或声明失败。保存的输出丢失或更改会导致删除；恢复永远不会重新创建消失的原始存储库来创建保存目标。

脏源需要另一个完整的保留副本。有意将该快照保留在独立的 Git 存储库中并命名为 ref 后，显式选择它：

```bash
node scripts/crabbox-wrapper.mjs staging recover <id> \
  --witness-repo /path/to/retained-repository --witness-ref refs/heads/saved-source
```

见证人验证证明所选参考对象存在且已连接。在 Git 2.50+ 上，它会跳过不相关的参考数据库检查，因此 `.git/refs` 下的 Finder `.DS_Store` 等杂散文件不会阻止恢复。显式 `staging recover` 通过见证对象存储扩展其工作预算：120 秒加上每个 GiB 30 秒，最多 30 分钟。包装器命令保持 120 秒界限后自动恢复。失败原因包括预算耗尽、参考数据库错误以及对象丢失或未连接。

恢复不会创建备份存储库、档案或永久引用。阶段自己的 Git 对象或包不算作另一个副本。实时或不确定的所有者、未记录的写入器结算、中断的恢复所有权、替换的元数据、其他主机或 PID 命名空间以及历史未标记的目录仍然受到保护。新的收据记录平台，稳定的主机身份，启动ID和PID命名空间。同一主机和 PID 命名空间上的不同启动证明旧生产者不存在；回收不会探测其潜在的回收 PID。相同启动恢复仍会检查 PID 是否存在。除非下面明确限定，否则丢失的主机来源和旧域不匹配仍然受到保护。闲置的镜子保留其单独的独占锁恢复合同。目录所有权记录包括解析的文件系统路径、inode、出生时间和 macOS 卷 UUID，因此重新启动后 APFS 设备编号更改不会使该身份无效。仅当目录早于其接收且现有路径和所有权检查通过时，旧 device/inode 记录才接受 macOS 仅设备更改。检查绝不会重写收据；成功的所有者更新会保留更强的身份，并保留剩余遗留证据的原始时间戳。更改的身份、未知的兄弟姐妹和不完整的元数据仍然受到保护。如果当前无法验证记录的卷 UUID，恢复也将保持受保护，直到 OS 卷查找成功。完整的工作树也仍然受到保护，因为钩子、过滤器和原始源需要单独的证明。如果确切的 Git 注册删除失败，他们的常规清理会保留剩余的暂存，包括注册符合条件时的收据。存储库本地副本保持未标记。没有全局工作树修剪或一揽子强制恢复选项。

对于该主机早期启动的一个遗留胶囊，首先检查资格：

```bash
node scripts/crabbox-wrapper.mjs staging inspect <id> --same-host-prior-boot
```

这是只读的：它不会创建锁、更新收据、保留输出或删除暂存。它返回 `eligible`、确切的 `receiptSha256` 以及任何拒绝。仅在检查该特定副本后，确认同一主机和先前启动：

```bash
node scripts/crabbox-wrapper.mjs staging recover <id> \
  --confirm-same-host-prior-boot --receipt-sha256 <digest-from-inspection>
```

确认需要预启动收据 mtime、记录时的不同旧域、当前 host/boot 证据以及匹配的 UUID- 支持的同步根和目录身份。 UUID- 不可用的文件系统无法使用此旧路径。在确认的重试中保留原始时间戳；每次重试仍然需要绑定到当前接收字节的新的显式确认。确认记录在收据和命令结果中，不会重复用作自动授权。它不会取代元数据完整性、结算、本地声明、独立来源或诊断保存检查。

恢复通过有限的 `lsof` 扫描检查本地用户，并拒绝实时用户、不完整的输出或不可用的检查。只有恢复进程的精确保存的镜像锁定文件才可以豁免。在等待工作后，恢复重新获取其独占锁并重新验证收据、身份和生产者缺席证据。 Per-ID `staging inspect <id>` 还预览普通恢复；空闲的镜子和已完成的处置记录保留其单独的槽锁定工作流程。

源传输命令在初始卷查找后使用 250 毫秒的软发现预算检查最多 64 个有界标头。此扫描不会散列有效负载、搜索 Git 历史记录或查询提供程序。临时光标推进后续扫描，越过受保护的条目； `staging inspect --after <nextCursor>` 还分页本地报告。成功正常完成后，包装器最多尝试一个发现的候选者。帮助、列表、版本输出和取消不会启动旧阶段恢复，并且恢复失败不会更改已完成命令的结果。检查报告不完整的扫描和经过的时间；批量验证是单独限制的，并且可能需要更长的时间。不支持的文件系统持久性（包括本机 Windows 目录刷新）可防止孤立恢复，同时保留正常操作。正常清理仍然会删除其自己的成功或脏源暂存，而不需要独立的恢复见证。

这些是当地的文物，未发布或经过完全消毒的证据。 Blacksmith 的本机故障包包含捕获的 stdout/stderr 和诊断元数据；它不会自动包含远程 UI 屏幕截图或报告。在停止拥有的 Testbox 之前单独检索这些内容，并在共享之前检查所有工件是否有秘密和私人数据。

本机 Windows Testbox 空闲监视器使用正在运行的 `sshd` 服务的本地侦听器端口，而不是 Blacksmith 的外部转发的 SSH 端口。已建立的 SSH 连接使作业保持活动状态； `~/.testbox-last-activity` 修改时间涵盖 30 秒轮询之间的短命令。一旦两者都没有指示最近的活动，配置的空闲超时仍然会结束作业。

共享技能的命令占位符映射到本指南中的重点命令。其可信引导程序为`scripts/crabbox-untrusted-bootstrap.sh`；上面的不受信任路径调用已安装的受信任 CLI，而不是 PR 的包装器。对于明确选择的本地容器通道，现有示例映像为 `node:24-bookworm`，安装命令为 `corepack pnpm install --frozen-lockfile --store-dir .pnpm-store`，然后是所选测试。当主机缓存无法跨文件系统时，保留 `--no-hydrate` 和存储库本地依赖项存储。 OpenClaw 经纪商登录端点为 `https://crabbox.openclaw.ai`；正常的代理验证不需要询问 AWS 密钥。

实时网关、通道和代理轮转证明使用隔离的 `OPENCLAW_STATE_DIR`、空闲端口和真实用户路径。仅测试插件工件可能使用 `OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1`；这并不会使它们成为正式安装。在共享 WebVNC 之前，请检查工作应用程序的屏幕截图。将证明媒体保留在产品存储库之外，并在生成器运行之前和之后比较源哈希。如果写入了最终计时结果但门户同步挂起，则仅中断任务包装器并独立验证租约清理；永远不要停止运营商的网关。
