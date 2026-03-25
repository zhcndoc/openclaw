---
summary: "插件清单 + JSON 模式要求（严格的配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin Manifest"
---

# 插件清单（openclaw.plugin.json）

本页仅适用于**原生 OpenClaw 插件清单**。

有关兼容的捆绑布局，请参见 [插件捆绑](/plugins/bundles)。

兼容的捆绑格式使用不同的清单文件：

- Codex 捆绑：`.codex-plugin/plugin.json`
- Claude 捆绑：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件布局
- Cursor 捆绑：`.cursor-plugin/plugin.json`

OpenClaw 也能自动检测这些捆绑布局，但不会针对本文档中描述的 `openclaw.plugin.json` 模式进行验证。

对于兼容捆绑，当布局符合 OpenClaw 运行时预期时，OpenClaw 当前会读取捆绑元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑的 `settings.json` 默认值和支持的挂钩包。

每个原生 OpenClaw 插件**必须**在**插件根目录**下包含一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单验证配置，**不执行插件代码**。缺失或无效的清单会被视为插件错误，阻止配置验证。

See the full plugin system guide: [Plugins](/tools/plugin).
For the native capability model and current external-compatibility guidance:
[Capability model](/plugins/architecture#public-capability-model).

## What this file does

`openclaw.plugin.json` is the metadata OpenClaw reads before it loads your
plugin code.

Use it for:

- plugin identity
- config validation
- auth and onboarding metadata that should be available without booting plugin
  runtime
- config UI hints

Do not use it for:

- registering runtime behavior
- declaring code entrypoints
- npm install metadata

Those belong in your plugin code and `package.json`.

## Minimal example

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

## Rich example

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API 密钥",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## Top-level field reference

| Field                 | Required | Type                             | What it means                                                                                                                |
| --------------------- | -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Yes      | `string`                         | Canonical plugin id. This is the id used in `plugins.entries.<id>`.                                                          |
| `configSchema`        | Yes      | `object`                         | Inline JSON Schema for this plugin's config.                                                                                 |
| `enabledByDefault`    | No       | `true`                           | Marks a bundled plugin as enabled by default. Omit it, or set any non-`true` value, to leave the plugin disabled by default. |
| `kind`                | No       | `"memory"` \| `"context-engine"` | Declares an exclusive plugin kind used by `plugins.slots.*`.                                                                 |
| `channels`            | No       | `string[]`                       | Channel ids owned by this plugin. Used for discovery and config validation.                                                  |
| `providers`           | No       | `string[]`                       | Provider ids owned by this plugin.                                                                                           |
| `providerAuthEnvVars` | No       | `Record<string, string[]>`       | Cheap provider-auth env metadata that OpenClaw can inspect without loading plugin code.                                      |
| `providerAuthChoices` | No       | `object[]`                       | Cheap auth-choice metadata for onboarding pickers, preferred-provider resolution, and simple CLI flag wiring.                |
| `skills`              | No       | `string[]`                       | Skill directories to load, relative to the plugin root.                                                                      |
| `name`                | No       | `string`                         | Human-readable plugin name.                                                                                                  |
| `description`         | No       | `string`                         | Short summary shown in plugin surfaces.                                                                                      |
| `version`             | No       | `string`                         | Informational plugin version.                                                                                                |
| `uiHints`             | No       | `Record<string, object>`         | UI labels, placeholders, and sensitivity hints for config fields.                                                            |

## providerAuthChoices reference

Each `providerAuthChoices` entry describes one onboarding or auth choice.
OpenClaw reads this before provider runtime loads.

| Field              | Required | Type                                            | What it means                                                                                            |
| ------------------ | -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `provider`         | Yes      | `string`                                        | Provider id this choice belongs to.                                                                      |
| `method`           | Yes      | `string`                                        | Auth method id to dispatch to.                                                                           |
| `choiceId`         | Yes      | `string`                                        | Stable auth-choice id used by onboarding and CLI flows.                                                  |
| `choiceLabel`      | No       | `string`                                        | User-facing label. If omitted, OpenClaw falls back to `choiceId`.                                        |
| `choiceHint`       | No       | `string`                                        | Short helper text for the picker.                                                                        |
| `groupId`          | No       | `string`                                        | Optional group id for grouping related choices.                                                          |
| `groupLabel`       | No       | `string`                                        | User-facing label for that group.                                                                        |
| `groupHint`        | No       | `string`                                        | Short helper text for the group.                                                                         |
| `optionKey`        | No       | `string`                                        | Internal option key for simple one-flag auth flows.                                                      |
| `cliFlag`          | No       | `string`                                        | CLI flag name, such as `--openrouter-api-key`.                                                           |
| `cliOption`        | No       | `string`                                        | Full CLI option shape, such as `--openrouter-api-key <key>`.                                             |
| `cliDescription`   | No       | `string`                                        | Description used in CLI help.                                                                            |
| `onboardingScopes` | No       | `Array<"text-inference" \| "image-generation">` | Which onboarding surfaces this choice should appear in. If omitted, it defaults to `["text-inference"]`. |

## uiHints reference

`uiHints` is a map from config field names to small rendering hints.

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

Each field hint can include:

| Field         | Type       | What it means                           |
| ------------- | ---------- | --------------------------------------- |
| `label`       | `string`   | User-facing field label.                |
| `help`        | `string`   | Short helper text.                      |
| `tags`        | `string[]` | Optional UI tags.                       |
| `advanced`    | `boolean`  | Marks the field as advanced.            |
| `sensitive`   | `boolean`  | Marks the field as secret or sensitive. |
| `placeholder` | `string`   | Placeholder text for form inputs.       |

## Manifest versus package.json

The two files serve different jobs:

| File                   | Use it for                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | Discovery, config validation, auth-choice metadata, and UI hints that must exist before plugin code runs           |
| `package.json`         | npm metadata, dependency installation, and the `openclaw` block used for entrypoints and setup or catalog metadata |

If you are unsure where a piece of metadata belongs, use this rule:

- if OpenClaw must know it before loading plugin code, put it in `openclaw.plugin.json`
- if it is about packaging, entry files, or npm install behavior, put it in `package.json`

## JSON Schema requirements

- **每个插件必须提供 JSON Schema**，即使它不接受任何配置。
- 空模式是允许的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 模式在配置读取/写入时验证，而非运行时。

## 验证行为

- 除非频道 ID 被插件清单声明，否则未知的 `channels.*` 键是**错误**。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 ID。未知 ID 是**错误**。
- 如果插件已安装但清单或模式损坏或缺失，验证失败，Doctor 会报告插件错误。
- 如果存在插件配置但插件**被禁用**，配置会被保留，并在 Doctor 和日志中显示**警告**。

See [Configuration reference](/gateway/configuration) for the full `plugins.*` schema.

## Notes

- The manifest is **required for native OpenClaw plugins**, including local filesystem loads.
- Runtime still loads the plugin module separately; the manifest is only for
  discovery + validation.
- Only documented manifest fields are read by the manifest loader. Avoid adding
  custom top-level keys here.
- `providerAuthEnvVars` is the cheap metadata path for auth probes, env-marker
  validation, and similar provider-auth surfaces that should not boot plugin
  runtime just to inspect env names.
- `providerAuthChoices` is the cheap metadata path for auth-choice pickers,
  `--auth-choice` resolution, preferred-provider mapping, and simple onboarding
  CLI flag registration before provider runtime loads. For runtime wizard
  metadata that requires provider code, see
  [Provider runtime hooks](/plugins/architecture#provider-runtime-hooks).
- Exclusive plugin kinds are selected through `plugins.slots.*`.
  - `kind: "memory"` is selected by `plugins.slots.memory`.
  - `kind: "context-engine"` is selected by `plugins.slots.contextEngine`
    (default: built-in `legacy`).
- `channels`, `providers`, and `skills` can be omitted when a plugin does not
  need them.
- If your plugin depends on native modules, document the build steps and any
  package-manager allowlist requirements (for example, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).
