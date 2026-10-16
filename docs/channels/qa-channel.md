---
summary: "Synthetic Slack-class 通道插件，用于可重复的 OpenClaw QA 场景"
title: "QA 频道"
read_when:
  - "你正在将合成 QA 传输接入本地或 CI 测试运行"
  - "你需要内置的 qa-channel 配置接口"
  - "你正在迭代端到端 QA 自动化"
---

`qa-channel` 是用于自动 OpenClaw QA 的存储库本地合成消息传输（`extensions/qa-channel`，私有包，不包括在打包安装中）。它不是一个生产通道 - 它的存在是为了行使真实传输使用的相同通道插件边界，同时保持状态可重复和完全可检查。

## <a id="what-it-does"></a> 它的作用

- Slack-class目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- 共享的 `channel:` 和 `group:` 对话会在 group/channel 房间轮流时向代理显示，因此它们执行与 Discord、Slack、Telegram 和类似传输使用的相同可见回复和消息工具路由策略。
- 省略 `target` 和 `to` 的 Message 发送保留入站对话类型：直接、组或通道。
- 线程化入站会话中的 Sends 继承其线程，包括发送到相同的显式根目标。 `topLevel: true` 或 `threadId: null` 抑制隐式线程和回复继承。显式线程目标、线程 ID 和 `replyTo` 值将被保留。
- HTTP- 支持的合成总线，用于入站消息注入、出站记录捕获、线程创建、反应、编辑、删除和 search/read 操作。
- 带有媒体的流式回复将附件和当前工具跟踪一起传送。仅当其标题和工具跟踪已成功交付时，稍后的相同纯文本决赛才会被抑制。
- 主机侧自检运行器，会将 Markdown 报告写入 `.artifacts/qa-e2e/`。

出站工具跟踪记录有界工具以其观察到的参数开始，包括代码模式包装器和嵌套调用。该本地合成总线保留输入文本；它并不表明成功完成。 QA 实验室从相关的转录调用和结果中导出逻辑工具活动，保留调用身份和包装器沿袭。具有不同身份的重复处决仍然是分开的；代码模式包装器不会为其嵌套工具添加另一个成功，并且非零 shell 退出并不是成功执行。任务后续检查使用此活动来证明终端回复之前的串行读取和写入以及工件的修改时间。检查代码模式控制协议的场景在其转录摘要中明确包含控制活动。

## <a id="config"></a> 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

账户键：

- `enabled` - 此账户的主开关。
- `name` - 可选的显示标签。
- `responsePrefix`——自动回复前缀；帐户覆盖胜利。接受文字 `"auto"` 作为代理身份名称、模板（例如 `"[{model}]"`）或 `""` 以禁用继承的前缀。
- `baseUrl` - 合成总线 URL。设置后该账户即视为已配置。
- `botUserId` - 目标语法中使用的合成机器人用户 id（默认：`openclaw`）。
- `botDisplayName` - 外发消息的显示名称（默认：`OpenClaw QA`）。
- `pollTimeoutMs` - 长轮询等待窗口。100 到 30000 之间的整数（默认：1000）。
- `mediaMaxMb` - MiB 中的入站字节和出站文件的每个附件限制。命名帐户覆盖通道根，然后 `agents.defaults.mediaMaxMb` 提供后备。如果未设置，则应用现有媒体存储和加载器默认值。过大的入站附件将成为模型的不可用附件通知。通道在发布每个出站批次之前加载它，因此失败的附件会阻止发送该批次。共享回复准备可以首先删除过大的本地文件并保留有效附件并发出警告。
- `allowFrom` - 发送者白名单（用户 id 或 `"*"`；默认：`["*"]`）。私信始终为 `open` 策略；白名单群组策略也使用这些合成发送者 id。
- `groupPolicy` - 共享房间策略：`"open"`（默认）、`"allowlist"` 或 `"disabled"`。
- `groupAllowFrom` - 可选的共享房间发送者白名单。在 `"allowlist"` 下省略时，QA Channel 会回退到 `allowFrom`。
- `groups.<room>.requireMention` - 在特定 group/channel 房间回复之前需要机器人提及（默认值：false）。 `groups."*"` 设置默认；每个房间 `tools` / `toolsBySender` 设置工具策略覆盖。
- `defaultTo` - 未提供目标时的回退目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - 按操作进行的工具门控。

顶层的多账户键：

- `accounts` - 以账户 id 为键的命名账户级覆盖记录。
- `defaultAccount` - 配置多个账户时首选的账户 id。

## <a id="runners"></a> 运行器

主机侧自检（会在 `.artifacts/qa-e2e/` 下写入 Markdown 报告）：

```bash
pnpm qa:e2e
```

这将通过 `qa-lab` 进行路由，启动存储库内 QA 总线，启动 `qa-channel` 运行时切片，并运行可重复的自检。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

隔离的 `channel-participant-identity-inspection` 场景在启动前启用执行身份，练习 DM、组、无发送者、相同和混合参与者收集路径，证明入口拒绝不会创建审核行，并在网关重新启动时比较 JSON 和人工 CLI 检查：

```bash
pnpm openclaw qa suite --scenario channel-participant-identity-inspection
```

并行针对 QA 网关通道运行场景。有关场景、配置文件和提供者模式，请参见 [QA 概览](/concepts/qa-e2e-automation)。

Docker-支持的QA站点（网关+QA实验室调试器UI在一个堆栈中）：

```bash
pnpm qa:lab:up
```

构建 QA 站点，启动 Docker- 支持的网关 + QA 实验室堆栈，并打印 QA 实验室 URL。从那里您可以选择场景、选择模型车道、启动单独的运行并实时观看结果。 QA 实验室调试器与随附的 Control UI 捆绑包是分开的。

## <a id="installed-candidate-fixtures"></a> 已安装候选灯具

私有 QA 插件仍然排除在公共 OpenClaw 包之外。要练习已安装的候选者，请在单独的装置工作区中构建其仅限网关的工件。夹具配置文件保留了 QA 实验室的网关挂钩、工具和提供程序，但将其场景运行器和 CLI 保留在工具检查中。 QA Channel承载其纯总线协议实现；公共 SDK 导入仍然属于已安装的候选者。

从正在测试的提交修订处进行完整的、依赖项就绪的工具检查：

```bash
fixture_root="$(mktemp -d)"
git archive HEAD extensions/qa-lab extensions/qa-channel | tar -x -C "$fixture_root"
mkdir "$fixture_root/artifacts"

for plugin in qa-lab qa-channel; do
  node scripts/lib/plugin-npm-runtime-build.mjs \
    "$fixture_root/extensions/$plugin" --qa-gateway-fixture
  OPENCLAW_PLUGIN_NPM_BUNDLE_DEPENDENCIES=1 \
    node scripts/lib/plugin-npm-package-manifest.mjs \
    --run "$fixture_root/extensions/$plugin" --qa-gateway-fixture -- \
    npm pack --pack-destination "$fixture_root/artifacts"
done
```

构建器仅写入复制的包的 `dist` 目录。清单所有者在打包后恢复其源元数据，并包含 QA 通道配置架构。此便携式夹具方案需要依赖项捆绑：配置文件本身不会安装或捆绑 `typebox` 和 `zod`。不要复制结账 `node_modules` 链接或覆盖其他运行生成的插件输出。

使用现有的 `runQaSuite` API，工具签出为 `repoRoot`，并使用指向已安装候选运行时的显式 `sutOpenClawCommand` 和 `dist/index.js`（带有 `usePackagedPlugins: true`）。将审阅的工件提取到独立的夹具目录中，并通过 API 的 `mutateConfig` 回调将这些包路径添加到 `plugins.load.paths`，保留其他配置字段。在候选者执行自己的身份验证引导和更新修复之前，该回调会针对每个新子项运行。本地来源和能力同意规则仍然适用；固定装置未获得官方包信任。

保持已安装的包不变。请勿使用工具检查设置 `OPENCLAW_DEV_SOURCE_ROOT` 或替换其捆绑的 plugin/SDK 根。记录修订版本并根据 **安装的候选**（而不仅仅是工具版本）验证夹具 peer/API 要求和发出的主机导入。所需的证明包括实际候选 Gateway/CLI 图像、候选者拥有的 SDK 分辨率、未更改的场景结果和完整的子清理。单独的源 QA 通行证不会建立已安装软件包的兼容性。

## <a id="related"></a> 相关内容

- [QA 概览](/concepts/qa-e2e-automation) - 整体技术栈、传输适配器、Matrix 实时通道和场景编写
- [个人代理基准测试包](/concepts/personal-agent-benchmark-pack) - 在此通道上运行的场景包
- [配对](/channels/pairing)
- [群组](/channels/groups)
- [渠道概览](/channels)
