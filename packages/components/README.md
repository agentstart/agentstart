# @agentstart/components

AgentStart’s component kit packages the conversation, tool, and layout primitives we use to wire agent front-ends. The goal is a batteries-included shadcn registry so teams can scaffold an AgentStart UI with a single CLI command.

## Shadcn Registry Setup

1. **Install the package** (workspace dependency so the registry JSON files ship with node_modules):

   ```bash
   pnpm add @agentstart/components
   ```

2. **Expose the AgentStart registry alias** in your app’s `components.json`:

   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "registries": {
       "@agentstart": "./node_modules/@agentstart/components/registry/{name}.json"
     }
   }
   ```

   > The alias points at local files for now; once the CDN is live we will switch the path to `https://registry.agentstart.ai/{name}.json`.

3. **Install components with the shadcn CLI**:

   ```bash
   npx shadcn@latest add prompt-input --registry=@agentstart
   npx shadcn@latest add tools/message-part-view --registry=@agentstart
   ```

4. **Import components from the package export map**:

   ```tsx
   import { PromptInput } from "@agentstart/components/components/ai-elements/prompt-input";
   import { MessagePart } from "@agentstart/components/components/tools/message-part-view";
   ```

## Agent Registry Build Protocol

Use this checklist whenever you, the agent, need to extend or publish the `@agentstart/components` registry.

1. **Validate prerequisites**  
   - Ensure the runtime can serve static JSON (Next.js, Express, Vite preview, etc.).  
   - Confirm every registry payload satisfies the [registry item schema](/docs/registry/registry-item-json).

2. **Update the catalog entry point**  
   - Edit `packages/components/registry.json`. This file must always exist at the root of the served registry endpoint.  
   - Populate mandatory metadata and items:

     ```json
     {
       "$schema": "https://ui.shadcn.com/schema/registry.json",
       "name": "agentstart",
       "homepage": "https://agentstart.ai",
       "items": [
         {
           "name": "hello-world",
           "type": "registry:block",
           "title": "Hello World",
           "description": "A simple hello world component.",
           "files": [
             {
               "path": "registry/new-york/hello-world/hello-world.tsx",
               "type": "registry:component"
             }
           ]
         }
       ]
     }
     ```

   - For each item, specify `name`, `type`, `title`, `description`, and a `files` array. Each file object needs a project-relative `path` and a `type`.

3. **Author registry assets in the correct layout**  
   - Place source files under `registry/<style>/<name>`.  
   - Reference shared dependencies via `@/registry/...` imports so downstream consumers resolve paths reliably.

     ```tsx
     // registry/new-york/hello-world/hello-world.tsx
     import { Button } from "@/components/ui/button";

     export function HelloWorld() {
       return <Button>Hello World</Button>;
     }
     ```

     ```
     registry
     └── new-york
         └── hello-world
             └── hello-world.tsx
     ```

4. **Emit per-item JSON manifests**  
   - Install the CLI dependency inside the workspace scope: `npm install shadcn@canary`.  
   - Verify `package.json` contains `"registry:build": "shadcn build"`.  
   - Generate artifacts:

     ```bash
     npm run registry:build
     # npm run registry:build -- --output=./custom-dir  # override output folder if needed
     ```

   - The default destination is `public/r/{name}.json`. Serving this directory via the app’s HTTP server exposes each registry item.

5. **Surface the registry for consumers**  
   - Run the framework dev server (e.g., `npm run dev` for Next.js) to serve the generated JSON at `http://localhost:3000/r/{name}.json`.  
   - Publish by deploying the project; consumers can then install items with:

     ```bash
     npx shadcn@latest add http://localhost:3000/r/hello-world.json
     ```

### Quality checklist

- Keep every registry item inside `registry/[STYLE]/[NAME]`.
- Always fill `name`, `description`, `type`, and `files` for each item.
- Record internal component dependencies in `registryDependencies` and external packages (optionally versioned) in `dependencies`.
- Use `@/registry/...` imports inside item files.
- Co-locate supporting hooks, libraries, and assets within the same item directory when practical.

## Registry Item Examples & Patterns

Use these templates when assembling new items. All JSON must satisfy `https://ui.shadcn.com/schema/registry-item.json`.

### Styles (`registry:style`)

**Extend shadcn/ui**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "example-style",
  "type": "registry:style",
  "dependencies": ["@tabler/icons-react"],
  "registryDependencies": [
    "login-01",
    "calendar",
    "https://example.com/r/editor.json"
  ],
  "cssVars": {
    "theme": {
      "font-sans": "Inter, sans-serif"
    },
    "light": {
      "brand": "20 14.3% 4.1%"
    },
    "dark": {
      "brand": "20 14.3% 4.1%"
    }
  }
}
```

**Style from scratch**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "extends": "none",
  "name": "new-style",
  "type": "registry:style",
  "dependencies": ["tailwind-merge", "clsx"],
  "registryDependencies": [
    "utils",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json",
    "https://example.com/r/select.json"
  ],
  "cssVars": {
    "theme": {
      "font-sans": "Inter, sans-serif"
    },
    "light": {
      "main": "#88aaee",
      "bg": "#dfe5f2",
      "border": "#000",
      "text": "#000",
      "ring": "#000"
    },
    "dark": {
      "main": "#88aaee",
      "bg": "#272933",
      "border": "#000",
      "text": "#e6e6e6",
      "ring": "#fff"
    }
  }
}
```

### Themes (`registry:theme`)

**Custom theme**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.546 0.245 262.881)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.746 0.16 232.661)",
      "sidebar-primary": "oklch(0.546 0.245 262.881)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.746 0.16 232.661)"
    },
    "dark": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.707 0.165 254.624)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.707 0.165 254.624)",
      "sidebar-primary": "oklch(0.707 0.165 254.624)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.707 0.165 254.624)"
    }
  }
}
```

**Add custom colors**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-style",
  "type": "registry:style",
  "cssVars": {
    "light": {
      "brand": "oklch(0.99 0.00 0)"
    },
    "dark": {
      "brand": "oklch(0.14 0.00 286)"
    }
  }
}
```

### Blocks (`registry:block`)

**Install reusable block**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "login-01",
  "type": "registry:block",
  "description": "A simple login form.",
  "registryDependencies": ["button", "card", "input", "label"],
  "files": [
    {
      "path": "blocks/login-01/page.tsx",
      "content": "import { LoginForm } ...",
      "type": "registry:page",
      "target": "app/login/page.tsx"
    },
    {
      "path": "blocks/login-01/components/login-form.tsx",
      "content": "...",
      "type": "registry:component"
    }
  ]
}
```

**Override primitives with remote sources**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-login",
  "type": "registry:block",
  "registryDependencies": [
    "login-01",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json"
  ]
}
```

### CSS variables and utilities

**Custom theme variables**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-theme",
  "type": "registry:theme",
  "cssVars": {
    "theme": {
      "font-heading": "Inter, sans-serif",
      "shadow-card": "0 0 0 1px rgba(0, 0, 0, 0.1)"
    }
  }
}
```

**Override Tailwind spacing**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-theme",
  "type": "registry:theme",
  "cssVars": {
    "theme": {
      "spacing": "0.2rem",
      "breakpoint-sm": "640px",
      "breakpoint-md": "768px",
      "breakpoint-lg": "1024px",
      "breakpoint-xl": "1280px",
      "breakpoint-2xl": "1536px"
    }
  }
}
```

### Custom CSS

**Base layer**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-style",
  "type": "registry:style",
  "css": {
    "@layer base": {
      "h1": {
        "font-size": "var(--text-2xl)"
      },
      "h2": {
        "font-size": "var(--text-xl)"
      }
    }
  }
}
```

**Components layer**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-card",
  "type": "registry:component",
  "css": {
    "@layer components": {
      "card": {
        "background-color": "var(--color-white)",
        "border-radius": "var(--rounded-lg)",
        "padding": "var(--spacing-6)",
        "box-shadow": "var(--shadow-xl)"
      }
    }
  }
}
```

### Utilities (`@utility`)

**Simple**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-component",
  "type": "registry:component",
  "css": {
    "@utility content-auto": {
      "content-visibility": "auto"
    }
  }
}
```

**Complex**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-component",
  "type": "registry:component",
  "css": {
    "@utility scrollbar-hidden": {
      "scrollbar-hidden": {
        "&::-webkit-scrollbar": {
          "display": "none"
        }
      }
    }
  }
}
```

**Pattern-based**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-component",
  "type": "registry:component",
  "css": {
    "@utility tab-*": {
      "tab-size": "var(--tab-size-*)"
    }
  }
}
```

### CSS imports (`@import`)

**Basic**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-import",
  "type": "registry:component",
  "css": {
    "@import \"tailwindcss\"": {},
    "@import \"./styles/base.css\"": {}
  }
}
```

**URL**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "font-import",
  "type": "registry:item",
  "css": {
    "@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap\")": {},
    "@import url(\"./local-styles.css\")": {}
  }
}
```

**Media queries**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "responsive-import",
  "type": "registry:item",
  "css": {
    "@import \"print-styles.css\" print": {},
    "@import url(\"mobile.css\") screen and (max-width: 768px)": {}
  }
}
```

### Tailwind plugins (`@plugin`)

**Basic**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-plugin",
  "type": "registry:item",
  "css": {
    "@plugin \"@tailwindcss/typography\"": {},
    "@plugin \"foo\"": {}
  }
}
```

**With dependency**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "typography-component",
  "type": "registry:item",
  "dependencies": ["@tailwindcss/typography"],
  "css": {
    "@plugin \"@tailwindcss/typography\"": {},
    "@layer components": {
      ".prose": {
        "max-width": "65ch"
      }
    }
  }
}
```

**Scoped**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "scoped-plugins",
  "type": "registry:component",
  "css": {
    "@plugin \"@headlessui/tailwindcss\"": {},
    "@plugin \"tailwindcss/plugin\"": {},
    "@plugin \"./custom-plugin.js\"": {}
  }
}
```

**Multiple**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "multiple-plugins",
  "type": "registry:item",
  "dependencies": [
    "@tailwindcss/typography",
    "@tailwindcss/forms",
    "tw-animate-css"
  ],
  "css": {
    "@plugin \"@tailwindcss/typography\"": {},
    "@plugin \"@tailwindcss/forms\"": {},
    "@plugin \"tw-animate-css\"": {}
  }
}
```

### Combined imports and plugins

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "combined-example",
  "type": "registry:item",
  "dependencies": ["@tailwindcss/typography", "tw-animate-css"],
  "css": {
    "@import \"tailwindcss\"": {},
    "@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap\")": {},
    "@plugin \"@tailwindcss/typography\"": {},
    "@plugin \"tw-animate-css\"": {},
    "@layer base": {
      "body": {
        "font-family": "Inter, sans-serif"
      }
    },
    "@utility content-auto": {
      "content-visibility": "auto"
    }
  }
}
```

### Animations

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-component",
  "type": "registry:component",
  "cssVars": {
    "theme": {
      "--animate-wiggle": "wiggle 1s ease-in-out infinite"
    }
  },
  "css": {
    "@keyframes wiggle": {
      "0%, 100%": {
        "transform": "rotate(-3deg)"
      },
      "50%": {
        "transform": "rotate(3deg)"
      }
    }
  }
}
```

### Environment variables

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-item",
  "type": "registry:item",
  "envVars": {
    "NEXT_PUBLIC_APP_URL": "http://localhost:4000",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres",
    "OPENAI_API_KEY": ""
  }
}
```

> Use `envVars` for development and sample data only—never include production secrets.

### Universal items (framework agnostic)

Explicitly target every file.

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "python-rules",
  "type": "registry:item",
  "files": [
    {
      "path": "/path/to/your/registry/default/custom-python.mdc",
      "type": "registry:file",
      "target": "~/.cursor/rules/custom-python.mdc",
      "content": "..."
    }
  ]
}
```

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-eslint-config",
  "type": "registry:item",
  "files": [
    {
      "path": "/path/to/your/registry/default/custom-eslint.json",
      "type": "registry:file",
      "target": "~/.eslintrc.json",
      "content": "..."
    }
  ]
}
```

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-custom-start-template",
  "type": "registry:item",
  "dependencies": ["better-auth"],
  "files": [
    {
      "path": "/path/to/file-01.json",
      "type": "registry:file",
      "target": "~/file-01.json",
      "content": "..."
    },
    {
      "path": "/path/to/file-02.vue",
      "type": "registry:file",
      "target": "~/pages/file-02.vue",
      "content": "..."
    }
  ]
}
```
