import makeWASocket from './Socket/index'

export * from '../WAProto/index.js'
export * from './Utils/index'
export * from './Types/index'
export * from './Defaults/index'
export * from './WABinary/index'
export * from './WAM/index'
export * from './WAUSync/index'

// KWHATS: a camada Signal passa a fazer parte da API pública porque o
// hospedeiro precisa persistir o mapa de identidade de aparelho entre reinícios.
// Sem isso ele nasceria vazio toda vez e as primeiras mensagens de cada contato
// voltariam a abrir sessão no endereço errado.
export { DeviceIdentity } from './Signal/identity'
export { makeLibSignalRepository } from './Signal/libsignal'

export type WASocket = ReturnType<typeof makeWASocket>
export { makeWASocket }
export default makeWASocket
