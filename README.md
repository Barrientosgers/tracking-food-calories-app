# Calories Tracker (single-file web app)

Run:
- Open [Mods/food-calories-app/index.html](Mods/food-calories-app/index.html) in your browser.
- Or run a small static server (recommended) from the folder:
  - Python: `python -m http.server 8000`
  - Node (http-server): `npx http-server -c-1 .`

Features:
- Add food entries with date and calories
- Edit / delete entries
- Data persists in `localStorage`
- Export / import CSV

Backend (optional):
- A minimal Node/Express backend is included in `server.js` to add users and persist entries per-user.
- To run the backend:

```bash
cd tracking-food-calories-app
npm install
npm start
```

- The server runs on port 3000 by default. Endpoints:
  - `POST /api/register` {username,password}
  - `POST /api/login` {username,password} -> returns `{ token }`
  - `GET /api/entries` (Authorization: `Bearer <token>`)
  - `POST /api/entries` {date,name,cal}
  - `PUT /api/entries/:id` {date,name,cal}
  - `DELETE /api/entries/:id`

Frontend notes:
- A daily-calories chart was added to the UI (Chart.js via CDN).
- To enable the backend in the frontend edit `app.js` and set `API_BASE` to your backend URL (e.g. `http://localhost:3000`) and set `API_ENABLED = true`.

Security note: The included backend is a minimal example. For production, change `JWT_SECRET`, use HTTPS, improve validation and error handling.