---
summary: "OpenClaw 如何隐式发现 Ollama 模型以及窄烟雾测试"
read_when:
  - "您想知道 OpenClaw 发现了哪些模型以及如何发现"
  - "您需要能力、推理或成本检测规则"
  - "您需要跳过代理工具表面的窄文本或视觉检查"
title: "Ollama模型发现"
sidebarTitle: "模型发现"
---

成功的 `/api/tags` 列表还会检查配置的模型名称。如果 `qwen3:8bb` 已配置但在服务器中不存在，则 `openclaw models list` 会警告拉取它或修复名称。 Doctor和`models status`也显示了准备好的网关警告。省略的 `:latest` 标签仍然被接受；离线服务器不会产生丢失模型警告。这些警告从不拒绝模型声明。

## <a id="model-discovery-(implicit-provider)"></a><a id="model-discovery-implicit-provider"></a> 模型发现（隐式提供方）

当设置了 `OLLAMA_API_KEY`（或身份验证配置文件），且未定义 `models.providers.ollama` 或其他带有 `api: "ollama"` 的自定义提供方时， OpenClaw 会从 `http://127.0.0.1:11434` 发现模型：

| 行为             | 详情                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 目录查询        | `/api/tags`                                                                                                                                                                                                                                                                                                                                                                          |
| 能力检测 | 尽力 `/api/show` 读取 `contextWindow`、`num_ctx` 模型文件参数和功能 （vision/tools/thinking）                                                                                                                                                                                                                                                              |
| 视觉模型        | `/api/show` 的 `vision` 功能标志着模型具有图像功能 （`input: ["text", "image"]`）                                                                                                                                                                                                                                                                                    |
| 推理检测  | 使用 `/api/show` 中的 `thinking` 功能（如果可用）；当 Ollama 省略功能时，会回退到名称启发式 （`r1`、`reason`、`reasoning`、`think`）。无论报告的功能如何，`glm-5.2:cloud`、`glm-5.3:cloud`、`glm-5.3-flash:cloud`、`kimi-k3:cloud`、`deepseek-v4-flash\|pro:cloud` 和 `deepseek-v4.1-flash:cloud` 始终被视为推理。 |
| 令牌限制         | `maxTokens` 默认使用 OpenClaw 的 Ollama 最大令牌上限                                                                                                                                                                                                                                                                                                                              |
| 成本                | 所有成本均为 `0`                                                                                                                                                                                                                                                                                                                                                                    |

```bash
ollama list
openclaw models list
```

当 Ollama 位于代理的模型范围内时，即使 `models.providers.ollama.models` 列出模型，也会发现显式自托管端点，因为安装程序会保存它们。配置的模型保留其设置；其他已安装的聊天模型出现在它们旁边，因此稍后拉取的模型将显示在下一次模型列表刷新中，无需进行配置编辑或重新启动。要仅列出已配置的模型，请设置 `models.mode: "replace"` 或 `plugins.entries.ollama.config.discovery.enabled: false`。 `models.providers.ollama.apiKey` 本身不会选择该提供商进行网关模型浏览。

通过本机 Ollama，发现还可以从同一服务器填充已配置模型缺失的 `thinkingLevelMap`。对于始终思考的模型，这可以将推理与答案文本分开，包括推理显示关闭时。保留明确的思维导图和其他配置设置；使用 OpenAI- 兼容 API 或不同端点的模型不会继承该元数据。

失败的发现记录不可用或目录身份验证失败，并保留同一端点和凭据的最后一次成功清单。成功的空响应将清除已发现的模型。手动模型保持独立。

托管 `https://ollama.com` 条目会跳过发现，因为 Ollama Cloud 模型是由提供商管理的。如果没有显式的 Ollama 端点，则具有 `api: "ollama"` 和非环回 `baseUrl` 的自定义提供程序会抑制环境本地主机发现；手动列出该自定义提供程序的模型（请参阅 [Configuration](/providers/ollama/configuration)）。环回自定义提供程序（例如 `http://127.0.0.2:11434`）使环境本地发现符合条件。

你可以直接使用完整引用，例如 `ollama/<pulled-model>:latest`，而无需手写 `models.json` 条目；OpenClaw 会实时解析它。对于已登录主机，选择一个未列出的 `ollama/<model>:cloud` 引用会通过 `/api/show` 验证该确切模型，并且只有在 Ollama 确认元数据时才会将其添加到运行时目录中——拼写错误仍会因未知模型而失败。

### <a id="smoke-tests"></a> 冒烟测试

对于跳过整个代理工具表面的窄文本检查：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

添加带有图像的 `--file` 以进行精益视觉模型检查（接受 PNG/JPEG/WebP；在调用 Ollama 之前拒绝非图像文件 — 使用 `openclaw infer audio transcribe` 进行音频）：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

这两条路径都不会加载聊天工具、内存或会话上下文。如果成功而正常代理回复失败，则问题可能是模型的 tool/agent 容量，而不是端点。

使用 `/model ollama/<model>` 选择模型是一个精确的用户选择：如果配置的 `baseUrl` 不可达，下一次回复会直接以提供方错误失败，而不是静默回退到另一个已配置模型。

独立的 cron 作业在启动代理轮流之前添加一项本地安全检查：如果所选模型解析为 local/private-network/`.local` Ollama 提供程序并且 `/api/tags` 无法访问，则 OpenClaw 会记录作为 `skipped` 运行的模型，并在错误文本中显示该模型。此端点检查会在每个主机上缓存 5 分钟，因此针对已停止的守护进程重复执行 cron 作业不会全部启动失败的请求。

现场验证。这些是贡献者命令：从已完成 `pnpm install` 的 `openclaw/openclaw` 存储库的签出中运行它们，而不是从打包的 CLI 安装中运行它们。

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

对于 Ollama Cloud，在托管端点上进行相同的实时测试（默认情况下跳过嵌入；强制使用 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1`，因为云密钥可能不会授权 `/api/embed`）：

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.2:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

要添加模型，只需拉取它，系统就会自动发现：

```bash
ollama pull mistral
```
