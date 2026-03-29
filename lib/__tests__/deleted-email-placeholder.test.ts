import {
  buildDeletedUserEmail,
  parseOriginalEmailFromDeletedPlaceholder,
} from "../deleted-email-placeholder";

describe("buildDeletedUserEmail", () => {
  it("embeds original email", () => {
    expect(buildDeletedUserEmail("uid1", "a@b.com")).toBe(
      "deleted_uid1_a@b.com"
    );
  });

  it("uses noemail mark when missing", () => {
    expect(buildDeletedUserEmail("uid1", null)).toBe("deleted_uid1_noemail");
  });
});

describe("parseOriginalEmailFromDeletedPlaceholder", () => {
  it("extracts original", () => {
    expect(
      parseOriginalEmailFromDeletedPlaceholder(
        "cm1",
        "deleted_cm1_ninerxsolution@gmail.com"
      )
    ).toBe("ninerxsolution@gmail.com");
  });

  it("returns null for wrong user id prefix", () => {
    expect(
      parseOriginalEmailFromDeletedPlaceholder(
        "cm1",
        "deleted_cm2_x@y.com"
      )
    ).toBeNull();
  });

  it("returns null for noemail placeholder", () => {
    expect(
      parseOriginalEmailFromDeletedPlaceholder("cm1", "deleted_cm1_noemail")
    ).toBeNull();
  });
});
