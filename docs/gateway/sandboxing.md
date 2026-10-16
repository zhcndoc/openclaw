---
summary: "OpenClaw 沙箱化的工作方式：模式、作用域、工作区访问和镜像"
title: "沙箱化"
sidebarTitle: "沙箱化"
read_when: "您想要沙箱的专门解释或需要调整agents.defaults.sandbox."
status: active
---

OpenClaw 可以在沙箱后端内运行工具执行，以限制工具可能造成的损害。沙盒默认处于关闭状态，并由 `agents.defaults.sandbox`（全局）、`agents.entries.*.sandbox`（每个代理）或所需的创建者角色沙盒策略控制。 Gateway进程始终驻留在主机上；启用后，只有工具执行才会移至沙箱中。

<Note>
这并不是完美的安全边界，但当模型做出一些愚蠢操作时，它确实能显著限制文件系统和进程访问。
</Note>

## <a id="sandboxing-pages"></a> 沙盒页面

此页是一个索引。沙箱参考记录有十二页。打开与您正在配置的内容匹配的页面。

| 页面                                                                                 | 读它的时候                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [沙盒化的内容](/gateway/sandboxing/what-gets-sandboxed)                       | 您想确切地知道哪个执行移入沙箱。                   |
| [模式、范围和后端](/gateway/sandboxing/modes-scope-and-backend)             | 您正在决定哪些会话在沙盒中运行以及它们如何共享环境。     |
| [支持的能力矩阵](/gateway/sandboxing/supported-capability-matrix)       | 在选择后端之前，您正在比较 Docker、SSH 和 OpenShell。            |
| [Docker后端](/gateway/sandboxing/docker-backend)                                 | 您正在运行默认的本地后端或启用沙盒浏览器。       |
| [Podman 后端](/gateway/sandboxing/podman-backend)                                 | 您正在使用 Podman 而不是 Docker 来执行沙盒工具。               |
| [SSH 后端](/gateway/sandboxing/ssh-backend)                                       | 您正在通过 SSH 将沙盒工具执行卸载到远程计算机。          |
| [OpenShell 后端](/gateway/sandboxing/openshell-backend)                           | 您是 OpenShell- 托管远程环境中的沙箱工具。               |
| [Crabbox后端](/gateway/sandboxing/crabbox-backend)                               | 您希望在 Crabbox 租赁的云盒上执行工具，而代理则保留在本地。 |
| [工作空间访问](/gateway/sandboxing/workspace-access)                             | 您正在决定沙箱可以看到代理工作区的哪些内容。                  |
| [ 一个代理的多个文件夹](/gateway/sandboxing/multiple-folders-for-one-agent) | 一个沙盒代理需要的不仅仅是其主要工作空间。                         |
| [图像和设置](/gateway/sandboxing/images-and-setup)                             | 您需要构建或自定义沙箱映像。                                    |
| [setupCommand（一次性容器设置）](/gateway/sandboxing/setup-command)         | 您需要在新创建的沙箱容器内运行一次性安装程序。           |

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个锚点都保留在此处，因此现有链接（例如 `/gateway/sandboxing#images-and-setup`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="what-gets-sandboxed" />[什么被沙盒化](/gateway/sandboxing/what-gets-sandboxed#what-gets-sandboxed)
- <a id="modes%2C-scope%2C-and-backend" /><a id="modes-scope-and-backend" />[模式、范围和后端](/gateway/sandboxing/modes-scope-and-backend#modes-scope-and-backend)
- <a id="supported-capability-matrix" />[支持的能力矩阵](/gateway/sandboxing/supported-capability-matrix#supported-capability-matrix)
- <a id="docker-backend" />[Docker后端](/gateway/sandboxing/docker-backend#docker-backend)
- <a id="sandboxed-browser" />[沙盒浏览器](/gateway/sandboxing/docker-backend#sandboxed-browser)
- <a id="podman-backend" />[Podman 后端](/gateway/sandboxing/podman-backend#podman-backend)
- <a id="ssh-backend" />[SSH 后端](/gateway/sandboxing/ssh-backend#ssh-backend)
- <a id="openshell-backend" />[OpenShell 后端](/gateway/sandboxing/openshell-backend#openshell-backend)
- <a id="crabbox-backend" />[蟹盒后端](/gateway/sandboxing/crabbox-backend#crabbox-backend)
- <a id="workspace-access" />[工作区访问](/gateway/sandboxing/workspace-access#workspace-access)
- <a id="multiple-folders-for-one-agent" />[一名代理的多个文件夹](/gateway/sandboxing/multiple-folders-for-one-agent#multiple-folders-for-one-agent)
- <a id="other-bind-behavior" />[其他绑定行为](/gateway/sandboxing/multiple-folders-for-one-agent#other-bind-behavior)
- <a id="images-and-setup" />[图像和设置](/gateway/sandboxing/images-and-setup#images-and-setup)
- <a id="build-the-default-image" />[构建默认镜像](/gateway/sandboxing/images-and-setup#build-the-default-image)
- <a id="optional%3A-build-the-common-image" />[可选：构建通用镜像](/gateway/sandboxing/images-and-setup#optional%3A-build-the-common-image)
- <a id="optional%3A-build-the-sandbox-browser-image" />[可选：构建沙箱浏览器映像](/gateway/sandboxing/images-and-setup#optional%3A-build-the-sandbox-browser-image)
- <a id="sandbox-browser-chromium-defaults" />[沙箱浏览器 Chromium 默认值](/gateway/sandboxing/images-and-setup#sandbox-browser-chromium-defaults)
- <a id="network-security-defaults" />[网络安全默认值](/gateway/sandboxing/images-and-setup#network-security-defaults)
- <a id="setupcommand-(one-time-container-setup)" /><a id="setupcommand-one-time-container-setup" />[setupCommand（一次性容器设置）](/gateway/sandboxing/setup-command#setupcommand-one-time-container-setup)
- <a id="common-pitfalls" />[常见陷阱](/gateway/sandboxing/setup-command#common-pitfalls)

## <a id="tool-policy-and-escape-hatches"></a> 工具策略与逃生阀

工具 allow/deny 策略在沙箱规则之前仍然适用。如果某个工具被全局或每个代理拒绝，沙箱不会将其恢复。

`tools.elevated` 是一个显式逃逸舱口，在沙箱外运行 `exec`（默认情况下为 `gateway`，或者当执行目标为 `node` 时为 `node`）。 `/exec` 指令仅适用于授权发件人并在每个会话中持续存在；要硬禁用 `exec`，请使用工具策略拒绝（请参阅 [Sandbox 与工具策略与 Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- `openclaw sandbox list` 显示沙箱容器、状态、图像匹配、年龄、空闲时间和关联的 session/agent.
- `openclaw sandbox explain [--session <key>] [--agent <id>]` 会检查有效的沙箱模式、宿主工作区、运行时工作目录、Docker 挂载、工具策略和修复配置键。其 `workspaceRoot` 字段仍然是配置的沙箱根目录；`effectiveHostWorkspaceRoot` 显示当前活动工作区实际所在位置。
- `openclaw sandbox recreate [--all | --session <key> | --agent <id>] [--browser] [--force]` 删除了 containers/environments，以便下次使用时使用当前配置重新创建它们。
- 参见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解“为什么会被阻止？”这一思维模型。

## <a id="multi-agent-overrides"></a> 多代理覆盖

每个代理都可以覆盖沙箱+工具：`agents.entries.*.sandbox`和`agents.entries.*.tools`（加上沙箱工具策略的`agents.entries.*.tools.sandbox.tools`）。请参阅 [ 多代理沙箱和 Tools](/tools/multi-agent-sandbox-tools) 了解优先顺序。

### <a id="managed-github-identity"></a> 托管 GitHub 身份

符合发布资格的托管会话可以在默认沙箱工具策略下使用 `github_publish` 通过网关发布自己的会话分支。发布凭据保留在网关上；对于此路由，不需要选择下面的凭据。明确的工具拒绝和限制性自定义许可名单仍然适用。请参阅 [GitHub 出版物 ](/gateway/config-tools/github-identity)。

沙盒执行不包括代理的托管GitHub默认身份。放`agents.entries.<id>.tools.github.allowInSandbox: true`在该代理的托管身份上，以允许它在代理自己的内部Docker or Podman沙箱。OpenClaw将选定的配置文件安装为只读`/openclaw/github`， 套`GH_CONFIG_DIR`到该路径，并提供与主机执行相同的托管令牌和 Git 作者。容器需要`gh`安装用于GitHub CLI命令。

此选择会向沙箱中运行的代码公开凭据；只读安装可以防止配置文件编辑，但不能读取凭据。 `openclaw security audit` 向每个选择加入的代理发出警告。有效 `scope: "shared"` 拒绝身份注入并记录命名代理的警告，因为该容器可以为其他代理提供服务。角色所需的沙箱保留其每个创建者的隔离并支持选择加入。其他沙箱后端在启用选择加入的情况下拒绝配置。请参阅 [GitHub 身份 ](/gateway/config-tools/github-identity#sandbox-opt-in)。

## <a id="minimal-enable-example"></a> 最小启用示例

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

## <a id="related"></a> 相关内容

- [多代理沙箱和Tools](/tools/multi-agent-sandbox-tools)——每个代理的覆盖和优先级
- [OpenShell](/gateway/openshell) -- 托管沙箱后端设置、工作区模式和配置参考
- [沙箱配置](/gateway/config-agents/sandbox#agentsdefaultssandbox)
- [Sandbox vs 工具策略 vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么会被阻止？”
- [安全](/gateway/security)
- [`openclaw sandbox`](/cli/sandbox) — 管理沙箱运行时并检查有效的沙箱策略
- [Cloud Workers](/gateway/cloud-workers) — 将会话工作分派到一次性云计算机；其托管工作区不是 OS 沙箱
