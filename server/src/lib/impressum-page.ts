export function impressumPageEnabled(): boolean {
  return process.env.ENABLE_IMPRESSUM_PAGE === "true";
}
