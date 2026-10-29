import fs from "fs/promises";
import path from "path";

// অ্যাসিনক্রোনাস গ্লোবাল ফাইল সার্চ
export async function searchFilesInDir(
  dir,
  keyword,
  results = [],
  maxResults = 15,
  onProgress,
) {
  if (results.length >= maxResults) return;

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(dir, item.name);

      if (typeof onProgress === "function") {
        await onProgress();
      }

      if (item.isDirectory()) {
        try {
          await searchFilesInDir(
            fullPath,
            keyword,
            results,
            maxResults,
            onProgress,
          );
        } catch (subErr) {}
      } else if (item.isFile()) {
        if (item.name.toLowerCase().includes(keyword.toLowerCase())) {
          results.push(fullPath);
          if (typeof onProgress === "function") {
            await onProgress();
          }
        }
      }
    }
  } catch (err) {}
}

// অ্যাসিনক্রোনাস গ্লোবাল ফোল্ডার সার্চ
export async function searchFoldersInDir(
  dir,
  keyword,
  results = [],
  maxResults = 15,
  onProgress,
) {
  if (results.length >= maxResults) return;

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= maxResults) break;

      // প্রতি লুপে টাইপিং স্ট্যাটাস সচল রাখতে প্রোগ্রেস কল করা
      if (typeof onProgress === "function") {
        await onProgress();
      }

      const folderName = item.name;
      const fullPath = path.join(dir, folderName);

      if (item.isDirectory()) {
        if (folderName.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`[MATCH FOUND] 🎉 ${fullPath}`);
          results.push(fullPath);

          if (typeof onProgress === "function") {
            await onProgress();
          }
        }

        try {
          await searchFoldersInDir(
            fullPath,
            keyword,
            results,
            maxResults,
            onProgress,
          );
        } catch (subErr) {}
      }
    }
  } catch (err) {}
}

// ড্রাইভ চেক করার জন্য এটি সিঙ্ক্রোনাস রাখা নিরাপদ
export function getAllAvailableDrives() {
  const drives = [];
  const possibleLetters = ["C", "D", "E", "F", "G", "H", "I", "J"];

  for (const letter of possibleLetters) {
    const drivePath = `${letter}:\\`;
    try {
      // fs (sync) ব্যবহার করা হচ্ছে শুধুমাত্র ড্রাইভ এক্সিস্টেন্স চেক করার জন্য
      if (fsSyncCheck(drivePath)) {
        drives.push(drivePath);
      }
    } catch (e) {}
  }
  return drives;
}

import fsSync from "fs";
function fsSyncCheck(drivePath) {
  try {
    return fsSync.existsSync(drivePath);
  } catch (e) {
    return false;
  }
}
