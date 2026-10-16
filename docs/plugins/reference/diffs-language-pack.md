---
summary: "为默认 diffs 查看器语言集之外的语言添加语法高亮。"
read_when:
  - You are installing, configuring, or auditing the diffs-language-pack plugin
title: "Diffs Language Pack plugin reference"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. Hand-written text survives only
between the openclaw-plugin-reference:manual-start and
openclaw-plugin-reference:manual-end comment markers. -->

为默认 diffs 查看器语言集之外的语言添加语法高亮。

## 分发

- Package: `@openclaw/diffs-language-pack`
- Install route: npm or ClawHub: `clawhub:@openclaw/diffs-language-pack`

## 表面

This plugin declares no channels, providers, commands, or contracts.

## 新增语言

基础 `diffs` 插件已经为 [Diffs](/tools/diffs) 中记录的常见语言提供高亮。若你希望为更广泛的、Shiki 支持的语言集提供语法高亮，请安装此语言包。如果未安装该语言包，这些文件仍会以可读的纯文本形式渲染。

示例包括 Astro、Vue、Svelte、MDX、GraphQL、Terraform/HCL、Nix、Clojure、Elixir、Haskell、OCaml、Scala、Zig、Solidity、Verilog/VHDL、Fortran、MATLAB、LaTeX、Mermaid、Sass/Less/SCSS、Nginx、Apache、CSV、dotenv、INI 和 diff 文件。

Examples include:

- Astro
- Vue
- Svelte
- MDX
- GraphQL
- Terraform/HCL
- Nix
- Clojure
- Elixir
- Haskell
- OCaml
- Scala
- Zig
- Solidity
- Verilog/VHDL
- Fortran
- MATLAB
- LaTeX
- Mermaid
- Sass/Less/SCSS
- Nginx
- Apache
- CSV
- dotenv
- INI
- diff files

See [Shiki languages](https://shiki.style/languages) for Shiki's upstream language and alias catalog.

<!-- openclaw-plugin-reference:manual-end -->
