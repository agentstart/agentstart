/* agent-frontmatter:start
AGENT: Agent sandbox adapter
PURPOSE: Exposes git operations for repositories hosted inside the E2B sandbox.
USAGE: Called by tools needing git status, commits, and pushes from the sandbox.
EXPORTS: Git
FEATURES:
  - Proxies git commands through the sandbox manager
  - Handles authentication tokens for remote operations when provided
SEARCHABLE: packages, agentstart, src, sandbox, adapter, e2b, git
agent-frontmatter:end */

import type { Sandbox } from "@e2b/code-interpreter";
import path from "pathe";
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
import {
  buildGitAddCommand,
  buildGitCheckoutCommand,
  buildGitCloneCommand,
  buildGitCommitCommand,
  buildGitFetchCommand,
  buildGitInitCommand,
  buildGitSyncCommand,
  extractCommitHash,
  parseGitStatusPorcelain,
} from "@/sandbox/utils/git";
import { Bash } from "./bash";
import { DEFAULT_WORKING_DIRECTORY } from "./constants";

/**
 * Minimal Git implementation for E2B Sandbox
 * Automatically refreshes sandbox heartbeat through Bash operations
 */
export class Git implements GitAPI {
  private readonly bash: Bash;
  private readonly workingDirectory = DEFAULT_WORKING_DIRECTORY;
  private authToken?: string;
  private askpassScriptPath?: string;

  constructor(
    sandbox: Sandbox,
    manager?: { keepAlive: () => Promise<void> | void },
  ) {
    this.bash = new Bash(sandbox, manager);
  }

  private shellQuote(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  private async getGitCommandOptions(
    cwd?: string,
  ): Promise<ShellCommandOptions> {
    const options: ShellCommandOptions = {
      cwd: cwd || this.workingDirectory,
    };

    if (this.authToken && this.askpassScriptPath) {
      // Verify the script still exists before using it
      const verifyResult = await this.bash.$({
        cwd: options.cwd,
      })`test -x ${this.askpassScriptPath}`;
      if (verifyResult.exitCode === 0) {
        options.env = {
          GIT_ASKPASS: this.askpassScriptPath,
          GIT_TERMINAL_PROMPT: "0",
        };
      } else {
        // Script doesn't exist, clear the auth token and recreate
        const token = this.authToken;
        this.authToken = undefined;
        this.askpassScriptPath = undefined;
        await this.setAuthToken(token);

        if (this.askpassScriptPath) {
          options.env = {
            GIT_ASKPASS: this.askpassScriptPath,
            GIT_TERMINAL_PROMPT: "0",
          };
        }
      }
    }

    return options;
  }

  private async runGitCommand(
    command: string,
    cwd?: string,
  ): Promise<ShellCommandResult> {
    const options = await this.getGitCommandOptions(cwd);
    return this.bash.$(options)`git ${command}`;
  }

  async setAuthToken(token: string | null): Promise<void> {
    if (!token) {
      if (this.askpassScriptPath) {
        await this.bash.$({
          cwd: this.workingDirectory,
        })`rm -f ${this.askpassScriptPath}`;
      }
      this.authToken = undefined;
      this.askpassScriptPath = undefined;
      return;
    }

    if (this.authToken === token && this.askpassScriptPath) {
      return;
    }

    // Ensure working directory exists
    await this.bash.$({ cwd: "/home/user" })`mkdir -p ${this.workingDirectory}`;

    const previousScriptPath = this.askpassScriptPath;
    const scriptPath = `/tmp/git-askpass-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.sh`;

    const scriptCreationResult = await this.bash.$({
      cwd: this.workingDirectory,
    })`
node - <<'NODE'
const fs = require("fs");
const path = ${JSON.stringify(scriptPath)};
const token = ${JSON.stringify(token)};
const scriptContent = [
  '#!/bin/sh',
  'case "$1" in',
  'Username*) echo "x-access-token" ;;',
  '*) echo ' + JSON.stringify(token) + ' ;;',
  'esac', // cSpell:ignore esac
  ''
].join('\\n');
try {
  fs.writeFileSync(path, scriptContent, { mode: 0o700 });
  console.log('Script created successfully at ' + path);
} catch (error) {
  console.error('Failed to create script:', error.message);
  process.exit(1);
}
NODE
    `;

    if (scriptCreationResult.exitCode !== 0) {
      throw new Error(
        `Failed to create git askpass script: ${scriptCreationResult.stderr || scriptCreationResult.error || "Unknown error"}`,
      );
    }

    // Verify the script was created and is executable
    const verifyResult = await this.bash.$({
      cwd: this.workingDirectory,
    })`test -x ${scriptPath}`;
    if (verifyResult.exitCode !== 0) {
      throw new Error(
        `Git askpass script was not created or is not executable: ${scriptPath}`,
      );
    }

    if (previousScriptPath) {
      await this.bash.$({
        cwd: this.workingDirectory,
      })`rm -f ${previousScriptPath}`;
    }

    this.authToken = token;
    this.askpassScriptPath = scriptPath;
  }

  /**
   * Execute git command
   */
  private async git(command: string, cwd?: string): Promise<GitResult> {
    const result = await this.runGitCommand(command, cwd);

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Initialize repository
   */
  async init(
    targetPath?: string,
    options?: {
      initialBranch?: string;
      bare?: boolean;
    },
  ): Promise<GitResult> {
    const finalPath = targetPath
      ? path.join(this.workingDirectory, targetPath)
      : this.workingDirectory;

    const command = buildGitInitCommand(options);
    return this.git(command, finalPath);
  }

  /**
   * Clone repository
   */
  async clone(url: string, options?: GitCloneOptions): Promise<GitResult> {
    const command = buildGitCloneCommand(url, options);
    return this.git(command);
  }

  /**
   * Get status
   */
  async status(targetPath?: string): Promise<GitStatus> {
    const finalPath = targetPath
      ? path.join(this.workingDirectory, targetPath)
      : this.workingDirectory;

    const result = await this.runGitCommand(
      "status --porcelain=v1 --branch",
      finalPath,
    );

    return parseGitStatusPorcelain(result.stdout);
  }

  /**
   * Add files
   */
  async add(
    files: string | string[],
    options?: { force?: boolean; update?: boolean },
  ): Promise<GitResult> {
    const command = buildGitAddCommand(
      files,
      options,
      this.shellQuote.bind(this),
    );
    return this.git(command);
  }

  /**
   * Commit changes
   */
  async commit(
    options: GitCommitOptions,
  ): Promise<GitResult & { hash?: string }> {
    const command = buildGitCommitCommand(options);
    const result = await this.git(command);
    const hash = extractCommitHash(result.message ?? "");

    return {
      ...result,
      hash,
    };
  }

  /**
   * Push to remote
   */
  async push(options?: GitSyncOptions): Promise<GitResult> {
    const command = buildGitSyncCommand("push", options);
    return this.git(command);
  }

  /**
   * Pull from remote
   */
  async pull(options?: GitSyncOptions): Promise<GitResult> {
    const command = buildGitSyncCommand("pull", options);
    return this.git(command);
  }

  /**
   * Fetch from remote
   */
  async fetch(options?: {
    remote?: string;
    branch?: string;
    all?: boolean;
    prune?: boolean;
    tags?: boolean;
  }): Promise<GitResult> {
    const command = buildGitFetchCommand(options);
    return this.git(command);
  }

  /**
   * Checkout branch or files
   */
  async checkout(
    target: string,
    options?: { create?: boolean; force?: boolean; file?: boolean },
  ): Promise<GitResult> {
    const command = buildGitCheckoutCommand(target, options);
    return this.git(command);
  }

  /**
   * Manage branches
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
    // List branches
    if (options?.list || !name) {
      const result = await this.runGitCommand("branch -v");

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      const branches: GitBranch[] = [];
      for (const line of result.stdout.split("\n").filter(Boolean)) {
        const current = line.startsWith("*");
        const parts = line.substring(2).trim().split(/\s+/);
        if (parts[0]) {
          branches.push({
            name: parts[0],
            current,
            commit: parts[1],
            lastCommitMessage: parts.slice(2).join(" "),
          });
        }
      }
      return branches;
    }

    // Create or delete branch
    let cmd = "branch";
    if (options?.delete) {
      cmd += options.force ? " -D" : " -d";
      cmd += ` ${name}`;
    } else {
      cmd += ` ${name}`;
      if (options?.from) cmd += ` ${options.from}`;
    }

    return this.git(cmd);
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
    let cmd = `merge ${branch}`;
    if (options?.noFf) cmd += " --no-ff";
    if (options?.squash) cmd += " --squash";
    if (options?.strategy) cmd += ` --strategy=${options.strategy}`;
    if (options?.message)
      cmd += ` -m "${options.message.replace(/"/g, '\\"')}"`;

    return this.git(cmd);
  }

  /**
   * Rebase branch
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
    // Interactive rebase not supported
    if (options?.interactive) {
      return {
        success: false,
        message: "",
        error: "Interactive rebase is not supported in E2B Sandbox",
        exitCode: 1,
      };
    }

    let cmd = "rebase";
    if (options?.continue) cmd += " --continue";
    else if (options?.abort) cmd += " --abort";
    else if (options?.skip) cmd += " --skip";
    else cmd += ` ${onto}`;

    return this.git(cmd);
  }

  /**
   * Get commit log
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
    let cmd = 'log --format=format:"%H|%h|%an|%ae|%ad|%P|%d|%s" --date=iso';

    if (options?.limit) cmd += ` -n ${options.limit}`;
    if (options?.skip) cmd += ` --skip=${options.skip}`;
    if (options?.since) {
      const date =
        options.since instanceof Date
          ? options.since.toISOString()
          : options.since;
      cmd += ` --since="${date}"`;
    }
    if (options?.until) {
      const date =
        options.until instanceof Date
          ? options.until.toISOString()
          : options.until;
      cmd += ` --until="${date}"`;
    }
    if (options?.author) cmd += ` --author="${options.author}"`;
    if (options?.follow && options?.file) cmd += " --follow";
    if (options?.file) cmd += ` -- ${options.file}`;

    const result = await this.runGitCommand(cmd);

    if (result.exitCode !== 0 || !result.stdout) return [];

    const entries: GitLogEntry[] = [];
    for (const line of result.stdout.split("\n").filter(Boolean)) {
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
        abbrevHash,
        author: author || "",
        authorEmail,
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
   * Show diff
   */
  async diff(options?: {
    staged?: boolean;
    from?: string;
    to?: string;
    files?: string[];
    nameOnly?: boolean;
    stat?: boolean;
  }): Promise<string> {
    let cmd = "diff";
    if (options?.staged) cmd += " --staged";
    if (options?.nameOnly) cmd += " --name-only";
    if (options?.stat) cmd += " --stat";
    if (options?.from) {
      cmd += ` ${options.from}`;
      if (options?.to) cmd += ` ${options.to}`;
    }
    if (options?.files?.length) cmd += ` -- ${options.files.join(" ")}`;

    const result = await this.runGitCommand(cmd);
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
    // List stashes
    if (options?.list) {
      const result = await this.runGitCommand("stash list");
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }
      return result.stdout.split("\n").filter(Boolean);
    }

    // Stash operations
    let cmd = "stash";
    if (options?.pop) {
      cmd += " pop";
    } else if (options?.apply !== undefined) {
      cmd += ` apply stash@{${options.apply}}`;
    } else if (options?.drop !== undefined) {
      cmd += ` drop stash@{${options.drop}}`;
    } else {
      cmd += " push";
      if (options?.includeUntracked) cmd += " --include-untracked";
      if (options?.message)
        cmd += ` -m "${options.message.replace(/"/g, '\\"')}"`;
    }

    return this.git(cmd);
  }

  /**
   * Manage tags
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
    // List tags
    if (options?.list || (!name && !options)) {
      const result = await this.runGitCommand("tag");
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }
      return result.stdout.split("\n").filter(Boolean);
    }

    // Tag operations
    let cmd = "tag";
    if (options?.delete) {
      cmd += ` -d ${name}`;
    } else if (name) {
      if (options?.annotate || options?.message) cmd += " -a";
      cmd += ` ${name}`;
      if (options?.message)
        cmd += ` -m "${options.message.replace(/"/g, '\\"')}"`;
    }

    const result = await this.git(cmd);

    if (options?.push && result.success) {
      await this.git(`push origin ${name}`);
    }

    return result;
  }

  /**
   * Manage remotes
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
    // List remotes
    if (options?.list || (!name && !options)) {
      const cmd = options?.verbose ? "remote -v" : "remote";
      const result = await this.runGitCommand(cmd);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      if (!options?.verbose) {
        return result.stdout
          .split("\n")
          .filter(Boolean)
          .map((name) => ({
            name,
            fetchUrl: "",
            pushUrl: "",
          }));
      }

      // Parse verbose output
      const remotes = new Map<string, GitRemote>();
      for (const line of result.stdout.split("\n").filter(Boolean)) {
        const [name, url, type] = line.split(/\s+/);
        if (name && url) {
          if (!remotes.has(name)) {
            remotes.set(name, { name, fetchUrl: "", pushUrl: "" });
          }
          const remote = remotes.get(name)!;
          if (type === "(fetch)") remote.fetchUrl = url;
          else if (type === "(push)") remote.pushUrl = url;
        }
      }
      return Array.from(remotes.values());
    }

    // Remote operations
    let cmd = "remote";
    if (options?.remove) cmd += ` remove ${name}`;
    else if (options?.rename) cmd += ` rename ${name} ${options.rename}`;
    else if (name && url) cmd += ` add ${name} ${url}`;

    return this.git(cmd);
  }

  /**
   * Reset changes
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
    let cmd = "reset";
    if (options?.soft) cmd += " --soft";
    else if (options?.hard) cmd += " --hard";
    else if (options?.mixed !== false) cmd += " --mixed";

    if (target) cmd += ` ${target}`;
    if (options?.files?.length) cmd += ` -- ${options.files.join(" ")}`;

    return this.git(cmd);
  }

  /**
   * Revert commit
   */
  async revert(
    commit: string,
    options?: { noCommit?: boolean; mainline?: number },
  ): Promise<GitResult> {
    let cmd = `revert ${commit}`;
    if (options?.noCommit) cmd += " --no-commit";
    if (options?.mainline) cmd += ` --mainline ${options.mainline}`;

    return this.git(cmd);
  }

  /**
   * Cherry-pick commits
   */
  async cherryPick(
    commits: string | string[],
    options?: { noCommit?: boolean; mainline?: number },
  ): Promise<GitResult> {
    const commitList = Array.isArray(commits) ? commits.join(" ") : commits;
    let cmd = `cherry-pick ${commitList}`;
    if (options?.noCommit) cmd += " --no-commit";
    if (options?.mainline) cmd += ` --mainline ${options.mainline}`;

    return this.git(cmd);
  }

  /**
   * Clean untracked files
   */
  async clean(options?: {
    force?: boolean;
    directories?: boolean;
    ignored?: boolean;
    dryRun?: boolean;
  }): Promise<GitResult> {
    let cmd = "clean";
    if (options?.dryRun) cmd += " -n";
    else if (options?.force) cmd += " -f";
    if (options?.directories) cmd += " -d";
    if (options?.ignored) cmd += " -x";

    return this.git(cmd);
  }

  /**
   * Get/set config
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
    let cmd = "config";
    if (options?.global) cmd += " --global";
    else if (options?.local) cmd += " --local";
    else if (options?.system) cmd += " --system";

    // List config
    if (options?.list) {
      cmd += " --list";
      const result = await this.runGitCommand(cmd);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr,
          exitCode: result.exitCode,
        };
      }

      const config: Record<string, string> = {};
      for (const line of result.stdout.split("\n").filter(Boolean)) {
        const [key, ...valueParts] = line.split("=");
        if (key) config[key] = valueParts.join("=");
      }
      return config;
    }

    // Get/set/unset config
    if (options?.unset && key) {
      cmd += ` --unset ${key}`;
    } else if (key && value !== undefined) {
      cmd += ` ${key} "${value.replace(/"/g, '\\"')}"`;
    } else if (key) {
      cmd += ` --get ${key}`;
      const result = await this.runGitCommand(cmd);
      return result.exitCode === 0 ? result.stdout.trim() : "";
    }

    return this.git(cmd);
  }
}
