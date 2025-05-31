// src/app/admin/upload/UploadForm.tsx
"use client"; 

import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import Papa from 'papaparse'; // Import papaparse for client-side parsing

// Define sections for the dropdown
const cvSections = [
  { id: "profile", name: "Profile" },
  { id: "about", name: "About" }, // About is special, populated from Profile's summary
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

// DEFINE EXPECTED CSV HEADERS FOR EACH SECTION
// **IMPORTANT**: These must exactly match the headers in your CSV files!
const EXPECTED_HEADERS: { [key: string]: string[] } = {
  profile: [
    "First Name", "Last Name", "Maiden Name", "Address", "Birth Date", 
    "Headline", "Summary", // Summary will be used for about.json
    "Industry", "Zip Code", "Geo Location", "Twitter Handles", 
    "Websites", "Instant Messengers"
  ],
  // "about" section is derived from profile's summary, so no direct CSV upload usually.
  // If you have a separate about.csv, define its headers here.
  about: ["Content"], // Example if you had a dedicated about.csv
  experience: [ // This is complex due to nested structure. This assumes a flat CSV per role.
    "Company Name", "Employment Type", "Company Location", "Company Total Duration",
    "Role Title", "Role Start Date", "Role End Date", "Role Duration", "Role Location",
    "Responsibility 1", "Responsibility 2", "Responsibility 3", // Add more as needed or handle differently
    "Skills" // e.g., "Skill1;Skill2;Skill3"
  ],
  education: [
    "School Name", "Start Date", "End Date", "Degree Name", "Notes", "Activities"
  ],
  licenses: [
    "Name", "Authority", "Started On", "Finished On", "License Number", "Url"
  ],
  projects: [
    "Title", "Started On", "Finished On", "Description", "Url"
  ],
  volunteering: [
    "Company Name", "Role", "Started On", "Finished On", "Cause", "Description"
  ],
  skills: [ // Assuming a CSV with one column header, e.g., "Skill Name"
    "Skill Name"
  ],
  recommendationsReceived: [
    "Recommender First Name", "Recommender Last Name", "Recommender Job Title", 
    "Recommender Company", "Recommendation Text", "Date Received"
  ],
  recommendationsGiven: [ // If you implement upload for this
    "Recipient First Name", "Recipient Last Name", "Recipient Job Title",
    "Recipient Company", "Recommendation Text", "Date Given"
  ],
  honorsAwards: [
    "Title", "Description", "Issued On"
  ],
  languages: [
    "Name", "Proficiency"
  ],
};


export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileValid, setIsFileValid] = useState(false); // New state for validation
  const [selectedSection, setSelectedSection] = useState<string>(cvSections[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string | React.ReactNode } | null>(null);
  const [secretKey, setSecretKey] = useState('');
  
  const [uploadInitiationTime, setUploadInitiationTime] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const resetFormState = () => {
    setProgress(0);
    setProgressMessage('');
    setMessage(null);
    setSelectedFile(null);
    setIsFileValid(false);
    setUploadInitiationTime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input visually
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState(); // Reset previous states on new file selection
    const file = event.target.files?.[0];

    if (file) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a CSV file.' });
        return;
      }

      // Client-side CSV header validation
      Papa.parse(file, {
        preview: 1, // Only parse the first few lines to get headers quickly
        header: true, // Automatically detect headers
        skipEmptyLines: true,
        complete: (results) => {
          const actualHeaders = results.meta.fields || [];
          const expected = EXPECTED_HEADERS[selectedSection];

          if (selectedSection === "about" && EXPECTED_HEADERS["about"]?.length > 0) {
            // Handle 'about' section special case if it's directly uploaded
             // For now, this example assumes 'about' is from profile summary,
             // so a direct 'about.csv' upload might not be typical unless you change that flow.
          }


          if (!expected) {
            setMessage({ type: 'info', text: `No specific header validation for section: ${selectedSection}. Please ensure format is correct.` });
            setSelectedFile(file); // Allow upload but with a warning/info
            setIsFileValid(true);
            setProgress(5);
            setProgressMessage('File selected. No specific header validation for this section.');
            return;
          }
          
          const missingHeaders = expected.filter(h => !actualHeaders.includes(h));
          const extraHeaders = actualHeaders.filter(h => !expected.includes(h)); // Good to be aware of

          if (missingHeaders.length > 0) {
            setMessage({ 
              type: 'error', 
              text: (
                <>
                  <strong>Header mismatch!</strong> Please check your CSV.
                  <br />Missing expected columns: {missingHeaders.join(', ')}
                  {extraHeaders.length > 0 && <><br />Your file also has extra columns: {extraHeaders.join(', ')}</>}
                </>
              )
            });
            setIsFileValid(false);
          } else {
            let validationMessage = "CSV headers are correct.";
            if (extraHeaders.length > 0) {
              validationMessage += ` (Note: Your file has extra columns: ${extraHeaders.join(', ')}. These will be ignored if not mapped by the backend.)`;
              setMessage({ type: 'info', text: validationMessage });
            } else {
              setMessage({ type: 'success', text: validationMessage });
            }
            setSelectedFile(file);
            setIsFileValid(true);
            setProgress(5);
            setProgressMessage('File selected and headers validated. Ready for upload.');
          }
        },
        error: (error: any) => {
          setMessage({ type: 'error', text: `Error parsing CSV for validation: ${error.message}` });
          setIsFileValid(false);
        }
      });
    }
  };

  const handleSectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(event.target.value);
    resetFormState(); // Reset file and validation when section changes
  };

  const handleSecretKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSecretKey(event.target.value);
  };

  const checkDeployStatus = async () => {
    // ... (checkDeployStatus function remains the same as previous version with timestamp logic)
    if (!uploadInitiationTime) { 
        setProgressMessage("Waiting for upload to start...");
        return;
    }
    try {
      const statusResponse = await fetch('/.netlify/functions/get-deploy-status');
      if (!statusResponse.ok) {
        setProgressMessage(`Error checking deploy status: ${statusResponse.statusText || statusResponse.status}. Function may not be deployed.`);
        setMessage({ type: 'error', text: `Failed to get deployment status. Please check Netlify function logs for 'get-deploy-status'.` });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false); 
        return;
      }
      const statusData = await statusResponse.json();
      const deployCreatedAt = new Date(statusData.createdAt).getTime();

      if ((statusData.status === 'ready' || statusData.status === 'current') && deployCreatedAt >= uploadInitiationTime) {
        setProgress(100);
        setProgressMessage('Site successfully updated!');
        setMessage({ type: 'success', text: 'Deployment complete and site is live with new data.' });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false);
        setUploadInitiationTime(null); 
      } else if (statusData.status === 'building' || ((statusData.status === 'ready' || statusData.status === 'current') && deployCreatedAt < uploadInitiationTime) ) {
        setProgressMessage(`Netlify build in progress (status: ${statusData.status}). Checking again in 10s...`);
        setProgress(prev => Math.min(prev + 5, 95)); 
      } else if (statusData.status === 'error' || statusData.status === 'failed') {
        setProgressMessage(`Deployment failed: ${statusData.status}`);
        setMessage({ type: 'error', text: `Netlify deployment failed. Check deploy logs on Netlify.` });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsProcessing(false);
        setUploadInitiationTime(null); 
      } else {
         setProgressMessage(`Deployment status: ${statusData.status}. Checking again in 10s...`);
      }
    } catch (error) {
      console.error("Error polling deploy status:", error);
      setProgressMessage('Could not retrieve deploy status. Network error or function issue.');
      setMessage({ type: 'error', text: 'Error while trying to check deployment status.' });
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      setIsProcessing(false); 
      setUploadInitiationTime(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !isFileValid || !selectedSection) { // Check isFileValid
      setMessage({ type: 'error', text: 'Please select a valid CSV file for the chosen section.' });
      return;
    }

    setIsProcessing(true);
    // Keep existing success/error message from validation if it's an info/success type
    if (message?.type === 'error') setMessage(null); 
    setProgress(10); 
    setProgressMessage('Reading file...');
    setUploadInitiationTime(Date.now());

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
          setUploadInitiationTime(null); 
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessage({ type: 'error', text: 'An unexpected error occurred during upload processing.' });
        setIsProcessing(false);
        setProgress(0);
        setUploadInitiationTime(null); 
      }
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      setMessage({ type: 'error', text: 'Error reading file.' });
      setIsProcessing(false);
      setProgress(0);
      setUploadInitiationTime(null);
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
                ref={fileInputRef} // Added ref
                id="cvFile" name="cvFile" type="file" accept=".csv" onChange={handleFileChange} required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                disabled={isProcessing}
              />
            </div>
            {selectedFile && !isFileValid && message && message.type === 'error' && ( // Show selected file name even if validation failed initially
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {selectedFile.name}</p>
            )}
             {selectedFile && isFileValid && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {selectedFile.name}</p>
            )}
          </div>
          
          {/* Validation Message / Progress Message / Main Message */}
          {message && (
            <div 
                className={`p-3 rounded-md text-xs mt-4 ${
                message.type === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 
                message.type === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 
                'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'}`}
            >
                {message.text}
            </div>
          )}

          {isProcessing && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          {isProcessing && progressMessage && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              {progressMessage}
            </p>
          )}


          <div>
            <button
              type="submit"
              disabled={isProcessing || !selectedFile || !isFileValid} // MODIFIED: Also disable if not isFileValid
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 mt-6"
            >
              {isProcessing ? `Processing (${progress}%)` : 'Upload CSV for Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
