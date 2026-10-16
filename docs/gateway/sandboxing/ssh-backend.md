---
summary: "任意 SSH- 可访问计算机上的沙盒工具及其远程工作空间作为事实来源"
title: "SSH 后端"
read_when: "您正在通过 SSH 将沙盒工具执行卸载到远程计算机。"
---

该后端将远程实用程序合同、身份验证材料和远程工作空间播种一次，然后用作事实来源。

## <a id="ssh-backend"></a> SSH 后端

使用 `backend: "ssh"` 在任意 SSH- 可访问的计算机上沙箱 `exec`、文件工具和媒体读取。

远程环境必须为文件系统桥提供 `/bin/sh`、`python3` 和 GNU- 兼容的 `stat` （`-c`） 和 `readlink` （`-f`、`-n`）。这些实用程序必须可供非交互式 SSH 命令使用，而不仅仅是交互式登录 shell。网关主机不需要这些远程实用程序：macOS 或 Windows 网关可以使用提供它们的 SSH 目标。这是远程实用程序合同，而不是 Linux-only 网关要求。

解析的工作空间和父目录路径在远程读写期间保留其空白，包括嵌入的和尾随的换行符。删除和重命名操作遵循挂载父目录别名，同时作用于最终条目本身。删除最后一个符号链接会使其目标完好无损；解析超出允许安装范围的父母将被拒绝。

新的远程工作空间在发布之前会上传到私有暂存目录中。支持时，fs-safe 会使用原子无替换目录重命名进行发布：Linux 上的 `renameat2` 或 macOS 上的 `renameatx_np`。

在拒绝 `RENAME_NOREPLACE` 的 Linux 文件系统（包括 gVisor 卷挂载）上，fs 安全检查目标是否不存在并回退到目录重命名。这永远不会将空声明公开为已完成的工作区。检查时出现的目标将被保留，并且文件或非空目录竞争对手无法被替换。可以替换检查后创建的空目录。 macOS 仍然需要其本机无替换原语。继续采用现有的远程工作空间，无需重新播种。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

默认值：`command: "ssh"`、`workspaceRoot: "/tmp/openclaw-sandboxes"`、`strictHostKeyChecking: true`、`updateHostKeys: true`。

- **生命周期**：OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。首次使用（创建或重新创建后）时，它会从本地工作区向该远程工作区初始化一次内容。之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示中的媒体读取以及入站媒体暂存都会直接通过 SSH 针对远程工作区运行。OpenClaw 不会自动将远程变更同步回本地工作区。
- **认证材料**：`identityFile`/`certificateFile`/`knownHostsFile` 引用的是现有的本地文件。`identityData`/`certificateData`/`knownHostsData` 接受内联字符串或 SecretRefs，通过正常的 secrets 运行时快照解析，写入权限为 `0600` 的临时文件，并在 SSH 会话结束时删除。如果同一项同时设置了 `*File` 和 `*Data` 变体，则该会话中以 `*Data` 为准。
- **远程工作区后果**：远程SSH工作区在初始种子后成为真正的沙箱状态。在重新创建沙箱之前，种子步骤后在 OpenClaw 外部进行的主机本地编辑无法远程可见。 `openclaw sandbox recreate` 下次使用时再次从本地删除每个范围的远程根和种子。此后端不支持浏览器沙箱，并且 `sandbox.docker.*` 设置不适用于它。
- **回复附件**：附加到回复的工作区相关文件通过SSH文件系统桥读取，包括WebChat和通道回复。读取保留在沙箱工作区中，并保留配置的介质大小限制和支持的文件类型。不使用过时的本地工作区副本来代替远程文件。
