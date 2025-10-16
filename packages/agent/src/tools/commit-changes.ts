import type { SandboxManagerAPI } from "@agent-stack/sandbox";
import path from "path-browserify-esm";
import { GIT_CONFIG } from "./constants";

export const commitChanges = async (
  sandboxManager: SandboxManagerAPI,
  filePath: string,
  changeDescription: string,
): Promise<string | undefined> => {
  const commitMessage = `${path.basename(filePath)}+${changeDescription}`;

  try {
    // Ensure git is configured before committing
    await sandboxManager.git.config("user.name", GIT_CONFIG.AUTHOR.name, {
      local: true,
    });
    await sandboxManager.git.config("user.email", GIT_CONFIG.AUTHOR.email, {
      local: true,
    });

    // Convert absolute path to relative path for git
    const relativePath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    const gitAddResult = await sandboxManager.git.add(relativePath);
    if (!gitAddResult.success) {
      throw new Error(`Failed to add file: ${gitAddResult.error}`);
    }

    const gitCommitResult = await sandboxManager.git.commit({
      message: commitMessage,
    });
    if (!gitCommitResult.success) {
      throw new Error(`Failed to commit: ${gitCommitResult.error}`);
    }

    const gitPushResult = await sandboxManager.git.push();
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
