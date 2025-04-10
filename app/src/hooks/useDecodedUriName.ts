"use client";

import { useParams } from "next/navigation";

export function useDecodedUriName() {
  const params = useParams();
  const name = params.name as string[];

  return name?.map((x) => decodeURIComponent(x)).join("/");
}
