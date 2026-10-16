---
summary: "使用经过验证的 ONNX 分类器在本地运行类型化决策"
title: "本地 ONNX 决策模型"
read_when:
  - "您想要一个没有托管 API 的本地决策模型"
  - "您正在安装或检查 ONNX 模型工件"
---

# <a id="local-onnx-decision-models"></a> 本地ONNX决定模型

可安装的 **ONNX** 插件通过 [ 决策模型 API](/plugins/sdk-overview/capabilities#decision-models-contract-version-1) 在本地运行分类器。它使用单独的、持久的 Node 进程和 ONNX 运行时的 CPU 后端。推理不会将状态或问题发送到远程服务。仅当您显式运行下载命令时才会下载模型。

有关模型角色、标题示例和提供商中立插件 API，请参阅 [ 决策模型](/concepts/decision-models)。

## <a id="setup"></a> 设置

决策提供者 API 在发布 OpenClaw `2026.9.5` 后添加。打包的 ONNX 安装需要至少 `2026.9.6` 的主机和插件 API；安装程序在加载插件之前拒绝 `2026.9.5`。本机运行时属于插件包，不捆绑到核心中。

### <a id="current-development-checkout"></a> 当前开发结账

在支持版本可用之前，请使用包含决策提供程序 API 和 `extensions/onnx` 的 OpenClaw 源签出。使用 `pnpm install --frozen-lockfile` 和 `pnpm build` 构建该结帐，然后启用插件并使用以下配置选择其模型。从结帐运行命令：

```sh
pnpm openclaw onnx models
pnpm openclaw onnx download gliclass-edge-v3.0
pnpm openclaw onnx probe gliclass-edge-v3.0
```

checkout 的同版本源插件使用主机的开发 API。这不会使打包的插件与已发布的 `2026.9.5` 主机兼容。

### <a id="packaged-installation"></a> 打包安装

在兼容的主机上，安装本地构建的包并准备模型：

```sh
openclaw plugins install npm-pack:/path/to/openclaw-onnx.tgz
openclaw onnx models
openclaw onnx download gliclass-edge-v3.0
openclaw onnx probe gliclass-edge-v3.0
```

### <a id="configuration"></a> 配置

选择全局或一个代理的角色：

```json5
{
  agents: {
    defaults: { decisionModel: "onnx/gliclass-edge-v3.0" },
  },
  plugins: {
    entries: {
      onnx: {
        enabled: true,
        config: { threads: 2, maxLoadedModels: 2 },
      },
    },
  },
}
```

默认工件目录是 `<stateDir>/models/onnx`。设置插件的`modelDir`使用其他目录； `download`、`verify` 和 `probe` 命令也接受 `--model-dir <path>`。工件按模型 ID 分组。下载使用固定存储库修订版、大小和 SHA256 哈希值。现有的不匹配文件将被拒绝而不是被覆盖。 `openclaw onnx verify <model>` 检查安装。验证和缓存下载检查流式传输文件，因此检查大图不需要图大小的内存缓冲区。推理仍然将经过验证的图形字节加载到其工作线程中。

## <a id="models"></a> 模型

| 模型 ID                        | 来源                                         | 准备  |
| ------------------------------- | ---------------------------------------------- | ------------ |
| `deberta-v3-base-zeroshot-v2.0` | Moritz Laurer 的官方 ONNX 出口           | `download`   |
| `gliclass-base-v3.0`            | Knowledgator模型，cnmoro ONNX转换     | `download`   |
| `gliclass-edge-v3.0`            | Knowledgator模型，cnmoro ONNX转换     | `download`   |
| `gliclass-instruct-base-v1.0`   | 知识者模型                             | 本地出口 |
| `gliclass-instruct-edge-v1.0`   | 知识者模型                             | 本地出口 |
| `gliner2.5-base-v1`             | Fastino模型，nicolasmbleton ONNX转换 | `download`   |
| `gliner2.5-small-v1`            | Fastino模型，nicolasmbleton ONNX转换 | `download`   |

托管预设使用 FP32 图表。模型许可证和转换源从原始 [GLiClass](https://github.com/Knowledgator/GLiClass)、[GLiNER2](https://github.com/fastino-ai/GLiNER2) 和 [DeBERTa model](https://huggingface.co/MoritzLaurer/deberta-v3-base-zeroshot-v2.0) 页面链接。下载的权重与 OpenClaw 的包分开。

对于 Instruct 模型，请将已安装插件的 `dist/scripts/export-gliclass-instruct.py` 帮助程序与 `--help` 列出的固定 Python 包一起使用。提供由 `openclaw onnx models` 打印的确切官方检查点修订版的本地副本：

```sh
python export-gliclass-instruct.py --model edge \
  --source /path/to/checkpoint \
  --output /path/to/models/gliclass-instruct-edge-v1.0
openclaw onnx verify gliclass-instruct-edge-v1.0 --model-dir /path/to/models
```

帮助程序验证源文件，无需远程模型代码或下载即可运行，并创建一个包含图形、标记生成器和 `model.json` 导出清单的新目录。本地导出是操作员提供的工件：运行时检查其声明的源版本和文件哈希值。他们的图哈希不是已发布的第三方证明。此导出不支持少数镜头示例部分。

## <a id="question-semantics"></a> 问题语义

这些模型根据标题对文本进行分类。 JSON 状态和标题条目被序列化为文本；说明和标准描述条件分类。尽可能使用描述性标准而不是不透明的 ID。

- **选择：** 对模型的完整标签 logits 进行 softmax；概率最高的标签获胜。
- **Score：** 对有序标准级别进行分类，然后返回其期望的从零开始的索引。
- **Boolean：** 提供 `criteria.true` 和 `criteria.false` 作为有意义的谓词描述。不支持纯布尔问题，因为 `true` 和 `false` 等标签不能可靠地表达零样本谓词。

概率是模型估计，而不是校准保证。这些分类器在每个推理任务上都不能与 Jev 互换。在依赖其决策质量之前，先在代表性示例上验证该标题。

该插件最多支持 32 个问题，每个问题有 64 个标签，整个批次中编译输入的限制为 1-MiB。每个编码输入（包括其标题）必须适合 512 个标记。它拒绝不支持的输入而不是截断它。 GLiClass 保留其标签、分隔符和示例标记。 GLiNER2.5 还拒绝规则中模式的保留标记和括号；普通状态文本可以包含标点符号。

## <a id="lifecycle-and-runtime"></a> 生命周期和运行时

在插件服务启动期间，最多 `maxLoadedModels` 选定的模型会预热。稍后的请求重用本机会话；当常驻缓存已满时，将逐出最近最少使用的模型。丢失的文件和失败的工件完整性检查使热会话保持可用。驱逐发生在工件验证和标记器准备之后、加载替换本机会话之前。 `threads` 将 CPU 操作内并行度从 1 设置为 8。

冷加载大型模型可能会耗尽较慢机器上请求的最后期限。主机允许最多30秒；消费者可以要求更少。当代理使用多个模型时，如果内存允许，请设置 `maxLoadedModels` 以保存活动模型，或选择较小的模型。默认缓存保存两个模型；最多为 5 个。

主办方仍然执行 30 秒决策期限和四次呼叫提供商限制。工作线程序列化本机操作。排队取消会使热进程保持不变；取消活动的本机工作会在释放请求之前终止并加入该进程。下一个实时请求会启动一个新的工作人员。插件退休会停止工作人员及其拥有的工作。

运行时需要支持的 Node.js 和可选的 `onnxruntime-node` 本机包。 CPU 推理是初始后端；此插件未启用 GPU 和 WASM 执行。本机库和模型标记器加载在工作人员内部，使它们远离网关发现和普通插件注册。
