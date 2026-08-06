import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, BarChart3, Trash2, Crown, Send } from 'lucide-react';
import WindowFrame from '../Layout/WindowFrame';
import TerminalLine from './TerminalLine';
import { getEngineSuggestion } from '../../api';
import { STARTING_FEN } from '../../utils/constants';

const WELCOME_LINES = [
  { type: 'system', text: 'Chess AI Engine Terminal v2.0' },
  { type: 'system', text: 'Powered by Stockfish 16 • Depth 12' },
  { type: 'info', text: '» Select your color, enter opponent moves, and get live engine suggestions.' },
  { type: 'info', text: '» Type "help" for all commands.' },
  { type: 'divider', text: '─'.repeat(50) },
];

export default function NextMoveTerminal({ fen: externalFen, onLoadFen, onOrientationChange, onHintSquares, addToast }) {
  // ── Terminal state ──
  const [lines, setLines] = useState(WELCOME_LINES);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Assistant session state ──
  const [playerColor, setPlayerColor] = useState('white');
  const [sessionFen, setSessionFen] = useState(STARTING_FEN);
  const [moveCount, setMoveCount] = useState(0);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Sync board orientation whenever Next Move terminal is active or color changes
  useEffect(() => {
    onOrientationChange?.(playerColor);
  }, [playerColor, onOrientationChange]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // ── Line helpers ──
  const addLine = useCallback((type, text) => {
    setLines((prev) => [...prev, { type, text, id: Date.now() + Math.random() }]);
  }, []);

  const addLines = useCallback((newLines) => {
    setLines((prev) => [
      ...prev,
      ...newLines.map((l, i) => ({ ...l, id: Date.now() + i + Math.random() })),
    ]);
  }, []);

  // ──────────────────────────────────────────────
  // Core: Submit opponent move and get suggestion
  // ──────────────────────────────────────────────
  const submitOpponentMove = useCallback(async (moveStr) => {
    setIsProcessing(true);
    addLine('command', `$ opponent ${moveStr}`);
    addLine('info', `> Registering opponent move: ${moveStr}...`);
    addLine('info', `> Querying Stockfish depth 12 for counter-move...`);

    try {
      const data = await getEngineSuggestion({
        fen: sessionFen,
        color: playerColor,
        opponent_move: moveStr,
      });

      // Update session FEN to the position AFTER the engine's suggested move
      setSessionFen(data.current_fen);
      setMoveCount((prev) => prev + 1);

      // Automatically update the main board with the new position (both opponent move and counter move applied)
      onLoadFen?.(data.current_fen);

      const evalText = data.evaluation?.type === 'mate'
        ? `Mate in ${Math.abs(data.evaluation.value)}`
        : `${data.evaluation?.value > 0 ? '+' : ''}${(data.evaluation?.value / 100).toFixed(2)} pawns`;

      addLines([
        { type: 'success', text: `> Executed opponent move: ${moveStr}` },
        { type: 'success', text: `> Calculated best counter-move: ${data.san_move}` },
        { type: 'info', text: `> UCI notation: ${data.uci_move}` },
        { type: 'info', text: `> Position evaluation: ${evalText}` },
        { type: 'highlight', text: `> ✓ ${data.from_square} → ${data.to_square}  [applied to board]` },
        { type: 'info', text: `> Session FEN updated.` },
        { type: 'divider', text: '─'.repeat(50) },
      ]);

      // Highlight recommended squares on the interactive board
      onHintSquares?.({ from: data.from_square, to: data.to_square });
    } catch (err) {
      let msg = err.message;
      if (msg.includes('illegal san')) {
        const oppName = playerColor === 'black' ? 'White' : 'Black';
        msg = `"${moveStr}" is not a valid move for ${oppName} in this position.`;
      }
      addLine('error', `> ERROR: ${msg}`);
      addToast?.(`Move failed: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionFen, playerColor, addLine, addLines, onLoadFen, onHintSquares, addToast]);

  // ──────────────────────────────────────────────
  // Suggest: Get engine move for current position
  // ──────────────────────────────────────────────
  const runSuggest = useCallback(async () => {
    setIsProcessing(true);
    addLine('command', '$ suggest');
    addLine('info', `> Analyzing position as ${playerColor}...`);

    try {
      const data = await getEngineSuggestion({
        fen: sessionFen,
        color: playerColor,
      });

      const evalText = data.evaluation?.type === 'mate'
        ? `Mate in ${Math.abs(data.evaluation.value)}`
        : `${data.evaluation?.value > 0 ? '+' : ''}${(data.evaluation?.value / 100).toFixed(2)} pawns`;

      addLines([
        { type: 'success', text: `> Position evaluation: ${evalText}` },
        { type: 'success', text: `> Optimal move found: ${data.san_move} (${data.uci_move})` },
        { type: 'highlight', text: `> ✓ ${data.from_square} → ${data.to_square}  [highlighted on board]` },
        { type: 'divider', text: '─'.repeat(50) },
      ]);

      onHintSquares?.({ from: data.from_square, to: data.to_square });
    } catch (err) {
      addLine('error', `> ERROR: ${err.message}`);
      addToast?.('Engine suggestion failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionFen, playerColor, addLine, addLines, onHintSquares, addToast]);

  // ──────────────────────────────────────────────
  // Eval: Pure position evaluation
  // ──────────────────────────────────────────────
  const runEval = useCallback(async () => {
    setIsProcessing(true);
    addLine('command', '$ eval');
    addLine('info', '> Evaluating current session position...');

    try {
      const data = await getEngineSuggestion({
        fen: sessionFen,
        color: playerColor,
      });

      const evalText = data.evaluation?.type === 'mate'
        ? `Mate in ${Math.abs(data.evaluation.value)} (${data.evaluation.value > 0 ? 'White' : 'Black'})`
        : `${data.evaluation?.value > 0 ? '+' : ''}${(data.evaluation?.value / 100).toFixed(2)} pawns`;

      const advantage = data.evaluation?.value > 50 ? 'White is better'
        : data.evaluation?.value < -50 ? 'Black is better'
        : 'Position is balanced';

      addLines([
        { type: 'success', text: `> Evaluation: ${evalText}` },
        { type: 'info', text: `> Assessment: ${advantage}` },
        { type: 'info', text: `> Best continuation: ${data.san_move}` },
        { type: 'divider', text: '─'.repeat(50) },
      ]);
    } catch (err) {
      addLine('error', `> ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionFen, playerColor, addLine, addLines]);

  // ──────────────────────────────────────────────
  // Command dispatcher
  // ──────────────────────────────────────────────
  const handleCommand = useCallback((cmd) => {
    const normalized = cmd.trim().toLowerCase();
    if (!normalized) return;

    switch (normalized) {
      case 'suggest':
      case 'hint':
        runSuggest();
        break;
      case 'eval':
      case 'evaluate':
        runEval();
        break;
      case 'clear':
      case 'cls':
        setLines(WELCOME_LINES);
        onHintSquares?.(null);
        break;
      case 'fen':
        addLine('command', '$ fen');
        addLine('info', `> ${sessionFen}`);
        break;
      case 'reset':
        setSessionFen(STARTING_FEN);
        setMoveCount(0);
        onLoadFen?.(STARTING_FEN);
        addLine('command', '$ reset');
        addLine('system', '> Session reset to starting position.');
        onHintSquares?.(null);
        break;
      case 'help':
        addLines([
          { type: 'command', text: '$ help' },
          { type: 'system', text: 'Available commands:' },
          { type: 'info', text: '  <move>   — Enter opponent move (e.g. d5, Nf3, e7e5)' },
          { type: 'info', text: '  suggest  — Get best move recommendation' },
          { type: 'info', text: '  eval     — Evaluate current position' },
          { type: 'info', text: '  fen      — Display current session FEN' },
          { type: 'info', text: '  reset    — Reset board to starting position' },
          { type: 'info', text: '  clear    — Clear terminal output' },
          { type: 'info', text: '  help     — Show this help message' },
          { type: 'divider', text: '─'.repeat(50) },
        ]);
        break;
      default:
        // Treat unknown commands as opponent move input (SAN or UCI)
        submitOpponentMove(cmd.trim());
        break;
    }
  }, [runSuggest, runEval, sessionFen, addLine, addLines, onLoadFen, onHintSquares, submitOpponentMove]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isProcessing || !inputValue.trim()) return;
    handleCommand(inputValue);
    setInputValue('');
  };

  // ── Color selection handler ──
  const handleColorChange = (color) => {
    setPlayerColor(color);
    setSessionFen(STARTING_FEN);
    setMoveCount(0);
    onOrientationChange?.(color);
    onLoadFen?.(STARTING_FEN);
    const oppColor = color === 'black' ? 'White' : 'Black';
    const oppOpening = color === 'black' ? 'e4, d4' : 'e5, c5';
    addLine('system', `> Player color set to ${color.charAt(0).toUpperCase() + color.slice(1)}. Session reset and board flipped.`);
    addLine('info', `> Playing as ${color.toUpperCase()}. Enter ${oppColor}'s move (e.g. ${oppOpening}) to calculate your counter-move.`);
    onHintSquares?.(null);
  };

  return (
    <WindowFrame title="Next Move Assistant" variant="terminal">
      <div className="crt-overlay flex flex-col" style={{ minHeight: '380px', maxHeight: '520px' }}>

        {/* ── Color Selector Bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0c1018]">
          <div className="flex items-center gap-2">
            <Crown size={13} className="text-accent-cyan" />
            <span className="text-[11px] font-mono text-text-muted uppercase tracking-widest">
              Playing as
            </span>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => handleColorChange('white')}
              className={`px-3.5 py-1 text-xs font-heading font-semibold tracking-wider transition-all duration-200 ${
                playerColor === 'white'
                  ? 'bg-white text-[#161512]'
                  : 'bg-transparent text-text-dim hover:text-text-primary'
              }`}
            >
              ♔ White
            </button>
            <button
              onClick={() => handleColorChange('black')}
              className={`px-3.5 py-1 text-xs font-heading font-semibold tracking-wider transition-all duration-200 ${
                playerColor === 'black'
                  ? 'bg-[#3a3a3a] text-white'
                  : 'bg-transparent text-text-dim hover:text-text-primary'
              }`}
            >
              ♚ Black
            </button>
          </div>
        </div>

        {/* ── Terminal Output ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-0.5"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <TerminalLine key={line.id || i} type={line.type} text={line.text} index={i} />
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-accent-cyan">
              <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
              <span className="animate-pulse">Processing...</span>
            </div>
          )}
        </div>

        {/* ── Input Prompt ── */}
        <form onSubmit={handleSubmit} className="flex items-center border-t border-white/5 px-4 py-3 bg-[#0a0e14]">
          <span className="text-accent-green font-mono text-sm mr-2 whitespace-nowrap">
            user@chess-ai:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              playerColor === 'black'
                ? "Enter White's move (e.g. e4, d4)..."
                : "Enter Black's move (e.g. e5, c5)..."
            }
            disabled={isProcessing}
            className="flex-1 bg-transparent outline-none text-text-primary font-mono text-sm placeholder:text-text-dim caret-accent-cyan disabled:opacity-50"
            autoFocus
          />
          <motion.button
            type="submit"
            disabled={isProcessing || !inputValue.trim()}
            className="ml-2 p-1.5 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan disabled:opacity-30 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Send size={12} />
          </motion.button>
        </form>

        {/* ── Quick Action Buttons ── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-white/5 bg-[#080b10]">
          <button
            onClick={() => handleCommand('suggest')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20 transition-all duration-200 disabled:opacity-40"
          >
            <Lightbulb size={12} />
            suggest
          </button>
          <button
            onClick={() => handleCommand('eval')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-all duration-200 disabled:opacity-40"
          >
            <BarChart3 size={12} />
            eval
          </button>
          <button
            onClick={() => handleCommand('reset')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-xs font-medium hover:bg-accent-yellow/20 transition-all duration-200 disabled:opacity-40"
          >
            reset
          </button>
          <button
            onClick={() => handleCommand('clear')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-surface/60 border border-border-glass text-text-muted text-xs font-medium hover:text-text-primary transition-all duration-200 disabled:opacity-40"
          >
            <Trash2 size={12} />
            clear
          </button>
        </div>
      </div>
    </WindowFrame>
  );
}
