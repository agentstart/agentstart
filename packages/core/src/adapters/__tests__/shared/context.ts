export const baseAdapterContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;
