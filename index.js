//import modules
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require("pino")
const chalk = require('chalk')
const readline = require('readline')

// --- CONFIGURATION ---
const usePairingCode = true 

// --- SETUP INPUT ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

let number = ''
async function connectToWhatsApp() {
    console.log(chalk.green(`\n\n==== SELAMAT DATANG DI BOT WHATSAPP DANANG ==== \n`))
    
    // 1. SIAPKAN DATA SESI
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    // 2. TANYA NOMOR DULU 
    if (usePairingCode && !state.creds.me) {
        const inputNomor = await question(chalk.blue("Masukan nomer anda (awali dengan 628xxx): "))
        number = inputNomor.trim()

        if (!number) {
            console.log(chalk.red("Nomor kosong! Silakan ulang."))
            process.exit(0)
        }
    }

    // 3. BUAT KONEKSI SOCKET (Cukup sekali disini!)
    console.log(chalk.cyan('\nMenghubungkan ke WhatsApp...'))
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Browser Linux
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000
    })

    // 4. EKSEKUSI MINTA KODE PAIRING

    if (usePairingCode && !sock.authState.creds.me && number) {
        console.log(chalk.yellow("Sedang memproses... Tunggu 6 detik..."))
        
   
        setTimeout(async () => {
            try {
                // Request kode pairing
                const code = await sock.requestPairingCode(number)
              
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code
                console.log(chalk.green(`\n KODE PAIRING KAMU: `))
                console.log(chalk.bgGreen.black(`  ${formattedCode}  `))
                console.log(chalk.yellow("\n Silakan input kode di HP dalam 30 detik sebelum bot mati..."))
                setTimeout(() => {
                    console.log(chalk.red("Waktu habis. Bot dimatikan."))
                    process.exit(0) 
                }, 3000) 
            } catch (err) {
                console.log(chalk.red("\n❌ Gagal meminta kode!"))
                console.log("Error Detail:", err.message)
            }
        }, 6000)
    }

    // 5. SIMPAN SESI & HANDLE KONEKSI
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log(chalk.red('\n Koneksi terputus!'), 'Reconnect:', shouldReconnect)
            
            if (shouldReconnect) {
       
                connectToWhatsApp() 
            } else {
                console.log(chalk.red('Sesi logout. Hapus folder auth_info dan scan ulang.'))
                process.exit(0)
            }
        } else if (connection === 'open') {
            console.log(chalk.green('\n BOT BERHASIL CONNECT! 🚀'))
        }
    })


    sock.ev.on('messages.upsert', async chatUpdate => {

    })
}

// Jalankan fungsi
connectToWhatsApp()