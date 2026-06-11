"use client";

import { PlatformRedirect } from "@/components/platform/platform-redirect";

export default function PlatformAdminsPage() {
  return <PlatformRedirect href="/admin/platform/users?role=ADMIN" />;
}
