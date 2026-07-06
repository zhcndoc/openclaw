---
summary: "OpenClaw 如何安全地处理本地文件访问，以及为什么可选的 fs-safe Python 辅助程序默认关闭"
read_when:
  - 更改文件访问、归档解压、工作区存储或插件文件系统辅助工具时
title: "安全的文件操作"
---

OpenClaw 使用 [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 进行安全敏感的本地文件操作：根目录受限的读/写、原子替换、归档解压、临时工作区、JSON 状态以及秘密文件处理。

它是面向接收不受信任路径名的可信 OpenClaw 代码的**库级防护措施**，而不是沙箱。主机文件系统权限、OS 用户、容器以及代理/工具策略仍然决定真正的影响范围。

## 默认：不使用 Python 辅助程序

OpenClaw 默认将 fs-safe 的 POSIX Python 辅助程序设置为 **关闭**：

- 网关不应在操作员未明确选择启用时启动持久的 Python sidecar；
- 大多数安装不需要额外的父目录变更加固；
- 禁用 Python 可使桌面、Docker、CI 和打包应用环境中的运行时行为保持可预测。

OpenClaw 只会更改 _默认值_。显式设置始终优先生效：

```bash
# OpenClaw 的默认行为：仅使用 Node 的 fs-safe 回退实现。
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# 在可用时启用辅助程序，不可用时回退。
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# 如果辅助程序无法启动，则以失败关闭。
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# 可选：显式指定解释器路径。
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

通用的 fs-safe 环境变量名也同样适用：`FS_SAFE_PYTHON_MODE` 和 `FS_SAFE_PYTHON`。

当辅助程序是你安全策略的一部分时，请使用 `require`（而不是 `auto`）；如果辅助程序无法启动，`auto` 会静默回退到仅使用 Node 的行为。

## 在没有 Python 的情况下仍受保护的内容

关闭 helper 后，OpenClaw 仍然保留了 fs-safe 的仅 Node 运行时防护：

- 拒绝相对路径逃逸（`..`）、绝对路径，以及在只允许裸名称时出现的路径分隔符；
- 通过受信任的根句柄来解析操作，而不是临时使用 `path.resolve(...).startsWith(...)` 之类的检查；
- 在要求该策略的 API 上拒绝符号链接和硬链接模式；
- 对 API 返回或消费文件内容的场景，使用带身份检查的方式打开文件；
- 通过原子性的同级临时文件 + 重命名来写入状态/配置文件；
- 对读取和归档解压强制执行字节限制；
- 在 API 要求时，为密钥和状态文件应用私有文件模式。

这覆盖了 OpenClaw 的正常威胁模型：受信任的网关代码在单一受信任的操作边界内处理不受信任的模型/插件/通道路径输入。

## Python 带来的额外能力

在 POSIX 上，可选的辅助程序会保持一个持久的 Python 进程，并使用与 fd 相关的文件系统操作来执行父目录修改：重命名、删除、mkdir、stat/list，以及某些写入路径。

这缩小了同一 UID 的竞态窗口，即当另一个进程在验证和修改之间替换父目录时——在主机上属于纵深防御，其中不受信任的本地进程可以修改 OpenClaw 所操作的同一目录。

如果你的部署存在这种风险，并且可以确保 Python 一定存在，请设置：

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

## 插件和核心指导

- 面向插件的文件访问应通过 `openclaw/plugin-sdk/*` 辅助函数进行；当路径来自消息、模型输出、配置或插件输入时，不要直接使用原始 `fs`。
- 核心代码应使用 `src/infra/*` 下的 fs-safe 包装器，以便 OpenClaw 的进程策略能够一致生效。
- 压缩包解压应使用 fs-safe 的归档辅助函数，并显式设置大小、条目数、链接和目标位置限制。
- 密钥应使用 OpenClaw 密钥辅助函数或 fs-safe 的密钥/私有状态辅助函数；不要围绕 `fs.writeFile` 手工编写模式检查。
- 对于恶意本地用户隔离，不要仅依赖 fs-safe。应在不同的 OS 用户/主机下运行独立网关，或使用沙箱。

相关内容：[Security](/gateway/security)、[Sandboxing](/gateway/sandboxing)、[Exec approvals](/tools/exec-approvals)、[Secrets](/gateway/secrets)。
