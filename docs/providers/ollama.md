---
summary: "使用 Ollama 运行 OpenClaw（云和本地模型）"
read_when:
  - "您想要通过 Ollama 使用云或本地模型运行 OpenClaw"
  - "您需要 Ollama 设置和配置指南"
  - "您需要 Ollama 视觉模型来理解图像"
title: "Ollama"
---

OpenClaw与Ollama是本地人API （`/api/chat`），而不是OpenAI-兼容的`/v1`端点。支持三种设置：

| 设置         | 使用内容                                                                     |
| ------------- | -------------------------------------------------------------------------------- |
| 云端 + 本地 | 可访问的 Ollama 主机，提供本地模型以及（如果已登录）`:cloud` 模型 |
| 仅本地    | 可访问的 Ollama 主机，仅本地模型                                       |
| Ollama Cloud  | `https://ollama.com` 直接通过`ollama-cloud`提供者，无守护进程     |

仅托管访问是其自己的 **Ollama Cloud** 设置选择；参见 [Ollama Cloud](/providers/ollama-cloud)。其 `ollama-cloud/<model>` 参考将云路由与本地 `ollama` 提供商分开。

<Warning>
请勿使用 `/v1` OpenAI- 兼容 URL （`http://host:11434/v1`）。它破坏了工具调用，并且模型可以以纯文本形式发出原始工具调用 JSON。使用本机 URL：`baseUrl: "http://host:11434"`（无 `/v1`）。
</Warning>

当前配置密钥是 `baseUrl`。 `baseURL` 也可以用于 OpenAI-SDK- 样式示例，但新配置应使用 `baseUrl`。

此页是一个索引。 Ollama 共九页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                  | 读它的时候                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Ollama 设置](/providers/ollama/setup)                               | 您正在连接一个帐户：每个主机类型的身份验证规则、加入和手动设置以及混合云加本地流程。 |
| [Ollama模型发现](/providers/ollama/model-discovery)           | 您想知道如何找到模型：隐式发现表、功能检测和冒烟测试检查。           |
| [Ollama节点本地推理](/providers/ollama/node-local-inference) | 您正在配对节点上运行模型：设置步骤、模型过滤和直接验证命令。                    |
| [Ollama视觉及图像描述](/providers/ollama/vision)       | 您正在通过本地或托管的 Ollama 视觉模型描述或理解图像。                                   |
| [Ollama配置](/providers/ollama/configuration)               | 您正在编写提供程序条目：隐式发现、显式模型列表或自定义基础 URL。                       |
| [Ollama 配置食谱](/providers/ollama/recipes)                    | 您想要复制一个工作配置：每个场景的配方、模型选择和快速验证。                           |
| [Ollama Web Search](/providers/ollama/web-search)                     | 您正在使用 Ollama 作为 `web_search` 提供程序：主机、身份验证和要求规则。                                       |
| [Ollama高级配置](/providers/ollama/advanced)           | 您正在调整行为：上下文窗口、思维控制、推理、成本、嵌入和流。                    |
| [Ollama 故障排除](/providers/ollama/troubleshooting)           | 有些东西坏了：检测、连接、工具 JSON、乱码输出、超时和 WSL2 崩溃循环。                      |

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本发布的每个锚点仍然在此处解析，因此现有链接（例如 `/providers/ollama#node-local-inference`）仍然有效。每个条目都指向现在保存内容的页面。

**[Ollama setup](/providers/ollama/setup)**

- <a id="auth-rules" />[授权规则](/providers/ollama/setup#auth-rules)
- <a id="getting-started" />[入门](/providers/ollama/setup#getting-started)
- <a id="cloud-models-through-a-local-host" />[通过本地主机的云模型](/providers/ollama/setup#cloud-models-through-a-local-host)
- <a id="local-and-lan-hosts" />[本地和LAN主机](/providers/ollama/setup#local-and-lan-hosts)
- <a id="remote-and-ollama-cloud-hosts" />[远程和Ollama Cloud主机](/providers/ollama/setup#remote-and-ollama-cloud-hosts)
- <a id="custom-provider-ids" />[自定义提供商 ID](/providers/ollama/setup#custom-provider-ids)
- <a id="auth-profiles" />[授权配置文件](/providers/ollama/setup#auth-profiles)
- <a id="memory-embedding-scope" />[内存嵌入范围](/providers/ollama/setup#memory-embedding-scope)
- <a id="onboarding-recommended" />[入门引导（推荐）](/providers/ollama/setup#onboarding-recommended)
- <a id="run-onboarding" />[运行入门](/providers/ollama/setup#run-onboarding)
- <a id="select-a-model" />[选择模型](/providers/ollama/setup#select-a-model)
- <a id="verify" />[验证](/providers/ollama/setup#verify)
- <a id="manual-setup" />[手动设置](/providers/ollama/setup#manual-setup)
- <a id="install-and-start-ollama" />[安装并启动Ollama](/providers/ollama/setup#install-and-start-ollama)
- <a id="set-a-credential" />[设置凭证](/providers/ollama/setup#set-a-credential)
- <a id="select-the-model" />[选择模型](/providers/ollama/setup#select-the-model)

**[Ollama模型发现](/providers/ollama/model-discovery)**

- <a id="model-discovery-(implicit-provider)" /><a id="model-discovery-implicit-provider" />[模型发现（隐式提供程序）](/providers/ollama/model-discovery#model-discovery-implicit-provider)
- <a id="smoke-tests" />[烟雾测试](/providers/ollama/model-discovery#smoke-tests)

**[Ollama节点本地推理](/providers/ollama/node-local-inference)**

- <a id="node-local-inference" />[节点本地推理](/providers/ollama/node-local-inference#node-local-inference)
- <a id="start-ollama-on-the-node" />[在节点上启动Ollama](/providers/ollama/node-local-inference#start-ollama-on-the-node)
- <a id="connect-the-node-host" />[连接节点主机](/providers/ollama/node-local-inference#connect-the-node-host)
- <a id="use-it-from-an-agent" />[代理使用](/providers/ollama/node-local-inference#use-it-from-an-agent)

**[Ollama视觉和图像描述](/providers/ollama/vision)**

- <a id="vision-and-image-description" />[视觉及图像描述](/providers/ollama/vision#vision-and-image-description)

**[Ollama配置](/providers/ollama/configuration)**

- <a id="configuration" />[配置](/providers/ollama/configuration#configuration)
- <a id="basic-implicit-discovery" />[基本（隐式发现）](/providers/ollama/configuration#basic-implicit-discovery)
- <a id="explicit-manual-models" />[显式（手动模型）](/providers/ollama/configuration#explicit-manual-models)
- <a id="custom-base-url" />[定制底座 URL](/providers/ollama/configuration#custom-base-url)

**[Ollama 配置食谱](/providers/ollama/recipes)**

- <a id="common-recipes" />[常用食谱](/providers/ollama/recipes#common-recipes)
- <a id="model-selection" />[模型选择](/providers/ollama/recipes#model-selection)
- <a id="quick-verification" />[快速验证](/providers/ollama/recipes#quick-verification)
- <a id="local-model-with-auto-discovery" />[自动发现本地模型](/providers/ollama/recipes#local-model-with-auto-discovery)
- <a id="lan-ollama-host-with-manual-models" />[LAN Ollama 主机配手动模型](/providers/ollama/recipes#lan-ollama-host-with-manual-models)
- <a id="ollama-cloud-only" />[仅限Ollama Cloud](/providers/ollama/recipes#ollama-cloud-only)
- <a id="cloud-plus-local-through-a-signed-in-daemon" />[云加本地通过登录守护程序](/providers/ollama/recipes#cloud-plus-local-through-a-signed-in-daemon)
- <a id="multiple-ollama-hosts" />[多个 Ollama 主机](/providers/ollama/recipes#multiple-ollama-hosts)
- <a id="small-local-model-profile" />[小局部模型轮廓](/providers/ollama/recipes#small-local-model-profile)

**[Ollama Web Search](/providers/ollama/web-search)**

- <a id="ollama-web-search" />[Ollama Web Search](/providers/ollama/web-search#ollama-web-search)

**[Ollama高级配置](/providers/ollama/advanced)**

- <a id="advanced-configuration" />[高级配置](/providers/ollama/advanced#advanced-configuration)
- <a id="legacy-openai-compatible-mode" />[旧版OpenAI-兼容模式](/providers/ollama/advanced#legacy-openai-compatible-mode)
- <a id="context-windows" />[上下文窗口](/providers/ollama/advanced#context-windows)
- <a id="thinking-control" />[思维控制](/providers/ollama/advanced#thinking-control)
- <a id="reasoning-models" />[推理模型](/providers/ollama/advanced#reasoning-models)
- <a id="model-costs" />[模型费用](/providers/ollama/advanced#model-costs)
- <a id="memory-embeddings" />[内存嵌入](/providers/ollama/advanced#memory-embeddings)
- <a id="streaming-configuration" />[流媒体配置](/providers/ollama/advanced#streaming-configuration)

**[Ollama 故障排除](/providers/ollama/troubleshooting)**

- <a id="troubleshooting" />[故障排除](/providers/ollama/troubleshooting#troubleshooting)
- <a id="wsl2-crash-loop-repeated-reboots" />[WSL2 崩溃循环（反复重新启动）](/providers/ollama/troubleshooting#wsl2-crash-loop-repeated-reboots)
- <a id="ollama-not-detected" />[Ollama 未检测到](/providers/ollama/troubleshooting#ollama-not-detected)
- <a id="no-models-available" />[无可用模型](/providers/ollama/troubleshooting#no-models-available)
- <a id="connection-refused" />[连接被拒绝](/providers/ollama/troubleshooting#connection-refused)
- <a id="remote-host-works-with-curl-but-not-openclaw" />[远程主机适用于curl，但不适用于OpenClaw](/providers/ollama/troubleshooting#remote-host-works-with-curl-but-not-openclaw)
- <a id="model-outputs-tool-json-as-text" />[模型将工具JSON输出为文本](/providers/ollama/troubleshooting#model-outputs-tool-json-as-text)
- <a id="kimi-or-glm-returns-garbled-symbols" />[Kimi 或 GLM 返回乱码](/providers/ollama/troubleshooting#kimi-or-glm-returns-garbled-symbols)
- <a id="cold-local-model-times-out" />[冷本地模型超时](/providers/ollama/troubleshooting#cold-local-model-times-out)
- <a id="large-context-model-is-too-slow-or-runs-out-of-memory" />[大上下文模型太慢或内存不足](/providers/ollama/troubleshooting#large-context-model-is-too-slow-or-runs-out-of-memory)

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Ollama Cloud" href="/providers/ollama-cloud" icon="cloud">
    仅云端设置，使用专用的 `ollama-cloud` 提供方。
  </Card>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="选型" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama 网页搜索" href="/tools/ollama-search" icon="magnifying-glass">
    Ollama- 支持的网络搜索的完整设置和行为详细信息。
  </Card>
  <Card title="LM Studio" href="/providers/lmstudio" icon="desktop">
    GGUF 或 MLX 模型的另一个本地运行器，作为 GUI 应用程序或无头服务器。
  </Card>
  <Card title="内存 LanceDB" href="/plugins/memory-lancedb" icon="database">
    LanceDB 中的长期存储器，具有本地 Ollama- 兼容嵌入。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
