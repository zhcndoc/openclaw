---
summary: "通过专用的节点命令在配对节点上获取、列出和写入文件。对最大 16 MB 的二进制文件，使用 node.invoke 上的 base64 方式绕过 bash stdout 截断。"
read_when:
  - You are installing, configuring, or auditing the file-transfer plugin
title: "File Transfer plugin reference"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. Hand-written text survives only
between the openclaw-plugin-reference:manual-start and
openclaw-plugin-reference:manual-end comment markers. -->

通过专用的节点命令在配对节点上获取、列出和写入文件。对最大 16 MB 的二进制文件，使用 node.invoke 上的 base64 方式绕过 bash stdout 截断。

## 分发

- Package: `@openclaw/file-transfer`
- Install route: included in OpenClaw

## 接口

- CLI commands: `openclaw file-transfer`
- Contracts: `tools`

<!-- openclaw-plugin-reference:manual-start -->

## Directory archives

`dir_fetch` fetches the whole directory tree, including dotfiles and hidden
directories. File-transfer policy checks every descendant; a denied entry
rejects the whole transfer instead of being filtered out. Path identity,
symlink, archive-size, and extraction limits still apply.

## Migrate existing permissions

After upgrading, older positive file-transfer permissions remain inactive until
you review them. Deny rules, size limits, and symlink settings continue to
apply. Run this command on the Gateway host in an interactive terminal:

```bash
openclaw file-transfer approvals migrate
```

See [File transfers](/cli/file-transfer) for the full flag surface and the
non-interactive exit codes.

For each older path, choose one outcome:

- **Require exact reapproval** removes the ambiguous permission. The next use
  prompts once and records the exact node, command, requested path, and
  canonical target.
- **Keep as an intentional wildcard** preserves the entry as an
  operator-authored glob.
- **Remove this permission** deletes the positive entry.

Use `--dry-run` to review the plan without writing. Non-interactive and `--json`
runs never guess; they list unresolved items and direct you back to the same
interactive command.

The migration writes the new format once after confirmation and reports whether
the adjacent config backup was verified. Older OpenClaw versions cannot read
the migrated format. To downgrade, restore that reported `.bak` file before
starting the older version; doing so also restores the older permission
semantics.

<!-- openclaw-plugin-reference:manual-end -->
