/* agent-frontmatter:start
AGENT: Email service initialization with Resend
PURPOSE: Configure email sending service for transactional emails
USAGE: import { resend } from '@agent-stack/email'
FEATURES: Send emails via Resend API
REQUIRES: RESEND_API_KEY in environment variables
SEARCHABLE: email service, resend, email sender
agent-frontmatter:end */

import { Resend } from "resend";
import { env } from "../env";

const apiKey = env.RESEND_API_KEY;

/* agent-frontmatter:start
AGENT: Resend client instance
USAGE: resend.emails.send({ from, to, subject, html })
agent-frontmatter:end */
export const resend = new Resend(apiKey);
