---
summary: "将会话分派到一次性云机器：预配、worker 运行时、代理推理和流式结果"
title: "Cloud Workers"
sidebarTitle: "Cloud Workers"
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

除了 `sshd` 之外，盒子不需要任何入站端口，出站也只需你在设置命令中使用的那些连接：Gateway 通过 SSH 连接出去，反向隧道则将 worker 的 WebSocket 回传。无需 Tailscale 或 VPN。

## 要求

- 一个 worker 提供程序插件。内置的 `crabbox` 插件驱动 [Crabbox](https://github.com/openclaw/crabbox) CLI，它在云后端（AWS、Hetzner 等）之间协调租约。`crabbox` 二进制文件必须位于 `PATH` 中（或设置 `settings.binary`），并且已预先配置好提供程序凭据。
- 租用机器上需要有 Node.js。裸机云镜像通常没有它——请在 profile 的 `setup` 命令中安装它。
- 一个带有会话拥有的托管工作树的会话（使用 `worktree: true` 创建一个）。Dispatch 会移动该工作树的内容；普通目录则作为清单镜像进行同步。

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

| 键          | 含义                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | 由插件注册的 Worker 提供方 id（捆绑插件为 `crabbox`）。                                                                                                                              |
| `install`  | `bundle`（默认）会打包当前运行的 Gateway 构建；`npm` 会安装精确发布的 Gateway 版本，并固定完整性校验。`npm` 要求 Gateway 以打包发布版本运行。                                                |
| `settings` | 由提供方拥有的 JSON。对于 crabbox：`provider`（后端）、`class`（机器类型）、`ttl`、`idleTimeout`（Go 持续时间），可选的 `setup` 和绝对路径 `binary`。                                   |
| `lifetime` | 可选的已存储策略（`idleTimeoutMinutes`、`maxLifetimeMinutes`）。                                                                                                                      |

### setup 命令

`settings.setup` 会在租用的机器上运行，前提是该机器已可通过 SSH 连接，并且在 OpenClaw 安装之前执行。它会在**每次**创建实例时运行（包括在中断的派发之后重新播放时），因此必须具备幂等性——如示例所示，使用 `command -v`/`test -x` 检查来保护安装逻辑。如果 setup 失败，提供方会停止该租约，派发将以关闭方式失败；不会留下半配置好的机器继续运行。

### 安装通道

- **`bundle`** 会打包当前运行的 Gateway 的 `dist`、经过裁剪的 `package.json`，以及构建所引用的任何工作区包，所有内容都由内容哈希覆盖。机器会先用该哈希验证原始 bundle，然后安装生产环境的 npm 依赖（禁用脚本）。这就是你在 worker 上运行开发构建的方式。
- **`npm`** 会证明该发布版确实存在于公共注册表中，固定其 SHA-512 完整性，并安装与 Gateway 完全一致的 `openclaw@<version>`。

## 会话调度

先创建一个带托管工作树的会话，然后将其调度（该 RPC 需要 `operator.admin`，并且仅在已配置 profile 时存在）：

```bash
openclaw gateway call sessions.create \
  --params '{"key":"agent:main:big-refactor","worktree":true,"cwd":"/path/to/repo","worktreeName":"big-refactor"}'

openclaw gateway call sessions.dispatch \
  --timeout 1500000 \
  --params '{"key":"agent:main:big-refactor","profileId":"aws"}'
```

`sessions.dispatch` 会关闭本地回合接纳、清空活跃工作、配置租约、运行设置、引导 OpenClaw、同步工作区，并在放置状态达到 `active` 工作者所有权后返回。首次调度请预留几分钟；在提供商支持的情况下，租约和安装会被缓存。之后，像平常一样与会话交互即可——回合会自动路由到该工作者。

放置会经过一个持久化状态机（`local → requested → provisioning → syncing → starting → active`），因此在调度中途重启 Gateway 会进行一致性恢复，而不会泄漏机器。v1 中调度是单向的：尚无拉回 RPC，且失败的工作者回合会使放置进入 fail-stop 状态，并保留工作者的 stderr 尾部到放置错误中以便诊断。

## 安全模型

- **封闭的 worker 入口。** Worker 在隧道 socket 上使用专用协议通信，并采用封闭的方法允许列表——worker 不能调用 operator RPC。
- **一次签发的凭证，静态存储时哈希化。** 每次派发都会签发一个 worker 凭证；Gateway 只存储其哈希。凭证轮换和 owner-epoch fencing 保证每个会话至多只有一个存活的 owner——重新连接的过期 worker 会被 fencing，不会被合并。
- **主机密钥固定。** 提供方必须在交付时暴露该机器的 SSH 主机密钥；bootstrap 会使用严格固定连接，如果没有该密钥则会安全失败。
- **机器上不存放密钥。** 模型认证保留在 Gateway 上（推理通过 `{provider, model}` 引用传递），而 workspace 的 git 提交在机器上生成，但不使用凭证。
- **持久化、恰好一次的转写记录。** Worker 通过 compare-and-swap 协议将 transcript 批次提交到会话的 leaf；过期的 base 会让运行 fail-stop，而不是重复或重新基于付费输出进行变基。

## 故障排查

- **`sessions.dispatch` 是一个未知方法** — 未配置 `cloudWorkers.profiles`，或者调用者缺少 `operator.admin`。
- **“Worker bootstrap requires Node.js on the leased host”** — 在 `settings.setup` 中添加 Node 安装（见上文）。
- **Dispatch 因 provider 错误而失败** — placement 记录和 `environments.list` 会保留最后一次错误，包括 setup/bootstrap 的 stderr 尾部。失败时 boxes 会被销毁，因此该尾部信息是主要取证依据。
- **Dispatch 时客户端超时** — `openclaw gateway call` 默认超时时间为 10s；请宽裕地传入 `--timeout`（无论如何，dispatch 都会继续在服务端运行，而在 provisioning 期间重试会被拒绝，并提示 `session cannot dispatch from placement provisioning`）。
- **Lease 维护** — `crabbox list --provider <backend>` 会显示当前存活的 lease；`crabbox stop --provider <backend> --id <lease>` 可手动释放一个。空闲 lease 会在配置文件的 `idleTimeout` 到期。

## 相关

- [沙箱化](/gateway/sandboxing) — 减少本地工具执行的影响范围
- [Sessions CLI](/cli/sessions) — 检查已存储的会话
- [配置参考](/gateway/configuration-reference)
