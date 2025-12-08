(() => {
  // ... [game logic unchanged but see note below]
  // Insert your previously working JS as per latest answer above.

  // ADD this to **hide non-game UI** when playing:
  function startRun() {
    document.body.classList.add('game-active');
    // ... rest same
  }
  function quitToSettings() {
    document.body.classList.remove('game-active');
    // ... rest same
  }
  function retryRun() {
    document.body.classList.add('game-active');
    // ...rest same
  }
  // Also add to game-over modal: when clicking retry/quit, ensure body.game-active is added/removed.

  // For nav: keep the code for hamburger/mobile overlay, add animation classes per the index and CSS.
})();