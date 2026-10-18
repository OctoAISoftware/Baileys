# kwhats-patches-v7

Best-effort carry of the kwhats patch set onto upstream `master` (7.0.0-rc). Not consumed by production
(production runs `kwhats-patches`, based on `release/6.7.x`).

Carried:
- `fix(recv): do not send retry receipts for undecryptable fromMe messages` — upstream PR #2864
- `feat(socket): include the WebSocket close code and reason` — upstream PR #2865

Deliberately NOT carried:
- `feat(signal): canonical device identity (LID↔PN)` — 7.x is LID-first and keeps its own `lid-mapping`
  store (`signalRepository.lidMapping`), which solves the split-session problem the 6.7.x patch addressed.
  When production moves to 7.x this patch is dropped, not ported.
- `build(kwhats): package identity` — the 7.x toolchain (pnpm/yarn 4, `whatsapp-rust-bridge`, `libsignal` 6)
  needs its own build commit; write it when the migration is actually planned.
