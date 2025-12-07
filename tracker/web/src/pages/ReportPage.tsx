// src/pages/ReportPage.tsx
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import type { Issue, IssueType, User } from "../types";

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

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 78], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

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
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (lat == null || lon == null) {
      setError("Click on the map to choose a location.");
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

      setMessage(`Issue created with id ${res.data.issue.id}`);
      setTitle("");
      setDescription("");
      setAddress("");
      setAreaName("");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error ?? "Failed to create issue";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
      <div>
        <h2>Report an issue</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <div>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <div>
            <label>
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
              >
                <option value="pothole">Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="drainage">Drainage</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              Address (optional)
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <div>
            <label>
              Area name (optional)
              <input
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <div>
            <label>
              Image (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div style={{ margin: "0.5rem 0" }}>
            <strong>Location:</strong>{" "}
            {lat && lon ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : "click on map"}
          </div>
          {error && <div style={{ color: "red" }}>{error}</div>}
          {message && <div style={{ color: "green" }}>{message}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit issue"}
          </button>
        </form>
        <div style={{ marginTop: "0.5rem" }}>
          Reporting as <strong>{user.email}</strong>
        </div>
      </div>
      <div>
        <h3>Choose location</h3>
        <div
          ref={mapContainerRef}
          style={{ height: "400px", border: "1px solid #ccc" }}
        />
      </div>
    </div>
  );
}
export default ReportPage;
