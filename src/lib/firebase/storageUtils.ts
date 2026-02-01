"use client";

import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

const STORAGE_URL_PATTERN =
  /^gs:\/\//i;
const STORAGE_HTTP_PATTERN =
  /firebasestorage\.googleapis\.com|storage\.googleapis\.com/i;

const isStorageUrl = (url?: string) => {
  if (!url) return false;
  return STORAGE_URL_PATTERN.test(url) || STORAGE_HTTP_PATTERN.test(url);
};

export const deleteStorageObject = async (url?: string) => {
  if (!storage || !url || !isStorageUrl(url)) return;
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Ignora erro de arquivo inexistente ou sem permissão.
  }
};

export const deleteStorageObjects = async (urls?: string[]) => {
  if (!urls?.length) return;
  await Promise.all(urls.map((url) => deleteStorageObject(url)));
};
