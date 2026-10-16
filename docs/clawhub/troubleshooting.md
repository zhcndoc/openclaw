---
summary: "对 ClawHub 登录、安装、发布、更新和 API 问题进行故障排除。"
read_when:
  - "ClawHub CLI 或 OpenClaw 注册表命令失败"
  - "无法安装、发布或更新包"
---

# <a id="troubleshooting"></a> 故障排除

## <a id="clawhub-login-waits-for-authorization"></a> `clawhub login` 等待授权

打开CLI打印的验证码URL，如果需要，使用GitHub登录，并为显示的代码选择**Authorize**。您可以在其他设备上使用浏览器；不需要本地主机回调。

如果代码过期，请再次运行 `clawhub login`。对于无人值守登录，请在 ClawHub 设置 → API 令牌中创建 API 令牌并运行：

```bash
clawhub login --token <token>
```

## <a id="whoami-or-publish-returns-unauthorized-(401)"></a><a id="whoami-or-publish-returns-unauthorized-401"></a> `whoami` 或 `publish` 返回 `Unauthorized` （401）

- 使用 `clawhub login` 重新登录。
- 如果您使用自定义配置路径，请确认 `CLAWHUB_CONFIG_PATH` 指向包含当前令牌的文件。
- 如果您使用API令牌，请确认它没有在网络UI中被撤销。

## <a id="search-or-install-returns-rate-limit-exceeded-(429)"></a><a id="search-or-install-returns-rate-limit-exceeded-429"></a> 搜索或安装返回 `Rate limit exceeded` （429）

读取响应中的重试信息：

- `Retry-After`：重试之前等待的秒数。
- `RateLimit-Limit`：应用于此请求的限制。
- `RateLimit-Remaining`：当标题存在时您的确切剩余预算。在`429`上，它是`0`。
- `RateLimit-Reset`或`X-RateLimit-Reset`：复位时序。

如果许多用户共享一个出口 IP，则即使每个人仅发送少量请求，也可能会达到匿名 IP 限制。尽可能登录并在报告的延迟后重试。

## <a id="search-or-install-fails-behind-a-proxy"></a> 在代理后面搜索或安装失败

CLI 遵循标准代理变量：

```bash
export HTTPS_PROXY=http://proxy.example.com:3128
clawhub search "my query"
```

支持的名称包括 `HTTPS_PROXY`、`HTTP_PROXY`、`https_proxy` 和 `http_proxy`。

## <a id="a-skill-does-not-appear-in-search"></a> A技能未出现在搜索中

- 如果您知道，请检查确切的 slug 或所有者页面。
- 确认该发布是公开的且未通过扫描或审核进行保存。
- 如果您拥有该技能，请登录并检查：

```bash
clawhub inspect @openclaw/demo
```

所有者可见的诊断可以解释扫描、上传门或审核状态。

## <a id="publish-fails-because-required-metadata-is-missing"></a> Publish 失败，因为缺少所需的元数据

有关技能，请查看 `SKILL.md` frontmatter。应声明所需的环境变量和工具，以便用户和扫描程序可以理解该包。

对于插件，请检查 `package.json` 兼容性元数据。代码插件发布需要OpenClaw兼容字段，例如`openclaw.compat.pluginApi`和`openclaw.build.openclawVersion`。

首先预览发布负载：

```bash
clawhub package publish <source> --family code-plugin --dry-run
```

## <a id="publish-fails-with-a-github-owner-or-source-error"></a> Publish 失败，并出现 GitHub 所有者或源错误

ClawHub 使用 GitHub 身份和来源归属将包连接到其发布者。

- 确保您使用拥有或可以发布包的 GitHub 帐户登录。
- 检查源 URL 是否是公共的或可供 ClawHub 访问。
- 对于 GitHub 源，请使用 `owner/repo`、`owner/repo@ref` 或完整的 GitHub URL。

## <a id="publish-fails-because-a-namespace-is-claimed-or-reserved"></a> Publish 失败，因为命名空间已声明或保留

如果由于所有者句柄、组织命名空间、包范围、技能 slug 或包名称已被声明或保留而导致发布失败，请首先确认您正在使用与命名空间匹配的所有者进行发布。对于插件包，必须将 `@example-org/example-plugin` 等范围名称发布为匹配的 `example-org` 所有者。

如果您认为您的组织、项目或品牌是合法的命名空间所有者，但您无法管理当前的 ClawHub 所有者，请使用公开的非敏感证据打开 [Org / 命名空间声明问题 ](https://github.com/openclaw/clawhub/issues/new?template=org-namespace-claim.yml)。请参阅 [Org 和命名空间 Claims](/clawhub/namespace-claims) 以获取证据指导以及应避免出现公共问题的内容。

## <a id="sync-says-no-skills-were-found"></a> `sync` 说没有找到技能

`sync` 查找包含 `SKILL.md` 或 `skill.md` 的文件夹。

将其指向要扫描的根：

```bash
clawhub sync --root /path/to/skills
```

如果您不确定将发布什么内容，请先预览：

```bash
clawhub sync --all --dry-run --no-input
```

## <a id="update-refuses-because-of-local-changes"></a> `update` 由于本地更改而拒绝

本地文件与 ClawHub 所知的任何版本都不匹配。选择一项：

- 保留本地编辑并跳过更新。
- 用发布的版本覆盖：

```bash
clawhub update @openclaw/demo --force
```

- 将编辑后的副本发布为新的 slug 或 fork。

## <a id="a-plugin-install-fails-in-openclaw"></a> A 插件安装在 OpenClaw 中失败

- 使用显式 ClawHub 源：

```bash
openclaw plugins install clawhub:<package>
```

- 检查包详细信息页面以获取扫描状态和兼容性元数据。
- 确认您的 OpenClaw 版本满足软件包公布的兼容性范围。
- 如果软件包被隐藏、保留或阻止，则在所有者解决问题之前可能无法安装。

## <a id="public-api-requests-fail"></a> 公共 API 请求失败

- 尊重 `429` 重试标头并缓存公共 list/search 响应。
- Link 用户返回到规范的 ClawHub 列表。
- 请勿在公共 API 表面之外镜像隐藏、私人、保留或审核阻止的内容。

有关端点详细信息，请参阅 [HTTP API](/clawhub/http-api)。
