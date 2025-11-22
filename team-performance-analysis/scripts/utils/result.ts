/**
 * Result Type Pattern
 *
 * Provides type-safe error handling without throwing/catching.
 * Inspired by Rust's Result<T, E> type.
 *
 * Usage:
 *   const result = loadData(path);
 *   if (result.success) {
 *     console.log(result.data);
 *   } else {
 *     console.error(result.error.message);
 *   }
 */

/**
 * Success result variant
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Error result variant
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Result type - either Success or Failure
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Create a success result
 */
export function Ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function Err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard for success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard for failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Map success value, leave errors unchanged
 */
export function mapSuccess<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.success) {
    return Ok(fn(result.data));
  }
  return result;
}

/**
 * Map error value, leave success unchanged
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.success) {
    return result;
  }
  return Err(fn(result.error));
}

/**
 * Chain operations on success value
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}

/**
 * Get data or throw error
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Get data or return default value
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Execute a function with side effects, ignore result
 */
export function tap<T, E>(
  result: Result<T, E>,
  fn: (data: T) => void
): Result<T, E> {
  if (result.success) {
    fn(result.data);
  }
  return result;
}

/**
 * Execute a function with side effects on error
 */
export function tapError<T, E>(
  result: Result<T, E>,
  fn: (error: E) => void
): Result<T, E> {
  if (!result.success) {
    fn(result.error);
  }
  return result;
}

/**
 * Combine multiple results
 */
export function combine<T extends any[], E = Error>(
  results: { [K in keyof T]: Result<T[K], E> }
): Result<T, E> {
  const data: any[] = [];
  for (const result of results) {
    if (!isSuccess(result)) {
      return result as Failure<E>;
    }
    data.push((result as Success<any>).data);
  }
  return Ok(data as T);
}
