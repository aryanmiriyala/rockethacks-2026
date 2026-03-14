// feat/vision-identify — owns this route
import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/services/s3";
import type { UploadUrlRequest, UploadUrlResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { filename, contentType }: UploadUrlRequest = await req.json();

  const s3Key = `uploads/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(s3Key, contentType);

  return NextResponse.json({ uploadUrl, s3Key } satisfies UploadUrlResponse);
}
