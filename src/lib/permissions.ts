import { useMemo } from "react";
import { useAuth } from "@/lib/auth";

export const getPermissions = () => {
  const raw = localStorage.getItem("permissions") || "";
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
};

export const usePermissions = () => {
  const { permissions, ready } = useAuth();
  const has = useMemo(() => (perm: string) => permissions.includes(perm), [permissions]);
  return { permissions, has, ready };
};
