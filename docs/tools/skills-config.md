---
title: "Skills 配置"
sidebarTitle: "Skills 配置"
summary: "skills.* 配置模式、agent 白名单、工作坊设置以及沙箱环境变量处理的完整参考。"
read_when:
  - 配置 skill 加载、安装或门控行为
  - 设置按 agent 的 skill 可见性
  - 调整 Skill Workshop 限制或审批策略
---

大多数 skills 配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。按 agent 的可见性位于 `agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { enabled: false },
      allowSymlinkTargetWrites: false,
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>
  对于内置图像生成，请使用 `agents.defaults.imageGenerationModel`
  加上核心 `image_generate` 工具，而不是 `skills.entries`。Skill
  条目仅用于自定义或第三方 skill 工作流。
</Note>

## 加载（`skills.load`）

<ParamField path="skills.load.extraDirs" type="string[]">
  额外要扫描的 skill 目录，优先级最低（在捆绑和插件 skill 之后）。路径支持 `~` 展开。
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  受信任的真实目标目录，符号链接的 skill 文件夹即使位于配置根目录之外，也可以解析到这些目录中。可用于有意的兄弟仓库布局，例如
  `<workspace>/skills/manager -> ~/Projects/manager/skills`。请保持此列表范围很小——不要指向像 `~` 或 `~/Projects` 这样宽泛的根目录。
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  监视 skill 文件夹，并在 `SKILL.md` 文件变更时刷新 skills 快照。覆盖分组 skill 根目录下的嵌套文件。
</ParamField>

<ParamField path="skills.load.watchDebounceMs" type="number" default="250">
  skill 监视器事件的防抖窗口，单位为毫秒。
</ParamField>

## 安装（`skills.install`）

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  在 `brew` 可用时优先使用 Homebrew 安装器。
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  skill 安装时偏好的 Node 包管理器。此项只影响 skill 安装——Gateway 运行时仍应使用 Node（不建议在 WhatsApp/Telegram 中使用 Bun）。使用 `openclaw setup --node-manager` 可设置 npm、pnpm 或 bun；为基于 Yarn 的 skill 安装请手动设置 `"yarn"`。
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  允许受信任的 `operator.admin` Gateway 客户端安装通过 `skills.upload.*` 暂存的私有 zip 压缩包。正常的 ClawHub 安装不需要此设置。
</ParamField>

## 操作员安装策略（`security.installPolicy`）

当操作员需要一个受信任的本地命令来根据主机特定策略批准或阻止 skill 和插件安装时，请使用 `security.installPolicy`。该策略会在 OpenClaw 暂存源材料之后、安装或更新继续之前运行。它适用于 ClawHub skills、上传的 skills、Git/本地 skills、skill 依赖安装器，以及插件安装/更新源。

```json5
{
  security: {
    installPolicy: {
      enabled: true,
      // 省略 targets 可覆盖所有支持的目标。
      targets: ["skill", "plugin"],
      exec: {
        source: "exec",
        command: "/usr/local/bin/openclaw-install-policy",
        args: ["--json"],
        timeoutMs: 10000,
        noOutputTimeoutMs: 10000,
        maxOutputBytes: 1048576,
        passEnv: ["OPENCLAW_STATE_DIR", "PATH"],
        env: { POLICY_MODE: "strict" },
        trustedDirs: ["/usr/local/bin"],
      },
    },
  },
}
```

<ParamField path="security.installPolicy.enabled" type="boolean" default="false">
  启用操作员拥有的安装策略。启用但没有有效 `exec` 命令时，安装将失败并关闭。
</ParamField>

<ParamField path="security.installPolicy.targets" type='("skill" | "plugin")[]'>
  可选的目标过滤器。省略时，策略会应用于每个受支持的目标，因此新的安装不会意外地失败并开放。
</ParamField>

<ParamField path="security.installPolicy.exec.command" type="string">
  受信任策略可执行文件的绝对路径。OpenClaw 会在无 shell 的情况下运行它，并在使用前验证该路径。
</ParamField>

<ParamField path="security.installPolicy.exec.args" type="string[]">
  在 `command` 之后传递的静态参数。
</ParamField>

<ParamField path="security.installPolicy.exec.timeoutMs" type="number" default="10000">
  单次策略决策的最大墙钟运行时间。
</ParamField>

<ParamField path="security.installPolicy.exec.noOutputTimeoutMs" type="number" default="timeoutMs">
  策略在没有 stdout 或 stderr 输出时，触发失败并关闭之前的最大时间。
</ParamField>

<ParamField path="security.installPolicy.exec.maxOutputBytes" type="number" default="1048576">
  策略进程可接受的 stdout 和 stderr 合计最大字节数。
</ParamField>

<ParamField path="security.installPolicy.exec.env" type="Record<string, string>">
  提供给策略进程的字面环境变量。
</ParamField>

<ParamField path="security.installPolicy.exec.passEnv" type="string[]">
  从 OpenClaw 进程复制到策略进程的环境变量名。只会传递命名变量。
</ParamField>

<ParamField path="security.installPolicy.exec.trustedDirs" type="string[]">
  可选的目录白名单，策略可执行文件可以位于其中。
</ParamField>

<ParamField path="security.installPolicy.exec.allowInsecurePath" type="boolean" default="false">
  绕过命令路径所有权和权限检查。仅在该路径由其他机制保护时使用。
</ParamField>

<ParamField path="security.installPolicy.exec.allowSymlinkCommand" type="boolean" default="false">
  允许配置的命令路径是符号链接。解析后的目标仍必须满足其他路径检查。解释器脚本参数必须是直接的普通文件，不能是符号链接。
</ParamField>

该策略在 stdin 上接收一个 JSON 对象，包含 `protocolVersion: 1`、`openclawVersion`、`targetType`、`targetName`、`sourcePath`、`sourcePathKind`、可选的结构化 `source`、结构化 `origin` 和 `request`。它必须在 stdout 上写入一个 JSON 对象：`{ "protocolVersion": 1, "decision": "allow" }` 或 `{ "protocolVersion": 1, "decision": "block", "reason": "..." }`。非零退出、超时、JSON 格式错误、缺失字段或不支持的协议版本都会失败并关闭。

OpenClaw 在正常 Gateway 启动期间不会执行安装策略。当策略已启用但不可用时，安装和更新会失败并关闭。`openclaw doctor` 执行静态验证，而 `openclaw doctor --deep` 会针对已配置的命令执行一个合成安装探针。

批量更新会按目标分别应用策略：被阻止的 skill 或插件更新只会让该目标失败，不会禁用策略，也不会跳过批次中的后续目标。

输入示例：

```json
{
  "protocolVersion": 1,
  "openclawVersion": "2026.6.1",
  "targetType": "skill",
  "targetName": "weather",
  "sourcePath": "/var/folders/.../openclaw-skill-clawhub/root",
  "sourcePathKind": "directory",
  "source": {
    "kind": "clawhub",
    "authority": "openclaw",
    "mutable": false,
    "network": true
  },
  "origin": {
    "type": "clawhub",
    "registry": "https://clawhub.openclaw.ai",
    "slug": "weather",
    "version": "1.0.0"
  },
  "request": {
    "kind": "skill-install",
    "mode": "install",
    "requestedSpecifier": "clawhub:weather@1.0.0"
  },
  "skill": {
    "installId": "clawhub"
  }
}
```

最小策略命令：

```js
#!/usr/bin/env node

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const request = JSON.parse(input);
  if (request.targetType === "plugin" && request.source?.kind === "local-path") {
    process.stdout.write(
      JSON.stringify({
        protocolVersion: 1,
        decision: "block",
        reason: "本地主机上的插件路径未获批准",
      }),
    );
    return;
  }
  process.stdout.write(JSON.stringify({ protocolVersion: 1, decision: "allow" }));
});
```

## 捆绑 skill 白名单

<ParamField path="skills.allowBundled" type="string[]">
  仅适用于 **bundled** skills 的可选白名单。设置后，只有列表中的 bundled skills 才有资格。托管的、按 agent 的和 workspace skills 不受影响。
</ParamField>

## 按 skill 的条目（`skills.entries`）

`entries` 下的键默认与 skill 的 `name` 匹配。如果某个 skill 定义了 `metadata.openclaw.skillKey`，则改用该键。带连字符的名称需要加引号（JSON5 允许带引号的键）。

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  `false` 会禁用该 skill，即使它是 bundled 或已安装。`coding-agent` bundled skill 默认不启用——将其设为 `true`，并确保已安装并完成认证的 `claude`、`codex`、`opencode` 或其他受支持的 CLI 之一可用。
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  适用于声明了 `metadata.openclaw.primaryEnv` 的 skill 的便捷字段。支持明文字符串或 SecretRef：`{ source: "env", provider: "default", id: "VAR_NAME" }`。
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  为 agent 运行注入的环境变量。仅在该变量尚未在进程中设置时才会注入。
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  自定义按 skill 配置字段的可选对象。
</ParamField>

## Agent 允许列表（`agents`）

当你希望使用相同的机器/工作区技能根目录，但为每个 agent 提供不同的可见技能集时，请使用 agent 配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // 共享基线
    },
    list: [
      { id: "writer" }, // 继承 github、weather
      { id: "docs", skills: ["docs-search"] }, // 完全替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
  被 agent 继承的共享基线允许列表；适用于省略 `agents.list[].skills` 的 agent。
  若完全省略，则默认不限制技能。
</ParamField>

<ParamField path="agents.list[].skills" type="string[]">
  该 agent 的显式最终技能集。显式列表会**替换**继承的默认值，而不是合并。
  设为 `[]` 可让该 agent 不暴露任何技能。
</ParamField>

## 工作室（`skills.workshop`）

<ParamField path="skills.workshop.autonomous.enabled" type="boolean" default="false">
  当为 `true` 时，agent 在成功轮次后可根据持久化对话信号创建待处理提案。
  用户提示触发的技能创建始终会通过 Skill Workshop，不受此设置影响。
</ParamField>

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"pending"'>
  `pending` 需要操作员批准后，agent 才能发起 apply、reject 或 quarantine。
  `auto` 则允许这些操作无需批准。
</ParamField>

<ParamField path="skills.workshop.allowSymlinkTargetWrites" type="boolean" default="false">
  允许 Skill Workshop apply 通过工作区 skill 符号链接进行写入，只要其真实目标已被 `skills.load.allowSymlinkTargets` 信任。除非生成的提案应用需要修改该共享 skill 根目录，否则请保持此项禁用。
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  每个工作区保留的待处理和已隔离提案上限。
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  提案正文大小的最大字节数。由于提案描述会出现在发现和列表输出中，
  因此其硬上限为 160 字节。
</ParamField>

## 符号链接的技能根目录

默认情况下，workspace、project-agent、extra-dir 和 bundled 的技能根目录都属于
内容边界。位于 `<workspace>/skills` 下、但解析后指向根目录之外的符号链接技能文件夹，
会被跳过并记录日志。

若要允许有意使用符号链接布局，请声明受信任目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

使用此配置后，`<workspace>/skills/manager -> ~/Projects/manager/skills`
在 realpath 解析后会被接受。`extraDirs` 会直接扫描同级仓库；
`allowSymlinkTargets` 则为现有布局保留符号链接路径。

Skill Workshop apply 默认不会通过这些符号链接写入。若要让
Workshop apply 修改已受信任的符号链接目标下的 skills，请单独启用：

```json5
{
  skills: {
    load: {
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    workshop: {
      allowSymlinkTargetWrites: true,
    },
  },
}
```

受管的 `~/.openclaw/skills` 和个人 `~/.agents/skills` 目录
已经接受 skill 目录的符号链接（但仍会应用按 skill 的 `SKILL.md` 约束）。

## 沙箱化技能与环境变量

<Warning>
  `skills.entries.<skill>.env` 和 `apiKey` 仅适用于**主机**运行。在沙箱内它们无效——
  依赖 `GEMINI_API_KEY` 的技能会因为 `apiKey 未配置` 而失败，除非沙箱单独提供了该变量。
</Warning>

将密钥传入 Docker 沙箱：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>
  拥有 Docker 守护进程访问权限的用户可以通过 Docker 元数据检查 `sandbox.docker.env` 的值。
  如果无法接受这种暴露方式，请使用挂载的密钥文件、自定义镜像或其他传递路径。
</Note>

## 加载顺序提醒

```text
workspace/skills      (最高)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (最低)
```

当启用 watcher 时，对技能和配置的更改会在下一次新会话时生效；当 watcher 检测到更改时，则会在下一次 agent 轮次生效。

## 相关内容

<CardGroup cols={2}>
  <Card title="Skills reference" href="/tools/skills" icon="puzzle-piece">
    技能是什么、加载顺序、门控以及 `SKILL.md` 格式。
  </Card>
  <Card title="Creating skills" href="/tools/creating-skills" icon="hammer">
    编写自定义工作区技能。
  </Card>
  <Card title="Skill Workshop" href="/tools/skill-workshop" icon="flask">
    agent 草拟技能的提案队列。
  </Card>
  <Card title="Slash commands" href="/tools/slash-commands" icon="terminal">
    原生斜杠命令目录和聊天指令。
  </Card>
</CardGroup>
