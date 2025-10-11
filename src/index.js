import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import express from 'express';
import bodyParser from 'body-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';

dotenv.config();

const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const SESSION = process.env.TELEGRAM_SESSION;
const PORT = process.env.PORT || 3000;

// Swagger определение
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Telegram API',
            version: '1.0.0',
            description: 'API для отправки сообщений через Telegram',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./src/index.js'], // файлы с JSDoc комментариями
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const session = new StringSession(SESSION);
let client = null;

async function initClient() {
    try {
        if (client) {
            console.log('Используем существующее подключение к Telegram');
            return client;
        }
        
        console.log('Инициализация нового подключения к Telegram...');
        console.log('API_ID:', API_ID);
        console.log('API_HASH:', API_HASH ? '✓ установлен' : '✗ отсутствует');
        console.log('SESSION:', SESSION ? '✓ установлен' : '✗ отсутствует');
        
        client = new TelegramClient(session, API_ID, API_HASH, {
            connectionRetries: 5,
        });
        
        console.log('Подключение к Telegram...');
        await client.connect();
        
        console.log('Проверка авторизации...');
        if (!await client.isUserAuthorized()) {
            throw new Error('Клиент не авторизован. Необходима перегенерация session string.');
        }
        
        console.log('Успешно подключено к Telegram');
        return client;
    } catch (err) {
        console.error('Ошибка при инициализации Telegram клиента:', err);
        throw new Error(`Ошибка подключения к Telegram: ${err.message}`);
    }
}

async function resolveUsername(username) {
    try {
        const tg = await initClient();
        const result = await tg.getEntity(username);
        return result;
    } catch (err) {
        return null;
    }
}

function saveBase64ToTemp(base64, filenameHint) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(base64 || '');
    let data = base64;
    let ext = null;

    if (match) {
        const mime = match[1].toLowerCase();
        data = match[2];
        if (mime === 'image/png') ext = '.png';
        else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
        else if (mime === 'image/webp') ext = '.webp';
        else if (mime === 'video/mp4') ext = '.mp4';
    }

    if (!ext && filenameHint) {
        const mm = /\.(\w+)$/.exec(filenameHint);
        if (mm) ext = '.' + mm[1].toLowerCase();
    }
    if (!ext) ext = '.bin';

    const buffer = Buffer.from((data || '').replace(/^\s+|\s+$/g, ''), 'base64');
    const tmpPath = path.join(os.tmpdir(), `tg_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
    fs.writeFileSync(tmpPath, buffer);
    return tmpPath;
}

/**
 * @swagger
 * /resolve:
 *   post:
 *     summary: Получить peer ID по username
 *     tags: [Telegram]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: Telegram username пользователя
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 peer:
 *                   type: string
 *                   description: Telegram peer ID
 *       404:
 *         description: Пользователь не найден
 *       400:
 *         description: Неверный запрос
 *       500:
 *         description: Ошибка сервера
 */
app.post('/resolve', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username обязателен' });
        }

        const peer = await resolveUsername(username);
        if (!peer) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ peer: peer.id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /sendText:
 *   post:
 *     summary: Отправить текстовое сообщение
 *     deprecated: true
 *     tags: [Telegram]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               peer:
 *                 type: string
 *                 description: Telegram peer ID
 *               username:
 *                 type: string
 *                 description: Telegram username (альтернатива peer)
 *               text:
 *                 type: string
 *                 description: Текст сообщения
 *     responses:
 *       200:
 *         description: Сообщение отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Получатель не найден
 *       400:
 *         description: Неверный запрос
 *       500:
 *         description: Ошибка сервера
 */
app.post('/sendText', async (req, res) => {
    try {
        console.log('Получен запрос POST /sendText:', req.body);
        const { peer, username, text } = req.body;
        
        // Проверяем наличие текста
        if (!text) {
            return res.status(400).json({ 
                error: 'Отсутствует текст сообщения',
                details: 'Параметр text обязателен'
            });
        }

        // Проверяем наличие получателя
        if (!peer && !username) {
            return res.status(400).json({ 
                error: 'Не указан получатель',
                details: 'Необходимо указать либо peer, либо username'
            });
        }

        const tg = await initClient();
        let target;

        if (username) {
            const uname = typeof username === 'string' ? username.replace(/^@/, '') : username;
            target = uname; // GramJS сам резолвит username
        } else if (peer) {
            try {
                target = await tg.getEntity(peer);
            } catch (e) {
                return res.status(400).json({
                    error: 'Некорректный peer',
                    details: 'Передайте username или используйте /resolve для получения корректного peer'
                });
            }
        }

        console.log('Отправляю текст:', text);
        await tg.sendMessage(target, { message: text });
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err);
        res.status(500).json({ 
            error: 'Ошибка при отправке сообщения',
            details: err.message,
            type: err.name
        });
    }
});

/**
 * @swagger
 * /sendMedia:
 *   post:
 *     summary: Отправить медиа с подписью
 *     deprecated: true
 *     tags: [Telegram]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               peer:
 *                 type: string
 *                 description: Telegram peer ID
 *               username:
 *                 type: string
 *                 description: Telegram username (альтернатива peer)
 *               media_url:
 *                 type: string
 *                 description: URL медиафайла (альтернатива media_base64)
 *               media_base64:
 *                 type: string
 *                 description: data URL (data:image/png;base64,...) или чистая base64 строка
 *               filename:
 *                 type: string
 *                 description: Имя файла (для выбора расширения, если нет data URL)
 *               caption:
 *                 type: string
 *                 description: Подпись к медиа (опционально)
 *     responses:
 *       200:
 *         description: Медиа отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Получатель не найден
 *       400:
 *         description: Неверный запрос
 *       500:
 *         description: Ошибка сервера
 */
app.post('/sendMedia', async (req, res) => {
    let tempPath = null;
    try {
        const { peer, username, media_url, media_base64, filename, caption } = req.body;
        if ((!media_url && !media_base64) || (!peer && !username)) {
            return res.status(400).json({ error: 'Необходимы peer/username и media_url или media_base64' });
        }

        const tg = await initClient();
        let target;
        if (username) {
            const uname = typeof username === 'string' ? username.replace(/^@/, '') : username;
            target = uname;
        } else if (peer) {
            try {
                target = await tg.getEntity(peer);
            } catch (e) {
                return res.status(400).json({
                    error: 'Некорректный peer',
                    details: 'Передайте username или используйте /resolve для получения корректного peer'
                });
            }
        }

        const fileInput = media_url ? media_url : (tempPath = saveBase64ToTemp(media_base64, filename));

        await tg.sendMessage(target, {
            message: caption || '',
            file: fileInput
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при отправке медиа:', err);
        res.status(500).json({
            error: 'Ошибка при отправке медиа',
            details: err.message,
            type: err.name
        });
    } finally {
        if (tempPath) {
            try { fs.unlinkSync(tempPath); } catch (_) {}
        }
    }
});

/**
 * @swagger
 * /send:
 *   post:
 *     summary: Отправить сообщение (текст и/или медиа)
 *     tags: [Telegram]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Текст сообщения (обязателен)
 *               peer:
 *                 type: string
 *                 description: Telegram peer ID (если не задан — используется "me")
 *               username:
 *                 type: string
 *                 description: Telegram username (альтернатива peer)
 *               media_url:
 *                 type: string
 *                 description: URL медиафайла (альтернатива media_base64)
 *               media_base64:
 *                 type: string
 *                 description: data URL (data:image/png;base64,...) или чистая base64 строка
 *               filename:
 *                 type: string
 *                 description: Имя файла (для выбора расширения, если нет data URL)
 *     responses:
 *       200:
 *         description: Сообщение отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Неверный запрос
 *       500:
 *         description: Ошибка сервера
 */
app.post('/send', async (req, res) => {
    let tempPath = null;
    try {
        const { peer, username, text, media_url, media_base64, filename } = req.body;
        if (!text) {
            return res.status(400).json({ 
                error: 'Отсутствует текст сообщения',
                details: 'Параметр text обязателен'
            });
        }

        const tg = await initClient();
        let target;
        if (username) {
            const uname = typeof username === 'string' ? username.replace(/^@/, '') : username;
            target = uname;
        } else if (peer) {
            try {
                target = await tg.getEntity(peer);
            } catch (e) {
                return res.status(400).json({
                    error: 'Некорректный peer',
                    details: 'Передайте username или используйте /resolve для получения корректного peer'
                });
            }
        } else {
            target = 'me';
        }

        let fileInput = null;
        if (media_url) {
            fileInput = media_url;
        } else if (media_base64) {
            tempPath = saveBase64ToTemp(media_base64, filename);
            fileInput = tempPath;
        }

        if (fileInput) {
            await tg.sendMessage(target, { message: text, file: fileInput });
        } else {
            await tg.sendMessage(target, { message: text });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err);
        res.status(500).json({ 
            error: 'Ошибка при отправке сообщения',
            details: err.message,
            type: err.name
        });
    } finally {
        if (tempPath) {
            try { fs.unlinkSync(tempPath); } catch (_) {}
        }
    }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Проверка работоспособности сервиса
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Сервис работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Swagger UI доступен по адресу: http://localhost:${PORT}/api-docs`);
});

// Обработка ошибок процесса
process.on('SIGINT', async () => {
    if (client) {
        await client.disconnect();
    }
    process.exit(0);
});