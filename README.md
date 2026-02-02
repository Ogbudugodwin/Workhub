# WorkHub Backend

## Issue

The backend was failing to start due to a malformed `serviceAccountKey.json` file. This caused a 500 Internal Server Error when the frontend tried to fetch data from the `/api/jobs/published` endpoint.

## Fix

The `private_key` in the `serviceAccountKey.json` file contained newline characters that were not properly escaped for a JSON string. The file has been corrected by replacing all `\n` characters with `\\n` in the `private_key` field.

## Verification

To verify the fix, please follow these steps:

1.  Open a terminal in the root directory of the project.
2.  Run the backend server using the following command:
    ```sh
    node backend/index.js
    ```
3.  The server should start without any errors. You should see a message like "Firebase Admin Initialized using Service Account." and "Server is running on port 5000" in the console.
4.  Open the application in your browser. The error should be gone, and the published jobs should be displayed on the home page.

If you continue to experience issues, please check the `backend_log.txt` file for any errors.
