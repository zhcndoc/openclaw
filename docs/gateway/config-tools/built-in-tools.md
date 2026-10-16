---
summary: "执行、循环检测、网络搜索和获取、媒体理解和计划工具的每个工具设置"
read_when:
  - "调整 `exec` 超时、批准或 `apply_patch`"
  - "配置 Web 搜索、Web 获取或入站媒体理解"
  - "打开或关闭刀具循环检测或 `progress_card`"
title: "配置——内置工具设置"
---

各个内置工具的设置。运行是否可以调用它们由 [tool 策略 ](/gateway/config-tools/tool-policy) 决定。

## `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSeconds: 1800,
      cleanupMs: 1800000,
      approvalRunningNoticeMs: 10000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: true,
        allowModels: ["gpt-6-astra"],
      },
    },
  },
}
```

显示的值除 `applyPatch.allowModels` 外均为默认值（默认情况下为 empty/unset，这意味着任何兼容模型都可以使用 `apply_patch`）。当批准支持的 exec 长时间运行时，`approvalRunningNoticeMs` 会发出运行通知； `0` 禁用它。

`tools.exec.grantExpiryDays`（默认情况下未设置）为“始终允许自动化审批”创建的常设拨款设置默认生命周期（以天 （1–3650） 为单位）。取消设置使授权保持有效，直到被撤销或所属自动化的实质性定义发生更改为止；暂停和重新启用相同的定义不会撤销它们。期限一经冻结，因此改变价值只会影响未来的赠款；请参阅 [ 自动化常设补助金 ](/tools/exec-approvals#standing-grants-for-automations)。

## `tools.loopDetection`

滚动刀具循环检测 **默认禁用**。设置 `enabled: true` 来激活它。可以在 `tools.loopDetection` 中全局定义设置，并在 `agents.entries.*.tools.loopDetection` 中覆盖每个代理。

独立地，三个连续的相同工具错误总是以记录的故障和恢复指导结束转弯，即使 `enabled` 是 `false` 时也是如此。更改的参数或结果以及成功的调用会重置该错误条纹。有关单独的压实后防护和滚动检测行为，请参阅 [ 工具环检测](/tools/loop-detection)。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
    },
  },
}
```

## `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave", // optional; omit for auto-detect
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 20000,
        maxCharsCap: 20000,
        maxResponseBytes: 750000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: { apiKey: "brave_api_key" }, // or BRAVE_API_KEY env
        },
      },
    },
  },
}
```

Web 搜索提供商凭据属于 `plugins.entries.<plugin>.config.webSearch`，如 Brave 所示；参见[网页搜索](/tools/web#storing-api-keys)。显示的 `tools.web` 值为默认值，`provider` 和 `userAgent` 除外。 `maxResponseBytes` 钳位至 32000–10000000； `maxChars` 钳位到 `maxCharsCap`（升高 `maxCharsCap` 以允许更大的响应）。

## `tools.media`

配置入站媒体理解 （image/audio/video）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      models: [
        { provider: "openai", model: "gpt-4o-mini-transcribe", capabilities: ["audio"] },
        {
          type: "cli",
          command: "whisper",
          args: ["--model", "base", "{{AttachmentPath}}"],
          capabilities: ["audio"],
        },
        { provider: "ollama", model: "gemma4:26b", capabilities: ["image"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["video"] },
      ],
      audio: { enabled: true, preferredModel: "openai/gpt-4o-mini-transcribe" },
      image: { enabled: true, preferredModel: "ollama/gemma4:26b" },
      video: { enabled: true },
    },
  },
}
```

`tools.media.models` 是唯一配置的模型列表。每个条目声明其处理的能力。可选的 `preferredModel` 选择器接受 `provider/model`、模型 id、用于提供方默认条目的 `provider:<id>`，或 `cli:command`；匹配的条目会移动到该能力回退顺序的前面。对于已配置和自动检测的模型，每种能力的提示词、限制、请求设置、作用域、附件策略和音频转录回显仍作为默认值；模型条目可以覆盖特定于模型的字段。

<AccordionGroup>
  <Accordion id="media-model-entry-fields" title="媒体模型输入字段">
    **提供方条目**（`type: "provider"` 或省略）：

    - `provider`：API 提供商 ID（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`：模型 id 覆盖
    - `profile` / `preferredProfile`：存储的身份验证配置文件选择

    **CLI 条目**（`type: "cli"`）：

    - `command`：要运行的可执行文件
    - `args`：模板化参数（支持 `{{AttachmentPath}}`、`{{AttachmentUrl}}`、`{{AttachmentContentType}}`、`{{AttachmentDir}}`、`{{AttachmentIndex}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 会将已弃用的 `{input}` 占位符迁移为 `{{AttachmentPath}}`）。较旧的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 别名在兼容期内仍可用，但已弃用。

    **通用字段：**

    - `capabilities`：包含 `image`、`audio` 和 `video` 中一个或多个值的列表。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：每个条目的覆盖值。
    - 当代理调用显式 `view_image` 工具时， 匹配图像模型 `timeoutSeconds` 条目也适用。对于图像理解，此超时适用于请求本身，并且不会因早期的准备工作而减少。
    - 失败时回退到下一个条目。

    提供商身份验证遵循标准顺序：SQLite 身份验证配置文件 → 环境变量 → `models.providers.*.apiKey`。

  </Accordion>
</AccordionGroup>

<a id="toolsupdateplan"></a>

## `tools.updatePlan`

`progress_card` 的终止开关，用于重要的多步骤工作跟踪的持久计划和状态说明。

```json5
{
  tools: {
    updatePlan: false, // hide progress_card from every run
  },
}
```

- 默认值：对于每个提供商和模型均为 `true`。设置为 `false` 可关闭该工具；不存在针对特定模型的自动启用规则。
- 工具描述告诉模型保持计划最新，最多使用一个`in_progress`步骤，并且仅当它提供步骤之外的信息时才添加Markdown。
- 在新的 `tools.allow` 和 `tools.deny` 策略中使用 `progress_card`。名为 `update_plan` 的现有策略映射到 `progress_card`，因此附带的允许列表和拒绝列表保留其含义。

旧版配置使用 `tools.experimental.planTool`。运行 `openclaw doctor --fix` 可将该值迁移到 `tools.updatePlan`。
