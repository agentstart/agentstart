import { bash } from "./bash";
import { glob } from "./glob";
import { grep } from "./grep";
import { ls } from "./ls";
import { read } from "./read";
import { todoRead } from "./todo-read";
import { todoWrite } from "./todo-write";
import { update } from "./update";
import { write } from "./write";

const tools = {
  update,
  read,
  write,
  bash,
  glob,
  grep,
  ls,
  todoRead,
  todoWrite,
} as const;

export type Tools = typeof tools;

export const innerTools = {
  todoRead,
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
