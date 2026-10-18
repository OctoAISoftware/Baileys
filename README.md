# kwhats

Fork do [Baileys](https://github.com/WhiskeySockets/Baileys) **v6.7.23** (MIT), com correções na camada de sessão do Signal. É a base do `kwhats-connect`, no diretório raiz deste repositório.

O README original do Baileys foi removido de propósito: ele descreve o projeto upstream, pede patrocínio para o mantenedor de lá e aponta para uma wiki que não descreve o comportamento deste fork. Para usar a API do Baileys, consulte [baileys.wiki](https://baileys.wiki) — tudo que não está listado abaixo funciona igual ao upstream.

**Este pacote não é afiliado, associado, autorizado ou endossado pelo WhatsApp ou pela Meta.**

## O que muda em relação ao upstream

O `UPSTREAM.md` traz a tag de origem, o commit-base e a receita de `diff` para conferir cada divergência. Em resumo, são quatro consertos:

**1. Um aparelho, um endereço de sessão.** O WhatsApp endereça o mesmo aparelho ora pelo número (`@s.whatsapp.net`), ora pelo LID (`@lid`), alternando por conta própria. O upstream deriva o endereço da sessão Signal do formato que chegou, então o mesmo aparelho físico acumula **dois** arquivos de sessão. Como o ratchet do Signal tem estado e avança a cada decifragem, uma das cópias fica sempre velha: Bad MAC, retry, sessão nova, quebra de novo. Medido em produção, aparelhos chegaram a 40+ sessões (o saudável é 1) e a perda passava de 400 mensagens por dia, em silêncio.

O conserto é a classe `DeviceIdentity` (`src/Signal/identity.ts`), aplicada em `jidToSignalProtocolAddress` — o funil por onde toda sessão nasce, na cifragem e na decifragem. O mapa é alimentado pelos atributos `sender_pn`/`sender_lid` que o servidor sempre mandou e o upstream ignorava.

```ts
import { DeviceIdentity, makeLibSignalRepository } from 'kwhats'

const identity = new DeviceIdentity((lid, pn) => salvar(lid, pn))  // persistência é sua
identity.load(paresSalvos)
makeWASocket({ makeSignalRepository: (auth) => makeLibSignalRepository(auth, identity) })
```

**2. Nunca pedir retry de mensagem `fromMe`.** Mensagem própria que não decifra é o eco da sua conta sincronizado de outro aparelho, cifrado sob a sessão do aparelho de origem. Pedir reenvio é pedir a si mesmo: o servidor responde `<stream:error><ack/>` e derruba o stream. Isso chegava ao consumidor como "code 500" (o valor padrão para stream error sem código) e foi lido por meses como sessão inválida.

**3. Teto de sessões fechadas.** De 40 para 5, ajustável por `KWHATS_CLOSED_SESSIONS_MAX`. Sessão fechada só serve para decifrar mensagem atrasada; guardar 40 fazia cada falha custar 40 operações de MAC e mascarava a divisão de ratchet.

**4. Material de chave fora do log.** `closeSession`/`openSession` faziam `console.info` do objeto de sessão inteiro — chaves de ratchet e estado do Signal indo para o log, que costuma ir para backup. Agora emitem um evento com o mínimo para diagnosticar, pelo `setReporter` do `kwhats-signal`.

## Build

O pacote é TypeScript e **precisa ser compilado** antes do uso (`main` aponta para `lib/`):

```sh
npm ci                    # na raiz do repositório (workspaces)
npm run build -w kwhats
```

`lib/` não é versionado. O CI compila e publica o resultado no ref `dist` — máquinas pequenas costumam não dar conta do `tsc` sobre este código.

## Licença

MIT, do upstream — veja `LICENSE`, que permanece com o copyright original. A dependência `kwhats-signal` é **GPL-3.0**; veja `LICENSES.md` na raiz do repositório.
