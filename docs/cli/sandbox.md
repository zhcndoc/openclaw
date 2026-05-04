---
summary: "管理沙箱运行时并检查生效的沙箱策略"
title: Sandbox CLI
read_when: "当你正在管理沙箱运行时，或调试 sandbox/tool-policy 行为时。"
status: active
---

管理用于隔离代理执行的沙箱运行时。

## 概述

OpenClaw 可以在隔离的沙箱运行时中运行代理，以提高安全性。`sandbox` 命令可帮助你在更新或配置变更后检查并重建这些运行时。

目前，这通常意味着：

- Docker 沙箱容器
- 当 `agents.defaults.sandbox.backend = "ssh"` 时的 SSH 沙箱运行时
- 当 `agents.defaults.sandbox.backend = "openshell"` 时的 OpenShell 沙箱运行时

对于 `ssh` 和 OpenShell `remote`，重建比 Docker 更重要：

- 初始种子设置完成后，远程工作区是权威来源
- `openclaw sandbox recreate` 会删除所选范围内该权威的远程工作区
- 下次使用时，会从当前本地工作区重新播种

## 命令

### `openclaw sandbox explain`

检查**生效的**沙箱模式/范围/工作区访问权限、沙箱工具策略以及提升门控（并给出可修复的配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱运行时及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # 仅列出浏览器容器
openclaw sandbox list --json     # JSON 输出
```

**输出包括：**

- 运行时名称和状态
- 后端（`docker`、`openshell` 等）
- 配置标签以及是否与当前配置匹配
- 存活时间（自创建以来的时间）
- 空闲时间（自上次使用以来的时间）
- 关联的会话/代理

### `openclaw sandbox recreate`

移除沙箱运行时，以强制使用更新后的配置重新创建。

```bash
openclaw sandbox recreate --all                # 重新创建所有容器
openclaw sandbox recreate --session main       # 特定会话
openclaw sandbox recreate --agent mybot        # 特定代理
openclaw sandbox recreate --browser            # 仅浏览器容器
openclaw sandbox recreate --all --force        # 跳过确认
```

**选项：**

- `--all`：重新创建所有沙箱容器
- `--session <key>`：重新创建特定会话的容器
- `--agent <id>`：重新创建特定代理的容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

<Note>
运行时会在代理下次被使用时自动重建。
</Note>

## 使用场景

### 更新 Docker 镜像后

```bash
# 拉取新镜像
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# 更新配置以使用新镜像
# 编辑配置: agents.defaults.sandbox.docker.image（或 agents.list[].sandbox.docker.image）

# 重新创建容器
openclaw sandbox recreate --all
```

### 更改沙箱配置后

```bash
# 编辑配置: agents.defaults.sandbox.*（或 agents.list[].sandbox.*）

# 重新创建以应用新配置
openclaw sandbox recreate --all
```

### 更改 SSH 目标或 SSH 认证材料后

```bash
# 编辑配置：
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

对于核心 `ssh` 后端，重建会删除 SSH 目标上按范围划分的远程工作区根目录。
下一次运行时，会再次从本地工作区进行播种。

### 更改 OpenShell 来源、策略或模式后

```bash
# 编辑配置：
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

对于 OpenShell `remote` 模式，重建会删除该范围内的权威远程工作区。
下一次运行时，会再次从本地工作区进行播种。

### 更改 setupCommand 后

```bash
openclaw sandbox recreate --all
# 或者只针对一个代理：
openclaw sandbox recreate --agent family
```

### 仅针对特定代理

```bash
# 仅更新一个代理的容器
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做

当你更新沙箱配置时：

- 现有运行时会继续使用旧设置运行。
- 运行时仅会在 24 小时不活动后被清理。
- 经常使用的代理会让旧运行时无限期保持存活。

使用 `openclaw sandbox recreate` 强制移除旧运行时。它们会在下次需要时根据当前设置自动重建。

<Tip>
优先使用 `openclaw sandbox recreate`，而不是手动进行特定后端的清理。它会使用 Gateway 的运行时注册表，并在范围或会话键变化时避免不匹配。
</Tip>

## Registry migration

OpenClaw 将沙箱运行时元数据存储为沙箱状态目录下每个容器/浏览器条目一个 JSON 分片。旧版本安装可能仍然保留单体的旧文件：

- `~/.openclaw/sandbox/containers.json`
- `~/.openclaw/sandbox/browsers.json`

常规的沙箱运行时读取不会重写这些文件。运行 `openclaw doctor --fix` 可将有效的旧条目迁移到分片化的注册表目录中。无效的旧文件会被隔离，以免某个损坏的旧注册表掩盖当前的运行时条目。

## Configuration

沙箱设置位于 `~/.openclaw/openclaw.json` 中的 `agents.defaults.sandbox` 下（按代理的覆盖项放在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // 关闭，非 main，全部
        "backend": "docker", // docker，ssh，openshell
        "scope": "agent", // session，agent，shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24, // 闲置 24h 后自动清理
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
