---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - "您想要将 Cerebras 与 OpenClaw 一起使用"
  - "你需要 Cerebras API 密钥环境变量或 CLI 认证选项"
---

[Cerebras](https://www.cerebras.ai) 在自定义推理硬件上提供高速 OpenAI- 兼容推理。该插件发现本机模型元数据和定价，以及用于离线回退的捆绑目录。

| 属性        | 值                                                     |
| --------------- | --------------------------------------------------------- |
| 提供方 id     | `cerebras`                                                |
| 插件          | 官方外部软件包（`@openclaw/cerebras-provider`） |
| 认证环境变量    | `CEREBRAS_API_KEY`                                        |
| 引导标志 | `--auth-choice cerebras-api-key`                          |
| 直接 CLI 标志 | `--cerebras-api-key <key>`                                |
| API             | OpenAI-兼容（`openai-completions`）                  |
| 基础 URL        | `https://api.cerebras.ai/v1`                              |
| 默认模型   | `cerebras/gpt-oss-120b`                                   |

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/cerebras-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-an-api-key" title="获取 API 密钥">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中创建一个 API 密钥。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step id="verify-models-are-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider cerebras
    ```

    列出已配置的 Cerebras 模型。如果 `CEREBRAS_API_KEY` 未解析，`openclaw models status --json` 会报告 `auth.unusableProfiles` 下缺少的凭证。

  </Step>
</Steps>

## <a id="non-interactive-setup"></a> 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

`--mode` 默认为 `local`，因此这与上面的 **Direct flag** 命令的运行相同。在网关主机上运行它：远程客户端加入 （`--mode remote`） 仅配置本地客户端连接，不会在服务器上设置提供程序凭据。

## <a id="discovery-and-pricing"></a> 发现和定价

当配置了 Cerebras auth 且推理基 URL 为官方 `https://api.cerebras.ai/v1` 时，OpenClaw 读取为 [`GET /public/v1/models`](https://inference-docs.cerebras.ai/api-reference/models/public-models)。此请求仅使用公共标头：推理 API 密钥和发现凭证永远不会发送到元数据端点。自定义基础 URL 会跳过此公共发现，而不是将代理的目录与 Cerebras 元数据混合。如果没有 Cerebras 凭证，运行时提供程序将保持不活动状态。公共元数据列表并不建立帐户权利。

实时行提供本机上下文和完成限制、推理和视觉功能以及 prompt/completion 价格。 Cerebras 将这些价格作为 USD 每个代币字符串返回； OpenClaw 将它们转换为每百万代币 USD。公共源不提供单独的缓存费率，因此 OpenClaw 使用缓存读取的输入价格，与 Cerebras 缓存令牌的标准输入计费相匹配。

成功的目录会缓存 60 秒。如果发现失败、返回空目录或没有可用的模型行，OpenClaw 将使用捆绑的脱机种子。在默认的 `models.mode: "merge"` 中，新入门不会将生成的模型行或价格复制到您的配置中，从而允许刷新价格。明确编写的模型行和成本保持不变。在 `models.mode: "replace"` 中，发现被禁用，并且载入将离线种子保留为显式配置。

## <a id="built-in-catalog"></a> 内置目录

离线回退模型具有 131,072 个令牌上下文窗口和 40,960 个令牌最大输出。其价格于 2026 年 8 月 31 日从原生 [ 公共源 ](https://api.cerebras.ai/public/v1/models) 刷新。

| 模型引用               | 名称         | 推理 | 笔记                               |
| ----------------------- | ------------ | --------- | ----------------------------------- |
| `cerebras/gpt-oss-120b` | GPT OSS 120B | 是       | 默认；产生式推理模型 |

新入门引导选择GPT OSS 120B。 Cerebras 退役的模型不包含在捆绑目录中；现有的显式选择不会被重写。

## <a id="prompt-caching"></a> 提示词缓存

Cerebras 自动缓存匹配的提示符前缀。在本机 API 上，OpenClaw 为每个会话发送稳定的 `prompt_cache_key`，以改进缓存路由。缓存令牌减少了提示处理和未缓存令牌速率限制的使用；它们按标准输入代币价格计费。请参阅 [Cerebras 提示缓存](https://inference-docs.cerebras.ai/capabilities/prompt-caching)。

## <a id="manual-config"></a> 手动配置

大多数设置只需要 API 密钥。使用显式 `models.providers.cerebras` 配置来覆盖 `mode: "merge"` 中的模型元数据；将 `models` 留空以使用发现的行而不固定生成的价格：

```json5
{
  env: { vars: { CEREBRAS_API_KEY: "csk-..." } },
  agents: {
    defaults: {
      model: { primary: "cerebras/gpt-oss-120b" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [],
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd、systemd、Docker），请确保 `CEREBRAS_API_KEY` 对该进程可用——例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥不会对受管服务生效，除非另外导入了环境变量。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    Cerebras 模型的推理强度级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    验证配置文件、切换模型以及解决“无配置文件”错误。
  </Card>
</CardGroup>
