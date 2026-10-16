---
summary: "Docker 后端默认值、受限运行时姿势、DooD 约束和沙盒浏览器"
title: "Docker 后端"
read_when: "您正在运行默认的本地沙箱后端或启用沙箱浏览器。"
---

默认本地后端：其受限制的默认值、GPU 和 Docker-out-of-Docker 约束以及沙盒浏览器容器。

## <a id="docker-backend"></a> Docker 后端

Docker 后端通过 `docker` CLI 在本地运行工具。它的选择和错误行为不变；它不会检查或回退到 Podman。

默认值：`network: "none"`（无外部网络访问）、`readOnlyRoot: true`、`capDrop: ["ALL"]`、镜像 `openclaw-sandbox:bookworm-slim`。

此显式配置使代理工作区保持只读，并保留默认的受限运行时状态：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "docker",
        scope: "session",
        workspaceAccess: "ro",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          capDrop: ["ALL"],
        },
      },
    },
  },
}
```

OpenClaw 还会为 Docker 沙箱容器创建 init 进程，并启用 `no-new-privileges`。使用 `workspaceAccess: "ro"` 时，代理工作区会以只读方式挂载到 `/agent`；对代理工作区的写入操作会被拒绝，而配置的 tmpfs 路径仍保持可写。

文件工具需要主机支持的绑定安装。 tmpfs 或镜像卷可以隐藏工作空间绑定下的文件；文件工具将这些路径报告为仅容器路径，而不是读取隐藏的主机文件。使用 `exec` 访问该存储。当文件工具在容器中可见时，更深层次的显式绑定会恢复文件工具访问权限。当无法从容器的挂载表建立主机投影时，通过符号链接到达的挂载目标或具有不同后备存储的堆叠挂载也需要 `exec`。

对于最近使用的容器，对绑定源或访问模式的更改，或者对绑定下的 tmpfs 目标或只读模式的更改，需要范围内的重新创建。其他 tmpfs 选项（例如大小、模式和 uid）保持正常的配置更改行为：热容器保持运行并发出重新通知，而停止或过期的容器将被替换。显式重新创建以立即应用这些选项。

要公开主机 GPU，请将 `agents.defaults.sandbox.docker.gpus`（或每个代理覆盖）设置为 `"all"` 或 `"device=GPU-uuid"` 等值。这将传递到所选容器引擎的 Docker- 兼容 `--gpus` 标志，并需要兼容的主机 GPU 设置。对于此选项，Podman 需要 5.0 或更高版本。

<Warning>
**Docker-out-of-Docker（DooD）限制**

如果网关在 Docker 中运行，它将通过主机的 Docker 套接字创建同级沙箱容器。将工作空间路径保留在相对于网关文件系统的 `openclaw.json` 中，例如 `/home/node/.openclaw/workspace`。 OpenClaw 自动将托管工作区、代理工作区和技能安装转换为 Docker 主机的路径。 Shell 和浏览器容器使用相同的映射规则。嵌套网关绑定也会被投影，并保留其只读权限。

- 将工作区和 OpenClaw 状态目录绑定挂载到网关中。它们的主机和网关路径可以不同。
- 使用运行网关的 Docker 守护程序。 OpenClaw 在信任守护进程的挂载表之前验证其容器身份。
- 托管源及其可见嵌套安装必须来自绑定安装。网关映像中的命名卷、tmpfs 和文件是同级沙箱挂载不受支持的源。
- A 可写沙箱需要可写网关绑定。使用 `workspaceAccess: "ro"` 作为只读网关源。
- 显式 `sandbox.docker.binds` 和 `sandbox.browser.binds` 保留其主机路径合同。 OpenClaw 不会翻译这些运营商提供的源。
- 更改安装后重新启动网关或Docker联系。如果现有沙箱有不同的安装座，OpenClaw报告范围`sandbox recreate`命令。最近使用的容器将保持运行状态，直到您重新创建它们，但是OpenClaw拒绝重复使用他们陈旧的坐骑。

- **Codex 代码模式**：当 OpenClaw 沙箱处于活动状态时，OpenClaw 会在该轮禁用 Codex app-server 原生 Code Mode、用户 MCP 服务器以及由应用托管的插件执行（这些功能运行在 Gateway 所在主机上的 app-server 进程中，而不是 OpenClaw 沙箱后端），除非沙箱工具策略暴露了所需工具，并且你选择了实验性的 sandbox exec-server 路径。此时 Shell 访问会通过 OpenClaw 沙箱支持的工具路由，例如 `sandbox_exec` 和 `sandbox_process`。不要将主机 Docker socket 挂载到代理沙箱容器或自定义 Codex 沙箱中。完整行为请参见 [Codex Harness](/plugins/codex-harness)。

在启用了 Docker 沙箱模式的 Ubuntu/AppArmor 主机上，Codex 应用服务器 `workspace-write` shell 执行需要沙箱容器内的非特权用户命名空间，并且当服务用户无法创建它们时，这可能会在 shell 启动之前失败。当 Docker 沙箱出口被禁用（`network: "none"`，默认值）时，这也需要非特权网络命名空间。常见症状：`bwrap: setting up uid map: Permission denied` 和 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。

这些 Codex bwrap 检查在独立的 `openclaw doctor` 中运行，并在 `openclaw update` 期间被省略；更新后运行`openclaw doctor`。 Doctor 使用 `unshare` 检查用户命名空间。当禁用 Docker 沙箱出口并配置本地 Codex 运行时时，它还会运行已配置的 Codex 二进制文件自己的 `workspace-write` 沙箱，并禁用网络访问，从而执行 Bubblewrap 的环回设置。无法识别的检查失败将报告为未经验证，而不是命名空间诊断。如果 doctor 报告 Codex bwrap 命名空间检查失败，请首选 AppArmor 配置文件，该配置文件向 OpenClaw 服务进程授予所需的命名空间。 `kernel.apparmor_restrict_unprivileged_userns=0` 是一个主机范围的后备方案，需要进行安全权衡；仅当宿主姿势可接受时才使用它。不要仅仅为了满足嵌套的 `bwrap` 而授予更广泛的 Docker 容器权限。
</Warning>

### <a id="sandboxed-browser"></a> 沙箱浏览器

- 沙盒浏览器会自动启动，并在浏览器工具需要时等待 CDP 变得可访问。通过`agents.defaults.sandbox.browser.autoStart`（默认`true`）和`autoStartTimeoutMs`（默认12秒）进行配置。
- 沙箱浏览器容器使用专用 Docker 网络（`openclaw-sandbox-browser`），而不是全局的 `bridge` 网络。通过 `agents.defaults.sandbox.browser.network` 进行配置。
- 不支持沙箱浏览器网络模式 `"none"`，因为浏览器控制需要主机发布 CDP 端口。请使用专用默认网络、`bridge` 或其他自定义 bridge 网络。`openclaw doctor --fix` 会禁用受影响的持久化 sidecar，并恢复专用网络，不会在不提示的情况下启用出站访问。
- `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表（例如 `172.21.0.1/32`）限制容器边缘 CDP 入口。
- noVNC观察者访问默认受密码保护； OpenClaw 发出一个短期令牌 URL，该令牌服务于本地引导页面，并使用 URL 片段（不是查询字符串或标头日志）中的密码打开 noVNC。
- `agents.defaults.sandbox.browser.allowHostControl`（默认值为 `false`）允许沙箱会话显式指定主机浏览器作为目标。
- 可选的允许列表会限制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。
