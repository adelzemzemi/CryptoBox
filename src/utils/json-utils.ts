import { CryptoBoxError, describeCause } from '../core/errors.js';

/**
 * Parse JSON with optional runtime validation.
 *
 * `null` is valid JSON and round-trips as `null`; only malformed syntax or a
 * failing validator throws.
 *
 * @param json - JSON string to parse
 * @param validator - Optional type guard applied to the parsed value
 * @returns Parsed data
 * @throws CryptoBoxError `DESERIALIZATION_FAILED` if the JSON is malformed
 * @throws CryptoBoxError `VALIDATION_FAILED` if the validator rejects the value
 */
function runValidator(validator: (data: unknown) => boolean, parsed: unknown): boolean {
  try {
    return validator(parsed);
  } catch {
    // A validator written for one shape commonly throws on another; that is a
    // rejection. Its message may quote the payload, so it is not passed on.
    throw new CryptoBoxError('VALIDATION_FAILED', 'JSON validation failed: the validator threw');
  }
}

export function safeJsonParse<T>(json: string, validator?: (data: unknown) => data is T): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    // The parser's own message quotes the input, which here is decrypted plaintext.
    throw new CryptoBoxError('DESERIALIZATION_FAILED', 'Invalid JSON syntax');
  }

  if (validator && !runValidator(validator, parsed)) {
    throw new CryptoBoxError(
      'VALIDATION_FAILED',
      'JSON validation failed: data does not match expected type'
    );
  }

  return parsed as T;
}

/**
 * Serialize a value to JSON.
 *
 * Values that JSON cannot represent (`undefined`, functions, symbols) are rejected
 * rather than silently producing a non-string result.
 *
 * @param data - Data to serialize
 * @returns JSON string
 * @throws CryptoBoxError `SERIALIZATION_FAILED` if the value cannot be serialized
 */
export function safeJsonStringify<T>(data: T): string {
  let json: string | undefined;

  try {
    json = JSON.stringify(data);
  } catch (error) {
    throw new CryptoBoxError(
      'SERIALIZATION_FAILED',
      `Failed to serialize data: ${describeCause(error)}`
    );
  }

  if (typeof json !== 'string') {
    throw new CryptoBoxError(
      'SERIALIZATION_FAILED',
      'Failed to serialize data: value is not representable in JSON (undefined, function, or symbol)'
    );
  }

  return json;
}

/**
 * Check if a value is a plain object (not null, not an array, not a Date, etc.)
 *
 * @param value - Value to check
 * @returns True if the value is a plain object
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
