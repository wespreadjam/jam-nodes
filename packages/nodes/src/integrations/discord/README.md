# Discord Integration

Built-in Discord nodes for community engagement workflows:

- `discord_send_message`
- `discord_send_webhook`
- `discord_create_thread`

## Credentials

### Bot Token

Used by `discord_send_message` and `discord_create_thread`.

```typescript
{
  discordBot: {
    botToken: '...';
  };
}
```

### Webhook URL

Used by `discord_send_webhook`.

```typescript
{
  discordWebhook: {
    webhookUrl: 'https://discord.com/api/webhooks/...';
  };
}
```

## Operations

### `discord_send_message`

Input:

```json
{
  "channelId": "123456789012345678",
  "content": "Deployment completed",
  "embeds": [
    {
      "title": "Release v1.2.0",
      "description": "All checks passed",
      "color": 65280
    }
  ],
  "username": "optional",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Notes:
- Requires `context.credentials.discordBot.botToken`.
- `username` and `avatarUrl` are accepted in schema for API parity.

### `discord_send_webhook`

Input:

```json
{
  "webhookUrl": "https://discord.com/api/webhooks/<id>/<token>",
  "content": "Webhook event received",
  "embeds": [
    {
      "title": "Alert",
      "description": "Queue depth exceeded threshold",
      "color": 16711680
    }
  ]
}
```

Notes:
- If `webhookUrl` is omitted, node uses `context.credentials.discordWebhook.webhookUrl`.

### `discord_create_thread`

Input:

```json
{
  "channelId": "123456789012345678",
  "name": "Incident Thread",
  "message": "Opening thread for incident triage"
}
```

Notes:
- Requires `context.credentials.discordBot.botToken`.
- If `message` is provided, thread is created from starter message.
- If `message` is omitted, standalone thread is created.

## Embed Support

Embeds are supported via shared `DiscordEmbedSchema`:
- `title`, `description`, `url`, `timestamp`, `color`
- `footer`, `image`, `thumbnail`, `author`
- `fields` (name/value/inline)

## API Reference

- https://discord.com/developers/docs
