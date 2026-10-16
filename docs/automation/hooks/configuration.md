---
summary: "选择和启用内部挂钩，以及网关如何跨源发现它们"
read_when:
  - "您正在启用内部挂钩或缩小加载范围"
  - "您需要目录挂钩的主开关和选择规则"
  - "您需要跨捆绑源、插件源、托管源、额外源和工作区源的发现优先级"
title: "钩子配置和发现"
---

启用和选择内部挂钩，以及网关如何跨源发现它们。 [Hooks](/automation/hooks) 指南的一部分。

## <a id="configuration"></a> 配置

对于可预测的选择，启用命名挂钩而不是打开广泛的发现：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "command-logger": { "enabled": true },
        "session-memory": { "enabled": false }
      }
    }
  }
}
```

目录加载钩子的主开关和选择规则是：

| 配置                                                                 | 选择                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks.internal.enabled: false`                                               | 内部挂钩已关闭。                                                                                                                     |
| 没有主标志，也没有启用的条目、额外的目录或跟踪的安装 | 网关跳过目录挂钩加载。                                                                                                       |
| 命名条目，主标志省略或为 true                               | 启用的名称形成白名单； `enabled: true`上主不拓宽它。没有 `enabled: false` 的条目贡献其名称。 |
| 主标志为 true，没有命名条目或命名安装                      | 合格挂钩的开放式发现。                                                                                                     |
| 跟踪钩子包声明钩子名称                                       | 这些名字加入了选择；显式的每个钩子 `enabled: false` 仍然会禁用非插件钩子。                                     |
| 非空 `load.extraDirs`，或没有挂钩名称列表的跟踪安装      | 开放式发现，而不是仅限于该目录或包的选择。                                                                 |

工作区挂钩始终需要 `entries.<hookKey>.enabled: true`，即使是开放式发现。对于其他文件挂钩，可以通过名称或 `hookKey` 选择条目，但在 `hookKey` 下读取设置。 CLI 解析名称并为您写入正确的密钥。添加第一个命名条目可以缩小之前广泛的选择范围；在更改之前检查现有的挂钩。

每个钩子条目接受任意处理程序定义的字段。核心类型 `enabled` 作为布尔值，`env` 作为字符串到字符串映射；它不验证自定义处理程序选项。例如：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_HOOK_LABEL": "example" }
        }
      }
    }
  }
}
```

每个挂钩 `env` 满足资格检查，但 **不会突变 `process.env`**。对于携带配置的事件，处理程序可以从 `event.context.cfg?.hooks?.internal?.entries?.["my-hook"]?.env` 读取它。其他事件不承诺 `cfg` 字段。不要记录整个配置对象或将机密放入示例中。

<Warning>
`hooks.internal.handlers` 已停用并且无法正常配置验证。在运行 `openclaw doctor --fix` 之前，使用 `HOOK.md` 和处理程序将每个注册模块迁移到托管或工作区挂钩目录中。医生删除旧的登记；它不创建可执行文件。对于 `hooks.internal.enabled: true` 的仅旧版配置，它还会删除该标志以避免广泛发现。命名条目、非空额外目录和显式 `enabled: false` 均被保留。
</Warning>

## <a id="hook-discovery"></a> 钩子发现

目录发现使用以下规则按 **name** 合并挂钩：

| 来源            | 位置和碰撞行为                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 捆绑式           | 与 OpenClaw 一起发货。                                                                                                                                                  |
| 插件            | 挂钩由活动插件声明的目录；可以替换捆绑的名称。                                                                                                 |
| 托管           | `<stateDir>/hooks/`，正常为`~/.openclaw/hooks/`；可以替换捆绑名称和插件名称。                                                                               |
| 额外目录 | `hooks.internal.load.extraDirs`；与托管挂钩相同的源策略。后来的额外目录胜过早期的目录；托管目录胜过额外目录。 |
| 工作空间         | `<workspace>/hooks/`；可以添加名称，但不能替换捆绑名称、插件名称或托管名称。需要明确选择加入。                                                     |

捆绑、托管、工作区和插件挂钩位置是集合目录：发现检查其直接子级是否有 `package.json` 声明 `openclaw.hooks` 的挂钩或包。

每个显式 `hooks.internal.load.extraDirs` 路径都可以是包根、单钩子根或集合目录。包根仅加载其声明的钩子路径，包括嵌套路径，例如 `./hooks/my-hook`。每条路径必须直接指向一个钩子；发现不会递归到另一个包或集合中。没有有效挂钩的已识别包保持空状态，而不是扫描未列出的子项。单钩子根加载自己的 `HOOK.md` 和处理程序。只有普通的集合根才能进行直接子扫描。

例如，要直接选择 `/opt/openclaw-hook-library/my-hook/HOOK.md`，请添加该挂钩的目录：

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/opt/openclaw-hook-library/my-hook"]
      }
    }
  }
}
```

要扫描库的直接子级，请添加 `/opt/openclaw-hook-library`。仅添加受信任的目录：任何额外路径都会在指定条目之外的发现源中打开钩子名称选择，即使该路径选择单个钩子或包也是如此。处理程序文件必须保留在其挂钩目录中；包和插件挂钩路径必须保留在其包根目录中。逃离这些边界的符号链接将被拒绝。挂钩配置和选定工作空间更改在 `hybrid` 模式下重新加载发现，包括由新的挂钩包安装或链接编写的配置。不监视 Hook 文件和元数据；编辑它们或更新现有的挂钩代码后重新启动，然后验证处理程序的实际副作用。

### <a id="hook-packs"></a> Hook 包

钩子包是一个包，其 `package.json` 在 `openclaw.hooks` 中声明了钩子目录。通过统一安装程序安装经过审核的包或本地目录：

```bash
openclaw plugins install <path-or-spec>
```

安装和更新标志、npm 限制、链接根行为和信任以及已弃用的 `hooks install` / `hooks update` 别名记录在 [Install 和 update hook packs](/cli/hooks#install-and-update-hook-packs) 中。
