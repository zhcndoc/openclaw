---
summary: "工厂形式的语音、转录和语音注册以及计算机使用提供商"
title: "插件 SDK 原生提供商工厂"
sidebarTitle: "本地提供商"
read_when:
  - "您正在注册语音、转录或实时语音提供商"
  - "您正在构建一个节点本地计算机使用插件"
---

本机提供程序的工厂形式注册以及节点本地计算机使用提供程序表面。 [插件入口点的部分参考](/plugins/sdk-entrypoints)。

## <a id="native-provider-factories"></a> 本地提供商工厂

`registerSpeechProvider`、`registerRealtimeTranscriptionProvider` 和 `registerRealtimeVoiceProvider` 接受完整的提供者描述符或接收 `PluginCapabilityCatalogContext` 的同步工厂：

```typescript
register(api) {
  api.registerRealtimeTranscriptionProvider((context) =>
    buildRealtimeTranscriptionProvider(context),
  );
}
```

使用相同的插件拥有的工厂进行完整注册和可选的功能目录。主机提供本机身份验证、请求和传输操作；构造描述符不应加载执行 SDK 桶、读取凭据或启动会话。将这项工作保留在描述符的方法中。工厂必须同步返工；抛出的错误或承诺失败注册。

完全注册可以在工厂关闭时绑定自己的broker或logger。不要用仅目录描述符替换需要这些绑定的描述符。完整的插件注册仍然拥有harnesses、hooks、services和生命周期回调；目录条目本身并不能建立运行时准备状态。

仍然支持对象注册。在发布使用工厂参数的插件之前，请将其 `compat.pluginApi` 下限设置为支持它们的主机版本；较低的 `minHostVersion` 不会覆盖 API 要求。

## <a id="computer-use-providers"></a> 计算机使用提供商

**进口：** `openclaw/plugin-sdk/computer-use`

Node-本地计算机使用插件通过`registerComputerUseProvider(api, provider)`注册一个提供商。助手拥有`screen.snapshot`和危险`computer.act`命令注册以及匹配的网关调用策略；提供者拥有可用性、执行、序列化、帧状态、驱动程序生命周期和清理。

`capabilities()` 是同步声明读取。使其不受驱动程序获取和本机可用性探测的影响：网关工具发现会在准备桌面之前读取它。在注册提供者的生命周期内保持其提供者生成稳定；特定于执行的帧生成仍然由驱动程序拥有。使用 `prepare`、`isAvailable` 和 `openExecution` 实现运行时准备和资源所有权。

同一入口点导出两个命令负载和快照结果的共享 TypeBox 架构、静态类型和编译验证器。节点主机接受命令对的一个提供者；注册另一个提供程序与现有命令注册冲突，而不是创建后备堆栈。
