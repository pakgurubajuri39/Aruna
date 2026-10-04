import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Volume2 } from 'lucide-react';
import { Message } from '../types';
import { ARUNA_3D_ASSETS } from '../constants';

interface ChatMessageProps {
  message: Message;
  isDarkMode?: boolean;
  onSpeakMessage?: (text: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isDarkMode = true,
  onSpeakMessage,
}) => {
  const isAruna = message.role === 'model';
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div className={`flex w-full mb-5 ${isAruna ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[92%] sm:max-w-[85%] gap-3 ${isAruna ? 'flex-row' : 'flex-row-reverse'}`}>
        {isAruna && (
          <div className="shrink-0 mt-0.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/15 bg-slate-800 flex items-center justify-center shadow-sm">
              {!avatarError ? (
                <img
                  src={ARUNA_3D_ASSETS.neutral}
                  alt="Potret 3D Aruna"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="font-display text-sm font-semibold text-rose-400">A</span>
              )}
            </div>
          </div>
        )}

        <div className={`flex flex-col ${isAruna ? 'items-start' : 'items-end'}`}>
          {/* Clean unboxed metadata with typographic separator */}
          <div
            className={`flex items-center gap-1.5 text-xs mb-1.5 px-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span className={isDarkMode ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium'}>
              {isAruna ? 'Aruna' : 'Kamu'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAruna && onSpeakMessage && message.text.trim().length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onSpeakMessage(message.text)}
                  title="Dengarkan dengan suara ramah Aruna (Kore)"
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Putar Suara</span>
                </button>
              </>
            )}
          </div>

          <div
            className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed transition-colors ${
              isAruna
                ? isDarkMode
                  ? 'bg-slate-900/90 text-slate-100 border border-white/10 rounded-tl-sm'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm shadow-sm'
                : 'bg-rose-600 text-white rounded-tr-sm shadow-sm'
            }`}
          >
            <div className={`prose max-w-none prose-sm sm:prose-base ${isDarkMode ? 'prose-invert' : 'prose-slate'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                  code: ({ children }) => (
                    <code
                      className={`px-1.5 py-0.5 rounded text-xs font-mono-num ${
                        isAruna
                          ? isDarkMode
                            ? 'bg-slate-800 text-rose-300'
                            : 'bg-slate-100 text-rose-700'
                          : 'bg-rose-700/60 text-white'
                      }`}
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre
                      className={`p-3 rounded-xl my-2 overflow-x-auto text-xs font-mono-num ${
                        isDarkMode ? 'bg-black/60 text-slate-200 border border-white/10' : 'bg-slate-900 text-slate-100'
                      }`}
                    >
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
