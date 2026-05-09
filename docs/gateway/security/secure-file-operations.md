---
summary: "OpenClaw 如何安全地处理本地文件访问，以及为什么可选的 fs-safe Python 辅助程序默认关闭"
read_when:
  - 更改文件访问、归档解压、工作区存储或插件文件系统辅助工具时
title: "安全的文件操作"
---

OpenClaw 使用 [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 进行安全敏感的本地文件操作：根目录受限的读/写、原子替换、归档解压、临时工作区、JSON 状态以及秘密文件处理。

目标是为接收不受信任路径名的可信 OpenClaw 代码提供一致的**库级安全护栏**。这不是沙箱。主机文件系统权限、OS 用户、容器以及代理/工具策略仍然决定实际的影响范围。

## 默认：不使用 Python 辅助程序

OpenClaw 默认将 fs-safe 的 POSIX Python 辅助程序设置为**关闭**。

原因如下：

- 网关不应启动一个持久的 Python sidecar，除非操作员已明确启用它；
- 许多安装并不需要额外的父目录修改加固；
- 关闭 Python 可使桌面、Docker、CI 以及打包应用环境中的包/运行时行为更加可预测。

OpenClaw 只改变默认值。如果你显式设置了某种模式，fs-safe 会按该模式处理：

```bash
# OpenClaw 的默认行为：仅使用 Node 的 fs-safe 回退实现。
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# 在可用时启用辅助程序，不可用时回退。
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# 如果辅助程序无法启动，则以失败关闭。
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# 可选的显式解释器。
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

通用的 fs-safe 名称也同样可用：`FS_SAFE_PYTHON_MODE` 和 `FS_SAFE_PYTHON`。

## 在没有 Python 的情况下仍受保护的内容

在关闭辅助程序时，OpenClaw 仍会使用 fs-safe 的 Node 路径来处理：

- 拒绝相对路径逃逸，例如 `..`、绝对路径，以及仅允许名称时出现的路径分隔符；
- 通过受信任的根句柄解析操作，而不是依赖临时拼接的 `path.resolve(...).startsWith(...)` 检查；
- 在要求该策略的 API 上拒绝符号链接和硬链接模式；
- 在 API 返回或消费文件内容时，使用带身份检查的方式打开文件；
- 为状态/配置文件进行原子性的同级临时文件写入；
- 读取和归档解压的字节限制；
- 对秘密和状态文件使用私有模式，前提是该 API 需要这些模式。

这些保护覆盖了 OpenClaw 的正常威胁模型：可信网关代码在单一可信操作员边界内处理来自模型/插件/通道的不受信任路径输入。

## Python 带来的额外能力

在 POSIX 上，fs-safe 的可选辅助程序会保持一个持久的 Python 进程，并使用基于 fd 的文件系统操作来处理父目录变更，例如 rename、remove、mkdir、stat/list，以及某些写入路径。

这缩小了同一 UID 下的竞争窗口：在验证和变更之间，另一个进程可能替换父目录。对于本地不受信任进程可以修改 OpenClaw 正在操作的同一目录的主机，这是一种纵深防御。

如果你的部署存在这种风险，并且能保证 Python 一定可用，请使用：

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

当辅助程序是你的安全姿态的一部分时，应使用 `require` 而不是 `auto`；`auto` 的设计就是在辅助程序不可用时有意回退到仅 Node 的行为。

## 插件与核心建议

- 当路径来自消息、模型输出、配置或插件输入时，面向插件的文件访问应通过 `openclaw/plugin-sdk/*` 辅助函数，而不是原始 `fs`。
- 核心代码应使用 `src/infra/*` 下的本地 fs-safe 包装器，以便一致地应用 OpenClaw 的进程策略。
- 归档解压应使用 fs-safe 的归档辅助函数，并明确设置大小、条目数、链接和目标位置限制。
- 秘密应使用 OpenClaw 秘密辅助函数或 fs-safe 的 secret/private-state 辅助函数；不要围绕 `fs.writeFile` 自己手写模式检查。
- 如果你需要对恶意本地用户进行隔离，不要只依赖 fs-safe。应在不同 OS 用户/主机下运行独立网关，或使用沙箱。

相关内容：[Security](/gateway/security)、[Sandboxing](/gateway/sandboxing)、[Exec approvals](/tools/exec-approvals)、[Secrets](/gateway/secrets)。
