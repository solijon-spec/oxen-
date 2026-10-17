import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CURRENT_USER_ID } from "@/data/demoUsers";
import { SEED_COMMENTS, type Comment } from "@/data/feedData";

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface CommentsContextValue {
  comments: Comment[];
  getCommentsForPost: (postId: string) => Comment[];
  getTopLevelComments: (postId: string) => Comment[];
  getReplies: (commentId: string) => Comment[];
  addComment: (postId: string, text: string, parentId?: string | null) => Comment;
  editComment: (commentId: string, text: string) => void;
  deleteComment: (commentId: string) => void;
  toggleCommentLike: (commentId: string) => void;
  isCommentLiked: (commentId: string) => boolean;
  getCommentCount: (postId: string) => number;
}

const COMMENTS_KEY = "oxen.travel.comments";

const CommentsContext = createContext<CommentsContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function CommentsProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const stored = load<Comment[]>(COMMENTS_KEY, []);
    // Merge stored with seeds (seeds only if nothing stored yet)
    if (stored.length > 0) {
      setComments(stored);
    } else {
      setComments(SEED_COMMENTS);
      save(COMMENTS_KEY, SEED_COMMENTS);
    }
  }, []);

  const persist = useCallback((next: Comment[]) => {
    save(COMMENTS_KEY, next);
  }, []);

  const getCommentsForPost = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId),
    [comments],
  );

  const getTopLevelComments = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId && c.parentId === null),
    [comments],
  );

  const getReplies = useCallback(
    (commentId: string) => comments.filter((c) => c.parentId === commentId),
    [comments],
  );

  const addComment = useCallback<CommentsContextValue["addComment"]>(
    (postId, text, parentId = null) => {
      const newComment: Comment = {
        id: crypto.randomUUID(),
        postId,
        userId: CURRENT_USER_ID,
        username: "guest_explorer",
        avatarUrl: "https://i.pravatar.cc/150?img=8",
        text,
        createdAt: Date.now(),
        likes: 0,
        likedBy: [],
        parentId,
      };
      setComments((prev) => {
        const next = [...prev, newComment];
        persist(next);
        return next;
      });
      return newComment;
    },
    [persist],
  );

  const editComment = useCallback(
    (commentId: string, text: string) => {
      setComments((prev) => {
        const next = prev.map((c) =>
          c.id === commentId ? { ...c, text, edited: true } : c,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      setComments((prev) => {
        // Also delete child replies
        const toDelete = new Set<string>([commentId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of prev) {
            if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
              toDelete.add(c.id);
              changed = true;
            }
          }
        }
        const next = prev.filter((c) => !toDelete.has(c.id));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleCommentLike = useCallback(
    (commentId: string) => {
      setComments((prev) => {
        const next = prev.map((c) => {
          if (c.id !== commentId) return c;
          const hasLiked = c.likedBy.includes(CURRENT_USER_ID);
          return {
            ...c,
            likedBy: hasLiked
              ? c.likedBy.filter((id) => id !== CURRENT_USER_ID)
              : [...c.likedBy, CURRENT_USER_ID],
            likes: hasLiked ? c.likes - 1 : c.likes + 1,
          };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isCommentLiked = useCallback(
    (commentId: string) => {
      const c = comments.find((c) => c.id === commentId);
      return c ? c.likedBy.includes(CURRENT_USER_ID) : false;
    },
    [comments],
  );

  const getCommentCount = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId).length,
    [comments],
  );

  const value = useMemo<CommentsContextValue>(
    () => ({
      comments,
      getCommentsForPost,
      getTopLevelComments,
      getReplies,
      addComment,
      editComment,
      deleteComment,
      toggleCommentLike,
      isCommentLiked,
      getCommentCount,
    }),
    [
      comments,
      getCommentsForPost,
      getTopLevelComments,
      getReplies,
      addComment,
      editComment,
      deleteComment,
      toggleCommentLike,
      isCommentLiked,
      getCommentCount,
    ],
  );

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

export function useComments(): CommentsContextValue {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error("useComments must be used within a CommentsProvider");
  return ctx;
}
