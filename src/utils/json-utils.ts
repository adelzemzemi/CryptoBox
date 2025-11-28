/**
 * Safe JSON parse with validation
 * @param json - JSON string to parse
 * @param validator - Optional validation function
 * @returns Parsed data
 * @throws Error if JSON is invalid or validation fails
 */
export function safeJsonParse<T>(
  json: string,
  validator?: (data: unknown) => data is T
): T {
  try {
    const parsed = JSON.parse(json);
    
    if (parsed === null || parsed === undefined) {
      throw new Error('Invalid JSON: null or undefined value');
    }
    
    if (validator && !validator(parsed)) {
      throw new Error('JSON validation failed: data does not match expected type');
    }
    
    return parsed as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON syntax: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Safe JSON stringify
 * @param data - Data to stringify
 * @returns JSON string
 * @throws Error if data cannot be serialized
 */
export function safeJsonStringify<T>(data: T): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new Error(
      `Failed to serialize data: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Check if value is a plain object (not null, not array, not Date, etc.)
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
