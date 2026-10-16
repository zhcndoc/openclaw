---
summary: "`plugins marketplace` 条目、列表和刷新，以及托管源信任和签名源配置文件"
title: "市场提要"
read_when:
  - "您想要浏览、列出或刷新 OpenClaw 市场 Feed"
  - "您正在配置签名的 Feed 配置文件或固定 Feed 负载校验和"
---

此页面涵盖 `openclaw plugins marketplace`：阅读条目、列出市场来源以及刷新托管源快照。

## <a id="marketplace"></a> 市场

```bash
openclaw plugins marketplace entries
openclaw plugins marketplace entries --offline
openclaw plugins marketplace entries --json
openclaw plugins marketplace entries --feed-profile <name>
openclaw plugins marketplace entries --feed-url <url>
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
openclaw plugins marketplace refresh
openclaw plugins marketplace refresh --feed-profile <name>
openclaw plugins marketplace refresh --feed-url <url>
openclaw plugins marketplace refresh --expected-sha256 <sha256> --json
```

托管提要获取会保存快照，因此没有 `--offline` 的 `entries` 和 `refresh` 需要停止网关。在网关运行时，使用 `entries --offline` 读取接受的快照。

`plugins marketplace entries` 列出来自已配置 OpenClaw 市场源的条目。默认情况下，它会尝试托管源，并回退到最新已接受的快照或捆绑数据。使用 `--feed-profile <name>` 读取特定的已配置配置文件，使用 `--feed-url <url>` 读取明确指定的托管源 URL，使用 `--offline` 在不获取源的情况下读取最新已接受的快照。

`plugins marketplace refresh` 会刷新已配置的托管源快照，并报告 OpenClaw 接受的是托管数据、托管快照还是捆绑回退数据。对于调用方需要命令在新鲜的托管负载不匹配固定校验和时失败的场景，请使用 `--expected-sha256`。

市场 `list` 接受本地市场路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL，或 git URL。`--json` 会打印解析后的源标签，以及已解析的市场清单和插件条目。

人工输出仅将 `v` 添加到数字版本标签，保留现有前缀和构建名称。 JSON 输出保留解析的版本值。

市场刷新加载托管 OpenClaw 市场源，并将经过验证的响应保留为本地托管源快照。如果没有选项，它将使用配置的默认源配置文件。使用 `--feed-profile <name>` 刷新特定配置的配置文件，使用 `--feed-url <url>` 刷新显式托管源 URL，使用 `--expected-sha256 <sha256>` 要求匹配的负载校验和（`sha256:<hex>` 或裸 64 字符十六进制摘要），使用 `--json` 获取机器可读输出。显式托管源 URL 不得包含凭据、查询字符串或片段。取消固定的刷新可以报告托管快照或捆绑回退结果，而不会导致命令失败。除非固定刷新接受新的托管有效负载，否则它们会失败；如果 OpenClaw 无法保留经过验证的快照，成功的托管刷新也会失败。

内置 `clawhub-public` 配置文件需要有效负载标识 `clawhub-official`。在 ClawHub 生成并移交该密钥后，OpenClaw 将捆绑 ClawHub 的生产公钥。在此之前，内置配置文件不会授予签名源安装权限。公钥必须来自受信任的版本或运营商通道，而不是来自源主机上的密钥端点。

OpenClaw 会验证 DSSE 封装，并且当配置文件声明 `feedId` 时， 要求解码后的负载 ID 与之匹配。内置的 `clawhub-public` 配置文件始终声明其标识，防止通过该配置文件重放另一个源的有效文档。

在分阶段推出期间，省略 `feedId` 的现有自定义签名配置文件保留签名验证，无需有效负载身份绑定。新的自定义配置文件应声明 `feedId`。 feed-profile配置界面与Control UI所需的呈现元数据分开登陆；其医生诊断必须要求操作员提供缺失的身份，并且不得从提要 URL 中推断出身份。此信任绑定不会恢复已停用的根 `marketplaces` 密钥。
