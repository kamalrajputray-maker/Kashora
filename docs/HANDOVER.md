# Handover Document

## Overview
This is a Meesho-like marketplace application using Django for the backend and React for the frontend. The system currently supports user authentication across four roles (SUPER_ADMIN, ADMIN, SELLER, BUYER), seller profile creation, and basic product catalog management.

## State of Development
- **Implemented**: Core authentication, User Roles/Profiles, Product & Category definitions, basic Seller and Admin dashboards.
- **Demo Data**: A robust, idempotent script (`python manage.py seed_demo_data`) is available to populate the system with realistic synthetic data for testing. See `docs/DEMO_DATA.md` for test credentials.
- **Not Implemented**: Orders, Inventory, Carts, Reviews, Payments, Shipping, Returns.

## Common Operations
- **Start Backend**: `python manage.py runserver`
- **Start Frontend**: `npm start` (inside `/frontend`)
- **Reset Demo Data**: `python manage.py reset_demo_data`
- **Run Tests**: `python manage.py test`

## Known Limitations
- Image uploading for products is currently not mocked with actual local file assets in the demo data script, but the fields are available.
- Inventory is unmanaged since the module isn't implemented.
