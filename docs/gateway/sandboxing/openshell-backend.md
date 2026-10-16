---
summary: "OpenShell 托管沙箱、其镜像和远程工作空间模式及其生命周期"
title: "OpenShell 后端"
read_when: "您是 OpenShell- 托管远程环境中的沙箱工具。"
---

基于相同 SSH 传输构建的 OpenShell 生命周期，以及其镜像和远程工作空间模式之间的差异。

## <a id="openshell-backend"></a> OpenShell 后端

在 OpenShell- 托管远程环境中使用 `backend: "openshell"` 沙箱工具。 OpenShell 重复使用与通用 SSH 后端相同的 SSH 传输和远程文件系统桥，并添加 OpenShell 生命周期 （`sandbox create/get/delete/ssh-config`） 以及可选的 `mirror` 工作区同步模式。

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

`mode: "mirror"`（默认）将本地工作区保留为事实来源：OpenClaw 在 `exec` 之前将本地同步到沙箱，然后再同步回来。 `mode: "remote"` 从本地播种远程工作空间一次，然后直接针对远程工作空间运行 `exec`/`read`/`write`/`edit`/`apply_patch`，无需同步回来；种子后的本地编辑在您 `openclaw sandbox recreate` 之前是不可见的。在 `scope: "agent"` 或 `scope: "shared"` 下，该远程工作区在同一范围内共享。当前限制：尚不支持沙箱浏览器，并且 `sandbox.docker.binds` 不适用于此后端。

`openclaw sandbox list`/`recreate`/prune 都将 OpenShell 运行时视为 Docker 运行时；修剪逻辑是后端感知的。

有关完整的前置条件、配置参考、工作区模式对比以及生命周期细节，请参阅 [OpenShell](/gateway/openshell)。
