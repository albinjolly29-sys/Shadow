"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isConfigured, BUCKET } from "../lib/supabase";

const PHONE = "919645257898";
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=X8Q8%2BWP5%20Chakkaraparambu%20Vennala%20Ernakulam%20Kerala%20682032";

const GALLERIES = {
  women: {
    title: (
      <>
        Women&rsquo;s <em>wear</em>
      </>
    ),
    photos: [
      { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=900&auto=format&fit=crop", cap: "Everyday elegance" },
      { src: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=900&auto=format&fit=crop", cap: "Occasion wear" },
      { src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=900&auto=format&fit=crop", cap: "Season's styles" },
      { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=900&auto=format&fit=crop", cap: "New arrivals" },
      { src: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop", cap: "On the racks" },
      { src: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=900&auto=format&fit=crop", cap: "Festive picks" },
    ],
  },
  kids: {
    title: (
      <>
        Kids&rsquo; <em>wear</em>
      </>
    ),
    photos: [
      { src: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=900&auto=format&fit=crop", cap: "Little ones" },
      { src: "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?q=80&w=900&auto=format&fit=crop", cap: "Playtime ready" },
      { src: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=900&auto=format&fit=crop", cap: "For the tiniest" },
      { src: "https://images.unsplash.com/photo-1476234251651-f353703a034d?q=80&w=900&auto=format&fit=crop", cap: "Everyday comfort" },
      { src: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=900&auto=format&fit=crop", cap: "Mom & me" },
    ],
  },
  ornaments: {
    title: (
      <>
        Gold covering &amp; <em>rental ornaments</em>
      </>
    ),
    photos: [
      { src: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop", cap: "Detail work" },
      { src: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=900&auto=format&fit=crop", cap: "Bridal sets" },
      { src: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=900&auto=format&fit=crop", cap: "Classic pieces" },
      { src: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=900&auto=format&fit=crop", cap: "Haarams & chains" },
      { src: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?q=80&w=900&auto=format&fit=crop", cap: "For the big day" },
    ],
  },
};

export default function Home() {
  const [day, setDay] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gallery, setGallery] = useState(null); // { key, photos, live }
  const progressRef = useRef(null);
  const liveCache = useRef({});

  /* day / night mode */
  useEffect(() => {
    document.body.classList.toggle("day", day);
  }, [day]);

  /* reveal on scroll */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".rv, .row").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* scroll progress bar */
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (progressRef.current) {
        progressRef.current.style.width =
          (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
      }
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  /* lock body scroll + Esc while gallery open */
  useEffect(() => {
    document.body.style.overflow = gallery ? "hidden" : "";
    const onKey = (e) => {
      if (e.key === "Escape") setGallery(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [gallery]);

  async function fetchLivePhotos(key) {
    if (!isConfigured) return null;
    if (liveCache.current[key] !== undefined) return liveCache.current[key];
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(key, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const files = (data || []).filter((f) => f.name && !f.name.startsWith(".") && f.id);
      const photos = files.map((f) => ({
        src: supabase.storage.from(BUCKET).getPublicUrl(`${key}/${f.name}`).data.publicUrl,
        cap: "",
      }));
      liveCache.current[key] = photos.length ? photos : null;
    } catch {
      liveCache.current[key] = null;
    }
    return liveCache.current[key];
  }

  async function openGallery(key) {
    setGallery({ key, photos: [], live: false, loading: true });
    const live = await fetchLivePhotos(key);
    setGallery({
      key,
      photos: live || GALLERIES[key].photos,
      live: Boolean(live),
      loading: false,
    });
  }

  const nav = (e, hash) => {
    setMenuOpen(false);
  };

  return (
    <>
      <div className="progress" ref={progressRef} />

      <div className="ribbon">
        <span>Chakkaraparambu · Vennala · Kochi</span>
        <span>
          Women <b>/</b> Kids <b>/</b> Gold Covering &amp; Rental Ornaments
        </span>
      </div>

      <header>
        <div className="nav">
          <a className="wordmark" href="#top">
            <span className="mark">
              <span className="rd">S</span>HADO<span className="rd">W</span>
            </span>
            <em>collections</em>
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className={`navlinks${menuOpen ? " open" : ""}`}>
              <a href="#collections" onClick={nav}>Collections</a>
              <a href="#rent" onClick={nav}>Gold Covering &amp; Rentals</a>
              <a href="#story" onClick={nav}>Our Story</a>
              <a href="#reviews" onClick={nav}>Reviews</a>
              <a href="#visit" onClick={nav}>Visit</a>
            </div>
            <button
              className="mode-btn"
              aria-label={day ? "Switch to night mode" : "Switch to day mode"}
              title="Day / night mode"
              onClick={() => setDay((d) => !d)}
            >
              {day ? "☾" : "☀"}
            </button>
            <button
              className="menu-btn"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              ☰
            </button>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="over">Est. Vennala — Ernakulam, Kerala</p>
            <h1>
              Dressing the
              <br />
              women <span className="it">&amp;</span> little
              <br />
              ones of <span className="it">Kochi.</span>
            </h1>
            <p className="hero-sub">
              A neighbourhood boutique on Chakkaraparambu road — carefully chosen
              women&rsquo;s wear, playful kids&rsquo; fashion, and Malabar gold covering
              &amp; rental ornaments for the days that matter.
            </p>
            <div className="hero-cta">
              <a className="linelink u" href="#collections">
                Browse the racks <span className="arr">→</span>
              </a>
              <a className="ghostlink" href="#visit">
                Find the shop
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
                alt="Fashion editorial"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="veil" />
            </figure>
            <p className="vertical">Shadow Collections — Vennala</p>
            <div className="stamp">
              <span className="no">№ 01</span>
              <p>Malabar gold covering &amp; rental ornaments — ask in store</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((i) => (
            <span key={i} style={{ display: "contents" }}>
              <span>Kurtis &amp; sets</span>
              <span className="sep">✦</span>
              <span>Sarees for the season</span>
              <span className="sep">✦</span>
              <span>Kids&rsquo; partywear</span>
              <span className="sep">✦</span>
              <span>Malabar gold covering</span>
              <span className="sep">✦</span>
              <span>Rental ornaments</span>
              <span className="sep">✦</span>
              <span>New arrivals weekly</span>
              <span className="sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ================= COLLECTIONS ================= */}
      <section id="collections">
        <div className="wrap">
          <div className="sec-mark rv">
            <h2>
              The <em>collections</em>
            </h2>
            <span className="idx">( 01 — 03 )</span>
          </div>

          <div className="row rv">
            <span className="num">
              <b>/</b> 01
            </span>
            <div className="txt">
              <h3>Women&rsquo;s wear, chosen with care</h3>
              <p className="desc">
                From everyday cottons to occasion-ready silks — pieces picked for
                how they feel as much as how they look. Sizes and styles for
                every woman who walks in.
              </p>
              <div className="tags">
                <span className="tag">Kurtis</span>
                <span className="tag">Churidar sets</span>
                <span className="tag">Sarees</span>
                <span className="tag">Tops &amp; casuals</span>
                <span className="tag">Nightwear</span>
              </div>
              <button className="linelink" onClick={() => openGallery("women")}>
                View the gallery <span className="arr">→</span>
              </button>
            </div>
            <figure onClick={() => openGallery("women")}>
              <span className="corner">Women</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop"
                alt="Women's fashion"
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </figure>
          </div>

          <div className="row flip rv">
            <span className="num">
              <b>/</b> 02
            </span>
            <figure onClick={() => openGallery("kids")}>
              <span className="corner">Kids</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1200&auto=format&fit=crop"
                alt="Kids' fashion"
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </figure>
            <div className="txt">
              <h3>Little wardrobes, big personalities</h3>
              <p className="desc">
                Soft, sturdy, and made for play — frocks, sets and partywear the
                kids will actually want to wear, at prices parents will actually
                like.
              </p>
              <div className="tags">
                <span className="tag">Frocks</span>
                <span className="tag">Party dresses</span>
                <span className="tag">Sets &amp; tees</span>
                <span className="tag">Ethnic for kids</span>
              </div>
              <button className="linelink" onClick={() => openGallery("kids")}>
                View the gallery <span className="arr">→</span>
              </button>
            </div>
          </div>

          <div className="row rv">
            <span className="num">
              <b>/</b> 03
            </span>
            <div className="txt">
              <h3>Malabar gold covering &amp; rental ornaments</h3>
              <p className="desc">
                Weddings, engagements, Onam — get the full bridal look in premium
                Malabar gold covering. Buy your favourites, or rent complete
                ornament sets by the occasion.
              </p>
              <div className="tags">
                <span className="tag">Bridal sets</span>
                <span className="tag">Haarams</span>
                <span className="tag">Bangles</span>
                <span className="tag">Earrings</span>
                <span className="tag">Rental sets</span>
              </div>
              <button className="linelink" onClick={() => openGallery("ornaments")}>
                View the gallery <span className="arr">→</span>
              </button>
            </div>
            <figure onClick={() => openGallery("ornaments")}>
              <span className="corner">Covering &amp; Rentals</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop"
                alt="Gold jewellery"
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </figure>
          </div>
        </div>
      </section>

      {/* ================= RENT FEATURE ================= */}
      <section className="rent" id="rent">
        <span className="halo">on rent</span>
        <div className="wrap rv">
          <p className="kick">The Shadow Speciality</p>
          <h2>
            All the gold looks,
            <br />
            <em>none of the gold price.</em>
          </h2>
          <p>
            Malabar gold covering &amp; rental ornaments — one of Kerala&rsquo;s
            best-kept secrets, and our speciality. Tell us the occasion and the
            look you want; we&rsquo;ll set aside the pieces, you collect them
            before the event and return the rentals after. Simple.
          </p>
          <div className="hero-cta" style={{ marginTop: 46 }}>
            <a
              className="linelink u"
              href={`https://wa.me/${PHONE}?text=Hi%20Shadow%20Collections%2C%20I%27d%20like%20to%20ask%20about%20gold%20covering%20and%20rental%20ornaments.`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask about a date <span className="arr">→</span>
            </a>
            <a className="ghostlink" href={`tel:+${PHONE}`}>
              Or call the shop
            </a>
          </div>
        </div>
      </section>

      {/* ================= STORY ================= */}
      <section id="story">
        <div className="wrap story-grid">
          <figure className="rv">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop"
              alt="Inside the boutique"
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </figure>
          <div className="story-copy rv">
            <p className="lede">
              Shadow Collections is a small shop with a <em>big wardrobe</em> —
              run the old way: you walk in, you&rsquo;re welcomed, and you leave
              with something you love.
            </p>
            <p className="rest">
              Tucked into Chakkaraparambu in Vennala, we keep the racks fresh,
              the prices honest, and the service personal. Whether it&rsquo;s a
              kurti for the office, a frock for a first birthday, or a rental
              haaram for a wedding day — we&rsquo;ll help you find it.
            </p>
            <p className="sig">— Shadow Collections, Vennala</p>
          </div>
        </div>
      </section>

      {/* ================= REVIEWS ================= */}
      <section className="reviews" id="reviews">
        <div className="wrap">
          <div className="sec-mark rv">
            <h2>
              Kind <em>words</em>
            </h2>
            <span className="idx">( From our customers )</span>
          </div>
          <div className="rev-grid rv">
            <div className="rev">
              <span className="qm">“</span>
              <div className="stars">★★★★★</div>
              <blockquote>
                Rented a full bridal set for my sister&rsquo;s engagement —{" "}
                <em>everyone thought it was real gold.</em> Collection and return
                were completely hassle-free.
              </blockquote>
              <p className="who">
                <b>Customer review</b>Vennala
              </p>
            </div>
            <div className="rev">
              <span className="qm">“</span>
              <div className="stars">★★★★★</div>
              <blockquote>
                My go-to shop for kurtis. The owner has a <em>great eye</em> —
                she&rsquo;ll pull out exactly what suits you. Honest prices too.
              </blockquote>
              <p className="who">
                <b>Customer review</b>Palarivattom
              </p>
            </div>
            <div className="rev">
              <span className="qm">“</span>
              <div className="stars">★★★★★</div>
              <blockquote>
                Bought my daughter&rsquo;s birthday frock here.{" "}
                <em>Lovely collection for kids</em> and very patient, friendly
                service.
              </blockquote>
              <p className="who">
                <b>Customer review</b>Chakkaraparambu
              </p>
            </div>
          </div>
          <p className="rev-foot rv">
            Shopped with us?{" "}
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Leave us a review on Google
            </a>
          </p>
        </div>
      </section>

      {/* ================= VISIT ================= */}
      <section className="visit" id="visit">
        <div className="wrap">
          <div className="sec-mark rv">
            <h2>
              Come <em>see us</em>
            </h2>
            <span className="idx">( Vennala · Kochi )</span>
          </div>
          <div className="visit-grid">
            <div className="rv">
              <p className="addr">
                Chakkaraparambu,
                <br />
                Vennala, Ernakulam
                <br />
                <em>Kerala — 682032</em>
              </p>
              <p className="visit-note">
                Plus code X8Q8+WP5 · on Chakkaraparambu road. Parking available
                nearby.
              </p>
              <a
                className="linelink u"
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps <span className="arr">→</span>
              </a>
            </div>
            <dl className="dl rv">
              <div className="r">
                <dt>Hours</dt>
                <dd>
                  Mon – Sun, 9:30 am – 8:30 pm<small>update if different</small>
                </dd>
              </div>
              <div className="r">
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:+${PHONE}`}>+91 96452 57898</a>
                  <small>call for enquiries</small>
                </dd>
              </div>
              <div className="r">
                <dt>WhatsApp</dt>
                <dd>
                  <a
                    href={`https://wa.me/${PHONE}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    +91 96452 57898
                  </a>
                  <small>enquiries &amp; ornament bookings</small>
                </dd>
              </div>
              <div className="r">
                <dt>Landmark</dt>
                <dd>
                  Chakkaraparambu Junction<small>Vennala, Kochi</small>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <p className="giant">
            <i>S</i>HADO<i>W</i>
          </p>
          <div className="foot-row">
            <span>© 2026 Shadow Collections</span>
            <div className="links">
              <a href="#collections">Collections</a>
              <a href="#rent">Covering &amp; Rentals</a>
              <a href="#visit">Visit</a>
            </div>
            <span>Vennala · Ernakulam · Kerala</span>
          </div>
        </div>
      </footer>

      <a
        className="wa"
        href={`https://wa.me/${PHONE}?text=Hi%20Shadow%20Collections!`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="dot" /> WhatsApp
      </a>

      {/* ================= GALLERY LIGHTBOX ================= */}
      {gallery && (
        <div
          className="gbox open"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGallery(null);
          }}
        >
          <div className="gbox-head">
            <h3>{GALLERIES[gallery.key].title}</h3>
            <button
              className="gbox-close"
              aria-label="Close gallery"
              onClick={() => setGallery(null)}
            >
              ✕
            </button>
          </div>
          <div className="gbox-grid">
            {gallery.photos.map((p, i) => (
              <figure key={p.src + i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.cap || "Shadow Collections"}
                  loading="lazy"
                  onError={(e) => {
                    const f = e.currentTarget.closest("figure");
                    if (f) f.remove();
                  }}
                />
                {p.cap ? <figcaption>{p.cap}</figcaption> : null}
              </figure>
            ))}
          </div>
          {!gallery.live && !gallery.loading && (
            <p className="gbox-note">
              Sample photos for now — the shop&rsquo;s own pieces are coming
              soon. Visit us or{" "}
              <a
                href={`https://wa.me/${PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp us
              </a>{" "}
              to see the latest stock.
            </p>
          )}
        </div>
      )}
    </>
  );
}
