---
summary: "OpenClaw 沙箱机制的工作原理：模式、范围、工作区访问和镜像"
title: 沙箱机制
read_when: "您想专门了解沙箱机制或需要调整 agents.defaults.sandbox 配置时"
status: active
---

# 沙箱机制

OpenClaw 可以在 **沙箱后端中运行工具**，以减少影响范围。
这是 **可选的**，由配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果关闭沙箱，工具在宿主机上运行。
网关保持在宿主机上；启用时工具执行在隔离的沙箱中运行。

这不是一个完美的安全边界，但当模型执行不当时，能显著限制文件系统和进程访问。

## 什么会被沙箱化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可访问）。
    可通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 配置。
  - 默认情况下，沙箱浏览器容器会使用专用 Docker 网络（`openclaw-sandbox-browser`），而非全局 `bridge` 网络。
    可通过 `agents.defaults.sandbox.browser.network` 配置。
  - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 白名单限制容器端的 CDP 入站流量（例如 `172.21.0.1/32`）。
  - noVNC 观察者访问默认启用密码保护；OpenClaw 会发出一个短时效令牌 URL，提供本地引导页面，并通过 URL 片段密码（非查询/头部日志）打开 noVNC。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱会话显式控制宿主机浏览器。
  - 可选白名单控制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

不被沙箱化的部分：

- 网关进程本身。
- 任何明确允许在宿主机上运行的工具（例如 `tools.elevated`）。
  - **Elevated 执行在宿主机上，绕过沙箱机制。**
  - 如果关闭沙箱，`tools.elevated` 不改变执行位置（已在宿主机上）。详情见 [Elevated 模式](/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**启用沙箱：

- `"off"`：不启用沙箱。
- `"non-main"`：仅对**非主**会话启用沙箱（如果您希望普通聊天运行在宿主机上，则默认选项）。
- `"all"`：所有会话均运行于沙箱中。
  注：`"non-main"`基于 `session.mainKey`（默认 `"main"`）判断，而非 agent id。
  群组/频道会话有自己的键，因此视为非主，会被沙箱限制。

## 范围

`agents.defaults.sandbox.scope` 控制**创建多少容器**：

- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个 agent 一个容器。
- `"shared"`：所有沙箱会话共用一个容器。

## Backend

`agents.defaults.sandbox.backend` 控制 **由哪个运行时** 提供沙箱：

- `"docker"`（默认）：本地 Docker 支持的沙箱运行时。
- `"ssh"`：通用 SSH 支持的远程沙箱运行时。
- `"openshell"`：OpenShell 支持的沙箱运行时。

SSH 特定配置位于 `agents.defaults.sandbox.ssh`。
OpenShell 特定配置位于 `plugins.entries.openshell.config`。

### Choosing a backend

|                     | Docker                           | SSH                            | OpenShell                                           |
| ------------------- | -------------------------------- | ------------------------------ | --------------------------------------------------- |
| **运行位置**   | 本地容器                  | 任何可通过 SSH 访问的主机        | OpenShell 托管的沙箱                           |
| **设置**           | `scripts/sandbox-setup.sh`       | SSH 密钥 + 目标主机          | 启用 OpenShell 插件                            |
| **工作区模型** | 绑定挂载或复制               | 远程权威（一次性播种）   | `mirror` 或 `remote`                                |
| **网络控制** | `docker.network`（默认：无） | 取决于远程主机         | 取决于 OpenShell                                |
| **浏览器沙箱** | 支持                        | 不支持                  | 暂不支持                                   |
| **绑定挂载**     | `docker.binds`                   | 不适用                            | 不适用                                                 |
| **最适用于**        | 本地开发，完全隔离        | 卸载到远程机器 | 提供可选双向同步的托管远程沙箱 |

### SSH backend

当您希望 OpenClaw 在任意可 SSH 访问的机器上对 `exec`、文件工具和媒体读取进行沙箱时，使用 `backend: "ssh"`。

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
          // 或使用 SecretRefs / 内联内容代替本地文件：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

原理：

- OpenClaw 在 `sandbox.ssh.workspaceRoot` 下为每个范围创建一个远程根目录。
- 在首次创建或重建后首次使用时，OpenClaw 会从本地工作区向远程工作区播种一次。
- 此后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒体读取和入站媒体暂存等操作直接通过 SSH 访问远程工作区。
- OpenClaw 不会自动将远程更改同步回本地。

认证材质：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用现有的本地文件并通过 OpenSSH 配置传递。
- `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 通过常规定时快照解析它们，写入权限为 `0600` 的临时文件，在 SSH 会话结束时删除。
- 若同一项同时设置了 `*File` 和 `*Data`，该 SSH 会话中以 `*Data` 为准。

这是一个**远程权威**模型。远程 SSH 工作区在初始播种后成为真实的沙箱状态。

重要结果：

- 在播种步骤后，宿主机本地的编辑不会立即在远程显示，除非重建沙箱。
- `openclaw sandbox recreate` 会删除对应范围的远程根目录，下一次使用时重新从本地播种。
- SSH 后端不支持浏览器沙箱。
- `sandbox.docker.*` 设置不适用于 SSH 后端。

### OpenShell backend

当您希望 OpenClaw 在 OpenShell 托管的远程环境中对工具进行沙箱时，使用 `backend: "openshell"`。完整的设置指南、配置参考和工作区模式对比，请参阅专门的 [OpenShell 页面](/gateway/openshell)。

OpenShell 复用了通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接，并添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`、`sandbox ssh-config`）以及可选的 `mirror` 工作区模式。

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
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

OpenShell 模式：

- `mirror`（默认）：本地工作区保持权威。OpenClaw 在 exec 之前将本地文件同步到 OpenShell，exec 后再同步远程工作区回本地。
- `remote`：OpenShell 工作区在沙箱创建后成为权威。OpenClaw 仅播种一次，之后文件工具和 exec 直接对远程沙箱操作，不再同步更改回本地。

远程传输详情：

- OpenClaw 通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求沙箱特定的 SSH 配置。
- Core 将 SSH 配置写入临时文件，打开 SSH 会话，并复用与 `backend: "ssh"` 相同的远程文件系统桥接。
- 在 `mirror` 模式下，生命周期区别为：exec 前同步本地到远程，exec 后同步远程回本地。

当前 OpenShell 限制：

- 不支持沙箱浏览器
- 在 OpenShell backend 下不支持 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 特定运行时参数仍只应用于 Docker backend

#### Workspace modes

OpenShell 有两种工作区模型。这是最实用的部分。

##### `mirror`

当您希望**本地工作区保持权威**时，使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- `exec` 前，OpenClaw 将本地工作区同步到 OpenShell 沙箱。
- `exec` 后，将远程工作区同步回本地。
- 文件工具仍通过沙箱桥接操作，但本地工作区始终是各轮回合间的真相来源。

适用情况：

- 希望本地外部编辑的文件自动反映到沙箱中
- 希望 OpenShell 沙箱尽量模仿 Docker backend 行为
- 希望主机工作区在每次 exec 后反映沙箱写入

权衡：

- exec 前后增加额外同步成本

##### `remote`

当您希望**OpenShell 工作区成为权威**时，使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 沙箱首次创建时，OpenClaw 从本地工作区播种一次远程工作区。
- 其后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接操作远程 OpenShell 工作区。
- OpenClaw 不会在 exec 后同步远程更改回本地。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过沙箱桥接读取，而非依赖本地路径。
- 传输通过 SSH 到 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱。

重要后果：

- 播种步骤后，宿主机外的本地编辑不会自动同步到远程沙箱。
- 重建沙箱时，远程工作区会重新从本地工作区播种。
- 使用 `scope: "agent"` 或 `scope: "shared"`，远程工作区在相同范围内共享。

适用情况：

- 希望沙箱主要存在于远程 OpenShell 端
- 希望减少每轮同步开销
- 不希望宿主机本地编辑悄然覆盖远程沙箱状态

若将沙箱视为临时执行环境，选择 `mirror`。
若将沙箱视为真实工作区，选择 `remote`。

#### OpenShell lifecycle

OpenShell 沙箱仍通过常规的沙箱生命周期管理：

- `openclaw sandbox list` 显示 OpenShell 和 Docker 运行时
- `openclaw sandbox recreate` 删除当前运行时，下一次使用时重新创建
- 垃圾清理逻辑也对后端敏感

对 `remote` 模式，重建尤其重要：

- 重建会删除该范围的权威远程工作区
- 下一次使用时从本地工作区重新播种远程工作区

对 `mirror` 模式，重建主要重置远程执行环境
因为本地工作区始终是权威。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制**沙箱能看到什么**：

- `"none"`（默认）：工具只能看到位于 `~/.openclaw/sandboxes` 下的沙箱工作区。
- `"ro"`：以只读模式挂载 agent 工作区到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：以读写模式挂载 agent 工作区到 `/workspace`。

OpenShell backend 下：

- `mirror` 模式仍将本地工作区作为轮次间的权威来源
- `remote` 模式在初始播种后将远程 OpenShell 工作区作为权威来源
- `workspaceAccess: "ro"` 和 `"none"` 同样限制写操作行为

入站媒体被复制到活动的沙箱工作区中（`media/inbound/*`）。
技能说明：`read` 工具以沙箱根为基准。在 `workspaceAccess: "none"` 时，
OpenClaw 会将有资格的技能镜像到沙箱工作区（`.../skills`）以便读取。
使用 `"rw"` 时，工作区技能可从 `/workspace/skills` 读取。

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 可将额外宿主目录挂载到容器中。  
格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全局和每个 agent 的绑定是**合并**的（而非替换）。在 `scope: "shared"` 模式下，忽略每个 agent 的绑定。

`agents.defaults.sandbox.browser.binds` 仅将额外宿主目录挂载到**沙箱浏览器**容器。

- 设置后（包括设置为空数组 `[]`），会替代浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 未设置时，浏览器容器回退使用 `agents.defaults.sandbox.docker.binds`（兼容旧配置）。

示例（只读源码 + 额外数据目录）：

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

安全提醒：

- 绑定绕过沙箱文件系统限制：它们会暴露宿主机路径及您设置的访问模式（`:ro` 或 `:rw`）。
- OpenClaw 会阻止危险的绑定来源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，及任何父挂载暴露这些路径的绑定）。
- 敏感挂载（秘密、SSH 密钥、服务凭证）应保持 `:ro`，除非绝对必要。
- 如果只需工作区读取权限，请结合使用 `workspaceAccess: "ro"`；绑定模式独立控制。
- 详见 [沙箱 vs 工具策略 vs Elevated 执行](/gateway/sandbox-vs-tool-policy-vs-elevated)，了解绑定如何与工具策略和 Elevated 执行交互。

## 镜像与设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不包含** Node。如技能需要 Node（或其他运行时），请自行构建自定义镜像或通过 `sandbox.docker.setupCommand` 安装（需网络访问、可写根目录及 root 用户权限）。

如果想要一个包含常用工具的更全面沙箱镜像（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），请构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为  
`openclaw-sandbox-common:bookworm-slim`。

沙箱浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，Docker 沙箱容器运行时**无网络**。  
通过 `agents.defaults.sandbox.docker.network` 覆盖。

捆绑的沙箱浏览器镜像还应用了针对容器化工作负载的保守 Chromium 启动默认参数。目前容器默认配置包括：

- `--remote-debugging-address=127.0.0.1`
- `--remote-debugging-port=<由 OPENCLAW_BROWSER_CDP_PORT 派生>`
- `--user-data-dir=${HOME}/.chrome`
- `--no-first-run`
- `--no-default-browser-check`
- `--disable-3d-apis`
- `--disable-gpu`
- `--disable-dev-shm-usage`
- `--disable-background-networking`
- `--disable-extensions`
- `--disable-features=TranslateUI`
- `--disable-breakpad`
- `--disable-crash-reporter`
- `--disable-software-rasterizer`
- `--no-zygote`
- `--metrics-recording-only`
- `--renderer-process-limit=2`
- 启用 `noSandbox` 时，额外加上 `--no-sandbox` 和 `--disable-setuid-sandbox`。
- 三个图形防护参数（`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`）是可选的，适用于无 GPU 支持的容器。  
  如果您的工作负载需要 WebGL 或其他 3D/浏览器功能，请设置环境变量 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- 默认启用 `--disable-extensions`，可以通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用，此时适合依赖扩展的场景。
- `--renderer-process-limit=2` 由环境变量 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，设置为 `0` 时为 Chromium 默认值。

如果需要不同的运行时配置，请使用自定义浏览器镜像并自行提供入口命令。  
本地（非容器）Chromium 配置请使用 `browser.extraArgs` 追加启动参数。

安全默认值：

- 禁止使用 `network: "host"`。
- 默认禁止使用 `network: "container:<id>"`（存在命名空间加入绕过风险）。
- 破防措施：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装及容器化网关相关内容参考：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以使用
`OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/install/docker#enable-agent-sandbox-for-docker-gateway)。

## setupCommand（容器首次初始化命令）

`setupCommand` 在沙箱容器创建后**只运行一次**（不是每次运行都执行）。  
命令在容器内通过 `sh -lc` 执行。

配置路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个 agent：`agents.list[].sandbox.docker.setupCommand`

常见坑点：

- 默认 `docker.network` 是 `"none"`（无出网），导致包安装失败。
- `docker.network: "container:<id>"` 需要设置 `dangerouslyAllowContainerNamespaceJoin: true`，且仅作破防使用。
- `readOnlyRoot: true` 阻止写入；应设置 `readOnlyRoot: false` 或自行构建镜像。
- 运行用户必须是 root，才能安装软件包（省略 `user` 或设置为 `user: "0:0"`）。
- 沙箱执行**不会继承**宿主机 `process.env`，请通过 `agents.defaults.sandbox.docker.env` 配置环境变量（或自定义镜像）来传递技能 API Key。

## 工具策略及逃生通道

工具允许/拒绝策略仍在沙箱规则之前执行。如果工具被全局或按 agent 拒绝，启用沙箱也无效。

`tools.elevated` 是一个显式逃生通道，允许在宿主机上运行 `exec`。  
`/exec` 指令仅对授权发送者生效，且会话期间持续有效；要彻底禁用 `exec`，请使用工具策略拒绝（详见 [沙箱 vs 工具策略 vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试方法：

- 使用 `openclaw sandbox explain` 查看生效的沙箱模式、工具策略和修复建议配置键。
- 参见 [沙箱 vs 工具策略 vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 理解“为何被阻止”的思维模型。  
  请保持策略严格。

## 多 agent 覆盖设置

每个 agent 可覆盖沙箱及工具设置：  
`agents.list[].sandbox` 和 `agents.list[].tools`（包括 `agents.list[].tools.sandbox.tools` 用于沙箱工具策略）。  
详情见 [多 Agent 沙箱与工具](/tools/multi-agent-sandbox-tools) 的优先级说明。

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

## 相关文档

- [OpenShell](/gateway/openshell) -- 托管沙箱后端设置、工作区模式及配置参考
- [Sandbox Configuration](/gateway/configuration-reference#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为何被阻止？”
- [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools) -- 每个 agent 的覆盖设置及优先级
- [Security](/gateway/security)
