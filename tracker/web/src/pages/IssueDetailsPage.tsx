// src/pages/IssueDetailsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getIssue, getComments } from "../lib/api";
import type { Issue, Comment, User } from "../types";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { StatusBadge } from "../components/StatusBadge";
import { StatusHistory } from "../components/StatusHistory";
import { UpvoteButton } from "../components/UpvoteButton";
import { CommentsList } from "../components/CommentsList";
import { CommentForm } from "../components/CommentForm";
import "./IssueDetailsPage.css";

interface IssueDetailsPageProps {
  user: User | null;
}

export function IssueDetailsPage({ user: _user }: IssueDetailsPageProps) {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [issueResponse, commentsData] = await Promise.all([
        getIssue(id),
        getComments(id),
      ]);

      setIssue(issueResponse.issue);
      setUpvoteCount(issueResponse.stats.upvoteCount);
      setComments(commentsData);
    } catch (err) {
      console.error("Failed to fetch issue:", err);
      setError("Failed to load issue. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize mini-map
  useEffect(() => {
    if (!issue) return;

    const mapContainer = document.getElementById("issue-mini-map");
    if (!mapContainer) return;

    // Clear existing map
    mapContainer.innerHTML = "";

    const map = L.map(mapContainer, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
    }).setView([issue.lat, issue.lon], 15);

    // Determine theme for tiles
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    const attribution = isDark
      ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
      : "© OpenStreetMap";

    L.tileLayer(tileUrl, { attribution }).addTo(map);

    L.marker([issue.lat, issue.lon]).addTo(map);

    // Fix loading buffer issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Update tiles when theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const tileUrl = isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
          
          const attribution = isDark
            ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
            : "© OpenStreetMap";

          map.eachLayer((layer: L.Layer) => {
            if (layer instanceof L.TileLayer) {
              map.removeLayer(layer);
            }
          });
          
          L.tileLayer(tileUrl, { attribution }).addTo(map);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [issue]);

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [...prev, newComment]);
  };

  const handleUpvote = (newCount: number) => {
    setUpvoteCount(newCount);
  };

  if (loading) {
    return (
      <div className="issue-details-loading">
        <LoadingSpinner size="large" message="Loading issue details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="issue-details-error">
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="issue-details-error">
        <ErrorMessage message="Issue not found" />
        <Link to="/" className="back-link">← Back to Map</Link>
      </div>
    );
  }

  const issueTypeLabels: Record<string, string> = {
    pothole: "Pothole",
    streetlight: "Streetlight",
    drainage: "Drainage",
    other: "Other",
  };

  return (
    <div className="issue-details">
      <div className="issue-details-header">
        <Link to="/" className="back-link">← Back to Map</Link>
      </div>

      <div className="issue-details-content">
        <div className="issue-main">
          <div className="issue-title-row">
            <h1 className="issue-title">{issue.title}</h1>
            <StatusBadge status={issue.status} size="large" />
          </div>

          <div className="issue-meta">
            <span className="issue-type">
              📌 {issueTypeLabels[issue.type] || issue.type}
            </span>
            {issue.areaName && (
              <span className="issue-area">📍 {issue.areaName}</span>
            )}
            {issue.address && (
              <span className="issue-address">🏠 {issue.address}</span>
            )}
            <span className="issue-date">
              🕐 Reported {new Date(issue.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <p className="issue-description">{issue.description}</p>

          {issue.imageUrl && (
            <div className="issue-image-container">
              <img
                src={issue.imageUrl}
                alt={issue.title}
                className="issue-image"
                onClick={() => window.open(issue.imageUrl!, "_blank")}
              />
              <p className="issue-image-hint">Click image to view full size</p>
            </div>
          )}

          <div className="issue-actions">
            <UpvoteButton
              issueId={issue.id}
              initialCount={upvoteCount}
              onUpvote={handleUpvote}
            />
            <span className="comment-count">
              💬 {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {issue.history && issue.history.length > 0 && (
            <StatusHistory history={issue.history} />
          )}

          <div className="issue-comments-section">
            <h3>Comments</h3>
            <CommentForm issueId={issue.id} onCommentAdded={handleCommentAdded} />
            <div className="comments-divider" />
            <CommentsList comments={comments} />
          </div>
        </div>

        <div className="issue-sidebar">
          <div className="issue-map-container">
            <h4>Location</h4>
            <div id="issue-mini-map" className="issue-mini-map" />
            <div className="issue-coordinates">
              <span>Lat: {issue.lat.toFixed(6)}</span>
              <span>Lon: {issue.lon.toFixed(6)}</span>
            </div>
          </div>

          {issue.reporter && (
            <div className="issue-reporter">
              <h4>Reported by</h4>
              <p className="reporter-email">{issue.reporter.email}</p>
              {issue.reporter.role === "admin" && (
                <span className="admin-badge">Admin</span>
              )}
            </div>
          )}

          <div className="issue-share">
            <h4>Share</h4>
            <button
              className="share-button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }}
            >
              📋 Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
