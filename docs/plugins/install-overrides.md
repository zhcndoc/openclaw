---
summary: "测试带安装时流程的打包插件覆盖"
read_when:
  - 测试针对本地打包插件的引导或设置流程
  - 在发布前验证插件包
  - 使用测试工件替换自动插件安装
title: "插件安装覆盖"
sidebarTitle: "安装覆盖"
---

插件安装覆盖允许维护者针对特定的 npm 包或本地 npm pack tarball 测试安装时插件安装。它们仅用于 E2E 和包验证。普通用户应使用
[`openclaw plugins install`](/cli/plugins) 安装插件。

<Warning>
覆盖会从你提供的源执行插件代码。仅在隔离的状态目录或可丢弃的测试机器上使用它们。
</Warning>

## 环境

除非同时设置了以下两个变量，否则覆盖会被禁用：

```bash
export OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1
export OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{
  "codex": "npm-pack:/tmp/openclaw-codex-2026.5.8.tgz",
  "openclaw-web-search": "npm:@openclaw/web-search@2026.5.8"
}'
```

覆盖映射是以插件 id 为键的 JSON。值支持：

- `npm:<registry-spec>` 用于注册表包以及精确版本或标签
- `npm-pack:<path.tgz>` 用于由 `npm pack` 生成的本地 tarball

相对的 `npm-pack:` 路径从当前工作目录解析。

## 行为

当某个安装时流程要求安装一个其 id 出现在映射中的插件时，
OpenClaw 会使用覆盖源，而不是目录、内置或默认的 npm 源。这适用于引导以及其他使用共享安装时插件安装器的流程。

覆盖仍然会强制执行预期的插件 id。映射到 `codex` 的 tarball
必须安装一个其清单 id 为 `codex` 的插件。

覆盖不会继承官方受信任源状态。即使目录条目通常代表
OpenClaw 拥有的包，覆盖也会被视为由操作者提供的测试输入。

工作区 `.env` 文件不能启用安装覆盖。请在可信的 shell、CI 作业或启动 OpenClaw 的远程测试命令中设置这些变量。

## 包 E2E

使用隔离的状态目录，以便包安装和安装记录不会影响
你正常的 OpenClaw 状态：

```bash
npm pack extensions/codex --pack-destination /tmp

OPENCLAW_STATE_DIR="$(mktemp -d)" \
OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1 \
OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{"codex":"npm-pack:/tmp/openclaw-codex-2026.5.8.tgz"}' \
pnpm openclaw onboard --mode local
```

在状态目录下验证已安装的包：

```bash
find "$OPENCLAW_STATE_DIR/npm/projects" -path '*/node_modules/@openclaw/codex/package.json' -print
grep -R '"@openclaw/codex"' "$OPENCLAW_STATE_DIR/npm/projects"/*/package-lock.json
```

对于实时提供方 E2E，在启动测试命令之前，请从可信 shell 或 CI 密钥中获取真实的 API 密钥。
不要打印密钥；只报告来源以及密钥是否存在。
