---
summary: "使用 `openclaw plugins init` 搭建、构建、验证和打包 OpenClaw 插件"
title: "作者插件"
read_when:
  - "您想要构建工具、功能或提供程序插件"
  - "您需要 `plugins build`、`validate` 或 `pack` 合约"
---

本页面涵盖了创作命令：`plugins init`、`plugins build`、`plugins validate` 和 `plugins pack`，以及它们生成的工具、功能和提供程序支架。

## <a id="author"></a> 作者

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` 默认创建一个最小的 TypeScript 工具插件。第一个参数是插件 id； `--name` 设置显示名称。 OpenClaw 使用 id 作为默认输出目录和包命名。工具脚手架使用 `defineToolPlugin` 并生成 `package.json` 脚本 `plugin:build` 和 `plugin:validate`，构建然后调用 `openclaw plugins build`/`validate`.

`plugins build` 导入构建的条目，读取其静态工具元数据，写入 `openclaw.plugin.json`，并保持 `package.json` 的 `openclaw.extensions` 对齐。 `plugins validate` 检查生成的清单、包元数据和当前条目导出是否仍然一致。通过 `--json` 即可获得机器可读的验证结果。请参阅 [Tool Plugins](/plugins/tool-plugins) 了解完整的创作工作流程。

脚手架会写入 TypeScript 源码，但会从构建后的 `./dist/index.js` 入口生成元数据，因此该流程也适用于已发布的 CLI。当前入口不是默认包入口时，请使用 `--entry <path>`。在 CI 中使用 `plugins build --check`，即可在生成元数据过期但未重写文件时使构建失败。

工具和提供者脚手架将 `src/index.ts` 及其导入的模块编译为 `dist`，将独立的测试文件保留在包之外。功能脚手架还在 TypeScript 检查中包含其单独的浏览器条目。所有脚手架均固定 TypeScript 7.0.2 并将 `rootDir` 设置为 `src`，将编译后的条目保留在 `dist/index.js`。

### <a id="feature-scaffold-and-artifacts"></a> 特征脚手架和工件

使用 `--type feature` 进行类型化后端操作、代理工具、本机页面和编写器替换。在生成的工程中运行`npm install`、`npm run build`、`npm run validate`。其浏览器源码声明于`package.json.openclaw.controlUi`； `plugins build` 编写不可变的捆绑资产及其清单声明。

插件 API 为 [experimental](/plugins/sdk-overview#api-stability)。要加载脚手架的本机浏览器UI，请启用**设置→实验室→自定义插件UI**，然后重新启动网关并重新加载浏览器。请参阅 [启用自定义插件 UI](/plugins/feature-plugins#enable-custom-plugin-ui)。

`plugins pack` 验证构建的项目，捆绑其后端依赖项，并编写包含已编译代码和 UI 的存档，而无需安装脚本或运行时包依赖项。 `--json` 返回其绝对路径、SHA-256 摘要和确切的 `plugin_activate_artifact` 请求。输出文件不能存在。项目根目录中的默认文件名是 `<plugin-id>.tgz`，对于范围 ID，`/` 替换为 `__`（例如，`@author__tools.tgz`）。使用 `--out` 选择另一条路径。打包遵循包的运行时条目选择（包括 `runtimeExtensions`），并单独捆绑声明的安装条目。 Source/runtime 条目路径被重写为存档中包含的已编译文件。请参阅 [ 功能插件](/plugins/feature-plugins) 以了解激活批准、重新加载、查看生命周期和恢复。

### <a id="provider-scaffold"></a> 提供方脚手架

```bash
openclaw plugins init acme-models --name "Acme Models" --type provider
cd acme-models
npm install
npm run build
npm test
npm run validate
```

提供程序脚手架创建一个通用的 OpenAI- 兼容模型提供程序插件，其中包含 API-key 身份验证管道、运行 `clawhub package validate` 的 `npm run validate` 脚本、ClawHub 包元数据以及手动调度的 GitHub 操作工作流程，以便通过 GitHub 进行未来可信发布OIDC。提供者脚手架不生成技能，也不使用`openclaw plugins build`/`validate`；这些命令用于工具支架的生成元数据路径。

发布前，请将占位的 API 基础 URL、模型目录、文档路由、凭证文本和 README 文案替换为真实的提供方信息。首次 ClawHub 发布和受信任发布者设置时，请使用生成的 README。
