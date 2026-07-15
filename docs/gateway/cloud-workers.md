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

放置状态通过一个持久化状态机流转（`local → requested → provisioning → syncing → starting → active`），因此 Gateway 在调度中途重启时会进行协调恢复，而不会泄漏机器。v1 中的调度是单向的：目前还没有 pull-back RPC。如果某个 worker 回合失败，只会导致该回合失败，并保持当前激活放置可供重试；而生命周期失败则会将放置状态转为 error 或 reclaimed，并保留其诊断尾部日志。

## 安全模型

- **Closed worker ingress.** 工作者通过隧道套接字上的专用协议通信，并使用关闭式方法允许列表——worker 不能调用 operator RPC。
- **Minted credentials, hashed at rest.** 每次派发都会签发一个 worker 凭证；Gateway 仅存储其哈希值。凭证轮换和 owner-epoch 防护保证每个会话至多只有一个存活的 owner——重新连接的过期 worker 会被防护拦截，绝不会合并。
- **Host-key pinning.** 提供方必须在 provisioning 时公开该机器的 SSH host key；bootstrap 会使用严格的 pinning 进行连接，并在缺失时以 fail closed 方式失败。
- **No standing model, forge, or cloud credentials on the box.** 模型认证保留在 Gateway 上（推理通过 `{provider, model}` 引用传递），workspace git 提交在不使用 forge 凭证的情况下生成，且 Crabbox AWS lease 元数据会在 setup 前权威性检查该实例是否具有 role。setup 命令也要保持无凭证。
- **Provider-owned egress.** 反向隧道消除了 OpenClaw 对直接访问模型的需求，但 OpenClaw 不会重写提供方防火墙。若任务需要，请在 worker 提供方中限制出站流量。
- **Durable, exactly-once transcripts.** worker 通过针对会话叶子节点的 compare-and-swap 协议提交 transcript 批次；过期的 base 会使运行 fail-stop，而不是重复或重新基于已付费输出进行 rebase。

## 故障排查

- **`sessions.dispatch` is an unknown method** — 未配置 `cloudWorkers.profiles`，或者调用者缺少 `operator.admin`。
- **"Cloud worker turns require the OpenClaw runtime"** — 请选择配置运行时为 OpenClaw 的模型。像 `claude-cli` 这样的外部 CLI 运行时不支持 worker 推理。
- **"Worker bootstrap requires Node.js on the leased host"** — 在 `settings.setup` 中添加 Node 安装（见上文）。
- **AWS instance-role attestation fails** — 清空 `aws.instanceProfile`（如果设置了 `CRABBOX_AWS_INSTANCE_PROFILE`，也一并清空）。安装 Crabbox 0.38.1 或更新版本；旧版二进制文件不会暴露 AWS 准入所需的权威 `providerMetadata.instanceProfileAttached` 合同。
- **Dispatch fails with a provider error** — placement 记录和 `environments.list` 会保留最后一次错误，包括 setup/bootstrap 的 stderr 尾部输出。失败时 box 会被销毁，因此该尾部输出是主要的取证依据。
- **Client timeout while dispatching** — `openclaw gateway call` 默认超时时间为 10 秒；请酌情传入更大的 `--timeout`（无论如何，dispatch 都会继续在服务端运行，且在 provisioning 期间重试会被拒绝并提示 `session cannot dispatch from placement provisioning`）。
- **Lease housekeeping** — `crabbox list --provider <backend>` 会显示当前活跃的租约；`crabbox stop --provider <backend> --id <lease>` 可手动释放一个租约。空闲租约会在 profile 的 `idleTimeout` 到期后失效。

## 相关

- [沙箱化](/gateway/sandboxing) — 减少本地工具执行的影响范围
- [Sessions CLI](/cli/sessions) — 检查已存储的会话
- [配置参考](/gateway/configuration-reference)
