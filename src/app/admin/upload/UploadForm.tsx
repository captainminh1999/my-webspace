// src/app/admin/upload/UploadForm.tsx
"use client"; // This component IS a Client Component

import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';

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

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>(cvSections[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secretKey, setSecretKey] = useState('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProgress(0);
    setProgressMessage('');
    setMessage(null);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a CSV file.' });
        setSelectedFile(null);
        if (event.target) event.target.value = ""; // Reset file input
        return;
      }
      setSelectedFile(file);
      setProgress(5);
      setProgressMessage('File selected. Ready for upload.');
    } else {
      setSelectedFile(null);
    }
  };

  const handleSectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(event.target.value);
  };

  const handleSecretKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSecretKey(event.target.value);
  };

  const checkDeployStatus = async () => {
    try {
      const statusResponse = await fetch('/.netlify/functions/get-deploy-status');
      if (!statusResponse.ok) {
        // If the status function itself returns an error (like 404)
        setProgressMessage(`Error checking deploy status: ${statusResponse.statusText || statusResponse.status}. Function may not be deployed.`);
        setMessage({ type: 'error', text: `Failed to get deployment status. Please check Netlify function logs for 'get-deploy-status'.` });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false); // MODIFIED: Reset processing state on polling function error
        return;
      }
      const statusData = await statusResponse.json();

      setProgressMessage(`Current deploy status: ${statusData.status}. Checking again in 10s...`);
      
      if (statusData.status === 'ready' || statusData.status === 'current') {
        setProgress(100);
        setProgressMessage('Site successfully updated!');
        setMessage({ type: 'success', text: 'Deployment complete and site is live with new data.' });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false);
      } else if (statusData.status === 'building') {
        setProgress(prev => Math.min(prev + 5, 95)); 
      } else if (statusData.status === 'error' || statusData.status === 'failed') {
        setProgressMessage(`Deployment failed: ${statusData.status}`);
        setMessage({ type: 'error', text: `Netlify deployment failed. Check deploy logs on Netlify.` });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error polling deploy status:", error);
      setProgressMessage('Could not retrieve deploy status. Network error or function issue.');
      setMessage({ type: 'error', text: 'Error while trying to check deployment status.' });
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      setIsProcessing(false); // MODIFIED: Reset processing state on catch
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !selectedSection) {
      setMessage({ type: 'error', text: 'Please select a section and a CSV file to upload.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setProgress(10);
    setProgressMessage('Reading file...');

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      try {
        setProgress(15);
        setProgressMessage('Sending data to server...');
        const base64Full = reader.result as string;
        const base64Content = base64Full.split(',')[1];

        const uploadResponse = await fetch('/.netlify/functions/upload-cv-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionIdentifier: selectedSection,
            fileName: selectedFile.name,
            fileContentBase64: base64Content,
            secretKey: secretKey,
          }),
        });

        const uploadResult = await uploadResponse.json();

        if (uploadResponse.ok) {
          setProgress(30);
          setProgressMessage('Data submitted to GitHub. Build triggered. Monitoring deployment...');
          setMessage({ type: 'success', text: uploadResult.message || 'File processing initiated successfully!' });
          
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(checkDeployStatus, 10000);
          await checkDeployStatus(); 

        } else {
          setMessage({ type: 'error', text: uploadResult.message || `Upload to function failed (Status: ${uploadResponse.status}).` });
          setIsProcessing(false);
          setProgress(0);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessage({ type: 'error', text: 'An unexpected error occurred during upload processing.' });
        setIsProcessing(false);
        setProgress(0);
      }
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      setMessage({ type: 'error', text: 'Error reading file.' });
      setIsProcessing(false);
      setProgress(0);
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
              id="section" name="section" value={selectedSection} onChange={handleSectionChange} required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={isProcessing}
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
              disabled={isProcessing}
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
                disabled={isProcessing}
              />
            </div>
            {selectedFile && !isProcessing && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {selectedFile.name}</p>
            )}
          </div>
          
          {isProcessing && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          {progressMessage && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              {progressMessage}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isProcessing || !selectedFile}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 mt-6"
            >
              {isProcessing ? `Processing (${progress}%)` : 'Upload CSV for Section'}
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-md text-sm mt-4 ${message.type === 'success' && progress === 100 ? 'bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-100' : message.type === 'error' ? 'bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-100' : 'bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-100'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
