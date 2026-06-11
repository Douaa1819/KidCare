"use client";

import { PlatformRedirect } from "@/components/platform/platform-redirect";

export default function PlatformTeachersPage() {
  return <PlatformRedirect href="/admin/platform/users?role=ENSEIGNANT" />;
}
