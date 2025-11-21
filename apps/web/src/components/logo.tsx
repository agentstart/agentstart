import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function Logo({ className }: Props) {
  return (
    <svg
      className={cn("size-8", className)}
      version="1.2"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 1200"
      width="1200"
      height="1200"
    >
      <path
        id="0"
        fillRule="evenodd"
        className="fill-black dark:fill-white"
        d="m616.67 182.67l163.58 163.34c9.38 9.37 9.39 24.56 0.03 33.94l-163.35 163.59c-9.37 9.38-24.56 9.39-33.94 0.02l-163.58-163.35c-9.38-9.36-9.39-24.56-0.03-33.94l163.35-163.58c9.36-9.38 24.56-9.39 33.94-0.02z"
      />
      <path
        id="1"
        fillRule="evenodd"
        className="fill-black dark:fill-white"
        d="m379.95 419.72l163.59 163.35c9.38 9.37 9.39 24.56 0.02 33.94l-163.35 163.58c-9.36 9.38-24.56 9.39-33.94 0.03l-163.58-163.35c-9.38-9.36-9.39-24.56-0.02-33.94l163.34-163.58c9.37-9.38 24.56-9.39 33.94-0.03z"
      />
      <path
        id="2"
        fillRule="evenodd"
        className="fill-black dark:fill-white"
        d="m853.73 419.38l163.58 163.35c9.38 9.36 9.39 24.56 0.02 33.94l-163.34 163.58c-9.37 9.38-24.56 9.39-33.94 0.03l-163.59-163.35c-9.38-9.37-9.39-24.56-0.02-33.94l163.35-163.58c9.36-9.38 24.56-9.39 33.94-0.03z"
      />
      <path
        id="3"
        fillRule="evenodd"
        className="fill-black dark:fill-white"
        d="m617.01 656.44l163.58 163.35c9.38 9.36 9.39 24.56 0.03 33.94l-163.35 163.58c-9.36 9.38-24.56 9.39-33.94 0.02l-163.58-163.34c-9.38-9.37-9.39-24.56-0.03-33.94l163.35-163.59c9.37-9.38 24.56-9.39 33.94-0.02z"
      />
    </svg>
  );
}
