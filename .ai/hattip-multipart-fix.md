# @hattip/multipart Import Error Fix

## Problem

When visiting `/map`, the application threw an error:

```
[vite] The requested module '@hattip/multipart' does not provide an export named 'parse'
```

## Root Cause

The code in `src/lib/utils/multipart.ts` was trying to import a non-existent export:

```typescript
import { parse as parseMultipart } from "@hattip/multipart"; // ❌ Wrong
```

The `@hattip/multipart` package (v0.0.49) doesn't export `parse`. Instead, it exports:

- `parseMultipart` - Low-level multipart parser
- `parseMultipartFormData` - Form data parser (what we need)

## Solution

### 1. Fixed Import Statement

**Before:**

```typescript
import { parse as parseMultipart } from "@hattip/multipart";
```

**After:**

```typescript
import { parseMultipartFormData } from "@hattip/multipart";
```

### 2. Updated API Usage

The `parseMultipartFormData` function requires a `handleFile` callback:

**Before:**

```typescript
const formData = await parseMultipart(request);
```

**After:**

```typescript
const formData = await parseMultipartFormData(request, {
  handleFile: async (fileInfo) => {
    // Collect file stream into buffer
    const chunks: Uint8Array[] = [];
    const reader = fileInfo.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Return a File-like object
    return new File([buffer], fileInfo.filename, { type: fileInfo.contentType });
  },
});
```

### 3. Renamed Local Function

To avoid naming conflicts, renamed our wrapper function:

**Before:**

```typescript
export async function parseMultipartFormData(request: Request);
```

**After:**

```typescript
export async function parseMultipartRequest(request: Request);
```

### 4. Updated Imports in API

**File:** `src/pages/api/photos/index.ts`

**Before:**

```typescript
import { parseMultipartFormData } from "../../../lib/utils/multipart";
const data = await parseMultipartFormData(request);
```

**After:**

```typescript
import { parseMultipartRequest } from "../../../lib/utils/multipart";
const data = await parseMultipartRequest(request);
```

## Files Changed

1. `src/lib/utils/multipart.ts` - Fixed import and updated implementation
2. `src/pages/api/photos/index.ts` - Updated function name

## Verification

✅ **Build Status:** Success  
✅ **Linter Status:** 0 errors  
✅ **Dev Server:** Starts without errors  
✅ **Map Route:** Loads successfully

## Testing

```bash
# Build test
npm run build
# ✅ Success

# Dev server test
npm run dev
# ✅ Server starts on port 3000 or 3001
# ✅ Navigate to /map - loads without errors
```

## API Documentation

### @hattip/multipart Exports

From `@hattip/multipart@0.0.49`:

```typescript
export {
  parseMultipart, // Low-level parser
  parseMultipartFormData, // Form data parser (used)
  MultipartFormData, // FormData-like class
  type FileHandler,
  type FileInfo,
  type FormDataParserOptions,
  type MultipartParserOptions,
  type MultipartPart,
};
```

### Our Implementation

```typescript
// src/lib/utils/multipart.ts
export async function parseMultipartRequest(request: Request): Promise<ParsedFormData>;
```

**Usage:**

```typescript
import { parseMultipartRequest } from "@/lib/utils/multipart";

const formData = await parseMultipartRequest(request);
// Returns: { file, title, description, category, ... }
```

## Related Issues

- Package: `@hattip/multipart@0.0.49`
- Issue: Incorrect import statement
- Impact: Blocked map view from loading
- Resolution: Fixed import and updated API usage

## Prevention

To prevent similar issues in the future:

1. **Check Package Exports:**

   ```bash
   cat node_modules/@package/package.json | grep exports
   cat node_modules/@package/dist/*.d.ts | head -50
   ```

2. **Verify Imports:**
   - Check TypeScript definitions
   - Review package documentation
   - Test imports before using

3. **Type Safety:**
   - TypeScript will catch these errors during development
   - Run `npm run build` regularly
   - Enable strict mode in tsconfig.json

---

**Status:** ✅ Fixed and Verified  
**Date:** December 29, 2025  
**Impact:** Critical (blocked map view)  
**Resolution Time:** ~5 minutes
