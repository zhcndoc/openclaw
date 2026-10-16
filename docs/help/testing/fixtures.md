---
summary: "临时目录、模块模拟、数据库清理、观察者和技能评估装置"
title: "测试夹具配方"
read_when:
  - "您在测试中需要临时文件、模块模拟、数据库拆卸或技能观察程序"
  - "您正在构建技能可靠性评估"
---

将这些配方用于您要更换的灯具。遵循 [ 测试创作合同 ](/help/testing/writing-tests) 的行为和成本。

## <a id="test-temp-directories"></a> 测试临时目录

对于测试专用的临时目录，请使用 `test/helpers/temp-dir.ts` 中的共享辅助函数，以明确所有权，并确保清理工作在测试生命周期内完成：

```ts
import { afterEach } from "vitest";
import { useAutoCleanupTempDirTracker } from "../helpers/temp-dir.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

it("uses a temp workspace", () => {
  const workspace = tempDirs.make("openclaw-example-");
  // use workspace
});
```

`useAutoCleanupTempDirTracker(afterEach)` 有意不提供手动清理方法——Vitest 会在每个测试结束后负责清理。较旧的底层辅助函数（`makeTempDir`、`cleanupTempDirs`、`createTempDirTracker`）仍然存在，供尚未迁移的测试使用；请避免新增对它们的使用，也避免新增不带封装的 `fs.mkdtemp*` 调用，除非测试明确验证原始临时目录行为。当确实需要使用不带封装的临时目录时，请添加带有理由且可审计的允许注释：

```ts
// openclaw-temp-dir: allow verifies raw fs cleanup behavior
const workspace = fs.mkdtempSync(prefix);
```

`node scripts/report-test-temp-creations.mjs` 会报告新增差异行中的不带封装的临时目录创建和新增的手动共享辅助函数使用，但不会阻止现有的清理方式。它遵循与 `scripts/changed-lanes.mjs` 相同的测试路径分类方式，并跳过共享辅助函数本身。对于变更的测试路径，`check:changed` 会运行此报告，将其作为仅用于警告的 CI 信号（GitHub 警告注释，而非失败）。

使用 `test/helpers/close-on-exec-copy.ts` 中的 `copyTreeCloseOnExec` 复制其文件稍后直接执行的测试夹具树（`PATH` 上的存根、shebang 包装器、本机二进制文件），而不是没有 `filter` 的递归 `fs.cpSync`。在 Node 24 上，复制路径打开文件时无需关闭执行，因此由另一个 Vitest 线程在复制过程中分叉的子进程使文件保持可写状态，而后来的 `execve` 会失败并显示 `ETXTBSY`。

## <a id="agent-reliability-evals-(skills)"></a><a id="agent-reliability-evals-skills"></a> Agent 可靠性评估（技能）

我们已经有一些 CI-safe 测试，其行为类似于“代理可靠性评估”：

- Agent 准入、运行 ID 响应以及通过模拟 OpenAI 提供程序 （`src/gateway/gateway.test.ts`） 的真实网关中止请求。
- 端到端向导流程，用于验证会话接线和配置效果（`src/gateway/gateway.test.ts`）。

目前在技能方面仍缺少的内容（见 [Skills](/tools/skills)）：

- **决策能力：** 当提示中列出技能时，agent 是否会选择正确的技能（或避开不相关的技能）？
- **合规性：** 代理是否在使用前读取 `SKILL.md` 并遵循所需的 steps/args？
- **工作流契约：** 多轮场景，断言工具调用顺序、会话历史延续以及沙箱边界。

使用固定输入和模拟提供者开始未来的评估：

- 使用带 mock 提供方的场景运行器，用于断言工具调用 + 顺序、技能文件读取以及会话接线。
- 一小套聚焦技能的场景（使用 vs 避免、门控、提示注入）。
- 仅在 CI-safe 套件就位后才进行可选的实时评估（选择加入、环境门控）。

## <a id="module-mocks-and-export-completeness"></a> Module 模拟和导出完整性

当灯具只需要覆盖一些功能时，新的第一方 `vi.mock` 和 `vi.doMock` 工厂应该保留真实模块的导出：

```ts
vi.mock("./runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./runtime.js")>()),
  start: vi.fn(),
}));
```

仅对 **导出完整性使用直通**。 `importOriginal`和`vi.importActual`可以为有状态单例返回单独的模块实例；它们不保证共享状态或生命周期身份。当隔离真实状态或初始化是夹具的目的时，保持封闭的模拟，并在模拟调用上方的行中解释该契约：

```ts
// mock-isolation: Keep the database and process-wide cache outside this fixture.
vi.mock("./runtime.js", () => ({ start: vi.fn() }));
```

`pnpm check:test-mock-exports` 检查文字第一方模块注册，包括相对、工作空间包和 TypeScript- 路径别名。没有可识别的实模块return/spread的工厂需要注释，包括语法检查无法证明的间接工厂。现有的未注释工厂具有精确的源目标和令牌指纹基线；新建或变更工厂不能借用其他工厂的补贴。删除或注释现有工厂后，运行 `pnpm check:test-mock-exports --prune` 以缩小该基线。该护罩可与现有的 CI 棘轮和 `check:changed` 配合使用；它不会重写测试。

## <a id="raw-sqlite-state-access"></a> Raw SQLite 状态访问

`closeOpenClawStateDatabaseForTest()` 同步关闭本机句柄，但工作程序支持的状态写入（插件状态、延迟插件迁移和其他工作程序存储）保留工作程序连接，其退休仅在该调用时开始。它最终关闭检查点并在稍后的任意时间删除独占锁下的 WAL。在使用原始 `DatabaseSync` 打开数据库，或复制、散列或快照其文件之前，`await closeOpenClawStateDatabaseAsync()`（或来自 `src/test-utils/database-cleanup.ts` 的 `closeStateDatabaseForTest()`，这也会清除故障锁存器）。否则，原始连接可能会失败并显示 `SQLITE_BUSY`，或者快照可能会在测试下发生更改。原始连接上的 `PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE` 证明不存在其他连接。

<a id="skills-watchers" />

## <a id="skills-discovery"></a> 技能发现

`skills.status` 和技能快照准备共享一个后台发现工作者。在删除其临时根或恢复假计时器之前，请使用 `await closeSkillsWatchers(true)` 将其关闭在 `afterEach` 中。共享工作通道还会通过文件之间的通用单例生命周期耗尽该所有者的资源。

当测试不执行被动刷新时设置 `skills.load.watch: false`。这会禁用定期扫描；初始发现和显式技能更改仍然使用工作人员，并且必须在清理之前完成。

## <a id="compiled-subprocesses-and-timeout-helpers"></a> 编译的子进程和超时帮助程序

`createOpenClawTestInstance` 在其隔离网关上等待 `/readyz` 和 `/startupz`。失败的探测会在原始启动期限内从 10 毫秒回退到最多 500 毫秒。当代理启动的测试继承秘密出口代理环境时，这也会限制拒绝流量；它不会绕过代理的环回流量策略。

- 在集合中加载已编译的子进程声明 （`scripts/lib/vitest-worker-declarations.mts`）。 Vitest 调用中的第一个此类加载准备了整个已编译的工作程序生成（几十秒热，几分钟冷），因此测试或挂钩中的 `await import()` 其图表达到声明，该准备工作在测试或挂钩截止日期内进行。静态导入主题；每次测试重新导入它的套件会在核心中添加 `src/test-utils/prepare-compiled-subprocesses.ts` 的副作用导入。扩展测试使用 `import "openclaw/plugin-sdk/compiled-subprocess-testing";` 代替。仅将预加载添加到已加载声明的套件中。
- 嵌套关闭装置在收集期间准备一代，然后通过主管和`run-vitest.mjs`转发垫片借用它。将描述符保留在现有的 bootstrap/IPC 合约上，以便每个所有者在归还贷款之前加入其子合约；不要在关闭期限内进行冷编译。

将祖父 `withTestTimeout`/`raceWithTimeoutResult` 比赛替换为 `test/helpers/promise.ts` 中的 `awaitGateBeforeSettlement(gate, operation, message)` 或 `withinTest(work, signal)`，或通过所有者注入的时钟使用 `vi.useFakeTimers()`。删除后运行`pnpm check:test-timeout-race-ratchet --prune`； `config/test-timeout-race-baseline.txt` 中的每个文件基线只会缩小。
