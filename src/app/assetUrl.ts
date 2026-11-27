// Vite replaces BASE_URL for each build. Node tests use the root default.
export function assetUrl(path: string) {
    if (path.startsWith('data:')) return path;
    return (import.meta.env?.BASE_URL ?? '/') + path.replace(/^\//, '');
}
