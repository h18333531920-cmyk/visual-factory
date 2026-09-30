/** Local-only prototype persistence. This module never talks to a server. */
import {isolatedAccountId} from './site-session.js';
const isolatedId=isolatedAccountId();
const DATABASE = 'category-icon-prototype'+(isolatedId?'-account-'+isolatedId:'');
const DATABASE_VERSION = 1;
const STORE = 'snapshots';
const STATE_KEY = 'current';

export type StorageFailureCode =
  | 'unsupported'
  | 'blocked'
  | 'quota'
  | 'unavailable'
  | 'serialization'
  | 'failed';

export class PrototypeStorageError extends Error {
  readonly code: StorageFailureCode;
  readonly cause: unknown;

  constructor(code: StorageFailureCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'PrototypeStorageError';
    this.code = code;
    this.cause = cause;
  }
}

function storageError(cause: unknown): PrototypeStorageError {
  if (cause instanceof PrototypeStorageError) return cause;
  const name = cause && typeof cause === 'object' && 'name' in cause
    ? String(cause.name)
    : '';
  if (name === 'QuotaExceededError') {
    return new PrototypeStorageError('quota', 'Local storage quota was exceeded.', cause);
  }
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return new PrototypeStorageError('unavailable', 'Browser settings prevent local saving.', cause);
  }
  if (name === 'DataCloneError') {
    return new PrototypeStorageError('serialization', 'The project contains data that cannot be saved.', cause);
  }
  return new PrototypeStorageError('failed', 'Local project storage failed.', cause);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let settled = false;
    try {
      if (typeof indexedDB === 'undefined') {
        throw new PrototypeStorageError('unsupported', 'This browser does not support IndexedDB.');
      }
      request = indexedDB.open(DATABASE, DATABASE_VERSION);
    } catch (error) {
      reject(storageError(error));
      return;
    }

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(storageError(error));
    };

    request.onupgradeneeded = () => {
      if (settled) {
        request.transaction?.abort();
        return;
      }
      try {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      } catch (error) {
        request.transaction?.abort();
        fail(error);
      }
    };
    request.onblocked = () => fail(new PrototypeStorageError(
      'blocked',
      'Another open tab is preventing this project database from opening.',
    ));
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction | undefined;
    let result: T;
    let requestFailure: unknown;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(storageError(error));
    };

    try {
      transaction = database.transaction(STORE, mode);
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        database.close();
        resolve(result);
      };
      transaction.onerror = () => {
        // Request errors bubble here; wait for abort so no write is reported as saved.
        requestFailure ??= transaction?.error;
      };
      transaction.onabort = () => fail(requestFailure ?? transaction?.error);
      const request = operation(transaction.objectStore(STORE));
      request.onsuccess = () => { result = request.result as T; };
      request.onerror = () => { requestFailure = request.error; };
    } catch (error) {
      // DataCloneError can be thrown before an IDB request exists.
      try { transaction?.abort(); } catch { /* A finished transaction cannot be aborted. */ }
      fail(error);
    }
  });
}

export async function readState<T>(): Promise<T | undefined> {
  return transact<T | undefined>('readonly', (store) => store.get(STATE_KEY));
}

export async function writeState<T>(value: T): Promise<void> {
  await transact<IDBValidKey>('readwrite', (store) => store.put(value, STATE_KEY));
}

/** Removes only this prototype's snapshot, never other applications' storage. */
export async function clearState(): Promise<void> {
  await transact<undefined>('readwrite', (store) => store.delete(STATE_KEY));
}

/** Separate receipt keys preserve the existing current project snapshot. */
export async function readReceipt<T>(key:string):Promise<T|undefined>{
  return transact<T|undefined>('readonly',store=>store.get(key));
}
export async function writeReceipt<T>(key:string,value:T):Promise<void>{
  await transact<IDBValidKey>('readwrite',store=>store.put(value,key));
}
export async function claimReceipt<T>(key:string,value:T):Promise<boolean>{
  try{await transact<IDBValidKey>('readwrite',store=>store.add(value,key));return true;}
  catch(error){if(error instanceof PrototypeStorageError&&error.cause&&typeof error.cause==='object'&&'name' in error.cause&&error.cause.name==='ConstraintError')return false;throw error;}
}
