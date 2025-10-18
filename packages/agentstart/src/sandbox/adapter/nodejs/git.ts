/* agent-frontmatter:start
AGENT: Node.js sandbox git adapter
PURPOSE: Execute git operations within the local Node.js sandbox environment aligned with shared typings
USAGE: Instantiate with an optional working directory to interact with repositories via typed GitAPI methods
EXPORTS: Git
FEATURES:
  - Wraps git CLI commands with normalized result envelopes
  - Supports authentication tokens via temporary askpass scripts
  - Provides comprehensive git command coverage for sandbox consumers
SEARCHABLE: nodejs sandbox git adapter, git cli wrapper, repository management
agent-frontmatter:end */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  ShellCommandOptions,
  ShellCommandResult,
} from "@/sandbox/types/bash";
import type {
  GitAPI,
  GitBranch,
  GitCloneOptions,
  GitCommitOptions,
  GitLogEntry,
  GitRemote,
  GitResult,
  GitStatus,
  GitSyncOptions,
} from "@/sandbox/types/git";

import { Bash } from "./bash";

/**
 * Node.js implementation of GitAPI
 * Provides git version control operations using git command line
 */
export class Git implements GitAPI {
  private readonly workingDirectory: string;
  private readonly bash: Bash;
  private authToken?: string;
  private askpassScriptPath?: string;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.bash = new Bash(this.workingDirectory);
  }

  private async getGitCommandOptions(
    cwd?: string,
  ): Promise<ShellCommandOptions> {
    const options: ShellCommandOptions = {
      cwd: cwd || this.workingDirectory,
    };

    if (this.authToken) {
      const scriptPath = await this.ensureAskpassScript();
      options.env = {
        ...(options.env ?? {}),
        GIT_ASKPASS: scriptPath,
        GIT_TERMINAL_PROMPT: "0",
      };
    }

    return options;
  }

  private async ensureAskpassScript(): Promise<string> {
    if (!this.authToken) {
      throw new Error("Authentication token is not set");
    }

    if (this.askpassScriptPath) {
      try {
        await fs.access(this.askpassScriptPath);
        return this.askpassScriptPath;
      } catch {
        this.askpassScriptPath = undefined;
      }
    }

    const scriptDirectory = path.join(os.tmpdir(), "agentstart-git-askpass");
    await fs.mkdir(scriptDirectory, { recursive: true });

    const scriptPath = path.join(
      scriptDirectory,
      `git-askpass-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`,
    );

    const token = this.authToken.replace(/"/g, '\\"');
    const scriptContent = [
      "#!/bin/sh",
      'case "$1" in',
      'Username*) echo "x-access-token" ;;',
      `*) echo "${token}" ;;`,
      "esac",
      "",
    ].join("\n");

    await fs.writeFile(scriptPath, scriptContent, { mode: 0o700 });
    await fs.chmod(scriptPath, 0o700);

    if (this.askpassScriptPath) {
      await fs.rm(this.askpassScriptPath).catch(() => {});
    }

    this.askpassScriptPath = scriptPath;
    return scriptPath;
  }

  private async runGitCommand(
    command: string,
    cwd?: string,
  ): Promise<ShellCommandResult> {
    const options = await this.getGitCommandOptions(cwd);
    return this.bash.$(options)`git ${command}`;
  }

  private async removeAskpassScript(): Promise<void> {
    if (this.askpassScriptPath) {
      await fs.rm(this.askpassScriptPath).catch(() => {});
      this.askpassScriptPath = undefined;
    }
  }

  /**
   * Execute a git command
   */
  private async executeGitCommand(
    command: string,
    cwd?: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const result = await this.runGitCommand(command, cwd);
    return {
      stdout: result.stdout,
      stderr: result.stderr || result.error || "",
      exitCode: result.exitCode,
    };
  }

  /**
   * Initialize a new git repository
   */
  async init(
    targetPath?: string,
    options?: {
      initialBranch?: string;
      bare?: boolean;
    },
  ): Promise<GitResult> {
    const resolvedPath = targetPath
      ? path.join(this.workingDirectory, targetPath)
      : this.workingDirectory;
    let command = "init";

    if (options?.initialBranch) {
      command += ` --initial-branch=${options.initialBranch}`;
    }
    if (options?.bare) {
      command += " --bare";
    }

    const result = await this.executeGitCommand(command, resolvedPath);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Clone a git repository
   */
  async clone(url: string, options?: GitCloneOptions): Promise<GitResult> {
    let command = `clone "${url}"`;

    if (options?.directory) {
      command += ` "${options.directory}"`;
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

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  async setAuthToken(token: string | null): Promise<void> {
    if (!token) {
      this.authToken = undefined;
      await this.removeAskpassScript();
      return;
    }

    this.authToken = token;
    await this.ensureAskpassScript();
  }

  /**
   * Get current git status
   */
  async status(targetPath?: string): Promise<GitStatus> {
    const resolvedPath = targetPath
      ? path.join(this.workingDirectory, targetPath)
      : this.workingDirectory;
    const result = await this.executeGitCommand(
      "status --porcelain=v1 --branch",
      resolvedPath,
    );

    const lines = result.stdout.split("\n").filter((line) => line);
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
        // Branch info
        const branchMatch = /## (.+?)(?:\.\.\.(.+))?$/.exec(line);
        if (branchMatch?.[1]) {
          // Handle "No commits yet on <branch>" for new repositories
          const noCommitsMatch = /No commits yet on (.+)/.exec(branchMatch[1]);
          if (noCommitsMatch?.[1]) {
            status.branch = noCommitsMatch[1];
          } else {
            status.branch = branchMatch[1];
          }
          if (branchMatch[2]) {
            const aheadBehind = /\[ahead (\d+)(?:, behind (\d+))?\]/.exec(
              branchMatch[2],
            );
            if (aheadBehind?.[1]) {
              status.ahead = parseInt(aheadBehind[1], 10) || 0;
              status.behind = aheadBehind[2] ? parseInt(aheadBehind[2], 10) : 0;
            }
          }
        }
      } else {
        status.clean = false;
        const statusCode = line.substring(0, 2);
        const filename = line.substring(3);

        if (statusCode.startsWith("M") || statusCode[1] === "M") {
          status.modified.push(filename);
        }
        if (
          statusCode.startsWith("A") ||
          statusCode.startsWith("M") ||
          statusCode.startsWith("D") ||
          statusCode.startsWith("R")
        ) {
          status.staged.push(filename);
        }
        if (statusCode === "??") {
          status.untracked.push(filename);
        }
        if (statusCode.startsWith("D") || statusCode[1] === "D") {
          status.deleted.push(filename);
        }
        if (statusCode.startsWith("R")) {
          const [from, to] = filename.split(" -> ");
          if (from && to) {
            status.renamed.push({ from, to });
          }
        }
      }
    }

    return status;
  }

  /**
   * Add files to staging area
   */
  async add(
    files: string | string[],
    options?: {
      force?: boolean;
      update?: boolean;
    },
  ): Promise<GitResult> {
    const fileList = Array.isArray(files) ? files.join(" ") : files;
    let command = `add ${fileList}`;

    if (options?.force) {
      command += " --force";
    }
    if (options?.update) {
      command += " --update";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Create a commit
   */
  async commit(
    options: GitCommitOptions,
  ): Promise<GitResult & { hash?: string }> {
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

    command += ` -m "${options.message.replace(/"/g, '\\"')}"`;

    const result = await this.executeGitCommand(command);

    // Extract commit hash from output
    let hash: string | undefined;
    // Handle both regular commits and root commits
    const hashMatch =
      /\[(?:[\w\s-]+\s+)?(?:\(root-commit\)\s+)?([a-f0-9]+)\]/.exec(
        result.stdout,
      );
    if (hashMatch?.[1]) {
      hash = hashMatch[1];
    }

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
      hash,
    };
  }

  /**
   * Push commits to remote repository
   */
  async push(options?: GitSyncOptions): Promise<GitResult> {
    let command = "push";

    if (options?.remote) {
      command += ` ${options.remote}`;
    }
    if (options?.branch) {
      command += ` ${options.branch}`;
    }
    if (options?.force) {
      command += " --force";
    }
    if (options?.setUpstream) {
      command += " --set-upstream";
    }
    if (options?.tags) {
      command += " --tags";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Pull changes from remote repository
   */
  async pull(options?: GitSyncOptions): Promise<GitResult> {
    let command = "pull";

    if (options?.remote) {
      command += ` ${options.remote}`;
    }
    if (options?.branch) {
      command += ` ${options.branch}`;
    }
    if (options?.force) {
      command += " --force";
    }
    if (options?.rebase) {
      command += " --rebase";
    }
    if (options?.tags) {
      command += " --tags";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Fetch changes from remote repository
   */
  async fetch(options?: {
    remote?: string;
    branch?: string;
    all?: boolean;
    prune?: boolean;
    tags?: boolean;
  }): Promise<GitResult> {
    let command = "fetch";

    if (options?.all) {
      command += " --all";
    } else if (options?.remote) {
      command += ` ${options.remote}`;
      if (options?.branch) {
        command += ` ${options.branch}`;
      }
    }
    if (options?.prune) {
      command += " --prune";
    }
    if (options?.tags) {
      command += " --tags";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Switch branches or restore files
   */
  async checkout(
    target: string,
    options?: {
      create?: boolean;
      force?: boolean;
      file?: boolean;
    },
  ): Promise<GitResult> {
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

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Create a new branch
   */
  async branch(
    name?: string,
    options?: {
      from?: string;
      delete?: boolean;
      force?: boolean;
      list?: boolean;
    },
  ): Promise<GitResult | GitBranch[]> {
    if (options?.list || !name) {
      const result = await this.executeGitCommand("branch -v");
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      const branches: GitBranch[] = [];
      const lines = result.stdout.split("\n").filter((line) => line);

      for (const line of lines) {
        const current = line.startsWith("*");
        // Parse branch line: either "* branch_name" or "  branch_name"
        const parts = line.substring(2).trim().split(/\s+/);
        const name = parts[0];
        const commit = parts[1];
        const message = parts.slice(2).join(" ");

        if (name) {
          branches.push({
            name,
            current,
            commit: commit || undefined,
            lastCommitMessage: message || undefined,
          });
        }
      }

      return branches;
    }

    let command = "branch";

    if (options?.delete) {
      command += options.force ? " -D" : " -d";
      command += ` ${name}`;
    } else {
      command += ` ${name}`;
      if (options?.from) {
        command += ` ${options.from}`;
      }
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Merge branches
   */
  async merge(
    branch: string,
    options?: {
      noFf?: boolean;
      squash?: boolean;
      strategy?: string;
      message?: string;
    },
  ): Promise<GitResult> {
    let command = `merge ${branch}`;

    if (options?.noFf) {
      command += " --no-ff";
    }
    if (options?.squash) {
      command += " --squash";
    }
    if (options?.strategy) {
      command += ` --strategy=${options.strategy}`;
    }
    if (options?.message) {
      command += ` -m "${options.message.replace(/"/g, '\\"')}"`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Rebase current branch
   */
  async rebase(
    onto: string,
    options?: {
      interactive?: boolean;
      continue?: boolean;
      abort?: boolean;
      skip?: boolean;
    },
  ): Promise<GitResult> {
    let command = "rebase";

    if (options?.continue) {
      command += " --continue";
    } else if (options?.abort) {
      command += " --abort";
    } else if (options?.skip) {
      command += " --skip";
    } else {
      if (options?.interactive) {
        command += " -i";
      }
      command += ` ${onto}`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Get commit history
   */
  async log(options?: {
    limit?: number;
    skip?: number;
    since?: Date | string;
    until?: Date | string;
    author?: string;
    file?: string;
    follow?: boolean;
    oneline?: boolean;
  }): Promise<GitLogEntry[]> {
    let command = 'log --format=format:"%H|%h|%an|%ae|%ad|%P|%d|%s" --date=iso';

    if (options?.limit) {
      command += ` -n ${options.limit}`;
    }
    if (options?.skip) {
      command += ` --skip=${options.skip}`;
    }
    if (options?.since) {
      const date =
        options.since instanceof Date
          ? options.since.toISOString()
          : options.since;
      command += ` --since="${date}"`;
    }
    if (options?.until) {
      const date =
        options.until instanceof Date
          ? options.until.toISOString()
          : options.until;
      command += ` --until="${date}"`;
    }
    if (options?.author) {
      command += ` --author="${options.author}"`;
    }
    if (options?.follow && options?.file) {
      command += " --follow";
    }
    if (options?.file) {
      command += ` -- ${options.file}`;
    }

    const result = await this.executeGitCommand(command);

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    const entries: GitLogEntry[] = [];
    const lines = result.stdout.split("\n").filter((line) => line);

    for (const line of lines) {
      const [
        hash,
        abbrevHash,
        author,
        authorEmail,
        date,
        parents,
        refs,
        ...messageParts
      ] = line.split("|");
      entries.push({
        hash: hash || "",
        abbrevHash: abbrevHash || undefined,
        author: author || "",
        authorEmail: authorEmail || undefined,
        date: date ? new Date(date) : new Date(),
        message: messageParts.join("|"),
        parents: parents ? parents.split(" ") : [],
        refs:
          refs && refs !== " ()" ? refs.replace(/[() ]/g, "").split(",") : [],
      });
    }

    return entries;
  }

  /**
   * Show changes between commits, working tree, etc.
   */
  async diff(options?: {
    staged?: boolean;
    from?: string;
    to?: string;
    files?: string[];
    nameOnly?: boolean;
    stat?: boolean;
  }): Promise<string> {
    let command = "diff";

    if (options?.staged) {
      command += " --staged";
    }
    if (options?.nameOnly) {
      command += " --name-only";
    }
    if (options?.stat) {
      command += " --stat";
    }
    if (options?.from) {
      command += ` ${options.from}`;
      if (options?.to) {
        command += ` ${options.to}`;
      }
    }
    if (options?.files && options.files.length > 0) {
      command += ` -- ${options.files.join(" ")}`;
    }

    const result = await this.executeGitCommand(command);
    return result.stdout;
  }

  /**
   * Stash changes
   */
  async stash(options?: {
    message?: string;
    includeUntracked?: boolean;
    pop?: boolean;
    apply?: number;
    drop?: number;
    list?: boolean;
  }): Promise<GitResult | string[]> {
    if (options?.list) {
      const result = await this.executeGitCommand("stash list");
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }
      return result.stdout.split("\n").filter((line) => line);
    }

    let command = "stash";

    if (options?.pop) {
      command += " pop";
    } else if (options?.apply !== undefined) {
      command += ` apply stash@{${options.apply}}`;
    } else if (options?.drop !== undefined) {
      command += ` drop stash@{${options.drop}}`;
    } else {
      command += " push";
      if (options?.includeUntracked) {
        command += " --include-untracked";
      }
      if (options?.message) {
        command += ` -m "${options.message.replace(/"/g, '\\"')}"`;
      }
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Manage git tags
   */
  async tag(
    name?: string,
    options?: {
      message?: string;
      annotate?: boolean;
      delete?: boolean;
      list?: boolean;
      push?: boolean;
    },
  ): Promise<GitResult | string[]> {
    if (options?.list || (!name && !options)) {
      const result = await this.executeGitCommand("tag");
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }
      return result.stdout.split("\n").filter((line) => line);
    }

    let command = "tag";

    if (options?.delete) {
      command += ` -d ${name}`;
    } else if (name) {
      if (options?.annotate || options?.message) {
        command += " -a";
      }
      command += ` ${name}`;
      if (options?.message) {
        command += ` -m "${options.message.replace(/"/g, '\\"')}"`;
      }
    }

    const result = await this.executeGitCommand(command);

    if (options?.push && result.exitCode === 0) {
      await this.executeGitCommand(`push origin ${name}`);
    }

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Manage remote repositories
   */
  async remote(
    name?: string,
    url?: string,
    options?: {
      add?: boolean;
      remove?: boolean;
      rename?: string;
      list?: boolean;
      verbose?: boolean;
    },
  ): Promise<GitResult | GitRemote[]> {
    if (options?.list || (!name && !options)) {
      const command = options?.verbose ? "remote -v" : "remote";
      const result = await this.executeGitCommand(command);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      if (!options?.verbose) {
        // Simple list
        return result.stdout
          .split("\n")
          .filter((line) => line)
          .map((name) => ({
            name,
            fetchUrl: "",
            pushUrl: "",
          }));
      }

      // Verbose list with URLs
      const remotes = new Map<string, GitRemote>();
      const lines = result.stdout.split("\n").filter((line) => line);

      for (const line of lines) {
        const [name, url, type] = line.split(/\s+/);
        if (name && url) {
          if (!remotes.has(name)) {
            remotes.set(name, { name, fetchUrl: "", pushUrl: "" });
          }
          const remote = remotes.get(name)!;
          if (type === "(fetch)") {
            remote.fetchUrl = url;
          } else if (type === "(push)") {
            remote.pushUrl = url;
          }
        }
      }

      return Array.from(remotes.values());
    }

    let command = "remote";

    if (options?.remove) {
      command += ` remove ${name}`;
    } else if (options?.rename) {
      command += ` rename ${name} ${options.rename}`;
    } else if (name && url) {
      command += ` add ${name} ${url}`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Reset current HEAD to specified state
   */
  async reset(
    target?: string,
    options?: {
      soft?: boolean;
      mixed?: boolean;
      hard?: boolean;
      files?: string[];
    },
  ): Promise<GitResult> {
    let command = "reset";

    if (options?.soft) {
      command += " --soft";
    } else if (options?.hard) {
      command += " --hard";
    } else if (options?.mixed !== false) {
      command += " --mixed";
    }

    if (target) {
      command += ` ${target}`;
    }

    if (options?.files && options.files.length > 0) {
      command += ` -- ${options.files.join(" ")}`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Revert a commit
   */
  async revert(
    commit: string,
    options?: {
      noCommit?: boolean;
      mainline?: number;
    },
  ): Promise<GitResult> {
    let command = `revert ${commit}`;

    if (options?.noCommit) {
      command += " --no-commit";
    }
    if (options?.mainline) {
      command += ` --mainline ${options.mainline}`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Cherry-pick commits
   */
  async cherryPick(
    commits: string | string[],
    options?: {
      noCommit?: boolean;
      mainline?: number;
    },
  ): Promise<GitResult> {
    const commitList = Array.isArray(commits) ? commits.join(" ") : commits;
    let command = `cherry-pick ${commitList}`;

    if (options?.noCommit) {
      command += " --no-commit";
    }
    if (options?.mainline) {
      command += ` --mainline ${options.mainline}`;
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Clean untracked files and directories
   */
  async clean(options?: {
    force?: boolean;
    directories?: boolean;
    ignored?: boolean;
    dryRun?: boolean;
  }): Promise<GitResult> {
    let command = "clean";

    if (options?.dryRun) {
      command += " -n";
    } else if (options?.force) {
      command += " -f";
    }

    if (options?.directories) {
      command += " -d";
    }
    if (options?.ignored) {
      command += " -x";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Get or set git configuration
   */
  async config(
    key?: string,
    value?: string,
    options?: {
      global?: boolean;
      local?: boolean;
      system?: boolean;
      unset?: boolean;
      list?: boolean;
    },
  ): Promise<string | Record<string, string> | GitResult> {
    let command = "config";

    if (options?.global) {
      command += " --global";
    } else if (options?.local) {
      command += " --local";
    } else if (options?.system) {
      command += " --system";
    }

    if (options?.list) {
      command += " --list";
      const result = await this.executeGitCommand(command);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      const config: Record<string, string> = {};
      const lines = result.stdout.split("\n").filter((line) => line);
      for (const line of lines) {
        const [key, ...valueParts] = line.split("=");
        if (key) {
          config[key] = valueParts.join("=");
        }
      }
      return config;
    }

    if (options?.unset && key) {
      command += ` --unset ${key}`;
    } else if (key && value !== undefined) {
      command += ` ${key} "${value.replace(/"/g, '\\"')}"`;
    } else if (key) {
      command += ` --get ${key}`;
      const result = await this.executeGitCommand(command);
      return result.exitCode === 0 ? result.stdout.trim() : "";
    }

    const result = await this.executeGitCommand(command);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }
}
