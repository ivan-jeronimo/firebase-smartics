# Firebase URL Shortener for Smartics

This project contains a set of Firebase Cloud Functions designed to create, manage, and redirect short URLs. It's built to be environment-aware, supporting distinct configurations for development, staging, and production.

## Features

- **Custom Product Links**: Create predictable short URLs for products using their SKU as a unique ID.
- **Generic Short Links**: Generate random, short IDs for general-purpose URL shortening.
- **Case-Insensitive IDs**: Product SKUs are automatically converted to lowercase to prevent duplicates and ensure URLs work consistently.
- **Environment-Aware Configuration**: Uses Firebase's `params` system to manage different settings (like domains and CORS origins) for each environment.
- **Scalable Structure**: Functions are separated by concern (`createProductLink`, `createLink`, `redirect`) for clarity and maintainability.

---

## Environment Setup

This project uses a parameterized configuration, which is managed through `.env` files in the `functions` directory. This allows you to define different settings for each of your Firebase projects (e.g., staging vs. production).

### 1. Required Parameters

The functions rely on the following environment parameters:

- `CORS_ALLOWED_ORIGINS`: A comma-separated string of URLs that are allowed to call the functions (e.g., `"https://my-app.com,http://localhost:3000"`).
- `APP_BASE_URL`: The base URL of the frontend application for the current environment. This is used as a fallback for failed redirects.

### 2. Create `.env` Files

In the `functions` directory, create `.env` files that match your Firebase Project IDs.

**Example Project IDs:**
- Production: `my-smartics-prod`
- Staging: `smarticsmapsstage`

**File for Production (`functions/.env.my-smartics-prod`):**
```env
# Configuration for PRODUCTION
CORS_ALLOWED_ORIGINS="https://smartics.com.mx"
APP_BASE_URL="https://smartics.com.mx"
```

**File for Staging (`functions/.env.smarticsmapsstage`):**
```env
# Configuration for STAGING
CORS_ALLOWED_ORIGINS="https://stage.smartics.com.mx,http://localhost:3300"
APP_BASE_URL="https://stage.smartics.com.mx"
```

**File for Local Development (`functions/.env`):**
```env
# Default configuration for local development
CORS_ALLOWED_ORIGINS="http://localhost:3300"
APP_BASE_URL="http://localhost:3300"
```

> **Important**: Add all `.env.*` files to your `.gitignore` to keep secrets out of version control.

---

## Deployment

To deploy your functions to a specific environment, use the `--project` flag with the Firebase CLI.

**Deploy to Staging:**
```sh
firebase deploy --only functions --project smarticsmapsstage
```

**Deploy to Production:**
```sh
firebase deploy --only functions --project my-smartics-prod
```

On the first deployment to a new project, the Firebase CLI will detect the parameters (`CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`) and prompt you to enter their values. These values are then stored securely in your Firebase project.

---

## API Endpoints

### 1. `createProductLink`

Creates a short link using a predefined ID (e.g., a product SKU).

- **Method**: `POST`
- **Endpoint**: `.../createProductLink`
- **Body (JSON)**:
  ```json
  {
    "targetUrl": "https://smartics.com.mx/products/my-awesome-product",
    "shortId": "MY-SKU-123"
  }
  ```
- **Success Response (201)**: The `shortId` is returned in lowercase.
  ```json
  {
    "shortId": "my-sku-123"
  }
  ```
- **Error Response (400)**: If `targetUrl` or `shortId` are missing.

### 2. `createLink`

Creates a generic short link with a randomly generated ID.

- **Method**: `POST`
- **Endpoint**: `.../createLink`
- **Body (JSON)**:
  ```json
  {
    "targetUrl": "https://some-other-site.com/category/offers"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "shortId": "a8x3h1"
  }
  ```
- **Error Response (400)**: If `targetUrl` is missing.

### 3. `redirect`

Redirects a short URL to its target destination.

- **Method**: `GET`
- **Endpoint**: `.../redirect/{shortId}` (Note: In Firebase Hosting, you will rewrite a clean path like `/r/{shortId}` to this function).
- **Success Response (302)**: Redirects the user to the `targetUrl`.
- **Error Response (404)**: If the `shortId` is not found, redirects the user to the `APP_BASE_URL` for the current environment.
