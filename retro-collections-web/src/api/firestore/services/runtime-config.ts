import type { FirestoreBuilder } from '../types/firestoreBuilder';
import { createFirestoreApiError } from '../errorLogger';
import {
  getRuntimeConfigDocPath,
  loadRuntimeConfig,
  type RuntimeConfig,
} from '../runtimeConfig';

const getRuntimeConfigEndpoints = (builder: FirestoreBuilder) => ({
  getRuntimeConfig: builder.query<RuntimeConfig, void>({
    async queryFn() {
      const context = {
        apiEndpoint: 'getRuntimeConfig',
        operation: 'GET' as const,
        firebaseFunc: 'getDoc',
        path: getRuntimeConfigDocPath(),
      };

      try {
        const runtimeConfig = await loadRuntimeConfig();

        return {
          data: runtimeConfig,
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
  }),
});

export default getRuntimeConfigEndpoints;