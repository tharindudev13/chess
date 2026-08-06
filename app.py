import os
import shutil
import platform
import tarfile
import io
import json
import math
import urllib.request
import urllib.error
import chess
import chess.pgn
from flask import Flask, request, jsonify
from flask_cors import CORS
from stockfish import Stockfish
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def ensure_stockfish_linux(base_dir):
    """Auto-downloads Stockfish binary on Linux/Render if missing."""
    if platform.system() != "Linux":
        return None

    bin_dir = os.path.join(base_dir, "bin")
    local_bin = os.path.join(bin_dir, "stockfish")
    if os.path.exists(local_bin):
        return local_bin

    print("Stockfish not found on Linux/Render. Downloading binary automatically...")
    os.makedirs(bin_dir, exist_ok=True)
    tar_path = os.path.join(bin_dir, "stockfish.tar")
    url = "https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar"
    try:
        urllib.request.urlretrieve(url, tar_path)
        with tarfile.open(tar_path, "r:*") as tar:
            for member in tar.getmembers():
                if "stockfish-ubuntu" in member.name and not member.isdir():
                    f = tar.extractfile(member)
                    if f:
                        with open(local_bin, "wb") as out:
                            out.write(f.read())
                        os.chmod(local_bin, 0o755)
                        print(f"Stockfish binary downloaded successfully to {local_bin}")
                        break
        if os.path.exists(tar_path):
            os.remove(tar_path)
        if os.path.exists(local_bin):
            return local_bin
    except Exception as e:
        print(f"Failed auto-downloading Stockfish binary on Render: {e}")

    return None

def get_stockfish_path():
    """Resolves Stockfish path dynamically across Windows local dev and Render/Linux environments."""
    # 1. Environment variable override
    env_path = os.environ.get("STOCKFISH_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Local bin directory (Render build script download or auto-download)
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    except Exception:
        base_dir = os.path.abspath('.')

    local_bin = os.path.join(base_dir, "bin", "stockfish")
    if os.path.exists(local_bin):
        return local_bin

    # 3. Known Linux installation paths on Render / Ubuntu
    for linux_path in ["/usr/games/stockfish", "/usr/bin/stockfish", "/usr/local/bin/stockfish"]:
        if os.path.exists(linux_path):
            return linux_path

    # 4. System PATH lookup via shutil.which
    which_path = shutil.which("stockfish")
    if which_path:
        return which_path

    # 5. Local Windows installation paths
    win_paths = [
        r"C:\stockfish\stockfish-windows-x86-64-avx2.exe",
        r"C:\stockfish\stockfish.exe",
        r"C:\Program Files\Stockfish\stockfish.exe",
    ]
    for win_path in win_paths:
        if os.path.exists(win_path):
            return win_path

    # 6. Fallback auto-downloader on Linux
    downloaded = ensure_stockfish_linux(base_dir)
    if downloaded:
        return downloaded

    return "stockfish"

STOCKFISH_PATH = get_stockfish_path()

def create_stockfish(depth=16):
    """Creates a thread-safe Stockfish engine instance with optimized transposition table caching."""
    try:
        sf = Stockfish(path=STOCKFISH_PATH, parameters={"Threads": 2, "Hash": 32})
    except Exception:
        sf = Stockfish(path=STOCKFISH_PATH)
    sf.set_depth(depth)
    return sf

# Common opening theory catalog
COMMON_OPENING_MOVES = {
    "e4", "d4", "c4", "Nf3", "g3", "e5", "c5", "e6", "c6", "g6", 
    "Nf6", "Nc6", "d5", "d6", "b6", "a6", "Bc4", "Bb5", "Nc3", "f4"
}


def get_white_cp(eval_obj):
    """
    Stockfish's get_evaluation() ALWAYS returns score relative to WHITE:
    - Positive CP / Mate = Advantage for White.
    - Negative CP / Mate = Advantage for Black.
    """
    if not eval_obj:
        return 0

    eval_type = eval_obj.get('type', 'cp')
    val = eval_obj.get('value', 0)

    if eval_type == 'mate':
        return 10000 if val > 0 else -10000
    else:
        return val


def cp_to_expected_points(cp_score):
    """
    Chess.com Expected Points Model (0.00 to 1.00)
    Converts Centipawns to expected win probability where 1.00 is won, 0.50 is even, 0.00 is lost.
    Formula: W(cp) = 1 / (1 + 10^(-cp / 400))
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
    A move is a piece sacrifice ONLY if a valuable piece (Knight, Bishop, Rook, Queen)
    is moved to an attacked square or left hanging, WITHOUT capturing a piece of equal/higher value.
    """
    piece = board_before.piece_at(move.from_square)
    if not piece or piece.piece_type == chess.PAWN:
        return False

    captured = board_before.piece_at(move.to_square)
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9
    }

    piece_val = piece_values.get(piece.piece_type, 0)
    captured_val = piece_values.get(captured.piece_type, 0) if captured else 0

    # If capturing a piece of equal or higher value, it's a trade/gain, NOT a sacrifice
    if captured_val >= piece_val:
        return False

    mover_color = piece.color
    opponent_color = not mover_color

    # Simulate move on copy board
    temp_board = board_before.copy()
    temp_board.push(move)

    is_attacked = temp_board.is_attacked_by(opponent_color, move.to_square)
    is_defended = temp_board.is_attacked_by(mover_color, move.to_square)

    # True sacrifice: Moved to attacked square without equal defense, losing net material value
    if is_attacked and not is_defended:
        return True

    if is_attacked and piece.piece_type in [chess.QUEEN, chess.ROOK]:
        attackers = temp_board.attackers(opponent_color, move.to_square)
        for sq in attackers:
            at_piece = temp_board.piece_at(sq)
            if at_piece and piece_values.get(at_piece.piece_type, 0) < piece_val:
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
            else:
                return jsonify({'error': f'Illegal opponent move: "{opponent_move}"'}), 400

        sf = create_stockfish(depth=14)
        sf.set_fen_position(board.fen())
        best_move_uci = sf.get_best_move()

        if not best_move_uci:
            return jsonify({'error': 'No engine move available (Checkmate or Stalemate).'}), 400

        best_move_san = get_san_move(board, best_move_uci)
        eval_raw = sf.get_evaluation()
        eval_data = get_white_perspective_eval(board, eval_raw)

        # Push the AI counter-move if opponent_move was provided so FEN advances for next turn
        if opponent_move:
            counter_move_obj = chess.Move.from_uci(best_move_uci)
            board.push(counter_move_obj)

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
        sf = create_stockfish(depth=14)
        sf.set_fen_position(board.fen())
        best_move_uci = sf.get_best_move()

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
# FEATURE 5: FETCH RECENT CHESS.COM GAMES BY USERNAME (At least 10 games + detailed outcome reasons)
# =====================================================================
@app.route('/fetch_user_games', methods=['POST'])
def fetch_user_games():
    data = request.json or {}
    username = data.get('username', '').strip()

    if not username:
        return jsonify({'error': 'Username is required.'}), 400

    try:
        archives_url = f"https://api.chess.com/pub/player/{username}/games/archives"
        req = urllib.request.Request(
            archives_url,
            headers={'User-Agent': 'ChessWorkspaceApp/1.0'}
        )
        with urllib.request.urlopen(req) as resp:
            archives_data = json.loads(resp.read().decode('utf-8'))

        archives = archives_data.get('archives', [])
        if not archives:
            return jsonify({'games': []})

        raw_games = []
        # Loop backwards from the latest monthly archive until we collect at least 10 games
        for archive_url in reversed(archives):
            try:
                req_month = urllib.request.Request(
                    archive_url,
                    headers={'User-Agent': 'ChessWorkspaceApp/1.0'}
                )
                with urllib.request.urlopen(req_month) as resp_month:
                    month_data = json.loads(resp_month.read().decode('utf-8'))
                    month_games = month_data.get('games', [])
                    # Append in reverse order (newest first)
                    raw_games.extend(reversed(month_games))
            except Exception:
                continue

            if len(raw_games) >= 10:
                break

        # Slice the latest 10 games
        recent_games = raw_games[:10]

        parsed_games = []
        target_user = username.lower()

        for g in recent_games:
            white_data = g.get('white', {})
            black_data = g.get('black', {})

            white_user = white_data.get('username', 'White')
            white_rating = white_data.get('rating', '')
            white_res = white_data.get('result', '')

            black_user = black_data.get('username', 'Black')
            black_rating = black_data.get('rating', '')
            black_res = black_data.get('result', '')

            pgn = g.get('pgn', '')
            url = g.get('url', '')
            game_id = url.split('/')[-1] if url else str(hash(pgn))
            time_class = g.get('time_class', 'blitz').capitalize()
            time_control = g.get('time_control', '')

            user_is_white = (white_user.lower() == target_user)
            user_res_code = white_res if user_is_white else black_res
            opp_res_code = black_res if user_is_white else white_res
            opp_user = black_user if user_is_white else white_user
            opp_rating = black_rating if user_is_white else white_rating

            # Outcome determination relative to the linked user
            if user_res_code == 'win':
                user_outcome = 'win'
                outcome_icon = '+'
                if opp_res_code == 'checkmated':
                    reason_text = 'Won by Checkmate'
                elif opp_res_code == 'resigned':
                    reason_text = 'Won by Resignation'
                elif opp_res_code == 'timeout':
                    reason_text = 'Won on Time'
                elif opp_res_code == 'abandoned':
                    reason_text = 'Won by Abandonment'
                else:
                    reason_text = 'Won'
            elif user_res_code in ['checkmated', 'resigned', 'timeout', 'abandoned']:
                user_outcome = 'loss'
                outcome_icon = '-'
                if user_res_code == 'checkmated':
                    reason_text = 'Lost by Checkmate'
                elif user_res_code == 'resigned':
                    reason_text = 'Lost by Resignation'
                elif user_res_code == 'timeout':
                    reason_text = 'Lost on Time'
                elif user_res_code == 'abandoned':
                    reason_text = 'Lost by Abandonment'
                else:
                    reason_text = 'Lost'
            else:
                user_outcome = 'draw'
                outcome_icon = '='
                if user_res_code == 'stalemate' or opp_res_code == 'stalemate':
                    reason_text = 'Draw by Stalemate'
                elif user_res_code == 'repetition' or opp_res_code == 'repetition':
                    reason_text = 'Draw by Repetition'
                elif user_res_code == 'agreed' or opp_res_code == 'agreed':
                    reason_text = 'Draw by Agreement'
                elif user_res_code == 'insufficient' or opp_res_code == 'insufficient':
                    reason_text = 'Draw by Insufficient Material'
                elif user_res_code == '50move' or opp_res_code == '50move':
                    reason_text = 'Draw by 50-Move Rule'
                elif user_res_code == 'timevsinsufficient' or opp_res_code == 'timevsinsufficient':
                    reason_text = 'Draw by Time vs Insufficient'
                else:
                    reason_text = 'Draw'

            label = f"{white_user} ({white_rating}) vs {black_user} ({black_rating})"

            parsed_games.append({
                'id': game_id,
                'label': label,
                'pgn': pgn,
                'white': white_user,
                'white_rating': white_rating,
                'black': black_user,
                'black_rating': black_rating,
                'user_is_white': user_is_white,
                'user_outcome': user_outcome,      # 'win' | 'loss' | 'draw'
                'outcome_icon': outcome_icon,      # '+' | '-' | '='
                'reason_text': reason_text,        # e.g. "Won by Checkmate", "Lost by Resignation"
                'time_class': time_class,          # e.g. "Rapid", "Blitz"
                'time_control': time_control,
            })

        return jsonify({'games': parsed_games})
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return jsonify({'error': f'Chess.com user "{username}" not found.'}), 404
        return jsonify({'error': f'Chess.com API HTTP error {e.code}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch games: {str(e)}'}), 500


def get_top_eval(sf_instance, fen):
    """
    Evaluates top 2 engine lines in a single Stockfish pass.
    Returns: (best_move_uci, mover_score_best, mover_score_second_best)
    Scores are relative to side to move (positive = advantage).
    """
    sf_instance.set_fen_position(fen)
    top = sf_instance.get_top_moves(2)
    if not top:
        return None, 0, None
    best_move = top[0]['Move']

    if top[0].get('Mate') is not None:
        cp1 = 10000 if top[0]['Mate'] > 0 else -10000
    else:
        cp1 = top[0].get('Centipawn', 0)
        if cp1 is None:
            cp1 = 0

    cp2 = None
    if len(top) > 1:
        if top[1].get('Mate') is not None:
            cp2 = 10000 if top[1]['Mate'] > 0 else -10000
        else:
            cp2 = top[1].get('Centipawn')

    return best_move, cp1, cp2


# =====================================================================
# FEATURE 6: GAME REVIEW (CHESS.COM CLASSIFICATION V2 + PER-REQUEST GEMINI KEY)
# =====================================================================
@app.route('/review_game', methods=['POST'])
def review_game():
    # Extract Gemini API key from incoming request header or environment variable
    user_api_key = request.headers.get('X-Gemini-API-Key') or os.environ.get('GEMINI_API_KEY')
    user_ai_client = None
    if user_api_key and user_api_key.strip():
        try:
            user_ai_client = genai.Client(api_key=user_api_key.strip())
        except Exception as e:
            print(f"Notice: Gemini client init warning: {e}")

    data = request.json or {}
    pgn_text = data.get('pgn', '').strip()
    req_color = data.get('player_color', '').lower()
    req_user = data.get('username', '').lower()

    if not pgn_text:
        return jsonify({'error': 'PGN string cannot be empty.'}), 400

    if not pgn_text.startswith('['):
        pgn_text = f'[Event "Review"]\n[Result "*"]\n\n{pgn_text}'

    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        return jsonify({'error': 'Invalid PGN format.'}), 400

    # Determine user's player color
    white_player = game.headers.get('White', '').lower()
    black_player = game.headers.get('Black', '').lower()

    target_color = req_color
    if target_color not in ['white', 'black']:
        if req_user:
            if black_player and req_user in black_player:
                target_color = 'black'
            elif white_player and req_user in white_player:
                target_color = 'white'

    if target_color not in ['white', 'black']:
        target_color = 'white'  # Default fallback

    board = game.board()
    reviews = []
    moves_list = list(game.mainline_moves())

    batch_llm_queue = []

    white_losses = []
    black_losses = []
    white_counts = {}
    black_counts = {}

    sf = create_stockfish(depth=16)

    # Initial position pre-eval
    best_uci_curr, cp1_curr, cp2_curr = get_top_eval(sf, board.fen())

    for index, move in enumerate(moves_list):
        fen_before = board.fen()
        legal_moves_count = board.legal_moves.count()
        is_forced = (legal_moves_count == 1)

        moved_by_white = (board.turn == chess.WHITE)
        mover_color_str = "white" if moved_by_white else "black"
        is_user_move = (mover_color_str == target_color)

        mover_score_before = cp1_curr if cp1_curr is not None else 0
        exp_pts_before = cp_to_expected_points(mover_score_before)

        second_best_exp_pts = cp_to_expected_points(cp2_curr) if cp2_curr is not None else None

        sandbox = chess.Board(fen_before)
        best_move_san = sandbox.san(chess.Move.from_uci(best_uci_curr)) if best_uci_curr else "N/A"
        move_san = board.san(move)
        to_sq_name = chess.square_name(move.to_square)

        # Extract exact piece moved and piece captured for 100% LLM positional accuracy
        piece_moved_obj = sandbox.piece_at(move.from_square)
        piece_captured_obj = sandbox.piece_at(move.to_square)

        piece_names = {
            chess.PAWN: "Pawn",
            chess.KNIGHT: "Knight",
            chess.BISHOP: "Bishop",
            chess.ROOK: "Rook",
            chess.QUEEN: "QUEEN",
            chess.KING: "King"
        }
        moved_piece_name = piece_names.get(piece_moved_obj.piece_type, "Piece") if piece_moved_obj else "Piece"

        if not piece_captured_obj and piece_moved_obj and piece_moved_obj.piece_type == chess.PAWN and move.to_square != move.from_square and sandbox.is_en_passant(move):
            captured_piece_name = "Pawn (En Passant)"
        elif piece_captured_obj:
            captured_piece_name = piece_names.get(piece_captured_obj.piece_type, "Piece")
        else:
            captured_piece_name = "None"

        # Check for piece sacrifice
        is_sacrifice = is_piece_sacrificed(sandbox, move)

        # Execute move on board
        board.push(move)
        fen_after = board.fen()

        # Check / Checkmate status
        is_check = board.is_check()
        is_checkmate = board.is_checkmate()
        check_str = "Checkmate!" if is_checkmate else ("Check!" if is_check else "")

        # Compute next position eval & mover_score_after
        if is_checkmate:
            mover_score_after = 10000
            best_uci_curr, cp1_curr, cp2_curr = None, -10000, None
        else:
            best_uci_curr, cp1_curr, cp2_curr = get_top_eval(sf, fen_after)
            # cp1_curr is opponent's advantage in fen_after. Mover's remaining score is -cp1_curr!
            mover_score_after = -cp1_curr if cp1_curr is not None else 0

        exp_pts_after = cp_to_expected_points(mover_score_after)

        # Expected points loss (0.00 to 1.00) & Centipawn Loss (0 to 10000)
        exp_pts_loss = max(0.0, exp_pts_before - exp_pts_after)
        cpl_loss = max(0, mover_score_before - mover_score_after)

        if moved_by_white:
            white_losses.append(exp_pts_loss)
        else:
            black_losses.append(exp_pts_loss)

        full_move_num = (index // 2) + 1
        move_label = f"{full_move_num}. {move_san}" if moved_by_white else move_san

        # Detect if opponent made a blunder on their previous move (for Miss detection)
        prev_opponent_blundered = False
        if len(reviews) > 0:
            prev_opponent_blundered = (reviews[-1]['quality'] == "Blunder")

        # Detect if position after allows forced mate or immediate mate in 1 for opponent
        allows_immediate_mate = (mover_score_after <= -9500) # Opponent has Mate in 1
        allows_forced_mate = (mover_score_after <= -9000 and mover_score_before > -9000) # Allowed forced mate

        # ----------------------------------------------------
        # 🎯 OFFICIAL CHESS.COM CLASSIFICATION V2 LOGIC
        # ----------------------------------------------------
        move_quality = "Good Move"
        explanation = "Solid move maintaining a stable position."

        is_top_move = (move_san == best_move_san)

        # A) FORCED MOVES (Only 1 legal option)
        if is_forced:
            move_quality = "Forced"
            explanation = "Forced move! The only legal option available."

        # B) BOOK MOVES (Opening theory catalog in early moves)
        elif full_move_num <= 10 and move_san in COMMON_OPENING_MOVES:
            move_quality = "Book"
            explanation = "Standard opening theory."

        # C) DELIVERING CHECKMATE
        elif board.is_checkmate():
            move_quality = "Best Move"
            explanation = "Checkmate! Delivered a game-ending checkmate."

        # D) BLUNDERS (Expected Points Loss >= 0.20 OR Centipawn Loss >= 200 OR allowing checkmate)
        elif allows_immediate_mate or allows_forced_mate or exp_pts_loss >= 0.20 or cpl_loss >= 200:
            move_quality = "Blunder"
            if allows_immediate_mate:
                explanation = "Blunder! Leaves an immediate checkmate in 1 move."
            elif allows_forced_mate:
                explanation = "Blunder! Allows a forced checkmate sequence."
            elif is_user_move:
                explanation = "Blunder! Surrenders significant winning chances."
            else:
                explanation = "Blunder! Your opponent surrenders significant winning chances."

        # E) MISTAKES (Expected Points Loss >= 0.10 OR Centipawn Loss >= 100)
        elif exp_pts_loss >= 0.10 or cpl_loss >= 100:
            move_quality = "Mistake"
            explanation = "Mistake! Gives up active control of the position."

        # F) INACCURACIES (Expected Points Loss >= 0.05 OR Centipawn Loss >= 50)
        elif exp_pts_loss >= 0.05 or cpl_loss >= 50:
            move_quality = "Inaccuracy"
            explanation = "Inaccurate move. Slightly compromises piece activity."

        # G) MISS (Failed to capitalize on opponent blunder)
        elif prev_opponent_blundered and exp_pts_before >= 0.55 and (exp_pts_loss >= 0.05 or cpl_loss >= 50):
            move_quality = "Miss"
            explanation = "Missed opportunity! Failed to capitalize on opponent's mistake."

        # H) TOP ENGINE MOVES: Brilliant / Great / Best (MUST be actual top move)
        elif is_top_move:
            # 1. Brilliant (!!): Sound piece sacrifice that leads to significantly better position
            if is_sacrifice and exp_pts_after >= exp_pts_before + 0.15 and exp_pts_before < 0.90:
                move_quality = "Brilliant"
                explanation = "Brilliant piece sacrifice! Unlocks a winning tactical attack."

            # 2. Great Move (!): The played move is UNIQUELY far superior to the 2nd-best option.
            elif (
                second_best_exp_pts is not None
                and (exp_pts_after - second_best_exp_pts) >= 0.15
                and legal_moves_count >= 3  # Not a trivially forced position
            ):
                move_quality = "Great Move"
                explanation = "Great move! The only strong reply in a critical position."

            # 3. Best Move (★): Top engine move with no special conditions
            else:
                move_quality = "Best Move"
                explanation = "Spot-on move! Takes strong control of the position."

        # I) EXCELLENT MOVES (Near-optimal continuation, expected points loss <= 0.02 or CPL <= 20)
        elif exp_pts_loss <= 0.02 or cpl_loss <= 20:
            move_quality = "Excellent"
            explanation = "Excellent continuation maintaining solid piece activity."

        # J) GOOD MOVES (Solid continuation)
        else:
            move_quality = "Good Move"
            explanation = "Solid move maintaining a stable position."

        if moved_by_white:
            white_counts[move_quality] = white_counts.get(move_quality, 0) + 1
        else:
            black_counts[move_quality] = black_counts.get(move_quality, 0) + 1

        batch_llm_queue.append({
            'id': index,
            'label': move_label,
            'mover': mover_color_str.upper(),
            'is_user': is_user_move,
            'piece_moved': moved_piece_name,
            'piece_captured': captured_piece_name,
            'status': check_str,
            'fen_before': fen_before,
            'fen_after': fen_after,
            'quality': move_quality,
            'played': move_san,
            'best': best_move_san,
            'stockfish_fact': explanation
        })

        reviews.append({
            'num': move_label,
            'quality': move_quality,
            'explanation': explanation,
            'fen': fen_after,
            'to_square': to_sq_name,
            'cpl_loss': round(exp_pts_loss * 100, 1)  # Expected Points Loss %
        })

    # Summary Statistics Calculation (Official Chess.com CAPS V2 Accuracy Formula)
    def calc_caps_move_acc(exp_loss):
        if exp_loss <= 0.0:
            return 100.0
        acc = 103.1684 * math.exp(-2.3323 * exp_loss) - 3.1684
        return max(0.0, min(100.0, acc))

    white_acc_scores = [calc_caps_move_acc(l) for l in white_losses] if white_losses else [100.0]
    black_acc_scores = [calc_caps_move_acc(l) for l in black_losses] if black_losses else [100.0]

    white_accuracy = sum(white_acc_scores) / len(white_acc_scores)
    black_accuracy = sum(black_acc_scores) / len(black_acc_scores)

    summary_data = {
        'white_accuracy': round(white_accuracy, 1),
        'black_accuracy': round(black_accuracy, 1),
        'white_player': game.headers.get('White', 'White'),
        'black_player': game.headers.get('Black', 'Black'),
        'white_breakdown': white_counts,
        'black_breakdown': black_counts
    }

    # =====================================================================
    # ⚡ 1 BATCH GEMINI CALL FOR THE WHOLE GAME
    # =====================================================================
    if user_ai_client and batch_llm_queue:
        prompt_items = []
        opp_color_str = "BLACK" if target_color == "white" else "WHITE"

        for item in batch_llm_queue:
            mover_desc = f"USER ({target_color.upper()})" if item['is_user'] else f"OPPONENT ({opp_color_str})"
            cap_info = f" | CAPTURED PIECE: {item['piece_captured']}" if item['piece_captured'] != "None" else ""
            status_info = f" | {item['status']}" if item['status'] else ""

            prompt_items.append(
                f"Move ID {item['id']}: Move {item['label']} | Mover: {mover_desc} | "
                f"Piece Moved: {item['piece_moved']}{cap_info}{status_info} | "
                f"Quality: {item['quality']} | Move Context: {item['stockfish_fact']}"
            )

        batch_prompt = (
            f"You are a friendly, encouraging Grandmaster Chess Coach reviewing a game for the USER who played as {target_color.upper()}.\n\n"
            f"STRICT COACHING GUIDELINES:\n"
            f"1. ADAPTABLE PERSPECTIVE: The user played as {target_color.upper()}.\n"
            f"   - For moves played by USER ({target_color.upper()}): address the user directly (e.g. 'You claim the open file!', 'Great active square for your knight!').\n"
            f"   - For moves played by OPPONENT ({opp_color_str}): explain what your opponent did and how it affects the user (e.g. 'Your opponent advances, pressuring your knight.').\n"
            f"2. NO ENGINE/NOTATION MENTIONS:\n"
            f"   - NEVER mention 'Stockfish', 'Engine', 'computer', 'centipawns', 'CPL', or FEN strings.\n"
            f"   - DO NOT repeat algebraic move notation (like 'Bxd4', 'Rad1', 'cxd5', 'Nf3') in the comment.\n"
            f"   - Explain the strategic or tactical purpose in natural human chess terms (e.g. 'protects your king', 'pins the knight', 'missed a free pawn', 'takes the open file').\n"
            f"3. ACCURACY & CONCISENESS:\n"
            f"   - Ground your remark in the move Quality ({item['quality']}) and Captured Piece ({item['piece_captured']}).\n"
            f"   - Each comment MUST be 8 to 12 words maximum, warm, punchy, and beginner-friendly.\n"
            f"4. OUTPUT FORMAT: Output ONLY a valid JSON object mapping Move ID strings ('0', '1', '2', etc.) to the 8-12 word coach comment string.\n\n"
            f"MOVES TO REVIEW:\n"
            + "\n".join(prompt_items)
        )

        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        raw_text = None

        for mod in models_to_try:
            try:
                config = types.GenerateContentConfig(temperature=0.2) if 'types' in globals() else None
                if config:
                    response = user_ai_client.models.generate_content(
                        model=mod,
                        contents=batch_prompt,
                        config=config
                    )
                else:
                    response = user_ai_client.models.generate_content(
                        model=mod,
                        contents=batch_prompt
                    )

                if response and response.text:
                    raw_text = response.text.strip()
                    break
            except Exception as mod_err:
                print(f"Model {mod} notice: {str(mod_err)}")
                continue

        if raw_text:
            try:
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:-3].strip()
                elif raw_text.startswith("```"):
                    raw_text = raw_text[3:-3].strip()

                batch_results = json.loads(raw_text)

                for item in batch_llm_queue:
                    str_id = str(item['id'])
                    if str_id in batch_results:
                        reviews[item['id']]['explanation'] = batch_results[str_id]
            except Exception as parse_err:
                print(f"JSON parsing error: {str(parse_err)}")

    return jsonify({
        'reviews': reviews,
        'player_color': target_color,
        'summary': summary_data
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)