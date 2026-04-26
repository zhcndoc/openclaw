---
summary: "针对静默 finalized 预览编辑的按接收者 Matrix 推送规则"
read_when:
  - 为自托管 Synapse 或 Tuwunel 配置 Matrix 静默流式传输
  - 用户只希望在块完成时收到通知，而不是每次预览编辑都收到
title: "静默预览的 Matrix 推送规则"
---

当 `channels.matrix.streaming` 为 `"quiet"` 时，OpenClaw 会就地编辑单个预览事件，并用自定义内容标记标记最终完成的编辑。Matrix 客户端仅在每用户推送规则匹配该标记时，才会对最终编辑进行通知。本页面面向自托管 Matrix 的运维人员，介绍如何为每个接收者账户安装该规则。

如果你只想要标准的 Matrix 通知行为，请使用 `streaming: "partial"` 或保持 streaming 关闭。参见 [Matrix channel setup](/channels/matrix#streaming-previews)。

## 前提条件

- recipient user = 应接收通知的人
- bot user = 发送回复的 OpenClaw Matrix 账户
- 在下面的 API 调用中使用接收者用户的访问令牌
- 在推送规则中将 `sender` 与 bot 用户的完整 MXID 匹配
- 接收者账户必须已经有正常工作的 pushers——静默预览规则只有在正常的 Matrix 推送投递健康时才有效

## 步骤

<Steps>
  <Step title="配置静默预览">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="获取接收者的访问令牌">
    尽可能复用现有的客户端会话令牌。若要新生成一个：

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

  </Step>

  <Step title="验证 pushers 是否存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果没有返回任何 pushers，请先修复该账户的正常 Matrix 推送投递，再继续。

  </Step>

  <Step title="安装覆盖推送规则">
    OpenClaw 会将最终完成的纯文本预览编辑标记为 `content["com.openclaw.finalized_preview"] = true`。安装一条规则，使其同时匹配该标记和 bot 的 MXID 作为 sender：

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
    - `$USER_ACCESS_TOKEN`：接收者用户的访问令牌
    - `openclaw-finalized-preview-botname`：每个 bot、每个接收者都唯一的规则 ID（模式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：你的 OpenClaw bot MXID，不是接收者的

  </Step>

  <Step title="验证">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然后测试一次流式回复。静默模式下，房间会显示一条静默草稿预览，并在块或轮次完成时通知一次。

  </Step>
</Steps>

稍后若要移除该规则，请使用接收者的令牌对同一规则 URL 执行 `DELETE`。

## 多 bot 说明

推送规则按 `ruleId` 键控：对同一个 ID 重新运行 `PUT` 会更新单条规则。若多个 OpenClaw bot 向同一接收者发通知，请为每个 bot 创建一条规则，并使用不同的 sender 匹配。

新建的用户定义 `override` 规则会插入到默认 suppress 规则之前，因此不需要额外的排序参数。该规则只影响可就地最终完成的纯文本预览编辑；媒体回退和过期预览回退会使用正常的 Matrix 投递。

## Homeserver 说明

<AccordionGroup>
  <Accordion title="Synapse">
    不需要对 `homeserver.yaml` 做特殊更改。如果正常的 Matrix 通知已经能送达该用户，那么上面的接收者令牌 + `pushrules` 调用就是主要的配置步骤。

    如果你在反向代理或 workers 后运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 能正确到达 Synapse。推送投递由主进程或 `synapse.app.pusher` / 已配置的 pusher workers 处理——请确保它们运行正常。

  </Accordion>

  <Accordion title="Tuwunel">
    流程与 Synapse 相同；为最终预览标记不需要任何 Tuwunel 特定配置。

    如果用户在另一台设备上活跃时通知消失，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 1.4.2（2025 年 9 月）中加入了此选项，并且它可以在一台设备活跃时，有意抑制向其他设备发送推送。

  </Accordion>
</AccordionGroup>

## 相关内容

- [Matrix channel setup](/channels/matrix)
- [Streaming concepts](/concepts/streaming)
