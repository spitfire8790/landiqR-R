# Multi-Project Implementation Plan
## Land iQ Responsibility Allocation App

### Overview
This document outlines the implementation plan for adding multi-project/organization capability to the Land iQ Responsibility Allocation application. This enhancement will allow users to manage responsibility matrices for multiple projects or organizations within a single application instance.

### Current Architecture
The application currently has this hierarchy:
```
Groups
├── Categories
    ├── People (allocated)
    ├── Tasks
        └── Responsibilities (with weekly hours)
```

### Proposed New Architecture
The new architecture will add an Organization layer at the top:
```
Organizations (NEW)
├── Groups
    ├── Categories
        ├── People (allocated)
        ├── Tasks
            └── Responsibilities (with weekly hours)
```

---

## Phase 1: Database Schema & Data Model Changes

### 1.1 New Database Tables

#### Organizations Table
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### User Organization Memberships Table
```sql
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- References auth system
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'readonly'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);
```

### 1.2 Schema Modifications to Existing Tables

Add `organization_id` foreign key to all existing tables that need organization scoping:

```sql
-- Add organization_id to existing tables
ALTER TABLE groups ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE people ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE allocations ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE responsibilities ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE task_source_links ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_groups_organization_id ON groups(organization_id);
CREATE INDEX idx_categories_organization_id ON categories(organization_id);
CREATE INDEX idx_people_organization_id ON people(organization_id);
CREATE INDEX idx_allocations_organization_id ON allocations(organization_id);
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_responsibilities_organization_id ON responsibilities(organization_id);
CREATE INDEX idx_task_source_links_organization_id ON task_source_links(organization_id);
```

### 1.3 Data Migration Strategy

#### Migration Script Requirements:
1. **Create Default Organization**: Create a "Default Organization" for existing data
2. **Migrate Existing Data**: Associate all existing records with the default organization
3. **Create User Memberships**: Add all existing users to the default organization with admin role

#### Migration Implementation:
```sql
-- 1. Create default organization
INSERT INTO organizations (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'Initial organization for existing data');

-- 2. Update all existing records with default organization ID
UPDATE groups SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE categories SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE people SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE allocations SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE tasks SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE responsibilities SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE task_source_links SET organization_id = '00000000-0000-0000-0000-000000000001';

-- 3. Make organization_id NOT NULL after migration
ALTER TABLE groups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE people ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE allocations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE responsibilities ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE task_source_links ALTER COLUMN organization_id SET NOT NULL;
```

---

## Phase 2: TypeScript Interfaces & Types

### 2.1 New Type Definitions

```typescript
// lib/types.ts additions

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: 'admin' | 'member' | 'readonly';
  createdAt: Date;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  userEmail?: string; // From auth system
  role: 'admin' | 'member' | 'readonly';
  createdAt: Date;
}
```

### 2.2 Updated Existing Interfaces

Add `organizationId` to all existing interfaces:

```typescript
export interface Group {
  id: string;
  name: string;
  icon?: string;
  organizationId: string; // NEW
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  groupId: string;
  organizationId: string; // NEW
  sourceLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Similar updates for Person, Allocation, Task, Responsibility, TaskSourceLink
```

---

## Phase 3: Authentication & Session Management

### 3.1 Enhanced Authentication Context

```typescript
// contexts/auth-context.tsx updates

interface AuthContextType {
  user: User | null;
  currentOrganization: Organization | null; // NEW
  userOrganizations: Organization[]; // NEW
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchOrganization: (organizationId: string) => Promise<boolean>; // NEW
  isAdmin: boolean;
  isReadonly: boolean;
  isOrganizationAdmin: boolean; // NEW - admin within current org
}
```

### 3.2 Organization Selection Flow

1. **Login Process**:
   - User logs in with credentials
   - System fetches user's organizations
   - If user has multiple organizations, show organization selector
   - If user has only one organization, auto-select it
   - Store selected organization in session

2. **Organization Switching**:
   - Add organization switcher in header
   - Allow switching without re-login
   - Clear/reload data when switching organizations

---

## Phase 4: Backend API Changes

### 4.1 Data Service Updates

All data service functions need organization scoping:

```typescript
// lib/data-service.ts updates

// Organization management
export async function fetchUserOrganizations(userId: string): Promise<Organization[]>
export async function createOrganization(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization | null>
export async function updateOrganization(org: Organization): Promise<Organization | null>
export async function deleteOrganization(id: string): Promise<boolean>

// User organization membership
export async function addUserToOrganization(userId: string, organizationId: string, role: string): Promise<boolean>
export async function updateUserOrganizationRole(userId: string, organizationId: string, role: string): Promise<boolean>
export async function removeUserFromOrganization(userId: string, organizationId: string): Promise<boolean>
export async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>

// Updated existing functions with organization scoping
export async function fetchGroups(organizationId: string): Promise<Group[]>
export async function fetchCategories(organizationId: string): Promise<Category[]>
export async function fetchPeople(organizationId: string): Promise<Person[]>
// ... etc for all existing functions
```

### 4.2 API Middleware

Add organization authorization middleware:

```typescript
// middleware/organization-auth.ts

export function withOrganizationAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { organizationId } = req.query;
    const userId = getUserFromSession(req);
    
    // Verify user has access to this organization
    const hasAccess = await verifyUserOrganizationAccess(userId, organizationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    return handler(req, res);
  };
}
```

---

## Phase 5: Frontend Implementation

### 5.1 Organization Switcher Component

```typescript
// components/organization-switcher.tsx

export function OrganizationSwitcher() {
  const { currentOrganization, userOrganizations, switchOrganization } = useAuth();
  
  return (
    <Select value={currentOrganization?.id} onValueChange={switchOrganization}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {userOrganizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 5.2 Organization Management Pages

#### Organization Settings Page
- `/organizations/[id]/settings`
- Organization details editing
- Member management
- Role assignments

#### Organization List Page
- `/organizations`
- List of user's organizations
- Create new organization (if user has permission)
- Quick switch between organizations

### 5.3 Updated Dashboard Header

```typescript
// components/dashboard.tsx updates

export function Dashboard() {
  const { currentOrganization, isOrganizationAdmin } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1>Land iQ - {currentOrganization?.name}</h1>
            <OrganizationSwitcher />
          </div>
          
          <div className="flex items-center space-x-4">
            {isOrganizationAdmin && (
              <Button variant="outline" onClick={() => setShowOrgSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Org Settings
              </Button>
            )}
            {/* ... existing buttons */}
          </div>
        </div>
      </header>
      {/* ... rest of dashboard */}
    </div>
  );
}
```

---

## Phase 6: Data Isolation & Security

### 6.1 Row-Level Security (RLS)

Implement database-level security policies:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Create policies
CREATE POLICY "Users can only access their organizations" ON organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = current_setting('app.current_user_id')
    )
  );

CREATE POLICY "Users can only access data from their organizations" ON groups
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = current_setting('app.current_user_id')
    )
  );
-- ... similar policies for all tables
```

### 6.2 Frontend Data Validation

Ensure all API calls include organization context and validate responses contain only organization-scoped data.

---

## Phase 7: Migration & Deployment Strategy

### 7.1 Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migration script on staging environment
- [ ] Verify all existing functionality works with default organization
- [ ] Test new multi-organization features
- [ ] Prepare rollback plan

### 7.2 Migration Steps

1. **Deploy new code** (with feature flags disabled)
2. **Run database migration** to add new tables and columns
3. **Run data migration** to populate default organization
4. **Enable multi-organization features** via feature flags
5. **Monitor and verify** data integrity and functionality

### 7.3 Rollback Plan

- Revert to previous application version
- Remove organization_id columns (data preserved)
- Restore previous authentication flow

---

## Phase 8: Testing Strategy

### 8.1 Unit Tests

- Organization CRUD operations
- User organization membership management
- Data scoping validation
- Authentication context updates

### 8.2 Integration Tests

- Multi-organization data isolation
- Organization switching workflows
- Permission enforcement
- API endpoint authorization

### 8.3 End-to-End Tests

- Complete user workflows across organizations
- Organization creation and management
- Member invitation and role management
- Data migration verification

---

## Implementation Timeline

### Week 1-2: Database & Backend Foundation
- Implement database schema changes
- Create migration scripts
- Update data service layer
- Add organization management APIs

### Week 3: Authentication & Session Management
- Update authentication context
- Implement organization selection flow
- Add organization switching capability
- Update API middleware

### Week 4: Frontend Implementation
- Create organization switcher component
- Update dashboard and navigation
- Implement organization management pages
- Update all existing components for organization scoping

### Week 5: Testing & Refinement
- Comprehensive testing
- Bug fixes and refinements
- Performance optimization
- Documentation updates

### Week 6: Migration & Deployment
- Production migration
- Monitoring and validation
- User training and support

---

## Considerations & Risks

### Technical Risks
- **Data Migration Complexity**: Large datasets may require careful migration planning
- **Performance Impact**: Additional joins and filtering may affect query performance
- **Session Management**: Organization switching needs careful state management

### User Experience Risks
- **Complexity**: Additional organization layer may confuse existing users
- **Migration UX**: Existing users need smooth transition to new structure
- **Permission Confusion**: Clear role definitions needed across organizations

### Mitigation Strategies
- Thorough testing on staging environment
- Gradual rollout with feature flags
- Clear user documentation and training
- Monitoring and quick rollback capability

---

## Future Enhancements

### Organization Templates
- Predefined group/category structures for common use cases
- Template sharing between organizations

### Advanced Permissions
- Fine-grained permissions per group/category
- Custom role definitions
- Audit logging

### Organization Analytics
- Cross-organization reporting
- Resource utilization across projects
- Comparative analytics

### Integration Capabilities
- API for external systems
- SSO integration
- Third-party tool connections

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding multi-project capability to the Land iQ Responsibility Allocation app. The phased approach ensures minimal disruption to existing users while providing a robust foundation for managing multiple projects/organizations.

The key success factors are:
1. **Careful data migration** to preserve existing data
2. **Thorough testing** to ensure data isolation and security
3. **Clear user experience** for organization management and switching
4. **Performance optimization** to handle the additional complexity

This enhancement will significantly increase the application's value proposition by allowing organizations to manage multiple projects within a single platform.
