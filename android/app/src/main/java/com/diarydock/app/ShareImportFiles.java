package com.diarydock.app;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

final class ShareImportFiles {
    static final int MAX_FILES = 12;
    static final long MAX_FILE_BYTES = 4L * 1024L * 1024L;
    static final long MAX_TOTAL_BYTES = 4L * 1024L * 1024L;
    private final Context context;

    ShareImportFiles(Context context) {
        this.context = context;
    }

    List<Uri> collectUris(Intent intent) {
        LinkedHashSet<Uri> uniqueUris = new LinkedHashSet<>();
        if (intent.getData() != null) uniqueUris.add(intent.getData());

        Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (stream != null) uniqueUris.add(stream);
        ArrayList<Uri> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        if (streams != null) uniqueUris.addAll(streams);

        ClipData clipData = intent.getClipData();
        if (clipData != null) {
            for (int index = 0; index < clipData.getItemCount(); index += 1) {
                Uri uri = clipData.getItemAt(index).getUri();
                if (uri != null) uniqueUris.add(uri);
            }
        }
        return new ArrayList<>(uniqueUris);
    }

    JSONArray copyToPrivateStorage(List<Uri> uris) throws Exception {
        File directory = new File(context.getCacheDir(), "diarydock-share-imports");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("Unable to prepare share import storage.");
        }

        JSONArray pending = new JSONArray();
        long totalBytes = 0;
        for (Uri uri : uris) {
            if (totalBytes >= MAX_TOTAL_BYTES) break;
            String mimeType = mimeType(uri);
            if (!isSupportedMimeType(mimeType)) continue;
            String name = sanitizeFileName(displayName(uri));
            String id = UUID.randomUUID().toString();
            File destination = new File(directory, id + "-" + name);
            long copied = copyUri(uri, destination, MAX_TOTAL_BYTES - totalBytes);
            if (copied <= 0 || copied > MAX_FILE_BYTES || totalBytes + copied > MAX_TOTAL_BYTES) {
                delete(destination);
                continue;
            }
            totalBytes += copied;
            JSONObject item = new JSONObject();
            item.put("id", id);
            item.put("name", name);
            item.put("mimeType", mimeType);
            item.put("path", destination.getAbsolutePath());
            pending.put(item);
        }
        return pending;
    }

    private long copyUri(Uri uri, File destination, long remainingBytes) throws Exception {
        long totalBytes = 0;
        try (InputStream input = context.getContentResolver().openInputStream(uri);
             FileOutputStream output = new FileOutputStream(destination)) {
            if (input == null) return 0;
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                totalBytes += read;
                if (totalBytes > Math.min(MAX_FILE_BYTES, remainingBytes)) break;
                output.write(buffer, 0, read);
            }
        }
        return totalBytes;
    }

    private String mimeType(Uri uri) {
        String resolverType = context.getContentResolver().getType(uri);
        if (resolverType != null && !resolverType.trim().isEmpty()) {
            return resolverType.toLowerCase(Locale.ROOT);
        }
        String extension = MimeTypeMap.getFileExtensionFromUrl(uri.toString());
        if (extension == null || extension.trim().isEmpty()) return "application/octet-stream";
        String mapped = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase(Locale.ROOT));
        return mapped == null ? "application/octet-stream" : mapped.toLowerCase(Locale.ROOT);
    }

    private boolean isSupportedMimeType(String mimeType) {
        return "application/pdf".equals(mimeType)
            || "image/jpeg".equals(mimeType)
            || "image/png".equals(mimeType)
            || "image/webp".equals(mimeType)
            || "image/heic".equals(mimeType);
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = context.getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.trim().isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
            // URI path is the non-sensitive fallback name.
        }
        String path = uri.getLastPathSegment();
        return path == null || path.trim().isEmpty() ? "shared-document" : path;
    }

    private String sanitizeFileName(String name) {
        String safe = name.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9.]+", "-")
            .replaceAll("-+", "-")
            .replaceAll("(^-|-$)", "");
        if (safe.isEmpty()) return "shared-document";
        return safe.length() > 96 ? safe.substring(0, 96) : safe;
    }

    static boolean isReadable(File file) {
        return file.exists() && file.length() > 0 && file.length() <= MAX_FILE_BYTES;
    }

    static boolean isPrivatePendingFile(Context context, File file) {
        try {
            File directory = new File(context.getCacheDir(), "diarydock-share-imports");
            String root = directory.getCanonicalPath() + File.separator;
            return file.getCanonicalPath().startsWith(root) && isReadable(file);
        } catch (Exception ignored) {
            return false;
        }
    }

    static void clear(JSONArray files) {
        for (int index = 0; index < files.length(); index += 1) {
            JSONObject item = files.optJSONObject(index);
            if (item != null) delete(new File(item.optString("path", "")));
        }
    }

    private static void delete(File file) {
        if (file.isFile()) file.delete();
    }
}
