import { useEffect, useRef, useState } from "react";
import api from "../services/api";

function PhotoPreview({ propertyId, photoId, number }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    async function loadPhoto() {
      setFailed(false);
      setUrl("");

      try {
        const response = await api.get(
          `/manage/properties/${propertyId}/images/${photoId}/content`,
          {
            responseType: "blob",
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      }
    }

    loadPhoto();

    return () => {
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [propertyId, photoId]);

  if (failed) {
    return <p className="field-help">Preview unavailable.</p>;
  }

  if (!url) {
    return <p className="field-help">Loading photo…</p>;
  }

  return (
    <img
      src={url}
      alt={`Property photo ${number}`}
      className="owner-photo-preview"
      onError={() => setFailed(true)}
    />
  );
}

export default function PropertyPhotos({ propertyId }) {
  const [photos, setPhotos] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const fileInput = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPhotos() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/manage/properties/${propertyId}/images`,
          { signal: controller.signal }
        );

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected response");
        }

        if (!controller.signal.aborted) {
          setPhotos(response.data);
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setError(
          requestError.response?.status === 403
            ? "You cannot manage photos for this property."
            : "Could not load photos. Refresh to retry."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPhotos();

    return () => controller.abort();
  }, [propertyId, reload]);

  function showError(requestError) {
    const status = requestError.response?.status;

    if (status === 401) {
      setError("Your session ended. Please sign in again.");
    } else if (status === 403) {
      setError("You cannot manage photos for this property.");
    } else if (status === 413) {
      setError("The photo is too large. Choose a file under 5 MB.");
    } else if (status === 409) {
      setError("This property may already have six photos. Refresh the list.");
    } else if (status === 400) {
      setError(
        "Use a valid JPEG or PNG, up to 5 MB, 8000 pixels per side, " +
          "and 20 megapixels in total."
      );
    } else if (status === 404) {
      setError("The property or photo was not found. Refresh the list.");
    } else {
      setError(
        "Could not confirm the change. Refresh photos before retrying."
      );
    }
  }

  async function uploadPhoto(event) {
    event.preventDefault();

    if (busy || !file) return;

    setError("");
    setNotice("");

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Choose a non-empty photo no larger than 5 MB.");
      return;
    }

    if (
      file.type &&
      !["image/jpeg", "image/png"].includes(file.type)
    ) {
      setError("Choose a JPEG or PNG photo.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setBusy(true);

    try {
      await api.post(
        `/manage/properties/${propertyId}/images`,
        formData,
        { timeout: 60000 }
      );

      setFile(null);

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      setNotice(
        "Photo uploaded. This property is now pending admin review."
      );
      setReload((value) => value + 1);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photoId) {
    if (busy || !window.confirm("Delete this photo?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.delete(
        `/manage/properties/${propertyId}/images/${photoId}`
      );

      setNotice(
        "Photo deleted. This property is now pending admin review."
      );
      setReload((value) => value + 1);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="owner-photos">
      <h4>Property photos</h4>

      <p className="field-help">
        Upload up to six JPEG or PNG photos, 5 MB each.
        The first photo is the cover.
      </p>

      <p className="field-help">
        Adding or deleting photos sends the listing back for admin
        review and temporarily hides it from public browsing.
      </p>

      <button
        type="button"
        disabled={loading || busy}
        onClick={() => setReload((value) => value + 1)}
      >
        Refresh photos
      </button>

      {loading && <p role="status">Loading photos…</p>}

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="details-notice" role="status">
          {notice}
        </p>
      )}

      {!loading && (
        <>
          <p>{photos.length} / 6 photos</p>

          <div className="owner-photo-grid">
            {photos.map((photo, index) => (
              <figure key={photo.id}>
                <PhotoPreview
                  propertyId={propertyId}
                  photoId={photo.id}
                  number={index + 1}
                />

                <figcaption>
                  {index === 0 ? "Cover photo" : `Photo ${index + 1}`}
                </figcaption>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deletePhoto(photo.id)}
                >
                  Delete photo
                </button>
              </figure>
            ))}
          </div>

          {photos.length < 6 && (
            <form onSubmit={uploadPhoto} className="photo-upload-form">
              <label htmlFor={`photo-file-${propertyId}`}>
                Choose a property photo
              </label>

              <input
                ref={fileInput}
                id={`photo-file-${propertyId}`}
                type="file"
                accept="image/jpeg,image/png"
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError("");
                  setNotice("");
                }}
              />

              <button
                type="submit"
                className="primary"
                disabled={busy || !file}
              >
                {busy ? "Processing…" : "Upload photo"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}