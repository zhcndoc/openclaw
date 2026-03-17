---
title: Sandbox CLI
summary: "管理沙箱运行时并检查生效的沙箱策略"
read_when: "您正在管理沙箱运行时或调试沙箱/工具策略行为。"
status: active
---

# 沙箱 CLI

管理用于隔离代理执行的沙箱运行时。

## 概述

OpenClaw 可以在隔离的沙箱运行时中运行代理以增强安全性。`sandbox` 命令帮助您在更新或配置变更后检查和重新创建这些运行时。

目前这通常意味着：

- Docker 沙箱容器
- 当 `agents.defaults.sandbox.backend = "ssh"` 时的 SSH 沙箱运行时
- 当 `agents.defaults.sandbox.backend = "openshell"` 时的 OpenShell 沙箱运行时

对于 `ssh` 和 OpenShell `remote`，重新创建比 Docker 更重要：

- 远程工作区在初始种子后是规范的
- `openclaw sandbox recreate` 会删除选定范围的规范远程工作区
- 下一次使用会从当前本地工作区重新种子它

## 命令

### `openclaw sandbox explain`

检查**生效的**沙箱模式/范围/工作区访问权限、沙箱工具策略以及权限提升的入口（并带有修复配置键路径）。

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

**输出内容包括：**

- 运行时名称和状态
- 后端（`docker`、`openshell` 等）
- 配置标签及其是否匹配当前配置
- 创建时间（存在时间）
- 空闲时间（上次使用后的时间）
- 关联的会话/代理

### `openclaw sandbox recreate`

移除沙箱运行时以强制使用更新的配置重新创建。

```bash
openclaw sandbox recreate --all                # 重新创建所有容器
openclaw sandbox recreate --session main       # 指定会话
openclaw sandbox recreate --agent mybot        # 指定代理
openclaw sandbox recreate --browser            # 仅浏览器容器
openclaw sandbox recreate --all --force        # 跳过确认
```

**选项：**

- `--all`：重新创建所有沙箱容器
- `--session <key>`：为指定会话重新创建容器
- `--agent <id>`：为指定代理重新创建容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要提示：** 当代理下次被使用时，运行时会自动重新创建。

## 使用场景

### 更新 Docker 镜像后

```bash
# 拉取新镜像
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# 更新配置以使用新镜像
# 编辑配置：agents.defaults.sandbox.docker.image（或 agents.list[].sandbox.docker.image）

# 重新创建容器
openclaw sandbox recreate --all
```

### 修改沙箱配置后

```bash
# 编辑配置：agents.defaults.sandbox.*（或 agents.list[].sandbox.*）

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

对于核心的 `ssh` 后端，重新创建会删除 SSH 目标上每个范围的远程工作区根目录。下一次运行会再次从本地工作区进行种子。

### 更改 OpenShell 源、策略或模式后

```bash
# 编辑配置：
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

对于 OpenShell `remote` 模式，重新创建会删除该范围的规范远程工作区。下次运行会再次从本地工作区进行种子。

### 修改 setupCommand 后

```bash
openclaw sandbox recreate --all
# 或仅指定一个代理：
openclaw sandbox recreate --agent family
```

### 仅针对特定代理

```bash
# 仅更新单个代理的容器
openclaw sandbox recreate --agent alfred
```

## 为什么需要这个命令？

**问题：** 当您更新沙箱配置时：

- 现有运行时继续使用旧设置运行
- 运行时只会在 24 小时不活动后被清理
- 常用的代理会无限期保持旧运行时存活

**解决方案：** 使用 `openclaw sandbox recreate` 强制删除旧运行时。它们将在下次需要时自动与当前设置一起重新创建。

提示：优先使用 `openclaw sandbox recreate`，而不是手动执行后端特定清理。它利用 Gateway 的运行时注册表，避免范围/会话键更改时的不匹配。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个代理的重写配置在 `agents.list[].sandbox`）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off、non-main、all
        "backend": "docker", // docker、ssh、openshell
        "scope": "agent", // session、agent、shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24, // 空闲24小时后自动清理
          "maxAgeDays": 7, // 存在7天后自动清理
        },
      },
    },
  },
}
```

## 参见

- [沙箱文档](/gateway/sandboxing)
- [代理配置](/concepts/agent-workspace)
- [Doctor 命令](/gateway/doctor) - 检查沙箱设置
