import type { IncomingMessage, ServerResponse } from 'node:http'
export function handleProductApi(request: IncomingMessage, response: ServerResponse): Promise<boolean>
export function validateSources(input: unknown): unknown[]
