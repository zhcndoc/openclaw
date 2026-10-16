---
summary: "使用浏览器登录或组织 API 密钥将 OpenClaw 连接到 Radius"
read_when:
  - "您想要在 OpenClaw 中使用 Radius 模型"
  - "您需要 Radius 身份验证或模型发现帮助"
title: "Radius"
---

[Radius](https://radius.earendil.com) 是 Earendil 的 Pi- 兼容客户端的模型网关。 `radius` 插件将 OpenClaw 的代理循环连接到 Radius，包括流式响应、推理、支持模型上的图像以及工具调用。 Radius 拥有上游路由、模型策略、重写和计费。

## <a id="sign-in"></a> 登录

在[Radius网站](https://radius.earendil.com)上创建一个Radius帐户，然后从OpenClaw登录：

```bash
openclaw models auth login --provider radius --method oauth --set-default
```

OpenClaw 显示配对码并打开 Radius 验证页面。输入代码，选择您的组织并授权访问。此设备流程也适用于远程网关：在本地浏览器中打开显示的 URL。 OpenClaw 将 OAuth 凭证存储在其身份验证配置文件中并自动刷新。单独登录Pi不会登录OpenClaw。

您还可以在入门引导期间选择 Radius：

```bash
openclaw onboard --auth-choice radius
```

### <a id="organization-api-key"></a> 组织 API 密钥

从 Radius 中组织的 **API keys** 页面创建 API 密钥，然后使用交互式提示：

```bash
openclaw models auth login --provider radius --method api-key --set-default
```

对于无人值守设置，请通过您的环境或秘密管理器提供 `RADIUS_API_KEY` 并运行：

```bash
openclaw onboard --auth-choice radius-api-key
```

两种身份验证方法都使用所选组织的信用、预算和模型访问权限。过期或撤销的 API 密钥需要更换； OAuth 刷新不会延长 API 密钥的生命周期。

## <a id="choose-a-model"></a> 选择模型

```bash
openclaw models list --provider radius --refresh
openclaw models set radius/balanced
```

OpenClaw 使用您的凭据从 Radius 发现目录。这包括组织模型、推理能力、上下文限制和定价等级。登录时建议使用 `radius/balanced`（如果可用），否则使用组织目录中的第一个模型。使用`models list`所示的模型ID；可用模型和虚拟路线可能会发生变化。

Radius 在 `https://radius.pi.dev/v1` 上使用其本机 Pi 消息协议。该插件会自动选择该传输。请勿将 Radius 配置为 OpenAI- 兼容的 `/chat/completions` 端点。

## <a id="scope-and-troubleshooting"></a> 范围和故障排除

该插件提供模型访问。 Radius 的可选 Pi 扩展包（包括其 `/radius` 命令、Web 搜索、工件和 Google 工作区工具）是单独的集成，不由此插件安装。组织端路由和重写策略仍然适用于模型请求。

如果登录过期，请重新启动并输入新的配对代码。如果模型发现拒绝身份验证，请重新登录或替换组织 API 密钥。如果没有可用模型，请在 Radius 中检查组织的模型访问权限和预算。损坏或截断的响应将被报告为错误，而不是成功的空回复。

请参阅 [Radius 文档](https://radius.earendil.com/docs)、[Radius 模型](https://radius.earendil.com/docs/models) 和[ 模型认证](/concepts/oauth)。
