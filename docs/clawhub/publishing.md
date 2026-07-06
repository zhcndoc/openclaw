---
summary: "ClawHub 如何为技能、插件、所有者、作用域、发布和审查进行发布。"
read_when:
  - 发布技能或插件时
  - 调试所有者或包作用域错误时
  - 添加发布 UI、CLI 或后端行为时
---

# 在 ClawHub 上发布

ClawHub 发布是按所有者作用域进行的：每次发布都指向一个发布者，服务器会决定已登录用户是否可以在那里发布。

## 所有者

所有者是一个 ClawHub 发布者句柄，例如 `@alice` 或 `@openclaw`。
每个用户都会获得一个个人所有者；组织所有者可以拥有多个成员，且成员具有
`owner`、`admin` 或 `publisher` 角色。

当你发布时，你使用的是你的个人所有者，或者你具有
发布者访问权限的组织所有者。

## 技能

技能从技能文件夹发布（`clawhub skill publish <path>`）。公开页面为：

```text
https://clawhub.ai/<owner>/<slug>
```

示例：

```text
https://clawhub.ai/alice/review-helper
```

发布请求包含所选的所有者、slug、版本、更新日志和文件。服务器会在创建发布之前验证该执行者是否可以以该所有者的身份进行发布。

## 插件

插件使用类似 npm 的包名（`clawhub package publish <source>`）。
带作用域的名称会在第一个路径段中包含所有者：

```text
@owner/package-name
```

作用域必须与所选的发布所有者匹配。名为
`@openclaw/dronzer` 的包只能以 `@openclaw` 的名义发布。若要以
`@vintageayu` 发布，请将包重命名为 `@vintageayu/dronzer`。

这样可以防止某个包冒充发布者并未控制的组织命名空间。

## 发布流程

1. UI、CLI 或 GitHub 工作流收集包元数据和文件。
2. 发布请求连同所选所有者一起发送到 ClawHub。
3. 服务器验证所有者权限、包作用域、包名、
   版本、文件限制和源元数据。验证失败意味着不会创建
   发布。
4. ClawHub 存储发布并启动自动化安全检查。
5. 在审查和验证完成之前，发布会对常规安装/下载入口保持隐藏。

## 常见问题

### 包作用域必须与所选所有者匹配

如果包作用域和所选所有者不匹配，ClawHub 会拒绝该发布：

```text
包作用域 "@openclaw" 必须与所选所有者 "@vintageayu" 匹配。
请以 "@openclaw" 发布，或者将此包重命名为 "@vintageayu/dronzer"。
```

可通过以下任一方式修复：以作用域中命名的所有者身份发布，或者将包重命名为与你可以发布的所有者匹配的作用域。

如果包已经具有正确的作用域，但拥有它的发布者不正确，则应改为转移它：

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

包转移需要对当前所有者和目标发布者都具有管理员访问权限；它不允许你向自己无权控制的作用域发布。这与命名空间保护是相同的原理：名为 `@openclaw/dronzer` 的包声明了 `@openclaw` 命名空间，因此只有拥有 `@openclaw` 访问权限的发布者才能向其中发布或转移。
