import * as functions from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import admin from 'firebase-admin';

// Ensure admin initialized once (in case this file is imported standalone)
try { admin.app(); } catch { admin.initializeApp(); }

// HTTPS function: send Expo push notifications for a new article
export const sendExpoArticlePush = functions.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'POST only' });
    return;
  }

  try {
    const { articleId, title, category } = req.body || {};
    if (!title) {
      res.status(400).send({ error: 'Missing title' });
      return;
    }

    const tokensSnap = await admin.firestore().collection('expoPushTokens').get();
    const tokens: string[] = [];
    tokensSnap.forEach(d => { const t = d.get('token'); if (t) tokens.push(t); });
    if (tokens.length === 0) {
      res.send({ message: 'No Expo tokens stored yet', sent: 0 });
      return;
    }

    // Batch (Expo recommends <= 100 per request)
    const batches: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      batches.push(tokens.slice(i, i + 100));
    }

    const results: any[] = [];
    for (const batch of batches) {
      const messages = batch.map(token => ({
        to: token,
        title: title,
        body: category || '',
        data: { articleId: articleId || '', category: category || 'news', type: 'new_article' },
        sound: 'default'
      }));
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages)
      });
      const json = await resp.json();
      results.push(json);
    }

    res.send({ sent: tokens.length, batches: batches.length, results });
  } catch (e: any) {
    console.error('sendExpoArticlePush error', e);
    res.status(500).send({ error: e.message || 'Internal error' });
  }
});
