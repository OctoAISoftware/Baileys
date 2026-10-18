# Origem do KWHATS

Este repositório é um **fork de verdade** (objeto de fork no GitHub) de
**WhiskeySockets/Baileys**: <https://github.com/OctoAISoftware/Baileys>.
Licença MIT (ver LICENSE).

Até 17/10/2026 o código vivia vendorizado dentro de `OctoAISoftware/kwhats`
(`packages/kwhats`, base `v6.7.23`). Agora `packages/kwhats` é um **submódulo git**
apontando para a branch `kwhats-patches` deste fork, e cada patch nosso é um commit
separado em cima do upstream — o que torna possível rebasear, comparar e mandar
pull request.

## Branches

| Branch | Base | Para quê |
| --- | --- | --- |
| `master` | upstream `master` (7.0.0-rc) | espelho do upstream; nunca recebe commit nosso |
| `release/6.7.x` | upstream `release/6.7.x` | espelho da linha 6.7 que rodamos em produção |
| **`kwhats-patches`** | `release/6.7.x` | **o que a produção consome**: os patches, um commit cada |
| `kwhats-patches-v7` | `master` | os mesmos patches rebaseados no 7.x, melhor esforço (ver abaixo) |
| `pr/<nome>` | upstream `master` | um patch de uso geral por branch, é daqui que sai o pull request |

### O que está em `kwhats-patches` (em ordem)

1. `feat(signal): canonical device identity` — identidade canônica LID↔número
   (`src/Signal/identity.ts`, `libsignal.ts`, `decode-wa-message.ts`, tipos, export).
   **Não vai para PR**: o 7.x resolve o mesmo problema com sessões LID-first e um
   `lid-mapping` próprio. Inclui a correção do pareamento `from`↔`sender_pn|sender_lid`
   (o patch original exigia os dois atributos no mesmo stanza, que nunca acontece, e por
   isso só aprendia a própria conta).
2. `fix(recv): do not send retry receipts for undecryptable fromMe messages` — o guard do
   fromMe (a causa real das quedas "code 500"). **PR aberto** a partir de `pr/fromme-retry-guard`.
3. `feat(socket): include the WebSocket close code and reason` — o motivo real de cada
   "Connection Terminated". **PR aberto** a partir de `pr/ws-close-reason`.
4. `build(kwhats): package identity` — este commit: nome `kwhats`, dependência em
   `kwhats-signal` (nosso fork GPL do libsignal, em `packages/kwhats-signal`), versões
   exatas de `typescript`/`tsc-esm-fix`, `scripts/preparar-build.mjs`, sem `.github/`,
   `Example/`, `Media/`, typedoc, release-it. **É política nossa, nunca vai para PR.**

O que é nosso tem comentário explicando o porquê. Sem isso, em três meses ninguém sabe
o que é conserto nosso e o que é código herdado.

## Trazer upstream novo (rebase)

```sh
cd packages/kwhats                       # dentro do submódulo
git remote add upstream https://github.com/WhiskeySockets/Baileys 2>/dev/null
git fetch upstream
git checkout release/6.7.x && git merge --ff-only upstream/release/6.7.x && git push origin release/6.7.x
git checkout kwhats-patches
git rebase release/6.7.x                 # resolve conflito patch a patch, nunca "squash"
npm run build && cd ../.. && npm test    # test-patches confere que os NOVE continuam no lugar
git push --force-with-lease origin kwhats-patches
cd ../.. && git add packages/kwhats && git commit -m "kwhats: upstream <tag>"
```

A linha 6.7.x do upstream está em manutenção (só versão do WhatsApp Web e CI). Quando a
produção migrar para 7.x, `kwhats-patches-v7` vira a branch consumida — e o patch 1 sai,
porque o 7.x já faz LID-first.

## Acrescentar um patch

1. Um commit, um assunto, mensagem em inglês explicando o **porquê** (incidente, data, medição).
2. Comentário no código, no ponto da mudança, com o mesmo porquê.
3. Se for de uso geral, abrir a branch `pr/<nome>` a partir de `upstream/master`, fazer
   `git cherry-pick` do commit, resolver o que mudou no 7.x, e abrir o pull request do fork
   para `WhiskeySockets/Baileys:master` (o upstream só aceita PR contra `master`).
4. Se for política nossa (limiares, identidade de pacote, dependências), fica só em
   `kwhats-patches`.
5. Registrar o patch em `scripts/test-patches.mjs` no repositório `kwhats`, para o teste
   estrutural acusar se um rebase o levar embora.

## O que foi removido do upstream nesta branch

- `.github/` — os workflows do Baileys (build, lint, release, stale, update-proto) rodariam
  no NOSSO repo a cada push. Removido por segurança, não por peso. Nas branches `pr/*`
  (que nascem de `master`) eles ficam, porque o PR precisa passar no CI do upstream.
- `Media/`, `Example/`, `typedoc.json`, `.release-it.yml`, `eslint.config.mts`, `yarn.lock`
  — material de repositório público que não faz sentido num submódulo de build.
- Hooks `prepare`/`prepack`/`preinstall` do `package.json` — o build é orquestrado pelo
  repositório `kwhats` (`npm run build` na raiz).

## Versões fixadas no caminho de build

`typescript` e `tsc-esm-fix` estão em versão **exata**. Motivo medido (03/09/2026): com
`typescript@^5.8.2` resolvendo para 5.9.3, o build falha com 3 erros de genérico de
`Buffer` em `Utils/crypto.ts` e `Utils/history.ts`, porque o `@types/node` do upstream é
^16. Em 5.8.3 compila limpo.

`link-preview-js` é `peerDependency` opcional, mas o `tsc` precisa dela para tipar
`Utils/link-preview.ts`; está declarada como dependência da raiz do `kwhats`.

## Riscos aceitos

- `@hapi/boom` em `^9` aqui e `^10` na raiz: duas cópias, inofensivo (o código testa
  `e.isBoom`, nunca `instanceof`).
- `@types/node` em `^16` com Node 20/22: compila hoje; subir é um risco separado.
