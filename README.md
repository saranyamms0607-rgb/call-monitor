# Call Monitor (React + Django)

Concise instructions to run the frontend (Vite/React) and backend (Django) for development on Windows.

Prerequisites
- Python 3.10+ and pip
- Node.js 18+ and npm
- Git

Backend (Django)

1. Create and activate a virtual environment (PowerShell):

```powershell
cd BE-CM
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies and run migrations:

```powershell
pip install -r requirements.txt
cd callMonitor
python manage.py migrate
```

3. (Optional) Update the API token used by the frontend popup:

Edit `callMonitor/settings.py` and set `MONITOR_API_TOKEN = 'your_secret_token'` or export it via environment in a secure way.

4. Run the development server:

```powershell
python manage.py runserver
```

Frontend (Vite + React)

1. Install node deps and set token (dev):

```powershell
cd FE-CM/call-monitor
npm install
# create .env in FE-CM/call-monitor with:
# VITE_MONITOR_API_TOKEN=your_secret_token
```

2. Start the dev server:

```powershell
npm run dev
```

Notes
- The frontend popup will send `Authorization: Token <token>` to the endpoint `http://localhost:8000/api/monitorings/`. Ensure the Django `MONITOR_API_TOKEN` matches.
- `django-cors-headers` is configured for development with permissive CORS. For production, tighten `CORS_ALLOWED_ORIGINS` and use a proper authentication mechanism.
- The workspace `.gitignore` excludes virtual environments, `db.sqlite3`, and `node_modules`.

Troubleshooting
- If the popup Save fails, confirm Django is running and the token is set and matches between frontend `.env` and `settings.py`.
- To remove an accidental local repo: `rm -rf .git` (or `Remove-Item -Recurse -Force .git` in PowerShell). Be careful: this deletes local history.

If you want, I can add a short `Makefile` or PowerShell script to automate these steps.
