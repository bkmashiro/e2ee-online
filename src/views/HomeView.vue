<!-- src/views/E2EEPage.vue -->

<template>
  <div>
    <h1>End-to-End Encryption</h1>

    <div>
      <div>
        <div v-if="phase === 0">
          <h2>Phase 1: Exchange Public Key</h2>
          <ol>
            <li>
              <div>
                <button @click="copyMyPubKey">Copy</button>
                <strong>and send this to your peer</strong>
              </div>
            </li>
            <li>
              <div>
                <button @click="importPeerPubkey">Paste</button>
                <strong>the content your peer sent to you</strong>
              </div>
            </li>
          </ol>
        </div>

        <div v-if="phase === 1">
          <h2>Phase 2: Swap AES Key</h2>
          <ol>
            <li>
              <div>
                <button @click="copyMyAes">Copy</button>
                <strong>this and send to your peer</strong>
              </div>
            </li>
            <li>
              <div>
                <button @click="importPeerAes">Paste</button>
                <strong>what your peer just sent you</strong>
              </div>
            </li>
          </ol>
        </div>

        <div v-if="phase === 2">
          <h2>E2EE Established</h2>
          <div>
            <strong>Message to User B:</strong>
            <input v-model="myMsg" />
            <button @click="myMsg = ''">Clean</button>
            <span v-if="myMsgSynced" class="green-circle"></span>
            <span v-if="!myMsgSynced" class="red-circle"></span>
          </div>
          <div>
            <strong>Received Message from User B:</strong>
            <!-- <input v-model="pairMsg" /> -->
            <button @click="pastePairMsg">Paste</button>
            <span v-if="peerMsgSynced" class="green-circle"></span>
            <span v-if="!peerMsgSynced" class="red-circle"></span>
          </div>

          <div>
            <h2>History messages</h2>
            <div v-for="msg in historyMessagesReversed">
              <span>{{ msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Cipher2, decodeBase64ToBuffer, arrayBufferToBase64 } from "@/modules/cipher";
import { auditTime, throttleTime } from "rxjs/operators"
import { Subject } from 'rxjs'
const userAPublicKey = ref(null);
const myMsg = ref("");
const myMsgSynced = ref(false)
const peerMsgSynced = ref(false)
const historyMessages = ref([])
const historyMessagesReversed = computed(() => historyMessages.value.slice().reverse())

let cipher: Cipher2;
const phase = ref(0)

onMounted(() => {
  initialize()
})

const myMessageUpdateObject: Subject<any> = new Subject()
const peerMessageUpdateObject: Subject<any> = new Subject()
// audit time 500 ms
myMessageUpdateObject.pipe(auditTime(200)).subscribe(() => {
  enc()
})

peerMessageUpdateObject.pipe(auditTime(200)).subscribe((v) => {
  dec(v)

  peerMsgSynced.value = false
})

watch(myMsg, (v) => {
  myMsgSynced.value = false
  myMessageUpdateObject.next(v)
})

const initialize = async () => {
  cipher = new Cipher2();
  await cipher.init();
  userAPublicKey.value = await cipher.getMyPublicKey();
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

  writeToClipboard(arrayBufferToBase64(obuf))
  myMsgSynced.value = true
}

const dec = async (pairMsg: string) => {
  try {
    if (!cipher.pairAESKeyReady) {
      return null;
    }

    const buf = decodeBase64ToBuffer(pairMsg)

    const decrypted = await cipher.decryptMessage(
      buf,
      new Uint8Array(12)
    );
    const decoded = new TextDecoder().decode(decrypted)
    historyMessages.value.push(decoded)
    peerMsgSynced.value = true
  } catch (e) {

  }
}

const writeToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

const copyClipboard = async () => {
  return await navigator.clipboard.readText();
};

const copyMyPubKey = async () => {
  const pubkey = await cipher.getMyPublicKey()
  await writeToClipboard(arrayBufferToBase64(pubkey));
}

const copyMyAes = async () => {
  const encryptedAes = await cipher.getEncryptedAESKey()
  await writeToClipboard(arrayBufferToBase64(encryptedAes));
}

const importPeerPubkey = async () => {
  try {
    const buf = decodeBase64ToBuffer(await copyClipboard())
    console.log(`buf`, buf)
    await cipher.setPeerPublicKey(buf)
    phase.value = 1
  } catch (e) {
    console.error(e)
  }
}

const importPeerAes = async () => {
  try {
    const buf = decodeBase64ToBuffer(await copyClipboard())
    console.log(`buf`, buf)
    await cipher.decryptAndSaveAESKey(buf)
    phase.value = 2
  } catch (e) {
    console.error(e)
  }
}

const pastePairMsg = async () => {
  const pairMsg = await copyClipboard()
  peerMsgSynced.value = false
  peerMessageUpdateObject.next(pairMsg)
}
</script>
<style scoped>
.red-circle {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  background-color: red;
  display: inline-block;
}

.green-circle {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  background-color: green;
  display: inline-block;
}
</style>