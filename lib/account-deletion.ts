import type { SupabaseClient } from "@supabase/supabase-js";

const DOCUMENT_BUCKET = "diarydock-documents";

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AccountDeletionResult = {
  userId: string;
  deletedStorageObjects: number;
  deletedAuthUser: boolean;
};

function isFolder(item: StorageListItem) {
  return !item.id && item.metadata === null;
}

async function collectStoragePaths(
  client: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });

    if (error) {
      throw new Error(error.message);
    }

    const items = (data ?? []) as StorageListItem[];
    if (!items.length) {
      break;
    }

    for (const item of items) {
      const path = `${prefix}/${item.name}`.replace(/^\/+/, "");
      if (isFolder(item)) {
        paths.push(...await collectStoragePaths(client, bucket, path));
      } else {
        paths.push(path);
      }
    }

    if (items.length < 1000) {
      break;
    }
    offset += items.length;
  }

  return paths;
}

async function removeStoragePrefix(client: SupabaseClient, bucket: string, userId: string) {
  const paths = await collectStoragePaths(client, bucket, userId);

  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    const { error } = await client.storage.from(bucket).remove(chunk);
    if (error) {
      throw new Error(error.message);
    }
  }

  return paths.length;
}

async function deleteWhere(client: SupabaseClient, table: string, column: string, value: string) {
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

function isMissingOptionalTableError(message: string) {
  return message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("schema cache");
}

async function deleteWhereIfTableExists(client: SupabaseClient, table: string, column: string, value: string) {
  const { error } = await client.from(table).delete().eq(column, value);
  if (error && !isMissingOptionalTableError(error.message)) {
    throw new Error(`${table}: ${error.message}`);
  }
}

export async function processAccountDeletion(
  client: SupabaseClient,
  requestId: string,
): Promise<AccountDeletionResult> {
  const { data: request, error: requestError } = await client
    .from("account_deletion_requests")
    .select("id,user_id,status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? "Deletion request not found.");
  }

  const userId = String(request.user_id);
  if (!userId) {
    throw new Error("Deletion request does not include a user id.");
  }

  // Lock, re-check, and remove only sole-owner households in one database
  // transaction before any personal file or row is changed.
  const { error: householdPreparationError } = await client.rpc("prepare_account_deletion", {
    input_user_id: userId,
  });
  if (householdPreparationError) {
    throw new Error(householdPreparationError.message);
  }

  const { error: processingError } = await client
    .from("account_deletion_requests")
    .update({ status: "processing" })
    .eq("id", requestId);

  if (processingError) {
    throw new Error(processingError.message);
  }

  const deletedStorageObjects = await removeStoragePrefix(client, DOCUMENT_BUCKET, userId);

  await deleteWhereIfTableExists(client, "document_permissions", "owner_id", userId);
  await deleteWhere(client, "documents", "user_id", userId);
  await deleteWhere(client, "reminders", "user_id", userId);
  await deleteWhereIfTableExists(client, "household_members", "user_id", userId);
  await deleteWhereIfTableExists(client, "family_invites", "user_id", userId);
  await deleteWhere(client, "app_state", "id", userId);

  const { error: inviteError } = await client
    .from("household_invites")
    .delete()
    .or(`invited_by.eq.${userId},accepted_by.eq.${userId}`);

  if (inviteError && !isMissingOptionalTableError(inviteError.message)) {
    throw new Error(`household_invites: ${inviteError.message}`);
  }

  const { error: authError } = await client.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(authError.message);
  }

  return {
    userId,
    deletedStorageObjects,
    deletedAuthUser: true
  };
}
