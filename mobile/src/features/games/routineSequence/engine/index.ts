/**
 * Routine Sequence Builder — Engine Index
 *
 * Re-exports all engine modules for clean imports.
 */

export * from './types';
export * from './difficulty';
export * from './routines';
export * from './scoring';

// Re-export with namespace for clarity
export { DEFAULT_ROUTINES } from './routines';
