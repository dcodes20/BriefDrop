import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const today = new Date();
const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const backendStatus = $('#backend-status');
const accountDialog = $('#account-dialog');
const practiceDialog = $('#practice-dialog');
const briefDialog = $('#brief-dialog');
const accountFeedback = $('#account-feedback');
const practiceFeedback = $('#practice-feedback');
const briefFeedback = $('#brief-feedback');
const savedBriefs = new Map();
let supabase;
let session;
let selectedBrief;
let signingUp = false;
let backendReady = false;

function message(element, text, isError = false) {
  element.textContent = text;
  element.hidden = !text;
  element.classList.toggle('is-error', isError);
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

function showAccount(messageText = '') {
  if (!backendReady) {
    $('#account-title').textContent = 'Connect your practice space';
    $('#account-form').hidden = true;
    $('#account-switch').hidden = true;
    $('#account-copy').textContent = 'Connect your Supabase project to create an account.';
    message(accountFeedback, messageText || 'Follow the Supabase setup steps in README.md, then reload this page.', true);
  } else {
    message(accountFeedback, messageText);
  }
  openDialog(accountDialog);
  if (backendReady) $('#account-email').focus({ preventScroll: true });
}

function renderSignedOutDays() {
  $$('.day__mark').forEach((button) => {
    button.dataset.journalDate = '';
    button.setAttribute('aria-pressed', 'false');
    button.classList.remove('day__mark--on');
    button.classList.add('day__mark--off');
  });
  $('[data-count]').textContent = '0';
  $('.phone__streak span:last-child').textContent = '0-day streak';
  $('.example__summary span').textContent = 'Sign in to track your practice days.';
}

function renderAuth() {
  const signedIn = Boolean(session?.user);
  const accountButton = $('#account-open');
  accountButton.textContent = signedIn ? 'My space' : 'Sign up';
  $('#account-copy').textContent = signedIn
    ? `Signed in as ${session.user.email}. Your saved work is private to your account.`
    : 'Sign in to save briefs and keep your reflections private.';
  $('#account-form').hidden = signedIn;
  $('#account-reset').hidden = signedIn;
  $('#account-switch').hidden = signedIn;
  $('#account-signout').hidden = !signedIn;
  $('#account-feedback').hidden = !signedIn;
  if (!signedIn) renderSignedOutDays();
}

function setSignupMode(enabled) {
  signingUp = enabled;
  $('#account-title').textContent = enabled ? 'Create your account' : 'Welcome back';
  $('#account-copy').textContent = enabled
    ? 'Create a private practice space to save briefs and reflect on your work.'
    : 'Sign in to save briefs and keep your reflections private.';
  $('#account-submit').textContent = enabled ? 'Create account' : 'Sign in';
  $('#account-switch').textContent = enabled ? 'Already have an account? Sign in' : 'New here? Create an account';
  $('#account-password').autocomplete = enabled ? 'new-password' : 'current-password';
  message(accountFeedback, '');
}

function setBriefSavedState() {
  const current = selectedBrief ? savedBriefs.get(selectedBrief.id) : null;
  const saveButton = $('#save-brief');
  const completeButton = $('#complete-brief');
  saveButton.textContent = current ? 'Saved to your space' : 'Save this brief';
  saveButton.disabled = Boolean(current);
  completeButton.hidden = !current;
  completeButton.disabled = current?.status === 'completed';
  completeButton.textContent = current?.status === 'completed' ? 'Completed' : 'Mark complete';
  message(briefFeedback, '');
}

function cardDescription(brief) {
  const card = $(`[data-brief-slug="${CSS.escape(brief.slug)}"]`);
  if (!card) return;
  card.dataset.briefId = brief.id;
  card.dataset.briefDescription = brief.description;
  $('.card__title', card).textContent = brief.title;
  const chip = $('.chip', card);
  chip.lastChild.textContent = brief.category;
  const summary = $('.card__text', card);
  const moreButton = $('.card__more', summary);
  summary.firstChild.textContent = `${brief.summary} `;
  if (moreButton) moreButton.hidden = true;
}

async function loadBriefs() {
  const { data, error } = await supabase
    .from('briefs')
    .select('id,slug,title,category,summary,description,sort_order')
    .order('sort_order');
  if (error) throw error;
  data.forEach(cardDescription);
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function renderJournalDates(entries) {
  const start = startOfWeek(today);
  const practicedDates = new Set(entries.map((entry) => entry.entry_date));
  const dayButtons = $$('.day__mark');

  dayButtons.forEach((button, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const practiced = practicedDates.has(key);
    button.dataset.journalDate = key;
    button.disabled = date > today;
    button.setAttribute('aria-label', date.toLocaleDateString('en', {
      weekday: 'long', month: 'long', day: 'numeric',
    }));
    button.setAttribute('aria-pressed', String(practiced));
    button.classList.toggle('day__mark--on', practiced);
    button.classList.toggle('day__mark--off', !practiced);
    $('.day__label', button.parentElement).textContent = date.toLocaleDateString('en', { weekday: 'short' })[0];
  });

  const activeStreak = new Set(practicedDates);
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!activeStreak.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeStreak.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  $('[data-count]').textContent = String(streak);
  $('.phone__streak span:last-child').textContent = `${streak}-day streak`;
  $('.example__summary span').textContent = 'Your private practice journal · tap a day';
}

async function loadJournal() {
  const historyStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', session.user.id)
    .gte('entry_date', dateKey(historyStart))
    .lte('entry_date', dateKey(today));
  if (error) throw error;
  renderJournalDates(data);
}

async function loadSavedBriefs() {
  const { data, error } = await supabase
    .from('saved_briefs')
    .select('id,brief_id,status,reflection,created_at,briefs(id,slug,title,category,summary)')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  savedBriefs.clear();
  data.forEach((item) => savedBriefs.set(item.brief_id, item));
  if (selectedBrief) setBriefSavedState();
  renderPracticeList(data);
}

function addField(labelText, value, briefId) {
  const label = document.createElement('label');
  label.className = 'practice-reflection';
  label.textContent = labelText;
  const textarea = document.createElement('textarea');
  textarea.value = value || '';
  textarea.maxLength = 5000;
  textarea.rows = 3;
  textarea.dataset.reflection = briefId;
  textarea.setAttribute('aria-label', `Reflection for ${labelText}`);
  label.append(textarea);
  return label;
}

function renderPracticeList(items) {
  const list = $('#practice-list');
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'practice-empty';
    empty.textContent = 'No saved briefs yet. Open a brief and save it here to get started.';
    list.append(empty);
    return;
  }

  items.forEach((item) => {
    const brief = item.briefs;
    const card = document.createElement('article');
    card.className = 'practice-card';
    const title = document.createElement('h3');
    title.textContent = brief.title;
    const category = document.createElement('p');
    category.className = 'practice-category';
    category.textContent = brief.category;
    const status = document.createElement('select');
    status.dataset.status = item.id;
    status.setAttribute('aria-label', `Status for ${brief.title}`);
    [
      ['saved', 'Saved'],
      ['in_progress', 'In progress'],
      ['completed', 'Completed'],
    ].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      status.append(option);
    });
    status.value = item.status;
    card.append(title, category, status, addField(brief.title, item.reflection, brief.id));

    const actions = document.createElement('div');
    actions.className = 'practice-card__actions';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn btn--primary btn--sm';
    save.dataset.saveReflection = item.id;
    save.textContent = 'Save reflection';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--ghost btn--sm';
    remove.dataset.removeBrief = item.id;
    remove.textContent = 'Remove';
    actions.append(save, remove);
    card.append(actions);
    list.append(card);
  });
}

async function refreshPrivateData() {
  if (!session?.user) return;
  const results = await Promise.all([loadSavedBriefs(), loadJournal()]);
  return results;
}

function errorText(error) {
  return error?.message || 'Something went wrong. Please try again.';
}

async function saveBrief() {
  if (!backendReady) {
    message(briefFeedback, 'Connect Supabase first. See the setup steps in README.md.', true);
    return;
  }
  if (!session?.user) {
    showAccount('Sign in to save briefs and keep your work private.');
    return;
  }
  if (!selectedBrief) return;
  const button = $('#save-brief');
  button.disabled = true;
  message(briefFeedback, 'Saving brief…');
  const { data, error } = await supabase
    .from('saved_briefs')
    .upsert(
      { user_id: session.user.id, brief_id: selectedBrief.id },
      { onConflict: 'user_id,brief_id', ignoreDuplicates: true },
    )
    .select('id,brief_id,status,reflection,created_at')
    .maybeSingle();
  if (error) {
    button.disabled = false;
    message(briefFeedback, errorText(error), true);
    return;
  }
  if (data) savedBriefs.set(data.brief_id, data);
  await loadSavedBriefs();
  message(briefFeedback, 'Saved to your private practice space.');
}

async function completeBrief() {
  if (!session?.user || !selectedBrief) return;
  const { error } = await supabase
    .from('saved_briefs')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('brief_id', selectedBrief.id);
  if (error) {
    message(briefFeedback, errorText(error), true);
    return;
  }
  await loadSavedBriefs();
  message(briefFeedback, 'Nice work. This brief is marked complete.');
}

async function saveJournalDay(button) {
  if (!session?.user) {
    const wasPracticed = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!wasPracticed));
    button.classList.toggle('day__mark--on', !wasPracticed);
    button.classList.toggle('day__mark--off', wasPracticed);
    showAccount('Sign in to keep your journal private and synced.');
    return;
  }

  const date = button.dataset.journalDate;
  const practiced = button.getAttribute('aria-pressed') === 'true';
  const result = practiced
    ? await supabase.from('journal_entries').upsert(
      { user_id: session.user.id, entry_date: date },
      { onConflict: 'user_id,entry_date' },
    )
    : await supabase.from('journal_entries')
      .delete()
      .eq('user_id', session.user.id)
      .eq('entry_date', date);
  if (result.error) {
    message(backendStatus, errorText(result.error), true);
    await loadJournal();
    return;
  }
  await loadJournal();
}

async function saveReflection(savedId) {
  const card = $(`[data-save-reflection="${CSS.escape(savedId)}"]`).closest('.practice-card');
  const textarea = $('textarea', card);
  const { error } = await supabase
    .from('saved_briefs')
    .update({ reflection: textarea.value.trim(), updated_at: new Date().toISOString() })
    .eq('id', savedId)
    .eq('user_id', session.user.id);
  if (error) {
    message(practiceFeedback, errorText(error), true);
    return;
  }
  await loadSavedBriefs();
  message(practiceFeedback, 'Reflection saved privately.');
}

async function updateSavedStatus(savedId, status) {
  const { error } = await supabase
    .from('saved_briefs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', savedId)
    .eq('user_id', session.user.id);
  if (error) {
    message(practiceFeedback, errorText(error), true);
    return;
  }
  await loadSavedBriefs();
  message(practiceFeedback, 'Brief status updated.');
}

async function removeSavedBrief(savedId) {
  const { error } = await supabase
    .from('saved_briefs')
    .delete()
    .eq('id', savedId)
    .eq('user_id', session.user.id);
  if (error) {
    message(practiceFeedback, errorText(error), true);
    return;
  }
  await loadSavedBriefs();
  message(practiceFeedback, 'Brief removed from your practice space.');
}

async function openPractice() {
  if (!session?.user) {
    showAccount('Sign in to open your private practice space.');
    return;
  }
  message(practiceFeedback, 'Loading your saved work…');
  openDialog(practiceDialog);
  try {
    await loadSavedBriefs();
    message(practiceFeedback, '');
  } catch (error) {
    message(practiceFeedback, errorText(error), true);
  }
}

function bindEvents() {
  const accountButton = $('#account-open');
  accountButton.addEventListener('click', (event) => {
    if (!session?.user) return;
    event.preventDefault();
    openPractice();
  });

  $('#account-switch').addEventListener('click', () => setSignupMode(!signingUp));

  $('#account-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!backendReady) return;
    const email = $('#account-email').value.trim();
    const password = $('#account-password').value;
    const submit = $('#account-submit');
    submit.disabled = true;
    message(accountFeedback, signingUp ? 'Creating your account…' : 'Signing in…');

    try {
      const result = signingUp
        ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: new URL('signin.html', window.location.href).href },
        })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      if (signingUp && !result.data.session) {
        message(accountFeedback, 'Check your email for a confirmation link, then sign in.');
      } else {
        message(accountFeedback, signingUp ? 'Account created.' : 'Signed in.');
        if (result.data.session) accountDialog.close();
      }
    } catch (error) {
      message(accountFeedback, errorText(error), true);
    } finally {
      submit.disabled = false;
    }
  });

  $('#account-reset').addEventListener('click', async () => {
    if (!backendReady) {
      message(accountFeedback, 'Password reset is unavailable until Supabase is connected.', true);
      return;
    }
    const email = $('#account-email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message(accountFeedback, 'Enter a valid email address to request a password reset.', true);
      $('#account-email').focus();
      return;
    }

    const resetButton = $('#account-reset');
    if (resetButton.disabled) return;
    resetButton.disabled = true;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('signin.html?mode=recovery', window.location.href).href,
      });
      if (error) throw error;
      message(accountFeedback, 'If an account exists for that email, a password-reset link will arrive shortly.');
    } catch (error) {
      message(accountFeedback, errorText(error), true);
    } finally {
      resetButton.disabled = false;
    }
  });

  $('#account-signout').addEventListener('click', async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      accountDialog.close();
      message(backendStatus, 'You have signed out.');
    } catch (error) {
      message(accountFeedback, errorText(error), true);
    }
  });

  $$('[data-open-practice]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openPractice();
    });
  });

  $$('[data-tile="save"]').forEach((tile) => {
    tile.addEventListener('click', () => {
      tile.setAttribute('aria-pressed', String(Boolean(session?.user && savedBriefs.size)));
      openPractice();
    });
  });

  $$('[data-tile="dice"]').forEach((tile) => {
    tile.addEventListener('click', () => {
      if (!backendReady) return;
      const cards = $$('[data-brief-id]');
      if (!cards.length) return;
      const card = cards[Math.floor(Math.random() * cards.length)];
      $('.card__details > [data-open-brief]', card)?.click();
    });
  });

  $$('.day__mark').forEach((button) => {
    button.addEventListener('click', () => saveJournalDay(button));
  });

  $('#save-brief').addEventListener('click', saveBrief);
  $('#complete-brief').addEventListener('click', completeBrief);

  $('#practice-list').addEventListener('click', async (event) => {
    const target = event.target;
    if (target.matches('[data-save-reflection]')) await saveReflection(target.dataset.saveReflection);
    if (target.matches('[data-remove-brief]')) await removeSavedBrief(target.dataset.removeBrief);
  });
  $('#practice-list').addEventListener('change', async (event) => {
    const target = event.target;
    if (target.matches('[data-status]')) await updateSavedStatus(target.dataset.status, target.value);
  });

  briefDialog.addEventListener('click', (event) => {
    const card = event.target.closest('[data-brief-id]');
    if (card && event.target.closest('[data-open-brief]')) {
      selectedBrief = {
        id: card.dataset.briefId,
        slug: card.dataset.briefSlug,
        title: $('.card__title', card).textContent,
      };
      setBriefSavedState();
    }
  });
}

async function initialize() {
  bindEvents();
  renderAuth();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    message(
      backendStatus,
      'Supabase is not connected yet. Follow the setup steps in README.md to add your project URL and public anon key.',
    );
    return;
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      renderAuth();
      if (session?.user) {
        refreshPrivateData().catch((error) => message(backendStatus, errorText(error), true));
      } else {
        savedBriefs.clear();
        renderPracticeList([]);
        if (selectedBrief) setBriefSavedState();
      }
    });
    backendReady = true;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    session = data.session;
    renderAuth();
    await loadBriefs();
    await refreshPrivateData();
    message(backendStatus, '');
  } catch (error) {
    message(backendStatus, `Supabase could not be reached: ${errorText(error)}`, true);
  }
}

initialize();
