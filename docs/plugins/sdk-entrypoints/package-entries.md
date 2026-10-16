---
summary: "package.json openclaw 源代码和运行时输入字段及其解析顺序"
title: "插件 SDK 包条目"
sidebarTitle: "包裹条目"
read_when:
  - "您正在声明扩展、setupEntry 或其运行时对等项"
  - "您需要内置 JavaScript 对等解析命令"
---

安装的插件如何将 `package.json` 指向源和构建的条目，以及 OpenClaw 的顺序解析它们。[ 插件入口的一部分指向 ](/plugins/sdk-entrypoints) 参考。

## <a id="package-entries"></a> 包条目

已安装的插件会将 `package.json` 中的 `openclaw` 字段指向源条目和构建后的条目：

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

- `extensions` 和 `setupEntry` 是源条目，用于工作区和 git 检出开发。
- `runtimeExtensions` 和 `runtimeSetupEntry` 选择构建的条目而不是相应的源条目。
- `runtimeExtensions` 在存在时，数组长度必须与 `extensions` 一致 （条目按位置配对）。`runtimeSetupEntry` 需要 `setupEntry`。
- 如果声明了 `runtimeExtensions`/`runtimeSetupEntry` 工件但缺失，则安装失败并且发现报告该条目的打包错误； OpenClaw 不会默默地回溯到源。
- 如果没有显式运行时条目，则通过 `plugins.load.paths` 或全局根的包发现首先在 `dist/` 下查找匹配的 JavaScript 对等点，然后在 TypeScript 源条目旁边查找。对于 `src/` 条目，它检查展平的 `dist/` 输出和保留 `dist/src/` 的输出。在每个位置，`.mts` 优先选择 `.mjs`，`.cts` 优先选择 `.cjs`； `.ts` 和 `.tsx` 尝试 `.js`、`.mjs`，然后是 `.cjs`。安装、发现、设置、运行时加载和已发布的包验证​​使用相同的候选顺序。
- 在主机自己的捆绑插件树中解析的 A `plugins.load.paths` 条目被发现为该捆绑插件，因此无论编译输出是否存在于源旁边，它都会保留捆绑入口点和捆绑来源。选择捆绑插件自己的路径永远不会对其进行重新分类。
- Package 安装和托管安装包发现需要 TypeScript 扩展和安装条目的编译输出。缺少编译输出是打包错误，而不是回退到 TypeScript 的原因。
- 当未声明运行时条目时，受信任的 local/source 开发路径可以使用 TypeScript。其中包括工作区插件、显式本地加载路径、未跟踪的本地插件目录和链接的源签出。工作区发现保留源条目，而不是推断构建的对等点。
- 所有条目路径都必须保留在插件包目录内。运行时条目和推断出的构建后 JS 同级文件不会使越界的 `extensions` 或 `setupEntry` 源路径变得有效。
