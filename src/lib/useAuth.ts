import { useContext } from "react";
import { AuthContext } from "@/lib/authContext";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
};
