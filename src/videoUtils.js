import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { getDatabase, ref as dbRef, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

// Initialize Firebase Storage
const storage = getStorage();
// Initialize Firebase Realtime Database
const database = getDatabase();

export const uploadVideo = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    // Create a reference to the file location in Firebase Storage
    const videoRef = storageRef(storage, `videos/${uuidv4()}_${file.name}`);

    // Create an upload task with uploadBytesResumable
    const uploadTask = uploadBytesResumable(videoRef, file);

    // Register event listeners for upload task
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Calculate progress percentage
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error("Error uploading video:", error);
        reject(new Error("Failed to upload video"));
      },
      async () => {
        // Get the download URL of the uploaded file
        try {
          const videoURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(videoURL);
        } catch (error) {
          console.error("Error getting download URL:", error);
          reject(new Error("Failed to get download URL"));
        }
      }
    );
  });
};

export const saveVideoURL = async (courseId, videoURL, videoTitle) => {
  try {
    // Create a reference to the course's videos in Firebase Realtime Database
    const videoId = uuidv4(); // Unique ID for the video
    const videoRef = dbRef(database, `courses/${courseId}/videos/${videoId}`);

    // Save the video URL and title to the database
    await set(videoRef, {
      url: videoURL,
      title: videoTitle,
    });
  } catch (error) {
    console.error("Error saving video URL:", error);
    throw new Error("Failed to save video URL");
  }
};
