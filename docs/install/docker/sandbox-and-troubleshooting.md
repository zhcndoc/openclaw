---
summary: "在 Docker 沙箱中运行代理工具，并修复行为不当的网关容器"
read_when:
  - "您希望在容器中隔离代理工具的执行"
  - "沙盒映像或 Control UI 配对不起作用"
title: "Docker代理沙箱及故障排除"
sidebarTitle: "沙箱和故障排除"
---

启用 Docker 代理沙箱，并修复沙箱图像、权限和 Control UI 配对。 [Docker](/install/docker) 指南的一部分。

## <a id="agent-sandbox"></a> Agent 沙箱

当通过 Docker 后端启用 `agents.defaults.sandbox` 时，网关在隔离的 Docker 容器内运行代理工具执行（shell、文件 read/write 等），而网关本身保留在主机上 — 围绕不受信任或多租户代理会话的硬墙，无需容器化整个网关。

沙箱范围可以是每个代理（默认）、每个会话或共享；每个示波器都有自己的工作空间，安装在 `/workspace`。您还可以配置 allow/deny 工具策略、网络隔离、资源限制和浏览器容器。

完整配置、镜像、安全说明和多代理配置文件请参见：

- [沙箱](/gateway/sandboxing) -- 完整沙箱参考
- [OpenShell](/gateway/openshell) -- OpenShell-管理的本地或远程沙箱后端
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) -- 每个代理覆盖

### <a id="quick-enable"></a> 快速启用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

构建默认沙箱镜像（从源码检出目录）：

```bash
scripts/sandbox-setup.sh
```

对于没有源签出的 npm 安装，请参阅 [ 沙箱§图像和设置 ](/gateway/sandboxing#images-and-setup) 以了解内联 `docker build` 命令。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="image-missing-or-sandbox-container-not-starting" title="图像丢失或沙箱容器未启动">
    使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)（源码检出）或 [沙箱 § 镜像和设置](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令（npm install）构建沙箱镜像，或者将 `agents.defaults.sandbox.docker.image` 设置为你的自定义镜像。容器会按需为每个会话自动创建。
  </Accordion>

  <Accordion id="permission-errors-in-sandbox" title="沙盒中的权限错误">
    将 `docker.user` 设置为与你挂载的工作区所有权匹配的 UID:GID，或者将工作区文件夹的所有者改为当前用户。
  </Accordion>

  <Accordion id="custom-tools-not-found-in-sandbox" title="沙箱中未找到自定义工具">
    OpenClaw 使用 `sh -lc`（登录 shell）运行命令，这会加载 `/etc/profile` 并可能重置 PATH。将 `docker.env.PATH` 设置为在前面追加你的自定义工具路径，或者在你的 Dockerfile 中于 `/etc/profile.d/` 下添加一个脚本。
  </Accordion>

  <Accordion id="oom-killed-during-image-build-exit-137" title="OOM-在映像构建期间被杀死（出口 137）">
    本地源镜像构建至少需要 6 个 GB RAM。使用更大的机器类或预构建的映像并重试。
  </Accordion>

  <Accordion id="unauthorized-or-pairing-required-in-control-ui" title="Control UI 中未经授权或需要配对">
    获取新的仪表盘链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表盘](/web/dashboard)，[设备](/cli/devices)。

  </Accordion>

  <Accordion id="gateway-target-shows-ws-172-x-x-x-or-pairing-errors-from-docker-cli" title="网关目标显示 ws：//172.x.x.x 或来自 Docker CLI 的配对错误">
    重置网关模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>
