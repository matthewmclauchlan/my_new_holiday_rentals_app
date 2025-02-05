// lib/uploadHelperAlt.ts
import * as FileSystem from "expo-file-system";
import { ID } from "react-native-appwrite"; // For generating unique IDs
import { config } from "./appwrite"; // Ensure your config is exported from appwrite.ts

/**
 * Uploads a file (from a local URI) to Appwrite Storage via a FormData request and returns its public URL.
 *
 * @param fileUri - The local URI of the file to upload.
 * @returns A promise that resolves to the public URL of the uploaded file.
 */
export async function uploadFileDirect(fileUri: string): Promise<string> {
  // Generate a unique file ID (optional; you can also let Appwrite generate it)
  const fileId = ID.unique();
  // Construct the upload URL using your Appwrite config.
  // Example URL: https://[APPWRITE_ENDPOINT]/storage/buckets/{bucketId}/files?project={projectId}&fileId={fileId}
  const uploadUrl = `${config.endpoint}/storage/buckets/${config.bucketId}/files?project=${config.projectId}&fileId=${fileId}`;

  // Create a FormData object and append the file.
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: `id-photo-${Date.now()}.jpg`, // Generate a unique filename.
    type: "image/jpeg",                 // MIME type of the file.
  } as any); // Cast as any if TypeScript complains.

  // Send the FormData to Appwrite using fetch.
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      // Optionally include additional headers if required, such as an API key.
      // "X-Appwrite-Key": "your_appwrite_api_key",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const result = await response.json();
  // Construct the public URL from the returned file ID.
  const fileUrl = `${config.endpoint}/storage/buckets/${config.bucketId}/files/${result.$id}/preview?project=${config.projectId}`;
  return fileUrl;
}
