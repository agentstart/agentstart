/* agent-frontmatter:start
AGENT: Sandbox git command typing
PURPOSE: Define typed contracts for git operations exposed by the sandbox runtime
USAGE: Import to interact with sandbox git helpers and results
EXPORTS: GitResult, GitStatus, GitLogEntry, GitBranch, GitRemote, GitCloneOptions, GitCommitOptions, GitSyncOptions, GitAPI
FEATURES:
  - Mirrors core git command capabilities
  - Includes auth, sync, and history helpers
  - Normalizes sandbox git responses
SEARCHABLE: sandbox git api, git typings, version control contracts, git tooling
agent-frontmatter:end */

/**
 * Result envelope returned by sandbox git commands.
 */
export interface GitResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Output message from git command */
  message?: string;
  /** Error message if operation failed */
  error?: string;
  /** Exit code from git command */
  exitCode?: number;
}

/**
 * Snapshot of repository status information.
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Whether the working directory is clean */
  clean: boolean;
  /** Files that have been modified */
  modified: string[];
  /** Files that have been added/staged */
  staged: string[];
  /** Untracked files */
  untracked: string[];
  /** Files that have been deleted */
  deleted: string[];
  /** Files that have been renamed */
  renamed: { from: string; to: string }[];
  /** Number of commits ahead of remote */
  ahead?: number;
  /** Number of commits behind remote */
  behind?: number;
}

/**
 * Parsed git log entry structure.
 */
export interface GitLogEntry {
  /** Commit hash */
  hash: string;
  /** Abbreviated commit hash */
  abbrevHash?: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail?: string;
  /** Commit date */
  date: Date;
  /** Commit message */
  message: string;
  /** Parent commit hashes */
  parents?: string[];
  /** Branch or tag references */
  refs?: string[];
}

/**
 * Describes a local or remote branch.
 */
export interface GitBranch {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  current: boolean;
  /** Remote tracking branch */
  remote?: string;
  /** Last commit hash on this branch */
  commit?: string;
  /** Last commit message */
  lastCommitMessage?: string;
}

/**
 * Remote endpoint configuration for a repository.
 */
export interface GitRemote {
  /** Remote name (e.g., "origin") */
  name: string;
  /** Fetch URL */
  fetchUrl: string;
  /** Push URL */
  pushUrl: string;
}

/**
 * Options supported by the sandbox `git clone` wrapper.
 */
export interface GitCloneOptions {
  /** Directory to clone into */
  directory?: string;
  /** Specific branch to clone */
  branch?: string;
  /** Clone depth (for shallow clone) */
  depth?: number;
  /** Whether to clone recursively with submodules */
  recursive?: boolean;
  /** Whether to use bare repository */
  bare?: boolean;
  /** Authentication token or credentials */
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  /** Progress callback */
  onProgress?: (progress: { percent: number; message: string }) => void;
}

/**
 * Parameters accepted by the sandbox `git commit` helper.
 */
export interface GitCommitOptions {
  /** Commit message */
  message: string;
  /** Whether to stage all modified files before commit */
  all?: boolean;
  /** Author information */
  author?: {
    name: string;
    email: string;
  };
  /** Whether to amend the last commit */
  amend?: boolean;
  /** Whether to skip pre-commit hooks */
  noVerify?: boolean;
  /** Sign the commit with GPG */
  signoff?: boolean;
}

/**
 * Shared options for git push and pull helpers.
 */
export interface GitSyncOptions {
  /** Remote name (default: "origin") */
  remote?: string;
  /** Branch name */
  branch?: string;
  /** Force push/pull */
  force?: boolean;
  /** Set upstream branch */
  setUpstream?: boolean;
  /** Include tags */
  tags?: boolean;
  /** Rebase instead of merge (for pull) */
  rebase?: boolean;
}

/**
 * Comprehensive sandbox git interface mirroring core CLI commands.
 */
export interface GitAPI {
  /**
   * Initialize a repository at the provided path.
   */
  init(
    path?: string,
    options?: {
      initialBranch?: string;
      bare?: boolean;
    },
  ): Promise<GitResult>;

  /**
   * Clone a repository, supporting depth, branch, and progress hooks.
   */
  clone(url: string, options?: GitCloneOptions): Promise<GitResult>;

  /**
   * Configure authentication token for subsequent git operations
   * @param token - Personal access token for authenticated Git commands. Pass null to clear.
   */
  setAuthToken(token: string | null): Promise<void>;

  /**
   * Inspect repository status for the provided path.
   */
  status(path?: string): Promise<GitStatus>;

  /**
   * Stage one or more paths for commit.
   */
  add(
    files: string | string[],
    options?: {
      force?: boolean;
      update?: boolean;
    },
  ): Promise<GitResult>;

  /**
   * Create a commit with optional staging, amend, and author settings.
   */
  commit(options: GitCommitOptions): Promise<GitResult & { hash?: string }>;

  /**
   * Push local commits to a remote branch.
   */
  push(options?: GitSyncOptions): Promise<GitResult>;

  /**
   * Fetch and integrate changes from a remote.
   */
  pull(options?: GitSyncOptions): Promise<GitResult>;

  /**
   * Retrieve remote updates without merging them.
   */
  fetch(options?: {
    remote?: string;
    branch?: string;
    all?: boolean;
    prune?: boolean;
    tags?: boolean;
  }): Promise<GitResult>;

  /**
   * Switch branches or restore paths from history.
   */
  checkout(
    target: string,
    options?: {
      create?: boolean;
      force?: boolean;
      file?: boolean;
    },
  ): Promise<GitResult>;

  /**
   * Manage branches: create, delete, list, or switch sources.
   */
  branch(
    name?: string,
    options?: {
      from?: string;
      delete?: boolean;
      force?: boolean;
      list?: boolean;
    },
  ): Promise<GitResult | GitBranch[]>;

  /**
   * Merge the provided branch into the current HEAD.
   */
  merge(
    branch: string,
    options?: {
      noFf?: boolean;
      squash?: boolean;
      strategy?: string;
      message?: string;
    },
  ): Promise<GitResult>;

  /**
   * Rebase the current branch onto a target reference.
   */
  rebase(
    onto: string,
    options?: {
      interactive?: boolean;
      continue?: boolean;
      abort?: boolean;
      skip?: boolean;
    },
  ): Promise<GitResult>;

  /**
   * Retrieve commit history with filtering options.
   */
  log(options?: {
    limit?: number;
    skip?: number;
    since?: Date | string;
    until?: Date | string;
    author?: string;
    file?: string;
    follow?: boolean;
    oneline?: boolean;
  }): Promise<GitLogEntry[]>;

  /**
   * Produce diffs for commits, branches, or staged changes.
   */
  diff(options?: {
    staged?: boolean;
    from?: string;
    to?: string;
    files?: string[];
    nameOnly?: boolean;
    stat?: boolean;
  }): Promise<string>;

  /**
   * Create, apply, or manage stashed changes.
   */
  stash(options?: {
    message?: string;
    includeUntracked?: boolean;
    pop?: boolean;
    apply?: number;
    drop?: number;
    list?: boolean;
  }): Promise<GitResult | string[]>;

  /**
   * Create, delete, list, or push tags.
   */
  tag(
    name?: string,
    options?: {
      message?: string;
      annotate?: boolean;
      delete?: boolean;
      list?: boolean;
      push?: boolean;
    },
  ): Promise<GitResult | string[]>;

  /**
   * Configure or query git remotes.
   */
  remote(
    name?: string,
    url?: string,
    options?: {
      add?: boolean;
      remove?: boolean;
      rename?: string;
      list?: boolean;
      verbose?: boolean;
    },
  ): Promise<GitResult | GitRemote[]>;

  /**
   * Reset HEAD or individual paths using soft, mixed, or hard modes.
   */
  reset(
    target?: string,
    options?: {
      soft?: boolean;
      mixed?: boolean;
      hard?: boolean;
      files?: string[];
    },
  ): Promise<GitResult>;

  /**
   * Create a new commit that reverses a target commit.
   */
  revert(
    commit: string,
    options?: {
      noCommit?: boolean;
      mainline?: number;
    },
  ): Promise<GitResult>;

  /**
   * Apply one or more commits onto the current branch.
   */
  cherryPick(
    commits: string | string[],
    options?: {
      noCommit?: boolean;
      mainline?: number;
    },
  ): Promise<GitResult>;

  /**
   * Remove untracked files and directories with optional dry-run support.
   */
  clean(options?: {
    force?: boolean;
    directories?: boolean;
    ignored?: boolean;
    dryRun?: boolean;
  }): Promise<GitResult>;

  /**
   * Read or update git configuration values.
   */
  config(
    key?: string,
    value?: string,
    options?: {
      global?: boolean;
      local?: boolean;
      system?: boolean;
      unset?: boolean;
      list?: boolean;
    },
  ): Promise<string | Record<string, string> | GitResult>;
}
