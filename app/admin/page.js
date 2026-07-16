"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isConfigured, BUCKET } from "../../lib/supabase";

const SECTIONS = [
  { key: "women", label: "Women's Wear" },
  { key: "kids", label: "Kids' Wear" },
  { key: "ornaments", label: "Covering & Rentals" },
];

export default function Admin() {
  const [view, setView] = useState("loading"); // loading | login | forgot | reset | dash
  const [section, setSection] = useState("women");
  const [photos, setPhotos] = useState(null); // null = loading
  const [msg, setMsg] = useState({ text: "", kind: "" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [toastText, setToastText] = useState("");
  const [confirmPath, setConfirmPath] = useState(null);
  const [drag, setDrag] = useState(false);
  const recovering = useRef(false);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  const toast = useCallback((t) => {
    setToastText(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(""), 2600);
  }, []);

  /* ---------- auth state ---------- */
  useEffect(() => {
    if (!isConfigured) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recovering.current = true;
        setView("reset");
        return;
      }
      if (recovering.current) return;
      setView(session ? "dash" : "login");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- load photos ---------- */
  const loadGrid = useCallback(async (sec) => {
    setPhotos(null);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(sec, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
      setPhotos([]);
      return;
    }
    const files = (data || []).filter((f) => f.name && !f.name.startsWith("."));
    setPhotos(
      files.map((f) => ({
        path: `${sec}/${f.name}`,
        url: supabase.storage.from(BUCKET).getPublicUrl(`${sec}/${f.name}`).data
          .publicUrl,
      }))
    );
  }, []);

  useEffect(() => {
    if (view === "dash") loadGrid(section);
  }, [view, section, loadGrid]);

  /* ---------- handlers ---------- */
  async function onLogin(e) {
    e.preventDefault();
    setMsg({ text: "", kind: "" });
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) setMsg({ text: "Sign-in failed: " + error.message, kind: "err" });
  }

  async function onForgot(e) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(form.get("femail")).trim(),
      { redirectTo: window.location.origin + "/admin" }
    );
    setBusy(false);
    if (error) setMsg({ text: error.message, kind: "err" });
    else
      setMsg({
        text: "Reset link sent — check the email inbox (and spam folder).",
        kind: "ok",
      });
  }

  async function onReset(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const p1 = String(form.get("npass"));
    const p2 = String(form.get("npass2"));
    if (p1 !== p2) {
      setMsg({ text: "Passwords do not match.", kind: "err" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) setMsg({ text: error.message, kind: "err" });
    else {
      recovering.current = false;
      toast("Password updated");
      setMsg({ text: "", kind: "" });
      setView("dash");
    }
  }

  async function onDelete(path) {
    if (confirmPath !== path) {
      setConfirmPath(path);
      setTimeout(() => setConfirmPath((c) => (c === path ? null : c)), 2500);
      return;
    }
    setConfirmPath(null);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) toast("Delete failed: " + error.message);
    else {
      setPhotos((ps) => (ps || []).filter((p) => p.path !== path));
      toast("Photo deleted");
    }
  }

  function resizeImage(file, maxSide = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (Math.max(w, h) > maxSide) {
          const k = maxSide / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
        }
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        cv.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("resize failed"))),
          "image/jpeg",
          quality
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("not an image"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      toast("Please choose image files");
      return;
    }
    setUploading(files.length);
    let ok = 0,
      fail = 0;
    for (const f of files) {
      try {
        const blob = await resizeImage(f);
        const name = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${section}/${name}`, blob, { contentType: "image/jpeg" });
        if (error) fail++;
        else ok++;
      } catch {
        fail++;
      }
    }
    setUploading(0);
    toast(`${ok} uploaded${fail ? `, ${fail} failed` : ""}`);
    loadGrid(section);
  }

  /* ---------- render ---------- */
  if (!isConfigured) {
    return (
      <div className="adm">
        <Topbar />
        <div className="config-warn">
          <b style={{ color: "#f4f1ea" }}>Setup needed.</b>
          <br />
          <br />
          This admin page isn&rsquo;t connected yet. Add{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel → Project →
          Settings → Environment Variables, then redeploy.
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <Topbar
        showSignOut={view === "dash"}
        onSignOut={async () => {
          await supabase.auth.signOut();
          setView("login");
        }}
      />

      {view === "loading" && (
        <div className="center">
          <p style={{ color: "#8f8b82" }}>Loading…</p>
        </div>
      )}

      {view === "login" && (
        <div className="center">
          <form className="card" onSubmit={onLogin}>
            <h1>
              Shop <em>admin</em>
            </h1>
            <p className="sub">Sign in to manage the gallery photos.</p>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" autoComplete="username" required />
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {msg.text && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
            <p className="aux">
              <a
                onClick={() => {
                  setMsg({ text: "", kind: "" });
                  setView("forgot");
                }}
              >
                Forgot password?
              </a>
            </p>
          </form>
        </div>
      )}

      {view === "forgot" && (
        <div className="center">
          <form className="card" onSubmit={onForgot}>
            <h1>
              Reset <em>password</em>
            </h1>
            <p className="sub">Enter your email and we&rsquo;ll send a reset link.</p>
            <label htmlFor="femail">Email</label>
            <input type="email" id="femail" name="femail" required />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            {msg.text && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
            <p className="aux">
              <a
                onClick={() => {
                  setMsg({ text: "", kind: "" });
                  setView("login");
                }}
              >
                Back to sign in
              </a>
            </p>
          </form>
        </div>
      )}

      {view === "reset" && (
        <div className="center">
          <form className="card" onSubmit={onReset}>
            <h1>
              New <em>password</em>
            </h1>
            <p className="sub">Choose a new password for the admin account.</p>
            <label htmlFor="npass">New password</label>
            <input
              type="password"
              id="npass"
              name="npass"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <label htmlFor="npass2">Repeat new password</label>
            <input
              type="password"
              id="npass2"
              name="npass2"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </button>
            {msg.text && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
          </form>
        </div>
      )}

      {view === "dash" && (
        <div className="dash">
          <div className="dash-head">
            <div>
              <h1>
                Gallery <em>photos</em>
              </h1>
              <p>
                Add or remove the photos shown on the website. Changes are live
                immediately.
              </p>
            </div>
          </div>
          <div className="tabs">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`tab${section === s.key ? " on" : ""}`}
                onClick={() => setSection(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div
            className={`upload-zone${drag ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <>
                <span className="spin" /> Uploading {uploading} photo
                {uploading > 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <b>Tap to add photos</b> — or drag them here
                <span className="hint">
                  You can select several at once. Photos are resized
                  automatically so the site stays fast.
                </span>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="grid">
            {photos === null && <p className="empty">Loading…</p>}
            {photos && photos.length === 0 && (
              <p className="empty">No photos yet — add the first ones above.</p>
            )}
            {photos &&
              photos.map((p) => (
                <div className="ph" key={p.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" loading="lazy" />
                  <button
                    className={`del${confirmPath === p.path ? " sure" : ""}`}
                    title="Delete photo"
                    onClick={() => onDelete(p.path)}
                  >
                    {confirmPath === p.path ? "Delete?" : "✕"}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className={`toast${toastText ? " show" : ""}`}>{toastText}</div>
    </div>
  );
}

function Topbar({ showSignOut, onSignOut }) {
  return (
    <div className="topbar">
      <span className="amark">
        <span className="rd">S</span>HADO<span className="rd">W</span>
        <em>collections</em>
        <small>Admin</small>
      </span>
      {showSignOut && (
        <button className="btn ghost sm" onClick={onSignOut}>
          Sign out
        </button>
      )}
    </div>
  );
}
