// src/pages/GuestReportPage.tsx
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import type { IssueType } from "../types";
import "./ReportPage.css";

export function GuestReportPage() {
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
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const navigate = useNavigate();
  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get guest token on mount
  useEffect(() => {
    async function getGuestToken() {
      try {
        const res = await api.post<{ token: string }>("/auth/guest");
        setGuestToken(res.data.token);
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to initialize guest session. Please try again.");
      }
    }
    getGuestToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 78], 4);
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    const attribution = isDark
      ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
      : "© OpenStreetMap contributors";

    L.tileLayer(tileUrl, { attribution }).addTo(map);

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
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
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

    if (!guestToken) {
      setError("Guest session not initialized. Please refresh the page.");
      return;
    }

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
        const uploadRes = await api.post<{ url: string; key: string }>("/uploads", formData, {
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${guestToken}`
          },
        });
        imageUrl = uploadRes.data.url;
      }

      await api.post("/issues", {
        title,
        description,
        type,
        lat,
        lon,
        address: address || undefined,
        areaName: areaName || undefined,
        imageUrl,
      }, {
        headers: {
          "Authorization": `Bearer ${guestToken}`
        }
      });

      setMessage("Issue reported successfully! Thank you for helping improve your community.");
      
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

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error && 'response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response && typeof err.response.data === 'object' && err.response.data !== null && 'error' in err.response.data
        ? String(err.response.data.error)
        : "Failed to create issue. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
          
          if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
          } else {
            markerRef.current = L.marker(latlng).addTo(mapRef.current);
          }

          mapRef.current.setView(latlng, 15);
        }

        setGettingLocation(false);
        setMessage("Location detected successfully!");
        setTimeout(() => setMessage(null), 5000);
      },
      (err) => {
        setGettingLocation(false);
        let errorMessage = "Unable to retrieve your location. ";
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += "Please enable location permissions.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case err.TIMEOUT:
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
        <h1 className="report-title">Report an Issue (Guest)</h1>
        <p className="report-subtitle">
          Help improve your community by reporting infrastructure problems
        </p>
        <div className="guest-notice">
          You're submitting as a guest. <button onClick={() => navigate("/auth")} className="auth-link-btn">Sign in</button> for full access to features.
        </div>
      </header>

      <div className="report-content">
        <div className="report-form-section">
          <div className="report-form-card">
            <form onSubmit={handleSubmit} className="report-form">
              <div>
                <h3 className="form-section-title">
                  <span className="form-section-icon">Info</span>
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
                      placeholder="Provide detailed information"
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
                  <span className="form-section-icon">Location</span>
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
                      placeholder="Neighborhood (optional)"
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
                      <>Use My Current Location</>
                    )}
                  </button>
                  
                  {error && (
                    <div className="location-message error">
                      <span className="form-message-icon">!</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {message && (
                    <div className="location-message success">
                      <span className="form-message-icon">OK</span>
                      <span>{message}</span>
                    </div>
                  )}
                  
                  <p className="location-instruction">
                    Note: Click on the map or use GPS
                  </p>
                </div>
              </div>

              <div>
                <h3 className="form-section-title">
                  <span className="form-section-icon">Photo</span>
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
                      {file ? "Change Image" : "Choose Image (Max 5MB)"}
                    </label>
                  </div>
                  {file && (
                    <div className="file-preview">
                      <span className="file-name">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
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
                <button type="submit" disabled={submitting || !guestToken} className="submit-btn">
                  {submitting ? (
                    <>
                      <span className="submit-spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    <>Submit Report</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="report-map-section">
          <div className="report-map-card">
            <div className="map-section-header">
              <h3 className="map-section-title">
                <span className="form-section-icon">Map</span>
                Select Location
              </h3>
              <p className="map-section-description">
                Click on the map to mark the exact location
              </p>
            </div>

            <div className="map-wrapper">
              <div ref={mapContainerRef} className="report-map-container"></div>
            </div>

            <div className="map-tips">
              <h4 className="map-tips-title">Tips:</h4>
              <ul className="map-tips-list">
                <li>Zoom in for precise location</li>
                <li>Click directly on the issue</li>
                <li>You can adjust by clicking again</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
