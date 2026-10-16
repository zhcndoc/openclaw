---
summary: "公共 REST API （v1） 概述和约定。"
read_when:
  - "构建 API 客户端"
  - "添加端点或模式"
---

# API v1

底座：`https://clawhub.ai`

OpenAPI: `/api/v1/openapi.json`

## <a id="public-catalog-reuse"></a> 公共目录复用

您可以在 ClawHub 的公共读取 API 之上构建第三方目录、目录或搜索界面。公共技能元数据和技能文件是根据 ClawHub 的技能许可规则发布的，而 API 本身是有速率限制的，应负责任地使用。

指南：

- 使用公共读取端点（例如 `GET /api/v1/skills`、`GET /api/v1/search` 和 `GET /api/v1/skills/{slug}`）来获取目录列表。
- Cache 响应并尊重 `429`、`Retry-After` 和速率限制标头，而不是积极轮询。
- 在显示列表时链接回规范的 ClawHub 技能 URL，以便用户可以检查源注册表记录。
- 使用 `https://clawhub.ai/<owner>/skills/<slug>` 形式的规范页面 URL。
- 并不暗示ClawHub认可、验证或运营第三方网站。
- 不要通过绕过公共 API 过滤器或身份验证边界来镜像隐藏、私有或审核阻止的内容。

## <a id="auth"></a> 身份验证

- 公开阅读：无需令牌。
- 写入+帐号：`Authorization: Bearer clh_...`。

## <a id="rate-limits"></a> 速率限制

授权感知强制执行：

- 匿名请求：根据 IP。
- 经过身份验证的请求（有效的承载令牌）：每个用户存储桶。
- Missing/invalid 代币回退到 IP 强制执行。

- 读取：每个 IP 3000/分钟，每个键 12000/分钟
- 写入：每个 IP 300/分钟，每个键 3000/分钟
- 下载：每个 IP 1200/分钟，每个密钥 6000/分钟

标头：`X-RateLimit-Limit`、`X-RateLimit-Reset`、`RateLimit-Limit`、`RateLimit-Reset`； `X-RateLimit-Remaining`、`RateLimit-Remaining` 和 `Retry-After` 包含在 `429` 上。

语义：

- `X-RateLimit-Reset`：Unix纪元秒（绝对重置时间）
- `RateLimit-Reset`：延迟秒数直至重置
- `X-RateLimit-Remaining` / `RateLimit-Remaining`：存在时的确切剩余预算；分片成功的请求会忽略它而不是返回近似的全局值
- `Retry-After`：延迟等待`429`的秒数

示例 `429`：

```http
HTTP/2 429
x-ratelimit-limit: 20
x-ratelimit-remaining: 0
x-ratelimit-reset: 1771404540
ratelimit-limit: 20
ratelimit-remaining: 0
ratelimit-reset: 34
retry-after: 34
```

客户处理：

- 首选 `Retry-After`（如果存在）。
- 否则使用 `RateLimit-Reset` 或从 `X-RateLimit-Reset` 导出延迟。
- 添加抖动以重试。

## <a id="errors"></a> 错误

- v1 错误是纯文本 （`text/plain; charset=utf-8`），包括 `400`、`401`、`403`、`404`、`429` 和阻止下载响应。
- 为了兼容性，忽略未知的查询参数。
- 具有无效值的已知查询参数返回 `400`。

## <a id="endpoints"></a> 端点

公众阅读：

- `GET /api/v1/search?q=...`
  - 可选滤波器：`highlightedOnly=true`、`nonSuspiciousOnly=true`
  - 可选模式：`mode=exact` 用于确定性精确段匹配
  - 无效的`mode`值返回`400 Invalid search mode`
  - 旧别名：`nonSuspicious=true`
- `GET /api/v1/skills?limit=&cursor=&sort=`
  - `sort`：`updated`（默认）、`recommended`（`default`）、`createdAt`（`newest`）、`downloads`、`stars` （`rating`）、`name`、旧版安装别名 `installsCurrent`/`installs`/`installsAllTime` 映射到 `downloads`、`trending`
  - `prefix`：确定性 slug 前缀按升序 slug 顺序列出；继续 `nextCursor`
  - 无效的`sort`值返回`400`
  - `cursor` 适用于非 `trending` 排序
  - 可选过滤器：`nonSuspiciousOnly=true`
  - 旧别名：`nonSuspicious=true`
  - 使用 `nonSuspiciousOnly=true` 时，基于游标的页面可能包含少于 `limit` 的项目；使用 `nextCursor` 继续。
  - `recommended` 使用参与度和新近度信号。
- `GET /api/v1/skills/{slug}`
- `GET /api/v1/skills/{slug}/moderation`
- `GET /api/v1/skills/{slug}/versions?limit=&cursor=`
- `GET /api/v1/skills/{slug}/versions/{version}`
- `GET /api/v1/skills/{slug}/scan?version=&tag=`
- `GET /api/v1/skills/{slug}/file?path=&version=&tag=`
- `GET /api/v1/resolve?slug=&hash=`
- `GET /api/v1/download?slug=&version=&tag=`
  - 托管技能返回确定性 ZIP 字节。
  - 当前 GitHub- 支持的 `clean` 或 `suspicious` 扫描技能返回 JSON `public-github` 切换描述符，而不是 ClawHub 字节。
- `GET /api/v1/skills/export?startDate=&endDate=&limit=&cursor=`
  - 托管技能导出为存储文件。
  - 通过 `clean` 或 `suspicious` 扫描的当前 GitHub- 支持的技能将导出为 `public-github` 切换描述符。
- `GET /api/v1/packages?limit=&cursor=&sort=`
  - `sort`：`updated`（默认）、`recommended`、`downloads`、旧别名 `installs`
  - 无效的`sort`值返回`400`
- `GET /api/v1/plugins?limit=&cursor=&sort=`
  - `sort`：`recommended`（默认）、`downloads`、`updated`、旧别名 `installs`
- `GET /api/v1/plugins?category=memory&curated=true&sort=downloads`
  - 完整类别浏览：首先整理封装引脚，然后按降序下载，按封装名称升序下载。所有列表语言仍然可用。
  - 返回有序 `pinnedPackages` 的光标分页和类别元数据；不可用的引脚将被跳过。
  - 搜索和普通目录读取保留每种语言的列表。
- `GET /api/v1/plugins/overview`
  - 可缓存的有界市场货架和类别元数据与 `pinnedPackages`。其他省略。
- `GET /api/v1/plugins/categories`
  - 完整的插件分类，包括计算机使用以及当前的每个类别 pin 策略。
- `GET /api/v1/plugins/search?q=...`
- `GET /api/v1/packages/{name}/versions/{version}/artifact`
- `GET /api/v1/packages/{name}/versions/{version}/security`
- `GET /api/v1/packages/{name}/versions/{version}/artifact/download`
- `GET /api/npm/{package}`
- `GET /api/npm/{package}/-/{tarball}.tgz`

需要身份验证：

- `POST /api/v1/skills`（发布，首选多部分）
- `DELETE /api/v1/skills/{slug}`
- `DELETE /api/v1/packages/{name}`
- `POST /api/v1/skills/{slug}/undelete`
- `POST /api/v1/packages/{name}/undelete`
- `POST /api/v1/skills/{slug}/rename`
- `POST /api/v1/skills/{slug}/merge`
- `POST /api/v1/skills/{slug}/transfer`
- `POST /api/v1/packages/{name}/transfer`
- `POST /api/v1/skills/{slug}/transfer/accept`
- `POST /api/v1/skills/{slug}/transfer/reject`
- `POST /api/v1/skills/{slug}/transfer/cancel`
- `GET /api/v1/skills/export?startDate=&endDate=&limit=&cursor=`
- `GET /api/v1/plugins/export?startDate=&endDate=&limit=&cursor=&family=`
- `GET /api/v1/transfers/incoming`
- `GET /api/v1/transfers/outgoing`
- `GET /api/v1/whoami`

仅限管理员：

- `POST /api/v1/users/reserve` 为所有者句柄保留根段和私有非发布包占位符。

## <a id="legacy"></a> 旧版

旧版 `/api/*` 和 `/api/cli/*` 仍然可用。参见 `DEPRECATIONS.md`。
