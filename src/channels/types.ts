// =============================================================================
// channels/types.ts - Tipos compartilhados entre canais WhatsApp
// FutCerto v2.0
// =============================================================================

/**
 * Mensagem recebida do WhatsApp (normalizada de qualquer plataforma)
 */
export interface IncomingMessage {
  /** Número do remetente: 5541999999999 */
  from: string;
  /** Tipo da mensagem */
  type: "text" | "location" | "image" | "audio" | "document" | "sticker";
  /** Texto da mensagem (quando type === "text") */
  text?: string;
  /** Localização (quando type === "location") */
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  /** ID único da mensagem na plataforma */
  messageId: string;
  /** Timestamp Unix em segundos */
  timestamp: number;
  /** Nome do contato (se disponível) */
  contactName?: string;
  /** Metadados extras da plataforma */
  metadata?: Record<string, unknown>;
}

/**
 * Mensagem a ser enviada via WhatsApp
 */
export interface OutgoingMessage {
  /** Número do destinatário: 5541999999999 */
  to: string;
  /** Texto da mensagem (suporta formatação WhatsApp: *bold*, _italic_) */
  text: string;
  /** Delay em ms antes de enviar (simula digitação natural) */
  delay?: number;
}

/**
 * Contexto do usuário durante a conversa
 */
export interface UserContext {
  phoneNumber: string;
  userId?: string;           // UUID do usuário no banco
  name?: string;
  /** Nome do contato no WhatsApp */
  contactName?: string;
  role?: "jogador" | "gestor" | "unknown";
  currentAgent?: "router" | "jogador" | "gestor";
  /** Dados temporários da sessão (quadra selecionada, data escolhida, etc.) */
  sessionData?: Record<string, unknown>;
}

/**
 * Resultado do processamento pelo agente
 */
export interface AgentResult {
  response: string;
  newAgent?: "router" | "jogador" | "gestor";
  intent?: string;
  toolsCalled?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Interface que todos os adaptadores de canal devem implementar
 */
export interface ChannelAdapter {
  /** Inicializa o canal */
  initialize(): Promise<void>;
  /** Envia mensagem para o usuário */
  sendMessage(message: OutgoingMessage): Promise<void>;
  /** Registra handler para mensagens recebidas */
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
}
