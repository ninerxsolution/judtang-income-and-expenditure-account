import {
  getCardAccountTypeDisplayName,
  getCardNetworkDisplayName,
  getFullCardTypeDisplayName,
  CARD_ACCOUNT_TYPES,
  CARD_NETWORKS,
  CARD_ACCOUNT_TYPE_OTHER,
  CARD_NETWORK_OTHER,
} from "../card-types";

describe("card-types", () => {
  describe("getCardAccountTypeDisplayName", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getCardAccountTypeDisplayName(null)).toBeNull();
      expect(getCardAccountTypeDisplayName(undefined)).toBeNull();
      expect(getCardAccountTypeDisplayName("")).toBeNull();
    });
    it("returns display name for CARD_ACCOUNT_TYPE_OTHER", () => {
      expect(getCardAccountTypeDisplayName(CARD_ACCOUNT_TYPE_OTHER)).toBe("อื่นๆ");
      expect(getCardAccountTypeDisplayName(CARD_ACCOUNT_TYPE_OTHER, "en")).toBe("Other");
    });
    it("returns Thai name by default", () => {
      expect(getCardAccountTypeDisplayName("credit")).toBe("บัตรเครดิต");
      expect(getCardAccountTypeDisplayName("debit")).toBe("บัตรเดบิต");
      expect(getCardAccountTypeDisplayName("prepaid")).toBe("บัตรเติมเงิน");
    });
    it("returns English name when locale is en", () => {
      expect(getCardAccountTypeDisplayName("credit", "en")).toBe("Credit");
      expect(getCardAccountTypeDisplayName("debit", "en")).toBe("Debit");
    });
    it("returns id when not found in list", () => {
      expect(getCardAccountTypeDisplayName("unknown-type")).toBe("unknown-type");
    });
  });

  describe("getCardNetworkDisplayName", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getCardNetworkDisplayName(null)).toBeNull();
      expect(getCardNetworkDisplayName(undefined)).toBeNull();
      expect(getCardNetworkDisplayName("")).toBeNull();
    });
    it("returns display name for CARD_NETWORK_OTHER", () => {
      expect(getCardNetworkDisplayName(CARD_NETWORK_OTHER)).toBe("อื่นๆ");
      expect(getCardNetworkDisplayName(CARD_NETWORK_OTHER, "en")).toBe("Other");
    });
    it("returns Thai name by default", () => {
      expect(getCardNetworkDisplayName("visa")).toBe("วีซ่า");
      expect(getCardNetworkDisplayName("master")).toBe("มาสเตอร์การ์ด");
    });
    it("returns English name when locale is en", () => {
      expect(getCardNetworkDisplayName("visa", "en")).toBe("Visa");
      expect(getCardNetworkDisplayName("master", "en")).toBe("Mastercard");
    });
  });

  describe("getFullCardTypeDisplayName", () => {
    it("returns null when both are null/empty", () => {
      expect(getFullCardTypeDisplayName(null, null)).toBeNull();
      expect(getFullCardTypeDisplayName("", "")).toBeNull();
    });
    it("returns account type only when network is null", () => {
      expect(getFullCardTypeDisplayName("credit", null, "th")).toBe("บัตรเครดิต");
      expect(getFullCardTypeDisplayName("credit", null, "en")).toBe("Credit");
    });
    it("returns network only when account type is null", () => {
      expect(getFullCardTypeDisplayName(null, "visa", "th")).toBe("วีซ่า");
      expect(getFullCardTypeDisplayName(null, "visa", "en")).toBe("Visa");
    });
    it("combines both: Thai order account+network, English order network+account", () => {
      expect(getFullCardTypeDisplayName("credit", "visa", "th")).toBe("บัตรเครดิต วีซ่า");
      expect(getFullCardTypeDisplayName("credit", "visa", "en")).toBe("Visa Credit");
    });
  });

  describe("CARD_ACCOUNT_TYPES", () => {
    it("contains expected types", () => {
      expect(CARD_ACCOUNT_TYPES.length).toBeGreaterThan(0);
      expect(CARD_ACCOUNT_TYPES.some((c) => c.id === "credit")).toBe(true);
      expect(CARD_ACCOUNT_TYPES.some((c) => c.id === "debit")).toBe(true);
      expect(CARD_ACCOUNT_TYPES.some((c) => c.id === "prepaid")).toBe(true);
    });
  });

  describe("CARD_NETWORKS", () => {
    it("contains expected networks", () => {
      expect(CARD_NETWORKS.length).toBeGreaterThan(0);
      expect(CARD_NETWORKS.some((c) => c.id === "visa")).toBe(true);
      expect(CARD_NETWORKS.some((c) => c.id === "master")).toBe(true);
    });
  });
});
