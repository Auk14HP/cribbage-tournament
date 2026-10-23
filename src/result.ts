// What a command returns: the new value, or the reason it was refused.
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
