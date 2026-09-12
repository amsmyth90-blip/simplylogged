import { createVault, decryptCredential, encryptCredential, unlockVault } from "./crypto.ts";
import {
  parseCredential,
  type EncryptedVaultEntry,
  type PasswordVaultSnapshot,
  type VaultCredential,
  type VaultSetup,
} from "./model.ts";

export type VaultTransport = {
  load: () => Promise<PasswordVaultSnapshot>;
  setup: (value: VaultSetup) => Promise<PasswordVaultSnapshot>;
  save: (value: EncryptedVaultEntry, expected: number) => Promise<PasswordVaultSnapshot>;
  remove: (id: string, expected: number) => Promise<PasswordVaultSnapshot>;
};
type View = {
  snapshot: PasswordVaultSnapshot | null;
  credentials: VaultCredential[];
  unlocked: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  lockVersion: number;
};

// One lifecycle boundary for both clients. Every async completion must belong to
// the current unlocked generation; locking invalidates work already in flight.
export class VaultSession {
  private key: CryptoKey | null = null;
  private generation = 0;
  private pending = false;
  private listeners = new Set<() => void>();
  private view: View = {
    snapshot: null,
    credentials: [],
    unlocked: false,
    loading: true,
    busy: false,
    error: null,
    lockVersion: 0,
  };

  private accountId: string;
  private transport: VaultTransport;
  constructor(accountId: string, transport: VaultTransport) {
    this.accountId = accountId;
    this.transport = transport;
  }

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(change: Partial<View>) {
    this.view = { ...this.view, ...change };
    this.listeners.forEach((listener) => listener());
  }
  clearError = () => this.update({ error: null });
  lock = () => {
    this.generation += 1;
    this.key = null;
    this.update({ credentials: [], unlocked: false, error: null, lockVersion: this.view.lockVersion + 1 });
  };
  private current(generation: number) {
    if (this.generation !== generation) throw new Error("The vault was locked. Unlock it to continue.");
  }
  private async run(work: (generation: number) => Promise<void>) {
    if (this.pending) throw new Error("Please wait for the current vault operation.");
    this.pending = true;
    const generation = this.generation;
    this.update({ busy: true, error: null });
    try {
      await work(generation);
    } catch (error) {
      if (generation === this.generation)
        this.update({
          error: error instanceof Error ? error.message : "Password Vault could not complete that action.",
        });
      throw error;
    } finally {
      this.pending = false;
      this.update({ busy: false, loading: false });
    }
  }
  load = async () => {
    await this.run(async (generation) => {
      const snapshot = await this.transport.load();
      this.current(generation);
      this.update({ snapshot });
    });
  };
  private async publish(snapshot: PasswordVaultSnapshot, key: CryptoKey, generation: number) {
    const credentials = await Promise.all(
      snapshot.entries.map((entry) => decryptCredential(this.accountId, entry, key)),
    );
    this.current(generation);
    this.key = key;
    this.update({
      snapshot,
      unlocked: true,
      credentials: credentials.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  open = async (passphrase: string) => {
    await this.run(async (generation) => {
      const snapshot = await this.transport.load();
      this.current(generation);
      this.update({ snapshot });
      if (!snapshot.setup) throw new Error("Create a vault for this account first.");
      const key = await unlockVault(this.accountId, passphrase, snapshot.setup);
      this.current(generation);
      await this.publish(snapshot, key, generation);
    });
  };
  create = async (passphrase: string) => {
    await this.run(async (generation) => {
      const created = await createVault(this.accountId, passphrase);
      this.current(generation);
      const snapshot = await this.transport.setup(created.setup);
      this.current(generation);
      await this.publish(snapshot, created.masterKey, generation);
    });
  };
  save = async (draft: Omit<VaultCredential, "createdAt" | "updatedAt">) => {
    const key = this.key;
    if (!key || !this.view.unlocked) throw new Error("Unlock your vault first.");
    await this.run(async (generation) => {
      const previous = this.view.snapshot?.entries.find((entry) => entry.id === draft.id);
      const existing = this.view.credentials.find((entry) => entry.id === draft.id);
      const now = new Date().toISOString();
      const value = parseCredential({ ...draft, createdAt: existing?.createdAt ?? now, updatedAt: now });
      if (!value) throw new Error("Check the account name and field lengths before saving.");
      const expected = previous?.revision ?? 0;
      const encrypted = await encryptCredential(this.accountId, value, key, expected + 1);
      this.current(generation);
      const snapshot = await this.transport.save(encrypted, expected);
      this.current(generation);
      await this.publish(snapshot, key, generation);
    });
  };
  remove = async (id: string) => {
    const key = this.key;
    if (!key || !this.view.unlocked) throw new Error("Unlock your vault first.");
    await this.run(async (generation) => {
      const previous = this.view.snapshot?.entries.find((entry) => entry.id === id);
      if (!previous) throw new Error("Refresh the vault before deleting this account.");
      const snapshot = await this.transport.remove(id, previous.revision);
      this.current(generation);
      await this.publish(snapshot, key, generation);
    });
  };
}
