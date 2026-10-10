---
name: superhuman-mail
description: "使用 Superhuman Mail MCP 处理邮件和日历工作流，包括搜索收件箱、阅读邮件线程、起草或发送邮件、管理标签、查看已读状态、查找空闲时间，以及创建或更新日历活动。"
---

# Superhuman Mail

Use the `superhuman-mail` MCP server whenever the user asks to work with Superhuman Mail, their inbox, email threads, drafts, sending, read statuses, labels, Split Inboxes, availability, or calendar events.

## Workflow

1. Use the MCP server's advertised tool descriptions as the source of truth. Tool names may evolve server-side.
2. For sensitive reads such as inbox search, message retrieval, calendar lookup, contacts, or attachments, proceed only when the user's request clearly authorizes that read.
3. For write or destructive actions such as sending mail, trashing threads, unsubscribing, updating labels, updating personalization, or creating calendar events, summarize the intended action and get user confirmation before calling the tool unless the user has already explicitly approved that exact action.
4. Prefer creating or updating drafts before sending when the user's intent is ambiguous.
5. When multiple mail accounts are connected, ask which account to use unless the prompt identifies it.

## Common Capabilities

The official Superhuman Mail MCP server can support workflows such as:

- Search email and calendar with natural language.
- List and fetch email threads and messages.
- Create, update, discard, and send drafts.
- Get attachments and read statuses.
- List labels and Split Inboxes.
- Update threads by labeling, starring, marking read or done, moving to or from Trash, and similar mailbox actions.
- Create or update events and find availability.
- Update personalization used for drafting and event creation.

## Safety Notes

Superhuman Mail MCP is a remote server hosted by Superhuman. Email and calendar data returned by MCP tools is sent back to the AI client so the model can reason over it. Be especially explicit before using tools that send emails instantly or expose message contents.
