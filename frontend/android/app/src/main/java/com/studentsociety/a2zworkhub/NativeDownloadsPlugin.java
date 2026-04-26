package com.studentsociety.a2zworkhub;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "NativeDownloads")
public class NativeDownloadsPlugin extends Plugin {

    private static final String DEFAULT_SUBDIRECTORY = "Student Society";

    @PluginMethod
    public void saveFile(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", ""));
        String base64Data = call.getString("base64Data", "");
        String mimeType = sanitizeMimeType(call.getString("mimeType", "application/octet-stream"));
        String subdirectory = sanitizeRelativePath(call.getString("subdirectory", DEFAULT_SUBDIRECTORY));

        if (fileName.isEmpty() || base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("fileName and base64Data are required.");
            return;
        }

        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            JSObject result = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? saveToMediaStore(fileName, mimeType, subdirectory, bytes)
                : saveToLegacyDownloads(fileName, mimeType, subdirectory, bytes);
            call.resolve(result);
        } catch (IllegalArgumentException exception) {
            call.reject("Could not decode the exported file.", exception);
        } catch (IOException exception) {
            call.reject("Could not save the exported file to Downloads.", exception);
        }
    }

    private JSObject saveToMediaStore(
        String fileName,
        String mimeType,
        String subdirectory,
        byte[] bytes
    ) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        String relativeDirectory = Environment.DIRECTORY_DOWNLOADS;

        if (!subdirectory.isEmpty()) {
            relativeDirectory += "/" + subdirectory;
        }

        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativeDirectory);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (itemUri == null) {
            throw new IOException("Android could not create the download entry.");
        }

        try (OutputStream outputStream = resolver.openOutputStream(itemUri, "w")) {
            if (outputStream == null) {
                throw new IOException("Android could not open the download stream.");
            }

            outputStream.write(bytes);
            outputStream.flush();
        } catch (IOException exception) {
            resolver.delete(itemUri, null, null);
            throw exception;
        }

        ContentValues completedValues = new ContentValues();
        completedValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(itemUri, completedValues, null, null);

        JSObject result = new JSObject();
        result.put("uri", itemUri.toString());
        result.put("relativePath", relativeDirectory + "/" + fileName);
        result.put("fileName", fileName);
        result.put("byteLength", bytes.length);
        return result;
    }

    private JSObject saveToLegacyDownloads(
        String fileName,
        String mimeType,
        String subdirectory,
        byte[] bytes
    ) throws IOException {
        File downloadsDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File targetDirectory = subdirectory.isEmpty() ? downloadsDirectory : new File(downloadsDirectory, subdirectory);

        if (!targetDirectory.exists() && !targetDirectory.mkdirs()) {
            throw new IOException("Android could not create the download folder.");
        }

        File targetFile = createUniqueFile(targetDirectory, fileName);

        try (FileOutputStream outputStream = new FileOutputStream(targetFile)) {
            outputStream.write(bytes);
            outputStream.flush();
        }

        MediaScannerConnection.scanFile(
            getContext(),
            new String[] { targetFile.getAbsolutePath() },
            new String[] { mimeType },
            null
        );

        Uri sharedUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            targetFile
        );

        JSObject result = new JSObject();
        result.put("uri", sharedUri.toString());
        result.put("relativePath", "Download/" + (subdirectory.isEmpty() ? "" : subdirectory + "/") + targetFile.getName());
        result.put("absolutePath", targetFile.getAbsolutePath());
        result.put("fileName", targetFile.getName());
        result.put("byteLength", bytes.length);
        return result;
    }

    private File createUniqueFile(File directory, String fileName) {
        File candidate = new File(directory, fileName);
        if (!candidate.exists()) {
            return candidate;
        }

        int extensionIndex = fileName.lastIndexOf('.');
        String baseName = extensionIndex > 0 ? fileName.substring(0, extensionIndex) : fileName;
        String extension = extensionIndex > 0 ? fileName.substring(extensionIndex) : "";

        int counter = 2;
        while (candidate.exists()) {
            candidate = new File(directory, baseName + " (" + counter + ")" + extension);
            counter += 1;
        }

        return candidate;
    }

    private String sanitizeFileName(String fileName) {
        String trimmed = fileName == null ? "" : fileName.trim();
        String sanitized = trimmed.replaceAll("[<>:\"/\\\\|?*]+", "-").replaceAll("\\p{Cntrl}+", "");

        if (sanitized.isEmpty()) {
            return "download";
        }

        return sanitized.length() > 180 ? sanitized.substring(0, 180) : sanitized;
    }

    private String sanitizeRelativePath(String value) {
        if (value == null) {
            return "";
        }

        String sanitized = value
            .replace('\\', '/')
            .replaceAll("\\.\\.+", "")
            .replaceAll("^/+", "")
            .replaceAll("/+$", "")
            .replaceAll("\\p{Cntrl}+", "")
            .trim();

        return sanitized;
    }

    private String sanitizeMimeType(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "application/octet-stream";
        }

        return value.trim();
    }
}
