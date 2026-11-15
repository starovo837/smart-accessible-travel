import { copyDictionary } from "./copyDictionary.ts";
import { apiFetch } from './transport';
export async function service<T>(path: string, input?: unknown, token?: string, signal?: AbortSignal, method?: string): Promise<T> {
    const response = await apiFetch('/api/' + path, { method: method ?? (input === undefined ? 'GET' : 'POST'), cache: 'no-store', signal, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Sai-Capability': token } : {}) }, ...(input !== undefined ? { body: JSON.stringify(input) } : {}) });
    const value = await response.json().catch(() => ({ error: copyDictionary.cec17a706b973eb65 }));
    if (!response.ok)
        throw Error(value.error ?? copyDictionary.c3e6c4e3f91e414ea);
    return value;
}
export const prepareService = () => service('status');
