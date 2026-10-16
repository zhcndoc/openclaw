---
summary: "每个收件人的 Matrix 推送规则：用于静默最终版预览编辑"
read_when:
  - "为自托管 Synapse 或 Tuwunel 配置 Matrix 静默流式传输"
  - "用户只希望在块完成后收到通知，而不是每次预览编辑都通知"
title: "Matrix 静默预览推送规则"
---

当 `channels.matrix.streaming.mode` 为 `"quiet"` 时，OpenClaw 会通过就地编辑单个预览事件来流式传输回复。预览会以不触发通知的 `m.notice` 事件发送，而最终完成的编辑会被标记为 `content["com.openclaw.finalized_preview"] = true`。只有当按用户设置的推送规则匹配到该标记时，Matrix 客户端才会在这次最终编辑时通知用户。本文档面向自托管 Matrix 的运维人员，帮助他们为每个收件人账户安装这条规则。

`streaming.mode: "progress"` 也会通过同一路径完成其草稿，因此同样的规则也会对 progress 模式下的最终编辑生效。

如果您只需要库存 Matrix 通知行为，请使用 `streaming.mode: "partial"` 或关闭流式传输。请参见 [ 矩阵消息行为 ](/channels/matrix/messaging#streaming-previews)。

## <a id="prerequisites"></a> 先决条件

- recipient user = 应接收通知的人
- bot user = 发送回复的 OpenClaw Matrix 账户
- 对下面的 API 调用使用接收者用户的访问令牌
- 将 push rule 中的 `sender` 与 bot 用户的完整 MXID 匹配
- 接收者帐户必须已经有工作推送程序。仅当正常的 Matrix 推送传递正常时，安静预览规则才有效

## <a id="steps"></a> 步骤

<Steps>
  <Step id="configure-quiet-previews" title="配置安静预览">

```json5
{
  channels: {
    matrix: {
      streaming: { mode: "quiet" },
    },
  },
}
```

  </Step>

  <Step id="get-the-recipients-access-token" title="获取收件人的访问令牌">
    尽可能复用现有的客户端会话令牌。如需生成一个新的：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

    将 `https://matrix.example.org` 替换为您的家庭服务器基础 URL，将 `@alice:example.org` 替换为收件人的 MXID。将响应中的 `access_token` 导出为 `USER_ACCESS_TOKEN`；其余步骤如下：

```bash
export USER_ACCESS_TOKEN="<access_token from the login response>"
```

  </Step>

  <Step id="verify-pushers-exist" title="验证推送器是否存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果没有返回任何 pushers，请先为该账户修复正常的 Matrix 推送投递，再继续。

  </Step>

  <Step id="install-the-override-push-rule" title="安装覆盖推送规则">
    安装一条匹配最终预览标记以及发送者为 bot MXID 的规则：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    运行前请替换：

    - `https://matrix.example.org`：你的 homeserver 基础 URL
    - `$USER_ACCESS_TOKEN`：收件人用户的访问令牌
    - `openclaw-finalized-preview-botname`：每个 bot、每个收件人都唯一的规则 ID（模式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：你的 OpenClaw bot MXID，不是收件人的

  </Step>

  <Step id="verify" title="验证">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然后测试一次流式回复。在 quiet 模式下，房间会显示一个静默的草稿预览，并在块或轮次结束时发送一次通知。

  </Step>
</Steps>

以后如需移除该规则，可使用收件人的令牌对同一个规则 URL 执行 `DELETE`。

## <a id="multi-bot-notes"></a> 多 bot 说明

推送规则按 `ruleId` 键控：对同一个 ID 重复执行 `PUT` 会更新同一条规则。对于多个 OpenClaw bot 向同一收件人发送通知的情况，请为每个 bot 创建一条规则，并使用不同的 sender 匹配。

新的用户定义的 `override` 规则将插入到服务器默认抑制规则之前，因此不需要额外的排序参数。该规则仅影响可以就地完成的纯文本预览编辑。媒体回复、陈旧预览回退以及激活 Matrix 提及的最终文本将作为普通通知消息传递。

## <a id="homeserver-notes"></a> homeserver 说明

<AccordionGroup>
  <Accordion id="synapse" title="突触">
    不需要对 `homeserver.yaml` 做特殊更改。如果正常的 Matrix 通知已经能送达该用户，那么收件人令牌 + 上面的 `pushrules` 调用就是主要配置步骤。

    如果您在反向代理或工作程序后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 正确到达 Synapse。推送交付由主进程或 `synapse.app.pusher` / 配置的推送工作人员处理 - 检查它们是否正常。

    该规则使用的是 `event_property_is` 推送规则条件（MSC3758，push rule v1.10），它于 2023 年加入 Synapse。旧版 Synapse 会接受 `PUT pushrules/...` 调用，但会悄悄地从不匹配该条件——如果最终预览编辑没有收到通知，请升级 Synapse。

  </Accordion>

  <Accordion id="tuwunel" title="图乌内尔">
    与 Synapse 相同的流程。最终的预览标记不需要特定于 Tuwunel 的配置。

    如果用户在另一台设备上处于活动状态时通知消失，请检查是否启用了 `suppress_push_when_active`。 Tuwunel 在 1.4.2（2025 年 9 月）中添加了此选项，它可以在一个设备处于活动状态时有意抑制向其他设备的推送。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [Matrix 频道设置](/channels/matrix)
- [流式传输概念](/concepts/streaming)
