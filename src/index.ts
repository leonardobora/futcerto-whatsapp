import express from 'express'
import { config } from './config'
import { MessageRouter } from './agents/router'

const app = express()
app.use(express.json())

const router = new MessageRouter()

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
})

// Webhook Evolution API
app.post('/webhook/evolution', async (req, res) => {
  try {
    const { data } = req.body
    if (!data?.message) return res.sendStatus(200)

    await router.route({
      channel: 'evolution',
      phone: data.key.remoteJid.replace('@s.whatsapp.net', ''),
      message: data.message.conversation || data.message.extendedTextMessage?.text || '',
      raw: req.body,
    })

    res.sendStatus(200)
  } catch (error) {
    console.error('Evolution webhook error:', error)
    res.sendStatus(500)
  }
})

// Webhook OpenClaw
app.post('/webhook/openclaw', async (req, res) => {
  try {
    const { from, text } = req.body
    if (!text) return res.sendStatus(200)

    await router.route({
      channel: 'openclaw',
      phone: from,
      message: text,
      raw: req.body,
    })

    res.sendStatus(200)
  } catch (error) {
    console.error('OpenClaw webhook error:', error)
    res.sendStatus(500)
  }
})

// Webhook Tyxter
app.post('/webhook/tyxter', async (req, res) => {
  try {
    const { contact, message } = req.body
    if (!message?.text) return res.sendStatus(200)

    await router.route({
      channel: 'tyxter',
      phone: contact.phone,
      message: message.text,
      raw: req.body,
    })

    res.sendStatus(200)
  } catch (error) {
    console.error('Tyxter webhook error:', error)
    res.sendStatus(500)
  }
})

app.listen(config.app.port, () => {
  console.log(`FutCerto v2.0 rodando na porta ${config.app.port}`)
})
