# 13 — Media Handling and Delivery

---

## 1. Locked Intended Design

The application supports media integration for two primary use cases:
1.  **Checklist visual cues:** Attaching images to specific steps in a `ChecklistTemplate` to aid memory recall during a routine.
2.  **Contact photos:** Providing visual confirmation of identity in the Contacts list.

The intended architecture requires a scalable object storage solution (like AWS S3) where the backend generates presigned URLs for the mobile client to upload directly, and a CDN serves the media securely back to the device.

---

## 2. Current Implementation State

The current prototype relies on local filesystem storage, which is acceptable for a controlled research deployment but introduces operational constraints.

### The Upload Flow
*   **Endpoint:** `POST /api/media/upload` handles `multipart/form-data`.
*   **Middleware:** Express `multer` intercepts the file and writes it to `backend/uploads/{uuid}.{ext}`.
*   **Database:** A `MediaAsset` record is created in PostgreSQL storing the `publicUrl`, derived from the `API_PUBLIC_URL` environment variable.

### Serving Media
Files are served publicly without authentication via the Express static middleware (e.g., `GET /uploads/{uuid}.jpg`).

---

## 3. Known Limitations / Future Work

*   **The Localhost/Device Problem:** Mobile devices (via Expo Go) cannot resolve `localhost`. Therefore, if the backend `API_PUBLIC_URL` is set to `localhost`, images will break on the patient's phone. 
    *   *Workaround:* The system provides an admin utility `POST /api/media/restamp-urls` which must be called manually whenever the backend deployment URL (e.g., an ngrok tunnel) changes.
*   **Stateless Cloud Instability:** Because files are written to the local disk, deploying the backend to a stateless cloud provider (like Heroku or Railway) means uploaded photos will be deleted every time the server restarts.
*   **No File Validation:** The current `multer` setup accepts any MIME type up to 50MB. A production release requires strict whitelisting to `image/jpeg`, `image/png`, and `video/mp4`.
*   **Public Access:** Serving media without signed URLs means anyone possessing the URL string can view the photo, representing a privacy gap.

---

*Traceability: Media routes and multer config are located in `backend/src/modules/media/media.routes.ts`. MediaAsset entity is defined in `backend/prisma/schema.prisma`.*
