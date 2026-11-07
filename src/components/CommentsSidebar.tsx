import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  MessageSquare,
  MessageSquarePlus,
  X,
  Check,
  CheckCircle2,
  Trash2,
  Edit2,
  CornerDownLeft,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DocumentComment, ThemeMode } from '../types';

interface CommentsSidebarProps {
  editor: Editor | null;
  comments: DocumentComment[];
  onSetComments: React.Dispatch<React.SetStateAction<DocumentComment[]>>;
  onClose: () => void;
  themeMode?: ThemeMode;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  editor,
  comments,
  onSetComments,
  onClose,
  themeMode = 'light',
}) => {
  const isSepia = themeMode === 'sepia';
  const isFullDark = themeMode === 'fullDark';
  const isCanvasDark = themeMode === 'canvasDark';
  const isDark = isFullDark || isCanvasDark;

  // Layout mode: 'docked' (default right toolbar) or 'floating' (popup with z-[9999])
  const [isFloating, setIsFloating] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordpad_comments_layout') === 'floating';
    } catch {
      return false;
    }
  });

  const toggleLayoutMode = () => {
    setIsFloating((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wordpad_comments_layout', next ? 'floating' : 'docked');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Filter: 'all' | 'active' | 'resolved'
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New comment composer state
  const [showComposer, setShowComposer] = useState(true);
  const [authorName, setAuthorName] = useState(() => {
    try {
      return localStorage.getItem('wordpad_comment_author') || 'Reviewer';
    } catch {
      return 'Reviewer';
    }
  });
  const [commentText, setCommentText] = useState('');
  const [currentTargetSelection, setCurrentTargetSelection] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync selected text from editor for quick referencing
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ').trim();
        if (text) {
          setCurrentTargetSelection(text);
        }
      }
    };

    updateSelection();
    editor.on('selectionUpdate', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, [editor]);

  const activeCommentsCount = useMemo(
    () => comments.filter((c) => !c.resolved).length,
    [comments]
  );
  const resolvedCommentsCount = useMemo(
    () => comments.filter((c) => c.resolved).length,
    [comments]
  );

  // Filtered comments list
  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      if (filterMode === 'active' && comment.resolved) return false;
      if (filterMode === 'resolved' && !comment.resolved) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = comment.text.toLowerCase().includes(q);
        const authorMatch = comment.author.toLowerCase().includes(q);
        const targetMatch = comment.selectedText?.toLowerCase().includes(q);
        return textMatch || authorMatch || targetMatch;
      }
      return true;
    });
  }, [comments, filterMode, searchQuery]);

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  // Handle post new comment
  const handlePostComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const trimmedAuthor = authorName.trim() || 'Reviewer';
    try {
      localStorage.setItem('wordpad_comment_author', trimmedAuthor);
    } catch {
      // ignore
    }

    const newComment: DocumentComment = {
      id: `comment-${Date.now()}`,
      author: trimmedAuthor,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedText: currentTargetSelection || undefined,
      resolved: false,
    };

    onSetComments((prev) => [newComment, ...prev]);
    setCommentText('');
    showNotification('Comment added');
  };

  // Handle toggle resolve
  const handleToggleResolve = (id: string) => {
    onSetComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
  };

  // Handle delete comment
  const handleDeleteComment = (id: string) => {
    onSetComments((prev) => prev.filter((c) => c.id !== id));
    showNotification('Comment removed');
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onSetComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text: trimmed } : c))
    );
    setEditingCommentId(null);
    setEditText('');
    showNotification('Comment updated');
  };

  // Jump to quoted text in document
  const handleJumpToText = (text?: string) => {
    if (!editor || !text) return;
    try {
      const doc = editor.state.doc;
      let targetPos: { from: number; to: number } | null = null;

      doc.descendants((node, pos) => {
        if (targetPos) return false;
        if (node.isText && node.text && node.text.includes(text)) {
          const index = node.text.indexOf(text);
          targetPos = {
            from: pos + index,
            to: pos + index + text.length,
          };
          return false;
        }
      });

      if (targetPos) {
        editor.chain().focus().setTextSelection(targetPos).scrollIntoView().run();
        showNotification('Jumped to selection');
      }
    } catch {
      editor.commands.focus();
    }
  };

  // Content body
  const content = (
    <div
      className={`flex flex-col h-full select-none text-xs ${
        isDark
          ? 'bg-neutral-900 text-neutral-100'
          : isSepia
          ? 'bg-[#f4ecd8] text-[#433422]'
          : 'bg-white text-neutral-800'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div
        className={`h-12 border-b flex items-center justify-between px-3.5 shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/60'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#ebdcc0]'
            : 'border-neutral-200/90 bg-neutral-50/80'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="relative">
            <MessageSquare size={17} className="text-[#2563eb]" />
            {comments.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-[#ea580c] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {comments.length}
              </span>
            )}
          </div>
          <h2 className="font-bold text-sm tracking-tight">
            Comments
          </h2>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-neutral-800 text-neutral-300'
                : 'bg-neutral-200/70 text-neutral-600'
            }`}
          >
            {activeCommentsCount} active
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Quick toggle composer button */}
          <button
            type="button"
            onClick={() => {
              setShowComposer(true);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            title="Compose New Comment"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
            }`}
          >
            <MessageSquarePlus size={16} className="text-[#ea580c]" />
          </button>

          {/* Toggle Dock / Float Layout Mode */}
          <button
            type="button"
            onClick={toggleLayoutMode}
            title={
              isFloating
                ? 'Dock to right sidebar toolbar'
                : 'Undock to high-zindex floating popup'
            }
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
            }`}
          >
            {isFloating ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Comments Toolbar"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Temporary toast notice */}
      {feedbackNotice && (
        <div className="bg-blue-600 text-white text-[11px] font-medium py-1 px-3 text-center animate-in fade-in duration-150">
          {feedbackNotice}
        </div>
      )}

      {/* 2. Filter tabs & Search bar */}
      <div
        className={`px-3 py-2 border-b space-y-2 shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-900/90'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#f0e6ce]'
            : 'border-neutral-100 bg-white'
        }`}
      >
        <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-[#185abd] dark:text-blue-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
              filterMode === 'active'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-[#ea580c] dark:text-orange-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Active ({activeCommentsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('resolved')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
              filterMode === 'resolved'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-emerald-700 dark:text-emerald-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Resolved ({resolvedCommentsCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-7 pr-7 py-1 text-[11px] rounded-md border focus:outline-none transition-colors ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500'
                : 'bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:border-blue-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3. New Comment Composer Card */}
      {showComposer && (
        <div
          className={`p-3 border-b space-y-2 shrink-0 animate-in fade-in duration-150 ${
            isDark
              ? 'border-neutral-800 bg-neutral-950/40'
              : isSepia
              ? 'border-[#e2d7ba] bg-[#ece1c7]'
              : 'border-neutral-200/70 bg-blue-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center space-x-1 text-[#ea580c]">
              <MessageSquarePlus size={14} />
              <span>New Comment</span>
            </span>

            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author"
                title="Author Name"
                className={`text-[10.5px] px-2 py-0.5 rounded border max-w-[100px] text-right font-medium focus:outline-none ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-700'
                }`}
              />
            </div>
          </div>

          {/* Quoted target text preview if available */}
          {currentTargetSelection && (
            <div
              className={`p-1.5 rounded text-[10.5px] border-l-2 flex items-start justify-between gap-1 ${
                isDark
                  ? 'bg-neutral-800/80 border-orange-500 text-neutral-300'
                  : 'bg-amber-50/90 border-orange-500 text-neutral-700'
              }`}
            >
              <span className="truncate italic max-w-[220px]">
                "{currentTargetSelection}"
              </span>
              <button
                type="button"
                onClick={() => setCurrentTargetSelection('')}
                title="Clear selected text context"
                className="text-neutral-400 hover:text-neutral-600 shrink-0"
              >
                <X size={10} />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handlePostComment();
              }
            }}
            placeholder="Type comment or feedback... (Ctrl+Enter to post)"
            className={`w-full p-2 text-xs rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500'
                : 'bg-white border-neutral-300 text-neutral-800 placeholder:text-neutral-400'
            }`}
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              Press Ctrl+Enter
            </span>
            <div className="flex items-center space-x-1.5">
              {commentText && (
                <button
                  type="button"
                  onClick={() => setCommentText('')}
                  className="px-2 py-1 text-[11px] text-neutral-500 hover:text-neutral-800 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="px-3 py-1 bg-[#185abd] hover:bg-[#114999] disabled:opacity-40 text-white font-semibold text-[11px] rounded transition-all cursor-pointer shadow-xs flex items-center space-x-1"
              >
                <CornerDownLeft size={11} />
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Comments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <MessageSquare size={36} className="mx-auto mb-2 opacity-40 text-neutral-400" />
            <p className="font-semibold text-xs">No comments found</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {searchQuery
                ? 'Try a different search query.'
                : 'Select text in your document and click "New Comment" above.'}
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isEditing = editingCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  comment.resolved
                    ? isDark
                      ? 'bg-neutral-800/40 border-neutral-800 opacity-60'
                      : 'bg-neutral-50/80 border-neutral-200 opacity-70'
                    : isDark
                    ? 'bg-neutral-800/80 border-neutral-700 shadow-xs'
                    : 'bg-white border-neutral-200/90 shadow-2xs hover:border-neutral-300'
                }`}
              >
                {/* Author and Date row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#185abd] text-white flex items-center justify-center text-[10px] font-bold">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {comment.author}
                    </span>
                    {comment.resolved && (
                      <span className="text-[9.5px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-semibold">
                        Resolved
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {comment.timestamp}
                  </span>
                </div>

                {/* Target context (Clickable jump) */}
                {comment.selectedText && (
                  <button
                    type="button"
                    onClick={() => handleJumpToText(comment.selectedText)}
                    title="Click to jump to quoted text in document"
                    className="w-full text-left my-1.5 px-2 py-1 rounded bg-neutral-100/80 dark:bg-neutral-900/70 border-l-2 border-[#185abd] text-[10.5px] italic text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-colors flex items-center justify-between gap-1 group cursor-pointer"
                  >
                    <span className="truncate">"{comment.selectedText}"</span>
                    <ExternalLink
                      size={10}
                      className="text-neutral-400 group-hover:text-[#185abd] shrink-0"
                    />
                  </button>
                )}

                {/* Body or Edit Mode */}
                {isEditing ? (
                  <div className="space-y-1.5 my-2">
                    <textarea
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 text-xs rounded border border-blue-400 bg-white dark:bg-neutral-800 focus:outline-none"
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText('');
                        }}
                        className="px-2 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(comment.id)}
                        className="px-2.5 py-0.5 bg-[#185abd] text-white text-[11px] font-semibold rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`leading-relaxed my-1.5 ${
                      comment.resolved
                        ? 'line-through text-neutral-400 dark:text-neutral-500'
                        : 'text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {comment.text}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => handleToggleResolve(comment.id)}
                    className={`text-[10.5px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                      comment.resolved
                        ? 'text-neutral-500 hover:text-neutral-800'
                        : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>{comment.resolved ? 'Reopen' : 'Resolve'}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditText(comment.text);
                      }}
                      title="Edit comment text"
                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                      className="text-neutral-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer Summary */}
      <div
        className={`p-2.5 border-t flex items-center justify-between text-[11px] shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/60 text-neutral-400'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#ebdcc0] text-[#715c41]'
            : 'border-neutral-200/80 bg-neutral-50 text-neutral-500'
        }`}
      >
        <span>
          {comments.length} total • {activeCommentsCount} active
        </span>

        <button
          type="button"
          onClick={() => {
            setShowComposer(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
          className="text-[#185abd] dark:text-blue-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <MessageSquarePlus size={12} />
          <span>+ Add Comment</span>
        </button>
      </div>
    </div>
  );

  // If floating layout is active, render via Portal to document.body with maximum z-index z-[9999]!
  if (isFloating) {
    return createPortal(
      <aside
        className="fixed top-24 right-6 w-84 max-w-[calc(100vw-32px)] h-[calc(100vh-130px)] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[9999] animate-in fade-in slide-in-from-right duration-200 flex flex-col bg-white dark:bg-neutral-900"
        style={{ zIndex: 9999 }}
        aria-label="Floating Comments Toolbar"
      >
        {content}
      </aside>,
      document.body
    );
  }

  // Otherwise, render as standard right toolbar alongside DocumentCanvas
  return (
    <aside
      className="w-72 sm:w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200/90 dark:border-neutral-800 flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200 shrink-0"
      aria-label="Comments Toolbar"
    >
      {content}
    </aside>
  );
};
