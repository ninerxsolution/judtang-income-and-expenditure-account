/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFetch = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

import { POST } from "@/app/api/ocr/parse-slips/route";
import { createMockSession } from "../helpers/api-helper";

type MockOcrResponse = {
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string | null;
  ErrorDetails: string | null;
  ParsedResults?: Array<{
    FileParseExitCode: number;
    ParsedText: string | null;
    ErrorMessage: string | null;
    ErrorDetails: string | null;
  }>;
};

function createOcrResponse(body: MockOcrResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createFormDataRequest(fileName = "slip.jpg"): Request {
  const formData = new FormData();
  formData.append("file", new File(["fake-image"], fileName, { type: "image/jpeg" }));
  return new Request("http://localhost/api/ocr/parse-slips", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
  process.env.OCR_SPACE_API_KEY = "test-ocr-key";
  Object.defineProperty(global, "fetch", {
    writable: true,
    value: mockFetch,
  });
});

describe("POST /api/ocr/parse-slips", () => {
  it("falls back to engine 3 when engine 2 OCR text cannot be parsed", async () => {
    const engines: string[] = [];
    mockFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const formData = init?.body;
      if (!(formData instanceof FormData)) {
        throw new Error("Expected FormData body");
      }

      const engine = String(formData.get("OCREngine") ?? "");
      engines.push(engine);

      if (engine === "2") {
        return createOcrResponse({
          OCRExitCode: 1,
          IsErroredOnProcessing: false,
          ErrorMessage: null,
          ErrorDetails: null,
          ParsedResults: [
            {
              FileParseExitCode: 1,
              ParsedText:
                "5 s.n. 68 15:50 %.\nK+\nxxx-x-x4716-x\nXXX-X-X3128-x\n015339155021AOR05416\n500.00 um\n0.00 1m",
              ErrorMessage: null,
              ErrorDetails: null,
            },
          ],
        });
      }

      return createOcrResponse({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ErrorMessage: null,
        ErrorDetails: null,
        ParsedResults: [
          {
            FileParseExitCode: 1,
            ParsedText: "Amount:\n500.00 Baht",
            ErrorMessage: null,
            ErrorDetails: null,
          },
        ],
      });
    });

    const response = await POST(createFormDataRequest("fallback-slip.jpg"));
    const data = (await response.json()) as {
      items: Array<{ rawFileName: string; parsed?: { amount: number }; error?: string }>;
    };

    expect(response.status).toBe(200);
    expect(engines).toEqual(["2", "3"]);
    expect(data.items[0]?.rawFileName).toBe("fallback-slip.jpg");
    expect(data.items[0]?.parsed?.amount).toBe(500);
    expect(data.items[0]?.error).toBeUndefined();
  });

  it("keeps engine 2 result when parsing succeeds immediately", async () => {
    const engines: string[] = [];
    mockFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const formData = init?.body;
      if (!(formData instanceof FormData)) {
        throw new Error("Expected FormData body");
      }

      const engine = String(formData.get("OCREngine") ?? "");
      engines.push(engine);

      return createOcrResponse({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ErrorMessage: null,
        ErrorDetails: null,
        ParsedResults: [
          {
            FileParseExitCode: 1,
            ParsedText: "Amount:\n500.00 Baht",
            ErrorMessage: null,
            ErrorDetails: null,
          },
        ],
      });
    });

    const response = await POST(createFormDataRequest("fast-slip.jpg"));
    const data = (await response.json()) as {
      items: Array<{ rawFileName: string; parsed?: { amount: number }; error?: string }>;
    };

    expect(response.status).toBe(200);
    expect(engines).toEqual(["2"]);
    expect(data.items[0]?.rawFileName).toBe("fast-slip.jpg");
    expect(data.items[0]?.parsed?.amount).toBe(500);
    expect(data.items[0]?.error).toBeUndefined();
  });
});
