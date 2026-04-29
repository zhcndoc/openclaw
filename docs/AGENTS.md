# 文档指南

此目录负责文档编写、Mintlify 链接规则以及文档 i18n 策略。

## Mintlify 规则

- 文档托管在 Mintlify 上（`https://docs.openclaw.ai`）。
- `docs/**/*.md` 中的内部文档链接必须保持根相对路径，且不带 `.md` 或 `.mdx` 后缀（例如：`[Config](/gateway/configuration)`）。
- 章节交叉引用应使用根相对路径上的锚点（例如：`[Hooks](/gateway/configuration-reference#hooks)`）。
- 文档标题应避免使用长破折号和撇号，因为 Mintlify 的锚点生成在这些情况下不够稳定。
- README 和其他 GitHub 渲染的文档应保留绝对文档 URL，这样链接在 Mintlify 之外也能正常工作。
- 文档内容必须保持通用：不要使用个人设备名称、主机名或本地路径；请使用占位符，例如 `user@gateway-host`。

## 文档内容规则

- 对于文档、UI 文案和选择器列表，服务/提供者应按字母顺序排序，除非该部分明确描述的是运行时顺序或自动检测顺序。
- 捆绑插件命名应与根目录 `AGENTS.md` 中的仓库级插件术语规则保持一致。

## 文档 i18n

- 本仓库不维护外语文档。生成后的发布输出位于单独的 `openclaw/docs` 仓库中（通常会在本地克隆为 `../openclaw-docs`）。
- 不要在这里的 `docs/<locale>/**` 下新增或编辑本地化文档。
- 将本仓库中的英文文档以及术语表文件视为真实来源。
- 流程：先在这里更新英文文档，按需更新 `docs/.i18n/glossary.<locale>.json`，然后让发布仓库同步，并在 `openclaw/docs` 中运行 `scripts/docs-i18n`。
- 在重新运行 `scripts/docs-i18n` 之前，为任何新的技术术语、页面标题或简短导航标签添加术语表条目，这些内容必须保持英文或使用固定翻译。
- `pnpm docs:check-i18n-glossary` 用于检查已更改的英文文档标题和简短内部文档标签。
- 翻译记忆位于发布仓库中生成的 `docs/.i18n/*.tm.jsonl` 文件里。
- 参见 `docs/.i18n/README.md`。
