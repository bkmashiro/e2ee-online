import { run } from '@/utils/pool'

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await self.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  )
  return keyPair
}

// 生成 AES 密钥
export async function generateAESKey(): Promise<CryptoKey> {
  const aesKey = await self.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  )
  const rawAes = await self.crypto.subtle.exportKey('raw', aesKey)
  console.warn(`aesKey`, rawAes)
  return aesKey
}

// 使用外部公钥加密 AES 密钥
export async function encryptAESKeyWithPublicKey(
  aesKey: ArrayBuffer,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  const encryptedKey = await self.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    aesKey
  )
  return encryptedKey
}

// 使用自己的私钥解密密文
export async function decryptWithPrivateKey(
  encryptedData: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  const decryptedData = await self.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedData
  )
  return decryptedData
}

// 使用对方的 AES 密钥加密密文
export async function encryptWithAESKey(
  text: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const encodedText = new TextEncoder().encode(text)
  const encryptedData = await self.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    aesKey,
    encodedText
  )

  return encryptedData
}

/**
 * 1. 生成 RSA 密钥对
 * 2. 生成 AES 密钥
 * 3. 使用 RSA 公钥加密 AES 密钥, 发送给对方
 * 4. 使用 RSA 私钥解密 AES 密钥
 * 5. 使用 AES 密钥加密消息
 * 6. 使用 AES 密钥解密消息
 *
 * Alice -RsaPubKey-> Bob
 * Alice <-AesEncryptedKey- Bob
 * (Alice decrypts AesEncryptedKey with her private key, now she has Bob's AES key)
 * Alice -AesEncryptedMessage-> Bob
 * Alice <-AesEncryptedMessage- Bob
 */
export class Cipher2 {
  private myAESKey?: CryptoKey
  private pairAESKey?: CryptoKey
  private myRSAKeyPair?: CryptoKeyPair
  private peerPublicKey?: CryptoKey
  public hasInit = false
  constructor() {
    this.myAESKey = null
    this.pairAESKey = null
    this.myRSAKeyPair = null
    this.peerPublicKey = null
  }

  public async init() {
    this.myRSAKeyPair = await run(generateRSAKeyPair)
    this.myAESKey = await run(generateAESKey)
    this.hasInit = true
  }

  // export public key
  public async getMyPublicKey() {
    const exported = await self.crypto.subtle.exportKey(
      'spki',
      this.myRSAKeyPair.publicKey
    )
    return exported
  }

  public async setPeerPublicKey(publicKey: ArrayBuffer) {
    let imported = await self.crypto.subtle.importKey(
      'spki',
      publicKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['encrypt']
    )
    this.peerPublicKey = imported
  }

  /**
   * get encrypted AES key (encrypted with peer's public key)
   * @returns
   */
  public async getEncryptedAESKey(): Promise<ArrayBuffer> {
    // get raw AES key
    const rawAESKey = await self.crypto.subtle.exportKey('raw', this.myAESKey)
    const encryptedAESKey = await run(
      encryptAESKeyWithPublicKey,
      rawAESKey,
      this.peerPublicKey
    )
    return encryptedAESKey
  }

  /**
   * use my private key to decrypt the encrypted AES key (received from peer, encrypted with my public key)
   * @param encryptedAESKey
   * @returns
   */
  public async decryptAndSaveAESKey(encryptedAESKey: ArrayBuffer) {
    const decryptedAESKey = await decryptWithPrivateKey(
      encryptedAESKey,
      this.myRSAKeyPair.privateKey
    )
    // console.warn(`decryptedAESKey`, decryptedAESKey)
    // convert ArrayBuffer to CryptoKey
    const aesKey = await self.crypto.subtle.importKey(
      'raw',
      decryptedAESKey,
      {
        name: 'AES-GCM'
      },
      true,
      ['encrypt', 'decrypt']
    )
    this.pairAESKey = aesKey
    return aesKey
  }

  /**
   * encrypt message with AES key
   * @param message
   * @returns
   */
  public async encryptMessage(message: string, iv: Uint8Array) {
    // const encryptedMessage = await run(encryptWithAESKey, message, this.AESKey)
    const encryptedMessage = await encryptWithAESKey(message, this.myAESKey, iv)
    return encryptedMessage
  }

  /**
   * decrypt message with AES key
   * @param encryptedMessage
   * @returns
   */
  public async decryptMessage(encryptedMessage: ArrayBuffer, iv: Uint8Array) {
    const decryptedMessage = await self.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.pairAESKey,
      encryptedMessage
    )

    return decryptedMessage
  }

  public AESKeyReady() {
    return this.myAESKey !== null
  }
}

export function arrayBufferToString(buffer: ArrayBuffer) {
  return new TextDecoder().decode(buffer)
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer
}
