// src/components/CommentsList.tsx
import type { Comment } from "../types";
import "./CommentsList.css";

interface CommentsListProps {
  comments: Comment[];
}

export function CommentsList({ comments }: CommentsListProps) {
  if (comments.length === 0) {
    return (
      <div className="comments-empty">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="comments-list">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <div className="comment-header">
            <span className="comment-author">
              {comment.user.email}
              {comment.user.role === "admin" && (
                <span className="admin-badge">Admin</span>
              )}
            </span>
            <span className="comment-date">
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="comment-body">{comment.body}</p>
        </div>
      ))}
    </div>
  );
}
