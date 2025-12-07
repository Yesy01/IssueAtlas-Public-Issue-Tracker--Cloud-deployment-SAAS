// src/components/CommentForm.tsx
import { useState } from "react";
import { createComment } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Comment } from "../types";
import "./CommentForm.css";

interface CommentFormProps {
  issueId: string;
  onCommentAdded: (comment: Comment) => void;
}

export function CommentForm({ issueId, onCommentAdded }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!getToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    if (!isLoggedIn) {
      setError("Please login to comment");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const comment = await createComment(issueId, body.trim());
      onCommentAdded(comment);
      setBody("");
    } catch (err: unknown) {
      setError("Failed to post comment. Please try again.");
      console.error("Comment error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="comment-form-login-prompt">
        <p>Please <a href="/auth">login</a> to leave a comment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        disabled={submitting}
        className="comment-textarea"
      />
      {error && <p className="comment-form-error">{error}</p>}
      <div className="comment-form-actions">
        <button type="submit" disabled={submitting || !body.trim()} className="comment-submit-btn">
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </form>
  );
}
