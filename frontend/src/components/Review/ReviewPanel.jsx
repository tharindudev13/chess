import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  FileText,
  AlertCircle,
  User,
  RefreshCw,
  Key,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Trophy,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import WindowFrame from '../Layout/WindowFrame';
import MoveTimeline from './MoveTimeline';
import CoachCommentary from './CoachCommentary';
import SkeletonLoader from '../ui/SkeletonLoader';
import GeminiKeyModal from '../ui/GeminiKeyModal';
import { reviewGame, fetchUserGames } from '../../api';

const SAMPLE_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O`;

const QUALITY_CATEGORIES = [
  { key: 'Brilliant', label: 'Brilliant (!!)', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  { key: 'Great Move', label: 'Great (!)', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  { key: 'Best Move', label: 'Best Move (★)', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { key: 'Excellent', label: 'Excellent', color: 'text-emerald-300', bg: 'bg-emerald-600/20', border: 'border-emerald-600/30' },
  { key: 'Good Move', label: 'Good Move', color: 'text-lime-400', bg: 'bg-lime-500/20', border: 'border-lime-500/30' },
  { key: 'Forced', label: 'Forced (➔)', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' },
  { key: 'Book', label: 'Book (📖)', color: 'text-amber-500', bg: 'bg-amber-800/20', border: 'border-amber-800/30' },
  { key: 'Inaccuracy', label: 'Inaccuracy (?)', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { key: 'Mistake', label: 'Mistake (?)', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { key: 'Miss', label: 'Miss (✖)', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
  { key: 'Blunder', label: 'Blunder (??)', color: 'text-red-500', bg: 'bg-red-600/20', border: 'border-red-600/30' },
];

export default function ReviewPanel({ onLoadFen, onLoadBadge, onOrientationChange, onPlayersChange, onUsernameChange, addToast }) {
  const [pgn, setPgn] = useState('');
  const [reviews, setReviews] = useState(null);
  const [summary, setSummary] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'moves'
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Speech / TTS Audio State ──
  const [isMuted, setIsMuted] = useState(false);

  // ── Chess.com Linking State ──
  const [chesscomUser, setChesscomUser] = useState(localStorage.getItem('chesscom_username') || '');
  const [usernameInput, setUsernameInput] = useState(localStorage.getItem('chesscom_username') || '');
  const [recentGames, setRecentGames] = useState([]);
  const [isFetchingGames, setIsFetchingGames] = useState(false);

  // ── Gemini Key Modal State ──
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [pendingPgn, setPendingPgn] = useState(null);

  // Client-side Text-to-Speech (Web Speech API)
  const speakExplanation = useCallback((text) => {
    if (!isMuted && 'speechSynthesis' in window && text) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis notice:', err);
      }
    }
  }, [isMuted]);

  // Fetch games when linked user is set or changes
  const loadUserGames = useCallback(async (user) => {
    if (!user.trim()) {
      setRecentGames([]);
      return;
    }
    setIsFetchingGames(true);
    try {
      const data = await fetchUserGames(user.trim());
      setRecentGames(data.games || []);
    } catch (err) {
      addToast?.(`Chess.com games: ${err.message}`, 'error');
    } finally {
      setIsFetchingGames(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (chesscomUser) {
      loadUserGames(chesscomUser);
    }
  }, [chesscomUser, loadUserGames]);

  // Handle Linking Account
  const handleLinkAccount = (e) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    localStorage.setItem('chesscom_username', trimmed);
    setChesscomUser(trimmed);
    onUsernameChange?.(trimmed);
    loadUserGames(trimmed);
    addToast?.(`Linked Chess.com user: ${trimmed}`, 'success');
  };

  const handleUnlinkAccount = () => {
    localStorage.removeItem('chesscom_username');
    setChesscomUser('');
    setUsernameInput('');
    setRecentGames([]);
    onUsernameChange?.('');
    addToast?.('Unlinked Chess.com account', 'info');
  };

  // Execute Game Review
  const executeReview = useCallback(async (pgnToReview, playerColorPreference = null) => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setPendingPgn(pgnToReview);
      setShowKeyModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setReviews(null);
    setSummary(null);
    setSelectedMoveIndex(null);

    try {
      const data = await reviewGame(pgnToReview.trim(), playerColorPreference, chesscomUser);
      setReviews(data.reviews);
      setSummary(data.summary);
      setViewMode('overview'); // Open Game Overview initially

      const color = data.player_color || 'white';
      onOrientationChange?.(color);
      if (data.summary) {
        onPlayersChange?.({
          white: data.summary.white_player || 'White',
          black: data.summary.black_player || 'Black',
        });
      }

      if (data.reviews?.length > 0) {
        setSelectedMoveIndex(0);
        onLoadFen?.(data.reviews[0].fen);
        onLoadBadge?.({
          square: data.reviews[0].to_square,
          quality: data.reviews[0].quality,
        });
      }
    } catch (err) {
      if (err.status === 401 || err.message?.includes('Gemini API key')) {
        setPendingPgn(pgnToReview);
        setShowKeyModal(true);
      } else {
        setError(err.message);
        addToast?.('Review failed: ' + err.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [chesscomUser, onLoadFen, onLoadBadge, onOrientationChange, addToast]);

  const handleReviewClick = () => {
    if (!pgn.trim()) {
      addToast?.('Please enter PGN data or select a recent match', 'error');
      return;
    }
    executeReview(pgn);
  };

  const handleSelectRecentGame = (g) => {
    setPgn(g.pgn);
    const preferredColor = g.user_is_white ? 'white' : 'black';
    executeReview(g.pgn, preferredColor);
  };

  const handleMoveSelect = useCallback((index) => {
    setSelectedMoveIndex(index);
    if (reviews?.[index]) {
      onLoadFen?.(reviews[index].fen);
      onLoadBadge?.({
        square: reviews[index].to_square,
        quality: reviews[index].quality,
      });
      speakExplanation(reviews[index].explanation);
    }
  }, [reviews, onLoadFen, onLoadBadge, speakExplanation]);

  // Keyboard navigation for moves (Left Arrow / Right Arrow)
  useEffect(() => {
    if (!reviews || selectedMoveIndex === null || viewMode !== 'moves') return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleMoveSelect(Math.max(0, selectedMoveIndex - 1));
      } else if (e.key === 'ArrowRight') {
        handleMoveSelect(Math.min(reviews.length - 1, selectedMoveIndex + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviews, selectedMoveIndex, viewMode, handleMoveSelect]);

  const selectedMove = reviews && selectedMoveIndex !== null ? reviews[selectedMoveIndex] : null;

  return (
    <>
      <GeminiKeyModal
        isOpen={showKeyModal}
        onClose={() => {
          setShowKeyModal(false);
          setPendingPgn(null);
        }}
        onSuccess={(savedKey) => {
          setShowKeyModal(false);
          addToast?.('API Key saved!', 'success');
          if (pendingPgn) {
            executeReview(pendingPgn);
            setPendingPgn(null);
          }
        }}
      />

      <WindowFrame
        title="AI Game Review Coach"
        icon={<FileText size={16} />}
      >
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {!reviews && !isLoading ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* ── Chess.com Account Linking Header ── */}
                <div className="p-3.5 rounded-xl bg-bg-surface/70 border border-border-glass space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-accent-cyan" />
                      <span className="text-xs font-heading font-semibold text-text-primary tracking-wider uppercase">
                        Chess.com Account Linking
                      </span>
                    </div>

                    <button
                      onClick={() => setShowKeyModal(true)}
                      title="Configure Gemini API Key"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-accent-cyan text-[11px] font-mono transition-all"
                    >
                      <Key size={12} />
                      API Key
                    </button>
                  </div>

                  {chesscomUser ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-accent-cyan/5 border border-accent-cyan/15">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                        <span className="text-xs font-mono text-text-primary font-bold">
                          {chesscomUser}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadUserGames(chesscomUser)}
                          disabled={isFetchingGames}
                          className="p-1 text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
                          title="Refresh games"
                        >
                          <RefreshCw size={13} className={isFetchingGames ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={handleUnlinkAccount}
                          className="text-[11px] text-accent-red/80 hover:text-accent-red font-mono transition-colors"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleLinkAccount} className="flex gap-2">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Chess.com Username (optional)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-glass text-text-primary text-xs font-mono outline-none focus:border-accent-cyan/40 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!usernameInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-heading font-semibold hover:bg-accent-cyan/20 transition-colors disabled:opacity-40"
                      >
                        Link Account
                      </button>
                    </form>
                  )}

                  {/* Recent Matches List */}
                  {chesscomUser && (
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] font-heading text-text-muted tracking-wider uppercase block">
                        Recent Matches ({recentGames.length}) — Click for 1-Click Review:
                      </span>

                      {isFetchingGames ? (
                        <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                          <div className="w-3 h-3 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                          <span>Fetching recent games from Chess.com...</span>
                        </div>
                      ) : recentGames.length === 0 ? (
                        <span className="text-xs text-text-dim block py-1">No recent matches found.</span>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                          {recentGames.map((g) => (
                            <div
                              key={g.id}
                              onClick={() => handleSelectRecentGame(g)}
                              className="group flex items-center justify-between p-2.5 rounded-xl bg-bg-surface/80 hover:bg-accent-cyan/10 border border-border-glass hover:border-accent-cyan/30 cursor-pointer transition-all duration-200"
                            >
                              <div className="flex flex-col gap-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-accent-cyan font-heading font-semibold uppercase tracking-wider">
                                    {g.time_class || 'Match'}
                                  </span>

                                  <span className={`text-[11px] font-medium truncate ${
                                    g.user_outcome === 'win' ? 'text-emerald-400'
                                    : g.user_outcome === 'loss' ? 'text-rose-400'
                                    : 'text-text-muted'
                                  }`}>
                                    {g.reason_text}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-text-primary truncate">
                                  <span className={`flex items-center gap-1.5 truncate ${g.user_is_white ? 'font-bold text-white' : 'text-text-muted'}`}>
                                    <span className="w-2.5 h-2.5 rounded-sm bg-white border border-white/40 flex-shrink-0" />
                                    {g.white} <span className="text-[10px] text-text-dim">({g.white_rating})</span>
                                  </span>

                                  <span className="text-text-dim">vs</span>

                                  <span className={`flex items-center gap-1.5 truncate ${!g.user_is_white ? 'font-bold text-white' : 'text-text-muted'}`}>
                                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3a3a3a] border border-white/20 flex-shrink-0" />
                                    {g.black} <span className="text-[10px] text-text-dim">({g.black_rating})</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {g.user_outcome === 'win' && (
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold text-sm shadow-sm" title="Won">
                                    +
                                  </span>
                                )}
                                {g.user_outcome === 'loss' && (
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-bold text-sm shadow-sm" title="Lost">
                                    -
                                  </span>
                                )}
                                {g.user_outcome === 'draw' && (
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-500/20 text-slate-300 border border-slate-500/40 font-mono font-bold text-sm shadow-sm" title="Draw">
                                    =
                                  </span>
                                )}

                                <button className="px-2.5 py-1 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan group-hover:bg-accent-cyan group-hover:text-[#161512] font-heading font-semibold text-xs tracking-wider uppercase transition-all duration-200">
                                  Review
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual PGN Input */}
                <div>
                  <label className="text-xs font-heading text-text-muted tracking-wider uppercase mb-2 block">
                    Paste PGN Data
                  </label>
                  <textarea
                    value={pgn}
                    onChange={(e) => setPgn(e.target.value)}
                    placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 ..."
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-surface/60 border border-border-glass text-text-primary text-sm font-mono resize-none outline-none focus:border-accent-green/30 transition-colors placeholder:text-text-dim"
                  />
                </div>

                <button
                  onClick={() => setPgn(SAMPLE_PGN)}
                  className="text-xs text-text-dim hover:text-accent-cyan transition-colors"
                >
                  Load sample PGN (Ruy Lopez)
                </button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/20"
                  >
                    <AlertCircle size={14} className="text-accent-red mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-accent-red">{error}</span>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleReviewClick}
                  disabled={!pgn.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-green text-[#161512] text-sm font-bold font-heading tracking-wider uppercase shadow-lg shadow-accent-green/20 hover:shadow-accent-green/30 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  whileHover={{ scale: pgn.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: pgn.trim() ? 0.98 : 1 }}
                >
                  <Rocket size={16} />
                  Run Full Game Review
                </motion.button>
              </motion.div>
            ) : isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <SkeletonLoader lines={3} />
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-muted font-heading">Analyzing with Stockfish + Gemini AI...</span>
                </div>
                <SkeletonLoader lines={5} />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* ── Mode Switcher & TTS Voice Button ── */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex gap-1.5 p-1 rounded-xl bg-bg-surface/80 border border-border-glass">
                    <button
                      onClick={() => setViewMode('overview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
                        viewMode === 'overview'
                          ? 'bg-accent-cyan text-[#161512] shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <BarChart2 size={13} />
                      Game Overview
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('moves');
                        const idx = selectedMoveIndex !== null ? selectedMoveIndex : 0;
                        handleMoveSelect(idx);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
                        viewMode === 'moves'
                          ? 'bg-accent-cyan text-[#161512] shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Sparkles size={13} />
                      Move-by-Move Review
                    </button>
                  </div>

                  {/* 🔊 Text-To-Speech (TTS) Voice Toggle Button */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? 'Unmute Audio Coach Voice' : 'Mute Audio Coach Voice'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                      isMuted
                        ? 'bg-white/5 border-white/10 text-text-dim hover:text-text-muted'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
                    }`}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isMuted ? 'Muted' : 'Voice ON'}</span>
                  </button>
                </div>

                {/* ── VIEW 1: GAME OVERVIEW SUMMARY PANEL ── */}
                {viewMode === 'overview' && summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Compact Side-by-Side CAPS Accuracy Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* White Player Accuracy */}
                      <div className="p-2.5 rounded-xl bg-bg-surface/80 border border-border-glass space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-heading font-semibold text-text-primary flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-sm bg-white border border-white/40 flex-shrink-0" />
                            {summary.white_player}
                          </span>
                          <span className="text-[10px] font-mono text-text-dim">White</span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-mono font-extrabold text-emerald-400">
                            {summary.white_accuracy}%
                          </span>
                          <span className="text-[10px] text-text-dim font-mono">Accuracy</span>
                        </div>

                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            style={{ width: `${summary.white_accuracy}%` }}
                          />
                        </div>
                      </div>

                      {/* Black Player Accuracy */}
                      <div className="p-2.5 rounded-xl bg-bg-surface/80 border border-border-glass space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-heading font-semibold text-text-primary flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-sm bg-[#3a3a3a] border border-white/20 flex-shrink-0" />
                            {summary.black_player}
                          </span>
                          <span className="text-[10px] font-mono text-text-dim">Black</span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-mono font-extrabold text-cyan-400">
                            {summary.black_accuracy}%
                          </span>
                          <span className="text-[10px] text-text-dim font-mono">Accuracy</span>
                        </div>

                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                            style={{ width: `${summary.black_accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Move Categorization Breakdown Table */}
                    <div className="p-3 rounded-xl bg-bg-surface/80 border border-border-glass space-y-2.5">
                      <span className="text-[11px] font-heading font-semibold text-text-muted tracking-wider uppercase block">
                        Move Quality Breakdown
                      </span>

                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {QUALITY_CATEGORIES.map((cat) => {
                          const wCount = summary.white_breakdown?.[cat.key] || 0;
                          const bCount = summary.black_breakdown?.[cat.key] || 0;
                          if (wCount === 0 && bCount === 0) return null;

                          return (
                            <div
                              key={cat.key}
                              className={`flex items-center justify-between p-2 rounded-lg ${cat.bg} border ${cat.border} text-xs font-mono transition-all`}
                            >
                              <span className={`font-semibold ${cat.color}`}>
                                {cat.label}
                              </span>

                              <div className="flex items-center gap-4">
                                <span className="text-white font-bold w-6 text-center">
                                  {wCount}
                                </span>
                                <span className="text-text-dim text-[10px]">vs</span>
                                <span className="text-white font-bold w-6 text-center">
                                  {bCount}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Button: Enter Move-by-Move Review */}
                    <motion.button
                      onClick={() => {
                        setViewMode('moves');
                        const idx = selectedMoveIndex !== null ? selectedMoveIndex : 0;
                        handleMoveSelect(idx);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-cyan text-[#161512] text-xs font-bold font-heading tracking-wider uppercase shadow-lg shadow-accent-cyan/20 hover:shadow-accent-cyan/30 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles size={14} />
                      Start Move-by-Move Review
                    </motion.button>
                  </motion.div>
                )}

                {/* ── VIEW 2: STEP-BY-STEP MOVE REVIEW ── */}
                {viewMode === 'moves' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Move Navigation Controls */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-bg-surface/80 border border-border-glass">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveSelect(0)}
                          disabled={selectedMoveIndex === 0}
                          title="First Move"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                        >
                          <SkipBack size={14} />
                        </button>

                        <button
                          onClick={() => handleMoveSelect(Math.max(0, selectedMoveIndex - 1))}
                          disabled={selectedMoveIndex === 0}
                          title="Previous Move (Left Arrow)"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                        >
                          <ChevronLeft size={14} />
                        </button>
                      </div>

                      <div className="text-center">
                        <span className="text-xs font-mono font-semibold text-text-primary">
                          Move {selectedMoveIndex + 1} of {reviews.length}
                        </span>
                        {selectedMove && (
                          <span className="text-[11px] font-mono text-accent-cyan block">
                            ({selectedMove.num})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveSelect(Math.min(reviews.length - 1, selectedMoveIndex + 1))}
                          disabled={selectedMoveIndex === reviews.length - 1}
                          title="Next Move (Right Arrow)"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                        >
                          <ChevronRight size={14} />
                        </button>

                        <button
                          onClick={() => handleMoveSelect(reviews.length - 1)}
                          disabled={selectedMoveIndex === reviews.length - 1}
                          title="Last Move"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                        >
                          <SkipForward size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Move Timeline Grid */}
                    <MoveTimeline
                      reviews={reviews}
                      selectedIndex={selectedMoveIndex}
                      onSelectMove={handleMoveSelect}
                    />

                    {/* Coach Commentary */}
                    {selectedMove && (
                      <CoachCommentary move={selectedMove} />
                    )}
                  </motion.div>
                )}

                {/* Back Button to Reset */}
                <button
                  onClick={() => {
                    setReviews(null);
                    setSummary(null);
                    setSelectedMoveIndex(null);
                    setError(null);
                    onLoadBadge?.(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-surface border border-border-glass text-text-muted text-sm font-medium hover:text-text-primary hover:border-white/15 transition-all duration-200"
                >
                  Analyze Another Game
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </WindowFrame>
    </>
  );
}
