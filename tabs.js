/** Three tabs (analyze / learn / tariff). Sections opt in with data-tab; nav anchors still work and open the right tab. */
const tabOf = (el) => el.closest("[data-tab]")?.dataset.tab;

export function initTabs() {
  const buttons = [...document.querySelectorAll(".tab-btn")];
  const panels = [...document.querySelectorAll("[data-tab]")];
  const show = (name) => {
    panels.forEach((p) => p.classList.toggle("tab-off", p.dataset.tab !== name));
    buttons.forEach((b) => { const on = b.dataset.go === name; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    try { sessionStorage.setItem("billspike:tab", name); } catch {}
  };
  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
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
