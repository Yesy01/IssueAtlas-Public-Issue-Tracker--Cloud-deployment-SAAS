// src/pages/MapPage.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import type { Issue, IssueStatus, IssueType, User } from "../types";
import { STATUS_COLORS, STATUS_LABELS, StatusBadge, LoadingSpinner } from "../components";
import "./MapPage.css";

interface MapPageProps {
  user: User | null;
}

export function MapPage({ user }: MapPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<IssueStatus | "">("");
  const [type, setType] = useState<IssueType | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 78], 4); // rough India

    // Determine initial theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    const attribution = isDark
      ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
      : "© OpenStreetMap contributors";

    const tileLayer = L.tileLayer(tileUrl, { attribution });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Fix loading buffer issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map tiles when theme changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const tileUrl = isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
          
          const attribution = isDark
            ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
            : "© OpenStreetMap contributors";

          if (tileLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
            const newTileLayer = L.tileLayer(tileUrl, { attribution });
            newTileLayer.addTo(mapRef.current);
            tileLayerRef.current = newTileLayer;
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Fetch issues with filters
  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      try {
        const params: any = {};
        if (status) params.status = status;
        if (type) params.type = type;
        if (search) params.search = search;

        const res = await api.get<{ items: Issue[] }>("/issues", { params });
        setIssues(res.data.items);
      } catch (err) {
        console.error("Failed to fetch issues", err);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, [status, type, search]);

  // Render markers when issues change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    const group = markersRef.current;
    group.clearLayers();

    issues.forEach((issue) => {
      const color = STATUS_COLORS[issue.status];
      const marker = L.circleMarker([issue.lat, issue.lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.8,
      }).bindPopup(
        `<strong>${issue.title}</strong><br/>
        Status: ${STATUS_LABELS[issue.status]}<br/>
        Type: ${issue.type}<br/>
        ${issue.areaName ? `Area: ${issue.areaName}<br/>` : ""}
        <a href="/issues/${issue.id}" style="color: var(--color-primary);">View Details →</a>`
      );
      marker.addTo(group);
    });

    if (issues.length > 0) {
      const bounds = L.latLngBounds(issues.map((i) => [i.lat, i.lon]));
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [issues]);

  return (
    <div className="map-page">
      <div className="map-page-header">
        <div>
          <h1 className="map-page-title">Issue Map</h1>
          <p className="map-page-subtitle">View and explore reported issues in your area</p>
        </div>
      </div>

      <div className="map-page-content">
        <div className="map-section">
          <div ref={mapContainerRef} className="map-container" />
        </div>

        <div className="sidebar-section">
          <div className="filters-card">
            <h2 className="filters-title">Filters</h2>
            <div className="filters-container">
              <div className="filter-group search-filter">
                <label htmlFor="search-filter" className="filter-label">
                  Search
                </label>
                <input
                  id="search-filter"
                  className="filter-input"
                  placeholder="Search title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="filters-row">
                <div className="filter-group">
                  <label htmlFor="status-filter" className="filter-label">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    className="filter-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="">All statuses</option>
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="type-filter" className="filter-label">
                    Type
                  </label>
                  <select
                    id="type-filter"
                    className="filter-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="">All types</option>
                    <option value="pothole">Pothole</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="drainage">Drainage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="issues-list-card">
            <div className="issues-list-header">
              <span className="issues-count">
                Issues
                <span className="issues-count-badge">{issues.length}</span>
              </span>
            </div>

            {loading ? (
              <div className="loading-state">
                <LoadingSpinner size="medium" />
              </div>
            ) : issues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📍</div>
                <p className="empty-state-text">No issues found matching your filters.</p>
              </div>
            ) : (
              <div className="issues-scroll-container">
                <div className="issues-list">
                  {issues.map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.id}`}
                      className="issue-list-item"
                    >
                      <div className="issue-item-header">
                        <h3 className="issue-item-title">{issue.title}</h3>
                        <StatusBadge status={issue.status} size="small" />
                      </div>
                      <div className="issue-item-meta">
                        <span className="issue-type-badge">{issue.type}</span>
                        {issue.areaName && (
                          <span className="issue-area">
                            📍 {issue.areaName}
                          </span>
                        )}
                      </div>
                      {issue.imageUrl && (
                        <a
                          href={issue.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="issue-image-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📷 View image
                        </a>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
