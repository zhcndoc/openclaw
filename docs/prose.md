---
title: "OpenProse 删除和迁移"
sidebarTitle: "OpenProse 迁移"
summary: "OpenClaw 不再捆绑 OpenProse 或 /prose 命令。移至维护的上游代理技能并清理过时的插件配置。"
read_when:
  - "您使用了捆绑的 OpenProse 插件或 /prose 命令"
  - "升级 OpenClaw 后需要清理 OpenProse 配置"
  - "您想要安装维护的上游 OpenProse 代理技能"
---

OpenClaw 不再捆绑 OpenProse 插件或其 `/prose` 命令。 v2026.8.1 版本删除了两者。 OpenProse 继续作为维护的上游代理技能。现有的 `.prose` 源文件仍然属于您；删除的插件未将状态存储在 OpenClaw 的 SQLite 数据库中。

## <a id="migrate"></a> 迁移

1. Clean 过时的捆绑插件配置：

   ```bash
   openclaw doctor --fix
   ```

   Doctor 从插件允许列表、拒绝列表和插件条目中删除 `open-prose`。不需要 OpenClaw 数据库迁移。

2. 从工作区根目录安装上游技能：

   ```bash
   npx skills add openprose/prose --skill open-prose --agent codex --copy -y
   ```

   `skills` 是来自 npm 的第三方 CLI，而不是 OpenClaw 命令。保留 `--agent codex`：该值写入共享的 `.agents/skills` 布局，即使该标志指定了另一个代理，OpenClaw 也会读取该布局。

   该命令将技能复制到 `.agents/skills/open-prose`，OpenClaw 将其作为项目代理技能加载。它不会恢复已删除的捆绑插件或 `/prose` 命令。

3. 如果您要升级较旧的 OpenProse 源，请在工作区中启动新的 OpenClaw 代理会话并发送：

   ```text
   prose upgrade --dry-run
   ```

   这是一个代理技能命令，而不是 shell 可执行文件。查看计划，然后在同一会话中发送 `prose upgrade`。上游升级不会迁移旧的运行时分类帐或状态，因此请保留源文件并从干净的状态目录开始。

## <a id="related"></a> 相关内容

- [技能](/tools/skills)
- [斜杠命令](/tools/slash-commands)
- [龙虾工作流程](/tools/lobster)
- [OpenProse上游](https://github.com/openprose/prose)
