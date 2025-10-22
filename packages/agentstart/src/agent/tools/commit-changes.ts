/* agent-frontmatter:start
AGENT: Agent runtime tool helper
PURPOSE: Commits and pushes sandbox filesystem changes triggered by tooling operations.
USAGE: Call after modifying files in a sandbox to persist git history for the user.
EXPORTS: commitChanges
FEATURES:
  - Configures git author metadata automatically before committing
  - Stages, commits, and pushes updates via the sandbox Git interface
SEARCHABLE: packages, agentstart, src, agent, tools, commit, changes, git, sandbox, tool
agent-frontmatter:end */

import path from "pathe";
import type { SandboxAPI } from "@/sandbox";
import { GIT_CONFIG } from "./constants";

export const commitChanges = async (
  sandbox: SandboxAPI,
  filePath: string,
  changeDescription: string,
): Promise<string | undefined> => {
  const commitMessage = `${path.basename(filePath)}+${changeDescription}`;

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
