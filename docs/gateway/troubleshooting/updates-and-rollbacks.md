---
summary: "网关更新、回滚或裂脑安装后出现的症状"
title: "更新和回滚"
sidebarTitle: "更新和回滚"
read_when:
  - "更新完成但网关已关闭、通道为空或模型调用返回 401"
  - "日志报告协议不匹配、较新的配置防护或准备好的模型运行时超时"
  - "您需要区分版本漂移问题和运行时错误"
---

## <a id="after-an-update"></a> 更新后

当更新完成但网关已关闭、通道为空或模型调用失败并显示 401 时使用。

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

查看以下内容：

- `Update restart` 位于 `openclaw status` / `openclaw status --all` 中。待处理或失败的切换包括下一个要运行的命令。
- Channels 下的 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`：通道配置仍然存在，但插件在通道加载之前注册失败。
- 重新身份验证后的 Provider 401：`openclaw doctor --fix` 检查过时的每个代理 OAuth 身份验证影子并删除旧副本，以便所有代理解析当前共享配置文件。

## <a id="prepared-model-runtime-publication-timeout"></a> 准备模型运行时发布超时

如果启动报告 `prepared model runtime publication (...) timed out`，则括号内的详细信息会标识待处理阶段以及工作区准备期间的代理。收集该错误以及 `openclaw gateway status --deep` 和启动日志。

即使网关进程使用很少的 CPU，`ambient credentials` 阶段也可以等待插件的外部登录检查。对于Claude CLI，以相同环境的网关用户运行`claude auth status --json`。 Startup 在工作区之间共享此检查；大型名册不应为每个代理启动一个本机登录子进程。仅成功的 `/health` 响应并不能确定模型运行时发布已完成。

## <a id="split-brain-installs-and-newer-config-guard"></a> 分裂脑安装与较新配置保护

当网关服务在更新后意外停止，或者日志显示某个 `openclaw` 二进制版本比最后写入 `openclaw.json` 的版本更旧时使用。

OpenClaw 用 `meta.lastTouchedVersion` 标记配置写入。只读命令可以检查由较新的 OpenClaw 编写的配置，但进程和服务突变拒绝从较旧的二进制文件运行。阻止的操作：网关服务 start/stop/restart/uninstall、强制服务重新安装、服务模式网关启动和 `gateway --force` 端口清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step id="fix-path" title="修复 PATH">
    修复 `PATH`，让 `openclaw` 指向较新的安装，然后重新运行该操作。
  </Step>
  <Step id="reinstall-the-gateway-service" title="重新安装网关服务">
    从较新的安装中重新安装预期的网关服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step id="remove-stale-wrappers" title="去除陈旧的包装纸">
    移除仍然指向旧 `openclaw` 二进制的过期系统包或旧包装器条目。
  </Step>
</Steps>

<Warning>
如需有意降级，请遵循 [Downgrade](/install/updating#downgrade)。使用托管兼容性检查或将已验证的更新前备份还原为其匹配版本。请勿删除 `meta.lastTouchedVersion` 或覆盖防护以针对迁移状态运行旧代码。
</Warning>

## <a id="protocol-mismatch-after-rollback"></a> 回滚后协议不匹配

当降级或回滚后日志持续打印 `protocol mismatch` 时使用。此时运行的是较旧的 Gateway，但某个较新的本地客户端进程仍在以较旧 Gateway 无法支持的协议范围重新连接。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

查看以下内容：

- Gateway 日志中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:` 或 `openclaw doctor --deep` 中的 `Gateway clients`：连接到网关端口的活动 TCP 客户端，在 OS 允许的情况下使用 PID 和命令行。
- 命令行指向你回滚前的较新 OpenClaw 安装或包装器的客户端进程。

使固定：

1. 停止或重启 `gateway status --deep` 中显示的那个失效的 OpenClaw 客户端进程。
2. 重启嵌入 OpenClaw 的应用或包装器：本地仪表盘、编辑器、应用服务器辅助进程，或长期运行的 `openclaw logs --follow` shell。
3. 重新运行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，确认失效客户端的 PID 已消失。

不要让较旧的网关接受较新的不兼容协议。协议碰撞可以保护电汇合约；回滚恢复是一个 process/version 清理问题。
