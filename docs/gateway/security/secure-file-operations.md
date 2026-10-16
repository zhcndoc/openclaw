---
summary: "OpenClaw 如何安全地处理本地文件访问，包括本机 Windows 凭据检查"
read_when:
  - "更改文件访问、归档解压、工作区存储或插件文件系统辅助工具时"
title: "安全的文件操作"
---

OpenClaw 使用 [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 进行安全敏感的本地文件操作：根范围 reads/writes、原子替换、存档提取、临时工作区、JSON 状态和秘密文件处理。

它是用于接收不受信任路径名的受信任 OpenClaw 代码的 **库护栏**，而不是沙箱。主机文件系统权限、OS 用户、容器和 agent/tool 策略仍然定义了潜在的损害。

<a id="default-javascript-fallback" />

## <a id="platform-defaults"></a> 平台默认值

OpenClaw 在 macOS、Linux 和 Windows 上保留 fs-safe 的 **auto** 本机模式。支持的操作使用已安装的本机助手；当本机支持不可用时，具有记录的 JavaScript 回退的操作可以使用这些路径。

无破坏 `Root.move()` 调用（包括默认调用和 `{ overwrite: false }`）需要安装本机帮助程序。在 Linux 上，当文件系统拒绝无替换重命名时，fs 安全 0.24 在 `auto` 模式下使用受保护的回退：文件使用经过身份检查的硬链接发布和取消链接，而目录使用普通重命名。文件目标永远不会被覆盖；目录回退可以替换同时创建的空目录，但拒绝非空目录和非目录竞争者。这些举措并不保证碰撞耐久性。本机模式 `require` 拒绝不支持的原语。在本机模式 `off` 或缺少帮助程序的情况下，移动到不存在的目标仍然会失败并显示 `helper-unavailable` 并将源保留在原位。发送后身份检查失败可能会在发布后被拒绝。

Doctor 会保留已验证的同目录硬链接出版物，以查找丢失或禁用的帮助程序，包括本机加载失败。此兼容性路径同步源和目录、保留源标识并拒绝现有声明。本机模式 `require` 和特定于突变的根策略可防止这种回退。 fs-safe 拥有不受支持的本机重命名处理； Doctor 报告其不可替换功能被拒绝，无需重试发布。不相关的权限和 I/O 失败仍然是错误。中断的移动只能从精确的 source/claim 硬链接对中恢复。

在 Windows 上，安全凭证读取需要匹配的本机帮助程序来验证提供字节的同一打开文件描述符上的所有权和 ACL。

fs-safe 将预构建的本机助手作为 Linux x64/arm64（glibc 和 musl）、macOS x64/arm64 和 Windows x64 的可选平台包发布。正常的软件包安装会选择不带编译器的匹配软件包。 OpenClaw 通过 fs-safe 自己的依赖范围加载它，包括嵌套的 pnpm 安装。当助手丢失、过时、禁用或不受支持时，Windows 安全读取会失败并显示 `permission-unverified`；没有基于路径名的权限回退。这包括省略可选依赖项和本机 Windows ARM64 运行时的安装。文件 SecretRef 提供程序和 GitHub 身份凭证需要这些安全读取。

OpenClaw 保持 fs-safe 的显式环境设置和编程 `configureFsSafeNative()` 优先级不变：

```bash
# Guarded JavaScript paths; no-clobber moves and Windows secure reads are unavailable.
OPENCLAW_FS_SAFE_NATIVE_MODE=off

# Prefer native primitives when the installed platform helper loads.
OPENCLAW_FS_SAFE_NATIVE_MODE=auto

# Refuse operations that lack the required native capability.
OPENCLAW_FS_SAFE_NATIVE_MODE=require
```

通用 fs 安全环境名称也适用：`FS_SAFE_NATIVE_MODE`。

[托管工作树加速](/concepts/managed-worktrees#filesystem-acceleration) 使用隔离的本机操作进行 APFS 和 Btrfs 克隆和元数据读取。这些操作保留自动本机选择，而不更改网关进程的配置。显式本机模式也适用于隔离操作； `off` 选择正常的 Git 签出。本机写入仍由受监督的子进程拥有，直到其退出，因此取消操作无法在子进程仍在写入时释放目标进行清理。

fs-safe 0.23 删除了 Python 桥。 OpenClaw 在加载其运行时环境时将 `FS_SAFE_PYTHON_MODE` 和 `OPENCLAW_FS_SAFE_PYTHON_MODE` 保留为已弃用的模式别名，并带有弃用警告。显式本机设置和编程 `configureFsSafeNative()` 仍然优先。将旧名称替换为 `FS_SAFE_NATIVE_MODE` 或 `OPENCLAW_FS_SAFE_NATIVE_MODE`。

Python 解释器路径未使用。从部署中删除 `FS_SAFE_PYTHON`、`OPENCLAW_FS_SAFE_PYTHON`、`OPENCLAW_PINNED_PYTHON` 和 `OPENCLAW_PINNED_WRITE_PYTHON`。直接使用 fs-safe 的代码必须将 `configureFsSafePython` / `FsSafePythonConfig` 替换为 `configureFsSafeNative` / `FsSafeNativeConfig` 并省略 `pythonPath`。

当平台绑定不可用时，所有支持本机的操作都必须失败时，请使用 `require`。 `auto` 允许记录后备；无破坏根移动和 Windows 安全凭证读取仍然需要安装本机帮助程序。

在 fs 安全 0.21.2 中，当平台缺乏所需的限制原语时，`require` 还拒绝删除、递归删除、目录创建、可写打开创建和覆盖移动。仅安装帮助程序是不够的：递归根删除在没有 `openat2` 的 Linux 和 Windows 上报告 `helper-unavailable`。这些严格模式突变会执行额外的身份检查，并且速度可能会较慢。参见上游[operation/platform矩阵](https://github.com/openclaw/fs-safe/blob/v0.21.2/docs/security-model.md#native-root-mutation-capabilities)。

如果这些本机保证是您的部署安全策略的一部分，请保留 `require`，并使用支持您所需操作的平台。否则，默认的 `auto` 模式将保留记录的尽力而为的回退及其现有性能。

fs 安全 0.20.0 中的 Linux GNU 插件以 glibc 2.28 为目标，并加载到 Ubuntu 20.04 的 glibc 2.31. 较旧的插件可能会因缺少 `GLIBC_2.33` 而失败或 `GLIBC_2.34` 要求。当加载程序错误到达更新诊断时，支持报告会保留缺失的数字 GLIBC 版本，同时编辑路径。

候选更新快照通过 fs-safe 的可移植仅创建发布路径复制插件文件。它们不需要无破坏的移动：复制会保留服务文件，拒绝现有目标，并根据承认的清单检查源。 SQLite 快照保留其单独的完整性、内容和发布检查。仅凭一个不可用的插件并不能证明跳过这些检查或放弃可以安全创建的快照是合理的。

## <a id="windows-path-boundaries"></a> Windows 路径边界

仍支持显式配置的 UNC 根（例如 `\\server\share\workspace`）和普通扩展驱动器路径（例如 `\\?\C:\workspace`）。每个操作的现有文件系统和权限要求仍然适用。

仅限于工作空间、插件根目录或提取目标的路径必须使用该边界自己的共享。即使文件系统别名可能指向边界内部，外部 UNC 共享或设备名称空间在查找之前也会被拒绝。使用相对路径或承认的根的主机并共享拼写。主机和共享比较忽略 ASCII 大小写； Unicode 相似项不识别同一主机。 OpenClaw 保留有效的本地插件别名，包括短名称和受信任的根，其解析的文件系统位置是网络共享。

请勿随意剥离 `\\?\` 或 `\\.\` 来解决拒绝问题。不明确的命名空间拼写可能会更改 Windows 所到达的主机或设备。

## <a id="what-stays-protected-without-native-acceleration"></a> 在没有本机加速的情况下仍能保护什么

关闭助手后，OpenClaw 仍然获得 fs-safe 的 Node-only 护栏：

- 拒绝相对路径转义 （`..`）、绝对路径和仅允许裸名称的路径分隔符。
- 通过受信任的根句柄而不是临时 `path.resolve(...).startsWith(...)` 检查来解决操作。
- 拒绝需要该策略的 API 上的符号链接和硬链接模式。
- 打开带有身份检查的文件，其中 API 返回或使用文件内容。
- 通过原子兄弟临时 + 重命名写入 state/config 文件。
- en 强制读取和存档提取的字节限制。
- 在 API 要求时，为密钥和状态文件应用私有文件模式。

这涵盖了 OpenClaw 的正常威胁模型：受信任的网关代码处理单个受信任运营商边界内的不受信任的 model/plugin/channel 路径输入。

普通读取从已承认的文件句柄返回字节，而不冻结文件以防止就地写入。当读者需要完整的旧内容或新内容时，作者应该使用原子替换。迁移和发布所有者在删除或替换文件之前分别验证其录制的内容和所有权。

## <a id="what-native-acceleration-adds"></a> 原生加速增加了什么

本机帮助程序提供无策略的文件系统原语。 fs-safe 将它们用于仅创建写入、受保护的硬链接发布、异步 sidecar 创建和显式无替换重命名发布。 Linux 使用 `openat2` 和 `renameat2`。 macOS 使用描述符相关组件检查和 `renameatx_np`。 Windows 使用句柄相关操作、禁用替换重命名和描述符绑定 ACL 检查来实现安全凭证读取。

TypeScript 层仍然拥有策略、验证、重试、清理和回退决策。本机支持缩小了文件系统竞争窗口。它不会将 fs-safe 变成沙箱。

如果您的包部署需要这些本机原语，请设置：

```bash
OPENCLAW_FS_SAFE_NATIVE_MODE=require
```

在 `require` 模式下，不可用或不可加载的助手通常会导致 `helper-unavailable`； Windows 安全凭证读取报告 `permission-unverified`。独立的密封工作包没有依赖树。即使主机设置了模式覆盖，它们也会显式禁用本机加载。

## <a id="plugin-and-core-guidance"></a> 插件和核心指导

- 当路径来自消息、模型输出、配置或插件输入时，面向 Plugin 的文件访问应使用 `openclaw/plugin-sdk/*` 帮助程序。插件在声明自己的 fs 安全依赖项并保留适用的路径策略时可以直接使用经过审查的 fs 安全原语。
- Core 代码应该从其聚焦的包入口点导入 fs 安全原语。将 OpenClaw 适配器保留在它们自己的行为中，包括秘密目录模式修复、存档持久性、生产者隔离和公共 SDK 兼容性。纯粹的重新导出是不必要的：fs-safe 拥有其进程默认值。
- OpenClaw 的插件 SDK 为现有调用者保留了已弃用的 `nonBlockingRead` 输入提示；在新代码中省略它。在支持的情况下，安全读取始终使用非阻塞准入，包括旧提示为 `false` 时。直接 fs 安全调用不再接受此选项。
- SDK 的原子替换助手还保留忽略的适配器 `chmod` 成员以实现源兼容性。直接 fs 安全适配器必须省略它；权限使用保留的文件句柄。
- 压缩包解压应使用 fs-safe 的归档辅助函数，并显式设置大小、条目数、链接和目标位置限制。
- Secrets 应使用 OpenClaw 秘密助手或 fs 安全 secret/private-state 助手。不要在 `fs.writeFile` 周围进行手卷模式检查。
- 对于敌对本地用户隔离，不要单独依赖 fs-safe。在单独的 OS users/hosts 下运行单独的网关，或使用沙箱。

相关内容：[Security](/gateway/security)、[Sandboxing](/gateway/sandboxing)、[Exec approvals](/tools/exec-approvals)、[Secrets](/gateway/secrets)。
