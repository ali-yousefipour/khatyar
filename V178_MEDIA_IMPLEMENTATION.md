# v178 media implementation
- All image uploads handled by Media are stored as JPG using site quality/width settings.
- Report attachment thumbnails are generated and returned via thumbnail_url.
- Retention cleanup deletes original report images and thumbnails.
- Salary-slip images open inside the app ImageViewer; PDF behavior remains unchanged.
- v176 notice JSON/base64 upload fix merged into this build.
- SDK/Expo/React Native/Gradle and package lock files were not changed.
