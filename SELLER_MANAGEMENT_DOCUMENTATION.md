# Seller Management Module - Complete Implementation

## Overview

This document provides a comprehensive overview of the Seller Management module implementation for the Meesho-like multi-vendor ecommerce platform. The module handles complete seller lifecycle management including registration, profile management, approval workflows, and admin controls.

## Table of Contents

1. [Database Models](#database-models)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Security](#authentication--security)
4. [Seller Workflow](#seller-workflow)
5. [Admin Capabilities](#admin-capabilities)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Installation & Setup](#installation--setup)

---

## Database Models

### SellerProfile Model

Located in: `apps/accounts/models.py`

**Fields:**

```python
class SellerProfile(models.Model):
    # Primary Fields
    id: UUID (Primary Key)
    user: OneToOneField(User) - Unique seller user reference
    
    # Store Information
    store_name: CharField(max_length=255)
    store_description: TextField
    store_logo: ImageField
    store_banner: ImageField
    
    # Business Information
    business_name: CharField(max_length=255)
    business_email: EmailField
    business_phone: CharField(max_length=20)
    
    # Address Information
    address_line_1: CharField(max_length=255)
    address_line_2: CharField(max_length=255)
    city: CharField(max_length=100)
    state: CharField(max_length=100)
    postal_code: CharField(max_length=20)
    country: CharField(max_length=100)
    
    # Tax Information
    gst_number: CharField(max_length=50) - Indexed
    pan_number: CharField(max_length=50) - Indexed
    
    # Status Fields
    kyc_status: CharField(default="PENDING")
    status: CharField(choices=[
        "PENDING",      # Initial state
        "APPROVED",     # Approved by admin
        "REJECTED",     # Rejected by admin
        "SUSPENDED",    # Temporarily suspended
        "BLOCKED"       # Permanently blocked
    ])
    
    # Rejection Information
    rejection_reason: TextField
    rejected_by: ForeignKey(User, null=True) - Reference to admin who rejected
    rejected_at: DateTimeField
    
    # Timestamps
    created_at: DateTimeField(auto_now_add=True)
    updated_at: DateTimeField(auto_now=True)
```

**Indexes:**
- `status` - For efficient filtering
- `city` - For location-based queries
- `state` - For location-based queries
- `created_at` - For sorting

---

## API Endpoints

### Seller Endpoints (Authenticated Sellers Only)

#### 1. Get Seller Profile
```
GET /api/v1/seller/profile/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsSeller

Response: 200 OK
{
    "id": "uuid",
    "user_phone": "9000000001",
    "user_email": "seller@example.com",
    "user_first_name": "Seller",
    "user_last_name": "Test",
    "store_name": "My Store",
    "store_description": "My awesome store",
    "business_name": "ABC Store",
    "business_email": "business@example.com",
    "business_phone": "9999999999",
    "address_line_1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India",
    "gst_number": "GST123",
    "pan_number": "PAN123",
    "status": "APPROVED",
    "status_display": "Approved",
    "rejection_reason": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-02T10:00:00Z"
}
```

#### 2. Update Seller Profile
```
PATCH /api/v1/seller/profile/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsSeller
Content-Type: application/json

Request Body:
{
    "store_name": "Updated Store",
    "store_description": "Updated description",
    "business_email": "new@example.com",
    "business_phone": "8888888888",
    "city": "Delhi",
    "state": "Delhi",
    "postal_code": "110001",
    "country": "India",
    "address_line_1": "456 Street",
    "address_line_2": "Apt 123"
}

Response: 200 OK
{
    // Updated profile data
}

Errors:
- 403 Forbidden: User is not a seller
- 400 Bad Request: Invalid data
```

**Editable Fields:**
- store_name
- store_description
- store_logo (multipart/form-data)
- store_banner (multipart/form-data)
- business_name
- business_email (unique)
- business_phone
- address_line_1
- address_line_2
- city
- state
- postal_code
- country

**Read-only Fields:**
- status (cannot be changed by seller)
- kyc_status
- rejection_reason
- gst_number (cannot be changed)
- pan_number (cannot be changed)

#### 3. Seller Dashboard
```
GET /api/v1/seller/dashboard/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsSeller

Response: 200 OK
{
    "id": "uuid",
    "user_phone": "9000000001",
    "business_name": "ABC Store",
    // ... profile fields ...
    "dashboard": {
        "status": "Approved",
        "total_products": 0,
        "approved_products": 0,
        "pending_products": 0,
        "rejected_products": 0,
        "total_inventory": 0,
        "low_stock_products": 0
    }
}
```

---

### Admin Endpoints (Admin/SuperAdmin Only)

#### 1. List All Sellers
```
GET /api/v1/admin/sellers/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Query Parameters:
- ?status=PENDING          # Filter by status
- ?city=Mumbai             # Filter by city
- ?state=Maharashtra       # Filter by state
- ?kyc_status=PENDING      # Filter by KYC status
- ?search=9000000001       # Search by phone, email, or business name
- ?ordering=-created_at    # Sort by field (prefix with - for descending)
- ?page=1                  # Pagination

Response: 200 OK
{
    "count": 10,
    "next": "http://api/v1/admin/sellers/?page=2",
    "previous": null,
    "results": [
        {
            "id": "uuid",
            "user_phone": "9000000001",
            "user_email": "seller@example.com",
            "user_name": "Seller Test",
            "business_name": "ABC Store",
            "status": "PENDING",
            "status_display": "Pending",
            "city": "Mumbai",
            "state": "Maharashtra",
            "kyc_status": "PENDING",
            "created_at": "2024-01-01T10:00:00Z",
            "updated_at": "2024-01-02T10:00:00Z",
            "rejection_reason": null,
            "rejected_by_name": null,
            "rejected_at": null
        }
    ]
}

Errors:
- 403 Forbidden: User is not admin
```

#### 2. Get Seller Details
```
GET /api/v1/admin/sellers/{seller_id}/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Response: 200 OK
{
    "id": "uuid",
    "user_phone": "9000000001",
    "user_email": "seller@example.com",
    "user_first_name": "Seller",
    "user_last_name": "Test",
    "store_name": "My Store",
    // ... all seller profile fields ...
    "status": "PENDING",
    "status_display": "Pending",
    "rejection_reason": null,
    "rejected_by_name": null,
    "rejected_at": null
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
```

#### 3. Approve Seller
```
POST /api/v1/admin/sellers/{seller_id}/approve/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Request Body: {} (empty)

Response: 200 OK
{
    "message": "Seller 9000000001 has been approved successfully.",
    "status": "Approved"
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
- 400 Bad Request: Seller already approved
```

#### 4. Reject Seller
```
POST /api/v1/admin/sellers/{seller_id}/reject/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Request Body:
{
    "rejection_reason": "Business documents are incomplete and do not meet our standards."
}

Response: 200 OK
{
    "message": "Seller 9000000001 has been rejected.",
    "status": "Rejected",
    "rejection_reason": "Business documents are incomplete..."
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
- 400 Bad Request: Invalid reason or already rejected
```

#### 5. Suspend Seller
```
POST /api/v1/admin/sellers/{seller_id}/suspend/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Request Body: {} (empty)

Response: 200 OK
{
    "message": "Seller 9000000001 has been suspended.",
    "status": "Suspended"
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
- 400 Bad Request: Can only suspend approved sellers
```

#### 6. Activate Seller
```
POST /api/v1/admin/sellers/{seller_id}/activate/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Request Body: {} (empty)

Response: 200 OK
{
    "message": "Seller 9000000001 has been activated.",
    "status": "Approved"
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
- 400 Bad Request: Can only activate suspended sellers
```

#### 7. Block Seller
```
POST /api/v1/admin/sellers/{seller_id}/block/
Authentication: Bearer {token}
Permissions: IsAuthenticated, IsAdminOrSuperAdmin

Request Body: {} (empty)

Response: 200 OK
{
    "message": "Seller 9000000001 has been blocked.",
    "status": "Blocked"
}

Errors:
- 403 Forbidden: User is not admin
- 404 Not Found: Seller not found
- 400 Bad Request: Seller already blocked
```

---

## Authentication & Security

### Security Features

1. **JWT Authentication**
   - All endpoints require valid JWT token
   - Tokens expire after 60 minutes
   - Refresh tokens valid for 7 days

2. **Role-Based Access Control (RBAC)**
   - Sellers can only access their own profile
   - Admins can manage all sellers
   - Buyers cannot access seller management

3. **Seller Isolation**
   - Sellers cannot modify other sellers' profiles
   - Sellers cannot change their own approval status
   - Sellers cannot change GST/PAN numbers
   - Sellers cannot approve/reject themselves

4. **Admin Authority**
   - Only admins can approve/reject sellers
   - Admin must be different from the seller being approved
   - All admin actions are logged with admin reference

### Permission Classes

```python
class IsSeller(BasePermission):
    """Check if user is a seller"""
    
class IsSellerOwner(BasePermission):
    """Check if seller owns the profile being accessed"""
    
class IsAdminOrSuperAdmin(BasePermission):
    """Check if user is admin or super admin"""
    
class CanApproveSeller(BasePermission):
    """Check if user can approve sellers"""
```

---

## Seller Workflow

### Status Flow Diagram

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
       ┌─────────┐  ┌────────┐  ┌─────────┐
       │REJECTED │  │APPROVED│  │ (Error) │
       └─────────┘  └────┬───┘  └─────────┘
            │            │
       (Final)       ┌────┴────┐
                     │         │
                     ▼         ▼
                ┌─────────┐┌─────────┐
                │SUSPENDED││ BLOCKED │
                └────┬────┘└─────────┘
                     │
                     ▼
                ┌─────────┐
                │APPROVED │
                └─────────┘
                  (Final)
```

### Initial Registration (Automatic - via /api/v1/auth/register/seller/)

1. Seller submits:
   - Phone number
   - Email
   - Password
   - First/Last name
   - Business name
   - GST number
   - PAN number

2. System automatically:
   - Creates User with phone as unique identifier
   - Creates SellerProfile with status = "PENDING"
   - Assigns SELLER role
   - Marks user as verified

### Approval Process

1. **Pending Phase**
   - Seller completes profile (optional)
   - Admin reviews seller information
   - Admin can request additional information (via UI)

2. **Admin Actions**
   - **Approve**: Sets status to APPROVED
   - **Reject**: Sets status to REJECTED + stores rejection reason + logs rejected_by + logs rejected_at
   - **Suspend**: Temporarily suspends approved seller
   - **Activate**: Reactivates suspended seller
   - **Block**: Permanently blocks seller

3. **Seller Notifications** (Optional - implement in frontend)
   - Email when rejected with rejection reason
   - Email when approved
   - Email when suspended/blocked

### Rejection Workflow

When a seller is rejected:
1. Status changes to REJECTED
2. Rejection reason is stored
3. Admin info is logged (who rejected, when)
4. Seller can see rejection reason in their profile
5. Seller can resubmit for approval (via registration re-submit or profile update)

---

## Admin Capabilities

### Seller Management Dashboard (Admin)

**Features:**
- View all sellers with pagination
- Filter by status (PENDING, APPROVED, REJECTED, SUSPENDED, BLOCKED)
- Filter by city/state for location-based operations
- Search by phone, email, or business name
- Sort by creation date, business name, or status
- Bulk operations (future enhancement)

### Approval Operations

**Admin Workflow:**
1. Navigate to seller management
2. Review seller information
3. Request additional docs if needed
4. Approve/Reject with reason
5. Monitor seller activity
6. Suspend/Block if necessary

### Status Management

| From Status | Possible Actions | To Status |
|---|---|---|
| PENDING | Approve, Reject | APPROVED, REJECTED |
| APPROVED | Suspend, Block | SUSPENDED, BLOCKED |
| SUSPENDED | Activate, Block | APPROVED, BLOCKED |
| REJECTED | (None - view only) | (None) |
| BLOCKED | (None - view only) | (None) |

---

## Frontend Integration

### React Components

Two React components are provided as examples:

#### 1. SellerProfilePage Component
**File:** `SELLER_PROFILE_COMPONENT.tsx`

**Features:**
- Display seller profile information
- Edit profile (non-sensitive fields)
- Show rejection reason if rejected
- Status badge display

**Usage:**
```tsx
<SellerProfilePage token={authToken} />
```

**Editable Fields:**
- Store name, description, logo, banner
- Business email, phone
- Address information (all fields)

**Props:**
- `token` (string): JWT authentication token

#### 2. SellerDashboard Component
**File:** `SELLER_DASHBOARD_COMPONENT.tsx`

**Features:**
- Display store status
- Show product statistics
- Show inventory statistics
- Quick action buttons

**Usage:**
```tsx
<SellerDashboard token={authToken} />
```

**Displays:**
- Total/Approved/Pending/Rejected products (0 until products module)
- Total inventory and low-stock items (0 until inventory module)
- Store status
- Quick links to add products, view orders, etc.

### CSS Classes for Styling

```css
/* Status Badges */
.status-badge.status-pending { background-color: #FFC107; }
.status-badge.status-approved { background-color: #28A745; }
.status-badge.status-rejected { background-color: #DC3545; }
.status-badge.status-suspended { background-color: #FF9800; }
.status-badge.status-blocked { background-color: #6F42C1; }

/* Components */
.seller-profile-page { /* Main profile container */ }
.seller-dashboard { /* Main dashboard container */ }
.stats-grid { /* Grid layout for stats */ }
.stat-card { /* Individual stat card */ }
.form-group { /* Form input group */ }
.btn.btn-primary { /* Primary button */ }
.btn.btn-secondary { /* Secondary button */ }
.error { /* Error message */ }
.loading { /* Loading state */ }
```

### Integration Points

**Routes to create in React Router:**
```tsx
<Routes>
  <Route path="/seller/profile" element={<SellerProfilePage token={token} />} />
  <Route path="/seller/dashboard" element={<SellerDashboard token={token} />} />
  <Route path="/admin/sellers" element={<AdminSellerList token={token} />} />
  <Route path="/admin/sellers/:id" element={<AdminSellerDetail token={token} />} />
</Routes>
```

**API Calls:**
All components use axios with Bearer token authentication:
```tsx
axios.get('/api/v1/seller/profile/', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

---

## Testing

### Test Suite Overview

**File:** `apps/sellers/tests.py`

**Test Classes:** 6
**Total Tests:** 20
**Coverage:**
- ✅ Seller profile retrieval
- ✅ Seller profile updates
- ✅ Seller dashboard access
- ✅ Admin seller listing with filtering
- ✅ Admin seller search
- ✅ Admin approval/rejection/suspension
- ✅ Seller isolation (security)
- ✅ Permission checks

### Running Tests

```bash
# Run all seller tests
python manage.py test apps.sellers.tests --verbosity=2

# Run specific test class
python manage.py test apps.sellers.tests.SellerProfileAPITests

# Run specific test
python manage.py test apps.sellers.tests.SellerProfileAPITests.test_seller_can_get_own_profile

# With coverage
coverage run --source='apps.sellers' manage.py test apps.sellers.tests
coverage report
```

### Test Results

All 20 tests pass successfully:

```
Ran 20 tests in 47.180s

OK

Tests Covered:
✅ SellerProfileAPITests (4 tests)
   - Get own profile
   - Update own profile
   - Cannot change own status
   - Cannot change GST/PAN

✅ SellerDashboardAPITests (2 tests)
   - Access dashboard
   - Dashboard contains stats

✅ AdminSellerListAPITests (5 tests)
   - List sellers
   - Filter by status
   - Filter by city
   - Search by phone
   - Buyer cannot access

✅ AdminSellerApprovalTests (7 tests)
   - Approve seller
   - Reject seller
   - Seller sees rejection reason
   - Suspend seller
   - Activate seller
   - Block seller
   - Seller cannot self-approve

✅ SellerIsolationTests (2 tests)
   - Seller cannot access other profiles
   - Seller cannot modify other profiles
```

---

## Installation & Setup

### Prerequisites

- Python 3.10+
- Django 5.2.4
- PostgreSQL
- pip

### Step 1: Update Dependencies

```bash
pip install -r requirements.txt
```

**New packages added:**
- django-filter==24.1 (for filtering, searching, ordering)
- Pillow==10.1.0 (for image uploads)

### Step 2: Run Migrations

```bash
# Create migrations for updated SellerProfile
python manage.py makemigrations accounts

# Apply all migrations
python manage.py migrate
```

**Migration Details:**
- Removed `seller_status` field
- Added all store, business, and address fields
- Added rejection tracking fields
- Created indexes on status, city, state, created_at

### Step 3: Seed Initial Data

```bash
# Seed roles
python manage.py seed_roles

# Seed test users
python manage.py seed_users
```

**Test Accounts:**
```
SuperAdmin: superadmin.dev@example.com / StrongPassword123
Admin:      admin.dev@example.com / StrongPassword123
Seller:     seller.dev@example.com / StrongPassword123 (PENDING)
Buyer:      buyer.dev@example.com / StrongPassword123
```

### Step 4: Run Development Server

```bash
python manage.py runserver
```

Server runs at: http://localhost:8000

### Step 5: Test Installation

```bash
# Run all tests
python manage.py test apps.sellers.tests

# Test API endpoints using curl or Postman
curl -X GET http://localhost:8000/api/v1/seller/profile/ \
  -H "Authorization: Bearer {token}"
```

### Environment Variables

Add to .env or settings:
```
DJANGO_ENV=development  # Prevents seed_users in production
DB_NAME=meesho_clone
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

---

## Configuration Files

### settings.py Changes

1. **INSTALLED_APPS:**
   - Added `'django_filters'`
   - Added `'apps.sellers.apps.SellersConfig'`

2. **MEDIA Files:**
   ```python
   MEDIA_URL = 'media/'
   MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
   ```

3. **REST_FRAMEWORK:**
   ```python
   DEFAULT_FILTER_BACKENDS = [
       'django_filters.rest_framework.DjangoFilterBackend',
       'rest_framework.filters.SearchFilter',
       'rest_framework.filters.OrderingFilter',
   ]
   DEFAULT_PAGINATION_CLASS = 'rest_framework.pagination.PageNumberPagination'
   PAGE_SIZE = 20
   ```

### urls.py Changes

Added sellers app URLs:
```python
path('api/v1/', include('apps.sellers.urls')),
```

---

## Files Created/Modified

### Created Files
- `apps/sellers/serializers.py` - 7 serializer classes
- `apps/sellers/permissions.py` - 4 permission classes
- `apps/sellers/views.py` - 2 main views + 1 viewset
- `apps/sellers/urls.py` - URL routing
- `apps/sellers/tests.py` - 20 comprehensive tests
- `SELLER_PROFILE_COMPONENT.tsx` - React profile component
- `SELLER_DASHBOARD_COMPONENT.tsx` - React dashboard component

### Modified Files
- `apps/accounts/models.py` - Enhanced SellerProfile model
- `apps/accounts/serializers.py` - Updated to use new status field
- `apps/accounts/management/commands/seed_users.py` - Updated for new field
- `apps/accounts/admin.py` - Updated admin display
- `apps/accounts/tests.py` - Updated test assertions
- `apps/sellers/apps.py` - Fixed app configuration
- `config/settings.py` - Added new apps and middleware
- `config/urls.py` - Added sellers URLs
- `requirements.txt` - Added dependencies

### Migration Files
- `apps/accounts/migrations/0003_remove_sellerprofile_seller_status_and_more.py`

---

## Key Features Summary

✅ **Seller Registration**
- Complete seller onboarding
- Auto-PENDING status
- GST/PAN validation

✅ **Profile Management**
- Sellers can view/edit their profiles
- Store information (name, description, logo, banner)
- Business information
- Address details
- Read-only tax information and status fields

✅ **Approval Workflow**
- Admin approval process
- Rejection with reason storage
- Rejection visibility to sellers
- Suspension/Reactivation capability
- Permanent blocking option

✅ **Admin Management**
- List all sellers with pagination
- Advanced filtering (status, city, state, KYC)
- Search functionality (phone, email, business name)
- Sorting options
- Individual seller details view

✅ **Security**
- Seller isolation enforced
- Read-only sensitive fields
- Admin-only approval actions
- JWT authentication
- RBAC permissions

✅ **Dashboard**
- Seller dashboard with stats
- Product overview (preparation for future)
- Inventory overview (preparation for future)
- Quick action buttons

✅ **Testing**
- 20 comprehensive tests
- Security tests (seller isolation)
- Permission tests
- Approval workflow tests
- 100% passing rate

---

## Future Enhancements

1. **Seller Notifications**
   - Email on approval/rejection
   - Notification on suspension/blocking
   - Dashboard notifications

2. **Product Integration**
   - Link products to sellers
   - Track product approval status
   - Update dashboard stats

3. **Inventory Integration**
   - Link inventory to sellers
   - Track stock levels
   - Low-stock alerts

4. **Performance Metrics**
   - Seller ratings
   - Sales history
   - Customer reviews

5. **Advanced Admin Features**
   - Bulk operations
   - Seller performance reports
   - Commission management
   - Payment reconciliation

6. **Document Management**
   - Upload and verify GST certificate
   - Upload and verify PAN
   - Business license upload
   - Bank details verification

---

## Support & Documentation

For more information:
- API Documentation: Swagger/OpenAPI (can be added via drf-spectacular)
- Frontend Guide: See React component files
- Database Schema: See models.py
- Tests: See tests.py for usage examples

---

## Definition of Done - Verification Checklist

- ✅ DATABASE: Models created with all fields
- ✅ DATABASE: Migrations created and applied
- ✅ DATABASE: Indexes added for performance
- ✅ BACKEND: Serializers for all operations
- ✅ BACKEND: Views/ViewSets for all endpoints
- ✅ BACKEND: Permissions enforced correctly
- ✅ BACKEND: APIs fully functional
- ✅ BACKEND: Admin actions working (approve/reject/suspend/activate/block)
- ✅ BACKEND: Seller isolation verified
- ✅ BACKEND: Settings updated (installed apps, media files, filters)
- ✅ FRONTEND: Profile page component created
- ✅ FRONTEND: Dashboard component created
- ✅ FRONTEND: API integration ready
- ✅ TESTING: 20 comprehensive tests created
- ✅ TESTING: All tests passing (100% pass rate)
- ✅ TESTING: Permission tests included
- ✅ TESTING: Seller isolation tests included
- ✅ DOCUMENTATION: Complete API documentation
- ✅ DOCUMENTATION: Setup instructions
- ✅ DOCUMENTATION: File listing

---

## Next Steps

After this module, recommended implementation order:

1. **Category Management** - Product categories
2. **Product Management** - Seller product listing
3. **Inventory Management** - Stock tracking
4. **Orders Management** - Order processing
5. **Reviews & Ratings** - Customer feedback
6. **Payments** - Payment processing
7. **Notifications** - Email/SMS notifications

---

**Status: ✅ COMPLETE AND FULLY TESTED**

Implementation Date: 2024
Framework: Django + Django REST Framework
Database: PostgreSQL
Frontend Framework: React + TypeScript
