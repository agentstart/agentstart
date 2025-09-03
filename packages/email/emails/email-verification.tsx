// AGENT: Email verification template
// PURPOSE: Verify user email address during registration
// USAGE: Sent after user signs up with email
// PROPS:
//   - validationCode: Verification code
//   - name: User's name (optional)
//   - url: Verification link (optional)
//   - expiresIn: Code expiration time
// SEARCHABLE: email verification, verify email, confirmation email

import { siteConfig } from "@acme/config";
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

interface EmailVerificationProps {
  validationCode: string;
  name?: string;
  url?: string;
  expiresIn?: number; // in seconds
}

export const EmailVerificationEmail = ({
  validationCode,
  name,
  url,
  expiresIn = 86400, // 24 hours
}: EmailVerificationProps) => {
  const formatExpiry = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <Html>
      <Head />
      <Preview>Verify your email for {siteConfig.name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verify your email address</Heading>

          <Text style={text}>
            Welcome to {name ?? siteConfig.name}! Please verify your email
            address to activate your account.
          </Text>

          <Text style={text}>
            Enter this verification code to confirm your email:
          </Text>

          <Section style={codeContainer}>
            <Text style={code}>{validationCode}</Text>
          </Section>

          <Text style={text}>
            This verification code will expire in {formatExpiry(expiresIn)}.
            After verification, you'll have full access to all{" "}
            {name ?? siteConfig.name} features.
          </Text>

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

EmailVerificationEmail.PreviewProps = {
  validationCode: "123456",
  name: siteConfig.name,
  url: siteConfig.url,
  expiresIn: 86400,
} as EmailVerificationProps;

export default EmailVerificationEmail;

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
