/**
 * VRMA暗号化スクリプト
 * VRMAファイルをAES-256-CBCで暗号化して1つのバンドルファイルにまとめる
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// 暗号化キー（32バイト = 256ビット）
// 本番環境では環境変数などで管理することを推奨
const ENCRYPTION_KEY = Buffer.from('R3al1z3VRM4Pr3s3tK3y2024Encrypt!', 'utf8')
const IV_LENGTH = 16

const ANIMATIONS_DIR = path.join(__dirname, '..', 'resources', 'animations')
const OUTPUT_FILE = path.join(__dirname, '..', 'resources', 'animations.enc')

// アニメーションメタデータ
const ANIMATION_PRESETS = [
    { id: 'fullbody', file: 'VRMA_01.vrma' },
    { id: 'greeting', file: 'VRMA_02.vrma' },
    { id: 'vsign', file: 'VRMA_03.vrma' },
    { id: 'shoot', file: 'VRMA_04.vrma' },
    { id: 'spin', file: 'VRMA_05.vrma' },
    { id: 'pose', file: 'VRMA_06.vrma' },
    { id: 'squat', file: 'VRMA_07.vrma' }
]

function encrypt(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
    return Buffer.concat([iv, encrypted])
}

async function main() {
    console.log('VRMAファイルを暗号化中...')

    const bundle = {
        version: 1,
        animations: {}
    }

    for (const preset of ANIMATION_PRESETS) {
        const filePath = path.join(ANIMATIONS_DIR, preset.file)
        if (!fs.existsSync(filePath)) {
            console.error(`ファイルが見つかりません: ${filePath}`)
            process.exit(1)
        }

        const fileBuffer = fs.readFileSync(filePath)
        const encrypted = encrypt(fileBuffer)
        bundle.animations[preset.id] = encrypted.toString('base64')
        console.log(`  ${preset.id}: ${preset.file} (${fileBuffer.length} bytes -> ${encrypted.length} bytes)`)
    }

    // JSONとして保存（暗号化データはBase64エンコード）
    const bundleJson = JSON.stringify(bundle)
    const bundleEncrypted = encrypt(Buffer.from(bundleJson, 'utf8'))
    fs.writeFileSync(OUTPUT_FILE, bundleEncrypted)

    console.log(`\n暗号化完了: ${OUTPUT_FILE}`)
    console.log(`出力サイズ: ${bundleEncrypted.length} bytes`)

    // 元のVRMAファイルを削除（ビルド後）
    console.log('\n元のVRMAファイルを削除中...')
    for (const preset of ANIMATION_PRESETS) {
        const filePath = path.join(ANIMATIONS_DIR, preset.file)
        fs.unlinkSync(filePath)
        console.log(`  削除: ${preset.file}`)
    }
    fs.rmdirSync(ANIMATIONS_DIR)
    console.log('完了!')
}

main().catch(console.error)
