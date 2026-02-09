// YDS grade order for comparison (5.0 to 5.15d)
export const GRADE_ORDER: string[] = [
    '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
    '5.10a', '5.10b', '5.10c', '5.10d', '5.10',
    '5.11a', '5.11b', '5.11c', '5.11d', '5.11',
    '5.12a', '5.12b', '5.12c', '5.12d', '5.12',
    '5.13a', '5.13b', '5.13c', '5.13d', '5.13',
    '5.14a', '5.14b', '5.14c', '5.14d', '5.14',
    '5.15a', '5.15b', '5.15c', '5.15d', '5.15',
];

/**
 * Parse a YDS grade string to a numeric value for comparison.
 * Returns -1 for non-YDS grades (bouldering, aid, etc.)
 */
export function parseGrade(rating: string): number {
    if (!rating) return -1;

    const match = rating.match(/5\.\d+[a-d]?/i);
    if (!match) return -1;

    const grade = match[0].toLowerCase();
    const index = GRADE_ORDER.indexOf(grade);

    if (index === -1) {
        const baseMatch = rating.match(/5\.\d+/);
        if (baseMatch) {
            return GRADE_ORDER.indexOf(baseMatch[0]);
        }
    }

    return index;
}

/**
 * Resolve a grade to the lowest sub-grade in its range.
 * e.g. "5.10" -> "5.10a", "5.10a" -> "5.10a", "5.9" -> "5.9"
 */
export function gradeFloor(grade: string): number {
    const idx = parseGrade(grade);
    if (idx === -1) return -1;
    const g = GRADE_ORDER[idx];
    // If it's a bare grade like "5.10" (no letter), find the "a" variant
    if (/^5\.\d+$/.test(g)) {
        const aVariant = g + 'a';
        const aIdx = GRADE_ORDER.indexOf(aVariant);
        return aIdx !== -1 ? aIdx : idx;
    }
    return idx;
}

/**
 * Resolve a grade to the highest sub-grade in its range.
 * e.g. "5.10" -> "5.10d", "5.10a" -> "5.10a", "5.9" -> "5.9"
 */
export function gradeCeil(grade: string): number {
    const idx = parseGrade(grade);
    if (idx === -1) return -1;
    const g = GRADE_ORDER[idx];
    // If it's a bare grade like "5.10" (no letter), find the "d" variant
    if (/^5\.\d+$/.test(g)) {
        const dVariant = g + 'd';
        const dIdx = GRADE_ORDER.indexOf(dVariant);
        return dIdx !== -1 ? dIdx : idx;
    }
    return idx;
}

/**
 * Check if a grade is at or above a minimum grade threshold.
 * Bare grades like "5.10" resolve to their "a" variant for min comparison.
 */
export function isGradeAtOrAbove(rating: string, minGrade: string): boolean {
    const ratingValue = parseGrade(rating);
    const minValue = gradeFloor(minGrade);
    if (ratingValue === -1 || minValue === -1) return false;
    return ratingValue >= minValue;
}

/**
 * Get the display-friendly grade from a rating string
 */
export function extractGrade(rating: string): string {
    if (!rating) return 'Unknown';
    const match = rating.match(/5\.\d+[a-d]?/i);
    return match ? match[0] : rating.split(' ')[0];
}
