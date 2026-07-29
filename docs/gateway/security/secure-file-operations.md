---
summary: "How OpenClaw handles local file access safely, and why optional fs-safe native acceleration is off by default"
read_when:
  - 更改文件访问、归档解压、工作区存储或插件文件系统辅助工具时
title: "安全的文件操作"
---

OpenClaw 使用 [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 进行安全敏感的本地文件操作：根目录受限的读/写、原子替换、归档解压、临时工作区、JSON 状态以及秘密文件处理。

它是面向接收不受信任路径名的可信 OpenClaw 代码的**库级防护措施**，而不是沙箱。主机文件系统权限、OS 用户、容器以及代理/工具策略仍然决定真正的影响范围。

## Default: JavaScript fallback

OpenClaw sets fs-safe's optional native helper to **off** by default:

- native platform packages are optional and may be absent from minimal installs;
- the guarded JavaScript paths support OpenClaw's normal filesystem operations;
- disabling native loading keeps runtime behavior deterministic across desktop, Docker, CI, and bundled-app environments.

OpenClaw 只会更改 _默认值_。显式设置始终优先生效：

```bash
# Default OpenClaw behavior: guarded JavaScript fs-safe paths.
OPENCLAW_FS_SAFE_NATIVE_MODE=off

# Prefer native primitives when the platform package is installed.
OPENCLAW_FS_SAFE_NATIVE_MODE=auto

# Fail closed when an operation needs native support and the binding is unavailable.
OPENCLAW_FS_SAFE_NATIVE_MODE=require
```

The generic fs-safe environment name also works: `FS_SAFE_NATIVE_MODE`.

fs-safe 0.5 temporarily maps the retired `FS_SAFE_PYTHON_MODE` and `OPENCLAW_FS_SAFE_PYTHON_MODE` values to native modes and emits a deprecation warning. Migrate those names before fs-safe 0.6; Python interpreter path settings are no longer used.

Use `require` (not `auto`) when native primitives are part of your security posture. `auto` uses the guarded JavaScript implementation when the platform binding is unavailable.

## What stays protected without native acceleration

关闭 helper 后，OpenClaw 仍然保留了 fs-safe 的仅 Node 运行时防护：

- 拒绝相对路径逃逸（`..`）、绝对路径，以及在只允许裸名称时出现的路径分隔符；
- 通过受信任的根句柄来解析操作，而不是临时使用 `path.resolve(...).startsWith(...)` 之类的检查；
- 在要求该策略的 API 上拒绝符号链接和硬链接模式；
- 对 API 返回或消费文件内容的场景，使用带身份检查的方式打开文件；
- 通过原子性的同级临时文件 + 重命名来写入状态/配置文件；
- 对读取和归档解压强制执行字节限制；
- 在 API 要求时，为密钥和状态文件应用私有文件模式。

这覆盖了 OpenClaw 的正常威胁模型：受信任的网关代码在单一受信任的操作边界内处理不受信任的模型/插件/通道路径输入。

## What native acceleration adds

The optional platform package provides policy-free filesystem primitives used by fs-safe for create-only writes, guarded hard-link publication, asynchronous sidecar creation, and explicit no-replace rename publication. Linux uses `openat2` and `renameat2`; macOS uses descriptor-relative component checks and `renameatx_np`; Windows uses handle-relative operations and replacement-disabled rename.

The TypeScript layer still owns policy, validation, retries, cleanup, and fallback decisions. Native support narrows filesystem race windows; it does not turn fs-safe into a sandbox.

If your deployment requires those native primitives, install the matching optional platform package and set:

```bash
OPENCLAW_FS_SAFE_NATIVE_MODE=require
```

## 插件和核心指导

- 面向插件的文件访问应通过 `openclaw/plugin-sdk/*` 辅助函数进行；当路径来自消息、模型输出、配置或插件输入时，不要直接使用原始 `fs`。
- 核心代码应使用 `src/infra/*` 下的 fs-safe 包装器，以便 OpenClaw 的进程策略能够一致生效。
- 压缩包解压应使用 fs-safe 的归档辅助函数，并显式设置大小、条目数、链接和目标位置限制。
- 密钥应使用 OpenClaw 密钥辅助函数或 fs-safe 的密钥/私有状态辅助函数；不要围绕 `fs.writeFile` 手工编写模式检查。
- 对于恶意本地用户隔离，不要仅依赖 fs-safe。应在不同的 OS 用户/主机下运行独立网关，或使用沙箱。

相关内容：[Security](/gateway/security)、[Sandboxing](/gateway/sandboxing)、[Exec approvals](/tools/exec-approvals)、[Secrets](/gateway/secrets)。
