# DueSpark Frontend Deployment Guide

## Overview

This is the frontend application for DueSpark, a professional invoice management system built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Modern Tech Stack**: Next.js 15 with TypeScript and Tailwind CSS
- **Authentication**: JWT-based authentication with Zustand state management
- **Professional UI**: shadcn/ui components with responsive design
- **API Integration**: React Query for efficient data fetching
- **Invoice Management**: Create, track, and manage invoices
- **Client Management**: Organize client information and preferences
- **Dashboard**: Overview of business metrics and quick actions

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (DueSpark backend)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your backend API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_APP_NAME=DueSpark
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open http://localhost:3000 in your browser

## Production Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard:**
   - `NEXT_PUBLIC_API_URL`: Your production backend URL
   - `NEXT_PUBLIC_APP_NAME`: DueSpark
   - `NEXT_PUBLIC_APP_VERSION`: 1.0.0

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Deploy to Netlify:**
   ```bash
   netlify deploy --prod
   ```

### Option 3: Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Or export static files:**
   ```bash
   npm run export
   ```

## Environment Variables

### Development (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=DueSpark
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Production (.env.production)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_APP_NAME=DueSpark
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Backend Integration

The frontend connects to the DueSpark backend API. Make sure to:

1. **Update API URL**: Set `NEXT_PUBLIC_API_URL` to your backend deployment URL
2. **CORS Configuration**: Ensure your backend allows requests from your frontend domain
3. **Authentication**: The frontend expects JWT tokens from `/auth/login` endpoint

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                 # Next.js app directory (pages)
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard page
│   └── layout.tsx      # Root layout
├── components/         # Reusable components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── providers/      # Context providers
├── lib/                # Utility libraries
│   └── api.ts         # API service layer
├── store/              # Zustand stores
│   └── authStore.ts   # Authentication state
└── types/              # TypeScript type definitions
    └── api.ts         # API types
```

## Key Features Implemented

### Authentication System
- User registration and login
- JWT token management
- Protected routes with AuthGuard
- Automatic token refresh handling

### Dashboard
- Business metrics overview
- Recent invoices display
- Quick action buttons
- Responsive design

### Modern UI Components
- Professional landing page
- Responsive navigation
- Loading states
- Error handling
- Mobile-friendly design

## Next Steps for Full Implementation

1. **Invoice Management Pages**:
   - Invoice list with filtering
   - Invoice creation form
   - Invoice detail view
   - Invoice editing

2. **Client Management**:
   - Client list with search
   - Client creation/editing forms
   - Client detail pages

3. **Reminder System**:
   - Reminder setup interface
   - Template management
   - Automated scheduling

4. **Analytics & Reporting**:
   - Revenue charts
   - Payment analytics
   - Export functionality

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check backend CORS settings
   - Ensure backend is running

2. **Build Errors**:
   - Run `npm run lint:fix` to fix linting issues
   - Check TypeScript errors with `npm run type-check`

3. **Authentication Issues**:
   - Clear browser localStorage
   - Verify JWT token format
   - Check backend authentication endpoints

### Development Tips

- Use React Developer Tools for debugging
- Check Network tab for API calls
- Use console.log for debugging state changes
- Verify environment variables are loaded correctly

## Support

For issues related to the DueSpark frontend, please check:
1. Environment variable configuration
2. Backend API connectivity
3. Browser console for JavaScript errors
4. Network requests in developer tools

This frontend is ready for production deployment and provides a solid foundation for a professional invoice management system.