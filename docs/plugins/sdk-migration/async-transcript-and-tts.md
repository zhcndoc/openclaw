---
summary: "等待历史记录密钥查找和 TTS 提示准备的替换"
title: "等待的成绩单和 TTS 帮助程序"
read_when:
  - "从同步转录键查找迁移插件"
  - "在没有主线程数据库读取的情况下准备 TTS 提示"
---

## <a id="historical-transcript-keys"></a> H历史记录键

使用 `openclaw/plugin-sdk/session-store-runtime` 中的 `resolveTranscriptSessionKeyBySessionIdAsync` 查找拥有确切转录本身份的会话密钥：

```ts
import { resolveTranscriptSessionKeyBySessionIdAsync } from "openclaw/plugin-sdk/session-store-runtime";

const sessionKey = await resolveTranscriptSessionKeyBySessionIdAsync({
  agentId,
  sessionId,
  storePath,
});
```

它返回 `Promise<string | undefined>` 并接受与同步助手相同的 `agentId`、`env`、`sessionId` 和 `storePath` 字段。当脚本属于已配置或共享存储时，传递 `storePath`。不存在的数据库或未知身份会返回 `undefined`，而不创建数据库。

查找包括当前会话重置为新身份后保留的历史记录窗口。 `getSessionEntryByIdAsync` 读取当前会话条目，并且不能替代此历史查找。帮助者解决所有权问题；呼叫者在披露记录内容之前仍会强制执行现有授权。

同步 `resolveTranscriptSessionKeyBySessionId` 仍可作为已弃用的适配器使用。调用会发出有限警告，引导作者寻找等待的替换。

## <a id="tts-prompts"></a> TTS提示

对于一个提示，请等待公共 `api.runtime.tts.buildSystemPromptHintAsync` 方法。较老的主机可能缺乏这种附加功能；报告升级要求，而不是回退到同步数据库读取：

```ts
const prepareHint = api.runtime.tts.buildSystemPromptHintAsync;
if (!prepareHint) {
  throw new Error("Update OpenClaw to use async TTS prompt preparation.");
}

const hint = await prepareHint(config, agentId, {
  messageToolOnly: true,
});
```

结果仍然是 `string | undefined`：禁用的 TTS 不会产生任何提示。帮助器通过状态所有者准备机器拥有的首选项路径，并保留显式配置和 `OPENCLAW_TTS_PREFS` 优先级。

`openclaw/plugin-sdk/tts-runtime` 子路径是捆绑插件专用的。一次需要多个 TTS 帮助器的捆绑代码可以准备一次并将结果传递给每个调用。其同步重载与所需的 `preparedTtsPreferences` 仍然受支持：

```ts
import {
  buildTtsSystemPromptHint,
  prepareTtsPreferences,
  resolveTtsConfig,
  resolveTtsPrefsPath,
} from "openclaw/plugin-sdk/tts-runtime";

const preparedTtsPreferences = await prepareTtsPreferences();
const prefsPath = resolveTtsPrefsPath(resolveTtsConfig(config, agentId), preparedTtsPreferences);
const hint = buildTtsSystemPromptHint(config, agentId, {
  messageToolOnly: true,
  preparedTtsPreferences,
});
```

`PreparedTtsPreferences` 是私有只读类型。将返回值视为回合范围内的准备，并为下一回合获取新的准备。它保留选定的计算机路径，同时在每个帮助程序运行时读取首选项文件内容。提交的进程内路径更改对于下一个准备是可见的。

`resolveTtsPrefsPath` 和 `buildTtsSystemPromptHint` 的未准备同步重载保留其现有的返回值和行为，但已弃用。使用他们等待的替代品，或提供上述准备，以避免同步状态数据库读取和弃用警告。

## <a id="removal-timing"></a> 移除时机

这些已弃用的适配器仍然受支持**2026-12-31**，最后的兼容日。拆除船舶在**第一月2027稳定发布**，没有插件SDK主要版本。准备好的SQL-自由的TTS重载仍受支持。请参阅[完全的SQLite迁移指南](/plugins/sdk-migration/sqlite-async)和[移除时间表](/plugins/sdk-migration/removal-timeline)。
