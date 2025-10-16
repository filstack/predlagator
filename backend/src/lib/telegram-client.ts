// backend/src/lib/telegram-client.ts
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { NewMessage } from 'telegram/events'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Telegram :;85=B 4;O @01>BK A API
 * A?>;L7C5B GramJS (telegram npm package)
 */
class TelegramClientManager {
  private client: TelegramClient | null = null
  private isConnecting: boolean = false
  private sessionPath: string

  constructor() {
    this.sessionPath = path.join(__dirname, '..', '..', 'sessions')
  }

  /**
   * =8F80;878@>20BL 8 ?>4:;NG8BL :;85=B0
   */
  async connect(): Promise<void> {
    if (this.client?.connected) {
      console.log(' Telegram :;85=B C65 ?>4:;NG5=')
      return
    }

    if (this.isConnecting) {
      console.log('� >4:;NG5=85 : Telegram C65 2 ?@>F5AA5...')
      return
    }

    this.isConnecting = true

    try {
      console.log('= >4:;NG5=85 : Telegram...')

      const apiId = parseInt(process.env.TELEGRAM_API_ID || '')
      const apiHash = process.env.TELEGRAM_API_HASH || ''
      const sessionString = process.env.TELEGRAM_SESSION || ''

      if (!apiId || !apiHash) {
        throw new Error('TELEGRAM_API_ID 8 TELEGRAM_API_HASH 4>;6=K 1KBL CAB0=>2;5=K')
      }

      // !>7405< A5AA8N 87 AB@>:8
      const session = new StringSession(sessionString)

      // !>7405< :;85=B0
      this.client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
        retryDelay: 1000,
        autoReconnect: true,
        useWSS: false,
      })

      // >4:;NG05<AO
      await this.client.connect()

      console.log(' Telegram :;85=B CA?5H=> ?>4:;NG5=')

      // >;CG05< 8=D>@<0F8N >1 0::0C=B5
      const me = await this.client.getMe()
      console.log(`   ::0C=B: ${me.firstName} (ID: ${me.id})`)

      // !>E@0=O5< >1=>2;5==CN A5AA8N
      const newSession = this.client.session.save()
      if (newSession !== sessionString) {
        console.log('=� !5AA8O >1=>2;5=0 (A>E@0=8B5 2 .env 5A;8 87<5=8;0AL)')
        // TODO: 2B><0B8G5A:8 >1=>2;OBL .env 8;8 E@0=8BL 2 
      }

      this.isConnecting = false
    } catch (error) {
      this.isConnecting = false
      console.error('L H81:0 ?>4:;NG5=8O : Telegram:', error)
      throw error
    }
  }

  /**
   * >;CG8BL 0:B82=>3> :;85=B0
   */
  async getClient(): Promise<TelegramClient> {
    if (!this.client || !this.client.connected) {
      await this.connect()
    }

    if (!this.client) {
      throw new Error('5 C40;>AL ?>4:;NG8BLAO : Telegram')
    }

    return this.client
  }

  /**
   * B:;NG8BL :;85=B0
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
      console.log('= Telegram :;85=B >B:;NG5=')
    }
  }

  /**
   * @>25@8BL ?>4:;NG5=85
   */
  isConnected(): boolean {
    return this.client?.connected || false
  }

  /**
   * 5@5?>4:;NG8BLAO
   */
  async reconnect(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  /**
   * 1=>28BL session string 8 ?5@5?>4:;NG8BLAO
   */
  async updateSession(newSessionString: string): Promise<void> {
    await this.disconnect()
    process.env.TELEGRAM_SESSION = newSessionString
    await this.connect()
  }
}

// !8=3;B>= M:75<?;O@
export const telegramClient = new TelegramClientManager()

// 2B><0B8G5A:>5 ?>4:;NG5=85 ?@8 70?CA:5
if (process.env.NODE_ENV !== 'test') {
  telegramClient.connect().catch((error) => {
    console.error('L 5 C40;>AL ?>4:;NG8BLAO : Telegram ?@8 70?CA:5:', error)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await telegramClient.disconnect()
})

process.on('SIGINT', async () => {
  await telegramClient.disconnect()
})
