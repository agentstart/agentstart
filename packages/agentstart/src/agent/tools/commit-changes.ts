/* agent-frontmatter:start
AGENT: Agent runtime tool helper
PURPOSE: Commits and pushes sandbox filesystem changes triggered by tooling operations.
USAGE: Call after modifying files in a sandbox to persist git history for the user.
EXPORTS: commitChanges
FEATURES:
  - Configures git author metadata automatically before committing
  - Stages, commits, and pushes updates via the sandbox Git interface
  - Generates semantic commit messages following Conventional Commits spec
SEARCHABLE: packages, agentstart, src, agent, tools, commit, changes, git, sandbox, tool
agent-frontmatter:end */

import type { SandboxAPI } from "@agentstart/types";
import path from "pathe";
import { GIT_CONFIG } from "./constants";

/**
 * Determines the commit type prefix based on the change description and file path.
 *
 * Commit Type Rules (following Conventional Commits):
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Priority 1: Exact Operation Match
 *   - "created"                → feat   (new file/feature)
 *   - "overwritten"            → chore  (maintenance operation)
 *   - "edited" / "edited (...)"→ chore  (modification)
 *   - "executed: ..."          → chore  (bash command)
 *
 * Priority 2: Semantic Keywords
 *   - contains "fix" or "bug"  → fix    (bug fixes)
 *   - contains "add" or "new"  → feat   (new features)
 *   - contains "remove/delete" → chore  (cleanup)
 *   - contains "update/change" → chore  (modifications)
 *
 * Priority 3: File Type Detection
 *   - test files (*.test.*, *.spec.*)     → test
 *   - markdown files (*.md, readme*)      → docs
 *   - style files (*.css, *.scss, etc.)   → style
 *
 * Priority 4: Default Fallback
 *   - everything else          → chore  (safe default)
 *
 * @param changeDescription - Description of the change (e.g., "created", "edited")
 * @param filePath - Path to the modified file
 * @returns Conventional Commit type prefix (feat, fix, chore, test, docs, style)
 */
const getCommitType = (changeDescription: string, filePath: string): string => {
  const desc = changeDescription.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Priority 1: Exact operation match
  if (desc === "created") return "feat";
  if (desc === "overwritten") return "chore";
  if (desc.includes("edited")) return "chore";
  if (desc.startsWith("executed:")) return "chore";

  // Priority 2: Semantic keywords
  if (desc.includes("fix") || desc.includes("bug")) return "fix";
  if (desc.includes("add") || desc.includes("new")) return "feat";
  if (desc.includes("remove") || desc.includes("delete")) return "chore";
  if (desc.includes("update") || desc.includes("change")) return "chore";

  // Priority 3: File type detection
  if (
    fileName.includes("test") ||
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".test.js") ||
    fileName.endsWith(".spec.ts") ||
    fileName.endsWith(".spec.js")
  ) {
    return "test";
  }
  if (fileName.startsWith("readme") || fileName.endsWith(".md")) {
    return "docs";
  }
  if (
    [".css", ".scss", ".less", ".sass"].some((ext) => fileName.endsWith(ext))
  ) {
    return "style";
  }

  // Priority 4: Default fallback
  return "chore";
};

/**
 * Commits and pushes file changes to the sandbox repository.
 *
 * This function performs a complete git workflow:
 * 1. Configures git user information
 * 2. Stages the specified file
 * 3. Creates a commit with a semantic commit message
 * 4. Pushes to remote (if configured)
 *
 * Commit Message Format:
 *   `<type>(<scope>): <description>`
 *
 *   Example: feat(utils.ts): created
 *            chore(config.js): edited
 *
 * @param sandbox - Sandbox API instance with git capabilities
 * @param filePath - Absolute or relative path to the modified file
 * @param changeDescription - Brief description of the change
 * @returns Commit hash if successful, undefined otherwise
 * @throws Error if any git operation fails
 */
export const commitChanges = async (
  sandbox: SandboxAPI,
  filePath: string,
  changeDescription: string,
): Promise<string | undefined> => {
  const commitType = getCommitType(changeDescription, filePath);
  const fileName = path.basename(filePath);
  const commitMessage = `${commitType}(${fileName}): ${changeDescription}`;

  try {
    // Ensure git is configured before committing
    await sandbox.git.config("user.name", GIT_CONFIG.AUTHOR.name, {
      local: true,
    });
    await sandbox.git.config("user.email", GIT_CONFIG.AUTHOR.email, {
      local: true,
    });

    // Convert absolute path to relative path for git
    const relativePath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    const gitAddResult = await sandbox.git.add(relativePath);
    if (!gitAddResult.success) {
      throw new Error(`Failed to add file: ${gitAddResult.error}`);
    }

    const gitCommitResult = await sandbox.git.commit({
      message: commitMessage,
    });
    if (!gitCommitResult.success) {
      throw new Error(`Failed to commit: ${gitCommitResult.error}`);
    }

    const gitPushResult = await sandbox.git.push();
    if (!gitPushResult.success) {
      throw new Error(`Failed to push: ${gitPushResult.error}`);
    }

    // Return the commit hash
    return gitCommitResult.hash;
  } catch (gitError) {
    const errorMessage =
      gitError instanceof Error ? gitError.message : String(gitError);

    throw new Error(
      `Failed to commit and push changes for ${filePath}: ${errorMessage}`,
    );
  }
};
