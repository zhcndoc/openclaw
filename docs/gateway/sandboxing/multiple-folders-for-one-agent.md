---
summary: "Docker 额外主机文件夹的绑定安装、其访问模式以及绑定安全规则"
title: "一名代理的多个文件夹"
read_when: "一个沙盒代理需要的不仅仅是其主要工作空间。"
---

通过绑定安装为沙盒代理提供额外的主机文件夹、绑定模式如何与工作区访问相关以及默认情况下源 OpenClaw 块。

## <a id="multiple-folders-for-one-agent"></a> 一个代理使用多个文件夹

当一个沙箱代理需要使用主工作区之外的其他目录时，请使用 Docker 绑定挂载。每个条目都会将主机文件夹映射到容器路径，并明确指定访问模式：

```text
host-directory:container-directory:ro
host-directory:container-directory:rw
```

- `ro` 使挂载的文件夹在沙箱内只读。
- `rw` 允许沙箱中的工具和进程修改主机文件夹。
- 容器路径是代理使用的路径。主机路径不会自动暴露。

此示例为 `research` 代理提供一个可写的主工作区、挂载到 `/reference` 的只读参考资料，以及挂载到 `/drafts` 的单独可写输出文件夹：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        scope: "agent",
      },
    },
    entries: {
      research: {
        workspace: "/srv/openclaw/research-workspace",
        sandbox: {
          workspaceAccess: "rw",
          docker: {
            binds: ["/srv/shared/reference:/reference:ro", "/srv/shared/drafts:/drafts:rw"],
            // Required because these sources are outside the agent workspace.
            dangerouslyAllowExternalBindSources: true,
          },
        },
      },
    },
  },
}
```

`workspaceAccess` 和绑定模式彼此独立：

| 设置                          | 控制范围                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `workspaceAccess: "none"`        | 使用可写的隔离沙箱工作区；不公开代理工作区。 |
| `workspaceAccess: "ro"`          | 将代理工作区以只读方式挂载到 `/agent`。                                |
| `workspaceAccess: "rw"`          | 将代理工作区 read/write 安装在 `/workspace` 处。                           |
| `docker.binds` 条目 `:ro`/`:rw` | 仅控制配置的容器路径上的额外主机文件夹。      |

更改 `workspaceAccess` 不会将额外绑定从 `ro` 改为 `rw`，反之亦然。全局和每个代理的 `docker.binds` 会进行合并。对于每个代理的绑定，请保留 `scope: "agent"` 或 `"session"`；`scope: "shared"` 会忽略所有每个代理的 Docker 覆盖设置，仅使用全局绑定。

当多个绑定使用相同的容器目标时，最后一个条目获胜，包括其源和只读模式。每个代理条目遵循全局条目。 Shell 和文件工具使用相同的选择。受管理的只读技能坐骑在其目标仍然具有权威性。相对文件路径和主机路径别名通过选定的容器安装进行解析，包括嵌套覆盖。即使显式绑定替换其主机文件夹，仅限工作区的写入、编辑、列出和修补也会使用容器工作区边界。额外的挂载读取异常不会授予该边界之外的写入操作。

绑定挂载是支持多文件夹边界的方式，因为 Docker 会通过挂载隔离来构建容器的文件系统视图，并且 `ro`/`rw` 模式会应用于沙箱中的每个进程。该边界涵盖 `exec`、文件系统工具、子进程和库，无需在每个 OpenClaw 代码路径中重复路径授权检查。当允许的 shell 或依赖项可以直接访问文件时，主机侧路径允许列表无法提供同样完整的边界。

选择启用的 `dangerouslyAllowExternalBindSources` 仅允许使用工作区根目录之外的源。它不会禁用 OpenClaw 对系统路径、凭据、Docker socket、符号链接父级或保留目标的阻止检查。请优先选择最小范围的文件夹；除非确实需要写入，否则使用 `ro`，并在更改挂载后重新创建沙箱：

```bash
openclaw sandbox recreate --agent research
```

### <a id="other-bind-behavior"></a> 其他绑定行为

`agents.defaults.sandbox.docker.binds` 配置全局挂载。格式与 `host:container:mode` 形式相同（例如，`"/home/user/source:/source:rw"`）。

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
    entries: {
      build: {
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    },
  },
}
```

<Warning>
**绑定安全性**

- 绑定会绕过 sandbox 文件系统：它们会以你设置的任意模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 默认会阻止危险的绑定源：系统路径（`/etc`、`/proc`、`/sys`、`/dev`、`/root`、`/boot`）、Docker socket 目录（`/run`、`/var/run` 及其 `docker.sock` 变体），以及常见的家目录凭据根目录（`~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm`、`~/.ssh`）。
- Validation 规范化源路径，然后在重新检查阻止的路径和允许的根之前通过最深的现有祖先再次解析它，因此即使最终叶子尚不存在，符号链接父转义也会被拒绝（如果 `run-link` 指向那里，e.g. `/workspace/run-link/new-file` 仍然解析为 `/var/run/...`）。
- 覆盖保留的容器挂载点（`/workspace`、`/agent`）的绑定目标也会被默认阻止；可通过 `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets: true` 覆盖。
- 默认情况下会阻止 workspace/agent-workspace 允许列表根之外的 Bind 源；用 `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources: true` 覆盖。允许的根以相同的方式解析，因此在符号链接解析之前仅查看允许列表内部的路径仍然会被拒绝为外部允许的根。
- 敏感挂载（密钥、SSH 密钥、服务凭证）应尽量使用 `:ro`，除非绝对必要。
- 如果你只需要对 workspace 进行只读访问，请结合使用 `workspaceAccess: "ro"`；绑定模式彼此独立。
- 有关绑定如何与工具策略和提升权限执行交互，请参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

</Warning>
