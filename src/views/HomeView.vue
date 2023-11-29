<!-- src/views/E2EEPage.vue -->

<template>
  <div>
    <h1>End-to-End Encryption Demo</h1>

    <div v-if="!initialized">
      <button @click="initialize">Initialize</button>
    </div>

    <div v-else>
      <div>
        <h2>User A</h2>
        <div>
          <strong>Public Key:</strong>
          <div>{{ userAPublicKey ? 'generated' : 'unk' }}</div>
          <button @click="savePubKeyToClipboard">Copy</button>
        </div>
        <div>
          <strong>Public Key from User B:</strong>
          <input v-model="userBPublicKeyInput"
                 @blur="genEncryptedAes" />
        </div>

        <div>
          <strong>my encrypted AES</strong>
          <input v-model="encryptedAes" />
          <button @click="copyEncryptedAes">Gen</button>
        </div>

        <div>
          <strong>encrypted AES from user B</strong>
          <input v-model="userBEncrypetAes" />
          <button @click="importBAes">import</button>
        </div>

        <div>
          <strong>Message to User B:</strong>
          <input v-model="myMsg" />
          <button @click="enc"> -> </button>
          <input v-model="encryptedUserBMessage" />
        </div>
        <div>
          <strong>Received Message from User B:</strong>
          <input v-model="pairMsg" />
          <button @click="dec"> -> </button>
          <input v-model="receivedMessageFromUserB" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Cipher2, decodeBase64ToBuffer, arrayBufferToBase64 } from "@/modules/cipher";
import { auditTime } from "rxjs/operators"
import { Subject } from 'rxjs'
const initialized = ref(false);
const userAPublicKey = ref(null);
const encryptedAes = ref(null);
const userBEncrypetAes = ref("");
const userBPublicKeyInput = ref("");
const myMsg = ref("");
const pairMsg = ref("");
const encryptedUserBMessage = ref("");
const receivedMessageFromUserB = ref("")
let cipher: Cipher2;

export const myMessageUpdateObject: Subject<any> = new Subject()
// audit time 500 ms
myMessageUpdateObject.pipe(auditTime(500)).subscribe((v) => {
  console.log(`myMessageUpdateObject`, v)
  enc()
})

watch(myMsg, (v) => {
  myMessageUpdateObject.next(v)
})

watch(pairMsg, (v) => {
  dec()
})

const initialize = async () => {
  cipher = new Cipher2();
  await cipher.init();

  // User A
  userAPublicKey.value = await cipher.getMyPublicKey();

  initialized.value = true;
};

const enc = async () => {
  if (!cipher.AESKeyReady) {
    return null;
  }
  const iv = new Uint8Array(12)
  const obuf = await cipher.encryptMessage(
    myMsg.value,
    iv // Example: Use a random IV (Initialization Vector)
  )

  encryptedUserBMessage.value = arrayBufferToBase64(obuf);

}

const dec = async () => {
  console.log(`cipher.pairAESKeyReady`, cipher.pairAESKeyReady)
  if (!cipher.pairAESKeyReady) {
    return null;
  }

  const buf = decodeBase64ToBuffer(pairMsg.value)

  const decrypted = await cipher.decryptMessage(
    buf,
    new Uint8Array(12)
  );

  receivedMessageFromUserB.value = new TextDecoder().decode(decrypted)
}

const savePubKeyToClipboard = async () => {
  const pubkey = await cipher.getMyPublicKey()
  console.log(`pubkey`, pubkey)
  await navigator.clipboard.writeText(arrayBufferToBase64(pubkey));
}

const genEncryptedAes = async () => {
  const buf = decodeBase64ToBuffer(userBPublicKeyInput.value)
  console.log(buf)
  await cipher.setPeerPublicKey(buf)
  const eaes = await cipher.getEncryptedAESKey()
  console.log(eaes)
  encryptedAes.value = arrayBufferToBase64(eaes)
}

const copyEncryptedAes = async () => {
  await navigator.clipboard.writeText(encryptedAes.value);
}

const importBAes = async () => {
  const buf = decodeBase64ToBuffer(userBEncrypetAes.value)
  console.log(buf)
  await cipher.decryptAndSaveAESKey(buf)
  console.warn(`pair aes`, cipher.getPairAESKey())
}
</script>
