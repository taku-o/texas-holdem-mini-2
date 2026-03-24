export const PLAYER_COUNT = 5;
export const PLAYER_CONTAINER_SELECTOR = '[data-testid^="player-"]:not([data-testid^="player-cards-"])';
export const HUMAN_PLAYER_LABEL = 'You (Player)';

export const TESTID_POKER_TABLE = 'poker-table';
export const TESTID_POT_DISPLAY = 'pot-display';
export const TESTID_COMMUNITY_CARDS = 'community-cards';
export const TESTID_ACTION_LOGS = 'action-logs';
export const TESTID_CONTROLS = 'controls';
export const CARD_FACE_UP_SELECTOR = '[data-testid="card-face-up"]';

export const FLOP_CARD_COUNT = 3;
export const TURN_CARD_COUNT = 4;
export const RIVER_CARD_COUNT = 5;

export const ROLE_BADGE_SELECTOR = '[data-testid^="role-badge-"]';
export const ROLE_BADGE_COUNT = 3;
export const COMMUNITY_CARD_SLOT_COUNT = 5;
export const HUMAN_HAND_CARD_COUNT = 2;
export const DISABLED_OPACITY = '0.5';
// showdownを強制するための到達不可能なカード枚数
export const UNREACHABLE_CARD_COUNT = RIVER_CARD_COUNT + 1;
