import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { authorizeDiscordInteraction } from "../discord-commands";
import { isDiscordTimestampFresh, verifyDiscordRequestSignature } from "../discord";

const originalEnvironment = {
    guilds: process.env.DISCORD_ALLOWED_GUILD_IDS,
    users: process.env.DISCORD_ALLOWED_USER_IDS,
    roles: process.env.DISCORD_ALLOWED_ROLE_IDS,
};

afterEach(() => {
    if (originalEnvironment.guilds === undefined) delete process.env.DISCORD_ALLOWED_GUILD_IDS;
    else process.env.DISCORD_ALLOWED_GUILD_IDS = originalEnvironment.guilds;
    if (originalEnvironment.users === undefined) delete process.env.DISCORD_ALLOWED_USER_IDS;
    else process.env.DISCORD_ALLOWED_USER_IDS = originalEnvironment.users;
    if (originalEnvironment.roles === undefined) delete process.env.DISCORD_ALLOWED_ROLE_IDS;
    else process.env.DISCORD_ALLOWED_ROLE_IDS = originalEnvironment.roles;
});

describe("Discord security", () => {
    it("validates the Ed25519 signature against the untouched raw body", () => {
        const { publicKey, privateKey } = generateKeyPairSync("ed25519");
        const publicDer = publicKey.export({ format: "der", type: "spki" });
        const rawPublicKey = Buffer.from(publicDer).subarray(-32).toString("hex");
        const timestamp = "1784282400";
        const rawBody = JSON.stringify({ type: 1 });
        const signature = sign(
            null,
            Buffer.from(timestamp + rawBody),
            privateKey,
        ).toString("hex");

        expect(verifyDiscordRequestSignature({
            rawBody,
            signature,
            timestamp,
            publicKey: rawPublicKey,
        })).toBe(true);

        expect(verifyDiscordRequestSignature({
            rawBody: `${rawBody} `,
            signature,
            timestamp,
            publicKey: rawPublicKey,
        })).toBe(false);
    });

    it("denies commands until a user or role allowlist is configured", () => {
        process.env.DISCORD_ALLOWED_GUILD_IDS = "guild-1";
        process.env.DISCORD_ALLOWED_USER_IDS = "";
        process.env.DISCORD_ALLOWED_ROLE_IDS = "";

        const result = authorizeDiscordInteraction({
            id: "interaction-1",
            application_id: "app-1",
            token: "token-1",
            type: 2,
            guild_id: "guild-1",
            member: { user: { id: "user-1" }, roles: [] },
        });

        expect(result.allowed).toBe(false);
    });

    it("rejects old interaction timestamps", () => {
        const nowMs = 1_784_282_400_000;
        expect(isDiscordTimestampFresh("1784282400", nowMs)).toBe(true);
        expect(isDiscordTimestampFresh("1784282099", nowMs)).toBe(false);
    });

    it("allows a configured user only in an allowed guild", () => {
        process.env.DISCORD_ALLOWED_GUILD_IDS = "guild-1";
        process.env.DISCORD_ALLOWED_USER_IDS = "user-1";
        process.env.DISCORD_ALLOWED_ROLE_IDS = "";

        const baseInteraction = {
            id: "interaction-1",
            application_id: "app-1",
            token: "token-1",
            type: 2,
            member: { user: { id: "user-1" }, roles: [] },
        };

        expect(authorizeDiscordInteraction({
            ...baseInteraction,
            guild_id: "guild-1",
        }).allowed).toBe(true);
        expect(authorizeDiscordInteraction({
            ...baseInteraction,
            guild_id: "guild-2",
        }).allowed).toBe(false);
    });
});
