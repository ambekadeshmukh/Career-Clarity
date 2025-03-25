/**
 * Pattern Detector Service
 * 
 * Identifies suspicious job posting patterns by companies
 * and tracks persistence of job listings over time.
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const stringSimilarity = require('string-similarity');

// Initialize AWS services
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Constants
const SIMILARITY_THRESHOLD = 0.85; // Threshold for considering descriptions similar
const SUSPICIOUS_REPOST_DAYS = 90; // Number of days after which reposting becomes suspicious

/**
 * Detects patterns in job postings for a specific company
 * 
 * @param {Object} companyData - Company and job data
 * @returns {Object} Pattern analysis results
 */
exports.detectCompanyPatterns = async (companyData) => {
  try {
    const { company, jobTitle, location, jobDescription } = companyData;
    
    // Normalize company name to handle slight variations
    const normalizedCompany = normalizeCompanyName(company);
    
    // Get company's posting history
    const companyHistory = await getCompanyPostingHistory(normalizedCompany);
    
    // Analyze patterns
    const patterns = {
      companyName: normalizedCompany,
      recentPostings: companyHistory.length,
      similarJobCount: 0,
      longestOpenDays: 0,
      recycledDescriptions: false,
      averagePostingFrequency: 0,
      suspiciousPatterns: [],
      confidenceScore: 10 // Default high score, reduced based on red flags
    };
    
    // Calculate frequency of postings
    if (companyHistory.length > 1) {
      const sortedByDate = [...companyHistory].sort((a, b) => 
        new Date(a.firstSeen) - new Date(b.firstSeen)
      );
      
      let totalDays = 0;
      for (let i = 1; i < sortedByDate.length; i++) {
        const daysBetween = daysDifference(
          new Date(sortedByDate[i-1].firstSeen),
          new Date(sortedByDate[i].firstSeen)
        );
        totalDays += daysBetween;
      }
      
      patterns.averagePostingFrequency = companyHistory.length > 1 
        ? Math.round(totalDays / (companyHistory.length - 1)) 
        : 0;
    }
    
    // Check for similar existing job postings
    const similarJobs = [];
    for (const posting of companyHistory) {
      const similarity = stringSimilarity.compareTwoStrings(
        jobDescription.toLowerCase(),
        posting.jobDescription.toLowerCase()
      );
      
      if (similarity > SIMILARITY_THRESHOLD) {
        similarJobs.push({
          id: posting.id,
          jobTitle: posting.jobTitle,
          similarity: Math.round(similarity * 100),
          firstSeen: posting.firstSeen,
          lastSeen: posting.lastSeen
        });
      }
      
      // Track longest open position
      const openDays = daysDifference(
        new Date(posting.firstSeen),
        new Date(posting.lastSeen || new Date().toISOString())
      );
      
      if (openDays > patterns.longestOpenDays) {
        patterns.longestOpenDays = openDays;
      }
    }
    
    patterns.similarJobCount = similarJobs.length;
    
    // Identify suspicious patterns
    if (patterns.longestOpenDays > SUSPICIOUS_REPOST_DAYS) {
      patterns.suspiciousPatterns.push(
        `Position open for ${patterns.longestOpenDays} days without being filled`
      );
      patterns.confidenceScore -= 2;
    }
    
    if (patterns.similarJobCount > 3) {
      patterns.recycledDescriptions = true;
      patterns.suspiciousPatterns.push(
        `Multiple similar job postings (${patterns.similarJobCount}) detected`
      );
      patterns.confidenceScore -= 2;
    }
    
    if (patterns.averagePostingFrequency < 7 && patterns.recentPostings > 5) {
      patterns.suspiciousPatterns.push(
        'Unusually high frequency of new job postings'
      );
      patterns.confidenceScore -= 1;
    }
    
    // Store current job in pattern history
    const jobId = uuidv4();
    const timestamp = new Date().toISOString();
    
    await dynamoDb.put({
      TableName: process.env.JOB_PATTERNS_TABLE,
      Item: {
        id: jobId,
        companyName: normalizedCompany,
        jobTitle,
        location,
        jobDescription,
        firstSeen: timestamp,
        lastSeen: timestamp,
        similarJobs: similarJobs.map(job => job.id),
        userId: companyData.userId || 'anonymous'
      }
    }).promise();
    
    // Store pattern analysis in S3
    await s3.putObject({
      Bucket: process.env.JOB_DATA_BUCKET,
      Key: `company-patterns/${normalizedCompany}-${timestamp}.json`,
      Body: JSON.stringify({
        company: normalizedCompany,
        patterns,
        similarJobs,
        timestamp
      }),
      ContentType: 'application/json'
    }).promise();
    
    return {
      id: jobId,
      patterns,
      similarJobs,
      timestamp
    };
  } catch (error) {
    console.error('Error detecting patterns:', error);
    throw error;
  }
};

/**
 * Get company posting history
 * 
 * @param {string} companyName - Normalized company name
 * @returns {Array} Company's job posting history
 */
async function getCompanyPostingHistory(companyName) {
  const params = {
    TableName: process.env.JOB_PATTERNS_TABLE,
    IndexName: 'CompanyNameIndex',
    KeyConditionExpression: 'companyName = :companyName',
    ExpressionAttributeValues: {
      ':companyName': companyName
    }
  };
  
  const result = await dynamoDb.query(params).promise();
  return result.Items;
}

/**
 * Normalizes company name to handle slight variations
 * 
 * @param {string} company - Company name
 * @returns {string} Normalized company name
 */
function normalizeCompanyName(company) {
  return company
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+inc$|\s+corp$|\s+llc$|\s+ltd$/i, '')
    .trim();
}

/**
 * Calculate days difference between two dates
 * 
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days between dates
 */
function daysDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get all suspicious companies (for admin dashboard)
 * 
 * @returns {Array} List of companies with suspicious patterns
 */
exports.getSuspiciousCompanies = async () => {
  // Scan the database for companies with many similar postings
  // This is a simplified approach - in production, we'd use more 
  // sophisticated querying with GSIs or analytics
  const params = {
    TableName: process.env.JOB_PATTERNS_TABLE,
    FilterExpression: 'size(similarJobs) > :threshold',
    ExpressionAttributeValues: {
      ':threshold': 3  // Companies with more than 3 similar job posts
    }
  };
  
  const result = await dynamoDb.scan(params).promise();
  
  // Group by company and calculate metrics
  const companyMap = {};
  
  for (const item of result.Items) {
    if (!companyMap[item.companyName]) {
      companyMap[item.companyName] = {
        companyName: item.companyName,
        postingCount: 0,
        similarPostingsCount: 0,
        locations: new Set(),
        titles: new Set()
      };
    }
    
    companyMap[item.companyName].postingCount++;
    companyMap[item.companyName].similarPostingsCount += item.similarJobs.length;
    companyMap[item.companyName].locations.add(item.location);
    companyMap[item.companyName].titles.add(item.jobTitle);
  }
  
  // Convert to array and calculate suspicion score
  return Object.values(companyMap).map(company => ({
    ...company,
    locations: Array.from(company.locations),
    titles: Array.from(company.titles),
    suspicionScore: calculateSuspicionScore(company)
  })).sort((a, b) => b.suspicionScore - a.suspicionScore);
};

/**
 * Calculate a suspicion score for a company based on posting patterns
 * 
 * @param {Object} company - Company data
 * @returns {number} Suspicion score (higher is more suspicious)
 */
function calculateSuspicionScore(company) {
  let score = 0;
  
  // Companies with many similar postings
  score += Math.min(10, company.similarPostingsCount / 2);
  
  // Many postings but few unique job titles
  const titleRatio = company.titles.length / company.postingCount;
  if (titleRatio < 0.5 && company.postingCount > 5) {
    score += (1 - titleRatio) * 5;
  }
  
  return Math.round(score);
}