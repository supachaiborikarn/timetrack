// Canonical VGCloud site codes for the three fuel stations used by TimeTrack.
// Keep these as strings because Kebdao displays the site ID with leading zeros.
const VG_SITE_CODE_BY_TIMETRACK_STATION: Record<string, string> = {
    WKO: "394",
    PAP: "1204",
    SPC: "656",
};

export function getVgcloudSiteCode(stationCode: string | null | undefined): string | null {
    if (!stationCode) return null;
    return VG_SITE_CODE_BY_TIMETRACK_STATION[stationCode] ?? null;
}

export function getKebdaoOutletId(stationCode: string | null | undefined): string | null {
    const siteCode = getVgcloudSiteCode(stationCode);
    return siteCode ? siteCode.padStart(4, "0") : null;
}
