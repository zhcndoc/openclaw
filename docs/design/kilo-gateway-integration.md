# Kilo Gateway 提供商集成设计

## 概述

本文档概述了将“Kilo Gateway”集成为 OpenClaw 的一流提供商的设计方案，参考现有的 OpenRouter 实现。Kilo Gateway 使用兼容 OpenAI 的 completions API，但基地址不同。

## 设计决策

### 1. 提供商命名

**建议：`kilocode`**

理由：

- 与用户配置示例中使用的 `kilocode` 提供商键吻合
- 与现有提供商命名惯例保持一致（如 `openrouter`、`opencode`、`moonshot`）
- 简短且易记
- 避免与通用的 "kilo" 或 "gateway" 术语混淆

考虑的备选项：`kilo-gateway` — 拒绝，因为代码库中较少使用带连字符的名称，且 `kilocode` 更精简。

### 2. 默认模型引用

**建议：`kilocode/anthropic/claude-opus-4.6`**

理由：

- 基于用户配置示例
- Claude Opus 4.5 是一款功能强大的默认模型
- 明确指定模型避免依赖自动路由

### 3. 基地址配置

**建议：使用硬编码默认值且允许配置覆盖**

- **默认基地址:** `https://api.kilo.ai/api/gateway/`
- **可配置:** 通过 `models.providers.kilocode.baseUrl` 实现

该设置符合 Moonshot、Venice 和 Synthetic 等其他提供商的模式。

### 4. 模型扫描

**建议：初期不设专门模型扫描端点**

理由：

- Kilo Gateway 作为 OpenRouter 的代理，模型动态变化
- 用户可手动在配置中设置模型
- 若日后 Kilo Gateway 开放 `/models` 端点，可再添加扫描支持

### 5. 特殊处理

**建议：继承 OpenRouter 对 Anthropic 模型的处理逻辑**

由于 Kilo Gateway 代理于 OpenRouter，适用相同特殊处理规则：

- `anthropic/*` 模型适用缓存 TTL 资格
- `anthropic/*` 模型附加参数（如 cacheControlTtl）
- 转录策略遵循 OpenRouter 模式

## 需修改文件

### 核心凭证管理

#### 1. `src/commands/onboard-auth.credentials.ts`

新增：

```typescript
export const KILOCODE_DEFAULT_MODEL_REF = "kilocode/anthropic/claude-opus-4.6";

export async function setKilocodeApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "kilocode:default",
    credential: {
      type: "api_key",
      provider: "kilocode",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
```

#### 2. `src/agents/model-auth.ts`

在 `resolveEnvApiKey()` 的 `envMap` 中添加：

```typescript
const envMap: Record<string, string> = {
  // ... 现有条目
  kilocode: "KILOCODE_API_KEY",
};
```

#### 3. `src/config/io.ts`

在 `SHELL_ENV_EXPECTED_KEYS` 中添加：

```typescript
const SHELL_ENV_EXPECTED_KEYS = [
  // ... 现有条目
  "KILOCODE_API_KEY",
];
```

### 配置应用

#### 4. `src/commands/onboard-auth.config-core.ts`

新增函数：

```typescript
export const KILOCODE_BASE_URL = "https://api.kilo.ai/api/gateway/";

export function applyKilocodeProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[KILOCODE_DEFAULT_MODEL_REF] = {
    ...models[KILOCODE_DEFAULT_MODEL_REF],
    alias: models[KILOCODE_DEFAULT_MODEL_REF]?.alias ?? "Kilo Gateway",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.kilocode;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  providers.kilocode = {
    ...existingProviderRest,
    baseUrl: KILOCODE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyKilocodeConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyKilocodeProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: KILOCODE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}
```

### 认证选项系统

#### 5. `src/commands/onboard-types.ts`

将 `AuthChoice` 类型中添加：

```typescript
export type AuthChoice =
  // ... 现有选项
  "kilocode-api-key";
// ...
```

将 `OnboardOptions` 中添加：

```typescript
export type OnboardOptions = {
  // ... 现有选项
  kilocodeApiKey?: string;
  // ...
};
```

#### 6. `src/commands/auth-choice-options.ts`

向 `AuthChoiceGroupId` 添加：

```typescript
export type AuthChoiceGroupId =
  // ... 现有组
  "kilocode";
// ...
```

在 `AUTH_CHOICE_GROUP_DEFS` 添加：

```typescript
{
  value: "kilocode",
  label: "Kilo Gateway",
  hint: "API key（兼容 OpenRouter）",
  choices: ["kilocode-api-key"],
},
```

在 `buildAuthChoiceOptions()` 中添加：

```typescript
options.push({
  value: "kilocode-api-key",
  label: "Kilo Gateway API 密钥",
  hint: "兼容 OpenRouter 的网关",
});
```

#### 7. `src/commands/auth-choice.preferred-provider.ts`

添加映射：

```typescript
const PREFERRED_PROVIDER_BY_AUTH_CHOICE: Partial<Record<AuthChoice, string>> = {
  // ... 现有映射
  "kilocode-api-key": "kilocode",
};
```

### 认证选项应用

#### 8. `src/commands/auth-choice.apply.api-providers.ts`

添加导入：

```typescript
import {
  // ... 现有导入
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.js";
```

新增对 `kilocode-api-key` 的处理：

```typescript
if (authChoice === "kilocode-api-key") {
  const store = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  const profileOrder = resolveAuthProfileOrder({
    cfg: nextConfig,
    store,
    provider: "kilocode",
  });
  const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
  const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
  let profileId = "kilocode:default";
  let mode: "api_key" | "oauth" | "token" = "api_key";
  let hasCredential = false;

  if (existingProfileId && existingCred?.type) {
    profileId = existingProfileId;
    mode =
      existingCred.type === "oauth" ? "oauth" : existingCred.type === "token" ? "token" : "api_key";
    hasCredential = true;
  }

  if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "kilocode") {
    await setKilocodeApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
    hasCredential = true;
  }

  if (!hasCredential) {
    const envKey = resolveEnvApiKey("kilocode");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `是否使用现有的 KILOCODE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})？`,
        initialValue: true,
      });
      if (useExisting) {
        await setKilocodeApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
  }

  if (!hasCredential) {
    const key = await params.prompter.text({
      message: "请输入 Kilo Gateway API 密钥",
      validate: validateApiKeyInput,
    });
    await setKilocodeApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    hasCredential = true;
  }

  if (hasCredential) {
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId,
      provider: "kilocode",
      mode,
    });
  }
  {
    const applied = await applyDefaultModelChoice({
      config: nextConfig,
      setDefaultModel: params.setDefaultModel,
      defaultModel: KILOCODE_DEFAULT_MODEL_REF,
      applyDefaultConfig: applyKilocodeConfig,
      applyProviderConfig: applyKilocodeProviderConfig,
      noteDefault: KILOCODE_DEFAULT_MODEL_REF,
      noteAgentModel,
      prompter: params.prompter,
    });
    nextConfig = applied.config;
    agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
  }
  return { config: nextConfig, agentModelOverride };
}
```

在函数顶部添加 tokenProvider 映射：

```typescript
if (params.opts.tokenProvider === "kilocode") {
  authChoice = "kilocode-api-key";
}
```

### CLI 注册

#### 9. `src/cli/program/register.onboard.ts`

新增 CLI 选项：

```typescript
.option("--kilocode-api-key <key>", "Kilo Gateway API 密钥")
```

在动作处理参数中添加：

```typescript
kilocodeApiKey: opts.kilocodeApiKey as string | undefined,
```

更新 auth-choice 帮助文本：

```typescript
.option(
  "--auth-choice <choice>",
  "认证选项: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|kilocode-api-key|ai-gateway-api-key|...",
)
```

### 非交互式引导

#### 10. `src/commands/onboard-non-interactive/local/auth-choice.ts`

新增对 `kilocode-api-key` 的支持：

```typescript
if (authChoice === "kilocode-api-key") {
  const resolved = await resolveNonInteractiveApiKey({
    provider: "kilocode",
    cfg: baseConfig,
    flagValue: opts.kilocodeApiKey,
    flagName: "--kilocode-api-key",
    envVar: "KILOCODE_API_KEY",
  });
  await setKilocodeApiKey(resolved.apiKey, agentDir);
  nextConfig = applyAuthProfileConfig(nextConfig, {
    profileId: "kilocode:default",
    provider: "kilocode",
    mode: "api_key",
  });
  // ... 应用默认模型
}
```

### 导出更新

#### 11. `src/commands/onboard-auth.ts`

新增导出：

```typescript
export {
  // ... 现有导出
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_BASE_URL,
} from "./onboard-auth.config-core.js";

export {
  // ... 现有导出
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.credentials.js";
```

### 特殊处理（可选）

#### 12. `src/agents/pi-embedded-runner/cache-ttl.ts`

为 Anthropic 模型添加 Kilo Gateway 支持：

```typescript
export function isCacheTtlEligibleProvider(provider: string, modelId: string): boolean {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModelId = modelId.toLowerCase();
  if (normalizedProvider === "anthropic") return true;
  if (normalizedProvider === "openrouter" && normalizedModelId.startsWith("anthropic/"))
    return true;
  if (normalizedProvider === "kilocode" && normalizedModelId.startsWith("anthropic/")) return true;
  return false;
}
```

#### 13. `src/agents/transcript-policy.ts`

新增 Kilo Gateway 处理（同 OpenRouter）：

```typescript
const isKilocodeGemini = provider === "kilocode" && modelId.toLowerCase().includes("gemini");

// 在 needsNonImageSanitize 检查中包含
const needsNonImageSanitize =
  isGoogle || isAnthropic || isMistral || isOpenRouterGemini || isKilocodeGemini;
```

## 配置结构

### 用户配置示例

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "kilocode": {
        "baseUrl": "https://api.kilo.ai/api/gateway/",
        "apiKey": "xxxxx",
        "api": "openai-completions",
        "models": [
          {
            "id": "anthropic/claude-opus-4.6",
            "name": "Anthropic: Claude Opus 4.6"
          },
          { "id": "minimax/minimax-m2.5:free", "name": "Minimax: Minimax M2.5" }
        ]
      }
    }
  }
}
```

### 认证配置结构

```json
{
  "profiles": {
    "kilocode:default": {
      "type": "api_key",
      "provider": "kilocode",
      "key": "xxxxx"
    }
  }
}
```

## 测试考虑

1. **单元测试：**
   - 测试 `setKilocodeApiKey()` 是否写入正确的 profile
   - 测试 `applyKilocodeConfig()` 是否设置正确默认值
   - 测试 `resolveEnvApiKey("kilocode")` 返回正确的环境变量

2. **集成测试：**
   - 测试使用 `--auth-choice kilocode-api-key` 的引导流程
   - 测试非交互式引导支持 `--kilocode-api-key`
   - 测试以 `kilocode/` 前缀选择模型

3. **端到端测试：**
   - 通过 Kilo Gateway 进行实际 API 调用（在线测试）

## 迁移说明

- 现有用户无需迁移
- 新用户可直接使用 `kilocode-api-key` 认证选项
- 现有使用 `kilocode` 提供商的手动配置继续工作

## 未来考虑

1. **模型目录：** 如果 Kilo Gateway 开放 `/models` 端点，添加类似 `scanOpenRouterModels()` 的扫描支持

2. **OAuth 支持：** 若 Kilo Gateway 支持 OAuth，则扩展认证系统

3. **速率限制：** 如有需要，考虑添加特定于 Kilo Gateway 的限流处理

4. **文档：** 在 `docs/providers/kilocode.md` 添加设置和使用说明

## 变更汇总

| 文件                                                          | 变更类型 | 说明                                                                  |
| ------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `src/commands/onboard-auth.credentials.ts`                    | 新增     | `KILOCODE_DEFAULT_MODEL_REF`、`setKilocodeApiKey()`                   |
| `src/agents/model-auth.ts`                                    | 修改     | 在 `envMap` 中添加 `kilocode`                                         |
| `src/config/io.ts`                                            | 修改     | 增加 `KILOCODE_API_KEY` 到 shell 环境变量键                            |
| `src/commands/onboard-auth.config-core.ts`                    | 新增     | `applyKilocodeProviderConfig()`、`applyKilocodeConfig()`              |
| `src/commands/onboard-types.ts`                               | 修改     | 在 `AuthChoice` 中添加 `kilocode-api-key`，在选项中添加 `kilocodeApiKey` |
| `src/commands/auth-choice-options.ts`                         | 修改     | 新增 `kilocode` 组和选项                                              |
| `src/commands/auth-choice.preferred-provider.ts`              | 修改     | 添加 `kilocode-api-key` 映射                                          |
| `src/commands/auth-choice.apply.api-providers.ts`             | 修改     | 添加 `kilocode-api-key` 的处理                                         |
| `src/cli/program/register.onboard.ts`                         | 修改     | 添加 `--kilocode-api-key` 选项                                        |
| `src/commands/onboard-non-interactive/local/auth-choice.ts`   | 修改     | 添加非交互式处理                                                     |
| `src/commands/onboard-auth.ts`                                | 修改     | 新增导出函数                                                        |
| `src/agents/pi-embedded-runner/cache-ttl.ts`                  | 修改     | 增加 kilocode 支持                                                  |
| `src/agents/transcript-policy.ts`                             | 修改     | 添加 kilocode Gemini 处理                                          |
