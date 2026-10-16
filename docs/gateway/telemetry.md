---
summary: "每日更新请求、大致位置、可选的匿名功能统计和隐私控制"
title: "使用情况遥测和更新检查"
read_when:
  - "检查 OpenClaw 发送的内容以及接收器存储的内容"
  - "决定是否共享匿名特征统计信息"
  - "启用或禁用匿名功能统计"
  - "禁用所有自动更新检查请求"
---

**自动更新检查默认发送每日请求。** 询问是否存在更新的版本，包括OpenClaw版本、操作系统、Node.js版本、CPU架构和请求面。匿名功能统计是可选择的。此页面描述更新检查遥测，而不是由配置的提供商、渠道或其他服务发出的请求。

匿名功能统计信息描述了配置的通道和提供程序、插件清单以及保留的会话创建计数。默认为 **off**。当您启用它们时，它们会进行相同的每日更新检查，而不是添加第二个请求。

这些报告有助于告知维护优先级。它们不测量单个插件调用、消息、模型请求或活跃用户。匿名使用情况汇总可在 [telemetry.openclaw.ai](https://telemetry.openclaw.ai). 获取

拒绝是完全正常的选择，不会改变 OpenClaw 为您服务的方式。

## <a id="inspect-what-is-sent"></a> 检查发送的内容

在更改您的首选项之前或之后运行此命令：

```bash
openclaw telemetry show
```

添加 `--json` 以获得与一份机器可读文档相同的状态和负载。

输出显示是否启用匿名功能统计、启用或禁用它们的原因、请求端点以及上次成功检查。启用匿名功能统计信息后，它会打印 CLI 进程中内置的 JSON 有效负载预览。它不会从正在运行的网关检索有效负载。当仅禁用匿名功能统计信息时，它会显示仅更新请求及其 `User-Agent` 标头。当自动化或更新检查策略禁用所有请求时，它会显示 `Request: none` 及其原因（JSON 中的 `request: null`）。预览仅描述了客户端请求。它无法显示服务器派生的位置信息。

## <a id="daily-update-check"></a> 每日更新检查

默认请求是：

```http
GET https://telemetry.openclaw.ai/api/latest-version
User-Agent: openclaw/2026.8.2 (darwin; node/26.0.1; arm64; gateway)
```

`User-Agent` 包含 OpenClaw 版本、操作系统、Node.js 版本、CPU 架构以及请求是否来自网关或 CLI。它没有请求正文、安装标识符、机器标识符或随机跟踪标识符。

该服务会以最新版本和可选的面向操作员的简短说明进行响应。 OpenClaw 通过现有更新通知显示可用更新及其注释。无法访问的服务、超时、响应过大或无效以及其他失败的检查不会中断启动或正常操作。

成功的响应及其时间戳被缓存在现有的共享状态数据库中。启动在接下来的 24 小时内重复使用缓存的结果，并且正在运行的网关会在正常维护期间再次进行检查，并有一个小的随机延迟。失败的检查不算作成功的日常检查。

对于测试或自托管，请将 `OPENCLAW_TELEMETRY_ENDPOINT` 设置为您的完整替换端点 URL。公共服务器源可在 [openclaw/telemetry](https://github.com/openclaw/telemetry). 获取

<a id="cloudflare-derived-request-geography" />

## <a id="approximate-location"></a> 大概位置

Cloudflare 提供大致位置：国家、地区代码、城市和时区。我们在分析中不存储原始 IP 地址或精确坐标。

即使匿名功能统计关闭或设置了 `DO_NOT_TRACK`，记录的更新检查也包括这些字段。缺失或无效的字段保留为空。不需要额外的客户端负载或提示。

分析引擎保留 **的记录三个月**。公共聚合不包括位置信息。禁用请求不会删除现有记录。

本节介绍 [telemetry.openclaw.ai](https://telemetry.openclaw.ai). 上的托管服务使用 `OPENCLAW_TELEMETRY_ENDPOINT` 配置的替换端点可以使用不同的基础设施和处理或存储策略。

<a id="optional-feature-statistics" />

## <a id="optional-anonymous-feature-statistics"></a> 可选匿名特征统计

匿名特征统计信息默认为**off**。交互式设置可以提供一次性选择加入 **不用了，默认选择**；引导式快速入门会跳过该提示。 OpenClaw 记录提示响应，因此安装程序不会再次询问。非交互式和脚本式安装不会自动选择加入，但操作员可以使用 `openclaw telemetry on` 或 `telemetry.enabled: true` 显式启用匿名功能统计。启用的设置（而不是提示响应的存在）控制是否包含匿名功能统计信息。

当您显式启用匿名功能统计信息时，相同的每日请求将变为 `POST`，其负载为以下形状的 JSON（值仅供参考）：

```json
{
  "schema": 1,
  "version": "2026.8.2",
  "platform": "darwin-arm64",
  "node": "26.0.1",
  "surface": "gateway",
  "features": {
    "channels": ["discord", "telegram"],
    "providerFamilies": ["anthropic", "openai"],
    "plugins": ["codex", "diagnostics-otel"],
    "pluginsEnabled": 9,
    "sessionsLast24h": 14
  }
}
```

| 字段                       | 含义                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `schema`                    | 有效负载格式版本，目前为`1`。                                                            |
| `version`                   | 安装了OpenClaw版本。                                                                       |
| `platform`                  | 操作系统和CPU架构。                                                            |
| `node`                      | 运行Node.js版本。                                                                          |
| `surface`                   | 请求面：`gateway` 或 `cli`； CLI 预览使用 `gateway`。                              |
| `features.channels`         | 由清单中的公共插件支持的已配置但未明确禁用的通道 ID。        |
| `features.providerFamilies` | 来自配置、身份验证配置文件和配置的模型引用的公共提供者 ID。           |
| `features.plugins`          | 已启用清单中的公共插件 ID，按字母顺序排序。                              |
| `features.pluginsEnabled`   | 该清单中的插件总数，包括 `features.plugins` 中未命名的插件。               |
| `features.sessionsLast24h`  | 保留的会话创建事件在过去 24 小时内加时间戳，而不是会话活动。 |

通过活动的插件注册表，清单包括已启用、已加载其代码已导入的插件，以及已加载的捆绑包格式插件。如果没有该注册表，它将回退到配置的清单启用。这两个路径都记录是否调用了插件或配置的通道或提供程序处理了工作。

命名插件必须捆绑、受信任的官方安装或与官方插件目录匹配。私有插件身份未命名。名称也会被过滤和重复数据删除，并且服务会独立验证它们。因此，`features.pluginsEnabled` 与报告的名称数量之间的差异并不是私有插件的可靠计数。

会话计数取决于保留在有界事件存储中的本地记录的创建事件。丢失或不可读的状态产生零。它不是活动会话、消息或当天存在的所有会话的计数。

发送方和 `openclaw telemetry show` 使用相同的有效负载构建器，但它们的插件注册表、配置和收集时间可能不同。 CLI 预览并不能保证准确的下一个网关有效负载。

报告不包含用户、帐户、安装或设备标识符。重复的报告不是唯一的安装或用户。该服务不维护每次安装的历史记录或保留措施。

<a id="what-is-never-collected" />

### <a id="what-is-not-sent-or-stored"></a> 未发送或存储的内容

更新检查 `User-Agent` 和包含匿名功能统计信息的正文都不包含消息内容、提示、模型名称、API 密钥、凭据、秘密引用、文件路径、主机名、帐户标识符、用户标识符或安装和计算机标识符。 OpenClaw 不会为这些请求创建随机 UUID 或其他持久客户端标识符。

托管服务的分析引擎行不包括这些直接标识符和原始客户端 IP 地址、坐标、邮政编码和物理设备硬件详细信息。 Cloudflare 处理连接 IP 地址，并且工作器暂时使用它们进行速率限制，而不将它们存储在分析引擎中。工作日志被禁用； Cloudflare 的单独基础设施处理不在这些设置之内。

匿名功能统计与可选的、操作员配置的 [OpenTelemetry 导出 ](/gateway/opentelemetry) 是分开的。

<a id="turn-feature-statistics-on-or-off" />

## <a id="turn-anonymous-feature-statistics-on-or-off"></a> 打开或关闭匿名功能统计

随时启用或禁用匿名功能统计：

```bash
openclaw telemetry on
openclaw telemetry off
```

您还可以直接配置相同的首选项：

```json5
{
  telemetry: {
    enabled: false,
  },
}
```

设置 `DO_NOT_TRACK=1` 或 `DO_NOT_TRACK=true` 以强制关闭匿名功能统计，即使 `telemetry.enabled` 为 `true` 时也是如此。 `DO_NOT_TRACK` 不会禁用每日更新检查：OpenClaw 发送仅更新的 `GET` 请求，而不包含包含匿名功能统计信息的正文。

## <a id="automated-environments"></a> 自动化环境

OpenClaw 在检测到自动化环境时不发送任何内容，这意味着 `CI` 环境变量设置为真值。持续集成作业不是安装：它们的数量将超过实际操作员的数量级，并使版本和平台计数毫无意义，并且您的管道不应向我们报告每项作业。

这适用于两个层，因此 CI 作业不会发送更新检查，也不会发送匿名功能统计信息。设置 `OPENCLAW_TELEMETRY_ENDPOINT` 会覆盖抑制，因为配置的端点意味着运行有意使用此路径。

## <a id="disable-every-automatic-update-request"></a> 禁用每个自动更新请求

要完全关闭，请禁用现有的启动更新检查：

```json5
{
  update: {
    checkOnStart: false,
  },
}
```

这会停止两个层和每个自动更新请求：无更新请求、匿名功能统计或更新通知，即使 `update.auto.enabled` 为 `true` 时也是如此。设置 `OPENCLAW_NO_AUTO_UPDATE=1` 还会阻止自动更新请求。当您选择运行显式更新命令时，它们仍然可用。

有关完整的 `telemetry` 配置，请参阅 [ 配置参考 ](/gateway/config-observability#telemetry)，有关自动更新检查控件，请参阅 [ 更新配置 ](/gateway/config-runtime#update)。
