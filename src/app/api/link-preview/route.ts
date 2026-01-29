import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["docs.google.com", "forms.gle"]);
const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=86400";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type PreviewPayload =
  | { url: string; title: string; image: string }
  | { error: string };

function json(
  payload: PreviewPayload,
  init?: { status?: number; headers?: HeadersInit }
) {
  return NextResponse.json(payload, init);
}

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function hostAllowed(u: URL) {
  return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
}

function extractFirstMeta(html: string, keys: string[]) {
  for (const key of keys) {
    // property="og:*" ou name="twitter:*"
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${escapeRegExp(key)}["'][^>]*content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+name=["']${escapeRegExp(key)}["'][^>]*content=["']([^"']+)["']`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return "";
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteUrl(maybeRelative: string, base: string) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");

  if (!raw) return json({ error: "Missing url" }, { status: 400 });

  const target = safeUrl(raw);
  if (!target) return json({ error: "Invalid url" }, { status: 400 });

  if (!hostAllowed(target))
    return json({ error: "Host not allowed" }, { status: 400 });

  let res: Response;

  try {
    res = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        // opcional, mas ajuda alguns previews
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return json({ error: "Preview unavailable" }, { status: 502 });
  }

  if (!res.ok) {
    return json({ error: "Failed to fetch" }, { status: res.status });
  }

  const html = await res.text();
  const finalUrl = res.url;

  const title =
    extractFirstMeta(html, ["og:title", "twitter:title"]) || extractTitleTag(html);

  const image = extractFirstMeta(html, ["og:image", "twitter:image"]);
  const normalizedImage = image ? absoluteUrl(image, finalUrl) : "";

  return json(
    { url: finalUrl, title, image: normalizedImage },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
