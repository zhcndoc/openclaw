---
summary: "使用本地缓存数据库将连接客户端的 IP 地址解析为粗略城市，无需每次查找第三方调用"
read_when:
  - "您想查看使用您的网关的人从哪里进行连接"
  - "您正在选择或替换 IP-geolocation 数据库并需要其许可条款"
  - "位置丢失、错误或卡住，您需要知道哪一层失败"
title: "地理定位插件"
---

捆绑的 `geolocation` 插件将连接客户端的 IP 地址变成粗略的城市。它随 OpenClaw 一起提供，在首次使用时下载其数据库，并完全从本地副本进行应答，因此查找永远不会将地址发送给第三方。

它只拥有一件事：地点地址。它不决定查找哪些地址，不存储结果，也不是授权输入。 Control UI 使用它来标记个人 [Activity](/concepts/presence) 卡上的设备。当代理请求 `include: ["location"]` 时，核心 `presence` 工具使用相同的查找所有者。

## <a id="quickstart"></a> 快速开始

默认情况下，该插件已捆绑并处于活动状态。要查看其工作原理，请打开 **Activity**，选择一个人，然后查看他们的设备行。远程客户端显示其地址和解析的城市：

```
openclaw-control-ui  MacIntel · 8.8.8.8 · Europe/Vienna  Mountain View, California ⓘ
```

全新安装后的第一个视图在数据库下载时不显示任何城市；一旦准备好，该行就会自行填充，无需重新加载。直接检查插件：

```bash
curl -s "http://127.0.0.1:18789/plugins/geolocation/lookup?ip=8.8.8.8" -H "Authorization: Bearer <GATEWAY_TOKEN>"
```

```json
{
  "found": true,
  "city": "Mountain View",
  "region": "California",
  "country": "United States",
  "countryCode": "US",
  "attribution": { "text": "IP Geolocation by DB-IP", "url": "https://db-ip.com" }
}
```

使用实际可路由的地址。数据库中不存在诸如 `203.0.113.0/24` 之类的保留范围，并回答 `{"found": false}`：

```json
{
  "found": false,
  "attribution": { "text": "IP Geolocation by DB-IP", "url": "https://db-ip.com" }
}
```

第一个呼叫还会下载数据库，因此预计最多需要一分钟，而后续呼叫将从本地副本应答。

### <a id="gateway-lookup"></a> 网关查找

通过 `operator.read` 进行身份验证的呼叫者可以将 `geolocation.lookup` 与 `{"ips":["8.8.8.8"]}` 一起使用。请求最多接受 200 个 IPv4 或 IPv6 地址，并为 `results` 中的每个不同地址返回一个条目。每个条目包括 `ip`、`status`（`found`、`not-found` 或 `unavailable`）、可用位置字段和 `attribution`。

`presence` 工具仅在请求位置时调用此方法。禁用插件或数据库中断会留下可用的状态和网络详细信息；位置被报告为不可用。查找使用记录的连接 IP，从不请求 GPS，并且不会将 IP 发送到外部服务。客户端时区仍然是单独报告的事实。

## <a id="why-some-clients-never-show-a-location"></a> 为什么有些客户端从不显示位置

仅当网关记录了该客户端的可用公共地址时，位置才会出现，但通常不会：

- 对于环回客户端，Connect 处理完全忽略 `ip`，因此通过 SSH 隧道或本地端口转发到达网关的任何内容都没有需要解析的地址。
- Tailscale 客户端到达 `100.64/10` 运营商级 NAT 地址，LAN 客户端到达专用地址。两者都会被记录和显示，但没有地理定位数据库包含它们，因此插件会回答这些范围的 `found: false` ，而根本不加载数据库。因此，仅 tailnet 或 LAN-only 网关永远不会下载。
- 移动运营商、VPN 和企业出口解析为运营商的出口点，而不是个人。答案肯定是错误的而不是缺失的。

这就是设备行还携带客户端报告的时区的原因。无论浏览器如何到达网关，浏览器都知道自己的区域，因此 `Europe/Vienna` 在地址不再提供信息的地方继续准确地工作。将城市视为提示，将区域视为更可靠的信号。请参阅 [Presence](/concepts/presence) 了解这两个字段的生成方式。

## <a id="configuration"></a> 配置

每个选项都是可选的。默认设置是工作设置。

| 选项            | 默认值                       | 用途                                                              |
| ----------------- | ----------------------------- | -------------------------------------------------------------------- |
| `databaseUrl`     | 每月 DB-IP City Lite 构建 | MMDB 来源。 `{yyyy}` 和 `{mm}` 扩展到发布月份。          |
| `attributionText` | `IP Geolocation by DB-IP`     | 每个结果旁边都会显示信用。                                   |
| `attributionUrl`  | `https://db-ip.com`           | 信用的链接目标。                                          |
| `refreshDays`     | `30`                          | 再次下载之前缓存的数据库可能会变得多么陈旧。 |

```json5
{
  plugins: {
    entries: {
      geolocation: {
        config: {
          refreshDays: 7,
        },
      },
    },
  },
}
```

每月构建会在该月的几天后出现，因此插件会尝试当前月份并回退到上个月。不需要月份替换的源按书面方式获取。

### <a id="using-a-different-database"></a> 使用不同的数据库

将 `databaseUrl` 与两个属性字段一起设置。信用属于您指向的任何数据集，因此在不更改信用的情况下更改源会错误地分配数据：

```json5
{
  plugins: {
    entries: {
      geolocation: {
        config: {
          databaseUrl: "https://example.internal/geoip/city.mmdb",
          attributionText: "IP data by Example",
          attributionUrl: "https://example.internal",
        },
      },
    },
  },
}
```

任何 MaxMind 格式的城市数据库都可以使用，包括自托管镜像或您已获得许可的商业版本。缓存文件以源 URL 命名，因此切换源无法在新提供商的信用下提供先前提供商的数据。

## <a id="data-license"></a> 数据许可证

默认数据库为 **DB-IP City Lite**，授权 **CC BY 4.0**。该许可证需要归属，这就是为什么信用是每个响应的一部分，并且呈现在值旁边而不是隐藏在设置中。

OpenClaw 在运行时下载此数据库并且从不重新分发它，因此许可证附加到您的部署对数据的使用，而不是附加到 OpenClaw 本身。插件代码及其使用的 `maxmind` 阅读器是 MIT。没有免费的市级IP数据库获得MIT-许可；该义务与数据同在。

预计城市级准确度在 55-80% 范围内，对于上述移动、VPN 和 CGNAT 情况，情况更糟。

## <a id="how-the-database-is-managed"></a> 数据库是如何管理的

下载是惰性的并且是需求驱动的。它发生在第一次授权查找 **public** 地址时，例如打开某人的活动视图或询问客服人员是否存在位置详细信息。无人检查的网关（或者仅通过环回、隧道、LAN 或尾网到达的网关）永远不会下载任何内容。

在第一次限定查找时，插件将数据库提取到 `<state-dir>/geolocation/` 中，在发布之前对其进行解析，并保留它直到其老化时间超过 `refreshDays`。

有四种行为值得了解，因为它们决定了您在失败期间会看到什么：

- 响应是根据压缩上限读取的，并根据磁盘上限膨胀的，两者在读取时都会强制执行。被替换的源无法分配无限的主体，压缩炸弹也无法膨胀超过限制。
- 未解析为 MMDB 的主体将被丢弃，而不替换工作数据库。速率限制页面或截断的下载无法破坏一分钟前正在运行的网关。
- A 下载失败或无效数据库提供缓存副本并记录警告。如果无法将有效下载保存到磁盘，则查找会从内存中使用它并记录缓存写入失败。
- 一个网关中的并发首次查找共享一个下载。单独的网关独立地暂存其下载，并在替换缓存之前关闭完整的文件，因此另一个网关永远不会读取部分写入的下载。

## <a id="troubleshooting"></a> 故障排查

**在任何设备行上都没有位置。** 要么网关没有记录地址——仅显示平台和时区的行没有 `ip`，这对于环回和隧道客户端来说是预期的——要么存在的每个地址都是私有或运营商级的 NAT，插件在不咨询数据库的情况下回答。在这两种情况下都不会损坏任何东西。

**每次查找都会返回 503.** 数据库不可用 — 仍在下载，或者每个候选 URL 均失败。检查网关日志中是否有 `geolocation: downloaded` 或命名它尝试的每个 URL 的 `geolocation database download failed` 行。没有出站网络访问权限的网关无法获取数据库；将 `databaseUrl` 指向内部镜子。

**A `found: false` 答案。** 数据库没有该地址的条目。这是数据限制，而不是失败。请注意，503 和 `found: false` 是故意不同的：一个意味着插件无法应答，另一个意味着数据库没有该地址的位置。

**A 城市错误。** 确认该地址是本人的，而不是 VPN 或承运人出口。如果确实有误，DB-IP接受更正，或者将`databaseUrl`指向覆盖范围更好的商业数据库。

## <a id="related"></a> 相关内容

- [Presence](/concepts/presence) — 连接如何记录该插件读取的地址和时区
- [管理插件](/plugins/manage-plugins) — 启用、禁用和配置捆绑插件
- [可信代理身份验证](/gateway/trusted-proxy-auth) — 网关如何确定代理后面的客户端地址
