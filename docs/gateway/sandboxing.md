---
summary: "OpenClaw 沙箱化的工作方式：模式、作用域、工作区访问和镜像"
title: "沙箱化"
sidebarTitle: "沙箱化"
read_when: "你想要了解沙箱化的专门说明，或者需要调整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在 **沙箱后端中运行工具**，以减少影响范围。这是**可选的**，由配置控制（`agents.defaults.sandbox` 或 `agents.list[].sandbox`）。如果关闭沙箱化，工具会在主机上运行。Gateway 始终运行在主机上；启用后，工具执行会在隔离的沙箱中进行。

<Note>
这并不是完美的安全边界，但当模型做出一些愚蠢操作时，它确实能显著限制文件系统和进程访问。
</Note>

## 什么会被沙箱化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱浏览器（`agents.defaults.sandbox.browser`）。

<AccordionGroup>
  <Accordion title="沙箱浏览器详情">
    - 默认情况下，当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可达）。可通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 配置。
    - 默认情况下，沙箱浏览器容器使用专用 Docker 网络（`openclaw-sandbox-browser`），而不是全局的 `bridge` 网络。可通过 `agents.defaults.sandbox.browser.network` 配置。
    - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 会通过 CIDR 白名单限制容器边缘的 CDP 入口流量（例如 `172.21.0.1/32`）。
    - 默认情况下，noVNC 观察者访问受密码保护；OpenClaw 会发出一个短生命周期的令牌 URL，它会提供本地引导页面，并以 URL fragment 的形式打开 noVNC（不会出现在 query/header 日志中）。
    - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱会话显式目标为主机浏览器。
    - 可选白名单可对 `target: "custom"` 进行限制：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

  </Accordion>
</AccordionGroup>

未被沙箱化的内容：

- Gateway 进程本身。
- 任何被显式允许在沙箱外运行的工具（例如 `tools.elevated`）。
  - **Elevated exec 会绕过沙箱化，并使用配置的逃逸路径（默认是 `gateway`，如果 exec 目标是 `node`，则为 `node`）。**
  - 如果沙箱化关闭，`tools.elevated` 不会改变执行方式（因为本来就已经在主机上运行）。参见 [Elevated Mode](/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱化：

<Tabs>
  <Tab title="off">
    不使用沙箱化。
  </Tab>
  <Tab title="non-main">
    只对**非主**会话使用沙箱（如果你希望普通聊天在主机上运行，这是默认选择）。

    `"non-main"` 基于 `session.mainKey`（默认 `"main"`），而不是 agent id。组/频道会话使用自己的 key，因此它们会被视为非主会话并被沙箱化。

  </Tab>
  <Tab title="all">
    每个会话都在沙箱中运行。
  </Tab>
</Tabs>

## 作用域

`agents.defaults.sandbox.scope` 控制会创建**多少个容器**：

- `"agent"`（默认）：每个 agent 一个容器。
- `"session"`：每个会话一个容器。
- `"shared"`：所有被沙箱化的会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制**由哪个运行时**提供沙箱：

- `"docker"`（启用沙箱化时的默认值）：本地 Docker 驱动的沙箱运行时。
- `"ssh"`：通用的、基于 SSH 的远程沙箱运行时。
- `"openshell"`：基于 OpenShell 的沙箱运行时。

SSH 专属配置位于 `agents.defaults.sandbox.ssh` 下。OpenShell 专属配置位于 `plugins.entries.openshell.config` 下。

### 选择后端

|                     | Docker                           | SSH                            | OpenShell                                           |
| ------------------- | -------------------------------- | ------------------------------ | --------------------------------------------------- |
| **运行位置**        | 本地容器                         | 任意可 SSH 访问的主机          | OpenShell 管理的沙箱                                  |
| **设置**            | `scripts/sandbox-setup.sh`       | SSH 密钥 + 目标主机            | 启用 OpenShell 插件                                   |
| **工作区模型**      | 绑定挂载或复制                   | 远程为准（首次种子化）         | `mirror` 或 `remote`                                 |
| **网络控制**        | `docker.network`（默认：none）   | 取决于远程主机                  | 取决于 OpenShell                                      |
| **浏览器沙箱**      | 支持                             | 不支持                         | 目前不支持                                            |
| **绑定挂载**        | `docker.binds`                   | 不适用                         | 不适用                                                |
| **最适合**          | 本地开发、完全隔离               | 卸载到远程机器                  | 带可选双向同步的托管远程沙箱                            |

### Docker 后端

沙箱化默认是关闭的。如果你启用沙箱化但没有选择后端，OpenClaw 会使用 Docker 后端。它通过 Docker 守护进程 socket（`/var/run/docker.sock`）在本地执行工具和沙箱浏览器。沙箱容器的隔离由 Docker 命名空间决定。

要将主机 GPU 暴露给 Docker 沙箱，请设置 `agents.defaults.sandbox.docker.gpus` 或按 agent 覆盖 `agents.list[].sandbox.docker.gpus`。该值会作为单独参数传递给 Docker 的 `--gpus` 标志，例如 `"all"` 或 `"device=GPU-uuid"`，并且需要兼容的主机运行时，例如 NVIDIA Container Toolkit。

<Warning>
**Docker-out-of-Docker（DooD）限制**

如果你将 OpenClaw Gateway 本身部署为 Docker 容器，它会使用主机的 Docker socket（DooD）来编排同级沙箱容器。这会引入一个特定的路径映射约束：

- **配置要求主机路径**：`openclaw.json` 中的 `workspace` 配置 MUST 包含**主机的绝对路径**（例如 `/home/user/.openclaw/workspaces`），而不是 Gateway 容器内部路径。当 OpenClaw 请求 Docker 守护进程启动沙箱时，守护进程会在 Host OS 命名空间下解析路径，而不是在 Gateway 命名空间下。
- **文件系统桥接一致性（相同的卷映射）**：OpenClaw Gateway 的原生进程也会向 `workspace` 目录写入 heartbeat 和 bridge 文件。由于 Gateway 会在其容器化环境中解析完全相同的字符串（主机路径），Gateway 部署 MUST 包含一个相同的卷映射，以原生方式将主机命名空间链接起来（`-v /home/user/.openclaw:/home/user/.openclaw`）。

如果你只是在内部映射路径，而没有主机绝对路径的一致性，OpenClaw 在尝试于容器环境中写入 heartbeat 时会原生抛出 `EACCES` 权限错误，因为完整限定路径字符串在原生环境中并不存在。
</Warning>

### SSH 后端

当你希望 OpenClaw 在任意可 SSH 访问的机器上对 `exec`、文件工具和媒体读取进行沙箱化时，请使用 `backend: "ssh"`。

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

<AccordionGroup>
  <Accordion title="工作原理">
    - OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。
    - 在创建或重新创建后的首次使用时，OpenClaw 会先从本地工作区向该远程工作区种子化一次。
    - 之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示词媒体读取，以及入站媒体暂存，都会直接通过 SSH 针对远程工作区运行。
    - OpenClaw 不会自动把远程更改同步回本地工作区。

  </Accordion>
  <Accordion title="认证材料">
    - `identityFile`、`certificateFile`、`knownHostsFile`：使用现有本地文件，并通过 OpenSSH 配置传递。
    - `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 会通过正常的 secrets 运行时快照来解析它们，将其写入权限为 `0600` 的临时文件，并在 SSH 会话结束时删除它们。
    - 如果同一个项目同时设置了 `*File` 和 `*Data`，则该 SSH 会话中 `*Data` 优先。

  </Accordion>
  <Accordion title="远程为准的后果">
    这是一个**远程为准**的模型。初始种子化之后，远程 SSH 工作区会成为真实的沙箱状态。

    - 在种子化步骤之后，如果你在 OpenClaw 之外修改了主机本地文件，这些修改在远程不可见，直到你重新创建沙箱。
    - `openclaw sandbox recreate` 会删除按作用域划分的远程根目录，并在下次使用时重新种子化。
    - SSH 后端不支持浏览器沙箱化。
    - `sandbox.docker.*` 设置不适用于 SSH 后端。

  </Accordion>
</AccordionGroup>

### OpenShell 后端

当你希望 OpenClaw 在 OpenShell 管理的远程环境中对工具进行沙箱化时，请使用 `backend: "openshell"`。完整的设置指南、配置参考和工作区模式对比，请参见专门的 [OpenShell 页面](/gateway/openshell)。

OpenShell 重用了与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接，并添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`、`sandbox ssh-config`）以及可选的 `mirror` 工作区模式。

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

- `mirror`（默认）：本地工作区保持为准。OpenClaw 会在 exec 之前将本地文件同步到 OpenShell 中，并在 exec 之后将远程工作区同步回去。
- `remote`：沙箱创建后，OpenShell 工作区成为准则。OpenClaw 会先从本地工作区向远程工作区种子化一次，然后文件工具和 exec 会直接对远程沙箱运行，而不会再把更改同步回来。

<AccordionGroup>
  <Accordion title="远程传输详情">
    - OpenClaw 会通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求沙箱特定的 SSH 配置。
    - Core 会把该 SSH 配置写入临时文件，打开 SSH 会话，并重用 `backend: "ssh"` 所使用的同一个远程文件系统桥接。
    - 只有在 `mirror` 模式下，生命周期才有所不同：exec 前同步本地到远程，exec 后再同步回来。

  </Accordion>
  <Accordion title="当前 OpenShell 限制">
    - 目前不支持沙箱浏览器
    - OpenShell 后端不支持 `sandbox.docker.binds`
    - `sandbox.docker.*` 下的 Docker 特定运行时参数仍然只适用于 Docker 后端

  </Accordion>
</AccordionGroup>

#### 工作区模式

OpenShell 有两种工作区模型。这是实践中最重要的部分。

<Tabs>
  <Tab title="mirror（本地为准）">
    当你希望**本地工作区保持为准**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

    行为：

    - 在 `exec` 之前，OpenClaw 会把本地工作区同步到 OpenShell 沙箱中。
    - 在 `exec` 之后，OpenClaw 会把远程工作区同步回本地工作区。
    - 文件工具仍然通过沙箱桥接运行，但在各轮交互之间，本地工作区保持为事实来源。

    在以下情况下使用：

    - 你在 OpenClaw 外部本地编辑文件，并希望这些更改自动出现在沙箱中
    - 你希望 OpenShell 沙箱尽可能表现得像 Docker 后端
    - 你希望主机工作区在每次 exec 轮次后反映沙箱写入

    代价：exec 前后会有额外同步开销。

  </Tab>
  <Tab title="remote（OpenShell 为准）">
    当你希望**OpenShell 工作区成为准则**时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

    行为：

    - 当沙箱首次创建时，OpenClaw 会先从本地工作区向远程工作区种子化一次。
    - 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 会直接针对远程 OpenShell 工作区运行。
    - OpenClaw 在 exec 之后**不会**把远程更改同步回本地工作区。
    - 提示时的媒体读取仍然有效，因为文件和媒体工具是通过沙箱桥接读取，而不是假定本地主机路径。
    - 传输方式是通过 `openshell sandbox ssh-config` 返回的 SSH 进入 OpenShell 沙箱。

    重要后果：

    - 如果你在种子化步骤之后在 OpenClaw 之外修改主机上的文件，远程沙箱**不会**自动看到这些更改。
    - 如果沙箱被重新创建，远程工作区会再次从本地工作区进行种子化。
    - 使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区会在相同作用域内共享。

    在以下情况下使用：

    - 沙箱应该主要存在于远程 OpenShell 一侧
    - 你希望更低的每轮同步开销
    - 你不希望主机本地编辑静默覆盖远程沙箱状态

  </Tab>
</Tabs>

如果你把沙箱看作临时执行环境，就选择 `mirror`。如果你把沙箱看作真实工作区，就选择 `remote`。

#### OpenShell 生命周期

OpenShell 沙箱仍然通过正常的沙箱生命周期进行管理：

- `openclaw sandbox list` 会同时显示 OpenShell 运行时和 Docker 运行时
- `openclaw sandbox recreate` 会删除当前运行时，并允许 OpenClaw 在下次使用时重新创建它
- 清理逻辑也会识别后端类型

对于 `remote` 模式，recreate 尤其重要：

- recreate 会删除该作用域下的准则远程工作区
- 下次使用时会从本地工作区种子化一个新的远程工作区

对于 `mirror` 模式，recreate 主要是重置远程执行环境，因为本地工作区本来就是准则。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制**沙箱能看到什么**：

<Tabs>
  <Tab title="none (default)">
    工具会看到位于 `~/.openclaw/sandboxes` 下的沙箱工作区。
  </Tab>
  <Tab title="ro">
    将代理工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。
  </Tab>
  <Tab title="rw">
    将代理工作区以读写方式挂载到 `/workspace`。
  </Tab>
</Tabs>

使用 OpenShell 后端时：

- `mirror` 模式在各次 exec 之间仍将本地工作区作为权威来源
- `remote` 模式在初始种子之后使用远程 OpenShell 工作区作为权威来源
- `workspaceAccess: "ro"` 和 `"none"` 仍然会以相同方式限制写入行为

传入媒体会被复制到活动沙箱工作区（`media/inbound/*`）。

<Note>
**技能说明：** `read` 工具以沙箱为根。使用 `workspaceAccess: "none"` 时，OpenClaw 会将符合条件的技能镜像到沙箱工作区（`.../skills`），以便读取。使用 `"rw"` 时，工作区技能可从 `/workspace/skills` 读取。
</Note>

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 会将额外的主机目录挂载到容器中。格式为 `host:container:mode`（例如：`"/home/user/source:/source:rw"`）。

全局绑定和按代理绑定会**合并**（不是替换）。在 `scope: "shared"` 下，按代理绑定会被忽略。

`agents.defaults.sandbox.browser.binds` 仅会将额外的主机目录挂载到**沙箱浏览器**容器中。

- 设置后（包括 `[]`），它会替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 未设置时，浏览器容器会回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

示例（只读源目录 + 一个额外的数据目录）：

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

- 绑定会绕过沙箱文件系统：它们会以你设置的模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 会阻止危险的绑定来源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及会暴露这些路径的父级挂载）。
- OpenClaw 还会阻止常见的主目录凭据根目录，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 绑定验证不只是字符串匹配。OpenClaw 会规范化源路径，然后通过最深的现有祖先再次解析它，之后重新检查被阻止路径和允许的根目录。
- 这意味着，即使最终叶子节点尚不存在，符号链接父级逃逸也会失败关闭。示例：如果 `run-link` 指向 `/var/run/...`，那么 `/workspace/run-link/new-file` 仍会解析为 `/var/run/...`。
- 允许的源根目录也会以同样方式规范化，因此仅在符号链接解析之前看起来位于允许列表内的路径，仍会被拒绝为 `outside allowed roots`。
- 敏感挂载（密钥、SSH 密钥、服务凭据）应使用 `:ro`，除非绝对必要。
- 如果你只需要对工作区的读取访问，请结合使用 `workspaceAccess: "ro"`；绑定模式仍然彼此独立。
- 有关绑定如何与工具策略和提升执行交互，请参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

</Warning>

## 镜像与设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Steps>
  <Step title="构建默认镜像">
    ```bash
    scripts/sandbox-setup.sh
    ```

    默认镜像**不**包含 Node。如果某个技能需要 Node（或其他运行时），可以自行构建自定义镜像，或者通过 `sandbox.docker.setupCommand` 安装（需要网络外连 + 可写根目录 + root 用户）。

    当 `openclaw-sandbox:bookworm-slim` 缺失时，OpenClaw 不会静默地用普通的 `debian:bookworm-slim` 替代。以默认镜像为目标的沙箱运行会立即失败，并给出构建说明，直到你运行 `scripts/sandbox-setup.sh`，因为捆绑镜像带有 `python3`，供沙箱写入/编辑辅助工具使用。

  </Step>
  <Step title="可选：构建通用镜像">
    为获得带有常用工具的更实用沙箱镜像（例如 `curl`、`jq`、`nodejs`、`python3`、`git`）：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="可选：构建沙箱浏览器镜像">
    ```bash
    scripts/sandbox-browser-setup.sh
    ```
  </Step>
</Steps>

默认情况下，Docker 沙箱容器以**无网络**方式运行。可通过 `agents.defaults.sandbox.docker.network` 覆盖。

<AccordionGroup>
  <Accordion title="沙箱浏览器 Chromium 默认值">
    随附的沙箱浏览器镜像也会为容器化工作负载应用保守的 Chromium 启动默认值。当前容器默认值包括：

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
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
    - 启用 `noSandbox` 时使用 `--no-sandbox`。
    - 三个图形加固标志（`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`）是可选的，在容器缺少 GPU 支持时很有用。如果你的工作负载需要 WebGL 或其他 3D/浏览器特性，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - `--disable-extensions` 默认启用，若流程依赖扩展，可通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 关闭。
    - `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认值。

    如果你需要不同的运行时配置，请使用自定义浏览器镜像并提供自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 追加额外的启动标志。

  </Accordion>
  <Accordion title="网络安全默认值">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
    - 紧急放行覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关位于此处：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。你可以使用 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整设置和环境变量参考：[Docker](/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后**只运行一次**（不是每次运行都执行）。它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 按代理：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常见陷阱">
    - 默认 `docker.network` 为 `"none"`（无外连），因此包安装会失败。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且仅用于紧急放行。
    - `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
    - 进行包安装时 `user` 必须是 root（省略 `user` 或设置 `user: "0:0"`）。
    - 沙箱 exec **不会**继承主机的 `process.env`。技能 API 密钥请使用 `agents.defaults.sandbox.docker.env`（或自定义镜像）。

  </Accordion>
</AccordionGroup>

## 工具策略与逃生阀

在沙箱规则之前，工具的允许/拒绝策略仍然适用。如果某个工具在全局或按代理层面被拒绝，沙箱化也不会把它恢复。

`tools.elevated` 是一个显式逃生阀，会在沙箱外运行 `exec`（默认在 `gateway`，如果 exec 目标是 `node`，则在 `node` 中运行）。`/exec` 指令仅适用于授权发送者，并且按会话持久化；若要彻底禁用 `exec`，请使用工具策略拒绝（参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 检查实际生效的沙箱模式、工具策略和修复配置键。
- 有关“为什么这被阻止？”的思维模型，请参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

保持锁定状态。

## 多代理覆盖

每个代理都可以覆盖沙箱 + 工具：`agents.list[].sandbox` 和 `agents.list[].tools`（以及用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。有关优先级，请参见 [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)。

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

- [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools) — 按代理覆盖与优先级
- [OpenShell](/gateway/openshell) — 托管沙箱后端设置、工作区模式和配置参考
- [Sandbox configuration](/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么这被阻止？”
- [Security](/gateway/security)
