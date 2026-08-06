import { API_BASE } from './utils/constants';

async function post(endpoint, body, customHeaders = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error || `Request failed (${res.status})`);
      error.status = res.status;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Game review request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

/** Submit PGN for full game review with user's Gemini API Key in headers & player color */
export function reviewGame(pgn, playerColor = null, username = null) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const headers = apiKey ? { 'X-Gemini-API-Key': apiKey } : {};
  const body = { pgn };
  if (playerColor) body.player_color = playerColor;
  if (username) body.username = username;
  return post('/review_game', body, headers);
}

/** Fetch recent games from Chess.com for a given username */
export function fetchUserGames(username) {
  return post('/fetch_user_games', { username });
}
