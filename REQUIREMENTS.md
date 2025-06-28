# Project Requirements

This document lists all the necessary packages and dependencies for the Interactive CV project.

## Core Framework & Runtime
- **next**: ^15.3.3 - React framework with App Router
- **react**: ^19.1.0 - React library
- **react-dom**: ^19.1.0 - React DOM renderer

## UI Framework & Styling
- **tailwindcss**: ^4.1.8 - Utility-first CSS framework
- **@tailwindcss/typography**: ^0.5.16 - Typography plugin for Tailwind
- **@tailwindcss/forms**: ^0.5.10 - Form styling plugin
- **@tailwindcss/aspect-ratio**: ^0.4.2 - Aspect ratio utilities
- **@tailwindcss/line-clamp**: ^0.4.4 - Line clamping utilities
- **@tailwindcss/postcss**: ^4 - PostCSS integration
- **postcss**: ^8.5.4 - CSS post-processor
- **autoprefixer**: ^10.4.21 - CSS vendor prefixing

## Icons & Animations
- **lucide-react**: ^0.511.0 - Beautiful icon library
- **framer-motion**: ^12.18.1 - Animation library for React

## Database & Backend
- **mongodb**: ^6.17.0 - MongoDB driver for Node.js
- **@netlify/functions**: ^4.0.0 - Netlify Functions support

## Data Processing & Utilities
- **papaparse**: ^5.5.3 - CSV parsing library
- **date-fns**: ^4.1.0 - Date utility library
- **node-fetch**: ^2.7.0 - HTTP client for Node.js
- **@octokit/rest**: ^22.0.0 - GitHub API client

## Development Dependencies

### TypeScript & Types
- **typescript**: ^5.8.3 - TypeScript compiler
- **@types/node**: ^20 - Node.js type definitions
- **@types/react**: ^19 - React type definitions
- **@types/react-dom**: ^19 - React DOM type definitions
- **@types/papaparse**: ^5.3.16 - PapaParse type definitions
- **@types/estree**: ^1.0.7 - ESTree type definitions
- **@types/json-schema**: ^7.0.15 - JSON Schema type definitions

### Linting & Code Quality
- **eslint**: ^9 - JavaScript/TypeScript linter
- **eslint-config-next**: 15.3.3 - ESLint configuration for Next.js
- **@eslint/eslintrc**: ^3 - ESLint configuration utilities

### Build Tools & Utilities
- **ts-node**: ^10.9.2 - TypeScript execution for Node.js

## Installation Commands

### Install all dependencies at once:
```bash
npm install
```

### Install production dependencies only:
```bash
npm install --production
```

### Install development dependencies:
```bash
npm install --save-dev
```

## Scripts Available

- `npm run dev` - Start development server with Turbopack
- `npm run dev:netlify` - Start Netlify development environment
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Bun
- `npm run migrate` - Run database migration script
- `npm run push-to-mongo` - Push data to MongoDB

## Environment Setup

1. **Node.js**: Ensure you have Node.js 18+ installed
2. **Package Manager**: This project uses npm (can also use bun for testing)
3. **MongoDB**: Set up MongoDB connection string in environment variables
4. **Netlify**: Configure Netlify for deployment and functions

## Additional Notes

- The project uses ES modules (`"type": "module"` in package.json)
- Tailwind CSS v4 is used with PostCSS integration
- TypeScript is configured for strict type checking
- ESLint is configured with Next.js best practices
- Netlify Functions are used for serverless API endpoints
