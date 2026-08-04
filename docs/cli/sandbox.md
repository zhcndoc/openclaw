---
summary: "管理沙箱运行时并检查生效的沙箱策略"
title: 沙箱 CLI
read_when: "当你正在管理沙箱运行时，或调试 sandbox/tool-policy 行为时。"
status: active
---

管理用于隔离代理执行的沙箱运行时：Docker/Podman 容器、SSH 目标或 OpenShell 后端。

[`openclaw agent exec`](/cli/agent#agent-exec) 不使用这些已配置的运行时。其隔离的隐式策略配置会关闭代理沙箱，允许对 Gateway 主机的完整执行，并将文件系统工具限制为 `--cwd`。

## 命令

### `openclaw sandbox list`

列出沙盒运行时及其状态、后端、配置匹配、年龄、空闲时间，以及关联的会话/代理。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # 仅浏览器容器
openclaw sandbox list --json
```

### `openclaw sandbox recreate`

移除沙盒运行时，以强制使用当前配置重新创建。运行时会在下次使用代理时自动重新创建。

```bash
openclaw sandbox recreate --all
openclaw sandbox recreate --agent mybot        # 包括 agent:mybot:* 子会话
openclaw sandbox recreate --session "agent:main:main"
openclaw sandbox recreate --browser --all      # 仅浏览器容器
openclaw sandbox recreate --all --force        # 跳过确认
```

选项：

- `--all`：重新创建所有沙盒容器
- `--session <key>`：重新创建具有此精确作用域键的运行时（如 `sandbox list` 所示）；不进行简称展开
- `--agent <id>`：为一个代理重新创建运行时（匹配 `agent:<id>` 和 `agent:<id>:*`）
- `--browser`：仅影响浏览器容器
- `--force`：跳过确认提示

只能传入 `--all`、`--session` 或 `--agent` 中的一个。

对于 `ssh` 和 OpenShell `remote`，`recreate` 比 Docker 更重要：远程工作区在初始种子之后是权威来源，`recreate` 会删除所选作用域下那个权威的远程工作区，下一次运行会从当前本地工作区重新播种它。

### `openclaw sandbox explain`

检查生效的沙盒模式/作用域/工作区访问、沙盒工具策略，以及提升工具门控（附带修复配置键路径）。

该报告会将 `workspaceRoot` 保持为已配置的沙盒根目录，并分别显示生效的主机工作区、后端运行时工作目录，以及 Docker 挂载表。对于 `workspaceAccess: "rw"`，生效的主机工作区是代理工作区，而不是 `workspaceRoot` 下的目录。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

不同于 `recreate --session`，此命令接受短会话名称（例如 `main`），并会针对解析后的代理进行展开。

## 为什么需要 recreate

更新 sandbox 配置不会影响正在运行的容器：现有运行时会保留旧设置，而空闲运行时只有在 `prune.idleHours`（默认 24 小时）之后才会被清理。经常使用的代理可能会让过时的运行时一直存活。`openclaw sandbox recreate` 会移除旧的运行时，使下次使用时根据当前配置重新构建它。

<Tip>
优先使用 `openclaw sandbox recreate`，而不是手动进行特定后端的清理。它会使用 Gateway 的运行时注册表，并在范围或会话键变化时避免不匹配。
</Tip>

## 常见触发条件

| 变更                                                                                                                                                         | 命令                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 容器沙箱镜像更新（`agents.defaults.sandbox.docker.image`）                                                                                                      | `openclaw sandbox recreate --all`                                   |
| 沙箱配置（`agents.defaults.sandbox.*`）                                                                                                                        | `openclaw sandbox recreate --all`                                   |
| SSH 目标/身份验证（`agents.defaults.sandbox.ssh.{target,workspaceRoot,identityFile,certificateFile,knownHostsFile,identityData,certificateData,knownHostsData}`） | `openclaw sandbox recreate --all`                                   |
| OpenShell 来源/策略/模式（`plugins.entries.openshell.config.{from,mode,policy}`）                                                                                | `openclaw sandbox recreate --all`                                   |
| `setupCommand`                                                                                                                                                 | `openclaw sandbox recreate --all`（或对单个代理使用 `--agent <id>`） |

<Note>
当代理下次被使用时，运行时会自动重新创建。
</Note>

## 注册表迁移

Sandbox 运行时元数据存储在共享的 SQLite 状态数据库中。较旧的安装版本可能仍保留不会被常规读取重新写入的旧版注册表文件：

- `~/.openclaw/sandbox/containers.json`
- `~/.openclaw/sandbox/browsers.json`
- `~/.openclaw/sandbox/containers/` 或 `~/.openclaw/sandbox/browsers/` 下每个 container/browser 对应的一个 JSON 分片

运行 `openclaw doctor --fix` 可将有效的旧版条目迁移到 SQLite 中。无效的旧版文件会被隔离，因此损坏的旧注册表不会隐藏当前的运行时条目。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个代理的覆盖配置放在 `agents.entries.*.sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // 关闭、非主分支、全部
        "backend": "docker", // docker、ssh、openshell（由插件提供）
        "scope": "agent", // 会话、代理、共享
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24, // 空闲 24 小时后自动清理
          "maxAgeDays": 7, // 7 天后自动清理
        },
      },
    },
  },
}
```

## 相关内容

- [CLI 参考](/cli)
- [沙箱化](/gateway/sandboxing)
- [代理工作区](/concepts/agent-workspace)
- [Doctor](/gateway/doctor)：检查沙箱设置。
