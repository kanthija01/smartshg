# SmartSHG

SmartSHG is a self-help group management platform for member savings, cash and bank ledgers, loans, meetings, reports, and group administration.

## Project Structure

- `client/` - React and Vite frontend
- `server/` - Express and MongoDB backend

## Requirements

- Node.js 18 or newer
- npm
- MongoDB is optional for local development. If MongoDB is unavailable, the server starts an embedded MongoDB memory server.

## Installation

Install dependencies for both applications:

```bash
cd client
npm install

cd ../server
npm install
```

## Run the Application

Start the backend in one terminal:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Open the application at <http://localhost:5173>.

The backend health endpoint is <http://localhost:5000/api/health>.

## Environment Variables

Create `server/.env` when custom configuration is needed:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartshg
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

The frontend proxies `/api` requests to `http://localhost:5000` during development. To use another API URL, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Demo Accounts

The embedded database is seeded automatically when no external MongoDB is available.

| Role | Email | Password |
| --- | --- | --- |
| Group leader | `radha@smartshg.org` | `password123` |
| Member | `lakshmi@smartshg.org` | `password123` |
| Member | `saraswathi@smartshg.org` | `password123` |

The seed script can also be run directly:

```bash
cd server
npm run seed
```

## Registration

- A group leader provides a group name, village or town, and district. Registration creates the SHG and signs the leader in.
- A member provides an active SHG group code. Registration creates an active member profile and signs the member in.

## Payments and Savings

SmartSHG uses cash recording for group savings. The group leader records collections from the Savings page. Online Razorpay payment integration has been removed.

Bank deposits are recorded as cash moving from the group cash balance to the bank ledger by the group leader.

## Deployment

Deploy the backend and frontend as separate services. Render, Railway, Fly.io, Vercel, and Netlify are suitable providers.

### 1. Create a production MongoDB database

Create a MongoDB Atlas cluster and copy its connection string. Add the deployment server's IP access rule in Atlas. Do not use the embedded MongoDB server in production.

### 2. Deploy the backend

Configure the backend service with:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Set these backend environment variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<long_random_production_secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://<your-frontend-domain>
```

After deployment, verify:

```text
https://<your-backend-domain>/api/health
```

### 3. Deploy the frontend

Configure the frontend service with:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Set this frontend environment variable before building:

```env
VITE_API_URL=https://<your-backend-domain>/api
```

Redeploy the frontend after changing `VITE_API_URL`, because Vite embeds it during the build.

### 4. Verify the production app

1. Open the frontend URL.
2. Register a test group leader and confirm the dashboard loads.
3. Register a member with the generated group code and confirm member login.
4. Record a cash savings entry as the leader.
5. Confirm logout and English/Telugu switching.

Remove test users and seed data before using the deployment with real records.

## Language

The login and registration screens support English and Telugu. The selected language is saved for the user and browser session.

## Testing and Build

Run the backend API integration suite:

```bash
cd server
npm run test:api
```

Build the frontend for production:

```bash
cd client
npm run build
```

The API suite checks health, fresh leader and member registration, leader/member login, access control, cash savings, ledger deposits, loans, audit logs, and government schemes.

## Security Notes

- Set a strong `JWT_SECRET` outside local development.
- Do not commit `.env` files or production credentials.
- Review `npm audit` output before deploying to production.
