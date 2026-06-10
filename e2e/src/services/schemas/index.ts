// Runtime contracts, one file per domain. Schemas are the single source of truth: the service
// parses every happy-path response through them, and types derive via `z.infer` (no drift).
export * from './catalog';
export * from './account';
export * from './wallet';
export * from './payments';
export * from './tx';
export * from './error';
