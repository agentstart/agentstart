import { bash } from "./bash/tool";
import { glob } from "./glob/tool";
import { grep } from "./grep/tool";
import { ls } from "./ls/tool";
import { read } from "./read/tool";
import { todoWrite } from "./todo-write/tool";
import { update } from "./update/tool";
import { write } from "./write/tool";

const tools = {
  update,
  read,
  write,
  bash,
  glob,
  grep,
  ls,
  todoWrite,
} as const;

export type Tools = typeof tools;

export const innerTools = {
  todoWrite,
};
export const osTools = {
  bash,
  glob,
  grep,
  ls,
  read,
  write,
  update,
};
export const webTools = {};
