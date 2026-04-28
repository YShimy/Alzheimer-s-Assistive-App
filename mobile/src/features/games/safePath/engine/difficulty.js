"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_LIVES = exports.MIN_TIER = exports.MAX_TIER = exports.DIFFICULTY_LADDER = void 0;
exports.getTier = getTier;
exports.getRecentOutcomes = getRecentOutcomes;
exports.shouldUpgradeTier = shouldUpgradeTier;
exports.needsSupportAdjustment = needsSupportAdjustment;
exports.decideNextTier = decideNextTier;
exports.getSupportConfig = getSupportConfig;
// ─── Exact Difficulty Ladder ────────────────────────────────
exports.DIFFICULTY_LADDER = [
    // Tutorial 0: Learn movement only
    { tier: 0, gridRows: 3, gridCols: 3, bombCount: 0, previewDurationMs: 0, targetSolveTimeMs: 30000, pathMinLength: 2, branching: 'none' },
    // Tier 1: First real challenge
    { tier: 1, gridRows: 3, gridCols: 3, bombCount: 1, previewDurationMs: 4000, targetSolveTimeMs: 20000, pathMinLength: 3, branching: 'none' },
    // Tier 2: More bombs
    { tier: 2, gridRows: 3, gridCols: 3, bombCount: 2, previewDurationMs: 4000, targetSolveTimeMs: 18000, pathMinLength: 4, branching: 'none' },
    // Tier 3: Larger grid
    { tier: 3, gridRows: 4, gridCols: 4, bombCount: 2, previewDurationMs: 3800, targetSolveTimeMs: 25000, pathMinLength: 5, branching: 'low' },
    // Tier 4: More bombs, slightly less preview
    { tier: 4, gridRows: 4, gridCols: 4, bombCount: 3, previewDurationMs: 3600, targetSolveTimeMs: 22000, pathMinLength: 5, branching: 'low' },
    // Tier 5: Moderate challenge
    { tier: 5, gridRows: 4, gridCols: 4, bombCount: 4, previewDurationMs: 3400, targetSolveTimeMs: 20000, pathMinLength: 5, branching: 'moderate' },
    // Tier 6: Larger grid
    { tier: 6, gridRows: 5, gridCols: 5, bombCount: 4, previewDurationMs: 3200, targetSolveTimeMs: 28000, pathMinLength: 7, branching: 'moderate' },
    // Tier 7: More bombs
    { tier: 7, gridRows: 5, gridCols: 5, bombCount: 5, previewDurationMs: 3000, targetSolveTimeMs: 25000, pathMinLength: 7, branching: 'moderate' },
    // Tier 8: Maximum density on 5x5
    { tier: 8, gridRows: 5, gridCols: 5, bombCount: 6, previewDurationMs: 2800, targetSolveTimeMs: 22000, pathMinLength: 7, branching: 'moderate' },
    // Tier 9: Larger grid, high challenge
    { tier: 9, gridRows: 6, gridCols: 6, bombCount: 6, previewDurationMs: 2800, targetSolveTimeMs: 35000, pathMinLength: 9, branching: 'moderate-high' },
    // Tier 10: Maximum challenge
    { tier: 10, gridRows: 6, gridCols: 6, bombCount: 7, previewDurationMs: 2500, targetSolveTimeMs: 30000, pathMinLength: 9, branching: 'moderate-high' },
];
exports.MAX_TIER = 10;
exports.MIN_TIER = 0;
/**
 * Get the difficulty tier config by tier number (0-indexed, 0-10).
 */
function getTier(tierNumber) {
    const index = Math.max(0, Math.min(tierNumber, exports.DIFFICULTY_LADDER.length - 1));
    return exports.DIFFICULTY_LADDER[index];
}
// ─── Progression Tracking ──────────────────────────────────
/**
 * Track last 3 level outcomes for advancement decisions.
 * Returns the recent history sliced to last 3.
 */
function getRecentOutcomes(history) {
    return history.slice(-3);
}
/**
 * Check if player qualifies for tier upgrade.
 * Rules: At least 2 of last 3 are 'strong_clear' AND no 2 consecutive fails.
 */
function shouldUpgradeTier(recent) {
    if (recent.length < 2)
        return false;
    const strongClears = recent.filter(r => r.outcome === 'strong_clear').length;
    const hasTwoConsecutiveFails = recent.some((r, i) => i > 0 && recent[i - 1].outcome === 'fail' && r.outcome === 'fail');
    return strongClears >= 2 && !hasTwoConsecutiveFails;
}
/**
 * Check if player needs support adjustment.
 * Rule: 2 consecutive fails on the same tier.
 */
function needsSupportAdjustment(recent, currentTier) {
    if (recent.length < 2)
        return false;
    const lastTwo = recent.slice(-2);
    return lastTwo.every(r => r.outcome === 'fail' && r.tier === currentTier);
}
/**
 * Determine next tier and support mode based on exact specification.
 */
function decideNextTier(currentTier, levelOutcome, history, isRetry) {
    // Tutorial 0: Always advance to tier 1 after any completion
    if (currentTier === 0 && levelOutcome !== 'fail') {
        return { nextTier: 1, supportMode: false, reason: 'tutorial_complete' };
    }
    // At max tier
    if (currentTier >= exports.MAX_TIER) {
        return { nextTier: exports.MAX_TIER, supportMode: false, reason: 'max_tier' };
    }
    const recent = getRecentOutcomes([...history, { tier: currentTier, outcome: levelOutcome, timestamp: Date.now() }]);
    // Check for support needs first (2 consecutive fails on same tier)
    if (needsSupportAdjustment(recent, currentTier)) {
        return {
            nextTier: currentTier, // Stay on same tier
            supportMode: true,
            reason: 'support_needed'
        };
    }
    // Check for upgrade eligibility
    if (shouldUpgradeTier(recent)) {
        return {
            nextTier: Math.min(currentTier + 1, exports.MAX_TIER),
            supportMode: false,
            reason: 'normal_advance'
        };
    }
    // Stay on current tier for mixed performance
    return {
        nextTier: currentTier,
        supportMode: isRetry, // Support mode if this was a retry
        reason: 'stay_mixed'
    };
}
function getSupportConfig() {
    return {
        previewBonusMs: 1000, // +1.0s as per spec
        highlightFirstMove: true,
        scoreMultiplier: 0.6, // Supported clear gets 60% of base
    };
}
/**
 * Starting lives for each session.
 */
exports.INITIAL_LIVES = 3;
//# sourceMappingURL=difficulty.js.map