// 簡易ファイルベースストレージ（Vercel対応）
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = '/tmp';
const SUBSCRIPTIONS_FILE = path.join(STORAGE_DIR, 'subscriptions.json');

// 購読情報を保存
export function saveSubscriptions(subscriptions) {
  try {
    const data = JSON.stringify(Array.from(subscriptions.entries()), null, 2);
    fs.writeFileSync(SUBSCRIPTIONS_FILE, data);
    console.log('✅ Subscriptions saved to file');
  } catch (error) {
    console.error('❌ Failed to save subscriptions:', error);
  }
}

// 購読情報を読み込み
export function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
      const entries = JSON.parse(data);
      const subscriptions = new Map(entries);
      console.log(`📂 Loaded ${subscriptions.size} subscriptions from file`);
      return subscriptions;
    }
  } catch (error) {
    console.error('❌ Failed to load subscriptions:', error);
  }
  console.log('📂 No existing subscriptions file, starting fresh');
  return new Map();
}

// 環境変数を使ったより永続的なストレージ（Vercel KV代替）
const STORAGE_KEY_PREFIX = 'STUDYQUEST_SUB_';

export function saveSubscriptionToEnv(userKey, userData) {
  // 実際にはVercel KVやPlanetScaleなどの外部ストレージを使用すべき
  // ここでは一時的にローカルファイルを使用
  try {
    const subscriptions = loadSubscriptions();
    subscriptions.set(userKey, userData);
    saveSubscriptions(subscriptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to save subscription:', error);
    return false;
  }
}

export function getSubscriptionFromEnv(userKey) {
  try {
    const subscriptions = loadSubscriptions();
    return subscriptions.get(userKey) || null;
  } catch (error) {
    console.error('❌ Failed to get subscription:', error);
    return null;
  }
}

export function getAllSubscriptions() {
  try {
    return loadSubscriptions();
  } catch (error) {
    console.error('❌ Failed to get all subscriptions:', error);
    return new Map();
  }
}

