import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ExternalLink, ShieldCheck, Eye, EyeOff, X } from 'lucide-react';

export default function GeminiKeyModal({ isOpen, onClose, onSuccess }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = apiKey.trim();

    if (!trimmed) {
      setError('Please enter a valid Gemini API Key.');
      return;
    }

    localStorage.setItem('gemini_api_key', trimmed);
    setError('');
    onSuccess?.(trimmed);
    onClose?.();
  };

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl bg-[#161512] border border-border-glass p-6 shadow-2xl space-y-5 text-text-primary"
        >
          {/* Close button if key already exists */}
          {localStorage.getItem('gemini_api_key') && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">
              <Key size={22} />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-text-primary">
                Set Up Your Free Gemini API Key
              </h3>
              <p className="text-xs text-text-muted">
                Required for AI Master Coach Game Review
              </p>
            </div>
          </div>

          {/* Step-by-Step Guide */}
          <div className="space-y-2.5 text-xs text-text-muted bg-bg-surface/50 p-3.5 rounded-xl border border-border-glass">
            <span className="font-heading font-semibold text-text-primary text-[11px] uppercase tracking-wider block">
              Quick 1-Minute Setup:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>
                Open{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-cyan hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Google AI Studio <ExternalLink size={11} />
                </a>
              </li>
              <li>Log in with your Google account & click <strong>"Create API Key"</strong></li>
              <li>Copy your generated key and paste it below</li>
            </ol>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-[11px] font-heading text-text-muted uppercase tracking-wider mb-1.5 block">
                Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError('');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-bg-surface border border-border-glass text-text-primary font-mono text-xs outline-none focus:border-accent-cyan/40 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 text-text-dim hover:text-text-primary transition-colors"
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && <span className="text-[11px] text-accent-red mt-1 block">{error}</span>}
            </div>

            {/* Privacy Assurance Callout Box */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs leading-relaxed">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Privacy First:</strong> Your API key is saved <strong>only in your browser's local storage</strong> (<code>localStorage</code>). It is never stored on our servers or databases, ensuring complete security and privacy.
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="w-full py-3 rounded-xl bg-accent-cyan text-[#161512] font-heading font-bold text-sm uppercase tracking-wider shadow-lg shadow-accent-cyan/20 hover:shadow-accent-cyan/30 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Save & Continue
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
