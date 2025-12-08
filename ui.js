// ui.js — lightweight non-invasive UI enhancements for Logic Runner
// Adds animations and small UX improvements only. Does not modify any game logic.

(function () {
  'use strict';

  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));

  // NAV underline animation
  function updateNavUnderline() {
    const nav = $('#topnav');
    const underline = nav && nav.querySelector('.nav-underline');
    if (!nav || !underline) return;

    const active = nav.querySelector('.nav-link.active');
    if (!active) {
      underline.style.width = '0px';
      return;
    }
    const rect = active.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const left = rect.left - navRect.left;
    underline.style.transform = `translateX(${left}px)`;
    underline.style.width = `${rect.width}px`;
  }

  // Panel switching with gentle animation
  function enablePanelSwitching() {
    const links = $$('.nav-link');
    links.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-target');
        if (!target) return;
        // deactivate previous
        $$('.nav-link').forEach(n => n.classList.remove('active'));
        btn.classList.add('active');

        // panels
        $$('.panel').forEach(p => {
          if (p.id === target) {
            p.classList.add('active-panel');
            p.classList.add('pop');
            // remove pop after animation
            setTimeout(() => p.classList.remove('pop'), 360);
          } else {
            p.classList.remove('active-panel');
          }
        });

        // update underline
        requestAnimationFrame(updateNavUnderline);
      });
    });

    // initial placement
    window.addEventListener('load', () => setTimeout(updateNavUnderline, 120));
    window.addEventListener('resize', updateNavUnderline);
  }

  // Mobile hamburger toggle
  function enableHamburger() {
    const ham = $('#hamburger');
    const nav = $('#topnav');
    if (!ham || !nav) return;
    ham.addEventListener('click', () => {
      nav.classList.toggle('open');
      ham.classList.toggle('open');
    });
    // clicking outside closes nav (on mobile)
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      const inside = nav.contains(e.target) || ham.contains(e.target);
      if (!inside) nav.classList.remove('open');
    });
  }

  // Rotating tips for leaderboard
  function leaderboardTips() {
    const tipEl = $('#topic-tip');
    if (!tipEl) return;
    const tips = [
      'Think about how negation flips truth-values — practice with small sentences.',
      'Truth tables are exhaustive: list all possible truth assignments for variables.',
      '“A implies B” is true unless A is true and B is false — useful when reasoning.',
      'AND requires both parts true; OR requires at least one true. Small tests help.'
    ];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % tips.length;
      tipEl.classList.add('pop');
      tipEl.textContent = tips[idx];
      setTimeout(() => tipEl.classList.remove('pop'), 360);
    }, 6000);
  }

  // Animate floating UI when it becomes visible by game logic (non-invasive)
  function watchFloatingUi() {
    const floating = $('#floating-ui');
    if (!floating) return;
    // If game code sets style.display or removes display none, animate in.
    const mo = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) {
          const isVisible = window.getComputedStyle(floating).display !== 'none' && floating.offsetParent !== null;
          if (isVisible) {
            floating.classList.add('animated-in');
            floating.setAttribute('aria-hidden', 'false');
            // remove animation class after entrance so repeated opens still animate
            setTimeout(() => floating.classList.remove('animated-in'), 420);
          } else {
            floating.setAttribute('aria-hidden', 'true');
          }
        }
      });
    });
    mo.observe(floating, { attributes: true, attributeFilter: ['style', 'class'] });
    // Initial check
    setTimeout(() => {
      const isVisible = window.getComputedStyle(floating).display !== 'none' && floating.offsetParent !== null;
      if (isVisible) floating.classList.add('animated-in');
    }, 300);
  }

  // Decorative micro interactions for settings cards (visual only)
  function decorateSettings() {
    const choices = $$('.settings-card');
    choices.forEach(card => {
      card.addEventListener('click', () => {
        const group = card.parentElement;
        if (!group) return;
        group.querySelectorAll('.settings-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        // small pulse for selection
        card.classList.add('pulse');
        setTimeout(() => card.classList.remove('pulse'), 700);
      });
    });
  }

  // Defensive init
  function init() {
    enablePanelSwitching();
    enableHamburger();
    leaderboardTips();
    watchFloatingUi();
    decorateSettings();

    // add small hover for buttons to increase perceived responsiveness
    $$('.btn').forEach(b => {
      b.addEventListener('mousedown', () => b.classList.add('active-press'));
      b.addEventListener('mouseup', () => b.classList.remove('active-press'));
      b.addEventListener('mouseout', () => b.classList.remove('active-press'));
    });
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();