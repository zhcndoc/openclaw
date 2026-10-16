---
summary: "Pointer to the generated OpenClaw plugin reference pages"
read_when:
  - 你需要某个特定 OpenClaw 插件的参考页面
  - 你正在审计插件文档覆盖情况
title: "插件参考"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. -->

This section holds one reference page for each OpenClaw plugin. Each page states
the package, the install route, and the surface the plugin adds.

This page is a pointer, not the index. The browsable list of all
169 generated plugin reference pages lives in
[Plugin inventory](/plugins/plugin-inventory), sorted by distribution, package,
and description.

## How this page is built

OpenClaw generates this page from the top-level
`extensions/*/openclaw.plugin.json` manifests. Package metadata enriches
entries when `package.json` is present. Regenerate the page with:

```bash
pnpm plugins:inventory:gen
```
