// =============================================================================
// NODE TYPE CONSTANTS
// =============================================================================

export const NODE_TYPES = {
  SCENE: 'Scene',
  CHARACTER: 'Character',
  CHOICE: 'Choice',
  EVENT: 'Event',
  LOCATION: 'Location',
  ITEM: 'Item',
  // Phase 2: Hierarchical Container Types
  STORY: 'Story',
  KNOT: 'Knot',
  STITCH: 'Stitch',
  CONTENT_ELEMENT: 'ContentElement',
  // Phase 3: Manga Narrative Structures
  KI: 'Ki',
  SHO: 'Sho',
  TEN: 'Ten',
  KETSU: 'Ketsu',
  JO_HA_KYU: 'JoHaKyu',
  PANEL_TRANSITION: 'PanelTransition',
  CHARACTER_NETWORK: 'CharacterNetwork',
} as const;

export const ALL_NODE_TYPES = Object.values(NODE_TYPES);

// =============================================================================
// RELATIONSHIP TYPE CONSTANTS
// =============================================================================

export const RELATIONSHIP_TYPES = {
  LEADS_TO: 'LEADS_TO',
  APPEARS_IN: 'APPEARS_IN',
  TRIGGERS: 'TRIGGERS',
  REQUIRES: 'REQUIRES',
  LOCATED_AT: 'LOCATED_AT',
  // Phase 2: Advanced Relationship Types
  CONTAINS: 'CONTAINS',
  BELONGS_TO: 'BELONGS_TO',
  CONVERGES_TO: 'CONVERGES_TO',
  GROUPED_WITH: 'GROUPED_WITH',
  INFLUENCES: 'INFLUENCES',
  APPEARS_THROUGHOUT: 'APPEARS_THROUGHOUT',
} as const;

export const ALL_RELATIONSHIP_TYPES = Object.values(RELATIONSHIP_TYPES);

// =============================================================================
// CHARACTER CONSTANTS
// =============================================================================

export const CHARACTER_ROLES = {
  PROTAGONIST: 'protagonist',
  ANTAGONIST: 'antagonist',
  SUPPORTING: 'supporting',
} as const;

export const ALL_CHARACTER_ROLES = Object.values(CHARACTER_ROLES);

// =============================================================================
// EVENT CONSTANTS
// =============================================================================

export const EVENT_TYPES = {
  PLOT: 'plot',
  CHARACTER: 'character',
  WORLD: 'world',
} as const;

export const ALL_EVENT_TYPES = Object.values(EVENT_TYPES);

// =============================================================================
// LOCATION CONSTANTS
// =============================================================================

export const LOCATION_TYPES = {
  INDOOR: 'indoor',
  OUTDOOR: 'outdoor',
  ABSTRACT: 'abstract',
} as const;

export const ALL_LOCATION_TYPES = Object.values(LOCATION_TYPES);

// =============================================================================
// TRANSITION CONSTANTS
// =============================================================================

export const TRANSITION_TYPES = {
  SEQUENTIAL: 'sequential',
  CHOICE: 'choice',
  CONDITIONAL: 'conditional',
  RANDOM: 'random',
} as const;

export const ALL_TRANSITION_TYPES = Object.values(TRANSITION_TYPES);

// =============================================================================
// REQUIREMENT CONSTANTS
// =============================================================================

export const REQUIREMENT_TYPES = {
  PREREQUISITE: 'prerequisite',
  DEPENDENCY: 'dependency',
  CONDITION: 'condition',
} as const;

export const ALL_REQUIREMENT_TYPES = Object.values(REQUIREMENT_TYPES);

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION_LIMITS = {
  // String lengths
  TITLE_MAX_LENGTH: 200,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  SHORT_DESCRIPTION_MAX_LENGTH: 500,

  // Numeric ranges
  CHAPTER_MIN: 1,
  SEQUENCE_MIN: 1,
  PANEL_COUNT_MIN: 1,
  DURATION_MIN: 1,
  CAUSALITY_LEVEL_MIN: 1,
  CAUSALITY_LEVEL_MAX: 10,

  // Weight and probability ranges
  WEIGHT_MIN: 0,
  WEIGHT_MAX: 1,
  PROBABILITY_MIN: 0,
  PROBABILITY_MAX: 1,

  // Array limits
  MAX_ARRAY_ITEMS: 100,
  MAX_VISUAL_ANCHORS: 20,
  MAX_PERSONALITY_TRAITS: 10,
  MAX_GOALS: 10,

  // Pagination
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ID: 'DUPLICATE_ID',
  RELATIONSHIP_CONSTRAINT_VIOLATION: 'RELATIONSHIP_CONSTRAINT_VIOLATION',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_VALUES = {
  // Node defaults
  PANEL_COUNT: 1,
  DURATION: 30,
  WEIGHT: 0.5,
  PROBABILITY: 1.0,
  CAUSALITY_LEVEL: 5,
  IMPORTANCE: 0.5,
  SCREEN_TIME: 0.5,

  // Pagination defaults
  PAGE: 1,
  LIMIT: 20,
  SORT_ORDER: 'asc',

  // Array defaults
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {},
} as const;

// =============================================================================
// MANGA-SPECIFIC CONSTANTS
// =============================================================================

export const MANGA_GENRES = {
  SHONEN: 'shonen',
  SHOJO: 'shojo',
  SEINEN: 'seinen',
  JOSEI: 'josei',
  KODOMOMUKE: 'kodomomuke',
} as const;

export const ALL_MANGA_GENRES = Object.values(MANGA_GENRES);

export const EMOTIONAL_TONES = {
  EXCITEMENT: 'excitement',
  SADNESS: 'sadness',
  ANGER: 'anger',
  FEAR: 'fear',
  JOY: 'joy',
  SURPRISE: 'surprise',
  DISGUST: 'disgust',
  ANTICIPATION: 'anticipation',
  TRUST: 'trust',
  CURIOSITY: 'curiosity',
  MELANCHOLY: 'melancholy',
  SERENITY: 'serenity',
  TENSION: 'tension',
  RELIEF: 'relief',
  WONDER: 'wonder',
} as const;

export const ALL_EMOTIONAL_TONES = Object.values(EMOTIONAL_TONES);

// =============================================================================
// SYSTEM CONSTANTS
// =============================================================================

export const SYSTEM_CONFIG = {
  VERSION: '3.0.0',
  PHASE: 'Phase 3 - Manga Narrative Structures',
  SCHEMA_VERSION: '3.0',
  API_VERSION: 'v1',
} as const;

// =============================================================================
// PHASE 3: KISHŌTENKETSU CONSTANTS
// =============================================================================

export const KISHOTENKETSU_PHASES = {
  KI: 'ki',
  SHO: 'sho',
  TEN: 'ten',
  KETSU: 'ketsu',
} as const;

export const KI_TYPES = {
  CHARACTER: 'character',
  SETTING: 'setting',
  MOOD: 'mood',
  CONCEPT: 'concept',
  RELATIONSHIP: 'relationship',
} as const;

export const SHO_DEVELOPMENT_TYPES = {
  CHARACTER: 'character',
  SITUATION: 'situation',
  RELATIONSHIP: 'relationship',
  CONFLICT: 'conflict',
  EXPLORATION: 'exploration',
} as const;

export const TEN_TWIST_TYPES = {
  CHARACTER_REVELATION: 'character_revelation',
  PLOT_TWIST: 'plot_twist',
  SETTING_SHIFT: 'setting_shift',
  PERCEPTION_CHANGE: 'perception_change',
  TIMELINE_REVEAL: 'timeline_reveal',
  IDENTITY_REVEAL: 'identity_reveal',
} as const;

export const KETSU_RESOLUTION_TYPES = {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  OPEN: 'open',
  CYCLICAL: 'cyclical',
} as const;

// =============================================================================
// PHASE 3: JO-HA-KYŪ CONSTANTS
// =============================================================================

export const JO_HA_KYU_PHASES = {
  JO: 'jo',
  HA: 'ha',
  KYU: 'kyu',
} as const;

export const TEMPORAL_SCALES = {
  PANEL: 'panel',
  SCENE: 'scene',
  STITCH: 'stitch',
  CHAPTER: 'chapter',
  ARC: 'arc',
  STORY: 'story',
} as const;

// =============================================================================
// PHASE 3: PANEL TRANSITION CONSTANTS
// =============================================================================

export const PANEL_TRANSITION_TYPES = {
  MOMENT_TO_MOMENT: 'moment_to_moment',
  ACTION_TO_ACTION: 'action_to_action',
  SUBJECT_TO_SUBJECT: 'subject_to_subject',
  SCENE_TO_SCENE: 'scene_to_scene',
  ASPECT_TO_ASPECT: 'aspect_to_aspect',
  NON_SEQUITUR: 'non_sequitur',
} as const;

export const TRANSITION_TEMPORAL_RELATIONSHIPS = {
  SIMULTANEOUS: 'simultaneous',
  SEQUENTIAL: 'sequential',
  FLASHBACK: 'flashback',
  FLASH_FORWARD: 'flash_forward',
  PARALLEL: 'parallel',
  CYCLICAL: 'cyclical',
} as const;

export const NARRATIVE_PURPOSES = {
  PACING: 'pacing',
  ATMOSPHERE: 'atmosphere',
  REVELATION: 'revelation',
  ACTION: 'action',
  EMOTION: 'emotion',
  TIME_PASSAGE: 'time_passage',
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;