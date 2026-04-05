const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const APP_BASE_PATH =
  rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/+$/, "") : "";

export function withBasePath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }

  return `${APP_BASE_PATH}${path}`;
}
