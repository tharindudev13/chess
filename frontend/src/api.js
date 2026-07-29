import { API_BASE } from './utils/constants';

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

/**
 * Get engine suggestion for a position.
 * @param {object} params
 * @param {string} params.fen         – Current board FEN
 * @param {string} params.color       – Player color ('white' | 'black')
 * @param {string} [params.opponent_move] – Optional opponent move in SAN/UCI
 */
export function getEngineSuggestion({ fen, color = 'white', opponent_move }) {
  const body = { fen, color };
  if (opponent_move) body.opponent_move = opponent_move;
  return post('/get_suggestion', body);
}

/** Get engine move for bot play */
export function getEngineMove(fen) {
  return post('/get_engine_move', { fen });
}

/** Validate a human move in pass-and-play */
export function validateHumanMove(fen, move) {
  return post('/validate_human_move', { fen, move });
}

/** Submit PGN for full game review (single batch) */
export function reviewGame(pgn) {
  return post('/review_game', { pgn });
}
