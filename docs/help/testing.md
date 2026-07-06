---
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器，以及每类测试覆盖的内容"
read_when:
  - 在本地或 CI 中运行测试时
  - 为模型/提供方错误添加回归测试时
  - 调试 gateway + agent 行为时
title: "测试"
---

OpenClaw has three Vitest suites (unit/integration, e2e, live) plus Docker
runners. This page covers what each suite covers, which command to run for a
given workflow, how live tests discover credentials, and how to add
regressions for real-world provider/model bugs.

<Note>
**QA 栈（qa-lab、qa-channel、live transport lanes）** 另有文档说明：

- [QA overview](/concepts/qa-e2e-automation) - architecture, command surface, scenario authoring.
- [Matrix QA](/concepts/qa-matrix) - reference for `pnpm openclaw qa matrix`.
- [Maturity scorecard](/maturity/scorecard) - how release QA evidence supports stability and LTS decisions.
- [QA channel](/channels/qa-channel) - the synthetic transport plugin used by repo-backed scenarios.

This page covers the regular test suites and Docker/Parallels runners. [QA-specific runners](#qa-specific-runners) below lists the concrete `qa` invocations and points back at the references above.
</Note>

## 快速开始

大多数时候：

- Full gate (expected before push): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Faster local full-suite run on a roomy machine: `pnpm test:max`
- Direct Vitest watch loop: `pnpm test:watch`
- Direct file targeting routes plugin/channel paths too: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefer targeted runs first when iterating on a single failure.
- Docker-backed QA site: `pnpm qa:lab:up`
- Linux VM-backed QA lane: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当你修改测试或想要额外信心时：

- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

## 测试临时目录

Use the shared helpers in `test/helpers/temp-dir.ts` for test-owned temporary
directories so ownership is explicit and cleanup stays in the test lifecycle:

```ts
import { afterEach } from "vitest";
import { useAutoCleanupTempDirTracker } from "../helpers/temp-dir.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

it("uses a temp workspace", () => {
  const workspace = tempDirs.make("openclaw-example-");
  // 使用 workspace
});
```

`useAutoCleanupTempDirTracker(afterEach)` intentionally exposes no manual
cleanup method - Vitest owns cleanup after each test. Older lower-level
helpers (`makeTempDir`, `cleanupTempDirs`, `createTempDirTracker`) still exist
for tests that have not migrated; avoid new usage of them and avoid new bare
`fs.mkdtemp*` calls unless a test is explicitly verifying raw temp-dir
behavior. When a bare temp dir is genuinely needed, add an auditable allow
comment with a reason:

```ts
// openclaw-temp-dir: allow verifies raw fs cleanup behavior
const workspace = fs.mkdtempSync(prefix);
```

`node scripts/report-test-temp-creations.mjs` reports new bare temp-dir
creation and new manual shared-helper usage in added diff lines, without
blocking existing cleanup styles. It follows the same test-path classification
as `scripts/changed-lanes.mjs` and skips the shared helper implementation
itself. `check:changed` runs this report for changed test paths as a
warning-only CI signal (GitHub warning annotations, not failures).

## Live and Docker/Parallels workflows

当调试真实提供方/模型（需要真实凭证）时：

- Live suite (models + gateway tool/image probes): `pnpm test:live`
- Target one live file quietly: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Runtime performance reports: dispatch `OpenClaw Performance` with
  `live_openai_candidate=true` for a real `openai/gpt-5.5` agent turn or
  `deep_profile=true` for Kova CPU/heap/trace artifacts. Daily scheduled runs
  publish mock-provider, deep-profile, and GPT 5.5 lane artifacts to
  `openclaw/clawgrit-reports` when `CLAWGRIT_REPORTS_TOKEN` is configured. The
  mock-provider report also includes source-level gateway boot, memory,
  plugin-pressure, repeated fake-model hello-loop, and CLI startup numbers.
- Docker live model sweep: `pnpm test:docker:live-models`
  - Each selected model runs a text turn plus a small file-read-style probe.
    Models whose metadata advertises `image` input also run a tiny image turn.
    Disable the extra probes with `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` or
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` when isolating provider failures.
  - CI coverage: daily `OpenClaw Scheduled Live And E2E Checks` and manual
    `OpenClaw Release Checks` both call the reusable live/E2E workflow with
    `include_live_suites: true`, which includes Docker live model matrix jobs
    sharded by provider.
  - For focused CI reruns, dispatch `OpenClaw Live And E2E Checks (Reusable)`
    with `include_live_suites: true` and `live_models_only: true`.
  - Add new high-signal provider secrets to `scripts/ci-hydrate-live-auth.sh`
    plus `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` and its
    scheduled/release callers.
- Native Codex bound-chat smoke: `pnpm test:docker:live-codex-bind`
  - Runs a Docker live lane against the Codex app-server path, binds a
    synthetic Slack DM with `/codex bind`, exercises `/codex fast` and
    `/codex permissions`, then verifies a plain reply and an image attachment
    route through the native plugin binding instead of ACP.
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness`
  - Runs gateway agent turns through the plugin-owned Codex app-server
    harness, verifies `/codex status` and `/codex models`, and by default
    exercises image, cron MCP, sub-agent, and Guardian probes. Disable the
    sub-agent probe with `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` when
    isolating other failures. For a focused sub-agent check, disable the
    other probes:
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    This exits after the sub-agent probe unless
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` is set.
- Codex on-demand install smoke: `pnpm test:docker:codex-on-demand`
  - Installs the packaged OpenClaw tarball in Docker, runs OpenAI API-key
    onboarding, and verifies the Codex plugin plus `@openai/codex` dependency
    were downloaded into the managed npm project root on demand.
- Live plugin tool dependency smoke: `pnpm test:docker:live-plugin-tool`
  - Packs a fixture plugin with a real `slugify` dependency, installs it
    through `npm-pack:`, verifies the dependency under the managed npm
    project root, then asks a live OpenAI model to call the plugin tool and
    return the hidden slug.
- Crestodian rescue command smoke: `pnpm test:live:crestodian-rescue-channel`
  - Opt-in belt-and-suspenders check for the message-channel rescue command
    surface. Exercises `/crestodian status`, queues a persistent model
    change, replies `/crestodian yes`, and verifies the audit/config write
    path.
- Crestodian planner Docker smoke: `pnpm test:docker:crestodian-planner`
  - Runs Crestodian in a configless container with a fake Claude CLI on
    `PATH` and verifies the fuzzy planner fallback translates into an
    audited typed config write.
- Crestodian first-run Docker smoke: `pnpm test:docker:crestodian-first-run`
  - Starts from an empty OpenClaw state dir, verifies the modern onboard
    Crestodian entrypoint, applies setup/model/agent/Discord plugin +
    SecretRef writes, validates config, and verifies audit entries. The same
    Ring 0 setup path is also covered in QA Lab by
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Moonshot/Kimi cost smoke: with `MOONSHOT_API_KEY` set, run
  `openclaw models list --provider moonshot --json`, then run an isolated
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。验证 JSON 报告 Moonshot/K2.6，并且 assistant transcript 存储了归一化的
  `usage.cost`。

<Tip>
当你只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量缩小 live 测试范围。
</Tip>

## QA 专用运行器

These commands sit beside the main test suites when you need QA-lab realism.

CI runs QA Lab in dedicated workflows. Agentic parity is nested under
`QA-Lab - All Lanes` and release validation, not a standalone PR workflow.
Broad validation should use `Full Release Validation` with
`rerun_group=qa-parity` or the release-checks QA group. Stable/default release
checks keep exhaustive live/Docker soak behind `run_release_soak=true`; the
`full` profile forces soak on. `QA-Lab - All Lanes` runs nightly on `main` and
from manual dispatch with the mock parity lane, live Matrix lane,
Convex-managed live Telegram lane, and Convex-managed live Discord lane as
parallel jobs. Scheduled QA and release checks pass Matrix `--profile fast`
explicitly, while the Matrix CLI and manual workflow input default remains
`all`; manual dispatch can shard `all` into `transport`, `media`,
`e2ee-smoke`, `e2ee-deep`, and `e2ee-cli` jobs. `OpenClaw Release Checks` runs
parity plus the fast Matrix and Telegram lanes before release approval, using
`mock-openai/gpt-5.5` for release transport checks so they stay deterministic
and avoid normal provider-plugin startup. These live transport gateways
disable memory search; memory behavior stays covered by the QA parity suites.

完整的发布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已包含
`ffmpeg` 和 `ffprobe`。Docker live 模型/backend 分片使用共享的
`ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，该镜像针对所选提交只构建一次，
然后通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取，而不是在每个分片内重新构建。

- `pnpm openclaw qa suite`
  - Runs repo-backed QA scenarios directly on the host.
  - Writes top-level `qa-evidence.json`, `qa-suite-summary.json`, and
    `qa-suite-report.md` artifacts for the selected scenario set, including
    mixed flow, Vitest, and Playwright scenario selections.
  - When dispatched by `pnpm openclaw qa run --qa-profile <profile>`, embeds
    the selected taxonomy profile scorecard in the same `qa-evidence.json`.
    `smoke-ci` writes slim evidence (`evidenceMode: "slim"`, no per-entry
    `execution`). `release` covers the curated release-readiness slice; `all`
    selects every active maturity category and targets explicit QA Profile
    Evidence workflow dispatches when a full scorecard artifact is needed.
  - Runs multiple selected scenarios in parallel by default with isolated
    gateway workers. `qa-channel` defaults to concurrency 4 (bounded by the
    selected scenario count). Use `--concurrency <count>` to tune the worker
    count, or `--concurrency 1` for the older serial lane.
  - Exits non-zero when any scenario fails. Use `--allow-failures` for
    artifacts without a failing exit code.
  - Supports provider modes `live-frontier`, `mock-openai`, and `aimock`.
    `aimock` starts a local AIMock-backed provider server for experimental
    fixture and protocol-mock coverage without replacing the scenario-aware
    `mock-openai` lane.
- `pnpm openclaw qa coverage --match <query>`
  - Searches scenario IDs, titles, surfaces, coverage IDs, docs refs, code
    refs, plugins, and provider requirements, then prints matching suite
    targets.
  - Use this before a QA Lab run when you know the touched behavior or file
    path but not the smallest scenario. Advisory only - still choose mock,
    live, Multipass, Matrix, or transport proof from the behavior being
    changed.
- `pnpm test:plugins:kitchen-sink-live`
  - Runs the live OpenAI Kitchen Sink plugin gauntlet through QA Lab.
    Installs the external Kitchen Sink package, verifies the plugin SDK
    surface inventory, probes `/healthz` and `/readyz`, records gateway
    CPU/RSS evidence, runs a live OpenAI turn, and checks adversarial
    diagnostics. Requires live OpenAI auth such as `OPENAI_API_KEY`. In
    hydrated Testbox sessions it automatically sources the Testbox live-auth
    profile when the `openclaw-testbox-env` helper is present.
- `pnpm test:gateway:cpu-scenarios`
  - Runs the gateway startup bench plus a small mock QA Lab scenario pack
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) and writes a combined CPU observation
    summary under `.artifacts/gateway-cpu-scenarios/`.
  - Flags only sustained hot CPU observations by default (`--cpu-core-warn`,
    default `0.9`; `--hot-wall-warn-ms`, default `30000`), so short startup
    bursts are recorded as metrics without looking like the minutes-long
    gateway peg regression.
  - Runs against built `dist` artifacts; run a build first when the checkout
    does not already have fresh runtime output.
- `pnpm openclaw qa suite --runner multipass`
  - Runs the same QA suite inside a disposable Multipass Linux VM, keeping
    the same scenario-selection and provider/model flags as `qa suite`.
  - Live runs forward the QA auth inputs practical for the guest:
    env-based provider keys, the QA live provider config path, and
    `CODEX_HOME` when present.
  - Output dirs must stay under the repo root so the guest can write back
    through the mounted workspace.
  - Writes the normal QA report + summary plus Multipass logs under
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - 启动 Docker 版 QA site，用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - Builds an npm tarball from the current checkout, installs it globally in
    Docker, runs non-interactive OpenAI API-key onboarding, configures
    Telegram by default, verifies the packaged plugin runtime loads without
    startup dependency repair, runs doctor, and runs one local agent turn
    against a mocked OpenAI endpoint.
  - Use `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` to run the same packaged-install
    lane with Discord.
- `pnpm test:docker:session-runtime-context`
  - Runs a deterministic built-app Docker smoke for embedded runtime context
    transcripts. Verifies hidden OpenClaw runtime context persists as a
    non-display custom message instead of leaking into the visible user
    turn, then seeds an affected broken session JSONL and verifies
    `openclaw doctor --fix` rewrites it to the active branch with a backup.
- `pnpm test:docker:npm-telegram-live`
  - Installs an OpenClaw package candidate in Docker, runs installed-package
    onboarding, configures Telegram through the installed CLI, then reuses
    the live Telegram QA lane with that installed package as the SUT
    Gateway.
  - The wrapper mounts only the `qa-lab` harness source from the checkout;
    the installed package owns `dist`, `openclaw/plugin-sdk`, and bundled
    plugin runtime, so the lane does not mix current checkout plugins into
    the package under test.
  - Defaults to `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`; set
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` or
    `OPENCLAW_CURRENT_PACKAGE_TGZ` to test a resolved local tarball instead
    of installing from the registry.
  - Emits repeated RTT timing in `qa-evidence.json` by default with
    `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES=20`. Override
    `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`,
    `OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS`, or
    `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES` to tune the run.
    `OPENCLAW_NPM_TELEGRAM_RTT_CHECKS` accepts a comma-separated list of
    Telegram QA check IDs to sample; when unset, the default RTT-capable
    check is `telegram-mentioned-message-reply`.
  - Uses the same Telegram env credentials or Convex credential source as
    `pnpm openclaw qa telegram`. For CI/release automation, set
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` plus
    `OPENCLAW_QA_CONVEX_SITE_URL` and a role secret. If
    `OPENCLAW_QA_CONVEX_SITE_URL` and a Convex role secret are present in
    CI, the Docker wrapper selects Convex automatically.
  - The wrapper validates Telegram or Convex credential env on the host
    before Docker build/install work. Set
    `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1` only when
    deliberately debugging pre-credential setup.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` overrides the
    shared `OPENCLAW_QA_CREDENTIAL_ROLE` for this lane only. When Convex
    credentials are selected and no role is set, the wrapper uses `ci` in CI
    and `maintainer` outside CI.
  - GitHub Actions exposes this lane as the manual maintainer workflow
    `NPM Telegram Beta E2E`. It does not run on merge. The workflow uses the
    `qa-live-shared` environment and Convex CI credential leases.
- GitHub Actions also exposes `Package Acceptance` for side-run product proof
  against one candidate package. It accepts a Git ref, published npm spec,
  HTTPS tarball URL plus SHA-256, trusted-URL policy, or tarball artifact
  from another run (`source=ref|npm|url|trusted-url|artifact`), uploads the
  normalized `openclaw-current.tgz` as `package-under-test`, then runs the
  existing Docker E2E scheduler with `smoke`, `package`, `product`, `full`,
  or `custom` lane profiles. Set `telegram_mode=mock-openai` or
  `live-frontier` to run the Telegram QA workflow against the same
  `package-under-test` artifact.
  - Latest beta product proof:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确 tarball URL 证明需要摘要值，并使用公共 URL 安全策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 企业/私有 tarball 镜像使用显式的受信任源策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 会从受信任的 workflow ref 读取 `.github/package-trusted-sources.json`，且不接受 URL 凭证或 workflow 输入的私有网络绕过。如果命名策略声明了 bearer auth，请配置固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。

- Artifact 证明会从另一个 Actions run 下载 tarball artifact：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Packs and installs the current OpenClaw build in Docker, starts the
    Gateway with OpenAI configured, then enables bundled channel/plugins via
    config edits.
  - Verifies setup discovery leaves unconfigured downloadable plugins
    absent, the first configured doctor repair installs each missing
    downloadable plugin explicitly, and a second restart does not run
    hidden dependency repair.
  - Also installs a known older npm baseline, enables Telegram before
    running `openclaw update --tag <candidate>`, and verifies the
    candidate's post-update doctor cleans legacy plugin dependency debris
    without a harness-side postinstall repair.
- `pnpm test:parallels:npm-update`
  - Runs the native packaged-install update smoke across Parallels guests.
    Each selected platform first installs the requested baseline package,
    then runs the installed `openclaw update` command in the same guest and
    verifies the installed version, update status, gateway readiness, and
    one local agent turn.
  - Use `--platform macos`, `--platform windows`, or `--platform linux`
    while iterating on one guest. Use `--json` for the summary artifact
    path and per-lane status.
  - The OpenAI lane uses `openai/gpt-5.5` for the live agent-turn proof by
    default. Pass `--model <provider/model>` or set
    `OPENCLAW_PARALLELS_OPENAI_MODEL` to validate another OpenAI model.
  - Wrap long local runs in a host timeout so Parallels transport stalls
    cannot consume the rest of the testing window:

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - The script writes nested lane logs under
    `/tmp/openclaw-parallels-npm-update.*`. Inspect `windows-update.log`,
    `macos-update.log`, or `linux-update.log` before assuming the outer
    wrapper is hung.
  - Windows update can spend 10 to 15 minutes in post-update doctor and
    package update work on a cold guest; that is still healthy when the
    nested npm debug log is advancing.
  - Do not run this aggregate wrapper in parallel with individual Parallels
    macOS, Windows, or Linux smoke lanes. They share VM state and can
    collide on snapshot restore, package serving, or guest gateway state.
  - The post-update proof runs the normal bundled plugin surface because
    capability facades such as speech, image generation, and media
    understanding load through bundled runtime APIs even when the agent
    turn itself only checks a simple text response.

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供方服务器，用于直接的协议冒烟测试。
- `pnpm openclaw qa matrix`
  - Runs the Matrix live QA lane against a disposable Docker-backed Tuwunel
    homeserver. Source-checkout only - packaged installs do not ship
    `qa-lab`.
  - Full CLI, profile/scenario catalog, env vars, and artifact layout:
    [Matrix QA](/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Runs the Telegram live QA lane against a real private group using the
    driver and SUT bot tokens from env.
  - Requires `OPENCLAW_QA_TELEGRAM_GROUP_ID`,
    `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`, and
    `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. The group id must be the numeric
    Telegram chat id.
  - Supports `--credential-source convex` for shared pooled credentials.
    Use env mode by default, or set `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`
    to opt into pooled leases.
  - Defaults cover canary, mention gating, command addressing, `/status`,
    bot-to-bot mentioned replies, and core native command replies.
    `mock-openai` defaults also cover deterministic reply-chain and
    Telegram final-message streaming regressions. Use `--list-scenarios`
    for optional probes such as `session_status`.
  - Exits non-zero when any scenario fails. Use `--allow-failures` for
    artifacts without a failing exit code.
  - Requires two distinct bots in the same private group, with the SUT bot
    exposing a Telegram username.
  - For stable bot-to-bot observation, enable Bot-to-Bot Communication Mode
    in `@BotFather` for both bots and ensure the driver bot can observe
    group bot traffic.
  - Writes a Telegram QA report, summary, and `qa-evidence.json` under
    `.artifacts/qa-e2e/...`. Replying scenarios include RTT from driver send
    request to observed SUT reply.

`Mantis Telegram Live` is the PR-evidence wrapper around this lane. It runs
the candidate ref with Convex-leased Telegram credentials, renders the
redacted QA report/evidence bundle in a Crabbox desktop browser, records MP4
evidence, generates a motion-trimmed GIF, uploads the artifact bundle, and
posts inline PR evidence through the Mantis GitHub App when `pr_number` is
set. Maintainers can start it from the Actions UI through `Mantis Scenario`
(`scenario_id: telegram-live`) or directly from a pull request comment:

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用于 PR 可视化证据的 agentic 原生 Telegram Desktop before/after 包装器。可以通过 Actions UI 传入自由格式的 `instructions` 启动，或通过 `Mantis Scenario`（`scenario_id: telegram-desktop-proof`）启动，或者通过 PR 评论启动：

```text
@openclaw-mantis telegram desktop proof
```

The Mantis agent reads the PR, decides what Telegram-visible behavior proves
the change, runs the real-user Crabbox Telegram Desktop proof lane on
baseline and candidate refs, iterates until the native GIFs are useful,
writes a paired `motionPreview` manifest, and posts the same 2-column GIF
table through the Mantis GitHub App when `pr_number` is set.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Leases or reuses a Crabbox Linux desktop, installs native Telegram
    Desktop, configures OpenClaw with a leased Telegram SUT bot token,
    starts the gateway, and records screenshot/MP4 evidence from the
    visible VNC desktop.
  - Defaults to `--credential-source convex` so workflows only need the
    Convex broker secret. Use `--credential-source env` with the same
    `OPENCLAW_QA_TELEGRAM_*` variables as `pnpm openclaw qa telegram`.
  - Telegram Desktop still needs a user login/profile. The bot token
    configures OpenClaw only. Use `--telegram-profile-archive-env <name>`
    for a base64 `.tgz` profile archive, or use `--keep-lease` and log in
    manually through VNC once.
  - Writes `mantis-telegram-desktop-builder-report.md`,
    `mantis-telegram-desktop-builder-summary.json`,
    `telegram-desktop-builder.png`, and `telegram-desktop-builder.mp4`
    under the output directory.

Live transport lanes share one standard contract so new transports do not
drift; the per-lane coverage matrix lives in
[QA overview - Live transport coverage](/concepts/qa-e2e-automation#live-transport-coverage).
`qa-channel` is the broad synthetic suite and is not part of that matrix.

### 通过 Convex 共享 Telegram 凭证（v1）

When `--credential-source convex` (or `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`)
is enabled for live transport QA, QA lab acquires an exclusive lease from a
Convex-backed pool, heartbeats that lease while the lane is running, and
releases the lease on shutdown. The section name predates Discord, Slack, and
WhatsApp support; the lease contract is shared across kinds.

Reference Convex project scaffold: `qa/convex-credential-broker/`

必需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 针对所选角色的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 对应 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 对应 `ci`
- 凭证角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（CI 中默认为 `ci`，否则默认为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅用于本地开发的 loopback `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常运行中应使用 `https://`。

维护者管理命令（pool add/remove/list）需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

面向维护者的 CLI 辅助命令：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在 live 运行前先使用 `doctor` 检查 Convex site URL、broker 密钥、
endpoint prefix、HTTP timeout 以及 admin/list 可达性，而不会打印
密钥值。脚本和 CI 工具中可使用 `--json` 以获得机器可读输出。

Default endpoint contract (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`).
Requests authenticate with an `Authorization: Bearer <role secret>` header;
bodies below omit that header:

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功：`{ status: "ok", index, data }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /admin/add`（仅 maintainer 密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅 maintainer 密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活跃租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅 maintainer 密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram kind 的 payload 结构：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字形式的 Telegram chat id 字符串。
- `admin/add` 会校验 `kind: "telegram"` 的该结构，并拒绝格式错误的 payload。

Telegram real-user kind 的 payload 结构：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必须是数字字符串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必须是 SHA-256 十六进制字符串。
- `kind: "telegram-user"` 为 Mantis Telegram Desktop proof 工作流保留。通用 QA Lab lanes 不得获取它。

经 broker 验证的多通道 payload：

- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack lanes can also lease from the pool, but Slack payload validation
currently lives in the Slack QA runner rather than the broker. Use
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`
for Slack rows.

### 向 QA 添加一个 channel

The architecture and scenario-helper names for new channel adapters live in
[QA overview - Adding a channel](/concepts/qa-e2e-automation#adding-a-channel).
The minimum bar: implement the transport runner on the shared `qa-lab` host
seam, declare `qaRunners` in the plugin manifest, mount as
`openclaw qa <runner>`, and author scenarios under `qa/scenarios/`.

## 测试套件（在哪运行什么）

Think of the suites as "increasing realism" (and increasing flakiness/cost).

### 单元 / 集成（默认）

- Command: `pnpm test`
- Config: untargeted runs use the `vitest.full-*.config.ts` shard set and may
  expand multi-project shards into per-project configs for parallel
  scheduling
- Files: core/unit inventories under `src/**/*.test.ts`,
  `packages/**/*.test.ts`, and `test/**/*.test.ts`; UI unit tests run in the
  dedicated `unit-ui` shard
- Scope:
  - Pure unit tests
  - In-process integration tests (gateway auth, routing, tooling, parsing, config)
  - Deterministic regressions for known bugs
- Expectations:
  - Runs in CI
  - No real keys required
  - Should be fast and stable
  - Resolver and public-surface loader tests must prove broad `api.js` and
    `runtime-api.js` fallback behavior with generated tiny plugin fixtures,
    not real bundled plugin source APIs. Real plugin API loads belong in
    plugin-owned contract/integration suites.

本地依赖策略：

- Default test installs skip optional native Discord opus builds. Discord
  voice uses bundled `libopus-wasm`, and `@discordjs/opus` stays disabled in
  `allowBuilds` so local tests and Testbox lanes do not compile the native
  addon.
- Compare native opus performance in the `libopus-wasm` benchmark repo, not
  in default OpenClaw install/test loops. Do not set `@discordjs/opus` to
  `true` in the default `allowBuilds`; that makes unrelated install/test
  loops compile native code.

<AccordionGroup>
  <Accordion title="项目、分片与受限通道">

    - Untargeted `pnpm test` runs thirteen smaller shard configs (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-tooling`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) instead of one giant native root-project process. This cuts peak RSS on loaded machines and avoids auto-reply/plugin work starving unrelated suites.
    - `pnpm test --watch` still uses the native root `vitest.config.ts` project graph, because a multi-shard watch loop is not practical.
    - `pnpm test`, `pnpm test:watch`, and `pnpm test:perf:imports` route explicit file/directory targets through scoped lanes first, so `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` avoids paying the full root project startup tax.
    - `pnpm test:changed` expands changed git paths into cheap scoped lanes by default: direct test edits, sibling `*.test.ts` files, explicit source mappings, and local import-graph dependents. Config/setup/package edits do not broad-run tests unless you explicitly use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` is the normal smart local check gate for narrow work. It classifies the diff into core, core tests, extensions, extension tests, apps, docs, release metadata, live Docker tooling, and tooling, then runs the matching typecheck, lint, and guard commands. It does not run Vitest tests; call `pnpm test:changed` or explicit `pnpm test <target>` for test proof. Release metadata-only version bumps run targeted version/config/root-dependency checks, with a guard that rejects package changes outside the top-level version field.
    - Live Docker ACP harness edits run focused checks: shell syntax for the live Docker auth scripts and a live Docker scheduler dry-run. `package.json` changes are included only when the diff is limited to `scripts["test:docker:live-*"]`; dependency, export, version, and other package-surface edits still use the broader guards.
    - Import-light unit tests from agents, commands, plugins, auto-reply helpers, `plugin-sdk`, and similar pure utility areas route through the `unit-fast` lane, which skips `test/setup-openclaw-runtime.ts`; stateful/runtime-heavy files stay on the existing lanes.
    - Selected `plugin-sdk` and `commands` helper source files also map changed-mode runs to explicit sibling tests in those light lanes, so helper edits avoid rerunning the full heavy suite for that directory.
    - `auto-reply` has dedicated buckets for top-level core helpers, top-level `reply.*` integration tests, and the `src/auto-reply/reply/**` subtree. CI further splits the reply subtree into agent-runner, dispatch, and commands/state-routing shards so one import-heavy bucket does not own the full Node tail.
    - Normal PR/main CI intentionally skips the bundled plugin batch sweep and release-only `agentic-plugins` shard. Full Release Validation dispatches the separate `Plugin Prerelease` child workflow for those plugin-heavy suites on release candidates.

  </Accordion>

  <Accordion title="嵌入式运行器覆盖">

    - 当你更改 message-tool 发现输入或 compaction 运行时上下文时，请保留两层覆盖。
    - 为纯路由和归一化边界添加聚焦的辅助回归测试。
    - 保持嵌入式运行器集成套件健康：
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`,
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts`, 和
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证作用域 id 和 compaction 行为仍然通过真实的 `run.ts` / `compact.ts` 路径流动；仅辅助程序测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - Base Vitest config defaults to `threads`.
    - The shared Vitest config fixes `isolate: false` and uses the
      non-isolated runner across the root projects, e2e, and live configs.
    - The root UI lane keeps its `jsdom` setup and optimizer, but runs on the
      shared non-isolated runner too.
    - Each `pnpm test` shard inherits the same `threads` + `isolate: false`
      defaults from the shared Vitest config.
    - `scripts/run-vitest.mjs` adds `--no-maglev` for Vitest child Node
      processes by default to reduce V8 compile churn during big local runs.
      Set `OPENCLAW_VITEST_ENABLE_MAGLEV=1` to compare against stock V8
      behavior.
    - `scripts/run-vitest.mjs` terminates explicit non-watch Vitest runs
      after 5 minutes with no stdout or stderr output. Set
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` to disable the watchdog for
      an intentionally silent investigation.

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` shows which architectural lanes a diff triggers.
    - The pre-commit hook is formatting-only. It restages formatted files
      and does not run lint, typecheck, or tests.
    - Run `pnpm check:changed` explicitly before handoff or push when you
      need the smart local check gate.
    - `pnpm test:changed` routes through cheap scoped lanes by default. Use
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` only when the agent
      decides a harness, config, package, or contract edit really needs
      broader Vitest coverage.
    - `pnpm test:max` and `pnpm test:changed:max` keep the same routing
      behavior, just with a higher worker cap.
    - Local worker auto-scaling is intentionally conservative and backs off
      when the host load average is already high, so multiple concurrent
      Vitest runs do less damage by default.
    - The base Vitest config marks the projects/config files as
      `forceRerunTriggers` so changed-mode reruns stay correct when test
      wiring changes.
    - The config keeps `OPENCLAW_VITEST_FS_MODULE_CACHE` enabled on
      supported hosts; set `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`
      for one explicit cache location for direct profiling.

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` enables Vitest import-duration reporting plus
      import-breakdown output.
    - `pnpm test:perf:imports:changed` scopes the same profiling view to
      files changed since `origin/main`.
    - Shard timing data is written to `.artifacts/vitest-shard-timings.json`.
      Whole-config runs use the config path as the key; include-pattern CI
      shards append the shard name so filtered shards can be tracked
      separately.
    - When one hot test still spends most of its time in startup imports,
      keep heavy dependencies behind a narrow local `*.runtime.ts` seam and
      mock that seam directly instead of deep-importing runtime helpers
      just to pass them through `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compares routed
      `test:changed` against the native root-project path for that
      committed diff and prints wall time plus macOS max RSS.
    - `pnpm test:perf:changed:bench -- --worktree` benchmarks the current
      dirty tree by routing the changed file list through
      `scripts/test-projects.mjs` and the root Vitest config.
    - `pnpm test:perf:profile:main` writes a main-thread CPU profile for
      Vitest/Vite startup and transform overhead.
    - `pnpm test:perf:profile:runner` writes runner CPU+heap profiles for
      the unit suite with file parallelism disabled.

  </Accordion>
</AccordionGroup>

### 稳定性（网关）

- Command: `pnpm test:stability:gateway`
- Config: `test/vitest/vitest.gateway.config.ts`, `test/vitest/vitest.logging.config.ts`, and `test/vitest/vitest.infra.config.ts`, each forced to one worker
- Scope:
  - Starts a real loopback Gateway with diagnostics enabled by default
  - Drives synthetic gateway message, memory, and large-payload churn through the diagnostic event path
  - Queries `diagnostics.stability` over the Gateway WS RPC
  - Covers diagnostic stability bundle persistence helpers
  - Asserts the recorder remains bounded, synthetic RSS samples stay under the pressure budget, and per-session queue depths drain back to zero
- Expectations:
  - CI-safe and keyless
  - Narrow lane for stability-regression follow-up, not a substitute for the full Gateway suite

### E2E（仓库聚合）

- 命令：`pnpm test:e2e`
- 范围：
  - 运行 gateway smoke E2E 通道
  - 运行模拟的 Control UI 浏览器 E2E 通道
- 预期：
  - CI 安全且无需密钥
  - 需要安装 Playwright Chromium

### E2E（gateway smoke）

- Command: `pnpm test:e2e:gateway`
- Config: `test/vitest/vitest.e2e.config.ts`
- Files: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, and bundled-plugin E2E tests under `extensions/`
- Runtime defaults:
  - Uses Vitest `threads` with `isolate: false`, matching the rest of the repo.
  - Uses adaptive workers (CI: up to 2, local: 1 by default).
  - Runs in silent mode by default to reduce console I/O overhead.
- Useful overrides:
  - `OPENCLAW_E2E_WORKERS=<n>` to force worker count (capped at 16).
  - `OPENCLAW_E2E_VERBOSE=1` to re-enable verbose console output.
- Scope:
  - Multi-instance gateway end-to-end behavior
  - WebSocket/HTTP surfaces, node pairing, and heavier networking
- Expectations:
  - Runs in CI (when enabled in the pipeline)
  - No real keys required
  - More moving parts than unit tests (can be slower)

### E2E（Control UI 模拟浏览器）

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts`
- 范围：
  - 启动 Vite Control UI
  - 通过 Playwright 驱动真实的 Chromium 页面
  - 用确定性的浏览器内 mock 替换 Gateway WebSocket
- 预期：
  - 作为 `pnpm test:e2e` 的一部分在 CI 中运行
  - 不需要真实的 Gateway、agents 或 provider 密钥
  - 必须存在浏览器依赖（`pnpm --dir ui exec playwright install chromium`）

### E2E：OpenShell 后端 smoke

- Command: `pnpm test:e2e:openshell`
- File: `extensions/openshell/src/backend.e2e.test.ts`
- Scope:
  - Reuses an active local OpenShell gateway
  - Creates a sandbox from a temporary local Dockerfile
  - Exercises OpenClaw's OpenShell backend over real `sandbox ssh-config` + SSH exec
  - Verifies remote-canonical filesystem behavior through the sandbox fs bridge
- Expectations:
  - Opt-in only; not part of the default `pnpm test:e2e` run
  - Requires a local `openshell` CLI plus a working Docker daemon
  - Requires an active local OpenShell gateway and its config source
  - Uses isolated `HOME` / `XDG_CONFIG_HOME`, then destroys the test sandbox
- Useful overrides:
  - `OPENCLAW_E2E_OPENSHELL=1` to enable the test when running the broader e2e suite manually
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` to point at a non-default CLI binary or wrapper script
  - `OPENCLAW_E2E_OPENSHELL_CONFIG_HOME=/path/to/config` to expose the registered gateway config to the isolated test
  - `OPENCLAW_E2E_OPENSHELL_HOST_IP=172.18.0.1` to override the Docker gateway IP used by the host policy fixture

### Live（真实提供方 + 真实模型）

- Command: `pnpm test:live`
- Config: `test/vitest/vitest.live.config.ts`
- Files: `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, and bundled-plugin live tests under `extensions/`
- Default: **enabled** by `pnpm test:live` (sets `OPENCLAW_LIVE_TEST=1`)
- Scope:
  - "Does this provider/model actually work _today_ with real creds?"
  - Catch provider format changes, tool-calling quirks, auth issues, and rate limit behavior
- Expectations:
  - Not CI-stable by design (real networks, real provider policies, quotas, outages)
  - Costs money / uses rate limits
  - Prefer running narrowed subsets instead of "everything"
- Live runs use already-exported API keys and staged auth profiles.
- By default, live runs still isolate `HOME` and copy config/auth material into a temp test home so unit fixtures cannot mutate your real `~/.openclaw`.
- Set `OPENCLAW_LIVE_USE_REAL_HOME=1` only when you intentionally need live tests to use your real home directory.
- `pnpm test:live` defaults to a quieter mode: it keeps `[live] ...` progress output and mutes gateway bootstrap logs/Bonjour chatter. Set `OPENCLAW_LIVE_TEST_QUIET=0` if you want the full startup logs back.
- API key rotation (provider-specific): set `*_API_KEYS` with comma/semicolon format or `*_API_KEY_1`, `*_API_KEY_2` (for example `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) or per-live override via `OPENCLAW_LIVE_*_KEY`; tests retry on rate limit responses.
- Progress/heartbeat output:
  - Live suites emit progress lines to stderr so long provider calls are visibly active even when Vitest console capture is quiet.
  - `test/vitest/vitest.live.config.ts` disables Vitest console interception so provider/gateway progress lines stream immediately during live runs.
  - Tune direct-model heartbeats with `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Tune gateway/probe heartbeats with `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## 我应该运行哪个测试套件？

使用这个决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你改动很多，再加上 `pnpm test:coverage`）
- 触碰 gateway 网络 / WS 协议 / 配对：再加上 `pnpm test:e2e`
- 调试“我的机器人挂了”/特定提供方失败/工具调用：运行缩小范围的 `pnpm test:live`

## Live（涉及网络）的测试

For the live model matrix, CLI backend smokes, ACP smokes, Codex app-server
harness, and all media-provider live tests (Deepgram, BytePlus, ComfyUI,
image, music, video, media harness) - plus credential handling for live runs

- see [Testing live suites](/help/testing-live). For the dedicated update and
  plugin validation checklist, see
  [Testing updates and plugins](/help/testing-updates-plugins).

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分成两类：

- Live-model runners: `test:docker:live-models` and `test:docker:live-gateway` run only their matching profile-key live file inside the repo Docker image (`src/agents/models.profiles.live.test.ts` and `src/gateway/gateway-models.profiles.live.test.ts`), mounting your local config dir, workspace, and optional profile env file. The matching local entrypoints are `test:live:models-profiles` and `test:live:gateway-profiles`.
- Docker live runners keep their own practical caps where needed:
  `test:docker:live-models` defaults to the curated supported high-signal set, and
  `test:docker:live-gateway` defaults to `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, and `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Set `OPENCLAW_LIVE_MAX_MODELS`
  or the gateway env vars when you explicitly want a smaller cap or larger scan.
- `test:docker:all` builds the live Docker image once via `test:docker:live-build`, packs OpenClaw once as an npm tarball through `scripts/package-openclaw-for-docker.mjs`, then builds/reuses two `scripts/e2e/Dockerfile` images. The bare image is only the Node/Git runner for install/update/plugin-dependency lanes; those lanes mount the prebuilt tarball. The functional image installs the same tarball into `/app` for built-app functionality lanes. Docker lane definitions live in `scripts/lib/docker-e2e-scenarios.mjs`; planner logic lives in `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` executes the selected plan. The aggregate uses a weighted local scheduler: `OPENCLAW_DOCKER_ALL_PARALLELISM` controls process slots, while resource caps keep heavy live, npm-install, and multi-service lanes from all starting at once. If a single lane is heavier than the active caps, the scheduler can still start it when the pool is empty and then keeps it running alone until capacity is available again. Defaults are 10 slots, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=5`, and `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; tune `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` or `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` (and other `OPENCLAW_DOCKER_ALL_<RESOURCE>_LIMIT` overrides) only when the Docker host has more headroom. The runner performs a Docker preflight by default, removes stale OpenClaw E2E containers, prints status every 30 seconds, stores successful lane timings in `.artifacts/docker-tests/lane-timings.json`, and uses those timings to start longer lanes first on later runs. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` to print the weighted lane manifest without building or running Docker, or `node scripts/test-docker-all.mjs --plan-json` to print the CI plan for selected lanes, package/image needs, and credentials.
- `Package Acceptance` is the GitHub-native package gate for "does this installable tarball work as a product?" It resolves one candidate package from `source=npm`, `source=ref`, `source=url`, `source=trusted-url`, or `source=artifact`, uploads it as `package-under-test`, then runs the reusable Docker E2E lanes against that exact tarball instead of repacking the selected ref. Profiles are ordered by breadth: `smoke`, `package`, `product`, and `full` (plus `custom` for an explicit lane list). See [Testing updates and plugins](/help/testing-updates-plugins) for the package/update/plugin contract, published-upgrade survivor matrix, release defaults, and failure triage.
- Build and release checks run `scripts/check-cli-bootstrap-imports.mjs` after tsdown. The guard walks the static built graph from `dist/entry.js` and `dist/cli/run-main.js` and fails if that pre-dispatch bootstrap graph statically imports any external package (Commander, prompt UI, undici, logging, and similar startup-heavy deps all count) before command dispatch; it also caps the bundled gateway run chunk at 70 KB and rejects static imports of known cold gateway paths (`control-ui-assets`, `diagnostic-stability-bundle`, `onboard-helpers`, `process-respawn`, `restart-sentinel`, `server-close`, `server-reload-handlers`) from that chunk. `scripts/release-check.ts` separately smoke-tests the packed CLI with `--help`, `onboard --help`, `doctor --help`, `status --json --timeout 1`, `config schema`, and `models list --provider openai`.
- Package Acceptance legacy compatibility is capped at `2026.4.25` (`2026.4.25-beta.*` included). Through that cutoff, the harness tolerates only shipped-package metadata gaps: omitted private QA inventory entries, missing `gateway install --wrapper`, missing patch files in the tarball-derived git fixture, missing persisted `update.channel`, legacy plugin install-record locations, missing marketplace install-record persistence, and config metadata migration during `plugins update`. For packages after `2026.4.25`, those paths are strict failures.
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:agent-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix`, and `test:docker:config-reload` boot one or more real containers and verify higher-level integration paths.
- Docker/Bash E2E lanes that install the packed OpenClaw tarball through `scripts/lib/openclaw-e2e-instance.sh` cap `npm install` at `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` (default `600s`; set `0` to disable the wrapper for debugging).

The live-model Docker runners also bind-mount only the needed CLI auth homes
(or all supported ones when the run is not narrowed), then copy them into the
container home before the run so external-CLI OAuth can refresh tokens
without mutating the host auth store:

- 直接模型：`pnpm test:docker:live-models` 和 `pnpm test:docker:live-gateway` 只在仓库 Docker 镜像中运行与其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录、工作区和可选的 profile env 文件。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器默认使用更小的 smoke 上限，因此完整的 Docker 扫描仍然可行：
  `test:docker:live-models` 默认 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和 `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。只有当你
  明确需要更大的穷举扫描时，才覆盖这些 env 变量。
- `test:docker:all` 先通过 `test:docker:live-build` 构建一次 live Docker 镜像，再通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包成一个 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像只是用于 install/update/plugin-dependency 通道的 Node/Git 运行器；这些通道会挂载预构建 tarball。功能镜像会将同一个 tarball 安装到 `/app`，用于已构建应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 负责执行所选计划。聚合流程使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽位，而资源上限会阻止过重的 live、npm-install 和多服务通道同时启动。如果单个通道比当前上限更重，调度器仍然可以在池为空时启动它，然后让它单独运行，直到再次有容量。默认值为 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；只有当 Docker 主机有更多余量时，才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认会执行 Docker 预检，移除过期的 OpenClaw E2E 容器，每 30 秒打印状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json`，并利用这些计时在后续运行中优先启动更长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不构建或运行 Docker 的情况下打印加权通道清单，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance` 是 GitHub 原生的包门禁，用于判断“这个可安装 tarball 是否能作为产品工作？”它会从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析一个候选包，将其作为 `package-under-test` 上传，然后针对这个精确 tarball 运行可复用的 Docker E2E 通道，而不是重新打包所选 ref。Profile 按广度排序：`smoke`、`package`、`product` 和 `full`。有关包/更新/插件契约、已发布升级幸存者矩阵、发布默认值和失败分流，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。
- 构建和发布检查会在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。该守卫从 `dist/entry.js` 和 `dist/cli/run-main.js` 追踪静态构建图，如果在命令分发之前的预分发启动导入了 Commander、prompt UI、undici 或日志记录等包依赖，就会失败；它还会将打包后的 gateway 运行 chunk 控制在预算内，并拒绝对已知冷门 gateway 路径的静态导入。打包后的 CLI smoke 还覆盖 root help、onboard help、doctor help、status、config schema 和 model-list 命令。
- Package Acceptance 的旧版兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止点之前，harness 只容忍已发布包的元数据缺口：省略的 private QA 清单项、缺失的 `gateway install --wrapper`、tarball 派生的 git fixture 中缺失的 patch 文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径都属于严格失败。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。

- 发布用户旅程 smoke：`pnpm test:docker:release-user-journey` 会在干净的 Docker home 中全局安装打包好的 OpenClaw tarball，运行 onboarding，配置一个模拟的 OpenAI provider，运行一次 agent 回合，安装/卸载外部插件，针对本地 fixture 配置 ClickClack，验证出站/入站消息，重启 Gateway，并运行 doctor。
- 发布类型化 onboarding smoke：`pnpm test:docker:release-typed-onboarding` 安装打包好的 tarball，通过真实 TTY 驱动 `openclaw onboard`，将 OpenAI 配置为 env-ref provider，验证不会持久化原始密钥，并运行一次模拟的 agent 回合。
- 发布媒体/记忆 smoke：`pnpm test:docker:release-media-memory` 安装打包好的 tarball，验证从 PNG 附件中理解图像、OpenAI 兼容的图像生成输出、记忆搜索召回，以及在 Gateway 重启后的召回保留。
- 发布升级用户旅程 smoke：`pnpm test:docker:release-upgrade-user-journey` 默认安装 `openclaw@latest`，在已发布包上配置 provider/plugin/ClickClack 状态，升级到候选 tarball，然后重新运行核心 agent/plugin/channel 旅程。可通过 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- 发布插件市场 smoke：`pnpm test:docker:release-plugin-marketplace` 从本地 fixture marketplace 安装，更新已安装插件，卸载它，并验证插件 CLI 随安装元数据被清理而消失。
- 技能安装 smoke：`pnpm test:docker:skill-install` 会在 Docker 中全局安装打包好的 OpenClaw tarball，禁用配置中的上传归档安装，从搜索中解析当前 live ClawHub 技能 slug，用 `openclaw skills install` 安装它，并验证已安装技能以及 `.clawhub` 来源/锁定元数据。
- 更新通道切换 smoke：`pnpm test:docker:update-channel-switch` 会在 Docker 中全局安装打包好的 OpenClaw tarball，从 package `stable` 切换到 git `dev`，验证持久化通道和更新后插件工作，然后切回 package `stable` 并检查更新状态。
- 升级幸存者 smoke：`pnpm test:docker:upgrade-survivor` 会在一个带有 agents、通道配置、插件 allowlist、陈旧插件依赖状态以及现有 workspace/session 文件的脏旧用户 fixture 上安装打包好的 OpenClaw tarball。在没有 live provider 或通道密钥的情况下执行 package update 和非交互 doctor，然后启动回环 Gateway，并检查配置/状态保留以及启动/状态预算。
- 已发布升级幸存者 smoke：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，播种真实感较强的现有用户文件，用 baked command recipe 配置该基线，验证生成的配置，将该已发布安装更新到候选 tarball，运行非交互 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway 并检查已配置意图、状态保留、启动、`/healthz`、`/readyz` 和 RPC 状态预算。可使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，要求聚合调度器用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 展开精确本地基线，例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`，并用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 展开问题形状的 fixture，例如 `reported-issues`；`reported-issues` 集合包括 `configured-plugin-installs`，用于自动修复外部 OpenClaw 插件安装。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的元基线标记，而 Full Release Validation 会将 release-soak package gate 展开为 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 会话运行时上下文 smoke：`pnpm test:docker:session-runtime-context` 验证隐藏运行时上下文转录持久化，以及 doctor 对受影响的重复 prompt-rewrite 分支的修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 会打包当前树，在隔离 home 中使用 `bun install -g` 安装，并验证 `openclaw infer image providers --json` 返回的是内置 image providers，而不是挂起。可用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过宿主机构建，或通过 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从已构建的 Docker 镜像复制 `dist/`。
- 安装器 Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之间共享一个 npm cache。Update smoke 默认以 npm `latest` 作为稳定基线，然后升级到候选 tarball。可在本地通过 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或在 GitHub 的 Install Smoke workflow 中通过 `update_baseline_version` 输入覆盖。非 root 安装器检查会保持隔离的 npm cache，以免 root 拥有的缓存条目掩盖用户本地安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 可在本地重跑之间复用 root/update/direct-npm 缓存。
- Install Smoke CI 会通过 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当你需要 direct `npm install -g` 覆盖时，请在本地不加该环境变量运行脚本。
- agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 镜像，在隔离的容器 home 中播种两个 agents 和一个 workspace，运行 `agents delete --json`，并验证有效 JSON 以及保留 workspace 的行为。可用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用 install-smoke 镜像。
- Gateway 网络（两个容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照 smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）会构建源 E2E 镜像和 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖链接 URL、光标提升的可点击项、iframe refs 和 frame 元数据。
- OpenAI Responses web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 Gateway 运行一个模拟的 OpenAI 服务器，验证 `web_search` 会将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制 provider schema 拒绝并检查原始细节是否出现在 Gateway 日志中。
- MCP 通道桥（带种子的 Gateway + stdio bridge + 原始 Claude 通知帧 smoke）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi bundle MCP 工具（真实 stdio MCP 服务器 + 内嵌 Pi profile allow/deny smoke）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP 清理（真实 Gateway + 在隔离 cron 和一次性 subagent 运行后进行 stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（本地路径、`file:`、带 hoisted 依赖的 npm registry、损坏的 npm 包元数据、git 移动 refs、ClawHub 大杂烩、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新 smoke）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可跳过 ClawHub 区块，或通过 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的 kitchen-sink package/runtime 配对。若没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，测试将使用一个 hermetic 的本地 ClawHub fixture server。
- 插件更新未变更 smoke：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 插件生命周期矩阵 smoke：`pnpm test:docker:plugin-lifecycle-matrix` 会在裸容器中安装打包好的 OpenClaw tarball，安装一个 npm 插件，切换启用/禁用，通过本地 npm registry 升级和降级它，删除已安装代码，然后验证卸载仍会移除陈旧状态，同时为每个生命周期阶段记录 RSS/CPU 指标。
- 配置重载元数据 smoke：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 覆盖本地路径、`file:`、带 hoisted 依赖的 npm registry、git 移动 refs、ClawHub fixture、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新 smoke。`pnpm test:docker:plugin-update` 覆盖已安装插件的未变更新行为。`pnpm test:docker:plugin-lifecycle-matrix` 覆盖资源跟踪的 npm 插件安装、启用、禁用、升级、降级以及缺失代码卸载。

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

像 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 这样的套件专用镜像覆盖在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像本地尚不存在，脚本会拉取它。QR 和安装器 Docker 测试保留各自的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的已构建应用运行时。

The live-model Docker runners also bind-mount the current checkout read-only
and stage it into a temporary workdir inside the container. This keeps the
runtime image slim while still running Vitest against your exact local
source/config. The staging step skips large local-only caches and app build
outputs such as `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, and
app-local `.build` or Gradle output directories so Docker live runs do not
spend minutes copying machine-specific artifacts. They also set
`OPENCLAW_SKIP_CHANNELS=1` so gateway live probes do not start real
Telegram/Discord/etc. channel workers inside the container.
`test:docker:live-models` still runs `pnpm test:live`, so pass through
`OPENCLAW_LIVE_GATEWAY_*` as well when you need to narrow or exclude gateway
live coverage from that Docker lane.

`test:docker:openwebui` is a higher-level compatibility smoke: it starts an
OpenClaw gateway container with the OpenAI-compatible HTTP endpoints enabled,
starts a pinned Open WebUI container against that gateway, signs in through
Open WebUI, verifies `/api/models` exposes `openclaw/default`, then sends a
real chat request through Open WebUI's `/api/chat/completions` proxy. Set
`OPENWEBUI_SMOKE_MODE=models` for release-path CI checks that should stop
after Open WebUI sign-in and model discovery, without waiting on a live model
completion. The first run can be noticeably slower because Docker may need to
pull the Open WebUI image and Open WebUI may need to finish its own
cold-start setup. This lane expects a usable live model key, provided through
the process environment, staged auth profiles, or an explicit
`OPENCLAW_PROFILE_FILE`. Successful runs print a small JSON payload like
`{ "ok": true, "model": "openclaw/default", ... }`.

`test:docker:mcp-channels` is intentionally deterministic and does not need a
real Telegram, Discord, or iMessage account. It boots a seeded Gateway
container, starts a second container that spawns `openclaw mcp serve`, then
verifies routed conversation discovery, transcript reads, attachment
metadata, live event queue behavior, outbound send routing, and Claude-style
channel + permission notifications over the real stdio MCP bridge. The
notification check inspects the raw stdio MCP frames directly so the smoke
validates what the bridge actually emits, not just what a specific client SDK
happens to surface.

`test:docker:agent-bundle-mcp-tools` is deterministic and does not need a
live model key. It builds the repo Docker image, starts a real stdio MCP
probe server inside the container, materializes that server through the
embedded OpenClaw bundle MCP runtime, executes the tool, then verifies
`coding` and `messaging` keep `bundle-mcp` tools while `minimal` and
`tools.deny: ["bundle-mcp"]` filter them.

`test:docker:cron-mcp-cleanup` is deterministic and does not need a live
model key. It starts a seeded Gateway with a real stdio MCP probe server,
runs an isolated cron turn and a `sessions_spawn` one-shot child turn, then
verifies the MCP child process exits after each run.

手动 ACP 纯语言线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留这个脚本用于回归/调试工作流。它将来可能还需要用于 ACP 线程路由验证，所以不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...` (default: `~/.openclaw`) mounted to `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (default: `~/.openclaw/workspace`) mounted to `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` mounted and sourced before running tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` to verify only env vars sourced from `OPENCLAW_PROFILE_FILE`, using temporary config/workspace dirs and no external CLI auth mounts
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (default: `~/.cache/openclaw/docker-cli-tools`, unless the run already uses a CI/managed bind dir) mounted to `/home/node/.npm-global` for cached CLI installs inside Docker
- External CLI auth dirs/files under `$HOME` are mounted read-only under `/host-auth...`, then copied into `/home/node/...` before tests start
  - Default dirs (used when the run is not narrowed to specific providers): `.factory`, `.gemini`, `.minimax`
  - Default files: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Narrowed provider runs mount only the needed dirs/files inferred from `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Override manually with `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, or a comma list like `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` to narrow the run
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` to filter providers in-container
- `OPENCLAW_SKIP_DOCKER_BUILD=1` to reuse an existing `openclaw:local-live` image for reruns that do not need a rebuild
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to ensure creds come from the profile store (not env)
- `OPENCLAW_OPENWEBUI_MODEL=...` to choose the model exposed by the gateway for the Open WebUI smoke
- `OPENCLAW_OPENWEBUI_PROMPT=...` to override the nonce-check prompt used by the Open WebUI smoke
- `OPENWEBUI_IMAGE=...` to override the pinned Open WebUI image tag

## 文档检查

在修改文档后运行文档检查：`pnpm check:docs`。
当你还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是没有真实提供方的“真实流水线”回归：

- 网关工具调用（模拟 OpenAI，真实网关 + agent 循环）：`src/gateway/gateway.test.ts`（用例："通过网关 agent 循环端到端运行模拟 OpenAI 工具调用"）
- 网关向导（WebSocket `wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts`（用例："通过 WebSocket 运行向导并写入 auth token 配置"）

## Agent 可靠性评估（技能）

我们已经有一些 CI 安全的测试，它们的行为类似于“agent 可靠性评估”：

- 通过真实网关 + agent 循环的模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，用于验证会话接线和配置效果（`src/gateway/gateway.test.ts`）。

目前在技能方面仍缺少的内容（见 [Skills](/tools/skills)）：

- **决策能力：** 当提示中列出技能时，agent 是否会选择正确的技能（或避开不相关的技能）？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循所需步骤/参数？
- **工作流契约：** 多轮场景，断言工具调用顺序、会话历史延续以及沙箱边界。

未来的评估应首先保持确定性：

- 使用带 mock 提供方的场景运行器，用于断言工具调用 + 顺序、技能文件读取以及会话接线。
- 一小套聚焦技能的场景（使用 vs 避免、门控、提示注入）。
- 可选的在线评估（按需启用，受环境变量控制）仅在 CI 安全套件就位后再启用。

## 契约测试（插件和通道形状）

Contract tests verify that every registered plugin and channel conforms to
its interface contract. They iterate over all discovered plugins and run a
suite of shape and behavior assertions. The default `pnpm test` unit lane
intentionally skips these shared seam and smoke files; run the contract
commands explicitly when you touch shared channel or provider surfaces.

### 命令

- 所有契约：`pnpm test:contracts`
- 仅通道契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### 通道契约

Located in `src/channels/plugins/contracts/*.contract.test.ts`. Current
top-level categories:

- **channel-catalog** - bundled/registry channel catalog entry metadata
- **plugin** (registry-backed, sharded) - basic plugin registration shape
- **surfaces-only** (registry-backed, sharded) - per-surface shape checks for `actions`, `setup`, `status`, `outbound`, `messaging`, `threading`, `directory`, and `gateway`
- **session-binding** (registry-backed) - session binding behavior
- **outbound-payload** - message payload structure and normalization
- **group-policy** (fallback) - default group policy enforcement per channel
- **threading** (registry-backed, sharded) - thread id handling
- **directory** (registry-backed, sharded) - directory/roster API
- **registry** and **plugins-core.\*** - channel plugin registry, loader, and config-write authorization internals

Inbound dispatch-capture and outbound-payload harness helpers used by these
suites are exposed internally through `src/plugin-sdk/channel-contract-testing.ts`
(npm-excluded, not a public SDK subpath); there is no standalone
`inbound.contract.test.ts` file in this directory.

### 提供方契约

Located in `src/plugins/contracts/*.contract.test.ts`. Current categories
include:

- **shape** - plugin manifest, API, and runtime export shape
- **plugin-registration** (+ parallel) - manifest registration cases
- **package-manifest** - package manifest requirements
- **loader** - plugin loader setup/teardown behavior
- **registry** - plugin contract registry contents and lookup
- **providers** - shared provider behavior across bundled providers, plus web-search providers
- **auth-choice** - auth choice metadata and setup behavior
- **provider-catalog-deprecation** - deprecated provider catalog metadata
- **wizard.choice-resolution**, **wizard.model-picker**, **wizard.setup-options** - provider setup wizard contracts
- **embedding-provider**, **memory-embedding-provider**, **web-fetch-provider**, **tts** - capability-specific provider contracts
- **session-actions**, **session-attachments**, **session-entry-projection** - plugin-owned session state contracts
- **scheduled-turns** - plugin scheduled turn metadata and timestamp bounds
- **host-hooks**, **run-context-lifecycle**, **runtime-import-side-effects**, **runtime-seams** - plugin host/runtime lifecycle and import-boundary contracts
- **extension-runtime-dependencies** - runtime dependency placement for extensions

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改通道或提供方插件之后
- 在重构插件注册或发现逻辑之后

契约测试在 CI 中运行，不需要真实 API key。

## 添加回归测试（指南）

当你修复了线上发现的 provider/model 问题时：

- Add a CI-safe regression if possible (mock/stub provider, or capture the exact request-shape transformation)
- If it's inherently live-only (rate limits, auth policies), keep the live test narrow and opt-in via env vars
- Prefer targeting the smallest layer that catches the bug:
  - provider request conversion/replay bug -> direct models test
  - gateway session/history/tool pipeline bug -> gateway live smoke or CI-safe gateway mock test
- SecretRef traversal guardrail:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` derives one sampled target per SecretRef class from registry metadata (`listSecretTargetRegistryEntries()`), then asserts traversal-segment exec ids are rejected.
  - If you add a new `includeInPlan` SecretRef target family in `src/secrets/target-registry-data.ts`, update `classifyTargetClass` in that test. The test intentionally fails on unclassified target ids so new classes cannot be skipped silently.

## 相关

- [Testing live](/help/testing-live)
- [Testing updates and plugins](/help/testing-updates-plugins)
- [CI](/ci)
