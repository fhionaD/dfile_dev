"use client";

import { useState } from "react";
import { LoginPage } from "@/components/login-page";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<import("@/types/asset").User>({ name: "", role: "Admin", roleLabel: "" });

  if (!isLoggedIn) {
    return <LoginPage onLogin={(user) => {
      setCurrentUser(user);
      setIsLoggedIn(true);
    }} />;
  }

  return <AppShell currentUser={currentUser} onLogout={() => setIsLoggedIn(false)} />;
}
