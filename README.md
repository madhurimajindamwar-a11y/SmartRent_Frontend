# SmartRent Frontend

SmartRent helps tenants discover rooms, save favorites, receive preference-based recommendations, and submit rental requests. Owners manage listings and requests, while admins review listings.

## Live application

https://smart-rent-frontend.vercel.app/

## Technology

React, Vite, React Router, and Axios.

## Implemented features

- Tenant and owner registration.
- Login, logout, session expiry, and role-specific dashboards.
- Browse rooms and filter by locality, maximum rent, and room type.
- Property details and multiple photo previews.
- Add, view, and remove favorites.
- Smart matching with match percentages and explanations.
- Submit and cancel pending rental requests.
- Owner acceptance and rejection of rental requests.
- View active rentals and rental request history.
- Owner listing creation, editing, availability controls, and deletion.
- Owner photo upload and deletion.
- Admin listing verification and rejection.
- Loading, error, success, and empty states.

## Local setup

Install a Node.js version compatible with the project's Vite version.

Run from this repository:

    npm ci
    npm run dev

Open http://localhost:5173.

The backend must run separately on port 8081. Vite forwards local /api requests to http://localhost:8081.

## Production build

    npm run build

The generated output is in dist.

## Deployment

Hosted on Vercel:

- Framework: Vite
- Build command: npm run build
- Output directory: dist
- Repository root: ./

vercel.json forwards /api requests to the Railway backend and supports direct navigation to React routes.

The frontend uses /api as its API base URL. Database credentials and the JWT signing secret belong only on the backend.

## Manual verification

Verified on the deployed application:

- Tenant, owner, and admin dashboard access.
- Property photos and direct-page refresh.
- Favorites addition and removal.
- A 100% preference match for the demo room.
- Rental request submission and owner acceptance.
- Active rental creation and removal of rented listings from browsing.
- Blocking new requests while a tenant has an active rental.
- Listing titles in request and rental history.

These checks are manual smoke tests, not a complete automated test suite.

## Scope

This version supports one active rental per listing and one active rental per tenant. Matching uses deterministic preference weights, not machine learning.

Visits, payments, reviews, maps, password change/reset, notifications, and advanced admin management are not implemented.

## Backend repository

https://github.com/madhurimajindamwar-a11y/SmartRent_Backend


## Additional features verified live

- Profile name/email editing with current-password confirmation.
- Saved profile summary and dashboard session updates.
- Incorrect-password and duplicate-email rejection.
- Comparison of two or three selected rooms.
- Comparison selection removal and clearing.
- Tenant maintenance submission for an active rental.
- Owner maintenance updates: Open → In Progress → Resolved.
- Tenant visibility of maintenance status changes.
