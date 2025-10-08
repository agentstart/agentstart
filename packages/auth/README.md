# Auth Package

## Basic Usage (Automatic Environment Variables)

The simplest way to use the auth package is to let it automatically detect OAuth providers from environment variables:

```typescript
import { initAuth } from "@agent-stack/auth";

const auth = initAuth({
  baseUrl: "http://localhost:3000",
  productionUrl: "https://myapp.com",
  secret: process.env.AUTH_SECRET,
  env: process.env, // Pass environment variables
});
```

The system will automatically detect and configure any providers that have both `AUTH_[PROVIDER]_CLIENT_ID` and `AUTH_[PROVIDER]_CLIENT_SECRET` environment variables set.

## Explicit Provider Configuration

You can explicitly configure providers with custom credentials:

```typescript
const auth = initAuth({
  baseUrl: "http://localhost:3000",
  productionUrl: "https://myapp.com",
  secret: process.env.AUTH_SECRET,
  providers: {
    github: {
      clientId: "custom-github-id",
      clientSecret: "custom-github-secret",
    },
    google: {
      // Mix explicit config with env variables
      clientId: process.env.CUSTOM_GOOGLE_ID,
      clientSecret: process.env.CUSTOM_GOOGLE_SECRET,
    },
    discord: {
      enabled: false, // Explicitly disable a provider
    },
  },
});
```

## Mixed Configuration

You can combine explicit configuration with environment variable fallback:

```typescript
const auth = initAuth({
  baseUrl: "http://localhost:3000",
  productionUrl: "https://myapp.com",
  secret: process.env.AUTH_SECRET,
  env: process.env, // Fallback to env vars
  providers: {
    // Override specific providers
    github: {
      clientId: "override-github-id",
      clientSecret: "override-github-secret",
    },
    // Other providers will use env vars if available
  },
});
```

## Supported Providers

The following OAuth providers are supported:

- **GitHub** - `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`
- **Google** - `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`
- **Discord** - `AUTH_DISCORD_CLIENT_ID`, `AUTH_DISCORD_CLIENT_SECRET`
- **Apple** - `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_SECRET`
- **Microsoft** - `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET`
- **Facebook** - `AUTH_FACEBOOK_CLIENT_ID`, `AUTH_FACEBOOK_CLIENT_SECRET`
- **Twitter** - `AUTH_TWITTER_CLIENT_ID`, `AUTH_TWITTER_CLIENT_SECRET`
- **LinkedIn** - `AUTH_LINKEDIN_CLIENT_ID`, `AUTH_LINKEDIN_CLIENT_SECRET`
- **Spotify** - `AUTH_SPOTIFY_CLIENT_ID`, `AUTH_SPOTIFY_CLIENT_SECRET`
- **Twitch** - `AUTH_TWITCH_CLIENT_ID`, `AUTH_TWITCH_CLIENT_SECRET`
- **GitLab** - `AUTH_GITLAB_CLIENT_ID`, `AUTH_GITLAB_CLIENT_SECRET`

## Environment Variables

Configure providers by setting the appropriate environment variables in your `.env` file:

```env
# Core configuration
AUTH_SECRET='your-secret-key'

# OAuth providers (all optional)
AUTH_GITHUB_CLIENT_ID='github-client-id'
AUTH_GITHUB_CLIENT_SECRET='github-client-secret'

AUTH_GOOGLE_CLIENT_ID='google-client-id'
AUTH_GOOGLE_CLIENT_SECRET='google-client-secret'
```

## TypeScript Support

The package exports TypeScript types for better IDE support:

```typescript
import type {
  AuthOptions,
  OAuthProvider,
  OAuthProviders,
} from "@agent-stack/auth";

// Custom configuration
const customConfig: AuthOptions = {
  baseUrl: "http://localhost:3000",
  productionUrl: "https://myapp.com",
  secret: "secret",
  providers: {
    github: {
      clientId: "id",
      clientSecret: "secret",
    },
  },
};
```

## Debugging

In development mode, the auth system will log which providers are configured:

```
[Auth] Configured providers: github, google, discord
```

If no providers are configured, you'll see a warning:

```
[Auth] No OAuth providers configured
```
