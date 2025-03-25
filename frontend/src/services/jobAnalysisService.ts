import axios from 'axios';
import { getAuthToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

/**
 * Interface for job data
 */
export interface JobData {
  jobTitle: string;
  company: string;
  location: string;
  jobDescription: string;
}

/**
 * Interface for job analysis result
 */
export interface JobAnalysis {
  id: string;
  authenticityScore: number;
  redFlags: string[];
  greenFlags: string[];
  reasoning: string;
  timestamp: string;
}

/**
 * Submit a job for analysis
 * @param jobData The job data to analyze
 * @returns Promise with the analysis result
 */
export const analyzeJob = async (jobData: JobData): Promise<JobAnalysis> => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post(
      `${API_URL}/api/jobs/analyze`,
      jobData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to analyze job posting');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
};

/**
 * Get job analysis history for the current user
 * @returns Promise with array of previous analyses
 */
export const getAnalysisHistory = async (): Promise<JobAnalysis[]> => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.get(
      `${API_URL}/api/jobs/history`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch analysis history');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
};

/**
 * Get detailed analysis by ID
 * @param analysisId ID of the analysis to retrieve
 * @returns Promise with detailed analysis data
 */
export const getAnalysisById = async (analysisId: string): Promise<JobAnalysis> => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.get(
      `${API_URL}/api/jobs/analysis/${analysisId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch analysis details');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
};

/**
 * Submit user feedback about a job posting's authenticity
 * @param analysisId ID of the analysis
 * @param feedback User feedback data
 * @returns Promise with updated analysis
 */
export const submitFeedback = async (
  analysisId: string, 
  feedback: { rating: number; comments: string; outcome?: string; }
): Promise<any> => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post(
      `${API_URL}/api/jobs/feedback/${analysisId}`,
      feedback,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to submit feedback');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
};