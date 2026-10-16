---
summary: "通过 ClawHub 管理 UI 和管理员 CLI 发布和维护公司 MCP 集成。"
read_when:
  - "添加或更新托管公司 MCP 插件"
  - "安装托管公司 MCP 插件"
---

# <a id="manage-company-mcp-plugins"></a> 管理公司MCP插件

管理员可以通过 **管理 → 插件 → 添加 MCP 集成** 或使用 `clawhub-admin managed-mcp` 在 OpenClaw 发布者下发布远程 MCP 集成。 UI和CLI使用相同的授权发布操作。管理员还必须具有 OpenClaw 组织的发布访问权限。

每个包都包含一个远程连接配置、一个简短的 README、其图标和许可证声明。 OpenClaw 发布包装器；指定公司运营关联服务。这些包不包含提供程序实现或本地命令。

## <a id="publish-and-update"></a> 发布更新

提供稳定的集成 ID、版本、公司、当前类别、简要说明、公共 HTTPS 端点、传输、身份验证设置和 PNG 图标。仅当条款允许时才使用公司提供的艺术品。记录其归属、权利或许可标签、官方来源 URL 以及许可或品牌条款 URL。该包装器已获得 MIT- 许可；公司图标保留其单独的权利。原始 MIT 图标仍然受支持。

```sh
clawhub-admin managed-mcp publish definition.json --dry-run
clawhub-admin managed-mcp publish definition.json
clawhub-admin managed-mcp get linear > linear.json
# Edit the definition and increment its version, then publish it.
clawhub-admin managed-mcp publish linear.json --icon ./linear-approved.png
clawhub-admin managed-mcp unpublish linear
```

`--dry-run` 仅检查定义字段。图标解码、端点兼容性和安全扫描在发布期间运行。

`--icon` 读取单个定义的本地 PNG（最多 512KB）。 JSON 必须包含图标的权限元数据；当该选项提供时，`pngBase64` 可以被省略。如果没有`--icon`，则将PNG字节放入`icon.pngBase64`中。例如：

```json
{
  "license": "Provider brand terms",
  "attribution": "Company logo belongs to its respective owner.",
  "sourceUrl": "https://company.example/brand/icon.png",
  "licenseUrl": "https://company.example/brand/terms"
}
```

这是`icon`字段，不是完整的定义。将每个示例值替换为所审核资产的实际来源和术语。非-MIT图标需要两个 URL。源 URL 是出处元数据，而不是实时图像链接：出版物存储上传的内容PNG在版本化捆绑包中，及其条款`NOTICE`。来源也不URL权利标签也不能证明许可；运营商必须在发布之前验证提供商的条款。

要编辑已发布的集成，请使用 `get` 检索其最新提交的定义，更新字段并递增 `version`（例如，`1.0.0` 到 `1.0.1`）。通过相同的 `publish` 命令提交。管理员 HTTP API 使用具有完整更新定义的 `GET /api/v1/packages/-/managed-mcp/<id>` 和 `POST /api/v1/packages/-/managed-mcp`。更改后的图标无法替换现有版本的字节。新版本在发布之前通过了端点验证和正常的安全门；以前的版本保持不变。

`publish` 接受一个定义或最多 200 个定义的数组。批次通过相同的发布路径提交每个条目。出现错误时停止，更正输入，然后重试；正常的不可变版本规则适用。公司集成列表是 CLI 的操作输入，在应用程序源代码树外部进行维护，并在部署发布代码后导入。

将 `oauth` 与可选的空格分隔范围结合使用，将 `api-key` 与标题和环境占位符结合使用，例如 `Bearer ${SERVICE_TOKEN}` 或 `none`。切勿将凭据放入定义、端点、图标或设置文本中。保留服务提供的端点路径、查询限制和 HTTP/SSE 传输。

发布检查公共端点，对于 OAuth，还检查发现元数据广告授权、令牌和动态注册端点。此观察结果并不能证明客户注册、帐户资格、成功同意或实时经过身份验证的工具调用。

正常的包验证和安全门适用，包括 OpenClaw 发布者。待发布的版本不可安装。扫描已发布的文件和配置；它不认证远程提供商或其未来的工具。

## <a id="install-and-connect"></a> 安装并连接

OpenClaw 使用者必须包含 [ 远程 MCP 加载程序修复 ](https://github.com/openclaw/openclaw/pull/162376)。在包含该修复的版本可用之前，请使用包含该修复的经过验证的版本；启用远程 MCP 插件后，较老的消费者可能无法启动代理会话。

一旦可用，用户可以通过正常的 OpenClaw 插件流程安装该软件包，启用它，并在需要时连接他们的帐户。 API-key 集成需要支持其环境占位符的使用者中的指定凭据。帐户级测试与包验证是分开的。

OpenClaw 的 Control UI 在其详细信息页面上列出了该插件的 MCP 服务器。按照包的设置说明连接服务。

编辑图标或连接会创建一个新的不可变版本。安装的副本保留其现有文件和设置，直到用户通过 OpenClaw 的正常更新流程更新插件。发布不会远程强制在网关上重新安装。取消发布会通过正常的包策略停止新的可用性；它不会卸载现有副本。
