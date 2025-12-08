import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L, { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import type { User } from '../types';
import { LoadingSpinner, ErrorMessage } from '../components';
import './AnalyticsPage.css';

interface AnalyticsPageProps {
  user: User | null;
}

interface SummaryData {
  totalIssues: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

interface TrendData {
  date: string;
  new: number;
  resolved: number;
}

interface AreaData {
  lat: number;
  lng: number;
  count: number;
  resolved: number;
}

export default function AnalyticsPage({ user: _user }: AnalyticsPageProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Initialize map after areas data is loaded
  useEffect(() => {
    if (areas.length === 0) return;
    if (mapRef.current || !mapContainerRef.current) return;

    console.log('Initializing map with', areas.length, 'areas');
    
    try {
      const map = L.map(mapContainerRef.current).setView([20, 78], 5);
      
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const tileUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      
      const attribution = isDark
        ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
        : "© OpenStreetMap contributors";

      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      console.log('Map initialized successfully');

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          console.log('Map size invalidated');
        }
      }, 200);
    } catch (err: unknown) {
      console.error('Error initializing map:', err);
    }

    return () => {
      if (mapRef.current) {
        console.log('Cleaning up map');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [areas.length]);

  // Update map markers when areas data changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || areas.length === 0) return;

    const group = markersRef.current;
    group.clearLayers();

    const maxCount = Math.max(...areas.map(a => a.count));

    areas.forEach((area) => {
      const radius = 10 + (area.count / maxCount) * 20;
      const resolvedPercentage = area.count > 0 ? (area.resolved / area.count) * 100 : 0;
      
      const color = resolvedPercentage > 70 ? '#22C55E' : 
                    resolvedPercentage > 40 ? '#F59E0B' : '#EF4444';

      const marker = L.circleMarker([area.lat, area.lng], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.7,
      });

      marker.bindPopup(`
        <div style="text-align: center; font-family: var(--font-family);">
          <strong style="font-size: 1.1em; color: var(--color-text-primary);">${area.count} Issues</strong><br/>
          <span style="color: var(--color-text-secondary); font-size: 0.9em;">
            ${area.resolved} resolved (${resolvedPercentage.toFixed(0)}%)
          </span><br/>
          <span style="color: var(--color-text-secondary); font-size: 0.85em;">
            ${area.lat.toFixed(4)}, ${area.lng.toFixed(4)}
          </span>
        </div>
      `);

      marker.addTo(group);
    });

    if (areas.length > 0) {
      const bounds = L.latLngBounds(areas.map(a => [a.lat, a.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [areas]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, trendsRes, areasRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/trends'),
        api.get('/analytics/areas')
      ]);
      
      console.log('Analytics data loaded:', {
        summary: summaryRes.data,
        trends: trendsRes.data.trends?.length,
        areas: areasRes.data.areas?.length
      });
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data.trends);
      setAreas(areasRes.data.areas);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      console.error('Analytics fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      new: '#EF4444',
      triaged: '#F6E05E',
      in_progress: '#3B82F6',
      resolved: '#22C55E'
    };
    return colors[status] || '#9CA3AF';
  };

  const formatStatusLabel = (status: string): string => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      pothole: '#F59E0B',
      graffiti: '#8B5CF6',
      streetlight: '#3B82F6',
      garbage: '#10B981',
      other: '#6B7280'
    };
    return colors[type.toLowerCase()] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <LoadingSpinner size="large" message="Loading analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <ErrorMessage message={error} onRetry={fetchAnalytics} />
      </div>
    );
  }

  const totalByStatus = summary ? Object.values(summary.byStatus).reduce((a, b) => a + b, 0) : 0;
  const totalByType = summary ? Object.values(summary.byType).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="header-content">
          <h1>Analytics Dashboard</h1>
          <p className="subtitle">Overview of reported issues and trends</p>
        </div>
        <Link to="/" className="back-link">
          ← Back to Map
        </Link>
      </header>

      {/* Summary Cards */}
      <section className="summary-section">
        <div className="summary-card total-card">
          <div className="card-icon">Data</div>
          <div className="card-content">
            <span className="card-value">{summary?.totalIssues || 0}</span>
            <span className="card-label">Total Issues</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">New</div>
          <div className="card-content">
            <span className="card-value">{summary?.byStatus.new || 0}</span>
            <span className="card-label">New Issues</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">Change</div>
          <div className="card-content">
            <span className="card-value">{summary?.byStatus.in_progress || 0}</span>
            <span className="card-label">In Progress</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">Resolved</div>
          <div className="card-content">
            <span className="card-value">{summary?.byStatus.resolved || 0}</span>
            <span className="card-label">Resolved</span>
          </div>
        </div>
      </section>

      <div className="charts-grid">
        {/* Status Distribution */}
        <section className="chart-section">
          <h2>Issues by Status</h2>
          <div className="bar-chart">
            {summary && Object.entries(summary.byStatus).map(([status, count]) => (
              <div key={status} className="bar-item">
                <div className="bar-label">{formatStatusLabel(status)}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${totalByStatus > 0 ? (count / totalByStatus) * 100 : 0}%`,
                      backgroundColor: getStatusColor(status)
                    }}
                  />
                  <span className="bar-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Type Distribution */}
        <section className="chart-section">
          <h2>Issues by Type</h2>
          <div className="bar-chart">
            {summary && Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="bar-item">
                <div className="bar-label">{type}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${totalByType > 0 ? (count / totalByType) * 100 : 0}%`,
                      backgroundColor: getTypeColor(type)
                    }}
                  />
                  <span className="bar-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trends Over Time */}
        <section className="chart-section wide">
          <h2>Issues Trend (Last 30 Days)</h2>
          {trends.length > 0 ? (
            <div className="trend-chart">
              <div className="trend-legend">
                <span className="legend-item">
                  <span className="legend-dot new" />
                  New Issues
                </span>
                <span className="legend-item">
                  <span className="legend-dot resolved" />
                  Resolved
                </span>
              </div>
              <div className="trend-chart-wrapper">
                <div className="trend-bars">
                  {trends.map((day) => (
                    <div key={day.date} className="trend-bar-group">
                      <div 
                        className="trend-bar new" 
                        style={{ height: `${Math.max(day.new * 20, 4)}px` }}
                        title={`New: ${day.new}`}
                      />
                      <div 
                        className="trend-bar resolved" 
                        style={{ height: `${Math.max(day.resolved * 20, 4)}px` }}
                        title={`Resolved: ${day.resolved}`}
                      />
                      <span className="trend-date">{day.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="no-data">No trend data available</p>
          )}
        </section>

        {/* Hot Spots Map */}
        <section className="chart-section map-section">
          <h2>Hot Spots Map</h2>
          <p className="section-description">Geographic distribution of issues - larger circles indicate more reports</p>
          <div className="hotspot-map-container">
            <div ref={mapContainerRef} className="analytics-map">
              {areas.length === 0 && (
                <div className="map-no-data-overlay">
                  <p>No location data available yet</p>
                  <p className="map-hint">Issues with GPS coordinates will appear here</p>
                </div>
              )}
            </div>
            <div className="map-legend">
              <h4>Legend</h4>
              <div className="legend-items">
                <div className="legend-item-row">
                  <span className="legend-circle low-resolution"></span>
                  <span>Low resolution rate (&lt;40%)</span>
                </div>
                <div className="legend-item-row">
                  <span className="legend-circle medium-resolution"></span>
                  <span>Medium resolution rate (40-70%)</span>
                </div>
                <div className="legend-item-row">
                  <span className="legend-circle high-resolution"></span>
                  <span>High resolution rate (&gt;70%)</span>
                </div>
                <div className="legend-note">Circle size indicates number of issues</div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Areas List */}
        <section className="chart-section areas-section">
          <h2>Top Hot Spots</h2>
          {areas.length > 0 ? (
            <div className="areas-list">
              {areas.slice(0, 10).map((area, index) => (
                <div key={`${area.lat}-${area.lng}`} className="area-item">
                  <span className="area-rank">#{index + 1}</span>
                  <div className="area-info">
                    <span className="area-coords">
                      {area.lat.toFixed(4)}, {area.lng.toFixed(4)}
                    </span>
                    <span className="area-stats">
                      {area.count} issues ({area.resolved} resolved)
                    </span>
                  </div>
                  <div className="area-bar">
                    <div 
                      className="area-bar-fill"
                      style={{ width: `${(area.count / areas[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No area data available</p>
          )}
        </section>
      </div>
    </div>
  );
}
