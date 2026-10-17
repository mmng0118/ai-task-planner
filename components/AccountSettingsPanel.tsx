"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountSettingsPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadAccount() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setErrorMessage("ログイン中のアカウント情報を取得できませんでした。");
      } else {
        setEmail(data.user.email ?? null);
      }
      setIsLoading(false);
    }

    void loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    if (!window.confirm("ログアウトしますか？")) return;
    setIsSigningOut(true);
    setErrorMessage("");
    const { error } = await createClient().auth.signOut();
    if (error) {
      setErrorMessage("ログアウトできませんでした。もう一度お試しください。");
      setIsSigningOut(false);
      return;
    }
    window.location.assign("/login");
  }

  return (
    <section className="workspace settings-workspace">
      <div className="surface-card settings-card">
        <div className="color-ruler muted-ruler" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="section-title">設定</h1>
        <div className="settings-account">
          <h2>アカウント</h2>
          <p className="settings-account-label">ログイン中のメールアドレス</p>
          <p className="settings-account-email" aria-live="polite">
            {isLoading ? "確認中…" : email ?? "確認できません"}
          </p>
          <button className="settings-sign-out" type="button" onClick={signOut} disabled={isSigningOut || isLoading || !email}>
            {isSigningOut ? "ログアウトしています…" : "ログアウト"}
          </button>
          {errorMessage && <p className="settings-error" role="alert">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}
