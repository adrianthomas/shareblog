export function workPageEnabled(): boolean {
  return process.env.ENABLE_WORK_PAGE === "true";
}
