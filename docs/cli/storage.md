---
summary: "列出、初始化和测试配置的存储位置"
title: "贮存"
read_when:
  - "您正在连接磁盘或对象存储作为存储位置"
  - "您需要检查存储访问或加密密钥"
---

# `openclaw storage`

管理 `storage.locations` 下配置的命名目标。有关配置、加密和提供商合同，请参阅 [ 存储位置](/concepts/storage-locations)。

```bash
openclaw storage list
openclaw storage init archive
openclaw storage test archive
```

所有三个命令都接受 `--json`，包括子命令之前：

```bash
openclaw storage list --json
openclaw storage --json init archive
openclaw storage test archive --json
```

## <a id="list"></a> 列表

`storage list` 显示每个配置的位置、其提供者、可用时的显示目标及其检查状态。检查读取位置标记并检查访问权限和加密密钥。它不会初始化位置或写入测试对象。报告容量的提供程序在 JSON 输出中包括可用字节和总字节。

## <a id="initialize"></a> 初始化

`storage init <name>` 使用仅创建操作写入位置的身份和加密标记。使用相同的加密配置重复它可以验证现有标记；它不会取代它。密码错误会失败。

对于 `filesystem` 位置，配置的绝对路径必须已存在并且是目录。 OpenClaw 从不创建此根目录。在初始化外部磁盘位置之前，请确认已安装外部磁盘。

初始化是显式的，因此断开连接的磁盘或空的安装点不能默默地成为新的目标。如果运行时操作报告缺少标记，请重新连接磁盘或检查存储桶和前缀。仅当该位置是新的时才初始化该位置。例如：

> 存储位置“r2test”（r2：//bucket/prefix）没有初始化标记。如果这是一个新位置，则运行 `openclaw storage init r2test`；否则重新连接磁盘或检查存储桶和前缀。

## <a id="test"></a> 测试

`storage test <name>` 在位置根写入一个小的、唯一的 `.openclaw-probe-<uuid>` 对象，通过配置的加密层将其读回，验证每个字节，然后删除该对象。它需要一个已初始化的位置，但从不初始化它。在文件系统位置上不会创建检查目录。

成功的 JSON 结果包括 `state: "ok"` 和 `sizeBytes`。失败的写入、回读验证或清理会导致命令失败。如果在清理期间无法访问提供程序，请在删除任何剩余的检查对象之前重新连接它。

存储位置可以包含凭据和私人对话。除非目标已受保护并且您故意选择 `encryption: "none"`，否则请使用加密。
