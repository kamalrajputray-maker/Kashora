# Changelog

## [Unreleased]
### Added
- **Demo Data Seeding**: 
  - Added `seed_demo_data` command to generate synthetic test data (100 products, 25 categories, 35 buyers, 10 sellers).
  - Added `reset_demo_data` command to safely delete demo data identified by `@demo.local` emails.
  - Added `DEMO_DATA.md` with credentials for testing.
- **Documentation**: Initialized `DATABASE.md`, `PROJECT_STATUS.md`, and `HANDOVER.md`.

### Fixed
- **Authentication**: Resolved CORS issue preventing login from frontend to backend by properly configuring `django-cors-headers` and fixing React API base URL resolution.
