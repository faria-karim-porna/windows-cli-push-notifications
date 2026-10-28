import fs from "fs";
import path from "path";

// প্রতিটা লুপে কনসোল লগ সহ গ্লোবাল ফোল্ডার সার্চ ফাংশন
export function searchFoldersInDir(
  dir,
  keyword,
  results = [],
  maxResults = 15,
) {
  if (results.length >= maxResults) return;

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= maxResults) break;

      if (item.isDirectory()) {
        const folderName = item.name;
        const fullPath = path.join(dir, folderName);

        console.log(`[LOOP SCAN] Checking folder: ${fullPath}`);

        if (folderName.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`[MATCH FOUND] 🎉 ${fullPath}`);
          results.push(fullPath);
        }

        try {
          searchFoldersInDir(fullPath, keyword, results, maxResults);
        } catch (subErr) {}
      }
    }
  } catch (err) {}
}

// "This PC" এর সব এভেইলেবল ড্রাইভ খুঁজে বের করার ফাংশন
export function getAllAvailableDrives() {
  const drives = [];
  const possibleLetters = ["C", "D", "E", "F", "G", "H", "I", "J"];

  for (const letter of possibleLetters) {
    const drivePath = `${letter}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        drives.push(drivePath);
      }
    } catch (e) {}
  }
  return drives;
}
