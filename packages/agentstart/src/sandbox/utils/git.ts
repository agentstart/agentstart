/* agent-frontmatter:start
AGENT: Sandbox git helpers
PURPOSE: Share git command builders and parsers across sandbox adapters
USAGE: Import to construct common git CLI strings or parse porcelain output
EXPORTS: buildGitAddCommand, buildGitCheckoutCommand, buildGitCloneCommand, buildGitCommitCommand, buildGitFetchCommand, buildGitInitCommand, buildGitSyncCommand, extractCommitHash, parseGitStatusPorcelain
FEATURES:
  - Normalizes git command string construction
  - Provides porcelain status parsing utilities
  - Shares commit hash extraction helpers
SEARCHABLE: sandbox git utils, git command builder, porcelain status parser
agent-frontmatter:end */

import type {
  GitCloneOptions,
  GitCommitOptions,
  GitStatus,
  GitSyncOptions,
} from "../../../../types/src/sandbox/git";

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

  command += ` -m "${escapeDoubleQuotes(options.message)}"`;

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
