---
summary: "选择 OpenAI 模型参考，包括 GPT-6.1 Sol、GPT-6 Astra、Sol、Luna 和 GPT-5.6 层"
read_when:
  - "您正在选择要运行的 OpenAI 模型参考"
  - "您想要选择 GPT-6.1 Sol、GPT-6 Sol 或 Luna"
  - "您需要 Astra 异步工具、中途转向或缓存推理更改"
  - "您的帐户未公开 GPT-5.6 层"
title: "OpenAI模型"
sidebarTitle: "模型"
---

## <a id="quick-choice"></a> 快速选择

| 目标                                              | 用途                                                                | 笔记                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ChatGPT/Codex 订阅，原生 Codex 运行时  | `openai/gpt-6-astra`                                               | 全新订阅设置；使用 Codex 身份验证登录。                  |
| 坐席轮次直接 API-key 计费            | `openai/gpt-6-astra` 加上订购的 API-key 身份验证配置文件          | 全新的 API-key 设置使用 Astra。                                     |
| GPT-6.1溶胶                                       | `openai/gpt-6.1-sol`                                               | 明确选择；推理不能被禁用。                    |
| GPT-6 索尔                                         | `openai/gpt-6-sol`                                                 | 明确选择；身份验证路由之间的帐户访问权限可能有所不同。   |
| 低成本 GPT-6 Luna                             | `openai/gpt-6-luna`                                                | 明确选择；检查帐户目录的可用性。      |
| 选择确切的 GPT-5.6 层级                      | `openai/gpt-5.6-sol`、`-terra` 或 `-luna`                         | 使用 `models list` 检查此账户可用的层级。        |
| 无法访问 GPT-5.6 的账户                    | `openai/gpt-5.5`                                                   | 明确的恢复选项；OpenClaw 不会静默降级。     |
| 直接API-key计费，显式OpenClaw运行时 | `openai/gpt-5.6` 加 provider/model `agentRuntime.id: "openclaw"` | 选择正常的 `openai` API-key 配置文件。                           |
| 最新 ChatGPT 即时模型别名                | `openai/chat-latest`                                               | 仅直接 API-key；移动别名，而不是稳定的默认值。          |
| 图像生成或编辑                       | `openai/gpt-image-2`                                               | 支持使用 `OPENAI_API_KEY` 或 Codex OAuth。                         |
| 透明背景图像                     | `openai/gpt-image-1.5`                                             | 将 `outputFormat` 设置为 `png` 或 `webp`，并将 `background=transparent`。 |

Codex 运行时上的隔离和实用完成使用与模型选择器相同的帐户路由。您的 ChatGPT 帐户列出的模型不需要 OpenAI API 密钥来完成这些操作。显式身份验证配置文件或实用程序模型覆盖仍然控制请求； OpenClaw 不会用其他帐户替换它。

### <a id="retired-subscription-model-references"></a> 退役订阅模型参考

GPT-5.4 和 GPT-5.4 Mini 已从 ChatGPT-account Codex 路线中退役。运行 `openclaw doctor --fix` 以将持久订阅引用替换为其记录的后继引用：分别为 `openai/gpt-5.6-terra` 和 `openai/gpt-5.6-luna`。这包括默认值、每个代理模型选择、自动化覆盖以及所选路由已知的解锁会话覆盖。平台API-key路由不受影响。当继任者不在代理的模型政策范围内时，或者当清除替代将保留相同的已退役模型和帐户时，Doctor 会保留固定的替代。 Doctor 还保留原始参考信息，并在其宣布的继任者退休或在所选帐户路线上明确不受支持时发出警告；未知的可用性和临时冷却时间不会阻止迁移。它报告所需的模型或策略更改，以及未解决或冲突的帐户路由。查看修复输出，重新启动网关，并重新启用在重复失败后禁用的任何自动化。

## <a id="models-your-api-key-lists"></a> 对您的 API 密钥列表进行建模

使用 OpenAI API 密钥，`openclaw models list --provider openai` 会显示您帐户的 `/v1/models` 列表中在响应 API 上运行的每个聊天模型，包括比您的 OpenClaw 版本更新的模型。没有目录行的模型使用保守的默认值：文本输入、128k 上下文窗口和未知成本。嵌入、图像、视频、音频、实时、语音、转录、审核和遗留完成模型保持隐藏，超过 OpenAI 关闭日期的模型也是如此。搜索模型保持隐藏状态，因为它们仅在聊天完成时运行；实时、网络、实验和 alpha ID 会保持隐藏，因为 Responses 会拒绝它们。 GPT-3.5、GPT-4（包括 GPT-4o 和 GPT-4.1）、o1、o3 和 o4 模型在列表中保持隐藏，因为它们在默认 Codex 运行时上失败。您仍然可以通过参考来选择一个，例如 `agents.defaults.model.primary` 或会话模型；将 `agents.defaults.models["openai/<model>"].agentRuntime.id` 设置为 `"openclaw"` 以使其运行。 o1、o3-mini、GPT-3.5、GPT-4、GPT-4 Turbo 和 GPT-4.1 nano 也拒绝 OpenAI 的托管 Web 搜索，该搜索运行时默认添加：将 `tools.web.search.provider` 设置为托管提供程序，例如 `brave`，或`tools.web.search.enabled: false`，在使用它们之前（请参阅 [Native OpenAI 网络搜索](/tools/web#native-openai-web-search)）。

## <a id="daybreak-blue-and-red"></a> 破晓蓝红

为 Daybreak 配置的账户可以选择具有 OpenAI API-key 配置文件的 `openai/gpt-daybreak-blue-latest` 或 `openai/gpt-daybreak-red-latest`。这两个别名都使用响应 API 并在 OpenClaw 运行时公开 `low`、`medium`、`high`、`xhigh` 和 `max`。 `/think ultra`仍然是单独的编排模式；它使用最高支持的本机工作，而不是将 `ultra` 发送到 API。

在OpenClaw运行时，Daybreak Blue支持标准和快速处理；黎明红使用标准。这两个别名均不支持超快。 Control UI 禁用不可用的速度选择，并且请求应用相同的限制：保存的超快首选项在蓝色上使用快速，在红色上使用标准。显式低级 `serviceTier` / `service_tier` 覆盖仍由操作员控制，并可能被 API 拒绝。

随着访问程序的发展，Daybreak 别名可以解析为不同的快照。 OpenClaw 保留请求的别名，而不是用快照替换它。蓝色保持推理能力；红色还支持`/think off`。显式配置的工作能力仍然具有权威性，包括更窄的列表或空列表。 Alias 成本估算未知，这并不是说 Daybreak 请求是免费的；检查已解决的模型和当前的 OpenAI 定价。成功的帐户发现仍然具有权威性，并且此支持不会授予 Daybreak 访问权限。本机 Codex 继续使用其帐户目录和本机工作量控制。

请参阅 [Daybreak 指南](https://developers.openai.com/api/docs/guides/daybreak) 以及 [Blue](https://developers.openai.com/api/docs/models/gpt-daybreak-blue-latest) 和 [Red](https://developers.openai.com/api/docs/models/gpt-daybreak-red-latest) 模型参考。

## <a id="gpt-6-astra"></a> GPT-6 阿斯特拉

选择具有 OpenAI API-key 配置文件的 `openai/gpt-6-astra` 或有权访问 Astra 的 ChatGPT/Codex 订阅。访问正在推出；成功的帐户目录仍然具有权威性，因此添加模型支持不会向尚未收到模型支持的帐户授予访问权限。如果 ChatGPT/Codex 目录发现不可用，脱机后备列表将忽略 Astra，直到帐户发现成功。

```bash
openclaw models set openai/gpt-6-astra
```

Astra 使用响应 API 进行代理工具调用。它支持文本和图像输入、1,050,000 个令牌上下文窗口以及多达 128,000 个输出令牌。 OpenClaw 默认保留其普通 272,000 代币主动输入预算。支持的推理工作有 `low`、`medium`、`high`、`xhigh` 和 `max`。当帐户支持该工作时，OpenClaw 在 OpenClaw 和 Codex 运行时上将 Astra 默认为 `medium`。 OpenAI 提供程序拥有此默认值，因此模型选择、Control UI 和 Codex 转弯请求共享它。显式代理、模型、全局和会话思维设置仍然优先；切换模型不会清除现有的 `high` 覆盖。使用 `/think default` 清除会话覆盖。现有的 `minimal` 设置映射到 `low`。阿斯特拉无法禁用推理； `off` 从不发送不受支持的 `none` 工作。不发送温度和 `top_p`。这些默认值也适用于配置的 Astra 模型条目，无需明确的推理或温度兼容性元数据。 Azure 响应部署继续使用其配置的功能。

`/think ultra` 也可用于 OpenClaw 和 Codex 运行时。 Ultra 支持主动的子代理编排；这不是原始响应 API 的成果。 OpenClaw 使用 `max`，而原生 Codex 选择 Astra 的模型定义工作 （`xhigh`）。

每百万代币的标准定价为 10 美元输入、1 美元缓存读取、$12.50 缓存写入和 50 美元输出。超过 272K 输入令牌的请求具有更高的速率。请参阅 [Astra 模型参考 ](https://developers.openai.com/api/docs/models/gpt-6-astra) 和 [ 迁移指南 ](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra)。

### <a id="async-tools%2C-steering%2C-and-reasoning-changes"></a><a id="async-tools-steering-and-reasoning-changes"></a> Async 工具、转向和推理更改

使用 OpenAI 平台 API-key 配置文件和内置 OpenClaw 运行时来实现这些 Astra 功能。它们需要官方 `https://api.openai.com/v1` 响应端点。配置现有模型设置：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-6-astra": {
          agentRuntime: { id: "openclaw" },
          params: {
            transport: "auto",
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

- **Async函数调用：** Astra可以在OpenClaw运行直接函数工具时继续推理。 OpenClaw 在主动响应完成后，在下一个模型请求中发送完成的结果。这适用于直接工具；代码模式工具保留其现有的执行流程。 `sessions_yield` 保持同步：这就是模型等待的方式，因此响应会在那里暂停，下一个请求会传递较早的异步结果。
- **中转转向：** [转向消息](/concepts/queue#queue-modes)可以在Astra推理时使用活动会话的缓存WebSocket到达Astra。使用`auto`或`websocket-cached`； SSE 在下一个可用运行时边界保持普通排队转向。每个实时批次拥有一个响应；稍后的消息可以引导其后继者。重写活动请求前缀的上下文或有效负载挂钩保持普通的排队传递。
- **在不重建缓存前缀的情况下推理更改：** 在下一个用户轮到之前更改 [ 思考级别 ](/tools/thinking)，例如使用 `/think high`。 OpenClaw 保留原始请求级别的工作，并将 `configuration_update` 放置在新的转弯处。此优化适用于 SSE 或缓存的 WebSockets 上的匹配会话历史记录，包括同一会话中的并发 SSE 请求。自动转向延续保留其继承的设置。如果转向等待工具结果或批准，则显式继续使用当前请求设置，包括输出限制和推理设置，而不重复接受的转向。早期的 `configuration_update` 物品保留其效果；更改的请求级别工作不会取代这些控制。当接受的转向等待工具结果或批准并且其历史记录包含工作量控制时，请在切换之前使用兼容的 Astra 模型和模式完成该输入。

该示例禁用自动服务器压缩，因为 OpenAI 无法将其与配置更新结合起来。缓存保留工作更改还排除自动截断、专业模式和 API 多代理模式。最初的努力和承认的控制在传输到期后仍然有效，并且网关在保存的提供者重放元数据中重新启动。匹配历史记录会重播相同的前缀，而不会延长套接字或提供程序缓存的生命周期。重写或压缩历史记录、不兼容的设置或更改的模型、路由、会话或身份验证配置文件会使用所选工作启动新请求。没有此元数据的较旧成绩单也会在传输到期后重新开始。

本机 [Codexharness](/plugins/codex-harness) 拥有自己的响应循环；这些内置运行时功能并不意味着本机 Codex 支持。

## <a id="gpt-6.1-sol"></a><a id="gpt-6-1-sol"></a> GPT-6.1溶胶

选择带有 OpenAI API-key 配置文件的 `openai/gpt-6.1-sol` 或公开它的 ChatGPT/Codex 订阅：

```bash
openclaw models set openai/gpt-6.1-sol
```

它使用响应 API 进行工具调用，接受文本和图像，并支持 1,050,000 个令牌上下文窗口，最多可输出 128,000 个令牌。默认情况下，直接 OpenAI API-key 流量保持其 272,000 个令牌的活动输入预算。 OpenClaw 工具默认为具有 ChatGPT/Codex 订阅身份验证的 500,000 个代币活动窗口；本机 Codex 拥有其上下文窗口和压缩。显式上下文预算、其他模型和 Astra 设置默认值均保持不变。成功的帐户目录仍然具有权威性，包括较小的帐户特定窗口；订阅离线提示并不意味着访问。

推理默认为 `medium`，并支持 `low`、`medium`、`high`、`xhigh` 和 `max`。与 GPT-6 Sol 不同，GPT-6.1 Sol 无法禁用推理：`off` 不发送 `none`，`minimal` 映射到 `low`。 OpenClaw通过其现有的编排模式提供`/think ultra`；本机 Codex 使用该帐户的广告成果。

每百万代币的标准 API 价格为 2 美元输入、$0.10 缓存读取、$2.50 缓存写入和 10 美元输出。超过 272K 输入令牌，输入和缓存速率加倍，输出成本 1.5 乘以完整请求的标准速率。请参阅 [GPT-6.1 Sol 模型参考](https://developers.openai.com/api/docs/models/gpt-6.1-sol)，了解当前功能、定价和区域可用性。

## <a id="gpt-6-sol-and-luna"></a> GPT-6 索尔和露娜

选择带有 OpenAI API-key 配置文件的 `openai/gpt-6-sol` 或 `openai/gpt-6-luna` 或公开模型的 ChatGPT/Codex 订阅。检查所选帐户的目录，然后选择模型：

```bash
openclaw models list --provider openai
openclaw models set openai/gpt-6-sol
```

使用 `openclaw models set openai/gpt-6-luna` 选择 Luna。 API 组织和 Codex 工作区访问权限可能不同。一个成功的账户目录具有权威性； OpenClaw 不会添加订阅访问权限或默默地替换其他模型。当订阅发现不可用时，离线后备列表将忽略这两种模型。现有模型选择保持不变，新的 OpenAI 设置继续使用 Astra。

两种模型都使用响应 API 进行代理工具调用，并支持文本和图像输入、1,050,000 个令牌上下文窗口以及最多 128,000 个输出令牌。 OpenClaw 默认为 272,000 代币的有效输入预算。本机 Codex 遵循所选帐户的公布的上下文限制。

API 推理工作为 `none`、`low`、`medium`、`high`、`xhigh` 和 `max`。 OpenClaw 在可用时默认为 `medium`；现有的显性思维设置仍然优先。 `/think off` 选择 `none`，并且 `/think default` 清除会话覆盖。本机 Codex 使用所选帐户报告的工作量级别。 OpenClaw的`/think ultra`模式使用`max`；本机 Codex 仅在帐户宣传时才提供 Ultra。

每百万代币的标准 API 定价：

| 模型      | 输入 | 缓存读取 | 缓存写入 | 输出 |
| ---------- | ----- | ----------- | ------------ | ------ |
| GPT-6 索尔  | $2    | $0.20       | $2.50        | $10    |
| GPT-6 露娜 | $0.10 | $0.01       | $0.125       | $0.50  |

有关当前功能和定价，请参阅 [GPT-6 Sol 模型参考](https://developers.openai.com/api/docs/models/gpt-6-sol) 和 [GPT-6 Luna 模型参考](https://developers.openai.com/api/docs/models/gpt-6-luna)。

## <a id="gpt-5.6-limited-preview"></a><a id="gpt-5-6-limited-preview"></a> GPT-5.6 有限预览

OpenClaw 识别精确的 `openai/gpt-5.6-sol`、 `openai/gpt-5.6-terra` 和 `openai/gpt-5.6-luna` 模型 id。这三者在当前目录中都提供 `xhigh` 和 `max` 推理。OpenAI 将 Sol 描述为旗舰层级，Terra 描述为均衡层级，Luna 描述为快速、 更低成本的层级。请参阅 [GPT-5.6 发布公告](https://openai.com/index/previewing-gpt-5-6-sol/) 和[访问指南](https://help.openai.com/en/articles/20001325-a-preview-of-gpt-5-6-sol-terra-and-luna)。

OpenAI 的 [GPT-5.6 Sol 模型页面](https://developers.openai.com/api/docs/models/gpt-5.6-sol) 将裸 `openai/gpt-5.6` id 记录为 Sol 支持的别名。新的 API-key 和 ChatGPT/Codex OAuth 设置使用 `openai/gpt-6-astra`。现有的 GPT-5.6 选择保留其完整的 Sol 身份。运行 `openclaw doctor --fix` 将持久的裸 OpenAI 引用重写为该完整身份。本机 Codex 目录可以根据工作空间访问显示准确的 Sol、Terra 和 Luna id。检查当前帐户：

```bash
openclaw models list --provider openai
```

API 组织和 Codex 工作区访问权限可能不同。如果 GPT-5.6 不可用，请显式选择 GPT-5.5：

```bash
openclaw models set openai/gpt-5.5
```

OpenClaw 会显示上游访问错误，并且不会默默地用 GPT-5.5. 替换 GPT-5.6 选择

<Note>
当运行时策略未设置或 `auto` 时，符合条件的确切官方 HTTPS 路由可以选择捆绑的 Codex 应用程序服务器插件；创作的完成路由、自定义端点和请求传输覆盖保留在 OpenClaw 上。明文官方 HTTP 端点被拒绝。显式 provider/model 运行时配置仍然具有权威性。运行 `openclaw doctor --fix` 来修复陈旧的 Codex 模型引用、`codex-cli/*` 引用或未通过显式运行时配置设置的旧运行时会话引脚。
</Note>
