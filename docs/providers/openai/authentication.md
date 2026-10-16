---
summary: "选择 Codex 登录、使用 ChatGPT（测试版）登录或 API 密钥来获取您所需的 OpenAI 功能"
read_when:
  - "您正在选择 Codex 登录、API 密钥和使用 ChatGPT 登录（测试版）"
  - "您想要将 OpenAI-hosted 插件与 OpenClaw 一起使用"
  - "您正在为代理或个人连接 OpenAI 帐户"
title: "OpenAI认证"
sidebarTitle: "认证"
---

根据您需要的访问权限选择 OpenAI 身份验证方法：

- **Codex 登录：** 对于 Codex 模型，请使用您的 ChatGPT 帐户。选择本地浏览器 OAuth 或远程计算机上的设备代码。 OpenAI-hosted 插件需要连接器范围的授权。
- **使用 ChatGPT（测试版）** （SIWC） 登录：授权 OpenClaw 作为应用程序，将您的 Codex 津贴用于符合条件的响应 API 呼叫。检查 ChatGPT 中的共享配额使用情况。 OpenAI-hosted 插件尚不受支持。
- **API 密钥：** 使用 OpenAI 平台模型以及您的项目权限和 API 计费。

## <a id="compare-capabilities"></a> 比较功能

|                                                        | 使用 ChatGPT 登录（测试版）                               | Codex 登录（浏览器 OAuth 或设备代码）                  | OpenAI 平台 API 密钥                                    |
| ------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| 身份                                               | 您的 ChatGPT 帐户和工作区授权 OpenClaw   | 使用 Codex 产品的 ChatGPT 帐户和工作区  | API 密钥的平台项目和权限             |
| 凭证刷新                                     | OpenClaw 刷新了此应用程序的 SIWC 配置文件          | OpenClaw 刷新其 Codex OAuth 简介                  | 无OAuth刷新；与其所有者一起轮换密钥            |
| 模型访问                                           | 授予令牌共享时的合格响应模型   | 您的 Codex 帐户可用的模型                      | 您的平台项目允许的模型                 |
| 使用津贴                                        | 您的 Codex 津贴                                      | 您的 Codex 津贴                                        | 平台API计费                                       |
| 使用限制                                           | OpenClaw 中没有每个应用程序设置； ChatGPT 控件可能有所不同 | —                                                           | —                                                          |
| OpenAI- 通过 Codex 托管插件和连接的应用程序 | 尚不支持                                         | 需要 OpenClaw 登录之外的连接器范围授权    | API-key认证不提供                     |
| OpenClaw 工具和本地配置的插件          | 支持                                                 | 支持                                                   | 支持                                                  |
| 网页搜索                                             | 模型和账户允许的情况下支持             | 在启用的情况下受支持                                     | 在启用的情况下受支持                                    |
| 图像和文件输入                                  | 依赖于模型；不授予文件 API 访问权限          | 依赖于模型                                             | Model/project-dependent                                    |
| OpenClaw `image_generate`                              | 此凭证不支持                          | 需要 OpenClaw Codex OAuth 个人资料和帐户访问权限 | 图片 API，受项目访问限制                      |
| 音频转录                                    | 此凭证不支持                          | 订阅转录路径，取决于帐户访问权限 | 音频 API，受项目访问限制                       |
| 实时语音                                         | 此凭证不支持                          | 选定的浏览器和 GPT-Live 中继路由                  | 支持的路线，取决于项目访问权限                |
| 记忆嵌入                                      | 需要单独的兼容凭证                 | 当帐户授予嵌入访问权限时支持          | 支持API，受项目访问限制                   |
| 文本转语音                                         | 需要单独的兼容凭证                 | 需要单独的兼容凭证                   | 支持API，受项目访问限制                   |
| 监控和分析                               | 共享ChatGPT使用页面；没有每个应用程序 OpenClaw 指标    | Codex 使用情况和配额报告                             | 平台项目使用及计费                         |
| 权限控制                                     | 应用程序特定的 OAuth 拨款和工作区政策            | Codex 产品权限和工作区策略              | API-密钥和项目权限                            |
| 默认模型端点                                 | `https://api.openai.com/v1/responses`                     | `https://chatgpt.com/backend-api/codex/responses`           | `https://api.openai.com/v1/responses` 用于响应模型 |

上面的凭据刷新是指 OpenClaw- 存储的配置文件。 Codex 拥有单独的本机用户主目录登录及其刷新。

OpenClaw 在过期后五分钟内刷新使用的 SIWC 凭证。对于 JWT 访问令牌，它在 `exp` 声明时限制存储的到期时间，因此延迟响应不会延长其生命周期。如果 OpenClaw 运行时轮流接收到 `token_expired`，它会刷新选定的 SIWC 配置文件，并在使用正常回退之前重试同一模型一次。刷新失败或未经授权的重试会保留现有的回退行为。

OpenClaw 不会设置每个应用程序 SIWC 限制或显示每个应用程序的使用情况。如果 ChatGPT 为您的帐户提供特定于应用程序的控件，请在那里管理它们。使用限制行不比较 Codex 登录或 API 密钥的限制设置。

图像和文件输入支持取决于所选模型，并且独立于图像生成和文件 API 权限。实时语音因路线而异；请参阅 [OpenAI 覆盖范围和成本](/providers/openai/coverage-and-cost#openclaw-feature-coverage)。

**选择SIWC进行应用程序特定授权。** 您授权OpenClaw作为自己的应用程序，并同意基本身份和合格模型使用。在 [ChatGPT 设置 → Usage](https://chatgpt.com/settings/usage) 中检查您的共享限额，并在 [ChatGPT 登录连接](https://chatgpt.com/#settings/Security/linked-apps) 中管理连接。 OpenClaw 不显示 SIWC 配额或每个应用程序的使用情况。

**OpenAI- 通过 Codex 托管的插件需要连接器范围的授权。** OpenClaw Codex 登录方法均不授予插件调用：设备代码登录缺少 `api.connectors.invoke`，并且OpenClaw 的浏览器 OAuth 流不请求该范围。对于本机 Codex harness，使用 [native Codex 浏览器登录或导入的凭据 ](/plugins/codex-harness-reference/auth#auth-and-environment-isolation)（其授权包括 `api.connectors.invoke`），然后按照 [native 插件设置 ](/plugins/codex-native-plugins) 进行操作。您可能仍需要连接外部帐户并获取工作区权限。 SIWC 模型访问权限不会授予对这些服务的访问权限。

OpenClaw 工具和本地配置的插件有自己的权限和外部服务凭据。他们可以使用任何这些模型验证方法。例如，OpenClaw 中配置的 Slack 集成与 OpenAI 托管的 Slack 连接应用程序是分开的。原生 Codex 插件还需要 Codex harness及其 [ 插件设置 ](/plugins/codex-native-plugins)；它们不会仅仅因为模型使用 Codex 登录而出现在 OpenClaw 中。

SIWC 模型访问并不能使每个 OpenAI 工具都可用。图像生成、音频转录、语音合成和内存嵌入需要支持这些功能的凭证。您可以保留 SIWC 用于聊天，并为这些工具配置其他帐户或提供商。 OpenClaw `image_generate` 使用 OpenClaw 身份验证配置文件；本机 Codex 用户主目录中的单独 `codex login` 不会向该工具提供该凭据。请参阅 [ 图像生成 ](/providers/openai/image-and-video)。

当 Codex 向帐户提供该功能时，使用合格的 Codex 登录的本机 Codex 也可能返回生成的图像。 OpenClaw 将该图像作为附件提供。该路径与 OpenClaw `image_generate` 分开。

在 [agent bootstrapping](/start/bootstrapping) 期间，OpenClaw 仅当图像生成可用时才生成头像选择。仅连接 SIWC 时，继续显示客服人员的表情符号；无需生成头像即可完成。单独配置的图像提供程序仍然可以生成头像。

### <a id="choose-model-access-and-harness-separately"></a> 单独选择模型接入和harness

**harness** 或 [agent 运行时](/concepts/agent-runtimes) 运行代理循环和工具。登录方法决定了它使用哪个 OpenAI 服务和帐户。

OpenClaw自己的运行时支持所有三种方法。选择Codex登录不需要本机Codexharness；模型调用仍然使用 Codex 服务。如果您选择本机 Codex harness，则支持所有三种方法，但 SIWC 需要托管本地进程。

使用原生Codexharness，SIWC支持自动轮流压实，但手动`/compact`不可用。当线程符合条件时，Codex 登录和 API-key 轮流可以使用本机 `/compact`。 OpenClaw 自己的运行时使用自己的 [compaction](/concepts/compaction) 行为。

有关配置和电流限制，请参阅 [ 运行时选择 ](/providers/openai/runtimes#implicit-agent-runtime) 和 [SIWC 设置 ](/providers/openai/setup#sign-in-with-chatgpt-beta)。

## <a id="shared-agent-credential-or-personal-account%3F"></a><a id="shared-agent-credential-or-personal-account"></a> 共享代理凭证还是个人帐户？

| 你想要…                                                                | 用途                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 配置代理用于对话的凭据                | **设置 → 模型 → 连接提供商** 或 `models auth login`        |
| 将帐户连接到您在网关上的人员并选择它进行聊天 | **设置→个人资料→关联帐户**或`models accounts login` |

这些是模型凭证。用于连接仪表板或 Mac 应用程序的网关访问令牌是单独的。

例如，连接 SIWC 作为个人账户：

```bash
openclaw models accounts login openai --method siwc
```

登录前检查显示的 **Gateway**、**Person** 和 **Scope**。个人连接不会替换代理的共享凭据。它的默认值适用于新的聊天；现有的聊天保留他们的帐户选择。继续聊天的协作者使用该聊天所选择的帐户，并且网关后备规则仍然适用。请参阅 [ 每人模型帐户](/concepts/multi-user#per-person-model-accounts)。

## <a id="set-up-an-agent's-credential"></a><a id="set-up-an-agents-credential"></a> 设置代理凭证

在 **设置 → 模型** 中，选择代理，选择 **连接提供商 → OpenAI**，然后选择登录方法。对于 SIWC，选择 **使用 ChatGPT（测试版）** 登录并在浏览器中批准令牌共享。连接帐户后，选择模型并使用 **Test & use** 验证回复并选择它。

在运行要配置的 OpenClaw 安装的计算机上运行命令：

```bash
# Codex login through a browser
openclaw models auth login --provider openai --method oauth

# Codex login on a remote or headless machine
openclaw models auth login --provider openai --method device-code

# Sign in with ChatGPT (Beta)
openclaw models auth login --provider openai --method siwc

# OpenAI Platform API key
openclaw models auth login --provider openai --method api-key
```

浏览器 OAuth 和设备代码都提供 Codex 模型访问，但它们的授权可能不同。设备代码允许您批准在另一台计算机上的浏览器中登录；它不会创建一种单独的永久凭证。如果没有`--method`，OpenAI登录默认使用Codex浏览器OAuth。

使用 `--agent <agentId>` 来定位已配置的代理，并使用 `--profile-id <profileId>` 来命名保存的凭据。登录会保存代理的凭证并确定其优先级。添加`--set-default`选择提供商推荐模型；否则现有的默认模型将被保留。

对于引导式设置，请使用 `openclaw onboard`。可以提供现有的兼容登录以供重复使用。请参阅 [ 模型设置](/providers/openai/setup) 和 [ 模型 CLI](/cli/models)。

## <a id="check-the-selected-account"></a> 查看所选账户

在对话中，使用 model/account 选择器选择帐户，并使用 `/status` 检查其身份验证和端点。发送消息以验证所选设置是否可以运行模型请求。

对于 SIWC，在登录期间批准令牌共享以启用模型调用。如果仅使用身份权限完成登录，账户可以保存，但无法授权推理。您的帐户和工作区还必须允许 SIWC 和请求的模型访问。
