import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
// 1 hour
export const revalidate = 60 * 60;

const API_XML_URL = "https://qa.mainnet.mvr.mystenlabs.com/v1/sitemap";

export async function GET(_: NextRequest) {
  const xml = await fetch(API_XML_URL).then((res) => res.text());

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60",
    },
  });
}
