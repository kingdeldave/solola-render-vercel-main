// Fonctions Firestore/Storage pour remplacer le backend FastAPI.
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';

export function subscribeUsers(callback) {
  // Écoute la liste des utilisateurs pour créer des conversations.
  const q = query(collection(db, 'users'), orderBy('displayName'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export function subscribeConversations(userId, callback) {
  // Écoute les conversations où l'utilisateur connecté est participant.
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', userId),
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
        const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
    callback(items);
  });
}

export function subscribeConversationMessages(conversationId, callback) {
  // Écoute les messages de la conversation sélectionnée.
  if (!conversationId) return () => undefined;

  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(500),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export async function createPrivateConversation({ currentUser, targetUser }) {
  // Réutilise une conversation privée existante si elle existe déjà.
  const currentId = currentUser.uid;
  const targetId = targetUser.uid;
  const privateKey = [currentId, targetId].sort().join('_');
  const conversationRef = doc(db, 'conversations', `private_${privateKey}`);
  const snap = await getDoc(conversationRef);

  if (snap.exists()) {
    return { id: conversationRef.id, ...snap.data() };
  }

  const payload = {
    type: 'private',
    title: '',
    photoUrl: '',
    createdBy: currentId,
    participantIds: [currentId, targetId],
    participantInfo: {
      [currentId]: {
        uid: currentId,
        displayName: currentUser.displayName || currentUser.email || 'Moi',
        avatarUrl: currentUser.photoURL || '',
      },
      [targetId]: {
        uid: targetId,
        displayName: targetUser.displayName || targetUser.email || targetUser.phoneNumber || 'Contact',
        avatarUrl: targetUser.avatarUrl || '',
      },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
  };

  await setDoc(conversationRef, payload);
  return { id: conversationRef.id, ...payload };
}

export async function createGroupConversation({ currentUser, title, participantIds, usersById }) {
  // Crée un groupe avec l'utilisateur courant + les membres choisis.
  const cleanTitle = title.trim() || 'Nouveau groupe';
  const uniqueParticipants = Array.from(new Set([currentUser.uid, ...participantIds]));

  const participantInfo = {};
  for (const uid of uniqueParticipants) {
    const user = usersById[uid] || {};
    participantInfo[uid] = {
      uid,
      displayName: user.displayName || user.email || user.phoneNumber || 'Membre',
      avatarUrl: user.avatarUrl || '',
    };
  }

  const docRef = await addDoc(collection(db, 'conversations'), {
    type: 'group',
    title: cleanTitle,
    photoUrl: '',
    createdBy: currentUser.uid,
    participantIds: uniqueParticipants,
    participantInfo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
  });

  return docRef.id;
}

export async function sendTextMessage({ conversationId, senderProfile, text }) {
  // Envoie un message texte simple.
  const cleanText = text.trim();
  if (!cleanText) return;

  const message = {
    senderId: senderProfile.uid,
    senderName: senderProfile.displayName || senderProfile.email || 'Utilisateur',
    senderAvatarUrl: senderProfile.avatarUrl || '',
    type: 'text',
    text: cleanText,
    createdAt: serverTimestamp(),
    editedAt: null,
  };

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), message);
  await updateDoc(doc(db, 'conversations', conversationId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      type: 'text',
      text: cleanText,
      senderId: senderProfile.uid,
      senderName: message.senderName,
      createdAt: serverTimestamp(),
    },
  });
}

export async function sendEncryptedMessage({ conversationId, senderProfile, encryptedPayload }) {
  // Envoie un message chiffré localement avant écriture Firestore.
  const message = {
    senderId: senderProfile.uid,
    senderName: senderProfile.displayName || senderProfile.email || 'Utilisateur',
    senderAvatarUrl: senderProfile.avatarUrl || '',
    type: 'encrypted',
    text: 'Message chiffré',
    encryptedPayload,
    createdAt: serverTimestamp(),
    editedAt: null,
  };

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), message);
  await updateDoc(doc(db, 'conversations', conversationId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      type: 'encrypted',
      text: '🔐 Message chiffré',
      senderId: senderProfile.uid,
      senderName: message.senderName,
      createdAt: serverTimestamp(),
    },
  });
}

export async function uploadConversationFile({ conversationId, senderProfile, file }) {
  // Téléverse un fichier dans Firebase Storage puis crée le message associé.
  const safeName = `${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileRef = ref(storage, `conversation-files/${conversationId}/${safeName}`);
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
  const downloadUrl = await getDownloadURL(fileRef);

  const filePayload = {
    name: file.name,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
    url: downloadUrl,
  };

  const message = {
    senderId: senderProfile.uid,
    senderName: senderProfile.displayName || senderProfile.email || 'Utilisateur',
    senderAvatarUrl: senderProfile.avatarUrl || '',
    type: file.type?.startsWith('image/') ? 'image' : 'file',
    text: file.name,
    file: filePayload,
    createdAt: serverTimestamp(),
    editedAt: null,
  };

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), message);
  await updateDoc(doc(db, 'conversations', conversationId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      type: message.type,
      text: `📎 ${file.name}`,
      senderId: senderProfile.uid,
      senderName: message.senderName,
      createdAt: serverTimestamp(),
    },
  });
}

export async function deleteMessage({ conversationId, messageId }) {
  // Supprime un message. Les règles Firestore limitent l'action au propriétaire/admin.
  await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
}

export async function createStatus({ ownerProfile, file, caption }) {
  // Crée un statut avec média optionnel. Les statuts sont filtrés côté interface après 24h.
  let media = null;

  if (file) {
    const safeName = `${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `statuses/${ownerProfile.uid}/${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
    media = {
      url: await getDownloadURL(fileRef),
      name: file.name,
      contentType: file.type || 'application/octet-stream',
      type: file.type?.startsWith('image/') ? 'image' : 'file',
    };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await addDoc(collection(db, 'statuses'), {
    ownerId: ownerProfile.uid,
    ownerName: ownerProfile.displayName || ownerProfile.email || 'Utilisateur',
    ownerAvatarUrl: ownerProfile.avatarUrl || '',
    caption: caption.trim(),
    media,
    createdAt: serverTimestamp(),
    expiresAt,
  });
}

export function subscribeStatuses(callback) {
  // Écoute les statuts récents. Firestore ne supprime pas automatiquement les documents sans TTL configuré.
  const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => {
        const expiresAt = item.expiresAt?.toDate ? item.expiresAt.toDate().getTime() : new Date(item.expiresAt || 0).getTime();
        return !expiresAt || expiresAt > now;
      });
    callback(items);
  });
}

export async function deleteStatus(statusId) {
  // Supprime un statut. Les règles Firestore protègent l'action.
  await deleteDoc(doc(db, 'statuses', statusId));
}

export async function updateMyProfile({ uid, patch }) {
  // Met à jour le profil courant.
  await setDoc(
    doc(db, 'users', uid),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function uploadAvatar({ uid, file }) {
  // Téléverse un avatar dans Firebase Storage.
  const safeName = `${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileRef = ref(storage, `profile-images/${uid}/${safeName}`);
  await uploadBytes(fileRef, file, { contentType: file.type || 'image/png' });
  return getDownloadURL(fileRef);
}

export function subscribeAdminData(callback) {
  // Données admin : utilisateurs, conversations, statuts.
  const unsubscribers = [];
  const state = { users: [], conversations: [], statuses: [] };

  const emit = () => callback({ ...state });

  unsubscribers.push(
    onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
      state.users = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      emit();
    }),
  );

  unsubscribers.push(
    onSnapshot(query(collection(db, 'conversations'), orderBy('updatedAt', 'desc'), limit(200)), (snapshot) => {
      state.conversations = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      emit();
    }),
  );

  unsubscribers.push(
    onSnapshot(query(collection(db, 'statuses'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
      state.statuses = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      emit();
    }),
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function setUserRole({ uid, role }) {
  // Change le rôle d'un utilisateur. Autorisé uniquement à un ADMIN par les règles Firestore.
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() });
}

export async function addMembersToConversation({ conversationId, members, usersById }) {
  // Ajoute des membres à un groupe.
  const conversationRef = doc(db, 'conversations', conversationId);
  const patchInfo = {};

  for (const uid of members) {
    const user = usersById[uid] || {};
    patchInfo[`participantInfo.${uid}`] = {
      uid,
      displayName: user.displayName || user.email || user.phoneNumber || 'Membre',
      avatarUrl: user.avatarUrl || '',
    };
  }

  await updateDoc(conversationRef, {
    participantIds: arrayUnion(...members),
    ...patchInfo,
    updatedAt: serverTimestamp(),
  });
}
