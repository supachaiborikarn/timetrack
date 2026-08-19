import { describe, expect, it } from "vitest";
import {
    ASSET_KIND_META,
    VAULT_DOCUMENT_KINDS,
    canDeleteAsset,
    canUploadAsset,
    canViewAsset,
    isAssetKind,
    maxBytesForKind,
    type AssetPermission,
    type AssetSubject,
    type Viewer,
} from "../asset-kinds";
import type { AssetKind, Role } from "@prisma/client";

function viewer(overrides: Partial<Viewer> & { grants?: AssetPermission[] } = {}): Viewer {
    const grants = new Set(overrides.grants ?? []);
    return {
        userId: overrides.userId ?? "viewer-1",
        role: (overrides.role ?? "EMPLOYEE") as Role,
        stationId: overrides.stationId ?? null,
        can: overrides.can ?? ((code) => grants.has(code)),
    };
}

function subject(overrides: Partial<AssetSubject> & { kind: AssetKind }): AssetSubject {
    return {
        ownerUserId: overrides.ownerUserId ?? "owner-1",
        uploadedById: overrides.uploadedById ?? "owner-1",
        ownerStationId: overrides.ownerStationId ?? null,
        kind: overrides.kind,
    };
}

describe("kind metadata", () => {
    it("marks identity documents as sensitive and ordinary paperwork as not", () => {
        expect(ASSET_KIND_META.CITIZEN_ID.sensitive).toBe(true);
        expect(ASSET_KIND_META.PASSPORT.sensitive).toBe(true);
        expect(ASSET_KIND_META.BANK_BOOK.sensitive).toBe(true);
        expect(ASSET_KIND_META.EDUCATION_CERT.sensitive).toBe(false);
        expect(ASSET_KIND_META.EMPLOYEE_PHOTO.sensitive).toBe(false);
    });

    it("counts only vault kinds as documents", () => {
        expect(VAULT_DOCUMENT_KINDS).toContain("WORK_PERMIT");
        expect(VAULT_DOCUMENT_KINDS).not.toContain("EMPLOYEE_PHOTO");
        expect(VAULT_DOCUMENT_KINDS).not.toContain("REQUEST_ATTACHMENT");
    });

    it("caps avatars tighter than documents", () => {
        expect(maxBytesForKind("EMPLOYEE_PHOTO")).toBeLessThan(maxBytesForKind("PASSPORT"));
    });

    it("rejects values that aren't kinds", () => {
        expect(isAssetKind("WORK_PERMIT")).toBe(true);
        expect(isAssetKind("NOT_A_KIND")).toBe(false);
        expect(isAssetKind(undefined)).toBe(false);
    });
});

describe("canViewAsset", () => {
    it("lets any signed-in user load avatars and announcement images", () => {
        const stranger = viewer({ userId: "stranger" });
        expect(canViewAsset(subject({ kind: "EMPLOYEE_PHOTO" }), stranger).allowed).toBe(true);
        expect(canViewAsset(subject({ kind: "ANNOUNCEMENT_IMAGE", ownerUserId: null }), stranger).allowed).toBe(true);
    });

    it("lets an employee see their own documents without any permission", () => {
        const owner = viewer({ userId: "owner-1" });
        const decision = canViewAsset(subject({ kind: "PASSPORT" }), owner);
        expect(decision.allowed).toBe(true);
        expect(decision.auditSensitiveRead).toBe(false);
    });

    it("blocks a colleague with no document permission", () => {
        expect(canViewAsset(subject({ kind: "EDUCATION_CERT" }), viewer({ userId: "other" })).allowed).toBe(false);
    });

    it("needs the sensitive grant on top of the plain view grant", () => {
        const hrPlain = viewer({ userId: "hr", role: "HR", grants: ["employee_document.view"] });
        expect(canViewAsset(subject({ kind: "EDUCATION_CERT" }), hrPlain).allowed).toBe(true);
        expect(canViewAsset(subject({ kind: "CITIZEN_ID" }), hrPlain).allowed).toBe(false);

        const hrFull = viewer({
            userId: "hr",
            role: "HR",
            grants: ["employee_document.view", "employee_document.view_sensitive"],
        });
        const decision = canViewAsset(subject({ kind: "CITIZEN_ID" }), hrFull);
        expect(decision.allowed).toBe(true);
        expect(decision.auditSensitiveRead).toBe(true);
    });

    it("keeps a manager inside their own station", () => {
        const manager = viewer({ userId: "mgr", role: "MANAGER", stationId: "st-1", grants: ["employee_document.view"] });
        expect(canViewAsset(subject({ kind: "RESUME", ownerStationId: "st-1" }), manager).allowed).toBe(true);
        expect(canViewAsset(subject({ kind: "RESUME", ownerStationId: "st-2" }), manager).allowed).toBe(false);
    });

    it("does not station-scope ADMIN or HR", () => {
        const hr = viewer({ userId: "hr", role: "HR", stationId: "st-1", grants: ["employee_document.view"] });
        expect(canViewAsset(subject({ kind: "RESUME", ownerStationId: "st-2" }), hr).allowed).toBe(true);
    });

    it("shows request evidence to the requester and to approvers only", () => {
        const requester = viewer({ userId: "owner-1" });
        const stranger = viewer({ userId: "stranger" });
        const approver = viewer({ userId: "mgr", role: "MANAGER", grants: ["request.view"] });

        expect(canViewAsset(subject({ kind: "REQUEST_ATTACHMENT" }), requester).allowed).toBe(true);
        expect(canViewAsset(subject({ kind: "REQUEST_ATTACHMENT" }), stranger).allowed).toBe(false);
        expect(canViewAsset(subject({ kind: "REQUEST_ATTACHMENT" }), approver).allowed).toBe(true);
    });
});

describe("canUploadAsset", () => {
    it("lets an employee set their own avatar but not someone else's", () => {
        const self = viewer({ userId: "owner-1" });
        expect(canUploadAsset(subject({ kind: "EMPLOYEE_PHOTO" }), self)).toBe(true);
        expect(canUploadAsset(subject({ kind: "EMPLOYEE_PHOTO", ownerUserId: "other" }), self)).toBe(false);
    });

    it("lets HR set anyone's avatar", () => {
        const hr = viewer({ userId: "hr", role: "HR", grants: ["employee.edit"] });
        expect(canUploadAsset(subject({ kind: "EMPLOYEE_PHOTO" }), hr)).toBe(true);
    });

    it("keeps the document vault write-restricted, even for the employee themselves", () => {
        const owner = viewer({ userId: "owner-1" });
        expect(canUploadAsset(subject({ kind: "WORK_PERMIT" }), owner)).toBe(false);

        const hr = viewer({ userId: "hr", role: "HR", grants: ["employee_document.manage"] });
        expect(canUploadAsset(subject({ kind: "WORK_PERMIT" }), hr)).toBe(true);
    });

    it("only lets the requester attach their own evidence", () => {
        const hr = viewer({ userId: "hr", role: "HR", grants: ["employee_document.manage", "request.approve"] });
        expect(canUploadAsset(subject({ kind: "REQUEST_ATTACHMENT" }), hr)).toBe(false);
        expect(canUploadAsset(subject({ kind: "REQUEST_ATTACHMENT" }), viewer({ userId: "owner-1" }))).toBe(true);
    });
});

describe("canDeleteAsset", () => {
    it("lets the owner remove their own avatar and evidence", () => {
        const owner = viewer({ userId: "owner-1" });
        expect(canDeleteAsset(subject({ kind: "EMPLOYEE_PHOTO" }), owner)).toBe(true);
        expect(canDeleteAsset(subject({ kind: "REQUEST_ATTACHMENT" }), owner)).toBe(true);
    });

    it("does not let the employee delete documents HR filed about them", () => {
        expect(canDeleteAsset(subject({ kind: "EMPLOYMENT_CONTRACT" }), viewer({ userId: "owner-1" }))).toBe(false);
    });

    it("keeps a manager from deleting another station's documents", () => {
        const manager = viewer({ userId: "mgr", role: "MANAGER", stationId: "st-1", grants: ["employee_document.manage"] });
        expect(canDeleteAsset(subject({ kind: "RESUME", ownerStationId: "st-1" }), manager)).toBe(true);
        expect(canDeleteAsset(subject({ kind: "RESUME", ownerStationId: "st-2" }), manager)).toBe(false);
    });
});
