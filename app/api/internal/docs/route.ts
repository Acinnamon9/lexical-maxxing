import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 },
    );
  }

  // Security: Only allow specific paths
  const allowedPrefixes = [".agent/", "docs/", "README.md"];

  const isAllowed = allowedPrefixes.some((prefix) =>
    filePath.startsWith(prefix),
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const fullPath = join(process.cwd(), filePath);
    const content = await readFile(fullPath, "utf-8");

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
