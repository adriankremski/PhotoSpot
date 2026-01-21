# REST API Plan - PhotoSpot

## 1. Overview

This REST API plan defines all endpoints for the PhotoSpot application, a platform for photographers and photography enthusiasts to discover and share scenic photo locations. The API is built on Astro 5 with Supabase backend (PostgreSQL + PostGIS + Auth + Storage).

**Base URL**: `/api`

**Authentication**: Supabase Auth (JWT tokens)

**Data Format**: JSON (except file uploads which use `multipart/form-data`)

---

## 2. Resources

| Resource           | Database Table(s)           | Description                              |
| ------------------ | --------------------------- | ---------------------------------------- |
| **Authentication** | `users` (via Supabase Auth) | User registration, login, password reset |
| **Profiles**       | `user_profiles`, `users`    | User profile information and settings    |
| **Photos**         | `photos`, `photo_tags`      | Photo uploads with metadata and location |
| **Favorites**      | `favorites`                 | User's favorite photos collection        |
| **Reports**        | `photo_reports`             | Content moderation reports               |
| **Tags**           | `tags`                      | Predefined photo tags                    |
| **Locations**      | `location_cache`            | Geocoding search with caching            |

---

## 3. Authentication Endpoints

### 3.1. Register User

**Endpoint**: Handled by Supabase Auth  
**Supabase Method**: `supabase.auth.signUp()`

**Request Payload**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "options": {
    "data": {
      "role": "photographer" // or "enthusiast"
    }
  }
}
```

**Success Response** (200 OK):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "role": "photographer"
    }
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 604800
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid email or weak password
- `409 Conflict`: Email already registered

**Validation**:

- Email: valid format
- Password: minimum 8 characters
- Role: must be "photographer" or "enthusiast"

---

### 3.2. Login

**Endpoint**: Handled by Supabase Auth  
**Supabase Method**: `supabase.auth.signInWithPassword()`

**Request Payload**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 604800
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Invalid credentials

---

### 3.3. Logout

**Endpoint**: Handled by Supabase Auth  
**Supabase Method**: `supabase.auth.signOut()`

**Success Response** (200 OK):

```json
{
  "message": "Logged out successfully"
}
```

---

### 3.4. Reset Password Request

**Endpoint**: Handled by Supabase Auth  
**Supabase Method**: `supabase.auth.resetPasswordForEmail()`

**Request Payload**:

```json
{
  "email": "user@example.com"
}
```

**Success Response** (200 OK):

```json
{
  "message": "Password reset email sent"
}
```

---

## 4. Profile Endpoints

### 4.1. Create User Profile

**Method**: `POST`  
**Path**: `/api/users/:userId/profile`  
**Auth**: Required (own profile only)

**Request Payload**:

```json
{
  "display_name": "John Doe",
  "avatar_url": "https://storage.supabase.co/...", // optional
  "bio": "Landscape photographer based in Colorado", // optional
  "company_name": "John Doe Photography", // optional, photographer only
  "website_url": "https://johndoe.com", // optional, photographer only
  "social_links": {
    // optional, photographer only
    "instagram": "https://instagram.com/johndoe",
    "facebook": "https://facebook.com/johndoe"
  }
}
```

**Success Response** (201 Created):

```json
{
  "message": "Profile created successfully",
  "profile": {
    "user_id": "uuid",
    "display_name": "John Doe",
    "avatar_url": "https://storage.supabase.co/...",
    "bio": "Landscape photographer based in Colorado",
    "role": "photographer",
    "company_name": "John Doe Photography",
    "website_url": "https://johndoe.com",
    "social_links": {
      "instagram": "https://instagram.com/johndoe",
      "facebook": "https://facebook.com/johndoe"
    },
    "photo_count": 0,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid data (e.g., missing required display_name, invalid URLs)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Attempting to create profile for another user, or enthusiast attempting to set photographer-only fields
- `409 Conflict`: Profile already exists for this user

**Validation**:

- `display_name`: required, 1-100 characters
- `avatar_url`: optional, valid URL format
- `bio`: optional, max 500 characters
- `company_name`: optional, photographer only, max 100 characters
- `website_url`: optional, photographer only, valid URL format
- `social_links.*`: optional, photographer only, valid URL formats

**Business Logic**:

- User can only create their own profile (userId must match authenticated user)
- Profile creation is idempotent check - if profile exists, return 409 Conflict
- Photographer-only fields (company_name, website_url, social_links) are validated against user role from auth.users
- Role is retrieved from auth.users.raw_user_meta_data and cannot be set via this endpoint
- created_at and updated_at timestamps are set automatically

---

### 4.2. Get User Profile

**Method**: `GET`  
**Path**: `/api/users/:userId/profile`  
**Auth**: Required (own profile) or Public (other users)

**Query Parameters**: None

**Success Response** (200 OK):

```json
{
  "user_id": "uuid",
  "display_name": "John Doe",
  "avatar_url": "https://storage.supabase.co/...",
  "bio": "Landscape photographer based in Colorado",
  "role": "photographer",
  "company_name": "John Doe Photography", // photographer only
  "website_url": "https://johndoe.com", // photographer only
  "social_links": {
    // photographer only
    "instagram": "https://instagram.com/johndoe",
    "facebook": "https://facebook.com/johndoe"
  },
  "photo_count": 24,
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses**:

- `404 Not Found`: User not found or deleted

**Business Logic**:

- For photographers: return all profile fields including contact info
- For enthusiasts: return only basic fields (display_name, avatar_url, bio)
- Exclude `deleted_at IS NOT NULL` users

---

### 4.3. Update User Profile

**Method**: `PATCH`  
**Path**: `/api/users/:userId/profile`  
**Auth**: Required (own profile only)

**Request Payload**:

```json
{
  "display_name": "John Doe",
  "avatar_url": "https://storage.supabase.co/...",
  "bio": "Landscape photographer",
  "company_name": "John Doe Photography", // photographer only
  "website_url": "https://johndoe.com", // photographer only
  "social_links": {
    "instagram": "https://instagram.com/johndoe"
  }
}
```

**Success Response** (200 OK):

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "user_id": "uuid",
    "display_name": "John Doe"
    // ... updated fields
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Attempting to update another user's profile
- `400 Bad Request`: Invalid data (e.g., missing required display_name)

**Validation**:

- `display_name`: required, max 100 characters
- `website_url`, `social_links.*`: valid URL format
- `bio`: max 500 characters

---

## 5. Photo Endpoints

### 5.1. Get Photos (Map View)

**Method**: `GET`  
**Path**: `/api/photos`  
**Auth**: Public

**Query Parameters**:

| Parameter           | Type    | Required | Description                                 |
| ------------------- | ------- | -------- | ------------------------------------------- |
| `bbox`              | string  | No       | Bounding box: `minLng,minLat,maxLng,maxLat` |
| `category`          | string  | No       | Filter by category enum                     |
| `season`            | string  | No       | Filter by season enum                       |
| `time_of_day`       | string  | No       | Filter by time_of_day enum                  |
| `photographer_only` | boolean | No       | Show only photographer uploads              |
| `limit`             | integer | No       | Max results (default: 200, max: 200)        |
| `offset`            | integer | No       | Pagination offset (default: 0)              |

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Mountain Sunrise",
      "description": "Beautiful sunrise over Rocky Mountains",
      "category": "landscape",
      "season": "summer",
      "time_of_day": "sunrise",
      "file_url": "https://storage.supabase.co/...",
      "thumbnail_url": "https://storage.supabase.co/.../thumb",
      "location_public": {
        "type": "Point",
        "coordinates": [-105.2705, 40.015]
      },
      "is_location_blurred": true,
      "user": {
        "id": "uuid",
        "display_name": "John Doe",
        "avatar_url": "https://...",
        "role": "photographer"
      },
      "tags": ["mountains", "sunrise", "landscape"],
      "created_at": "2025-12-15T06:30:00Z",
      "favorite_count": 12
    }
  ],
  "meta": {
    "total": 1547,
    "limit": 200,
    "offset": 0
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid bbox format or filter values

**Business Logic**:

- Only return photos with `status = 'approved'`
- Use `location_public` (never expose `location_exact`)
- Exclude EXIF data for public access
- Apply clustering hint if >50 photos in viewport
- Filter by `deleted_at IS NULL`

---

### 5.2. Get Single Photo

**Method**: `GET`  
**Path**: `/api/photos/:photoId`  
**Auth**: Public (approved photos) or Owner (any status)

**Success Response** (200 OK):

```json
{
  "id": "uuid",
  "title": "Mountain Sunrise",
  "description": "Beautiful sunrise over Rocky Mountains",
  "category": "landscape",
  "season": "summer",
  "time_of_day": "sunrise",
  "file_url": "https://storage.supabase.co/...",
  "thumbnail_url": "https://storage.supabase.co/.../thumb",
  "location_public": {
    "type": "Point",
    "coordinates": [-105.2705, 40.015]
  },
  "is_location_blurred": true,
  "gear": {
    "camera": "Canon EOS R5",
    "lens": "RF 24-70mm f/2.8"
  },
  "exif": {
    // only for photo owner
    "aperture": "f/8",
    "shutter_speed": "1/250",
    "iso": 100,
    "focal_length": "35mm"
  },
  "location_exact": {
    // only for photo owner
    "type": "Point",
    "coordinates": [-105.2805, 40.0175]
  },
  "user": {
    "id": "uuid",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "role": "photographer"
  },
  "tags": ["mountains", "sunrise", "landscape"],
  "status": "approved", // only for photo owner and moderators
  "created_at": "2025-12-15T06:30:00Z",
  "favorite_count": 12,
  "is_favorited": false // if user is authenticated
}
```

**Error Responses**:

- `404 Not Found`: Photo not found or deleted
- `403 Forbidden`: Photo pending approval (not owner)

**Business Logic**:

- Public users: only see approved photos, no EXIF, no `location_exact`
- Photo owner: see all data including EXIF and exact location
- Moderators: see all data including status

---

### 5.3. Create Photo

**Method**: `POST`  
**Path**: `/api/photos`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Request Payload**:

```
file: (binary) // JPG or PNG, max 10MB
title: "Mountain Sunrise"
description: "Beautiful sunrise over Rocky Mountains" // optional
category: "landscape"
season: "summer" // optional
time_of_day: "sunrise" // optional
latitude: 40.0175
longitude: -105.2805
blur_location: true // optional, default false
blur_radius: 300 // optional, 100-500m, default 200
tags: ["mountains", "sunrise"] // optional, array of tag names
gear: {
  "camera": "Canon EOS R5",
  "lens": "RF 24-70mm f/2.8"
} // optional, JSON string
```

**Success Response** (201 Created):

```json
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": "uuid",
    "title": "Mountain Sunrise",
    "status": "pending",
    "file_url": "https://storage.supabase.co/...",
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `400 Bad Request`: Invalid file format, missing required fields
- `413 Payload Too Large`: File exceeds 10MB
- `429 Too Many Requests`: Exceeded 5 photos per 24 hours limit
- `422 Unprocessable Entity`: Invalid coordinates or EXIF data

**Validation**:

- File format: JPG or PNG only
- File size: ≤ 10,485,760 bytes (10 MB)
- Title: required, max 200 characters
- Category: required, must be valid enum value
- Latitude: -90 to 90
- Longitude: -180 to 180
- Blur radius: 100-500 if blur_location is true
- Tags: max 10 tags per photo

**Business Logic**:

1. Check daily upload limit (5 photos per 24h) - enforced by DB trigger
2. Upload file to Supabase Storage
3. Extract EXIF data if present
4. If `blur_location = true`, generate random offset within blur_radius
5. Set `status = 'pending'` (requires moderation)
6. Create photo record with both `location_exact` and `location_public`
7. Link tags if provided

---

### 5.4. Update Photo

**Method**: `PATCH`  
**Path**: `/api/photos/:photoId`  
**Auth**: Required (owner only)

**Request Payload**:

```json
{
  "title": "Mountain Sunrise - Updated",
  "description": "Updated description",
  "category": "landscape",
  "season": "summer",
  "time_of_day": "sunrise",
  "tags": ["mountains", "sunrise", "colorado"],
  "gear": {
    "camera": "Canon EOS R5"
  }
}
```

**Success Response** (200 OK):

```json
{
  "message": "Photo updated successfully",
  "photo": {
    "id": "uuid",
    "title": "Mountain Sunrise - Updated"
    // ... updated fields
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the photo owner
- `404 Not Found`: Photo not found
- `400 Bad Request`: Invalid data

**Business Logic**:

- Cannot update `file_url`, `location_exact`, `location_public` after creation
- Tags are replaced (not appended)
- If moderated and approved, changing content resets `status = 'pending'`

---

### 5.5. Delete Photo

**Method**: `DELETE`  
**Path**: `/api/photos/:photoId`  
**Auth**: Required (owner or moderator)

**Success Response** (200 OK):

```json
{
  "message": "Photo deleted successfully"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the photo owner or moderator
- `404 Not Found`: Photo not found

**Business Logic**:

- Soft delete: set `deleted_at = NOW()`
- Cascade soft-delete via trigger to related records
- Delete file from Supabase Storage

---

### 5.6. Get User's Photos

**Method**: `GET`  
**Path**: `/api/users/:userId/photos`  
**Auth**: Public (approved only) or Owner (all statuses)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (owner/moderator only) |
| `limit` | integer | No | Max results (default: 20, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Mountain Sunrise",
      "thumbnail_url": "https://...",
      "category": "landscape",
      "status": "approved", // if owner/moderator
      "created_at": "2025-12-15T06:30:00Z",
      "favorite_count": 12
    }
  ],
  "meta": {
    "total": 24,
    "limit": 20,
    "offset": 0
  }
}
```

**Business Logic**:

- Public: only approved photos
- Owner: all their photos with status visible
- Order by `created_at DESC`

---

### 5.7. Moderate Photo (Admin/Moderator Only)

**Method**: `PATCH`  
**Path**: `/api/photos/:photoId/status`  
**Auth**: Required (moderator role)

**Request Payload**:

```json
{
  "status": "approved", // or "rejected"
  "reason": "Does not meet quality standards" // optional, for rejection
}
```

**Success Response** (200 OK):

```json
{
  "message": "Photo status updated",
  "photo": {
    "id": "uuid",
    "status": "approved"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a moderator
- `404 Not Found`: Photo not found
- `400 Bad Request`: Invalid status value

---

## 6. Favorites Endpoints

### 6.1. Get User's Favorites

**Method**: `GET`  
**Path**: `/api/users/:userId/favorites`  
**Auth**: Required (own favorites only)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Max results (default: 20, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "photo_id": "uuid",
      "photo": {
        "id": "uuid",
        "title": "Mountain Sunrise",
        "thumbnail_url": "https://...",
        "user": {
          "id": "uuid",
          "display_name": "John Doe"
        }
      },
      "favorited_at": "2025-12-10T15:30:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Accessing another user's favorites

---

### 6.2. Add to Favorites

**Method**: `POST`  
**Path**: `/api/users/:userId/favorites/:photoId`  
**Auth**: Required (own favorites only)

**Success Response** (201 Created):

```json
{
  "message": "Photo added to favorites",
  "favorite": {
    "user_id": "uuid",
    "photo_id": "uuid",
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Adding to another user's favorites
- `404 Not Found`: Photo not found
- `409 Conflict`: Photo already in favorites

---

### 6.3. Remove from Favorites

**Method**: `DELETE`  
**Path**: `/api/users/:userId/favorites/:photoId`  
**Auth**: Required (own favorites only)

**Success Response** (200 OK):

```json
{
  "message": "Photo removed from favorites"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Removing from another user's favorites
- `404 Not Found`: Favorite not found

---

## 7. Report Endpoints

### 7.1. Create Report

**Method**: `POST`  
**Path**: `/api/reports`  
**Auth**: Required

**Request Payload**:

```json
{
  "photo_id": "uuid",
  "reason": "inappropriate_content", // enum: spam, privacy, wrong_location, inappropriate_content, other
  "comment": "This photo contains inappropriate content" // optional
}
```

**Success Response** (201 Created):

```json
{
  "message": "Report submitted successfully",
  "report": {
    "id": "uuid",
    "photo_id": "uuid",
    "reason": "inappropriate_content",
    "status": "open",
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Photo not found
- `400 Bad Request`: Invalid reason or missing photo_id
- `409 Conflict`: User already reported this photo

**Validation**:

- `photo_id`: required, must exist
- `reason`: required, must be valid enum
- `comment`: max 500 characters

---

### 7.2. Get Reports (Moderator Only)

**Method**: `GET`  
**Path**: `/api/reports`  
**Auth**: Required (moderator role)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: open, resolved, dismissed |
| `photo_id` | uuid | No | Filter by specific photo |
| `limit` | integer | No | Max results (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "photo": {
        "id": "uuid",
        "title": "Mountain Sunrise",
        "thumbnail_url": "https://..."
      },
      "reporter": {
        "id": "uuid",
        "display_name": "Jane Smith"
      },
      "reason": "inappropriate_content",
      "comment": "This photo contains...",
      "status": "open",
      "created_at": "2025-12-16T10:30:00Z",
      "resolved_at": null
    }
  ],
  "meta": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a moderator

---

### 7.3. Update Report Status (Moderator Only)

**Method**: `PATCH`  
**Path**: `/api/reports/:reportId`  
**Auth**: Required (moderator role)

**Request Payload**:

```json
{
  "status": "resolved", // or "dismissed"
  "moderator_note": "Removed photo from platform" // optional
}
```

**Success Response** (200 OK):

```json
{
  "message": "Report updated successfully",
  "report": {
    "id": "uuid",
    "status": "resolved",
    "resolved_at": "2025-12-16T11:00:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a moderator
- `404 Not Found`: Report not found
- `400 Bad Request`: Invalid status

---

## 8. Tag Endpoints

### 8.1. Get All Tags

**Method**: `GET`  
**Path**: `/api/tags`  
**Auth**: Public

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "id": 1,
      "name": "landscape",
      "usage_count": 1247
    },
    {
      "id": 2,
      "name": "portrait",
      "usage_count": 892
    }
  ]
}
```

**Business Logic**:

- Return all tags ordered by usage_count DESC
- Include photo count for each tag

---

## 9. Location Endpoints

### 9.1. Search Locations (Geocoding)

**Method**: `GET`  
**Path**: `/api/locations/search`  
**Auth**: Public

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Location query (e.g., "Boulder, Colorado") |
| `limit` | integer | No | Max results (default: 5, max: 10) |

**Success Response** (200 OK):

```json
{
  "data": [
    {
      "query": "boulder colorado",
      "display_name": "Boulder, Colorado, United States",
      "lat": 40.015,
      "lon": -105.2705,
      "bbox": [-105.2915, 40.001, -105.2495, 40.029],
      "place_type": "city"
    }
  ],
  "meta": {
    "cached": true
  }
}
```

**Error Responses**:

- `400 Bad Request`: Missing or invalid query parameter
- `503 Service Unavailable`: Geocoding service unavailable

**Business Logic**:

1. Normalize query (lowercase, trim)
2. Check `location_cache` table
3. If cached and `updated_at` < 30 days: return cached result
4. Otherwise: call Mapbox Geocoding API
5. Store result in `location_cache`
6. Return result

---

## 10. Authentication and Authorization

### 10.1. Authentication Mechanism

PhotoSpot uses **Supabase Auth** for authentication:

1. **Registration/Login**: Users authenticate via Supabase Auth endpoints
2. **Session Management**: JWT tokens with 7-day expiration (604,800 seconds)
3. **Token Refresh**: Handled automatically by Supabase client
4. **Token Verification**: All protected endpoints verify JWT via Supabase middleware

### 10.2. Authorization Headers

All authenticated requests must include:

```
Authorization: Bearer <access_token>
```

### 10.3. User Roles

Two roles defined in `user_metadata.role`:

- `photographer`: Can upload photos, has extended profile
- `enthusiast`: Can favorite photos, basic profile

### 10.4. Permission Matrix

| Endpoint                 | Anon | User  | Photographer | Moderator |
| ------------------------ | ---- | ----- | ------------ | --------- |
| GET /photos              | ✓    | ✓     | ✓            | ✓         |
| POST /photos             | ✗    | ✗     | ✓            | ✓         |
| PATCH /photos/:id        | ✗    | Owner | Owner        | ✓         |
| DELETE /photos/:id       | ✗    | Owner | Owner        | ✓         |
| POST /favorites          | ✗    | ✓     | ✓            | ✓         |
| POST /reports            | ✗    | ✓     | ✓            | ✓         |
| GET /reports             | ✗    | ✗     | ✗            | ✓         |
| PATCH /reports/:id       | ✗    | ✗     | ✗            | ✓         |
| PATCH /photos/:id/status | ✗    | ✗     | ✗            | ✓         |

### 10.5. Row Level Security (RLS)

Supabase RLS policies enforce data access:

1. **Photos**:
   - SELECT: Everyone can see `status='approved'` photos; owners see their own (any status)
   - INSERT: Authenticated users only; trigger enforces 5/day limit
   - UPDATE: Owner or moderator
   - DELETE: Owner or moderator

2. **User Profiles**:
   - SELECT: Public (all profiles)
   - UPDATE: Own profile only

3. **Favorites**:
   - SELECT: Own favorites only
   - INSERT/DELETE: Own favorites only

4. **Reports**:
   - SELECT: Reporter sees own; moderator sees all
   - INSERT: Any authenticated user
   - UPDATE: Moderator only

---

## 11. Validation and Business Logic

### 11.1. Photo Validation

| Field         | Validation Rules                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `file`        | JPG/PNG only, ≤10MB, valid image format                                                                    |
| `title`       | Required, 1-200 characters                                                                                 |
| `description` | Optional, max 1000 characters                                                                              |
| `category`    | Required, valid enum: `landscape`, `portrait`, `wildlife`, `urban`, `architecture`, `nature`, `other`      |
| `season`      | Optional, enum: `spring`, `summer`, `autumn`, `winter`                                                     |
| `time_of_day` | Optional, enum: `sunrise`, `morning`, `midday`, `afternoon`, `sunset`, `night`, `blue_hour`, `golden_hour` |
| `latitude`    | Required, -90 to 90                                                                                        |
| `longitude`   | Required, -180 to 180                                                                                      |
| `blur_radius` | Optional, 100-500 (meters)                                                                                 |
| `tags`        | Optional, max 10 tags, each max 30 characters                                                              |
| `gear`        | Optional, valid JSON object                                                                                |

### 11.2. Profile Validation

| Field          | Validation Rules                                         |
| -------------- | -------------------------------------------------------- |
| `display_name` | Required, 1-100 characters                               |
| `avatar_url`   | Optional, valid URL                                      |
| `bio`          | Optional, max 500 characters                             |
| `company_name` | Optional, max 100 characters (photographer only)         |
| `website_url`  | Optional, valid URL (photographer only)                  |
| `social_links` | Optional, valid JSON with URL values (photographer only) |

### 11.3. Report Validation

| Field      | Validation Rules                                                                      |
| ---------- | ------------------------------------------------------------------------------------- |
| `photo_id` | Required, must exist and not be deleted                                               |
| `reason`   | Required, enum: `spam`, `privacy`, `wrong_location`, `inappropriate_content`, `other` |
| `comment`  | Optional, max 500 characters                                                          |

### 11.4. Business Logic Rules

#### Photo Upload Limit

- **Rule**: Max 5 photos per 24 hours per user
- **Implementation**: Database trigger `before_insert_photos_limit()`
- **Response**: 429 Too Many Requests if exceeded

#### Location Blurring

- **Rule**: If `blur_location=true`, offset exact location by 100-500m
- **Implementation**:
  1. Store original in `location_exact`
  2. Generate random offset within `blur_radius`
  3. Store blurred in `location_public`
  4. Set `is_location_blurred=true`
- **Privacy**: Never expose `location_exact` to non-owners

#### Photo Moderation

- **Rule**: New photos start as `status='pending'`
- **Workflow**:
  1. User uploads → `pending`
  2. Moderator reviews → `approved` or `rejected`
  3. Only `approved` photos visible to public
  4. Owner sees their photos in any status

#### Viewport Photo Loading

- **Rule**: Return max 200 photos within bounding box
- **Implementation**:
  1. Use PostGIS query with bbox filter
  2. Limit to 200 results
  3. Order by distance from viewport center
  4. Return cluster_id for client-side clustering when >50 points

#### Location Cache

- **Rule**: Cache geocoding results for 30 days
- **Implementation**:
  1. Check `location_cache` by normalized query
  2. If found and `updated_at` < 30 days: return cached
  3. Else: call Mapbox, store result, update `updated_at`
  4. Background job prunes records older than 30 days

#### Favorites

- **Rule**: User can favorite each photo only once
- **Implementation**: UNIQUE constraint on `(user_id, photo_id)`
- **Response**: 409 Conflict if duplicate

#### Soft Deletion

- **Rule**: All deletes are soft (set `deleted_at`)
- **Implementation**:
  1. UPDATE record SET `deleted_at = NOW()`
  2. Trigger cascades to related records
  3. All queries filter `deleted_at IS NULL`
  4. Background job hard-deletes after 90 days (GDPR compliance)

---

## 12. Error Handling

### 12.1. Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be between 1-200 characters",
    "details": {
      "field": "title",
      "constraint": "length"
    }
  }
}
```

### 12.2. Common Error Codes

| HTTP Status | Error Code             | Description                         |
| ----------- | ---------------------- | ----------------------------------- |
| 400         | `VALIDATION_ERROR`     | Request validation failed           |
| 401         | `UNAUTHORIZED`         | Authentication required             |
| 403         | `FORBIDDEN`            | Insufficient permissions            |
| 404         | `NOT_FOUND`            | Resource not found                  |
| 409         | `CONFLICT`             | Resource conflict (e.g., duplicate) |
| 413         | `PAYLOAD_TOO_LARGE`    | File size exceeds limit             |
| 422         | `UNPROCESSABLE_ENTITY` | Semantic error in request           |
| 429         | `RATE_LIMIT_EXCEEDED`  | Too many requests                   |
| 500         | `INTERNAL_ERROR`       | Server error                        |
| 503         | `SERVICE_UNAVAILABLE`  | External service unavailable        |

---

## 13. Rate Limiting

### 13.1. Rate Limits

| Endpoint Pattern          | Limit        | Window   |
| ------------------------- | ------------ | -------- |
| POST /api/photos          | 5 requests   | 24 hours |
| POST /api/reports         | 10 requests  | 1 hour   |
| GET /api/photos           | 200 requests | 1 minute |
| GET /api/locations/search | 60 requests  | 1 minute |
| All other endpoints       | 100 requests | 1 minute |

### 13.2. Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702742400
```

### 13.3. Rate Limit Exceeded Response

**Status**: 429 Too Many Requests

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the photo upload limit of 5 per 24 hours",
    "retry_after": 43200
  }
}
```

---

## 14. Pagination

### 14.1. Query Parameters

All list endpoints support:

- `limit`: Number of results (default varies by endpoint)
- `offset`: Number of results to skip (default: 0)

### 14.2. Response Meta

```json
{
  "data": [...],
  "meta": {
    "total": 1547,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```

---

## 15. Filtering and Sorting

### 15.1. Photo Filters

Available on GET `/api/photos`:

- `bbox`: Geographic bounding box
- `category`: Photo category
- `season`: Season
- `time_of_day`: Time of day
- `photographer_only`: Boolean filter
- `tag`: Filter by tag name

### 15.2. Sorting

Default sorting:

- Photos: `created_at DESC`
- Reports: `created_at DESC` (open first)
- Favorites: `created_at DESC`
- User photos: `created_at DESC`

---

## 16. Performance Considerations

### 16.1. Caching Strategy

1. **Location Cache**: 30-day TTL for geocoding results
2. **Photo Thumbnails**: Generated on upload, CDN cached
3. **Photo Clusters**: Pre-computed `cluster_id` for map clustering
4. **Public Photo View**: Materialized view excludes EXIF and exact location

### 16.2. Indexing Strategy

Key indexes supporting API queries:

- `photos.location_public` (GIST) with partial index on `status='approved'`
- `photos.(category, season, time_of_day)` (BTREE)
- `photos.cluster_id` (BTREE)
- `photo_tags.tag_id` (BTREE)
- `favorites.user_id` (BTREE)
- `photo_reports.status` (BTREE)

### 16.3. Query Optimization

1. **Viewport queries**: Use PostGIS spatial index with bbox
2. **Photo listing**: Limit to 200 results max
3. **User favorites**: Paginated with efficient join
4. **Report listing**: Index on status for moderator queries

---

## 17. File Upload Workflow

### 17.1. Photo Upload Process

1. **Client**: Submit multipart/form-data to POST `/api/photos`
2. **API**:
   - Validate file type and size
   - Check daily upload limit
   - Upload to Supabase Storage (`photos/{user_id}/{uuid}.jpg`)
   - Extract EXIF data
   - Generate thumbnail
   - Process location (blur if requested)
   - Create database record
   - Link tags
3. **Response**: Return photo metadata with status `pending`

### 17.2. Supabase Storage Structure

```
photos/
  {user_id}/
    {photo_id}.jpg          # Original
    {photo_id}_thumb.jpg    # Thumbnail (400px wide)
```

### 17.3. File Processing

- **Thumbnail Generation**: 400px width, maintain aspect ratio
- **EXIF Extraction**: Camera, lens, settings (aperture, shutter, ISO, focal length)
- **Location from EXIF**: Extract GPS coordinates if available

---

## 18. Security Measures

### 18.1. Input Sanitization

- All text inputs sanitized to prevent XSS
- File uploads validated for type and size
- SQL injection prevented via parameterized queries
- URL validation for external links

### 18.2. Data Privacy

- **Location Privacy**: Never expose `location_exact` to non-owners
- **EXIF Privacy**: Strip EXIF before serving to public
- **Email Privacy**: Never expose user emails (only display_name)
- **Soft Deletes**: Maintain deleted_at for GDPR compliance

### 18.3. Content Security

- **Moderation**: All new photos require approval
- **Reporting**: Users can report inappropriate content
- **Rate Limiting**: Prevent abuse and spam

### 18.4. Authentication Security

- **JWT Tokens**: 7-day expiration
- **Password Requirements**: Minimum 8 characters
- **Session Management**: Secure token storage, automatic refresh

---

## 19. Monitoring and Logging

### 19.1. Metrics to Track

- API response times (p50, p90, p99)
- Error rates by endpoint
- Photo upload success rate
- Daily active users
- Photos per day
- Reports per day
- Storage usage

### 19.2. Error Tracking

- Sentry integration for error monitoring
- Log all 5xx errors
- Alert on high error rates

### 19.3. Audit Logging

Track in `audit_log` table:

- Photo uploads
- Photo deletions
- Moderation actions
- Report submissions

---

## 20. Future Considerations

### 20.1. Potential Endpoints (Post-MVP)

- `GET /api/photos/:id/similar` - Find similar photos
- `POST /api/collections` - Create photo collections
- `GET /api/stats/user/:userId` - User statistics
- `POST /api/photos/:id/comments` - Photo comments
- `GET /api/feed` - Personalized photo feed
- `POST /api/users/:userId/follow` - Follow photographers

### 20.2. API Versioning

- Current version: v1 (implicit in `/api` base path)
- Future versions: `/api/v2` when breaking changes needed

### 20.3. WebSocket Support

Consider WebSocket for:

- Real-time photo approvals
- Live map updates
- Notification system

---

## Appendix A: Enum Values

### Photo Category

`landscape`, `portrait`, `wildlife`, `urban`, `architecture`, `nature`, `other`

### Season

`spring`, `summer`, `autumn`, `winter`

### Time of Day

`sunrise`, `morning`, `midday`, `afternoon`, `sunset`, `night`, `blue_hour`, `golden_hour`

### User Role

`photographer`, `enthusiast`

### Photo Status

`pending`, `approved`, `rejected`

### Report Reason

`spam`, `privacy`, `wrong_location`, `inappropriate_content`, `other`

### Report Status

`open`, `resolved`, `dismissed`
