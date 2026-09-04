package com.diarydock.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "DiaryDockShareImport")
public class DiaryDockShareImportPlugin extends Plugin {
    private static final String PREFS_NAME = "diarydock_share_import";
    private static final String PREF_PENDING_FILES = "pending_files";

    @Override
    public void load() {
        handleShareIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        handleShareIntent(intent);
    }

    @PluginMethod
    public void getPendingImport(PluginCall call) {
        JSObject result = new JSObject();
        JSArray items = new JSArray();
        try {
            JSONArray pending = pendingFiles();
            if (!isValidPendingSet(pending)) throw new IllegalStateException("Invalid pending import.");
            for (int index = 0; index < pending.length(); index += 1) {
                JSONObject metadata = pending.getJSONObject(index);
                File file = new File(metadata.getString("path"));

                JSObject item = new JSObject();
                item.put("id", metadata.getString("id"));
                item.put("name", metadata.getString("name"));
                item.put("mimeType", metadata.getString("mimeType"));
                item.put("size", file.length());
                item.put("base64", encodeFile(file));
                items.put(item);
            }
            result.put("files", items);
            result.put("source", "android-share-sheet");
            result.put("receivedAt", String.valueOf(System.currentTimeMillis()));
            call.resolve(result);
        } catch (Exception exception) {
            clearPendingFiles();
            call.reject("Unable to read the shared files.");
        }
    }

    @PluginMethod
    public void hasPendingImport(PluginCall call) {
        try {
            JSONArray pending = pendingFiles();
            call.resolve(new JSObject().put("count", isValidPendingSet(pending) ? pending.length() : 0));
        } catch (Exception exception) {
            clearPendingFiles();
            call.resolve(new JSObject().put("count", 0));
        }
    }

    @PluginMethod
    public void clearPendingImport(PluginCall call) {
        clearPendingFiles();
        call.resolve();
    }

    private void handleShareIntent(Intent intent) {
        if (!isShareIntent(intent)) return;
        List<Uri> uris = new ShareImportFiles(getContext()).collectUris(intent);
        if (uris.isEmpty()) return;
        if (uris.size() > ShareImportFiles.MAX_FILES) {
            clearPendingFiles();
            clearIncomingIntent(intent);
            return;
        }

        try {
            clearPendingFiles();
            JSONArray pending = new ShareImportFiles(getContext()).copyToPrivateStorage(uris);
            if (pending.length() == 0) return;
            getPrefs().edit().putString(PREF_PENDING_FILES, pending.toString()).apply();
            JSObject result = new JSObject();
            result.put("count", pending.length());
            notifyListeners("shareImportReceived", result, true);
        } catch (Exception ignored) {
            clearPendingFiles();
        } finally {
            clearIncomingIntent(intent);
        }
    }

    private boolean isShareIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) return false;
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) return true;
        Uri data = intent.getData();
        return Intent.ACTION_VIEW.equals(action)
            && data != null
            && "content".equalsIgnoreCase(data.getScheme());
    }

    private void clearIncomingIntent(Intent intent) {
        intent.setAction(null);
        intent.setData(null);
        intent.setClipData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
    }

    private String encodeFile(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            int totalBytes = 0;
            while ((read = input.read(buffer)) != -1) {
                totalBytes += read;
                if (totalBytes > ShareImportFiles.MAX_FILE_BYTES) {
                    throw new IllegalStateException("Shared file exceeds the safe limit.");
                }
                output.write(buffer, 0, read);
            }
            return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        }
    }

    private void clearPendingFiles() {
        try {
            ShareImportFiles.clear(pendingFiles());
        } catch (JSONException ignored) {
            // A malformed private preference has no trusted files to retain.
        }
        getPrefs().edit().remove(PREF_PENDING_FILES).apply();
    }

    private JSONArray pendingFiles() throws JSONException {
        return new JSONArray(getPrefs().getString(PREF_PENDING_FILES, "[]"));
    }

    private boolean isValidPendingSet(JSONArray pending) throws JSONException {
        if (pending.length() == 0 || pending.length() > ShareImportFiles.MAX_FILES) return false;
        long totalBytes = 0;
        for (int index = 0; index < pending.length(); index += 1) {
            File file = new File(pending.getJSONObject(index).getString("path"));
            if (!ShareImportFiles.isPrivatePendingFile(getContext(), file)) return false;
            totalBytes += file.length();
            if (totalBytes > ShareImportFiles.MAX_TOTAL_BYTES) return false;
        }
        return true;
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

}
