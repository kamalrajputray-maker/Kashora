# Kashora Developer Guide

Welcome to the Kashora platform repository! This document outlines the architecture, tech stack, setup instructions, and development workflows.

## Tech Stack
### Backend
- **Framework**: Django & Django REST Framework (DRF)
- **Language**: Python 3.x
- **Database**: SQLite3 (Development)
- **Key Libraries**: `django-cors-headers`, `djangorestframework-simplejwt`

### Frontend
- **Framework**: React.js with Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS with CSS Variables (Custom Design System)
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Architecture Overview
Kashora is an eCommerce marketplace inspired by Meesho/Amazon. It features a multi-role system:
1. **Buyer**: Public consumers who browse products, add to cart, and place orders.
2. **Seller**: Vendors who upload products, manage inventory, and fulfill orders.
3. **Admin**: Platform moderators who approve/reject seller profiles, approve products, and manage site settings (e.g., categories, banners).
4. **Super Admin**: Highest level access, views full platform analytics and manages other admins.

### Directory Structure
- `apps/`: Contains all Django apps (`accounts`, `catalog`, `orders`, `dashboard`).
- `config/`: Django project configuration (`settings.py`, `urls.py`).
- `frontend/`: The complete React frontend application.
  - `src/components/`: Reusable UI components and Layouts.
  - `src/pages/`: Page views separated by role (`admin/`, `buyer/`, `seller/`).
  - `src/services/`: API integration and HTTP clients (`api.ts`).

## Local Development Setup

### 1. Backend Setup
```bash
# Navigate to project root
cd Kashora

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd Kashora/frontend

# Install dependencies
npm install

# Start the development server
npm start
# or npm run dev
```

## Important Development Notes
- **API Base URL**: The frontend is configured to communicate with the backend at `http://127.0.0.1:8000/api/v1/`.
- **Media Files**: User-uploaded images (banners, logos, product images) are stored in the `/media/` folder and served by Django during development.
- **Global Settings**: Site settings (like the promo banner and logos) are stored in the `SiteSettings` singleton model. It uses `pk=1` to ensure only one global configuration exists.
- **Authentication**: JWT is used for all secured endpoints. Tokens are stored in `localStorage`.

## Common Commands
- **Create Superuser**: `python manage.py createsuperuser`
- **Seed Categories**: `python seed_categories.py`
