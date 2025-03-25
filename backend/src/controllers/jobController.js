/**
 * Job Controller
 * Handles job analysis and pattern detection requests
 */

const jobAnalyzerService = require('../services/jobAnalyzer');
const patternDetectorService = require('../services/patternDetector');
const feedbackProcessorService = require('../services/feedbackProcessor');

/**
 * Analyze a job posting
 * @route POST /api/jobs/analyze
 */
exports.analyzeJob = async (req, res) => {
  try {
    const { jobTitle, company, location, jobDescription } = req.body;
    
    // Validate input
    if (!jobTitle || !company || !jobDescription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Job title, company, and description are required' 
      });
    }
    
    // Get user ID from auth middleware
    const userId = req.user.sub;
    
    // Run job analysis
    const analysisResult = await jobAnalyzerService.analyzeJob({
      jobTitle,
      company,
      location,
      jobDescription,
      userId
    });
    
    // Run pattern detection in parallel
    const patternResult = await patternDetectorService.detectCompanyPatterns({
      company,
      jobTitle,
      location,
      jobDescription,
      userId
    });
    
    // Combine results for the response
    const combinedResult = {
      ...analysisResult,
      patterns: patternResult.patterns,
      similarJobs: patternResult.similarJobs
    };
    
    res.status(200).json(combinedResult);
  } catch (error) {
    console.error('Error in job analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};

/**
 * Get analysis history for a user
 * @route GET /api/jobs/history
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const analyses = await jobAnalyzerService.getUserAnalysisHistory(userId);
    
    res.status(200).json(analyses);
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};

/**
 * Get detailed analysis by ID
 * @route GET /api/jobs/analysis/:id
 */
exports.getAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    const analysis = await jobAnalyzerService.getAnalysisById(id);
    
    // Check if the analysis belongs to the user
    if (analysis.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    
    if (error.message === 'Analysis not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Analysis not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};

/**
 * Submit feedback about a job analysis
 * @route POST /api/jobs/feedback/:id
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comments, outcome } = req.body;
    const userId = req.user.sub;
    
    // Validate input
    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }
    
    // Process and store feedback
    const result = await feedbackProcessorService.processFeedback({
      analysisId: id,
      userId,
      rating,
      comments,
      outcome
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};

/**
 * Get suspicious companies (admin only)
 * @route GET /api/jobs/suspicious-companies
 */
exports.getSuspiciousCompanies = async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.permissions.includes('admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    const companies = await patternDetectorService.getSuspiciousCompanies();
    
    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching suspicious companies:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};