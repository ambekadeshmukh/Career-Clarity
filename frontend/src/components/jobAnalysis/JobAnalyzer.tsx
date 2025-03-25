import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { analyzeJob } from '../../services/jobAnalysisService';
import { addAnalysis } from '../../store/slices/analysisSlice';
import ScoreIndicator from '../common/ScoreIndicator';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const JobAnalyzer: React.FC = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    jobDescription: '',
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeJob(formData);
      setAnalysis(result);
      dispatch(addAnalysis(result));
    } catch (err: any) {
      setError(err.message || 'Failed to analyze job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Job Authenticity Analyzer</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Job Description
          </label>
          <textarea
            id="jobDescription"
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleChange}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="Paste the full job description here..."
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Job'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="mt-6 flex justify-center">
          <LoadingSpinner />
          <p className="ml-2 text-gray-600">Analyzing job posting...</p>
        </div>
      )}
      
      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md">
          <p className="font-medium">Analysis failed</p>
          <p>{error}</p>
        </div>
      )}
      
      {analysis && (
        <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <ScoreIndicator score={analysis.authenticityScore} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h4 className="flex items-center text-red-600 font-medium mb-2">
                <FaExclamationTriangle className="mr-2" />
                Red Flags
              </h4>
              {analysis.redFlags.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.redFlags.map((flag: string, index: number) => (
                    <li key={index} className="text-gray-700">{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No red flags detected</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h4 className="flex items-center text-green-600 font-medium mb-2">
                <FaCheckCircle className="mr-2" />
                Green Flags
              </h4>
              {analysis.greenFlags.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.greenFlags.map((flag: string, index: number) => (
                    <li key={index} className="text-gray-700">{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No green flags detected</p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h4 className="font-medium mb-2">Analysis</h4>
            <p className="text-gray-700">{analysis.reasoning}</p>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setAnalysis(null)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Results
            </button>
            <button
              className="ml-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Save Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAnalyzer;