// Garante que `kwhats-signal` seja resolvível de DENTRO deste pacote antes do build.
//
// Por que isto existe. O `tsc` emite `import ... from 'kwhats-signal/src/crypto'`
// sem extensão, e o ESM do Node exige a extensão em caminho de arquivo. Quem
// conserta é o `tsc-esm-fix`, mas ele só acrescenta o `.js` quando consegue
// RESOLVER o módulo — e, num monorepo com workspaces, o npm iça o
// `kwhats-signal` para o node_modules da raiz, fora do alcance da resolução que
// ele faz a partir do diretório do pacote.
//
// O sintoma sem isto é cruel: o build passa (exit 0), o `lib/` é gerado, os
// testes de patch passam, e a falha só aparece em runtime, na primeira mensagem
// de grupo, como ERR_MODULE_NOT_FOUND. Foi assim que a primeira compilação
// fora do repositório de origem quebrou.

import { existsSync, mkdirSync, symlinkSync, lstatSync, unlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const pacote = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(pacote, 'node_modules', 'kwhats-signal');
const alvo = join(pacote, '..', 'kwhats-signal');

if (!existsSync(alvo)) {
  console.error('preparar-build: packages/kwhats-signal não encontrado — o monorepo está incompleto.');
  process.exit(1);
}

mkdirSync(join(pacote, 'node_modules'), { recursive: true });

try {
  // lstat (não stat): um link quebrado existe para o lstat e some para o stat.
  const st = lstatSync(destino);
  if (st.isSymbolicLink() || st.isDirectory()) {
    if (st.isSymbolicLink()) unlinkSync(destino);
    else { console.log('preparar-build: kwhats-signal já instalado localmente.'); process.exit(0); }
  }
} catch { /* não existe: cria abaixo */ }

symlinkSync(relative(dirname(destino), alvo), destino, 'dir');
console.log('preparar-build: kwhats-signal linkado localmente (para o tsc-esm-fix resolver a extensão).');
