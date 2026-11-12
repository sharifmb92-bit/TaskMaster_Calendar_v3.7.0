/* TaskMaster Calendar Pro_v 3.7.0 | medbasha */
const config = { version: '3.7.0', sysSignature: 'medbasha' };

const firebaseConfig = {
    apiKey: "AIzaSyAelzQOy8KFQ5OZkctKJS2DZUaxvaLMfRE",
    authDomain: "taskmastercalendar-a779e.firebaseapp.com",
    databaseURL: "https://taskmastercalendar-a779e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "taskmastercalendar-a779e",
    storageBucket: "taskmastercalendar-a779e.firebasestorage.app",
    messagingSenderId: "628005433300",
    appId: "1:628005433300:web:b6a39ed06922a34de07041"
};
const vapidKey = "BGClAqG08mtup_uhnNeCjWeJdZfLU-pnmrEpfXbkKf6uVTRjAAdu-4PO1ASiuA-UOvyXvBiswDxpauthHiGw37I";

firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDB = firebase.database();
const fbMessaging = ('serviceWorker' in navigator && firebase.messaging.isSupported()) ? firebase.messaging() : null;

// PERSISTENCIA LOCAL DE SESIÓN PARA FUNCIONAR SIN PEDIR CONTRASEÑA CADA VEZ (INCLUSO OFFLINE)
fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

// ESTADO DE CUENTA Y BÓVEDA PRIVADA EN LA NUBE (v3.7.0)
let currentCloudUser = null;
let activeVaultId = null; // null cuando está en modo local; igual a user.uid cuando inicia sesión

function sanitizeFirebaseKey(rawKey) {
    return String(rawKey || 'item')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
}

// DICCIONARIO DE TRADUCCIÓN AUTOMÁTICA REGIONAL (i18n)
const i18nDict = {
    es: {
        navHome: "Inicio", navCal: "Calendario", navTasks: "Tareas", navNotes: "Notas", navSummary: "Resumen",
        journalTitle: "📖 Diario & Mood de Hoy", journalEdit: "Escribir ✍️",
        journalEmpty: "No has registrado tu estado de ánimo de hoy aún. Toca para añadir.",
        searchPlaceholder: "Buscar tarea, evento o nota..."
    },
    ca: {
        navHome: "Inici", navCal: "Calendari", navTasks: "Tasques", navNotes: "Notes", navSummary: "Resum",
        journalTitle: "📖 Diari i Estat d'Ànim d'Avui", journalEdit: "Escriure ✍️",
        journalEmpty: "Encara no has registrat el teu estat d'ànim d'avui. Toca per afegir.",
        searchPlaceholder: "Cercar tasca, esdeveniment o nota..."
    },
    en: {
        navHome: "Home", navCal: "Calendar", navTasks: "Tasks", navNotes: "Notes", navSummary: "Summary",
        journalTitle: "📖 Today's Journal & Mood", journalEdit: "Write ✍️",
        journalEmpty: "You haven't recorded today's mood yet. Tap to add.",
        searchPlaceholder: "Search task, event or note..."
    }
};

/* --- DICCIONARIO DE MOODS INTELIGENTE CON ROTACIÓN DINÁMICA DE CONSEJOS (v3.7.0 | medbasha) --- */
const moodPresets = {
    '🌟': {
        label: 'Radiante',
        tips: [
            '¡Aprovecha este gran impulso para avanzar en tus metas más difíciles hoy!',
            'Tu energía está al máximo: es un momento perfecto para liderar o inspirar a otros.',
            'Canaliza esta claridad mental en proyectos que tenías postergados.',
            'Guarda esta buena sensación como recordatorio para los días más exigentes.'
        ]
    },
    '😊': {
        label: 'Contento',
        tips: [
            'Mantén esta actitud positiva y contagia tu buena energía a los demás.',
            'Un estado de ánimo estable es ideal para trabajar con fluidez y sin estrés.',
            'Disfruta de los pequeños detalles de tu jornada mientras cumples tus tareas.',
            'La tranquilidad y el buen humor son la mejor fórmula de productividad.'
        ]
    },
    '🧘': {
        label: 'Tranquilo',
        tips: [
            'Un estado mental sereno es la mejor base para tomar decisiones acertadas.',
            'Aprovecha esta calma para priorizar lo verdaderamente importante de la semana.',
            'Trabajar sin prisa pero sin pausa mantiene tu mente despejada.',
            'Mantén tu ritmo constante; la serenidad evita cometer errores por precipitación.'
        ]
    },
    '☕': {
        label: 'Rutina',
        tips: [
            'Paso a paso. La constancia silenciosa de cada día construye los grandes logros.',
            'Céntrate en cumplir tus hábitos clave hoy; la disciplina supera a la motivación.',
            'Haz una pausa breve entre tareas para mantener la frescura durante la jornada.',
            'Incluso los días ordinarios suman un avance significativo si mantienes el foco.'
        ]
    },
    '🥱': {
        label: 'Cansado',
        tips: [
            'Escucha a tu cuerpo. Tómate las pausas necesarias y prioriza descansar bien.',
            'Reduce la exigencia hoy: enfócate solo en lo imprescindible y delega lo secundario.',
            'Una caminata corta o beber agua fresca puede darte el respiro que necesitas.',
            'Recuerda que parar a tiempo para recuperar fuerzas también forma parte del trabajo.'
        ]
    },
    '🤯': {
        label: 'Estresado',
        tips: [
            'Respira profundo. Divide esa tarea grande en 3 pasos muy pequeños y haz solo el primero.',
            'Desconecta de las notificaciones durante 20 minutos para recuperar el control.',
            'No intentes abarcarlo todo a la vez: prioriza lo urgente y deja el resto para mañana.',
            'Recuerda: la prisa genera bloqueos; mantén la calma y ve de una en una.'
        ]
    },
    '😔': {
        label: 'Desanimado',
        tips: [
            'Todos tenemos días grises. Sé amable contigo mismo; mañana será un nuevo día.',
            'No juzgues tu productividad por hoy; concéntrate solo en lo básico y descansa.',
            'A veces avanzar despacio sigue siendo avanzar. Haz lo que puedas sin presionarte.',
            'Busca un momento al final del día para algo que te reconforte y descanse la mente.'
        ]
    },
    '🎯': {
        label: 'Enfocado',
        tips: [
            'Estás en la zona de máximo rendimiento. Elimina distracciones y ve por tus objetivos.',
            'Aprovecha este bloque de concentración para cerrar las tareas más complejas.',
            'Mantén este ritmo limpio y verás cómo liberas tu agenda para el resto de la semana.',
            'La determinación de hoy será tu tranquilidad de mañana.'
        ]
    }
};

function getSmartMoodTip(mood) {
    const data = moodPresets[mood];
    if (!data || !data.tips || data.tips.length === 0) return '';
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const tipIndex = dayOfYear % data.tips.length;
    return data.tips[tipIndex];
}

function getDeviceLang() {
    const lang = (navigator.language || 'es').substring(0, 2).toLowerCase();
    return i18nDict[lang] ? lang : 'es';
}

function applyAutoTranslations() {
    const langKey = getDeviceLang();
    const t = i18nDict[langKey];

    const navHome = document.querySelector('#nav-dashboard .nav-text');
    const navCal = document.querySelector('#nav-calendar .nav-text');
    const navTasks = document.querySelector('#nav-tasks .nav-text');
    const navNotes = document.querySelector('#nav-notes .nav-text');
    const navSummary = document.querySelector('#nav-summary .nav-text');

    if (navHome) navHome.innerText = t.navHome;
    if (navCal) navCal.innerText = t.navCal;
    if (navTasks) navTasks.innerText = t.navTasks;
    if (navNotes) navNotes.innerText = t.navNotes;
    if (navSummary) navSummary.innerText = t.navSummary;

    const jTitle = document.getElementById('txt-journal-title');
    const jEdit = document.getElementById('txt-journal-edit');
    if (jTitle) jTitle.innerText = t.journalTitle;
    if (jEdit) jEdit.innerText = t.journalEdit;

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
}

function updateAppBadge() {
    if ('setAppBadge' in navigator) {
        const currentDay = new Date().getDate();
        navigator.setAppBadge(currentDay).catch(err => console.log("AppBadge no soportado:", err));
    }
}

window.addEventListener('online', async () => {
    fbDB.goOnline();
    updateAuthStatusUI(currentCloudUser);
    if (activeVaultId) {
        await syncAllLocalModulesToCloud();
    }
});

window.addEventListener('offline', () => {
    fbDB.goOffline();
    const pill = document.getElementById('btn-cloud-account-pill');
    if (pill && activeVaultId) {
        pill.innerText = '📴 Offline';
    }
});

// BASE DE DATOS INDEXEDDB UNIFICADA (v3.7.0)
const db = new Dexie('TaskMasterDB');
db.version(2).stores({
    events: 'id, date, priority, loc, alarmFired, notified, done',
    todos: '++id, dateKey, done, category',
    notes: 'dateKey',
    settings: 'key',
    locations: 'key',
    journal: 'dateKey',
    wishlist: '++id, category, done'
});

/* ============================================================================
   SISTEMA DE AUTENTICACIÓN (CORREO + GOOGLE) Y BÓVEDA PRIVADA (v3.7.0)
   ============================================================================ */

function openAuthModal() {
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) errBox.style.display = 'none';
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
}

function showAuthError(msg) {
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) {
        errBox.innerText = msg;
        errBox.style.display = 'block';
    } else {
        alert(msg);
    }
}

function translateFirebaseAuthError(code) {
    switch (code) {
        case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
        case 'auth/user-not-found':
        case 'auth/invalid-credential': return 'Correo o contraseña incorrectos. Si eres nuevo, pulsa "Crear Cuenta".';
        case 'auth/wrong-password': return 'Contraseña incorrecta.';
        case 'auth/email-already-in-use': return 'Este correo ya está registrado. Pulsa "Entrar".';
        case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/network-request-failed': return 'Sin conexión a Internet. Conéctate para iniciar sesión.';
        case 'auth/popup-closed-by-user': return 'Se cerró la ventana de Google antes de completar el acceso.';
        default: return 'No se pudo completar el acceso (' + code + ').';
    }
}

async function loginWithGoogle() {
    if (!navigator.onLine) return showAuthError('Necesitas conexión a Internet para entrar con Google.');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        await fbAuth.signInWithPopup(provider);
        closeAuthModal();
    } catch (err) {
        // En WebViews de Android (TWA / PWABuilder) si el popup es bloqueado, usamos Redirect automáticamente
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
            fbAuth.signInWithRedirect(provider);
        } else {
            showAuthError(translateFirebaseAuthError(err.code));
        }
    }
}

async function loginWithEmail() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPassInput').value;
    if (!email || !pass) return showAuthError('Introduce tu correo y contraseña.');

    try {
        await fbAuth.signInWithEmailAndPassword(email, pass);
        closeAuthModal();
    } catch (err) {
        showAuthError(translateFirebaseAuthError(err.code));
    }
}

async function registerWithEmail() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPassInput').value;
    if (!email || pass.length < 6) return showAuthError('Escribe un correo válido y una contraseña de al menos 6 caracteres.');

    try {
        await fbAuth.createUserWithEmailAndPassword(email, pass);
        closeAuthModal();
        showRecoveryToast('✓ Cuenta creada y vinculada a tu bóveda');
    } catch (err) {
        showAuthError(translateFirebaseAuthError(err.code));
    }
}

async function resetPasswordEmail() {
    const email = document.getElementById('authEmailInput').value.trim();
    if (!email) return showAuthError('Escribe arriba tu correo electrónico para enviarte el enlace de recuperación.');

    try {
        await fbAuth.sendPasswordResetEmail(email);
        alert(`✓ Te hemos enviado un correo a ${email} para restablecer tu contraseña.`);
    } catch (err) {
        showAuthError(translateFirebaseAuthError(err.code));
    }
}

async function logoutCloudAccount() {
    if (!confirm('¿Cerrar sesión de tu cuenta en la nube? Tus datos locales permanecerán en este dispositivo.')) return;
    await fbAuth.signOut();
    activeVaultId = null;
    currentCloudUser = null;
    updateAuthStatusUI(null);
    showRecoveryToast('Sesión cerrada (Modo Local)');
}

function updateAuthStatusUI(user) {
    const pill = document.getElementById('btn-cloud-account-pill');
    const emailLabel = document.getElementById('settings-user-email');
    const descLabel = document.getElementById('settings-vault-desc');
    const loginBtn = document.getElementById('btn-settings-login');
    const logoutBtn = document.getElementById('btn-settings-logout');

    if (user) {
        const displayName = user.email || user.displayName || 'Cuenta Conectada';
        if (pill) {
            pill.innerText = '☁️ ' + displayName.split('@')[0];
            pill.style.borderColor = '#4ade80';
        }
        if (emailLabel) emailLabel.innerText = '✅ Conectado: ' + displayName;
        if (descLabel) descLabel.innerText = 'Bóveda privada activa. Todos tus cambios se respaldan automáticamente y se restaurarán si cambias de móvil o limpias la caché.';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        if (pill) {
            pill.innerText = '☁️ Sincronizar';
            pill.style.borderColor = 'var(--accent)';
        }
        if (emailLabel) emailLabel.innerText = 'Modo Local (Sin cuenta vinculada)';
        if (descLabel) descLabel.innerText = 'Inicia sesión con tu correo o Google para respaldar tus datos en tu bóveda privada y recuperarlos si cambias de móvil o limpias la caché.';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

function getVaultRef(subpath = '') {
    if (!activeVaultId) return null;
    const cleanPath = subpath ? `/${subpath}` : '';
    return fbDB.ref(`users_vault/${activeVaultId}${cleanPath}`);
}

async function forceManualCloudRestore() {
    if (!activeVaultId) {
        return openAuthModal();
    }
    if (!navigator.onLine) {
        return alert('⚠️ Necesitas conexión a Internet para restaurar desde la nube.');
    }
    const restoredCount = await restoreFromCloudVault(true);
    if (restoredCount > 0) {
        await refreshAllUIViews();
        alert(`✓ Auto-recuperación completada: Se han restaurado ${restoredCount} registros desde tu bóveda.`);
    } else {
        alert('ℹ️ Tu dispositivo ya tiene todos los registros de la nube al día.');
    }
}

async function checkAndPerformAutoRecovery(forceMerge = false) {
    if (!navigator.onLine || !fbDB || !activeVaultId) return;

    try {
        const localEventsCount = await db.events.count();
        const localTodosCount = await db.todos.count();
        const localNotesCount = await db.notes.count();
        const localJournalCount = await db.journal.count();
        const localLocsCount = await db.locations.count();

        const isLocalEmpty = (localEventsCount + localTodosCount + localNotesCount + localJournalCount + localLocsCount) === 0;

        if (isLocalEmpty || forceMerge) {
            const restored = await restoreFromCloudVault(false);
            if (restored > 0) {
                showRecoveryToast(`☁️ Auto-recuperación: ${restored} registros restaurados`);
                await refreshAllUIViews();
            }
        }
    } catch (err) {
        console.error("Error en comprobación de auto-recuperación:", err);
    }
}

async function restoreFromCloudVault(overwriteLocal = false) {
    if (!navigator.onLine || !fbDB || !activeVaultId) return 0;
    let restoredItems = 0;

    try {
        const vaultRef = getVaultRef();
        if (!vaultRef) return 0;

        const vaultSnap = await vaultRef.once('value');
        const vaultData = vaultSnap.val() || {};

        // 1. Restaurar Eventos
        const eventsMap = vaultData.events || {};
        for (const evId in eventsMap) {
            const ev = eventsMap[evId];
            if (!ev || !ev.title) continue;
            const exists = await db.events.get(evId);
            if (!exists || overwriteLocal) {
                await db.events.put({
                    id: evId,
                    date: ev.date || selectedDateStr,
                    title: ev.title,
                    details: ev.details || '',
                    time: ev.time || '--:--',
                    priority: ev.priority || 'medium',
                    loc: ev.loc || 'none',
                    customCoords: ev.customCoords || null,
                    notified: ev.notified || false,
                    alarmFired: ev.alarmFired || false,
                    done: ev.done || false,
                    updatedAt: ev.updatedAt || Date.now()
                });
                restoredItems++;
            }
        }

        // 2. Restaurar Tareas y Repeticiones (todos)
        if (vaultData.todos) {
            const existingTodos = await db.todos.toArray();
            for (const cloudKey in vaultData.todos) {
                const td = vaultData.todos[cloudKey];
                if (!td || !td.text) continue;
                const duplicate = existingTodos.some(
                    local => local.dateKey === td.dateKey && local.text === td.text && (local.time || '') === (td.time || '')
                );
                if (!duplicate) {
                    await db.todos.add({
                        dateKey: td.dateKey,
                        text: td.text,
                        done: td.done || false,
                        category: td.category || 'personal',
                        subtasks: td.subtasks || [],
                        repeat: td.repeat || 'none',
                        loc: td.loc || 'none',
                        time: td.time || '',
                        cloudSyncKey: cloudKey,
                        updatedAt: td.updatedAt || Date.now()
                    });
                    restoredItems++;
                }
            }
        }

        // 3. Restaurar Notas
        if (vaultData.notes) {
            for (const dateKey in vaultData.notes) {
                const nt = vaultData.notes[dateKey];
                if (!nt) continue;
                const exists = await db.notes.get(dateKey);
                if (!exists || overwriteLocal) {
                    await db.notes.put({
                        dateKey: dateKey,
                        html: nt.html || '',
                        text: nt.text || '',
                        updatedAt: nt.updatedAt || Date.now()
                    });
                    restoredItems++;
                }
            }
        }

        // 4. Restaurar Diario & Mood
        if (vaultData.journal) {
            for (const dateKey in vaultData.journal) {
                const jr = vaultData.journal[dateKey];
                if (!jr) continue;
                const exists = await db.journal.get(dateKey);
                if (!exists || overwriteLocal) {
                    await db.journal.put({
                        dateKey: dateKey,
                        text: jr.text || '',
                        mood: jr.mood || '😊',
                        updatedAt: jr.updatedAt || Date.now()
                    });
                    restoredItems++;
                }
            }
        }

        // 5. Restaurar Ubicaciones GPS Guardadas
        if (vaultData.locations) {
            for (const locKey in vaultData.locations) {
                const locObj = vaultData.locations[locKey];
                if (!locObj || !locObj.data) continue;
                const exists = await db.locations.get(locKey);
                if (!exists || overwriteLocal) {
                    await db.locations.put({
                        key: locKey,
                        data: locObj.data
                    });
                    restoredItems++;
                }
            }
        }

        // 6. Restaurar Lista de Compras / Wishlist
        if (vaultData.wishlist) {
            const existingWish = await db.wishlist.toArray();
            for (const wKey in vaultData.wishlist) {
                const wi = vaultData.wishlist[wKey];
                if (!wi || !wi.name) continue;
                const duplicate = existingWish.some(local => local.name === wi.name && local.category === wi.category);
                if (!duplicate) {
                    await db.wishlist.add({
                        name: wi.name,
                        price: wi.price || 0,
                        category: wi.category || 'shop',
                        done: wi.done || false,
                        cloudSyncKey: wKey,
                        updatedAt: wi.updatedAt || Date.now()
                    });
                    restoredItems++;
                }
            }
        }

        // 7. Restaurar Perfil de Usuario si no existe localmente
        if (vaultData.settings && vaultData.settings.user_profile) {
            const localProf = await db.settings.get('user_profile');
            if (!localProf) {
                await db.settings.put({ key: 'user_profile', value: vaultData.settings.user_profile });
                currentProfileKey = vaultData.settings.user_profile;
                applyProfileUI(currentProfileKey);
                // Salir de pantalla de bienvenida si restauró perfil desde la nube
                switchTab('dashboard');
            }
        }
    } catch (error) {
        console.error("Error restaurando bóveda desde Firebase:", error);
    }

    return restoredItems;
}

function getTodoCloudKey(todo) {
    if (todo.cloudSyncKey) return todo.cloudSyncKey;
    const base = `${todo.dateKey}_${todo.text}_${todo.time || 'notime'}`;
    return 'td_' + sanitizeFirebaseKey(base).substring(0, 60);
}

function syncTodoWithCloud(todo) {
    if (!navigator.onLine || !fbDB || !activeVaultId || !todo) return;
    const ref = getVaultRef(`todos/${getTodoCloudKey(todo)}`);
    if (!ref) return;
    ref.set({
        dateKey: todo.dateKey,
        text: todo.text,
        done: Boolean(todo.done),
        category: todo.category || 'personal',
        subtasks: todo.subtasks || [],
        repeat: todo.repeat || 'none',
        loc: todo.loc || 'none',
        time: todo.time || '',
        updatedAt: todo.updatedAt || Date.now()
    }).catch(err => console.error("Error sincronizando tarea:", err));
}

function deleteTodoFromCloud(todo) {
    if (!navigator.onLine || !fbDB || !activeVaultId || !todo) return;
    const ref = getVaultRef(`todos/${getTodoCloudKey(todo)}`);
    if (ref) ref.remove().catch(() => {});
}

function syncNoteWithCloud(dateKey, noteObj) {
    if (!navigator.onLine || !fbDB || !activeVaultId) return;
    const ref = getVaultRef(`notes/${dateKey}`);
    if (!ref) return;
    if (!noteObj) {
        ref.remove().catch(() => {});
    } else {
        ref.set({
            html: noteObj.html || '',
            text: noteObj.text || '',
            updatedAt: noteObj.updatedAt || Date.now()
        }).catch(err => console.error("Error sincronizando nota:", err));
    }
}

function syncLocationWithCloud(locKey, coordsData) {
    if (!navigator.onLine || !fbDB || !activeVaultId) return;
    const ref = getVaultRef(`locations/${locKey}`);
    if (ref) {
        ref.set({ data: coordsData, updatedAt: Date.now() }).catch(() => {});
    }
}

function syncWishlistWithCloud(item) {
    if (!navigator.onLine || !fbDB || !activeVaultId || !item) return;
    const key = item.cloudSyncKey || ('wi_' + sanitizeFirebaseKey(`${item.category}_${item.name}`).substring(0, 50));
    const ref = getVaultRef(`wishlist/${key}`);
    if (ref) {
        ref.set({
            name: item.name,
            price: item.price || 0,
            category: item.category || 'shop',
            done: Boolean(item.done),
            updatedAt: item.updatedAt || Date.now()
        }).catch(() => {});
    }
}

function deleteWishlistFromCloud(item) {
    if (!navigator.onLine || !fbDB || !activeVaultId || !item) return;
    const key = item.cloudSyncKey || ('wi_' + sanitizeFirebaseKey(`${item.category}_${item.name}`).substring(0, 50));
    const ref = getVaultRef(`wishlist/${key}`);
    if (ref) ref.remove().catch(() => {});
}

async function syncAllLocalModulesToCloud() {
    if (!navigator.onLine || !fbDB || !activeVaultId) return;

    const allEvents = await db.events.toArray();
    allEvents.forEach(ev => syncEventWithFirebase(ev));

    const allTodos = await db.todos.toArray();
    allTodos.forEach(td => syncTodoWithCloud(td));

    const allNotes = await db.notes.toArray();
    allNotes.forEach(nt => syncNoteWithCloud(nt.dateKey, nt));

    const allJournal = await db.journal.toArray();
    allJournal.forEach(jr => {
        const ref = getVaultRef(`journal/${jr.dateKey}`);
        if (ref) {
            ref.set({
                text: jr.text,
                mood: jr.mood,
                updatedAt: jr.updatedAt || Date.now()
            });
        }
    });

    const allLocs = await db.locations.toArray();
    allLocs.forEach(lc => syncLocationWithCloud(lc.key, lc.data));

    const allWish = await db.wishlist.toArray();
    allWish.forEach(wi => syncWishlistWithCloud(wi));
}

function showRecoveryToast(message) {
    let toast = document.getElementById('tm-recovery-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'tm-recovery-toast';
        toast.style.cssText = 'position:fixed; bottom:82px; left:50%; transform:translateX(-50%); background:rgba(30,41,59,0.95); color:#fff; padding:10px 18px; border-radius:24px; font-size:0.84rem; font-weight:600; z-index:99999; box-shadow:0 6px 20px rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.15); transition:opacity 0.4s ease; white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        if (toast) toast.style.opacity = '0';
    }, 4500);
}

async function refreshAllUIViews() {
    await initCalendar();
    await renderCalSelectedEvents();
    await renderDayTasksList();
    await updateSummaryData();
    await updateDashboardProfileCards();
    await updateLocationUI();
    await loadTabData();
}

const profilePresets = {
    personal: {
        name: 'Personal / Estilo de Vida',
        defaultTheme: 'gris',
        taskPlaceholder: 'Ej. Hacer compras / Limpieza de casa',
        eventPlaceholder: 'Ej. Cumpleaños / Evento familiar',
        notesPlaceholder: 'Anotaciones personales, tiempo libre...',
        locCentral: 'Mi Trabajo',
        locPuntoA: '📍 Mi Punto A (Frecuente)',
        locPuntoB: '📍 Mi Punto B (Frecuente)'
    },
    trabajo: {
        name: 'Trabajo / Proyectos',
        defaultTheme: 'marino',
        taskPlaceholder: 'Ej. Entregar informe / Enviar presupuesto',
        eventPlaceholder: 'Ej. Reunión de equipo / Presentación',
        notesPlaceholder: 'Notas de proyectos, reuniones o tareas...',
        locCentral: 'Oficina / Base Central',
        locPuntoA: '📍 Cliente Principal',
        locPuntoB: '📍 Sala de Reuniones'
    },
    salud: {
        name: 'Salud y Bienestar',
        defaultTheme: 'menta',
        taskPlaceholder: 'Ej. Beber 2L de agua / Tomar medicación',
        eventPlaceholder: 'Ej. Cita médica / Entrenamiento',
        notesPlaceholder: 'Seguimiento de salud, ejercicios y hábitos...',
        locCentral: 'Centro Médico / Hospital',
        locPuntoA: '📍 Gimnasio / Parque',
        locPuntoB: '📍 Farmacia Habitual'
    },
    finanzas: {
        name: 'Finanzas / Gastos',
        defaultTheme: 'cream',
        taskPlaceholder: 'Ej. Pagar recibo luz / Revisar facturas',
        eventPlaceholder: 'Ej. Vencimiento de seguro / Pago mensual',
        notesPlaceholder: 'Presupuestos, recibos pendientes o ahorro...',
        locCentral: 'Mi Banco / Gestoría',
        locPuntoA: '📍 Oficina de Pagos',
        locPuntoB: '📍 Punto de Cobro'
    },
    urgente: {
        name: '🚨 Urgente e Importante',
        defaultTheme: 'cafe',
        taskPlaceholder: 'Ej. Resolver incidencia crítica HOY',
        eventPlaceholder: 'Ej. Entrega urgente límite',
        notesPlaceholder: 'Crisis, temas prioritarios e inmediatos...',
        locCentral: 'Punto Crítico / Urgencias',
        locPuntoA: '📍 Zona Prioritaria A',
        locPuntoB: '📍 Zona Prioritaria B'
    },
    general: {
        name: 'General / Personal',
        defaultTheme: 'gris',
        taskPlaceholder: 'Ej. Cita personal / Hacer compras',
        eventPlaceholder: 'Ej. Cita médico / Factura luz',
        notesPlaceholder: 'Notas y anotaciones generales...',
        locCentral: 'Mi Trabajo',
        locPuntoA: '📍 Mi Punto A (Frecuente)',
        locPuntoB: '📍 Mi Punto B (Frecuente)'
    }
};

const tutorialSteps = [
    { icon: '🎭', title: 'Pilares Vitales', desc: 'Organiza tu día agrupando tareas en Personal, Trabajo, Salud, Finanzas o Urgencias.' },
    { icon: '🎙️✨', title: 'Asistente de Voz IA', desc: 'Pulsa el micrófono superior y habla con naturalidad. Entiende fechas relativas como "el jueves que viene" o repeticiones semanales.' },
    { icon: '🔐☁️', title: 'Cuenta Privada y Auto-Recuperación', desc: 'Vincula tu correo o cuenta de Google desde el botón superior para respaldar toda tu agenda en tu bóveda privada.' },
    { icon: '📍🗺️', title: 'Geofencing de Alta Precisión', desc: 'Guarda tus ubicaciones frecuentes con precisión de 6 decimales para recibir alertas al aproximarte.' }
];
let currentTutorialIndex = 0;

let currentProfileKey = 'general';
let activeCategoryFilter = 'all';
let isRecordingSpeech = false;
let isGlobalMicActive = false;
let speechRecognition = null;
let selectedJournalMood = '😊';

function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate([25, 15, 25]);
    }
}

function openContributionLink(type) {
    if (type === 'paypal') {
        window.open('https://paypal.me/sherrif86', '_blank');
    } else if (type === 'revolut') {
        window.open('https://revolut.me/sharifmb', '_blank');
    }
}

function autoExpandTextarea(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
}

async function enableStoragePersistence() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        const statusSpan = document.getElementById('db-protection-status');
        if (statusSpan) {
            statusSpan.innerText = isPersisted ? "Persistente + Cloud ✓" : "Estándar + Cloud ✓";
        }
    }
}

const todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();
let currentActiveTab = 'dashboard';

const getFormattedDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let selectedDateStr = getFormattedDateKey(todayDate);
let selectedPriority = 'low';

let globalAudioCtx = null;
let leafletMap = null;
let mapMarker = null;
let activeTargetType = null; 
let tempCoords = { lat: 39.999612, lon: 3.834921 };
let pendingEventCustomCoords = null; 
let swRegistration = null;

const geofenceZones = {
    gasolinera: [
        { name: 'Repsol Ciutadella', lat: 40.001245, lon: 3.841123 },
        { name: 'Cepsa Centro', lat: 39.905512, lon: 4.241045 }
    ],
    super: [
        { name: 'Mercadona Ciutadella', lat: 40.005789, lon: 3.854612 },
        { name: 'Eroski', lat: 40.002134, lon: 3.842367 },
        { name: 'Lidl', lat: 39.998521, lon: 3.849943 }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    await enableStoragePersistence();
    applyAutoTranslations();
    updateAppBadge();

    if (!navigator.onLine) {
        fbDB.goOffline();
    }

    // Procesar posible retorno de Google Redirect en móviles
    fbAuth.getRedirectResult().catch((err) => {
        if (err && err.code) {
            console.warn('Redirect Auth info:', err.code);
        }
    });

    // Observador reactivo de sesión de Firebase Auth (Correo / Google)
    fbAuth.onAuthStateChanged(async (user) => {
        currentCloudUser = user;
        updateAuthStatusUI(user);

        if (user) {
            activeVaultId = user.uid;
            await db.settings.put({ key: 'last_uid', value: user.uid });
            await checkAndPerformAutoRecovery(true);
            await syncAllLocalModulesToCloud();
            initFirebaseRealtimeSync();
        } else {
            activeVaultId = null;
        }
    });

    try {
        const savedProfileRec = await db.settings.get('user_profile');
        if (savedProfileRec) {
            currentProfileKey = savedProfileRec.value;
            applyProfileUI(currentProfileKey);
        } else {
            openWelcomeScreen();
        }

        const savedThemeRec = await db.settings.get('app_theme');
        const defaultThemeForProfile = profilePresets[currentProfileKey]?.defaultTheme || 'cafe';
        const savedTheme = savedThemeRec ? savedThemeRec.value : defaultThemeForProfile;
        applyThemeUI(savedTheme);

        const glassRec = await db.settings.get('glass_mode');
        if (glassRec) {
            const mode = glassRec.value;
            const selectEl = document.getElementById('glass-effect-select');
            if (selectEl) selectEl.value = mode;
            if (mode === 'on') document.body.classList.add('glass-active');
        }

        const soundRec = await db.settings.get('sound_type');
        if (soundRec) {
            const soundSelect = document.getElementById('sound-type-select');
            if (soundSelect) soundSelect.value = soundRec.value;
        }
    } catch(e) {
        console.warn("Error al cargar ajustes de Dexie:", e);
    }

    registerServiceWorker();
    await initCalendar();
    renderWeekBar();
    initSmartTracking();
    initTimeAlarms();
    await updateLocationUI();
    updatePermissionBanner();
    await loadTabData();
    await updateDashboardProfileCards();

    const versionTag = document.getElementById('version-tag');
    if (versionTag) versionTag.innerText = 'TaskMaster Calendar Pro_v ' + config.version;
});

/* --- LÓGICA DE DASHBOARD DE PERFILES Y RESUMEN EN VIVO (v3.7.0) --- */
function selectProfileDashboard(profileKey, el) {
    document.querySelectorAll('.profile-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    currentProfileKey = profileKey;
    const p = profilePresets[profileKey] || profilePresets.general;
    
    const titleEl = document.getElementById('dash-profile-title');
    const subEl = document.getElementById('dash-profile-sub');
    if (titleEl) titleEl.innerText = `Perfil Activo: ${p.name}`;
    if (subEl) subEl.innerText = `Vista optimizada para ${p.name.toLowerCase()}`;

    applyProfileUI(profileKey);
    const defaultTheme = p.defaultTheme || 'cafe';
    applyThemeUI(defaultTheme);
    db.settings.put({ key: 'app_theme', value: defaultTheme });
    db.settings.put({ key: 'user_profile', value: profileKey });
    if (navigator.onLine && fbDB && activeVaultId) {
        const ref = getVaultRef('settings/user_profile');
        if (ref) ref.set(profileKey);
    }
}

async function updateDashboardProfileCards() {
    const todayStr = getFormattedDateKey(new Date());

    const allEventsToday = await db.events.where('date').equals(todayStr).toArray();
    const allTasksToday = await db.todos.where('dateKey').equals(todayStr).toArray();
    const journalToday = await db.journal.get(todayStr);

    const profiles = ['trabajo', 'salud', 'finanzas', 'personal'];

    profiles.forEach(prof => {
        const cardEl = document.getElementById(`dash-card-${prof}`);
        if (!cardEl) return;

        const profTasks = allTasksToday.filter(t => t.category === prof);
        const profEvents = allEventsToday.filter(e => e.priority === prof || (prof === 'trabajo' && e.loc === 'central'));

        const totalPending = profTasks.filter(t => !t.done).length;
        const totalEvents = profEvents.length;

        let badgeHtml = '';
        if (totalPending > 0 || totalEvents > 0) {
            badgeHtml = `<span class="dash-warning-badge">🔴 ${totalEvents + totalPending} pendiente(s) hoy</span>`;
        } else {
            badgeHtml = `<span class="dash-empty-badge">⚪ Al día</span>`;
        }

        const summaryBox = cardEl.querySelector('.dash-card-summary');
        if (summaryBox) {
            summaryBox.innerHTML = `
                <div class="dash-badge-row">${badgeHtml}</div>
                <div class="dash-info-line">📅 Eventos: <b>${totalEvents}</b> | 📋 Tareas: <b>${totalPending}</b></div>
            `;
        }
    });

    const moodSummaryEl = document.getElementById('dash-journal-summary');
    const langKey = getDeviceLang();
    const t = i18nDict[langKey];

    if (moodSummaryEl) {
        if (journalToday) {
            const mood = journalToday.mood || '😊';
            const moodData = moodPresets[mood] || { label: 'Ánimo' };
            const smartTip = getSmartMoodTip(mood);
            const text = journalToday.text ? journalToday.text : '';

            moodSummaryEl.innerHTML = `
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent); margin-bottom: 4px;">${mood} ${moodData.label.toUpperCase()} - LEMA DE HOY:</div>
                <div style="font-size: 0.95rem; font-style: italic; font-weight: 600; line-height: 1.4; margin-bottom: 6px;">"${text}"</div>
                ${smartTip ? `<div style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 8px; border-left: 3px solid var(--accent);">💡 <i>${smartTip}</i></div>` : ''}
            `;
        } else {
            moodSummaryEl.innerHTML = `<i>${t.journalEmpty}</i>`;
        }
    }
}

/* --- LÓGICA DEL DIARIO & MOOD TRACKER --- */
function openJournalModal() {
    const modal = document.getElementById('journal-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadJournalEntry();
    }
}

function closeJournalModal() {
    const modal = document.getElementById('journal-modal');
    if (modal) modal.style.display = 'none';
}

function setJournalMood(mood, element) {
    selectedJournalMood = mood;
    triggerHaptic();

    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const tipBox = document.getElementById('journal-mood-tip-box');
    const moodData = moodPresets[mood];
    const smartTip = getSmartMoodTip(mood);
    if (tipBox && moodData) {
        tipBox.innerHTML = `<b>${mood} Estado: ${moodData.label}</b><br>💡 <i>${smartTip}</i>`;
        tipBox.style.display = 'block';
    }
}

async function loadJournalEntry() {
    const entry = await db.journal.get(selectedDateStr);
    const input = document.getElementById('journalInputText');
    const tipBox = document.getElementById('journal-mood-tip-box');

    if (entry && input) {
        input.value = entry.text || '';
        selectedJournalMood = entry.mood || '😊';
    } else if (input) {
        input.value = '';
        selectedJournalMood = '😊';
    }

    const moodData = moodPresets[selectedJournalMood];
    const smartTip = getSmartMoodTip(selectedJournalMood);
    if (tipBox && moodData) {
        tipBox.innerHTML = `<b>${selectedJournalMood} Estado: ${moodData.label}</b><br>💡 <i>${smartTip}</i>`;
        tipBox.style.display = 'block';
    }
}

async function saveJournalEntry() {
    const text = document.getElementById('journalInputText').value.trim();
    if (!text) return alert("Escribe una reflexión antes de guardar.");

    try {
        const now = Date.now();
        await db.transaction('rw', db.journal, async () => {
            await db.journal.put({
                dateKey: selectedDateStr,
                text: text,
                mood: selectedJournalMood,
                updatedAt: now
            });
        });

        if (navigator.onLine && fbDB && activeVaultId) {
            const payload = { text: text, mood: selectedJournalMood, updatedAt: now };
            const ref = getVaultRef(`journal/${selectedDateStr}`);
            if (ref) ref.set(payload);
        }

        closeJournalModal();
        await renderCalSelectedEvents();
        await updateDashboardProfileCards();
        triggerHaptic();
    } catch (e) {
        console.error("Error al guardar en el diario:", e);
    }
}

/* --- LÓGICA DE COMPRAS & WISHLIST --- */
function openWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderShoppingList();
    }
}

function closeWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    if (modal) modal.style.display = 'none';
}

async function addWishlistItem(category) {
    const nameEl = document.getElementById('wishItemName');
    const priceEl = document.getElementById('wishItemPrice');
    const name = nameEl.value.trim();
    const price = parseFloat(priceEl.value) || 0;

    if (!name) return alert("Escribe el nombre del artículo.");

    try {
        const cloudKey = 'wi_' + sanitizeFirebaseKey(`${category}_${name}`).substring(0, 50);
        const itemData = {
            name: name,
            price: price,
            category: category,
            done: false,
            cloudSyncKey: cloudKey,
            updatedAt: Date.now()
        };

        await db.transaction('rw', db.wishlist, async () => {
            await db.wishlist.add(itemData);
        });

        syncWishlistWithCloud(itemData);

        nameEl.value = '';
        priceEl.value = '';
        await renderShoppingList();
    } catch (e) {
        console.error("Error al añadir item:", e);
    }
}

async function renderShoppingList() {
    const container = document.getElementById('shoppingListContainer');
    const totalTxt = document.getElementById('shoppingTotalTxt');
    if (!container) return;

    container.innerHTML = '';
    const items = await db.wishlist.toArray();

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-hint" style="color:var(--text-muted); font-style:italic;">Lista vacía. Añade artículos arriba.</div>';
        if (totalTxt) totalTxt.innerText = 'Total Estimado: 0.00 €';
        return;
    }

    let total = 0;
    items.forEach(item => {
        if (!item.done) total += (item.price || 0);

        const div = document.createElement('div');
        div.className = `todo-item ${item.done ? 'done' : ''}`;
        div.style.padding = '8px 12px';
        div.innerHTML = `
            <div class="todo-main-row">
                <input type="checkbox" class="todo-checkbox" ${item.done ? 'checked' : ''} onchange="toggleWishlistItem(${item.id}, ${item.done})">
                <span class="todo-text-span">${item.category === 'wish' ? '🎁' : '🛒'} ${item.name}</span>
                <span style="font-size:0.85rem; font-weight:bold; color:var(--accent);">${item.price ? item.price.toFixed(2) + ' €' : ''}</span>
                <button class="event-del" onclick="deleteWishlistItem(${item.id})">✕</button>
            </div>
        `;
        container.appendChild(div);
    });

    if (totalTxt) totalTxt.innerText = `Total Estimado: ${total.toFixed(2)} €`;
}

async function toggleWishlistItem(id, currentDone) {
    await db.wishlist.update(id, { done: !currentDone, updatedAt: Date.now() });
    const updated = await db.wishlist.get(id);
    if (updated) syncWishlistWithCloud(updated);
    await renderShoppingList();
}

async function deleteWishlistItem(id) {
    const existing = await db.wishlist.get(id);
    await db.wishlist.delete(id);
    if (existing) deleteWishlistFromCloud(existing);
    await renderShoppingList();
}

/* --- SINCRONIZACIÓN REACTIVA INSTANTÁNEA EN TIEMPO REAL CON FIREBASE ONVALUE (v3.7.0) --- */
function initFirebaseRealtimeSync() {
    if (!fbDB || !activeVaultId) return;

    const eventsRef = getVaultRef('events');
    if (eventsRef) {
        eventsRef.off();
        eventsRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                for (let id in data) {
                    await mergeRemoteEventToLocal(id, data[id]);
                }
            }
        });
    }

    const journalRef = getVaultRef('journal');
    if (journalRef) {
        journalRef.off();
        journalRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                for (let dateKey in data) {
                    const localJr = await db.journal.get(dateKey);
                    if (!localJr || (data[dateKey].updatedAt && data[dateKey].updatedAt > (localJr.updatedAt || 0))) {
                        await db.journal.put({
                            dateKey: dateKey,
                            text: data[dateKey].text,
                            mood: data[dateKey].mood,
                            updatedAt: data[dateKey].updatedAt || Date.now()
                        });
                    }
                }
                await renderCalSelectedEvents();
                await updateDashboardProfileCards();
            }
        });
    }

    const notesRef = getVaultRef('notes');
    if (notesRef) {
        notesRef.off();
        notesRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                let changed = false;
                for (let dateKey in data) {
                    const localNt = await db.notes.get(dateKey);
                    if (!localNt || (data[dateKey].updatedAt && data[dateKey].updatedAt > (localNt.updatedAt || 0))) {
                        await db.notes.put({
                            dateKey: dateKey,
                            html: data[dateKey].html || '',
                            text: data[dateKey].text || '',
                            updatedAt: data[dateKey].updatedAt || Date.now()
                        });
                        changed = true;
                    }
                }
                if (changed) {
                    await initCalendar();
                    await renderCalSelectedEvents();
                }
            }
        });
    }
}

async function mergeRemoteEventToLocal(id, data) {
    if (!data || !data.title) return;
    const existing = await db.events.get(id);
    if (!existing || (data.updatedAt && data.updatedAt > (existing.updatedAt || 0))) {
        const eventData = {
            id: id,
            date: data.date || selectedDateStr,
            title: data.title || 'Evento Sincronizado',
            details: data.details || '',
            time: data.time || '--:--',
            priority: data.priority || 'medium',
            loc: data.loc || 'none',
            customCoords: data.customCoords || null,
            notified: existing ? existing.notified : false,
            alarmFired: existing ? existing.alarmFired : false,
            done: data.done || false,
            updatedAt: data.updatedAt || Date.now()
        };
        await db.events.put(eventData);
        await initCalendar();
        await renderCalSelectedEvents();
        await updateSummaryData();
        await updateDashboardProfileCards();
    }
}

function syncEventWithFirebase(eventData) {
    if (!navigator.onLine || !fbDB || !activeVaultId) return;
    const payload = {
        title: eventData.title,
        date: eventData.date,
        time: eventData.time,
        priority: eventData.priority || 'medium',
        details: eventData.details || '',
        loc: eventData.loc || 'none',
        customCoords: eventData.customCoords || null,
        done: eventData.done || false,
        updatedAt: eventData.updatedAt || Date.now(),
        timestamp: Date.now()
    };

    const ref = getVaultRef(`events/${eventData.id}`);
    if (ref) {
        ref.set(payload).catch(err => console.error("Error sincronizando evento:", err));
    }
}

async function toggleGlassMode(val) {
    triggerHaptic();
    if (val === 'on') {
        document.body.classList.add('glass-active');
    } else {
        document.body.classList.remove('glass-active');
    }
    await db.settings.put({ key: 'glass_mode', value: val });
}

function applyProfileUI(profileKey) {
    const p = profilePresets[profileKey] || profilePresets.general;
    currentProfileKey = profileKey;

    const taskInput = document.getElementById('taskInputText');
    const eventInput = document.getElementById('eventTitle');
    if (taskInput) taskInput.placeholder = p.taskPlaceholder;
    if (eventInput) eventInput.placeholder = p.eventPlaceholder;

    const optCentral = document.getElementById('opt-loc-central');
    const optPuntoA = document.getElementById('opt-loc-punto-a');
    const optPuntoB = document.getElementById('opt-loc-punto-b');
    if (optCentral) optCentral.innerText = p.locCentral;
    if (optPuntoA) optPuntoA.innerText = p.locPuntoA;
    if (optPuntoB) optPuntoB.innerText = p.locPuntoB;

    const lblCochera = document.getElementById('lbl-setting-cochera');
    const lblPuntoA = document.getElementById('lbl-setting-punto-a');
    const lblPuntoB = document.getElementById('lbl-setting-punto-b');
    if (lblCochera) lblCochera.innerText = p.locCentral;
    if (lblPuntoA) lblPuntoA.innerText = p.locPuntoA;
    if (lblPuntoB) lblPuntoB.innerText = p.locPuntoB;

    const summaryProfile = document.getElementById('summary-profile-name');
    const settingsProfile = document.getElementById('settings-profile-label');
    if (summaryProfile) summaryProfile.innerText = p.name;
    if (settingsProfile) settingsProfile.innerText = 'Perfil Actual: ' + p.name;
}

async function selectUserProfile(profileKey) {
    triggerHaptic();
    await db.settings.put({ key: 'user_profile', value: profileKey });
    if (navigator.onLine && fbDB && activeVaultId) {
        const ref = getVaultRef('settings/user_profile');
        if (ref) ref.set(profileKey);
    }
    applyProfileUI(profileKey);

    const defaultTheme = profilePresets[profileKey]?.defaultTheme || 'cafe';
    applyThemeUI(defaultTheme);
    await db.settings.put({ key: 'app_theme', value: defaultTheme });

    switchTab('dashboard');
}

function openWelcomeScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screenWelcome = document.getElementById('screen-welcome');
    if (screenWelcome) screenWelcome.classList.add('active');
    const fabBtn = document.getElementById('fab-main-btn');
    if (fabBtn) fabBtn.style.display = 'none';
}

function openTutorialModal(stepIndex) {
    currentTutorialIndex = stepIndex;
    renderTutorialStep();
    const modal = document.getElementById('tutorial-modal');
    if (modal) modal.style.display = 'flex';
}

function renderTutorialStep() {
    const step = tutorialSteps[currentTutorialIndex];
    document.getElementById('tut-icon').innerText = step.icon;
    document.getElementById('tut-title').innerText = step.title;
    document.getElementById('tut-desc').innerText = step.desc;
    document.getElementById('tut-counter').innerText = `${currentTutorialIndex + 1} / ${tutorialSteps.length}`;
    document.getElementById('tut-prev-btn').style.visibility = (currentTutorialIndex === 0) ? 'hidden' : 'visible';
    document.getElementById('tut-next-btn').innerText = (currentTutorialIndex === tutorialSteps.length - 1) ? '¡Entendido!' : 'Siguiente';
}

function moveTutorialStep(dir) {
    currentTutorialIndex += dir;
    if (currentTutorialIndex >= tutorialSteps.length) {
        document.getElementById('tutorial-modal').style.display = 'none';
        currentTutorialIndex = 0;
    } else if (currentTutorialIndex < 0) {
        currentTutorialIndex = 0;
    } else {
        renderTutorialStep();
    }
}

function unlockAudioContext() {
    if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
}

function applyThemeUI(themeName) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add('theme-' + themeName);
    document.querySelectorAll('.theme-card-btn').forEach(btn => {
        if (btn.dataset.theme === themeName) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

async function switchTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const tabEl = document.getElementById('tab-' + tabName);
    const navEl = document.getElementById('nav-' + tabName);
    if (tabEl) tabEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    const fab = document.getElementById('fab-main-btn');
    if (fab) fab.style.display = (tabName === 'tasks') ? 'flex' : 'none';

    if (tabName === 'dashboard') {
        await updateDashboardProfileCards();
    }

    await loadTabData();
}

function openSettingsScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screenSettings = document.getElementById('screen-settings');
    if (screenSettings) screenSettings.classList.add('active');
    const fabBtn = document.getElementById('fab-main-btn');
    if (fabBtn) fabBtn.style.display = 'none';
}

function openDayModalForSelectedDate() {
    document.getElementById('selected-date-title').innerText = selectedDateStr;
    const dParts = selectedDateStr.split('-');
    const dObj = new Date(dParts[0], dParts[1] - 1, dParts[2]);
    const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    document.getElementById('selected-weekday').innerText = dayNames[dObj.getDay()];

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-day-modal').classList.add('active');
    const fabBtn = document.getElementById('fab-main-btn');
    if (fabBtn) fabBtn.style.display = 'none';
}

function openTaskModal() {
    const taskModal = document.getElementById('task-modal');
    if (taskModal) taskModal.style.display = 'flex';
}

function closeTaskModal() {
    const taskModal = document.getElementById('task-modal');
    if (taskModal) taskModal.style.display = 'none';
}

function handleFabClick() {
    if (currentActiveTab === 'tasks') {
        openTaskModal();
    }
}

/* --- NAVEGACIÓN CORREGIDA DE MES Y DÍA ACTUAL (v3.7.0 | medbasha) --- */
async function goToToday() {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDateStr = getFormattedDateKey(today);

    const dateLabel = document.getElementById('cal-selected-date-label');
    if (dateLabel) dateLabel.innerText = selectedDateStr;

    await initCalendar();
    await renderCalSelectedEvents();
    await loadTabData();
}

async function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { 
        currentMonth = 11; 
        currentYear--; 
    } else if (currentMonth > 11) { 
        currentMonth = 0; 
        currentYear++; 
    }
    
    const today = new Date();
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
        selectedDateStr = getFormattedDateKey(today);
    } else {
        selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    }

    const label = document.getElementById('cal-selected-date-label');
    if (label) label.innerText = selectedDateStr;

    await initCalendar();
    await renderCalSelectedEvents();
    await loadTabData();
}

async function loadTabData() {
    const noteRecord = await db.notes.get(selectedDateStr);
    const area = document.getElementById('tab-day-notes');
    if (area) {
        area.innerHTML = (noteRecord && noteRecord.html) ? noteRecord.html : (noteRecord && noteRecord.text ? noteRecord.text : '');
    }
    const notesDateLabel = document.getElementById('notes-date-label');
    if (notesDateLabel) notesDateLabel.innerText = selectedDateStr;

    await renderDayTasksList();
    await updateSummaryData();
    await renderCalSelectedEvents();
}

/* --- MOTOR DE VOZ IA INTELIGENTE CON RECONOCIMIENTO DE REPETICIONES Y RESPALDO CLOUD --- */
function toggleGlobalVoiceAssistant() {
    const micBtn = document.getElementById('btn-global-mic');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        return alert("El reconocimiento por voz no está soportado en este navegador.");
    }

    if (isGlobalMicActive) {
        if (speechRecognition) speechRecognition.stop();
        isGlobalMicActive = false;
        if (micBtn) micBtn.style.color = 'var(--text-main)';
    } else {
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = navigator.language || 'es-ES';
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;

        speechRecognition.onstart = () => {
            isGlobalMicActive = true;
            if (micBtn) micBtn.style.color = '#e54d42';
        };

        speechRecognition.onresult = async (event) => {
            const phrase = event.results[0][0].transcript;
            await processUniversalVoiceCommand(phrase);
        };

        speechRecognition.onerror = () => {
            isGlobalMicActive = false;
            if (micBtn) micBtn.style.color = 'var(--text-main)';
        };

        speechRecognition.onend = () => {
            isGlobalMicActive = false;
            if (micBtn) micBtn.style.color = 'var(--text-main)';
        };

        speechRecognition.start();
    }
}

async function processUniversalVoiceCommand(phrase) {
    const lower = phrase.toLowerCase();
    let targetDate = new Date();

    let repeatMode = 'none';
    if (lower.includes('todos los') || lower.includes('cada') || lower.includes('todas las')) {
        if (lower.includes('día') || lower.includes('dia') || lower.includes('diariamente')) {
            repeatMode = 'daily';
        } else {
            repeatMode = 'weekly';
        }
    } else if (lower.includes('cada mes') || lower.includes('mensualmente')) {
        repeatMode = 'monthly';
    }

    const weekDaysMap = { 'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6 };
    let weekDayFound = null;

    for (let dayName in weekDaysMap) {
        if (lower.includes(dayName)) {
            weekDayFound = weekDaysMap[dayName];
            break;
        }
    }

    if (weekDayFound !== null) {
        const todayDayIndex = targetDate.getDay();
        let daysToAdd = weekDayFound - todayDayIndex;
        if (daysToAdd <= 0 || lower.includes('que viene') || lower.includes('próximo') || lower.includes('proximo')) {
            daysToAdd += 7;
        }
        targetDate.setDate(targetDate.getDate() + daysToAdd);
    } else if (lower.includes('mañana') || lower.includes('tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('pasado mañana')) {
        targetDate.setDate(targetDate.getDate() + 2);
    } else {
        const dayNumMatch = lower.match(/(?:el día|día|el)\s*(\d{1,2})\s*(?:del mes que viene|del próximo mes|del mes siguiente)?/i);
        const isNextMonth = lower.includes('mes que viene') || lower.includes('próximo mes') || lower.includes('mes siguiente');

        if (isNextMonth && dayNumMatch) {
            targetDate.setMonth(targetDate.getMonth() + 1);
            targetDate.setDate(parseInt(dayNumMatch[1]));
        } else if (dayNumMatch) {
            const dayVal = parseInt(dayNumMatch[1]);
            if (dayVal < targetDate.getDate()) targetDate.setMonth(targetDate.getMonth() + 1);
            targetDate.setDate(dayVal);
        }
    }

    const targetDateKey = getFormattedDateKey(targetDate);

    let timeFound = '';
    const standardTimeMatch = lower.match(/(\d{1,2})[:\.](\d{2})/);
    const spokenTimeMatch = lower.match(/(?:a las|at)\s*(\d{1,2})\s*(?:y|\:)\s*(\d{1,2})/i);
    const halfTimeMatch = lower.match(/(?:a las|at)\s*(\d{1,2})\s*y media/i);

    if (standardTimeMatch) {
        timeFound = `${String(standardTimeMatch[1]).padStart(2,'0')}:${standardTimeMatch[2]}`;
    } else if (spokenTimeMatch) {
        timeFound = `${String(spokenTimeMatch[1]).padStart(2,'0')}:${String(spokenTimeMatch[2]).padStart(2,'0')}`;
    } else if (halfTimeMatch) {
        timeFound = `${String(halfTimeMatch[1]).padStart(2,'0')}:30`;
    } else {
        const hourOnlyMatch = lower.match(/(?:a las|at)\s*(\d{1,2})/i);
        if (hourOnlyMatch) {
            timeFound = `${String(hourOnlyMatch[1]).padStart(2,'0')}:00`;
        }
    }

    let loc = 'none';
    if (lower.includes('casa')) loc = 'casa';
    else if (lower.includes('cochera') || lower.includes('trabajo') || lower.includes('base') || lower.includes('central')) loc = 'central';
    else if (lower.includes('super') || lower.includes('compras')) loc = 'super';
    else if (lower.includes('gasolinera')) loc = 'gasolinera';

    let category = 'personal';
    if (lower.includes('trabajo') || lower.includes('revisar') || lower.includes('informe')) category = 'trabajo';
    else if (lower.includes('urgente') || lower.includes('ya') || lower.includes('medico') || lower.includes('doctor')) category = 'urgente';

    const isEvent = lower.includes('vacaciones') || lower.includes('cita') || lower.includes('reunión') || 
                    lower.includes('evento') || lower.includes('clase') || lower.includes('gimnasio') || 
                    lower.includes('médico') || lower.includes('doctor');

    try {
        if (isEvent && repeatMode === 'none') {
            const eventId = 'ev_' + Date.now();
            const eventData = {
                id: eventId,
                date: targetDateKey,
                title: phrase,
                details: 'Dictado por Voz IA',
                time: timeFound || '09:00',
                priority: 'high',
                loc: loc,
                notified: false,
                alarmFired: false,
                done: false,
                updatedAt: Date.now()
            };

            await db.transaction('rw', db.events, async () => {
                await db.events.put(eventData);
            });

            syncEventWithFirebase(eventData);
            
            selectedDateStr = targetDateKey;
            currentYear = targetDate.getFullYear();
            currentMonth = targetDate.getMonth();
            
            await initCalendar();
            await updateDashboardProfileCards();
            alert(`✓ Evento asignado al ${targetDateKey}:\n"${phrase}"\n⏰ Alarma a las: ${eventData.time}`);
            switchTab('calendar');
        } else {
            const newTodo = {
                dateKey: targetDateKey,
                text: phrase,
                done: false,
                category: category,
                subtasks: [],
                repeat: repeatMode,
                loc: loc,
                time: timeFound,
                updatedAt: Date.now()
            };
            newTodo.cloudSyncKey = getTodoCloudKey(newTodo);

            await db.transaction('rw', db.todos, async () => {
                await db.todos.add(newTodo);
            });

            syncTodoWithCloud(newTodo);
            
            selectedDateStr = targetDateKey;
            currentYear = targetDate.getFullYear();
            currentMonth = targetDate.getMonth();

            await renderDayTasksList();
            await initCalendar();
            await updateDashboardProfileCards();
            
            const repeatMsg = repeatMode !== 'none' ? ` (Repetición: ${repeatMode})` : '';
            alert(`✓ Tarea asignada al ${targetDateKey}${repeatMsg}:\n"${phrase}"`);
            switchTab('tasks');
        }
    } catch (err) {
        console.error("Error en comando de voz:", err);
    }
}

function toggleStrikethroughNote() {
    triggerHaptic();
    const area = document.getElementById('tab-day-notes');
    const sel = window.getSelection();

    if (sel.rangeCount > 0 && sel.toString().trim() !== '') {
        document.execCommand('strikeThrough', false, null);
    } else if (area) {
        const isTached = area.classList.contains('note-strike-txt');
        if (isTached) {
            area.classList.remove('note-strike-txt');
            area.querySelectorAll('strike, s, del').forEach(el => {
                el.outerHTML = el.innerHTML;
            });
        } else {
            area.classList.add('note-strike-txt');
        }
    }
    saveTabNotes();
}

async function clearTabNotes() {
    if (confirm("¿Quieres borrar la nota y la reflexión del diario de este día?")) {
        const area = document.getElementById('tab-day-notes');
        if (area) {
            area.innerHTML = '';
            area.classList.remove('note-strike-txt');
        }
        await db.transaction('rw', db.notes, db.journal, async () => {
            await db.notes.delete(selectedDateStr);
            await db.journal.delete(selectedDateStr);
        });
        syncNoteWithCloud(selectedDateStr, null);
        if (fbDB && activeVaultId) {
            const ref = getVaultRef(`journal/${selectedDateStr}`);
            if (ref) ref.remove().catch(() => {});
        }
        await renderCalSelectedEvents();
        await updateDashboardProfileCards();
        await initCalendar();
    }
}

function filterTaskCategory(cat, el) {
    triggerHaptic();
    activeCategoryFilter = cat;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderDayTasksList();
}

async function updateTaskProgress() {
    const list = await db.todos.where('dateKey').equals(selectedDateStr).toArray();
    const total = list.length;
    const completed = list.filter(t => t.done).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const percentTxt = document.getElementById('progress-percent-txt');
    const fillBar = document.getElementById('progress-bar-fill');
    if (percentTxt) percentTxt.innerText = percent + '%';
    if (fillBar) fillBar.style.width = percent + '%';
}

async function loadPresetTemplate() {
    let items = [];
    if (currentProfileKey === 'trabajo') {
        items = ['Revisar correo e incidencias', 'Planificar entregas del día', 'Verificar proyectos activos'];
    } else if (currentProfileKey === 'salud') {
        items = ['Beber vaso de agua', '30 min de ejercicio / caminata', 'Tomar medicación / vitaminas'];
    } else if (currentProfileKey === 'finanzas') {
        items = ['Revisar saldo e ingresos', 'Registrar gastos diarios', 'Verificar facturas pendientes'];
    } else if (currentProfileKey === 'personal') {
        items = ['Organizar la casa', 'Hacer compra diaria', 'Tiempo libre / Lectura'];
    } else {
        items = ['Revisar agenda del día', 'Hacer compras pendientes', 'Organizar tareas personales'];
    }

    try {
        await db.transaction('rw', db.todos, async () => {
            for (let text of items) {
                const td = { dateKey: selectedDateStr, text, done: false, category: 'trabajo', loc: 'none', time: '', updatedAt: Date.now() };
                td.cloudSyncKey = getTodoCloudKey(td);
                await db.todos.add(td);
                syncTodoWithCloud(td);
            }
        });
        await renderDayTasksList();
        await updateDashboardProfileCards();
        alert("✓ Plantilla cargada correctamente.");
    } catch (e) {
        console.error("Error al cargar plantilla:", e);
    }
}

async function shareDaySummary() {
    const tasksList = await db.todos.where('dateKey').equals(selectedDateStr).toArray();
    const eventsList = await db.events.where('date').equals(selectedDateStr).toArray();
    const noteRecord = await db.notes.get(selectedDateStr);

    let msg = `📅 *RESUMEN DE JORNADA (${selectedDateStr})*\n\n`;
    
    if (eventsList.length > 0) {
        msg += `🔵 *Eventos:*\n`;
        eventsList.forEach(e => msg += `• ${e.time} - ${e.title}\n`);
        msg += `\n`;
    }

    if (tasksList.length > 0) {
        msg += `🟢 *Tareas:*\n`;
        tasksList.forEach(t => msg += `${t.done ? '✅' : '⏳'} ${t.text}\n`);
        msg += `\n`;
    }

    if (noteRecord && (noteRecord.text || noteRecord.html)) {
        const cleanTxt = (noteRecord.text || noteRecord.html.replace(/<[^>]*>/g, '')).trim();
        if (cleanTxt) msg += `🟠 *Notas:*\n${cleanTxt}\n`;
    }

    if (navigator.share) {
        navigator.share({ title: 'Resumen TaskMaster', text: msg });
    } else {
        navigator.clipboard.writeText(msg);
        alert("✓ Resumen copiado al portapapeles.");
    }
}

async function handleGlobalSearch(query) {
    const box = document.getElementById('search-results-box');
    const listContainer = document.getElementById('search-results-list');
    
    if (!query || query.trim().length < 2) {
        if (box) box.style.display = 'none';
        return;
    }

    const q = query.toLowerCase().trim();
    const allTasks = await db.todos.toArray();
    const allEvents = await db.events.toArray();
    const allNotes = await db.notes.toArray();

    const matchedTasks = allTasks.filter(t => t.text.toLowerCase().includes(q));
    const matchedEvents = allEvents.filter(e => e.title.toLowerCase().includes(q) || (e.details && e.details.toLowerCase().includes(q)));
    const matchedNotes = allNotes.filter(n => (n.text && n.text.toLowerCase().includes(q)) || (n.html && n.html.toLowerCase().includes(q)));

    if (listContainer) listContainer.innerHTML = '';
    let total = 0;

    matchedTasks.forEach(t => {
        total++;
        if (listContainer) listContainer.innerHTML += `<div class="event-card"><div class="event-info"><div class="event-time">🟢 Tarea (${t.dateKey})</div><div class="event-title-txt">${t.text}</div></div></div>`;
    });

    matchedEvents.forEach(e => {
        total++;
        if (listContainer) listContainer.innerHTML += `<div class="event-card"><div class="event-info"><div class="event-time">🔵 Evento (${e.date})</div><div class="event-title-txt">${e.title}</div></div></div>`;
    });

    matchedNotes.forEach(n => {
        total++;
        const displayTxt = n.text || n.html.replace(/<[^>]*>/g, '');
        if (listContainer) listContainer.innerHTML += `<div class="event-card"><div class="event-info"><div class="event-time">🟠 Nota (${n.dateKey})</div><div class="event-title-txt">${displayTxt.substring(0, 45)}...</div></div></div>`;
    });

    if (total === 0 && listContainer) {
        listContainer.innerHTML = '<div class="empty-hint" style="color:var(--text-muted); font-style:italic;">No se encontraron coincidencias.</div>';
    }

    if (box) box.style.display = 'block';
}

function toggleDictation() {
    const btn = document.getElementById('btn-dictate-notes');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        return alert("El reconocimiento por voz no está soportado en este navegador.");
    }

    if (isRecordingSpeech) {
        if (speechRecognition) speechRecognition.stop();
        isRecordingSpeech = false;
        if (btn) {
            btn.innerText = '🎙️ Dictar';
        }
    } else {
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = navigator.language || 'es-ES';
        speechRecognition.continuous = true;
        speechRecognition.interimResults = false;

        speechRecognition.onstart = () => {
            isRecordingSpeech = true;
            if (btn) {
                btn.innerText = '🔴 Escuchando...';
            }
        };

        speechRecognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const area = document.getElementById('tab-day-notes');
            if (area) {
                area.innerHTML += (area.innerHTML ? '<br>' : '') + transcript;
                saveTabNotes();
            }
        };

        speechRecognition.onerror = () => {
            isRecordingSpeech = false;
            if (btn) btn.innerText = '🎙️ Dictar';
        };

        speechRecognition.onend = () => {
            isRecordingSpeech = false;
            if (btn) btn.innerText = '🎙️ Dictar';
        };

        speechRecognition.start();
    }
}

function formatNotesWithIA() {
    const area = document.getElementById('tab-day-notes');
    if (!area) return;
    let rawText = area.innerText.trim();
    if (!rawText) return alert("Escribe o dicta algo primero en las notas.");

    const lines = rawText.split('\n').filter(l => l.trim() !== '');
    const formatted = lines.map(line => '• ' + line.replace(/^[\s•\-*]+/, '')).join('<br>');
    area.innerHTML = `<b>📝 NOTAS ESTRUCTURADAS:</b><br>${formatted}`;
    saveTabNotes();
}

async function convertNoteToAlarm() {
    const area = document.getElementById('tab-day-notes');
    if (!area) return;
    let rawText = area.innerText.trim();
    if (!rawText) return alert("Escribe primero la nota que quieres convertir en alarma.");

    const timeStr = prompt("Introduce la hora de la alarma (Ejemplo: 14:30):", "09:00");
    if (!timeStr) return;

    const eventId = 'ev_' + Date.now();
    const eventData = {
        id: eventId,
        date: selectedDateStr,
        title: '📌 Alarma Nota: ' + rawText.substring(0, 25),
        details: rawText,
        time: timeStr,
        priority: 'medium',
        loc: 'none',
        notified: false,
        alarmFired: false,
        done: false,
        updatedAt: Date.now()
    };

    try {
        await db.transaction('rw', db.events, async () => {
            await db.events.put(eventData);
        });
        syncEventWithFirebase(eventData);
        await initCalendar();
        await updateDashboardProfileCards();
        alert("✓ Nota convertida en Alerta correctamente.");
    } catch (e) {
        console.error("Error al convertir nota en alarma:", e);
    }
}

function renderWeekBar() {
    const container = document.getElementById('week-bar');
    if (!container) return;
    container.innerHTML = '';
    
    const curr = new Date();
    const dayOfWeek = curr.getDay();
    const firstDay = new Date(curr);

    if (dayOfWeek === 0) {
        firstDay.setDate(curr.getDate() + 1);
    } else {
        firstDay.setDate(curr.getDate() - dayOfWeek + 1);
    }

    const dayNames = ['L','M','X','J','V','S','D'];

    for (let i = 0; i < 7; i++) {
        const nextDay = new Date(firstDay);
        nextDay.setDate(firstDay.getDate() + i);
        const dateKey = getFormattedDateKey(nextDay);
        const dayNum = nextDay.getDate();

        const chip = document.createElement('div');
        chip.className = `week-day-chip ${dateKey === selectedDateStr ? 'active' : ''}`;
        if (dateKey === getFormattedDateKey(todayDate)) chip.classList.add('today-highlight');

        chip.innerHTML = `
            <span class="day-name">${dayNames[i]}</span>
            <span class="day-num">${dayNum}</span>
        `;
        chip.onclick = async () => {
            triggerHaptic();
            selectedDateStr = dateKey;
            renderWeekBar();
            await loadTabData();
        };
        container.appendChild(chip);
    }
}

function handleSaveTaskClick() {
    const txt = document.getElementById('taskInputText').value;
    if (!txt) return alert("Escribe el nombre de la tarea.");

    const time = document.getElementById('taskTimeInput').value;
    if (!time) {
        const modal = document.getElementById('reminder-prompt-modal');
        if (modal) modal.style.display = 'flex';
    } else {
        executeSaveTask();
    }
}

function promptAddReminderTime() {
    const modal = document.getElementById('reminder-prompt-modal');
    if (modal) modal.style.display = 'none';
    const timeInput = document.getElementById('taskTimeInput');
    if (timeInput) {
        timeInput.focus();
        if ('showPicker' in HTMLInputElement.prototype) {
            try {
                timeInput.showPicker();
            } catch (e) {}
        }
    }
}

function promptSaveWithoutReminder() {
    const modal = document.getElementById('reminder-prompt-modal');
    if (modal) modal.style.display = 'none';
    executeSaveTask();
}

async function executeSaveTask() {
    const txt = document.getElementById('taskInputText').value.trim();
    const category = document.getElementById('taskCategorySelect').value;
    const subtasksRaw = document.getElementById('taskSubtasksInput').value;
    const repeat = document.getElementById('taskRepeatSelect').value;
    const loc = document.getElementById('taskLocSelect').value;
    const time = document.getElementById('taskTimeInput').value;

    if (!txt) return alert("Escribe el nombre de la tarea.");

    const subtasks = subtasksRaw 
        ? subtasksRaw.split(',').map(s => ({ text: s.trim(), done: false })).filter(s => s.text !== '') 
        : [];

    try {
        const todoObj = { 
            dateKey: selectedDateStr, 
            text: txt, 
            done: false, 
            category, 
            subtasks, 
            repeat, 
            loc, 
            time,
            updatedAt: Date.now()
        };
        todoObj.cloudSyncKey = getTodoCloudKey(todoObj);

        await db.transaction('rw', db.todos, db.events, async () => {
            const todoId = await db.todos.add(todoObj);

            if (loc !== 'none' || time) {
                const eventId = 'ev_t_' + todoId;
                const eventData = {
                    id: eventId,
                    date: selectedDateStr,
                    title: txt, 
                    details: 'Tarea con Alerta/Ubicación', 
                    time: time || '--:--', 
                    priority: 'low', 
                    loc,
                    customCoords: pendingEventCustomCoords,
                    notified: false, 
                    alarmFired: false, 
                    done: false,
                    updatedAt: Date.now()
                };
                
                await db.events.put(eventData);

                if (time || loc !== 'none') {
                    syncEventWithFirebase(eventData);
                }
            }
        });

        syncTodoWithCloud(todoObj);

        const taskArea = document.getElementById('taskInputText');
        if (taskArea) {
            taskArea.value = '';
            taskArea.style.height = 'auto';
        }
        const subtasksInput = document.getElementById('taskSubtasksInput');
        const timeInput = document.getElementById('taskTimeInput');
        if (subtasksInput) subtasksInput.value = '';
        if (timeInput) timeInput.value = '';

        closeTaskModal();
        pendingEventCustomCoords = null;
        
        await initCalendar();
        await renderDayTasksList();
        await updateSummaryData();
        await updateDashboardProfileCards();

    } catch (error) {
        console.error("Error al guardar tarea:", error);
        alert("⚠️ No se pudo confirmar el guardado local. Inténtalo de nuevo.");
    }
}

async function renderDayTasksList() {
    const container = document.getElementById('tasks-day-list');
    if (!container) return;
    container.innerHTML = '';
    let list = await db.todos.where('dateKey').equals(selectedDateStr).toArray();

    if (activeCategoryFilter !== 'all') {
        list = list.filter(t => t.category === activeCategoryFilter);
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-hint" style="color:var(--text-muted); font-style:italic; text-align:center; padding:18px;">No hay tareas anotadas para este día. Toca (+) para añadir una.</div>';
        await updateTaskProgress();
        return;
    }

    list.forEach((todo) => {
        const div = document.createElement('div');
        div.className = `todo-item ${todo.done ? 'done' : ''}`;
        
        let subtasksHtml = '';
        if (todo.subtasks && todo.subtasks.length > 0) {
            subtasksHtml = '<div class="subtasks-container">';
            todo.subtasks.forEach((st, idx) => {
                subtasksHtml += `
                    <div class="subtask-item ${st.done ? 'done' : ''}">
                        <input type="checkbox" ${st.done ? 'checked' : ''} onchange="triggerHaptic(); toggleSubtask(${todo.id}, ${idx});">
                        <span>${st.text}</span>
                    </div>
                `;
            });
            subtasksHtml += '</div>';
        }

        div.innerHTML = `
            <div class="todo-main-row">
                <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''} onchange="triggerHaptic(); toggleDayTodo(${todo.id}, ${todo.done});">
                <span class="todo-text-span">${todo.text}</span>
                <button class="btn-reminder" onclick="triggerHaptic(); setTaskTimePrompt(${todo.id}, '${todo.text.replace(/'/g, "\\'")}', '${todo.time || ''}');">🔔 ${todo.time ? todo.time : 'Recordar'}</button>
                <button class="event-del" onclick="triggerHaptic(); deleteDayTodo(${todo.id});">✕</button>
            </div>
            ${subtasksHtml}
        `;
        container.appendChild(div);
    });
    await updateTaskProgress();
}

async function setTaskTimePrompt(todoId, title, currentTime) {
    const timeStr = prompt(`⏰ Asignar hora de alarma para:\n"${title}"`, currentTime || "09:00");
    if (!timeStr) return;

    try {
        await db.transaction('rw', db.todos, db.events, async () => {
            const isTodo = await db.todos.get(todoId);
            if (isTodo) {
                deleteTodoFromCloud(isTodo);
                const updatedTodo = { ...isTodo, time: timeStr, updatedAt: Date.now() };
                updatedTodo.cloudSyncKey = getTodoCloudKey(updatedTodo);
                await db.todos.update(todoId, { time: timeStr, cloudSyncKey: updatedTodo.cloudSyncKey, updatedAt: updatedTodo.updatedAt });
                syncTodoWithCloud(updatedTodo);

                const eventId = 'ev_t_' + todoId;
                const eventData = {
                    id: eventId,
                    date: selectedDateStr,
                    title: title,
                    details: 'Recordatorio de Tarea',
                    time: timeStr,
                    priority: 'medium',
                    loc: 'none',
                    notified: false,
                    alarmFired: false,
                    done: false,
                    updatedAt: Date.now()
                };
                await db.events.put(eventData);
                syncEventWithFirebase(eventData);
            } else {
                await db.events.update(todoId, { time: timeStr, alarmFired: false, updatedAt: Date.now() });
                const updatedEv = await db.events.get(todoId);
                if (updatedEv) syncEventWithFirebase(updatedEv);
            }
        });

        await renderDayTasksList();
        await renderCalSelectedEvents();
        await initCalendar();
        await updateDashboardProfileCards();
        triggerHaptic();
    } catch (e) {
        console.error("Error al asignar hora:", e);
    }
}

async function toggleSubtask(todoId, subtaskIdx) {
    try {
        const todo = await db.todos.get(todoId);
        if (todo && todo.subtasks) {
            todo.subtasks[subtaskIdx].done = !todo.subtasks[subtaskIdx].done;
            todo.updatedAt = Date.now();
            await db.todos.update(todoId, { subtasks: todo.subtasks, updatedAt: todo.updatedAt });
            syncTodoWithCloud(todo);
            await renderDayTasksList();
        }
    } catch (e) {
        console.error("Error al conmutar subtarea:", e);
    }
}

async function toggleDayTodo(id, currentDone) {
    try {
        const todo = await db.todos.get(id);
        const newDoneState = !currentDone;

        await db.transaction('rw', db.todos, async () => {
            await db.todos.update(id, { done: newDoneState, updatedAt: Date.now() });
            if (todo) {
                syncTodoWithCloud({ ...todo, done: newDoneState, updatedAt: Date.now() });
            }

            if (newDoneState && todo && todo.repeat && todo.repeat !== 'none') {
                const nextDate = new Date(todo.dateKey);
                let nextTime = todo.time;

                if (todo.repeat === '10m' || todo.repeat === '15m' || todo.repeat === '30m' || todo.repeat === '1h') {
                    const now = new Date();
                    const minutesToAdd = todo.repeat === '10m' ? 10 : todo.repeat === '15m' ? 15 : todo.repeat === '30m' ? 30 : 60;
                    now.setMinutes(now.getMinutes() + minutesToAdd);
                    nextDate.setTime(now.getTime());
                    nextTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                } else if (todo.repeat === 'daily') {
                    nextDate.setDate(nextDate.getDate() + 1);
                } else if (todo.repeat === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (todo.repeat === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                const nextDateKey = getFormattedDateKey(nextDate);
                const nextTodo = {
                    dateKey: nextDateKey,
                    text: todo.text,
                    done: false,
                    category: todo.category,
                    subtasks: todo.subtasks ? todo.subtasks.map(s => ({ ...s, done: false })) : [],
                    repeat: todo.repeat,
                    loc: todo.loc,
                    time: nextTime,
                    updatedAt: Date.now()
                };
                nextTodo.cloudSyncKey = getTodoCloudKey(nextTodo);

                await db.todos.add(nextTodo);
                syncTodoWithCloud(nextTodo);
            }
        });

        await renderDayTasksList();
        await updateDashboardProfileCards();
    } catch (e) {
        console.error("Error al marcar tarea realizada:", e);
    }
}

async function deleteDayTodo(id) {
    try {
        const existingTodo = await db.todos.get(id);
        await db.transaction('rw', db.todos, db.events, async () => {
            await db.todos.delete(id);
            await db.events.delete('ev_t_' + id);
        });
        if (existingTodo) deleteTodoFromCloud(existingTodo);
        if (fbDB && activeVaultId) {
            const ref = getVaultRef(`events/ev_t_${id}`);
            if (ref) ref.remove().catch(() => {});
        }
        await renderDayTasksList();
        await initCalendar();
        await updateDashboardProfileCards();
    } catch (e) {
        console.error("Error al borrar tarea:", e);
    }
}

async function saveTabNotes() {
    const area = document.getElementById('tab-day-notes');
    if (!area) return;

    const htmlContent = area.innerHTML;
    const plainText = area.innerText.trim();

    try {
        let notePayload = null;
        await db.transaction('rw', db.notes, async () => {
            if (!plainText && !htmlContent.includes('<img')) {
                await db.notes.delete(selectedDateStr);
            } else {
                notePayload = { 
                    dateKey: selectedDateStr, 
                    html: htmlContent, 
                    text: plainText,
                    updatedAt: Date.now()
                };
                await db.notes.put(notePayload);
            }
        });

        syncNoteWithCloud(selectedDateStr, notePayload);

        await renderCalSelectedEvents();
        await initCalendar();
        await updateDashboardProfileCards();

    } catch (error) {
        console.error("Error al persistir nota:", error);
    }
}

async function updateSummaryData() {
    const todayKey = getFormattedDateKey(todayDate);
    const pendingTasks = await db.todos.where('dateKey').equals(todayKey).filter(t => !t.done).count();
    const completedTasks = await db.todos.where('dateKey').equals(todayKey).filter(t => t.done).count();
    const todayEvents = await db.events.where('date').equals(todayKey).count();
    const savedLocs = await db.locations.count();

    const pendingEl = document.getElementById('summary-pending-count');
    const eventsEl = document.getElementById('summary-events-count');
    const locsEl = document.getElementById('summary-locs-count');
    if (pendingEl) pendingEl.innerText = pendingTasks;
    if (eventsEl) eventsEl.innerText = todayEvents;
    if (locsEl) locsEl.innerText = savedLocs;

    const iaSummaryBox = document.getElementById('ia-executive-summary-text');
    if (iaSummaryBox) {
        if (pendingTasks === 0 && todayEvents === 0) {
            iaSummaryBox.innerText = "💡 ¡Todo al día! No tienes tareas ni eventos pendientes para hoy.";
        } else {
            iaSummaryBox.innerText = `💡 Tienes ${pendingTasks} tareas pendientes y ${todayEvents} eventos hoy. Mantén el ritmo en tus objetivos.`;
        }
    }

    drawModernBarChart(pendingTasks, completedTasks, todayEvents, savedLocs);
}

function drawModernBarChart(pending, completed, eventsCount, locs) {
    const canvas = document.getElementById('summaryCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const categories = [
        { label: 'Pendientes', value: pending, color: '#e54d42' },
        { label: 'Hechas', value: completed, color: '#6bb05d' },
        { label: 'Eventos', value: eventsCount, color: '#38bdf8' },
        { label: 'GPS', value: locs, color: '#e5934a' }
    ];

    const maxValue = Math.max(...categories.map(c => c.value), 5);
    const startY = 20;
    const barHeight = 18;
    const gap = 16;

    categories.forEach((cat, index) => {
        const y = startY + index * (barHeight + gap);
        
        ctx.fillStyle = 'rgba(128, 128, 128, 0.14)';
        ctx.beginPath();
        ctx.roundRect(80, y, 210, barHeight, 6);
        ctx.fill();

        const filledWidth = Math.max((cat.value / maxValue) * 210, 8);
        ctx.fillStyle = cat.color;
        ctx.beginPath();
        ctx.roundRect(80, y, filledWidth, barHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#9aa0a6';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(cat.label, 72, y + 13);

        ctx.textAlign = 'left';
        ctx.fillText(cat.value, 86 + filledWidth, y + 13);
    });
}

function handleLocSelectChange(val) {
    if (val === 'custom_map') openMapPicker('event_custom');
}

function openMapPicker(type) {
    activeTargetType = type;
    const mapModal = document.getElementById('map-modal');
    if (mapModal) {
        mapModal.style.display = 'flex';
        mapModal.style.zIndex = '99999';
    }

    if (!leafletMap) {
        leafletMap = L.map('map').setView([tempCoords.lat, tempCoords.lon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(leafletMap);
        mapMarker = L.marker([tempCoords.lat, tempCoords.lon], { draggable: true }).addTo(leafletMap);

        leafletMap.on('click', (e) => {
            tempCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
            mapMarker.setLatLng(e.latlng);
        });
        mapMarker.on('dragend', () => {
            const pos = mapMarker.getLatLng();
            tempCoords = { lat: pos.lat, lon: pos.lng };
        });
    }
    setTimeout(() => { 
        if (leafletMap) {
            leafletMap.invalidateSize(); 
            centerMapOnUserGPS(); 
        }
    }, 150);
}

function centerMapOnUserGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            tempCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            if (leafletMap && mapMarker) {
                leafletMap.setView([tempCoords.lat, tempCoords.lon], 16);
                mapMarker.setLatLng([tempCoords.lat, tempCoords.lon]);
            }
        }, null, { enableHighAccuracy: true });
    }
}

function closeMapPicker() { 
    const mapModal = document.getElementById('map-modal');
    if (mapModal) mapModal.style.display = 'none'; 
}

async function confirmMapLocation() {
    if (activeTargetType === 'event_custom') {
        pendingEventCustomCoords = { lat: tempCoords.lat, lon: tempCoords.lon };
        const statusDiv = document.getElementById('event-custom-coord-status');
        if (statusDiv) {
            statusDiv.innerText = `📍 Punto Fijado (${tempCoords.lat.toFixed(6)}, ${tempCoords.lon.toFixed(6)})`;
            statusDiv.style.display = 'block';
        }
    } else if (activeTargetType) {
        const coordsPayload = { lat: tempCoords.lat, lon: tempCoords.lon };
        await db.locations.put({ key: activeTargetType, data: coordsPayload });
        syncLocationWithCloud(activeTargetType, coordsPayload);
        await updateLocationUI();
    }
    closeMapPicker();
}

async function initCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (monthYearLabel) monthYearLabel.innerText = `${months[currentMonth]} ${currentYear}`;

    ['D','L','M','X','J','V','S'].forEach(n => {
        const el = document.createElement('div');
        el.className = 'calendar-day-name'; el.innerText = n;
        grid.appendChild(el);
    });

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let x = 0; x < firstDayIndex; x++) {
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'calendar-cell empty' }));
    }

    const allEvents = await db.events.toArray();
    const allNotes = await db.notes.toArray();

    for (let i = 1; i <= totalDays; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell'; cell.innerText = i;
        const dateKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;

        if (dateKey === getFormattedDateKey(todayDate)) cell.classList.add('today');

        const hasNote = allNotes.some(n => n.dateKey === dateKey && (n.text || n.html) && (n.text.trim() !== '' || n.html.trim() !== ''));
        if (hasNote) {
            const noteDot = document.createElement('div');
            noteDot.className = 'note-dot-hint';
            cell.appendChild(noteDot);
        }

        const dayEvents = allEvents.filter(e => e.date === dateKey);
        if (dayEvents.length > 0) {
            const barContainer = document.createElement('div');
            barContainer.className = 'indicator-bar-container';
            dayEvents.slice(0, 3).forEach(ev => {
                const bar = document.createElement('div');
                bar.className = 'ind-bar';
                bar.style.backgroundColor = `var(--color-${ev.priority})`;
                barContainer.appendChild(bar);
            });
            cell.appendChild(barContainer);
        }

        cell.onclick = async () => {
            triggerHaptic();
            selectedDateStr = dateKey;
            const dateLabel = document.getElementById('cal-selected-date-label');
            if (dateLabel) dateLabel.innerText = dateKey;
            await renderCalSelectedEvents();

            const tasksInDay = await db.todos.where('dateKey').equals(dateKey).count();
            const eventsInDay = dayEvents.length;
            const noteInDay = hasNote;

            if (tasksInDay === 0 && eventsInDay === 0 && !noteInDay) {
                openDayModalForSelectedDate();
            }
        };
        grid.appendChild(cell);
    }
}

async function renderCalSelectedEvents() {
    const container = document.getElementById('cal-selected-events-list');
    if (!container) return;
    container.innerHTML = '';
    const dayEvents = await db.events.where('date').equals(selectedDateStr).toArray();
    const noteRecord = await db.notes.get(selectedDateStr);
    const journalRecord = await db.journal.get(selectedDateStr);

    let hasItems = false;

    if (dayEvents.length > 0) {
        hasItems = true;
        dayEvents.forEach(ev => {
            const div = document.createElement('div');
            div.className = `event-card ${ev.done ? 'done' : ''}`;
            div.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${ev.done ? 'checked' : ''} onchange="triggerHaptic(); toggleEventDone('${ev.id}', ${ev.done});">
                <div class="event-dot" style="background:var(--color-${ev.priority});"></div>
                <div class="event-info">
                    <div class="event-time">
                        ${ev.time !== '--:--' ? ev.time : 'Solo Ubicación'}
                        <button class="btn-reminder" onclick="triggerHaptic(); setTaskTimePrompt('${ev.id}', '${ev.title.replace(/'/g, "\\'")}', '${ev.time}');">🔔 Recordar</button>
                    </div>
                    <div class="event-title-txt">${ev.title}</div>
                    ${ev.details ? `<div class="event-desc-txt">${ev.details}</div>` : ''}
                </div>
                <button class="event-del" onclick="triggerHaptic(); deleteEvent('${ev.id}');">✕</button>
            `;
            container.appendChild(div);
        });
    }

    const hasNoteContent = noteRecord && (noteRecord.html || noteRecord.text);
    const hasJournalContent = journalRecord && (journalRecord.text || journalRecord.mood);

    if (hasNoteContent || hasJournalContent) {
        hasItems = true;
        const noteDiv = document.createElement('div');
        noteDiv.className = 'event-card card-note';

        const moodEmoji = journalRecord?.mood ? journalRecord.mood : '📝';
        const moodData = moodPresets[moodEmoji] || { label: 'Diario' };
        const journalText = journalRecord?.text ? journalRecord.text : '';
        const noteText = noteRecord?.html || noteRecord?.text || '';

        let displayContent = '';
        if (journalText && noteText && journalText !== noteText) {
            displayContent = `<b>Estado: ${moodEmoji} ${moodData.label}</b><br>${journalText}<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:6px 0;">${noteText}`;
        } else {
            displayContent = `<b>Estado: ${moodEmoji} ${moodData.label}</b><br>${journalText || noteText}`;
        }

        noteDiv.innerHTML = `
            <div class="event-dot" style="background:var(--color-note);"></div>
            <div class="event-info">
                <div class="event-time">${moodEmoji} Diario & Reflexión del Día</div>
                <div class="event-title-txt" style="font-weight: normal; margin-top: 4px;">${displayContent}</div>
            </div>
            <button class="event-del" onclick="triggerHaptic(); clearTabNotes();">✕</button>
        `;
        container.appendChild(noteDiv);
    }

    if (!hasItems) {
        container.innerHTML = '<div class="empty-hint" style="color:var(--text-muted); font-style:italic; padding:10px 0;">Sin eventos, notas ni reflexiones para esta fecha.</div>';
    }
}

async function toggleEventDone(id, currentDone) {
    const newDone = !currentDone;
    try {
        await db.events.update(id, { done: newDone, updatedAt: Date.now() });
        if (fbDB && activeVaultId) {
            const ref = getVaultRef(`events/${id}/done`);
            if (ref) ref.set(newDone).catch(() => {});
        }
        await renderCalSelectedEvents();
        await updateDashboardProfileCards();
    } catch (e) {
        console.error("Error al marcar evento realizado:", e);
    }
}

async function saveEventFromCalModal() {
    const title = document.getElementById('eventTitle').value;
    const details = document.getElementById('eventDesc').value;
    const time = document.getElementById('eventTime').value;

    if (!title) return alert("Rellena el título del evento.");

    const eventId = 'ev_' + Date.now();
    const eventData = {
        id: eventId,
        date: selectedDateStr,
        title, details: details || '', time: time || '--:--', priority: selectedPriority, loc: 'none',
        notified: false, alarmFired: false, done: false, updatedAt: Date.now()
    };

    try {
        await db.transaction('rw', db.events, async () => {
            await db.events.put(eventData);
        });
        syncEventWithFirebase(eventData);

        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDesc').value = '';
        document.getElementById('eventTime').value = '';

        await initCalendar();
        await updateSummaryData();
        await updateDashboardProfileCards();
        await switchTab('calendar');
    } catch (e) {
        console.error("Error al guardar evento desde modal:", e);
    }
}

async function deleteEvent(id) {
    try {
        await db.events.delete(id);
        if (fbDB && activeVaultId) {
            const ref = getVaultRef(`events/${id}`);
            if (ref) ref.remove().catch(() => {});
        }
        await initCalendar();
        await renderCalSelectedEvents();
        await updateSummaryData();
        await updateDashboardProfileCards();
    } catch (e) {
        console.error("Error al borrar evento:", e);
    }
}

async function updateSoundType(val) {
    await db.settings.put({ key: 'sound_type', value: val });
}

function selectPriority(el) {
    document.querySelectorAll('.priority-chip').forEach(c => c.classList.remove('selected'));
    if (el) {
        el.classList.add('selected'); 
        selectedPriority = el.dataset.value;
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => { 
            swRegistration = reg;
            if (fbMessaging) {
                fbMessaging.useServiceWorker(reg);
            }
        }).catch(err => console.log("SW Registro:", err));
    }
}

function updatePermissionBanner() {
    const banner = document.getElementById('permission-banner');
    const notifStatus = document.getElementById('notif-status');
    if ('Notification' in window && Notification.permission !== 'granted') {
        if (banner) banner.style.display = 'block';
        if (notifStatus) notifStatus.innerText = 'Pendiente';
    } else {
        if (banner) banner.style.display = 'none';
        if (notifStatus) notifStatus.innerText = 'Activadas ✓';
    }
}

function requestPermissions() {
    unlockAudioContext();
    triggerHaptic();

    if ('Notification' in window) {
        Notification.requestPermission().then((perm) => {
            updatePermissionBanner();
            if (perm === 'granted' && fbMessaging && navigator.onLine) {
                fbMessaging.getToken({ vapidKey }).then(token => {
                    if (token) {
                        fbDB.ref('device_tokens/main_device').set(token);
                        if (activeVaultId) {
                            const ref = getVaultRef('device_token');
                            if (ref) ref.set(token);
                        }
                    }
                }).catch(err => console.error("Error FCM Token:", err));
            }
        });
    }
}

async function updateLocationUI() {
    const cocheraStatus = document.getElementById('cochera-status');
    const casaStatus = document.getElementById('casa-status');
    const puntoAStatus = document.getElementById('punto-a-status');
    const puntoBStatus = document.getElementById('punto-b-status');

    const locCentral = await db.locations.get('central');
    const locCasa = await db.locations.get('casa');
    const locPuntoA = await db.locations.get('punto_a');
    const locPuntoB = await db.locations.get('punto_b');

    if (locCentral && cocheraStatus) cocheraStatus.innerText = `Guardada (${locCentral.data.lat.toFixed(6)}, ${locCentral.data.lon.toFixed(6)})`;
    if (locCasa && casaStatus) casaStatus.innerText = `Guardada (${locCasa.data.lat.toFixed(6)}, ${locCasa.data.lon.toFixed(6)})`;
    if (locPuntoA && puntoAStatus) puntoAStatus.innerText = `Guardada (${locPuntoA.data.lat.toFixed(6)}, ${locPuntoA.data.lon.toFixed(6)})`;
    if (locPuntoB && puntoBStatus) puntoBStatus.innerText = `Guardada (${locPuntoB.data.lat.toFixed(6)}, ${locPuntoB.data.lon.toFixed(6)})`;
}

async function setTheme(themeName) {
    applyThemeUI(themeName);
    await db.settings.put({ key: 'app_theme', value: themeName });
}

async function playAlertSound() {
    unlockAudioContext();
    const soundTypeRec = await db.settings.get('sound_type');
    const soundType = soundTypeRec ? soundTypeRec.value : 'classic';

    try {
        const playNote = (delay, freq, dur, type = 'sine') => {
            const osc = globalAudioCtx.createOscillator();
            const gain = globalAudioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime + delay);
            gain.gain.setValueAtTime(0.4, globalAudioCtx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + delay + dur);
            osc.connect(gain);
            gain.connect(globalAudioCtx.destination);
            osc.start(globalAudioCtx.currentTime + delay);
            osc.stop(globalAudioCtx.currentTime + delay + dur);
        };

        if (soundType === 'harmonic') {
            playNote(0, 523.25, 0.25, 'triangle');
            playNote(0.2, 659.25, 0.3, 'triangle');
            playNote(0.4, 783.99, 0.4, 'triangle');
        } else if (soundType === 'double') {
            playNote(0, 900, 0.12, 'square');
            playNote(0.15, 900, 0.12, 'square');
            playNote(0.3, 900, 0.2, 'square');
        } else {
            playNote(0, 880, 0.15, 'sine');
            playNote(0.2, 880, 0.15, 'sine');
            playNote(0.4, 1174.66, 0.3, 'sine');
        }
    } catch (e) {}
}

function initSmartTracking() {
    if (!navigator.geolocation) return;
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const currentSpeedKmh = speed ? (speed * 3.6) : 30;
        const triggerDistanceKm = currentSpeedKmh > 25 ? 0.60 : 0.15;

        const eventsList = await db.events.toArray();
        const locCentral = await db.locations.get('central');
        const locCasa = await db.locations.get('casa');
        const locPuntoA = await db.locations.get('punto_a');
        const locPuntoB = await db.locations.get('punto_b');

        eventsList.forEach(async (ev) => {
            if (ev.loc === 'none' || ev.notified || ev.done) return;

            let locationsToCheck = [];
            if (ev.loc === 'custom_map' && ev.customCoords) {
                locationsToCheck = [{ name: 'Lugar Personalizado', lat: ev.customCoords.lat, lon: ev.customCoords.lon }];
            } else if (ev.loc === 'central' && locCentral) {
                locationsToCheck = [{ name: 'Tu Base / Central', lat: locCentral.data.lat, lon: locCentral.data.lon }];
            } else if (ev.loc === 'casa' && locCasa) {
                locationsToCheck = [{ name: 'Tu Casa', lat: locCasa.data.lat, lon: locCasa.data.lon }];
            } else if (ev.loc === 'punto_a' && locPuntoA) {
                locationsToCheck = [{ name: 'Mi Punto A', lat: locPuntoA.data.lat, lon: locPuntoA.data.lon }];
            } else if (ev.loc === 'punto_b' && locPuntoB) {
                locationsToCheck = [{ name: 'Mi Punto B', lat: locPuntoB.data.lat, lon: locPuntoB.data.lon }];
            } else {
                locationsToCheck = geofenceZones[ev.loc] || [];
            }

            locationsToCheck.forEach(async (place) => {
                if (ev.notified) return;
                const distanceKm = calculateDistance(latitude, longitude, place.lat, place.lon);
                const timeToArrivalMinutes = (distanceKm / currentSpeedKmh) * 60;

                if (timeToArrivalMinutes <= 5 || distanceKm < triggerDistanceKm) {
                    await playAlertSound();
                    triggerHaptic();
                    if (swRegistration && swRegistration.showNotification) {
                        swRegistration.showNotification('TaskMaster Proximidad', {
                            body: `Estás llegando a ${place.name}. Tarea: ${ev.title}`,
                            icon: './icon-192.png',
                            badge: './icon-192.png',
                            requireInteraction: true,
                            renotify: true,
                            tag: 'geo_' + ev.id
                        });
                    }
                    await db.events.update(ev.id, { notified: true, updatedAt: Date.now() });
                }
            });
        });
    }, null, options);
}

function initTimeAlarms() {
    checkTimeAlarms();
    setInterval(checkTimeAlarms, 10000);
}

async function checkTimeAlarms() {
    const now = new Date();
    const todayStr = getFormattedDateKey(now);
    const eventsList = await db.events.where('date').equals(todayStr).toArray();

    eventsList.forEach(async (ev) => {
        if (ev.alarmFired || ev.time === '--:--' || ev.done) return;
        const [evH, evM] = ev.time.split(':').map(Number);
        const eventMinutes = evH * 60 + evM;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (currentMinutes >= eventMinutes) {
            await playAlertSound();
            triggerHaptic();
            if (swRegistration && swRegistration.showNotification) {
                swRegistration.showNotification('TaskMaster Alerta', {
                    body: ev.title,
                    icon: './icon-192.png',
                    badge: './icon-192.png',
                    requireInteraction: true,
                    renotify: true,
                    tag: 'time_' + ev.id
                });
            }
            await db.events.update(ev.id, { alarmFired: true, updatedAt: Date.now() });
        }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
