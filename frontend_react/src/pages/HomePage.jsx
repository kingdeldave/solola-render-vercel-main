// Interface principale : discussions, statuts, paramètres et administration.
import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logout } from '../services/authService';
import {
  addMembersToConversation,
  createGroupConversation,
  createPrivateConversation,
  createStatus,
  deleteMessage,
  deleteStatus,
  sendEncryptedMessage,
  sendTextMessage,
  subscribeAdminData,
  subscribeConversationMessages,
  subscribeConversations,
  subscribeStatuses,
  subscribeUsers,
  updateMyProfile,
  uploadAvatar,
  uploadConversationFile,
  setUserRole,
} from '../services/firestoreService';
import { decryptText, encryptText } from '../utils/crypto';
import { formatDate, formatHour, friendlyFirebaseError, previewMessage } from '../utils/format';

const sections = [
  { id: 'chats', label: 'Discussions' },
  { id: 'status', label: 'Statuts' },
  { id: 'secure', label: 'Sécurité' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'admin', label: 'Admin' },
];

export default function HomePage() {
  const { firebaseUser, profile, isAdmin } = useAuth();
  const [section, setSection] = useState('chats');

  const visibleSections = sections.filter((item) => item.id !== 'admin' || isAdmin);

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brandLine">
          <img src="/solola_logo.png" alt="Solola" />
          <div>
            <strong>SOLOLA</strong>
            <span>React + Firebase</span>
          </div>
        </div>

        <nav className="sideNav">
          {visibleSections.map((item) => (
            <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sideProfile">
          <Avatar src={profile?.avatarUrl} name={profile?.displayName || firebaseUser?.email} />
          <div>
            <strong>{profile?.displayName || firebaseUser?.email || 'Utilisateur'}</strong>
            <span>{profile?.role || 'USER'}</span>
          </div>
        </div>
      </aside>

      <section className="mainPanel">
        {section === 'chats' && <ChatsPanel />}
        {section === 'status' && <StatusPanel />}
        {section === 'secure' && <SecurePanel />}
        {section === 'settings' && <SettingsPanel />}
        {section === 'admin' && isAdmin && <AdminPanel />}
      </section>
    </main>
  );
}

function ChatsPanel() {
  const { firebaseUser, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const selectedConversation = conversations.find((item) => item.id === selectedId) || null;
  const usersById = useMemo(() => Object.fromEntries(users.map((user) => [user.uid, user])), [users]);

  useEffect(() => {
    const unsubscribeUsers = subscribeUsers((items) => setUsers(items.filter((item) => item.uid !== firebaseUser.uid)));
    const unsubscribeConversations = subscribeConversations(firebaseUser.uid, (items) => {
      setConversations(items);
      setSelectedId((current) => current || items[0]?.id || null);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeConversations();
    };
  }, [firebaseUser.uid]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return undefined;
    }

    return subscribeConversationMessages(selectedId, setMessages);
  }, [selectedId]);

  async function handleSend(event) {
    event.preventDefault();
    if (!selectedId || !profile) return;

    try {
      await sendTextMessage({ conversationId: selectedId, senderProfile: profile, text });
      setText('');
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedId || !profile) return;

    try {
      await uploadConversationFile({ conversationId: selectedId, senderProfile: profile, file });
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  async function handleStartPrivate(targetUser) {
    try {
      const conversation = await createPrivateConversation({ currentUser: firebaseUser, targetUser });
      setSelectedId(conversation.id);
      setShowNewChat(false);
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  return (
    <div className="chatLayout">
      <section className="conversationList glassCard">
        <div className="panelHeader">
          <div>
            <h2>Discussions</h2>
            <p>{conversations.length} conversation(s)</p>
          </div>
          <div className="rowGap">
            <button className="smallButton" onClick={() => setShowNewChat(true)}>+ Chat</button>
            <button className="smallButton" onClick={() => setShowNewGroup(true)}>+ Groupe</button>
          </div>
        </div>

        {conversations.length === 0 ? (
          <EmptyState title="Aucune discussion" text="Crée un chat avec un utilisateur Firebase." />
        ) : (
          <div className="listStack">
            {conversations.map((conversation) => {
              const title = getConversationTitle(conversation, firebaseUser.uid);
              const avatar = getConversationAvatar(conversation, firebaseUser.uid);
              return (
                <button
                  key={conversation.id}
                  className={selectedId === conversation.id ? 'listItem active' : 'listItem'}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <Avatar src={avatar} name={title} />
                  <span className="itemMain">
                    <strong>{title}</strong>
                    <small>{previewMessage(conversation)}</small>
                  </span>
                  <small>{formatHour(conversation.updatedAt)}</small>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="messagePanel glassCard">
        {selectedConversation ? (
          <>
            <div className="chatHeader">
              <Avatar src={getConversationAvatar(selectedConversation, firebaseUser.uid)} name={getConversationTitle(selectedConversation, firebaseUser.uid)} />
              <div>
                <h2>{getConversationTitle(selectedConversation, firebaseUser.uid)}</h2>
                <p>{selectedConversation.participantIds?.length || 0} participant(s)</p>
              </div>
              {selectedConversation.type === 'group' && (
                <AddMembersButton conversation={selectedConversation} users={users} usersById={usersById} />
              )}
            </div>

            <MessageList
              conversationId={selectedConversation.id}
              messages={messages}
              currentUid={firebaseUser.uid}
              onError={setError}
            />

            <form className="composer" onSubmit={handleSend}>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Écris un message..." />
              <label className="fileButton">
                📎
                <input type="file" onChange={handleFile} />
              </label>
              <EncryptedMessageButton conversationId={selectedConversation.id} senderProfile={profile} onError={setError} />
              <button className="primaryButton compact" type="submit">Envoyer</button>
            </form>
          </>
        ) : (
          <EmptyState title="Sélectionne une discussion" text="Tes messages Firebase apparaîtront ici en temps réel." />
        )}

        {error && <div className="alert error">{error}</div>}
      </section>

      {showNewChat && (
        <Modal title="Nouvelle discussion" onClose={() => setShowNewChat(false)}>
          <div className="listStack modalList">
            {users.map((user) => (
              <button key={user.uid} className="listItem" onClick={() => handleStartPrivate(user)}>
                <Avatar src={user.avatarUrl} name={user.displayName || user.email || user.phoneNumber} />
                <span className="itemMain">
                  <strong>{user.displayName || user.email || user.phoneNumber}</strong>
                  <small>{user.email || user.phoneNumber}</small>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showNewGroup && (
        <NewGroupModal
          users={users}
          usersById={usersById}
          currentUser={firebaseUser}
          onClose={() => setShowNewGroup(false)}
          onCreated={(id) => {
            setSelectedId(id);
            setShowNewGroup(false);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function MessageList({ conversationId, messages, currentUid, onError }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return <EmptyState title="Aucun message" text="Commence la conversation." />;
  }

  return (
    <div className="messages">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          conversationId={conversationId}
          message={message}
          own={message.senderId === currentUid}
          onError={onError}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ conversationId, message, own, onError }) {
  const [pin, setPin] = useState('');
  const [clearText, setClearText] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  async function handleDecrypt() {
    setDecrypting(true);
    try {
      const value = await decryptText({ payload: message.encryptedPayload, pin });
      setClearText(value);
    } catch (err) {
      onError('PIN incorrect ou message invalide.');
    } finally {
      setDecrypting(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteMessage({ conversationId, messageId: message.id });
    } catch (err) {
      onError(friendlyFirebaseError(err));
    }
  }

  return (
    <div className={own ? 'messageBubble own' : 'messageBubble'}>
      {!own && <small className="senderName">{message.senderName}</small>}

      {message.type === 'encrypted' ? (
        <div className="encryptedBox">
          <strong>🔐 Message chiffré</strong>
          {message.encryptedPayload?.hint && <small>Indice : {message.encryptedPayload.hint}</small>}
          {clearText ? (
            <p>{clearText}</p>
          ) : (
            <div className="decryptRow">
              <input type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="PIN" />
              <button type="button" onClick={handleDecrypt} disabled={decrypting || !pin}>Ouvrir</button>
            </div>
          )}
        </div>
      ) : message.type === 'image' ? (
        <a href={message.file?.url} target="_blank" rel="noreferrer" className="imageMessage">
          <img src={message.file?.url} alt={message.file?.name || 'Image'} />
        </a>
      ) : message.type === 'file' ? (
        <a href={message.file?.url} target="_blank" rel="noreferrer" className="fileMessage">
          📎 {message.file?.name || message.text}
        </a>
      ) : (
        <p>{message.text}</p>
      )}

      <span className="messageMeta">
        {formatHour(message.createdAt)}
        {own && <button type="button" onClick={handleDelete}>Supprimer</button>}
      </span>
    </div>
  );
}

function EncryptedMessageButton({ conversationId, senderProfile, onError }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pin, setPin] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const encryptedPayload = await encryptText({ text, pin, hint });
      await sendEncryptedMessage({ conversationId, senderProfile, encryptedPayload });
      setText('');
      setPin('');
      setHint('');
      setOpen(false);
    } catch (err) {
      onError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="secondaryButton compact" onClick={() => setOpen(true)}>🔐</button>
      {open && (
        <Modal title="Message chiffré" onClose={() => setOpen(false)}>
          <form className="formStack" onSubmit={handleSend}>
            <label>
              Message
              <textarea value={text} onChange={(event) => setText(event.target.value)} required />
            </label>
            <label>
              PIN secret
              <input type="password" value={pin} onChange={(event) => setPin(event.target.value)} required />
            </label>
            <label>
              Indice optionnel
              <input value={hint} onChange={(event) => setHint(event.target.value)} placeholder="Ex : date importante" />
            </label>
            <button className="primaryButton" disabled={loading} type="submit">
              {loading ? 'Chiffrement...' : 'Envoyer chiffré'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function NewGroupModal({ users, usersById, currentUser, onClose, onCreated, onError }) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  function toggle(uid) {
    setSelected((current) => (current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const id = await createGroupConversation({ currentUser, title, participantIds: selected, usersById });
      onCreated(id);
    } catch (err) {
      onError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nouveau groupe" onClose={onClose}>
      <form className="formStack" onSubmit={handleCreate}>
        <label>
          Nom du groupe
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Famille, Équipe, Classe..." required />
        </label>
        <div className="checkList">
          {users.map((user) => (
            <label key={user.uid} className="checkItem">
              <input type="checkbox" checked={selected.includes(user.uid)} onChange={() => toggle(user.uid)} />
              <Avatar src={user.avatarUrl} name={user.displayName || user.email || user.phoneNumber} size={34} />
              <span>{user.displayName || user.email || user.phoneNumber}</span>
            </label>
          ))}
        </div>
        <button className="primaryButton" disabled={loading || !title.trim()} type="submit">
          {loading ? 'Création...' : 'Créer le groupe'}
        </button>
      </form>
    </Modal>
  );
}

function AddMembersButton({ conversation, users, usersById }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');

  const availableUsers = users.filter((user) => !conversation.participantIds?.includes(user.uid));

  function toggle(uid) {
    setSelected((current) => (current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]));
  }

  async function handleAdd(event) {
    event.preventDefault();
    try {
      await addMembersToConversation({ conversationId: conversation.id, members: selected, usersById });
      setOpen(false);
      setSelected([]);
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  return (
    <>
      <button className="smallButton" onClick={() => setOpen(true)}>Ajouter</button>
      {open && (
        <Modal title="Ajouter des membres" onClose={() => setOpen(false)}>
          <form className="formStack" onSubmit={handleAdd}>
            <div className="checkList">
              {availableUsers.map((user) => (
                <label key={user.uid} className="checkItem">
                  <input type="checkbox" checked={selected.includes(user.uid)} onChange={() => toggle(user.uid)} />
                  <Avatar src={user.avatarUrl} name={user.displayName || user.email || user.phoneNumber} size={34} />
                  <span>{user.displayName || user.email || user.phoneNumber}</span>
                </label>
              ))}
            </div>
            <button className="primaryButton" disabled={!selected.length} type="submit">Ajouter</button>
            {error && <div className="alert error">{error}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}

function StatusPanel() {
  const { profile } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeStatuses(setStatuses), []);

  async function handleCreate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createStatus({ ownerProfile: profile, file, caption });
      setCaption('');
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contentGrid">
      <section className="glassCard contentCard">
        <div className="panelHeader">
          <div>
            <h2>Statuts</h2>
            <p>Visibles pendant 24h dans l’interface.</p>
          </div>
        </div>
        <form className="formStack" onSubmit={handleCreate}>
          <label>
            Texte du statut
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Quoi de neuf ?" />
          </label>
          <label>
            Image ou fichier
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button className="primaryButton" disabled={loading || (!caption.trim() && !file)} type="submit">
            {loading ? 'Publication...' : 'Publier le statut'}
          </button>
        </form>
        {error && <div className="alert error">{error}</div>}
      </section>

      <section className="statusGrid">
        {statuses.length === 0 ? (
          <EmptyState title="Aucun statut" text="Les statuts récents apparaîtront ici." />
        ) : (
          statuses.map((status) => (
            <article key={status.id} className="statusCard glassCard">
              <div className="rowBetween">
                <div className="rowGap">
                  <Avatar src={status.ownerAvatarUrl} name={status.ownerName} />
                  <div>
                    <strong>{status.ownerName}</strong>
                    <small>{formatDate(status.createdAt)} • {formatHour(status.createdAt)}</small>
                  </div>
                </div>
                {status.ownerId === profile?.uid && (
                  <button className="iconButton" onClick={() => deleteStatus(status.id)}>×</button>
                )}
              </div>
              {status.caption && <p>{status.caption}</p>}
              {status.media?.type === 'image' && <img className="statusImage" src={status.media.url} alt={status.media.name || 'Statut'} />}
              {status.media?.type === 'file' && <a href={status.media.url} target="_blank" rel="noreferrer">📎 {status.media.name}</a>}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function SecurePanel() {
  return (
    <section className="glassCard contentCard readable">
      <h2>Sécurité Solola</h2>
      <p>
        Cette version n’utilise plus Render. Les connexions sont gérées par Firebase Authentication, les messages par Firestore et les fichiers par Firebase Storage.
      </p>
      <p>
        Les messages chiffrés sont protégés dans le navigateur avec AES-GCM et PBKDF2. Le PIN n’est pas envoyé à Firebase. Sans le PIN correct, le message stocké dans Firestore reste illisible.
      </p>
      <p>
        La protection des données dépend des règles Firestore et Storage fournies dans le dossier <code>firebase/</code>. Il faut les publier dans Firebase Console avant une mise en production.
      </p>
    </section>
  );
}

function SettingsPanel() {
  const { firebaseUser, profile } = useAuth();
  const { darkMode, setDarkMode, accentColor, setAccentColor } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [privacy, setPrivacy] = useState(profile?.privacy || 'contacts');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(profile?.displayName || '');
    setBio(profile?.bio || '');
    setPrivacy(profile?.privacy || 'contacts');
  }, [profile]);

  async function handleProfile(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await updateMyProfile({ uid: firebaseUser.uid, patch: { displayName, bio, privacy } });
      setMessage('Profil mis à jour.');
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      const avatarUrl = await uploadAvatar({ uid: firebaseUser.uid, file });
      await updateMyProfile({ uid: firebaseUser.uid, patch: { avatarUrl } });
      setMessage('Avatar mis à jour.');
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="contentGrid">
      <section className="glassCard contentCard">
        <h2>Profil</h2>
        <form className="formStack" onSubmit={handleProfile}>
          <label>
            Nom ou pseudo
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            Bio
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} />
          </label>
          <label>
            Confidentialité
            <select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
              <option value="contacts">Contacts</option>
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </label>
          <label>
            Avatar
            <input type="file" accept="image/*" onChange={handleAvatar} />
          </label>
          <button className="primaryButton" type="submit">Enregistrer</button>
        </form>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}
      </section>

      <section className="glassCard contentCard">
        <h2>Apparence</h2>
        <div className="formStack">
          <label className="checkItem">
            <input type="checkbox" checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} />
            Mode sombre
          </label>
          <label>
            Couleur principale
            <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
          </label>
          <button className="secondaryButton" onClick={handleLogout}>Se déconnecter</button>
        </div>
      </section>
    </div>
  );
}

function AdminPanel() {
  const [data, setData] = useState({ users: [], conversations: [], statuses: [] });
  const [error, setError] = useState('');

  useEffect(() => subscribeAdminData(setData), []);

  async function handleRole(uid, role) {
    setError('');
    try {
      await setUserRole({ uid, role });
    } catch (err) {
      setError(friendlyFirebaseError(err));
    }
  }

  return (
    <div className="contentGrid adminGrid">
      <section className="glassCard contentCard">
        <h2>Administration</h2>
        <div className="statsGrid">
          <div><strong>{data.users.length}</strong><span>Utilisateurs</span></div>
          <div><strong>{data.conversations.length}</strong><span>Conversations</span></div>
          <div><strong>{data.statuses.length}</strong><span>Statuts</span></div>
        </div>
        {error && <div className="alert error">{error}</div>}
      </section>

      <section className="glassCard contentCard wide">
        <h2>Utilisateurs</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.uid}>
                  <td>{user.displayName || '-'}</td>
                  <td>{user.email || '-'}</td>
                  <td>{user.phoneNumber || '-'}</td>
                  <td>
                    <select value={user.role || 'USER'} onChange={(event) => handleRole(user.uid, event.target.value)}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function getConversationTitle(conversation, currentUid) {
  if (conversation.type === 'group') return conversation.title || 'Groupe';
  const otherId = conversation.participantIds?.find((uid) => uid !== currentUid);
  const other = conversation.participantInfo?.[otherId] || {};
  return other.displayName || other.email || other.phoneNumber || 'Contact';
}

function getConversationAvatar(conversation, currentUid) {
  if (conversation.type === 'group') return conversation.photoUrl || '';
  const otherId = conversation.participantIds?.find((uid) => uid !== currentUid);
  return conversation.participantInfo?.[otherId]?.avatarUrl || '';
}
