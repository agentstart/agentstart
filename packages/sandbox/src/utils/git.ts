/* agent-frontmatter:start
AGENT: Sandbox git helpers
PURPOSE: Share git command builders and parsers across sandbox adapters
USAGE: Import to construct common git CLI strings or parse porcelain output
EXPORTS: buildGitAddCommand, buildGitCheckoutCommand, buildGitCloneCommand, buildGitCommitCommand, buildGitFetchCommand, buildGitInitCommand, buildGitSyncCommand, extractCommitHash, parseGitStatusPorcelain, shouldSkipRemoteOperation
FEATURES:
  - Normalizes git command string construction
  - Provides porcelain status parsing utilities
  - Shares commit hash extraction helpers
  - Validates remote configuration for push/pull operations
SEARCHABLE: sandbox git utils, git command builder, porcelain status parser
agent-frontmatter:end */

import type {
  GitCloneOptions,
  GitCommitOptions,
  GitResult,
  GitStatus,
  GitSyncOptions,
} from "@agentstart/types";

const defaultQuote = (value: string): string => value;
const escapeDoubleQuotes = (value: string): string =>
  value.replace(/"/g, '\\"');

export const buildGitInitCommand = (options?: {
  initialBranch?: string;
  bare?: boolean;
}): string => {
  let command = "init";

  if (options?.initialBranch) {
    command += ` --initial-branch=${options.initialBranch}`;
  }

  if (options?.bare) {
    command += " --bare";
  }

  return command;
};

export const buildGitCloneCommand = (
  url: string,
  options?: GitCloneOptions,
  escapeArg: (value: string) => string = escapeDoubleQuotes,
): string => {
  let command = `clone "${escapeArg(url)}"`;

  if (options?.directory) {
    command += ` "${escapeArg(options.directory)}"`;
  }
  if (options?.branch) {
    command += ` --branch ${options.branch}`;
  }
  if (options?.depth) {
    command += ` --depth ${options.depth}`;
  }
  if (options?.recursive) {
    command += " --recursive";
  }
  if (options?.bare) {
    command += " --bare";
  }

  return command;
};

export const buildGitAddCommand = (
  files: string | string[],
  options?: { force?: boolean; update?: boolean },
  quote: (value: string) => string = defaultQuote,
): string => {
  const list = Array.isArray(files) ? files : [files];
  const fileArgs = list.map((file) => quote(file)).join(" ");
  let command = `add ${fileArgs}`;

  if (options?.force) {
    command += " --force";
  }
  if (options?.update) {
    command += " --update";
  }

  return command;
};

export const buildGitCommitCommand = (options: GitCommitOptions): string => {
  let command = "commit";

  if (options.all) {
    command += " --all";
  }
  if (options.amend) {
    command += " --amend";
  }
  if (options.noVerify) {
    command += " --no-verify";
  }
  if (options.signoff) {
    command += " --signoff";
  }
  if (options.author) {
    command += ` --author="${options.author.name} <${options.author.email}>"`;
  }

  // Split message into paragraphs (separated by double newlines)
  // This allows Git to format the commit message properly
  const MAX_MESSAGE_LENGTH = 5000; // Total message length limit
  const MAX_SUBJECT_LENGTH = 72; // First line (subject) length limit

  let message = options.message;

  // Truncate if message is too long
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.substring(0, MAX_MESSAGE_LENGTH);
    console.warn(
      `Commit message truncated to ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  // Split into paragraphs by double newlines
  const paragraphs = message
    .split(/\n\n+/) // Split by one or more empty lines
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Use multiple -m flags for better formatting
  // Git will automatically add blank lines between paragraphs
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]!;

    // For the first paragraph (subject line), enforce stricter limit
    if (i === 0 && paragraph.length > MAX_SUBJECT_LENGTH) {
      const truncated = `${paragraph.substring(0, MAX_SUBJECT_LENGTH - 3)}...`;
      command += ` -m "${escapeDoubleQuotes(truncated)}"`;
      console.warn(
        `Commit subject line truncated to ${MAX_SUBJECT_LENGTH} characters`,
      );
    } else {
      command += ` -m "${escapeDoubleQuotes(paragraph)}"`;
    }
  }

  return command;
};

export const extractCommitHash = (output: string): string | undefined => {
  const match = /\[(?:[\w\s-]+\s+)?(?:\(root-commit\)\s+)?([a-f0-9]+)\]/.exec(
    output,
  );
  return match?.[1];
};

export const buildGitSyncCommand = (
  operation: "push" | "pull",
  options?: GitSyncOptions,
): string => {
  let command = operation;

  if (options?.remote) {
    command += ` ${options.remote}`;
  }
  if (options?.branch) {
    command += ` ${options.branch}`;
  }
  if (options?.force) {
    command += " --force";
  }
  if (options?.tags) {
    command += " --tags";
  }
  if (operation === "push" && options?.setUpstream) {
    command += " --set-upstream";
  }
  if (operation === "pull" && options?.rebase) {
    command += " --rebase";
  }

  return command;
};

export const buildGitFetchCommand = (options?: {
  remote?: string;
  branch?: string;
  all?: boolean;
  prune?: boolean;
  tags?: boolean;
}): string => {
  let command = "fetch";

  if (options?.all) {
    command += " --all";
  } else if (options?.remote) {
    command += ` ${options.remote}`;
    if (options.branch) {
      command += ` ${options.branch}`;
    }
  }

  if (options?.prune) {
    command += " --prune";
  }
  if (options?.tags) {
    command += " --tags";
  }

  return command;
};

export const buildGitCheckoutCommand = (
  target: string,
  options?: { create?: boolean; force?: boolean; file?: boolean },
): string => {
  let command = "checkout";

  if (options?.create) {
    command += " -b";
  }
  if (options?.force) {
    command += " --force";
  }
  if (options?.file) {
    command += " --";
  }

  command += ` ${target}`;

  return command;
};

export const parseGitStatusPorcelain = (output: string): GitStatus => {
  const lines = output.split(/\r?\n/).filter((line) => line);
  const status: GitStatus = {
    branch: "unknown",
    clean: true,
    modified: [],
    staged: [],
    untracked: [],
    deleted: [],
    renamed: [],
  };

  for (const line of lines) {
    if (line.startsWith("##")) {
      const match = /## (.+?)(?:\.\.\.(.+))?$/.exec(line);

      if (match?.[1]) {
        const noCommitsMatch = /No commits yet on (.+)/.exec(match[1]);
        status.branch = noCommitsMatch?.[1] ?? match[1];

        if (match[2]) {
          const aheadBehind = /\[ahead (\d+)(?:, behind (\d+))?\]/.exec(
            match[2],
          );
          if (aheadBehind) {
            status.ahead = parseInt(aheadBehind[1] ?? "0", 10) || 0;
            if (aheadBehind[2]) {
              status.behind = parseInt(aheadBehind[2] ?? "0", 10) || 0;
            }
          }
        }
      }
      continue;
    }

    status.clean = false;
    const code = line.substring(0, 2);
    const filename = line.substring(3);
    const indexStatus = code[0];
    const worktreeStatus = code[1];

    if (indexStatus === "M" || worktreeStatus === "M") {
      status.modified.push(filename);
    }
    if (
      indexStatus === "A" ||
      indexStatus === "M" ||
      indexStatus === "D" ||
      indexStatus === "R"
    ) {
      status.staged.push(filename);
    }
    if (code === "??") {
      status.untracked.push(filename);
    }
    if (indexStatus === "D" || worktreeStatus === "D") {
      status.deleted.push(filename);
    }
    if (indexStatus === "R") {
      const [from, to] = filename.split(" -> ");
      if (from && to) {
        status.renamed.push({ from, to });
      }
    }
  }

  return status;
};

/**
 * Determines whether a remote operation (push/pull) should be skipped
 * based on the result of checking for configured remotes.
 *
 * This helper function provides a consistent way to handle missing remote
 * configuration across different git adapters (nodejs, e2b, etc.).
 *
 * Usage:
 * ```typescript
 * const remoteResult = await this.runGitCommand("remote");
 * const skipResult = shouldSkipRemoteOperation(remoteResult, "push");
 * if (skipResult) return skipResult;
 * ```
 *
 * @param remoteCheckResult - Result from executing `git remote` command
 * @param operation - Type of operation being attempted ("push" or "pull")
 * @returns GitResult with skip message if no remote configured, undefined otherwise
 */
export const shouldSkipRemoteOperation = (
  remoteCheckResult: {
    success?: boolean;
    exitCode?: number;
    stdout?: string;
    message?: string;
  },
  operation: "push" | "pull",
): GitResult | undefined => {
  // Check if remote check succeeded and has output
  const hasRemote =
    (remoteCheckResult.success ||
      remoteCheckResult.exitCode === 0 ||
      remoteCheckResult.exitCode === undefined) &&
    (remoteCheckResult.stdout?.trim().length ?? 0) > 0;

  if (!hasRemote) {
    return {
      success: true,
      message: `Skipped ${operation}: No remote repository configured. Use git.addRemote() or git.remote() to add one.`,
      exitCode: 0,
    };
  }

  return undefined;
};
