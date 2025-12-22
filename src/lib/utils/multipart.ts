/**
 * Multipart form data parser utilities
 * 
 * Provides functions for parsing multipart/form-data requests
 * used for file uploads with metadata.
 */

import { parse as parseMultipart } from '@hattip/multipart';
import { fileTypeFromBuffer } from 'file-type';
import type { GearInfo } from '../../types';

/**
 * Parsed file data from multipart form
 */
export interface ParsedFile {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

/**
 * Parsed form data structure
 */
export interface ParsedFormData {
  file: ParsedFile;
  title: string;
  description?: string;
  category: string;
  season?: string;
  time_of_day?: string;
  latitude: number;
  longitude: number;
  blur_location?: boolean;
  blur_radius?: number;
  tags?: string[];
  gear?: GearInfo;
}

/**
 * Error class for multipart parsing errors
 */
export class MultipartParseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'MultipartParseError';
  }
}

/**
 * Parses multipart/form-data request with file upload
 * 
 * Extracts and validates:
 * - File binary data with size and type checks
 * - Form fields with appropriate type conversions
 * - Magic bytes validation for security
 * 
 * @param request - The incoming HTTP request
 * @returns Promise resolving to ParsedFormData
 * @throws MultipartParseError for parsing and validation errors
 */
export async function parseMultipartFormData(request: Request): Promise<ParsedFormData> {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new MultipartParseError(
        'Content-Type must be multipart/form-data',
        'INVALID_CONTENT_TYPE',
        400
      );
    }

    // Parse multipart form data
    const formData = await parseMultipart(request);
    
    // Extract file
    const fileField = formData.get('file');
    if (!fileField) {
      throw new MultipartParseError(
        'File is required',
        'FILE_REQUIRED',
        400
      );
    }

    // Check if field is a file
    if (!(fileField instanceof File)) {
      throw new MultipartParseError(
        'Invalid file field',
        'INVALID_FILE_FIELD',
        400
      );
    }

    const file = fileField as File;
    
    // Convert file to buffer for validation and storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size
    if (buffer.length === 0) {
      throw new MultipartParseError(
        'File is empty',
        'EMPTY_FILE',
        400
      );
    }

    // Magic bytes validation for security
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType) {
      throw new MultipartParseError(
        'Could not detect file type',
        'INVALID_FILE_TYPE',
        400
      );
    }

    // Validate detected MIME type against allowed types
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(detectedType.mime)) {
      throw new MultipartParseError(
        `File type ${detectedType.mime} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        400
      );
    }

    // Create parsed file object with detected type
    const parsedFile: ParsedFile = {
      name: file.name,
      type: detectedType.mime,
      size: buffer.length,
      buffer,
    };

    // Extract and parse form fields
    const title = formData.get('title');
    if (!title || typeof title !== 'string') {
      throw new MultipartParseError(
        'Title is required',
        'TITLE_REQUIRED',
        400
      );
    }

    const category = formData.get('category');
    if (!category || typeof category !== 'string') {
      throw new MultipartParseError(
        'Category is required',
        'CATEGORY_REQUIRED',
        400
      );
    }

    const latitudeStr = formData.get('latitude');
    if (!latitudeStr || typeof latitudeStr !== 'string') {
      throw new MultipartParseError(
        'Latitude is required',
        'LATITUDE_REQUIRED',
        400
      );
    }
    const latitude = parseFloat(latitudeStr);
    if (isNaN(latitude)) {
      throw new MultipartParseError(
        'Latitude must be a valid number',
        'INVALID_LATITUDE',
        400
      );
    }

    const longitudeStr = formData.get('longitude');
    if (!longitudeStr || typeof longitudeStr !== 'string') {
      throw new MultipartParseError(
        'Longitude is required',
        'LONGITUDE_REQUIRED',
        400
      );
    }
    const longitude = parseFloat(longitudeStr);
    if (isNaN(longitude)) {
      throw new MultipartParseError(
        'Longitude must be a valid number',
        'INVALID_LONGITUDE',
        400
      );
    }

    // Build parsed data object with required fields
    const parsed: ParsedFormData = {
      file: parsedFile,
      title,
      category,
      latitude,
      longitude,
    };

    // Extract optional fields
    const description = formData.get('description');
    if (description && typeof description === 'string') {
      parsed.description = description;
    }

    const season = formData.get('season');
    if (season && typeof season === 'string') {
      parsed.season = season;
    }

    const timeOfDay = formData.get('time_of_day');
    if (timeOfDay && typeof timeOfDay === 'string') {
      parsed.time_of_day = timeOfDay;
    }

    const blurLocationStr = formData.get('blur_location');
    if (blurLocationStr && typeof blurLocationStr === 'string') {
      parsed.blur_location = blurLocationStr === 'true';
    }

    const blurRadiusStr = formData.get('blur_radius');
    if (blurRadiusStr && typeof blurRadiusStr === 'string') {
      const blurRadius = parseFloat(blurRadiusStr);
      if (!isNaN(blurRadius)) {
        parsed.blur_radius = blurRadius;
      }
    }

    // Parse tags (can be sent as JSON array string or multiple fields)
    const tagsStr = formData.get('tags');
    if (tagsStr && typeof tagsStr === 'string') {
      try {
        const tagsParsed = JSON.parse(tagsStr);
        if (Array.isArray(tagsParsed)) {
          parsed.tags = tagsParsed.filter(t => typeof t === 'string');
        }
      } catch {
        // If not JSON, treat as comma-separated string
        parsed.tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // Parse gear (JSON object)
    const gearStr = formData.get('gear');
    if (gearStr && typeof gearStr === 'string') {
      try {
        const gearParsed = JSON.parse(gearStr);
        if (typeof gearParsed === 'object' && gearParsed !== null) {
          parsed.gear = gearParsed as GearInfo;
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    return parsed;
  } catch (error) {
    // Re-throw MultipartParseError as-is
    if (error instanceof MultipartParseError) {
      throw error;
    }

    // Wrap other errors
    throw new MultipartParseError(
      'Failed to parse multipart form data',
      'PARSE_ERROR',
      400
    );
  }
}

