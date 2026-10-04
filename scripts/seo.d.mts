export function resolveSiteUrl(env: Record<string, string | undefined>): string;
export function publicOrigin(value?: string | null): string | null;
export const pages: ReadonlyArray<{ path: string; title: string; description: string; heading: string; eyebrow: string; body: string }>;
export function buildSeo(options?: { siteUrl?: string; environment?: string }): Map<string, string>;
