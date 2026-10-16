---
summary: "将 Cloudflare R2 配置为加密的 OpenClaw 存储位置"
title: "Cloudflare"
read_when:
  - "您想要将 OpenClaw 工件存储在 Cloudflare R2 中"
  - "您需要配置 R2 存储桶、凭证或管辖区"
  - "您正在诊断 R2 存储访问"
---

# Cloudflare

捆绑的 Cloudflare 插件通过 Cloudflare 的 S3- 兼容 API 提供 `r2` 存储位置。 OpenClaw 处理位置身份和加密；该插件将对象传输到您的存储桶。配置位置不会安排备份或移动现有数据。

## <a id="create-a-bucket-and-credentials"></a> 创建存储桶和凭证

1. 在Cloudflare仪表板中，打开**R2对象存储**并创建私有存储桶，例如`openclaw-artifacts`。存储桶名称必须包含 3-63 个小写字母、数字或连字符，并且不能以连字符开头或结尾。
2. 记录您的 Cloudflare 账户 ID 以及存储桶的管辖区（如果有）。
3. 从R2的**账户详细信息**中，选择**API代币**旁边的**管理**，然后**创建账户API代币**。
4. 选择 **Object Read & Write** 并限制对您创建的存储桶的访问。
5. 将 **访问密钥 ID** 和 **秘密访问密钥** 保存在您的秘密管理器中。 Cloudflare 仅显示一次秘密访问密钥。

使用此流程中的 R2 S3 凭证。请参阅Cloudflare的[桶创建指南](https://developers.cloudflare.com/r2/buckets/create-buckets/)和[R2代币指南](https://developers.cloudflare.com/r2/api/tokens/)。

## <a id="configure-a-location"></a> 配置位置

在运行 CLI 和网关的环境中，使保存的凭据可用作 `R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`。创建单独的加密密码，在机密管理器中保留可恢复的副本，并在该环境中将其提供为 `OPENCLAW_STORAGE_PASSPHRASE`。

将此添加到您的 OpenClaw 配置中，替换示例帐户 ID 和存储桶：

```json5
{
  storage: {
    locations: {
      offsite: {
        provider: "r2",
        settings: {
          accountId: "00000000000000000000000000000000",
          bucket: "openclaw-artifacts",
          prefix: "openclaw",
          accessKeyId: {
            source: "env",
            provider: "default",
            id: "R2_ACCESS_KEY_ID",
          },
          secretAccessKey: {
            source: "env",
            provider: "default",
            id: "R2_SECRET_ACCESS_KEY",
          },
        },
        encryption: {
          passphrase: {
            source: "env",
            provider: "default",
            id: "OPENCLAW_STORAGE_PASSPHRASE",
          },
        },
      },
    },
  },
}
```

R2凭证设置需要[SecretRefs](/gateway/secrets/secretref-contract)；纯文本凭证字符串被拒绝。您可以使用另一个配置的秘密提供程序而不是环境变量。作为服务运行的网关需要其自身环境中的值，而不仅仅是交互式 shell 中的值。

在正常插件策略下，引用 `provider: "r2"` 会自动启用捆绑的 `cloudflare` 插件。显式禁用和拒绝规则仍然适用。

## <a id="initialize-and-test"></a> 初始化并测试

确认桶和前缀，然后初始化位置并验证完整的write/read/delete循环：

```bash
openclaw storage init offsite
openclaw storage test offsite
openclaw storage list --json
```

对于上面的示例，初始化将位置标记写入 `openclaw/openclaw-storage.json`。显示的目标是`r2://openclaw-artifacts/openclaw`。成功的测试确认它写入、读取、验证和删除了其检查对象；添加 `--json` 为 `state: "ok"`。保留标记和加密密码：丢失其中任何一个都会导致加密对象不可读。 R2 运行状况检查验证存储桶访问，而不报告可用空间或总空间。

## <a id="settings"></a> 设置

以下所有字段均属于 `storage.locations.<name>.settings`。

| 字段             | 必需的 | 含义                                                                                                                                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accountId`       | 是      | Cloudflare 账户 ID：正好 32 个小写十六进制字符。                                                                                                                            |
| `bucket`          | 是      | 现有的桶名称为R2，遵循上述命名规则。                                                                                                                                     |
| `prefix`          | No       | 对象键前缀。使用仅包含字母、数字、`.`、`_` 和 `-` 的斜杠分隔段；没有空、`.` 或 `..` 段或 leading/trailing 斜杠。省略它以使用桶根。 |
| `jurisdiction`    | No       | `"eu"`或`"fedramp"`，匹配桶的管辖范围。省略默认端点。                                                                                                      |
| `accessKeyId`     | 是      | SecretRef 为 R2 访问密钥 ID。                                                                                                                                                            |
| `secretAccessKey` | 是      | SecretRef 为 R2 秘密访问密钥。                                                                                                                                                        |
| `sessionToken`    | No       | SecretRef 用于使用 R2 临时凭证时的会话令牌。                                                                                                                           |

该插件使用区域 `auto`。默认选择 `https://<accountId>.r2.cloudflarestorage.com`，`"eu"` 默认选择 `https://<accountId>.eu.r2.cloudflarestorage.com`，`"fedramp"` 默认选择 `https://<accountId>.fedramp.r2.cloudflarestorage.com`。不需要自定义端点。前缀是存储桶内的命名空间，而不是单独的权限边界；令牌的范围仍然是存储桶。

## <a id="troubleshooting"></a> 故障排查

下载使用连续的 64 个 MiB 范围，并在连接重置、超时或可重试服务器错误后从最后接收的字节恢复，每个范围最多重试八次。每个范围必须与原始对象的 ETag 匹配。如果对象在下载过程中发生变化，请重新启动命令以读取新对象。失败的下载报告字节数和下一个偏移量；重新启动命令会启动新的下载，而不是重用以前的临时文件。

对于 401 或 403 错误，请检查 R2 令牌在配置的存储桶上是否具有 **Object Read & Write**，以及 SecretRefs 是否在运行命令的进程中解析。对于临时凭证，还要验证会话令牌是否存在且尚未过期。

如果桶缺失，请在配置的账户中创建或者修改`accountId`、`bucket`、`jurisdiction`。 OpenClaw 不创建桶。

如果该位置没有初始化标记，请在运行 `openclaw storage init <name>` 之前确认前缀正确。更改前缀会选择不同的位置根。对于`wrong-key`，恢复原始加密密码；替换标记不会恢复加密数据。

请参阅 [ 存储位置 ](/concepts/storage-locations) 了解加密和位置生命周期，并参阅 [ 存储 CLI 参考 ](/cli/storage) 了解命令输出。
