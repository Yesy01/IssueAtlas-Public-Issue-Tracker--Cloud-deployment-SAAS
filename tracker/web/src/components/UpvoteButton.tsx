// src/components/UpvoteButton.tsx
import { useState } from "react";
import { upvoteIssue } from "../lib/api";
import { getToken } from "../lib/auth";
import "./UpvoteButton.css";

interface UpvoteButtonProps {
  issueId: string;
  initialCount: number;
  onUpvote?: (newCount: number) => void;
}

export function UpvoteButton({ issueId, initialCount, onUpvote }: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!getToken();

  const handleUpvote = async () => {
    if (!isLoggedIn) {
      setError("Please login to upvote");
      return;
    }

    if (hasVoted || loading) return;

    setLoading(true);
    setError(null);

    // Optimistic update
    const previousCount = count;
    setCount((prev) => prev + 1);
    setHasVoted(true);

    try {
      const response = await upvoteIssue(issueId);
      setCount(response.upvoteCount);
      onUpvote?.(response.upvoteCount);
    } catch (err: unknown) {
      // Rollback on error
      setCount(previousCount);
      setHasVoted(false);
      setError("Failed to upvote");
      console.error("Upvote error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upvote-container">
      <button
        className={`upvote-btn ${hasVoted ? "voted" : ""} ${loading ? "loading" : ""}`}
        onClick={handleUpvote}
        disabled={loading || hasVoted}
        title={!isLoggedIn ? "Login to upvote" : hasVoted ? "Already upvoted" : "Upvote this issue"}
      >
        <span className="upvote-icon">Upvote</span>
        <span className="upvote-count">{count}</span>
      </button>
      {error && <span className="upvote-error">{error}</span>}
    </div>
  );
}
