// feat/vision-identify — owns this route
import { NextRequest, NextResponse } from "next/server";
import { createUploadUrl } from "@/server/services/storage";
import type { UploadUrlRequest, UploadUrlResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  const { filename, contentType }: UploadUrlRequest = await req.json();

  const { uploadUrl, s3Key } = await createUploadUrl(filename, contentType);

  return NextResponse.json({ uploadUrl, s3Key } satisfies UploadUrlResponse);
}
