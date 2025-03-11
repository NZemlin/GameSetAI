import { useState } from 'react';
import axios from 'axios';

const VideoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB for local storage

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('video/')) {
        if (selectedFile.size > MAX_FILE_SIZE) {
          setError('File size must be less than 5GB');
          setFile(null);
          return;
        }
        setFile(selectedFile);
        if (!videoName.trim()) {
          setVideoName(selectedFile.name.split('.')[0]);
        }
        setError('');
      } else {
        setError('Please select a valid video file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!videoName.trim()) {
      setError('Please enter a name for the video');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('name', videoName.trim());

    try {
      const response = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });

      console.log('Upload completed successfully');
      setProgress(100);
      
      const videoUrl = `http://localhost:3000/uploads/${response.data.file.filename}`;
      setUploadedVideo(videoUrl);

      setTimeout(() => {
        setFile(null);
        setVideoName('');
        setProgress(0);
        if (document.getElementById('file-upload') instanceof HTMLInputElement) {
          (document.getElementById('file-upload') as HTMLInputElement).value = '';
        }
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload video. Please try again.');
      setUploadedVideo(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Upload Tennis Match Video
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>Upload your tennis match video for analysis. Maximum file size is 5GB.</p>
              <p className="mt-1">Supported formats: MP4, MOV, AVI</p>
            </div>
            <div className="mt-5">
              <div className="mt-1">
                <label htmlFor="video-name" className="block text-sm font-medium text-gray-700">
                  Video Name
                </label>
                <input
                  type="text"
                  id="video-name"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm font-medium custom-input"
                  style={{
                    backgroundColor: 'white',
                    color: '#1F2937',
                    borderColor: '#D1D5DB',
                  }}
                  data-form-type="other"
                  placeholder="Enter a name for your video"
                  disabled={uploading}
                />
              </div>
              <div className="mt-4">
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                  Video File
                </label>
                <div className="mt-1 flex items-center">
                  {/* Hide the actual file input */}
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo"
                    className="sr-only" /* Hidden but still accessible */
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {/* Custom styled button to match Scoring tab */}
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Choose File
                  </label>
                  {/* File name display */}
                  <span className="ml-3 text-sm text-gray-500">
                    {file ? file.name : "No file chosen"}
                  </span>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
              {uploading && progress > 0 && (
                <div className="mt-2">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                          Progress
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-indigo-600">
                          {progress}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                      <div
                        style={{ width: `${progress}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="mt-8 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : 'Upload Video'}
              </button>
            </div>
            
            {uploadedVideo && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Uploaded Video</h4>
                <video 
                  controls 
                  className="w-full rounded-lg shadow-lg"
                  src={uploadedVideo}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload;