/**
 * Comprehensive error logging for Firestore API calls
 * Logs: full error object, endpoint details, document path, and request payload
 */

export interface ErrorLogContext {
  apiEndpoint: string;
  operation: 'GET' | 'CREATE' | 'UPDATE' | 'DELETE' | 'QUERY';
  firebaseFunc: string;
  path: string;
  segmentPaths?: (string | number)[];
  requestPayload?: unknown;
}

export interface FirestoreApiError {
  message: string;
  code: string;
  name: string;
  apiEndpoint: string;
  operation: ErrorLogContext['operation'];
  firebaseFunc: string;
  documentPath: string;
  requestPayload?: unknown;
}

type SerializableLogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializableLogValue[]
  | { [key: string]: SerializableLogValue };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getSegments = (value: unknown): string[] | undefined => {
  if (!isRecord(value) || !Array.isArray(value.segments)) {
    return undefined;
  }

  return value.segments.filter(
    (segment): segment is string => typeof segment === 'string'
  );
};

const getFieldPath = (value: unknown) => getSegments(value)?.join('.');

const extractFirestoreValue = (value: unknown): SerializableLogValue => {
  if (!isRecord(value)) {
    return value as SerializableLogValue;
  }

  if ('stringValue' in value) {
    return String(value.stringValue);
  }

  if ('integerValue' in value) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value) {
    return Number(value.doubleValue);
  }

  if ('booleanValue' in value) {
    return Boolean(value.booleanValue);
  }

  if ('timestampValue' in value) {
    return String(value.timestampValue);
  }

  if ('nullValue' in value) {
    return null;
  }

  if ('referenceValue' in value) {
    return String(value.referenceValue);
  }

  if ('arrayValue' in value && isRecord(value.arrayValue)) {
    const values = Array.isArray(value.arrayValue.values)
      ? value.arrayValue.values
      : [];

    return values.map(extractFirestoreValue);
  }

  if (
    'mapValue' in value &&
    isRecord(value.mapValue) &&
    isRecord(value.mapValue.fields)
  ) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields).map(([key, fieldValue]) => [
        key,
        extractFirestoreValue(fieldValue),
      ])
    );
  }

  return serializeForLog(value);
};

const summarizeQueryPayload = (
  value: unknown
): SerializableLogValue | undefined => {
  if (!isRecord(value) || value.type !== 'query' || !isRecord(value._query)) {
    return undefined;
  }

  const internalQuery = value._query;
  const filters = Array.isArray(internalQuery.filters)
    ? internalQuery.filters.map((filter) => {
        if (!isRecord(filter)) {
          return serializeForLog(filter);
        }

        return {
          field: getFieldPath(filter.field),
          op: typeof filter.op === 'string' ? filter.op : undefined,
          value: extractFirestoreValue(filter.value),
        };
      })
    : [];

  const rawOrderBy = [
    ...(Array.isArray(internalQuery.explicitOrderBy)
      ? internalQuery.explicitOrderBy
      : []),
    ...(Array.isArray(internalQuery.Ee) ? internalQuery.Ee : []),
  ];

  const orderBy = rawOrderBy
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const field = getFieldPath(entry.field);
      const direction =
        typeof entry.dir === 'string'
          ? entry.dir
          : typeof entry.direction === 'string'
            ? entry.direction
            : undefined;

      if (!field && !direction) {
        return null;
      }

      return {
        field,
        direction,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        field: string | undefined;
        direction: string | undefined;
      } => entry !== null
    )
    .filter(
      (entry, index, allEntries) =>
        index ===
        allEntries.findIndex(
          (candidate) =>
            candidate.field === entry.field &&
            candidate.direction === entry.direction
        )
    );

  return {
    type: 'query',
    path: getSegments(internalQuery.path)?.join('/'),
    filters,
    orderBy,
  };
};

const formatRequestPayload = (value: unknown): SerializableLogValue =>
  summarizeQueryPayload(value) ?? serializeForLog(value);

const serializeForLog = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(
      value,
      (_key, currentValue) => {
        if (typeof currentValue === 'function') {
          return `[Function ${currentValue.name || 'anonymous'}]`;
        }

        if (typeof currentValue === 'object' && currentValue !== null) {
          if (seen.has(currentValue)) {
            return '[Circular]';
          }

          seen.add(currentValue);
        }

        return currentValue;
      },
      2
    );
  } catch {
    return String(value);
  }
};

export const logFirestoreError = (context: ErrorLogContext, error: unknown) => {
  const errorObj =
    error instanceof Error
      ? error
      : (new Error(String(error)) as { message: string; code?: string });
  const errorCode = (errorObj as { code?: string }).code || 'UNKNOWN_ERROR';

  // Build the full document path
  const fullPath = context.segmentPaths
    ? `${context.path}/${context.segmentPaths.join('/')}`
    : `${context.path}`;

  console.error('❌ FIRESTORE API ERROR', {
    timestamp: new Date().toISOString(),
    apiEndpoint: context.apiEndpoint,
    operation: context.operation,
    firebaseFunc: context.firebaseFunc,
    documentPath: fullPath,
    requestPayload: formatRequestPayload(context.requestPayload),
    errorMessage: errorObj.message,
    errorCode: errorCode,
    errorDetails: error,
  });
};

export const createFirestoreApiError = (
  context: ErrorLogContext,
  error: unknown
): FirestoreApiError => {
  const errorObj =
    error instanceof Error
      ? error
      : (new Error(String(error)) as { message: string; code?: string });
  const errorCode = (errorObj as { code?: string }).code || 'UNKNOWN_ERROR';
  const fullPath = context.segmentPaths
    ? `${context.path}/${context.segmentPaths.join('/')}`
    : `${context.path}`;

  logFirestoreError(context, error);

  return {
    message: errorObj.message,
    code: errorCode,
    name: errorObj instanceof Error ? errorObj.name : 'Error',
    apiEndpoint: context.apiEndpoint,
    operation: context.operation,
    firebaseFunc: context.firebaseFunc,
    documentPath: fullPath,
    requestPayload: formatRequestPayload(context.requestPayload),
  };
};
