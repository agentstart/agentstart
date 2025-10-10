/* agent-frontmatter:start
AGENT: MongoDB adapter entry
PURPOSE: Re-export the MongoDB database adapter implementation
USAGE: import { mongodbAdapter } from "@agent-stack/core/adapters/mongodb"
EXPORTS: mongodbAdapter
FEATURES:
  - Shields consumers from folder layout
  - Keeps MongoDB adapter API discoverable
SEARCHABLE: mongodb adapter entry, mongo integration
agent-frontmatter:end */

export * from "./mongodb-adapter";
