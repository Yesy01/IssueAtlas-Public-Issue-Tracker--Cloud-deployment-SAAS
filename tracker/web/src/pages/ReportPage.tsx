// src/pages/ReportPage.tsx
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import type { Issue, IssueType, User } from "../types";
import "./ReportPage.css";

interface ReportPageProps {
  user: User;
}

export function ReportPage({ user }: ReportPageProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>("pothole");
  const [address, setAddress] = useState("");
  const [areaName, setAreaName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 78], 4);
    
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

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setLat(lat);
      setLon(lng);

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng).addTo(map);
      }
    });

    mapRef.current = map;

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

    return () => {
      observer.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (lat == null || lon == null) {
      setError("Please click on the map to choose a location for the issue.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.post<{ url: string }>("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = uploadRes.data.url;
      }

      const res = await api.post<{ issue: Issue }>("/issues", {
        title,
        description,
        type,
        lat,
        lon,
        address: address || undefined,
        areaName: areaName || undefined,
        imageUrl,
      });

      setMessage(`Issue reported successfully! Issue ID: ${res.data.issue.id}`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setType("pothole");
      setAddress("");
      setAreaName("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
        setLat(null);
        setLon(null);
      }

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to create issue. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLon(longitude);

        if (mapRef.current) {
          const latlng = L.latLng(latitude, longitude);
          
          // Update or create marker
          if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
          } else {
            markerRef.current = L.marker(latlng).addTo(mapRef.current);
          }

          // Center map on user location with appropriate zoom
          mapRef.current.setView(latlng, 15);
        }

        setGettingLocation(false);
        setMessage("Location detected successfully! You can adjust by clicking on the map.");
        setTimeout(() => setMessage(null), 5000);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "Unable to retrieve your location. ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="report-page">
      <header className="report-header">
        <h1 className="report-title">Report an Issue</h1>
        <p className="report-subtitle">
          Help improve your community by reporting infrastructure problems
        </p>
      </header>

      <div className="report-content">
        <div className="report-form-section">
          <div className="report-form-card">
            <form onSubmit={handleSubmit} className="report-form">
              <div>
                <h3 className="form-section-title">
                  <span className="form-section-icon">📝</span>
                  Issue Details
                </h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="title">
                      Title <span className="required-indicator">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="Brief description of the issue"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="description">
                      Description <span className="required-indicator">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      placeholder="Provide detailed information about the issue"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="type">
                      Issue Type <span className="required-indicator">*</span>
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as IssueType)}
                    >
                      <option value="pothole">Pothole</option>
                      <option value="streetlight">Streetlight</option>
                      <option value="drainage">Drainage</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="form-section-title">
                  <span className="form-section-icon">📍</span>
                  Location Information
                </h3>
                <div className="form-grid form-grid-2">
                  <div className="form-field">
                    <label htmlFor="address">Address</label>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address (optional)"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="areaName">Area Name</label>
                    <input
                      id="areaName"
                      type="text"
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      placeholder="Neighborhood or locality (optional)"
                    />
                  </div>
                </div>

                <div className="location-info">
                  <span className="location-label">
                    Selected Coordinates:
                  </span>
                  <div className="location-coords">
                    {lat != null && lon != null
                      ? `${lat.toFixed(6)}, ${lon.toFixed(6)}`
                      : "Not selected"}
                  </div>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={gettingLocation}
                    className="use-location-btn"
                  >
                    {gettingLocation ? (
                      <>
                        <span className="location-spinner"></span>
                        Getting location...
                      </>
                    ) : (
                      <>
                        📍 Use My Current Location
                      </>
                    )}
                  </button>
                  
                  {error && (
                    <div className="location-message error">
                      <span className="form-message-icon">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {message && (
                    <div className="location-message success">
                      <span className="form-message-icon">✓</span>
                      <span>{message}</span>
                    </div>
                  )}
                  
                  <p className="location-instruction">
                    💡 Click on the map or use GPS to select the exact location
                  </p>
                </div>
              </div>

              <div>
                <h3 className="form-section-title">
                  <span className="form-section-icon">📷</span>
                  Photo Evidence
                </h3>
                <div className="form-field">
                  <label htmlFor="image">Upload Image</label>
                  <div className="file-input-wrapper">
                    <input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <label htmlFor="image" className="file-input-button">
                      📁 {file ? "Change Image" : "Choose Image (Max 5MB)"}
                    </label>
                  </div>
                  {file && (
                    <div className="file-preview">
                      <span className="file-name">
                        📷 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="remove-file-btn"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting ? (
                    <>
                      <span className="submit-spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      📨 Submit Report
                    </>
                  )}
                </button>
              </div>

              <div className="user-info-badge">
                <span className="user-info-icon">👤</span>
                Reporting as <span className="user-info-email">{user.email}</span>
              </div>
            </form>
          </div>
        </div>

        <div className="report-map-section">
          <div className="report-map-card">
            <div className="map-section-header">
              <h3 className="map-section-title">
                <span className="form-section-icon">🗺️</span>
                Select Location
              </h3>
              <p className="map-section-description">
                Click on the map to mark the exact location of the issue
              </p>
            </div>

            <div className="map-wrapper">
              <div ref={mapContainerRef} className="report-map-container"></div>
            </div>

            <div className="map-tips">
              <h4 className="map-tips-title">Tips for accurate reporting:</h4>
              <ul className="map-tips-list">
                <li>Zoom in for precise location marking</li>
                <li>Click directly on the issue location</li>
                <li>You can adjust by clicking a new location</li>
                <li>The marker shows your selected spot</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
