# Database Overview

This document tracks the current schema and implementation state of the database models in the Meesho clone project.

## Current Implemented Models

### Accounts App
- **User**: Core authentication model.
- **Role**: Role definition (SUPER_ADMIN, ADMIN, SELLER, BUYER).
- **Permission**: System permissions.
- **UserRole / RolePermission**: Relationships.
- **SellerProfile**: Contains store and business information.
- **BuyerProfile**: Buyer information.
- **AdminProfile**: Admin information.
- **Address**: Stores user addresses.

### Catalog App
- **Category**: Product categories (includes hierarchical self-referencing parent, active status, image, and sort ordering).
- **Product**: Marketplace product listings with pricing, status, and approval tracking.

## Pending Models (Not Yet Implemented)
- ProductVariants
- Inventory
- Orders & OrderItems
- Carts & Wishlists
- Reviews & Ratings
- Payments
- Shipping & Tracking
- Returns & Refunds
- Coupons

## Demo Data Seed
Synthetic demo data can be populated to mirror this schema using the `seed_demo_data` command (see `DEMO_DATA.md`). It correctly builds the hierarchy of Users -> Profiles -> Products without creating orphaned records.
