---
summary: "管理沙箱运行时并检查生效的沙箱策略"
title: "沙箱 CLI"
read_when: "当你正在管理沙箱运行时，或调试 sandbox/tool-policy 行为时。"
status: active
---

管理用于隔离代理执行的沙箱运行时：Docker/Podman 容器、SSH 目标或 OpenShell 后端。

[`openclaw agent exec`](/cli/agent#agent-exec) 保留由继承的配置或 `--config` 选择的沙箱，包括其执行路由。如果没有配置沙箱，其默认值允许完整的网关主机执行并将文件系统工具限制为 `--cwd`。 `--isolated` 和 `--auth-env-only` 跳过配置继承并使用这些默认值。

## <a id="commands"></a> 命令

### `openclaw sandbox list`

列出沙盒运行时的状态、后端、配置匹配、年龄、空闲时间和关联的 session/agent.

对于配置的插件提供的后端（例如 OpenShell），CLI 在检查实时运行时状态之前加载拥有的后端插件。仅浏览器操作不需要激活后端插件。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # browser containers only
openclaw sandbox list --json
```

### `openclaw sandbox recreate`

移除沙盒运行时，以强制使用当前配置重新创建。运行时会在下次使用代理时自动重新创建。

```bash
openclaw sandbox recreate --all
openclaw sandbox recreate --agent mybot        # includes agent:mybot:* sub-sessions
openclaw sandbox recreate --session "agent:main:main"
openclaw sandbox recreate --browser --all      # only browser containers
openclaw sandbox recreate --all --force        # skip confirmation
```

选项：

- `--all`：重新创建所有沙盒容器
- `--session <key>`：重新创建具有此精确作用域键的运行时（如 `sandbox list` 所示）；不进行简称展开
- `--agent <id>`：为一个代理重新创建运行时（匹配 `agent:<id>` 和 `agent:<id>:*`）
- `--browser`：仅影响浏览器容器
- `--force`：跳过确认提示

只能传入 `--all`、`--session` 或 `--agent` 中的一个。

娱乐需要所选状态目录的独占离线所有权。如果其网关正在运行，则该命令会在检查或删除运行时之前拒绝。通过其服务所有者停止网关，等待所有权释放，然后重新运行命令。通过确认和接受拆卸，离线所有权保持不变；启动网关会等待清理工作完成。 `--force` 不会绕过此所有权检查。

有关所有者发现、拒绝状态和兼容性边界，请参阅 [ 本地状态所有者路由](/gateway/protocol/versioning#local-state-owner-routing)。

范围内的游戏在检查后端之前选择注册表项。另一个 Podman 连接上的不相关运行时或不可用的后端不会阻止 `--session` 或 `--agent`。选定的运行时仍然需要其记录的目标处于活动状态且可到达； `--force` 仅跳过确认提示。仅浏览器娱乐不会检查常规沙箱运行时。

当记录的 Podman 目标不同时，未限定范围的 `sandbox list` 仍可能无法通过目标检查。恢复受影响的运行时的原始连接，将其已知的精确范围密钥与 `recreate --session` 结合使用，并在确认之前查看预览。如果您不知道确切的范围，请保持注册表完整；不要猜测密钥、扩大到 `--all` 或重写其记录的目标以绕过验证。

对于 `ssh` 和 OpenShell `remote`，重新创建比 Docker 更重要：远程工作空间在初始种子后成为事实来源，`recreate` 删除所选范围的远程工作空间，下一次运行将从当前本地工作空间重新种子。

### `openclaw sandbox explain`

检查有效的沙箱 mode/scope/workspace 访问、沙箱工具策略和提升的工具门（带有修复配置关键路径）。

该报告会将 `workspaceRoot` 保持为已配置的沙盒根目录，并分别显示生效的主机工作区、后端运行时工作目录，以及 Docker 挂载表。对于 `workspaceAccess: "rw"`，生效的主机工作区是代理工作区，而不是 `workspaceRoot` 下的目录。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

与 `recreate --session` 不同，它接受短会话名称（例如 `main`），并根据解析的代理扩展它们。对于没有隐式所有者的多代理队列来说，显式的 `--agent` 就足够了；沙箱解释不需要首先猜测默认值。

## <a id="why-recreate-is-needed"></a> 为什么需要 recreate

更新沙箱配置不会影响正在运行的容器：现有运行时保留其旧设置，并且仅在 `prune.idleHours`（默认 24 小时）之后修剪空闲运行时。经常使用的代理可以无限期地保持过时的运行时间。 `openclaw sandbox recreate` 删除旧的运行时，以便下次使用时从当前配置重建它。

<Tip>
优先使用 `openclaw sandbox recreate`，而不是手动进行特定后端的清理。它会使用 Gateway 的运行时注册表，并在范围或会话键变化时避免不匹配。
</Tip>

## <a id="common-triggers"></a> 常见触发条件

在进行以下任何更改后运行 `openclaw sandbox recreate --all`：

- Container沙箱镜像更新：`agents.defaults.sandbox.docker.image`
- 沙箱配置：`agents.defaults.sandbox.*`
- SSH target/auth: `agents.defaults.sandbox.ssh.{target,workspaceRoot,identityFile,certificateFile,knownHostsFile,identityData,certificateData,knownHostsData}`
- OpenShell source/policy/mode: `plugins.entries.openshell.config.{from,mode,policy}`
- `setupCommand` — `--agent <id>` 重新创建一个代理而不是所有代理

<Note>
当代理下次被使用时，运行时会自动重新创建。
</Note>

## <a id="registry-migration"></a> 注册表迁移

Sandbox 运行时元数据存储在共享的 SQLite 状态数据库中。较旧的安装版本可能仍保留不会被常规读取重新写入的旧版注册表文件：

- `~/.openclaw/sandbox/containers.json`
- `~/.openclaw/sandbox/browsers.json`
- `~/.openclaw/sandbox/containers/` 或 `~/.openclaw/sandbox/browsers/` 下每个 container/browser 对应的一个 JSON 分片

运行 `openclaw doctor --fix` 可将有效的旧版条目迁移到 SQLite 中。无效的旧版文件会被隔离，因此损坏的旧注册表不会隐藏当前的运行时条目。

## <a id="configuration"></a> 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个代理的覆盖配置放在 `agents.entries.*.sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, podman, ssh; openshell is plugin-provided
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // auto-prune after 24h idle
          "maxAgeDays": 7, // auto-prune after 7 days
        },
      },
    },
  },
}
```

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [沙箱化](/gateway/sandboxing)
- [Agent 工作区](/concepts/agent-workspace)
- [Doctor](/gateway/doctor)：检查沙箱设置。
- [OpenShell](/gateway/openshell) — 通过 `openshell` CLI 驱动的托管沙箱后端
