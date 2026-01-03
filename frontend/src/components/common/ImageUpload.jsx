import { useState } from 'react';
import {
  uploadProfileImage,
  uploadFlightImage,
  uploadHotelImage,
  uploadCarImage,
} from '../../services/image.service';

const ImageUpload = ({
  onUploadComplete,
  entityType,
  entityId,
  maxSize = 5 * 1024 * 1024,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);

    if (file.size > maxSize) {
      setError('File size exceeds limit');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    const file = fileInput?.files[0];

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!entityType || !entityId) {
      setError('Entity type and ID are required');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let result;
      switch (entityType) {
        case 'profiles':
          result = await uploadProfileImage(file, entityId);
          break;
        case 'flights':
          result = await uploadFlightImage(file, entityId);
          break;
        case 'hotels':
          result = await uploadHotelImage(file, entityId);
          break;
        case 'cars':
          result = await uploadCarImage(file, entityId);
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      onUploadComplete?.(result);
      setPreview(null);
      fileInput.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-control w-full">
      <form onSubmit={handleUpload}>
        <label className="label">
          <span className="label-text">Upload Image</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full"
          disabled={uploading || !entityType || !entityId}
        />
        {preview && (
          <div className="mt-4">
            <img src={preview} alt="Preview" className="max-w-xs rounded-lg" />
          </div>
        )}
        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary mt-4"
          disabled={uploading || !preview || !entityType || !entityId}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default ImageUpload;
