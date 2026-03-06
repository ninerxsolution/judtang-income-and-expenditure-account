import { parseChangelog, getChangelogVersions } from "../changelog";
import { readFile } from "fs/promises";

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
}));

describe("changelog", () => {
  describe("parseChangelog", () => {
    it("returns empty array for empty content", () => {
      expect(parseChangelog("")).toEqual([]);
    });
    it("parses single version block", () => {
      const content = `# v1.0.0 - 2025-01-15

## Added
- New feature A

## Fixed
- Bug fix B
`;
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe("1.0.0");
      expect(result[0].releaseDate).toBe("2025-01-15");
      expect(result[0].sections).toHaveLength(2);
      expect(result[0].sections[0].title).toBe("Added");
      expect(result[0].sections[0].body).toContain("New feature A");
      expect(result[0].sections[1].title).toBe("Fixed");
      expect(result[0].sections[1].body).toContain("Bug fix B");
    });
    it("parses multiple version blocks", () => {
      const content = `# v1.1.0 - 2025-02-01

## Added
- Feature X

# v1.0.0 - 2025-01-15

## Added
- Initial release
`;
      const result = parseChangelog(content);
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe("1.1.0");
      expect(result[1].version).toBe("1.0.0");
    });
    it("handles version without sections", () => {
      const content = `# v0.9.0 - 2025-01-01

`;
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe("0.9.0");
      expect(result[0].sections).toEqual([]);
    });
  });

  describe("getChangelogVersions", () => {
    const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

    beforeEach(() => mockReadFile.mockReset());

    it("returns empty array when file not found", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));
      const result = await getChangelogVersions("en");
      expect(result).toEqual([]);
    });

    it("parses English changelog", async () => {
      mockReadFile.mockResolvedValue(
        "# v1.0.0 - 2025-01-01\n\n## Added\n\n- Feature A\n\n# v0.9.0 - 2024-12-01\n\n## Fixed\n\n- Bug B\n",
      );
      const result = await getChangelogVersions("en");
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe("1.0.0");
      expect(result[1].version).toBe("0.9.0");
    });

    it("tries Thai file first for th language", async () => {
      mockReadFile
        .mockRejectedValueOnce(new Error("ENOENT"))
        .mockResolvedValueOnce("# v1.0.0 - 2025-01-01\n\n## Added\n\n- Feature\n");
      const result = await getChangelogVersions("th");
      expect(result).toHaveLength(1);
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
