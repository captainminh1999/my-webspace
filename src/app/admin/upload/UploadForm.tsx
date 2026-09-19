// src/app/admin/upload/UploadForm.tsx
"use client"; 

import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa, { ParseResult } from 'papaparse'; 
// The dropdown and the server's whitelist read the same list. sections.ts has no imports, so nothing
// from the server side rides along into this chunk.
import { CV_SECTIONS } from '@/lib/admin/sections';
import { SESSION_ENDED } from './PasskeyPanel';

// DEFINE EXPECTED CSV HEADERS FOR EACH SECTION
const EXPECTED_HEADERS: { [key: string]: string[] } = {
  profile: [
    "First Name", "Last Name", "Maiden Name", "Address", "Birth Date", 
    "Headline", "Summary", 
    "Industry", "Zip Code", "Geo Location", "Twitter Handles", 
    "Websites", "Instant Messengers"
  ],
  about: ["Content"], 
  experience: [ 
    "Company Name", "Employment Type", "Company Location", "Company Total Duration",
    "Role Title", "Role Start Date", "Role End Date", "Role Duration", "Role Location",
    "Responsibility 1", "Responsibility 2", "Responsibility 3", 
    "Skills" 
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
  skills: [ 
    "Name" 
  ],
  recommendationsReceived: [
    "First Name", "Last Name", "Company", "Job Title", "Text", "Creation Date", "Status"
  ],
  recommendationsGiven: [ 
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

interface UploadFunctionResponse {
  message: string;
  error?: string; 
}

const PROGRESS_ANIMATION_INTERVAL = 1000; // ms for smooth progress animation

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileValid, setIsFileValid] = useState(false); 
  const [selectedSection, setSelectedSection] = useState<string>(CV_SECTIONS[0].id);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0); // MODIFIED: For animation target
  const [progressMessage, setProgressMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string | React.ReactNode } | null>(null);
  const router = useRouter();

  const progressAnimationIntervalRef = useRef<NodeJS.Timeout | null>(null); // For progress animation
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect for smooth progress bar animation
  useEffect(() => {
    if (isProcessing && progress < targetProgress) {
      if (progressAnimationIntervalRef.current) clearInterval(progressAnimationIntervalRef.current);
      progressAnimationIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev < targetProgress) {
            return prev + 1;
          }
          if (progressAnimationIntervalRef.current) clearInterval(progressAnimationIntervalRef.current);
          return prev;
        });
      }, PROGRESS_ANIMATION_INTERVAL);
    } else if (progressAnimationIntervalRef.current && progress >= targetProgress) {
        clearInterval(progressAnimationIntervalRef.current);
    }
    return () => {
      if (progressAnimationIntervalRef.current) clearInterval(progressAnimationIntervalRef.current);
    };
  }, [isProcessing, progress, targetProgress]);




  const resetFormOnNewSelection = (clearFileInput: boolean = true) => {
    setProgress(0);
    setTargetProgress(0); // Reset target progress
    setProgressMessage('');
    setMessage(null);
    setSelectedFile(null);
    setIsFileValid(false);
    if (progressAnimationIntervalRef.current) {
        clearInterval(progressAnimationIntervalRef.current);
        progressAnimationIntervalRef.current = null;
    }
    if (clearFileInput && fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
    setIsProcessing(false); 
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Reset relevant states when a new file is chosen
    setMessage(null);
    setIsFileValid(false);
    setSelectedFile(null); 
    setProgress(0);
    setTargetProgress(0);
    setProgressMessage('');
    
    if (progressAnimationIntervalRef.current) {
        clearInterval(progressAnimationIntervalRef.current);
    }
    setIsProcessing(false); 

    const file = event.target.files?.[0];

    if (file) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a CSV file.' });
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }

      const csvFile: File = file; 

      Papa.parse<Record<string, unknown>, File>(csvFile, { 
        preview: 1, header: true, skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, unknown>>) => { /* ... (same validation logic) ... */ 
          const actualHeaders = results.meta.fields || [];
          // Every section in CV_SECTIONS has an entry in EXPECTED_HEADERS.
          const expected = EXPECTED_HEADERS[selectedSection];

          const missingHeaders = expected.filter(h => !actualHeaders.includes(h));
          const extraHeaders = actualHeaders.filter(h => !expected.includes(h)); 

          if (missingHeaders.length > 0) {
            setMessage({ 
              type: 'error', 
              text: ( <>{/* ... */}<strong>Header mismatch!</strong> Please check your CSV.<br />Missing expected columns: {missingHeaders.join(', ')}{extraHeaders.length > 0 && <><br />Your file also has extra columns: {extraHeaders.join(', ')}</>}</> )
            });
            setIsFileValid(false); if (fileInputRef.current) fileInputRef.current.value = ""; 
          } else {
            let validationMessage = "CSV headers are correct.";
            if (extraHeaders.length > 0) {
              validationMessage += ` (Note: Your file has extra columns: ${extraHeaders.join(', ')}. These will be ignored.)`;
              setMessage({ type: 'info', text: validationMessage });
            } else {
              setMessage({ type: 'success', text: validationMessage });
            }
            setSelectedFile(csvFile); setIsFileValid(true); setProgress(5); setTargetProgress(5);
            setProgressMessage('File selected and headers validated. Ready for upload.');
          }
        },
        error: (err: Error) => { /* ... (same error handling) ... */ 
            setMessage({ type: 'error', text: `Error parsing CSV for validation: ${err.message}` });
            setIsFileValid(false); if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
      });
    } else {
        resetFormOnNewSelection(true); 
    }
  };

  const handleSectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(event.target.value);
    resetFormOnNewSelection(true); 
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !isFileValid || !selectedSection) {
      setMessage({ type: 'error', text: 'Please select a valid CSV file for the chosen section.' });
      return;
    }

    setIsProcessing(true); 
    if (message?.type === 'error') setMessage(null); 
    setProgress(10); setTargetProgress(10);
    setProgressMessage('Reading file...');

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      try {
        setProgress(15); setTargetProgress(15);
        setProgressMessage('Sending data to server...');
        const base64Full = reader.result as string;
        const base64Content = base64Full.split(',')[1];

        // No secret in the body any more: the session cookie (HttpOnly, set at sign-in) is what authorises this.
        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionIdentifier: selectedSection,
            fileName: selectedFile.name,
            fileContentBase64: base64Content,
          }),
        });

        const uploadResult = await uploadResponse.json() as UploadFunctionResponse; 

        if (uploadResponse.status === 401) {
          // 12 hours are up, or the passkey behind the session was deleted. The refresh re-renders the page
          // on the server, which swaps this form for the sign-in panel; the panel repeats the sentence.
          setMessage({ type: 'error', text: SESSION_ENDED });
          setIsProcessing(false); setProgress(0); setTargetProgress(0);
          router.refresh();
        } else if (uploadResponse.ok) {
          setTargetProgress(100);
          setProgressMessage('Upload successful!');
          setMessage({ type: 'success', text: uploadResult.message || 'File processed successfully!' });
          setIsProcessing(false);
        } else {
          setMessage({ type: 'error', text: uploadResult.message || `Upload to function failed.` });
          setIsProcessing(false); setProgress(0); setTargetProgress(0);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessage({ type: 'error', text: 'An unexpected error occurred during upload.' });
        setIsProcessing(false); setProgress(0); setTargetProgress(0);
      }
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      setMessage({ type: 'error', text: 'Error reading file.' });
      setIsProcessing(false); setProgress(0); setTargetProgress(0);
    };
  };

  // Only the card: the page wrapper lives in UploadPortal, which stacks the passkey panel and this form.
  return (
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg">
        <div><h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Upload CV Section Data (CSV)</h2></div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
           {/* Form fields ... (same as before, ensure disabled={isProcessing} is on them) ... */}
           <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Section</label>
            <select id="section" name="section" value={selectedSection} onChange={handleSectionChange} required disabled={isProcessing}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              {CV_SECTIONS.map((section) => (<option key={section.id} value={section.id}>{section.name}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="cvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CSV Data File</label>
            <div className="mt-1">
              <input ref={fileInputRef} id="cvFile" name="cvFile" type="file" accept=".csv" onChange={handleFileChange} disabled={isProcessing}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" />
            </div>
            {selectedFile && (isFileValid || (message && message.type === 'error' && typeof message.text === 'string' && message.text.toLowerCase().includes('file'))) && 
              (<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {selectedFile.name}</p>)}
          </div>
          {/* The live region is always in the page: a region that arrives together with its text is not read out.
              Empty, it has no height and its margins collapse into its neighbours', so the form looks as before. */}
          <div role="status" aria-live="polite">
            {message && (<div className={`p-3 rounded-md text-xs mt-4 ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : message.type === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'}`}>{message.text}</div>)}
          </div>
          {isProcessing && (<>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }}></div> {/* Changed to ease-linear for smoother visual */}
              </div>
              {progressMessage && (<p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">{progressMessage}</p>)}
            </>)}
          <div>
            <button type="submit" disabled={isProcessing || !selectedFile || !isFileValid} 
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 mt-6">
              {isProcessing ? `Processing (${progress}%)` : 'Upload CSV for Section'}
            </button>
          </div>
        </form>
      </div>
  );
}
