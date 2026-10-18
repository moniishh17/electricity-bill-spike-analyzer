/** Three tabs (analyze / learn / tariff) in the top bar. Sections opt in with data-tab; in-page anchors still open the right tab. */
const tabOf = (el) => el.closest("[data-tab]")?.dataset.tab;
let show = () => {};

/** Switch to a tab by name (used by buttons outside the tab bar). */
export const showTab = (name) => show(name);

export function initTabs() {
  const buttons = [...document.querySelectorAll(".tab-btn")];
  const panels = [...document.querySelectorAll("[data-tab]")];
  show = (name) => {
    panels.forEach((p) => p.classList.toggle("tab-off", p.dataset.tab !== name));
    buttons.forEach((b) => { const on = b.dataset.go === name; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    try { sessionStorage.setItem("billspike:tab", name); } catch {}
  };
  buttons.forEach((b, i) => {
    b.addEventListener("click", () => show(b.dataset.go));
    b.addEventListener("keydown", (e) => { // arrow keys move between tabs
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const to = buttons[(next + buttons.length) % buttons.length];
      to.focus();
      show(to.dataset.go);
    });
  });
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    const name = target && tabOf(target);
    if (!name) return;
    e.preventDefault();
    show(name);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  let start = "analyze";
  try { start = sessionStorage.getItem("billspike:tab") || start; } catch {}
  const hashTarget = location.hash && document.querySelector(location.hash);
  show((hashTarget && tabOf(hashTarget)) || start);
}
