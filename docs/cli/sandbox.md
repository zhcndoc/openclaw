---
title: 沙箱 CLI
summary: "管理沙箱容器并检查生效的沙箱策略"
read_when: "您正在管理沙箱容器或调试沙箱/工具策略行为时。"
status: active
---

# 沙箱 CLI

管理基于 Docker 的沙箱容器，实现隔离的代理执行。

## 概述

OpenClaw 可以在隔离的 Docker 容器中运行代理以保证安全。`sandbox` 命令帮助您管理这些容器，特别是在更新或修改配置之后。

## 命令

### `openclaw sandbox explain`

检查**生效的**沙箱模式/范围/工作空间访问权限、沙箱工具策略以及提升权限的入口（并带有修复配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱容器及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # 仅列出浏览器容器
openclaw sandbox list --json     # JSON 输出
```

**输出内容包括：**

- 容器名称和状态（运行/停止）
- Docker 镜像及是否匹配配置
- 存在时间（创建以来的时长）
- 空闲时间（最后使用以来的时长）
- 关联的会话/代理

### `openclaw sandbox recreate`

移除沙箱容器以强制使用更新的镜像/配置重新创建。

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

**重要提示：** 容器会在代理下一次使用时自动重新创建。

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

**问题：** 当更新沙箱 Docker 镜像或配置时：

- 现有容器继续运行旧设置
- 容器仅在24小时不活跃后被清理
- 常用代理的旧容器会无限期地继续运行

**解决方案：** 使用 `openclaw sandbox recreate` 强制删除旧容器。容器将在下一次需要时自动使用最新设置重新创建。

提示：优先使用 `openclaw sandbox recreate` 代替手动 `docker rm`。该命令使用 Gateway 的容器命名规则，避免在作用域/会话键变化时出现不匹配。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个代理的重写配置在 `agents.list[].sandbox`）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "scope": "agent", // session, agent, shared
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
