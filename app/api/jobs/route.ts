import { NextResponse } from "next/server";

type RawJob = any;

type CompanyAgg = {
    id: string;
    name: string;
    website?: string;
    locations: Map<string, number>;
    openRoles: number;
    remoteCount: number;
    lastPostedAt?: string;
    topTitles: Map<string, number>;
};

function safeStr(v: any, fallback = ""): string {
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function normalizeJob(job: any) {
    // Supports multiple job payload shapes
    const title =
        safeStr(job.title) ||
        safeStr(job.job_title) ||
        safeStr(job.jobTitle) ||
        "Unknown Role";

    const company =
        safeStr(job.company?.name) ||
        safeStr(job.company_name) ||
        safeStr(job.employer_name) ||
        safeStr(job.company) ||
        "Unknown Company";

    const location =
        safeStr(job.location) ||
        safeStr(job.job_city) ||
        safeStr(job.job_location) ||
        safeStr(job.job_country) ||
        "Remote";

    const date =
        safeStr(job.post_date) ||
        safeStr(job.posted_at) ||
        safeStr(job.job_posted_at_datetime_utc) ||
        safeStr(job.date) ||
        new Date().toISOString();

    const url =
        safeStr(job.link) ||
        safeStr(job.url) ||
        safeStr(job.job_apply_link) ||
        safeStr(job.apply_url) ||
        "";

    const companyWebsite =
        safeStr(job.company?.website) ||
        safeStr(job.company_website) ||
        safeStr(job.employer_website) ||
        "";

    return { title, company, location, date, url, companyWebsite };
}

function isRemoteLocation(loc: string) {
    const l = (loc || "").toLowerCase();
    return l.includes("remote") || l.includes("work from home") || l === "remote";
}

function isoMax(a?: string, b?: string) {
    if (!a) return b;
    if (!b) return a;
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    if (Number.isNaN(ta)) return b;
    if (Number.isNaN(tb)) return a;
    return ta >= tb ? a : b;
}

function slugId(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function computeTags(name: string, remotePct: number, openRoles: number) {
    const tags: string[] = [];
    if (remotePct >= 60) tags.push("Remote-heavy");
    if (remotePct >= 30 && remotePct < 60) tags.push("Remote-friendly");
    if (openRoles >= 25) tags.push("High hiring");
    if (openRoles >= 10 && openRoles < 25) tags.push("Hiring");
    if (/university|college|institute/i.test(name)) tags.push("University");
    if (/bank|capital|financial|finance/i.test(name)) tags.push("Finance");
    if (/health|hospital|medical|bio/i.test(name)) tags.push("Healthcare");
    if (/consult|advis/i.test(name)) tags.push("Consulting");
    if (/tech|software|systems|cloud/i.test(name)) tags.push("Tech");
    return tags.slice(0, 5);
}

/**
 * Configure your RapidAPI details here.
 * You MUST set these in .env.local:
 * - RAPID_API_KEY=...
 * - RAPID_API_HOST=... (e.g. "ats-jobs-db.p.rapidapi.com")
 * - RAPID_API_URL=...  (e.g. "https://ats-jobs-db.p.rapidapi.com/jobs")
 *
 * If your ATS Jobs DB endpoint differs, update RAPID_API_URL accordingly.
 */
async function fetchJobsFromRapidApi(query: string, location: string) {
    const key = process.env.RAPID_API_KEY?.trim();
    const host = process.env.RAPID_API_HOST?.trim();
    const urlRaw = process.env.RAPID_API_URL?.trim();

    if (!key || !host || !urlRaw) {
        return {
            ok: false as const,
            error: "Missing RAPID_API_KEY / RAPID_API_HOST / RAPID_API_URL",
        };
    }

    let u: URL;
    try {
        // Ensure urlRaw is a valid absolute URL
        u = new URL(urlRaw);
    } catch {
        return {
            ok: false as const,
            error:
                "Invalid RAPID_API_URL. It must be a full URL like https://... (check .env.local).",
        };
    }

    u.searchParams.set("query", query);
    u.searchParams.set("location", location);

    const res = await fetch(u.toString(), {
        headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": host,
        },
        next: { revalidate: 60 },
    });

    let json: any = {};
    try {
        json = await res.json();
    } catch {
        // ignore
    }

    if (!res.ok) {
        return {
            ok: false as const,
            error: json?.error || `RapidAPI error (${res.status})`,
        };
    }

    const data = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
            ? json
            : [];

    return { ok: true as const, data };
}


function fallbackJobs(): RawJob[] {
    const now = new Date();
    const iso = (d: Date) => d.toISOString();
    return [
        { title: "Software Engineer Intern", company: { name: "Microsoft" }, location: "Redmond, WA", post_date: iso(now) },
        { title: "Data Analyst Intern", company: { name: "Amazon" }, location: "Seattle, WA", post_date: iso(now) },
        { title: "Product Manager Intern", company: { name: "Google" }, location: "Mountain View, CA", post_date: iso(now) },
        { title: "SWE Intern", company: { name: "Stripe" }, location: "Remote", post_date: iso(now) },
        { title: "Backend Engineer", company: { name: "Shopify" }, location: "Remote", post_date: iso(now) },
        { title: "ML Engineer Intern", company: { name: "NVIDIA" }, location: "Santa Clara, CA", post_date: iso(now) },
    ];
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("query") || "software";
    const location = searchParams.get("location") || "United States";
    const remoteOnly = searchParams.get("remoteOnly") === "1";

    const sort = (searchParams.get("sort") || "openRoles") as "openRoles" | "recent" | "remotePct";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(48, Math.max(6, Number(searchParams.get("limit") || 18)));

    // 1) Fetch jobs (live or fallback)
    const live = await fetchJobsFromRapidApi(query, location);

    const source: "live" | "fallback" = live.ok ? "live" : "fallback";
    const rawJobs: RawJob[] = live.ok ? live.data : fallbackJobs();

    // 2) Aggregate into companies
    const map = new Map<string, CompanyAgg>();

    for (const r of rawJobs) {
        const j = normalizeJob(r);

        if (!j.company || j.company === "Unknown Company") continue;
        if (remoteOnly && !isRemoteLocation(j.location)) continue;

        const key = slugId(j.company);
        const existing = map.get(key);

        if (!existing) {
            map.set(key, {
                id: key,
                name: j.company,
                website: j.companyWebsite || undefined,
                locations: new Map([[j.location, 1]]),
                openRoles: 1,
                remoteCount: isRemoteLocation(j.location) ? 1 : 0,
                lastPostedAt: j.date,
                topTitles: new Map([[j.title, 1]]),
            });
        } else {
            existing.openRoles += 1;
            existing.lastPostedAt = isoMax(existing.lastPostedAt, j.date);
            existing.remoteCount += isRemoteLocation(j.location) ? 1 : 0;
            existing.website = existing.website || j.companyWebsite || undefined;

            existing.locations.set(j.location, (existing.locations.get(j.location) || 0) + 1);
            existing.topTitles.set(j.title, (existing.topTitles.get(j.title) || 0) + 1);
        }
    }

    // 3) Convert to response list
    const companies = Array.from(map.values()).map((c) => {
        const locationsSorted = Array.from(c.locations.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([loc]) => loc)
            .slice(0, 5);

        const topTitlesSorted = Array.from(c.topTitles.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([t]) => t)
            .slice(0, 5);

        const remotePct = c.openRoles ? Math.round((c.remoteCount / c.openRoles) * 100) : 0;

        return {
            id: c.id,
            name: c.name,
            website: c.website,
            locations: locationsSorted,
            openRoles: c.openRoles,
            remotePct,
            lastPostedAt: c.lastPostedAt,
            topTitles: topTitlesSorted,
            tags: computeTags(c.name, remotePct, c.openRoles),
        };
    });

    // 4) Sort
    companies.sort((a, b) => {
        if (sort === "openRoles") return b.openRoles - a.openRoles;
        if (sort === "remotePct") return b.remotePct - a.remotePct;
        // recent
        const ta = a.lastPostedAt ? new Date(a.lastPostedAt).getTime() : 0;
        const tb = b.lastPostedAt ? new Date(b.lastPostedAt).getTime() : 0;
        return tb - ta;
    });

    // 5) Paginate
    const total = companies.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = companies.slice(start, end);

    return NextResponse.json({
        ok: true,
        source,
        total,
        page,
        limit,
        companies: paged,
        error: live.ok ? undefined : live.error,
    });
}
