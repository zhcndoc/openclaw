---
summary: "用于配置和管理每个租户隔离的 OpenClaw 单元的 CLI 参考"
read_when:
  - 你在一台机器上承载多个租户信任域
  - 你需要创建、检查、升级或移除 fleet 单元
title: "Fleet"
---

# `openclaw fleet`

`openclaw fleet` 用于管理称为 **单元** 的完整 OpenClaw 实例。每个单元都有自己独立的 Gateway、状态、凭据、频道账户、容器，以及仅限回环的主机端口。每个租户信任边界使用一个单元；不要将一个共享 Gateway 用作恶意的多租户边界。

Fleet 是**实验性**功能。命令名称、标志、输出形式以及容器配置文件可能会在不同版本之间更改，而不会提供弃用过渡期。

Fleet 支持 Docker 和 Podman。默认镜像是 `ghcr.io/openclaw/openclaw:latest`。

Fleet 已在 Linux 和 macOS 主机上测试。Windows 主机目前尚未测试。

## 快速开始

```bash
openclaw fleet create acme
openclaw fleet status acme
openclaw fleet list
```

`fleet create` 会将生成的 Gateway token 与 cell URL 一并仅打印一次。请立即保存该 token，然后在该租户的 cell 内配置每个租户的渠道账号。

## 租户 ID

租户 ID 必须匹配：

```text
^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$
```

这允许 1 到 40 个小写字母、数字和内部连字符。ID 必须以字母或数字开头和结尾。不允许大写字母、下划线、斜杠、点、空白字符，以及诸如 `../acme` 之类的路径遍历字符串。

该 ID 会成为容器名称的一部分：`openclaw-cell-<tenant>`。

## `fleet create`

创建一个 cell 并启动它：

```bash
openclaw fleet create acme
```

在固定端口上创建一个 Podman cell，但不启动它：

```bash
openclaw fleet create acme \
  --runtime podman \
  --port 19125 \
  --no-start
```

通过重复使用 `--env` 传递租户特定的环境变量：

```bash
openclaw fleet create acme \
  --env TZ=America/Los_Angeles \
  --env OPENCLAW_DISABLE_BONJOUR=1
```

环境键使用字母、数字和下划线，且不能以数字开头。值必须是单行的，因为 Fleet 会将它们通过受保护的运行时环境文件传递。Fleet 会拒绝覆盖[存储和容器布局](#storage-and-container-layout)中列出的受管容器路径和 Gateway 令牌变量的尝试。

### 创建选项

| 选项                    | 默认值                                  | 描述                                                                                   |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `--image <ref>`           | `ghcr.io/openclaw/openclaw:latest`    | 该 cell 的容器镜像。                                                                   |
| `--runtime <runtime>`     | `docker`                              | 容器 CLI：`docker` 或 `podman`。                                                          |
| `--port <number>`         | 自动从 `19100` 分配                   | 回环主机端口。显式选择的端口不能属于另一个已注册的 cell。    |
| `--memory <value>`        | `2g`                                  | Docker/Podman 语法中的容器内存限制。                                               |
| `--cpus <value>`          | `2`                                   | 容器 CPU 限制。                                                                          |
| `--disk <size>`           | 无                                    | 当存储后端支持配额时，限制容器可写层大小。                     |
| `--network <mode>`        | `bridge`                              | 出站网络模式：`bridge` 或 `internal`。                                                |
| `--pids-limit <number>`   | `512`                                 | 容器中的最大进程数。                                                  |
| `--env <KEY=VALUE>`       | 无                                    | 向 cell 传递一个环境变量。多个值可重复使用。                          |
| `--gateway-token <value>` | 随机 32 字符十六进制令牌               | 使用提供的 Gateway 令牌，而不是自动生成。参见[令牌处理](#token-handling)。 |
| `--no-start`              | cell 启动                              | 创建容器但不启动它。                                                      |
| `--json`                  | 人类可读输出                            | 打印机器可读输出。                                                                 |

自动分配会选择第一个未使用且大于等于 `19100` 的注册端口。Fleet 会拒绝重复的租户 ID，以及已分配给其他 cell 的显式端口。

镜像引用会作为一个容器运行时参数传递。空引用以及以 `-` 开头的值会被拒绝，因此镜像不会被解释为 Docker 或 Podman 选项。

所选的 Docker 或 Podman 端点必须是本地端点。Fleet 会在保留端口或创建本地状态之前，拒绝远程 Docker 上下文、`DOCKER_HOST` 端点以及远程 Podman 服务。不支持远程 cell 主机。

当 Fleet 启动一个新 cell 时，create 最多会等待大约一分钟，直到它的 Gateway 响应 `/healthz`。如果该 cell 没有变为健康状态，Fleet 会保留其容器和注册表行，以便 `fleet status`、`fleet logs` 或显式移除使用。`--no-start` 会跳过这个健康检查门。新建但不健康的 cell 所生成的 Gateway 令牌不会丢失——它仍保留在容器环境中（`docker|podman inspect` 可见），并且因为该 cell 还未服务任何流量，`fleet rm --force` 后再重新创建始终是安全的替代方案。

### 按摘要固定

create 和 upgrade 接受按摘要固定的镜像引用，例如 `--image ghcr.io/openclaw/openclaw@sha256:<digest>`。Fleet 会将该镜像引用原样传递给 Docker 或 Podman，这使操作员可以让 cell 保持在不可变的镜像字节上，而不是会变化的标签上。

create 的结果包含租户 ID、容器名称、主机端口、Gateway 令牌和本地 URL。即使在 JSON 输出中，也应将结果视为包含秘密，因为它包含令牌。

### 磁盘限制

`--disk` 只限制容器可写层。按租户绑定挂载的状态目录和认证目录仍然是主机存储；如果这些目录也需要硬性限制，请使用主机文件系统项目配额。

| 运行时/存储后端 | `--disk` 支持                                                             |
| ----------------------- | ---------------------------------------------------------------------------- |
| XFS 上的 Docker overlay2  | 需要 XFS 的 `pquota` 挂载选项。                                      |
| Docker btrfs 或 zfs     | 由存储驱动支持。                                             |
| Podman overlay          | 需要 XFS 作为底层存储。                                                |
| 其他后端          | 容器创建会失败，并显示 daemon 错误以及 Fleet 的后端指导。 |

### 出站策略

| 模式       | Docker                                                                                                | Podman                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `bridge`   | 支持；默认情况下出站流量不受限制。                                                | 支持；默认情况下出站流量不受限制。                              |
| `internal` | 被拒绝，因为 Docker 无法在内部网络上保留已发布的回环 Gateway 端口。 | 支持；回环 Gateway 仍会被发布，同时出站流量被阻止。 |

对于 Docker，请保持 bridge 模式，并使用主机防火墙规则（例如 `DOCKER-USER` 链）来实施出站策略。

## `fleet list`

按 tenant-ID 顺序列出单元：

```bash
openclaw fleet list
openclaw fleet ls
openclaw fleet list --json
```

该表包含：

| 列 | 含义 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenant`  | 租户 ID。                                                                                                                                                                                                                                                                            |
| `state`   | 来自 Docker 或 Podman 检查的运行中容器状态。`unknown` 表示运行时不可用，或者存在一个使用该单元名称的容器，但其 Fleet 所有权标签与注册表记录不匹配（碰撞或篡改信号——在采取行动前请手动检查）。 |
| `port`    | 映射到单元 Gateway 的回环主机端口。                                                                                                                                                                                                                                        |
| `image`   | 记录的容器镜像。                                                                                                                                                                                                                                                             |
| `created` | 单元创建时间。                                                                                                                                                                                                                                                                   |

当 Docker 或 Podman 不可用时，注册表行仍然可见；只有实时状态会变为 `unknown`。

## `fleet status`

检查一个单元：

```bash
openclaw fleet status acme
openclaw fleet status acme --json
```

状态会结合舰队注册表中的行、实时容器检查，以及一次简短的尽力请求到：

```text
http://127.0.0.1:<host-port>/healthz
```

健康结果为 `ok`、`failed` 或 `skipped`。`/healthz` 证明的是 Gateway 存活，而不是所有已配置通道或插件的完全就绪状态。当没有可用的本地端点可供检查时，会跳过该探测。

## `fleet logs`

将单元的容器日志直接流式输出到终端：

```bash
openclaw fleet logs acme
openclaw fleet logs acme --follow
openclaw fleet logs acme --tail 200
openclaw fleet logs acme --since 10m
```

Fleet 在读取任何日志之前会验证已注册容器的所有权标签，因此它会拒绝使用期望单元名称的外部容器。该流会绑定到经过检查的容器 ID，因此并发替换不会将其重定向到更新的代际。按 Ctrl-C 可结束 `--follow`，且不会将操作员停止视为命令失败。日志输出会经过脱敏过滤器处理，该过滤器会在任何内容到达终端之前，将单元当前的 Gateway token 替换为 `<redacted>`。

`fleet logs` 没有 `--json` 模式，因为容器日志是原始的 stdout/stderr 流。对于脚本，请使用 `--tail` 限制输出，并使用普通的 shell 重定向或管道。

## `fleet start`、`fleet stop` 和 `fleet restart`

使用其记录的运行时控制现有的单元：

```bash
openclaw fleet start acme
openclaw fleet stop acme
openclaw fleet restart acme
```

这些命令作用于已注册的容器名称。如果租户未知，或者记录的运行时无法执行该操作，则会失败。

## `fleet upgrade`

重新拉取已记录的镜像并替换单元容器：

```bash
openclaw fleet upgrade acme
```

将单元切换到另一个镜像：

```bash
openclaw fleet upgrade acme --image ghcr.io/openclaw/openclaw:<version>
```

升级会拉取目标镜像，检查现有容器和每个单元的网络，停止并移除该容器，然后重新创建并启动它。替换后的容器会保留相同的主机端口、数据目录、每个单元的桥接网络、运行时配置、资源限制、重启策略、Fleet 管理的环境，以及最初通过 `--env` 提供的值。挂载的状态在容器替换后仍会保留；镜像默认环境可能会随着目标镜像而变化。

只有当其 Gateway 在该单元的回环端口上对 `/healthz` 作出响应后，替换才会被提交，这与官方 compose 文件使用的健康检查契约一致。若替换后的容器退出、进入崩溃循环，或在大约一分钟内未能变为健康状态，它会被移除并恢复之前的容器，因此有问题的镜像不会导致正常工作的单元下线。

Gateway 令牌故意不会存储在 fleet registry 中。在移除旧容器之前，Fleet 会读取其环境并将 `OPENCLAW_GATEWAY_TOKEN` 带入替换后的容器。若该令牌没有存放在你可控制的其他任何地方，在升级前不要手动移除旧容器。

## `fleet backup` 和 `fleet restore`

备份一个已停止的 cell：

```bash
openclaw fleet stop acme
openclaw fleet backup acme --out ./acme.tgz
```

将该归档恢复到已注册的 cell 中：

```bash
openclaw fleet restore acme --from ./acme.tgz
```

这些都是需要主机运维者权限的命令。归档包含租户状态和认证密钥，创建时权限为 `0600`，必须像凭据一样存储。备份会拒绝对运行中的 cell 执行，以便 SQLite 状态被一致地捕获。除非提供 `--force`，恢复会拒绝对运行中的 cell 执行；它只替换该租户的状态，轮换 Gateway token，并且只打印一次新的 token。Fleet 一次只备份一个租户；全租户备份是单独的运维操作。

恢复需要一个现有的已停止容器，因为其检查到的运行时配置会提供替换后的限制、用户映射、环境来源以及镜像。如果已注册的容器在外部被移除，请先在不使用 `--purge-data` 的情况下运行 `fleet rm <tenant> --force`，然后使用预期的镜像和 `--no-start` 重新创建该 cell，再重试恢复。第一次移除会保留两个租户数据目录不变。

这两个命令都接受 `--max-bytes <bytes>` 来限制归档或解压后的文件数据大小，并且都应用相同的固定一百万档案路径段预算，这样仅包含元数据的归档炸弹就无法耗尽主机的 inode，同时每个被接受的备份都仍然可以恢复。备份接受 `--out <path>`，而这两个命令都支持 `--json`。

归档只包含普通文件和目录。备份从不跟随或存储符号链接、硬链接、套接字或设备节点；跳过的数量会在结果中报告。恢复会拒绝包含任何其他条目类型的归档，忽略归档中的所有权信息，并在应用 cell 运行时所有者之前对恢复的文件和目录模式进行夹紧。像工作区 `node_modules` 这类可重建的符号链接树，在恢复后必须在 cell 内重新安装。

## `fleet doctor`

审计每个单元或单个租户，而不更改运行时或文件系统状态：

```bash
openclaw fleet doctor
openclaw fleet doctor acme --json
```

Doctor 会检查运行时本地性、所有权标签、健康状态、加固、资源限制、回环端口绑定、令牌存在性、网络所有权和出站模式，以及私有状态目录权限。警告会描述已停止的单元或所有权差异；任何失败的发现都会设置非零的进程退出码。

## `fleet rm`

从运行时和注册表中移除已停止的 cell，同时保留租户数据：

```bash
openclaw fleet rm acme
```

运行中的容器需要 `--force`：

```bash
openclaw fleet rm acme --force
```

同时永久删除 cell 数据：

```bash
openclaw fleet rm acme --purge-data --force
```

Fleet 会先移除 cell 容器，然后再移除其专用 bridge 网络。`--purge-data` 需要 `--force`。在递归删除之前，Fleet 会解析两个 Fleet 所拥有的根目录以及两个每租户目录。每个目标必须是完全符合预期的租户叶子节点，严格位于其根目录内，并且不能是符号链接。这些包含性检查可防止损坏的注册表路径或跨租户符号链接将删除重定向到其他位置。

如果一个完全符合预期的租户目录已经不存在，Purge 可重试。这使得在部分文件系统故障之后，后续调用可以完成清理，而不会对仍然存在的目录放宽路径检查。

## 存储和容器布局

单元状态和 auth-profile 加密密钥使用位于活动 OpenClaw 状态目录下、按租户划分的独立主机路径：

```text
<state-dir>/fleet/cells/<tenant>/
<state-dir>/fleet/auth-profile-secrets/<tenant>/
```

第一个目录挂载到 `/home/node/.openclaw`。第二个目录挂载到 `/home/node/.config/openclaw`，与官方 Docker 设置的加密密钥挂载保持一致。因此，加密密钥不会暴露在普通状态挂载下，也不会在仅备份或共享单元状态目录时被包含进去。这两个目录在正常删除和升级后都会保留；`fleet rm --purge-data --force` 会在分别进行隔离检查后删除两者。

在首次启动前，Fleet 会用 `gateway.mode=local`、token 认证、LAN 容器绑定以及所分配主机端口的 Control UI 来源来初始化单元配置。token 值不会写入该配置；它仍保留在容器环境中。

Fleet 使用以下环境值固定官方镜像的容器路径：

| 变量                   | 容器值                               |
| ---------------------- | ------------------------------------ |
| `HOME`                 | `/home/node`                         |
| `OPENCLAW_HOME`        | `/home/node`                         |
| `OPENCLAW_STATE_DIR`   | `/home/node/.openclaw`               |
| `OPENCLAW_CONFIG_PATH` | `/home/node/.openclaw/openclaw.json` |
| `OPENCLAW_WORKSPACE_DIR` | `/home/node/.openclaw/workspace`     |
| `OPENCLAW_GATEWAY_TOKEN` | 生成或提供的单元 token             |

官方镜像默认使用非 root 的 `node` 用户，UID 为 1000。Fleet 保持私有的 `0700` 绑定挂载可写，而不将其设为全局可访问。rootful Docker 以调用者的非 root UID 和 GID 运行该单元；rootless Docker 使用容器 UID 0，它在守护进程的用户命名空间中映射为调用者的非特权主机用户。Podman 使用 `keep-id`，并采用调用者的 UID 和 GID。当 Fleet 本身以 root 身份在 rootful 运行时环境上运行时，它会保留镜像用户，并将初始挂载文件分配给 UID/GID 1000。

在启用 SELinux 的主机上，Docker 和 Podman 挂载会收到私有的 `:Z` 重新标记。如果你恢复或迁移单元数据，请保持绑定挂载路径对有效的容器用户可写。该配置文件对 rootless 友好，但 Docker 或 Podman 必须已在主机上配置为 rootless 运行；Fleet 不会将 rootful 守护进程转换为 rootless 守护进程。

## 安全配置文件

Fleet 会将以下配置文件应用于每个 cell：

| 控制项               | 应用的配置                                              | 原因                                                                                   |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Linux capabilities   | `--cap-drop=ALL`                                     | Gateway 是一个 Node.js 进程，不需要额外的 Linux capabilities。                       |
| 权限提升             | `--security-opt no-new-privileges`                   | 防止进程通过 setuid 或 setgid 二进制文件获取权限。                                     |
| Init 进程            | `--init`                                             | 回收子孙进程并转发容器生命周期信号。                                                   |
| 进程限制             | 默认 `--pids-limit 512`                              | 限制 fork 和进程耗尽。                                                                 |
| 内存限制             | 默认 `--memory 2g`                                   | 限制 cell 的内存使用。                                                                 |
| CPU 限制             | 默认 `--cpus 2`                                      | 限制 cell 的 CPU 使用。                                                                |
| 可写层磁盘           | 可选 `--disk`                                         | 当运行时存储后端支持配额时，限制容器层。                                                |
| 重启策略             | `--restart unless-stopped`                           | 在不覆盖有意停止的情况下，重启失败的 cell。                                             |
| 主机发布             | 仅 `127.0.0.1:<host-port>:18789`                     | 使 Gateway 不暴露到通配主机接口。                                                      |
| cell 网络            | 每个 cell 一个 bridge 或 Podman 内部网络            | 分隔容器 IP 流量，并且可选地阻止 Podman 的出站 egress。                                 |
| 容器身份             | 与宿主匹配的用户映射                                  | 在不授予所有人访问权限的情况下，保持私有 bind mount 可写。                              |
| 持久化状态           | 每个 cell 独立挂载；不共享状态挂载                   | 将租户配置、凭据、会话和工作区保留在该租户的数据树中。                                  |
| 容器命令             | `node dist/index.js gateway --bind lan --port 18789` | 在容器网络上监听，使仅限回环的主机端口映射能够访问它。                                  |

Fleet 从不挂载 `/var/run/docker.sock`，不使用 `--privileged` 或主机网络，也不添加 capabilities。按 cell 划分的 bridge 是跨 cell 的隔离边界，而不是出站防火墙：cell 仍保留提供程序和通道所需的网络出站能力。请在回环端口前放置一个与您的部署相匹配的代理、SSH 隧道或 tailnet 配置。`http://127.0.0.1:<port>` 只能从 Fleet 主机直接访问。

此配置文件将租户容器彼此隔离，但它并不能保护租户免受 Fleet 操作员、容器运行时管理员或被攻陷主机的影响。有关完整的信任模型和更强的隔离选项，请参阅 [多租户托管](/gateway/multi-tenant-hosting)。

## 令牌处理

默认情况下，`fleet create` 会生成一个加密学随机的 32 字符十六进制 Gateway 令牌，并在创建结果中仅打印一次。请将其存储在你批准使用的密钥管理器中，并避免将创建输出捕获到日志里。

`--gateway-token` 会把自定义令牌放入本地进程参数中，这些参数可能会保留在 shell 历史记录里，或在进程列表中可见。除非现有的密钥管理工作流需要提供一个值，否则请优先使用生成的令牌。

令牌以及通过 `--env` 传入的每个值都会存在于容器环境中。Fleet 会将它们写入一个短生命周期、权限为 `0600` 的环境文件，只把该文件路径传给 Docker 或 Podman，并在运行时命令结束后将其删除。在 `openclaw fleet create --gateway-token ...` 或 `--env KEY=VALUE` 中显式输入的值，仍可能在外层 `openclaw` 进程参数和 shell 历史记录中可见。

容器环境变量并不会对受信任的主机操作员隐藏：Docker 或 Podman 管理员可以通过容器检查读取它们。Fleet 中“仅显示一次”的说明描述的是正常的 CLI 输出，而不是对主机管理员的防护。

## 相关内容

- [多租户托管](/gateway/multi-tenant-hosting)
- [Docker](/install/docker)
- [Podman](/install/podman)
- [网关安全](/gateway/security)
