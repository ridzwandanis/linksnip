# LinkSnip - URL Shortener

A minimalist URL shortening service built with modern web technologies.

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Router
- TanStack Query (React Query)
- Recharts

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone https://github.com/ridzwandanis/linksnip.git

# Navigate to the project directory
cd linksnip/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Features

- URL shortening with auto-generated codes
- Custom short codes
- Analytics dashboard with authentication
- Click tracking
- URL management (edit, delete)
- Responsive design

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_BASE_URL=http://localhost:3000
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   ├── pages/          # Page components
│   ├── services/       # API services
│   └── utils/          # Helper functions
├── public/             # Static assets
└── index.html          # HTML entry point
```
