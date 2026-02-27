/**
 * VoltMatch Landing Page
 *
 * Built from Marketing Spec v8.6 + Chief of Staff Amendment.
 * Sections: Nav → Hero (with form) → Journey → Credibility → Final CTA → Footer
 *
 * Amendment overrides applied:
 *   1. Canonical 16 building types (from Data Point Spec v1.2)
 *   2. Standards footnote inside navy section
 *   3. DM Sans confirmed (not Satoshi)
 *   4. --green-cta / --green-cta-hover tokens used
 *   5. --surface-warm for journey + final CTA sections
 *   6. "How It Works" nav link kept
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BUILDING_TYPE_DISPLAY } from "@/lib/config/display-names";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILDING_TYPES = Object.entries(BUILDING_TYPE_DISPLAY).map(
  ([value, label]) => ({ value, label })
);

const TICKER_PROGRAMS = [
  "SaveOnEnergy",
  "Enbridge Gas",
  "Clean Technology Investment Tax Credit",
  "Hydro Ottawa",
  "Canada Greener Homes Loan",
  "Toronto Better Buildings",
  "BC Hydro",
  "Efficiency Nova Scotia",
  "Manitoba Hydro",
  "SaskPower",
  "Hydro-Québec",
  "NB Power",
  "CoolSaver",
  "Peak Perks",
  "Industrial Retrofit",
  "Small Business Programs",
];

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setNavScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Nav scrolled={navScrolled} />
      <HeroSection />
      <JourneySection />
      <CredibilitySection />
      <FinalCtaSection />
      <Footer />
    </>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(1rem, 3vw, 2rem)",
        transition: "all 0.3s ease",
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        boxShadow: scrolled ? "0 1px 0 var(--border)" : "none",
      }}
    >
      <a
        href="#hero"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <LogoMark size={32} />
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "1.15rem",
            letterSpacing: "-0.02em",
            color: scrolled ? "var(--navy)" : "white",
            transition: "color 0.3s ease",
          }}
        >
          VoltMatch
        </span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <a
          href="#journey"
          className="nav-link-desktop"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: scrolled ? "var(--muted)" : "rgba(255,255,255,0.7)",
            textDecoration: "none",
            transition: "color 0.3s ease",
          }}
        >
          How It Works
        </a>
        <a
          href="#hero-form"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "white",
            background: "var(--green-cta)",
            padding: "9px 20px",
            borderRadius: 8,
            textDecoration: "none",
            transition: "all 0.25s ease",
          }}
        >
          Find My Incentives
        </a>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nav-link-desktop { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Logo Mark (pure CSS, no image)
// ---------------------------------------------------------------------------

function LogoMark({ size = 32 }: { size?: number }) {
  const circleSize = size === 32 ? 12 : 9;
  const borderW = size === 32 ? 2.5 : 2;
  const offset = size === 32 ? 6 : 4;
  const radius = size === 32 ? 8 : 6;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(135deg, var(--green), var(--green-light))",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0, 168, 120, 0.3)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: circleSize,
          height: circleSize,
          border: `${borderW}px solid white`,
          borderRadius: "50%",
          left: offset,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: circleSize,
          height: circleSize,
          border: `${borderW}px solid rgba(255,255,255,0.5)`,
          borderRadius: "50%",
          right: offset,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Find energy incentives for your commercial building in Canada"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 1.5rem 3rem",
        background:
          "linear-gradient(170deg, #0B1D3A 0%, #132D54 40%, #1A3A6B 100%)",
        overflow: "hidden",
      }}
    >
      {/* Background overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse at 25% 40%, rgba(22,59,110,0.7) 0%, transparent 55%)",
            "radial-gradient(ellipse at 75% 25%, rgba(0,168,120,0.07) 0%, transparent 45%)",
            "radial-gradient(ellipse at 50% 90%, rgba(245,166,35,0.04) 0%, transparent 35%)",
          ].join(", "),
        }}
      />
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 680,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontWeight: 600,
            fontSize: "clamp(2.4rem, 5.5vw, 3.75rem)",
            color: "white",
            letterSpacing: "-0.025em",
            lineHeight: 1.08,
            margin: 0,
          }}
        >
          <span
            style={{
              display: "block",
              opacity: 0,
              animation: "fadeUp 0.65s ease 0.1s both",
            }}
          >
            <HeroUnderline>Incentives</HeroUnderline> in seconds.
          </span>
          <span
            style={{
              display: "block",
              opacity: 0,
              animation: "fadeUp 0.65s ease 0.5s both",
            }}
          >
            Energy plans <HeroUnderline>in minutes</HeroUnderline>.
          </span>
        </h1>

        <p
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontWeight: 600,
            fontSize: "clamp(1.25rem, 2.5vw, 1.65rem)",
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.01em",
            marginTop: "1.25rem",
            opacity: 0,
            animation: "fadeUp 0.65s ease 0.9s both",
          }}
        >
          Every program your building qualifies for. One search.
        </p>

        <div
          style={{
            opacity: 0,
            animation: "fadeUp 0.7s ease 1.15s both",
          }}
        >
          <HeroForm />
        </div>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0,
          animation: "fadeUp 0.7s ease 1.6s both",
        }}
      >
        <div
          style={{
            animation: "bobble 2.5s ease-in-out 2.3s infinite",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ display: "block" }}
          >
            <path
              d="M4 7l6 6 6-6"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

function HeroUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontWeight: 700,
        textDecoration: "underline",
        textDecorationColor: "var(--amber)",
        textUnderlineOffset: "5px",
        textDecorationThickness: "3px",
        textDecorationSkipInk: "none" as const,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero Form
// ---------------------------------------------------------------------------

function HeroForm() {
  const [postalCode, setPostalCode] = useState("");
  const [buildingType, setBuildingType] = useState("");

  const handlePostalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length > 3) v = v.slice(0, 3) + " " + v.slice(3);
    setPostalCode(v.slice(0, 7));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postalCode || !buildingType) return;
    // Store for results page and navigate
    const data = { postalCode, buildingType, timestamp: Date.now() };
    sessionStorage.setItem("voltmatch_incentive_match", JSON.stringify(data));
    window.location.href = `/scan/results?postal=${encodeURIComponent(postalCode)}&type=${encodeURIComponent(buildingType)}`;
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid var(--border)",
    borderRadius: 10,
    fontSize: "0.95rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)",
    background: "var(--surface)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted)",
    marginBottom: 5,
  };

  return (
    <div
      id="hero-form"
      style={{
        background: "var(--white)",
        borderRadius: 16,
        padding: "1.75rem 2rem 1.25rem",
        boxShadow:
          "0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)",
        marginTop: "1.5rem",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "'Source Serif 4', serif",
          fontWeight: 600,
          fontSize: "clamp(1.1rem, 2.2vw, 1.45rem)",
          color: "var(--text)",
          letterSpacing: "-0.01em",
          lineHeight: 1.4,
          marginBottom: "1.25rem",
          marginTop: 0,
        }}
      >
        Find your energy match. Yes, it&apos;s free. No commitment.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="hero-form-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="postal" style={labelStyle}>
              Postal Code
            </label>
            <input
              id="postal"
              type="text"
              placeholder="e.g. M5H 1T1"
              value={postalCode}
              onChange={handlePostalChange}
              maxLength={7}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--amber)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px var(--amber-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="building-type" style={labelStyle}>
              Building Type
            </label>
            <select
              id="building-type"
              value={buildingType}
              onChange={(e) => setBuildingType(e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                paddingRight: 36,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235A6B85' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                backgroundSize: "10px 6px",
                cursor: "pointer",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--amber)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px var(--amber-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">Select your building type</option>
              {BUILDING_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 14,
            border: "none",
            borderRadius: 10,
            background: "var(--green-cta)",
            color: "white",
            fontSize: "1rem",
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 12,
            transition: "all 0.25s ease",
          }}
        >
          Find My Incentives <span className="arr">→</span>
        </button>
      </form>

      {/* Proof badges */}
      <div
        className="proof-badges"
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          borderTop: "1px solid var(--border)",
          paddingTop: 14,
          marginTop: 14,
        }}
      >
        {["100% self-serve", "Vendors on your terms", "Results in minutes"].map(
          (label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.75rem",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--green-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2.5 2.5L8 3"
                    stroke="var(--green-soft)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {label}
            </div>
          )
        )}
      </div>

      <style>{`
        .hero-form-row {
          display: flex;
          gap: 12px;
          margin-bottom: 0;
        }
        .proof-badges {
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .hero-form-row { flex-direction: column; }
          .proof-badges { flex-direction: column; align-items: center; }
        }
        @media (max-width: 480px) {
          #hero-form { padding: 1.25rem 1.5rem 1rem !important; }
        }
        .arr { display: inline-block; transition: transform 0.25s ease; }
        button:hover .arr { transform: translateX(3px); }
        button[type="submit"]:hover {
          background: var(--green-cta-hover) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,153,104,0.35);
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journey Section
// ---------------------------------------------------------------------------

function JourneySection() {
  return (
    <section
      id="journey"
      style={{
        padding: "6rem clamp(1.5rem, 5vw, 3rem)",
        background: "var(--surface-warm)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <RevealWrapper>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                color: "var(--green-soft)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Your journey
            </span>
            <h2
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontWeight: 600,
                fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)",
                color: "var(--navy)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "0.75rem 0",
              }}
            >
              One journey. From curiosity to action plan.
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.95rem",
                color: "var(--muted)",
                lineHeight: 1.55,
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              Start with incentives or skip straight to your full building
              profile. Each step gives you more to work with.
            </p>
          </RevealWrapper>
        </div>

        {/* Timeline cards */}
        <div className="journey-grid">
          <JourneyStep
            step={1}
            active
            name="Incentive Match"
            time="~60 seconds"
            badge="No account needed"
            description="Every federal, provincial, and local program your building qualifies for. One search."
            ctaText="Find My Incentives"
            ctaHref="#hero-form"
            delay={0}
          />
          <JourneyStep
            step={2}
            active
            name="Building Discovery"
            time="~10 minutes"
            badge="Free account"
            description="Your building's custom energy profile with savings opportunities, CO₂ reduction potential, and measurable project recommendations, from Demand Response to Distributed Energy."
            ctaText="Start Discovery"
            ctaHref="/discovery"
            delay={0.15}
          />
          <JourneyStep
            step={3}
            active={false}
            name="Energy Planner"
            time="~15 minutes"
            badge="Coming soon"
            description="Standardized vendor quotes. Same assumptions, same baselines. Apples-to-apples, finally."
            ctaText="Learn More"
            ctaHref="/planner"
            delay={0.3}
          />
        </div>
      </div>

      <style>{`
        .journey-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          position: relative;
        }
        @media (max-width: 768px) {
          .journey-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }
      `}</style>
    </section>
  );
}

function JourneyStep({
  step,
  active,
  name,
  time,
  badge,
  description,
  ctaText,
  ctaHref,
  delay,
}: {
  step: number;
  active: boolean;
  name: string;
  time: string;
  badge: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  delay: number;
}) {
  return (
    <RevealWrapper delay={delay}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        {/* Dot */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            margin: "0 auto",
            background: active ? "var(--green)" : "var(--surface-alt)",
            border: active ? "none" : "2px solid var(--border)",
            boxShadow: active ? "0 0 0 4px var(--green-glow)" : "none",
          }}
        />
        {/* Step label */}
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: active ? "var(--green-soft)" : "var(--muted)",
            marginTop: 8,
            display: "block",
          }}
        >
          Step {step}
        </span>
      </div>

      {/* Card */}
      <div
        className="t-card"
        style={{
          background: "var(--white)",
          borderRadius: 14,
          padding: "1.5rem",
          boxShadow: "var(--shadow)",
          border: "1.5px solid rgba(0, 168, 120, 0.15)",
          transition: "box-shadow var(--ease), transform var(--ease)",
          cursor: "pointer",
        }}
      >
        <h3
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontWeight: 600,
            fontSize: "1.25rem",
            color: "var(--navy)",
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {name}
        </h3>

        {/* Time estimate */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            fontSize: "0.78rem",
            fontFamily: "'DM Sans', sans-serif",
            color: "var(--muted)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {time}
        </div>

        {/* Badge */}
        <span
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "3px 10px",
            borderRadius: 100,
            fontSize: "0.68rem",
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            background: active
              ? "var(--green-glow)"
              : "rgba(90,107,133,0.08)",
            color: active ? "var(--green-soft)" : "var(--muted)",
          }}
        >
          {badge}
        </span>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.88rem",
            color: "var(--muted)",
            lineHeight: 1.55,
            marginTop: 12,
            marginBottom: 16,
          }}
        >
          {description}
        </p>

        <a
          href={ctaHref}
          className="journey-cta"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "10px 16px",
            borderRadius: 10,
            background: "var(--amber)",
            color: "var(--navy)",
            fontWeight: 600,
            fontSize: "0.85rem",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none",
            transition: "all 0.25s ease",
            cursor: active ? "pointer" : "default",
          }}
        >
          {ctaText} <span className="arr">→</span>
        </a>
      </div>

      <style>{`
        .t-card:hover {
          box-shadow: var(--shadow-up);
          transform: translateY(-3px);
        }
        .journey-cta:hover {
          background: #F7B23E;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px var(--amber-glow);
        }
      `}</style>
    </RevealWrapper>
  );
}

// ---------------------------------------------------------------------------
// Credibility Section
// ---------------------------------------------------------------------------

function CredibilitySection() {
  return (
    <section
      style={{
        background: "var(--navy)",
        padding: "3rem clamp(1.5rem, 5vw, 3rem) 2.5rem",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse at 25% 40%, rgba(22,59,110,0.7) 0%, transparent 55%)",
            "radial-gradient(ellipse at 75% 25%, rgba(0,168,120,0.07) 0%, transparent 45%)",
          ].join(", "),
        }}
      />

      <RevealWrapper>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontWeight: 600,
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Tracking{" "}
            <em style={{ color: "var(--amber)", fontStyle: "normal" }}>100+</em>{" "}
            incentive programs across Canada.
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.92rem",
              color: "rgba(255,255,255,0.45)",
              marginTop: "0.5rem",
              marginBottom: "1.75rem",
            }}
          >
            Matched to your building. Filtered to your location.
          </p>
        </div>
      </RevealWrapper>

      {/* Ticker */}
      <ProgramTicker />

      {/* Standards footnote — INSIDE navy section per Amendment §2 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          marginTop: "1.25rem",
          fontSize: "0.78rem",
          fontFamily: "'DM Sans', sans-serif",
          color: "rgba(255,255,255,0.3)",
          maxWidth: 600,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Built on data from{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          NRCan
        </span>
        ,{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          ECCC
        </span>
        , and{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          IESO
        </span>
        . Models aligned with{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          ASHRAE
        </span>
        ,{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          ISO 50001
        </span>
        , and{" "}
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          IPMVP
        </span>{" "}
        standards.
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Program Ticker (JS-driven, not CSS animation — per spec §3.7)
// ---------------------------------------------------------------------------

function ProgramTicker() {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;
    let pos = 0;
    const speed = 0.3;
    let raf: number;

    function drift() {
      pos -= speed;
      const half = ticker!.scrollWidth / 2;
      if (Math.abs(pos) >= half) pos = 0;
      ticker!.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(drift);
    }
    raf = requestAnimationFrame(drift);
    return () => cancelAnimationFrame(raf);
  }, []);

  const allPrograms = [...TICKER_PROGRAMS, ...TICKER_PROGRAMS];

  return (
    <div
      className="ticker-wrap"
      style={{
        position: "relative",
        overflow: "hidden",
        margin: "0 -3rem",
        zIndex: 1,
      }}
    >
      {/* Edge fades */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 80,
          background:
            "linear-gradient(to right, var(--navy), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 80,
          background:
            "linear-gradient(to left, var(--navy), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <div
        ref={tickerRef}
        style={{
          display: "flex",
          gap: 12,
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {allPrograms.map((name, i) => (
          <span
            key={`${name}-${i}`}
            style={{
              padding: "6px 18px",
              borderRadius: 100,
              fontSize: "0.8rem",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            {name}
          </span>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ticker-wrap { margin: 0 -1.5rem !important; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final CTA Section
// ---------------------------------------------------------------------------

function FinalCtaSection() {
  return (
    <section
      style={{
        padding: "4.5rem clamp(1.5rem, 5vw, 3rem)",
        background: "var(--surface-warm)",
      }}
    >
      <RevealWrapper>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontWeight: 600,
              fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)",
              color: "var(--navy)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            See what incentives and projects you&apos;ve been missing.
          </h2>

          <div
            className="final-cta-buttons"
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              marginTop: "2rem",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/discovery"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                color: "white",
                background: "var(--green-cta)",
                padding: "15px 32px",
                borderRadius: 12,
                textDecoration: "none",
                transition: "all 0.25s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Start Building Discovery <span className="arr">→</span>
            </a>
            <a
              href="#hero-form"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--navy)",
                background: "var(--amber)",
                padding: "15px 32px",
                borderRadius: 12,
                textDecoration: "none",
                transition: "all 0.25s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Find Incentives <span className="arr">→</span>
            </a>
          </div>

          {/* Audience line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                width: 32,
                height: 1,
                background: "var(--border)",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem",
                color: "var(--muted)",
              }}
            >
              Built for energy managers, building owners, and operators
            </span>
            <div
              style={{
                width: 32,
                height: 1,
                background: "var(--border)",
              }}
            />
          </div>
        </div>
      </RevealWrapper>

      <style>{`
        @media (max-width: 768px) {
          .final-cta-buttons {
            flex-direction: column;
            align-items: center;
            max-width: 320px;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .final-cta-buttons a { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  const links = [
    { label: "About", href: "/about" },
    { label: "How It Works", href: "#journey" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "2.5rem clamp(1rem, 3vw, 2rem)",
      }}
    >
      <div
        className="footer-inner"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        {/* Logo */}
        <a
          href="#hero"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <LogoMark size={24} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "var(--navy)",
              letterSpacing: "-0.02em",
            }}
          >
            VoltMatch
          </span>
        </a>

        {/* Links */}
        <div
          className="footer-links"
          style={{
            display: "flex",
            gap: "1.75rem",
            flexWrap: "wrap",
          }}
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div
        style={{
          maxWidth: 1080,
          margin: "1.5rem auto 0",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem",
          color: "var(--muted)",
        }}
      >
        &copy; 2026 VoltMatch. All rights reserved.
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-inner {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-links {
            justify-content: center;
          }
        }
      `}</style>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Scroll Reveal Wrapper (IntersectionObserver, one-shot)
// ---------------------------------------------------------------------------

function RevealWrapper({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
