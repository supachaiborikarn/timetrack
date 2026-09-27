import { describe, expect, it } from "vitest";
import { getKebdaoOutletId, getVgcloudSiteCode } from "./vgcloud-station-codes";

describe("VGCloud station codes", () => {
    it("uses the same site codes as VGCloud", () => {
        expect(getVgcloudSiteCode("WKO")).toBe("394");
        expect(getVgcloudSiteCode("PAP")).toBe("1204");
        expect(getVgcloudSiteCode("SPC")).toBe("656");
    });

    it("formats the Kebdao ID as the 4-digit station ID shown on the card", () => {
        expect(getKebdaoOutletId("WKO")).toBe("0394");
        expect(getKebdaoOutletId("PAP")).toBe("1204");
        expect(getKebdaoOutletId("SPC")).toBe("0656");
        expect(getKebdaoOutletId("UNKNOWN")).toBeNull();
    });
});
