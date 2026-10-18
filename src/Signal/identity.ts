import { jidDecode } from '../WABinary'

/**
 * KWHATS: identidade canônica de aparelho.
 *
 * O WhatsApp endereça o MESMO aparelho de duas formas: pelo número
 * (`5511900000001:0@s.whatsapp.net`) e pelo LID (`10000000000001:0@lid`). Qual
 * das duas chega em cada stanza é decisão do servidor, e ele alterna.
 *
 * O upstream deriva o endereço da sessão Signal direto do que chegou, então o
 * mesmo aparelho físico acaba com DOIS arquivos de sessão. Isso é fatal, porque
 * a sessão Signal é uma cadeia com estado: cada decifragem avança o ratchet.
 * Avançou na cópia LID, a cópia do número fica velha e a próxima mensagem que
 * chegar por lá dá Bad MAC. O retry cria uma sessão nova, que quebra igual na
 * rajada seguinte. Foi assim que os aparelhos do dono chegaram a 40+ sessões
 * cada, enquanto qualquer contato normal vive com uma só, estável.
 *
 * Aqui um aparelho tem UM endereço. A forma canônica escolhida é a do número,
 * por dois motivos: é a que a esmagadora maioria das sessões já usa (trocar
 * quebraria todas de uma vez) e é a que o resto do cliente manipula. Contato de
 * quem só se conhece o LID continua no LID, que é o certo: sem o número, não há
 * o que unificar.
 */
export class DeviceIdentity {
	/** usuário LID (sem device) -> usuário do número (sem device) */
	private lidToPn = new Map<string, string>()

	/** Chamado a cada vínculo novo aprendido, para o hospedeiro persistir. */
	private onLearn?: (lidUser: string, pnUser: string) => void

	constructor(onLearn?: (lidUser: string, pnUser: string) => void) {
		this.onLearn = onLearn
	}

	/** Restaura vínculos já conhecidos (não dispara onLearn). */
	load(pairs: Record<string, string> | undefined | null) {
		for (const [lid, pn] of Object.entries(pairs || {})) {
			if (lid && pn) {
				this.lidToPn.set(lid, pn)
			}
		}
	}

	toJSON(): Record<string, string> {
		return Object.fromEntries(this.lidToPn)
	}

	get size() {
		return this.lidToPn.size
	}

	/**
	 * Registra que este LID e este número são o mesmo usuário. Aceita JID
	 * completo ou só o usuário; o device é irrelevante aqui, porque o vínculo é
	 * da CONTA. Ignora silenciosamente entrada incompleta, que é o caso comum
	 * (a maioria dos stanzas traz só uma das formas).
	 */
	link(lidJidOrUser?: string | null, pnJidOrUser?: string | null) {
		const lid = userOf(lidJidOrUser)
		const pn = userOf(pnJidOrUser)
		if (!lid || !pn || lid === pn) {
			return
		}

		if (this.lidToPn.get(lid) === pn) {
			return
		}

		this.lidToPn.set(lid, pn)
		this.onLearn?.(lid, pn)
	}

	/**
	 * Devolve o JID a usar como endereço de sessão. Preserva o device, que é o
	 * que distingue o celular (`:0`) do WhatsApp Web (`:17`) da mesma conta:
	 * aparelhos diferentes têm sessões Signal diferentes e não podem ser fundidos.
	 */
	canonical(jid: string): string {
		if (!jid || !jid.includes('@lid')) {
			return jid
		}

		const decoded = jidDecode(jid)
		if (!decoded?.user) {
			return jid
		}

		const pn = this.lidToPn.get(decoded.user)
		if (!pn) {
			return jid
		}

		// `device === 0` é o aparelho principal (o celular) e é FALSY. Testar por
		// verdade aqui apagava justamente o device do caso mais comum, que é o
		// que mais falhava. Derivar endereço trata ausente e 0 como a mesma
		// coisa, então o efeito prático seria o mesmo, mas devolver um JID que
		// perde informação é armadilha para o próximo uso desta função.
		const device = decoded.device === undefined ? '' : `:${decoded.device}`
		return `${pn}${device}@s.whatsapp.net`
	}
}

/** Extrai o usuário de um JID (`5511...:3@s.whatsapp.net` -> `5511...`). */
function userOf(jidOrUser?: string | null): string | undefined {
	if (!jidOrUser) {
		return undefined
	}

	if (!jidOrUser.includes('@')) {
		return jidOrUser.split(':')[0] || undefined
	}

	return jidDecode(jidOrUser)?.user
}
