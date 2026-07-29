import io
import json
import math
import chess
import chess.pgn
from flask import Flask, request, jsonify
from flask_cors import CORS
from stockfish import Stockfish
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enables communication between React/Frontend and Flask

# Initialize Gemini Client
ai_client = genai.Client()

# Initialize Stockfish Engine
STOCKFISH_PATH = r"C:\stockfish\stockfish-windows-x86-64-avx2.exe"
stockfish = Stockfish(path=STOCKFISH_PATH)
stockfish.set_depth(12)

# Common opening theory catalog
COMMON_OPENING_MOVES = {
    "e4", "d4", "c4", "Nf3", "g3", "e5", "c5", "e6", "c6", "g6", 
    "Nf6", "Nc6", "d5", "d6", "b6", "a6", "Bc4", "Bb5", "Nc3", "f4"
}


def get_side_to_move_cp(eval_obj):
    """
    Stockfish's get_evaluation() ALWAYS returns score relative to the SIDE TO MOVE:
    - Positive CP / Mate = Advantage for the player whose turn it is to move.
    - Negative CP / Mate = Disadvantage for the player whose turn it is to move.
    """
    if not eval_obj:
        return 0

    eval_type = eval_obj.get('type', 'cp')
    val = eval_obj.get('value', 0)

    if eval_type == 'mate':
        # val > 0 means side to move mates in abs(val) moves (+10000)
        # val < 0 means side to move is mated in abs(val) moves (-10000)
        return 10000 if val > 0 else -10000
    else:
        return val


def cp_to_expected_points(cp_score):
    """
    Chess.com Expected Points Model (0.00 to 1.00)
    Converts Centipawns to expected win probability where 1.00 is won, 0.50 is even, 0.00 is lost.
    """
    cp_score = max(min(cp_score, 10000), -10000)
    return 1.0 / (1.0 + math.pow(10, -cp_score / 400.0))


def get_white_perspective_eval(board, eval_obj):
    """
    Normalizes Stockfish evaluation (which is relative to side to move)
    into an absolute evaluation relative to WHITE for UI components (EvalBar):
    - Positive = White advantage
    - Negative = Black advantage
    """
    if not eval_obj:
        return {'type': 'cp', 'value': 0}

    eval_type = eval_obj.get('type', 'cp')
    raw_val = eval_obj.get('value', 0)

    is_white_turn = (board.turn == chess.WHITE)
    val = raw_val if is_white_turn else -raw_val

    return {
        'type': eval_type,
        'value': val
    }


def get_san_move(board, uci_move_str):
    """Helper function to cleanly convert a UCI move (e.g. 'e2e4') to SAN (e.g. 'e4')"""
    if not uci_move_str:
        return "N/A"
    try:
        move = chess.Move.from_uci(uci_move_str)
        return board.san(move)
    except Exception:
        return uci_move_str


def count_material(board):
    """Calculates total material value on the board for White and Black."""
    values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
    white_mat = sum(len(board.pieces(p, chess.WHITE)) * v for p, v in values.items())
    black_mat = sum(len(board.pieces(p, chess.BLACK)) * v for p, v in values.items())
    return white_mat, black_mat


def is_piece_sacrificed(board_before, move):
    """
    Chess.com Piece Sacrifice Check:
    Detects if a move places a valuable piece (Queen, Rook, Bishop, Knight) 
    onto an attacked square or hanging square where it can be captured by the opponent.
    """
    piece = board_before.piece_at(move.from_square)
    if not piece or piece.piece_type == chess.PAWN:
        return False

    mover_color = piece.color
    opponent_color = not mover_color

    # Simulate move on copy board
    temp_board = board_before.copy()
    temp_board.push(move)

    # Check if destination square is attacked by opponent
    is_attacked = temp_board.is_attacked_by(opponent_color, move.to_square)
    
    # Check if piece is protected by own pieces after landing
    is_defended = temp_board.is_attacked_by(mover_color, move.to_square)

    # Piece is sacrificed if moved to an attacked square without equal defense, or hanging
    if is_attacked and not is_defended:
        return True
    
    # Also handles Queen/Rook traded for lower-value attackers
    if is_attacked and piece.piece_type in [chess.QUEEN, chess.ROOK]:
        attackers = temp_board.attackers(opponent_color, move.to_square)
        for sq in attackers:
            at_piece = temp_board.piece_at(sq)
            if at_piece and at_piece.piece_type in [chess.PAWN, chess.KNIGHT, chess.BISHOP]:
                return True

    return False


# =====================================================================
# FEATURE 1 & 2: NEXT MOVE SUGGESTION (Color & Sequential Move Support)
# =====================================================================
@app.route('/get_suggestion', methods=['POST'])
def get_suggestion():
    """
    Supports:
    1. Color choice ('white' or 'black')
    2. Step-by-step opponent move input via 'opponent_move' or custom 'fen'
    """
    data = request.json or {}
    player_color = data.get('color', 'white').lower()  # 'white' or 'black'
    fen = data.get('fen', chess.STARTING_FEN)
    opponent_move = data.get('opponent_move')  # Optional SAN/UCI string move by opponent

    try:
        board = chess.Board(fen)

        # Apply opponent move if provided sequentially
        if opponent_move:
            try:
                move_obj = chess.Move.from_uci(opponent_move)
            except ValueError:
                move_obj = board.parse_san(opponent_move)
            if move_obj in board.legal_moves:
                board.push(move_obj)

        stockfish.set_fen_position(board.fen())
        best_move_uci = stockfish.get_best_move()

        if not best_move_uci:
            return jsonify({'error': 'No engine move available (Checkmate or Stalemate).'}), 400

        best_move_san = get_san_move(board, best_move_uci)
        eval_raw = stockfish.get_evaluation()
        eval_data = get_white_perspective_eval(board, eval_raw)

        return jsonify({
            'current_fen': board.fen(),
            'player_color': player_color,
            'uci_move': best_move_uci,
            'san_move': best_move_san,
            'from_square': best_move_uci[:2],
            'to_square': best_move_uci[2:4],
            'evaluation': eval_data
        })
    except Exception as e:
        return jsonify({'error': f'Invalid board or move input: {str(e)}'}), 400


# =====================================================================
# FEATURE 3: PLAY WITH THE MACHINE
# =====================================================================
@app.route('/get_engine_move', methods=['POST'])
def get_engine_move():
    data = request.json or {}
    fen = data.get('fen', chess.STARTING_FEN)

    try:
        board = chess.Board(fen)
        stockfish.set_fen_position(board.fen())
        best_move_uci = stockfish.get_best_move()

        if not best_move_uci:
            return jsonify({'error': 'Game over. No legal moves left.'}), 400

        best_move_san = get_san_move(board, best_move_uci)

        return jsonify({
            'move': best_move_uci,
            'san': best_move_san
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process engine move: {str(e)}'}), 400


# =====================================================================
# FEATURE 4: PLAY WITH A HUMAN (Local State Validator)
# =====================================================================
@app.route('/validate_human_move', methods=['POST'])
def validate_human_move():
    data = request.json or {}
    fen = data.get('fen', chess.STARTING_FEN)
    move_uci = data.get('move')

    try:
        board = chess.Board(fen)
        move = chess.Move.from_uci(move_uci)

        if move in board.legal_moves:
            san_move = board.san(move)
            board.push(move)

            return jsonify({
                'valid': True,
                'new_fen': board.fen(),
                'san': san_move,
                'is_check': board.is_check(),
                'is_checkmate': board.is_checkmate(),
                'is_draw': board.is_game_over() and not board.is_checkmate()
            })
        else:
            return jsonify({'valid': False, 'error': 'Illegal move.'}), 400
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400


# =====================================================================
# FEATURE 5: GAME REVIEW (CHESS.COM CLASSIFICATION V2 SPECIFICATION)
# =====================================================================
@app.route('/review_game', methods=['POST'])
def review_game():
    data = request.json or {}
    pgn_text = data.get('pgn', '').strip()

    if not pgn_text:
        return jsonify({'error': 'PGN string cannot be empty.'}), 400

    if not pgn_text.startswith('['):
        pgn_text = f'[Event "Review"]\n[Result "*"]\n\n{pgn_text}'

    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        return jsonify({'error': 'Invalid PGN format.'}), 400

    board = game.board()
    reviews = []
    moves_list = list(game.mainline_moves())

    batch_llm_queue = []

    for index, move in enumerate(moves_list):
        fen_before = board.fen()
        legal_moves_count = board.legal_moves.count()
        is_forced = (legal_moves_count == 1)

        # 1. Engine analysis prior to move execution
        stockfish.set_fen_position(fen_before)
        eval_before = stockfish.get_evaluation()
        best_move_engine = stockfish.get_best_move()

        mover_score_before = get_side_to_move_cp(eval_before)
        exp_pts_before = cp_to_expected_points(mover_score_before)

        sandbox = chess.Board(fen_before)
        best_move_san = sandbox.san(chess.Move.from_uci(best_move_engine)) if best_move_engine else "N/A"
        move_san = board.san(move)

        # Check for piece sacrifice
        is_sacrifice = is_piece_sacrificed(sandbox, move)

        # 2. Execute move on board
        board.push(move)
        fen_after = board.fen()

        # 3. Engine analysis after move execution
        if board.is_checkmate():
            mover_score_after = 10000
        else:
            stockfish.set_fen_position(fen_after)
            eval_after = stockfish.get_evaluation()
            opponent_score_after = get_side_to_move_cp(eval_after)
            mover_score_after = -opponent_score_after

        exp_pts_after = cp_to_expected_points(mover_score_after)

        # Expected points loss (0.00 to 1.00)
        exp_pts_loss = max(0.0, exp_pts_before - exp_pts_after)

        moved_by_white = (board.turn == chess.BLACK)
        full_move_num = (index // 2) + 1
        move_label = f"{full_move_num}. {move_san}" if moved_by_white else move_san

        # Detect if opponent made a blunder on their previous move (for Miss detection)
        prev_opponent_blundered = False
        if len(reviews) > 0:
            prev_opponent_blundered = (reviews[-1]['quality'] == "Blunder")

        # ----------------------------------------------------
        # 🎯 OFFICIAL CHESS.COM CLASSIFICATION V2 LOGIC
        # ----------------------------------------------------
        move_quality = "Good Move"
        explanation = "Solid move preserving game state."

        # A) BOOK MOVES
        if full_move_num <= 5 and move_san in COMMON_OPENING_MOVES:
            move_quality = "Book"
            explanation = "Standard opening theory."

        # B) FORCED MOVES
        elif is_forced:
            move_quality = "Forced"
            explanation = "Only legal move available."

        # C) BRILLIANT MOVES (!!)
        # Spec: Good piece sacrifice + Best/Near-best move + Not in bad position after + Not completely winning before
        elif (
            is_sacrifice 
            and (move_san == best_move_san or exp_pts_loss <= 0.02)
            and exp_pts_before < 0.92          # Condition: Not already completely winning
            and exp_pts_after >= 0.40           # Condition: Position is not bad after sacrifice
        ):
            move_quality = "Brilliant"
            explanation = "Brilliant piece sacrifice! Opens winning tactical combinations."

        # D) GREAT MOVES (!)
        # Spec: Critical move (Only move in position OR swing from losing->equal / equal->winning)
        elif (
            (move_san == best_move_san and legal_moves_count > 1 and exp_pts_loss <= 0.01)
            and (
                (exp_pts_before < 0.40 and exp_pts_after >= 0.50)  # Turned losing into equal
                or (exp_pts_before <= 0.60 and exp_pts_after >= 0.80) # Turned equal into winning
                or legal_moves_count <= 3 # Only good move available
            )
        ):
            move_quality = "Great Move"
            explanation = "Great move! A critical find that turns the game momentum."

        # E) MISS (?)
        # Spec: Failed to capitalize on an opponent's blunder/mistake to get a winning position
        elif prev_opponent_blundered and exp_pts_before >= 0.65 and exp_pts_loss >= 0.15:
            move_quality = "Miss"
            explanation = "Missed opportunity! Failed to punish opponent's blunder."

        # F) BEST MOVES (Expected points loss == 0.00)
        elif move_san == best_move_san or exp_pts_loss <= 0.01:
            move_quality = "Best Move"
            explanation = "Best move recommended by Stockfish."

        # G) EXCELLENT MOVES (Loss between 0.01 and 0.02)
        elif exp_pts_loss <= 0.02:
            move_quality = "Excellent"
            explanation = "Excellent continuation maintaining position."

        # H) GOOD MOVES (Loss between 0.02 and 0.05)
        elif exp_pts_loss <= 0.05:
            move_quality = "Good Move"
            explanation = "Good move keeping strong position."

        # I) INACCURACIES (Loss between 0.05 and 0.10)
        elif exp_pts_loss <= 0.10:
            move_quality = "Inaccuracy"
            explanation = f"Inaccurate move. Best was {best_move_san}."

        # J) MISTAKES (Loss between 0.10 and 0.20)
        elif exp_pts_loss <= 0.20:
            move_quality = "Mistake"
            explanation = f"Mistake! Surrendered advantage. Best was {best_move_san}."

        # K) BLUNDERS (Loss >= 0.20 / 20%+ expected points drop)
        else:
            move_quality = "Blunder"
            explanation = f"Blunder! Critical tactical mistake. Best was {best_move_san}."

        batch_llm_queue.append({
            'id': index,
            'label': move_label,
            'fen': fen_before,
            'quality': move_quality,
            'played': move_san,
            'best': best_move_san
        })

        reviews.append({
            'num': move_label,
            'quality': move_quality,
            'explanation': explanation,
            'fen': fen_after,
            'cpl_loss': round(exp_pts_loss * 100, 1)  # Expected Points Loss %
        })

    # =====================================================================
    # ⚡ 1 BATCH GEMINI CALL FOR THE WHOLE GAME
    # =====================================================================
    if batch_llm_queue:
        prompt_items = []
        for item in batch_llm_queue:
            prompt_items.append(
                f"Move {item['id']}: ({item['label']}) | FEN: {item['fen']} | "
                f"Quality: {item['quality']} | Played: {item['played']} | Engine Best: {item['best']}"
            )

        batch_prompt = (
            "You are a witty, concise chess master coach.\n"
            "Analyze these specific match moves and provide punchy, conversational feedback.\n"
            "RULES:\n"
            "1. Output ONLY a valid JSON object mapping 'Move ID' (e.g. '0', '3') to the explanation.\n"
            "2. Keep each commentary under 10 to 12 words maximum.\n"
            "3. Be specific to the board state (e.g. 'Your Queen is hanging!', 'Forks the king and rook!', 'Missed a checkmate tactic!').\n\n"
            "MOVES TO REVIEW:\n"
            + "\n".join(prompt_items)
        )

        try:
            response = ai_client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=batch_prompt
            )
            raw_text = response.text.strip()
            
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:-3].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:-3].strip()

            batch_results = json.loads(raw_text)

            for item in batch_llm_queue:
                str_id = str(item['id'])
                if str_id in batch_results:
                    reviews[item['id']]['explanation'] = batch_results[str_id]
        except Exception as e:
            print(f"Batch AI processing fallback: {str(e)}")

    return jsonify({'reviews': reviews})


if __name__ == '__main__':
    app.run(debug=True, port=5000)