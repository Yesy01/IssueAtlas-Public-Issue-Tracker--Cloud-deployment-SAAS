import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Issue, User } from '../types';
import { LoadingSpinner, ErrorMessage, StatusBadge } from '../components';
import './MyIssuesPage.css';

interface MyIssuesPageProps {
  user: User | null;
}

export default function MyIssuesPage({ user }: MyIssuesPageProps) {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMyIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchMyIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/issues');
      // Filter issues to only show those reported by the current user
      const allIssues = response.data.items || [];
      const myIssues = allIssues.filter(
        (issue: Issue) => issue.reporterId === user?.id
      );
      setIssues(myIssues);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your issues';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'all') return true;
    return issue.status === filter;
  });

  const getStatusCounts = () => {
    return {
      all: issues.length,
      new: issues.filter((i) => i.status === 'new').length,
      triaged: issues.filter((i) => i.status === 'triaged').length,
      in_progress: issues.filter((i) => i.status === 'in_progress').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
    };
  };

  const counts = getStatusCounts();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="my-issues-page">
        <LoadingSpinner size="large" message="Loading your issues..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-issues-page">
        <ErrorMessage message={error} onRetry={fetchMyIssues} />
      </div>
    );
  }

  return (
    <div className="my-issues-page">
      <header className="my-issues-header">
        <div className="header-content">
          <h1>My Reported Issues</h1>
          <p className="subtitle">Track the status of issues you've reported</p>
        </div>
        <Link to="/report" className="report-new-btn">
          + Report New Issue
        </Link>
      </header>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="count">{counts.all}</span>
        </button>
        <button
          className={`filter-tab ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New <span className="count">{counts.new}</span>
        </button>
        <button
          className={`filter-tab ${filter === 'triaged' ? 'active' : ''}`}
          onClick={() => setFilter('triaged')}
        >
          Triaged <span className="count">{counts.triaged}</span>
        </button>
        <button
          className={`filter-tab ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          In Progress <span className="count">{counts.in_progress}</span>
        </button>
        <button
          className={`filter-tab ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          Resolved <span className="count">{counts.resolved}</span>
        </button>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          {issues.length === 0 ? (
            <>
              <div className="empty-icon">No issues</div>
              <h2>No issues reported yet</h2>
              <p>When you report an issue, it will appear here so you can track its progress.</p>
              <Link to="/report" className="empty-action-btn">
                Report Your First Issue
              </Link>
            </>
          ) : (
            <>
              <div className="empty-icon">No results</div>
              <h2>No {filter.replace('_', ' ')} issues</h2>
              <p>You don't have any issues with this status.</p>
            </>
          )}
        </div>
      ) : (
        <div className="issues-list">
          {filteredIssues.map((issue) => (
            <Link to={`/issues/${issue.id}`} key={issue.id} className="issue-card">
              <div className="issue-card-header">
                <span className="issue-type">{issue.type}</span>
                <StatusBadge status={issue.status} />
              </div>
              <h3 className="issue-title">{issue.title}</h3>
              <p className="issue-description">
                {issue.description.length > 150
                  ? `${issue.description.substring(0, 150)}...`
                  : issue.description}
              </p>
              <div className="issue-card-footer">
                <span className="issue-date">
                  Reported on {formatDate(issue.createdAt)}
                </span>
                <div className="issue-stats">
                  <span className="stat">
                    Upvotes {issue._count?.upvotes || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
