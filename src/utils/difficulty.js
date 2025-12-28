/**
 * DIFFICULTY UTILITIES
 * 
 * Single source of truth for all difficulty-related logic.
 * Import this wherever you need to work with difficulty levels.
 * 
 * Usage:
 *   import { normalizeToLevel, getDifficultyInfo, DIFFICULTY_OPTIONS } from '../utils/difficulty';
 */

// All possible ways difficulty might be stored in the database
const DIFFICULTY_ALIASES = {
  // Level 1
  '•': 1,
  '1': 1,
  'easy': 1,
  'Easy': 1,
  'level 1': 1,
  'Level 1': 1,
  
  // Level 2
  '••': 2,
  '2': 2,
  'medium': 2,
  'Medium': 2,
  'level 2': 2,
  'Level 2': 2,
  
  // Level 3
  '•••': 3,
  '3': 3,
  'hard': 3,
  'Hard': 3,
  'level 3': 3,
  'Level 3': 3,
};

// The "official" display format for each level
export const DIFFICULTY_DISPLAY = {
  1: '•',
  2: '••',
  3: '•••',
};

// Full info for each difficulty level
export const DIFFICULTY_INFO = {
  1: {
    level: 1,
    label: '•',
    name: 'Easy',
    className: 'level-1',
    color: '#22c55e', // green
  },
  2: {
    level: 2,
    label: '••',
    name: 'Medium',
    className: 'level-2',
    color: '#eab308', // yellow
  },
  3: {
    level: 3,
    label: '•••',
    name: 'Hard',
    className: 'level-3',
    color: '#ef4444', // red
  },
};

/**
 * Convert any difficulty format to a number (1, 2, or 3)
 * 
 * @param {string|number} difficulty - The difficulty in any format
 * @returns {number} - 1, 2, or 3 (defaults to 2 if unrecognized)
 * 
 * @example
 * normalizeToLevel('•••')  // returns 3
 * normalizeToLevel('easy') // returns 1
 * normalizeToLevel(2)      // returns 2
 */
export function normalizeToLevel(difficulty) {
  if (typeof difficulty === 'number') {
    return difficulty >= 1 && difficulty <= 3 ? difficulty : 2;
  }
  
  if (typeof difficulty === 'string') {
    const level = DIFFICULTY_ALIASES[difficulty] || DIFFICULTY_ALIASES[difficulty.toLowerCase()];
    return level || 2; // default to medium
  }
  
  return 2; // default to medium
}

/**
 * Convert any difficulty format to the display format (•, ••, •••)
 * 
 * @param {string|number} difficulty - The difficulty in any format
 * @returns {string} - '•', '••', or '•••'
 * 
 * @example
 * normalizeToDisplay('easy') // returns '•'
 * normalizeToDisplay(3)      // returns '•••'
 */
export function normalizeToDisplay(difficulty) {
  const level = normalizeToLevel(difficulty);
  return DIFFICULTY_DISPLAY[level];
}

/**
 * Get full difficulty info object
 * 
 * @param {string|number} difficulty - The difficulty in any format
 * @returns {object} - { level, label, name, className, color }
 * 
 * @example
 * getDifficultyInfo('•••')
 * // returns { level: 3, label: '•••', name: 'Hard', className: 'level-3', color: '#ef4444' }
 */
export function getDifficultyInfo(difficulty) {
  const level = normalizeToLevel(difficulty);
  return DIFFICULTY_INFO[level];
}

/**
 * Get all possible database values that match a given difficulty level
 * Useful for database queries
 * 
 * @param {number} level - 1, 2, or 3
 * @returns {string[]} - Array of all matching values
 * 
 * @example
 * getDifficultyVariations(1)
 * // returns ['•', '1', 'easy', 'Easy', 'level 1', 'Level 1']
 */
export function getDifficultyVariations(level) {
  return Object.entries(DIFFICULTY_ALIASES)
    .filter(([_, lvl]) => lvl === level)
    .map(([key, _]) => key);
}

/**
 * Check if two difficulties are the same level
 * 
 * @param {string|number} diff1 
 * @param {string|number} diff2 
 * @returns {boolean}
 * 
 * @example
 * isSameDifficulty('•', 'easy')  // returns true
 * isSameDifficulty('••', 3)      // returns false
 */
export function isSameDifficulty(diff1, diff2) {
  return normalizeToLevel(diff1) === normalizeToLevel(diff2);
}

/**
 * Options for a difficulty dropdown/select
 * Ready to use in a <select> element
 */
export const DIFFICULTY_OPTIONS = [
  { value: '•', label: 'Level 1 (•)', level: 1 },
  { value: '••', label: 'Level 2 (••)', level: 2 },
  { value: '•••', label: 'Level 3 (•••)', level: 3 },
];
