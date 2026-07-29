---
summary: "将会话分派到一次性云机器：预配、worker 运行时、代理推理和流式结果"
title: "云工作器"
sidebarTitle: "云工作器"
read_when: "当你希望代理会话在临时云机器上运行，而不是在 Gateway 主机上运行，或者你正在配置 cloudWorkers 配置文件时。"
status: active
---

Cloud workers 允许会话在一次性云机器上运行其 agent 循环，而会话的其他一切仍保留在原处：在侧边栏中可见、实时流式传输，并且转录内容由 Gateway 持有。Gateway 会租用一台机器，在其上安装固定版本的 OpenClaw，将会话的工作区同步过去，并将轮转循环交给一个受限制的 `openclaw worker` 进程。模型调用会通过 Gateway 代理返回，因此提供方凭据不会离开你的机器，而且由于提供方看到的是一条连续的流，提示缓存仍然有效。

当工作完成时（或者机器宕机时），这台机器就会被丢弃。持久状态——转录、工作区提交、放置记录——都保留在 Gateway 中。

<Note>
Cloud workers 是可选启用的，在你配置 profile 之前是不可见的。未配置的安装不会看到任何新的 RPC、配置或 UI。
</Note>

## 运行位置说明

| 关注点                                                 | 位置                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Agent 循环 + 工具（`exec`、`read`、`write`、`edit`、…） | 云端 worker 盒子                                                                  |
| 模型推理和提供方凭据                                     | Gateway（由 `{provider, model}` 引用代理）                                        |
| 转录内容（持久化，会话存储）                               | Gateway                                                                          |
| 实时流式推送到侧边栏                                       | Gateway 分发，由 worker 的可回放事件流提供数据                                     |
| 工作区 git 历史                                           | 在盒子上无凭据地创建；Gateway 接管提交并负责 push/PR                                |

该盒子除了 `sshd` 之外不需要任何入站端口：Gateway 通过固定的 SSH 连接发起外连，反向隧道将 worker 的 WebSocket 回传。捆绑的 Crabbox provider 强制使用公共 SSH 路由，并禁用托管的 Tailscale 注册。出站互联网访问由 provider 策略决定；默认的 AWS 配置文件可以访问互联网，除非你限制其网络或安全组。

## 要求

- 一个 worker provider 插件。捆绑的 `crabbox` 插件驱动 [Crabbox](https://github.com/openclaw/crabbox) CLI，该 CLI 在云后端（AWS、Hetzner 等）之间协调租约。`crabbox` 二进制文件必须在 `PATH` 上（或设置 `settings.binary`），并且已预先配置好提供商凭据。AWS 接入要求 Crabbox 0.38.1 或更高版本。
- 对于 Crabbox AWS worker，实际生效的 `aws.instanceProfile` 必须为空。提供商会在分配前检查 `crabbox config show --json`，然后要求 `crabbox inspect --json` 从 EC2 `DescribeInstances` 报告 `providerMetadata.instanceProfileAttached: false`。带有实例角色或缺少权威元数据的租约将被停止并拒绝。
- 被租用机器上需要有 Node.js。裸云镜像通常没有它——请在 profile 的 `setup` 命令中安装它。
- 一个带有 session-owned managed worktree 的 session（使用 `worktree: true` 创建一个）。Dispatch 会移动该 worktree 的内容；普通目录则作为 manifest 镜像进行同步。

## 配置

在 `openclaw.json` 中的 `cloudWorkers.profiles` 下添加一个配置文件：

```json
{
  "cloudWorkers": {
    "profiles": {
      "aws": {
        "provider": "crabbox",
        "install": "bundle",
        "settings": {
          "provider": "aws",
          "class": "standard",
          "ttl": "8h",
          "idleTimeout": "45m",
          "setup": "test -x /usr/bin/node || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs)"
        }
      }
    }
  }
}
```

配置文件字段：

| Key        | 含义                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | 由插件注册的 Worker 提供方 id（捆绑插件为 `crabbox`）。                                                                                                                                                                                       |
| `install`  | `bundle`（默认）会打包正在运行的 Gateway 构建；`npm` 会安装带有固定完整性校验的、精确发布的 Gateway 版本。`npm` 要求 Gateway 以打包发布版运行。                                                                                               |
| `settings` | 提供方拥有的 JSON。对于 crabbox：`provider`（后端）、`class`（机器类型）、`ttl`、`idleTimeout`（Go 持续时间），可选的 `setup` 和绝对路径 `binary`。OpenClaw 会强制使用公有 SSH，并为这些租约禁用托管的 Tailscale。 |
| `lifetime` | 可选的已存储策略（`idleTimeoutMinutes`、`maxLifetimeMinutes`）。                                                                                                                                                                              |

### setup 命令

`settings.setup` 会在租用的机器上运行，前提是该机器已可通过 SSH 连接，并且在 OpenClaw 安装之前执行。它会在**每次**创建实例时运行（包括在中断的派发之后重新播放时），因此必须具备幂等性——如示例所示，使用 `command -v`/`test -x` 检查来保护安装逻辑。如果 setup 失败，提供方会停止该租约，派发将以关闭方式失败；不会留下半配置好的机器继续运行。

### 安装通道

- **`bundle`** 会打包当前运行的 Gateway 的 `dist`、经过裁剪的 `package.json`，以及构建所引用的任何工作区包，所有内容都由内容哈希覆盖。机器会先用该哈希验证原始 bundle，然后安装生产环境的 npm 依赖（禁用脚本）。这就是你在 worker 上运行开发构建的方式。
- **`npm`** 会证明该发布版确实存在于公共注册表中，固定其 SHA-512 完整性，并安装与 Gateway 完全一致的 `openclaw@<version>`。

## 会话调度

在 Control UI 中，打开 **New Session**，选择一个配置运行时为 OpenClaw 的 agent，从 **Where** 菜单中选择一个已配置的 **Cloud · profile** 目标，然后启动任务。选择 Cloud 会自动启用所需的 managed worktree；Gateway 会创建会话，完成分发，然后才发送第一个回合。会话侧边栏中的 server 徽标会显示持久化的放置状态。对于外部 CLI 会话目录，不提供 Cloud 目标。

等效的 RPC 流程是：

创建一个带有 managed worktree 的会话，然后分发它（该 RPC 需要 `operator.admin`，并且仅在已配置 profiles 时存在）：

Cloud workers 运行 OpenClaw agent runtime。请选择一个 `openai/*` 或其他会解析到该 runtime 的模型；配置为外部 CLI runtime（例如 `claude-cli`）的会话无法分发。

```bash
openclaw gateway call sessions.create \
  --params '{"key":"agent:main:big-refactor","worktree":true,"cwd":"/path/to/repo","worktreeName":"big-refactor"}'

openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:big-refactor","profileId":"aws"}'
```

`sessions.dispatch` 会关闭本地回合接纳、清空活跃工作、配置租约、运行设置、引导 OpenClaw、同步工作区，并在放置状态达到 `active` 工作者所有权后返回。首次调度请预留几分钟；在提供商支持的情况下，租约和安装会被缓存。之后，像平常一样与会话交互即可——回合会自动路由到该工作者。

Completed worker turns reconcile eligible, size-bounded workspace files back into the session's managed worktree before the turn claim is released. The terminal worker event creates a durable pending-result fence before it is acknowledged. The Gateway then stages the complete cloud result as a Git ref under `refs/openclaw/worker-results/` before applying it, so the cloud version remains recoverable even if the Gateway stops during the apply. Workspace results use Git file semantics: regular files, executable bits, symlinks, additions, changes, and deletions are retained, while empty directories and other directory modes are not. The resulting file changes remain in the managed worktree for normal review and commit.

Apply uses the dispatch-time manifest as the merge base. Cloud-only changes are applied, local-only changes stay in place, and paths changed on both sides use a three-way keep-local policy. A conflicted turn still finishes: the transcript reports the bounded path summary and staged result ref, the placement exposes the same conflict for the Control UI, and non-conflicting cloud changes remain applied. The notice includes `git show <ref>:<path>` to inspect a present cloud file and a top-level literal-pathspec `git checkout <ref> -- <path>` command to take it from any workspace directory. Run the commands in Bash or zsh (Git Bash on Windows). If inspect says the path does not exist, the cloud result deleted it; verify and remove the retained local path manually. If checkout reports a file/directory obstruction, move or remove the blocking local path and retry. If the staged ref itself is gone, treat the notice as stale and do not change the local path. Conflicted staged refs remain available after the normal turn fence is released; a later clean result clears the notice and retires the old ref, while explicit fence removal is the final cleanup boundary.

While a fenced result is still reconciling, a new turn waits up to 15 seconds for the prior claim to release. If it is still busy, the turn fails with an actionable “previous cloud turn's workspace result is still reconciling” message and can be retried shortly. On restart, recovery discovers pending and staged results before stale-claim cleanup, completes or retries their local apply, and reclaims dead environments only after preserving the result. The bounded SQLite rollback journal makes an interrupted filesystem apply recoverable without replaying already accepted mutations.

When the work is complete and no turn is running, open the session menu and choose **Stop cloud worker…**. The Gateway performs one final workspace reconciliation before it destroys the environment. A placement already in `draining` or `reconciling` is finishing teardown; wait for its badge to become `reclaimed` before deleting the session.

For a broken or runaway attached worker, an operator can call `environments.destroy` with `{ "force": true }` as a last resort. Forced teardown durably marks the placement failed and abandons any unreconciled remote result before destroying the environment.

The equivalent administrative RPC is:

```bash
openclaw gateway call sessions.reclaim \
  --timeout 600000 \
  --params '{"key":"agent:main:big-refactor"}'
```

Placement moves through a durable state machine (`local → requested → provisioning → syncing → starting → active`), so a Gateway restart mid-dispatch reconciles instead of leaking machines. A failed model turn keeps the active placement available for a retry. Workspace path conflicts keep the local version, apply the rest of the cloud result, and preserve the staged cloud ref for inspection; other reconciliation or lifecycle failures retain their durable recovery fence and diagnostic tail until recovery can safely retry or reclaim the environment.

## 安全模型

- **Closed worker ingress.** Workers speak a dedicated protocol on the tunneled socket with a closed method allowlist — a worker cannot call operator RPCs.
- **Gateway-owned tool authority.** Before every turn, the Gateway projects current profile, provider, agent, group, sender, sandbox, delegation, inherited, and runtime-cap policy over the worker's fixed coding-tool catalog. The launch envelope carries only that final closed-vocabulary subset. Explicitly capped scheduled turns reuse their trusted owner-group context without sending that identity to the box or reapplying a fresh sender overlay. Tools outside the worker catalog remain unavailable; an empty result runs with no tools.
- **Minted credentials, hashed at rest.** Each dispatch mints a worker credential; the Gateway stores only its hash. Credential rotation and owner-epoch fencing guarantee at most one live owner per session — a stale worker that reconnects is fenced, never merged.
- **Host-key pinning.** The provider must surface the box's SSH host key at provision time; bootstrap connects with strict pinning and fails closed without it.
- **No standing model, forge, or cloud credentials on the box.** Model auth stays on the Gateway (inference travels by `{provider, model}` reference), workspace git commits are authored without forge credentials, and Crabbox AWS lease metadata is checked authoritatively for an instance role before setup. Keep setup commands credential-free too.
- **Provider-owned egress.** The reverse tunnel removes any OpenClaw need for direct model access, but OpenClaw does not rewrite provider firewalls. Restrict outbound traffic in the worker provider when the task requires it.
- **Durable, exactly-once transcripts.** The worker commits transcript batches through a compare-and-swap protocol against the session's leaf; a stale base fail-stops the run instead of duplicating or rebasing paid output.

## 故障排查

- **`sessions.dispatch` is an unknown method** — no `cloudWorkers.profiles` are configured, or the caller lacks `operator.admin`.
- **"Cloud worker turns require the OpenClaw runtime"** — choose a model whose configured runtime is OpenClaw. External CLI runtimes such as `claude-cli` do not support worker inference.
- **"Worker bootstrap requires Node.js on the leased host"** — add a Node install to `settings.setup` (see above).
- **AWS instance-role attestation fails** — clear `aws.instanceProfile` (and `CRABBOX_AWS_INSTANCE_PROFILE`, if set). Install Crabbox 0.38.1 or newer; older binaries do not expose the authoritative `providerMetadata.instanceProfileAttached` contract required for AWS admission.
- **Dispatch fails with a provider error** — the placement record and `environments.list` keep the last error, including the setup/bootstrap stderr tail. Boxes are destroyed on failure, so that tail is the primary forensic.
- **Client timeout while dispatching** — `openclaw gateway call` defaults to a 10s timeout; pass `--timeout` generously (dispatch keeps running server-side either way, and a retry while provisioning is rejected with `session cannot dispatch from placement provisioning`).
- **Worker reclaimed after upgrading from a 2026.7.2 beta** — those betas used the older worker launch contract. On restart, OpenClaw destroys an idle incompatible worker, keeps the session and workspace, marks the placement reclaimed, and provisions a current worker on the next dispatch or turn. A beta worker interrupted while still starting is marked failed after cleanup; retry the dispatch to provision it with the current contract.
- **Cloud workspace conflict notice** — the turn completed and kept the local version of each listed path. Use the staged-ref commands in the notice to inspect or take the cloud version; no retry is required for the non-conflicting changes, which are already applied.
- **“The previous cloud turn's workspace result is still reconciling”** — the Gateway waited briefly for the prior result's durable fence and could not acquire the session claim. Wait for reconciliation to finish, then retry the turn; restarting the Gateway is safe because recovery preserves staged results before reclaiming a dead worker.
- **Lease housekeeping** — `crabbox list --provider <backend>` shows live leases; `crabbox stop --provider <backend> --id <lease>` releases one manually. Idle leases expire on the profile's `idleTimeout`.

## 相关

- [沙箱化](/gateway/sandboxing) — 减少本地工具执行的影响范围
- [Sessions CLI](/cli/sessions) — 检查已存储的会话
- [配置参考](/gateway/configuration-reference)
