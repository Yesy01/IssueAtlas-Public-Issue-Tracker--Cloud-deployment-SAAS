// src/pages/MapPage.tsx
import { useEffect, useRef, useState } from "react";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api";
import type { Issue, IssueStatus, IssueType, User } from "../types";

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

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 78], 4); // rough India

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
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
      const color = statusColor(issue.status);
      const marker = L.circleMarker([issue.lat, issue.lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.8,
      }).bindPopup(
        `<strong>${issue.title}</strong><br/>
        Status: ${issue.status}<br/>
        Type: ${issue.type}<br/>
        ${issue.areaName ?? ""}`
      );
      marker.addTo(group);
    });

    if (issues.length > 0) {
      const bounds = L.latLngBounds(issues.map((i) => [i.lat, i.lon]));
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [issues]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
      <div>
        <div
          ref={mapContainerRef}
          style={{ height: "400px", border: "1px solid #ccc" }}
        />
      </div>
      <div>
        <h2>Issues</h2>
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="triaged">Triaged</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="">All types</option>
            <option value="pothole">Pothole</option>
            <option value="streetlight">Streetlight</option>
            <option value="drainage">Drainage</option>
            <option value="other">Other</option>
          </select>

          <input
            placeholder="Search title/description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        {loading && <div>Loading...</div>}

        <ul style={{ maxHeight: "320px", overflowY: "auto", padding: 0 }}>
          {issues.map((issue) => (
            <li
              key={issue.id}
              style={{
                listStyle: "none",
                padding: "0.5rem",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>{issue.title}</strong> ({issue.type})<br />
              <span>Status: {issue.status}</span>
              {issue.areaName && <div>Area: {issue.areaName}</div>}
              {issue.imageUrl && (
                <div>
                  <a href={issue.imageUrl} target="_blank" rel="noreferrer">
                    View image
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
        {!loading && issues.length === 0 && <div>No issues found.</div>}
        {user && <div style={{ marginTop: "0.5rem" }}>Logged in as: {user.email}</div>}
      </div>
    </div>
  );
}

function statusColor(status: IssueStatus): string {
  switch (status) {
    case "new":
      return "red";
    case "triaged":
      return "orange";
    case "in_progress":
      return "blue";
    case "resolved":
      return "green";
    default:
      return "gray";
  }
}
