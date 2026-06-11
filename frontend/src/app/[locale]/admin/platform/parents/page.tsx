"use client";

import { PlatformRedirect } from "@/components/platform/platform-redirect";

export default function PlatformParentsPage() {
  return <PlatformRedirect href="/admin/platform/users?role=PARENT" />;
}
