/* agent-frontmatter:start
AGENT: Password reset email template
PURPOSE: Send password reset link/code to users
USAGE: Used by Better Auth for password recovery
PROPS:
  - validationCode: Password reset code
  - name: User's name (optional)
  - url: Reset password link (optional)
  - expiresIn: Code expiration time in seconds
SEARCHABLE: forgot password email, password reset email, recovery email
agent-frontmatter:end */

import { siteConfig } from "@agent-stack/config";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ForgotPasswordEmailProps {
  validationCode: string;
  name?: string;
  url?: string;
  expiresIn?: number; // in seconds
}

export const ForgotPasswordEmail = ({
  validationCode,
  name,
  url,
  expiresIn = 3600, // 1 hour
}: ForgotPasswordEmailProps) => {
  const formatExpiry = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <Html>
      <Head />
      <Preview>Reset your {siteConfig.name} password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset your password</Heading>

          <Text style={text}>Hi,</Text>

          <Text style={text}>
            We received a request to reset the password for your{" "}
            {siteConfig.name}
            account.
          </Text>

          <Text style={text}>Enter this code to reset your password:</Text>

          <Section style={codeContainer}>
            <Text style={code}>{validationCode}</Text>
          </Section>

          <Text style={text}>
            This code will expire in {formatExpiry(expiresIn)} for security
            reasons. If you didn't request a password reset, you can safely
            ignore this email. Your password won't be changed.
          </Text>

          <Section style={securityTips}>
            <Text style={securityTitle}>Security tips:</Text>
            <Text style={securityText}>
              • Never share your password or verification codes with anyone
            </Text>
            <Text style={securityText}>
              • {siteConfig.name} staff will never ask for your password
            </Text>
            <Text style={securityText}>
              • Always ensure you're on {siteConfig.url} when entering your
              password
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you didn't create an account on {name ?? siteConfig.name}, you
            can safely ignore this email.
          </Text>

          <Link href={url ?? siteConfig.url} style={footerLink}>
            {url ? new URL(url).hostname : siteConfig.url}
          </Link>
        </Container>
      </Body>
    </Html>
  );
};

ForgotPasswordEmail.PreviewProps = {
  validationCode: "123456",
  name: siteConfig.name,
  url: siteConfig.url,
  expiresIn: 3600,
} as ForgotPasswordEmailProps;

export default ForgotPasswordEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#000",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "40px",
  margin: "0 0 20px",
};

const text = {
  color: "#404040",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 10px",
};

const codeContainer = {
  background: "#f4f4f5",
  borderRadius: "8px",
  margin: "16px 0",
  padding: "12px",
  textAlign: "center" as const,
};

const code = {
  color: "#000",
  fontSize: "32px",
  fontWeight: "700",
  letterSpacing: "6px",
  lineHeight: "40px",
  margin: "0",
};

const securityTips = {
  background: "#fafafa",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const securityTitle = {
  color: "#000",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const securityText = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 4px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "42px 0 26px",
};

const footer = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0",
};

const footerLink = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  textDecoration: "underline",
};
