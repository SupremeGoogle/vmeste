import { describe, expect, it, vi, beforeEach } from "vitest";
import { findGuestAppearance, readGuestAppearance, guestAppearanceVariables, GUEST_APPEARANCES } from "@/lib/guest-appearance";
import type { EventContext } from "@/server/context";

const mocks = vi.hoisted(() => ({ merge: vi.fn() }));
vi.mock("@/server/repositories/print-design", () => ({ mergePrintDesignJson: mocks.merge }));
import { saveGuestAppearance } from "@/server/services/guest-appearance";

const ctx: EventContext = { kind: "org", eventId: "wedding-a", orgId: "org-a", userId: "owner", role: "OWNER" };
function luminance(hex: string) {
  const values = hex.slice(1).match(/../g)!.map((part) => parseInt(part, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
function contrast(a: string, b: string) { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); }

describe("QR guest appearance", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps old and malformed design documents usable", () => {
    for (const value of [null, undefined, [], "rose", {}, { guestSite: "missing" }, { guestSite: { id: "rose" } }]) expect(readGuestAppearance(value)).toBeNull();
    expect(readGuestAppearance({ seating: { title: "Keep me" }, guestSite: "rose" })?.id).toBe("rose");
  });
  it("rejects forged IDs without writing data", async () => {
    for (const id of [null, "", "url(https://example.test/x)", "__proto__", { id: "rose" }]) expect(await saveGuestAppearance(ctx, id)).toBe(false);
    expect(mocks.merge).not.toHaveBeenCalled();
  });
  it("writes only the guest-site setting in the authenticated event scope", async () => {
    await expect(saveGuestAppearance(ctx, "night")).resolves.toBe(true);
    expect(mocks.merge).toHaveBeenCalledWith(ctx, { guestSite: "night" });
    await expect(saveGuestAppearance(ctx, "original")).resolves.toBe(true);
    expect(mocks.merge).toHaveBeenLastCalledWith(ctx, { guestSite: null });
  });
  it("does not report success when persistence fails", async () => {
    mocks.merge.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(saveGuestAppearance(ctx, "sage")).rejects.toThrow("Database unavailable");
  });
  for (const theme of GUEST_APPEARANCES) it(`${theme.id}: text and primary button have at least 4.5:1 contrast`, () => {
    expect(findGuestAppearance(theme.id)).toBe(theme);
    for (const background of [theme.paper, theme.card]) {
      expect(contrast(theme.ink, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.muted, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(theme.accent, guestAppearanceVariables(theme)["--guest-button-ink"])).toBeGreaterThanOrEqual(4.5);
  });
});
