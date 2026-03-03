import { parseChangelog } from "../changelog";

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
});
