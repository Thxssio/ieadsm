import { NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new Response("Invalid protocol", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  try {
    const response = await fetch(target.toString(), { redirect: "follow" });
    if (!response.ok) {
      return new Response("Fetch failed", { status: 502 });
    }
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const data = await response.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
