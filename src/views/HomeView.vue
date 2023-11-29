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
          <div>{{ userAPublicKey ? 'generated' : 'unk'}}</div>
        </div>
        <div>
          <strong>Public Key from User B:</strong>
          <input v-model="userBPublicKeyInput" />
        </div>

        <!-- Encrypt AES with pub key -->
        <div>
          <strong>encrypted AES</strong>
          <input v-model="encryptedAes" />
          <button @click="sendMessageToUserB">Send</button>
        </div>

        <div>
          <strong>Message to User B:</strong>
          <input v-model="userAMessage" />
          <button @click="sendMessageToUserB">Send</button>
        </div>
        <div>
          <strong>Received Message from User B:</strong>
          <div>{{ receivedMessageFromUserB }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Cipher2, arrayBufferToString, stringToArrayBuffer } from "@/modules/cipher";

const initialized = ref(false);
const userAPublicKey = ref(null);
const userBPublicKey = ref(null);
const encryptedAes = ref(null);
const userAPublicKeyInput = ref("");
const userBPublicKeyInput = ref("");
const userAMessage = ref("");
const userBMessage = ref("");
const receivedMessageFromUserA = ref(null);
const receivedMessageFromUserB = ref(null);

let cipher;

const initialize = async () => {
  cipher = new Cipher2();
  await cipher.init();

  // User A
  userAPublicKey.value = await cipher.getMyPublicKey();

  initialized.value = true;
};

const sendMessageToUserB = async () => {
  await cipher.setPeerPublicKey(stringToArrayBuffer(userBPublicKeyInput.value));

  const encryptedMessage = await cipher.encryptMessage(
    userAMessage.value,
    new Uint8Array(16) // Example: Use a random IV (Initialization Vector)
  );

  // Simulate sending the message to User B
  // In a real application, this would be sent through a secure channel
  const decryptedMessage = await cipher.decryptMessage(
    encryptedMessage,
    new Uint8Array(16)
  );
  receivedMessageFromUserB.value = arrayBufferToString(decryptedMessage);
};

const sendMessageToUserA = async () => {
  await cipher.setPeerPublicKey(stringToArrayBuffer(userAPublicKeyInput.value));

  const encryptedMessage = await cipher.encryptMessage(
    userBMessage.value,
    new Uint8Array(16)
  );

  // Simulate sending the message to User A
  // In a real application, this would be sent through a secure channel
  const decryptedMessage = await cipher.decryptMessage(
    encryptedMessage,
    new Uint8Array(16)
  );
  receivedMessageFromUserA.value = arrayBufferToString(decryptedMessage);
};
</script>
