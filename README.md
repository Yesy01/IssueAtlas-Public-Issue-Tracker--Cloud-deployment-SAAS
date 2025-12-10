# IssueAtlas – Public Issue Tracker

IssueAtlas is a map-based web app for reporting and tracking public infrastructure issues (potholes, drainage, streetlights, etc.). Built as part of the CS-3810 course.

## Live Deployment

- App: **http://74.225.142.132/**
- API: `http://74.225.142.132/api`

> For full design, architecture and test details, see the accompanying project report / documentation.

## Features 

- User accounts (JWT auth), user/admin roles  
- Report issues with title, description, type, map location, optional image  
- Map view with filters (status, type, text search)  
- Issue details: comments, upvotes, status history, admin/official responses  
- “My Issues” page and basic analytics  
- Notifications panel for updates to your issues

## Tech Stack

- **Frontend:** React, TypeScript, Vite, React Router, React-Leaflet, Tailwind CSS  
- **Backend:** Node.js, Express, Prisma, Zod, JWT  
- **Database:** Azure Database for PostgreSQL Flexible Server  
- **Storage:** Azure Blob Storage (images)  
- **Infra:** Azure VM (Ubuntu) + Docker Compose + Nginx reverse proxy  
- **CI/CD:** GitHub Actions (lint, tests, basic security scan, deploy)

## Quick Start (Local)

```bash
git clone https://github.com/DPCS3810/project-2-runtime_terrors.git
cd project-2-runtime_terrors/tracker 
```

## License

Coursework project. Not licensed for production use without review and hardening.