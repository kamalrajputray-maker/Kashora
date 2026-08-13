# Demo Data 

**DEVELOPMENT ONLY. DO NOT USE IN PRODUCTION.**

This project includes synthetic demo data generation commands to populate the local database with realistic marketplace listings, sellers, and buyers.

## Commands

**Seed Data**
```bash
python manage.py seed_demo_data
```
This idempotent command generates:
- 1 Super Admin
- 5 Admins
- 10 Sellers (with Store Profiles)
- 35 Buyers (with Addresses)
- 25 Categories
- 100 Products

**Reset Data**
```bash
python manage.py reset_demo_data
```
Safely removes all demo data (identified via `@demo.local` emails) without touching migrations, database structure, or legitimate production data.

## Demo Credentials

All demo users share the same password: `Demo@12345`

### Super Admin
- **Phone:** `9000000001`
- **Email:** `superadmin@demo.local`

### Admins
- **Catalog Admin:** `9000000011` (`catalog.admin@demo.local`)
- **Seller Admin:** `9000000012` (`seller.admin@demo.local`)
- **Support Admin:** `9000000013` (`support.admin@demo.local`)

### Sellers
Sellers are automatically generated. The first three are:
- **Seller 1:** `9000000101` (`seller1@demo.local`)
- **Seller 2:** `9000000102` (`seller2@demo.local`)
- **Seller 3:** `9000000103` (`seller3@demo.local`)

### Buyers
Buyers are automatically generated. The first three are:
- **Buyer 1:** `9000000200` (`buyer1@demo.local`)
- **Buyer 2:** `9000000201` (`buyer2@demo.local`)
- **Buyer 3:** `9000000202` (`buyer3@demo.local`)

## Notes on Generation
- Currently, only the modules that are implemented as Django models are generated (Accounts, Roles, Profiles, Categories, Products).
- Orders, Variants, Inventory, Shipping, Payments, etc., will not be generated until those models are implemented.
