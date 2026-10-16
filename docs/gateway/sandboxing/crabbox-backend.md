---
summary: "Crabbox 租赁机器上的工具调用隔离，具有固定的运行时身份和存储库拥有的执行"
title: "蟹盒后端"
read_when: "您希望在一次性云计算机上执行沙盒工具，同时网关和代理循环保留在本地。"
---

在 Crabbox 租用的机器上运行沙盒工具。 OpenClaw 管理远程工作空间和文件系统桥； Crabbox 拥有提供者访问、执行和租赁清理的权利。

## <a id="crabbox-backend"></a> Crabbox后端

最初的支持是直接代托纳租赁。需要 Crabbox 0.77.0 或更新版本，包括固定租约恢复、存储库拥有的 `exec` 和 `stop --current-repo`。当所选可执行文件丢失或过时时，OpenClaw 准备经过验证的托管发行版，保留操作员的二进制文件和配置； `openclaw doctor --fix` 也准备了配置的沙箱。在网关主机上验证 Crabbox for Daytona，然后检查将拥有该沙箱的工作区的支持：

```bash
crabbox exec --check --provider daytona
```

此离线检查必须报告 `execution: true` 和 `currentRepoStop: true`。 OpenClaw 在提供程序分配之前执行相同的功能检查，并在缺少任一功能时报告升级或不支持的提供程序错误。仅固定租约 ID 是不够的；当 Crabbox 宣传这两种功能时，其他提供商就可以使用。

使用 `backend: "crabbox"` 在 [Crabbox](https://github.com/openclaw/crabbox) 为沙箱范围租用的一次性计算机上运行 `exec`、文件工具和媒体读取。网关、代理循环、通道和模型凭据保留在主机上。这是个人网关的选项，应将其设置保留在本地，但不得在主机上运行模型生成的命令，并且不能或不应运行 Docker。要将整个会话移出主机，请使用 [cloud 工作人员](/gateway/cloud-workers)。

在配置开始之前，沙箱注册表会为每个范围保留一个固定的 Crabbox 租约 ID。并发首次使用共享该预留，并且配置失败或网关重新启动会重播相同的 ID，而不是分配另一台计算机。即使后来的调用者使用不同的本地工作区，共享范围也会保留原始所属工作区。本机停止或存档的计算机恢复，其远程工作空间完好无损。共享远程 shell 后端将初始工作区和任何单独的代理工作区上传到临时同级目录中，然后以原子方式发布完整的树。中断的上传重试而不采用部分树，并且现有的远程工作空间仍然是事实的来源。

每个远程命令、文件操作、上传和 staged-exec 清理都会运行`crabbox exec --id <lease-id> -- ...`从原始工作区。 Crabbox 每次执行时都会检查并保留其当前的存储库声明；OpenClaw不导出或缓存租约SSH证书。在索赔转移之前准备的命令在启动时仍必须通过 Crabbox 准入。偏僻的PTY请求使用`--pty`，而本地 Crabbox 进程保留管道输入。

`openclaw sandbox recreate` 与 `crabbox stop --current-repo --id <lease-id>` 一起释放租约。 Crabbox 拒绝释放其声明已转移到另一个存储库的租约。释放成功后，下次使用会预留新的ID并配置新机器。失败的清理仍会记录下来以供重试，并且新的配置会等待删除完成。如果在 Crabbox 记录声明之前配置失败，则重新创建会在释放之前从其原始工作区重播保留的 ID。这可以短暂配置并立即释放未使用的机器；它避免丢弃不确定的分配。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "crabbox",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      crabbox: {
        enabled: true,
        config: {
          sandbox: {
            provider: "daytona",
            class: "small",
            ttl: "2h",
            idleTimeout: "30m",
          },
        },
      },
    },
  },
}
```

`sandbox` 块注册后端。 `provider`、`class`、`ttl` 和 `idleTimeout` 是可选的，并回退到主机上的 Crabbox 配置。设置 `binary` 以选择特定的 Crabbox 可执行文件；否则，OpenClaw 会发现同级构建或使用 `PATH` 中的 `crabbox`。 `agents.defaults.sandbox.ssh.workspaceRoot` 仍然选择远程根。其他 SSH 设置（包括 `target` 和身份设置）不配置 Crabbox 传输：Crabbox 拥有其私有提供商连接。

提供者凭证由本地 Crabbox 进程继承。它们不会自动复制到远程命令环境中。 OpenClaw 通过同一命令所有者私下暂存请求的远程环境，保留原始文件字节和命令输出。

TTL 是自创建以来的总生命周期；空闲超时是不活动窗口。较早的期限结束租约。省略的值继承主机配置，或 Crabbox 的 30 分钟 TTL 和空闲默认值。政策可能会限制请求。默认最长为四个小时；受信任的直接提供商 `maxTTL` 配置最多可允许 24 小时。 `keep` 不会使沙箱免于过期。该示例的 `2h` / `30m` 是有界多轮请求，而不是持久性保证。

沙箱工具使用 `exec`，而不是 `run`：调用之间没有沙箱范围的心跳或命令自动扩展承诺。 Daytona 在创建时固定了其原生截止日期，因此在分配时选择足够的 TTL。过期或已发布的固定 ID 需要在替换之前通过现有沙箱所有者进行协调或 `openclaw sandbox recreate`。如果Crabbox配置设置了`directLeases: deny`而没有在其信任的`directLeaseAllow`中允许Daytona，则直接分配Daytona不可用；请勿使用其他凭证或提供商绕过该策略。

`openclaw sandbox list`/`recreate`/prune 将 Crabbox 运行时视为其他远程运行时；删除运行时通过存储库范围内的清理释放租约。每个工具调用都会跨网络，因此预计延迟会比 Docker 更高。使用提供程序的空闲和 TTL 设置以及显式清理来管理资源使用情况。现有的租赁检查、访问和清理遵循 Crabbox 的存储提供商声明。要切换提供程序，请在开始使用新提供程序之前重新创建现有沙箱。此后端不支持沙盒浏览器和 `sandbox.docker.binds`。
