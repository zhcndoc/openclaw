---
summary: "agents.defaults.sandbox 块：映像、安装、工作区模式和网络策略"
read_when:
  - "在容器内运行嵌入式代理"
  - "选择沙箱工作区模式或网络策略"
  - "构建或固定沙箱映像"
title: "配置——代理沙箱"
---

`agents.defaults.sandbox` 完整：嵌入式代理的图像选择、工作区模式、安装和网络策略。

<a id="agentsdefaultssandbox"></a>

## `agents.defaults.sandbox`

嵌入式代理的可选沙箱。完整指南请参见 [沙箱](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off (default) | non-main | all
        backend: "docker", // docker (default) | openshell | podman | ssh
        scope: "agent", // session | agent (default) | shared
        workspaceAccess: "none", // none (default) | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          gpus: "all",
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          noVncEnabled: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

上面显示的默认值 （`off`/`docker`/`agent`/`none`/`bookworm-slim` image/`none` network/etc.） 是实际的 OpenClaw 默认值，而不仅仅是说明性值。

<Accordion id="sandbox-details" title="沙盒详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `openshell`：OpenShell-托管本地或远程运行时
- `podman`：使用 Docker- 兼容设置的本地 Podman 运行时
- `ssh`：通用SSH-支持的远程运行时

插件管理的后端在其插件条目下保留运行时特定的设置：

- OpenShell： `plugins.entries.openshell.config`；参见 [OpenShell](/gateway/openshell)

**SSH 后端配置：**

- `target`: 形如 `user@host[:port]` 的 SSH 目标
- `command`: SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`: 用于每个作用域工作区的绝对远程根目录（默认：`/tmp/openclaw-sandboxes`）
- `identityFile` / `certificateFile` / `knownHostsFile`: 传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：内联内容或 OpenClaw 在运行时具体化到临时文件中的 SecretRefs
- `strictHostKeyChecking` / `updateHostKeys`: OpenSSH 主机密钥策略选项（两者默认均为 `true`）

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 基于 SecretRef 的 `*Data` 值会在沙箱会话开始前从活动 secrets 运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后会先播种一次远程工作区
- 然后使用远程 SSH 工作区作为事实来源
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动把远程更改同步回宿主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`: 每个作用域的沙箱工作区位于 `~/.openclaw/sandboxes` 下（默认）
- `ro`: 沙箱工作区位于 `/workspace`，代理工作区以只读方式挂载到 `/agent`
- `rw`：代理工作区安装在 `/workspace` 处的 read/write

**作用域：**

- `session`：每会话一个容器 + 工作区
- `agent`：每个代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**OpenShell 插件配置：**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror (default) | remote
          command: "openshell",
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          workspace: "research", // optional existing OpenShell workspace
          policy: "/etc/openclaw/openshell-policy.yaml", // optional host-side YAML file
          providers: ["openai"], // optional
          gpu: false,
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**OpenShell 模式：**

- `mirror`：执行前从本地远程播种，执行后同步回；本地工作空间仍然是事实的来源
- `remote`：创建沙箱时远程播种一次，然后使用远程工作区作为事实来源

在 `remote` 模式下，在 OpenClaw 外部进行的主机本地编辑不会在种子步骤后自动同步到沙箱中。将 SSH 传输到 OpenShell 沙箱中，但该插件拥有沙箱生命周期和可选的镜像同步。 `workspace` 为整个插件选择现有的 OpenShell 控制平面工作区；它与代理的文件系统工作区分开。 `policy` 必须指向 OpenClaw 网关可读的 YAML 文件，而不是命名策略 ID。请参阅 [OpenShell](/gateway/openshell) 了解设置、先决条件和故障排除。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络外联、可写 root、root 用户。

**Containers 默认为 `network: "none"`** — 如果代理需要出站访问，则设置为 `"bridge"`（或自定义桥接网络）。 `"host"` 已被阻止。默认情况下，`"container:<id>"` 会被阻止，除非您明确设置 `sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` （break-glass）。 Codex 应用程序服务器打开活动的 OpenClaw 沙箱，使用相同的出口设置进行本机代码模式网络访问。

**入站附件** 会被暂存到当前工作区中的 `media/inbound/*`。

**`docker.binds`** 会挂载额外的宿主目录；全局和逐代理的 binds 会合并。

**沙盒浏览器**（`sandbox.browser.enabled`，默认`false`）：容器中的Chromium + CDP。 `openclaw.json` 中不需要 `browser.enabled`。 noVNC 观察者访问受密码保护，并通过一次性、经过身份验证的引导程序 URL 进行代理。观察者 URL 被故意从模型可见的系统提示上下文中省略。

- `allowHostControl: false`（默认）会阻止沙箱会话定位宿主机浏览器。
- `network` 默认为 `openclaw-sandbox-browser`（专用 bridge 网络）。仅当你明确需要全局 bridge 连接时才设置为 `bridge`。由于 CDP 端口必须发布到宿主机，因此不支持 `"none"`；`"host"` 同样被阻止。升级时，`openclaw doctor --fix` 会禁用受持久化 `"none"` 值影响的 sidecar，并恢复专用网络，而不会在不知情的情况下启用出站访问。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站连接限制为某个 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的宿主目录挂载到沙箱浏览器容器中。设置后（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
- 沙箱浏览器容器中的 Chromium 始终以 `--no-sandbox --disable-setuid-sandbox` 启动（容器不具备 Chrome 自有沙箱所需的内核原语）；没有用于此设置的配置开关。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了调整：
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
  - `--disable-3d-apis`、`--disable-gpu` 和 `--disable-software-rasterizer` 默认启用；如果 WebGL/3D 使用需要，可通过 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用它们。
  - `--disable-extensions`（默认启用）；如果你的工作流依赖扩展，可通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 重新启用扩展。
  - `--renderer-process-limit=2` 默认启用；可通过 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改，设为 `0` 可使用 Chromium 的默认进程限制。
  - `--headless=new` 仅当 `headless` 使能时。
  - 默认值为容器镜像基线；如需更改容器默认值，请使用带自定义入口点的自定义浏览器镜像。

</Accordion>

沙箱浏览器需要 Docker 引擎。`sandbox.docker.binds` 同时适用于 Docker 和 Podman 后端。

构建镜像（从源码检出构建）：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

对于没有源签出的 npm 安装，请参阅 [ 沙箱§图像和设置 ](/gateway/sandboxing#images-and-setup) 以了解内联 `docker build` 命令。
