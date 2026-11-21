(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - clamp(t), 3); // easeOutCubic

  /* ------------------------------------------------------------------
     Hero: the title card slowly recedes and fades, the text rises in.
     ------------------------------------------------------------------ */
  const hero = document.getElementById("hero");
  const heroImg = document.getElementById("heroImg");
  const heroText = document.getElementById("heroText");
  const heroCue = document.getElementById("heroCue");
  const topbar = document.getElementById("topbar");

  let ticking = false;
  function renderHero() {
    ticking = false;
    const range = hero.offsetHeight - window.innerHeight;
    const p = range > 0 ? clamp(window.scrollY / range) : 1;

    if (!reduceMotion) {
      const recede = ease(p / 0.7);
      const fade = ease((p - 0.12) / 0.5);
      const rise = ease((p - 0.38) / 0.42);
      heroImg.style.transform = `translate3d(0, ${-4 * recede}vh, 0) scale(${1 - 0.14 * recede})`;
      heroImg.style.opacity = String(1 - 0.92 * fade);
      heroText.style.opacity = String(rise);
      heroText.style.transform = `translate3d(0, ${(1 - rise) * 48}px, 0)`;
      heroText.style.pointerEvents = rise > 0.5 ? "auto" : "none";
      heroCue.style.opacity = String(1 - clamp(p * 6));
    }

    topbar.classList.toggle("is-on", window.scrollY > hero.offsetHeight - window.innerHeight * 0.6);
  }
  const requestHero = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(renderHero);
    }
  };
  window.addEventListener("scroll", requestHero, { passive: true });
  window.addEventListener("resize", requestHero);
  renderHero();

  /* ------------------------------------------------------------------
     Scroll reveals for the couples
     ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------------
     Popularity vote
     ------------------------------------------------------------------ */
  const ballot = document.getElementById("ballot");
  const castBtn = document.getElementById("castBtn");
  const statusEl = document.getElementById("ballotStatus");
  const totalEl = document.getElementById("ballotTotal");
  const plaques = [...ballot.querySelectorAll(".plaque")];
  const radios = [...ballot.querySelectorAll('input[name="couple"]')];
  const titles = Object.fromEntries(
    plaques.map((p) => [p.dataset.couple, p.querySelector(".plaque__name").textContent]),
  );

  let state = { counts: {}, total: 0, myVote: null };
  let busy = false;

  const selected = () => {
    const r = radios.find((x) => x.checked);
    return r ? Number(r.value) : null;
  };

  function setStatus(msg, kind = "") {
    statusEl.textContent = msg;
    statusEl.className = "ballot__status" + (kind ? ` is-${kind}` : "");
  }

  function syncButton() {
    const pick = selected();
    castBtn.disabled = busy || pick == null || pick === state.myVote;
    castBtn.textContent = state.myVote ? "Change my vote" : "Cast my vote";
    if (busy) castBtn.classList.add("is-busy");
    else castBtn.classList.remove("is-busy");
  }

  function renderResults() {
    const { counts, total, myVote } = state;
    const max = Math.max(0, ...Object.values(counts));
    const showResults = myVote != null;
    ballot.classList.toggle("has-results", showResults);

    for (const p of plaques) {
      const id = Number(p.dataset.couple);
      const n = counts[id] ?? 0;
      const share = total ? n / total : 0;
      p.querySelector(".bar i").style.setProperty("--share", showResults ? share.toFixed(4) : "0");
      p.querySelector(".pct").textContent = showResults ? `${(share * 100).toFixed(share && share < 0.1 ? 1 : 0)}%` : "";
      p.classList.toggle("is-mine", myVote === id);
      p.classList.toggle("is-leader", showResults && max > 0 && n === max);
    }

    totalEl.textContent = total === 1 ? "1 vote cast" : `${total.toLocaleString("en-GB")} votes cast`;
  }

  async function api(path, opts) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  }

  async function loadPoll({ quiet = false } = {}) {
    if (!quiet) ballot.classList.add("is-loading");
    try {
      state = await api("/api/poll");
      if (state.myVote && selected() == null) {
        const r = radios.find((x) => Number(x.value) === state.myVote);
        if (r) r.checked = true;
      }
      renderResults();
      if (!quiet) {
        setStatus(
          state.myVote
            ? `You voted for ${titles[state.myVote]}. Pick another star to change it.`
            : "Pick a star to vote.",
        );
      }
    } catch (err) {
      if (!quiet) setStatus("The results couldn't be loaded. You can still vote.", "error");
    } finally {
      ballot.classList.remove("is-loading");
      syncButton();
    }
  }

  radios.forEach((r) =>
    r.addEventListener("change", () => {
      const pick = selected();
      if (pick === state.myVote) setStatus(`This is already your vote: ${titles[pick]}.`);
      else setStatus(`Ready to vote for ${titles[pick]}.`);
      syncButton();
    }),
  );

  ballot.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pick = selected();
    if (pick == null || busy) return;
    const changing = state.myVote != null;
    busy = true;
    syncButton();
    setStatus("Counting your vote…");
    try {
      state = await api("/api/vote", { method: "POST", body: JSON.stringify({ coupleId: pick }) });
      renderResults();
      setStatus(
        changing ? `Vote changed. Your star now goes to ${titles[pick]}.` : `Thank you! Your star goes to ${titles[pick]}.`,
        "ok",
      );
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      busy = false;
      syncButton();
    }
  });

  // "Vote for Couple N" links preselect that couple's star
  document.querySelectorAll("[data-pick]").forEach((a) =>
    a.addEventListener("click", () => {
      const r = radios.find((x) => x.value === a.dataset.pick);
      if (r) {
        r.checked = true;
        r.dispatchEvent(new Event("change"));
      }
    }),
  );

  loadPoll();

  // Refresh the tally quietly while the poll is on screen
  let refreshTimer = null;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      clearInterval(refreshTimer);
      if (entry.isIntersecting) refreshTimer = setInterval(() => !busy && loadPoll({ quiet: true }), 20000);
    }).observe(ballot);
  }
})();
