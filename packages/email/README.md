# @agent-stack/email

Email service package for AgentStack using Resend.

## Features

- Password reset emails
- Email verification
- Custom email templates
- Environment-based configuration

## Setup

1. Get your Resend API key from [https://resend.com/api-keys](https://resend.com/api-keys)
2. Add to your `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=hello@yourdomain.com # Optional, defaults to noreply@agent-stack.dev
```

## Usage

The email client is automatically initialized in the auth package and will use environment variables directly:

```typescript
import { createEmailClient } from "@agent-stack/email";

const emailClient = createEmailClient();

// Send password reset email
await emailClient.sendPasswordResetEmail({
  to: "user@example.com",
  userName: "John Doe",
  resetUrl: "https://yourapp.com/reset-password?token=xxx",
});

// Send verification email
await emailClient.sendVerificationEmail({
  to: "user@example.com",
  userName: "John Doe",
  verificationUrl: "https://yourapp.com/verify-email?token=xxx",
});
```

## Email Templates

The package includes pre-designed email templates for:

- **Password Reset**: Clean, professional template with clear call-to-action
- **Email Verification**: Welcome message with verification link
- **Generic Email**: Basic template for custom emails

All templates are responsive and work across different email clients.
