---
summary: "一次性容器设置挂钩、其配置位置及其常见陷阱"
title: "setupCommand（一次性容器设置）"
read_when: "您需要在新创建的沙箱容器内运行一次性安装程序。"
---

创建沙箱容器后运行一次的钩子，以及最常导致其失败的默认值。

## <a id="setupcommand-(one-time-container-setup)"></a><a id="setupcommand-one-time-container-setup"></a> setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后**只运行一次**（不是每次运行都执行）。它通过 `sh -lc` 在容器内执行。

如果在设置完成之前撤销访问权限，OpenClaw 会保留容器及其保存的数据以供检查。稍后的请求会拒绝该不完整的容器，而不是重新启动它或重播设置。在显式 [ 重新创建沙箱 ](/cli/sandbox) 之前保留任何所需的容器数据。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 单个代理：`agents.entries.*.sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion id="common-pitfalls" title="常见陷阱">
    - 默认的 `docker.network` 是 `"none"`（无外网访问），因此安装软件包会失败。
    - `docker.network: "container:<id>"` 要求设置 `dangerouslyAllowContainerNamespaceJoin: true`，且仅限在紧急情况下使用。
    - `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false`，或构建自定义镜像。
    - 安装软件包时，`user` 必须为 root。Docker 可以省略 `user`，或设置为 `user: "0:0"`；rootful Podman 必须设置 `user: "0:0"`，因为其默认设置会保留工作区所有权。Rootless Podman 会拒绝值为零的用户；请将软件包预先构建到镜像中，或使用 rootful Podman。
    - 沙盒执行程序确实**不是**继承宿主`process.env`。使用`agents.defaults.sandbox.docker.env`（或自定义图像）以获取技能API键。
    - `agents.defaults.sandbox.docker.env` 中的值通过容器元数据命令（例如 `docker inspect` 或 `podman inspect`）保持可见。 Docker 和 Podman 需要可移植环境名称和单行非 NUL 值，因为安全引擎环境文件是行分隔的；配置验证和 `openclaw doctor` 在使用沙箱之前拒绝无效条目。重命名无效键、使用单行值或通过安装的文件或自定义图像提供多行材料；这需要手动修复，因为 `doctor --fix` 无法安全地保留原始值。 SSH 和 OpenShell 后端仍然支持多行值。如果元数据暴露不可接受，请使用自定义映像、已安装的秘密文件或其他秘密传送路径。

  </Accordion>
</AccordionGroup>
