---
summary: "OpenClaw 沙箱化的工作方式：模式、作用域、工作区访问和镜像"
title: "沙箱化"
sidebarTitle: "沙箱化"
read_when: "你想要了解沙箱化的专门说明，或者需要调整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在沙箱后端中运行工具执行，以减少影响范围。沙箱默认关闭，并由 `agents.defaults.sandbox`（全局）或 `agents.list[].sandbox`（按代理）控制。Gateway 进程始终保留在主机上；只有工具执行在启用后才会移动到沙箱中。

<Note>
这并不是完美的安全边界，但当模型做出一些愚蠢操作时，它确实能显著限制文件系统和进程访问。
</Note>

## 什么会被沙箱化

- 工具执行：`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等。
- 可选的沙箱化浏览器（`agents.defaults.sandbox.browser`）。

未被沙箱化的内容：

- Gateway 进程本身。
- 任何通过 `tools.elevated` 明确允许在沙箱外运行的工具。提升权限的 `exec` 会绕过沙箱，并在配置的逃逸路径上运行（默认是 `gateway`，或者当 exec 目标是 `node` 时为 `node`）。如果沙箱化关闭，`tools.elevated` 不会改变任何内容，因为 `exec` 此时本来就运行在主机上。请参阅 [Elevated Mode](/tools/elevated)。

## 模式、作用范围和后端

三个独立设置控制沙箱行为：

| 设置   | 键                                 | 值                          | 默认值  |
| ------ | ---------------------------------- | --------------------------- | ------- |
| 模式   | `agents.defaults.sandbox.mode`      | `off`, `non-main`, `all`    | `off`   |
| 作用范围 | `agents.defaults.sandbox.scope`   | `agent`, `session`, `shared` | `agent` |
| 后端   | `agents.defaults.sandbox.backend`   | `docker`, `ssh`, `openshell` | `docker` |

**模式** 控制何时应用沙箱：

- `off`：不使用沙箱。
- `non-main`：为除代理主会话之外的每个会话启用沙箱。主会话键始终是 `agent:<agentId>:main`（如果 `session.scope` 为 `"global"`，则为 `global`）；它不可配置。组/频道会话使用各自的键，因此它们始终被视为非主会话并会被沙箱化。
- `all`：每个会话都在沙箱中运行。

**作用范围** 控制会创建多少个容器/环境：

- `agent`：每个代理一个容器。
- `session`：每个会话一个容器。
- `shared`：所有被沙箱化的会话共享一个容器（在此作用范围下，按代理的 `docker`/`ssh`/`browser` 覆盖项会被忽略）。

**后端** 控制由哪个运行时执行沙箱工具。SSH 专属配置位于 `agents.defaults.sandbox.ssh`；OpenShell 专属配置位于 `plugins.entries.openshell.config`。

|                     | Docker                           | SSH                            | OpenShell                                           |
| ------------------- | -------------------------------- | ------------------------------ | --------------------------------------------------- |
| **运行位置**        | 本地容器                         | 任意可 SSH 访问的主机          | OpenShell 管理的沙箱                                  |
| **设置**            | `scripts/sandbox-setup.sh`       | SSH 密钥 + 目标主机            | 启用 OpenShell 插件                                   |
| **工作区模型**      | 绑定挂载或复制                   | 远程为准（首次种子化）         | `mirror` 或 `remote`                                 |
| **网络控制**        | `docker.network`（默认：none）   | 取决于远程主机                  | 取决于 OpenShell                                      |
| **浏览器沙箱**      | 支持                             | 不支持                         | 目前不支持                                            |
| **绑定挂载**        | `docker.binds`                   | 不适用                         | 不适用                                                |
| **最适合**          | 本地开发、完全隔离               | 卸载到远程机器                  | 带可选双向同步的托管远程沙箱                            |

## Docker 后端

一旦启用沙箱，Docker 就是默认后端。它通过 Docker 守护进程 socket（`/var/run/docker.sock`）在本地运行工具和沙箱浏览器；隔离来自 Docker 命名空间。

默认值：`network: "none"`（无外部网络访问）、`readOnlyRoot: true`、`capDrop: ["ALL"]`、镜像 `openclaw-sandbox:bookworm-slim`。

要暴露主机 GPU，请将 `agents.defaults.sandbox.docker.gpus`（或按代理覆盖项）设置为类似 `"all"` 或 `"device=GPU-uuid"` 的值。这会传递给 Docker 的 `--gpus` 标志，并且需要兼容的主机运行时，例如 NVIDIA Container Toolkit。

<Warning>
**Docker-out-of-Docker（DooD）限制**

如果你将 OpenClaw Gateway 本身部署为 Docker 容器，它会使用主机的 Docker socket（DooD）编排同级沙箱容器。这会引入路径映射约束：

- **配置需要主机路径**：`openclaw.json` 中的 `workspace` 必须包含**主机的绝对路径**（例如 `/home/user/.openclaw/workspaces`），而不是 Gateway 容器内部的路径。Docker 守护进程会基于主机 OS 命名空间计算路径，而不是 Gateway 自己的命名空间。
- **需要匹配的 volume 映射**：Gateway 进程也会将心跳和桥接文件写入该 `workspace` 路径。请为 Gateway 容器提供相同的 volume 映射（`-v /home/user/.openclaw:/home/user/.openclaw`），这样相同的主机路径在 Gateway 容器内也能正确解析。映射不一致时，Gateway 尝试写入心跳会出现 `EACCES`。
- **Codex 代码模式**：当 OpenClaw 沙箱处于活动状态时，OpenClaw 会在该轮禁用 Codex app-server 原生 Code Mode、用户 MCP 服务器以及由应用托管的插件执行（这些功能运行在 Gateway 所在主机上的 app-server 进程中，而不是 OpenClaw 沙箱后端），除非沙箱工具策略暴露了所需工具，并且你选择了实验性的 sandbox exec-server 路径。此时 Shell 访问会通过 OpenClaw 沙箱支持的工具路由，例如 `sandbox_exec` 和 `sandbox_process`。不要将主机 Docker socket 挂载到代理沙箱容器或自定义 Codex 沙箱中。完整行为请参见 [Codex Harness](/plugins/codex-harness)。

在启用了 Docker 沙箱模式的 Ubuntu/AppArmor 主机上，Codex app-server 的 `workspace-write` Shell 执行需要在沙箱容器内具备非特权用户命名空间，而当服务用户无法创建这些命名空间时，可能会在 Shell 启动前失败。如果 Docker 沙箱的出站网络被禁用（`network: "none"`，默认值），这还需要非特权网络命名空间。常见症状包括：`bwrap: setting up uid map: Permission denied` 和 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。运行 `openclaw doctor`；如果它报告 Codex bwrap 命名空间探测失败，请优先使用能够为 OpenClaw 服务进程授予所需命名空间的 AppArmor 配置文件。`kernel.apparmor_restrict_unprivileged_userns=0` 是带有安全权衡的主机级回退方案；仅在该主机安全态势可接受时使用。
</Warning>

### 沙箱浏览器

- 当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可达）。可通过 `agents.defaults.sandbox.browser.autoStart` 配置（默认 `true`）以及 `autoStartTimeoutMs`（默认 12 秒）。
- 沙箱浏览器容器使用专用的 Docker 网络（`openclaw-sandbox-browser`），而不是全局的 `bridge` 网络。可通过 `agents.defaults.sandbox.browser.network` 配置。
- `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 白名单限制容器边缘的 CDP 入口访问（例如 `172.21.0.1/32`）。
- noVNC 观察者访问默认受密码保护；OpenClaw 会生成一个短期有效的令牌 URL，该 URL 提供本地引导页，并通过 URL 片段（而非查询字符串或头部日志）携带 noVNC 密码。
- `agents.defaults.sandbox.browser.allowHostControl`（默认 `false`）允许沙箱会话显式将目标指向主机浏览器。
- 可选白名单用于限制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

## SSH 后端

使用 `backend: "ssh"` 可将 `exec`、文件工具和媒体读取沙箱化到任意可通过 SSH 访问的机器上。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 或者使用 SecretRefs / 内联内容代替本地文件：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

默认值：`command: "ssh"`、`workspaceRoot: "/tmp/openclaw-sandboxes"`、`strictHostKeyChecking: true`、`updateHostKeys: true`。

- **生命周期**：OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。首次使用（创建或重新创建后）时，它会从本地工作区向该远程工作区初始化一次内容。之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示中的媒体读取以及入站媒体暂存都会直接通过 SSH 针对远程工作区运行。OpenClaw 不会自动将远程变更同步回本地工作区。
- **认证材料**：`identityFile`/`certificateFile`/`knownHostsFile` 引用的是现有的本地文件。`identityData`/`certificateData`/`knownHostsData` 接受内联字符串或 SecretRefs，通过正常的 secrets 运行时快照解析，写入权限为 `0600` 的临时文件，并在 SSH 会话结束时删除。如果同一项同时设置了 `*File` 和 `*Data` 变体，则该会话中以 `*Data` 为准。
- **远程为准的后果**：在初次初始化之后，远程 SSH 工作区将成为真正的沙箱状态。在初始化步骤之后，如果在 OpenClaw 之外对主机本地进行编辑，这些更改在远程不可见，直到你重新创建沙箱。`openclaw sandbox recreate` 会删除按作用域划分的远程根目录，并在下次使用时再次从本地初始化。此后端不支持浏览器沙箱化，且 `sandbox.docker.*` 设置不适用于它。

## OpenShell 后端

使用 `backend: "openshell"` 可将工具隔离在由 OpenShell 管理的远程环境中。OpenShell 复用与通用 SSH 后端相同的 SSH 传输和远程文件系统桥接，并额外提供 OpenShell 生命周期（`sandbox create/get/delete/ssh-config`）以及可选的 `mirror` 工作区同步模式。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
        },
      },
    },
  },
}
```

`mode: "mirror"`（默认）会保持本地工作区为权威来源：OpenClaw 会在 `exec` 之前将本地内容同步到沙箱中，并在之后同步回来。`mode: "remote"` 会先从本地向远程工作区初始化一次，然后直接针对远程工作区执行 `exec`/`read`/`write`/`edit`/`apply_patch`，而不会再同步回本地；在种子初始化之后对本地所做的编辑在你执行 `openclaw sandbox recreate` 之前都不可见。在 `scope: "agent"` 或 `scope: "shared"` 下，该远程工作区会在相同作用域内共享。当前限制：尚不支持沙箱浏览器，且 `sandbox.docker.binds` 不适用于此后端。

`openclaw sandbox list`/`recreate`/`prune` 都将 OpenShell 运行时与 Docker 运行时视为相同；清理逻辑会根据后端进行区分。

有关完整的前置条件、配置参考、工作区模式对比以及生命周期细节，请参阅 [OpenShell](/gateway/openshell)。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制沙箱可见的内容：

| 值               | 行为                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `none`（默认）   | 工具会看到位于 `~/.openclaw/sandboxes` 下的隔离沙箱工作区。                                   |
| `ro`             | 将代理工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。                  |
| `rw`             | 将代理工作区以读写方式挂载到 `/workspace`。                                                  |

使用 OpenShell 后端时，`mirror` 模式在各次 exec 之间仍然使用本地工作区作为权威来源，`remote` 模式在初始种子之后使用远程 OpenShell 工作区作为权威来源，而 `workspaceAccess: "ro"`/`"none"` 仍以相同方式限制写入行为。

传入媒体会被复制到活动沙箱工作区（`media/inbound/*`）。

<Note>
**技能**：`read` 工具以沙箱为根。对于 `workspaceAccess: "none"`，OpenClaw 会将符合条件的技能镜像到沙箱工作区（`.../skills`），以便读取。对于 `"rw"`，工作区技能可从 `/workspace/skills` 读取，而符合条件的受管理、捆绑或插件技能会被实体化到生成的只读路径 `/workspace/.openclaw/sandbox-skills/skills`。
</Note>

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 会将额外的主机目录挂载到容器中。格式为 `host:container:mode`（例如：`"/home/user/source:/source:rw"`）。

全局和按 agent 的绑定会进行合并（而不是替换）。在 `scope: "shared"` 下，会忽略按 agent 的绑定。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到 **sandbox browser** 容器中。设置该项时（包括 `[]`），它会替换 browser 容器的 `docker.binds`；如果未设置，browser 容器会回退到 `docker.binds`。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

<Warning>
**绑定安全性**

- 绑定会绕过 sandbox 文件系统：它们会以你设置的任意模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 默认会阻止危险的绑定源：系统路径（`/etc`、`/proc`、`/sys`、`/dev`、`/root`、`/boot`）、Docker socket 目录（`/run`、`/var/run` 及其 `docker.sock` 变体），以及常见的家目录凭据根目录（`~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm`、`~/.ssh`）。
- 验证会先规范化源路径，然后通过最深的已存在祖先目录再次解析，再重新检查被阻止的路径和允许的根目录，因此即使最终叶子节点尚不存在，符号链接父级逃逸也会被安全地拒绝（例如：如果 `run-link` 指向 `/var/run`，则 `/workspace/run-link/new-file` 仍会解析为 `/var/run/...`）。
- 覆盖保留的容器挂载点（`/workspace`、`/agent`）的绑定目标也会被默认阻止；可通过 `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets: true` 覆盖。
- 默认情况下，位于 workspace/agent-workspace 允许列表根目录之外的绑定源会被阻止；可通过 `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources: true` 覆盖。允许的根目录会以相同方式进行规范化，因此一个在符号链接解析前看起来位于允许列表内的路径，仍会被判定为位于允许根目录之外而拒绝。
- 敏感挂载（密钥、SSH 密钥、服务凭证）应尽量使用 `:ro`，除非绝对必要。
- 如果你只需要对 workspace 进行只读访问，请结合使用 `workspaceAccess: "ro"`；绑定模式彼此独立。
- 有关绑定如何与工具策略和提升权限执行交互，请参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

</Warning>

## 镜像与设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Note>
**源码检出 vs npm install**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 辅助脚本仅在从 [源码检出](https://github.com/openclaw/openclaw) 运行时可用。它们不包含在 npm 包中。

如果你是通过 `npm install -g openclaw` 安装的，请改用下面展示的内联 `docker build` 命令。
</Note>

<Steps>
  <Step title="构建默认镜像">
    从源码检出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    从 npm 安装（不需要源码检出）：

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    默认镜像**不**包含 Node。如果某个技能需要 Node（或其他运行时），请构建自定义镜像，或通过 `sandbox.docker.setupCommand` 安装（需要网络外连 + 可写根目录 + root 用户）。

    如果 `openclaw-sandbox:bookworm-slim` 缺失，OpenClaw **不会**静默替换为普通的 `debian:bookworm-slim`。目标为默认镜像的沙箱运行会在你构建它之前直接失败，并给出构建说明，因为内置镜像包含用于沙箱写入/编辑辅助工具的 `python3`。

  </Step>
  <Step title="可选：构建常用镜像">
    为获得一个带有常用工具（例如 `curl`、`jq`、Node 24、pnpm、`python3` 和 `git`）的功能更完整的沙箱镜像：

    从源码检出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    从 npm 安装时，请先构建默认镜像（见上文），然后使用仓库中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其基础上构建常用镜像。

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="可选：构建沙箱浏览器镜像">
    从源码检出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    从 npm 安装时，请使用仓库中的 [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) 构建。

  </Step>
</Steps>

默认情况下，Docker 沙箱容器以**无网络**方式运行。可通过 `agents.defaults.sandbox.docker.network` 覆盖。

<AccordionGroup>
  <Accordion title="沙箱浏览器 Chromium 默认值">
    内置沙箱浏览器镜像会为容器化工作负载应用保守的 Chromium 启动标志：

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--password-store=basic`
    - `--use-mock-keychain`
    - 在启用 `browser.headless` 时使用 `--headless=new`。
    - 在启用 `browser.noSandbox` 时使用 `--no-sandbox --disable-setuid-sandbox`。
    - 默认使用 `--disable-3d-apis`、`--disable-gpu`、`--disable-software-rasterizer`；这些图形加固标志有助于没有 GPU 支持的容器。如果你的工作负载需要 WebGL 或其他 3D 功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - 默认禁用 `--disable-extensions`；对于依赖扩展的流程，请设置 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0`。
    - 默认使用 `--renderer-process-limit=2`；由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认值。

    如果你需要不同的运行时配置，请使用自定义浏览器镜像并提供自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 追加额外的启动标志。

  </Accordion>
  <Accordion title="网络安全默认值">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
    - 紧急放行覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关位于此处：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。可通过 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后**只运行一次**（不是每次运行都执行）。它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 按代理：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常见问题">
    - 默认 `docker.network` 为 `"none"`（无外网出口），因此包安装会失败。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，并且仅限紧急放行使用。
    - `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false`，或预先构建自定义镜像。
    - 进行包安装时，`user` 必须是 root（省略 `user`，或设置 `user: "0:0"`）。
    - 沙箱执行**不会**继承宿主机的 `process.env`。请使用 `agents.defaults.sandbox.docker.env`（或自定义镜像）来提供技能所需的 API 密钥。
    - `agents.defaults.sandbox.docker.env` 中的值会作为显式的 Docker 容器环境变量传入。任何能访问 Docker 守护进程的人都可以通过 Docker 元数据命令（例如 `docker inspect`）查看这些值。如果这种元数据暴露不可接受，请使用自定义镜像、挂载的密钥文件或其他密钥传递方式。

  </Accordion>
</AccordionGroup>

## 工具策略与逃生阀

在沙箱规则之前，工具的允许/拒绝策略仍然适用。如果某个工具在全局或按代理层面被拒绝，沙箱化也不会把它恢复。

`tools.elevated` 是一个显式逃生阀，会在沙箱外运行 `exec`（默认在 `gateway`，如果 exec 目标是 `node`，则在 `node` 中运行）。`/exec` 指令仅适用于授权发送者，并且按会话持久化；若要彻底禁用 `exec`，请使用工具策略拒绝（参见 [沙箱、工具策略与提权](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- `openclaw sandbox list` 会显示沙箱容器、状态、镜像匹配、运行时长、空闲时间，以及关联的会话/代理。
- `openclaw sandbox explain [--session <key>] [--agent <id>]` 会检查有效的沙箱模式、宿主工作区、运行时工作目录、Docker 挂载、工具策略和修复配置键。其 `workspaceRoot` 字段仍然是配置的沙箱根目录；`effectiveHostWorkspaceRoot` 显示当前活动工作区实际所在位置。
- `openclaw sandbox recreate [--all | --session <key> | --agent <id>] [--browser] [--force]` 会移除容器/环境，以便它们在下次使用时按当前配置重新创建。
- 参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解“为什么会被阻止？”这一思维模型。

## 多代理覆盖

每个代理都可以覆盖沙箱 + 工具：`agents.list[].sandbox` 和 `agents.list[].tools`（以及用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。有关优先级，请参见 [多代理沙箱与工具](/tools/multi-agent-sandbox-tools)。

## 最小启用示例

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## 相关内容

- [多智能体沙箱与工具](/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖与优先级
- [OpenShell](/gateway/openshell) -- 托管沙箱后端设置、工作区模式和配置参考
- [沙箱配置](/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么这被阻止了？”
- [安全性](/gateway/security)
