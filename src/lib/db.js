import { openDB } from "idb";

const DB_NAME = "namaz-tracker-db";
const DB_VERSION = 5;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("prayer_logs")) {
            const store = db.createObjectStore("prayer_logs", { keyPath: "id" });
            store.createIndex("byDate", "date");
            store.createIndex("byPrayer", "prayer");
          }
          if (!db.objectStoreNames.contains("qazo_logs")) {
            const store = db.createObjectStore("qazo_logs", { keyPath: "id" });
            store.createIndex("byDate", "date");
            store.createIndex("byPrayer", "prayer");
          }
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "key" });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("user_profile")) {
            db.createObjectStore("user_profile", { keyPath: "key" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("qazo_balance")) {
            db.createObjectStore("qazo_balance", { keyPath: "key" });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("qazo_plan")) {
            db.createObjectStore("qazo_plan", { keyPath: "key" });
          }
        }
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("prayer_times")) {
            const store = db.createObjectStore("prayer_times", { keyPath: "key" });
            store.createIndex("byRegion", "region");
            store.createIndex("byDate", "date");
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function addItem(store, value) {
  const db = await getDB();
  return db.add(store, value);
}

export async function putItem(store, value) {
  const db = await getDB();
  return db.put(store, value);
}

export async function getItem(store, key) {
  const db = await getDB();
  return db.get(store, key);
}

export async function getAll(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function deleteItem(store, key) {
  const db = await getDB();
  return db.delete(store, key);
}

export async function getByIndex(store, index, value) {
  const db = await getDB();
  return db.getAllFromIndex(store, index, value);
}
