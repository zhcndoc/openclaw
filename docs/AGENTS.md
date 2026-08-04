# Docs Guide

This directory owns docs authoring, Mintlify link rules, and docs i18n policy.

## Mintlify Rules

- Docs are hosted on Mintlify (`https://docs.openclaw.ai`).
- Internal doc links in `docs/**/*.md` must stay root-relative with no `.md` or `.mdx` suffix (example: `[Config](/gateway/configuration)`).
- Section cross-references should use anchors on root-relative paths (example: `[Hooks](/gateway/configuration-reference#hooks)`).
- Doc headings should avoid em dashes and apostrophes because Mintlify anchor generation is brittle there.
- README and other GitHub-rendered docs should keep absolute docs URLs so links work outside Mintlify.
- Docs content must stay generic: no personal device names, hostnames, or local paths; use placeholders like `user@gateway-host`.

## Docs Content Rules

- For docs, UI copy, and picker lists, order services/providers alphabetically unless the section is explicitly describing runtime order or auto-detection order.
- Keep bundled plugin naming consistent with the repo-wide plugin terminology rules in the root `AGENTS.md`.
- Generated docs, never hand-edit: `docs/plugins/reference/**`, `docs/plugins/reference.md`, and `docs/plugins/plugin-inventory.md` come from `pnpm plugins:inventory:gen`; `docs/maturity/**` from `pnpm maturity:render`.
- The public and packaged docs map is generated from `pnpm docs:list --headings` during publishing and packaging. Keep only the small source stub at `docs/docs_map.md`; never commit the expanded heading mirror.

## Internal Docs

- Long-lived private operator docs belong in `~/Projects/manager/docs/`.
- Repo-local internal scratch/mirror docs may live under ignored `docs/internal/`.
- Never add `docs/internal/**` pages to `docs/docs.json` navigation or link them from public docs.
- `scripts/docs-sync-publish.mjs` excludes and prunes `docs/internal/**` from the public `openclaw/docs` publish repo if a page is force-added later.
- Internal docs may mention repo paths, private app names, 1Password item names, and runbooks, but never include secret values.

## Maturity Scorecard Editing

`taxonomy.yaml` and `qa/maturity-scores.yaml` are the source inputs; generated maturity docs under `docs/maturity/` are projections and should not be hand-edited for score, LTS, taxonomy, QA profile, or evidence tables.
`scripts/qa/render-maturity-docs.ts` owns generation; use `pnpm maturity:render` to refresh committed docs and `pnpm maturity:check` to verify them.
`.github/workflows/maturity-scorecard.yml` renders artifact previews and can open generated-doc PRs; `.github/workflows/openclaw-release-checks.yml` dispatches it for release QA.
Keep deterministic `qa-evidence.json.scorecard` data in GitHub Actions artifacts unless a maintainer explicitly asks for a sanitized committed projection.
Human overrides must change source state in a PR and explain the reason plus public or redacted evidence.

## Docs i18n

- 本仓库不维护外语文档。生成后的发布输出位于单独的 `openclaw/docs` 仓库中（通常会在本地克隆为 `../openclaw-docs`）。
- 不要在这里的 `docs/<locale>/**` 下新增或编辑本地化文档。
- 将本仓库中的英文文档以及术语表文件视为真实来源。
- 流程：先在这里更新英文文档，按需更新 `docs/.i18n/glossary.<locale>.json`，然后让发布仓库同步，并在 `openclaw/docs` 中运行 `scripts/docs-i18n`。
- 在重新运行 `scripts/docs-i18n` 之前，为任何新的技术术语、页面标题或简短导航标签添加术语表条目，这些内容必须保持英文或使用固定翻译。
- `pnpm docs:check-i18n-glossary` 用于检查已更改的英文文档标题和简短内部文档标签。
- 翻译记忆位于发布仓库中生成的 `docs/.i18n/*.tm.jsonl` 文件里。
- 参见 `docs/.i18n/README.md`。
