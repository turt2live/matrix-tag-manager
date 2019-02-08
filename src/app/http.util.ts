export function stripTail(s: string): string {
    if (s.endsWith("/")) return s.substring(0, s.length - 1);
    return s;
}