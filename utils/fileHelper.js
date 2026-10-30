import fs from "fs/promises";
import path from "path";

// অ্যাসিনক্রোনাস গ্লোবাল ফাইল সার্চ (signal সহ)
export async function searchFilesInDir(
  dir,
  keyword,
  results = [],
  maxResults = 15,
  onProgress,
  signal,
) {
  if (results.length >= maxResults || (signal && signal.aborted)) {
    console.log(`[FILE SEARCH] Stopped or max results limit reached.`);
    return;
  }

  try {
    console.log(`[FILE SEARCH] Reading directory: ${dir}`);
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= maxResults || (signal && signal.aborted)) break;

      const fullPath = path.join(dir, item.name);

      if (typeof onProgress === "function") {
        await onProgress();
      }

      if (item.isDirectory()) {
        console.log(`[FILE SEARCH] Entering subdirectory: ${fullPath}`);
        try {
          await searchFilesInDir(
            fullPath,
            keyword,
            results,
            maxResults,
            onProgress,
            signal,
          );
        } catch (subErr) {
          console.log(
            `[FILE SEARCH ERROR] Skipped directory: ${fullPath} -> ${subErr.message}`,
          );
        }
      } else if (item.isFile()) {
        if (signal && signal.aborted) break;
        console.log(`[FILE SCAN] Checking file: ${fullPath}`);
        if (item.name.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`[FILE MATCH FOUND] 🎉 ${fullPath}`);
          results.push(fullPath);
          if (typeof onProgress === "function") {
            await onProgress();
          }
        }
      }
    }
  } catch (err) {
    console.log(
      `[FILE SEARCH ERROR] Could not read directory: ${dir} -> ${err.message}`,
    );
  }
}

// অ্যাসিনক্রোনাস গ্লোবাল ফোল্ডার সার্চ (signal সহ)
export async function searchFoldersInDir(
  dir,
  keyword,
  results = [],
  maxResults = 15,
  onProgress,
  signal,
) {
  if (results.length >= maxResults || (signal && signal.aborted)) {
    console.log(`[FOLDER SEARCH] Stopped or max results limit reached.`);
    return;
  }

  try {
    console.log(`[FOLDER SEARCH] Reading directory: ${dir}`);
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= maxResults || (signal && signal.aborted)) break;

      // প্রতি লুপে টাইপিং স্ট্যাটাস সচল রাখতে প্রোগ্রেস কল করা
      if (typeof onProgress === "function") {
        await onProgress();
      }

      const folderName = item.name;
      const fullPath = path.join(dir, folderName);

      if (item.isDirectory()) {
        if (signal && signal.aborted) break;
        console.log(`[LOOP SCAN] Checking folder: ${fullPath}`);

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
            signal,
          );
        } catch (subErr) {
          console.log(
            `[FOLDER SEARCH ERROR] Skipped sub-directory: ${fullPath} -> ${subErr.message}`,
          );
        }
      }
    }
  } catch (err) {
    console.log(
      `[FOLDER SEARCH ERROR] Unreadable directory: ${dir} -> ${err.message}`,
    );
  }
}

// ড্রাইভ চেক করার জন্য এটি সিঙ্ক্রোনাস রাখা নিরাপদ
export function getAllAvailableDrives() {
  const drives = [];
  const possibleLetters = ["C", "D", "E", "F", "G", "H", "I", "J"];

  console.log("[DRIVE CHECK] Scanning available drives on 'This PC'...");
  for (const letter of possibleLetters) {
    const drivePath = `${letter}:\\`;
    try {
      if (fsSyncCheck(drivePath)) {
        console.log(`[DRIVE DETECTED] Found drive: ${drivePath}`);
        drives.push(drivePath);
      }
    } catch (e) {}
  }
  console.log(`[DRIVE CHECK COMPLETED] Total valid drives:`, drives);
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
