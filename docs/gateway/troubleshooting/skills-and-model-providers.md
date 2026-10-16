---
summary: "技能根遏制、Anthropic 429、上游 403 和本地 OpenAI- 兼容后端"
title: "技能和模型提供者"
sidebarTitle: "技能和模型提供者"
read_when:
  - "技能符号链接作为路径转义被跳过"
  - "模型调用失败，出现 429 额外使用或上游 403 响应"
  - "本地 OpenAI- 兼容后端通过直接检查，但代理运行仍然失败"
---

## <a id="skill-symlink-skipped-as-path-escape"></a> 技能符号链接因路径逃逸而被跳过

当日志包含以下内容时使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

每个技能根目录都是一个包含边界。当 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符号链接，其真实目标解析到该根目录之外时，会被跳过，除非该目标已被显式信任。

检查该链接：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果该目标是有意如此，请同时配置直接技能根目录和允许的符号链接目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/path/to/skills"],
      allowSymlinkTargets: ["~/path/to/skills"],
    },
  },
}
```

然后启动新的会话，或等待 skills 监视器刷新。如果运行中的进程早于配置更改，则重启网关。

不要使用过于宽泛的目标，例如 `~`、`/`，或整个同步项目文件夹。请将 `allowSymlinkTargets` 的范围限制在包含受信任 `SKILL.md` 目录的真实技能根目录。

Skill Workshop 不使用这些可信的发现目标。它仅写入活动代理的 `<state-dir>/agents/<agentId>/agent/workshop-skills` 内。

相关：

- [技能配置](/tools/skills-config#symlinked-skill-roots)
- [配置示例](/gateway/configuration-examples#symlinked-sibling-skill-repo)。

## <a id="anthropic-429-extra-usage-required-for-long-context"></a> Anthropic 429 长上下文需要额外用量

当 logs/errors 包含：`HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查看以下内容：

- 选定的 Anthropic 模型具有本机 1M 上下文窗口（Opus 5、Sonnet 5、Mythos 5、Fable 5.1、Fable 5、Opus 4.6/4.7/4.8、Sonnet 4.6），或者模型配置仍然带有旧版 `params.context1m: true`。
- 当前 Anthropic 凭据不符合长上下文使用资格。
- Requests 仅在需要 1M 上下文路径的长 sessions/model 运行时失败。

修复选项：

<Steps>
  <Step id="use-a-standard-context-window" title="使用标准上下文窗口">
    切换到标准窗口模型，或从不支持 1M 上下文的 GA- 的旧模型配置中删除旧版 `context1m`。
  </Step>
  <Step id="use-an-eligible-credential" title="使用符合条件的凭证">
    使用符合长上下文请求资格的 Anthropic 凭据，或切换为 Anthropic API 密钥。
  </Step>
  <Step id="configure-fallback-models" title="配置后备模型">
    配置回退模型，以便在 Anthropic 长上下文请求被拒绝时运行仍可继续。
  </Step>
</Steps>

相关：

- [人类](/providers/anthropic)
- [代币使用和费用](/reference/token-use)
- [为什么我从 Anthropic 看到 HTTP 429？](/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## <a id="upstream-403-blocked-responses"></a> 上游 403 阻止响应

当上游 LLM 提供方返回通用 `403`（例如 `Your request was blocked`）时使用。

不要认为这始终是 OpenClaw 配置问题。响应可以来自上游安全层，例如 CDN、WAF、机器人管理规则或 OpenAI- 兼容端点前面的反向代理。

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

查看以下内容：

- 同一提供方下的多个模型都以相同方式失败。
- 返回的是 HTML 或通用安全文案，而不是正常的提供方 API 错误。
- 同一请求时间点在提供方侧有安全事件记录。
- A 微小的直接 `curl` 检查成功，而正常的 SDK- 形请求失败。

当证据指向 WAF/CDN 区块时，首先修复提供者端过滤。对于 OpenClaw 使用的 API 路径，首选范围狭窄的允许或跳过规则，并避免禁用整个站点的保护。

<Warning>
成功的最小 `curl` 并不能保证真正的 SDK-style 请求将通过相同的上游安全层。
</Warning>

相关：

- [OpenAI 兼容端点](/gateway/config-gateway#openai-compatible-endpoints)
- [提供方配置](/providers)
- [日志](/logging)

<a id="local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" />

## <a id="local-openai-compatible-backend-passes-direct-checks-but-agent-runs-fail"></a> Local OpenAI-兼容后端通过直接检查但代理运行失败

适用场景：

- `curl ... /v1/models` 可正常工作。
- 直接发起很小的 `/v1/chat/completions` 调用可正常工作。
- OpenClaw 模型运行仅在正常代理轮次中失败。

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查看以下内容：

- 直接的小型调用成功，但 OpenClaw 运行仅在更大的提示词下失败。
- 即使直接 `/v1/chat/completions` 使用相同的裸模型 ID，也会出现 `model_not_found` 或 404 错误。
- 后端报错 `messages[].content` 期望字符串。
- 与 OpenAI- 兼容的本地后端出现间歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告。
- 仅在更大的提示 token 数或完整代理运行提示词下才出现的后端崩溃。

<AccordionGroup>
  <Accordion id="common-signatures" title="通用签名">
    - `model_not_found` 与本地 MLX/vLLM-style 服务器：验证 `baseUrl` 包括 `/v1`，`api` 是 `/v1/chat/completions` 后端的 `"openai-completions"`，`models.providers.<provider>.models[].id` 是裸露的提供商本地 ID。使用提供商前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；将目录条目保留为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string`：后端拒绝结构化的 Chat Completions 内容分片。修复方法：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允许的消息键，例如 `["role","content"]`：后端拒绝 OpenAI- 样式重播聊天完成消息上的元数据。修复：设置 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0`：后端完成了聊天完成请求，但该回合没有返回用户可见的助手文本。 OpenClaw 重试重放安全空 OpenAI- 兼容回合一次；持续失败通常意味着后端正在发出 empty/non-text 内容或抑制最终答案文本。
    - Direct 小请求成功，但 OpenClaw 代理运行失败并出现 backend/model 崩溃（例如 Gemma 在 `llmman` 后面的某些 `llama-server` 构建上）：OpenClaw 传输可能已经正确；后端在较大的代理运行时提示形状上失败。
    - 禁用工具后故障会缩小，但不会消失：工具模式是压力的一部分，但剩下的问题仍然是上游 model/server 容量或后端错误。

  </Accordion>
  <Accordion id="fix-options" title="修复选项">
    1. 为仅接受字符串的 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 设置 `compat.strictMessageKeys: true` 以实现严格的聊天完成后端，仅在每条消息上接受 `role` 和 `content`。
    3. 为无法可靠处理 OpenClaw 的工具架构曲面的 models/backends 设置 `compat.supportsTools: false`。
    4. 尽可能降低提示词压力：更小的工作区启动内容、更短的会话历史、更轻量的本地模型，或使用更强的长上下文支持后端。
    5. 如果微小的直接请求不断传递，而 OpenClaw 代理在后端内仍然崩溃，请将其视为上游 server/model 限制，并使用可接受的有效负载形状在此处提交重现。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/gateway/configuration)
- [本地模型](/gateway/local-models)
- [OpenAI 兼容端点](/gateway/config-gateway#openai-compatible-endpoints)
