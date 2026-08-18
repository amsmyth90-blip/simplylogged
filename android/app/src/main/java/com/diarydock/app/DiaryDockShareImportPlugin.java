package com.diarydock.app;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.MimeTypeMap;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "DiaryDockShareImport")
public class DiaryDockShareImportPlugin extends Plugin {
    private static final String PREFS_NAME = "diarydock_share_import";
    private static final String PREF_PENDING_FILES = "pending_files";
    private static final int MAX_FILES = 12;
    private static final long MAX_FILE_BYTES = 10L * 1024L * 1024L;

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
        JSArray files = new JSArray();

        try {
            JSONArray pendingFiles = new JSONArray(getPrefs().getString(PREF_PENDING_FILES, "[]"));

            for (int index = 0; index < pendingFiles.length(); index += 1) {
                JSONObject pendingFile = pendingFiles.getJSONObject(index);
                File file = new File(pendingFile.getString("path"));

                if (!file.exists() || file.length() <= 0 || file.length() > MAX_FILE_BYTES) {
                    continue;
                }

                JSObject item = new JSObject();
                item.put("id", pendingFile.getString("id"));
                item.put("name", pendingFile.getString("name"));
                item.put("mimeType", pendingFile.getString("mimeType"));
                item.put("size", file.length());
                item.put("base64", encodeFile(file));
                files.put(item);
            }

            result.put("files", files);
            result.put("source", "android-share-sheet");
            result.put("receivedAt", String.valueOf(System.currentTimeMillis()));
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Unable to read the shared files.");
        }
    }

    @PluginMethod
    public void clearPendingImport(PluginCall call) {
        clearPendingFiles();
        call.resolve();
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action) && !Intent.ACTION_VIEW.equals(action)) {
            return;
        }

        List<Uri> uris = collectUris(intent);
        if (uris.isEmpty()) {
            return;
        }

        try {
            JSONArray pendingFiles = copyUrisToPrivateStorage(uris);
            if (pendingFiles.length() == 0) {
                return;
            }

            getPrefs().edit().putString(PREF_PENDING_FILES, pendingFiles.toString()).apply();

            JSObject result = new JSObject();
            result.put("count", pendingFiles.length());
            notifyListeners("shareImportReceived", result, true);
            openImportReviewPage();
        } catch (Exception ignored) {
            // Keep native sharing quiet; the web review screen shows a friendly fallback if nothing is available.
        } finally {
            intent.setAction(null);
            intent.removeExtra(Intent.EXTRA_STREAM);
        }
    }

    private List<Uri> collectUris(Intent intent) {
        List<Uri> uris = new ArrayList<>();

        if (intent.getData() != null) {
            uris.add(intent.getData());
        }

        Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (stream != null) {
            uris.add(stream);
        }

        ArrayList<Uri> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        if (streams != null) {
            uris.addAll(streams);
        }

        ClipData clipData = intent.getClipData();
        if (clipData != null) {
            for (int index = 0; index < clipData.getItemCount(); index += 1) {
                Uri uri = clipData.getItemAt(index).getUri();
                if (uri != null) {
                    uris.add(uri);
                }
            }
        }

        return uris.size() > MAX_FILES ? uris.subList(0, MAX_FILES) : uris;
    }

    private JSONArray copyUrisToPrivateStorage(List<Uri> uris) throws Exception {
        clearPendingFiles();
        File directory = new File(getContext().getCacheDir(), "diarydock-share-imports");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("Unable to prepare share import storage.");
        }

        JSONArray pendingFiles = new JSONArray();

        for (Uri uri : uris) {
            String mimeType = getMimeType(uri);
            if (!isSupportedMimeType(mimeType)) {
                continue;
            }

            String displayName = sanitizeFileName(getDisplayName(uri));
            String id = String.valueOf(System.currentTimeMillis()) + "-" + pendingFiles.length();
            File destination = new File(directory, id + "-" + displayName);
            long copiedBytes = copyUri(uri, destination);

            if (copiedBytes <= 0 || copiedBytes > MAX_FILE_BYTES) {
                if (destination.exists()) {
                    destination.delete();
                }
                continue;
            }

            JSONObject item = new JSONObject();
            item.put("id", id);
            item.put("name", displayName);
            item.put("mimeType", mimeType);
            item.put("path", destination.getAbsolutePath());
            pendingFiles.put(item);
        }

        return pendingFiles;
    }

    private long copyUri(Uri uri, File destination) throws Exception {
        long totalBytes = 0;

        try (InputStream inputStream = getContext().getContentResolver().openInputStream(uri);
             FileOutputStream outputStream = new FileOutputStream(destination)) {
            if (inputStream == null) {
                return 0;
            }

            byte[] buffer = new byte[8192];
            int read;

            while ((read = inputStream.read(buffer)) != -1) {
                totalBytes += read;
                if (totalBytes > MAX_FILE_BYTES) {
                    break;
                }
                outputStream.write(buffer, 0, read);
            }
        }

        return totalBytes;
    }

    private String encodeFile(File file) throws Exception {
        try (FileInputStream inputStream = new FileInputStream(file);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;

            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }

            return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP);
        }
    }

    private String getMimeType(Uri uri) {
        String resolverType = getContext().getContentResolver().getType(uri);
        if (resolverType != null && !resolverType.trim().isEmpty()) {
            return resolverType.toLowerCase(Locale.ROOT);
        }

        String extension = MimeTypeMap.getFileExtensionFromUrl(uri.toString());
        if (extension == null || extension.trim().isEmpty()) {
            return "application/octet-stream";
        }

        String mappedType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase(Locale.ROOT));
        return mappedType == null ? "application/octet-stream" : mappedType.toLowerCase(Locale.ROOT);
    }

    private boolean isSupportedMimeType(String mimeType) {
        return "application/pdf".equals(mimeType)
            || "image/jpeg".equals(mimeType)
            || "image/png".equals(mimeType)
            || "image/webp".equals(mimeType)
            || "image/heic".equals(mimeType);
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.trim().isEmpty()) {
                        return name;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fall back to URI path below.
        }

        String path = uri.getLastPathSegment();
        return path == null || path.trim().isEmpty() ? "shared-document" : path;
    }

    private String sanitizeFileName(String name) {
        String safeName = name
            .trim()
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9.]+", "-")
            .replaceAll("-+", "-")
            .replaceAll("(^-|-$)", "");

        if (safeName.isEmpty()) {
            return "shared-document";
        }

        return safeName.length() > 96 ? safeName.substring(0, 96) : safeName;
    }

    private void clearPendingFiles() {
        try {
            JSONArray pendingFiles = new JSONArray(getPrefs().getString(PREF_PENDING_FILES, "[]"));

            for (int index = 0; index < pendingFiles.length(); index += 1) {
                File file = new File(pendingFiles.getJSONObject(index).getString("path"));
                if (file.exists()) {
                    file.delete();
                }
            }
        } catch (JSONException ignored) {
            // Nothing to clear.
        }

        getPrefs().edit().remove(PREF_PENDING_FILES).apply();
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private void openImportReviewPage() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        bridge.getWebView().post(() ->
            bridge.getWebView().evaluateJavascript("window.location.assign('/import/share?source=share')", null)
        );
    }
}
