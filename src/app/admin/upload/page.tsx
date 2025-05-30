// src/app/admin/upload-cv/page.tsx
"use client";

import React, { useState, ChangeEvent, FormEvent } from 'react';

// Define sections for the dropdown
const cvSections = [
  { id: "profile", name: "Profile" },
  { id: "about", name: "About" },
  { id: "experience", name: "Experience" },
  { id: "education", name: "Education" },
  { id: "licenses", name: "Licenses & Certifications" },
  { id: "projects", name: "Projects" },
  { id: "volunteering", name: "Volunteering" },
  { id: "skills", name: "Skills" },
  { id: "recommendationsGiven", name: "Recommendations: Given" },
  { id: "recommendationsReceived", name: "Recommendations: Received" },
  { id: "honorsAwards", name: "Honors & Awards" },
  { id: "languages", name: "Languages" },
];

export default function UploadCVPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>(cvSections[0].id); // Default to first section
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secretKey, setSecretKey] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic validation for CSV
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a CSV file.' });
        setSelectedFile(null);
        event.target.value = "";
        return;
      }
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleSectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(event.target.value);
  };

  const handleSecretKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSecretKey(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !selectedSection) {
      setMessage({ type: 'error', text: 'Please select a section and a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      try {
        const base64Full = reader.result as string;
        const base64Content = base64Full.split(',')[1];

        const response = await fetch('/.netlify/functions/upload-cv-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionIdentifier: selectedSection,
            fileName: selectedFile.name,
            fileContentBase64: base64Content,
            secretKey: secretKey,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          setMessage({ type: 'success', text: result.message || 'File uploaded successfully!' });
          setSelectedFile(null);
          const fileInput = document.getElementById('cvFile') as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        } else {
          setMessage({ type: 'error', text: result.message || `Upload failed (Status: ${response.status}).` });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessage({ type: 'error', text: 'An unexpected error occurred during upload.' });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      setMessage({ type: 'error', text: 'Error reading file.' });
      setIsUploading(false);
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Upload CV Section Data (CSV)
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Section
            </label>
            <select
              id="section"
              name="section"
              value={selectedSection}
              onChange={handleSectionChange}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {cvSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Secret Key (if configured)
            </label>
            <input
              id="secretKey" name="secretKey" type="password" value={secretKey} onChange={handleSecretKeyChange}
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter secret key"
            />
          </div>

          <div>
            <label htmlFor="cvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CSV Data File
            </label>
            <div className="mt-1">
              <input
                id="cvFile" name="cvFile" type="file" accept=".csv" onChange={handleFileChange} required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {selectedFile.name}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
              {isUploading ? 'Uploading...' : 'Upload CSV for Section'}
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-100' : 'bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-100'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}