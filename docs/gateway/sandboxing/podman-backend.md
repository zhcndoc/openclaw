---
summary: "选择本机 Podman CLI、无根用户映射和 Podman-outside-of-Podman 约束"
title: "Podman 后端"
read_when: "您正在使用 Podman 而不是 Docker 来执行沙盒工具。"
---

选择本机 Podman CLI 作为内置后端、其重用的 Docker 设置及其无根用户映射规则。

本页面介绍了 Podman 作为代理工具执行的沙箱后端。在无根 Podman 容器中运行网关本身是一个单独的设置：请参阅 [Podman](/install/podman)。

## <a id="podman-backend"></a> Podman 后端

使用`sandbox.backend: "podman"`直接选择原生的`podman` CLI。这是一个内置后端，而不是插件。即使安装了 `docker` 可执行文件，它也不会检查或选择 Docker。

Podman 会复用现有的 `sandbox.docker.*` 设置和当前原生 `podman` CLI 上下文；它不会添加单独的连接配置界面。

对于可写工作区挂载，无根 Podman 默认为 `--userns=keep-id`。长期存在的沙箱可以保留从属 ID 并阻止不相关的 `--userns=auto` 工作负载；在开始这些工作负载之前将其删除。将 `sandbox.docker.user` 设置为非零数字 UID 或 UID：GID 以控制容器用户。 Rootless Podman 拒绝 UID 或 GID 0，因为 Podman 4.x 无法在保留工作空间绑定所有权的同时重新映射名称空间根；将需要 root 的设置烘焙到映像中或使用 root Podman。 Rootful Podman 否则将使用可用的工作区所有者。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "podman",
        scope: "session",
        workspaceAccess: "rw",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          network: "none",
          readOnlyRoot: true,
          capDrop: ["ALL"],
        },
      },
    },
  },
}
```

启用后端之前，请先将沙箱镜像构建或拉取到所选的 Podman 存储中。在源代码检出目录中，可以使用 Podman 构建相同的沙箱 Dockerfile：

```bash
podman build -t openclaw-sandbox:bookworm-slim -f scripts/docker/sandbox/Dockerfile .
```

## <a id="changing-connections-and-upgrading-existing-sandboxes"></a> 更改连接并升级现有沙箱

当设置了两个环境选择器时，OpenClaw 遵循已安装的 Podman **client**：Podman 4.8 和更新版本更喜欢非空 `CONTAINER_CONNECTION`； Podman 4.7 在存在时更喜欢 `CONTAINER_HOST`。引擎的服务器版本不决定此优先级。如果 OpenClaw 无法识别设置了两个选择器的客户端版本，则它会拒绝不明确的选择。取消设置未使用的选择器或修复客户端的 `podman --version` 命令。

每个沙箱记录其引擎 URI，对于 Podman 机器，记录其 SSH 身份。即使客户选择了 `CONTAINER_CONNECTION`，早期的 OpenClaw 版本也可以固定 `CONTAINER_HOST`。升级后，这些现有沙箱可以报告“活动 Podman 连接已更改”。 OpenClaw 保留旧的沙箱和注册表项，而不是删除新选择的引擎上的容器。

在切换之前通过其记录的端点退出旧沙箱：

1. Pause 使用受影响沙箱的运行。使用相同的 OS 用户、OpenClaw 配置文件、配置和状态目录作为以下命令的网关。
2. 恢复原始 `CONTAINER_HOST`，对于 Podman 机器，恢复原始 `CONTAINER_SSHKEY`。在该命令环境中取消设置 `CONTAINER_CONNECTION`。 The original endpoint must be reachable， and a Podman Machine must be running。
3. 使用受影响的沙箱的确切值`sessionKey`。虽然所有注册的沙箱都使用恢复的目标，`openclaw sandbox list --json`显示该键和录制的URI和身份在`backendTarget.globalArgs`。在更改连接之前保存这些值。如果条目已经跨引擎，则全局列表可能会失败；将之前录制的密钥与下面的范围内的游戏一起使用。如果该密钥未知，请保留注册表并确定确切的范围，然后再继续。
4. 将任何需要的数据保留在容器的可写层中，然后运行`openclaw sandbox recreate --session "<sessionKey>"`。确认前查看预览。这将删除选定的容器；已安装的工作区文件仍然存在。
5. 设置预期的`CONTAINER_CONNECTION`并取消设置未使用的`CONTAINER_HOST`和`CONTAINER_SSHKEY`。将该环境也应用到网关。检查沙盒映像和工作区在所选引擎上是否可用。下一次使用会在那里创建一个新的沙箱；它不会转移旧容器的可写层。

如果无法恢复原始端点或身份，请保留注册表项并首先修复该连接。请勿编辑记录的目标或删除注册表项以绕过检查。 `recreate --force` 只跳过确认；它不会绕过端点验证。

## <a id="host-init-prerequisite"></a> 主机初始化先决条件

OpenClaw 使用 `--init` 创建 Podman 沙箱，因此会收获孤立的工具进程。 Podman 引擎主机需要其 init 可执行文件，通常为 `catatonit`。仅将其安装在沙箱映像内并不能满足此要求。对于 Podman 机器，可执行文件属于机器内部，而不是客户端主机上。

在 Debian 或 Ubuntu 上，使用 `--no-install-recommends` 的最小安装可以省略帮助程序。在配置引擎主机时明确包含它：

```bash
sudo apt-get install podman catatonit
```

如果沙箱创建报告 `lookup init binary` 或 `container-init binary not found on the host`，请安装帮助程序或修复 Podman 在 `containers.conf` 中配置的 `init_path`/`helper_binaries_dir`，然后重试。 Podman 可以解析 `PATH` 之外的助手；成功的 `podman info` 并不能证明 `--init` 有效。保持沙箱和 `--init` 启用，而不是绕过此先决条件。

Podman 注意事项：

- Podman 不支持浏览器沙箱；请保持 `sandbox.browser.enabled` 关闭，或安装 Docker 并选择 `backend: "docker"`。
- 支持本地 Podman 引擎和 Podman Machine。Podman Machine 的绑定源必须位于主机主目录下，因为该目录是其默认共享卷。拒绝任意远程 Podman 连接；远程执行请使用 SSH 后端。
- 自定义 `tmpfs` 或绑定挂载不得覆盖 `/run/podman-init`；OpenClaw 会拒绝这些配置，以确保沙箱清理继续正常工作。

<Warning>
**Podman-Podman 约束之外**

容器化的 Gateway 会通过主机的本地 Podman 引擎或 Podman Machine 创建同级沙箱。

- **一致地使用主机路径**：使用其主机绝对路径配置 `workspace`，然后将完整的状态根和工作空间挂载到网关的相同路径中。否则，沙箱可能会挂载工作区，而网关无法写入技能工作区文件。
- **Podman 机器设置**：绑定源必须位于主机主目录下。将网关 `HOME` 设置为该路径，并将 `OPENCLAW_HOME`、`OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_DIR` 指向已解析的已安装状态根。该映像需要兼容的 Podman 客户端、其命名连接和 SSH 身份，以及用于已知主机元数据的专用可写 SSH 目录。
- **仅允许 Gateway 访问 Podman**：绝不要将引擎套接字、连接材料或 SSH 身份挂载到代理沙箱中。不支持任意远程连接；请改用 SSH 后端。

</Warning>
