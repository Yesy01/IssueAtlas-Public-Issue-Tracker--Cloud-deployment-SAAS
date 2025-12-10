// src/pages/MapPage.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { getIssues, getNearbyIssues } from "../lib/api";
import type { Issue, IssueStatus, IssueType, User } from "../types";
import { StatusBadge, LoadingSpinner } from "../components";
import { STATUS_COLORS, STATUS_LABELS } from "../lib/status";
import "./MapPage.css";

interface MapPageProps {
  user: User | null;
}

export function MapPage({}: MapPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<IssueStatus | "">("");
  const [type, setType] = useState<IssueType | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "nearby">("all");
  const [radius, setRadius] = useState(2000);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const navigate = useNavigate();
  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const truncate = (value: string, limit = 140) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > limit
      ? `${normalized.slice(0, limit - 1)}…`
      : normalized;
  };

  const formatIssueType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const map = L.map(container).setView([20, 78], 4); // rough India

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

    if (container && typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
      resizeObserverRef.current = resizeObserver;
    }

    // Fix loading buffer issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup on unmount
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
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
      if (mode === "nearby") return;
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        if (type) params.type = type;
        if (search) params.search = search;

        const res = await getIssues(params);
        setIssues(res.items);
      } catch (err: unknown) {
        console.error("Failed to fetch issues", err);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, [status, type, search, mode]);

  const loadNearbyIssues = () => {
    setNearbyError(null);

    if (!navigator.geolocation) {
      setNearbyError("Geolocation is not supported by your browser.");
      return;
    }

    setLoadingNearby(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const nearby = await getNearbyIssues(latitude, longitude, radius);
          setIssues(nearby);
          setMode("nearby");
        } catch (err: unknown) {
          const message =
            typeof err === "object" &&
            err !== null &&
            "response" in err &&
            typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
              ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
              : "Failed to load nearby issues.";
          setNearbyError(message ?? "Failed to load nearby issues.");
        } finally {
          setLoadingNearby(false);
        }
      },
      (err: GeolocationPositionError) => {
        setNearbyError(err.message || "Failed to get your location.");
        setLoadingNearby(false);
      }
    );
  };

  // Render markers when issues change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    const group = markersRef.current;
    group.clearLayers();

    issues.forEach((issue) => {
      const color = STATUS_COLORS[issue.status];
      const marker = L.circleMarker([issue.lat, issue.lon], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      });

      const popupContent = `
        <div class="map-issue-popup">
          ${
            issue.imageUrl
              ? `<img src="${encodeURI(issue.imageUrl)}" alt="${escapeHtml(
                  issue.title
                )}" class="map-issue-popup-image" loading="lazy" />`
              : ""
          }
          <div class="map-issue-popup-body">
            <h3 class="map-issue-popup-title">${escapeHtml(issue.title)}</h3>
            <div class="map-issue-popup-meta">
              <span class="map-issue-popup-status" data-status="${issue.status}">${escapeHtml(
                STATUS_LABELS[issue.status]
              )}</span>
              <span class="map-issue-popup-type">${escapeHtml(
                formatIssueType(issue.type)
              )}</span>
              ${
                issue.areaName
                  ? `<span class="map-issue-popup-area">Location: ${escapeHtml(issue.areaName)}</span>`
                  : ""
              }
            </div>
            ${
              issue.description
                ? `<p class="map-issue-popup-description">${escapeHtml(
                    truncate(issue.description)
                  )}</p>`
                : ""
            }
            <button type="button" class="issue-popup-button" data-issue-id="${issue.id}">
              View Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "map-issue-popup-container",
        closeButton: true,
        maxWidth: 280,
        offset: L.point(0, -10),
      });

      let closeTimeout: ReturnType<typeof window.setTimeout> | null = null;
      let popupHovered = false;
      let markerHovered = false;

      const scheduleClose = () => {
        if (closeTimeout) clearTimeout(closeTimeout);
        closeTimeout = window.setTimeout(() => {
          if (!popupHovered && !markerHovered) {
            marker.closePopup();
          }
        }, 200);
      };

      const clearClose = () => {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      };

      marker.on("mouseover", () => {
        markerHovered = true;
        clearClose();
        marker.openPopup();
      });

      marker.on("mouseout", () => {
        markerHovered = false;
        scheduleClose();
      });

      marker.on("click", () => {
        markerHovered = true;
        clearClose();
        marker.openPopup();
      });

      marker.on("popupopen", () => {
        const popupElement = marker.getPopup()?.getElement();
        if (!popupElement) return;

        const handlePopupMouseEnter = () => {
          popupHovered = true;
          clearClose();
        };

        const handlePopupMouseLeave = () => {
          popupHovered = false;
          scheduleClose();
        };

        popupElement.addEventListener("mouseenter", handlePopupMouseEnter);
        popupElement.addEventListener("mouseleave", handlePopupMouseLeave);

        const button = popupElement.querySelector<HTMLButtonElement>(
          ".issue-popup-button"
        );
        
        const handleButtonClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          const issueId = (e.currentTarget as HTMLElement).getAttribute("data-issue-id");
          if (issueId) {
            navigate(`/issues/${issueId}`);
          }
        };

        if (button) {
          button.addEventListener("click", handleButtonClick);
        }

        L.DomEvent.disableClickPropagation(popupElement);

        marker.once("popupclose", () => {
          popupElement.removeEventListener("mouseenter", handlePopupMouseEnter);
          popupElement.removeEventListener("mouseleave", handlePopupMouseLeave);
          if (button) {
            button.removeEventListener("click", handleButtonClick);
          }
          popupHovered = false;
          clearClose();
        });
      });

      marker.addTo(group);
    });

    if (issues.length > 0) {
      const bounds = L.latLngBounds(issues.map((i) => [i.lat, i.lon]));
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }

    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });
  }, [issues, navigate]);

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
                    onChange={(e) => setStatus(e.target.value as IssueStatus | "")}
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
                    onChange={(e) => setType(e.target.value as IssueType | "")}
                  >
                    <option value="">All types</option>
                    <option value="pothole">Pothole</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="drainage">Drainage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="location-filter">
                <div className="location-filter-header">
                  <span className="filter-label">Location filter</span>
                  {mode === "nearby" && (
                    <button
                      className="location-clear"
                      onClick={() => {
                        setMode("all");
                        setNearbyError(null);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <label className="filter-subtext">Radius around my location</label>
                <select
                  className="filter-select"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                </select>
                <button
                  className="location-button"
                  onClick={loadNearbyIssues}
                  disabled={loadingNearby}
                >
                  {loadingNearby ? "Finding nearby issues…" : "Show issues near me"}
                </button>
                {nearbyError && (
                  <p className="filter-error">{nearbyError}</p>
                )}
                {mode === "nearby" && !nearbyError && (
                  <p className="filter-subtext">
                    Showing issues within {radius / 1000} km of your location.
                  </p>
                )}
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
                <div className="empty-state-icon">No issues</div>
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
                            Location: {issue.areaName}
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
                          View image
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
