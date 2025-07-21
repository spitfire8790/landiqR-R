# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:ci` - Run tests with coverage for CI

## Project Architecture

### Technology Stack
- **Framework**: Next.js 15 with React 18
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Supabase Auth with role-based access
- **Testing**: Vitest with React Testing Library
- **State Management**: React hooks and context
- **UI Components**: Radix UI primitives with custom styling

### Core Application Structure

This is a **project management and responsibility allocation system** built for Land iQ. The application manages:

1. **Groups** - High-level organizational units
2. **Categories** - Specific areas within groups 
3. **People** - Team members with roles and organizations
4. **Tasks** - Work items linked to categories
5. **Workflows** - Visual process flows using React Flow
6. **Allocations** - Assignment of people to categories/tasks
7. **Leave Management** - Time-off tracking
8. **Real-time Chat** - Team communication

### Key Architecture Patterns

#### Authentication & Authorization
- Role-based system: `admin` (full access) vs `readonly` (view-only)
- Authentication handled by `contexts/auth-context.tsx`
- User roles stored in Supabase and managed via `lib/user-management.ts`

#### Data Management
- **Primary Service**: `lib/data-service.ts` - All CRUD operations
- **Database**: Supabase client configured in `lib/supabase.ts`
- **Types**: Centralized in `lib/types.ts`
- Auto-initialization of database tables via `ensureTablesExist()`

#### Component Architecture
- **Main Dashboard**: `components/dashboard.tsx` - Central hub with tab navigation
- **Table Components**: Reusable table views for each entity type
- **Dialog Components**: Modal forms for CRUD operations
- **Chart Components**: Data visualization (org charts, analytics)

#### UI Patterns
- shadcn/ui component system with consistent styling
- Theme support via `next-themes`
- Responsive design with mobile-optimized layouts
- Toast notifications for user feedback

### Database Schema Key Points
- UUID primary keys for all entities
- Foreign key relationships between groups → categories → tasks
- Soft cascading deletes for data integrity
- Timestamp tracking for audit trails

### Special Features
- **Workflow Builder**: Visual workflow creation using React Flow (`@xyflow/react`)
- **Real-time Chat**: Supabase realtime subscriptions
- **Export System**: CSV export functionality in `lib/export-service.ts`
- **Notification System**: In-app notifications with mention parsing
- **Leave Calendar**: Time-off visualization and management

## Development Guidelines

### File Organization
- `/app` - Next.js app router pages
- `/components` - Reusable UI components
- `/lib` - Utilities, services, and business logic
- `/hooks` - Custom React hooks
- `/contexts` - React context providers

### State Management
- Local state with `useState` for component-specific data
- Context providers for shared state (auth, theme)
- Props drilling for component communication
- Data refresh triggers for coordinated updates

### Error Handling
- Toast notifications for user-facing errors
- Console logging for debugging
- Try-catch blocks around async operations
- Graceful degradation for failed operations

### Testing Setup
- Vitest configuration in `vitest.config.ts`
- Test setup file at `tests/setup.ts`
- Testing utilities and mocks should follow existing patterns

## Common Development Tasks

### Adding New Entity Types
1. Define types in `lib/types.ts`
2. Add CRUD functions to `lib/data-service.ts`
3. Create table component following existing patterns
4. Add dialog component for forms
5. Integrate into main dashboard navigation

### Database Schema Changes
- SQL scripts should be added to the repository
- Update `ensureTablesExist()` function for auto-migration
- Ensure proper foreign key relationships
- Add corresponding TypeScript types

### UI Component Development
- Use existing shadcn/ui components when possible
- Follow established styling patterns with Tailwind
- Ensure responsive design for mobile devices
- Add proper TypeScript props interfaces