/**
 * Test helpers for API route testing.
 * Use with jest.mock to inject session and prisma mocks.
 */

export const TEST_USER_ID = "test-user-id";
export const TEST_SESSION_ID = "test-session-id";

export function createMockSession(overrides?: { userId?: string; sessionId?: string }) {
  return {
    user: { id: overrides?.userId ?? TEST_USER_ID },
    sessionId: overrides?.sessionId ?? TEST_SESSION_ID,
  };
}

export function createRequest(
  url: string,
  options?: { method?: string; body?: object; headers?: Record<string, string> }
): Request {
  const { method = "GET", body, headers = {} } = options ?? {};
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

export function createParams<T extends Record<string, string>>(params: T) {
  return Promise.resolve(params);
}
