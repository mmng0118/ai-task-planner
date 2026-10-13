"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setIsLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage("ログインを開始できませんでした。設定を確認して、もう一度お試しください。");
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand-dots" aria-hidden="true"><i /><i /><i /></div>
        <p className="login-eyebrow">AI Task Planner</p>
        <h1 id="login-title">ログイン</h1>
        <p className="login-description">タスクを管理するには、Googleアカウントでログインしてください。</p>
        <button
          className="google-login-button"
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading}
        >
          <span className="google-login-mark" aria-hidden="true">G</span>
          {isLoading ? "Googleに接続しています…" : "Googleでログイン"}
        </button>
        {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}
      </section>
    </main>
  );
}
