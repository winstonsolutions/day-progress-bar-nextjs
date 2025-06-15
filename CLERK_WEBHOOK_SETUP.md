# Clerk Webhook 配置指南

本文档介绍如何在Clerk仪表板中配置webhook，以便在用户事件（如注册、登录、更新个人资料等）发生时通知我们的应用程序。

## 配置步骤

1. 登录到 [Clerk Dashboard](https://dashboard.clerk.dev/)
2. 选择你的应用程序
3. 在左侧导航栏中，点击 **Webhooks**
4. 点击 **Add Endpoint** 按钮

## Webhook 端点设置

在添加新的webhook端点时，需要配置以下信息：

1. **URL**: 输入你的应用程序的webhook URL
   - 生产环境: `https://your-production-domain.com/api/webhooks`
   - 开发环境: `http://localhost:3000/api/webhooks`

   > **注意**: 我们现在只使用 `/api/webhooks` 端点。旧的 `/api/webhook/clerk` 路径已被移除，不再支持。

2. **Message Filtering**: 选择你想要接收的事件类型
   - 建议至少选择以下事件:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created`
     - `session.removed`

3. **Signing Secret**: Clerk会生成一个签名密钥，用于验证webhook请求的真实性
   - 将这个密钥添加到你的环境变量中，变量名为 `CLERK_WEBHOOK_SECRET`

## 环境变量配置

确保在你的`.env.local`文件中添加以下环境变量:

```
CLERK_WEBHOOK_SECRET=your_webhook_signing_secret
```

对于生产环境，请在你的部署平台（如Vercel、Railway等）中添加相同的环境变量。

## 测试Webhook

1. 在Clerk仪表板的webhook配置页面中，点击 **Send test** 按钮
2. 选择要测试的事件类型（如 `user.created`）
3. 点击 **Send test** 按钮发送测试请求
4. 检查你的应用程序日志，确认webhook请求已被正确处理

## 故障排除

如果webhook请求未被正确处理，请检查以下几点:

1. 确认webhook URL是否正确 - 确保使用 `/api/webhooks` 而不是 `/api/webhook`
2. 确认`CLERK_WEBHOOK_SECRET`环境变量是否已正确设置
3. 检查应用程序日志中是否有错误信息
4. 确认网络连接是否正常（如果在开发环境中测试，可能需要使用工具如ngrok来暴露本地服务器）

## 工作原理

我们的应用使用单一的webhook端点(`/api/webhooks`)来处理所有来自Clerk的事件。当收到webhook请求时，我们会:

1. 验证请求是否来自Clerk（通过验证签名）
2. 根据事件类型执行相应的操作（如创建、更新或删除用户记录）
3. 将用户数据同步到Supabase数据库

## 注意事项

- 确保webhook处理程序能够快速响应请求，因为Clerk会等待响应并可能在超时后重试
- 对于需要长时间处理的任务，建议在webhook处理程序中将任务放入队列，然后立即响应Clerk的请求
- 在生产环境中，确保webhook端点受到保护，避免未经授权的访问

## 相关文档

- [Clerk Webhooks官方文档](https://clerk.com/docs/integrations/webhooks)
- [Next.js API Routes文档](https://nextjs.org/docs/api-routes/introduction)